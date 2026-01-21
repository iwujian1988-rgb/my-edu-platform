/**
 * 检查测试词书的状态
 */

import { createClient } from '@supabase/supabase-js'
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function checkBookStatus() {
  console.log('🔍 检查词书状态...\n')

  try {
    const { data: book, error } = await supabase
      .from('books')
      .select('id, title, is_official, created_by, total_words, category')
      .eq('id', TEST_BOOK_ID)
      .single()

    if (error) {
      console.error('❌ 查询失败:', error.message)
      return
    }

    console.log('📚 词书信息:')
    console.log('   Title:', book.title)
    console.log('   ID:', book.id)
    console.log('   is_official:', book.is_official)
    console.log('   created_by:', book.created_by)
    console.log('   total_words:', book.total_words)
    console.log('   category:', book.category)

    // 检查该书的单词数量
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id')
      .eq('book_id', TEST_BOOK_ID)

    if (wordsError) {
      console.error('\n❌ 查询单词失败:', wordsError.message)
    } else {
      console.log('\n📝 该书的单词数量:', words.length)
    }

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

checkBookStatus()
