/**
 * 直接调用API测试E174上传
 */

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

async function testAPIUpload() {
  console.log('🧪 直接调用API测试E174上传')
  console.log('========================================\n')

  // 读取E176的JSON
  const jsonData = JSON.parse(fs.readFileSync('./linshi/InnerFrench 中级法语_processed/E176 À la découverte des côtes normandes et bretonnes_materials.json', 'utf-8'))

  // 添加测试音频URL
  jsonData.materials.unit_1.unit_info.audio_url = 'https://test.com/test.mp3'

  const uploadData = {
    merged_json: jsonData,
    video_url: 'https://test.com/test.mp3'
  }

  console.log('📤 准备调用API...')
  console.log('API: http://localhost:3001/api/admin/videos/merged-batch-upload')

  try {
    const response = await fetch('http://localhost:3001/api/admin/videos/merged-batch-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify(uploadData)
    })

    const result = await response.json()
    console.log('\n📊 API响应:')
    console.log(JSON.stringify(result, null, 2))

    if (result.success && result.data) {
      const videoResult = result.data.results?.[0]
      if (videoResult) {
        console.log('\n✅ 上传成功!')
        console.log(`   视频ID: ${videoResult.id}`)
        console.log(`   单词卡片数: ${videoResult.words_count || 0}`)

        // 验证数据库中的word_cards
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { count } = await supabase
          .from('video_word_cards')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', videoResult.id)

        console.log(`   数据库验证: ${count || 0} 个word_cards`)

        // 清理测试数据
        await supabase.from('videos').delete().eq('id', videoResult.id)
        console.log('   🧹 清理测试数据完成')
      }
    } else {
      console.log('\n❌ 上传失败')
    }
  } catch (error) {
    console.error('\n❌ 调用失败:', error)
  }
}

testAPIUpload().catch(console.error)