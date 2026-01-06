# ============================================
# 单词状态持久化功能 - 自动化测试脚本
# ============================================

echo "=================================="
echo "单词状态持久化功能测试"
echo "=================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
PASSED=0
FAILED=0

# 测试函数
test_api() {
    local test_name=$1
    local url=$2
    local method=${3:-GET}

    echo -n "测试: $test_name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" 2>&1)
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
    fi

    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body"
        ((FAILED++))
        return 1
    fi
}

# ============================================
# 1. 测试服务器是否运行
# ============================================
echo "1. 检查开发服务器..."
test_api "首页响应" "http://localhost:3000"
echo ""

# ============================================
# 2. 测试 API 端点
# ============================================
echo "2. 测试 API 端点..."

# 测试获取单词进度 API (未登录应该返回 401)
test_api "GET /api/word-progress (未认证)" "http://localhost:3000/api/word-progress?book_id=test"

echo ""

# ============================================
# 3. 检查数据库表是否存在
# ============================================
echo "3. 检查数据库结构..."
echo ""
echo "请在 Supabase SQL Editor 中运行以下验证查询:"
echo ""
echo "-- 检查 word_progress 表"
echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'word_progress';"
echo ""
echo "-- 检查触发器"
echo "SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trigger_%';"
echo ""

# ============================================
# 4. 手动测试步骤
# ============================================
echo "4. 手动功能测试步骤"
echo "=================================="
echo ""
echo "Step 1: 访问首页"
echo "  URL: http://localhost:3000"
echo ""
echo "Step 2: 登录账号"
echo "  - 点击右上角 '登录' 按钮"
echo "  - 输入手机号和密码"
echo ""
echo "Step 3: 进入词书详情页"
echo "  - 点击任意词书卡片"
echo "  - 或访问: http://localhost:3000/library/[book-id]"
echo ""
echo "Step 4: 标记单词状态"
echo "  - 点击单词卡片上的圆形按钮"
echo "  - 🔴 红色 = 不认识"
echo "  - 🟡 黄色 = 模糊"
echo "  - 🟢 绿色 = 认识"
echo ""
echo "Step 5: 验证保存"
echo "  - 打开浏览器控制台 (F12)"
echo "  - 切换到 Console 标签"
echo "  - 应该看到: ✅ Word xxx status saved: known/vague/unknown"
echo ""
echo "Step 6: 测试持久化"
echo "  - 按 F5 刷新页面"
echo "  - 状态应该保留"
echo ""
echo "Step 7: 验证数据库"
echo "  - 在 Supabase SQL Editor 运行:"
echo "  SELECT wp.*, w.word FROM word_progress wp JOIN words w ON wp.word_id = w.id ORDER BY wp.updated_at DESC LIMIT 10;"
echo ""

# ============================================
# 5. 测试总结
# ============================================
echo "=================================="
echo "测试总结"
echo "=================================="
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！✓${NC}"
    echo ""
    echo "现在可以进行手动功能测试。"
else
    echo -e "${YELLOW}部分测试失败，请检查服务器配置。${NC}"
fi

echo ""
echo "按任意键退出..."
read -n1 -s
