# 低内存服务器部署指南

## 服务器配置

```
vCPU: 2核
内存: 1GB
系统盘: 30GB
```

**⚠️ 重要提示**：这是**非常有限**的配置，需要特别优化！

---

## 🎯 关键调整

### PM2配置优化

```javascript
{
  instances: 1,              // ⚠️ 只运行1个实例（2核+1GB内存无法支持多实例）
  max_memory_restart: '700M', // ⚠️ 降低到700MB（系统需要300MB）
  NODE_OPTIONS: '--max-old-space-size=512' // ⚠️ 限制堆内存512MB
}
```

### 为什么这样配置？

1. **单实例模式**：
   - 1GB内存无法支持多实例
   - 每个实例至少需要400-500MB
   - 系统需要200-300MB

2. **内存阈值700MB**：
   - 超过700MB自动重启
   - 避免OOM（内存溢出）
   - 留出300MB给系统和缓冲

3. **堆内存512MB**：
   - Node.js堆内存限制
   - 防止V8引擎占用过多内存

---

## 📊 内存分配规划

```
总内存: 1GB (1024MB)
├─ 系统预留: 300MB (29%)
│  ├─ 操作系统: 200MB
│  └─ 缓冲/缓存: 100MB
│
└─ 应用可用: 700MB (68%)
   ├─ Node.js进程: 500MB
   │  ├─ 堆内存: 512MB（限制）
   │  └─ 外部内存: 50MB
   └─ 其他进程: 200MB
      ├─ PM2: 20MB
      ├─ 日志: 10MB
      └─ 缓冲: 170MB
```

---

## 🚀 部署步骤

### 1. 系统优化（重要！）

#### 增加Swap空间

```bash
# 创建2GB交换空间
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 验证
free -h
# 应该看到：Swap: 2.0G
```

#### 调整Swap使用策略

```bash
# 设置swappiness=60（默认通常是30）
sysctl vm.swappiness=60

# 永久生效
echo 'vm.swappiness=60' >> /etc/sysctl.conf
```

### 2. 应用优化

#### 构建应用

```bash
# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=512"

# 构建
npm run build
```

#### 启动PM2

```bash
# 启动应用
npm run pm2:start

# 保存配置
npm run pm2:save

# 设置开机自启动
pm2 startup
```

### 3. 验证部署

```bash
# 检查内存使用
free -h

# 检查PM2状态
pm2 list

# 检查进程内存
pm2 show my-edu-platform | grep memory
```

**预期输出**：
```
memory usage: 450 MB
```

---

## ⚠️ 限制和注意事项

### 功能限制

1. **无高可用性**：
   - 单实例，重启时短暂中断
   - 无法实现零停机

2. **性能限制**：
   - 只能处理有限并发请求
   - 响应时间可能较慢

3. **内存风险**：
   - 容易触发OOM
   - 需要密切监控

### 使用建议

#### ✅ 适合场景

- 小型团队（< 50人）
- 低并发（< 10同时在线）
- 学习/测试环境
- MVP产品验证

#### ❌ 不适合场景

- 高并发（> 50同时在线）
- 生产环境（> 100用户）
- 大量数据处理
- 需要高可用性

---

## 📈 性能优化建议

### 1. 应用层面

```javascript
// 限制并发连接数
const MAX_CONCURRENT_REQUESTS = 10;

// 使用缓存减少数据库查询
const CACHE_TTL = 300; // 5分钟

// 定期清理内存
setInterval(() => {
  if (global.gc) global.gc();
}, 60000); // 每分钟
```

### 2. 数据库层面

```sql
-- 使用连接池
-- 最大连接数：5
-- 最小连接数：2

-- 启用查询缓存
-- 缓存大小：50MB
```

### 3. 系统层面

```bash
# 减少系统日志
systemd-stop syslog
systemd-stop rsyslog

# 禁用不必要的服务
systemctl stop cron
systemctl stop atd

# 清理包缓存
apt-get clean
```

---

## 🔧 监控和维护

### 实时监控

```bash
# 监控内存（每分钟）
watch -n 60 'free -h'

# 监控PM2
pm2 monit

# 监控进程
top -p $(pgrep -f "npm start")
```

### 自动监控脚本

```bash
# 后台运行监控
npm run memory:monitor &

# 或使用PM2监控
pm2 start scripts/memory-monitor.js --name monitor
```

### 日志管理

```bash
# 每天清理日志
0 0 * * * npm run pm2:flush

# 或手动清理
npm run cleanup
```

---

## 🚨 应急处理

### 内存溢出（OOM）

**症状**：
- 应用崩溃
- PM2频繁重启
- 系统卡顿

**解决方案**：

```bash
# 1. 立即清理缓存
sync && echo 3 > /proc/sys/vm/drop_caches

# 2. 重启应用
npm run pm2:restart

# 3. 检查内存
free -h

# 4. 如果仍然不足，重启服务器
reboot
```

### 应用无响应

```bash
# 1. 检查进程状态
pm2 list

# 2. 如果进程卡死，强制重启
pm2 delete all
npm run pm2:start

# 3. 检查端口
netstat -tulpn | grep :3000
```

### 磁盘空间不足

```bash
# 1. 检查磁盘使用
df -h

# 2. 清理日志
npm run cleanup

# 3. 清理包缓存
npm cache clean --force

# 4. 清理系统日志
journalctl --vacuum-time=7d
```

---

## 📊 性能基准

### 预期性能指标

| 指标 | 目标值 |
|------|--------|
| 内存使用 | < 700MB |
| CPU使用 | < 70% |
| 响应时间 | < 3秒 |
| 并发用户 | 5-10人 |
| 请求成功率 | > 95% |

### 实际测试

```bash
# 负载测试（10个并发用户，持续5分钟）
ab -n 3000 -c 10 -t 300 http://localhost:3000/

# 预期结果：
# - Requests per second: 1-3
# - Time per request: 3000-5000ms
# - Failed requests: < 5%
```

---

## 💡 升级建议

### 何时需要升级？

出现以下情况时，建议升级服务器：

- [ ] 内存使用长期 > 80%
- [ ] 频繁出现OOM
- [ ] 响应时间 > 5秒
- [ ] 并发用户 > 10人
- [ ] PM2频繁重启（> 10次/天）

### 推荐配置

#### 小型团队（50-100人）

```
vCPU: 4核
内存: 4GB
系统盘: 40GB
```

#### 中型团队（100-500人）

```
vCPU: 8核
内存: 8GB
系统盘: 60GB
+ 负载均衡器
```

#### 大型团队（500+人）

```
vCPU: 16核
内存: 16GB
系统盘: 100GB
+ 多台服务器
+ 数据库服务器
+ Redis缓存
```

---

## 🎯 总结

### ✅ 当前配置可用

- 1GB内存 + 2核CPU
- 单实例模式
- 700MB内存阈值
- 512MB堆内存限制

### ⚠️ 需要密切监控

- 内存使用率
- PM2重启频率
- 响应时间
- 错误率

### 📈 建议升级路径

1. **短期**（1-3个月）：当前配置 + 优化
2. **中期**（3-6个月）：升级到 4核4GB
3. **长期**（6个月+）：多台服务器集群

---

## 🆘 紧急联系

如果遇到严重问题：

1. **内存耗尽**：立即重启服务器
2. **应用崩溃**：检查日志 `pm2 logs`
3. **性能问题**：运行 `npm run memory:check`
4. **无法解决**：考虑升级服务器配置

---

**记住**：1GB内存是**最低配置**，建议尽快升级！
