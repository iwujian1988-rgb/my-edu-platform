# 视频学习模块 - 技术设计文档

> **版本**: v5.0
> **日期**: 2026-03-17
> **对应 PRD**: [VIDEO_MODULE_PRD.md](./VIDEO_MODULE_PRD.md)
> **设计原则**: 最大化复用现有系统，最小化新增代码
> **变更记录**: v5.0 新增填空练习表、难度分析表，修复多语言字段命名

---

## 一、需求理解

### 1.1 核心需求

独立售卖的视频学习模块，核心功能：
- 视频播放 + 字幕同步
- 字幕高亮点击弹窗（单词/短语/地道表达）
- 四模式Tab（听说读写学）
- 录音跟读功能
- 闪卡复习（艾宾浩斯）
- 管理后台内容管理
- **多语言支持**（英语、法语等）
- **套餐-视频灵活关联**（核心售卖逻辑）
- **独立导航系统**（不复用旧导航）

### 1.2 边界条件

**输入范围**：
- 视频文件：MP4 格式，建议 < 100MB
- 字幕文件：JSON 格式（含时间戳）
- 语言：支持 en, fr, de, es, ja, it, ru（复用现有 SupportedLanguage）

**输入范围外**：
- MVP 不支持 CDN 加速
- MVP 不支持视频转码

**性能要求**：
- 视频加载：OSS 直传，无 CDN
- 字幕同步：实时响应
- 录音上传：异步，不阻塞用户

### 1.4 AI 提示词语言对应规则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI 生成内容 - 语言对应提示词                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  视频上传时选择语言 → 系统记录视频语言                                         │
│           │                                                                 │
│           ▼                                                                 │
│  AI 生成知识点时 → 根据语言加载对应提示词模板                                  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  视频语言     │  提示词文件                │  特殊处理                 │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  英语     │  prompts/en-video-cards.md   │  英语习语、俚语、地道表达  │  │
│  │  法语     │  prompts/fr-video-cards.md   │  法语习语、性别变化        │  │
│  │  德语     │  prompts/de-video-cards.md   │  德语习语、格变化          │  │
│  │  西班牙语 │  prompts/es-video-cards.md   │  西语习语、动词变位        │  │
│  │  日语     │  prompts/ja-video-cards.md   │  日语惯用句、敬语          │  │
│  │  意大利语 │  prompts/it-video-cards.md   │  意语习语、动词变位        │  │
│  │  俄语     │  prompts/ru-video-cards.md   │  俄语习语、格变化          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  生成内容类型：                                                              │
│  1. 单词卡片 - 单词、音标、词性、释义、例句                                    │
│  2. 短语卡片 - 短语、释义、同义表达、场景例句                                  │
│  3. 地道表达 - 表达、用法说明、举一反三、使用场景                              │
│  4. 填空练习 - 简单/中级/困难 三个难度                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5 视频发布验证规则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        视频发布前验证                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  发布视频时必须满足以下条件：                                                  │
│                                                                             │
│  1. ✅ 基本信息完整（标题、语言、视频文件）                                     │
│  2. ✅ ⭐ 必须关联至少一个套餐                                                │
│     └─▶ 未关联套餐的视频无法发布                                              │
│     └─▶ 未关联套餐的视频无法被任何用户看到                                    │
│  3. ✅ 字幕已上传（可选，建议有）                                              │
│  4. ✅ 知识点已审核（可选，建议有）                                            │
│                                                                             │
│  错误提示示例：                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ 无法发布                                                         │   │
│  │                                                                     │   │
│  │  请先关联至少一个套餐，否则用户无法看到此视频。                          │   │
│  │                                                                     │   │
│  │  [选择套餐]                                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        套餐-视频关联模型                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐         ┌─────────────────────┐                       │
│  │ invitation_     │ 1     N │ video_packages      │                       │
│  │ packages        │◄────────│ (视频套餐定义)        │                       │
│  │ (现有套餐表)     │         │ - name              │                       │
│  │                 │         │ - description       │                       │
│  └─────────────────┘         │ - price             │                       │
│                              │ - validity_days     │                       │
│                              └──────────┬──────────┘                       │
│                                         │                                  │
│                                         │ N                                │
│                                         ▼                                  │
│                              ┌─────────────────────┐                       │
│                              │ package_video_      │                       │
│                              │ relations           │                       │
│                              │ (套餐-视频关联)       │                       │
│                              │ - package_id        │                       │
│                              │ - video_id          │                       │
│                              └──────────┬──────────┘                       │
│                                         │                                  │
│                                         │ 1                                │
│                                         ▼                                  │
│                              ┌─────────────────────┐                       │
│                              │ videos              │                       │
│                              │ (视频内容)           │                       │
│                              │ - language: en/fr...│                       │
│                              └─────────────────────┘                       │
│                                                                             │
│  售卖场景示例：                                                              │
│  - A套餐（英语入门包）：关联视频 1-10                                        │
│  - B套餐（英语进阶包）：关联视频 11-20                                       │
│  - C套餐（法语包）：关联视频 21-30                                          │
│  - D套餐（全语言通票）：关联所有视频                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 约束条件

| 约束类型 | 说明 |
|---------|------|
| 技术约束 | 复用现有 Supabase + 阿里云 OSS 架构 |
| 权限约束 | 复用现有 `hasFeaturePermission()` |
| 存储约束 | 复用现有阿里云 OSS |
| 认证约束 | 复用现有 `getCurrentUser()` |
| TTS约束 | 复用现有 `useTTS` hook |

---

## 二、现状分析

### 2.1 现有代码探索结果

#### 可复用模块

| 模块 | 文件路径 | 复用方式 |
|------|---------|---------|
| 用户认证 | `src/lib/supabase/server.ts` | 直接调用 `getCurrentUser()` |
| 权限检查 | `src/lib/permissions.ts` | 直接调用 `hasFeaturePermission()` |
| 权限常量 | `src/lib/permission-constants.ts` | 扩展 `FEATURE_PERMISSIONS` |
| TTS 发音 | `src/hooks/use-tts.ts` | 直接调用 `play()` 方法 |
| OSS 存储 | `src/lib/oss.ts` | 扩展上传函数 |
| 管理后台布局 | `src/app/admin/layout.tsx` | 复用布局结构 |
| 管理员认证 | `src/lib/admin-auth.ts` | 直接调用 `requireAdminForAPI()` |

#### 现有 API 响应格式

```typescript
// 统一响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}
```

#### 现有权限检查模式

```typescript
// 服务端
const user = await getCurrentUser()
if (!user) {
  return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
}
const hasPermission = await hasFeaturePermission(user.id, 'video_learning')
if (!hasPermission) {
  return NextResponse.json({ success: false, error: '无权限' }, { status: 403 })
}
```

### 2.2 现有架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        现有系统架构                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Next.js    │───▶│  Supabase   │───▶│ PostgreSQL  │         │
│  │  App Router │    │  Client     │    │  Database   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                                       │               │
│         │              ┌─────────────┐          │               │
│         └─────────────▶│ 阿里云 OSS  │◀─────────┘               │
│                        │  (音频存储)  │                          │
│                        └─────────────┘                          │
│                                                                 │
│  现有功能：词书学习、听写、闪卡、Speaker                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                        ⬇️ 扩展后 ⬇️

┌─────────────────────────────────────────────────────────────────┐
│                        扩展后系统架构                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Next.js    │───▶│  Supabase   │───▶│ PostgreSQL  │         │
│  │  App Router │    │  Client     │    │  Database   │         │
│  └─────────────┘    └─────────────┘    │  + 新表     │         │
│         │                              └─────────────┘         │
│         │              ┌─────────────┐                          │
│         └─────────────▶│ 阿里云 OSS  │                          │
│                        │  音频+视频  │                          │
│                        │  +缩略图    │                          │
│                        └─────────────┘                          │
│                                                                 │
│  现有功能 + 视频学习模块（复用所有基础设施）                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 技术债务

无需处理现有技术债务，本模块为新增功能。

---

## 三、方案设计

### 3.1 方案对比

| 方案 | 优点 | 缺点 | 复杂度 |
|------|------|------|--------|
| **A: 完全复用现有架构** | 复用率高、开发快、风险低 | 需遵循现有约束 | **低** |
| B: 独立微服务 | 灵活性高、可独立扩展 | 部署复杂、维护成本高 | 高 |
| C: 外部视频服务 | 专业视频处理 | 成本高、数据分离 | 高 |

### 3.2 推荐方案

**选择方案 A：完全复用现有架构**

理由：
1. 复用现有权限系统，无需重新设计
2. 复用现有 OSS 存储，无需新服务
3. 复用现有认证系统，安全可靠
4. 开发周期短，风险可控

### 3.3 详细设计

#### 3.3.1 数据模型

```sql
-- ============================================
-- 视频套餐表（核心售卖逻辑）
-- ============================================
CREATE TABLE video_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,            -- 套餐名称，如"英语入门包"
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,         -- 价格（元）
  validity_days INTEGER DEFAULT 365,     -- 有效期（天）
  language VARCHAR(10),                  -- 主要语言（en/fr/de/es/ja/it/ru），NULL 表示多语言
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_packages_active ON video_packages(is_active);
CREATE INDEX idx_video_packages_language ON video_packages(language);

-- ============================================
-- 套餐-视频关联表
-- ============================================
CREATE TABLE package_video_relations (
  package_id UUID REFERENCES video_packages(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (package_id, video_id)
);

CREATE INDEX idx_pvr_package ON package_video_relations(package_id);
CREATE INDEX idx_pvr_video ON package_video_relations(video_id);

-- ============================================
-- 用户-视频套餐关联表（记录用户购买的套餐）
-- ============================================
CREATE TABLE user_video_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                 -- 关联现有 users 表
  package_id UUID REFERENCES video_packages(id) ON DELETE CASCADE,
  invitation_code_id UUID,               -- 关联使用的邀请码（可选）
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                -- 过期时间
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, package_id)
);

CREATE INDEX idx_user_video_packages_user ON user_video_packages(user_id);
CREATE INDEX idx_user_video_packages_expires ON user_video_packages(user_id, expires_at);

-- ============================================
-- 视频表（添加多语言支持）
-- ============================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,                    -- 阿里云 OSS 缩略图地址
  video_url TEXT NOT NULL,               -- 阿里云 OSS 视频地址
  duration INTEGER NOT NULL,             -- 时长（秒）
  language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr', 'de', 'es', 'ja', 'it', 'ru')),
  difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INTEGER DEFAULT 0,
  creator_name VARCHAR(100),             -- 创作者名称
  source_url TEXT,                       -- YouTube 原链接
  view_count INTEGER DEFAULT 0,          -- 观看次数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_difficulty ON videos(difficulty);
CREATE INDEX idx_videos_order ON videos(display_order);
CREATE INDEX idx_videos_language ON videos(language);

-- ============================================
-- 视频标签表
-- ============================================
CREATE TABLE video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) DEFAULT 'topic' CHECK (type IN ('topic', 'creator', 'difficulty', 'duration')),
  color VARCHAR(20) DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 视频-标签关联表
CREATE TABLE video_tag_relations (
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES video_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

-- ============================================
-- 字幕表
-- ============================================
CREATE TABLE video_subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL(10,3) NOT NULL,     -- 开始时间（秒，精确到毫秒）
  end_time DECIMAL(10,3) NOT NULL,       -- 结束时间
  original_text TEXT NOT NULL,           -- 原语言文本（根据视频语言）
  chinese_text TEXT,                     -- 中文翻译
  word_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtitles_video ON video_subtitles(video_id, start_time);
CREATE INDEX idx_subtitles_order ON video_subtitles(video_id, display_order);

-- ============================================
-- 单词卡片
-- ============================================
CREATE TABLE video_word_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  word VARCHAR(100) NOT NULL,
  phonetic VARCHAR(100),
  part_of_speech VARCHAR(20),
  chinese_definition TEXT NOT NULL,
  english_definition TEXT,
  example_from_video TEXT,
  example_translation TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_word_cards_video ON video_word_cards(video_id);
CREATE INDEX idx_word_cards_word ON video_word_cards(word);

-- ============================================
-- 短语卡片
-- ============================================
CREATE TABLE video_phrase_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  phrase VARCHAR(255) NOT NULL,
  phonetic VARCHAR(100),
  chinese_definition TEXT NOT NULL,
  synonyms TEXT,
  context TEXT,
  context_translation TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phrase_cards_video ON video_phrase_cards(video_id);

-- ============================================
-- 地道表达卡片（核心差异化）
-- ============================================
CREATE TABLE video_expression_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  expression VARCHAR(255) NOT NULL,
  context TEXT NOT NULL,
  context_translation TEXT,
  formula TEXT,                          -- 语法公式
  meaning TEXT,                          -- 核心含义
  usage_note TEXT,                       -- 使用说明
  examples JSONB,                        -- [{original, cn}, {original, cn}] 原语言例句+中文翻译
  scenarios TEXT,                        -- 使用场景
  similar_expressions TEXT[],            -- 相似表达数组
  formality_level VARCHAR(20) DEFAULT 'neutral' CHECK (formality_level IN ('neutral', 'formal', 'informal')),
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expression_cards_video ON video_expression_cards(video_id);

-- ============================================
-- 填空练习表
-- ============================================
CREATE TABLE video_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES video_subtitles(id) ON DELETE CASCADE,
  exercise_type VARCHAR(20) NOT NULL CHECK (exercise_type IN ('fill_blank', 'dictation')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  -- beginner: 挖1词，提供首字母提示
  -- intermediate: 挖2-3词，提供首尾字母提示
  -- advanced: 整句听写，无提示
  original_text TEXT NOT NULL,           -- 原始完整文本
  blank_positions JSONB NOT NULL,        -- [{start, end, word, hint}] 挖空位置信息
  hint_type VARCHAR(20),                 -- 'first_letter' | 'first_last_letter' | 'none'
  answer_text TEXT NOT NULL,             -- 答案文本
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_video ON video_exercises(video_id);
CREATE INDEX idx_exercises_subtitle ON video_exercises(subtitle_id);
CREATE INDEX idx_exercises_difficulty ON video_exercises(difficulty);

-- ============================================
-- 难度分析表（AI评估结果）
-- ============================================
CREATE TABLE video_difficulty_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE UNIQUE,
  -- AI 评估维度
  vocabulary_score DECIMAL(3,1),         -- 词汇难度 1-10
  speech_rate DECIMAL(6,2),              -- 语速（词/分钟）
  sentence_complexity DECIMAL(3,1),      -- 句子复杂度 1-10
  idiom_density DECIMAL(3,2),            -- 习语密度
  -- 综合评估
  final_difficulty VARCHAR(20) NOT NULL CHECK (final_difficulty IN ('beginner', 'intermediate', 'advanced')),
  -- 评估详情
  analysis_reason TEXT,                  -- AI 评估理由
  -- 统计数据
  total_words INTEGER DEFAULT 0,
  total_sentences INTEGER DEFAULT 0,
  avg_sentence_length DECIMAL(5,2),      -- 平均句长
  -- 元信息
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  model_version VARCHAR(50)              -- AI 模型版本
);

CREATE INDEX idx_difficulty_analysis_video ON video_difficulty_analysis(video_id);
CREATE INDEX idx_difficulty_analysis_level ON video_difficulty_analysis(final_difficulty);

-- ============================================
-- 字幕-卡片关联表（用于字幕高亮）
-- ============================================
CREATE TABLE subtitle_card_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtitle_id UUID REFERENCES video_subtitles(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('word', 'phrase', 'expression')),
  card_id UUID NOT NULL,
  start_position INTEGER NOT NULL,       -- 在字幕文本中的起始位置
  end_position INTEGER NOT NULL,         -- 在字幕文本中的结束位置
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subtitle_id, card_type, card_id)
);

CREATE INDEX idx_subtitle_card_subtitle ON subtitle_card_relations(subtitle_id);
CREATE INDEX idx_subtitle_card_card ON subtitle_card_relations(card_type, card_id);
CREATE INDEX idx_subtitle_card_positions ON subtitle_card_relations(subtitle_id, start_position, end_position);

-- ============================================
-- 视频观看进度（复用 users 表关联）
-- ============================================
CREATE TABLE user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                 -- 关联现有 users 表
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  last_position DECIMAL(10,3) DEFAULT 0, -- 最后观看位置（秒）
  watch_duration INTEGER DEFAULT 0,      -- 累计观看时长（秒）
  max_progress DECIMAL(5,2) DEFAULT 0,   -- 最大进度百分比
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_user_video_progress_user ON user_video_progress(user_id);
CREATE INDEX idx_user_video_progress_video ON user_video_progress(video_id);

-- ============================================
-- 卡片掌握状态
-- ============================================
CREATE TABLE user_card_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                 -- 关联现有 users 表
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('word', 'phrase', 'expression')),
  card_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('known', 'unknown', 'learning')),
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,            -- 艾宾浩斯遗忘曲线
  ease_factor DECIMAL(3,2) DEFAULT 2.5,  -- SM-2 算法
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_type, card_id)
);

CREATE INDEX idx_user_card_progress_user ON user_card_progress(user_id);
CREATE INDEX idx_user_card_progress_review ON user_card_progress(user_id, next_review_at);

-- ============================================
-- 录音表
-- ============================================
CREATE TABLE user_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                 -- 关联现有 users 表
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES video_subtitles(id),
  recording_url TEXT NOT NULL,           -- 阿里云 OSS 地址
  duration DECIMAL(10,3),                -- 秒
  file_size INTEGER,                     -- 字节
  content_type VARCHAR(50) DEFAULT 'audio/webm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_recordings_user ON user_recordings(user_id);
CREATE INDEX idx_user_recordings_video ON user_recordings(video_id);

-- ============================================
-- 收藏表
-- ============================================
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                 -- 关联现有 users 表
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('subtitle', 'word_card', 'phrase_card', 'expression_card')),
  item_id UUID NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  note TEXT,                             -- 用户笔记
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_video ON user_favorites(video_id);

-- ============================================
-- 视频学习日历（复用现有日历逻辑）
-- ============================================
CREATE TABLE video_learning_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                 -- 关联现有 users 表
  learning_date DATE NOT NULL,
  video_count INTEGER DEFAULT 0,         -- 学习视频数
  total_minutes INTEGER DEFAULT 0,       -- 学习时长
  cards_reviewed INTEGER DEFAULT 0,      -- 复习卡片数
  recordings_count INTEGER DEFAULT 0,    -- 录音数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, learning_date)
);

CREATE INDEX idx_video_calendar_user ON video_learning_calendar(user_id);
CREATE INDEX idx_video_calendar_date ON video_learning_calendar(learning_date);
```

#### 3.3.2 TypeScript 类型定义

```typescript
// src/types/video.ts

import type { Json } from './database'

// 复用现有语言类型
export type VideoLanguage = 'en' | 'fr' | 'de' | 'es' | 'ja' | 'it' | 'ru'

// ============================================
// 视频套餐类型（核心售卖逻辑）
// ============================================
export interface VideoPackage {
  id: string
  name: string
  description: string | null
  price: number
  validity_days: number
  language: VideoLanguage | null        // NULL 表示多语言套餐
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface UserVideoPackage {
  id: string
  user_id: string
  package_id: string
  invitation_code_id: string | null
  activated_at: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  // 关联的套餐信息
  package?: VideoPackage
}

// ============================================
// 视频基础类型（添加多语言支持）
// ============================================
export interface Video {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  video_url: string
  duration: number
  language: VideoLanguage               // 新增：视频语言
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published' | 'archived'
  display_order: number
  creator_name: string | null
  source_url: string | null
  view_count: number
  created_at: string
  published_at: string | null
  updated_at: string
}

export interface VideoTag {
  id: string
  name: string
  type: 'topic' | 'creator' | 'difficulty' | 'duration'
  color: string
  display_order: number
  created_at: string
}

// ============================================
// 字幕类型
// ============================================
export interface VideoSubtitle {
  id: string
  video_id: string
  start_time: number
  end_time: number
  original_text: string                  // 原语言文本（根据视频语言）
  chinese_text: string | null
  word_count: number
  display_order: number
  created_at: string
}

export interface SubtitleHighlight {
  card_type: 'word' | 'phrase' | 'expression'
  card_id: string
  text: string
  start_position: number
  end_position: number
}

export interface SubtitleWithHighlights extends VideoSubtitle {
  highlights: SubtitleHighlight[]
}

// ============================================
// 卡片类型
// ============================================
export interface VideoWordCard {
  id: string
  video_id: string
  word: string
  phonetic: string | null
  part_of_speech: string | null
  chinese_definition: string
  english_definition: string | null
  example_from_video: string | null
  example_translation: string | null
  difficulty_level: number
  display_order: number
  created_at: string
}

export interface VideoPhraseCard {
  id: string
  video_id: string
  phrase: string
  phonetic: string | null
  chinese_definition: string
  synonyms: string | null
  context: string | null
  context_translation: string | null
  difficulty_level: number
  display_order: number
  created_at: string
}

export interface CardExample {
  original: string                     // 原语言例句（根据视频语言）
  cn: string                           // 中文翻译
}

export interface VideoExpressionCard {
  id: string
  video_id: string
  expression: string
  context: string
  context_translation: string | null
  formula: string | null
  meaning: string | null
  usage_note: string | null
  examples: CardExample[] | null
  scenarios: string | null
  similar_expressions: string[] | null
  formality_level: 'neutral' | 'formal' | 'informal'
  difficulty_level: number
  display_order: number
  created_at: string
}

export type VideoCard = VideoWordCard | VideoPhraseCard | VideoExpressionCard
export type CardType = 'word' | 'phrase' | 'expression'

// ============================================
// 填空练习类型
// ============================================
export interface BlankPosition {
  start: number
  end: number
  word: string
  hint?: string                        // 首字母或首尾字母提示
}

export interface VideoExercise {
  id: string
  video_id: string
  subtitle_id: string
  exercise_type: 'fill_blank' | 'dictation'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  original_text: string
  blank_positions: BlankPosition[]
  hint_type: 'first_letter' | 'first_last_letter' | 'none' | null
  answer_text: string
  display_order: number
  created_at: string
}

// ============================================
// 难度分析类型
// ============================================
export interface VideoDifficultyAnalysis {
  id: string
  video_id: string
  vocabulary_score: number | null      // 词汇难度 1-10
  speech_rate: number | null           // 语速（词/分钟）
  sentence_complexity: number | null   // 句子复杂度 1-10
  idiom_density: number | null         // 习语密度
  final_difficulty: 'beginner' | 'intermediate' | 'advanced'
  analysis_reason: string | null       // AI 评估理由
  total_words: number
  total_sentences: number
  avg_sentence_length: number          // 平均句长
  analyzed_at: string
  model_version: string | null
}

// ============================================
// 用户数据类型
// ============================================
export interface UserVideoProgress {
  id: string
  user_id: string
  video_id: string
  last_position: number
  watch_duration: number
  max_progress: number
  is_completed: boolean
  completed_at: string | null
  updated_at: string
}

export interface UserCardProgress {
  id: string
  user_id: string
  video_id: string
  card_type: CardType
  card_id: string
  status: 'known' | 'unknown' | 'learning'
  review_count: number
  last_reviewed_at: string | null
  next_review_at: string | null
  ease_factor: number
  created_at: string
  updated_at: string
}

export interface UserRecording {
  id: string
  user_id: string
  video_id: string
  subtitle_id: string | null
  recording_url: string
  duration: number | null
  file_size: number | null
  content_type: string
  created_at: string
}

export interface UserFavorite {
  id: string
  user_id: string
  item_type: 'subtitle' | 'word_card' | 'phrase_card' | 'expression_card'
  item_id: string
  video_id: string
  note: string | null
  created_at: string
}

// ============================================
// API 响应类型
// ============================================
export interface VideoListItem extends Video {
  tags: string[]
  packages: string[]                     // 所属套餐名称列表
  user_progress: {
    last_position: number
    max_progress: number
    is_completed: boolean
  } | null
  has_access: boolean                    // 用户是否有权限观看
}

export interface VideoFullResponse {
  video: Video
  subtitles: SubtitleWithHighlights[]
  has_access: boolean                    // 用户是否有权限观看
}

export interface CardDetailResponse {
  card: VideoCard & { user_status?: 'known' | 'unknown' | 'learning' }
}

// ============================================
// 套餐列表响应
// ============================================
export interface VideoPackageListItem extends VideoPackage {
  video_count: number                    // 包含的视频数量
  user_has_access: boolean               // 用户是否已购买
  user_expires_at: string | null         // 用户套餐过期时间
}

// ============================================
// 组件 Props 类型
// ============================================
export interface SubtitleWithHighlightsProps {
  subtitle: SubtitleWithHighlights
  onHighlightClick: (cardType: CardType, cardId: string) => void
}

export interface CardPopoverProps {
  card: VideoCard
  cardType: CardType
  onClose: () => void
  onStatusChange: (status: 'known' | 'unknown') => void
  onFavorite: () => void
}
```

#### 3.3.3 API 设计

```yaml
# ============================================
# 公开接口（需登录 + 检查视频访问权限）
# ============================================

# 视频列表（支持语言筛选）
GET /api/videos
  认证: getCurrentUser()
  权限: 检查用户是否有任意视频套餐
  Query:
    - limit: number (default 20)
    - offset: number (default 0)
    - language: 'en' | 'fr' | 'de' | 'es' | 'ja' | 'it' | 'ru' (optional)
    - difficulty: 'beginner' | 'intermediate' | 'advanced'
    - tag: string
    - search: string
    - only_accessible: boolean (default true) # 仅返回有权限的视频
  Response:
    {
      "success": true,
      "data": {
        "items": [VideoListItem],
        "total": number,
        "user_packages": [                  # 用户已购买的套餐
          { "id": "uuid", "name": "英语入门包", "expires_at": "2025-03-17" }
        ]
      }
    }

# 视频详情 + 字幕 + 高亮标记
GET /api/videos/[id]/full
  认证: getCurrentUser()
  权限: 检查用户是否有该视频的访问权限
  Response:
    {
      "success": true,
      "data": VideoFullResponse
    }
  错误:
    - 403: 无权访问该视频（未购买对应套餐或已过期）

# 卡片详情
GET /api/videos/[id]/cards/[cardType]/[cardId]
  认证: getCurrentUser()
  权限: 检查用户是否有该视频的访问权限
  Response:
    {
      "success": true,
      "data": CardDetailResponse
    }

# 填空练习
GET /api/videos/[id]/exercises
  认证: getCurrentUser()
  权限: 检查用户是否有该视频的访问权限
  Query:
    - difficulty: 'beginner' | 'intermediate' | 'advanced' (optional)
  Response:
    {
      "success": true,
      "data": {
        "items": [VideoExercise],
        "total": number
      }
    }

# 难度分析
GET /api/videos/[id]/difficulty-analysis
  认证: getCurrentUser()
  权限: 检查用户是否有该视频的访问权限
  Response:
    {
      "success": true,
      "data": VideoDifficultyAnalysis | null
    }

# ============================================
# 套餐相关接口
# ============================================

# 获取所有视频套餐（前台展示用）
GET /api/video-packages
  认证: getCurrentUser()
  Query:
    - language: 'en' | 'fr' | ... (optional)
  Response:
    {
      "success": true,
      "data": {
        "items": [VideoPackageListItem],
        "total": number
      }
    }

# 获取用户已购买的视频套餐
GET /api/user/video-packages
  认证: getCurrentUser()
  Response:
    {
      "success": true,
      "data": {
        "items": [UserVideoPackage],
        "accessible_video_ids": ["uuid1", "uuid2", ...]  # 用户可访问的所有视频ID
      }
    }

# 检查视频访问权限
GET /api/videos/[id]/access
  认证: getCurrentUser()
  Response:
    {
      "success": true,
      "data": {
        "has_access": boolean,
        "packages": [                        # 包含该视频的套餐
          { "id": "uuid", "name": "英语入门包", "user_has_access": false }
        ]
      }
    }

# ============================================
# 用户数据接口
# ============================================

# 更新卡片掌握状态
POST /api/card-progress
  认证: getCurrentUser()
  权限: 检查用户是否有该视频的访问权限
  Body:
    {
      "video_id": "uuid",
      "card_type": "word" | "phrase" | "expression",
      "card_id": "uuid",
      "status": "known" | "unknown" | "learning"
    }

# 上传录音
POST /api/recordings
  认证: getCurrentUser()
  权限: 检查用户是否有该视频的访问权限
  Body: FormData { video_id, subtitle_id, audio_file }
  Response:
    {
      "success": true,
      "data": { "recording_id": "uuid", "recording_url": "string" }
    }

# 视频观看进度
POST /api/user/video-progress/[videoId]
  认证: getCurrentUser()
  权限: 检查用户是否有该视频的访问权限
  Body:
    {
      "last_position": number,
      "watch_duration_increment": number
    }

# 收藏操作
POST /api/user/favorites
DELETE /api/user/favorites/[id]

# 待复习卡片（支持语言筛选）
GET /api/user/cards-to-review
  认证: getCurrentUser()
  Query:
    - language: 'en' | 'fr' | ... (optional)
    - card_type: 'word' | 'phrase' | 'expression' (optional)
    - limit: number (default 20)

# ============================================
# 管理后台接口
# ============================================

# 视频管理
GET    /api/admin/videos
POST   /api/admin/videos
PUT    /api/admin/videos/[id]
DELETE /api/admin/videos/[id]

# 字幕管理
GET    /api/admin/videos/[id]/subtitles
POST   /api/admin/videos/[id]/subtitles
PUT    /api/admin/subtitles/[id]
DELETE /api/admin/subtitles/[id]

# 卡片管理
GET    /api/admin/videos/[id]/cards
POST   /api/admin/videos/[id]/cards/[cardType]
PUT    /api/admin/cards/[cardType]/[id]
DELETE /api/admin/cards/[cardType]/[id]

# 字幕-卡片关联
POST   /api/admin/subtitle-card-relations
DELETE /api/admin/subtitle-card-relations/[id]

# 套餐管理（核心）
GET    /api/admin/video-packages
POST   /api/admin/video-packages
PUT    /api/admin/video-packages/[id]
DELETE /api/admin/video-packages/[id]

# 套餐-视频关联管理
GET    /api/admin/video-packages/[id]/videos      # 获取套餐包含的视频
POST   /api/admin/video-packages/[id]/videos      # 添加视频到套餐
DELETE /api/admin/video-packages/[id]/videos/[videoId]  # 从套餐移除视频

# 批量关联视频到套餐
POST   /api/admin/video-packages/[id]/videos/batch
  Body: { "video_ids": ["uuid1", "uuid2", ...] }

# AI 生成卡片
POST   /api/admin/ai/generate-cards
  Body: { "video_id": "uuid", "subtitle_ids": ["uuid"] }
```

#### 3.3.4 权限检查逻辑

```typescript
// src/lib/video-permissions.ts

import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 检查用户是否有某个视频的访问权限
 * 通过 user_video_packages -> package_video_relations -> videos 链路查询
 */
export async function hasVideoAccess(
  userId: string,
  videoId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data } = await supabase
    .from('user_video_packages')
    .select(`
      id,
      package_id,
      expires_at,
      is_active,
      package_video_relations!inner(
        video_id
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('package_video_relations.video_id', videoId)
    .or('expires_at.is.null,expires_at.gt.now()')
    .single()

  return !!data
}

/**
 * 获取用户可访问的所有视频ID列表
 */
export async function getAccessibleVideoIds(userId: string): Promise<string[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('user_video_packages')
    .select(`
      package_id,
      expires_at,
      is_active,
      video_packages!inner(
        package_video_relations(
          video_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.now()')

  if (!data) return []

  const videoIds = new Set<string>()
  for (const item of data) {
    const relations = (item.video_packages as any).package_video_relations || []
    for (const rel of relations) {
      videoIds.add(rel.video_id)
    }
  }

  return Array.from(videoIds)
}

/**
 * 检查用户是否有任意视频套餐
 */
export async function hasAnyVideoPackage(userId: string): Promise<boolean> {
  const supabase = createClient()

  const { count } = await supabase
    .from('user_video_packages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.now()')

  return (count || 0) > 0
}
```

#### 3.3.5 核心流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        视频学习页核心流程                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  用户访问 /videos/[id]                                                       │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────┐                                                        │
│  │ 检查登录状态     │ ── getCurrentUser()                                    │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────┐                                    │
│  │ 检查视频访问权限                     │ ── hasVideoAccess(userId, videoId) │
│  │ (通过 user_video_packages 关联查询)  │                                    │
│  └────────┬────────────────────────────┘                                    │
│           │                                                                 │
│     ┌─────┴─────┐                                                           │
│     │           │                                                           │
│     ▼           ▼                                                           │
│  有权限      无权限                                                          │
│     │           │                                                           │
│     │           └──▶ 显示购买提示 + 相关套餐列表                              │
│     │                 "您还未购买该视频，以下套餐包含此视频："                   │
│     │                 [英语入门包 ¥49.9] [全语言通票 ¥99.9]                    │
│     │                                                                       │
│     ▼                                                                       │
│  ┌─────────────────┐                                                        │
│  │ 加载视频数据     │ ── GET /api/videos/[id]/full                          │
│  │ (含字幕+高亮)    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         渲染页面                                  │       │
│  │  ┌──────────────┐  ┌──────────────────────────────────────┐    │       │
│  │  │   视频播放器   │  │  Tab: [听] [说读] [写] [学]           │    │       │
│  │  │   <video>    │  │  ─────────────────────────────────── │    │       │
│  │  │              │  │  SubtitleList (带高亮词汇)             │    │       │
│  │  │              │  │  - 点击高亮词 → 弹出 CardPopover       │    │       │
│  │  └──────────────┘  │  - CardPopover 可播放 TTS (复用useTTS) │    │       │
│  │                    │  - 可标记掌握状态                       │    │       │
│  │                    └──────────────────────────────────────┘    │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  交互流程：                                                                  │
│  1. 视频播放 → 字幕自动滚动 + 高亮当前句                                      │
│  2. 点击字幕行 → 视频跳转到对应时间                                          │
│  3. 点击高亮词 → 弹出卡片详情                                                │
│  4. 切换 Tab → 切换右侧学习区域内容                                          │
│  5. 录音 → MediaRecorder API → 上传到 OSS                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.6 独立导航设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        视频模块独立导航                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  布局结构：                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [🎬 视频学习]     [首页] [复习] [收藏] [统计]              [👤]      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │                          页面内容                                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  导航项：                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  首页    → /videos              视频列表（可按语言筛选）               │   │
│  │  复习    → /video-flashcards    闪卡复习                             │   │
│  │  收藏    → /video-favorites     收藏管理                             │   │
│  │  统计    → /video-stats         学习统计                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  筛选器（首页）：                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  语言: [全部 ▼]  难度: [全部 ▼]  标签: [全部 ▼]      [继续学习] [待复习]│   │
│  │                                                                     │   │
│  │  语言下拉选项：全部 / 英语 / 法语 / 德语 / 西班牙语 / 日语...         │   │
│  │  （筛选的是视频列表，不是全局语言切换）                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  用户已购套餐显示（点击用户头像）：                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  我的套餐: [英语入门包] [法语包] [全语言通票]                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  移动端底部导航：                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │   🏠首页    🔄复习    ⭐收藏    📊统计    👤我的                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚠️ 注意：语言切换通过浏览不同语言的视频实现，不设置全局语言切换器             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.7 文件结构

```
src/
├── app/
│   ├── videos/
│   │   ├── layout.tsx                  # ⭐ 独立布局（不复用旧导航）
│   │   ├── page.tsx                    # 视频列表页（首页）
│   │   └── [id]/
│   │       └── page.tsx                # 视频学习页
│   │
│   ├── video-flashcards/
│   │   └── page.tsx                    # 闪卡复习页
│   │
│   ├── video-favorites/
│   │   └── page.tsx                    # 收藏页
│   │
│   ├── video-stats/
│   │   └── page.tsx                    # 学习统计页
│   │
│   ├── api/
│   │   ├── videos/
│   │   │   ├── route.ts                # GET 视频列表（支持语言筛选）
│   │   │   └── [id]/
│   │   │       ├── route.ts            # GET 视频详情
│   │   │       ├── access/
│   │   │       │   └── route.ts        # GET 检查访问权限
│   │   │       ├── full/
│   │   │       │   └── route.ts        # GET 完整数据（含字幕）
│   │   │       └── cards/
│   │   │           └── [cardType]/
│   │   │               └── [cardId]/
│   │   │                   └── route.ts # GET 卡片详情
│   │   │
│   │   ├── video-packages/             # ⭐ 套餐相关 API
│   │   │   └── route.ts                # GET 所有套餐列表
│   │   │
│   │   ├── card-progress/
│   │   │   └── route.ts                # POST 更新卡片状态
│   │   │
│   │   ├── recordings/
│   │   │   └── route.ts                # POST 上传录音
│   │   │
│   │   ├── user/
│   │   │   ├── video-progress/
│   │   │   │   └── [videoId]/
│   │   │   │       └── route.ts        # POST 观看进度
│   │   │   ├── video-packages/         # ⭐ 用户已购套餐
│   │   │   │   └── route.ts            # GET 用户套餐列表
│   │   │   ├── favorites/
│   │   │   │   └── route.ts            # GET/POST/DELETE 收藏
│   │   │   ├── video-stats/
│   │   │   │   └── route.ts            # GET 学习统计
│   │   │   └── cards-to-review/
│   │   │       └── route.ts            # GET 待复习卡片
│   │   │
│   │   └── admin/
│   │       ├── videos/
│   │       │   ├── route.ts            # GET/POST 视频列表
│   │       │   └── [id]/
│   │       │       └── route.ts        # GET/PUT/DELETE 视频
│   │       ├── video-packages/         # ⭐ 套餐管理
│   │       │   ├── route.ts            # GET/POST 套餐列表
│   │       │   └── [id]/
│   │       │       ├── route.ts        # GET/PUT/DELETE 套餐
│   │       │       └── videos/
│   │       │           ├── route.ts    # GET/POST 套餐-视频关联
│   │       │           └── batch/
│   │       │               └── route.ts # POST 批量关联
│   │       ├── video-tags/
│   │       │   └── route.ts            # 标签管理
│   │       ├── subtitles/
│   │       │   └── [id]/
│   │       │       └── route.ts        # 字幕管理
│   │       ├── cards/
│   │       │   └── [cardType]/
│   │       │       └── [id]/
│   │       │           └── route.ts    # 卡片管理
│   │       ├── subtitle-card-relations/
│   │       │   └── route.ts            # 关联管理
│   │       └── ai/
│   │           └── generate-cards/
│   │               └── route.ts        # ⭐ AI 生成（根据语言选择提示词）
│   │
│   └── admin/
│       └── videos/
│           ├── page.tsx                # 视频列表管理
│           ├── create/
│           │   └── page.tsx            # 创建视频（必须选择语言和套餐）
│           ├── packages/               # ⭐ 套餐管理页面
│           │   ├── page.tsx            # 套餐列表
│           │   ├── create/
│           │   │   └── page.tsx        # 创建套餐
│           │   └── [id]/
│           │       ├── page.tsx        # 编辑套餐
│           │       └── videos/
│           │           └── page.tsx    # 管理套餐视频
│           └── [id]/
│               ├── page.tsx            # 编辑视频
│               └── content/
│                   └── page.tsx        # 字幕/卡片管理
│
├── components/
│   └── video/
│       ├── layout/                     # ⭐ 独立导航组件
│       │   ├── VideoLayout.tsx         # 视频模块布局
│       │   ├── VideoNav.tsx            # 顶部导航栏
│       │   ├── VideoMobileNav.tsx      # 移动端底部导航
│       │   └── LanguageFilter.tsx      # 语言筛选器（筛选视频列表）
│       ├── VideoPlayer.tsx             # 视频播放器封装
│       ├── SubtitleList.tsx            # 字幕列表（含滚动同步）
│       ├── SubtitleWithHighlights.tsx  # 字幕高亮渲染
│       ├── CardPopover.tsx             # 卡片弹窗（复用 useTTS）
│       ├── RecordingPanel.tsx          # 录音面板
│       ├── WordCard.tsx                # 单词卡片组件
│       ├── PhraseCard.tsx              # 短语卡片组件
│       ├── ExpressionCard.tsx          # 地道表达卡片组件
│       ├── VideoCard.tsx               # 视频列表卡片
│       ├── FlashcardMode.tsx           # 闪卡复习模式
│       ├── LearningTabs.tsx            # 四模式Tab组件
│       ├── PackageCard.tsx             # ⭐ 套餐卡片组件
│       ├── AccessDenied.tsx            # ⭐ 无权限提示组件
│       └── UserPackages.tsx            # ⭐ 用户套餐展示组件
│
├── hooks/
│   ├── useVideoProgress.ts             # 视频进度管理
│   ├── useCardProgress.ts              # 卡片状态管理
│   ├── useRecordings.ts                # 录音功能
│   ├── useVideoFavorites.ts            # 收藏功能
│   ├── useVideoAccess.ts               # ⭐ 视频访问权限 hook
│   ├── useUserPackages.ts              # ⭐ 用户套餐 hook
│   └── useTTS.ts                       # 复用现有 TTS hook
│
├── lib/
│   ├── video-permissions.ts            # ⭐ 视频权限检查函数
│   ├── video-service.ts                # 视频业务逻辑
│   ├── card-service.ts                 # 卡片业务逻辑
│   ├── recording-service.ts            # 录音业务逻辑
│   ├── ai-prompts.ts                   # ⭐ AI 提示词加载（根据语言）
│   ├── oss.ts                          # 扩展 OSS 上传函数
│   └── sm2-algorithm.ts                # 艾宾浩斯 SM-2 算法
│
├── prompts/                            # ⭐ AI 提示词模板
│   ├── en-video-cards.md               # 英语视频卡片生成提示词
│   ├── fr-video-cards.md               # 法语视频卡片生成提示词
│   ├── de-video-cards.md               # 德语视频卡片生成提示词
│   ├── es-video-cards.md               # 西班牙语视频卡片生成提示词
│   ├── ja-video-cards.md               # 日语视频卡片生成提示词
│   ├── it-video-cards.md               # 意大利语视频卡片生成提示词
│   └── ru-video-cards.md               # 俄语视频卡片生成提示词
│
└── types/
    └── video.ts                        # 视频模块类型定义
```

#### 3.3.8 AI 提示词调用逻辑

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI 内容生成流程（两阶段）                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  步骤1：难度评估                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  输入：字幕文本 + 时间戳 + 语言                                        │   │
│  │  输出：难度等级（入门/进阶/难）+ 分析依据                               │   │
│  │                                                                     │   │
│  │  评估维度：                                                          │   │
│  │  ├─ 词汇难度（1-10分）                                               │   │
│  │  ├─ 语速（词/分钟）                                                  │   │
│  │  ├─ 句子复杂度（平均句长、语法）                                       │   │
│  │  └─ 习语密度                                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  步骤2：内容生成（根据难度选择策略）                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  输入：字幕文本 + 语言 + 难度等级                                      │   │
│  │  输出：单词 + 短语 + 地道表达 + 填空练习                                │   │
│  │                                                                     │   │
│  │  难度 → 选词策略：                                                    │   │
│  │  ├─ 入门 → 初高中词汇，简单填空（挖1词）                               │   │
│  │  ├─ 进阶 → 四六级词汇，中级填空（挖2-3词）                             │   │
│  │  └─ 难   → 高级词汇，整句听写                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 难度分级标准

| 等级 | 代码 | 对应水平 | 语速 | 填空策略 |
|------|------|---------|------|---------|
| 入门 | `beginner` | 初高中 | <120词/分钟 | 挖1个简单词 |
| 进阶 | `intermediate` | 四六级 | 120-160词/分钟 | 挖2-3个词 |
| 难 | `advanced` | 以上 | >160词/分钟 | 整句听写 |

### API 调用示例

```typescript
// 两阶段生成
// 1. 先评估难度
const difficulty = await analyzeVideoDifficulty(subtitles, language)
// 输出: { level: 'intermediate', confidence: 0.85, ... }

// 2. 根据难度生成内容
const content = await generateLearningContent(subtitles, {
  language: 'en',
  difficulty: difficulty.level,  // 使用评估出的难度
  videoTitle: '...',
  videoDescription: '...'
})
```

---

## 四、实现计划

### 4.1 任务拆分

| 序号 | 任务 | 复杂度 | 依赖 | 复用内容 |
|------|------|--------|------|---------|
| 1 | 创建数据库迁移文件（含套餐表） | 低 | 无 | 无 |
| 2 | 扩展 OSS 上传函数 | 低 | 无 | 现有 `oss.ts` |
| 3 | 创建类型定义 `types/video.ts` | 低 | 1 | 现有类型模式 |
| 4 | 实现权限检查函数 `video-permissions.ts` | 中 | 1,3 | 现有 Supabase |
| 5 | 实现视频套餐 API | 中 | 1,3,4 | 现有 API 模式 |
| 6 | 实现视频列表 API（含语言筛选） | 中 | 1,3,4 | 现有 API 模式 |
| 7 | 实现视频详情 API | 中 | 1,3,4 | 现有 API 模式 |
| 8 | 实现独立导航布局组件 | 中 | 无 | 复用 UI 风格 |
| 9 | 实现字幕高亮渲染组件 | 中 | 3 | 无 |
| 10 | 实现卡片弹窗组件 | 中 | 3,9 | `useTTS` hook |
| 11 | 实现视频播放页 | 中 | 6,7,8,9,10 | 现有页面模式 |
| 12 | 实现录音功能 | 中 | 2 | 现有 OSS 上传 |
| 13 | 实现闪卡复习页 | 中 | 3,10 | 现有闪卡模式 |
| 14 | 实现管理后台视频管理（含语言选择、必选套餐验证） | 中 | 6 | 现有管理后台 |
| 15 | 实现管理后台套餐管理 | 中 | 5,14 | 现有管理后台 |
| 16 | 实现管理后台字幕/卡片管理 | 中 | 14 | 现有管理后台 |
| 17 | ⭐ 编写各语言 AI 提示词模板（7个语言） | 高 | 无 | 无 |
| 18 | ⭐ 实现 AI 生成卡片（根据语言选择提示词） | 高 | 16,17 | 无 |
| 19 | 邀请码激活套餐关联（复用现有邀请码系统） | 中 | 5,15 | 现有邀请码逻辑 |

### 4.2 关键里程碑

- **Milestone 1**: 基础设施就绪（数据库 + 权限 + OSS + 类型）
- **Milestone 2**: 套餐系统可用（套餐管理 + 权限检查）
- **Milestone 3**: 视频播放 + 字幕展示可用
- **Milestone 4**: 完整学习功能（卡片 + 录音 + 复习）
- **Milestone 5**: 管理后台可用（含语言选择、套餐必选验证）
- **Milestone 6**: AI 生成功能上线（各语言提示词就绪）
- **Milestone 7**: 售卖闭环（邀请码激活套餐）

---

## 五、风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 视频文件过大导致加载慢 | 中 | 高 | 压缩视频、建议管理员控制文件大小 |
| 录音功能浏览器兼容性 | 低 | 中 | 使用 MediaRecorder API + polyfill |
| 字幕时间戳精度问题 | 中 | 中 | 管理后台可手动调整 |
| AI 生成卡片质量不稳定 | 高 | 中 | 人工审核流程 |
| 套餐-视频关联复杂度高 | 中 | 高 | 使用关联表 + 缓存用户权限 |
| 多语言内容管理复杂 | 中 | 中 | 按语言分Tab管理 |
| 邀请码激活套餐逻辑复杂 | 中 | 高 | 复用现有邀请码系统，扩展 video_package_id |

---

## 六、测试策略

### 6.1 单元测试

- SM-2 算法正确性
- 字幕高亮位置计算
- 权限检查函数（hasVideoAccess）
- 套餐-视频关联查询

### 6.2 集成测试

- API 端到端测试
- 视频上传 + 播放流程
- 录音上传流程
- 套餐购买 + 权限激活流程

### 6.3 边界测试

- 空字幕处理
- 超长视频处理
- 并发录音上传
- 套餐过期边界
- 多语言切换

---

## 七、回滚方案

### 7.1 数据库回滚

```sql
-- 回滚迁移（按依赖顺序删除）
DROP TABLE IF EXISTS video_learning_calendar;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS user_recordings;
DROP TABLE IF EXISTS user_card_progress;
DROP TABLE IF EXISTS user_video_progress;
DROP TABLE IF EXISTS subtitle_card_relations;
DROP TABLE IF EXISTS video_expression_cards;
DROP TABLE IF EXISTS video_phrase_cards;
DROP TABLE IF EXISTS video_word_cards;
DROP TABLE IF EXISTS video_subtitles;
DROP TABLE IF EXISTS video_tag_relations;
DROP TABLE IF EXISTS video_tags;
DROP TABLE IF EXISTS package_video_relations;
DROP TABLE IF EXISTS user_video_packages;
DROP TABLE IF EXISTS video_packages;
DROP TABLE IF EXISTS videos;
```

### 7.2 代码回滚

删除以下目录/文件：
- `src/app/videos/`（整个目录）
- `src/app/video-flashcards/`
- `src/app/video-favorites/`
- `src/app/video-stats/`
- `src/app/api/videos/`
- `src/app/api/video-packages/`
- `src/app/api/card-progress/`
- `src/app/api/recordings/`
- `src/app/api/user/video-progress/`
- `src/app/api/user/video-packages/`
- `src/app/admin/videos/`
- `src/components/video/`（整个目录）
- `src/hooks/useVideo*.ts`
- `src/hooks/useUserPackages.ts`
- `src/lib/video-*.ts`
- `src/types/video.ts`

### 7.3 Feature Flag（可选）

```typescript
// 环境变量控制
const ENABLE_VIDEO_MODULE = process.env.ENABLE_VIDEO_MODULE === 'true'

if (!ENABLE_VIDEO_MODULE) {
  return NextResponse.json({ error: '功能暂未开放' }, { status: 503 })
}
```

---

## 八、复用现有系统清单

| 现有系统 | 复用方式 | 文件路径 |
|---------|---------|---------|
| 用户认证 | 直接调用 `getCurrentUser()` | `src/lib/supabase/server.ts` |
| Supabase 客户端 | 直接调用 `createClient()` | `src/lib/supabase/server.ts` |
| TTS 发音 | 直接调用 `useTTS` hook | `src/hooks/use-tts.ts` |
| OSS 存储 | 扩展上传函数 | `src/lib/oss.ts` |
| 管理后台布局 | 复用布局结构 | `src/app/admin/layout.tsx` |
| 管理员认证 | 直接调用 `requireAdminForAPI()` | `src/lib/admin-auth.ts` |
| API 响应格式 | 统一 `{ success, data, error }` | 现有 API 模式 |
| 语言类型 | 复用 `SupportedLanguage` | `src/types/word.ts` |
| UI 组件风格 | 复用 Tailwind + 现有组件风格 | 现有组件 |

### 不复用的部分（独立设计）

| 模块 | 原因 |
|------|------|
| 前台导航 | 视频模块独立售卖，需要独立导航入口 |
| 权限检查逻辑 | 使用套餐-视频关联模型，不是简单的功能权限 |
| 套餐系统 | 新建 video_packages 表，与词书套餐独立 |

---

## 九、邀请码激活套餐关联设计

复用现有 `invitation_codes` 表，扩展关联：

```sql
-- 方案1：在 invitation_codes 表添加 video_package_id 字段
ALTER TABLE invitation_codes
ADD COLUMN video_package_id UUID REFERENCES video_packages(id);

-- 方案2：在 invitation_packages 表添加 video_package_id 字段
ALTER TABLE invitation_packages
ADD COLUMN video_package_id UUID REFERENCES video_packages(id);
```

激活流程：
1. 用户输入邀请码
2. 系统检查邀请码关联的 `invitation_package`
3. 如果 `video_package_id` 存在，在 `user_video_packages` 表创建记录
4. 用户获得对应视频套餐的访问权限

---

## 确认

请确认以上设计方案是否满足需求：

- [ ] 需求理解正确
  - [ ] 多语言支持（一个视频一个语言，上传时指定）
  - [ ] 套餐-视频关联模型
  - [ ] 独立导航系统
  - [ ] 语言对应的 AI 提示词
  - [ ] 上传视频必须关联套餐
- [ ] 方案选择合理（最大化复用现有系统）
- [ ] 数据模型完整（含套餐表、关联表）
- [ ] 权限检查逻辑清晰
- [ ] AI 提示词语言对应规则明确
- [ ] 实现计划可行

确认后我将开始实现。

---

> **文档版本**: v4.0
> **最后更新**: 2026-03-17

**相关文档**：
- [产品需求文档](./VIDEO_MODULE_PRD.md)
- [AI 内容生成 Prompt](./CONTENT_GENERATION_PROMPT.md)
