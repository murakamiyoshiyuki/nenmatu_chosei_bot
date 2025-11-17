-- 年末調整BOT - Supabase データベーススキーマ

-- ================================================
-- 1. chat_history テーブル（会話履歴）
-- ================================================

CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- コメント
COMMENT ON TABLE chat_history IS '年末調整BOTの会話履歴を保存するテーブル';
COMMENT ON COLUMN chat_history.id IS '一意のID（UUID）';
COMMENT ON COLUMN chat_history.user_id IS 'ユーザーID（Memberstack等から取得）';
COMMENT ON COLUMN chat_history.question IS 'ユーザーの質問';
COMMENT ON COLUMN chat_history.answer IS 'AIの回答';
COMMENT ON COLUMN chat_history.sources IS '参照したソース情報（JSON配列）';
COMMENT ON COLUMN chat_history.created_at IS '作成日時';

-- ================================================
-- 2. Row Level Security (RLS) 設定（推奨）
-- ================================================

-- RLSを有効化
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分のデータのみ読み取り可能
CREATE POLICY "Users can view their own chat history"
  ON chat_history
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- ポリシー: ユーザーは自分のデータのみ挿入可能
CREATE POLICY "Users can insert their own chat history"
  ON chat_history
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- 注意: 管理者がすべてのデータを閲覧する場合は、
-- Supabase Service Role Keyを使用してRLSをバイパスする必要があります

-- ================================================
-- 3. サンプルデータ（開発・テスト用）
-- ================================================

-- サンプル会話を挿入（任意）
-- INSERT INTO chat_history (user_id, question, answer, sources)
-- VALUES
--   (
--     'demo-user-001',
--     '生命保険料控除証明書を紛失しました。どうすればいいですか？',
--     '生命保険料控除証明書を紛失した場合は、契約している保険会社に再発行を依頼してください。再発行には通常1〜2週間程度かかります。年末調整の期限に間に合わない場合は、確定申告で控除を受けることも可能です。',
--     '[{"title": "年末調整のしかた（令和6年分）", "url": "https://www.nta.go.jp/publication/pamph/gensen/nencho2025/pdf/nencho_all.pdf", "type": "official"}]'::jsonb
--   );

-- ================================================
-- 4. 便利なビュー（任意）
-- ================================================

-- 今月の利用統計ビュー
CREATE OR REPLACE VIEW monthly_usage_stats AS
SELECT
  user_id,
  COUNT(*) AS query_count,
  MAX(created_at) AS last_used,
  DATE_TRUNC('month', created_at) AS month
FROM chat_history
WHERE created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
GROUP BY user_id, DATE_TRUNC('month', created_at)
ORDER BY query_count DESC;

-- コメント
COMMENT ON VIEW monthly_usage_stats IS '今月のユーザー別利用統計';

-- ================================================
-- 5. データベース関数（任意）
-- ================================================

-- ユーザーの月間利用回数を取得する関数
CREATE OR REPLACE FUNCTION get_user_monthly_count(p_user_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM chat_history
    WHERE user_id = p_user_id
      AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
  );
END;
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON FUNCTION get_user_monthly_count IS 'ユーザーの今月の質問回数を取得';

-- 使用例: SELECT get_user_monthly_count('demo-user-001');

-- ================================================
-- 6. トリガー（任意）
-- ================================================

-- 利用制限チェック関数
CREATE OR REPLACE FUNCTION check_usage_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_limit INTEGER := 100;
BEGIN
  -- 今月の利用回数を取得
  SELECT COUNT(*) INTO current_count
  FROM chat_history
  WHERE user_id = NEW.user_id
    AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP);

  -- 上限チェック
  IF current_count >= max_limit THEN
    RAISE EXCEPTION 'Usage limit exceeded for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
CREATE TRIGGER enforce_usage_limit
  BEFORE INSERT ON chat_history
  FOR EACH ROW
  EXECUTE FUNCTION check_usage_limit();

-- コメント
COMMENT ON FUNCTION check_usage_limit IS '月間利用制限をチェックするトリガー関数';

-- ================================================
-- セットアップ完了
-- ================================================

-- 確認クエリ
SELECT 'Supabase schema setup completed successfully!' AS status;
