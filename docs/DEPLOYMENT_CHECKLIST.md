# 🚀 定时任务自动生成 - 部署清单

## ✅ 已完成的配置

### 1. Vercel Cron Jobs 配置
- ✅ `vercel.json` 已添加 crons 配置
- ✅ 每天北京时间 **00:00**（凌晨）自动生成
- ✅ API 路由优化，支持 Cron Job 调用

### 2. 数据库函数
- ✅ `generate_all_daily_tasks()` - 批量生成所有活跃计划的任务
- ✅ `generate_daily_task_for_plan()` - 为单个计划生成任务
- ✅ `trigger_daily_task_generation()` - 手动触发入口
- ✅ `cleanup_old_daily_tasks()` - 清理旧任务

### 3. 双重保障机制
- ✅ **主方案**: Vercel Cron Job 自动生成（每天凌晨）
- ✅ **备选方案**: 前端自动生成（当 Cron 失败时）

---

## 📋 部署步骤

### 步骤 1: 提交代码
```bash
git add .
git commit -m "feat: 添加定时任务自动生成学习计划"
git push
```

### 步骤 2: 部署到 Vercel
```bash
# 如果项目已连接 Vercel
vercel --prod

# 或者在 Vercel Dashboard 手动触发部署
```

### 步骤 3: 验证 Cron Job
1. 打开 **Vercel Dashboard**
2. 进入项目 → **Settings** → **Cron Jobs**
3. 确认看到：
   ```
   Path: /api/v3/learning-plan/schedule
   Schedule: 0 16 * * * *
   ```

---

## 🧪 测试验证

### 测试 1: 手动触发 API
```bash
# 本地测试
curl -X POST http://localhost:3000/api/v3/learning-plan/schedule

# 生产环境测试
curl -X POST https://your-domain.com/api/v3/learning-plan/schedule
```

预期返回：
```json
{
  "success": true,
  "data": {
    "date": "2026-01-28",
    "generated": 2,
    "skipped": 0,
    "errors": 0,
    "error_details": []
  },
  "meta": {
    "triggeredBy": "manual",
    "duration": "245ms"
  }
}
```

### 测试 2: 查看数据库
```sql
-- 查看今日任务是否生成
SELECT
  task_date,
  COUNT(*) as task_count,
  MIN(created_at) as first_generated_at
FROM daily_task_records
WHERE task_date = CURRENT_DATE
GROUP BY task_date;
```

### 测试 3: 检查 Vercel 日志
1. Vercel Dashboard → 项目 → **Functions**
2. 找到 `/api/v3/learning-plan/schedule`
3. 查看 Cron Job 执行日志

---

## 📅 时间配置说明

### 当前设置：
- **Cron 表达式**: `0 16 * * *`
- **UTC 时间**: 每天 16:00
- **北京时间**: 每天 **00:00**（凌晨）

### 修改时间（如需要）：
编辑 `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/v3/learning-plan/schedule",
      "schedule": "0 22 * * *"  // 改为北京时间早上 6:00
    }
  ]
}
```

常用时间对照表：

| 北京时间 | UTC 时间 | Cron 表达式 |
|---------|---------|------------|
| 00:00 | 16:00 | `0 16 * * *` ⭐ |
| 06:00 | 22:00 | `0 22 * * *` |
| 08:00 | 00:00 | `0 0 * * *` |
| 12:00 | 04:00 | `0 4 * * *` |

---

## 🔄 工作流程

### 正常情况（99%）：
```
00:00 Vercel Cron Job 自动触发
    ↓
数据库生成今日任务（后台执行）
    ↓
用户早上打开网站
    ↓
前端检查：任务已存在，直接显示 ✅
```

### 异常情况（1% - Cron 失败）：
```
00:00 Vercel Cron Job 失败（网络/服务问题）
    ↓
用户早上打开网站
    ↓
前端检查：任务不存在
    ↓
前端静默生成（备选方案）
    ↓
用户看到今日任务 ✅
```

---

## 📊 监控建议

### 1. Vercel 日志监控
- 定期检查 Cron Job 执行状态
- 查看错误日志和失败率

### 2. 数据库监控
```sql
-- 查看最近 7 天的任务生成情况
SELECT
  task_date,
  COUNT(*) as task_count,
  MIN(created_at) as generated_at,
  COUNT(*) FILTER (WHERE all_completed = true) as completed_count
FROM daily_task_records
WHERE task_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY task_date
ORDER BY task_date DESC;
```

### 3. 前端日志
- 控制台查看 `[Backup]` 标记（表示前端触发生成）
- 如果频繁出现，说明 Cron Job 可能有问题

---

## 🆘 故障排除

### 问题：Cron Job 没有执行
**解决**：
1. 检查 Vercel Dashboard → Cron Jobs 是否已启用
2. 确认 `vercel.json` 语法正确
3. 查看部署日志是否有错误

### 问题：任务没有生成
**解决**：
1. 检查活跃学习计划是否存在
2. 查看数据库函数日志：`SELECT trigger_daily_task_generation();`
3. 检查 Supabase 函数权限

### 问题：时区不对
**解决**：
- 确认 Cron 表达式使用 UTC 时间
- 北京时间 = UTC + 8 小时

---

## ✨ 优势

1. **完全免费** - Vercel Cron Jobs 免费使用
2. **可靠稳定** - Vercel 基础设施保证
3. **双重保障** - Cron + 前端备选
4. **零感知** - 用户完全无感知
5. **易于监控** - Vercel Dashboard 可视化

---

**🎉 现在用户每天早上打开网站，今日任务已经准备好了！**
