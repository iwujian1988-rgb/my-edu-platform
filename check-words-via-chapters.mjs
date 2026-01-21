/**
 * 检查词书的单词（通过章节）
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

async function checkWordsViaChapters() {
  console.log('🔍 检查词书的章节和单词...\n')

  try {
    // 1. 检查章节
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, book_id')
      .eq('book_id', TEST_BOOK_ID)

    if (chaptersError) {
      console.error('❌ 查询章节失败:', chaptersError.message)
      return
    }

    console.log('📚 找到', chapters.length, '个章节')

    if (chapters.length === 0) {
      console.log('\n⚠️  该书没有章节！')
      return
    }

    // 2. 检查第一个章节的单词
    const firstChapter = chapters[0]
    console.log('\n📖 检查第一个章节:', firstChapter.title)

    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word, chapter_id, book_id')
      .eq('chapter_id', firstChapter.id)
      .limit(5)

    if (wordsError) {
      console.error('❌ 查询单词失败:', wordsError.message)
      return
    }

    console.log('   找到', words.length, '个单词（前5个）')
    if (words.length > 0) {
      console.log('   示例单词:', words.map(w => w.word).join(', '))
      console.log('   这些单词的 book_id:', words[0].book_id || 'NULL')
      console.log('   这些单词的 chapter_id:', words[0].chapter_id)
    }

    // 3. 统计总单词数
    const { count, error: countError } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .in('chapter_id', chapters.map(c => c.id))

    if (countError) {
      console.error('\n❌ 统计失败:', countError.message)
    } else {
      console.log('\n📝 总单词数（通过章节）:', count)
    }

    // 4. 现在更新所有单词的 book_id
    console.log('\n🔧 开始更新所有单词的 book_id...')
    const { error: updateError } = await supabase
      .from('words')
      .update({ book_id: TEST_BOOK_ID })
      .in('chapter_id', chapters.map(c => c.id))

    if (updateError) {
      console.error('❌ 更新失败:', updateError.message)
    } else {
      console.log('✅ 更新成功！')

      // 5. 再次验证
      const { data: updatedWords, error: verifyError } = await supabase
        .from('words')
        .select('id')
        .eq('book_id', TEST_BOOK_ID)

      if (verifyError) {
        console.error('❌ 验证失败:', verifyError.message)
      } else {
        console.log('✅ 现在有', updatedWords.length, '个单词直接关联到该书！')
      }
    }

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

checkWordsViaChapters()
