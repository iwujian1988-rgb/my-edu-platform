# 数据库结构分析与修复方案

**分析日期**: 2026-01-06
**版本**: v1.0
**分析人**: Claude

---

## 📊 当前数据库结构概览

### ✅ 已实现的核心表（schema.sql）

| 表名 | 状态 | 说明 | 符合PRD |
|------|------|------|---------|
| `users` | ✅ 完整 | 用户表（手机号、密码、激活状态） | ✅ 前台PRD |
| `invitation_codes` | ⚠️ 需修改 | 邀请码表（已存在但字段不符合后台需求） | ⚠️ 冲突 |
| `user_quotas` | ✅ 完整 | 用户配额表（每日智能导入限制） | ✅ 前台PRD |
| `themes` | ✅ 完整 | 主题表（商务、旅游等） | ✅ 前台PRD |
| `scenes` | ✅ 完整 | 场景表（关联主题） | ✅ 前台PRD |
| `books` | ⚠️ 需扩展 | 单词书表（缺少审核状态字段） | ⚠️ 部分符合 |
| `chapters` | ✅ 完整 | 章节表（支持主题场景关联） | ✅ 前台PRD |
| `words` | ✅ 完整 | 单词表（音标、释义、搭配、例句） | ✅ 前台PRD |
| `word_progress` | ✅ 完整 | 单词进度表（含全局状态同步触发器） | ✅ 前台PRD |
| `mistakes` | ✅ 完整 | 错题本表（自动关联） | ✅ 前台PRD |
| `vocabulary_calendar` | ✅ 完整 | 生词日历表 | ✅ 前台PRD |
| `learning_records` | ✅ 完整 | 学习记录表 | ✅ 前台PRD |

### ❌ 缺失的表（管理后台需要）

| 表名 | 优先级 | 说明 | PRD来源 |
|------|--------|------|---------|
| `administrators` | 🔴 P0 | 管理员表 | 管理后台PRD |
| `admin_audit_logs` | 🔴 P0 | 操作日志表 | 管理后台PRD |
| `user_book_preferences` | ✅ 已实现 | 用户偏好设置表 | 前台PRD（已通过migration添加）|

---

## ⚠️ 关键问题与冲突

### 问题 1: invitation_codes 表设计冲突

**当前设计 (schema.sql:45-55)**:
```sql
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),  -- ❌ 引用的是普通用户表
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);
```

**管理后台PRD要求**:
```sql
-- 管理后台PRD定义的表结构
created_by UUID REFERENCES administrators(id)  -- ✅ 应该引用管理员表
```

**冲突点**:
- 当前 `created_by` 引用的是 `users` 表（普通用户）
- 管理后台需要引用 `administrators` 表（管理员）
- **问题**: 普通用户和管理员是两个不同的概念

**解决方案**:
#### 方案 A: 创建 administrators 表，修改 invitation_codes 外键（推荐）
```sql
-- 1. 创建 administrators 表
CREATE TABLE administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),  -- 关联 Supabase Auth
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'content_admin', 'support')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 修改 invitation_codes 表（使用migration）
-- 添加新列
ALTER TABLE invitation_codes ADD COLUMN created_by_admin UUID REFERENCES administrators(id);

-- 数据迁移（如果有现有数据）
UPDATE invitation_codes SET created_by_admin = (SELECT id FROM administrators LIMIT 1);

-- 删除旧列（谨慎操作，建议先保留）
-- ALTER TABLE invitation_codes DROP COLUMN created_by;
```

#### 方案 B: 扩展 users 表，添加角色字段（不推荐）
- 会导致普通用户和管理员混在一起，权限管理复杂
- 违反了单一职责原则

---

### 问题 2: users 表缺少封禁字段

**当前设计 (schema.sql:28-36)**:
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(11) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,  -- ⚠️ 只有激活状态，无详细封禁信息
  metadata JSONB DEFAULT '{}'::jsonb
);
```

**管理后台PRD要求**:
```sql
-- 需要新增的字段
is_banned BOOLEAN DEFAULT false,              -- 是否被封禁
banned_at TIMESTAMP WITH TIME ZONE,           -- 封禁时间
banned_by UUID REFERENCES administrators(id), -- 封禁人
ban_reason TEXT,                              -- 封禁原因
ban_expires_at TIMESTAMP WITH TIME ZONE       -- 封禁过期时间（临时封禁）
```

**解决方案**:
使用 migration 添加字段：
```sql
-- migrations/add_user_ban_fields.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
```

**注意**:
- `is_active` 和 `is_banned` 的区别：
  - `is_active = false`: 账户未激活（如：邮箱未验证）
  - `is_banned = true`: 账户被封禁（违规操作）
- 登录时需要同时检查这两个字段

---

### 问题 3: books 表缺少审核状态字段

**当前设计 (schema.sql:138-151)**:
```sql
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url VARCHAR(500),
  category VARCHAR(50) CHECK (category IN ('exam', 'scenario', 'textbook', 'custom')),
  is_official BOOLEAN DEFAULT false,        -- 是否官方词库
  created_by UUID REFERENCES users(id),
  total_words INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,        -- 是否发布
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**管理后台PRD要求（用户词库审核）**:
- 需要审核状态字段（pending, approved, rejected）
- 需要审核意见字段
- 需要审核人、审核时间字段

**解决方案**:
添加审核相关字段：
```sql
-- migrations/add_book_review_fields.sql
ALTER TABLE books ADD COLUMN IF NOT EXISTS review_status VARCHAR(20)
  CHECK (review_status IN ('pending', 'approved', 'rejected'))
  DEFAULT 'pending';

ALTER TABLE books ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES administrators(id);
ALTER TABLE books ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_books_review_status ON books(review_status);
```

---

### 问题 4: books 表的 created_by 字段混淆

**当前设计**:
```sql
created_by UUID REFERENCES users(id)  -- 引用普通用户
```

**管理后台PRD要求**:
- 官方词库：应该由管理员创建
- 用户词库：由普通用户创建，需要审核

**解决方案**:
#### 方案 A: 分离官方词库和用户词库（推荐）
```sql
-- 保持 created_by 引用 users 表
-- 通过 is_official 区分：
-- - is_official = true: created_by 应该是管理员ID
-- - is_official = false: created_by 是普通用户ID

-- 应用层逻辑：
-- 创建官方词库时，检查创建者是否是管理员
-- 创建用户词库时，review_status = 'pending'，等待审核
```

#### 方案 B: 添加两个独立字段
```sql
ALTER TABLE books ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES administrators(id);
ALTER TABLE books ADD COLUMN IF NOT EXISTS created_by_user UUID REFERENCES users(id);

-- 应用层逻辑：
-- is_official = true 时，使用 created_by_admin
-- is_official = false 时，使用 created_by_user
```

**推荐方案 A**，因为：
- 更简单，不需要修改表结构
- 通过 `is_official` + `review_status` 组合即可区分

---

## 🔧 修复计划

### 阶段 1: 创建管理后台基础表（高优先级）

#### 1.1 创建 administrators 表
```sql
-- migrations/create_administrators_table.sql
CREATE TABLE IF NOT EXISTS administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'content_admin', 'support')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_administrators_user_id ON administrators(user_id);
CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email);
CREATE INDEX IF NOT EXISTS idx_administrators_role ON administrators(role);

-- 触发器：自动更新 updated_at
CREATE TRIGGER update_administrators_updated_at
  BEFORE UPDATE ON administrators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 1.2 创建 admin_audit_logs 表
```sql
-- migrations/create_admin_audit_logs_table.sql
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES administrators(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
```

### 阶段 2: 修改现有表（高优先级）

#### 2.1 修改 invitation_codes 表
```sql
-- migrations/fix_invitation_codes_table.sql
-- 步骤1: 添加新列
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES administrators(id);

-- 步骤2: 数据迁移（将现有 created_by 的值迁移到 created_by_admin）
-- 注意：这里假设现有邀请码是由某个管理员创建的，需要手动指定
-- UPDATE invitation_codes SET created_by_admin = 'xxx-admin-id' WHERE created_by IS NOT NULL;

-- 步骤3: 添加注释说明
COMMENT ON COLUMN invitation_codes.created_by IS '旧字段，保留向后兼容';
COMMENT ON COLUMN invitation_codes.created_by_admin IS '邀请码创建人（管理员）';
```

#### 2.2 修改 users 表
```sql
-- migrations/add_user_ban_fields.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
```

#### 2.3 修改 books 表
```sql
-- migrations/add_book_review_fields.sql
ALTER TABLE books ADD COLUMN IF NOT EXISTS review_status VARCHAR(20)
  CHECK (review_status IN ('pending', 'approved', 'rejected'))
  DEFAULT 'pending';

ALTER TABLE books ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE books ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_books_review_status ON books(review_status);

COMMENT ON COLUMN books.reviewed_by IS '审核人（预留字段，可选关联administrators表）';
```

### 阶段 3: 更新 TypeScript 类型定义

**文件**: `src/types/database.ts`

需要更新的类型：
```typescript
// 1. 添加 administrators 表
export interface Administrator {
  id: string
  user_id: string
  role: 'super_admin' | 'content_admin' | 'support'
  name: string
  email: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// 2. 添加 admin_audit_logs 表
export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// 3. 更新 users 表
export type User = {
  id: string
  phone_number: string
  password_hash: string
  created_at: string
  last_login_at: string | null
  is_active: boolean
  is_banned: boolean              // 新增
  banned_at: string | null        // 新增
  banned_by: string | null        // 新增
  ban_reason: string | null       // 新增
  ban_expires_at: string | null   // 新增
  metadata: any
}

// 4. 更新 books 表
export interface Book {
  // ... 原有字段 ...
  review_status: 'pending' | 'approved' | 'rejected'  // 新增
  review_reason: string | null                         // 新增
  reviewed_by: string | null                          // 新增
  reviewed_at: string | null                          // 新增
}

// 5. 更新 invitation_codes 表
export interface InvitationCode {
  id: string
  code: string
  max_uses: number
  used_count: number
  created_by: string | null       // 保留（旧字段）
  created_by_admin: string | null  // 新增（管理员ID）
  expires_at: string | null
  is_active: boolean
  created_at: string
  description: string | null
}
```

---

## ✅ 修复后的表结构总览

### 核心表关系图

```
auth.users (Supabase Auth)
    ↓ (1:1)
administrators ────────┬──→ admin_audit_logs
    ↓                    ↓
invitation_codes         books (review_status)
(users表)
    ↓                    ↓
user_quotas         chapters → words
    ↓                    ↓
word_progress ──→ learning_records
    ↓
mistakes + vocabulary_calendar
```

### 关键外键关系

| 表 | 字段 | 引用表 | 说明 |
|----|------|--------|------|
| `administrators` | `user_id` | `auth.users` | 管理员关联认证账户 |
| `invitation_codes` | `created_by_admin` | `administrators` | 邀请码创建人 |
| `admin_audit_logs` | `admin_id` | `administrators` | 操作日志 |
| `users` | `banned_by` | (预留) | 封禁人（可选关联administrators）|
| `books` | `reviewed_by` | (预留) | 审核人（可选关联administrators）|

---

## 🎯 执行建议

### 立即执行（今天）
1. ✅ 创建 `administrators` 表 migration
2. ✅ 创建 `admin_audit_logs` 表 migration
3. ✅ 修改 `invitation_codes` 表 migration
4. ✅ 修改 `users` 表（添加封禁字段）migration
5. ✅ 修改 `books` 表（添加审核字段）migration
6. ✅ 更新 TypeScript 类型定义

### 测试验证
1. 创建测试管理员账户
2. 测试邀请码创建（使用管理员ID）
3. 测试用户封禁功能
4. 测试词库审核流程

### 注意事项
- ⚠️ **数据迁移**: 如果生产环境已有数据，需要谨慎处理 `invitation_codes` 的 `created_by` 字段迁移
- ⚠️ **向后兼容**: 建议保留 `created_by` 字段一段时间，确保旧代码不会报错
- ⚠️ **权限检查**: 修改外键后，需要检查所有引用这些表的代码

---

## 📝 总结

### 关键发现
1. ✅ **前台数据库结构完整**: 基本满足前台PRD需求
2. ❌ **管理后台表缺失**: 需要创建 `administrators` 和 `admin_audit_logs`
3. ⚠️ **表设计冲突**: `invitation_codes` 的 `created_by` 字段需要修改
4. ⚠️ **功能字段缺失**: `users` 缺少封禁字段，`books` 缺少审核字段

### 修复后状态
- ✅ 前台需求完全满足
- ✅ 管理后台需求完全满足
- ✅ 数据结构清晰，职责分离
- ✅ 支持完整的RBAC权限系统

### 下一步
修复数据库结构后，即可开始：
1. 管理员认证系统
2. 邀请码管理功能
3. 用户管理功能
4. 词库管理功能

---

**文档状态**: ✅ 待确认
**优先级**: 🔴 P0（阻塞性问题，必须先修复）
**预计修复时间**: 2-3小时
