# 低内存服务器 - 紧急优化清单

## 服务器配置
```
vCPU: 2核
内存: 1GB ⚠️
系统盘: 30GB
```

## 🚨 立即执行（部署前必须）

### 1. 增加Swap空间（2GB）

```bash
# 创建Swap文件
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 验证
free -h
```

### 2. 运行优化脚本

```bash
chmod +x scripts/optimize-server.sh
sudo ./scripts/optimize-server.sh
```

### 3. 构建应用（限制内存）

```bash
export NODE_OPTIONS="--max-old-space-size=512"
npm run build
```

### 4. 启动PM2（单实例模式）

```bash
npm run pm2:start
npm run pm2:save
```

---

## ⚠️ 关键限制

### 功能限制

- ❌ **无高可用性**：单实例，重启时短暂中断
- ❌ **低并发**：只能支持 5-10 同时在线用户
- ❌ **内存风险**：容易触发OOM，需要密切监控

### 性能预期

| 指标 | 预期值 | 警告值 |
|------|--------|--------|
| 内存使用 | < 700MB | > 700MB |
| CPU使用 | < 70% | > 90% |
| 响应时间 | < 3秒 | > 5秒 |
| 并发用户 | 5-10人 | > 10人 |

---

## 📊 实时监控命令

```bash
# 终端1：监控内存
watch -n 10 'free -h'

# 终端2：监控PM2
pm2 monit

# 终端3：监控日志
pm2 logs my-edu-platform
```

---

## 🚨 应急处理

### 内存耗尽

```bash
# 清理缓存
sync && echo 3 > /proc/sys/vm/drop_caches

# 重启应用
npm run pm2:restart
```

### 应用卡死

```bash
# 强制重启
pm2 delete all
npm run pm2:start
```

### 无法解决

```bash
# 最后手段：重启服务器
reboot
```

---

## 💡 升级建议

### 升级时机

- 内存使用长期 > 80%
- 并发用户 > 10人
- 响应时间 > 5秒
- PM2频繁重启

### 推荐配置

```
当前：2核 + 1GB
  ↓ 升级
推荐：4核 + 4GB
  ↓ 升级
理想：8核 + 8GB + 数据库服务器
```

---

## ✅ 部署检查清单

- [ ] 增加Swap空间（2GB）
- [ ] 运行优化脚本
- [ ] 限制堆内存（512MB）
- [ ] 单实例模式部署
- [ ] 设置监控脚本
- [ ] 测试并发性能
- [ ] 准备升级方案

---

**记住**：1GB内存是**极限配置**，建议尽快升级到至少4GB！
