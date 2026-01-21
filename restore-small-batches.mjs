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

async function restoreWithSmallBatches() {
  console.log('🚀 使用小批次批量更新恢复 book_id\n')
  console.log('批次大小: 50 条/批\n')

  const startTime = Date.now()

  // 1. 执行前检查
  console.log('1️⃣ 执行前检查...')

  const { count: nullCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)

  console.log(`   待恢复记录数: ${nullCount}`)
  console.log('')

  if (nullCount === 0) {
    console.log('   ✅ 所有数据已恢复')
    return
  }

  // 2. 获取所有 chapter -> book 映射
  console.log('2️⃣ 获取映射关系...')

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, book_id')

  const chapterMap = {}
  chapters.forEach(c => {
    if (c.book_id) {
      chapterMap[c.id] = c.book_id
    }
  })

  console.log(`   ✅ 章节映射: ${Object.keys(chapterMap).length} 条`)
  console.log('')

  // 3. 获取所有需要更新的单词
  console.log('3️⃣ 获取待更新单词...')

  const { data: nullWords } = await supabase
    .from('words')
    .select('id, chapter_id')
    .is('book_id', null)
    .not('chapter_id', 'is', null)

  console.log(`   ✅ 需要更新: ${nullWords.length} 条记录`)
  console.log('')

  // 4. 按 book_id 分组
  console.log('4️⃣ 按 book_id 分组...')

  const bookGroups = {}
  nullWords.forEach(w => {
    const bookId = chapterMap[w.chapter_id]
    if (bookId) {
      if (!bookGroups[bookId]) {
        bookGroups[bookId] = []
      }
      bookGroups[bookId].push(w.id)
    }
  })

  console.log(`   ✅ 分成 ${Object.keys(bookGroups).length} 个词书组`)
  console.log('')

  // 5. 分批更新
  console.log('5️⃣ 开始批量更新...')

  const BATCH_SIZE = 50
  let totalUpdated = 0
  let batchNum = 0
  const totalBatches = Math.ceil(nullWords.length / BATCH_SIZE)

  for (const [bookId, wordIds] of Object.entries(bookGroups)) {
    console.log(`\n   处理词书: ${bookId.substring(0, 8)}... (${wordIds.length} 个单词)`)

    // 分批更新
    for (let i = 0; i < wordIds.length; i += BATCH_SIZE) {
      batchNum++
      const batch = wordIds.slice(i, i + BATCH_SIZE)

      const { error: updateError } = await supabase
        .from('words')
        .update({ book_id: bookId })
        .in('id', batch)

      if (updateError) {
        console.log(`      ❌ 批次 ${batchNum} 失败:`, updateError.message)
      } else {
        totalUpdated += batch.length
      }

      // 显示进度
      if (batchNum % 20 === 0 || batchNum === totalBatches) {
        const progress = (totalUpdated / nullWords.length * 100).toFixed(1)
        console.log(`      进度: ${progress}% (${totalUpdated}/${nullWords.length}) - 批次 ${batchNum}/${totalBatches}`)
      }
    }
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  console.log('\n')
  console.log(`   ✅ 更新完成: ${totalUpdated} 条记录`)
  console.log(`   ⏱️  总耗时: ${duration} 秒`)
  console.log('')

  // 6. 验证结果
  console.log('6️⃣ 验证恢复结果...')

  const { count: remainingNull } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)

  const { count: totalValid } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('book_id', 'is', null)

  console.log(`   剩余 NULL book_id: ${remainingNull}`)
  console.log(`   有效 book_id: ${totalValid}`)
  console.log('')

  // 7. 按词书统计
  console.log('7️⃣ 按词书统计单词数...')

  const { data: books } = await supabase
    .from('books')
    .select('id, title, total_words')
    .order('title')

  const results = []

  for (const book of books) {
    const { count } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', book.id)

    const status = count === book.total_words ? '✅' : (count > 0 ? '⚠️' : '❌')
    const diff = count - (book.total_words || 0)
    const match = count === book.total_words

    results.push({
      title: book.title,
      count,
      expected: book.total_words,
      diff,
      match,
      status
    })
  }

  results.sort((a, b) => {
    if (a.match && !b.match) return -1
    if (!a.match && b.match) return 1
    return b.count - a.count
  })

  results.forEach(r => {
    const diffStr = r.diff >= 0 ? `+${r.diff}` : r.diff
    console.log(`   ${r.status} ${r.title}: ${r.count} 个单词 (预期: ${r.expected}, 差值: ${diffStr})`)
  })

  console.log('')

  // 总结
  const matchedCount = results.filter(r => r.match).length
  const successRate = (totalUpdated / nullWords.length * 100).toFixed(1)

  console.log('📋 恢复完成总结:')
  console.log(`   ✅ 完全恢复: ${matchedCount}/${books.length} 本词书`)
  console.log(`   📊 成功率: ${successRate}%`)
  console.log(`   📈 更新记录: ${totalUpdated}`)
  console.log(`   ⚠️  剩余 NULL: ${remainingNull}`)
  console.log(`   ⏱️  总耗时: ${duration} 秒`)

  if (remainingNull > 0) {
    console.log('')
    console.log('⚠️  注意: 仍有部分记录未恢复')
  }

  console.log('')
  console.log('🎉 恢复操作完成！')
}

restoreWithSmallBatches().catch(console.error)
