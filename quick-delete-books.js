// 快速删除所有书籍数据
const { createClient } = require('@supabase/supabase-js')

async function deleteAllBooks() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 缺少环境变量')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('\n🗑️  开始删除所有书籍数据...\n')

  try {
    // 步骤 1: 统计数据
    console.log('📊 统计当前数据...')

    const { count: booksCount } = await supabase.from('books').select('*', { count: 'exact', head: true })
    const { count: chaptersCount } = await supabase.from('chapters').select('*', { count: 'exact', head: true })
    const { count: wordsCount } = await supabase.from('words').select('*', { count: 'exact', head: true })
    const { count: progressCount } = await supabase.from('word_progress').select('*', { count: 'exact', head: true })
    const { count: mistakesCount } = await supabase.from('mistakes').select('*', { count: 'exact', head: true })

    console.log(`  书籍: ${booksCount || 0}`)
    console.log(`  章节: ${chaptersCount || 0}`)
    console.log(`  单词: ${wordsCount || 0}`)
    console.log(`  学习进度: ${progressCount || 0}`)
    console.log(`  错题记录: ${mistakesCount || 0}`)

    // 步骤 2: 删除数据（按依赖顺序）
    console.log('\n🗑️  删除数据...')

    // 2.1 删除用户偏好设置
    const { error: prefsError } = await supabase.from('user_book_preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('❌ 删除用户偏好失败:', prefsError.message)
    } else {
      console.log('  ✅ 已删除用户偏好设置')
    }

    // 2.2 删除生词日历
    const { error: calError } = await supabase.from('vocabulary_calendar').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (calError && calError.code !== 'PGRST116') {
      console.error('❌ 删除生词日历失败:', calError.message)
    } else {
      console.log('  ✅ 已删除生词日历')
    }

    // 2.3 删除错题本
    const { error: mistakesError } = await supabase.from('mistakes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (mistakesError && mistakesError.code !== 'PGRST116') {
      console.error('❌ 删除错题本失败:', mistakesError.message)
    } else {
      console.log('  ✅ 已删除错题本')
    }

    // 2.4 删除学习记录
    const { error: recordsError } = await supabase.from('learning_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (recordsError && recordsError.code !== 'PGRST116') {
      console.error('❌ 删除学习记录失败:', recordsError.message)
    } else {
      console.log('  ✅ 已删除学习记录')
    }

    // 2.5 删除学习进度
    const { error: progressError } = await supabase.from('word_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('❌ 删除学习进度失败:', progressError.message)
    } else {
      console.log('  ✅ 已删除学习进度')
    }

    // 2.6 删除单词
    const { error: wordsError } = await supabase.from('words').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (wordsError && wordsError.code !== 'PGRST116') {
      console.error('❌ 删除单词失败:', wordsError.message)
    } else {
      console.log('  ✅ 已删除单词')
    }

    // 2.7 删除章节
    const { error: chaptersError } = await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (chaptersError && chaptersError.code !== 'PGRST116') {
      console.error('❌ 删除章节失败:', chaptersError.message)
    } else {
      console.log('  ✅ 已删除章节')
    }

    // 2.8 删除书籍
    const { error: booksError } = await supabase.from('books').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (booksError && booksError.code !== 'PGRST116') {
      console.error('❌ 删除书籍失败:', booksError.message)
    } else {
      console.log('  ✅ 已删除书籍')
    }

    // 步骤 3: 验证删除结果
    console.log('\n📊 验证删除结果...')

    const { count: remainingBooks } = await supabase.from('books').select('*', { count: 'exact', head: true })
    const { count: remainingChapters } = await supabase.from('chapters').select('*', { count: 'exact', head: true })
    const { count: remainingWords } = await supabase.from('words').select('*', { count: 'exact', head: true })

    console.log(`  剩余书籍: ${remainingBooks || 0}`)
    console.log(`  剩余章节: ${remainingChapters || 0}`)
    console.log(`  剩余单词: ${remainingWords || 0}`)

    if ((remainingBooks || 0) === 0 && (remainingChapters || 0) === 0 && (remainingWords || 0) === 0) {
      console.log('\n✅ 删除成功！数据库已清空，准备导入正式数据。\n')
    } else {
      console.log('\n⚠️  删除完成，但仍有数据残留。\n')
    }

  } catch (error) {
    console.error('❌ 删除过程中发生错误:', error)
  }
}

deleteAllBooks().catch(console.error)
