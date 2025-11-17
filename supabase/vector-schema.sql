-- =====================================================================
-- 年末調整BOT - ナレッジベース（RAG）用テーブル定義
-- =====================================================================
-- 実行方法：
-- 1. Supabase ダッシュボードにログイン
-- 2. プロジェクトを選択
-- 3. SQL Editor を開く
-- 4. このファイルの内容をコピー＆ペーストして実行
-- =====================================================================

-- pgvector拡張を有効化（ベクトル検索に必要）
CREATE EXTENSION IF NOT EXISTS vector;

-- ナレッジベーステーブル
-- PDFから抽出したテキストチャンクとそのベクトル表現を保存
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- PDF情報
  pdf_name TEXT NOT NULL,              -- PDFファイル名（例: "年末調整のしかた.pdf"）
  pdf_year TEXT,                       -- 年度（例: "令和6年分"）

  -- チャンク情報
  page_number INT,                     -- ページ番号
  chunk_index INT NOT NULL,            -- PDFファイル内でのチャンクの順序
  chunk_text TEXT NOT NULL,            -- チャンクの実際のテキスト内容

  -- ベクトル情報
  embedding VECTOR(1536),              -- OpenAI text-embedding-3-small の次元数

  -- メタデータ
  metadata JSONB DEFAULT '{}'::jsonb,  -- その他の情報（セクション名など）

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ベクトル検索用インデックス（コサイン類似度）
-- IVFFlat アルゴリズムを使用（高速検索）
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_base
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- その他の検索用インデックス
CREATE INDEX IF NOT EXISTS idx_knowledge_pdf_name
  ON knowledge_base(pdf_name);

CREATE INDEX IF NOT EXISTS idx_knowledge_pdf_year
  ON knowledge_base(pdf_year);

CREATE INDEX IF NOT EXISTS idx_knowledge_created_at
  ON knowledge_base(created_at DESC);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- ベクトル検索用のRPC関数
-- =====================================================================
-- この関数は lib/vector-search.js から呼び出されます

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  pdf_name TEXT,
  pdf_year TEXT,
  page_number INT,
  chunk_index INT,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.pdf_name,
    knowledge_base.pdf_year,
    knowledge_base.page_number,
    knowledge_base.chunk_index,
    knowledge_base.chunk_text,
    knowledge_base.metadata,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================================
-- 動作確認用クエリ
-- =====================================================================
-- テーブルが正しく作成されたか確認：
-- SELECT * FROM knowledge_base LIMIT 1;

-- pgvector拡張が有効か確認：
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- インデックスが作成されたか確認：
-- SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_base';
-- =====================================================================
