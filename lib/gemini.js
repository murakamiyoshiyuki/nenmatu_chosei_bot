
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PDFテキストのキャッシュ
let cachedPdfText = '';

/**
 * PDFディレクトリから全てのPDFのテキストを読み込む
 */
export async function loadAllPdfTexts() {
    if (cachedPdfText) return cachedPdfText;

    const pdfDir = path.join(__dirname, '../pdfs');
    if (!fs.existsSync(pdfDir)) {
        console.warn('[Gemini] PDF directory not found');
        return '';
    }

    const files = fs.readdirSync(pdfDir).filter(file => file.endsWith('.pdf'));
    let allText = '';

    console.log(`[Gemini] Loading ${files.length} PDFs from ${pdfDir}...`);

    for (const file of files) {
        try {
            const filePath = path.join(pdfDir, file);
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);

            allText += `\n\n--- Document: ${file} ---\n${data.text}`;
            console.log(`[Gemini] Loaded ${file} (${data.text.length} chars)`);
        } catch (error) {
            console.error(`[Gemini] Error loading ${file}:`, error);
        }
    }

    cachedPdfText = allText;
    return allText;
}

/**
 * Gemini APIを使用して回答を生成
 */
export async function generateGeminiResponse(message, conversationHistory = []) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // User requested "Gemini 3", using latest available model.
    // Assuming gemini-1.5-pro or similar is the best for long context currently.
    // If "gemini-3.0-pro" is available in the future, update here.
    // For now, using a variable that defaults to a high-end model.
    const modelName = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Load PDF context
    const pdfContext = await loadAllPdfTexts();

    // Construct prompt
    const systemPrompt = `あなたは「日本の年末調整専門コンサルタントAI」です。
ユーザーの質問に対し、以下の【参照資料】の内容を**最優先**して回答してください。
資料に記載がない場合は、一般的な日本の税法知識に基づいて回答し、その旨を注記してください。

【参照資料】
${pdfContext}

【回答のルール】
1. 参照資料（特に令和7年分の変更点）を必ず確認すること。
2. ユーザーの質問に直接的に答えること。
3. 根拠となる資料名やページ数が分かる場合は引用すること。
4. 丁寧でわかりやすい日本語で答えること。
`;

    // Chat history
    const history = conversationHistory.map(item => ({
        role: 'user',
        parts: [{ text: item.question }],
    })).concat(conversationHistory.map(item => ({
        role: 'model',
        parts: [{ text: item.answer }],
    })));

    // Start chat
    const chat = model.startChat({
        history: [], // We will inject history manually or use the chat object if we want multi-turn properly.
        // For simple request/response with injected context, we can just send the prompt.
        // But startChat is better for session. However, we are stateless per request usually.
        // Let's use generateContent for single turn with full context to be safe and stateless.
    });

    // Construct full message with history for context
    // Since we are passing huge context, we can just append the new question.
    // But to be clean, let's just send the system prompt + question.
    // Gemini supports system instructions in some versions, but putting it in the prompt is safer for compatibility.

    const fullPrompt = `${systemPrompt}\n\nユーザーの質問: ${message}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return {
        answer: text,
        model: modelName
    };
}
