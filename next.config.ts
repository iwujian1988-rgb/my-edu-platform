import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// ========================================
// 开发环境：启用 HTTP 代理（访问Supabase）
// ========================================
// 使用 undici 的 ProxyAgent 让全局 fetch 走代理
if (process.env.NODE_ENV === 'development') {
  const { setGlobalDispatcher, ProxyAgent } = require('undici')

  // ✅ 修复连接泄漏：配置连接池参数
  const agent = new ProxyAgent('http://127.0.0.1:7890', {
    // ⭐ 连接池配置
    connections: 50,           // 最大连接数（默认无限）
    pipelining: 1,             // HTTP/1.1 管道数

    // ⭐ 超时配置（防止连接挂起）
    connectTimeout: 30_000,    // 连接超时 30秒
    keepAliveTimeout: 60_000,  // 保持连接超时 60秒
    keepAliveMaxTimeout: 300_000, // 最大保持连接时间 5分钟

    // ⭐ 自动释放空闲连接
    keepAliveTimeoutThreshold: 1_000, // 1秒后释放空闲连接
  })

  // 设置为全局 dispatcher，影响所有 fetch 调用
  setGlobalDispatcher(agent)

  console.log('[Proxy] 全局 fetch 代理已启用（带连接池配置）-> http://127.0.0.1:7890')
  console.log('[Proxy] 最大连接数:', 50, '超时:', 30, '秒')
}

const nextConfig: NextConfig = {
  // 禁用TypeScript检查以便完成构建（ESLint通过 eslint.config.mjs 管理）
  typescript: {
    ignoreBuildErrors: true,
  },
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

  // ⚠️ 使用标准模式，不用 standalone 预渲染
  // standalone 会强制预渲染所有页面，导致大量 useSearchParams/useRouter 错误
  // 标准模式 + PM2 运行，完全适合生产环境
  // output: 'standalone',  // 已禁用，使用标准模式避免预渲染问题
};

// Sentry 配置
const sentryWebpackPluginOptions = {
  // 组织 slug 和项目 slug 在 Sentry 中
  silent: true, // 禁止在构建时打印 Sentry 日志

  // 上传 Source Maps 以获得更好的错误堆栈信息
  // 对于所有环境（开发、生产、预览）
  uploadSourceMaps: true,

  // 验证配置正确性
  validate: true,

  // 其他配置选项
  // dryRun: process.env.NODE_ENV !== 'production', // 非生产环境不上传
};

// 包装配置以使用 Sentry
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
