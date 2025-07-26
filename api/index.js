const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { statusOptionsDB } = require('../lib/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Vercel deployment (handles X-Forwarded-For headers)
// Use number of proxies instead of true for security
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());


// Rate limiting with enhanced security for Vercel
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  trustProxy: true, // Trust the proxy (Vercel)
  keyGenerator: (req) => {
    // Use X-Forwarded-For header for client IP in Vercel environment
    return req.ip || req.connection.remoteAddress || 'anonymous';
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

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

// テキスト生成関数
function generateText(post) {
  const { contestName, status, message } = post;
  
  let text = '';
  
  // コンテスト情報を追加
  text += `${contestName}\n`;
  
  // 状況を追加
  text += `${status}`;
  
  // メッセージを追加
  if (message && message.trim()) {
    text += `\n\n${message}`;
  }
  
  return text;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
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
  console.log('CSV upload request received');
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'CSVファイルが選択されていません' });
  }

  console.log('File received:', {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  });

  const filePath = req.file.path;
  console.log('Starting CSV file read from:', filePath);

  // ファイルの存在確認
  if (!fs.existsSync(filePath)) {
    console.error('Uploaded file does not exist at path:', filePath);
    return res.status(500).json({ error: 'アップロードされたファイルが見つかりません' });
  }

  try {
    const results = [];
    let processingComplete = false;
    let processingError = null;

    // Promise を使って非同期処理を同期的に扱う
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({ 
          headers: false,
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (data) => {
          try {
            console.log('Raw CSV row data:', data);
            
            // データが配列形式の場合とオブジェクト形式の場合の両方に対応
            let status, memo;
            
            if (Array.isArray(data)) {
              status = data[1]; // B列（インデックス1）
              memo = data[3];   // D列（インデックス3）
            } else {
              // オブジェクト形式の場合（列番号をキーとして使用）
              status = data['1'] || data[1];
              memo = data['3'] || data[3];
            }
            
            console.log('Extracted data:', { status, memo });
            
            if (status && typeof status === 'string' && status.trim()) {
              results.push({
                status: status.trim(),
                memo: memo && typeof memo === 'string' ? memo.trim() : ''
              });
              console.log('Added to results:', { status: status.trim(), memo: memo ? memo.trim() : '' });
            }
          } catch (rowError) {
            console.error('Error processing CSV row:', rowError, 'Data:', data);
          }
        })
        .on('end', () => {
          console.log('CSV parsing completed. Total results:', results.length);
          processingComplete = true;
          resolve();
        })
        .on('error', (error) => {
          console.error('CSV parsing stream error:', error);
          processingError = error;
          reject(error);
        });

      // タイムアウト設定（30秒）
      setTimeout(() => {
        if (!processingComplete) {
          stream.destroy();
          reject(new Error('CSV processing timeout'));
        }
      }, 30000);
    });

    if (processingError) {
      throw processingError;
    }

    console.log('All results before deduplication:', results);

    // 重複を除去
    const uniqueStatuses = [];
    const seenStatuses = new Set();
    
    results.forEach(item => {
      if (!seenStatuses.has(item.status)) {
        seenStatuses.add(item.status);
        uniqueStatuses.push(item);
      }
    });
    
    console.log('Unique statuses to save:', uniqueStatuses);

    if (uniqueStatuses.length === 0) {
      // アップロードしたファイルを削除
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ 
        error: 'CSVファイルから有効な状況データが見つかりませんでした。B列とD列にデータが含まれているか確認してください。'
      });
    }
    
    // データベースに保存
    console.log('Saving to database...');
    await statusOptionsDB.createMany(uniqueStatuses);
    console.log('Database save completed successfully');
    
    // アップロードしたファイルを削除
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Temporary file deleted');
    }
    
    res.json({ 
      message: `${uniqueStatuses.length}個の状況オプションを読み込みました`,
      statusOptions: uniqueStatuses
    });

  } catch (error) {
    console.error('CSV upload processing error:', error);
    console.error('Error stack:', error.stack);
    
    // エラー時もファイルを削除
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('Temporary file deleted after error');
      } catch (unlinkError) {
        console.error('Failed to delete temporary file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'CSVファイルの処理に失敗しました',
      details: error.message,
      errorType: error.constructor.name
    });
  }
});

// Generate text preview
app.post('/api/generate-text', async (req, res) => {
  const { contestName, status, message } = req.body;
  
  if (!contestName || !status) {
    return res.status(400).json({ error: 'コンテスト名、状況は必須です' });
  }

  try {
    const text = generateText({
      contestName,
      status,
      message: message || ''
    });

    res.json({ 
      text,
      charCount: text.length
    });
  } catch (error) {
    console.error('テキスト生成エラー:', error);
    res.status(500).json({ error: 'テキスト生成に失敗しました' });
  }
});

// For Vercel serverless functions, export the app instead of listening
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} else {
  console.log('Legacy server listening...');
}

module.exports = app;