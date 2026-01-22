# 阿里云香港服务器部署指南

> 2 vCPU + 2GB 内存 | Ubuntu + 宝塔面板

---

## 📋 部署清单

### 前置条件

- ✅ 服务器已购买：43.99.58.240
- ✅ Root 密码已设置
- ✅ 代码已推送到 GitHub
- ✅ 监控系统已配置（Sentry）

---

## 🚀 部署步骤（共 6 步）

### 步骤 1: 下载 SSH 工具

**Windows 用户推荐**：

#### 选项 A: PowerShell（自带）
```
Windows 已自带，不需要下载
```

#### 选项 B: PuTTY（推荐新手）
```
下载地址：https://www.putty.org/
下载：putty-64bit-<version>-installer.exe
安装后打开 PuTTY
```

---

### 步骤 2: 连接服务器

#### 使用 PowerShell 连接（推荐）

1. **打开 PowerShell**
   - 按 `Win + X`
   - 选择 "Windows PowerShell"

2. **连接命令**
   ```bash
   ssh root@43.99.58.240
   ```

3. **输入密码**
   ```
   password: [您设置的密码]
   ```
   注意：输入密码时屏幕不会显示，这是正常的

4. **连接成功**
   ```
   Welcome to Ubuntu 22.04 LTS...
   root@43.99.58.240:~#
   ```

---

### 步骤 3: 安装必要软件

**复制粘贴以下命令**：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装 PM2（进程管理）
npm install -g pm2

# 安装 Git
apt install -y git

# 验证安装
node -v
npm -v
pm2 -v
git --version
```

**预期输出**：
```
v18.x.x
9.x.x
5.x.x
git version 2.x.x
```

---

### 步骤 4: 克隆项目代码

```bash
# 进入 root 目录
cd /root

# 克隆代码
git clone https://github.com/iwujian1988-rgb/my-edu-platform.git

# 进入项目目录
cd my-edu-platform

# 查看文件
ls -la
```

**应该看到**：
```
drwxr-xr-x  src/
-rw-r--r--  package.json
-rw-r--r--  next.config.ts
... 等等
```

---

### 步骤 5: 配置环境变量

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑环境变量
nano .env.production
```

**需要修改的地方**：
```bash
# 修改这一行（如果有域名）
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 如果暂时没有域名，改成 IP
NEXT_PUBLIC_APP_URL=http://43.99.58.240:3000
```

**保存并退出**：
- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

---

### 步骤 6: 一键部署

**执行部署脚本**：

```bash
# 给脚本执行权限
chmod +x scripts/deploy.sh

# 运行部署脚本
./scripts/deploy.sh
```

**部署过程**（约 3-5 分钟）：
```
[1/6] 检查系统环境...
✓ Node.js: v18.x.x
✓ npm: 9.x.x
✓ PM2: 5.x.x

[2/6] 安装项目依赖...
✓ 依赖安装完成

[3/6] 配置环境变量...
✓ 环境变量文件已存在

[4/6] 构建项目...
✓ 构建完成

[5/6] 停止旧进程...
✓ 没有运行中的进程

[6/6] 启动应用...
✅ 部署完成！
```

---

## ✅ 验证部署

### 1. 检查服务状态

```bash
pm2 status
```

**应该看到**：
```
┌────┬───────────────────┬─────┬─────────┬───────┬────────┬──────────┐
│ id │ name              │ mode│ status │ ↺    │ cpu    │ memory   │
├────┼───────────────────┼─────┼─────────┼───────┼────────┼──────────┤
│ 0  │ my-edu-platform  │ fork │ online │ 0     │ 0%     │ 800MB    │
└────┴───────────────────┴─────┴─────────┴───────┴────────┴──────────┘
```

### 2. 访问网站

打开浏览器访问：
```
http://43.99.58.240:3000
```

**应该看到**：
- ✅ 网站首页正常显示
- ✅ 可以登录
- ✅ 可以练习

### 3. 测试功能

**基本功能测试**：
- [ ] 首页能访问
- [ ] 登录功能正常
- [ ] 练习功能正常
- [ ] 数据保存正常

### 4. 查看日志

```bash
# 实时日志
pm2 logs my-edu-platform

# 查看最近 100 行
pm2 logs my-edu-platform --lines 100
```

---

## 🎉 部署完成！

### 您的网站现在运行在

```
http://43.99.58.240:3000
```

### 常用管理命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs my-edu-platform

# 重启服务
pm2 restart my-edu-platform

# 停止服务
pm2 stop my-edu-platform

# 查看内存使用
pm2 monit
```

---

## 📊 配置内存监控（可选）

### 启动内存监控

```bash
# 给脚本执行权限
chmod +x scripts/memory-monitor.sh

# 后台运行监控
nohup ./scripts/memory-monitor.sh > /dev/null 2>&1 &

# 查看监控日志
tail -f ~/memory-monitor/logs/memory-$(date +%Y%m%d).log
```

### 查看监控数据

```bash
# 查看今天的内存使用记录
cat ~/memory-monitor/logs/memory-$(date +%Y%m%d).log

# 查看告警记录
ls -lh ~/memory-monitor/alerts/

# 查看日报
cat ~/memory-monitor/reports/daily-$(date +%Y%m%d).txt
```

---

## 🔧 配置宝塔面板（可选）

### 查看宝塔信息

```bash
# SSH 登录后执行
bt default

# 会显示：
# ==================================================================
# 宝塔Linux面板
# ==================================================================
# 外网面板地址: http://43.99.58.240:8888/xxxxxxxx
# 内网面板地址: http://172.17.49.201:8888/xxxxxxxx
# username: xxxxxxxx
# password: xxxxxxxx
# ==================================================================
# ```

### 访问宝塔面板

1. 浏览器访问：`http://43.99.58.240:8888/xxxxxxxx`
2. 输入用户名和密码
3. 登录成功

### 宝塔面板能做什么

- ✅ 可视化管理文件
- ✅ 查看系统资源占用
- ✅ 管理数据库
- ✅ 配置防火墙
- ✅ 查看系统日志

### 关闭宝塔（节省内存）

```bash
# 停止宝塔
bt stop

# 启动宝塔
bt start

# 重启宝塔
bt restart
```

---

## 🔄 更新网站

### 代码更新后重新部署

**本地操作**：
```bash
git add .
git commit -m "feat: 新功能"
git push origin master
```

**服务器操作**：
```bash
cd /root/my-edu-platform

# 拉取最新代码
git pull origin master

# 重新部署
./scripts/deploy.sh
```

---

## 🌐 配置域名（可选）

### 如果有域名

#### 步骤 1: 在域名提供商添加 DNS 记录

```
类型: A
主机记录: @
记录值: 43.99.58.240
```

#### 步骤 2: 更新环境变量

```bash
nano .env.production

# 修改为您的域名
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 保存并重启
pm2 restart my-edu-platform
```

#### 步骤 3: 配置防火墙

```bash
# 在宝塔面板或阿里云控制台
# 开放端口 80 和 443
```

---

## 🔒 安全建议

### 1. 修改 SSH 端口（可选）

```bash
# 编辑 SSH 配置
nano /etc/ssh/sshd_config

# 修改端口
# Port 22 -> Port 22222

# 重启 SSH
systemctl restart sshd
```

### 2. 配置防火墙

```bash
# 安装 UFW
apt install ufw -y

# 允许 SSH
ufw allow 22

# 允许 HTTP
ufw allow 80

# 允许 HTTPS
ufw allow 443

# 启用防火墙
ufw enable
```

### 3. 定期备份

```bash
# 备份数据库（如果有）
# 备份代码
# 备份配置文件
```

---

## 📞 常见问题

### Q1: 无法连接 SSH

**解决方法**：
1. 检查服务器 IP 是否正确
2. 检查密码是否正确
3. 确认服务器状态是"运行中"

### Q2: 网站无法访问

**解决方法**：
```bash
# 检查 PM2 状态
pm2 status

# 如果是停止状态，重启
pm2 restart my-edu-platform

# 查看日志
pm2 logs my-edu-platform
```

### Q3: 内存占用过高

**解决方法**：
```bash
# 查看内存使用
free -h

# 重启服务
pm2 restart my-edu-platform

# 或重启服务器
reboot
```

### Q4: 如何查看错误

**解决方法**：
```bash
# 查看 PM2 日志
pm2 logs my-edu-platform --err

# 或访问 Sentry
https://sentry.io/organizations/maxnode/
```

---

## 📚 相关文档

- [Sentry 监控](./MONITORING_QUICK_REFERENCE.md)
- [故障排查](./MONITORING_TROUBLESHOOTING.md)
- [宝塔面板使用](./UPTIMEROBOT_SETUP.md)

---

**部署时间**：约 30-40 分钟
**难度**：⭐⭐⭐ (中等)

祝您部署顺利！🎉
