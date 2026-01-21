import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWordStats() {
  // 从命令行参数获取 bookId
  const bookId = process.argv[2]

  if (!bookId) {
    console.log('用法: node check-word-stats.mjs <bookId>')
    console.log('示例: node check-word-stats.mjs xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
    process.exit(1)
  }

  console.log(`\n📊 检查单词书统计: ${bookId}\n`)

  try {
    // 1. 获取书籍信息
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, total_words')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      console.error('❌ 未找到该词书')
      process.exit(1)
    }

    console.log(`📖 书名: ${book.title}`)
    console.log(`📚 总单词数: ${book.total_words}\n`)

    // 2. 获取所有进度记录
    const { data: progress, error: progressError } = await supabase
      .from('word_progress')
      .select('word_id, status')
      .eq('book_id', bookId)

    if (progressError) {
      console.error('❌ 获取进度失败:', progressError)
      process.exit(1)
    }

    const totalProgress = progress?.length || 0
    console.log(`📝 有进度记录的单词: ${totalProgress}`)
    console.log(`➕ 未标注的单词: ${book.total_words - totalProgress}\n`)

    // 3. 统计各状态的数量
    const stats = {
      known: 0,
      fuzzy: 0,
      unknown: 0,
      new: 0
    }

    progress?.forEach(p => {
      if (p.status === 'known') stats.known++
      else if (p.status === 'fuzzy') stats.fuzzy++
      else if (p.status === 'unknown') stats.unknown++
      else if (p.status === 'new') stats.new++
    })

    console.log('📊 学习状态分布:')
    console.log(`   ✅ 认识: ${stats.known}`)
    console.log(`   ❓ 模糊: ${stats.fuzzy}`)
    console.log(`   ❌ 不认识: ${stats.unknown}`)
    console.log(`   ➕ 未标注(状态): ${stats.new}\n`)

    // 4. 显示百分比
    const total = book.total_words
    console.log('📈 百分比分布:')
    console.log(`   认识: ${((stats.known / total) * 100).toFixed(1)}%`)
    console.log(`   模糊: ${((stats.fuzzy / total) * 100).toFixed(1)}%`)
    console.log(`   不认识: ${((stats.unknown / total) * 100).toFixed(1)}%`)
    console.log(`   未标注: ${(((book.total_words - totalProgress) / total) * 100).toFixed(1)}%\n`)

    // 5. 建议
    if (totalProgress >= book.total_words * 0.9) {
      console.log('💡 提示: 您已经学习了90%以上的单词！')
      console.log('   如果想重新学习，可以重置进度。')
    } else if (totalProgress === 0) {
      console.log('💡 提示: 您还没有开始学习这个单词书。')
    }

  } catch (error) {
    console.error('❌ 错误:', error)
    process.exit(1)
  }
}

checkWordStats()
