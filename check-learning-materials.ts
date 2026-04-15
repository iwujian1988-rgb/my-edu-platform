/**
 * 检查已上传视频的学习材料数据完整性
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLearningMaterials() {
  console.log('🔍 检查学习材料数据完整性')
  console.log('========================================\n')

  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title')
    .eq('creator_name', 'InnerFrench 中级法语')
    .order('created_at', { ascending: false })

  if (error) {
    console.log('❌ 查询失败:', error.message)
    return
  }

  for (const video of videos) {
    console.log(`📹 ${video.title}`)

    const { data: materials, error: materialsError } = await supabase
      .from('video_learning_materials')
      .select('material_json')
      .eq('video_id', video.id)
      .single()

    if (materialsError || !materials) {
      console.log(`   ❌ 没有学习材料`)
      console.log('')
      continue
    }

    const material = materials.material_json as any
    const unitKey = Object.keys(material)[0]
    const unitContent = material[unitKey]

    console.log(`   ✅ 有学习材料`)
    console.log(`   📝 字幕数: ${unitContent.subtitles?.length || 0}`)
    console.log(`   📚 单词数: ${unitContent.language_analysis?.vocabulary?.length || 0}`)
    console.log(`   💬 地道表达: ${unitContent.idiomatic_expressions?.length || 0}`)
    console.log(`   📖 语法点: ${unitContent.grammar_points?.length || 0}`)
    console.log(`   🎯 练习: ${unitContent.exercises?.length || 0}`)

    // 检查是否有练习数据
    if (unitContent.exercises && unitContent.exercises.length > 0) {
      console.log(`   📋 练习类型:`)
      const exerciseTypes = new Set()
      unitContent.exercises.forEach((ex: any) => {
        exerciseTypes.add(ex.type)
      })
      exerciseTypes.forEach(type => console.log(`      - ${type}`))
    }

    console.log('')
  }

  console.log('========================================')
}

checkLearningMaterials().catch(console.error)
