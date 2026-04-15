# 历史数据修复 - 完整解决方案

## 📦 提供的文件

### 1️⃣ 检查脚本
**`check-affected-videos.mjs`** - 快速检查哪些视频需要修复
```bash
node check-affected-videos.mjs
```
✅ 输出：受影响视频列表 + 缺失单词统计

### 2️⃣ 修复脚本
**`fix-historical-words.mjs`** - 批量修复历史数据
```bash
# 预览模式（安全）
node fix-historical-words.mjs

# 执行修复（修改 DRY_RUN = false）
node fix-historical-words.mjs
```
✅ 功能：
- 从原始 JSON 重新提取单词
- 使用修复后的 `cleanWord()` 处理
- 词典查询 + 数据库插入
- 详细的日志记录

### 3️⃣ SQL 查询
**`check-missing-words.sql`** - 数据库直接查询
```sql
-- 在 Supabase SQL Editor 中运行
-- 查看所有视频的单词统计
```
✅ 无需运行脚本，直接查看数据

### 4️⃣ 操作指南
**`HISTORICAL_DATA_FIX.md`** - 完整操作手册
- 修复步骤详解
- 注意事项
- 常见问题解答

---

## 🚀 快速开始（推荐流程）

### 第 1 步：检查影响范围
```bash
node check-affected-videos.mjs
```
**你会看到**：
```
⚠️  发现 15 个视频需要修复:
缺失单词总数: 45 个
```

### 第 2 步：预览修复效果
编辑 `fix-historical-words.mjs`：
```javascript
const DRY_RUN = true  // 确保是 true
```

运行：
```bash
node fix-historical-words.mjs
```
**你会看到**：
```
🔍 [预览] 将插入 3 个单词:
   - c'est: 这是
   - vis-à-vis: 面对面
   - aujourd'hui: 今天
```

### 第 3 步：执行修复
编辑 `fix-historical-words.mjs`：
```javascript
const DRY_RUN = false  // 改为 false
```

运行：
```bash
node fix-historical-words.mjs
```
**你会看到**：
```
✅ 成功插入 3 个单词
总视频数: 15
成功: 15
新增单词: 45
```

### 第 4 步：验证
刷新前端页面，查看单词卡片是否完整显示 ✅

---

## 🎯 配置选项

### 修复单个/部分视频
编辑 `fix-historical-words.mjs`：
```javascript
const VIDEO_IDS = [
  'uuid-of-video-1',
  'uuid-of-video-2',
]
```

### 调整批次大小
```javascript
const BATCH_SIZE = 10  // 每次处理 10 个视频
```

---

## ⚠️ 重要提示

1. **先测试后生产**：在测试环境验证无误后再执行生产环境
2. **备份数据库**：修复前建议备份 `video_word_cards` 表
3. **低峰期执行**：避免在用户活跃期执行
4. **监控日志**：仔细查看执行日志，确保没有错误

---

## 📊 预期结果

### 修复前
```
视频标题: InnerFrench - A2 - Episode 1
数据库单词: 42 个
实际应有: 45 个
缺失单词: c'est, vis-à-vis, aujourd'hui
```

### 修复后
```
视频标题: InnerFrench - A2 - Episode 1
数据库单词: 45 个 ✅
前端显示: 完整显示所有单词
```

---

## 🔧 故障排查

### 问题：脚本运行失败
**解决**：
1. 检查 Node.js 版本（需要 v18+）
2. 安装依赖：`npm install`
3. 检查数据库连接配置

### 问题：词典查询超时
**解决**：
1. 减小 `BATCH_SIZE`
2. 检查网络连接
3. 脚本会自动使用原始数据作为 fallback

### 问题：部分单词仍然不显示
**解决**：
1. 检查原始 JSON 中是否包含该单词
2. 检查词典数据是否完整
3. 查看 `video_word_cards` 表中是否有该单词记录

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 `HISTORICAL_DATA_FIX.md` 中的常见问题
2. 检查脚本输出的详细日志
3. 使用 `check-missing-words.sql` 直接查询数据库

---

## ✅ 完成检查清单

- [ ] 运行 `check-affected-videos.mjs` 查看影响范围
- [ ] 预览修复效果（DRY_RUN = true）
- [ ] 备份数据库
- [ ] 执行修复（DRY_RUN = false）
- [ ] 验证前端显示
- [ ] 检查数据库数据完整性

**修复完成后，所有历史视频的单词数据都会完整显示！** 🎉
