#!/usr/bin/env node

/**
 * PDFアップロードCLIツール
 *
 * 使い方:
 *   node scripts/upload-knowledge.js <PDF_PATH> [PDF_YEAR]
 *
 * 例:
 *   node scripts/upload-knowledge.js ./pdfs/年末調整のしかた.pdf "令和6年分"
 *   node scripts/upload-knowledge.js ./pdfs/年末調整Q&A.pdf "令和6年分"
 *
 * 削除:
 *   node scripts/upload-knowledge.js --delete "年末調整のしかた.pdf"
 *
 * 統計表示:
 *   node scripts/upload-knowledge.js --stats
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { processPDF, saveChunksToSupabase, deleteKnowledge } from './pdf-processor.js';
import { getKnowledgeStats } from '../lib/vector-search.js';

// .envファイルを読み込み
dotenv.config();

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);

  // 引数チェック
  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  // --stats オプション: 統計表示
  if (args[0] === '--stats') {
    await showStats();
    return;
  }

  // --delete オプション: 削除
  if (args[0] === '--delete') {
    if (args.length < 2) {
      console.error('Error: PDF name is required for deletion');
      console.log('Usage: node scripts/upload-knowledge.js --delete "filename.pdf"');
      process.exit(1);
    }

    const pdfName = args[1];
    await deleteKnowledgeByName(pdfName);
    return;
  }

  // PDFアップロード処理
  const pdfPath = args[0];
  const pdfYear = args[1] || null;

  // ファイルの存在確認
  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: PDF file not found: ${pdfPath}`);
    process.exit(1);
  }

  await uploadPDF(pdfPath, pdfYear);
}

/**
 * PDFをアップロード
 */
async function uploadPDF(pdfPath, pdfYear) {
  try {
    console.log('=========================================');
    console.log('   年末調整BOT - PDFアップロード');
    console.log('=========================================\n');

    console.log(`📄 PDF: ${pdfPath}`);
    console.log(`📅 Year: ${pdfYear || '(未指定)'}\n`);

    // Step 1: PDFを処理
    const processedData = await processPDF(pdfPath);

    // Step 2: チャンクをSupabaseに保存
    const savedCount = await saveChunksToSupabase(processedData, pdfYear);

    console.log('\n=========================================');
    console.log('✅ アップロード完了！');
    console.log('=========================================');
    console.log(`📊 保存されたチャンク数: ${savedCount}`);
    console.log(`📄 PDF名: ${processedData.pdf_name}`);
    console.log(`📖 総ページ数: ${processedData.total_pages}`);
    console.log('=========================================\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * PDFを削除
 */
async function deleteKnowledgeByName(pdfName) {
  try {
    console.log('=========================================');
    console.log('   年末調整BOT - ナレッジ削除');
    console.log('=========================================\n');

    console.log(`🗑️  削除対象: ${pdfName}\n`);

    const deletedCount = await deleteKnowledge(pdfName);

    console.log('\n=========================================');
    console.log('✅ 削除完了！');
    console.log('=========================================');
    console.log(`📊 削除されたチャンク数: ${deletedCount}`);
    console.log('=========================================\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 統計情報を表示
 */
async function showStats() {
  try {
    console.log('=========================================');
    console.log('   年末調整BOT - ナレッジ統計');
    console.log('=========================================\n');

    const stats = await getKnowledgeStats();

    console.log(`📊 総チャンク数: ${stats.total_chunks}\n`);

    if (Object.keys(stats.pdfs).length === 0) {
      console.log('ℹ️  ナレッジベースは空です。');
      console.log('   PDFをアップロードしてください。\n');
    } else {
      console.log('📚 PDFごとのチャンク数:');
      for (const [pdfName, count] of Object.entries(stats.pdfs)) {
        console.log(`   - ${pdfName}: ${count} chunks`);
      }
      console.log('');
    }

    console.log('=========================================\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 使い方を表示
 */
function showUsage() {
  console.log(`
年末調整BOT - PDFアップロードツール

使い方:
  node scripts/upload-knowledge.js <PDF_PATH> [PDF_YEAR]

例:
  # PDFをアップロード
  node scripts/upload-knowledge.js ./pdfs/年末調整のしかた.pdf "令和6年分"
  node scripts/upload-knowledge.js ./pdfs/年末調整Q&A.pdf "令和6年分"

  # 統計情報を表示
  node scripts/upload-knowledge.js --stats

  # ナレッジを削除
  node scripts/upload-knowledge.js --delete "年末調整のしかた.pdf"

注意:
  - .env ファイルに SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY が必要です
  - Supabase で vector-schema.sql を事前に実行してください
  `);
}

// メイン処理を実行
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
