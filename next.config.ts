import type { NextConfig } from "next";

// ========================================
// 开发环境：启用 HTTP 代理
// ========================================
// 使用 undici 的 ProxyAgent 让全局 fetch 走代理
if (process.env.NODE_ENV === 'development') {
  const { setGlobalDispatcher, ProxyAgent } = require('undici')

  // 创建代理 Agent
  const agent = new ProxyAgent('http://127.0.0.1:7890')

  // 设置为全局 dispatcher，影响所有 fetch 调用
  setGlobalDispatcher(agent)

  console.log('[Proxy] 全局 fetch 代理已启用 -> http://127.0.0.1:7890')
}

const nextConfig: NextConfig = {
  /* config options here */

  // 🚀 性能优化：低内存服务器优化
  webpack: (config, { isServer }) => {
    // ✅ 修复：使用原生文件监听而非轮询（Windows性能优化）
    config.watchOptions = {
      poll: false,  // ✅ 禁用轮询，使用原生文件监听
      aggregateTimeout: 300,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/logs/**',  // ✅ 忽略日志文件
        '**/*.log',    // ✅ 忽略日志文件
        '**/.env*'     // ✅ 忽略环境变量文件
      ]
    }

    // ✅ 修复：增加并发编译数，避免队列积压
    config.parallelism = isServer ? 2 : 4

    // 生产环境优化
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
        }
      }
    }

    return config
  },

  // 🚀 实验性功能：优化内存使用
  experimental: {
    // 启用优化模式
    optimizePackageImports: ['lucide-react', '@radix-ui/react-label'],
  },

  // 🚀 减少内存占用
  poweredByHeader: false,

  // 优化图片
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128],
    // ⚠️ 低内存优化：禁用图片缓存
    minimumCacheTTL: 60,
  },

  // 🚀 生产环境优化
  compress: true,
  generateEtags: true,

  // 🚀 减少日志输出
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // ⚠️ 低内存服务器优化
  // 减少构建时的内存占用
  output: 'standalone',
};

export default nextConfig;
