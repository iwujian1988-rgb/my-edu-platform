import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
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

async function analyzeNullChapter() {
  console.log('🔍 分析 chapter_id = NULL 的记录\n')

  // 1. 统计 NULL chapter_id 的记录数
  const { count: nullChapterCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)
    .is('chapter_id', null)

  const { count: hasChapterCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)
    .not('chapter_id', 'is', null)

  console.log('📊 NULL book_id 记录分类:')
  console.log(`   - chapter_id = NULL: ${nullChapterCount}`)
  console.log(`   - chapter_id 有值: ${hasChapterCount}`)
  console.log('')

  // 2. 检查样例数据
  console.log('📝 NULL chapter_id 的单词样例（前20个）:')
  const { data: nullChapterSamples } = await supabase
    .from('words')
    .select('id, word, phonetic, order_index, created_at')
    .is('book_id', null)
    .is('chapter_id', null)
    .limit(20)

  nullChapterSamples.forEach((w, i) => {
    const date = w.created_at ? new Date(w.created_at).toISOString().substring(0, 10) : 'unknown'
    console.log(`   ${i + 1}. ${w.word} [${w.phonetic || 'N/A'}] - order: ${w.order_index}, created: ${date}`)
  })
  console.log('')

  // 3. 检查这些单词的 order_index 分布
  console.log('🔍 分析 order_index 分布...')

  const { data: nullChapterWords } = await supabase
    .from('words')
    .select('order_index')
    .is('book_id', null)
    .is('chapter_id', null)
    .limit(1000)

  const orderIndexStats = {}
  nullChapterWords.forEach(w => {
    if (w.order_index !== null) {
      const range = Math.floor(w.order_index / 1000) * 1000
      orderIndexStats[range] = (orderIndexStats[range] || 0) + 1
    }
  })

  console.log('   order_index 分布（前1000条样本）:')
  Object.entries(orderIndexStats)
    .sort((a, b) => a[0] - b[0])
    .forEach(([range, count]) => {
      console.log(`     ${range}-${parseInt(range) + 999}: ${count} 个单词`)
    })
  console.log('')

  // 4. 尝试通过 order_index 推断所属词书
  console.log('💡 尝试通过 order_index 恢复...')
  console.log('   获取各词书的 order_index 范围...')

  const { data: booksWithOrder } = await supabase
    .from('words')
    .select('book_id, order_index')
    .not('book_id', 'is', null)

  const bookRanges = {}
  booksWithOrder.forEach(w => {
    if (!bookRanges[w.book_id]) {
      bookRanges[w.book_id] = { min: w.order_index, max: w.order_index }
    } else {
      bookRanges[w.book_id].min = Math.min(bookRanges[w.book_id].min, w.order_index)
      bookRanges[w.book_id].max = Math.max(bookRanges[w.book_id].max, w.order_index)
    }
  })

  // 获取书名
  const bookIds = Object.keys(bookRanges)
  const { data: bookNames } = await supabase
    .from('books')
    .select('id, title')
    .in('id', bookIds)

  const bookNameMap = {}
  bookNames.forEach(b => {
    bookNameMap[b.id] = b.title
  })

  console.log('   各词书的 order_index 范围:')
  Object.entries(bookRanges)
    .sort((a, b) => a[1].min - b[1].min)
    .forEach(([bookId, range]) => {
      const title = bookNameMap[bookId] || 'UNKNOWN'
      console.log(`     ${title}: ${range.min} - ${range.max}`)
    })

  console.log('')
  console.log('📋 结论:')
  console.log(`   - ${nullChapterCount} 个单词没有 chapter_id`)
  console.log(`   - ${hasChapterCount} 个单词有 chapter_id（可恢复）`)
  console.log('   - 需要使用更小的批次（每批100条）来恢复有 chapter_id 的记录')
  console.log('   - 没有 chapter_id 的记录需要其他方式恢复')
}

analyzeNullChapter().catch(console.error)
