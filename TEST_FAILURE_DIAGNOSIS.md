# 测试失败诊断和修复指南

## 📊 当前状态

- **测试通过率**: 54% (14/26)
- **主要问题**: 邀请码相关测试失败（REG-06/07/08/13）

---

## 🔍 问题诊断

### 失败的测试都与注册相关：
- **REG-06**: 邀请码验证 - 无效邀请码
- **REG-07**: 邀请码验证 - 过期邀请码
- **REG-08**: 成功注册跳转首页
- **REG-09**: 手机号已存在提示
- **REG-13**: 注册后权限继承

### 可能的原因：
1. ✅ **邀请码已存在**（已确认TEST1234存在）
2. ❓ **邀请码已达到使用上限**（used_count >= max_uses）
3. ❓ **邀请码未激活**（is_active = false）
4. ❓ **测试手机号已被注册**（随机生成的手机号重复）

---

## 🔧 修复步骤

### 步骤1: 检查邀请码状态

在数据库管理工具中执行：
```sql
SELECT
  code,
  is_active,
  max_uses,
  used_count,
  expires_at,
  CASE
    WHEN used_count >= max_uses THEN '达到上限'
    WHEN NOT is_active THEN '未激活'
    WHEN expires_at AND new Date(expires_at) < new Date() THEN '已过期'
    ELSE '可用'
  END as status
FROM invitation_codes
WHERE code IN ('TEST1234', 'DEMO2024', 'EXPIRED2024');
```

### 步骤2: 重置邀请码

我已经为你准备好了SQL脚本：`tests/diagnostics/reset-test-invitation-codes.sql`

在数据库管理工具中打开并执行这个文件，它会：
- ✅ 重置 `TEST1234` 为可用状态（使用次数=0）
- ✅ 重置 `DEMO2024` 为可用状态
- ✅ 设置 `EXPIRED2024` 为过期状态（用于测试过期场景）

### 步骤3: 重新运行测试

```bash
npx playwright test e2e/scenarios/user-registration.spec.ts --reporter=list
```

---

## 📋 手动SQL命令（如果脚本不工作）

### 方案A: 仅重置使用次数
```sql
-- 将测试邀请码的使用次数重置为0
UPDATE invitation_codes SET used_count = 0 WHERE code IN ('TEST1234', 'DEMO2024');
```

### 方案B: 完全重置邀请码
```sql
-- 重置并确保激活
UPDATE invitation_codes
SET
  used_count = 0,
  is_active = true,
  max_uses = 10000
WHERE code IN ('TEST1234', 'DEMO2024');

-- 设置过期邀请码
UPDATE invitation_codes
SET
  used_count = 0,
  is_active = true,
  expires_at = '2020-01-01'
WHERE code = 'EXPIRED2024';
```

### 方案C: 插入缺失的邀请码
```sql
INSERT INTO invitation_codes (code, is_active, max_uses, used_count, expires_at)
VALUES
  ('TEST1234', true, 10000, 0, '2026-12-31'),
  ('DEMO2024', true, 10000, 0, '2026-12-31'),
  ('EXPIRED2024', true, 10000, 0, '2020-01-01')
ON CONFLICT (code) DO UPDATE SET
  used_count = 0,
  is_active = true;
```

---

## 🎯 其他可能的问题

### 如果REG-09仍然失败（手机号已存在）

测试使用 `13800000000` 作为已存在的手机号。如果数据库中没有这个用户：

```sql
-- 创建测试用户（用于REG-09）
INSERT INTO users (phone_number, email, full_name)
VALUES ('13800000000', '13800000000@phone.xiaoyu.com', '测试用户')
ON CONFLICT (phone_number) DO NOTHING;
```

---

## 📊 预期结果

完成邀请码重置后，预期测试结果：

| 测试 | 预期状态 |
|------|---------|
| REG-01 | ✅ 通过 |
| REG-02 | ✅ 通过 |
| REG-03 | ✅ 通过 |
| REG-04 | ⚠️ 可能失败（选择器问题） |
| REG-05 | ✅ 通过 |
| REG-06 | ✅ 通过（需要EXPIRED2024） |
| REG-07 | ✅ 通过（需要EXPIRED2024） |
| REG-08 | ✅ 通过（需要TEST1234可用） |
| REG-09 | ✅ 通过（需要13800000000用户） |
| REG-10 | ✅ 通过 |
| REG-11 | ✅ 通过 |
| REG-12 | ✅ 通过 |
| REG-13 | ✅ 通过（需要TEST1234可用） |

**预期最终通过率**: 92% (24/26)

---

## 🚀 快速修复命令

如果你能访问psql命令行工具：

```bash
# Windows (如果安装了PostgreSQL)
psql -h localhost -U postgres -d my_edu_platform -f tests/diagnostics/reset-test-invitation-codes.sql

# 或直接执行SQL
psql -h localhost -U postgres -d my_edu_platform -c "UPDATE invitation_codes SET used_count = 0 WHERE code IN ('TEST1234', 'DEMO2024');"
```

---

## 📝 下一步

1. ✅ 在数据库管理工具中执行 `tests/diagnostics/reset-test-invitation-codes.sql`
2. ✅ 重新运行测试: `npx playwright test e2e/scenarios/user-registration.spec.ts`
3. ✅ 查看测试报告，确认通过率提升到90%+

---

**需要帮助？**
- 检查数据库连接是否正常
- 确认PostgreSQL服务正在运行
- 查看开发服务器控制台是否有错误日志
