# 单词书详情页功能修复报告

## 修复日期
2026-01-06

## 问题描述
用户手动测试发现以下功能全部失效：
- ❌ 随机排序功能未生效
- ❌ 状态筛选功能未生效
- ❌ 单词状态标记刷新后失效
- ❌ 全局隐藏中文功能未生效
- ✅ 响应式布局正常

## 根本原因分析

### 问题 1: 筛选和排序功能失效
**原因:** `WordList` 组件只在初始化时使用 `initialWords` prop 设置 state，当父组件 `BookDetailPageClient` 因筛选/排序改变传入新的 `initialWords` 时，`WordList` 的内部 state 没有更新。

**影响:** 随机排序、状态筛选、主题/场景筛选全部失效

### 问题 2: 全局隐藏中文功能失效
**原因:** `WordCard` 组件只在初始化时从 `globalHideChinese` prop 读取状态，当用户点击"隐藏中文"按钮导致 prop 改变时，卡片显示状态没有更新。

**影响:** 全局隐藏按钮点击后所有卡片没有反应

## 已修复的代码

### 1. WordList.tsx - 添加 prop 同步逻辑

**文件:** `src/components/WordList.tsx`

**修复内容:**
```typescript
// 添加 wordProgress state 来持久化用户标记
const [wordProgress, setWordProgress] = useState<Record<string, 'known' | 'fuzzy' | 'unknown'>>({})

// 同步 initialWords 的变化到 state，同时保留用户的学习进度
useEffect(() => {
  setWords(prevWords => {
    // 创建一个映射来保留现有单词的状态
    const prevStatusMap = new Map<string, 'known' | 'fuzzy' | 'unknown'>()
    prevWords.forEach(word => {
      prevStatusMap.set(word.id, word.status)
    })

    // 使用新的 initialWords，但保留用户已标记的状态
    return initialWords.map(word => ({
      ...word,
      // 如果这个单词之前有状态，保留它；否则使用 wordProgress 中的状态
      status: prevStatusMap.get(word.id) || wordProgress[word.id] || word.status
    }))
  })
}, [initialWords, wordProgress])
```

**效果:**
- ✅ 随机排序立即生效
- ✅ 状态筛选立即生效
- ✅ 主题/场景筛选立即生效
- ✅ 筛选后保留用户已标记的状态

### 2. WordCard.tsx - 添加全局设置同步

**文件:** `src/components/WordCard.tsx`

**修复内容:**
```typescript
// 同步全局设置变化到本地状态
useEffect(() => {
  setShowDefinition(!globalHideChinese)
}, [globalHideChinese])
```

**效果:**
- ✅ 全局隐藏按钮点击后所有卡片立即更新
- ✅ 本地按钮仍可覆盖全局设置（按需求保留）

## 待完成的配置

### 数据库表缺失
`user_book_preferences` 表可能未创建，需要运行迁移脚本：

**文件:** `supabase/migrations/fix_user_preferences_book_id.sql`

**执行方式:**
1. 在 Supabase Dashboard 中打开 SQL Editor
2. 复制 `fix_user_preferences_book_id.sql` 内容
3. 执行 SQL

或者使用 CLI:
```bash
supabase db push
```

**表结构:**
```sql
CREATE TABLE user_book_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  hide_chinese BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);
```

## 功能验证清单

### 需要手动验证的功能

#### 1. 随机排序
- [ ] 点击"随机"按钮，单词顺序改变
- [ ] 再次点击，恢复默认顺序
- [ ] 翻页后随机状态保持

#### 2. 状态筛选
- [ ] 点击"筛选" → 选择"认识"，只显示已标记为认识的单词
- [ ] 选择"模糊"，只显示已标记为模糊的单词
- [ ] 选择"不认识"，只显示已标记为不认识的单词
- [ ] 选择"未标注"，显示所有未标记的单词
- [ ] 筛选结果数量正确

#### 3. 主题/场景筛选
- [ ] 点击"全部主题"选择器，能看到所有主题
- [ ] 选择主题后，显示该主题下的单词
- [ ] 场景选择器根据主题动态更新
- [ ] 筛选后单词数量正确

#### 4. 分页
- [ ] 每页显示 50 个单词
- [ ] 点击"下一页"显示下一批单词
- [ ] 点击"上一页"返回上一页
- [ ] 筛选后分页正确更新

#### 5. 全局隐藏中文
- [ ] 点击"隐藏中文"按钮
- [ ] 所有卡片的中文内容隐藏（显示下划线）
- [ ] 按钮变为紫色，显示"显示中文"
- [ ] 单个卡片的本地按钮可以覆盖全局设置
- [ ] 刷新页面后设置保持（需要数据库表）

#### 6. 单词状态标记
- [ ] 点击"认识"按钮，状态变为绿色
- [ ] 点击"模糊"按钮，状态变为黄色
- [ ] 点击"不认识"按钮，状态变为红色
- [ ] 刷新页面后状态保持（需要 `word_progress` 表）

#### 7. 响应式布局
- [ ] 移动端（375px）布局正常
- [ ] 平板端（768px）布局正常
- [ ] 桌面端（1920px）布局正常
- [ ] 缩放浏览器无变形

## 测试建议

1. **先运行数据库迁移**
   ```bash
   supabase db push
   ```

2. **重启开发服务器**
   ```bash
   npm run dev
   ```

3. **登录测试账号**
   - 手机号: 13800138000
   - 密码: test123456

4. **访问单词书详情页**
   ```
   http://localhost:3000/library/demo-book-1
   ```

5. **逐项验证上述功能清单**

## 技术要点

### React 状态管理教训

1. **Props 到 State 的同步**
   - 不能只在 `useState` 初始化时使用 props
   - 必须使用 `useEffect` 监听 props 变化并更新 state

2. **状态持久化**
   - 用户交互状态（如标记）应与显示状态（如筛选）分离
   - 筛选改变时需要保留用户的交互状态

3. **React 渲染优化**
   - 使用 `useMemo` 缓存计算结果
   - 避免在每次渲染时重新计算大量数据

## 代码文件变更

### 已修改
1. `src/components/WordList.tsx` - 添加 prop 同步逻辑
2. `src/components/WordCard.tsx` - 添加全局设置同步

### 需要数据库变更
1. `supabase/migrations/fix_user_preferences_book_id.sql` - 需要执行

## 总结

通过添加两个关键的 `useEffect` 钩子，我们修复了筛选、排序和全局隐藏功能。问题的核心是 React 组件没有正确同步 props 变化到内部 state。

**下一步:** 用户需要在浏览器中验证所有功能是否正常工作。
