# 自定义单词书技术规范文档

> 更新时间：2026-01-15
> 版本：v1.0

## 目录
1. [数据库表结构（DDL）](#数据库表结构ddl)
2. [API 规范](#api-规范)
3. [鉴权方式](#鉴权方式)
4. [技术栈约束](#技术栈约束)

---

## 数据库表结构（DDL）

### 1. books 表（词库主表）

```sql
-- 完整表结构（基于迁移文件整理）
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基础信息
  title VARCHAR(255) NOT NULL,                    -- 词库标题
  description TEXT,                                -- 词库描述
  cover_color TEXT DEFAULT 'from-green-400 to-green-500',  -- 封面渐变色（Tailwind CSS类名）
  cover_url TEXT,                                  -- AI生成的封面图片URL

  -- 分类与状态
  category VARCHAR(50) NOT NULL,                   -- 分类：'exam' | 'scenario' | 'textbook' | 'custom'
  is_official BOOLEAN DEFAULT false,               -- 是否官方词库
  is_published BOOLEAN DEFAULT true,               -- 是否发布（软删除开关）

  -- 创建者信息
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 创建者ID（自定义词库）

  -- 统计字段
  total_words INTEGER DEFAULT 0,                   -- 总单词数
  total_chapters INTEGER DEFAULT 0,                -- 总章节数
  learner_count INTEGER DEFAULT 0,                 -- 学习人数（扩展字段）
  completion_rate DECIMAL(5,2) DEFAULT 0,          -- 完成率（扩展字段）

  -- 审核字段（2026-01-06新增）
  review_status VARCHAR(20) DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  review_reason TEXT,                              -- 审核意见/拒绝原因
  reviewed_by UUID REFERENCES auth.users(id),     -- 审核人ID（管理员）
  reviewed_at TIMESTAMP WITH TIME ZONE,            -- 审核时间

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_books_created_by ON books(created_by);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_is_published ON books(is_published);
CREATE INDEX idx_books_review_status ON books(review_status);
CREATE INDEX idx_books_reviewed_at ON books(reviewed_at DESC);

-- 触发器：自动更新updated_at
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 触发器：官方词库自动设置为已审核
CREATE TRIGGER trigger_auto_approve_official_books
  BEFORE INSERT OR UPDATE ON books
  FOR EACH ROW
  WHEN (NEW.is_official = true)
  EXECUTE FUNCTION auto_approve_official_books();

-- 注释
COMMENT ON TABLE books IS '单词书主表';
COMMENT ON COLUMN books.category IS '分类：exam(考试) | scenario(场景) | textbook(教材) | custom(自定义)';
COMMENT ON COLUMN books.is_official IS '官方词库标记：true=官方词库，false=用户自定义词库';
COMMENT ON COLUMN books.review_status IS '审核状态：pending(待审核) | approved(已通过) | rejected(已拒绝)';
```

### 2. chapters 表（章节表）

```sql
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,  -- 所属词库ID
  title VARCHAR(255) NOT NULL,                -- 章节标题
  order_index INTEGER NOT NULL,               -- 排序索引
  theme_id UUID,                              -- 主题ID（可选）
  scene_id UUID,                              -- 场景ID（可选）
  word_count INTEGER DEFAULT 0,               -- 单词数量
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_order_index ON chapters(order_index);

COMMENT ON TABLE chapters IS '词库章节表';
COMMENT ON COLUMN chapters.book_id IS '所属词库ID';
```

### 3. words 表（单词表）

```sql
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,  -- 章节ID（可为空，2026-01-08修改）
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,  -- 词库ID

  -- 单词基础信息
  word VARCHAR(255) NOT NULL,                 -- 单词
  phonetic TEXT,                              -- 音标（旧字段，保留兼容）
  uk_phonetic TEXT,                           -- 英式音标（2026-01-10新增）
  us_phonetic TEXT,                           -- 美式音标（2026-01-10新增）

  -- 释义与例句
  definition TEXT NOT NULL,                   -- 中文释义
  definition_en TEXT,                         -- 英文释义
  collocation TEXT,                           -- 搭配
  collocation_en TEXT,                        -- 英文搭配
  example_sentence TEXT,                      -- 例句
  example_sentence_en TEXT,                   -- 英文例句

  -- 词性与属性
  part_of_speech TEXT,                        -- 词性
  audio_url TEXT,                             -- 音频URL
  image_url TEXT,                             -- 图片URL
  difficulty_score INTEGER,                   -- 难度分数
  frequency_rank INTEGER,                     -- 频率排名

  -- 排序与时间
  order_index INTEGER NOT NULL,               -- 排序索引
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_words_chapter_id ON words(chapter_id);
CREATE INDEX idx_words_book_id ON words(book_id);
CREATE INDEX idx_words_order_index ON words(order_index);
CREATE INDEX idx_words_word ON words(word);  -- 用于单词搜索

COMMENT ON TABLE words IS '单词表';
COMMENT ON COLUMN words.chapter_id IS '章节ID（可为空，支持无章节的单词）';
COMMENT ON COLUMN words.word IS '单词文本';
```

### 4. word_progress 表（单词学习进度表）

```sql
CREATE TABLE IF NOT EXISTS word_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'known', 'fuzzy', 'unknown')),
  practice_count INTEGER DEFAULT 0,               -- 练习次数
  correct_count INTEGER DEFAULT 0,                -- 正确次数
  last_practiced_at TIMESTAMP WITH TIME ZONE,     -- 最后练习时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id, book_id)
);

-- 索引
CREATE UNIQUE INDEX word_progress_user_word_book_idx ON word_progress(user_id, word_id, book_id);
CREATE INDEX idx_word_progress_user_id ON word_progress(user_id);
CREATE INDEX idx_word_progress_book_id ON word_progress(book_id);
CREATE INDEX idx_word_progress_status ON word_progress(status);

COMMENT ON TABLE word_progress IS '单词学习进度表';
COMMENT ON COLUMN word_progress.status IS '学习状态：new(新词) | known(认识) | fuzzy(模糊) | unknown(不认识)';
```

### 5. user_book_preferences 表（用户词库偏好设置）

```sql
CREATE TABLE IF NOT EXISTS user_book_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,                         -- 词书ID（TEXT类型，支持UUID或slug）
  hide_chinese BOOLEAN DEFAULT FALSE,            -- 是否隐藏中文释义
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 索引
CREATE INDEX idx_user_book_prefs_user_id ON user_book_preferences(user_id);
CREATE INDEX idx_user_book_prefs_book_id ON user_book_preferences(book_id);

-- 更新时间戳触发器
CREATE TRIGGER update_user_book_preferences_updated_at
  BEFORE UPDATE ON user_book_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_book_preferences IS '用户对单词书的偏好设置';
COMMENT ON COLUMN user_book_preferences.hide_chinese IS '是否隐藏中文释义（用于自我测试）';
```

### 6. smart_import_quota 表（智能导入配额表）

```sql
-- 智能录入配额表（2026-01-07创建）
CREATE TABLE IF NOT EXISTS smart_import_quota (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,              -- 当日已使用次数
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE, -- 记录日期
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 唯一索引：每个用户每天只有一条记录
CREATE UNIQUE INDEX smart_import_quota_user_date_idx
  ON smart_import_quota(user_id, quota_date);

-- 普通索引
CREATE INDEX smart_import_quota_user_id_idx ON smart_import_quota(user_id);
CREATE INDEX smart_import_quota_quota_date_idx ON smart_import_quota(quota_date);

-- RLS策略（已启用）
ALTER TABLE smart_import_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quota"
  ON smart_import_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quota"
  ON smart_import_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
  ON smart_import_quota FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE smart_import_quota IS '智能录入配额表：记录用户每日智能识别单词的数量';
COMMENT ON COLUMN smart_import_quota.count IS '当日已使用的配额数量';
COMMENT ON COLUMN smart_import_quota.quota_date IS '配额日期';
```

### 7. users 表扩展字段（权限相关）

```sql
-- users 表中的权限相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS feature_permissions TEXT[];  -- 功能权限数组
ALTER TABLE users ADD COLUMN IF NOT EXISTS book_permissions TEXT[];     -- 词库权限数组
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_expires_at TIMESTAMP WITH TIME ZONE;  -- 权限过期时间
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_code_id UUID REFERENCES invitation_codes(id);  -- 使用的邀请码ID

COMMENT ON COLUMN users.feature_permissions IS '功能权限数组（如：match_game, dictation等）';
COMMENT ON COLUMN users.book_permissions IS '词库权限数组（包含词库ID或"全部"/"*"）';
COMMENT ON COLUMN users.permission_expires_at IS '权限过期时间';
```

---

## API 规范

### 基础配置
- **Base URL**: `/api`
- **认证方式**: Bearer Token (Supabase Auth JWT)
- **Content-Type**: `application/json`
- **响应格式**: JSON

### 1. 词库管理 API

#### 1.1 获取词库列表
```
GET /api/books

Request Headers:
  Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "词库标题",
      "description": "词库描述",
      "cover_color": "from-green-400 to-green-500",
      "cover_url": "https://...",
      "category": "custom",
      "is_official": false,
      "is_published": true,
      "total_words": 100,
      "total_chapters": 5,
      "created_by": "user-uuid",
      "review_status": "approved",
      "created_at": "2026-01-15T00:00:00Z"
    }
  ]
}

权限规则：
- 自定义词库（is_official=false）：只返回创建者自己的
- 官方词库（is_official=true）：根据用户权限过滤
- 未标记词库：默认不可见（安全优先）
```

#### 1.2 创建自定义词库
```
POST /api/books

Request Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Body:
{
  "title": "我的英语词库",
  "description": "日常学习使用",
  "cover_color": "from-blue-400 to-blue-500"  // 可选，默认随机
}

Response (200 OK):
{
  "success": true,
  "book": {
    "id": "uuid",
    "title": "我的英语词库",
    "description": "日常学习使用",
    "cover_color": "from-blue-400 to-blue-500",
    "category": "custom",
    "is_official": false,
    "is_published": true,
    "total_words": 0,
    "total_chapters": 0,
    "created_by": "user-uuid",
    "review_status": "pending",
    "created_at": "2026-01-15T00:00:00Z"
  }
}

验证规则：
- title: 必填，非空
- description: 可选
- cover_color: 可选，默认随机选择
- 自动设置 category='custom', is_official=false, is_published=true
```

#### 1.3 获取词库详情
```
GET /api/books/[bookId]

Request Headers:
  Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "词库标题",
    // ... 完整词库信息
  }
}

权限检查：
- 自定义词库：只允许创建者访问
- 官方词库：需要相应的词库权限
```

#### 1.4 获取词库单词列表
```
GET /api/words?bookId={bookId}&status={status}&page={page}&pageSize={pageSize}&shuffle={shuffle}

Request Headers:
  Authorization: Bearer <token>

Query Parameters:
  bookId: string (必填) - 词书ID
  status: string (可选) - 筛选状态：all|unknown|fuzzy|known|new，默认all
  page: number (可选) - 页码，默认1
  pageSize: number (可选) - 每页数量，默认50
  shuffle: boolean (可选) - 是否乱序，默认false

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "word-uuid",
      "word": "hello",
      "phonetic": "/həˈloʊ/",
      "uk_phonetic": "/həˈləʊ/",
      "us_phonetic": "/həˈloʊ/",
      "definition": "n. 你好；问候；喂 int. 喂；你好",
      "definition_en": "Used as a greeting or to begin a phone conversation",
      "collocation": "say hello to",
      "collocation_en": "greet someone",
      "example_sentence": "Hello, how are you?",
      "example_sentence_en": "Hello, how are you?",
      "part_of_speech": "interjection",
      "status": "new"  // 当前用户的学习状态
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 100,
  "count": 100,
  "bookTitle": "词库标题"
}

性能优化：
- 使用 RPC 函数 get_book_words_paginated_optimized 优化查询
- 支持分页，避免一次加载所有单词
- 'new' 状态使用特殊处理逻辑
```

### 2. 智能导入 API

#### 2.1 智能录入单词
```
POST /api/smart-import

Request Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Body:
{
  "words": ["hello", "world", "apple"],
  "bookId": "book-uuid"
}

限制与验证：
- 每次最多导入 100 个单词
- 单词格式：只允许英文字母和连字符(-)
- 自动去重
- 每日配额限制：500词

Response (200 OK):
{
  "success": true,
  "words": [
    {
      "id": "word-uuid",
      "word": "hello",
      "phonetic": "həˈloʊ",
      "definition": "n. 你好；问候",
      "definition_en": "Used as a greeting",
      "collocation": "say hello to",
      "collocation_en": "greet someone",
      "example_sentence": "Hello, how are you?",
      "example_sentence_en": "Hello, how are you?",
      "part_of_speech": "int.",
      "success": true
    }
  ],
  "remaining": 497  // 今日剩余配额
}

安全检查：
1. 验证 bookId 存在性
2. 验证用户权限（只能给自定义词库添加单词）
3. 官方词库不允许智能导入
4. 调用有道词典API获取单词信息
5. 批量插入到 words 表
6. 自动创建或复用章节
7. 更新词库统计
8. 更新配额使用情况

错误响应：
- 400: 单词列表为空、超过每次限制、格式错误、词库不存在、权限不足
- 429: 超过每日配额限制
- 500: 服务器错误
```

#### 2.2 获取今日剩余配额
```
GET /api/smart-import

Request Headers:
  Authorization: Bearer <token>

Response (200 OK):
{
  "used": 3,        // 今日已使用
  "remaining": 497, // 今日剩余
  "limit": 500      // 每日总配额
}
```

### 3. 学习进度 API

#### 3.1 获取单词学习状态
```
GET /api/word-progress?bookId={bookId}

Request Headers:
  Authorization: Bearer <token>

Query Parameters:
  bookId: string (必填) - 词书ID

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "word_id": "word-uuid",
      "status": "known",
      "practice_count": 5,
      "correct_count": 4,
      "last_practiced_at": "2026-01-15T10:00:00Z"
    }
  ]
}

状态说明：
- new: 新词（未学习）
- known: 认识
- fuzzy: 模糊
- unknown: 不认识
```

#### 3.2 保存/更新单词状态
```
POST /api/word-progress

Request Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Body:
{
  "wordId": "word-uuid",
  "bookId": "book-uuid",
  "status": "known"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": 123,
    "user_id": "user-uuid",
    "word_id": "word-uuid",
    "book_id": "book-uuid",
    "status": "known",
    "practice_count": 1,
    "correct_count": 0,
    "updated_at": "2026-01-15T10:00:00Z"
  }
}
```

#### 3.3 批量更新单词状态
```
PUT /api/word-progress

Request Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Body:
{
  "updates": [
    {
      "wordId": "word-uuid-1",
      "bookId": "book-uuid",
      "status": "known"
    },
    {
      "wordId": "word-uuid-2",
      "bookId": "book-uuid",
      "status": "unknown"
    }
  ]
}

Response (200 OK):
{
  "success": true,
  "updated": 2
}
```

### 4. 单词卡片进度 API

#### 4.1 获取卡片进度
```
GET /api/flashcard-progress?bookId={bookId}

Request Headers:
  Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "total": 100,
    "new": 50,
    "learning": 30,
    "review": 20
  }
}
```

### 5. 最近学习 API

#### 5.1 获取最近学习的词库
```
GET /api/recent-books

Request Headers:
  Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "book_id": "book-uuid",
      "title": "词库标题",
      "last_accessed_at": "2026-01-15T10:00:00Z",
      "progress": 0.65
    }
  ]
}
```

---

## 鉴权方式

### 1. 用户认证

#### 1.1 获取当前用户
```typescript
// src/lib/supabase/server.ts
import { getCurrentUser } from '@/lib/supabase/server'

const user = await getCurrentUser()
// 返回 User 对象或 null
```

#### 1.2 获取用户完整资料
```typescript
import { getUserProfile } from '@/lib/supabase/server'

const profile = await getUserProfile()
// 返回 users 表记录（包含权限字段）
```

#### 1.3 强制要求认证
```typescript
import { requireAuth } from '@/lib/supabase/server'

const user = await requireAuth()
// 如果未认证会抛出错误
```

### 2. 权限系统

#### 2.1 功能权限检查
```typescript
// src/lib/permissions.ts
import { hasFeaturePermission } from '@/lib/permissions'

// 检查用户是否有特定功能权限
const canPlayMatchGame = await hasFeaturePermission(user.id, 'match_game')
```

#### 2.2 词库权限检查
```typescript
import { hasBookPermission } from '@/lib/permissions'

// 检查用户是否有特定词库权限
const canAccessBook = await hasBookPermission(user.id, bookId)
```

#### 2.3 获取用户完整权限信息
```typescript
import { getUserPermissions } from '@/lib/permissions'

const permissions = await getUserPermissions()
// 返回：
// {
//   featurePermissions: string[],
//   bookPermissions: string[],
//   permissionExpiresAt: string | null,
//   isExpired: boolean,
//   isExpiringSoon: boolean,
//   daysUntilExpiry: number | null,
//   invitationCodeId: string | null
// }
```

### 3. 管理员认证

#### 3.1 获取当前管理员
```typescript
// src/lib/admin-auth.ts
import { getCurrentAdmin } from '@/lib/admin-auth'

const admin = await getCurrentAdmin()
// 返回管理员对象或 null
```

#### 3.2 检查管理员权限
```typescript
import { hasPermission } from '@/lib/admin-auth'

// 检查管理员是否有特定权限
const canManageUsers = await hasPermission('user_management')
```

### 4. RLS (Row Level Security) 策略

#### 4.1 自定义词库访问控制
```sql
-- 词库访问规则（在应用层实现）
-- 1. 自定义词库（is_official=false）：只显示创建者自己的
-- 2. 官方词库（is_official=true）：根据用户权限过滤
-- 3. 公共词库（created_by=null）：所有用户可见

-- 实现示例：src/app/api/books/route.ts
filteredBooks = books.filter(book => {
  // 规则1：自定义词库 - 只显示创建者自己的
  if (book.is_official === false) {
    return book.created_by === user.id
  }

  // 规则2：官方词库 - 根据用户权限过滤
  if (book.is_official === true) {
    return hasAllBooks || userBookIds.includes(book.id)
  }

  // 规则3：未标记词库 - 默认不可见
  return false
})
```

#### 4.2 smart_import_quota 表 RLS
```sql
-- 用户只能查看和修改自己的配额记录
CREATE POLICY "Users can view own quota"
  ON smart_import_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quota"
  ON smart_import_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
  ON smart_import_quota FOR UPDATE
  USING (auth.uid() = user_id);
```

### 5. Admin Client（绕过 RLS）

#### 5.1 创建 Admin Client
```typescript
// src/lib/supabase/server.ts
import { createAdminClient } from '@/lib/supabase/server'

const supabase = await createAdminClient()
// 使用 service_role key，绕过 RLS 限制
// ⚠️ 仅用于管理员操作
```

### 6. 权限常量

```typescript
// src/lib/permission-constants.ts
export const FEATURE_PERMISSIONS = {
  MATCH_GAME: 'match_game',
  DICTATION: 'dictation',
  FLASHCARDS: 'flashcards',
  SMART_IMPORT: 'smart_import',
  CUSTOM_BOOKS: 'custom_books',
  // ... 更多功能权限
} as const

export type FeaturePermission = typeof FEATURE_PERMISSIONS[keyof typeof FEATURE_PERMISSIONS]
```

---

## 技术栈约束

### 1. 核心依赖版本

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "@supabase/supabase-js": "^2.89.0",
    "@supabase/ssr": "^0.8.0",
    "typescript": "^5",
    "tailwindcss": "^4",
    "ioredis": "^5.9.1",
    "xlsx": "^0.18.5",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.57.0",
    "vitest": "^4.0.17",
    "eslint": "^9"
  }
}
```

### 2. Next.js 配置约束

```typescript
// next.config.ts
{
  // 输出模式
  output: 'standalone',  // 独立部署模式

  // 性能优化（低内存服务器）
  webpack: {
    watchOptions: {
      poll: false,  // 使用原生文件监听
      aggregateTimeout: 300,
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/logs/**']
    },
    parallelism: 2  // 服务器端并发编译数
  },

  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128],
    minimumCacheTTL: 60  // 低内存优化：禁用图片缓存
  },

  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-label']
  }
}
```

### 3. 数据库约束

#### 3.1 Supabase 版本
- PostgreSQL 15+
- Supabase CLI: 最新版本
- 支持的 PostgreSQL 特性：
  - UUID 类型
  - ARRAY 类型
  - JSONB 类型
  - RLS (Row Level Security)
  - 触发器
  - 存储过程

#### 3.2 RPC 函数
```sql
-- 优化的分页查询函数
CREATE OR REPLACE FUNCTION get_book_words_paginated_optimized(
  book_uuid UUID,
  offset_val INTEGER,
  limit_val INTEGER
) RETURNS TABLE (...) AS $$
  -- 实现省略
$$ LANGUAGE plpgsql;

-- 标准分页查询函数
CREATE OR REPLACE FUNCTION get_book_words_paginated(
  book_uuid UUID,
  offset_val INTEGER,
  limit_val INTEGER
) RETURNS TABLE (...) AS $$
  -- 实现省略
$$ LANGUAGE plpgsql;
```

### 4. 鉴权约束

#### 4.1 Supabase Auth
- JWT Token 有效期：1小时（可配置）
- Refresh Token 有效期：30天（可配置）
- 支持的手机号格式：E.164 格式
- 邀请码系统：一次性使用

#### 4.2 权限过期机制
```typescript
// 权限过期检查
const expirationCheck = await checkPermissionExpiration(7)  // 7天阈值
// 返回：
// {
//   isExpired: boolean,
//   isExpiringSoon: boolean,
//   expiresAt: Date | null,
//   daysUntilExpiry: number | null
// }
```

### 5. API 性能约束

#### 5.1 分页限制
- 默认每页数量：50
- 最大每页数量：100
- 支持 page + pageSize 分页模式

#### 5.2 超时限制
- 数据库查询超时：15秒
- 外部 API 调用超时：5秒
- 总请求超时：30秒

#### 5.3 并发限制
- 智能导入并发数：10
- 批量操作大小：100

### 6. 安全约束

#### 6.1 输入验证
```typescript
// 使用 Zod 进行输入验证
import { z } from 'zod'

const createBookSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  cover_color: z.string().optional()
})
```

#### 6.2 速率限制
- 每日智能导入配额：500词/用户
- 每次导入限制：100词
- 注册尝试限制：5次/IP
- 邀请码尝试限制：10次/码

#### 6.3 CORS 策略
```typescript
// 允许的来源
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
]
```

### 7. 前端技术栈

#### 7.1 核心框架
- Next.js 16.1.1 (App Router)
- React 19.2.3
- TypeScript 5

#### 7.2 UI 组件
- Radix UI (基础组件)
- Lucide React (图标)
- Tailwind CSS 4 (样式)
- Sonner (通知)

#### 7.3 状态管理
- React Server Components (RSC)
- Server Actions (表单处理)
- URL State (路由状态)

### 8. 测试框架

#### 8.1 E2E 测试
- Playwright ^1.57.0
- 测试命令：`npm run test`

#### 8.2 单元测试
- Vitest ^4.0.17
- 测试命令：`npm run test:unit`

### 9. 部署约束

#### 9.1 服务器要求
- 最低内存：2GB RAM
- 推荐：4GB+ RAM
- Node.js：18+
- 数据库：Supabase 云服务或自托管 PostgreSQL 15+

#### 9.2 部署方式
```bash
# 使用 PM2 部署
npm run pm2:start

# 健康检查
npm run pm2:health

# 内存监控
npm run memory:check
```

#### 9.3 环境变量
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=your_app_url

# 可选：Redis（缓存）
REDIS_URL=your_redis_url
```

### 10. 代码规范

#### 10.1 TypeScript 规范
- 严格模式开启
- 所有函数必须有类型注解
- 使用 `any` 类型需要注释说明

#### 10.2 代码风格
- 使用 ESLint
- 2空格缩进
- 单引号字符串
- 箭头函数优先

#### 10.3 命名规范
- 文件名：kebab-case（如 `word-progress.ts`）
- 组件名：PascalCase（如 `BookCard.tsx`）
- 函数名：camelCase（如 `getUserPermissions`）
- 常量名：UPPER_SNAKE_CASE（如 `MAX_WORDS_PER_IMPORT`）

---

## 附录

### A. 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 超过速率限制 |
| 500 | 服务器内部错误 |

### B. 常用工具函数

```typescript
// 超时控制
import { withTimeout } from '@/lib/timeout'
const result = await withTimeout(
  someAsyncOperation(),
  5000,
  'Operation timeout'
)

// 安全循环
import { safeLoop } from '@/lib/timeout'
await safeLoop(
  async () => { /* 循环体 */ },
  { maxIterations: 10, timeout: 30000 }
)
```

### C. 相关文档

- [产品需求文档](./PRD.md)
- [快速开始指南](./QUICK_START.md)
- [部署指南](./DEPLOYMENT.md)
- [测试执行指南](./TEST_EXECUTION_GUIDE.md)

---

**文档维护**：本文档应随代码变更及时更新，确保与实际实现保持一致。
