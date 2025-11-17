# 年末調整BOT（OpenAI GPT-5 API 版）

税理士事務所向けの年末調整Q&A AIチャットボットシステム

> **📝 開発状況**:
> - [SESSION_LOG.md](./SESSION_LOG.md) - 最新の開発セッションログ
> - [NEXT_STEPS.md](./NEXT_STEPS.md) - 次回セッションの手順

---

## 概要

本プロジェクトは、税理士事務所が顧客企業に提供する「年末調整Q&A BOT」Webアプリケーションです。
OpenAI GPT-5 APIを活用し、国税庁の資料に基づいて年末調整に関する質問に正確かつ丁寧に回答します。

## 技術スタック

| 技術 | 用途 |
|------|------|
| **HTML + Tailwind CSS + Vanilla JS** | フロントエンド |
| **Memberstack** | 認証・ログイン制御 |
| **Supabase** | データベース（会話履歴・利用統計） |
| **OpenAI GPT-5 API** | AI回答エンジン |
| **Cloudflare Pages / Vercel** | ホスティング |

## プロジェクト構成

```
nenmatu_chosei_bot/
├── index.html              # ログインページ
├── chat.html               # チャット画面
├── admin.html              # 管理画面（税理士事務所用）
├── .env.example            # 環境変数サンプル
├── .gitignore              # Git除外設定
├── README.md               # このファイル
│
├── scripts/                # JavaScript
│   ├── chat.js             # チャット画面ロジック
│   └── openai.js           # OpenAI API連携
│
├── lib/                    # ライブラリ
│   └── supabase.js         # Supabase連携
│
└── styles/                 # スタイル（必要に応じて）
```

## セットアップ手順

### 1. プロジェクトのクローン

```bash
git clone <repository-url>
cd nenmatu_chosei_bot
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーして、必要な情報を設定します。

```bash
cp .env.example .env
```

`.env` ファイルの内容を編集：

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Memberstack Configuration
MEMBERSTACK_PUBLIC_KEY=your_memberstack_public_key_here

# Application Settings
MAX_QUERIES_PER_MONTH=100
```

### 3. Supabase データベース設定

Supabase にログインして新しいプロジェクトを作成し、以下のテーブルを作成します。

#### `chat_history` テーブル

```sql
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
```

### 4. Memberstack 設定

1. [Memberstack](https://www.memberstack.com/) にログインしてプロジェクトを作成
2. Settings > Installation から Webflow用スクリプトをコピー
3. `index.html` と `chat.html` の以下の箇所を更新：

```html
<script src="https://api.memberstack.com/static/memberstack.js?webflow"
  data-memberstack-id="YOUR_MEMBERSTACK_PUBLIC_KEY">
</script>
```

`YOUR_MEMBERSTACK_PUBLIC_KEY` を実際のPublic Keyに置き換えてください。

### 5. OpenAI API キーの取得

1. [OpenAI Platform](https://platform.openai.com/) にログイン
2. API Keys セクションで新しいキーを作成
3. `.env` ファイルに設定

**注意**: GPT-5が利用可能になるまでは、`scripts/openai.js` で `model: 'gpt-4'` を使用しています。
GPT-5がリリースされたら `model: 'gpt-5'` に変更してください。

### 6. デプロイ（Vercel の場合）

```bash
# Vercel CLIをインストール
npm install -g vercel

# デプロイ
vercel

# 環境変数を設定
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add MEMBERSTACK_PUBLIC_KEY
```

### 6. デプロイ（Cloudflare Pages の場合）

1. Cloudflare Dashboard にログイン
2. Pages > Create a project
3. GitHubリポジトリを接続
4. 環境変数を設定
5. デプロイ

## 機能一覧

### 1. ユーザー向け機能

- **ログイン認証**（Memberstack）
- **AIチャット**（GPT-5による回答）
- **会話履歴の保存・閲覧**
- **利用回数の確認**（月間100回まで）
- **ストリーミングレスポンス**（リアルタイム回答表示）

### 2. 管理画面（税理士事務所用）

- **ユーザー別利用状況の確認**
- **今月の総質問数の集計**
- **最新の質問一覧の表示**
- **利用統計のダッシュボード**

## AI プロンプト仕様

システムプロンプトは `scripts/openai.js` で定義されています：

```javascript
あなたは「日本の年末調整専門コンサルタントAI」です。

【役割と責任】
- 日本の税法・会計実務に準拠して、ユーザー（企業担当者・社員）の質問に正確で丁寧な回答を行います
- わかりやすく、根拠を示した説明を心がけます
- 回答の根拠には国税庁などの一次資料を引用します
- 不確実な情報は「仮説」や「要確認」と明記します

【参照資料】
- 年末調整のしかた（令和6年分）
- 年末調整Q&A（国税庁）
```

## 知識ベース（Knowledge Base）

将来的にSupabaseストレージまたはベクトルDBに以下のPDFを格納予定：

- [年末調整のしかた（令和6年分）](https://www.nta.go.jp/publication/pamph/gensen/nencho2025/pdf/nencho_all.pdf)
- [年末調整Q&A](https://www.nta.go.jp/publication/pamph/gensen/nencho2025/pdf/207.pdf)

現在は、OpenAI APIのレスポンス内で参照資料を言及する形で実装されています。

## 利用制限

- 1ユーザーあたり **月100回** まで質問可能
- 利用制限は Supabase の `chat_history` テーブルでカウント
- 上限に達した場合は警告メッセージを表示

## セキュリティ

- **SSL/TLS**: ホスティングサービスで自動設定
- **環境変数**: APIキーは `.env` で管理、リポジトリにコミットしない
- **認証**: Memberstack による安全なログイン管理
- **データベース**: Supabase の Row Level Security (RLS) を推奨

## 開発モード

ローカルで開発する場合は、静的ファイルサーバーを起動：

```bash
# Python 3の場合
python -m http.server 8000

# Node.jsの場合（live-server推奨）
npx live-server
```

ブラウザで `http://localhost:8000` にアクセスして動作確認できます。

## トラブルシューティング

### 問題: OpenAI APIエラー

**解決策**:
- `.env` に `OPENAI_API_KEY` が正しく設定されているか確認
- OpenAI アカウントに十分なクレジットがあるか確認
- ブラウザの開発者コンソールでエラーメッセージを確認

### 問題: Supabase接続エラー

**解決策**:
- `.env` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` を確認
- Supabase プロジェクトが作成されているか確認
- `chat_history` テーブルが正しく作成されているか確認

### 問題: ログイン後も /portal にアクセスできない

**解決策**:
- Memberstack の設定で `/chat.html` が保護されているか確認
- ブラウザのCookieが有効になっているか確認
- 開発者コンソールで認証エラーがないか確認

## 今後の拡張予定

- [ ] ベクトルDBによる知識検索（Pinecone / Supabase Vector）
- [ ] PDFアップロード機能
- [ ] 複数年度対応（令和7年分など）
- [ ] エクスポート機能（CSV / PDF）
- [ ] 音声入力対応
- [ ] マルチテナント対応（複数の税理士事務所）

## ライセンス

本プロジェクトは税理士事務所向けの内部利用を想定しています。
国税庁資料の利用については、[国税庁の利用規約](https://www.nta.go.jp/)を確認してください。

## サポート

技術的な質問や不具合報告は、プロジェクトの Issue にて受け付けています。

---

**開発**: Claude Code によって生成
**最終更新**: 2025年（令和7年）
