/**
 * 清空video数据并重新上传测试
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearAndReresh() {
  console.log('🗑️  清空所有video数据...')
  console.log('========================================\n')

  // 1. 删除所有InnerFrench视频
  const { error: deleteError } = await supabase
    .from('videos')
    .delete()
    .eq('creator_name', 'InnerFrench 中级法语')

  if (deleteError) {
    console.log('❌ 删除失败:', deleteError.message)
  } else {
    console.log('✅ 清空成功')
  }

  console.log('\n========================================')
  console.log('✅ 数据清空完成')
  console.log('现在可以使用批量上传脚本重新上传5个视频')
}

clearAndReresh().catch(console.error)