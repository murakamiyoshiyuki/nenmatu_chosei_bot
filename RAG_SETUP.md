# RAG機能セットアップガイド

年末調整BOTにRAG（Retrieval-Augmented Generation）機能を追加するための手順書です。

## 📋 概要

このRAG機能により、AIがアップロードされたPDF資料を参照して回答できるようになります。

**主な機能**:
- PDFファイルからテキスト抽出
- テキストのチャンク分割とベクトル化
- Supabase Vector DBへの保存
- ユーザー質問に対する意味的検索
- 検索結果を基にした正確な回答生成

**情報参照の優先順位**:
1. **Knowledge（アップロードされたPDF資料）** ← 最優先
2. 国税庁公式サイト
3. 政府関連一次資料
4. 会計ソフト会社の情報
5. 税理士法人の記事
6. Web検索（最終手段）

---

## 🚀 セットアップ手順

### Step 1: 依存関係のインストール

```bash
npm install
```

新たに追加されたパッケージ:
- `@supabase/supabase-js` - Supabaseクライアント
- `pdf-parse` - PDF解析ライブラリ

---

### Step 2: Supabaseデータベースのセットアップ

#### 2-1. Supabaseダッシュボードにアクセス

1. https://app.supabase.com/ にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を開く

#### 2-2. スキーマを実行

1. `supabase/vector-schema.sql` ファイルを開く
2. 全内容をコピー
3. Supabase SQL Editorに貼り付け
4. 「RUN」ボタンをクリック

**実行されるもの**:
- `pgvector`拡張の有効化
- `knowledge_base`テーブルの作成
- ベクトル検索用インデックスの作成
- `match_knowledge()`関数の作成

#### 2-3. 実行確認

以下のクエリを実行して、テーブルが作成されたことを確認:

```sql
SELECT * FROM knowledge_base LIMIT 1;
```

エラーが出なければ成功です（データはまだ空です）。

---

### Step 3: 環境変数の設定

#### 3-1. ローカル開発環境（.env）

`.env`ファイルに以下の環境変数が設定されていることを確認:

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Memberstack
MEMBERSTACK_PUBLIC_KEY=pk_e15c36b2351879cf0875
MEMBERSTACK_APP_ID=app_cmi2mk2e600230st1fly1z13ko
```

#### 3-2. Vercel本番環境

Vercelダッシュボードで以下の環境変数を追加:

1. Vercelプロジェクトの「Settings」→「Environment Variables」を開く
2. 以下を追加:

| Name | Value |
|------|-------|
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` |

**注意**: 他の環境変数（`OPENAI_API_KEY`, `SUPABASE_URL`等）は既に設定済みのはずです。

---

### Step 4: PDFファイルの準備

#### 4-1. PDFファイルを配置

プロジェクトルートに `pdfs/` ディレクトリを作成し、PDFファイルを配置:

```bash
mkdir pdfs
```

推奨ファイル:
- `年末調整のしかた.pdf` （令和6年分）
- `年末調整Q&A.pdf` （国税庁）

#### 4-2. PDFのアップロード

```bash
# 年末調整のしかたをアップロード
node scripts/upload-knowledge.js ./pdfs/年末調整のしかた.pdf "令和6年分"

# 年末調整Q&Aをアップロード
node scripts/upload-knowledge.js ./pdfs/年末調整Q&A.pdf "令和6年分"
```

**処理内容**:
1. PDFからテキスト抽出
2. 800文字ごとにチャンク分割（100文字オーバーラップ）
3. OpenAI APIでベクトル化（text-embedding-3-small）
4. Supabaseに保存

**所要時間**: PDF 1冊あたり5〜15分程度（ページ数による）

**注意**: OpenAI API制限を考慮し、各チャンク間に200msの待機時間を設けています。

---

### Step 5: アップロード確認

#### 5-1. 統計情報の表示

```bash
node scripts/upload-knowledge.js --stats
```

**出力例**:
```
=========================================
   年末調整BOT - ナレッジ統計
=========================================

📊 総チャンク数: 245

📚 PDFごとのチャンク数:
   - 年末調整のしかた.pdf: 180 chunks
   - 年末調整Q&A.pdf: 65 chunks

=========================================
```

#### 5-2. Supabaseで直接確認

Supabase SQL Editorで以下を実行:

```sql
SELECT
  pdf_name,
  COUNT(*) as chunk_count,
  MIN(created_at) as uploaded_at
FROM knowledge_base
GROUP BY pdf_name;
```

---

## 🧪 動作テスト

### ローカル環境でのテスト

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開き:

1. Memberstackでログイン
2. チャット画面で質問: 「年末調整とは何ですか？」
3. ブラウザのコンソールを開く（F12）
4. 以下のログが表示されることを確認:

```
[RAG] Searching knowledge base...
[RAG] Found 5 relevant chunks
```

5. AIの回答に以下の形式で引用が含まれることを確認:

```
📄 引用：年末調整のしかた (令和6年分) p.15付近
```

### Vercel本番環境でのテスト

1. Vercelにプッシュ
2. デプロイ完了後、本番URLでログイン
3. 同様にチャット機能をテスト
4. Vercelダッシュボードの「Functions」→「Logs」で以下を確認:

```
[RAG] Searching knowledge base...
[RAG] Found X relevant chunks
```

---

## 🔧 管理コマンド

### PDFの削除

特定のPDFをナレッジベースから削除:

```bash
node scripts/upload-knowledge.js --delete "年末調整のしかた.pdf"
```

### 統計情報の確認

```bash
node scripts/upload-knowledge.js --stats
```

---

## 📁 追加されたファイル

### スキーマ定義
- `supabase/vector-schema.sql` - Supabaseテーブル定義

### ライブラリ
- `lib/vector-search.js` - ベクトル検索コア機能
  - `embedText()` - テキストをベクトル化
  - `searchKnowledge()` - 意味的検索
  - `getKnowledgeStats()` - 統計取得

### スクリプト
- `scripts/pdf-processor.js` - PDF処理パイプライン
  - `processPDF()` - PDF読み込み＆チャンク分割
  - `saveChunksToSupabase()` - ベクトル化＆保存
  - `deleteKnowledge()` - 削除

- `scripts/upload-knowledge.js` - CLIツール
  - PDFアップロード
  - 統計表示
  - ナレッジ削除

### 修正されたファイル
- `api/chat.js` - RAG統合＆SYSTEM_PROMPT更新
- `package.json` - 依存関係追加
- `.env` / `.env.example` - 環境変数追加

---

## ⚠️ トラブルシューティング

### エラー: "OPENAI_API_KEY not configured"

**原因**: OpenAI APIキーが設定されていない

**解決策**:
1. `.env`ファイルに`OPENAI_API_KEY`が設定されているか確認
2. Vercel環境変数に`OPENAI_API_KEY`が設定されているか確認

### エラー: "Supabase credentials not configured"

**原因**: Supabase認証情報が不足

**解決策**:
1. `.env`に`SUPABASE_URL`と`SUPABASE_ANON_KEY`が設定されているか確認
2. Supabaseダッシュボードから正しいキーをコピー

### RAG検索結果が0件

**原因**: PDFがアップロードされていない、または類似度が低い

**解決策**:
1. `node scripts/upload-knowledge.js --stats`で確認
2. チャンク数が0の場合は再アップロード
3. 類似度閾値を下げる（`api/chat.js`の`searchKnowledge(message, 5, 0.6)`の0.6を0.5に変更）

### PDF処理が途中で止まる

**原因**: OpenAI APIレート制限

**解決策**:
1. しばらく待ってから再実行
2. `scripts/pdf-processor.js`の`setTimeout(resolve, 200)`の200を500に変更

### 回答に引用が含まれない

**原因**: 検索結果はあるが、AIが引用を省略している

**確認方法**:
1. コンソールで`[RAG] Found X relevant chunks`を確認
2. Xが0より大きい場合はAIのプロンプト解釈の問題

**解決策**:
- より明確な質問をする（例: 「年末調整とは」→「年末調整の目的と手続きについて教えてください」）

---

## 📚 技術仕様

### ベクトル検索
- **埋め込みモデル**: OpenAI text-embedding-3-small (1536次元)
- **類似度指標**: コサイン類似度（cosine similarity）
- **インデックス**: IVFFlat (lists = 100)
- **デフォルト閾値**: 0.6 (60%以上の類似度)
- **デフォルト取得数**: 5チャンク

### テキスト処理
- **チャンクサイズ**: 800文字
- **オーバーラップ**: 100文字
- **文字コード**: UTF-8

### レート制限
- **埋め込みAPI**: 各チャンク間200ms待機
- **推定速度**: 約5チャンク/秒

---

## 🔐 セキュリティ注意事項

1. **APIキーの管理**
   - `.env`ファイルは`.gitignore`に含まれています
   - 絶対にGitHubにプッシュしないでください

2. **Supabase RLS（Row Level Security）**
   - 現在RLSは無効化されています（管理者のみアクセスを想定）
   - 本番環境では必要に応じてRLSポリシーを設定してください

3. **PDF内容の機密性**
   - アップロードしたPDFの内容はSupabaseに保存されます
   - 機密情報を含むPDFのアップロードには注意してください

---

## 📝 今後の拡張案

- [ ] ページごとの正確な分割（現在は推定）
- [ ] 画像・図表の抽出とOCR処理
- [ ] チャンクサイズの最適化
- [ ] ユーザーごとのナレッジベース
- [ ] PDF管理UI（admin画面）
- [ ] 引用元のハイライト表示

---

## 🤝 サポート

問題が発生した場合:

1. まず`node scripts/upload-knowledge.js --stats`で状態確認
2. Supabase SQL Editorで`SELECT COUNT(*) FROM knowledge_base;`を実行
3. Vercel Function Logsで`[RAG]`ログを確認
4. 上記で解決しない場合は開発者に連絡

---

**作成日**: 2025-01-17
**バージョン**: 1.0.0
