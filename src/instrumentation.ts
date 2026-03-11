/**
 * Next.js Instrumentation - 配置开发环境代理
 *
 * 此文件在 Next.js 服务器启动时执行，用于配置全局代理
 * 解决中国大陆访问 Supabase 需要代理的问题
 */

export async function register() {
  // 只在开发环境且在服务器端配置代理
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'development') {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:12334'

    if (proxyUrl) {
      try {
        // 方法1: 使用 global-agent 配置全局代理
        process.env.GLOBAL_AGENT_HTTP_PROXY = proxyUrl
        await import('global-agent/bootstrap')
        console.log(`[Instrumentation] Global agent proxy configured: ${proxyUrl}`)

        // 方法2: 配置 undici (用于原生 fetch)
        const { setGlobalDispatcher, ProxyAgent } = await import('undici')
        setGlobalDispatcher(new ProxyAgent(proxyUrl))
        console.log(`[Instrumentation] Undici proxy configured: ${proxyUrl}`)
      } catch (error) {
        console.error('[Instrumentation] Failed to configure proxy:', error)
      }
    }
  }
}
