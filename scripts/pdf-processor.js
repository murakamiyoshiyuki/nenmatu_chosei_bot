/**
 * PDFプロセッサー
 *
 * PDFファイルを読み込み、テキスト抽出 → チャンク分割 → ベクトル化 → Supabase保存
 * の一連の処理を行います。
 */

import fs from 'fs';
import pdfParse from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';
import { embedText } from '../lib/vector-search.js';

/**
 * シンプルなチャンク分割関数
 * LangChainを使わず、文字数ベースで分割します
 *
 * @param {string} text - 分割するテキスト
 * @param {number} chunkSize - チャンクの最大文字数（デフォルト: 800）
 * @param {number} overlap - チャンク間の重複文字数（デフォルト: 100）
 * @returns {string[]} - チャンクの配列
 */
function splitTextIntoChunks(text, chunkSize = 800, overlap = 100) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);

    // 空のチャンクはスキップ
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * PDFファイルを処理してチャンクの配列を作成
 *
 * @param {string} pdfPath - PDFファイルのパス
 * @returns {Promise<object>} - { pdf_name, total_pages, chunks }
 */
export async function processPDF(pdfPath) {
  try {
    console.log(`\n[PDF Processor] Processing: ${pdfPath}`);

    // PDFファイルを読み込み
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);

    const fileName = pdfPath.split('/').pop().split('\\').pop();

    console.log(`[PDF Processor] Total pages: ${pdfData.numpages}`);
    console.log(`[PDF Processor] Total text length: ${pdfData.text.length} characters`);

    // テキストをチャンクに分割
    const textChunks = splitTextIntoChunks(pdfData.text);

    console.log(`[PDF Processor] Created ${textChunks.chunks} chunks`);

    // ページ番号を推定（簡易版）
    // より正確なページ番号が必要な場合は、ページごとに処理する必要があります
    const chunksWithMetadata = textChunks.map((chunk, index) => ({
      chunk_text: chunk,
      chunk_index: index,
      // ページ番号はチャンクインデックスから推定（1ページあたり約3チャンクと仮定）
      page_number: Math.floor(index / 3) + 1
    }));

    return {
      pdf_name: fileName,
      total_pages: pdfData.numpages,
      chunks: chunksWithMetadata
    };

  } catch (error) {
    console.error(`[PDF Processor] Error processing PDF: ${error.message}`);
    throw error;
  }
}

/**
 * チャンクをベクトル化してSupabaseに保存
 *
 * @param {object} processedData - processPDF()の返り値
 * @param {string} pdfYear - PDF の年度（例: "令和6年分"）
 * @returns {Promise<number>} - 保存されたチャンク数
 */
export async function saveChunksToSupabase(processedData, pdfYear = null) {
  try {
    // Supabase初期化
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`\n[PDF Processor] Saving ${processedData.chunks.length} chunks to Supabase...`);

    let savedCount = 0;

    // チャンクを1つずつ処理（バッチ処理も可能だが、エラーハンドリングのため個別に処理）
    for (const chunk of processedData.chunks) {
      try {
        // テキストをベクトル化
        console.log(`[PDF Processor] Embedding chunk ${chunk.chunk_index + 1}/${processedData.chunks.length}...`);
        const embedding = await embedText(chunk.chunk_text);

        // Supabaseに保存
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            pdf_name: processedData.pdf_name,
            pdf_year: pdfYear,
            page_number: chunk.page_number,
            chunk_index: chunk.chunk_index,
            chunk_text: chunk.chunk_text,
            embedding: embedding,
            metadata: {
              total_pages: processedData.total_pages,
              text_length: chunk.chunk_text.length
            }
          });

        if (error) {
          console.error(`[PDF Processor] Error saving chunk ${chunk.chunk_index}:`, error);
          continue;
        }

        savedCount++;

        // Rate limiting対策（OpenAI APIの制限を考慮）
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms待機

      } catch (error) {
        console.error(`[PDF Processor] Error processing chunk ${chunk.chunk_index}:`, error.message);
      }
    }

    console.log(`[PDF Processor] Successfully saved ${savedCount}/${processedData.chunks.length} chunks`);
    return savedCount;

  } catch (error) {
    console.error(`[PDF Processor] Error saving to Supabase: ${error.message}`);
    throw error;
  }
}

/**
 * 特定のPDFの全チャンクをSupabaseから削除
 *
 * @param {string} pdfName - 削除するPDFのファイル名
 * @returns {Promise<number>} - 削除されたチャンク数
 */
export async function deleteKnowledge(pdfName) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[PDF Processor] Deleting knowledge for: ${pdfName}`);

    const { data, error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('pdf_name', pdfName)
      .select();

    if (error) throw error;

    console.log(`[PDF Processor] Deleted ${data.length} chunks`);
    return data.length;

  } catch (error) {
    console.error(`[PDF Processor] Error deleting knowledge: ${error.message}`);
    throw error;
  }
}
