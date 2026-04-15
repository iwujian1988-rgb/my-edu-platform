/**
 * 测试单个视频上传
 */

import fs from 'fs'
import path from 'path'

const testFile = './linshi/InnerFrench 中级法语_processed/E174 Apprendre le français en immersion dans l' + 'Utah_materials.json'

console.log('🧪 测试单个视频上传...')
console.log('========================================\n')

// 读取JSON文件
try {
  const jsonContent = fs.readFileSync(testFile, 'utf-8')
  const jsonData = JSON.parse(jsonContent)

  console.log('📄 文件信息:')
  console.log(`   文件名: ${path.basename(testFile)}`)
  console.log(`   频道: ${jsonData.channel}`)
  console.log(`   视频名称: ${jsonData.video_name}`)
  console.log(`   单元数: ${Object.keys(jsonData.materials).length}`)

  // 检查第一个单元的vocabulary数据
  const firstUnitKey = Object.keys(jsonData.materials)[0]
  const firstUnit = jsonData.materials[firstUnitKey]

  const vocab = firstUnit.language_analysis?.vocabulary || []
  console.log(`   第一个单元单词数: ${vocab.length}`)

  if (vocab.length > 0) {
    console.log('   前3个单词:')
    for (let i = 0; i < Math.min(3, vocab.length); i++) {
      const v = vocab[i]
      console.log(`      ${i + 1}. ${v.french} - ${v.chinese || '无'}`)
    }
  }

  // 准备上传数据
  const uploadData = {
    merged_json: jsonData,
    video_url: 'https://english-word-audio-wujian.oss-cn-hongkong.aliyuncs.com/test.mp3' // 测试URL
  }

  console.log('\n🚀 准备调用API...')
  console.log('API地址: http://localhost:3001/api/admin/videos/merged-batch-upload')

  // 调用API
  fetch('http://localhost:3001/api/admin/videos/merged-batch-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'sb-snnrjnpcmdsdlyldvvps-auth-token=base64-eyJhY2Nlc3NfdG9rZW4iOiJleUpoYkdjaU9pSkZVekkxTmlJc0ltdHBaQ0k2SWpSa1l6Vm1ObUkyTFRneVlURXROR1JqWXkxaE9USmpMVEUzWm1KaFpEYzFPRFppTlNJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcGMzTWlPaUpvZEhSd2N6b3ZMM051Ym5KcWJuQmpiV1J6Wkd4NWJHUjJkbkJ6TG5OMWNHRmlZWE5sTG1OdkwyRjFkR2d2ZGpFaUxDSnpkV0lpT2lJMk1XTTNOVEF4TkMxallUSTFMVFJqTW1NdFlUazVNaTFqWXpVNE9HVTFNVEExT1RnaUxDSmhkV1FpT2lKaGRYUm9aVzUwYVdOaGRHVmtJaXdpWlhod0lqb3hOemMyTVRZeE9UY3pMQ0pwWVhRaU9qRTNOell4TlRnek56TXNJbVZ0WVdsc0lqb2lhVzEzZFdwcFlXNW1aV2xBTVRZekxtTnZiU0lzSW5Cb2IyNWxJam9pSWl3aVlYQndYMjFsZEdGa1lYUmhJanA3SW5CeWIzWnBaR1Z5SWpvaVpXMWhhV3dpTENKd2NtOTJhV1JsY25NaU9sc2laVzFoYVd3aVhYMHNJblZ6WlhKZmJXVjBZV1JoZEdFaU9uc2laVzFoYVd4ZmRtVnlhV1pwWldRaU9uUnlkV1Y5TENKeWIyeGxJam9pWVhWMGFHVnVkR2xqWVhSbFpDSXNJbUZoYkNJNkltRmhiREVpTENKaGJYSWlPbHQ3SW0xbGRHaHZaQ0k2SW5CaGMzTjNiM0prSWl3aWRHbHRaWE4wWVcxd0lqb3hOemMyTVRVNE16Y3pmVjBzSW5ObGMzTnBiMjNmYVdRaU9pSTFaV1JoWXpBd015MWtZVFprTFRRNU56WXRPRGhrTUMweU4yTmlNRFZpTlRKalpEZ2lMQ0pwWzE5aGJtOXVlVzF2ZFhNaU9tWmhiSE5sZlEuMkFkOFZ5V0VrZmtHdU4tdldZd3d1Y1lJeGZoak5rNVFlY0Fxd0RTc2hLZ0F1QXNyOFBrQ0t0N1V4SXdKeWd1QmhUQ3pEZXhIdndBZUdTOTMwQnFhTGciLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6MzYwMCwiZXhwaXJlc19hdCI6MTc3NjE2MTk3MywicmVmcmVzaF90b2tlbiI6InNjdGJmdmpmbGJwciIsInVzZXIiOnsiaWQiOiI2MWM3NTAxNC1jYTI1LTRjMmMtYTk5Mi1jYzU4OGU1MTA1OTgiLCJhdXQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJlbWFpbCI6Imltd3VqaWFuZmVpQDE2My5jb20iLCJlbWFpbF9jb25maXJtZWRfYXQiOiIyMDI2LTAxLTA3VDA2OjU1OjExLjE5OTQ5NloiLCJwaG9uZSI6IiIsImNvbmZpcm1lZF9hdCI6IjIwMjYtMDEtMDdUMDY6NTU6MTEuMTk5NDk2WiIsImxhc3Rfc2lnbl9pbl9hdCI6IjIwMjYtMDQtMTRUMDk6MTk6MzMuMzA4MDI1MTEyWiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaWRlbnRpdGllcyI6W3siaWRlbnRpdHlfaWQiOiIwOWMxOWE0NS00ZDU5LTQwM2QtYTI3Yi1lNGU3MjMzMjEwNGQiLCJpZCI6IjYxYzc1MDE0LWNhMjUtNGMyYy1hOTkyLWNjNTg4ZTUxMDU5OCIsInVzZXJfaWQiOiI2MWM3NTAxNC1jYTI1LTRjMmMtYTk5Mi1jYzU4OGU1MTA1OTgiLCJpZGVudGl0eV9kYXRhIjp7ImVtYWlsIjoiaW13dWppYW5mZWlAMTYzLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI2MWM3NTAxNC1jYTI1LTRjMmMtYTk5Mi1jYzU4OGU1MTA1OTgifSwicHJvdmlkZXIiOiJlbWFpbCIsImxhc3Rfc2lnbl9pbl9hdCI6IjIwMjYtMDEtMDdUMDY6NTU6MTEuMTg1ODA3WiIsImNyZWF0ZWRfYXQiOiIyMDI2LTAxLTA3VDA2OjU1OjExLjE4NTg3WiIsInVwZGF0ZWRfYXQiOiIyMDI2LTAxLTA3VDA2OjU1OjExLjE4NTg3WiIsImVtYWlsIjoiaW13dWppYW5mZWlAMTYzLmNvbSJ9XSwiY3JlYXRlZF9hdCI6IjIwMjYtMDEtMDdUMDY6NTU6MTEuMTQ2NzFaIiwidXBkYXRlZF9hdCI6IjIwMjYtMDQtMTRUMDk6MTk6MzMuMzI3MTIzWiIsImlzX2Fub255bW91cyI6ZmFsc2V9LCJ3ZWFrX3Bhc3N3b3JkIjpudWxsfQ'
    },
    body: JSON.stringify(uploadData)
  })
  .then(response => response.json())
  .then(data => {
    console.log('\n📊 API响应:')
    console.log(JSON.stringify(data, null, 2))

    if (data.success && data.data && data.data.results) {
      const result = data.data.results[0]
      console.log('\n✅ 上传成功!')
      console.log(`   视频ID: ${result.id}`)
      console.log(`   标题: ${result.title}`)
      console.log(`   单词数: ${result.words_count}`)

      if (result.id) {
        console.log('\n🔍 检查数据库...')
        // 可以添加数据库检查逻辑
      }
    } else {
      console.log('\n❌ 上传失败')
    }
  })
  .catch(error => {
    console.error('\n❌ API调用失败:', error)
  })

} catch (error) {
  console.error('❌ 文件读取失败:', error)
}