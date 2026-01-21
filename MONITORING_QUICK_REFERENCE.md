# 监控系统快速参考

> Vercel + Sentry + UptimeRobot - 快速查阅手册

---

## 🔗 重要链接

### Sentry
- **Dashboard**: https://sentry.io/
- **文档**: https://docs.sentry.io/
- **状态页**: https://status.sentry.io/

### Vercel
- **Dashboard**: https://vercel.com/dashboard
- **文档**: https://vercel.com/docs
- **Analytics**: https://vercel.com/analytics

### UptimeRobot
- **Dashboard**: https://uptimerobot.com/dashboard
- **配置指南**: https://uptimerobot.com/getting-started
- **API 文档**: https://uptimerobot.com/api

---

## 🚀 快速命令

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 测试 Sentry 错误捕获
# 访问: http://localhost:3000/test-sentry

# 构建测试
npm run build

# 生产环境测试
npm run start
```

### Vercel 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 预览部署
vercel

# 生产部署
vercel --prod

# 查看部署列表
vercel ls

# 查看部署日志
vercel logs [deployment-url]
```

---

## 🔧 环境变量

### 必需变量

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=
```

### 配置位置

| 环境 | 配置文件 | 优先级 |
|------|---------|--------|
| 本地开发 | `.env.local` | 最高 |
| Vercel 预览 | Vercel Dashboard | 中 |
| Vercel 生产 | Vercel Dashboard | 高 |

---

## 📊 监控检查

### 日常检查（每天）

```bash
✅ 1. Sentry Dashboard
   - 查看新错误
   - 查看错误率趋势
   - 查看性能指标

✅ 2. UptimeRobot Dashboard
   - 查看运行时间
   - 查看响应时间
   - 查看是否有宕机

✅ 3. Vercel Dashboard
   - 查看部署状态
   - 查看 Analytics
   - 查看错误日志
```

### 周度检查（每周）

```
✅ 错误趋势分析
   - 哪些错误最频繁
   - 哪些页面错误最多
   - 是否有新增错误类型

✅ 性能趋势分析
   - 页面加载时间变化
   - API 响应时间变化
   - 资源大小变化

✅ 用户行为分析
   - 哪些功能使用最多
   - 哪些页面访问最多
   - 用户流失点在哪里
```

---

## 🚨 故障处理流程

### 场景 1: 收到 Sentry 告警

```
1. 打开 Sentry Dashboard
2. 查看错误详情
   ├─ 错误堆栈
   ├─ 影响用户数
   └─ 发生时间
3. 定位问题代码
4. 修复并本地测试
5. 推送到 GitHub
6. Vercel 自动部署
7. 验证修复
```

### 场景 2: 收到 UptimeRobot 告警

```
1. 确认告警类型
   ├─ 网站宕机
   └─ 响应慢

2. 检查 Vercel Dashboard
   ├─ Deployments 状态
   ├─ Logs 错误日志
   └─ 资源使用情况

3. 检查 Sentry
   ├─ 是否有大量错误
   └─ 是否有性能问题

4. 根据问题类型修复
   ├─ 重新部署
   ├─ 回滚版本
   └─ 修复代码
```

### 场景 3: 用户报告问题

```
1. 询问用户详情
   ├─ 什么操作？
   ├─ 什么错误？
   └─ 浏览器/设备？

2. 检查 Sentry
   ├─ 搜索用户 ID
   ├─ 查看错误会话
   └─ 回放用户操作（Replay）

3. 检查 Vercel Logs
   ├─ API 调用记录
   ├─ 响应状态
   └─ 性能数据

4. 定位并修复
```

---

## 📈 性能优化建议

### 前端优化

```javascript
// Sentry 性能监控发现的问题及解决方案

1. LCP (Largest Contentful Paint) 慢
   → 优化大图片，使用懒加载
   → 使用 Next.js Image 组件

2. FID (First Input Delay) 慢
   → 减少 JavaScript 执行时间
   → 使用代码分割

3. CLS (Cumulative Layout Shift) 高
   → 为图片设置尺寸
   → 避免动态内容插入
```

### 后端优化

```javascript
// Vercel Logs 发现的问题及解决方案

1. API 响应慢
   → 优化数据库查询
   → 添加缓存
   → 使用 Edge Functions

2. 函数执行超时
   → 优化算法
   → 减少数据处理量
   → 增加超时时间配置
```

---

## 🎯 告警规则模板

### Sentry 告警规则

```javascript
// 规则 1: 错误率突增
条件: error rate > 5% for 5 minutes
通知: 邮件 + Slack

// 规则 2: 新错误出现
条件: new issue detected
通知: Slack
标签: critical

// 规则 3: 特定错误
条件: error.message includes "database"
通知: 邮件 + 短信
级别: high
```

### UptimeRobot 告警规则

```
// 主监控
URL: https://your-domain.com
间隔: 5 分钟
告警: 邮件

// API 健康检查
URL: https://your-domain.com/api/health
间隔: 5 分钟
告警: 邮件 + Slack
```

---

## 🔍 常用查询

### Sentry 查询

```sql
-- 最近 24 小时的错误
is:unresolved issue.timestamp:>24h

-- 特定用户的错误
user.id:xxx

-- 特定环境的错误
environment:production

-- 高优先级错误
level:error OR level:fatal
```

### Vercel Logs 查询

```bash
# 查看 API 错误
vercel logs --filter="status >= 400"

# 查看特定路径
vercel logs --filter="path LIKE '/api/practice%'"

# 查看慢请求
vercel logs --filter="duration > 1000"
```

---

## 📱 移动应用

### 下载应用

```
Sentry:
- iOS: App Store 搜索 "Sentry"
- Android: Google Play 搜索 "Sentry"

Vercel:
- iOS: App Store 搜索 "Vercel"
- Android: Google Play 搜索 "Vercel"

UptimeRobot:
- iOS: https://apps.apple.com/app/uptime-robot/id1445457267
- Android: https://play.google.com/store/apps/details?id=com.uptimerobot
```

---

## 💡 提示和技巧

### Sentry

```javascript
// 添加自定义上下文
Sentry.setContext("character", {
  name: "Mighty Fighter",
  age: 19,
  attack_type: "melee",
});

// 添加面包屑（用户操作轨迹）
Sentry.addBreadcrumb({
  message: "User clicked button",
  category: "ui",
  level: "info",
});

// 用户标识
Sentry.setUser({
  id: "123",
  email: "user@example.com",
});
```

### Vercel

```bash
# 查看所有环境变量
vercel env ls

# 拉取特定环境变量
vercel env pull .env.local

# 推送环境变量
vercel env push .env.local

# 删除环境变量
vercel rm NEXT_PUBLIC_XXX
```

### UptimeRobot

```
# 使用公开状态页面
https://stats.uptimerobot.com/xxxxx

# 自定义域名
Settings → Public Status Page → Custom Domain

# 添加 Logo
Settings → Public Status Page → Logo
```

---

## 🆘 获取帮助

### 社区资源

- **Next.js Discord**: https://discord.gg/nextjs
- **Sentry Discord**: https://discord.gg/ktYMP cwdqg
- **Vercel Discord**: https://chat.vercel.dev

### 文档

- **本项目文档**: ./DEPLOYMENT_MONITORING_GUIDE.md
- **Sentry 文档**: https://docs.sentry.io/
- **Vercel 文档**: https://vercel.com/docs
- **UptimeRobot**: ./UPTIMEROBOT_SETUP.md

---

**最后更新**: 2026-01-21
**版本**: v1.0
