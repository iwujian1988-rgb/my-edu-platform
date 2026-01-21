/**
 * 为测试用户创建一个简单的测试词书
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取 .env.local
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^["']|["']$/g, '')
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TEST_USER_PHONE = '13800138000'

async function createTestBook() {
  console.log('🔧 创建测试词书...\n')

  try {
    // 1. 获取测试用户
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', TEST_USER_PHONE)
      .single()

    if (!user) {
      console.error('❌ 测试用户不存在，请先运行 node create-test-user.mjs')
      return
    }

    console.log('✅ 找到测试用户:', user.id)

    // 2. 创建测试词书
    const testBookId = crypto.randomUUID()

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        id: testBookId,
        title: 'E2E 测试词书',
        description: '用于 E2E 测试的简单词书',
        total_words: 20,
        is_official: true,  // 设置为官方词书，所有人都可以访问
        created_by: user.id,
        category: 'test'  // 添加必填的 category 字段
      })
      .select()
      .single()

    if (bookError) {
      console.error('❌ 创建词书失败:', bookError.message)
      return
    }

    console.log('✅ 词书创建成功:', book.title)
    console.log('   Book ID:', book.id)

    // 3. 创建一些测试单词
    const testWords = []
    for (let i = 1; i <= 20; i++) {
      testWords.push({
        id: crypto.randomUUID(),
        word_book_id: book.id,
        word: `test${i}`,
        phonetic: `/test${i}/`,
        uk_phonetic: `/test${i}-uk/`,
        us_phonetic: `/test${i}-us/`,
        definition: `测试单词${i}的中文释义`,
        definition_en: `Definition of test word ${i}`,
        part_of_speech: 'n.',
        collocation: `test${i} collocation`,
        collocation_en: `test${i} collocation in English`,
        example_sentence: `This is an example sentence for test${i}.`,
        example_sentence_en: `This is an example sentence for test word ${i}.`,
        status: 'new',
        chapter: i <= 10 ? '1-10' : '11-20',
        chapter_id: i <= 10 ? 'chapter-1' : 'chapter-2'
      })
    }

    const { data: words, error: wordsError } = await supabase
      .from('words')
      .insert(testWords)
      .select('id')

    if (wordsError) {
      console.error('❌ 创建单词失败:', wordsError.message)
    } else {
      console.log('✅ 创建了', words.length, '个测试单词')
    }

    console.log('\n🎉 测试词书创建完成!')
    console.log('\n请在测试文件中使用以下词书 ID:')
    console.log('   const testBookId = "' + book.id + '"')

  } catch (error) {
    console.error('\n❌ 创建失败:', error)
  }
}

createTestBook()
