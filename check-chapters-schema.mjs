/**
 * 检查chapters表的结构
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

async function checkChaptersSchema() {
  console.log('🔍 检查chapters表和words表的字段...\n')

  try {
    // 1. 查看chapters表的结构
    const { data: chapters, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .limit(1)

    if (chapterError) {
      console.error('❌ 查询chapters失败:', chapterError.message)
    } else if (chapters && chapters.length > 0) {
      console.log('📚 chapters表字段:')
      console.log('   ', Object.keys(chapters[0]).join(', '))
    }

    // 2. 查看words表的实际字段
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word, chapter_id, book_id')
      .limit(1)

    if (wordsError) {
      console.error('\n❌ 查询words失败:', wordsError.message)
    } else {
      console.log('\n📝 words表的关键字段:')
      if (words && words.length > 0) {
        console.log('   示例数据:', words[0])
        console.log('\n   说明:')
        console.log('   - chapter_id: UUID类型，关联到chapters表')
        console.log('   - book_id: UUID类型，关联到books表')
      }
    }

    // 3. 检查words表是否有theme和scene字段
    console.log('\n🔍 检查words表是否有theme和scene字段...')

    const { data: wordsCheck } = await supabase
      .from('words')
      .select('theme, scene')
      .limit(1)

    if (wordsCheck && wordsCheck.length > 0) {
      const word = wordsCheck[0]
      console.log('   ✅ words表有theme和scene字段!')
      console.log('   theme:', word.theme || 'NULL')
      console.log('   scene:', word.scene || 'NULL')
    } else {
      console.log('   ❌ words表没有theme和scene字段')
      console.log('\n   💡 可能原因:')
      console.log('   1. 这些字段可能从未被添加到words表')
      console.log('   2. 或者这些字段应该在chapters表中，而不是words表中')
    }

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

checkChaptersSchema()
