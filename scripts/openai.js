/**
 * OpenAI APIプロキシ連携モジュール
 *
 * 注意: OpenAI APIを直接呼び出すのではなく、
 * サーバーサイドのプロキシ（/api/chat）経由でリクエストします
 */

// API エンドポイント（本番/開発で自動切り替え）
const API_ENDPOINT = '/api/chat';

/**
 * AI回答を取得（ストリーミング対応版）
 * @param {string} question - ユーザーの質問
 * @param {Array} conversationHistory - 会話履歴（オプション）
 * @param {Function} onStream - ストリーミング更新用コールバック (text) => void
 * @returns {Promise<Object>} { answer: string, sources: Array }
 */
async function getAIResponse(question, conversationHistory = [], onStream = null) {
  try {
    // リクエストボディを構築
    const requestBody = {
      message: question,
      userId: getCurrentUserId(),
      conversationHistory: conversationHistory.map(item => ({
        question: item.question,
        answer: item.answer
      }))
    };

    // サーバーサイドプロキシにリクエスト
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
    }

    // ストリーミングレスポンスの処理
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullAnswer = '';
    let sources = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 最後の行は不完全な可能性があるためバッファに残す
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);

          if (data.type === 'chunk') {
            fullAnswer += data.text;
            if (onStream) {
              onStream(fullAnswer);
            }
          } else if (data.type === 'sources') {
            sources = data.data;
          } else if (data.type === 'complete') {
            if (data.sources) {
              sources = data.sources;
            }
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        } catch (e) {
          console.warn('JSON parse error:', e);
        }
      }
    }

    return {
      answer: fullAnswer,
      sources: sources,
      model: 'gemini-1.5-flash'
    };

  } catch (error) {
    console.error('AI response error:', error);

    // ユーザーフレンドリーなエラーメッセージ
    if (error.message.includes('Failed to fetch')) {
      throw new Error('サーバーに接続できませんでした。ネットワークを確認してください。');
    } else if (error.message.includes('timeout')) {
      throw new Error('リクエストがタイムアウトしました。もう一度お試しください。');
    } else {
      throw new Error(`エラーが発生しました: ${error.message}`);
    }
  }
}

/**
 * 現在のユーザーIDを取得
 * @returns {string} ユーザーID
 */
function getCurrentUserId() {
  // Memberstackからユーザー情報を取得（実装予定）
  // 現在はローカルストレージまたはセッションから取得
  let userId = localStorage.getItem('demo_user_id');

  if (!userId) {
    userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('demo_user_id', userId);
  }

  return userId;
}

/**
 * 質問の妥当性をチェック
 * @param {string} question - ユーザーの質問
 * @returns {Object} { valid: boolean, message: string }
 */
function validateQuestion(question) {
  if (!question || question.trim().length === 0) {
    return {
      valid: false,
      message: '質問を入力してください'
    };
  }

  if (question.trim().length < 5) {
    return {
      valid: false,
      message: '質問が短すぎます。もう少し詳しく入力してください'
    };
  }

  if (question.length > 1000) {
    return {
      valid: false,
      message: '質問が長すぎます。1000文字以内で入力してください'
    };
  }

  return {
    valid: true,
    message: ''
  };
}

/**
 * APIの健全性チェック
 * @returns {Promise<Object>} サーバーステータス
 */
async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    return { status: 'error', error: error.message };
  }
}

// エクスポート
export {
  getAIResponse,
  validateQuestion,
  checkHealth,
  getCurrentUserId
};
