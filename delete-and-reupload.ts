/**
 * 删除有问题的视频并重新上传测试
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteAndReresh() {
  console.log('🗑️  删除有问题的视频...')
  console.log('========================================\n')

  const videoIds = [
    '612ad55a-99e1-4722-a2b9-75a26730a693', // E174
    'bc320136-c2df-4d6c-8028-c0bc0b985508', // E175
    '88876bf7-fa9e-42d3-af90-0d7d683a3f98', // E176
    '31abbfc5-fd82-4290-a642-d6145947af56', // E177
    'e9765cd3-4651-4104-98c7-2cdacf432584', // E179
  ]

  for (const videoId of videoIds) {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)

    if (error) {
      console.log(`❌ 删除失败 ${videoId}: ${error.message}`)
    } else {
      console.log(`✅ 删除成功 ${videoId}`)
    }
  }

  console.log('\n========================================')
  console.log('✅ 删除完成，现在可以重新上传测试')
}

deleteAndReresh().catch(console.error)