/**
 * Vercel Edge Function - OpenAI API プロキシ + RAG統合
 *
 * このエンドポイントはフロントエンドからのリクエストを受け取り、
 * サーバーサイドでOpenAI APIを呼び出します（CORS回避 + APIキー保護）
 *
 * RAG機能：
 * - ユーザーの質問をベクトル検索
 * - Supabase Vector DBから関連PDFチャンクを取得
 * - システムプロンプトに検索結果を追加して回答精度を向上
 */

import { searchKnowledge } from '../lib/vector-search.js';

export const config = {
  runtime: 'edge',
};

// システムプロンプト（年末調整専門コンサルタント）
const SYSTEM_PROMPT = `あなたは「日本の年末調整専門コンサルタントAI」です。

【役割と責任】
- 日本の税法・会計実務に準拠して、ユーザー（企業担当者・社員）の質問に正確で丁寧な回答を行います
- 必ず根拠を示した説明を行い、推測の場合は明示します

【情報参照の優先順位（厳格に守ること）】
1. **Knowledge（アップロードされたPDF資料）** ← 最優先
   - 年末調整のしかた（令和6年分）
   - 年末調整Q&A（国税庁）
   - この情報が提供された場合、必ずこれを最優先で参照すること

2. **国税庁公式サイト** (https://www.nta.go.jp/)

3. **政府関連一次資料**
   - e-Gov法令検索
   - 総務省、厚生労働省などの公式ドメイン

4. **信頼性の高い会計ソフト会社**
   - freee、マネーフォワード、弥生会計など

5. **会計事務所・税理士法人の専門記事**

6. **Web検索（最終手段）**
   - 使用前に「一次資料を優先して確認します」と宣言
   - 必ず信頼できる専門サイトを引用

【回答形式（必須）】
1. **根拠を必ず明示**
   - PDFからの引用: 「📄 引用：年末調整のしかた p.15付近」
   - 一次資料: 「🔗 参照：国税庁○○ページ」
   - 根拠がない場合は明示的に「⚠️ 一般的な知識に基づく回答です」

2. **不確実な情報は「要確認」と明記**
   - 推測の場合: 「💭 推測：〜と考えられますが、要確認です」

3. **最終的な判断は専門家に**
   - 必ず「最終的な判断は税理士・税務署にご確認ください」と促す

【注意事項】
- PDFの検索結果が提供された場合、必ずそれを最優先で参照すること
- 根拠のない推測は絶対に行わないこと
- 個別具体的なケースについては一般論として回答し、専門家への相談を促すこと`;

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // リクエストボディを取得
    const body = await req.json();
    const { message, userId, conversationHistory = [] } = body;

    // バリデーション
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid message' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 環境変数からAPIキーとモデルを取得
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // デフォルトは gpt-4o-mini

    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // RAG検索: ナレッジベースから関連情報を取得
    let searchResults = [];
    try {
      console.log('[RAG] Searching knowledge base...');
      searchResults = await searchKnowledge(message, 5, 0.6);
      console.log(`[RAG] Found ${searchResults.length} relevant chunks`);
    } catch (error) {
      console.error('[RAG] Knowledge search failed:', error);
      // RAG検索失敗時もエラーにせず、通常の回答を続行
    }

    // システムプロンプトを拡張（RAG検索結果を追加）
    let enhancedPrompt = SYSTEM_PROMPT;

    if (searchResults.length > 0) {
      const knowledgeContext = searchResults.map((result, index) => {
        return `[${index + 1}] 📄 出典: ${result.pdf_name}${result.pdf_year ? ` (${result.pdf_year})` : ''} p.${result.page_number || '?'}付近
内容: ${result.text.substring(0, 500)}${result.text.length > 500 ? '...' : ''}
類似度: ${(result.similarity * 100).toFixed(1)}%`;
      }).join('\n\n');

      enhancedPrompt = `${SYSTEM_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【検索されたPDF資料（最優先で参照すること）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
上記の資料を最優先で参照して回答してください。
回答には必ず「📄 引用：〜」の形式で出典を明記してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    // メッセージ履歴を構築
    const messages = [
      { role: 'system', content: enhancedPrompt }
    ];

    // 会話履歴を追加（最新5件まで）
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach(item => {
        messages.push({ role: 'user', content: item.question });
        messages.push({ role: 'assistant', content: item.answer });
      });
    }

    // 現在の質問を追加
    messages.push({ role: 'user', content: message });

    // OpenAI API呼び出し
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false, // ストリーミングはオフ（シンプル実装）
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);

      return new Response(
        JSON.stringify({
          error: 'AI service error',
          details: errorData.error?.message || 'Unknown error',
        }),
        {
          status: openaiResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const data = await openaiResponse.json();
    const answer = data.choices[0].message.content;

    // ソース情報を抽出
    const sources = extractSources(answer);

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        answer: answer,
        sources: sources,
        usage: data.usage,
        model: model,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Server error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

/**
 * 回答からソース情報を抽出
 */
function extractSources(answer) {
  const sources = [];

  // 国税庁への言及を検出
  if (answer.includes('国税庁') || answer.includes('年末調整のしかた')) {
    sources.push({
      title: '年末調整のしかた（令和6年分）',
      url: 'https://www.nta.go.jp/publication/pamph/gensen/nencho2025/pdf/nencho_all.pdf',
      type: 'official'
    });
  }

  if (answer.includes('Q&A') || answer.includes('よくある質問')) {
    sources.push({
      title: '年末調整Q&A',
      url: 'https://www.nta.go.jp/publication/pamph/gensen/nencho2025/pdf/207.pdf',
      type: 'official'
    });
  }

  return sources;
}
