/**
 * Supabase クライアント設定と DB 操作
 */

// Supabase クライアントの初期化
let supabaseClient = null;

/**
 * Supabase クライアントを初期化
 */
function initSupabase() {
  const supabaseUrl = window.ENV?.SUPABASE_URL;
  const supabaseKey = window.ENV?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found');
    return null;
  }

  // Supabase CDN経由でクライアントを作成
  supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

/**
 * 会話履歴をデータベースに保存
 * @param {string} userId - ユーザーID
 * @param {string} question - 質問内容
 * @param {string} answer - 回答内容
 * @param {Array} sources - 参照元のソース情報
 * @returns {Promise<Object>} 保存結果
 */
async function saveChatHistory(userId, question, answer, sources = []) {
  try {
    if (!supabaseClient) {
      initSupabase();
    }

    const { data, error } = await supabaseClient
      .from('chat_history')
      .insert([
        {
          user_id: userId,
          question: question,
          answer: answer,
          sources: sources,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving chat history:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to save chat history:', error);
    throw error;
  }
}

/**
 * ユーザーの会話履歴を取得
 * @param {string} userId - ユーザーID
 * @param {number} limit - 取得件数（デフォルト: 50）
 * @returns {Promise<Array>} 会話履歴の配列
 */
async function getChatHistory(userId, limit = 50) {
  try {
    if (!supabaseClient) {
      initSupabase();
    }

    const { data, error } = await supabaseClient
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    throw error;
  }
}

/**
 * ユーザーの月間利用回数を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 月間利用回数
 */
async function getMonthlyUsageCount(userId) {
  try {
    if (!supabaseClient) {
      initSupabase();
    }

    // 今月の開始日を取得
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error, count } = await supabaseClient
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);

    if (error) {
      console.error('Error fetching usage count:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to fetch usage count:', error);
    throw error;
  }
}

/**
 * 利用制限をチェック
 * @param {string} userId - ユーザーID
 * @param {number} maxQueries - 月間最大利用回数
 * @returns {Promise<Object>} { allowed: boolean, currentCount: number, remaining: number }
 */
async function checkUsageLimit(userId, maxQueries = 100) {
  try {
    const currentCount = await getMonthlyUsageCount(userId);
    const remaining = Math.max(0, maxQueries - currentCount);
    const allowed = currentCount < maxQueries;

    return {
      allowed,
      currentCount,
      remaining,
      maxQueries
    };
  } catch (error) {
    console.error('Failed to check usage limit:', error);
    throw error;
  }
}

/**
 * 全ユーザーの利用統計を取得（管理画面用）
 * @returns {Promise<Array>} ユーザー別利用統計
 */
async function getAllUsageStats() {
  try {
    if (!supabaseClient) {
      initSupabase();
    }

    // 今月の開始日を取得
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabaseClient
      .from('chat_history')
      .select('user_id, created_at')
      .gte('created_at', startOfMonth);

    if (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }

    // ユーザーごとに集計
    const stats = {};
    data.forEach(record => {
      if (!stats[record.user_id]) {
        stats[record.user_id] = {
          userId: record.user_id,
          count: 0,
          lastUsed: record.created_at
        };
      }
      stats[record.user_id].count++;
      if (new Date(record.created_at) > new Date(stats[record.user_id].lastUsed)) {
        stats[record.user_id].lastUsed = record.created_at;
      }
    });

    return Object.values(stats);
  } catch (error) {
    console.error('Failed to fetch usage stats:', error);
    throw error;
  }
}

/**
 * 最新の質問を取得（管理画面用）
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>} 最新の質問リスト
 */
async function getRecentQuestions(limit = 20) {
  try {
    if (!supabaseClient) {
      initSupabase();
    }

    const { data, error } = await supabaseClient
      .from('chat_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent questions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch recent questions:', error);
    throw error;
  }
}

// エクスポート
export {
  initSupabase,
  saveChatHistory,
  getChatHistory,
  getMonthlyUsageCount,
  checkUsageLimit,
  getAllUsageStats,
  getRecentQuestions
};
