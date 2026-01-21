# UptimeRobot 配置指南

## 📋 配置步骤

### 1. 注册 UptimeRobot 账号

1. 访问 https://uptimerobot.com/
2. 点击 "Sign Up" 注册免费账号
3. 验证邮箱

### 2. 创建监控器（Monitor）

#### 方式 A: 通过网页配置（推荐）

1. 登录 UptimeRobot
2. 点击 "Add New Monitor"
3. 配置如下：

```
Monitor Type:
  ✅ HTTP(s)

Monitor Type:
  ✅ HTTP(s)（不要选 HTTPS）

URL:
  https://your-domain.com

Check Interval:
  ✅ 5 minutes（免费版）

Monitoring Locations:
  ✅ 选择多个位置（推荐：中国香港、日本、美国）

Alert Contacts:
  ✅ Email（您的邮箱）
  ✅ 可选：SMS、Slack、钉钉等

Keyword (可选):
  ✅ 检查页面是否包含特定文本
  示例：英语学习平台
```

4. 点击 "Create Monitor"
5. 完成！

#### 方式 B: 通过 API 配置

```bash
curl https://api.uptimerobot.com/v2/newMonitor \
  -d "api_key=YOUR_API_KEY" \
  -d "format=json" \
  -d "type=1" \
  -d "url=https://your-domain.com" \
  -d "interval=300" \
  -d "alert_contacts=YOUR_CONTACT_ID"
```

### 3. 配置告警

#### 邮件告警（默认）
- ✅ 已自动启用
- 网站宕机时立即发送邮件

#### 短信告警（可选）
1. 进入 "Alert Contacts"
2. 添加手机号码
3. 验证手机号

#### Slack/钉钉告警（推荐）

**Slack**:
1. 创建 Incoming Webhook
2. 在 UptimeRobot 添加 Webhook URL
3. 接收 Slack 通知

**钉钉**:
1. 创建群机器人
2. 获取 Webhook URL
3. 配置转发服务（如 Zapier）

### 4. 创建多个监控点

**建议配置**：

| 监控点 | URL | 说明 |
|-------|-----|------|
| 主页 | https://your-domain.com | 网站整体可用性 |
| API 健康检查 | https://your-domain.com/api/health | 后端服务状态 |
| 关键功能 | https://your-domain.com/practice | 核心功能可用性 |

### 5. 查看监控数据

**位置**: UptimeRobot Dashboard

**可查看**：
- ✅ 运行时间百分比（Uptime）
- ✅ 响应时间趋势
- ✅ 宕机历史记录
- ✅ 故障时长统计

**公开状态页面（可选）**：
- 设置 → Public Status Page
- 可以让用户查看服务状态
- 示例：https://stats.uptimerobot.com/xxxxx

---

## 🎯 最佳实践

### 检查间隔

| 环境 | 间隔设置 | 费用 |
|------|---------|------|
| 开发/测试 | 5 分钟 | 免费 |
| 小型生产 | 5 分钟 | 免费 |
| 中型生产 | 1 分钟 | 付费 ($5.57/月) |

### 监控位置选择

**亚洲用户为主**：
```
✅ 中国香港 (Hong Kong)
✅ 日本东京 (Tokyo)
✅ 新加坡 (Singapore)
✅ 美国西海岸 (Los Angeles)
```

### 告警策略

```
轻微故障（单个位置失败）:
  → 仅记录，不告警

严重故障（多个位置失败）:
  → 立即发送邮件告警

持续故障（超过 5 分钟）:
  → 发送短信/电话告警
```

---

## 📊 监控指标说明

### Uptime（运行时间）

```
99.9% = 每月宕机 43 分钟
99.99% = 每月宕机 4.3 分钟
99.999% = 每月宕机 0.43 分钟
```

### Response Time（响应时间）

```
< 200ms: 优秀 ✅
200-500ms: 良好 ✅
500-1000ms: 一般 ⚠️
> 1000ms: 较慢 ❌
```

---

## 🔗 与 Sentry 集成

UptimeRobot 发现网站宕机 → 检查 Sentry

```
流程：
1. UptimeRobot 告警：网站宕机
2. 登录 Sentry 查看是否有错误
3. 根据错误信息定位问题
4. 修复并部署
5. UptimeRobot 自动恢复通知
```

---

## 📱 移动应用

下载 UptimeRobot App：
- iOS: https://apps.apple.com/app/uptime-robot/id1445457267
- Android: https://play.google.com/store/apps/details?id=com.uptimerobot

**功能**：
- 📊 查看监控状态
- 🔔 接收推送通知
- 📈 查看响应时间图表
- 🚪 暂停/恢复监控

---

## 💡 高级配置

### 关键字监控（Keyword Monitoring）

检查页面是否包含特定文本：

```
URL: https://your-domain.com
Keyword: 英语学习平台
✅ 包含关键字 = 正常
❌ 不包含关键字 = 异常（可能页面错误）
```

### 端口监控（Port Monitoring）

监控特定端口（不常用）：

```
Type: Port
Host: your-domain.com
Port: 3000
```

### Ping 监控

只检测服务器是否在线：

```
Type: Ping
Host: your-domain.com
```

---

## ✅ 配置检查清单

部署前确认：

- [ ] 已注册 UptimeRobot 账号
- [ ] 已创建主页监控
- [ ] 已创建 API 健康检查监控
- [ ] 已配置邮件告警
- [ ] 已选择多个监控位置
- [ ] 已测试告警是否正常
- [ ] 已下载移动应用（可选）
- [ ] 已创建公开状态页面（可选）

---

**配置时间**: 约 10 分钟
**难度**: ⭐⭐ (简单)
**费用**: 免费（50 个监控点，5 分钟检查间隔）
