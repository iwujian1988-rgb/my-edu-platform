# 学习状态恢复功能 - 完整测试用例

## 测试环境
- 平台：手机端（竖屏模式 isPortrait=true）
- 功能：单词列表页的翻页/加载更多
- 核心：状态保存与恢复

## 测试用例

### TC-001: 手机端竖屏 - 加载更多第2页 - 返回 - 再进入
**前置条件**:
- 用户已登录
- 有一本词库（至少100个单词）

**测试步骤**:
1. 进入词库详情页（手机竖屏）
2. 等待第1页加载完成（50个单词）
3. 点击"加载更多"按钮
4. 等待第2页加载完成（总共100个单词）
5. 验证：页码显示为2，单词列表有100个
6. 点击页面左上角的"返回"按钮（网站自己的返回，不是浏览器返回）
7. 回到首页
8. 再次点击该词库进入

**预期结果**:
- 显示对话框："继续上次的学习进度？"
- 对话框显示："上次学习到第 2 页"
- 用户点击"继续学习"后，显示第2页的100个单词

**实际结果**: 待测试
**状态**: ❌ FAILED - 用户反馈没有提醒，没有定位到第二页

---

### TC-002: PC端横屏 - 翻页到第2页 - 返回 - 再进入
**前置条件**:
- 用户已登录
- 有一本词库（至少100个单词）

**测试步骤**:
1. 进入词库详情页（PC横屏）
2. 点击"下一页"按钮
3. 等待第2页加载完成（显示51-100的单词）
4. 验证：页码显示为2/xxx
5. 点击页面左上角的"返回"按钮
6. 回到首页
7. 再次点击该词库进入

**预期结果**:
- 显示对话框："继续上次的学习进度？"
- 对话框显示："上次学习到第 2 页"

**实际结果**: 待测试
**状态**: ⏳ PENDING

---

### TC-003: 筛选条件保存 - 未标注 + 第3页
**前置条件**:
- 用户已登录
- 有一本词库（至少150个单词）

**测试步骤**:
1. 进入词库详情页
2. 筛选条件选择："未标注"
3. 翻页到第3页
4. 点击返回
5. 再次进入

**预期结果**:
- 显示对话框
- 对话框显示："上次学习到第 3 页"
- 对话框显示："上次的学习设置：筛选：未标注"
- 点击"继续学习"后，显示第3页的未标注单词

**实际结果**: 待测试
**状态**: ⏳ PENDING

---

### TC-004: URL参数优先级验证
**前置条件**:
- 用户上次学习到第3页

**测试步骤**:
1. 从首页点击"继续学习"（生成URL: /library/xxx?page=3）
2. 进入词库

**预期结果**:
- 不显示对话框（URL参数优先级更高）
- 直接显示第3页

**实际结果**: 待测试
**状态**: ⏳ PENDING

---

### TC-005: 24小时限制验证
**前置条件**:
- 用户25小时前学习到第3页

**测试步骤**:
1. 进入词库

**预期结果**:
- 不显示对话框（超过24小时限制）

**实际结果**: 待测试
**状态**: ⏳ PENDING

---

### TC-006: 第1页不显示对话框
**前置条件**:
- 用户只浏览了第1页

**测试步骤**:
1. 进入词库（第1页）
2. 不做任何翻页操作
3. 返回
4. 再次进入

**预期结果**:
- 不显示对话框（page > 1 条件）

**实际结果**: 待测试
**状态**: ⏳ PENDING

---

### TC-007: 选择"从头开始"
**前置条件**:
- 用户上次学习到第3页

**测试步骤**:
1. 进入词库，显示对话框
2. 点击"从头开始"按钮

**预期结果**:
- 对话框关闭
- 显示第1页
- 不显示保存的筛选条件

**实际结果**: 待测试
**状态**: ⏳ PENDING

---

### TC-008: 对话框重复显示验证
**前置条件**:
- 用户上次学习到第3页

**测试步骤**:
1. 进入词库，显示对话框
2. 点击"从头开始"
3. 返回首页
4. 再次进入词库

**预期结果**:
- 不显示对话框（hasRestoredState防止重复）

**实际结果**: 待测试
**状态**: ⏳ PENDING

---

## Bug分析：TC-001失败原因

### 问题1: 保存状态时机
**检查点**:
- 竖屏加载更多时，是否正确保存了 page=2？
- 保存的 filters 是否正确？
- 保存的 bookId 是否正确？

**需要验证的代码**:
```typescript
// BookDetailPageClient.tsx line 300-324
const saveCurrentState = async () => {
  if (isRestoringRef.current) {
    console.log('⏭️ Skipping save during restoration')
    return
  }

  console.log('💾 Saving word list state:', {
    theme: selectedTheme,
    scenario: selectedScene,
    chapter: selectedChapter,
    status: statusFilter,
    page: currentPage
  })

  await saveResumeState(book.id, 'word-list', {
    filters: {
      theme: selectedTheme,
      scenario: selectedScene,
      chapter: selectedChapter,
      status: statusFilter
    },
    page: currentPage
  })
}
```

### 问题2: 对话框显示条件
**检查点**:
- hasRestoredState 是否为 false？
- searchParams 是否为空？
- savedState.context.page 是否 > 1？
- 时间是否 < 24小时？

**需要验证的代码**:
```typescript
// BookDetailPageClient.tsx line 425-457
useEffect(() => {
  if (hasRestoredState) {
    console.log('ℹ️ Already restored, skipping resume check')
    return
  }

  if (searchParams.has('theme') || searchParams.has('page')) {
    return
  }

  const checkResumeState = async () => {
    const savedState = await getResumeState(book.id, 'word-list')

    if (savedState && savedState.context) {
      const hoursSince = (Date.now() - savedState.updatedAt) / (1000 * 60 * 60)

      if (hoursSince < 24 && savedState.context.page && savedState.context.page > 1) {
        console.log('📍 Found recent resume state:', savedState)
        setResumeState(savedState)
        setShowResumeDialog(true)
      }
    }
  }

  setTimeout(() => {
    checkResumeState()
  }, 500)
}, [book.id, searchParams, hasRestoredState])
```

### 问题3: URL参数恢复干扰
**检查点**:
- URL参数恢复后，是否设置了 hasRestoredState = true？
- 这是否导致对话框不显示？

**需要验证的代码**:
```typescript
// BookDetailPageClient.tsx line 393-422
useEffect(() => {
  const restored = restoreStateFromURL()
  if (restored) {
    setHasRestoredState(true)  // ← 这里设置了！
  }
}, [searchParams])
```

### 问题4: 延迟500ms的问题
**检查点**:
- 延迟500ms是否足够？
- URL参数恢复是否在500ms内完成？
- 是否有竞争条件？

---

## 调试计划

1. **添加详细日志**
   - 保存状态时打印完整信息
   - 恢复状态检查时打印详细条件
   - 对话框显示/不显示的原因

2. **检查数据库**
   - 查询 user_book_preferences 表
   - 确认 last_resume_state 字段内容
   - 确认 updatedAt 时间戳

3. **检查API响应**
   - GET /api/user-preferences?book_id=xxx
   - 确认返回的数据格式

---

## 下一步

1. 在代码中添加详细日志
2. 运行实际测试
3. 收集console输出
4. 定位具体失败原因
5. 修复代码
6. 重新测试

---

**创建时间**: 2026-01-13
**测试人员**: Claude (Sonnet 4.5)
**测试状态**: 准备开始
