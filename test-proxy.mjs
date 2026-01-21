// 测试 global-agent 是否生效
process.env.GLOBAL_AGENT_HTTP_PROXY = 'http://127.0.0.1:7890'
process.env.GLOBAL_AGENT_HTTPS_PROXY = 'http://127.0.0.1:7890'

// 必须在其他模块之前加载
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('global-agent/bootstrap')

// 现在测试 fetch
async function testSupabaseConnection() {
  console.log('测试 Supabase 连接（通过 global-agent 代理）...')

  try {
    const response = await fetch('https://snnrjnpcmdsdlyldvvps.supabase.co', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })

    console.log('✅ 连接成功！')
    console.log('状态码:', response.status)
  } catch (error) {
    console.log('❌ 连接失败')
    console.log('错误:', error.message)
    if (error.cause) {
      console.log('原因:', error.cause.message)
    }
  }
}

testSupabaseConnection()
