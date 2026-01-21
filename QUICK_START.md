# 🚀 快速开始 - 内存优化 & PM2部署

## 立即解决当前内存问题

### 第一步：停止占用大量内存的进程

```bash
# Windows
taskkill /F /PID 39416

# 或按 Ctrl+C 停止开发服务器
```

### 第二步：验证内存已释放

```bash
# 检查Node.js进程
tasklist | findstr "node.exe"

# 应该看到内存占用大幅降低
```

### 第三步：重新启动开发服务器

```bash
npm run dev
```

---

## 开发环境日常使用

### 1. 启动开发服务器

```bash
# 标准模式（推荐用于日常开发）
npm run dev

# 高内存模式（如果需要处理大量数据）
npm run dev:webpack
```

### 2. 定期检查内存

```bash
# 打开新终端，运行
npm run memory:check
```

**输出示例**：
```
═════════════════════════════════════════════════════
🔍 内存使用情况检查
═════════════════════════════════════════════════════

📊 进程内存使用:
   RSS (驻留集大小):      350 MB
   Heap Total (V8堆):     280 MB
   Heap Used (已使用):    180 MB
   External (C++对象):    25 MB
   Array Buffers:         12 MB

🖥️  系统内存:
   总内存:    16 GB
   可用内存:  8 GB
   使用率:    50%

⚠️  健康检查:
   🟢 OK: 堆内存正常 (180MB)
   🟢 OK: RSS正常 (350MB)

═════════════════════════════════════════════════════
```

### 3. 监控内存（持续运行）

```bash
# 在后台运行内存监控
npm run memory:monitor
```

---

## 生产环境部署（PM2）

### 前置条件：安装PM2

```bash
npm install -g pm2
```

### 部署步骤

#### 1. 构建应用

```bash
npm run build
```

#### 2. 启动PM2

```bash
# 启动应用
npm run pm2:start

# 保存PM2配置
npm run pm2:save
```

#### 3. 验证启动成功

```bash
# 查看状态
pm2 list

# 应该看到类似输出：
# ┌───────┬──────────────────┬──────────┐
# │ id    │ name             │ status   │
# ├───────┼──────────────────┼──────────┤
# │ 0     │ my-edu-platform  │ online  │
# │ 1     │ my-edu-platform  │ online  │
# │ 2     │ my-edu-platform  │ online  │
# │ 3     │ my-edu-platform  │ online  │
# └───────┴──────────────────┴──────────┘
```

#### 4. 设置开机自启动

```bash
# 生成启动脚本
pm2 startup

# 执行输出的命令（类似下面这样）：
# PM2 Startup command saved:
# [ -s /home/user/.pm2/pm2.pid ] && pm2 resurrect
```

#### 5. 测试零停机重启

```bash
# 执行零停机重启
pm2 reload ecosystem.config.js

# 观察到实例逐个重启，服务不中断 ✅
```

---

## PM2 常用命令速查

```bash
# 查看所有进程
pm2 list

# 查看详细信息
pm2 show my-edu-platform

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

---

## 故障排查

### 问题：内存仍然过高

```bash
# 1. 检查当前内存使用
npm run memory:check

# 2. 如果超过1.5GB，重启PM2
npm run pm2:restart

# 3. 查看重启日志
npm run pm2:logs
```

### 问题：PM2无法启动

```bash
# 1. 检查端口占用
netstat -ano | findstr :3000

# 2. 杀死占用端口的进程
taskkill /F /PID <进程ID>

# 3. 清理PM2
pm2 delete all
pm2 flush

# 4. 重新启动
npm run pm2:start
```

### 问题：日志文件过大

```bash
# 清空所有日志
npm run pm2:flush

# 或手动删除日志文件
rm -rf logs/*.log
```

---

## 配置文件说明

### 1. `next.config.ts` - Next.js配置

**作用**：防止开发环境内存泄漏

**关键配置**：
- 文件监听优化
- 限制并发编译
- 忽略不必要的文件

### 2. `ecosystem.config.js` - PM2配置

**作用**：生产环境进程管理

**关键配置**：
- 集群模式（多实例）
- 内存超限自动重启（1.5GB）
- 零停机重启
- 日志轮转

### 3. `scripts/memory-monitor.js` - 内存监控脚本

**作用**：持续监控内存使用

**功能**：
- 每60秒记录一次内存使用
- 超过1GB自动触发重启
- 日志保存到 `logs/memory-monitor.log`

### 4. `scripts/memory-check.js` - 快速检查脚本

**作用**：立即检查当前内存使用

**功能**：
- 显示进程内存详情
- 显示系统内存使用
- 健康检查（正常/警告/严重）

---

## 监控和告警

### 推荐监控方案

#### 1. PM2内置监控

```bash
pm2 monit
```

#### 2. 日志监控

```bash
# 实时查看错误日志
pm2 logs my-edu-platform --err

# 实时查看所有日志
pm2 logs my-edu-platform
```

#### 3. 外部监控服务

- **PM2 Plus** (https://pm2.io) - 官方监控服务
- **Sentry** - 错误追踪
- **New Relic** - 性能监控

### 设置告警阈值

```javascript
// ecosystem.config.js
max_memory_restart: '1.5G',  // 内存告警
min_uptime: '30s',            // 最小运行时间
max_restarts: 10,             // 最大重启次数
```

---

## 维护建议

### 日常维护

```bash
# 每周一次
npm run pm2:flush  # 清空日志
pm2 save          # 保存配置
```

### 月度维护

```bash
# 检查日志文件大小
ls -lh logs/

# 检查内存使用趋势
pm2 show my-edu-platform | grep memory

# 必要时执行零停机重启
pm2 reload ecosystem.config.js
```

### 紧急维护

```bash
# 如果应用无响应
npm run pm2:restart

# 如果内存泄漏严重
pm2 delete all
npm run pm2:start
```

---

## 总结

✅ **已完成**：
- Next.js配置优化（防止内存泄漏）
- PM2配置（零停机部署）
- 内存监控脚本
- 详细文档

✅ **立即执行**：
1. 停止占用大量内存的进程（PID 39416）
2. 重新启动开发服务器
3. 定期检查内存使用

✅ **生产部署**：
1. 安装PM2：`npm install -g pm2`
2. 构建应用：`npm run build`
3. 启动PM2：`npm run pm2:start`
4. 保存配置：`npm run pm2:save`

✅ **安全保障**：
- 集群模式（多实例）
- 零停机重启
- 自动恢复
- 优雅关闭

📚 **更多文档**：
- `DEPLOYMENT.md` - 完整部署指南
- `RESTART_GUIDE.md` - 零停机重启详解
