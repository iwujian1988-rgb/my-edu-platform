// 分批删除单词
const { createClient } = require('@supabase/supabase-js')

async function deleteWordsInBatches() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('🗑️  分批删除单词...\n')

  let totalDeleted = 0
  let hasMore = true
  const batchSize = 1000

  while (hasMore) {
    // 先获取一批ID
    const { data, error } = await supabase
      .from('words')
      .select('id')
      .limit(batchSize)

    if (error) {
      console.error('❌ 获取单词失败:', error.message)
      break
    }

    if (!data || data.length === 0) {
      hasMore = false
      break
    }

    // 提取ID
    const ids = data.map(w => w.id)

    // 删除这批
    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .in('id', ids)

    if (deleteError) {
      console.error('❌ 删除失败:', deleteError.message)
      break
    }

    totalDeleted += ids.length
    console.log(`  进度: 已删除 ${totalDeleted} 个单词`)
  }

  console.log(`\n✅ 删除完成！共删除 ${totalDeleted} 个单词\n`)

  // 验证
  const { count } = await supabase.from('words').select('*', { count: 'exact', head: true })
  console.log(`剩余单词: ${count || 0}`)
}

deleteWordsInBatches().catch(console.error)
