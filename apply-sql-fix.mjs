/**
 * 直接连接数据库并应用SQL修复
 */

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^[\"']|[\"']$/g, '')
      if (key && cleanValue) {
        envVars[key.trim()] = cleanValue
      }
    })

    return envVars
  } catch (error) {
    return {}
  }
}

const env = loadEnvFile()

// 构建数据库连接URL
// Supabase格式: postgresql://postgres:[password]@[host]:5432/postgres
const dbUrl = env.DATABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgresql://postgres:') + ':5432/postgres'

if (!dbUrl || dbUrl.includes('postgresql://postgres:')) {
  console.error('❌ 无法找到数据库连接字符串')
  console.log('请在.env.local中设置 DATABASE_URL')
  console.log('格式: postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres')
  process.exit(1)
}

async function applyFix() {
  console.log('🔧 连接数据库并修复RPC函数...\n')

  const sql = postgres(dbUrl)

  try {
    console.log('正在删除旧的RPC函数...')
    await sql`DROP FUNCTION IF EXISTS get_book_words_paginated_optimized(UUID, INTEGER, INTEGER)`
    console.log('✅ 旧函数已删除')

    console.log('正在创建新的RPC函数...')

    await sql.unsafe(`
CREATE OR REPLACE FUNCTION get_book_words_paginated_optimized(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  uk_phonetic TEXT,
  us_phonetic TEXT,
  definition TEXT,
  definition_en TEXT,
  collocation TEXT,
  collocation_en TEXT,
  example_sentence TEXT,
  example_sentence_en TEXT,
  part_of_speech TEXT,
  chapter TEXT,
  chapter_id UUID,
  order_index INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.word,
    w.phonetic,
    w.uk_phonetic,
    w.us_phonetic,
    w.definition,
    w.definition_en,
    w.collocation,
    w.collocation_en,
    w.example_sentence,
    w.example_sentence_en,
    w.part_of_speech,
    w.chapter,
    w.chapter_id,
    w.order_index
  FROM words w
  WHERE w.book_id = book_uuid
  ORDER BY w.order_index ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;
    `)

    console.log('✅ RPC函数修复成功!')

    // 测试函数
    console.log('\n正在测试RPC函数...')
    const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

    const result = await sql.unsafe(`
      SELECT * FROM get_book_words_paginated_optimized(
        book_uuid := $1,
        offset_val := 0,
        limit_val := 5
      )
    `, [TEST_BOOK_ID])

    console.log(`✅ 测试成功! 返回了 ${result.length} 个单词`)

    if (result.length > 0) {
      console.log('   示例单词:', result.map(r => r.word).join(', '))
    }

    await sql.end()
    console.log('\n🎉 修复完成! 现在可以运行测试了')

  } catch (error) {
    console.error('\n❌ 修复失败:', error.message)
    await sql.end()
    process.exit(1)
  }
}

applyFix()
