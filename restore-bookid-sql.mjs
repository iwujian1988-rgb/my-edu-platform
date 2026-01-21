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

async function restoreWithSQL() {
  console.log('🚀 使用 SQL 批量更新恢复 book_id\n')

  // 1. 执行前检查
  console.log('1️⃣ 执行前检查...')

  const { count: nullCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)

  console.log(`   待恢复记录数: ${nullCount}`)

  if (nullCount === 0) {
    console.log('   ✅ 所有数据已恢复，无需操作')
    return
  }
  console.log('')

  // 2. 使用 RPC 执行 SQL 更新
  console.log('2️⃣ 执行批量 SQL 更新...')
  console.log('   SQL: UPDATE words SET book_id = chapters.book_id FROM chapters WHERE words.chapter_id = chapters.id AND words.book_id IS NULL')
  console.log('')

  const startTime = Date.now()

  // 使用 Supabase RPC 执行原生 SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'UPDATE words SET book_id = chapters.book_id FROM chapters WHERE words.chapter_id = chapters.id AND words.book_id IS NULL'
  })

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  if (error) {
    console.log('   ⚠️  RPC 方法失败，尝试备选方案...')

    // 备选方案：分批但每批使用 SQL IN
    console.log('   使用分批 SQL IN 查询...')

    // 获取所有 chapter_id 和对应的 book_id
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, book_id')

    const chapterMap = {}
    chapters.forEach(c => {
      if (c.book_id) {
        chapterMap[c.id] = c.book_id
      }
    })

    // 获取所有需要更新的单词
    const { data: nullWords } = await supabase
      .from('words')
      .select('id, chapter_id')
      .is('book_id', null)
      .not('chapter_id', 'is', null)

    console.log(`   需要更新: ${nullWords.length} 条记录`)

    // 按 book_id 分组
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

    console.log(`   分成 ${Object.keys(bookGroups).length} 个 book_id 组`)

    // 对每个 book_id 执行一次批量更新
    let totalUpdated = 0
    let groupCount = 0

    for (const [bookId, wordIds] of Object.entries(bookGroups)) {
      groupCount++

      // 分批更新（每批 1000 个 word_id）
      for (let i = 0; i < wordIds.length; i += 1000) {
        const batch = wordIds.slice(i, i + 1000)

        const { error: updateError } = await supabase
          .from('words')
          .update({ book_id: bookId })
          .in('id', batch)

        if (updateError) {
          console.log(`   ❌ 批次更新失败:`, updateError)
        } else {
          totalUpdated += batch.length
        }

        if (groupCount % 5 === 0 || i + 1000 >= wordIds.length) {
          const progress = (totalUpdated / nullWords.length * 100).toFixed(1)
          console.log(`   进度: ${progress}% (${totalUpdated}/${nullWords.length})`)
        }
      }

      if (groupCount % 10 === 0) {
        console.log(`   已处理 ${groupCount}/${Object.keys(bookGroups).length} 个词书...`)
      }
    }

    const finalEndTime = Date.now()
    const finalDuration = ((finalEndTime - startTime) / 1000).toFixed(2)

    console.log('')
    console.log(`   ✅ 更新完成: ${totalUpdated} 条记录`)
    console.log(`   ⏱️  耗时: ${finalDuration} 秒`)

  } else {
    console.log(`   ✅ SQL 更新成功`)
    console.log(`   ⏱️  耗时: ${duration} 秒`)
  }

  console.log('')

  // 3. 验证恢复结果
  console.log('3️⃣ 验证恢复结果...')

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

  // 4. 按词书统计
  console.log('4️⃣ 按词书统计单词数...')

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

  // 排序：完全匹配的在前
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

  console.log('📋 恢复完成总结:')
  console.log(`   ✅ 完全恢复: ${matchedCount}/${books.length} 本词书`)
  console.log(`   📊 有效记录: ${totalValid}`)
  console.log(`   ⚠️  剩余 NULL: ${remainingNull}`)

  if (remainingNull > 0) {
    console.log('')
    console.log('⚠️  注意: 仍有部分记录的 book_id 为 NULL')
    console.log('   这些记录没有 chapter_id，无法通过此方法恢复')
  }

  console.log('')
  console.log('🎉 恢复操作完成！')
}

restoreWithSQL().catch(console.error)
