# Vercel 部署指南

## 🎯 部署方式选择

**推荐方式**：通过 Vercel 网站部署（最简单）

---

## 📋 步骤 1: 访问 Vercel 并导入项目

### 1.1 登录 Vercel

访问：https://vercel.com/new

选择 **Continue with GitHub** 登录

### 1.2 导入 GitHub 仓库

1. 找到您的仓库：`iwujian1988-rgb/my-edu-platform`
2. 点击 **Import** 按钮

### 1.3 配置项目

```
Project Name: my-edu-platform

Framework Preset: Next.js

Root Directory: ./

Build Command: (自动检测，应该显示)
  npm run build

Output Directory: (自动检测，应该显示)
  .next

Install Command: (自动检测，应该显示)
  npm install
```

### 1.4 选择部署区域

**重要**：选择 **Hong Kong (hkg1)** - 对亚洲用户更快

---

## 📋 步骤 2: 配置环境变量

在部署前，需要添加环境变量：

### 2.1 在 Configure Project 页面

找到 **Environment Variables** 部分，添加以下变量：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://snnrjnpcmdsdlyldvvps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODg1MzgsImV4cCI6MjA4MzE2NDUzOH0.1rUusdU-SyWMYNiiAfjrDtSFlcxlwn4FOv0X8bJC7Sk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc

# Sentry 监控
NEXT_PUBLIC_SENTRY_DSN=https://5bff2f474444acc0779351a45d77c7ee@o4510748876341248.ingest.us.sentry.io/4510748878962688
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Google AI (可选)
GOOGLE_AI_API_KEY=AIzaSyDLgSsF-BM_71cfRco9nEA0J_s38rQu8CA
```

### 2.2 环境变量说明

**适用于**：
- ✅ Production（生产环境）
- ✅ Preview（预览环境）
- ✅ Development（开发环境）

**选择**：All environments（适用于所有环境）

---

## 📋 步骤 3: 开始部署

1. 检查所有配置是否正确
2. 点击 **Deploy** 按钮
3. 等待部署完成（大约 2-5 分钟）

### 部署过程

您会看到：
```
➜ Building...
➜ Build completed in 2.3s
➜ Uploading...
➜ Deployment completed
```

---

## 📋 步骤 4: 获取域名

部署成功后，Vercel 会给您两个域名：

**预览域名（每次部署都变）**：
```
https://my-edu-platform-xxxxx.vercel.app
```

**生产域名（固定）**：
```
https://my-edu-platform.vercel.app
```

**或使用自定义域名**（可选）

---

## ✅ 步骤 5: 验证部署

### 5.1 访问网站

打开浏览器访问：`https://my-edu-platform.vercel.app`

### 5.2 测试功能

- [ ] 首页可以访问
- [ ] 登录功能正常
- [ ] 练习功能正常
- [ ] 用户数据正常加载

### 5.3 检查 Sentry

访问 Sentry Dashboard：
```
https://sentry.io/organizations/maxnote/projects/javascript-nextjs/
```

应该能看到：
- ✅ 生产环境的错误（如果有）
- ✅ 环境标签为 "production"

---

## 🔄 自动部署

配置完成后，以后每次推送到 GitHub：

```bash
git add .
git commit -m "feat: 新功能"
git push origin master
```

Vercel 会**自动部署**！🚀

---

## 🌐 自定义域名（可选）

### 6.1 在 Vercel Dashboard

1. 进入项目 → Settings → Domains
2. 添加您的域名（如：`www.yourdomain.com`）
3. 配置 DNS 记录

### 6.2 DNS 配置

在您的域名提供商添加：

```
类型: CNAME
名称: www
值: cname.vercel-dns.com
```

---

## 📊 监控和日志

### Vercel Dashboard

- **Deployments**: 查看部署历史
- **Analytics**: 查看访问统计
- **Logs**: 查看实时日志
- **Speed Insights**: 查看性能指标

### 查看日志

```bash
# 使用 Vercel CLI（可选）
vercel logs

# 或在 Vercel Dashboard 查看
```

---

## 🆘 常见问题

### 问题 1: 部署失败

**解决方法**：
1. 检查 Build Logs
2. 确认所有依赖已安装
3. 检查环境变量是否正确

### 问题 2: 环境变量不生效

**解决方法**：
1. 重新部署（环境变量修改后需要重新部署）
2. 确认变量名完全匹配（区分大小写）

### 问题 3: 构建超时

**解决方法**：
1. 优化构建速度
2. 增加 `vercel.json` 中的超时配置

---

## 📚 相关文档

- **Vercel 文档**: https://vercel.com/docs
- **Next.js 部署**: https://nextjs.org/docs/deployment
- **环境变量**: https://vercel.com/docs/projects/environment-variables

---

**预计部署时间**: 5-10 分钟
**难度**: ⭐⭐ (简单)

祝部署顺利！🎉
