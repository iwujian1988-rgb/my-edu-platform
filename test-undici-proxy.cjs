// 测试 undici ProxyAgent 是否工作
process.env.NODE_ENV = 'development'

// 设置全局代理（和 next.config.ts 一样）
const { setGlobalDispatcher, ProxyAgent } = require('undici')
const agent = new ProxyAgent('http://127.0.0.1:7890')
setGlobalDispatcher(agent)

console.log('[Proxy] 已启用 -> http://127.0.0.1:7890')

// 测试 fetch
async function testSupabase() {
  console.log('\n测试 Supabase 连接...')

  try {
    const response = await fetch('https://snnrjnpcmdsdlyldvvps.supabase.co', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })

    console.log(`✅ 成功！HTTP ${response.status}`)
  } catch (error) {
    console.log('❌ 失败')
    console.log('错误:', error.message)

    // 检查错误类型
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.log('原因: 连接超时（可能没走代理）')
    } else if (error.code === 'ENOTFOUND') {
      console.log('原因: DNS 解析失败（可能没走代理）')
    }
  }
}

testSupabase()
