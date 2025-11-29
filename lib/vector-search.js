/**
 * ベクトル検索機能
 *
 * ユーザーの質問をベクトル化し、Supabase Vector DBから
 * 関連するPDFチャンクを検索して返します。
 */

import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化
let supabase = null;

function initSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not configured');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * テキストをOpenAI Embeddings APIでベクトル化
 *
 * @param {string} text - ベクトル化するテキスト
 * @param {AbortSignal} [signal] - AbortSignal
 * @returns {Promise<number[]>} - ベクトル（1536次元配列）
 */
export async function embedText(text, signal) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: text
      }),
      signal: signal
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI Embeddings API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.data[0].embedding;

  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

/**
 * ナレッジベースから関連するチャンクを検索
 *
 * @param {string} query - ユーザーの質問
 * @param {number} limit - 取得する件数（デフォルト: 5）
 * @param {number} threshold - 類似度のしきい値（デフォルト: 0.5）
 * @returns {Promise<Array>} - 検索結果の配列
 */
export async function searchKnowledge(query, limit = 5, threshold = 0.5) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒でタイムアウト

  try {
    // Supabase初期化
    const client = initSupabase();

    console.log(`[Vector Search] Searching for: "${query.substring(0, 50)}..."`);

    // 質問をベクトル化 (タイムアウト付き)
    const queryEmbedding = await embedText(query, controller.signal);

    // ベクトル検索（コサイン類似度）
    // Supabase JS Client自体はsignalを受け取れない場合があるが、
    // 少なくともembedding生成で詰まることは防げる
    const { data, error } = await client.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });

    clearTimeout(timeoutId);

    if (error) {
      console.error('Supabase search error:', error);
      // RPC関数がまだ存在しない場合は空配列を返す
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.warn('[Vector Search] match_knowledge function not found. Returning empty results.');
        return [];
      }
      throw error;
    }

    console.log(`[Vector Search] Found ${data?.length || 0} results`);

    // 結果を整形
    const results = (data || []).map(item => ({
      text: item.chunk_text,
      pdf_name: item.pdf_name,
      pdf_year: item.pdf_year,
      page_number: item.page_number,
      chunk_index: item.chunk_index,
      similarity: item.similarity,
      metadata: item.metadata
    }));

    return results;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn('[Vector Search] Timed out after 3000ms');
      return []; // タイムアウト時は空配列を返して続行
    }
    console.error('Error searching knowledge base:', error);
    // エラー時は空配列を返す（フォールバック）
    return [];
  }
}

/**
 * ナレッジベースの統計情報を取得
 *
 * @returns {Promise<object>} - 統計情報
 */
export async function getKnowledgeStats() {
  try {
    const client = initSupabase();

    const { data, error } = await client
      .from('knowledge_base')
      .select('pdf_name, pdf_year, id')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // PDFごとのチャンク数を集計
    const stats = {};
    data.forEach(item => {
      const key = `${item.pdf_name} (${item.pdf_year || '不明'})`;
      stats[key] = (stats[key] || 0) + 1;
    });

    return {
      total_chunks: data.length,
      pdfs: stats
    };

  } catch (error) {
    console.error('Error getting knowledge stats:', error);
    return {
      total_chunks: 0,
      pdfs: {}
    };
  }
}
