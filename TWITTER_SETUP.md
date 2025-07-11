# Twitter API セットアップガイド

## 🔧 401認証エラーの解決方法

401エラーは **Twitter API認証情報が無効** であることを示します。以下の手順で解決できます。

## 📋 ステップ 1: Twitter Developer アカウントの作成

1. **Twitter Developer Portal にアクセス**
   - https://developer.twitter.com/ にアクセス
   - Twitterアカウントでログイン

2. **Developer アカウントの申請**
   - 「Sign up for free account」をクリック
   - 用途を選択（趣味の場合は「Hobbyist」）
   - アプリケーションの詳細を入力
   - 承認を待つ（通常数分〜数時間）

## 📋 ステップ 2: Twitter アプリの作成

1. **新しいアプリを作成**
   - Developer Portal にログイン
   - 「+ Create App」をクリック
   - アプリ名を入力（例：「Sports Contest Tweeter」）

2. **アプリの詳細設定**
   - App description: アプリの説明を入力
   - Website URL: 任意のURL（例：http://localhost:3000）
   - Tell us how this app will be used: 用途を詳しく説明

## 📋 ステップ 3: アプリ権限の設定（重要！）

1. **アプリの権限を変更**
   - 作成したアプリの「Settings」タブを開く
   - 「App permissions」セクションを確認
   - **「Read and write」に変更** （デフォルトは「Read only」）
   - 「Save」をクリック

2. **権限変更の確認**
   - 権限が「Read and write」になっているか確認
   - この設定がないと投稿できません

## 📋 ステップ 4: API キーの取得

1. **Keys and tokens タブを開く**
   - アプリの詳細画面で「Keys and tokens」タブをクリック

2. **API Keys の確認**
   - 「Consumer Keys」セクションを確認
   - `API Key` と `API Key Secret` をメモ
   - 表示されない場合は「Regenerate」をクリック

3. **Access Token の生成**
   - 「Access Token and Secret」セクションを確認
   - **権限変更後に「Regenerate」をクリック**（重要！）
   - `Access Token` と `Access Token Secret` をメモ
   - 権限を変更した場合は必ず再生成してください

## 📋 ステップ 5: 環境変数の設定

1. **envファイルの作成**
   ```bash
   cp .env.example .env
   ```

2. **認証情報の設定**
   ```bash
   # .env ファイルに以下を記入
   TWITTER_API_KEY=your_api_key_here
   TWITTER_API_SECRET=your_api_secret_here
   TWITTER_ACCESS_TOKEN=your_access_token_here
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
   
   # テスト用（実際に投稿したくない場合）
   TEST_MODE=true
   ```

3. **認証情報の確認**
   - すべての値が正しく設定されているか確認
   - 余分な空白や改行がないか確認
   - 引用符は不要です

## 📋 ステップ 6: 接続テスト

1. **サーバーを起動**
   ```bash
   npm start
   ```

2. **接続状況を確認**
   - ブラウザで `http://localhost:3000/api/twitter/status` にアクセス
   - 認証情報の設定状況が表示されます

3. **基本接続テスト**
   - `http://localhost:3000/api/twitter/test` にアクセス
   - 接続が成功するか確認

## 🔍 トラブルシューティング

### よくある問題と解決方法

**401 エラー: 認証情報が無効**
- [ ] APIキーとシークレットが正しく設定されているか確認
- [ ] アクセストークンとシークレットが正しく設定されているか確認
- [ ] 権限変更後にアクセストークンを再生成したか確認
- [ ] 認証情報に余分な空白が含まれていないか確認

**403 エラー: 権限不足**
- [ ] アプリの権限が「Read and write」に設定されているか確認
- [ ] 権限変更後にアクセストークンを再生成したか確認
- [ ] Twitter Developer Portal でアプリが有効になっているか確認

**接続できない**
- [ ] インターネット接続を確認
- [ ] Twitterアカウントが凍結されていないか確認
- [ ] Twitter Developer Portal でアプリが停止されていないか確認

### デバッグ用エンドポイント

- **認証状況確認**: `GET /api/twitter/status`
- **接続テスト**: `GET /api/twitter/test`

## 🎯 最重要ポイント

1. **アプリの権限を「Read and write」に設定**
2. **権限変更後にアクセストークンを再生成**
3. **4つの認証情報をすべて正しく設定**
4. **認証情報に余分な空白を含めない**

これらの手順を順番に実行すれば、401エラーは解決するはずです。