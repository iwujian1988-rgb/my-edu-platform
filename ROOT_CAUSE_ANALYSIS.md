# 根本原因分析报告

**日期**: 2026-01-21
**问题**:
1. 单词列表页"认识/不认识"筛选按钮失效
2. /api/recent-books 返回500错误

---

## ✅ 问题1: /api/recent-books 500错误

### 根本原因
代码第35行select语句包含`category`字段，但`books`表中不存在此字段。当Supabase查询不存在的列时会返回错误。

### 修复
```typescript
// 修复前
.select('id, title, description, total_words, cover_url, cover_color, created_by, is_official, category')

// 修复后
.select('id, title, description, total_words, cover_url, cover_color, created_by, is_official')
```

同时移除了第61行对`book.category`的访问。

### 文件
- `src/app/api/recent-books/route.ts`

---

## ✅ 问题2: "认识/不认识"筛选失效

### 根本原因
**不是代码bug，而是缺少数据！**

测试结果：
- ✅ API代码逻辑**完全正确**
- ✅ 前端正确传递status参数
- ✅ API正确处理status参数
- ✅ API正确查询word_progress表
- ✅ API正确按status过滤单词
- ⚠️ **但用户该书有0条进度记录**

### 实际情况
当用户没有标记任何单词时：
- `status='all'` → 显示所有单词（正常）
- `status='known'` → 显示**0个单词**（因为没有标记为认识的）
- `status='fuzzy'` → 显示**0个单词**（因为没有标记为模糊的）
- `status='unknown'` → 显示**0个单词**（因为没有标记为不认识的）

用户看到空列表，误以为"筛选失效"。

### 解决方案
**这不是bug，而是预期的正常行为**。

需要告诉用户：
1. 状态筛选功能是正常的
2. 需要先在学习模式标记单词
3. 标记后筛选才能显示对应状态的单词

### API代码验证
```typescript
// src/app/api/words/route.ts:413-446
if (status !== 'all') {
  if (status === 'new') {
    // 返回没有进度记录的单词
  } else {
    // 返回匹配指定状态的单词（known/fuzzy/unknown）
    const statusWordIds = new Set(
      progressResult.data
        ?.filter((p: any) => p.status === status)
        .map((p: any) => p.word_id) || []
    )
    filteredWords = filteredWords.filter((word: any) => statusWordIds.has(word.id))
  }
}
```

**代码逻辑完全正确**。

---

## 📊 测试证据

### 测试1: API代码检查
```
✅ API检查status参数: 正确
✅ API有status筛选逻辑: 正确
✅ API查询word_progress: 正确
✅ API按status过滤: 正确
```

### 测试2: 数据库检查
```
书籍: 专业英语八级
用户: 00c6d4a2-34bd-4187-bf52-c346f8bf3500
进度记录数: 0 条
```

### 测试3: 所有30本书
```
总书数: 30
总章节数: 73
有theme_id的章节: 0 (0.0%)
有scene_id的章节: 0 (0.0%)
```

---

## 🎯 结论

### 问题1 (recent-books 500)
- ✅ 已修复
- ✅ 真正的bug（查询不存在的字段）

### 问题2 (状态筛选"失效")
- ✅ 代码正常
- ⚠️ 缺少测试数据
- 💡 用户误判（不是bug，是缺少数据）

### 给用户的说明
1. **状态筛选功能是正常的**
2. **需要先在学习模式标记单词**
3. **标记后筛选才能显示对应状态的单词**
4. **当前所有单词都是"未标注"状态**

---

**报告生成时间**: 2026-01-21
**测试方法**: 真实数据库查询 + 代码逻辑验证
