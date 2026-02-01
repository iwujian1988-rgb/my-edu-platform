/**
 * 诊断每日任务生成问题
 *
 * 用法：
 * 1. 在浏览器控制台运行（需要先登录）
 * 2. 或者保存为文件，用 node 运行（需要配置环境变量）
 */

async function diagnoseDailyTask() {
  console.log('==========================================')
  console.log('📋 开始诊断每日任务问题')
  console.log('==========================================\n')

  // 步骤 1: 检查用户登录状态
  console.log('🔍 步骤 1: 检查用户登录状态...')
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ 用户未登录:', userError)
      return
    }
    console.log('✅ 用户已登录:', user.id)
  } catch (e) {
    console.error('❌ 检查登录状态失败:', e)
    return
  }

  // 步骤 2: 获取 bookId 参数
  const urlParams = new URLSearchParams(window.location.search)
  const bookId = urlParams.get('bookId') || '0de7c5a1-eff0-4911-adb7-28be6863be0c' // 从错误日志中看到的
  console.log('📚 步骤 2: BookId:', bookId)

  // 步骤 3: 检查学习计划是否存在
  console.log('\n🔍 步骤 3: 检查学习计划...')
  try {
    const { data: plans, error: planError } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('status', 'active')

    if (planError) {
      console.error('❌ 查询学习计划失败:', planError)
      return
    }

    if (!plans || plans.length === 0) {
      console.error('❌ 未找到活跃的学习计划')
      console.log('💡 解决方法：先创建学习计划')
      return
    }

    console.log('✅ 找到学习计划:', plans[0])
    console.log('   - daily_new_words:', plans[0].daily_new_words)
    console.log('   - review_ratio:', plans[0].review_ratio)
  } catch (e) {
    console.error('❌ 检查学习计划失败:', e)
    return
  }

  // 步骤 4: 检查今日任务是否已存在
  console.log('\n🔍 步骤 4: 检查今日任务...')
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  console.log('📅 今日日期:', todayStr)

  try {
    const { data: existingTask, error: taskError } = await supabase
      .from('daily_task_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('task_date', todayStr)
      .single()

    if (taskError && taskError.code !== 'PGRST116') {
      console.error('❌ 查询今日任务失败:', taskError)
      return
    }

    if (existingTask) {
      console.log('✅ 今日任务已存在:', existingTask)
      console.log('   - new_words:', existingTask.new_words?.length)
      console.log('   - review_words:', existingTask.review_words?.length)
      return
    }

    console.log('⚠️ 今日任务不存在，需要生成')
  } catch (e) {
    console.error('❌ 检查今日任务失败:', e)
    return
  }

  // 步骤 5: 测试数据库函数 get_new_words_for_learning
  console.log('\n🔍 步骤 5: 测试数据库函数...')
  try {
    const { data: newWords, error: funcError } = await supabase.rpc('get_new_words_for_learning', {
      p_user_id: user.id,
      p_book_id: bookId,
      p_limit: 5
    })

    if (funcError) {
      console.error('❌ 数据库函数调用失败:', funcError)
      console.log('💡 可能原因：数据库函数未创建或权限问题')
      return
    }

    console.log('✅ 数据库函数正常，返回:', newWords?.length, '个单词')
  } catch (e) {
    console.error('❌ 测试数据库函数失败:', e)
    return
  }

  // 步骤 6: 测试 API 端点
  console.log('\n🔍 步骤 6: 测试 API 端点...')
  try {
    const response = await fetch(`/api/v3/daily-task?bookId=${bookId}&_t=${Date.now()}`, {
      cache: 'no-store'
    })

    console.log('📡 API 响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API 调用失败:', response.status, response.statusText)
      console.error('错误详情:', errorText)
      return
    }

    const result = await response.json()
    console.log('✅ API 调用成功:', result)
  } catch (e) {
    console.error('❌ 测试 API 端点失败:', e)
    return
  }

  console.log('\n==========================================')
  console.log('✅ 诊断完成')
  console.log('==========================================')
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined' && typeof supabase !== 'undefined') {
  diagnoseDailyTask()
} else {
  console.log('❌ 请在浏览器控制台中运行此脚本')
  console.log('或者先配置 supabase 客户端')
}
