# Vercel Cron Jobs 定时任务配置说明

## 📅 定时任务设置

已配置在 `vercel.json` 中：

```json
{
  "crons": [
    {
      "path": "/api/v3/learning-plan/schedule",
      "schedule": "0 16 * * *"
    }
  ]
}
```

## 🕐 时间说明

- **Cron 表达式**: `0 16 * * *`
- **UTC 时间**: 每天 16:00（UTC）
- **北京时间**: 每天 **00:00**（凌晨，UTC+8）

## 📊 Cron 表达式格式

```
分钟 小时 日期 月份 星期
  0   16   *    *    *
```

### 常用时间点（对应北京时间）：

| 北京时间 | UTC 时间 | Cron 表达式 |
|---------|---------|------------|
| 00:00（凌晨） | 16:00 | `0 16 * * *` ⭐ 当前设置 |
| 06:00（早上） | 22:00 | `0 22 * * *` |
| 12:00（中午） | 04:00 | `0 4 * * *` |
| 18:00（晚上） | 10:00 | `0 10 * * *` |

## 🚀 部署步骤

1. **确保项目已部署到 Vercel**
   ```bash
   vercel --prod
   ```

2. **提交代码**
   ```bash
   git add vercel.json
   git commit -m "feat: 添加定时任务自动生成学习计划"
   git push
   ```

3. **Vercel 自动识别配置**
   - 部署后，Vercel 会自动读取 `vercel.json` 中的 `crons` 配置
   - 在 Vercel Dashboard → Settings → Cron Jobs 中可以看到

## ✅ 验证定时任务

### 方法 1: 查看 Vercel 日志
1. 打开 Vercel Dashboard
2. 进入项目 → Settings → Cron Jobs
3. 查看执行历史和日志

### 方法 2: 查看数据库
```sql
-- 查看今日任务是否自动生成
SELECT
  task_date,
  COUNT(*) as task_count,
  MIN(created_at) as first_generated_at
FROM daily_task_records
WHERE task_date >= CURRENT_DATE
GROUP BY task_date;
```

### 方法 3: 手动测试 API
```bash
# 手动触发测试
curl -X POST https://your-domain.com/api/v3/learning-plan/schedule
```

## 🔄 备选方案

如果 Vercel Cron Jobs 失败（网络问题等），前端仍有**自动触发机制**作为备选：

- 用户访问时会检查今日任务是否已生成
- 如果未生成，后台静默生成
- 确保用户始终能看到今日任务

## 📝 注意事项

1. **时区**: Vercel Cron Jobs 使用 **UTC 时间**
2. **最小间隔**: Vercel 免费计划支持最短 1 分钟间隔
3. **执行超时**: Cron Job 默认超时时间为 10 秒（可配置）
4. **重试机制**: 失败后会自动重试最多 3 次

## 🛠️ 修改定时时间

如需修改执行时间，编辑 `vercel.json` 中的 `schedule` 字段，然后重新部署。

例如改为北京时间早上 6:00 生成：

```json
{
  "crons": [
    {
      "path": "/api/v3/learning-plan/schedule",
      "schedule": "0 22 * * *"  // UTC 22:00 = 北京时间 06:00
    }
  ]
}
```
