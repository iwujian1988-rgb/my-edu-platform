/**
 * 清空所有InnerFrench视频数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearVideos() {
  console.log('🗑️  清空所有InnerFrench视频...')

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('creator_name', 'InnerFrench 中级法语')

  if (error) {
    console.log('❌ 删除失败:', error.message)
  } else {
    console.log('✅ 所有InnerFrench视频已清空')
  }
}

clearVideos().catch(console.error)
