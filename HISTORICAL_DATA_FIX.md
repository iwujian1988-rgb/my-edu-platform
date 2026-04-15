# 历史数据修复指南 - 恢复被过滤的单词

## 📋 问题说明

**问题**：旧版 `cleanWord()` 函数过于严格，导致某些法语单词被过滤掉：
- 法语复合词（连字符）：`vis-à-vis`, `peut-être`, `avant-hier`
- 法语缩合词（撇号）：`c'est`, `d'eau`, `j'ai`, `aujourd'hui`
- 特殊字符：`œuvre`, `français`

**影响**：这些单词在上传时被过滤，没有写入数据库，导致前端不显示。

**好消息**：
- ✅ 原始 JSON 数据完整保存在 `video_learning_materials.material_json` 中
- ✅ 已修复 `cleanWord()` 函数（`src/lib/batch-upload/utils.ts`）
- ✅ 新上传的视频不会再有此问题

## 🛠 修复步骤

### Step 1: 检查受影响的视频

```bash
node check-affected-videos.mjs
```

**输出示例**：
```
⚠️  发现 15 个视频需要修复:

序号 | 视频标题                                  | 应有 | 实际 | 缺失
--------------------------------------------------------------------------------
   1 | InnerFrench - A2 - Episode 1            |   45 |   42 |    3
   2 | InnerFrench - A2 - Episode 2            |   38 |   35 |    3
   ...
```

### Step 2: 预览修复效果（DRY_RUN）

编辑 `fix-historical-words.mjs`：

```javascript
const DRY_RUN = true  // 保持为 true，预览模式
```

运行修复脚本：

```bash
node fix-historical-words.mjs
```

**输出示例**：
```
🔍 [预览] 将插入 3 个单词:
   - c'est: 这是
   - vis-à-vis: 面对面
   - aujourd'hui: 今天
```

### Step 3: 执行修复

编辑 `fix-historical-words.mjs`：

```javascript
const DRY_RUN = false  // 改为 false，执行实际修复
```

运行修复：

```bash
node fix-historical-words.mjs
```

### Step 4: 验证结果

1. **前端检查**：刷新视频详情页，查看单词卡片是否完整显示
2. **数据库验证**：
   ```sql
   SELECT
     v.title,
     COUNT(vwc.id) as word_count
   FROM videos v
   LEFT JOIN video_word_cards vwc ON vwc.video_id = v.id
   WHERE v.language = 'fr'
   GROUP BY v.id, v.title
   ORDER BY word_count DESC;
   ```

## 🎯 可选：修复特定视频

如果只想修复个别视频，编辑 `fix-historical-words.mjs`：

```javascript
const VIDEO_IDS = [
  'uuid-of-video-1',
  'uuid-of-video-2',
]
```

## 📊 预期影响

- **修复后单词数增加**：每个视频可能增加 2-5 个单词
- **数据库大小**：约增加 5-10%（取决于受影响视频数）
- **性能影响**：无（只是补充缺失数据）

## ⚠️ 注意事项

1. **备份数据**：修复前建议备份数据库
2. **分批执行**：如果视频数量很大，建议分批修复（修改 `BATCH_SIZE`）
3. **停机维护**：修复过程中可能短暂锁表，建议在低峰期执行
4. **验证测试**：先在测试环境验证，再在生产环境执行

## 🔗 相关文件

- 修复脚本：`fix-historical-words.mjs`
- 检查脚本：`check-affected-videos.mjs`
- 核心修复：`src/lib/batch-upload/utils.ts` (cleanWord 函数)
- 视频处理：`src/lib/batch-upload/video-processor.ts`

## ❓ 常见问题

**Q: 修复会覆盖现有数据吗？**
A: 不会。脚本只会插入缺失的单词，不会修改或删除现有数据。

**Q: 修复失败怎么办？**
A: 检查日志中的错误信息，确认数据库连接和权限正常。可以单视频重试。

**Q: 需要重启服务吗？**
A: 不需要。修复的是数据库数据，前端刷新页面即可看到效果。

**Q: 新上传的视频会受影响吗？**
A: 不会。`cleanWord()` 已修复，新视频会正确处理所有单词。
