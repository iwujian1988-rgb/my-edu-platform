# 部署指南

## 开发环境

### 启动开发服务器

```bash
npm run dev
```

### 检查内存使用

```bash
npm run memory:check
```

### 监控内存（持续运行）

```bash
npm run memory:monitor
```

---

## 生产环境

### 1. 全局安装 PM2

```bash
npm install -g pm2
```

### 2. 构建应用

```bash
npm run build
```

### 3. 启动 PM2

```bash
# 启动应用
npm run pm2:start

# 保存 PM2 配置
npm run pm2:save

# 设置开机自启动
pm2 startup
```

### 4. PM2 常用命令

```bash
# 查看状态
pm2 list

# 查看日志
npm run pm2:logs

# 实时监控
npm run pm2:monit

# 重启应用
npm run pm2:restart

# 停止应用
npm run pm2:stop

# 清空日志
npm run pm2:flush
```

### 5. PM2 高级管理

```bash
# 查看详细信息
pm2 show my-edu-platform

# 重载配置（不中断服务）
pm2 reload ecosystem.config.js

# 查看日志文件位置
pm2 show my-edu-platform | grep "log file"

# 查看内存使用
pm2 show my-edu-platform | grep "memory"
```

---

## 内存监控

### 快速检查

```bash
npm run memory:check
```

### 持续监控（作为单独进程运行）

```bash
# 在后台运行监控脚本
pm2 start scripts/memory-monitor.js --name memory-monitor

# 查看监控日志
pm2 logs memory-monitor

# 停止监控
pm2 stop memory-monitor
```

### 内存阈值说明

- 🟢 **正常**: 堆内存 < 512MB
- 🟡 **警告**: 堆内存 512MB - 1GB
- 🔴 **严重**: 堆内存 > 1GB（自动触发重启）

---

## 故障排查

### 问题：内存占用过高

1. **快速检查**:
   ```bash
   npm run memory:check
   ```

2. **重启 PM2**:
   ```bash
   npm run pm2:restart
   ```

3. **查看详细日志**:
   ```bash
   npm run pm2:logs
   ```

4. **清空日志释放空间**:
   ```bash
   npm run pm2:flush
   ```

### 问题：端口被占用

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### 问题：PM2 无法启动

```bash
# 1. 检查 Node.js 版本
node -v

# 2. 清理 PM2 缓存
pm2 flush
pm2 delete all

# 3. 重新启动
npm run pm2:start
```

---

## 性能优化建议

### 1. 开发环境

- 定期重启开发服务器（每天至少一次）
- 使用 `npm run dev:webpack` 模式，更稳定
- 避免同时打开过多浏览器标签页

### 2. 生产环境

- 使用 PM2 集群模式（已配置）
- 设置合理的内存限制（已设置为1GB）
- 启用日志轮转，避免日志文件过大
- 定期监控内存使用情况

### 3. 数据库连接

- Supabase 连接会自动管理
- 使用连接池避免连接泄漏
- 定期检查连接数

---

## 备份与恢复

### 备份 PM2 配置

```bash
pm2 save
```

### 恢复 PM2 配置

```bash
pm2 resurrect
```

### 导出配置文件

```bash
# 导出当前运行的进程
pm2 ecosystem > ecosystem.config.js
```

---

## 更新部署

### 1. 更新代码

```bash
git pull
```

### 2. 重新构建

```bash
npm run build
```

### 3. 重启 PM2（零停机）

```bash
pm2 reload ecosystem.config.js
```

---

## 监控告警

建议配置以下监控：

1. **内存使用率**: 超过80%发送告警
2. **CPU使用率**: 持续超过70%发送告警
3. **响应时间**: 超过3秒发送告警
4. **错误率**: 超过1%发送告警

可以使用以下监控工具：
- PM2 Plus (https://pm2.io)
- Sentry (错误追踪)
- New Relic (性能监控)
- Prometheus + Grafana (自建监控)
