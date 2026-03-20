/**
 * 执行多语言迁移
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 检查数据库 schema...\n')

  // 检查 books.language
  const { data: booksSample, error: booksError } = await supabase
    .from('books')
    .select('id, language')
    .limit(1)

  const hasBooksLanguage = !booksError && booksSample?.[0] && 'language' in booksSample[0]
  console.log(`books.language: ${hasBooksLanguage ? '✅ 存在' : '❌ 不存在'}`)

  // 检查 words.language_data
  const { data: wordsSample, error: wordsError } = await supabase
    .from('words')
    .select('id, language_data')
    .limit(1)

  const hasWordsLanguageData = !wordsError && wordsSample?.[0] && 'language_data' in wordsSample[0]
  console.log(`words.language_data: ${hasWordsLanguageData ? '✅ 存在' : '❌ 不存在'}`)

  return { hasBooksLanguage, hasWordsLanguageData }
}

async function addLanguageDataColumn() {
  console.log('\n📝 尝试添加 language_data 字段...\n')

  // Supabase 不支持直接执行 DDL，需要提示用户手动执行
  console.log('⚠️  Supabase JS 客户端不支持执行 DDL 语句')
  console.log('请手动在 Supabase Dashboard 执行以下 SQL:\n')
  console.log('---')
  console.log(`
ALTER TABLE words
ADD COLUMN IF NOT EXISTS language_data JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_words_language_data ON words USING GIN (language_data);

-- 迁移现有法语字段
UPDATE words
SET language_data = jsonb_strip_nulls(jsonb_build_object(
  'fr', jsonb_build_object(
    'gender', gender,
    'plural', plural,
    'conjugation', conjugation,
    'feminine_form', feminine_form
  )
))
WHERE gender IS NOT NULL
   OR plural IS NOT NULL
   OR conjugation IS NOT NULL
   OR feminine_form IS NOT NULL;
`)
  console.log('---\n')
}

async function main() {
  const { hasBooksLanguage, hasWordsLanguageData } = await checkSchema()

  if (!hasBooksLanguage || !hasWordsLanguageData) {
    await addLanguageDataColumn()
    console.log('执行完 SQL 后，重新运行此脚本验证')
  } else {
    console.log('\n✅ 所有字段已就绪!')

    // 统计
    const { count: wordsWithLangData } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .not('language_data', 'is', null)

    console.log(`已有 ${wordsWithLangData} 个单词包含 language_data`)
  }
}

main().catch(console.error)
