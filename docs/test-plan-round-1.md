# 学习计划模块 - 第一轮测试用例

> **测试目标**：验证P0核心功能能否正常跑通
> **测试范围**：基础流程 + 核心业务逻辑
> **测试日期**：2026-01-28

---

## 测试前准备

### 环境检查
- [ ] 数据库已启动（Supabase/PostgreSQL）
- [ ] 迁移文件已执行（检查以下表是否存在）
  - [ ] `learning_plans`
  - [ ] `review_schedule`
  - [ ] `daily_task_records`
- [ ] 前端开发服务器运行中（`npm run dev`）
- [ ] 已有测试用户账号

### 测试数据准备
- [ ] 已有单词书（CET-4或其他）
- [ ] 单词书至少包含50个单词（用于测试）

---

## 测试用例

### TC-001: 创建学习计划

**优先级**: P0
**前置条件**: 用户已登录，选择了一本单词书

**测试步骤**:

1. 访问单词书详情页
2. 点击"开始学习计划"按钮
3. 进入学习计划设置页，验证以下内容：
   - [ ] 显示单词书名称和总词数
   - [ ] "每天新学单词"默认值为20
   - [ ] "每天最多学习"默认值为50
   - [ ] "预计完成天数"正确计算（总词数 ÷ 每天新学）

4. 修改设置：
   - 每天新学单词：**10**
   - 每天最多学习：**30**

5. 点击"开始学习计划"按钮

**预期结果**:
- [ ] 页面跳转到今日任务页
- [ ] 数据库 `learning_plans` 表中新增一条记录
  ```sql
  -- 验证SQL
  SELECT * FROM learning_plans
  WHERE user_id = 'your_user_id'
  ORDER BY created_at DESC
  LIMIT 1;
  ```
  验证字段：
  - [ ] `daily_new_words` = 10
  - [ ] `daily_max_words` = 30
  - [ ] `status` = 'active'
  - [ ] `start_date` = 今天

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-002: 生成今日任务

**优先级**: P0
**前置条件**: 已创建学习计划

**测试步骤**:

1. 在今日任务页面，检查显示的数据
2. 记录以下数据：
   - [ ] 今日新学词数量
   - [ ] 今日复习词数量
   - [ ] 总词数

3. 查询数据库验证：
   ```sql
   -- 查询今日任务
   SELECT * FROM daily_task_records
   WHERE user_id = 'your_user_id'
     AND book_id = 'your_book_id'
     AND task_date = CURRENT_DATE
   LIMIT 1;
   ```

**预期结果**:
- [ ] 页面显示正确的新词和复习词数量
- [ ] 数据库中存在今日任务记录
  - [ ] `task_date` = 今天
  - [ ] `new_words` 是JSON数组，包含新学词ID
  - [ ] `review_words` 是JSON数组，包含复习词ID（首次应该为空）
  - [ ] `plan_day` = 1（第一天）
  - [ ] `all_completed` = false

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-003: 卡片学习模式 - 标记"认识"

**优先级**: P0
**前置条件**: 今日任务已生成

**测试步骤**:

1. 点击"卡片背单词"模式
2. 点击"开始学习"按钮
3. 进入卡片学习页面，验证：
   - [ ] 显示当前单词（正面）
   - [ ] 显示音标
   - [ ] 显示"复习/新学"标签
   - [ ] 显示进度（0/X 已完成）

4. 点击卡片翻转
5. 点击"😊 认识"按钮

6. 查询数据库验证标记：
   ```sql
   -- 查询word_status表
   SELECT * FROM word_status
   WHERE user_id = 'your_user_id'
     AND word_id = '刚才标记的词ID'
   LIMIT 1;

   -- 查询review_schedule表
   SELECT * FROM review_schedule
   WHERE user_id = 'your_user_id'
     AND word_id = '刚才标记的词ID'
   LIMIT 1;

   -- 查询daily_task_records表
   SELECT completed_words FROM daily_task_records
   WHERE user_id = 'your_user_id'
     AND task_date = CURRENT_DATE
   LIMIT 1;
   ```

**预期结果**:
- [ ] 单词标记为"认识"后从队列中移除
- [ ] 显示下一个单词
- [ ] 进度更新为 (1/X 已完成)
- [ ] `word_status.current_status` = 'known'
- [ ] `review_schedule.next_review_date` = 今天 + 7天
- [ ] `review_schedule.review_count` = 1
- [ ] `daily_task_records.completed_words` 包含该词ID

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-004: 卡片学习模式 - 标记"不认识"

**优先级**: P0
**前置条件**: 正在学习中

**测试步骤**:

1. 当前显示某个单词
2. 点击翻转
3. 点击"😕 不认识"按钮
4. 继续学习后续单词
5. 观察该单词是否再次出现

**预期结果**:
- [ ] 单词移到队列末尾
- [ ] 显示下一个单词
- [ ] 进度不增加
- [ ] `review_schedule.review_count` = 0（重置）
- [ ] `review_schedule.next_review_date` = 今天 + 7天
- [ ] 队列全部循环一遍后，该单词再次出现

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-005: 完成今日任务

**优先级**: P0
**前置条件**: 已标记多个单词

**测试步骤**:

1. 继续学习，将所有单词标记为"认识"
2. 观察最后一个单词标记后的行为

3. 查询数据库验证：
   ```sql
   SELECT * FROM daily_task_records
   WHERE user_id = 'your_user_id'
     AND task_date = CURRENT_DATE
   LIMIT 1;
   ```

**预期结果**:
- [ ] 所有单词标记为"认识"后，自动跳转到完成页
- [ ] 或显示"🎉 完成今日任务"按钮
- [ ] `daily_task_records.all_completed` = true
- [ ] `daily_task_records.completed_at` 有值
- [ ] `completed_words` 数组长度 = 总词数

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-006: 中途退出后恢复

**优先级**: P0
**前置条件**: 已开始学习但未完成

**测试步骤**:

1. 学习过程中标记3个单词为"认识"
2. 关闭浏览器/返回首页
3. 重新进入今日任务页
4. 观察显示的状态

5. 点击"开始学习"
6. 验证是否从第4个词开始

**预期结果**:
- [ ] 今日任务页显示进度：3/X 已完成
- [ ] 点击"开始学习"后从第4个词开始
- [ ] 前3个已标记的单词不再出现
- [ ] 数据库中 `completed_words` 包含这3个词ID

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-007: 第二天生成任务（包含复习词）

**优先级**: P0
**前置条件**: 第一天已完成任务

**测试步骤**:

1. 模拟第二天（修改系统日期或使用测试工具）
2. 重新进入今日任务页
3. 观察显示的复习词和新学词数量

4. 查询数据库：
   ```sql
   SELECT new_words, review_words
   FROM daily_task_records
   WHERE user_id = 'your_user_id'
     AND book_id = 'your_book_id'
   ORDER BY task_date DESC
   LIMIT 2;
   ```

**预期结果**:
- [ ] 显示复习词（第一天的词）
- [ ] 显示新学词（新的10个）
- [ ] 复习词和新学词混合在队列中
- [ ] 数据库中今天的任务：
  - [ ] `review_words` 包含昨天标记为"认识"的词ID
  - [ ] `plan_day` = 2

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-008: 复习词间隔计算（7-15-30天）

**优先级**: P0
**前置条件**: 单词已被标记3次"认识"

**测试步骤**:

1. 查询某个已标记多次的单词：
   ```sql
   SELECT word_id, review_count, next_review_date, interval_days
   FROM review_schedule
   WHERE user_id = 'your_user_id'
     AND word_id = 'test_word_id';
   ```

2. 手动更新 `review_count` 为不同值，观察 `next_review_date`：
   - review_count = 1 → 应该是今天+7天
   - review_count = 2 → 应该是今天+15天
   - review_count = 3 → 应该是今天+30天

**预期结果**:
- [ ] 第1次标记"认识"：7天后复习
- [ ] 第2次标记"认识"：15天后复习
- [ ] 第3次标记"认识"：30天后复习
- [ ] `interval_days` 字段正确记录

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败

---

### TC-009: 复习词过多时的截断逻辑

**优先级**: P1
**前置条件**: 有大量到期复习词

**测试步骤**:

1. 手动插入50个到期复习词到数据库：
   ```sql
   -- 模拟50个昨天到期的复习词
   INSERT INTO review_schedule (user_id, word_id, book_id, review_count, next_review_date)
   SELECT 'your_user_id', word_id, 'your_book_id', 1, CURRENT_DATE - INTERVAL '1 day'
   FROM words
   LIMIT 50;
   ```

2. 设置每天最多学习 = 30
3. 重新生成今日任务
4. 检查今日任务的复习词数量

**预期结果**:
- [ ] 今日任务只包含30个复习词（不超过 daily_max_words）
- [ ] 剩余20个词留到后续任务
- [ ] 界面可能有提示："复习词较多，建议调整学习量"

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败  ☐ 跳过

---

### TC-010: 边界值测试 - 极端设置

**优先级**: P1
**前置条件**: 无

**测试步骤**:

1. 尝试创建学习计划，设置：
   - 每天新学 = 1
   - 每天最多学习 = 1

2. 尝试创建学习计划，设置：
   - 每天新学 = 100
   - 每天最多学习 = 100

3. 尝试设置：
   - 每天新学 = 50
   - 每天最多学习 = 10（应该被拒绝）

**预期结果**:
- [ ] 最小值1可以正常创建
- [ ] 最大值100可以正常创建
- [ ] 每天最多学习 < 每天新学 时，按钮置灰或提示错误
- [ ] 预计天数计算正确

**实际结果**: _______________

**状态**: ☐ 通过  ☐ 失败  ☐ 跳过

---

## 测试执行记录

### 通过统计
- 总用例数: 10
- 通过数: ____
- 失败数: ____
- 跳过数: ____

### 失败用例详情

| 用例编号 | 用例名称 | 失败原因 | 严重程度 | 负责人 |
|---------|---------|---------|---------|--------|
| TC-___  |         |         | ☐高 ☐中 ☐低 |        |

### 发现的Bug

| Bug编号 | 相关用例 | 问题描述 | 复现步骤 | 优先级 |
|---------|---------|---------|---------|--------|
| BUG-001 | TC-003  |         |         | ☐P0 ☐P1 ☐P2 |

---

## 测试建议

### 必须修复的P0问题（阻塞流程）
- [ ] 列出所有P0问题

### 建议优化的P1问题（影响体验）
- [ ] 列出所有P1问题

### 下轮测试重点
- [ ] 听写模式
- [ ] 延迟检测弹窗
- [ ] 成就系统

---

## 附录：SQL验证脚本

### 检查学习计划
```sql
SELECT
  lp.*,
  jsonb_array_length(dtr.new_words) as new_count,
  jsonb_array_length(dtr.review_words) as review_count
FROM learning_plans lp
LEFT JOIN daily_task_records dtr
  ON lp.user_id = dtr.user_id
  AND lp.book_id = dtr.book_id
  AND dtr.task_date = CURRENT_DATE
WHERE lp.user_id = 'your_user_id';
```

### 检查今日任务进度
```sql
SELECT
  task_date,
  plan_day,
  jsonb_array_length(new_words) as new_count,
  jsonb_array_length(review_words) as review_count,
  jsonb_array_length(completed_words) as completed_count,
  all_completed,
  started_at,
  completed_at
FROM daily_task_records
WHERE user_id = 'your_user_id'
  AND book_id = 'your_book_id'
ORDER BY task_date DESC
LIMIT 7;
```

### 检查复习计划
```sql
SELECT
  rs.word_id,
  w.word,
  w.translation,
  rs.review_count,
  rs.next_review_date,
  rs.interval_days,
  ws.current_status
FROM review_schedule rs
JOIN words w ON rs.word_id = w.id
LEFT JOIN word_status ws ON rs.user_id = ws.user_id AND rs.word_id = ws.word_id
WHERE rs.user_id = 'your_user_id'
  AND rs.book_id = 'your_book_id'
ORDER BY rs.next_review_date ASC
LIMIT 20;
```

---

**测试人员**: _______________
**测试开始时间**: _______________
**测试结束时间**: _______________
**测试结论**: ☐ 通过  ☐ 条件通过  ☐ 不通过
