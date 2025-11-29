-- =====================================================================
-- 年末調整BOT - スキーマ修正用スクリプト
-- =====================================================================
-- 目的: 既存の knowledge_base テーブルを、アプリケーションが期待するスキーマに合わせる
-- 実行方法: Supabase SQL Editor でこのファイルの内容を実行してください
-- =====================================================================

-- 1. カラム名の変更
-- content -> chunk_text
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'content') THEN
    ALTER TABLE knowledge_base RENAME COLUMN content TO chunk_text;
  END IF;
END $$;

-- year -> pdf_year
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'year') THEN
    ALTER TABLE knowledge_base RENAME COLUMN year TO pdf_year;
  END IF;
END $$;

-- 2. 不足しているカラムの追加
-- pdf_name
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'pdf_name') THEN
    ALTER TABLE knowledge_base ADD COLUMN pdf_name TEXT;
    -- 既存のレコードがある場合、デフォルト値を設定（任意）
    -- UPDATE knowledge_base SET pdf_name = 'unknown.pdf' WHERE pdf_name IS NULL;
    -- ALTER TABLE knowledge_base ALTER COLUMN pdf_name SET NOT NULL;
  END IF;
END $$;

-- page_number
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'page_number') THEN
    ALTER TABLE knowledge_base ADD COLUMN page_number INT;
  END IF;
END $$;

-- 3. インデックスの追加（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_knowledge_pdf_name ON knowledge_base(pdf_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_pdf_year ON knowledge_base(pdf_year);

-- 4. match_knowledge 関数の再定義
-- カラム名変更に伴い、関数も更新する必要があります
DROP FUNCTION IF EXISTS match_knowledge;

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

-- 完了確認
SELECT 'Schema update completed successfully!' AS status;
