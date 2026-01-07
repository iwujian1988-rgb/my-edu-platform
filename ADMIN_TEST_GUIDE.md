# 管理后台测试指南

## 📋 测试前准备

### Step 1: 执行数据库迁移

在 Supabase SQL Editor 中依次执行以下SQL文件：

#### 1.1 创建邀请码使用记录表
```sql
-- 文件: supabase/migrations/20260107_add_invitation_usage.sql

CREATE TABLE IF NOT EXISTS invitation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_invitation_usage_code_id ON invitation_usage(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_usage_user_id ON invitation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_usage_used_at ON invitation_usage(used_at);

ALTER TABLE invitation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invitation usage"
  ON invitation_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM administrators
      WHERE id = auth.uid()
        AND is_active = true
    )
  );
```

**验证命令**：
```sql
SELECT COUNT(*) FROM invitation_usage;
-- 应该返回: 0
```

---

### Step 2: 创建测试管理员账户

#### 2.1 在 Supabase Auth 中创建用户

**方法 A - 使用 Supabase Dashboard（推荐）**：

1. 打开浏览器，访问：https://supabase.com/dashboard
2. 选择您的项目
3. 左侧菜单 → **Authentication** → **Users**
4. 点击右上角 **"Add user"** → **"Create new user"**
5. 填写信息：
   - **Email**: `admin@xiaoyu.com`（或其他邮箱）
   - **Password**: `Admin123!`（或其他强密码）
   - **Auto Confirm User**: ✅ 勾选（自动确认邮箱）
6. 点击 **"Create user"**

#### 2.2 创建管理员记录

创建用户后，在 **SQL Editor** 中执行：

```sql
-- 替换以下变量
DO $$
DECLARE
  v_user_id UUID;
  v_admin_email TEXT := 'admin@xiaoyu.com';  -- 替换为实际邮箱
BEGIN
  -- 1. 查找用户ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_admin_email;

  -- 如果用户不存在，提示
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '用户不存在，请先在 Authentication > Users 中创建用户';
  END IF;

  -- 2. 创建管理员记录
  INSERT INTO administrators (
    user_id,
    role,
    name,
    email,
    is_active
  ) VALUES (
    v_user_id,
    'super_admin',
    '测试管理员',
    v_admin_email,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;

  RAISE NOTICE '✅ 管理员账户创建成功！';
  RAISE NOTICE '邮箱: %', v_admin_email;
  RAISE NOTICE '角色: super_admin';
  RAISE NOTICE '密码: Admin123!';
END $$;

-- 3. 查询创建的管理员
SELECT
  a.id,
  a.role,
  a.name,
  a.email,
  a.is_active,
  u.email as auth_email,
  u.created_at
FROM administrators a
JOIN auth.users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 5;
```

**预期输出**：
```
✅ 管理员账户创建成功！
邮箱: admin@xiaoyu.com
角色: super_admin
密码: Admin123!

id | role | name | email | is_active | auth_email | created_at
----+------+----------+------------------+------------+------------+------------
xxx | super_admin | 测试管理员 | admin@xiaoyu.com | true | admin@xiaoyu.com | 2026-01-07
```

---

## 🧪 功能测试清单

### Test 1: 管理员登录

**测试步骤**：

1. 访问管理后台登录页：
   ```
   http://localhost:3000/admin/login
   ```

2. **预期UI**：
   - ✅ 看到"喵喵笔记管理后台"标题
   - ✅ 看到猫咪logo图标
   - ✅ 看到邮箱和密码输入框
   - ✅ 看到"登录"按钮（绿色渐变）

3. **输入测试数据**：
   - 邮箱：`admin@xiaoyu.com`
   - 密码：`Admin123!`

4. 点击"登录"按钮

5. **预期结果**：
   - ✅ 登录成功
   - ✅ 自动跳转到仪表盘
   - ✅ 看到侧边栏（绿色主题）
   - ✅ 看到顶部导航栏
   - ✅ 看到管理员信息（测试管理员 - 超级管理员）

6. **错误处理测试**：
   - 输入错误密码
   - **预期结果**：显示"邮箱或密码错误"提示

---

### Test 2: 仪表盘功能

**测试步骤**：

1. 确认已登录并跳转到仪表盘
   ```
   http://localhost:3000/admin/dashboard
   ```

2. **验证核心指标卡片**：

   #### 卡片1: 用户统计
   - ✅ 显示用户总数（大数字）
   - ✅ 显示今日新增用户（绿色 +数字）
   - ✅ 点击卡片跳转到用户管理页面

   #### 卡片2: 活跃用户
   - ✅ 显示7日内活跃用户数
   - ✅ 显示占比百分比

   #### 卡片3: 邀请码使用率
   - ✅ 显示使用率百分比
   - ✅ 显示进度条
   - ✅ 显示"已用 X / 总计 Y"
   - ✅ 点击卡片跳转到邀请码管理

   #### 卡片4: 待审核词库
   - ✅ 显示待审核数量
   - ✅ 点击卡片跳转到审核管理

3. **验证最近活动**：
   - ✅ 显示操作日志列表
   - ✅ 看到管理员名称和操作
   - ✅ 看到相对时间（X分钟前）
   - ✅ 点击"查看全部"跳转到操作日志

4. **验证待办事项**（如果有待审核词库）：
   - ✅ 显示黄色警告卡片
   - ✅ 显示待审核数量
   - ✅ 点击跳转到审核页面

---

### Test 3: 侧边栏导航

**测试步骤**：

1. **验证菜单显示**：
   - ✅ 仪表盘
   - ✅ 用户管理
   - ✅ 邀请码管理
   - ✅ 词库管理
   - ✅ 审核管理
   - ✅ 数据统计
   - ✅ 管理员管理（仅超级管理员）
   - ✅ 系统设置（仅超级管理员）
   - ✅ 操作日志

2. **测试菜单项点击**：
   - 点击每个菜单项
   - ✅ 应该高亮当前页面
   - ✅ 页面标题正确显示

3. **测试响应式布局**：
   - 缩小浏览器窗口到移动端尺寸
   - ✅ 侧边栏应该隐藏
   - ✅ 显示汉堡菜单按钮
   - ✅ 点击按钮，侧边栏从左侧滑出
   - ✅ 点击遮罩层，侧边栏关闭

---

### Test 4: 权限控制

**测试步骤**：

1. **测试未登录访问**：
   - 在浏览器中打开隐私/无痕窗口
   - 直接访问：`http://localhost:3000/admin/dashboard`
   - ✅ 应该重定向到登录页
   - ✅ URL参数包含 `redirect=/admin/dashboard`

2. **测试退出登录**：
   - 点击侧边栏底部"退出登录"按钮
   - ✅ 应该成功登出
   - ✅ 跳转到登录页
   - ✅ 无法直接访问管理页面

3. **测试操作日志记录**：
   - 重新登录
   - 在SQL Editor中查询：
     ```sql
     SELECT * FROM admin_audit_logs
     ORDER BY created_at DESC
     LIMIT 5;
     ```
   - ✅ 应该看到 `admin_login` 和 `admin_logout` 记录
   - ✅ 记录包含 IP 地址和 User-Agent

---

### Test 5: UI/UX 验证

**测试步骤**：

1. **验证 Claymorphism 设计风格**：
   - ✅ 所有卡片有圆角（rounded-xl 或 rounded-2xl）
   - ✅ 所有卡片有黑色边框（border-[3px] border-black）
   - ✅ 所有卡片有阴影（shadow-[4px_4px_0px_0px_#000]）
   - ✅ 悬停时阴影加深（shadow-[6px_6px_0px_0px_#000]）
   - ✅ 悬停时向上移动（-translate-y-1）

2. **验证颜色系统**：
   - ✅ 主色调：绿色（from-green-400 to-green-600）
   - ✅ 辅助色：蓝色、紫色、橙色
   - ✅ 状态色：绿色（成功）、红色（错误）、黄色（警告）

3. **验证响应式设计**：
   - 桌面端（>1024px）：侧边栏固定显示
   - 平板端（768px-1024px）：侧边栏固定显示
   - 移动端（<768px）：侧边栏默认隐藏

---

## 🔍 问题排查

### 问题1: 无法登录

**症状**：输入正确的邮箱和密码，但无法登录

**解决方案**：
```sql
-- 1. 确认用户已创建
SELECT * FROM auth.users WHERE email = 'admin@xiaoyu.com';

-- 2. 确认管理员记录已创建
SELECT * FROM administrators WHERE email = 'admin@xiaoyu.com';

-- 3. 检查用户状态
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  a.role,
  a.is_active
FROM auth.users u
JOIN administrators a ON u.id = a.user_id
WHERE u.email = 'admin@xiaoyu.com';
```

**常见问题**：
- ❌ 用户未创建 → 先在 Auth 中创建用户
- ❌ 管理员记录未创建 → 执行创建管理员SQL
- ❌ 管理员被禁用 → 检查 `is_active` 字段

---

### 问题2: 登录后显示空白页

**症状**：登录成功但页面空白

**解决方案**：
1. 检查浏览器控制台是否有错误
2. 清除浏览器缓存（Ctrl+Shift+Delete）
3. 硬刷新页面（Ctrl+Shift+R）
4. 检查开发服务器是否正常运行

---

### 问题3: 仪表盘数据为空

**症状**：仪表盘卡片显示0或无数据

**解决方案**：
```sql
-- 检查数据库中是否有数据
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM invitation_codes) as total_invitation_codes,
  (SELECT COUNT(*) FROM books WHERE review_status = 'pending') as pending_reviews;
```

**预期结果**：
- 如果都是0，说明还没有数据，这是正常的
- 可以手动创建一些测试数据

---

## 📊 测试结果记录表

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 执行数据库迁移 | ⬜ 未测试 | |
| 创建管理员账户 | ⬜ 未测试 | |
| 管理员登录 | ⬜ 未测试 | |
| 仪表盘加载 | ⬜ 未测试 | |
| 核心指标卡片 | ⬜ 未测试 | |
| 最近活动显示 | ⬜ 未测试 | |
| 侧边栏导航 | ⬜ 未测试 | |
| 响应式布局 | ⬜ 未测试 | |
| 权限控制 | ⬜ 未测试 | |
| 退出登录 | ⬜ 未测试 | |
| 操作日志记录 | ⬜ 未测试 | |
| UI风格一致性 | ⬜ 未测试 | |

**填写说明**：
- ✅ 通过
- ❌ 失败
- ⚠️ 部分通过
- ⬜ 未测试

---

## 🚀 下一步

测试通过后，我们可以继续开发：

1. **邀请码管理** - 创建、查看、禁用邀请码
2. **用户管理** - 查看、封禁用户
3. **词库管理** - 官方词库CRUD、审核

---

**祝测试顺利！如有问题，请随时告诉我。** 🎉
