# 验证清单

## 快速验证步骤

### 1. 检查服务端数据获取 ✅

```bash
# 访问测试页面（需要先登录）
http://localhost:3000/test-server-data

# 预期结果：
# - 显示用户ID
# - Success: ✅
# - Total: 5862
# - 单词列表显示前10个单词
```

### 2. 检查实际词库页面 ✅

```bash
# 访问词库页面（需要先登录）
http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5

# 预期结果：
# - 页面立即显示单词卡片（不需要等待加载）
# - 浏览器console显示：
#   📖 [Server] Passing X initial words to client
#   ✅ [Skip] Using initial data for page 1, skipping API call
```

### 3. 检查E2E测试 ✅

```bash
cd D:\claude_work\yingyu\my-edu-platform
npx playwright test e2e/resume-state.spec.ts --project=chromium --reporter=line

# 预期结果：
# - 所有9个测试通过
# - 日志中不再显示"第1页加载了 0 个单词"
# - 应该显示"第1页加载了 21 个单词"（或其他正数）
```

### 4. 检查浏览器Console日志 📋

打开浏览器开发者工具（F12），访问词库页面，查看Console：

**应该看到**：
```
📖 [Server] Fetching words for book xxx, page 1, status all
✅ [Server] RPC returned 21 words
✅ [Server] Returning 21 words (total: 5862)
📖 [Server Page] Passing 21 initial words to client
✅ [Skip] Using initial data for page 1, skipping API call
```

**不应该看到**：
```
❌ API request failed (401)
❌ Authentication failed
```

### 5. 检查网络请求 🌐

打开浏览器开发者工具（F12） > Network标签：

**第一页**：
- ❌ 不应该有 `/api/words?bookId=xxx&page=1` 请求
- ✅ 因为数据来自服务端，无需客户端API调用

**翻页后**：
- ✅ 应该有 `/api/words?bookId=xxx&page=2` 请求
- ✅ 请求头包含 `Authorization: Bearer xxx`
- ✅ 返回200状态码

## 故障排查

### 如果仍显示0个单词

1. **检查服务端日志**
   - 查看开发服务器console
   - 确认是否有 `📖 [Server] Passing X initial words to client`

2. **检查初始数据**
   - 在浏览器console输入：
   ```javascript
   window.__INITIAL_WORDS__  // 查看是否有初始数据
   ```

3. **检查筛选条件**
   - URL参数中是否有筛选条件？
   - theme/scenario/chapter是否为'all'？

4. **检查React状态**
   - 安装React DevTools
   - 查看组件树中的words状态
   - 确认是否有数据

### 如果看到认证错误

1. **确认用户已登录**
   ```bash
   # 浏览器console
   await supabase.auth.getUser()
   ```

2. **检查cookies**
   - 开发者工具 > Application > Cookies
   - 查找 `sb-access-token` cookie

3. **检查API响应**
   - 开发者工具 > Network
   - 查看 `/api/words` 请求的响应

## 成功标志

✅ **修复成功的标志**：
1. 词库页面立即显示单词卡片
2. Browser console显示 "Passing X initial words to client"
3. Browser console显示 "Using initial data for page 1, skipping API call"
4. E2E测试显示 "第1页加载了 21 个单词"（或类似正数）
5. 首屏加载速度明显提升

---

**最后更新**：2026-01-14
**方案版本**：服务端数据传递 v1.0
