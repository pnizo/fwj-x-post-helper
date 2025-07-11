# OAuth 2.0 セットアップガイド

## 🚀 OAuth 2.0 with PKCE を使用する理由

OAuth 2.0 with PKCEは**最新で最も安全**な認証方式です：

- ✅ **セキュリティが高い** - PKCEによりセキュリティが強化
- ✅ **ユーザーフレンドリー** - ブラウザ経由での簡単な認証
- ✅ **モダン** - Twitterが推奨する最新の認証方式
- ✅ **柔軟性** - 複数ユーザーの認証に対応

## 📋 ステップ 1: Twitter Developer Portal での設定

### 1.1 アプリの作成
1. **Twitter Developer Portal** にアクセス
   - https://developer.twitter.com/
   - Twitterアカウントでログイン

2. **新しいアプリを作成**
   - 「+ Create App」をクリック
   - アプリ名を入力（例：「Sports Contest Tweeter」）

### 1.2 アプリの権限設定
1. **アプリの権限を変更**
   - 作成したアプリの「Settings」タブを開く
   - 「App permissions」セクションで **「Read and write」** を選択
   - 「Save」をクリック

### 1.3 OAuth 2.0 設定
1. **Authentication settings を開く**
   - アプリの詳細画面で「Settings」タブ内の「Set up」をクリック

2. **OAuth 2.0 を有効化**
   - 「OAuth 2.0 Settings」セクションで「Set up」をクリック
   - 「Type of App」で **「Web App, Automated App or Bot」** を選択

3. **コールバックURL を設定**
   - 「Callback URI / Redirect URL」に以下を追加：
   ```
   http://localhost:3000/auth/twitter/callback
   ```

4. **Website URL を設定**
   - 「Website URL」に以下を入力：
   ```
   http://localhost:3000
   ```

5. **設定を保存**
   - 「Save」をクリック

## 📋 ステップ 2: API キーの取得

1. **Keys and tokens タブを開く**
   - アプリの詳細画面で「Keys and tokens」タブをクリック

2. **OAuth 2.0 Client ID と Secret を取得**
   - 「OAuth 2.0 Client ID and Client Secret」セクションを確認
   - `Client ID` をコピー
   - 「Generate」をクリックして `Client Secret` を生成・コピー
   - **重要**: Client Secretは一度しか表示されないので必ず保存

## 📋 ステップ 3: 環境変数の設定

1. **envファイルの作成**
   ```bash
   cp .env.example .env
   ```

2. **OAuth 2.0 認証情報の設定**
   ```bash
   # .env ファイルに以下を記入
   TWITTER_CLIENT_ID=your_client_id_here
   TWITTER_CLIENT_SECRET=your_client_secret_here
   
   # セッション用のランダムな秘密鍵
   SESSION_SECRET=your-random-secret-key-here
   
   # テスト用（任意）
   TEST_MODE=false
   ```

3. **セッションシークレットの生成**
   - ランダムな文字列を生成してSESSION_SECRETに設定
   - 例：`SESSION_SECRET=my-super-secret-session-key-2024`

## 📋 ステップ 4: アプリケーションの起動とテスト

1. **依存関係をインストール**
   ```bash
   npm install
   ```

2. **サーバーを起動**
   ```bash
   npm start
   ```

3. **認証をテスト**
   - ブラウザで `http://localhost:3000` にアクセス
   - 「Xで認証する」ボタンをクリック
   - Twitterの認証画面でアプリを承認
   - 認証成功後、ユーザー情報が表示される

## 🔄 OAuth 2.0 認証フロー

1. **ユーザーが「Xで認証する」をクリック**
2. **Twitter認証ページにリダイレクト**
3. **ユーザーがアプリを承認**
4. **コールバックURLに認証コードが送信**
5. **サーバーが認証コードをアクセストークンに交換**
6. **ユーザー情報を取得してセッションに保存**
7. **認証完了 - ツイート投稿が可能**

## 🛠️ トラブルシューティング

### よくある問題と解決方法

**❌ コールバックURLエラー**
```
Error: Invalid callback URL
```
**解決方法:**
- Twitter Developer PortalでコールバックURLが正しく設定されているか確認
- `http://localhost:3000/auth/twitter/callback` が設定されているか確認

**❌ Client ID/Secret エラー**
```
Error: Invalid client credentials
```
**解決方法:**
- .envファイルのTWITTER_CLIENT_IDとTWITTER_CLIENT_SECRETが正しく設定されているか確認
- 余分な空白や改行がないか確認

**❌ 権限エラー**
```
Error: Insufficient permissions
```
**解決方法:**
- Twitter Developer Portalでアプリの権限が「Read and write」に設定されているか確認
- OAuth 2.0が有効になっているか確認

## 🎯 重要なポイント

1. **アプリの権限を「Read and write」に設定**
2. **OAuth 2.0を有効化**
3. **正しいコールバックURLを設定**
4. **Client SecretをPrivateに保つ**
5. **SESSION_SECRETにランダムな文字列を設定**

## 🔒 セキュリティ注意事項

- **Client Secretは絶対に公開しない**
- **SESSION_SECRETは本番環境で必ず変更**
- **HTTPSを本番環境では必須使用**
- **コールバックURLは本番環境に合わせて変更**

これで OAuth 2.0 with PKCE を使用したモダンで安全な Twitter 認証が完成します！