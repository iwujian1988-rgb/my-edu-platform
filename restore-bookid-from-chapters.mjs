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

async function restoreBookId() {
  console.log('🚀 开始恢复 book_id 数据\n')
  console.log('⚠️  重要: 此操作将更新 93,334 条记录')
  console.log('⚠️  建议先备份数据库\n')

  // 1. 执行前检查
  console.log('1️⃣ 执行前检查...')

  const { count: nullCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)

  console.log(`   待恢复记录数: ${nullCount}`)

  if (nullCount === 0) {
    console.log('   ✅ 没有需要恢复的记录')
    return
  }
  console.log('')

  // 2. 获取所有 chapter_id 和对应的 book_id 映射
  console.log('2️⃣ 获取 chapter -> book 映射关系...')

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, book_id')

  if (chaptersError) {
    console.log('❌ 获取章节信息失败:', chaptersError)
    return
  }

  console.log(`   ✅ 找到 ${chapters.length} 个章节`)

  // 创建映射表
  const chapterToBookMap = {}
  chapters.forEach(c => {
    if (c.book_id) {
      chapterToBookMap[c.id] = c.book_id
    }
  })

  console.log(`   ✅ 创建映射表: ${Object.keys(chapterToBookMap).length} 条映射`)
  console.log('')

  // 3. 分批恢复（每次 1000 条）
  console.log('3️⃣ 开始分批恢复...')

  const BATCH_SIZE = 1000
  let totalUpdated = 0
  let batchCount = 0

  // 获取所有需要恢复的单词
  const { data: nullWords, error: fetchError } = await supabase
    .from('words')
    .select('id, chapter_id')
    .is('book_id', null)
    .not('chapter_id', 'is', null)

  if (fetchError) {
    console.log('❌ 获取单词失败:', fetchError)
    return
  }

  console.log(`   总共需要更新: ${nullWords.length} 条记录`)
  console.log('')

  // 分批处理
  for (let i = 0; i < nullWords.length; i += BATCH_SIZE) {
    batchCount++
    const batch = nullWords.slice(i, i + BATCH_SIZE)

    console.log(`   批次 ${batchCount}: 更新 ${batch.length} 条记录...`)

    // 准备更新数据
    const updates = batch
      .filter(w => chapterToBookMap[w.chapter_id])
      .map(w => ({
        id: w.id,
        book_id: chapterToBookMap[w.chapter_id]
      }))

    if (updates.length === 0) {
      console.log(`      ⚠️  批次 ${batchCount}: 没有需要更新的记录`)
      continue
    }

    // 执行更新（逐条更新以避免 RPC 限制）
    let successCount = 0
    let errorCount = 0

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('words')
        .update({ book_id: update.book_id })
        .eq('id', update.id)

      if (updateError) {
        errorCount++
      } else {
        successCount++
      }
    }

    totalUpdated += successCount

    console.log(`      ✅ 成功: ${successCount}, ❌ 失败: ${errorCount}`)

    // 显示进度
    const progress = ((i + batch.length) / nullWords.length * 100).toFixed(1)
    console.log(`      进度: ${progress}%`)
  }

  console.log('')

  // 4. 验证恢复结果
  console.log('4️⃣ 验证恢复结果...')

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
  console.log(`   更新成功: ${totalUpdated}`)
  console.log('')

  // 5. 按词书统计恢复后的单词数
  console.log('5️⃣ 按词书统计单词数...')

  const { data: books } = await supabase
    .from('books')
    .select('id, title, total_words')
    .order('title')

  for (const book of books) {
    const { count } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', book.id)

    const status = count === book.total_words ? '✅' : (count > 0 ? '⚠️' : '❌')
    const diff = count - book.total_words

    console.log(`   ${status} ${book.title}: ${count} 个单词 (预期: ${book.total_words}, 差值: ${diff})`)
  }

  console.log('')

  // 总结
  console.log('📋 恢复完成总结:')
  console.log(`   ✅ 成功更新: ${totalUpdated} 条记录`)
  console.log(`   📊 成功率: ${(totalUpdated / nullCount * 100).toFixed(1)}%`)
  console.log(`   ⚠️  剩余 NULL: ${remainingNull}`)

  if (remainingNull > 0) {
    console.log('')
    console.log('⚠️  注意: 仍有部分记录的 book_id 为 NULL')
    console.log('   这些记录没有 chapter_id，需要其他方式恢复')
  }

  console.log('')
  console.log('🎉 恢复操作完成！')
}

restoreBookId().catch(console.error)
