/**
 * 删除E175视频以便重新上传
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteE175() {
  console.log('🗑️  删除E175视频...')

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('title', 'E175 医疗援助死亡，即将在法国实现')

  if (error) {
    console.log('❌ 删除失败:', error.message)
  } else {
    console.log('✅ E175已删除')
  }
}

deleteE175().catch(console.error)
