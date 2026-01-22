#!/bin/bash
# ========================================
# 一键部署脚本 - 阿里云香港服务器
# 适用于：2 vCPU + 2GB 内存
# ========================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  My-Edu-Platform 一键部署脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ===================== 步骤 1: 检查环境 =====================
echo -e "${YELLOW}[1/6] 检查系统环境...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm: $(npm -v)${NC}"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠ PM2 未安装，正在安装...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 已安装${NC}"
else
    echo -e "${GREEN}✓ PM2: $(pm2 -v)${NC}"
fi

echo ""

# ===================== 步骤 2: 安装依赖 =====================
echo -e "${YELLOW}[2/6] 安装项目依赖...${NC}"

if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm ci --only=production
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ 依赖已存在${NC}"
fi

echo ""

# ===================== 步骤 3: 复制环境变量 =====================
echo -e "${YELLOW}[3/6] 配置环境变量...${NC}"

if [ ! -f ".env.production" ]; then
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
        echo -e "${YELLOW}⚠ 已创建 .env.production${NC}"
        echo "请编辑 .env.production 文件，填入正确的配置"
        echo "按任意键继续..."
        read -n 1
    else
        echo -e "${RED}❌ 找不到 .env.production.example${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ 环境变量文件已存在${NC}"
fi

echo ""

# ===================== 步骤 4: 构建项目 =====================
echo -e "${YELLOW}[4/6] 构建项目...${NC}"

# 设置环境变量
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# 构建
echo "正在构建..."
npm run build

echo -e "${GREEN}✓ 构建完成${NC}"

echo ""

# ===================== 步骤 5: 停止旧进程 =====================
echo -e "${YELLOW}[5/6] 停止旧进程...${NC}"

if pm2 list | grep -q "my-edu-platform"; then
    echo "停止旧进程..."
    pm2 stop my-edu-platform
    pm2 delete my-edu-platform
    echo -e "${GREEN}✓ 旧进程已停止${NC}"
else
    echo -e "${GREEN}✓ 没有运行中的进程${NC}"
fi

echo ""

# ===================== 步骤 6: 启动新进程 =====================
echo -e "${YELLOW}[6/6] 启动应用...${NC}"

# 启动 PM2
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup systemd -u root --hp /root

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "=========================================="
echo ""
echo "📊 服务信息："
echo "  状态: $(pm2 list | grep my-edu-platform | awk '{print $10}')"
echo "  内存: $(pm2 list | grep my-edu-platform | awk '{print $12}')"
echo "  CPU:  $(pm2 list | grep my-edu-platform | awk '{print $11}')"
echo ""
echo "🔗 访问地址："
echo "  http://43.99.58.240:3000"
echo ""
echo "📝 常用命令："
echo "  查看日志: pm2 logs my-edu-platform"
echo "  查看状态: pm2 status"
echo "  重启服务: pm2 restart my-edu-platform"
echo "  停止服务: pm2 stop my-edu-platform"
echo ""
echo "=========================================="
