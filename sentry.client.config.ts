import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境：development / production
  environment: process.env.NODE_ENV || "development",

  // 性能监控采样率
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // 过滤敏感信息
  beforeSend(event, hint) {
    // 移除 cookies 和 headers
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers
    }

    return event
  },

  // 忽略的错误类型
  ignoreErrors: [
    "Non-Error promise rejection captured",
    "ResizeObserver loop limit exceeded",
    "Failed to fetch", // 网络错误，通常不需要追踪
  ],

  // 过滤不需要的 URL
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],

  // 初始作用域标签
  initialScope: {
    tags: {
      project: "my-edu-platform",
    },
  },
})
