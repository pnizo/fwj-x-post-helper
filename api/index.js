const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TwitterApi } = require('twitter-api-v2');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { initializeDatabase, postsDB, statusOptionsDB } = require('../lib/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Twitter API クライアント初期化
let twitterClient = null;
let authMethod = null;

try {
  // OAuth 1.0a認証情報をチェック
  if (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET && 
      process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_TOKEN_SECRET) {
    twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
    authMethod = 'OAuth1';
    console.log('Twitter API接続設定完了 (OAuth 1.0a)');
  } else {
    console.log('Twitter API認証情報が設定されていません。.envファイルを確認してください。');
    console.log('必要な環境変数:');
    console.log('- TWITTER_API_KEY');
    console.log('- TWITTER_API_SECRET');
    console.log('- TWITTER_ACCESS_TOKEN');
    console.log('- TWITTER_ACCESS_TOKEN_SECRET');
  }
} catch (error) {
  console.error('Twitter API初期化エラー:', error);
}

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database on startup
initializeDatabase();

// Configure multer for CSV file uploads
const uploadCSV = multer({
  dest: '/tmp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('CSVファイルのみアップロード可能です'), false);
    }
  }
});

// Configure multer for media file uploads
const uploadMedia = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 4 // Maximum 4 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      // Check supported formats
      const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const supportedVideoTypes = ['video/mp4', 'video/mov', 'video/avi'];
      
      if (supportedImageTypes.includes(file.mimetype) || supportedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('サポートされていないファイル形式です'), false);
      }
    } else {
      cb(new Error('画像または動画ファイルのみアップロード可能です'), false);
    }
  }
});

// ツイート用テキスト生成関数
function generateTweetText(post) {
  const { contestName, status, message } = post;
  
  let tweetText = '';
  
  // コンテスト情報を追加
  tweetText += `🏆 ${contestName}\n`;
  
  // 状況に応じた絵文字を追加
  const statusEmojis = {
    '開始': '🚀',
    '進行中': '⚡',
    '終了': '✅',
    '延期': '⏰',
    '中止': '❌'
  };
  
  tweetText += `${statusEmojis[status] || '📊'} ${status}`;
  
  // メッセージを追加
  if (message && message.trim()) {
    tweetText += `\n\n${message}`;
  }
  
  // 280文字制限を確認
  if (tweetText.length > 280) {
    // 長すぎる場合は短縮
    const baseText = `🏆 ${contestName}\n${statusEmojis[status] || '📊'} ${status}\n\n`;
    const availableLength = 280 - baseText.length - 3; // "..." 分を引く
    const shortenedMessage = message.substring(0, availableLength);
    tweetText = baseText + shortenedMessage + '...';
  }
  
  return tweetText;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await postsDB.getAll();
    res.json(posts);
  } catch (error) {
    console.error('Posts取得エラー:', error);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  }
});

// Get status options from CSV
app.get('/api/status-options', async (req, res) => {
  try {
    const statusOptions = await statusOptionsDB.getAll();
    res.json(statusOptions);
  } catch (error) {
    console.error('Status options取得エラー:', error);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  }
});

// Upload CSV file and parse status options
app.post('/api/upload-csv', uploadCSV.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSVファイルが選択されていません' });
  }

  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csv({ headers: false }))
    .on('data', (data) => {
      // B列（インデックス1）とD列（インデックス3）を取得
      const status = data['1']; // B列
      const memo = data['3'];   // D列
      
      if (status && status.trim()) {
        results.push({
          status: status.trim(),
          memo: memo ? memo.trim() : ''
        });
      }
    })
    .on('end', async () => {
      try {
        // 重複を除去
        const uniqueStatuses = [];
        const seenStatuses = new Set();
        
        results.forEach(item => {
          if (!seenStatuses.has(item.status)) {
            seenStatuses.add(item.status);
            uniqueStatuses.push(item);
          }
        });
        
        // データベースに保存
        await statusOptionsDB.createMany(uniqueStatuses);
        
        // アップロードしたファイルを削除
        fs.unlinkSync(filePath);
        
        res.json({ 
          message: `${uniqueStatuses.length}個の状況オプションを読み込みました`,
          statusOptions: uniqueStatuses
        });
      } catch (error) {
        console.error('データベース保存エラー:', error);
        
        // エラー時もファイルを削除
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        res.status(500).json({ 
          error: 'データベースへの保存に失敗しました',
          details: error.message
        });
      }
    })
    .on('error', (error) => {
      console.error('CSV解析エラー:', error);
      
      // エラー時もファイルを削除
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.status(500).json({ 
        error: 'CSVファイルの解析に失敗しました',
        details: error.message
      });
    });
});

// Upload media files
app.post('/api/upload-media', uploadMedia.array('mediaFiles', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'メディアファイルが選択されていません' });
    }

    const mediaFiles = req.files.map(file => ({
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    }));

    res.json({
      message: `${mediaFiles.length}個のメディアファイルをアップロードしました`,
      mediaFiles: mediaFiles
    });
  } catch (error) {
    console.error('メディアアップロードエラー:', error);
    res.status(500).json({
      error: 'メディアファイルのアップロードに失敗しました',
      details: error.message
    });
  }
});

// Get uploaded media file
app.get('/api/media/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join('/tmp', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'ファイルが見つかりません' });
  }
});

// Twitter API権限チェック機能
app.get('/api/twitter/status', async (req, res) => {
  // 環境変数の設定状況を確認
  const envStatus = {
    hasApiKey: !!process.env.TWITTER_API_KEY,
    hasApiSecret: !!process.env.TWITTER_API_SECRET,
    hasAccessToken: !!process.env.TWITTER_ACCESS_TOKEN,
    hasAccessTokenSecret: !!process.env.TWITTER_ACCESS_TOKEN_SECRET,
    hasBearerToken: !!process.env.TWITTER_BEARER_TOKEN,
    testMode: process.env.TEST_MODE === 'true'
  };

  // 認証情報のマスキング表示
  const maskedCredentials = {
    apiKey: process.env.TWITTER_API_KEY ? 
      process.env.TWITTER_API_KEY.substring(0, 4) + '...' + process.env.TWITTER_API_KEY.slice(-4) : 
      'NOT_SET',
    apiSecret: process.env.TWITTER_API_SECRET ? 
      process.env.TWITTER_API_SECRET.substring(0, 4) + '...' + process.env.TWITTER_API_SECRET.slice(-4) : 
      'NOT_SET',
    accessToken: process.env.TWITTER_ACCESS_TOKEN ? 
      process.env.TWITTER_ACCESS_TOKEN.substring(0, 4) + '...' + process.env.TWITTER_ACCESS_TOKEN.slice(-4) : 
      'NOT_SET',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET ? 
      process.env.TWITTER_ACCESS_TOKEN_SECRET.substring(0, 4) + '...' + process.env.TWITTER_ACCESS_TOKEN_SECRET.slice(-4) : 
      'NOT_SET'
  };

  if (!twitterClient) {
    return res.json({
      connected: false,
      error: 'Twitter API認証情報が設定されていません',
      authMethod: null,
      envStatus: envStatus,
      credentials: maskedCredentials,
      troubleshooting: [
        '1. .env.example を .env にコピーしてください',
        '2. Twitter Developer Portal で API キーを取得してください',
        '3. 取得したキーを .env ファイルに設定してください',
        '4. アプリの権限が "Read and Write" に設定されているか確認してください'
      ]
    });
  }

  try {
    // 現在のユーザー情報を取得してAPIアクセスを確認
    const userInfo = await twitterClient.v2.me();
    
    res.json({
      connected: true,
      authMethod: authMethod,
      user: {
        id: userInfo.data.id,
        name: userInfo.data.name,
        username: userInfo.data.username
      },
      canTweet: authMethod === 'OAuth1',
      envStatus: envStatus,
      credentials: maskedCredentials
    });
  } catch (error) {
    console.error('Twitter API状態確認エラー:', error);
    
    let errorMessage = 'Twitter APIへの接続に失敗しました';
    let troubleshootingTips = [];
    
    if (error.code === 401) {
      errorMessage = 'Twitter API認証が無効です';
      troubleshootingTips = [
        '1. API キーとシークレットが正しく設定されているか確認してください',
        '2. アクセストークンとシークレットが正しく設定されているか確認してください',
        '3. Twitter Developer Portal でアプリが "Active" 状態か確認してください',
        '4. アクセストークンが有効期限内か確認してください',
        '5. 認証情報をコピーする際に余分な空白が含まれていないか確認してください',
        '6. アプリの権限を変更した場合は、アクセストークンを再生成してください'
      ];
    } else if (error.code === 403) {
      errorMessage = 'Twitter APIの権限が不足しています';
      troubleshootingTips = [
        '1. Twitter Developer Portal でアプリの権限を "Read and Write" に設定してください',
        '2. 権限を変更した後、アクセストークンを再生成してください',
        '3. Twitter Developer Portal でアプリが承認されているか確認してください'
      ];
    }
    
    res.json({
      connected: false,
      authMethod: authMethod,
      error: errorMessage,
      canTweet: false,
      details: error.message,
      envStatus: envStatus,
      credentials: maskedCredentials,
      troubleshooting: troubleshootingTips
    });
  }
});

// Twitter API基本接続テスト
app.get('/api/twitter/test', async (req, res) => {
  if (!twitterClient) {
    return res.json({
      success: false,
      error: 'Twitter API認証情報が設定されていません'
    });
  }

  try {
    // 最も基本的なAPIエンドポイントをテスト
    const response = await twitterClient.v1.get('account/verify_credentials.json');
    
    res.json({
      success: true,
      message: 'Twitter API接続成功',
      user: {
        id: response.id_str,
        name: response.name,
        screen_name: response.screen_name,
        verified: response.verified
      },
      authMethod: authMethod
    });
  } catch (error) {
    console.error('Twitter API接続テストエラー:', error);
    
    let errorDetails = {
      success: false,
      error: 'Twitter API接続テストに失敗しました',
      errorCode: error.code,
      authMethod: authMethod
    };

    if (error.code === 401) {
      errorDetails.specificError = '認証情報が無効です';
      errorDetails.possibleCauses = [
        'API キーまたはシークレットが間違っています',
        'アクセストークンまたはシークレットが間違っています',
        'トークンの有効期限が切れています',
        'アプリが停止されています'
      ];
    } else if (error.code === 403) {
      errorDetails.specificError = 'アクセスが拒否されました';
      errorDetails.possibleCauses = [
        'アプリの権限が不足しています',
        'アカウントが凍結されています',
        'アプリが承認されていません'
      ];
    }

    res.json(errorDetails);
  }
});

app.post('/api/posts', async (req, res) => {
  const { contestName, status, message } = req.body;
  
  if (!contestName || !status) {
    return res.status(400).json({ error: 'コンテスト名、状況は必須です' });
  }

  try {
    const post = await postsDB.create({
      contestName,
      status,
      message: message || ''
    });
    
    res.json(post);
  } catch (error) {
    console.error('投稿作成エラー:', error);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  }
});

// ツイートテキストプレビュー機能
app.get('/api/posts/:id/preview', async (req, res) => {
  const postId = req.params.id;
  
  try {
    const post = await postsDB.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: '投稿が見つかりません' });
    }

    const tweetText = generateTweetText({
      contestName: post.contest_name,
      status: post.status,
      message: post.message
    });

    // 同じコンテストの直前の投稿を検索（リプライ対象）
    const previousPost = await postsDB.findLatestPostedByContest(post.contest_name, postId);
    
    res.json({ 
      tweetText,
      charCount: tweetText.length,
      withinLimit: tweetText.length <= 280,
      replyTo: previousPost ? {
        id: previousPost.id,
        tweetId: previousPost.tweet_id,
        contestName: previousPost.contest_name,
        status: previousPost.status,
        tweetText: previousPost.tweet_text,
        tweetedAt: previousPost.tweeted_at
      } : null
    });
  } catch (error) {
    console.error('プレビュー取得エラー:', error);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  }
});

// Twitter media upload helper function
async function uploadMediaToTwitter(filePath, altText = '') {
  try {
    const mediaData = fs.readFileSync(filePath);
    const mediaUpload = await twitterClient.v1.uploadMedia(mediaData, { mimeType: 'auto' });
    
    // Add alt text if provided
    if (altText) {
      await twitterClient.v1.createMediaMetadata(mediaUpload, { alt_text: { text: altText } });
    }
    
    return mediaUpload;
  } catch (error) {
    console.error('Twitter media upload error:', error);
    throw error;
  }
}

app.post('/api/posts/:id/tweet', async (req, res) => {
  const postId = req.params.id;
  const { customText, mediaFiles } = req.body; // カスタムテキストとメディアファイルを受け取る
  
  try {
    const post = await postsDB.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: '投稿が見つかりません' });
    }

    if (post.posted) {
      return res.status(400).json({ error: 'この投稿は既にツイートされています' });
    }

    // Twitter API接続の確認
    if (!twitterClient) {
      return res.status(500).json({ 
        error: 'Twitter API認証情報が設定されていません。.envファイルを確認してください。' 
      });
    }

    // カスタムテキストがある場合はそれを使用、なければデフォルトのテキストを生成
    const tweetText = customText && customText.trim() ? customText.trim() : generateTweetText({
      contestName: post.contest_name,
      status: post.status,
      message: post.message
    });

    // 同じコンテストの直前の投稿を検索（リプライ対象）
    const previousPost = await postsDB.findLatestPostedByContest(post.contest_name, postId);
    
    // テストモードの確認
    const testMode = process.env.TEST_MODE === 'true';
    
    if (testMode) {
      // テストモード: 実際の投稿は行わない
      const testTweetId = 'test-' + Date.now();
      const updatedPost = await postsDB.updateTweetInfo(postId, testTweetId, tweetText);
      
      const replyInfo = previousPost ? ` (リプライ先: ${previousPost.tweet_id})` : ' (新規投稿)';
      
      res.json({ 
        message: 'テストモード: 投稿をシミュレーションしました' + replyInfo, 
        post: updatedPost, 
        tweetUrl: `https://twitter.com/user/status/${testTweetId}`,
        replyTo: previousPost ? {
          id: previousPost.id,
          tweetId: previousPost.tweet_id,
          contestName: previousPost.contest_name
        } : null
      });
      return;
    }
    
    // メディアファイルをTwitterにアップロード
    let mediaIds = [];
    if (mediaFiles && mediaFiles.length > 0) {
      for (const mediaFile of mediaFiles) {
        try {
          const mediaFilePath = path.join('/tmp', mediaFile.filename);
          if (fs.existsSync(mediaFilePath)) {
            const mediaId = await uploadMediaToTwitter(mediaFilePath);
            mediaIds.push(mediaId);
          }
        } catch (error) {
          console.error('メディアアップロードエラー:', error);
          // メディアアップロードが失敗してもテキストは投稿する
        }
      }
    }

    // 実際にツイートを投稿
    let tweetOptions = { text: tweetText };
    
    // メディアがある場合は追加
    if (mediaIds.length > 0) {
      tweetOptions.media = { media_ids: mediaIds };
    }
    
    // リプライ先がある場合はリプライとして投稿
    if (previousPost && previousPost.tweet_id) {
      tweetOptions.reply = {
        in_reply_to_tweet_id: previousPost.tweet_id
      };
    }
    
    const tweet = await twitterClient.v2.tweet(tweetOptions);
    
    // アップロードしたメディアファイルを削除
    if (mediaFiles && mediaFiles.length > 0) {
      mediaFiles.forEach(mediaFile => {
        const mediaFilePath = path.join('/tmp', mediaFile.filename);
        if (fs.existsSync(mediaFilePath)) {
          fs.unlinkSync(mediaFilePath);
        }
      });
    }
    
    // 投稿成功時の処理 - データベースを更新
    const updatedPost = await postsDB.updateTweetInfo(postId, tweet.data.id, tweetText);
    
    const replyInfo = previousPost ? ' (リプライとして投稿)' : '';
    
    res.json({ 
      message: 'Xに投稿しました！' + replyInfo, 
      post: updatedPost, 
      tweetUrl: `https://twitter.com/user/status/${tweet.data.id}`,
      replyTo: previousPost ? {
        id: previousPost.id,
        tweetId: previousPost.tweet_id,
        contestName: previousPost.contest_name
      } : null
    });
    
  } catch (error) {
    console.error('Twitter投稿エラー:', error);
    
    // エラーの詳細情報をログに出力
    if (error.data) {
      console.error('エラーの詳細:', JSON.stringify(error.data, null, 2));
    }
    
    // エラーの種類に応じた詳細メッセージ
    let errorMessage = 'Xへの投稿に失敗しました。';
    let troubleshootingTips = [];
    
    if (error.code === 401) {
      errorMessage = 'Twitter API認証に失敗しました。';
      troubleshootingTips = [
        '認証情報が正しく設定されているか確認してください',
        'アクセストークンの有効期限が切れていないか確認してください'
      ];
    } else if (error.code === 403) {
      errorMessage = 'Twitter APIの権限が不足しています。';
      troubleshootingTips = [
        'Twitter Developer Portal でアプリの権限を "Read and Write" に設定してください',
        'アクセストークンを再生成してください',
        'アプリの利用規約に同意しているか確認してください',
        `現在の認証方式: ${authMethod}`
      ];
      
      if (authMethod === 'OAuth2') {
        troubleshootingTips.push('OAuth 2.0 Bearer Token では投稿できません。OAuth 1.0a の認証情報を使用してください');
      }
    } else if (error.code === 429) {
      errorMessage = 'Twitter APIの利用制限に達しました。';
      troubleshootingTips = [
        'しばらく待ってから再度お試しください',
        'API利用制限についてはTwitter Developer Portalで確認してください'
      ];
    } else if (error.code === 400) {
      errorMessage = '投稿内容に問題があります。';
      troubleshootingTips = [
        '文字数制限（280文字）を超えていないか確認してください',
        '重複した投稿でないか確認してください',
        'Twitter の利用規約に違反していないか確認してください'
      ];
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      troubleshooting: troubleshootingTips,
      errorCode: error.code,
      authMethod: authMethod
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});