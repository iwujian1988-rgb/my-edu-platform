# 🧪 首页多进度卡片功能 - 完整测试指南

## 📅 测试时间
预计总测试时间：30-45分钟

---

## 第一部分：数据库 Migration（必做）

### 步骤1：应用数据库 Migration

#### 方式 A：通过 Supabase Dashboard（推荐）

1. 访问：https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧菜单 **SQL Editor**
4. 点击 **New Query**
5. 复制以下文件的全部内容：
   - `supabase/migrations/20260114_add_get_progress_cards_rpc.sql`
6. 粘贴到 SQL Editor
7. 点击 **Run** 执行
8. 检查输出，确认没有错误

**预期输出**：
- Success: Function `get_user_progress_cards` created
- Success: Index `idx_user_book_prefs_user_updated` created
- Success: Index `idx_user_book_prefs_book_id` created

#### 方式 B：通过 Web 界面

1. 启动开发服务器：`npm run dev`
2. 访问：http://localhost:3000/apply-migration.html
3. 点击 **"✅ 应用 Migration"** 按钮
4. 系统会返回 SQL 和执行步骤
5. 按照返回的步骤在 Supabase Dashboard 中手动执行

---

### 步骤2：测试 RPC 函数

1. 访问：http://localhost:3000/apply-migration.html
2. 点击 **"🧪 测试 RPC 函数"** 按钮
3. 查看测试结果

**预期结果**：
- ✅ Success: 返回 0-3 条进度卡片
- ✅ Performance: < 200ms
- ✅ Data: 包含 book_id, book_title, mode, scope_type, progress 等

**如果失败**：
- ❌ 错误代码 42883：函数不存在，需要先执行步骤1
- ❌ 其他错误：检查 SQL 语法

---

## 第二部分：功能测试

### 测试场景 1：用户有学习记录

#### 准备工作：
1. 登录系统
2. 确保至少有1本书有学习进度

#### 测试步骤：
1. 访问首页：`http://localhost:3000`
2. 观察"继续学习"区域

**预期结果**：
- ✅ 显示 1-3 个进度卡片
- ✅ 每个卡片显示：
  - 书名
  - 模式图标（📚单词表/🎴卡片/📝默写）
  - 范围标签（全部/不认识/模糊/认识/未标注）
  - 进度百分比（如 45%）
  - 位置信息（如 10/200）
  - 时间标签（如"5分钟前"）
- ✅ 卡片可以点击
- ✅ Hover 时有动画效果（上移1px）

**如果失败**：
- ❌ 没有显示卡片：检查数据库是否有 `last_resume_state` 数据
- ❌ 显示"未知时间"：检查 `last_study_time` 字段格式
- ❌ 进度为 0%：检查 `total_words` 是否为 0

---

### 测试场景 2：智能跳转 - 从首页进入

#### 测试步骤：
1. 在首页点击任意进度卡片
2. 观察跳转行为

**预期结果**：
- ✅ URL 包含 `resume=true` 参数
  - 例如：`/study/book-123/flashcards?scope=unknown&shuffle=true&resume=true#word-10`
- ✅ **直接进入学习页面**，不显示范围选择对话框
- ✅ 如果 URL 有 hash（如 `#word-10`），自动跳转到第11个单词
- ✅ 进度条显示正确位置
- ✅ 可以继续学习

**验证方法**：
- 打开浏览器控制台（F12）
- 查看 Network 标签
- 检查请求的 URL 参数

**如果失败**：
- ❌ 显示了对话框：检查 `isFromHomepageResume` 逻辑
- ❌ 没有 hash 定位：检查 `validateHashIndex` 函数
- ❌ URL 没有 resume 参数：检查 `generateContinueURL` 函数

---

### 测试场景 3：从书架/词书详情进入

#### 测试步骤：
1. 在首页点击"词库资源"或"书库"
2. 点击任意一本书
3. 在词书详情页点击"开始学习"（卡片/听写）

**预期结果**：
- ✅ URL 不包含 `resume=true` 参数
- ✅ **显示范围选择对话框**
- ✅ 对话框顶部有"继续上次学习"选项（如果有学习记录）
- ✅ 点击任意范围后进入学习

**如果失败**：
- ❌ 没有显示对话框：检查 `showScopeSelectDialog` 初始状态
- ❌ 直接进入学习：检查 `isFromHomepageResume` 判断逻辑

---

### 测试场景 4：Hash 定位

#### 测试步骤：
1. 构造带 hash 的 URL：
   ```
   /study/book-123/flashcards?scope=unknown&shuffle=true&resume=true#word-15
   ```
2. 在浏览器地址栏粘贴并访问
3. 观察页面行为

**预期结果**：
- ✅ 页面加载后显示第16个单词（index=15）
- ✅ 浏览器自动滚动到该位置（如果页面很长）
- ✅ 控制台有日志：`[Flashcards] Hash positioning: scrolling to word 16`

**验证方法**：
- 检查页面显示的单词位置
- 检查控制台日志

**如果失败**：
- ❌ 没有定位：检查 hash 提取逻辑
- ❌ 定位错误：检查 `validateHashIndex` 函数

---

## 第三部分：安全测试

### 测试场景 5：权限检查未被绕过

#### 测试步骤：
1. 登录用户（无 FLASHCARDS 权限）
2. 尝试访问：`/study/book-123/flashcards?resume=true`

**预期结果**：
- ✅ 显示权限不足提示
- ✅ **不会**直接进入学习页面
- ✅ PermissionGate 正常工作

**验证方法**：
- 检查是否看到权限提示
- 检查控制台无权限错误

**如果失败**：
- ❌ 绕过了权限检查：需要修复代码逻辑

---

### 测试场景 6：URL 参数验证

#### 测试步骤：
1. 尝试访问恶意 URL：
   ```
   /study/book-123/flashcards?scope=<script>alert(1)</script>&resume=true
   ```
2. 观察页面行为

**预期结果**：
- ✅ 不会弹出 alert
- ✅ scope 被重置为默认值 'unknown'
- ✅ 页面正常显示

**验证方法**：
- 检查控制台没有 XSS 错误
- 检查页面使用默认范围

**如果失败**：
- ❌ XSS 漏洞：检查 `validateScope` 函数

---

## 第四部分：性能测试

### 测试场景 7：进度查询性能

#### 测试步骤：
1. 访问：http://localhost:3000/apply-migration.html
2. 点击 **"🧪 测试 RPC 函数"** 按钮
3. 记录返回的性能数据

**预期结果**：
- ✅ Performance < 200ms（目标）
- ✅ 如果有 3 本书的记录，应该在 200ms 内完成

**验证方法**：
- 查看测试结果的 performance 字段
- 多次测试取平均值

**如果失败**：
- ❌ Performance > 500ms：检查数据库索引是否创建
- ❌ Performance > 1000ms：需要优化 SQL 查询

---

### 测试场景 8：首页加载性能

#### 测试步骤：
1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 访问首页：`http://localhost:3000`
4. 查看 API 请求时间

**预期结果**：
- ✅ `/api/user-preferences` 请求 < 100ms
- ✅ `get_user_progress_cards` RPC 调用 < 200ms
- ✅ 首页总加载时间 < 2s

**验证方法**：
- 查看 Network 标签的 Timeline
- 查看 Waterfall 图表

**如果失败**：
- ❌ 加载时间过长：检查是否有多余的 API 调用

---

## 测试检查清单

### 数据库 Migration
- [ ] RPC 函数 `get_user_progress_cards` 创建成功
- [ ] 索引 `idx_user_book_prefs_user_updated` 创建成功
- [ ] 索引 `idx_user_book_prefs_book_id` 创建成功
- [ ] RPC 测试返回正确数据
- [ ] RPC 性能 < 200ms

### 功能测试
- [ ] 首页显示 1-3 个进度卡片
- [ ] 卡片显示正确的书名、模式、范围、进度
- [ ] 点击卡片直接进入学习（不弹窗）
- [ ] URL 包含 `resume=true` 参数
- [ ] Hash 定位正常工作（`#word-N`）
- [ ] 从书架进入显示对话框
- [ ] 时间标签显示正确（"刚刚"/"5分钟前"等）

### 安全测试
- [ ] PermissionGate 未被绕过
- [ ] URL 参数验证正常
- [ ] 无 XSS 漏洞

### 性能测试
- [ ] RPC 调用 < 200ms
- [ ] 首页加载 < 2s
- [ ] 无多余 API 调用

---

## 故障排查指南

### 问题 1：首页没有显示进度卡片

**可能原因**：
1. 数据库没有 `last_resume_state` 数据
2. RPC 函数未创建
3. API 调用失败

**排查步骤**：
1. 打开浏览器控制台（F12）
2. 查看 Console 标签的错误信息
3. 查看 Network 标签的请求响应
4. 检查数据库是否有数据：

```sql
SELECT
  user_id,
  book_id,
  last_resume_state
FROM user_book_preferences
WHERE last_resume_state IS NOT NULL
  AND last_resume_state != '{}'::JSONB;
```

### 问题 2：点击卡片没有跳转

**可能原因**：
1. `generateContinueURL` 函数返回错误
2. Link 组件未正确设置 href

**排查步骤**：
1. 检查控制台是否有错误
2. 鼠标悬停在卡片上，查看浏览器左下角显示的 URL
3. 检查 Network 标签的请求

### 问题 3：Hash 定位不工作

**可能原因**：
1. `validateHashIndex` 函数返回 undefined
2. useEffect 依赖项错误

**排查步骤**：
1. 在控制台输入：`window.location.hash`
2. 检查 hash 格式是否正确（`#word-10`）
3. 查看控制台日志：`[Flashcards] Hash positioning`

### 问题 4：显示对话框而不是直接进入

**可能原因**：
1. `isFromHomepageResume` 判断错误
2. URL 没有 `resume=true` 参数

**排查步骤**：
1. 检查浏览器地址栏的 URL
2. 确认包含 `resume=true`
3. 在控制台输入：`new URLSearchParams(window.location.search).get('resume')`

---

## 测试报告模板

完成测试后，请填写以下报告：

```
## 测试执行报告

**测试人员**：
**测试日期**：
**测试环境**：

### 数据库 Migration
- [ ] 通过 / 失败
- 备注：

### 功能测试
- 场景1（显示进度卡片）：通过 / 失败
- 场景2（智能跳转）：通过 / 失败
- 场景3（从书架进入）：通过 / 失败
- 场景4（Hash定位）：通过 / 失败
- 备注：

### 安全测试
- 场景5（权限检查）：通过 / 失败
- 场景6（参数验证）：通过 / 失败
- 备注：

### 性能测试
- RPC性能：____ ms （目标 <200ms）
- 首页加载：____ ms （目标 <2000ms）
- 备注：

### 发现的问题
1. ...
2. ...

### 建议改进
1. ...
2. ...
```

---

**测试完成后，请将测试报告反馈给开发团队。**
