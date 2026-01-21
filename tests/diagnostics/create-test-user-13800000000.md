# 创建测试用户 13800000000 - 完整解决方案

## 🎯 推荐方案：手动注册（最简单可靠）

### 步骤：
1. **打开浏览器**访问: http://localhost:3000/login
2. **点击"注册"**按钮
3. **填写表单**:
   - 手机号: `13800000000`
   - 密码: `Test123456`
   - 邀请码: `TEST1234`
4. **点击"注册"**按钮
5. **注册成功后**，运行REG-09测试

### 验证用户已创建：
```sql
SELECT id, phone_number, email, full_name, created_at
FROM users
WHERE phone_number = '13800000000';
```

---

## 🔄 备选方案1：使用现有用户（无需创建）

当前数据库已有用户:
- **手机号**: `15652936305`
- **邮箱**: `15652936305@phone.xiaoyu.com`

### 修改测试代码使用这个用户：

编辑 `e2e/scenarios/user-registration.spec.ts` 第187行：

```typescript
// 原代码
await page.fill('input[type="tel"], input[placeholder*="手机"]', '13800000000');

// 改为
await page.fill('input[type="tel"], input[placeholder*="手机"]', '15652936305');
```

---

## 💾 方案2：直接SQL（仅用于开发环境）

⚠️ **注意**: 此方法需要先手动注册一次以创建auth用户，然后才能执行此SQL。

### 查找现有用户的auth ID：
```sql
-- 查看所有用户及其ID
SELECT id, phone_number, email, full_name
FROM users
WHERE phone_number IS NOT NULL
ORDER BY created_at DESC;
```

### 如果你想克隆现有用户：
```sql
-- ⚠️ 不推荐：可能会产生数据不一致
-- 建议使用手动注册方式

-- 以下SQL仅供参考，不建议执行
-- INSERT INTO users (id, phone_number, email, full_name, created_at)
-- SELECT
--   gen_random_uuid(),
--   '13800000000',
--   '13800000000@phone.xiaoyu.com',
--   '测试用户',
--   NOW()
-- FROM users
-- WHERE phone_number = '15652936305'
-- LIMIT 1;
```

---

## 🚀 方案3：跳过REG-09测试

如果不需要测试"手机号已存在"场景，可以暂时跳过：

```typescript
test.skip('REG-09: 手机号已存在提示', async ({ page }) => {
  // 测试代码...
})
```

---

## ✅ 验证步骤

### 用户创建后，运行REG-09测试：
```bash
npx playwright test e2e/scenarios/user-registration.spec.ts -g "REG-09" --reporter=list
```

### 预期结果：
- ✅ 测试通过
- ✅ 显示"该手机号已注册"错误提示

---

## 📊 当前状态

**已有用户**: 1个
- 手机号: `15652936305`
- 创建时间: 2026-01-05

**需要**: 创建 `13800000000` 用户用于REG-09测试

---

**推荐**: 使用方案1（手动注册），最简单可靠！

**文件位置**: `tests/diagnostics/create-test-user-13800000000.md`
