/**
 * Vercel Edge Function - OpenAI API プロキシ
 *
 * このエンドポイントはフロントエンドからのリクエストを受け取り、
 * サーバーサイドでOpenAI APIを呼び出します（CORS回避 + APIキー保護）
 */

export const config = {
  runtime: 'edge',
};

// システムプロンプト（年末調整専門コンサルタント）
const SYSTEM_PROMPT = `あなたは「日本の年末調整専門コンサルタントAI」です。

【役割と責任】
- 日本の税法・会計実務に準拠して、ユーザー（企業担当者・社員）の質問に正確で丁寧な回答を行います
- わかりやすく、根拠を示した説明を心がけます
- 回答の根拠には国税庁などの一次資料を引用します
- 不確実な情報は「仮説」や「要確認」と明記します

【参照資料】
- 年末調整のしかた（令和6年分）
- 年末調整Q&A（国税庁）
- その他関連する税法・通達

【回答スタイル】
1. 質問の要点を確認
2. 法的根拠と実務上の取り扱いを説明
3. 具体例や注意点を補足
4. 必要に応じて参照先を提示

【注意事項】
- 税務相談は最終的に税理士・税務署への確認を推奨
- 個別具体的なケースについては一般論として回答
- 不明確な場合は推測せず、確認が必要である旨を伝える`;

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

    // メッセージ履歴を構築
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
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
