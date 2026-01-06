#!/bin/bash

# 自动化测试环境准备脚本
# 用于快速准备测试环境和运行测试

set -e

echo "🚀 开始准备自动化测试环境..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查 Node.js
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"
echo ""

# 2. 检查 npm
echo "📦 检查 npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm 版本: $(npm --version)${NC}"
echo ""

# 3. 安装依赖
echo "📥 安装项目依赖..."
npm install
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 4. 安装 Playwright 浏览器
echo "🌐 安装 Playwright 浏览器..."
npx playwright install --with-deps
echo -e "${GREEN}✅ Playwright 浏览器安装完成${NC}"
echo ""

# 5. 创建必要的目录
echo "📁 创建测试目录..."
mkdir -p test-results
mkdir -p playwright-report
mkdir -p screenshots
mkdir -p videos
echo -e "${GREEN}✅ 目录创建完成${NC}"
echo ""

# 6. 提示用户准备测试数据
echo -e "${YELLOW}⚠️  下一步：准备测试数据${NC}"
echo ""
echo "请按照以下步骤操作："
echo ""
echo "1️⃣  在 Supabase SQL Editor 中运行："
echo "   supabase/migrations/999_test_data.sql"
echo ""
echo "2️⃣  手动注册测试账号："
echo "   访问 http://localhost:3000/login"
echo "   手机号: 13800138000"
echo "   密码: test123456"
echo "   邀请码: TEST1234"
echo ""
echo -e "${YELLOW}3️⃣  然后运行测试：${NC}"
echo "   npm test              # 运行所有测试"
echo "   npm run test:ui       # 交互式 UI 模式"
echo "   npm run test:headed   # 有头模式（可见浏览器）"
echo ""

# 7. 询问是否立即运行测试
read -p "是否现在运行测试？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🧪 运行测试..."
    npm test
else
    echo ""
    echo "✅ 测试环境准备完成！"
    echo "稍后可以运行 'npm test' 开始测试"
fi
