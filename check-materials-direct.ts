/**
 * 直接检查 video_learning_materials 表
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMaterialsTable() {
  console.log('🔍 直接检查 video_learning_materials 表')
  console.log('========================================\n')

  const { data: materials, error } = await supabase
    .from('video_learning_materials')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.log('❌ 查询失败:', error.message)
    return
  }

  if (!materials || materials.length === 0) {
    console.log('❌ 表中没有数据')
    return
  }

  console.log(`找到 ${materials.length} 条记录:\n`)

  for (const material of materials) {
    console.log(`📝 Material ID: ${material.id}`)
    console.log(`   Video ID: ${material.video_id}`)
    console.log(`   Created: ${material.created_at}`)
    console.log('')
  }
}

checkMaterialsTable().catch(console.error)
