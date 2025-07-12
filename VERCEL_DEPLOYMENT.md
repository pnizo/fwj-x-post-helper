# Vercel + Supabase デプロイメントガイド

このアプリケーションをVercel（フロントエンド・バックエンド）とSupabase（データベース）でデプロイする手順です。

## 必要な準備

1. **GitHub アカウント**
2. **Vercel アカウント**
3. **Supabase アカウント**
4. **Twitter Developer アカウント**（API キー取得済み）

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

### 3. Supabase データベースを設定

1. [Supabase](https://supabase.com/) にアクセスしてアカウント作成
2. "New project" でプロジェクトを作成
3. プロジェクトのダッシュボードで "Settings" → "API" を開く
4. 以下の情報をメモ：
   - Project URL
   - anon public key
5. "SQL Editor" を開き、`supabase-schema.sql` の内容を実行してテーブルを作成

### 4. 環境変数を設定

Vercel Dashboardの "Settings" → "Environment Variables" で以下を設定：

```
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
TEST_MODE=false
```

**重要**: Supabase のURLとキーは、Supabaseプロジェクトの Settings → API から取得してください。

### 5. データベースの初期化

Supabase SQL Editorで `supabase-schema.sql` の内容を実行することで、必要なテーブルが作成されます。

### 6. デプロイメントの確認

1. Vercelでデプロイが完了したら、提供されたURLにアクセス
2. アプリケーションが正常に動作するか確認
3. Twitter API認証が正常に表示されるか確認

## アプリケーションの使用方法

1. デプロイされたURLにアクセス
2. CSVファイルをアップロードして状況オプションを設定（任意）
3. コンテスト情報を入力して投稿を作成
4. プレビューで内容を確認・編集
5. Xに投稿

## トラブルシューティング

### データベース接続エラー
- Vercel DashboardでSupabase環境変数（SUPABASE_URL, SUPABASE_ANON_KEY）が正しく設定されているか確認
- Supabaseプロジェクトが作成され、テーブルが正しく作成されているか確認
- Supabase SQL Editorで `supabase-schema.sql` が正常に実行されたか確認

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
3. **データベース**: Supabaseが永続的なPostgreSQLデータベースを提供します
4. **スケーリング**: VercelとSupabase両方が自動でスケーリングします
5. **セキュリティ**: Supabaseでは必要に応じてRow Level Security (RLS) を設定できます

## 開発環境での実行

```bash
npm install
npm run dev
```

ローカル開発では `.env` ファイルを作成して環境変数を設定してください。