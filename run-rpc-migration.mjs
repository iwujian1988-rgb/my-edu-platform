/**
 * 执行RPC函数迁移SQL
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 执行RPC函数迁移...\n')

  const sql = `
CREATE OR REPLACE FUNCTION get_book_words(book_uuid UUID)
RETURNS SETOF words
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  words_result RECORD;
BEGIN
  FOR words_result IN
    SELECT w.*
    FROM words w
    INNER JOIN chapters c ON w.chapter_id = c.id
    WHERE c.book_id = book_uuid
    ORDER BY w.order_index ASC
  LOOP
    RETURN NEXT words_result;
  END LOOP;
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_book_words IS '获取指定词书的全部单词（无行数限制）。参数：book_uuid - 词书UUID。返回：完整的单词列表。';

CREATE INDEX IF NOT EXISTS idx_words_chapter_id ON words(chapter_id);
CREATE INDEX IF NOT EXISTS idx_words_order_index ON words(order_index);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
  `

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // 尝试直接使用 SQL
    console.error('❌ RPC失败，尝试直接连接...')

    // 由于 Supabase JS SDK 不直接支持执行原始 SQL，
    // 我们需要生成一个可执行的 SQL 文件供用户在控制台执行
    console.log('\n📄 请在 Supabase SQL Editor 中执行以下 SQL:\n')
    console.log('='.repeat(60))
    console.log(sql)
    console.log('='.repeat(60))

    return
  }

  console.log('✅ 迁移完成')
}

runMigration()
  .then(() => {
    console.log('\n✅ 迁移脚本执行完成')
  })
  .catch(error => {
    console.error('\n❌ 迁移失败:', error)
    process.exit(1)
  })
