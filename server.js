/**
 * ローカル開発用サーバー
 *
 * Vercel Edge Functionをローカルでエミュレートします
 * 使い方: node server.js
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ES Modulesで __dirname を使えるようにする
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数を読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors()); // 開発中は全てのオリジンを許可
app.use(express.json());
app.use(express.static(__dirname)); // 静的ファイル配信

import { searchKnowledge } from './lib/vector-search.js';

// システムプロンプト（年末調整専門コンサルタント）
const SYSTEM_PROMPT = `あなたは「日本の年末調整専門コンサルタントAI」です。

【役割と責任】
- 日本の税法・会計実務に準拠して、ユーザー（企業担当者・社員）の質問に正確で丁寧な回答を行います
- わかりやすく、根拠を示した説明を心がけます
- 回答の根拠には国税庁などの一次資料を引用します
- 不確実な情報は「仮説」や「要確認」と明記します

【参照資料】
- 年末調整のしかた（令和7年分）
- 年末調整Q&A（国税庁）
- その他関連する税法・通達

【回答スタイル】
- 質問の要点を確認
- 提供された「参考情報」がある場合は、それを優先的に使用して回答を構築
- 法的根拠と実務上の取り扱いを説明
- 具体例や注意点を補足
- 必要に応じて参照先を提示

【注意事項】
- 税務相談は最終的に税理士・税務署への確認を推奨
- 個別具体的なケースについては一般論として回答
- 不明確な場合は推測せず、確認が必要である旨を伝える`;

/**
 * /api/chat エンドポイント
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, conversationHistory = [] } = req.body;

    // バリデーション
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // 環境変数からAPIキーとモデルを取得
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro'; // より安定した1.5 Proを使用

    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured in .env');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }

    console.log(`[API] Received question from user ${userId || 'unknown'}: ${message.substring(0, 50)}...`);
    console.log(`[API] Using model: ${model}`);

    // 1. ナレッジベース検索 (RAG)
    console.log('[API] Searching knowledge base...');
    const searchResults = await searchKnowledge(message);
    console.log(`[API] Found ${searchResults.length} relevant chunks`);

    // 2. システムプロンプト構築
    let systemInstructionText = SYSTEM_PROMPT;

    if (searchResults.length > 0) {
      const knowledgeContext = searchResults.map((result, index) => {
        return `[${index + 1}] 📄 出典: ${result.pdf_name}${result.pdf_year ? ` (${result.pdf_year})` : ''} p.${result.page_number || '?'}付近
内容: ${result.text.substring(0, 500)}${result.text.length > 500 ? '...' : ''}
類似度: ${(result.similarity * 100).toFixed(1)}%`;
      }).join('\n\n');

      systemInstructionText = `${SYSTEM_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【検索されたPDF資料（最優先で参照すること）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
上記の資料を最優先で参照して回答してください。
回答には必ず「📄 引用：〜」の形式で出典を明記してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    // 3. Gemini API呼び出し (SDK使用)
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: systemInstructionText
    });

    console.log(`[API] Calling Gemini API (SDK): ${model}`);

    // SDKの形式に合わせて履歴を変換
    const history = [];
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach(item => {
        history.push({ role: 'user', parts: [{ text: item.question }] });
        history.push({ role: 'model', parts: [{ text: item.answer }] });
      });
    }

    const chatSession = geminiModel.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000, // より長い回答を許可
      },
    });

    const result = await chatSession.sendMessage(message);
    const response = await result.response;
    const answer = response.text();

    console.log(`[API] Response generated successfully`);

    // ソース情報を抽出
    const sources = extractSources(answer, searchResults);

    // レスポンスを返す
    res.json({
      answer: answer,
      sources: sources,
      usage: response.usageMetadata,
      model: model,
    });

  } catch (error) {
    console.error('[API] Server error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * 回答からソース情報を抽出
 */
function extractSources(answer, searchResults = []) {
  const sources = [];

  // RAGの検索結果からソースを追加
  if (searchResults && searchResults.length > 0) {
    // 重複を除去して追加
    const uniquePdfs = new Set();
    searchResults.forEach(result => {
      if (!uniquePdfs.has(result.pdf_name)) {
        uniquePdfs.add(result.pdf_name);
        sources.push({
          title: result.pdf_name,
          page: result.page_number,
          similarity: result.similarity,
          type: 'knowledge_base'
        });
      }
    });
  }

  // 国税庁への言及を検出 (既存ロジック)
  if (answer.includes('国税庁') || answer.includes('年末調整のしかた')) {
    sources.push({
      title: '年末調整のしかた（令和7年分）',
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

/**
 * ヘルスチェックエンドポイント
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasSupabase: !!process.env.SUPABASE_URL,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro (default)',
    }
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`\n🚀 年末調整BOT ローカルサーバー起動`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔗 API Endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`\n環境設定:`);
  console.log(`  ✓ Gemini API: ${process.env.GEMINI_API_KEY ? '設定済み' : '未設定'}`);
  console.log(`  ✓ Supabase: ${process.env.SUPABASE_URL ? '設定済み' : '未設定'}`);
  console.log(`  ✓ Model: ${process.env.GEMINI_MODEL || 'gemini-1.5-pro (default)'}`);
  console.log(`\n開発を開始してください！\n`);
});
