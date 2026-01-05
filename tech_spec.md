# 技术规格文档 (Tech Spec)

**项目**: 小语笔记 - 英语学习平台
**版本**: v3.2.1
**更新日期**: 2026-01-04

---

## 目录

- [1. 数据库模式设计](#1-数据库模式设计)
- [2. 邀请码与配额逻辑](#2-邀请码与配额逻辑)
- [3. 实时同步策略](#3-实时同步策略)
- [4. 前端架构](#4-前端架构)
- [5. Web Speech API 策略](#5-web-speech-api-策略)
- [6. 项目目录结构](#6-项目目录结构)

---

## 1. 数据库模式设计

### 技术选型
- **数据库**: PostgreSQL (通过 Supabase)
- **ORM**: Prisma（类型安全的数据库客户端）
- **迁移工具**: Supabase Migrations

### 1.1 核心表结构

#### `users` - 用户表
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(11) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 索引
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**字段说明**:
- `id`: 用户唯一标识（UUID）
- `phone_number`: 手机号（11位，唯一索引）
- `password_hash`: 密码哈希（bcrypt）
- `metadata`: 扩展字段（JSONB），存储用户偏好设置、设备信息等

---

#### `invitation_codes` - 邀请码表
```sql
CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX idx_invitation_codes_active ON invitation_codes(is_active, expires_at);
```

**字段说明**:
- `code`: 8位邀请码（字母+数字）
- `max_uses`: 最大使用次数
- `used_count`: 已使用次数
- `expires_at`: 过期时间（可选）
- `is_active`: 是否激活

**业务逻辑**:
- 注册时校验：`is_active = true AND expires_at > NOW() AND used_count < max_uses`
- 注册成功后：`used_count += 1`

---

#### `user_quotas` - 用户配额表
```sql
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_smart_import_limit INTEGER DEFAULT 500,
  daily_smart_import_used INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX idx_user_quotas_reset_date ON user_quotas(last_reset_date);
```

**字段说明**:
- `daily_smart_import_limit`: 每日智能识别配额（默认500词）
- `daily_smart_import_used`: 今日已使用配额
- `last_reset_date`: 上次重置日期

**业务逻辑**:
- 每日首次使用时检查：`last_reset_date < CURRENT_DATE`，则重置 `daily_smart_import_used = 0`
- 智能录入时校验：`daily_smart_import_used < daily_smart_import_limit`

---

#### `books` - 单词书表
```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url VARCHAR(500),
  category VARCHAR(50) CHECK (category IN ('exam', 'scenario', 'textbook', 'custom')),
  is_official BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  total_words INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_created_by ON books(created_by);
CREATE INDEX idx_books_published ON books(is_published, category);
```

**字段说明**:
- `category`: 分类（exam=考试, scenario=场景, textbook=教材, custom=自定义）
- `is_official`: 是否官方词库
- `created_by`: 创建者（自定义词库为用户ID，官方词库为NULL）

---

#### `chapters` - 章节表
```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  theme_id UUID REFERENCES themes(id),
  scene_id UUID REFERENCES scenes(id),
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_theme ON chapters(theme_id);
CREATE INDEX idx_chapters_scene ON chapters(scene_id);
```

---

#### `themes` - 主题表
```sql
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 示例数据：商务、旅游、日常、科技等
```

---

#### `scenes` - 场景表
```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_scenes_theme_id ON scenes(theme_id);

-- 示例数据：机场、酒店、餐厅、会议等（关联主题）
```

---

#### `words` - 单词表
```sql
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  phonetic VARCHAR(255),
  definition TEXT NOT NULL,
  definition_en TEXT,
  collocation TEXT,
  collocation_en TEXT,
  example_sentence TEXT,
  example_sentence_en TEXT,
  part_of_speech VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_words_chapter_id ON words(chapter_id);
CREATE INDEX idx_words_word ON words(word); -- 用于全局单词查询
CREATE INDEX idx_words_order ON words(chapter_id, order_index);
```

**核心逻辑说明**:
- **内容局部化**：`definition`, `example_sentence` 等字段跟随 `chapter_id`（同一单词在不同书中有不同释义）
- **唯一性判断**：以 `word` 字段为用户维度的唯一键

---

#### `word_progress` - 单词学习进度表
```sql
CREATE TABLE word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('new', 'known', 'vague', 'unknown')) DEFAULT 'new',
  practice_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id, book_id)
);

-- 索引
CREATE INDEX idx_word_progress_user ON word_progress(user_id);
CREATE INDEX idx_word_progress_word ON word_progress(word_id);
CREATE INDEX idx_word_progress_status ON word_progress(user_id, status);
CREATE INDEX idx_word_progress_book ON word_progress(user_id, book_id);
```

**核心逻辑说明**：
- **状态全局化**：同一单词在不同书籍中共享学习状态
- **UNIQUE 约束**：`user_id + word_id + book_id` 唯一，但通过触发器同步 `word` 维度的状态
- `status`: new=未标注, known=认识, vague=模糊, unknown=不认识

---

#### `learning_records` - 学习记录表
```sql
CREATE TABLE learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'view', 'mark_known', 'mark_vague', 'mark_unknown'
  practice_mode VARCHAR(50), -- 'dictation', 'match_game', 'flashcard'
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_learning_records_user ON learning_records(user_id, created_at DESC);
CREATE INDEX idx_learning_records_book ON learning_records(book_id);
CREATE INDEX idx_learning_records_word ON learning_records(word_id);

-- 分区表（按月分区，优化查询性能）
CREATE TABLE learning_records_y2026m01 PARTITION OF learning_records
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**用途**：
- 学习轨迹分析
- 数据可视化
- 生词日历数据源

---

#### `mistakes` - 错题本表
```sql
CREATE TABLE mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  wrong_count INTEGER DEFAULT 1,
  last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id, book_id)
);

-- 索引
CREATE INDEX idx_mistakes_user ON mistakes(user_id, is_resolved);
CREATE INDEX idx_mistakes_word ON mistakes(word_id);
```

**业务逻辑**：
- 当用户标记单词为"不认识"或"模糊"时，自动加入错题本
- 当单词状态变为"认识"时，`is_resolved = true`

---

#### `vocabulary_calendar` - 生词日历表
```sql
CREATE TABLE vocabulary_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'unknown', 'vague'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id, date)
);

-- 索引
CREATE INDEX idx_vocabulary_calendar_user_date ON vocabulary_calendar(user_id, date DESC);
CREATE INDEX idx_vocabulary_calendar_word ON vocabulary_calendar(word_id);
```

**用途**：
- 生词日历热力图数据
- 按日期统计新增生词数量

---

### 1.2 触发器与函数

#### 单词状态同步触发器
```sql
-- 当单词状态更新时，同步同一用户在不同书中的状态
CREATE OR REPLACE FUNCTION sync_word_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE word_progress
  SET status = NEW.status,
      updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND word_id IN (
      SELECT id FROM words WHERE word = (
        SELECT word FROM words WHERE id = NEW.word_id
      )
    )
    AND id != NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_word_status
AFTER UPDATE ON word_progress
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_word_status();
```

**逻辑说明**：
- 当用户在某本书中标记单词状态时
- 自动同步该用户在其他书中对同一单词的状态
- 实现"状态全局化"

---

#### 配额自动重置触发器
```sql
CREATE OR REPLACE FUNCTION reset_daily_quota()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.daily_smart_import_used = 0;
    NEW.last_reset_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_daily_quota
BEFORE UPDATE ON user_quotas
FOR EACH ROW
EXECUTE FUNCTION reset_daily_quota();
```

---

### 1.3 Row Level Security (RLS) 策略

```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_calendar ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own progress" ON word_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mistakes" ON mistakes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own calendar" ON vocabulary_calendar
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 2. 邀请码与配额逻辑

### 2.1 邀请码系统

#### 邀请码生成策略
```typescript
// lib/invitation-code.ts
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

#### 注册流程
```typescript
// app/actions/auth.ts
'use server'

import { supabase } from '@/lib/supabase'
import { bcrypt } from '@/lib/crypto'

export async function register(formData: FormData) {
  const phone = formData.get('phone') as string
  const password = formData.get('password') as string
  const invitationCode = formData.get('invitationCode') as string

  // 1. 验证邀请码
  const { data: codeData, error: codeError } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('code', invitationCode)
    .eq('is_active', true)
    .single()

  if (codeError || !codeData) {
    return { error: '邀请码无效或已失效' }
  }

  if (codeData.used_count >= codeData.max_uses) {
    return { error: '邀请码使用次数已达上限' }
  }

  if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
    return { error: '邀请码已过期' }
  }

  // 2. 检查 IP/设备限流（通过 Supabase Edge Functions）
  const rateCheck = await checkRateLimit(phone)
  if (!rateCheck.allowed) {
    return { error: rateCheck.message }
  }

  // 3. 创建用户
  const passwordHash = await bcrypt.hash(password, 10)

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      phone_number: phone,
      password_hash: passwordHash
    })
    .select()
    .single()

  if (userError) {
    return { error: '注册失败' }
  }

  // 4. 更新邀请码使用次数
  await supabase
    .from('invitation_codes')
    .update({ used_count: codeData.used_count + 1 })
    .eq('code', invitationCode)

  // 5. 初始化用户配额
  await supabase
    .from('user_quotas')
    .insert({
      user_id: user.id,
      daily_smart_import_limit: 500,
      daily_smart_import_used: 0
    })

  return { success: true, userId: user.id }
}
```

#### 安全防刷实现
```typescript
// lib/rate-limit.ts
import { supabase } from '@/lib/supabase'

const IP_LIMIT = 3 // 单IP 1小时限3次
const DEVICE_LIMIT = 1 // 单设备24小时限1次
const ATTEMPT_LIMIT = 5 // 输错5次锁定24小时

export async function checkRateLimit(phone: string) {
  const clientIp = headers().get('x-forwarded-for') || 'unknown'
  const deviceId = cookies().get('device_id')?.value || 'unknown'

  // 检查 IP 限流
  const { data: ipAttempts } = await supabase
    .from('registration_attempts')
    .select('count')
    .eq('ip_address', clientIp)
    .gte('created_at', new Date(Date.now() - 3600000)) // 1小时

  if (ipAttempts && ipAttempts.length >= IP_LIMIT) {
    return { allowed: false, message: '注册过于频繁，请1小时后再试' }
  }

  // 检查设备限流
  const { data: deviceAttempts } = await supabase
    .from('registration_attempts')
    .select('count')
    .eq('device_id', deviceId)
    .gte('created_at', new Date(Date.now() - 86400000)) // 24小时

  if (deviceAttempts && deviceAttempts.length >= DEVICE_LIMIT) {
    return { allowed: false, message: '该设备已注册过账号' }
  }

  // 检查手机号输错次数
  const { data: phoneAttempts } = await supabase
    .from('registration_attempts')
    .select('count')
    .eq('phone_number', phone)
    .gte('created_at', new Date(Date.now() - 86400000)) // 24小时

  if (phoneAttempts && phoneAttempts.length >= ATTEMPT_LIMIT) {
    return { allowed: false, message: '错误次数过多，账号已锁定24小时' }
  }

  // 记录本次尝试
  await supabase.from('registration_attempts').insert({
    phone_number: phone,
    ip_address: clientIp,
    device_id: deviceId,
    created_at: new Date()
  })

  return { allowed: true }
}
```

---

### 2.2 配额系统

#### 智能录入配额检查
```typescript
// app/actions/words.ts
'use server'

import { supabase } from '@/lib/supabase'

export async function smartImportWords(userId: string, words: string[]) {
  // 1. 获取用户配额
  const { data: quota } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!quota) {
    return { error: '配额信息不存在' }
  }

  // 2. 检查配额是否充足
  const availableQuota = quota.daily_smart_import_limit - quota.daily_smart_import_used

  if (words.length > availableQuota) {
    return {
      error: `今日配额不足，剩余 ${availableQuota} 词，请明天再试或手动输入`
    }
  }

  // 3. 调用第三方 API 批量获取单词信息
  const wordDetails = await fetchWordDetails(words)

  // 4. 插入单词数据
  const { error } = await supabase
    .from('words')
    .insert(wordDetails)

  if (error) {
    return { error: '导入失败' }
  }

  // 5. 更新配额
  await supabase
    .from('user_quotas')
    .update({
      daily_smart_import_used: quota.daily_smart_import_used + words.length,
      updated_at: new Date()
    })
    .eq('user_id', userId)

  return {
    success: true,
    imported: words.length,
    remaining: availableQuota - words.length
  }
}
```

#### 配额重置中间件
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function updateMiddleware(req: NextRequest) {
  const supabase = createServerClient(/* ... */)
  const userId = await getUserId(req)

  // 检查是否需要重置配额
  const { data: quota } = await supabase
    .from('user_quotas')
    .select('last_reset_date')
    .eq('user_id', userId)
    .single()

  if (quota && quota.last_reset_date < new Date().toISOString().split('T')[0]) {
    await supabase
      .from('user_quotas')
      .update({
        daily_smart_import_used: 0,
        last_reset_date: new Date().toISOString().split('T')[0]
      })
      .eq('user_id', userId)
  }
}
```

---

## 3. 实时同步策略

### 3.1 技术选型：Supabase Realtime

使用 Supabase Realtime 实现 WebSocket 多端同步，替代自建 WebSocket 服务器。

**优势**：
- 无需自建 WebSocket 服务器
- 自动处理连接管理、重连逻辑
- 与 PostgreSQL 数据库无缝集成
- 支持 Row Level Security (RLS)

### 3.2 实时同步场景

#### 场景 1：单词状态同步
```typescript
// hooks/useWordProgress.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useWordProgress(userId: string, wordId: string) {
  const [progress, setProgress] = useState<WordProgress | null>(null)

  useEffect(() => {
    // 1. 订阅单词状态变化
    const channel: RealtimeChannel = supabase
      .channel(`word_progress:${userId}:${wordId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件（INSERT, UPDATE, DELETE）
          schema: 'public',
          table: 'word_progress',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('状态变化:', payload)
          setProgress(payload.new as WordProgress)

          // 触发 UI 更新（如刷新列表、更新状态标记）
          toast.success(`单词状态已更新：${getStatusLabel(payload.new.status)}`)
        }
      )
      .subscribe()

    // 2. 初始加载
    loadProgress()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, wordId])

  return progress
}
```

#### 场景 2：学习进度实时同步
```typescript
// hooks/useLearningSync.ts
export function useLearningSync(userId: string) {
  useEffect(() => {
    // 订阅所有学习记录变化
    const channel = supabase
      .channel(`learning:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'learning_records',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          // 新学习记录产生时，同步更新本地状态
          const { book_id, word_id, action } = payload.new

          // 更新本地缓存（React Query / Zustand）
          queryClient.invalidateQueries(['word-progress', book_id])
          queryClient.invalidateQueries(['mistakes-count'])
          queryClient.invalidateQueries(['vocabulary-calendar'])

          // 触发多端同步提示
          toast.info('其他设备的学习进度已同步')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}
```

#### 场景 3：冲突解决策略
```typescript
// lib/conflict-resolution.ts
export async function syncWordStatusWithConflictResolution(
  userId: string,
  wordId: string,
  newStatus: WordStatus,
  timestamp: string
) {
  // 1. 获取服务器最新状态
  const { data: serverState } = await supabase
    .from('word_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .single()

  // 2. 比较 timestamp，以服务器"最后操作时间"为准
  if (serverState && new Date(serverState.updated_at) > new Date(timestamp)) {
    // 服务器数据更新，忽略本地更新
    return {
      conflict: true,
      serverStatus: serverState.status,
      message: '服务器数据已更新，已自动同步'
    }
  }

  // 3. 更新服务器状态
  const { data, error } = await supabase
    .from('word_progress')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .select()

  if (error) {
    return { error: '同步失败' }
  }

  // 4. 触发全局状态同步（通过触发器自动同步其他书中的状态）
  return { success: true, data }
}
```

### 3.3 客户端同步管理

```typescript
// lib/realtime-client.ts
class RealtimeSyncClient {
  private channels: Map<string, RealtimeChannel> = new Map()

  // 订阅用户所有数据变化
  subscribeUserData(userId: string) {
    const channelName = `user:${userId}`

    if (this.channels.has(channelName)) {
      return
    }

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'word_progress',
          filter: `user_id=eq.${userId}`
        },
        (payload) => this.handleWordProgressChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mistakes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => this.handleMistakesChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vocabulary_calendar',
          filter: `user_id=eq.${userId}`
        },
        (payload) => this.handleCalendarChange(payload)
      )
      .subscribe((status) => {
        console.log('同步状态:', status)
        if (status === 'SUBSCRIBED') {
          toast.success('多端同步已连接')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          toast.error('同步连接已断开，正在重连...')
        }
      })

    this.channels.set(channelName, channel)
  }

  // 取消订阅
  unsubscribe(userId: string) {
    const channelName = `user:${userId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // 处理单词进度变化
  private handleWordProgressChange(payload: any) {
    // 通过事件总线通知所有订阅者
    eventBus.emit('word-progress:changed', payload)
  }

  private handleMistakesChange(payload: any) {
    eventBus.emit('mistakes:changed', payload)
  }

  private handleCalendarChange(payload: any) {
    eventBus.emit('calendar:changed', payload)
  }
}

export const realtimeClient = new RealtimeSyncClient()
```

---

## 4. 前端架构

### 4.1 技术栈

- **框架**: Next.js 15 (App Router)
- **React 版本**: React 19
- **状态管理**: Zustand + React Query (TanStack Query v5)
- **表单处理**: React Hook Form + Zod
- **UI 组件**: Shadcn/UI + Tailwind CSS
- **动画**: Framer Motion
- **日期处理**: date-fns
- **图标**: Lucide React

### 4.2 Server Actions 策略

使用 Next.js 15 Server Actions 处理所有数据变更操作（Mutations）。

#### 示例：标记单词状态
```typescript
// app/actions/word-progress.ts
'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { auth } from '@/lib/auth'

export async function markWordStatus(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: '未登录' }
  }

  const wordId = formData.get('wordId') as string
  const bookId = formData.get('bookId') as string
  const status = formData.get('status') as 'known' | 'vague' | 'unknown'

  // 更新单词状态（触发器自动同步全局状态）
  const { data, error } = await supabase
    .from('word_progress')
    .upsert({
      user_id: session.user.id,
      word_id: wordId,
      book_id: bookId,
      status,
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) {
    return { error: '标记失败' }
  }

  // 如果是"不认识"或"模糊"，加入错题本
  if (status === 'unknown' || status === 'vague') {
    await supabase
      .from('mistakes')
      .upsert({
        user_id: session.user.id,
        word_id: wordId,
        book_id: bookId,
        is_resolved: false,
        updated_at: new Date().toISOString()
      })

    // 加入生词日历
    await supabase
      .from('vocabulary_calendar')
      .insert({
        user_id: session.user.id,
        word_id: wordId,
        book_id: bookId,
        date: new Date().toISOString().split('T')[0],
        status
      })
  }

  // 记录学习行为
  await supabase.from('learning_records').insert({
    user_id: session.user.id,
    word_id: wordId,
    book_id: bookId,
    action: `mark_${status}`,
    created_at: new Date().toISOString()
  })

  // 重新验证缓存
  revalidatePath(`/books/${bookId}`)
  revalidatePath('/mistakes')
  revalidatePath('/calendar')

  return { success: true, data }
}
```

### 4.3 数据获取策略

#### Server Components + RSC
```typescript
// app/books/[id]/page.tsx
import { supabase } from '@/lib/supabase'

export default async function BookPage({ params }: { params: { id: string } }) {
  // 直接在 Server Component 中获取数据
  const { data: book } = await supabase
    .from('books')
    .select('*, chapters(*)')
    .eq('id', params.id)
    .single()

  const { data: words } = await supabase
    .from('words')
    .select('*')
    .in('chapter_id', book?.chapters.map(c => c.id) || [])

  return <BookView book={book} words={words} />
}
```

#### Client Components + React Query
```typescript
// hooks/useWordProgress.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useWordProgress(userId: string, bookId: string) {
  const queryClient = useQueryClient()

  // 获取单词进度
  const { data: progress, isLoading } = useQuery({
    queryKey: ['word-progress', userId, bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('word_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)

      if (error) throw error
      return data
    }
  })

  // 标记单词状态
  const mutation = useMutation({
    mutationFn: async ({ wordId, status }: { wordId: string, status: string }) => {
      const formData = new FormData()
      formData.append('wordId', wordId)
      formData.append('bookId', bookId)
      formData.append('status', status)

      return markWordStatus(formData)
    },
    onSuccess: () => {
      // 自动重新获取数据
      queryClient.invalidateQueries({ queryKey: ['word-progress', userId, bookId] })
      queryClient.invalidateQueries({ queryKey: ['mistakes-count'] })
    }
  })

  return { progress, isLoading, markStatus: mutation.mutate }
}
```

### 4.4 全局状态管理（Zustand）

```typescript
// store/user-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  user: User | null
  setUser: (user: User) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null })
    }),
    {
      name: 'user-storage'
    }
  )
)

// store/ui-store.ts
interface UIState {
  isChineseVisible: boolean
  toggleChinese: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isChineseVisible: true,
  toggleChinese: () => set((state) => ({ isChineseVisible: !state.isChineseVisible })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open })
}))
```

### 4.5 路由结构

```typescript
// app 路由结构
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/
│   ├── page.tsx              # 单词库大厅
│   ├── books/
│   │   ├── [id]/
│   │   │   └── page.tsx      # 单词书详情
│   │   └── page.tsx          # 所有书籍列表
│   ├── practice/
│   │   ├── dictation/
│   │   ├── match-game/
│   │   └── flashcards/
│   ├── mistakes/
│   │   └── page.tsx
│   ├── calendar/
│   │   └── page.tsx
│   └── custom/
│       └── [id]/
│           └── page.tsx      # 自定义词库编辑器
├── (admin)/
│   ├── admin/
│   │   ├── books/
│   │   ├── users/
│   │   └── analytics/
│   └── page.tsx
├── api/                       # API Routes（备用）
├── layout.tsx
└── page.tsx
```

---

## 5. Web Speech API 策略

### 5.1 客户端 Hook 实现

```typescript
// hooks/useSpeech.ts
'use client'

import { useRef, useCallback, useEffect } from 'react'

interface SpeechOptions {
  text: string
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

export function useSpeech() {
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const speak = useCallback((options: SpeechOptions) => {
    if (!isSupported) {
      options.onError?.('浏览器不支持语音合成')
      return
    }

    // 取消当前播放
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(options.text)
    utterance.lang = options.lang || 'en-US'
    utterance.rate = options.rate || 1.0
    utterance.pitch = options.pitch || 1.0
    utterance.volume = options.volume || 1.0

    utterance.onstart = () => {
      options.onStart?.()
    }

    utterance.onend = () => {
      options.onEnd?.()
    }

    utterance.onerror = (event) => {
      options.onError?.(event.error)
    }

    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [isSupported])

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
    }
  }, [isSupported])

  const pause = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.pause()
    }
  }, [isSupported])

  const resume = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume()
    }
  }, [isSupported])

  // 清理
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSupported])

  return {
    isSupported,
    speak,
    cancel,
    pause,
    resume
  }
}
```

### 5.2 使用示例

```typescript
// components/WordCard.tsx
'use client'

import { useSpeech } from '@/hooks/useSpeech'
import { Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'

export function WordCard({ word, phonetic, definition }: WordProps) {
  const { isSupported, speak, cancel } = useSpeech()
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = () => {
    if (!isSupported) {
      toast.error('您的浏览器不支持语音播放，请使用 Chrome 或 Safari')
      return
    }

    speak({
      text: word,
      lang: 'en-US',
      rate: 0.9,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: (error) => {
        setIsPlaying(false)
        toast.error('播放失败：' + error)
      }
    })
  }

  return (
    <div className="word-card">
      <div className="word-header">
        <h3>{word}</h3>
        {isSupported && (
          <button
            onClick={isPlaying ? cancel : handlePlay}
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? <VolumeX /> : <Volume2 />}
          </button>
        )}
      </div>
      <p className="phonetic">{phonetic}</p>
      <p className="definition">{definition}</p>
    </div>
  )
}
```

### 5.3 浏览器兼容性检测

```typescript
// app/layout.tsx
import { useEffect } from 'react'
import { useSpeech } from '@/hooks/useSpeech'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isSupported } = useSpeech()

  useEffect(() => {
    if (!isSupported) {
      // 显示浏览器不兼容提示
      const toast = document.createElement('div')
      toast.className = 'browser-warning'
      toast.textContent = '建议使用 Chrome 或 Safari 浏览器以获得完整体验'
      document.body.prepend(toast)
    }
  }, [isSupported])

  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

### 5.4 性能优化

```typescript
// hooks/useSpeechBatch.ts
import { useSpeech } from './useSpeech'

export function useSpeechBatch() {
  const { speak, cancel, isSupported } = useSpeech()
  const queue = useRef<SpeechOptions[]>([])
  const isPlaying = useRef(false)

  const playBatch = useCallback(async (items: SpeechOptions[]) => {
    if (!isSupported) return

    queue.current = items

    for (const item of items) {
      await new Promise((resolve) => {
        speak({
          ...item,
          onEnd: () => {
            item.onEnd?.()
            resolve(null)
          }
        })
      })
    }
  }, [isSupported, speak])

  return { playBatch, cancel, isSupported }
}
```

---

## 6. 项目目录结构

```
my-edu-platform/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 认证相关路由组
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/              # 用户端路由组
│   │   │   ├── layout.tsx            # Dashboard 布局
│   │   │   ├── page.tsx              # 单词库大厅
│   │   │   ├── books/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      # 单词书详情
│   │   │   │   │   └── loading.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── practice/
│   │   │   │   ├── dictation/page.tsx
│   │   │   │   ├── match-game/page.tsx
│   │   │   │   └── flashcards/page.tsx
│   │   │   ├── mistakes/
│   │   │   │   └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx
│   │   │   └── custom/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── (admin)/                  # 管理后台路由组
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # 后台首页
│   │   │   ├── books/
│   │   │   │   └── page.tsx          # 书籍管理
│   │   │   ├── users/
│   │   │   │   └── page.tsx          # 用户管理
│   │   │   └── analytics/
│   │   │       └── page.tsx          # 数据分析
│   │   ├── api/                      # API Routes（备用）
│   │   │   └── webhooks/
│   │   ├── layout.tsx                # 根布局
│   │   ├── page.tsx                  # 首页
│   │   ├── globals.css               # 全局样式
│   │   └── actions.ts                # Server Actions
│   │
│   ├── components/                   # React 组件
│   │   ├── ui/                       # Shadcn/UI 组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── auth/                     # 认证组件
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── Captcha.tsx
│   │   ├── book/                     # 书籍相关组件
│   │   │   ├── BookCard.tsx
│   │   │   ├── WordList.tsx
│   │   │   ├── WordCard.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── practice/                 # 练习组件
│   │   │   ├── DictationMode.tsx
│   │   │   ├── MatchGame.tsx
│   │   │   └── Flashcards.tsx
│   │   ├── calendar/                 # 日历组件
│   │   │   └── VocabularyCalendar.tsx
│   │   ├── layout/                   # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── common/                   # 通用组件
│   │       ├── Toast.tsx
│   │       ├── Loading.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── lib/                          # 工具库
│   │   ├── supabase.ts               # Supabase 客户端
│   │   ├── auth.ts                   # 认证逻辑
│   │   ├── crypto.ts                 # 加密工具
│   │   ├── rate-limit.ts             # 限流逻辑
│   │   ├── realtime.ts               # 实时同步
│   │   ├── invitation-code.ts        # 邀请码生成
│   │   └── utils.ts                  # 通用工具
│   │
│   ├── hooks/                        # React Hooks
│   │   ├── useSpeech.ts              # Web Speech API
│   │   ├── useWordProgress.ts        # 单词进度
│   │   ├── useLearningSync.ts        # 学习同步
│   │   ├── useAuth.ts                # 认证状态
│   │   └── useMediaQuery.ts          # 响应式
│   │
│   ├── store/                        # 状态管理
│   │   ├── user-store.ts             # 用户状态
│   │   ├── ui-store.ts               # UI 状态
│   │   └── progress-store.ts         # 学习进度
│   │
│   ├── types/                        # TypeScript 类型
│   │   ├── models.ts                 # 数据模型
│   │   ├── api.ts                    # API 类型
│   │   └── forms.ts                  # 表单类型
│   │
│   ├── styles/                       # 样式文件
│   │   └── globals.css               # 全局 CSS
│   │
│   └── config/                       # 配置文件
│       ├── site.ts                   # 站点配置
│       └── constants.ts              # 常量
│
├── prisma/                           # Prisma ORM
│   ├── schema.prisma                 # 数据库模式
│   └── migrations/                   # 迁移文件
│
├── docs/                             # 文档
│   ├── tech_spec.md                  # 技术规格（本文件）
│   ├── api.md                        # API 文档
│   └── deployment.md                 # 部署文档
│
├── public/                           # 静态资源
│   ├── images/
│   ├── icons/
│   └── sounds/                       # 音效文件
│       ├── ding.mp3                  # 正确音效
│       └── buzz.mp3                  # 错误音效
│
├── .claude/                          # Claude Code 技能
│   └── skills/
│
├── .env.local                        # 环境变量（本地）
├── .env.example                      # 环境变量模板
├── components.json                   # Shadcn/UI 配置
├── tailwind.config.ts                # Tailwind CSS 配置
├── tsconfig.json                     # TypeScript 配置
├── next.config.ts                    # Next.js 配置
├── package.json                      # 项目依赖
└── README.md                         # 项目说明
```

---

## 附录

### A. 环境变量配置

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 邀请码相关
INVITATION_CODE_DEFAULT_MAX_USES=100
INVITATION_CODE_EXPIRY_DAYS=365

# 配额
DAILY_SMART_IMPORT_LIMIT=500

# 安全
RATE_LIMIT_IP_MAX=3
RATE_LIMIT_IP_WINDOW=3600000  # 1小时
RATE_LIMIT_DEVICE_MAX=1
RATE_LIMIT_DEVICE_WINDOW=86400000  # 24小时
```

### B. 推荐依赖包

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.0.10",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "framer-motion": "^10.16.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0",
    "bcrypt": "^5.1.1"
  }
}
```

### C. 数据库迁移命令

```bash
# 生成迁移文件
npx supabase migration new init_schema

# 应用迁移
npx supabase db push

# 重置数据库
npx supabase db reset

# 生成 TypeScript 类型
npx supabase gen types typescript --local > src/types/database.ts
```

---

**文档版本**: v1.0
**最后更新**: 2026-01-04
**维护者**: 小语笔记技术团队
