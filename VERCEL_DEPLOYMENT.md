# Vercel デプロイメントガイド

このアプリケーションをVercelでデプロイする手順です。

## 必要な準備

1. **GitHub アカウント**
2. **Vercel アカウント**
3. **Twitter Developer アカウント**（API キー取得済み）

## デプロイ手順

### 1. コードをGitHubにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

### 2. Vercelでプロジェクトを作成

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. "New Project" をクリック
3. GitHubリポジトリを選択してインポート
4. プロジェクト設定で以下を確認：
   - Framework Preset: `Other`
   - Build Command: `npm run build`（設定不要）
   - Output Directory: `public`（設定不要）
   - Install Command: `npm install`（自動設定）

### 3. PostgreSQL データベースを追加

1. Vercel Dashboardでプロジェクトを選択
2. "Storage" タブをクリック
3. "Create Database" → "Postgres" を選択
4. データベース名を入力して作成

### 4. 環境変数を設定

Vercel Dashboardの "Settings" → "Environment Variables" で以下を設定：

```
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
TEST_MODE=false
```

**重要**: PostgreSQL関連の環境変数は、データベースを追加すると自動的に設定されます。

### 5. データベースの初期化

デプロイ後、最初のアクセス時にデータベーステーブルが自動的に作成されます。

### 6. 手動でデータベースを初期化する場合

Vercel Dashboardで：

1. "Storage" → PostgreSQLデータベースを選択
2. "Query" タブで `schema.sql` の内容を実行

## アプリケーションの使用方法

1. デプロイされたURLにアクセス
2. CSVファイルをアップロードして状況オプションを設定（任意）
3. コンテスト情報を入力して投稿を作成
4. プレビューで内容を確認・編集
5. Xに投稿

## トラブルシューティング

### データベース接続エラー
- Vercel DashboardでPostgreSQL環境変数が正しく設定されているか確認
- データベースが作成されているか確認

### Twitter API エラー
- Twitter Developer Portalでアプリの権限が "Read and Write" になっているか確認
- アクセストークンが有効期限内か確認
- 環境変数が正しく設定されているか確認

### ファイルアップロードエラー
- Vercelではサーバーレス環境のため、大きなファイルのアップロードは制限があります
- CSVファイルは小さく（1MB以下）してください

## 本番環境での注意点

1. **TEST_MODE**: 本番では `false` に設定
2. **ファイルストレージ**: Vercelはサーバーレスのため、アップロードしたファイルは一時的です
3. **セッション**: データベースベースなので、セッション情報は永続化されません
4. **スケーリング**: Vercelが自動でスケーリングします

## 開発環境での実行

```bash
npm install
npm run dev
```

ローカル開発では `.env` ファイルを作成して環境変数を設定してください。