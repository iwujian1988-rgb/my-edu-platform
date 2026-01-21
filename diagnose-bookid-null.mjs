import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local file manually
function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key && value) {
          process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.error('Failed to load .env.local:', error.message)
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function diagnose() {
  console.log('🔍 详细诊断 book_id NULL 问题\n')

  // 1. 总体统计
  const { count: totalWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })

  const { count: nullBookIdWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)

  const { count: validBookIdWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('book_id', 'is', null)

  console.log('📊 总体统计:')
  console.log(`   - words 表总记录数: ${totalWords}`)
  console.log(`   - book_id = NULL: ${nullBookIdWords} (${(nullBookIdWords/totalWords*100).toFixed(1)}%)`)
  console.log(`   - book_id 有值: ${validBookIdWords} (${(validBookIdWords/totalWords*100).toFixed(1)}%)`)
  console.log('')

  // 2. 检查 NULL book_id 的单词样例
  console.log('📝 book_id = NULL 的单词样例 (前20个):')
  const { data: nullBookIdSamples } = await supabase
    .from('words')
    .select('id, word, phonetic, definition, created_at')
    .is('book_id', null)
    .limit(20)

  nullBookIdSamples.forEach((w, i) => {
    const date = w.created_at ? new Date(w.created_at).toISOString().substring(0, 10) : 'unknown'
    console.log(`   ${i + 1}. ${w.word} [${w.phonetic || 'N/A'}] - ${date}`)
  })
  console.log('')

  // 3. 检查有 book_id 的记录分布
  console.log('📚 有 book_id 的单词分布:')
  const { data: wordsWithBookId } = await supabase
    .from('words')
    .select('book_id')
    .not('book_id', 'is', null)

  const bookWordCounts = {}
  wordsWithBookId.forEach(w => {
    bookWordCounts[w.book_id] = (bookWordCounts[w.book_id] || 0) + 1
  })

  for (const [bookId, count] of Object.entries(bookWordCounts).sort((a, b) => b[1] - a[1])) {
    // 获取书名
    const { data: book } = await supabase
      .from('books')
      .select('title')
      .eq('id', bookId)
      .single()

    const bookTitle = book ? book.title : 'UNKNOWN'
    console.log(`   - ${bookTitle} (${count} 个单词)`)
  }

  // 4. 检查这些单词是否应该属于特定书
  console.log('\n🔍 尝试识别 NULL book_id 单词的来源...')
  console.log('   检查前50个单词的词频，看能否识别来源...')

  const { data: nullSamples } = await supabase
    .from('words')
    .select('word, definition')
    .is('book_id', null)
    .limit(50)

  // 简单词频分析
  const wordFreq = {}
  nullSamples.forEach(w => {
    const firstLetter = w.word.charAt(0).toUpperCase()
    wordFreq[firstLetter] = (wordFreq[firstLetter] || 0) + 1
  })

  console.log('   首字母分布 (前50个样本):')
  Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([letter, count]) => {
      console.log(`     ${letter}: ${count} 个单词`)
    })

  // 5. 总结
  console.log('\n📋 诊断总结:')
  console.log('   ❌ 问题: 大量单词的 book_id 字段为 NULL')
  console.log(`   ⚠️  影响: ${nullBookIdWords} 个单词无法显示在任何词书中`)
  console.log('   📊 百分比: 超过 60% 的单词数据受影响')
  console.log('\n💡 可能原因:')
  console.log('   1. 误执行了 UPDATE words SET book_id = NULL')
  console.log('   2. 数据迁移脚本错误')
  console.log('   3. 删除操作级联设置错误')
  console.log('\n🔧 需要的操作:')
  console.log('   1. 确认是否可以安全删除这批 NULL book_id 的数据')
  console.log('   2. 或找到原始 book_id 并恢复关联')
}

diagnose().catch(console.error)
