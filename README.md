# 年末調整BOT - README

## プロジェクト概要

Google Gemini APIを使用した年末調整専門のAIチャットボット。
RAG（Retrieval-Augmented Generation）機能により、国税庁のPDF資料を参照して正確な回答を提供します。

## 🚀 クイックスタート

### 次回セッション開始時に必ず確認

**⚠️ 重要: 以下のファイルを必ず最初に確認してください**

1. **`NEXT_SESSION.md`** - 次回の作業内容とアクションプラン
2. **`PROJECT_LOG.md`** - 全作業履歴と現在の状態

### ローカル環境の起動

```bash
# 依存関係のインストール（初回のみ）
npm install

# ローカルサーバーの起動
node server.js
```

アクセス: http://localhost:3000/chat.html

### 本番環境へのデプロイ

```bash
# Vercelへデプロイ
vercel --prod --yes
```

本番URL: https://nenmatu-chosei-bot.vercel.app

## 📁 プロジェクト構成

```
nenmatu_chosei_bot/
├── api/
│   └── chat.js          # Vercel Edge Function (本番環境)
├── lib/
│   ├── gemini.js        # Gemini API ヘルパー
│   └── vector-search.js # RAG検索機能
├── server.js            # ローカル開発サーバー
├── chat.html            # メインUI
├── chat-simple.html     # シンプルUI
├── .env                 # 環境変数（ローカル）
├── vercel.json          # Vercel設定
├── PROJECT_LOG.md       # 📝 作業履歴（必読）
├── NEXT_SESSION.md      # 📋 次回アクションプラン（必読）
└── README.md            # このファイル
```

## 🔧 環境変数

### 必須

- `GEMINI_API_KEY` - Google Gemini APIキー
- `SUPABASE_URL` - Supabase プロジェクトURL
- `SUPABASE_ANON_KEY` - Supabase 匿名キー

### オプション

- `GEMINI_MODEL` - 使用モデル（デフォルト: `gemini-1.5-pro`）
- `OPENAI_API_KEY` - OpenAI Embeddings用（RAG機能で使用）

## 📊 現在の状態

### ✅ 正常動作
- **ローカル環境**: http://localhost:3000
  - Gemini API (SDK版) 正常動作
  - RAG機能 正常動作

### ❌ 問題あり
- **本番環境**: https://nenmatu-chosei-bot.vercel.app
  - HTTP 504 タイムアウトエラー
  - 詳細は `NEXT_SESSION.md` を参照

## 🛠️ 技術スタック

- **AI**: Google Gemini API (`@google/generative-ai`)
- **RAG**: Supabase Vector Database
- **デプロイ**: Vercel (Edge Functions)
- **フロントエンド**: Vanilla JavaScript
- **バックエンド**: Node.js + Express (ローカル)

## 📝 ログファイル

すべての作業履歴は以下のファイルに記録されています:

- `PROJECT_LOG.md` - 詳細な作業ログ
- `NEXT_SESSION.md` - 次回セッションの作業内容

**セッション開始時は必ずこれらのファイルを確認してください。**

## 🔗 関連リンク

- [Google AI Studio](https://aistudio.google.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard)

---

**最終更新**: 2025-11-28 08:17  
**ステータス**: 本番環境でエラー発生中（504タイムアウト）  
**次回対応**: `NEXT_SESSION.md` を参照
