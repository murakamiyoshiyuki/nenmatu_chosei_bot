import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('=========================================');
  console.log('   年末調整BOT - データベース修復ツール');
  console.log('=========================================\n');

  // DATABASE_URLの確認
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ エラー: .env ファイルに DATABASE_URL が設定されていません。');
    console.error('Supabaseのダッシュボード (Settings > Database > Connection string > Node.js) から');
    console.error('接続文字列をコピーして、.env ファイルに追記してください。');
    console.error('\n例: DATABASE_URL="postgres://postgres.xxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"');
    process.exit(1);
  }

  console.log('🔌 データベースに接続中...');

  const client = new pg.Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false // Supabase接続用
    }
  });

  try {
    await client.connect();
    console.log('✅ 接続成功\n');

    // SQLファイルの読み込み
    const sqlPath = path.join(__dirname, '../supabase/fix-schema.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQLファイルが見つかりません: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('📜 以下のSQLを実行します:');
    console.log('---------------------------------------------------');
    console.log(sql.substring(0, 200) + '...');
    console.log('---------------------------------------------------\n');

    console.log('🚀 スキーマ修正を実行中...');
    await client.query(sql);

    console.log('\n=========================================');
    console.log('✅ 修正が完了しました！');
    console.log('=========================================');
    console.log('これでもう一度 upload-knowledge.js を試してみてください。');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('ヒント: .env の DATABASE_URL に正しいパスワードが含まれているか確認してください。');
    }
  } finally {
    await client.end();
  }
}

main().catch(console.error);
