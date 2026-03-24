# 批量上传视频技术方案

> 文档版本: 1.0
> 创建日期: 2026-03-22
> 基于 /wizard 8 阶段方法论
> 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md v1.1

---

## 目录

1. [Phase 1: 复杂度评估与任务清单](#phase-1-复杂度评估与任务清单)
2. [Phase 2: 代码验证与依赖分析](#phase-2-代码验证与依赖分析)
3. [Phase 3: 测试策略](#phase-3-测试策略)
4. [Phase 4: 最小实现方案](#phase-4-最小实现方案)
5. [Phase 5: 回归风险评估](#phase-5-回归风险评估)
6. [Phase 6: 文档更新计划](#phase-6-文档更新计划)
7. [Phase 7: 安全与边界审查](#phase-7-安全与边界审查)
8. [Phase 8: 质量门禁](#phase-8-质量门禁)

---

## Phase 1: 复杂度评估与任务清单

### 1.1 复杂度评估

**评级: 复杂 (Complex)**

| 维度 | 评估 | 说明 |
|------|------|------|
| 文件数量 | 7+ 文件 | 新增 API、页面、类型定义、迁移文件 |
| 架构影响 | 中等 | 复用现有工作流，但需扩展数据模型 |
| 并发考虑 | 有 | 批量上传需处理多个视频的并发解析 |
| 数据一致性 | 高 | 多表事务操作 |

### 1.2 任务清单

```
[ ] 1. 数据库迁移
    [ ] 1.1 创建 video_grammar_points 表
    [ ] 1.2 创建 video_pronunciation_tips 表
    [ ] 1.3 创建 video_vocabulary_networks 表
    [ ] 1.4 添加 RLS 策略

[ ] 2. 类型定义
    [ ] 2.1 添加 VideoGrammarPoint 类型
    [ ] 2.2 添加 VideoPronunciationTip 类型
    [ ] 2.3 添加 VideoVocabularyNetwork 类型
    [ ] 2.4 添加 BatchUploadRequest/Response 类型

[ ] 3. API 实现
    [ ] 3.1 POST /api/admin/videos/batch-upload
    [ ] 3.2 时间格式转换工具函数
    [ ] 3.3 单词例句匹配函数
    [ ] 3.4 批量数据处理逻辑

[ ] 4. 后台页面
    [ ] 4.1 批量上传页面组件
    [ ] 4.2 视频输入行组件
    [ ] 4.3 上传进度显示
    [ ] 4.4 错误处理与重试

[ ] 5. 用户端学习模块
    [ ] 5.1 学习模块 Tab 入口
    [ ] 5.2 语法点 Tab 组件
    [ ] 5.3 发音要点 Tab 组件
    [ ] 5.4 词汇网络 Tab 组件

[ ] 6. 测试
    [ ] 6.1 API 单元测试
    [ ] 6.2 时间转换函数测试
    [ ] 6.3 集成测试
```

### 1.3 预计文件变更

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `supabase/migrations/20260322_batch_upload_tables.sql` | 新增 | 数据库迁移 |
| `src/types/video.ts` | 修改 | 添加新类型定义 |
| `src/app/api/admin/videos/batch-upload/route.ts` | 新增 | 批量上传 API |
| `src/lib/batch-upload/utils.ts` | 新增 | 工具函数 |
| `src/app/admin/videos/batch-upload/page.tsx` | 新增 | 页面入口 |
| `src/app/admin/videos/batch-upload/pageClient.tsx` | 新增 | 页面组件 |
| `src/components/video/learning/LearningTabs.tsx` | 新增 | 学习模块 Tab |
| `src/components/video/learning/GrammarPoints.tsx` | 新增 | 语法点组件 |
| `src/components/video/learning/PronunciationTips.tsx` | 新增 | 发音要点组件 |
| `src/components/video/learning/VocabularyNetwork.tsx` | 新增 | 词汇网络组件 |

---

## Phase 2: 代码验证与依赖分析

### 2.1 已验证的现有代码

| 模块 | 文件 | 状态 | 说明 |
|------|------|------|------|
| 视频类型 | `src/types/video.ts` | ✅ 已验证 | Video, VideoWordCard, VideoExpressionCard 等类型完整 |
| 词典服务 | `src/lib/dictionary/index.ts` | ✅ 已验证 | `lookupBatch()` 支持 batch 查询 |
| 视频管理页 | `src/app/admin/videos/pageClient.tsx` | ✅ 已验证 | 可添加批量上传入口 |
| 生成卡片 API | `src/app/api/admin/videos/[id]/generate-cards/route.ts` | ✅ 已验证 | 可参考其数据处理模式 |
| 数据库迁移 | `supabase/migrations/20260317_create_video_learning_module.sql` | ✅ 已验证 | 表结构清晰，可扩展 |

### 2.2 需要复用的函数

```typescript
// src/lib/workflow-helper.ts
export async function completeStep(
  supabase: SupabaseClient,
  videoId: string,
  step: WorkflowStepKey
): Promise<void>

// src/lib/dictionary/index.ts
export async function lookupBatch(
  words: string[],
  lang: DictionaryLanguage,
  options?: { skipCache?: boolean; targetLang?: string }
): Promise<UnifiedDictEntry[]>

// src/lib/admin-auth.ts
export async function checkAdminForAPI(): Promise<AdminCheckResult>
```

### 2.3 需要新建的工具函数

```typescript
// src/lib/batch-upload/utils.ts

/**
 * 时间字符串转秒数
 * "00:00:00.320" → 0.32
 */
export function timeStringToSeconds(timeStr: string): number

/**
 * 秒数转时间字符串
 * 0.32 → "00:00:00.320"
 */
export function secondsToTimeString(seconds: number): string

/**
 * CEFR 等级转系统难度
 * A1/A2 → beginner, B1/B2 → intermediate, C1/C2 → advanced
 */
export function cefrToDifficulty(cefr: string): VideoDifficulty

/**
 * 从字幕中查找包含指定单词的例句
 */
export function findWordInSubtitles(
  word: string,
  subtitles: Array<{ original_text: string; chinese_text: string | null }>
): { original: string; translation: string | null } | null

/**
 * 解析并验证字幕 JSON
 */
export function parseSubtitleJson(json: unknown): ParsedSubtitleData | ValidationError

/**
 * 解析并验证学习材料 JSON
 */
export function parseLearningMaterialJson(json: unknown): ParsedLearningData | ValidationError
```

---

## Phase 3: 测试策略

### 3.1 单元测试

#### 时间转换函数测试

```typescript
// __tests__/lib/batch-upload/utils.test.ts

describe('timeStringToSeconds', () => {
  it('should convert "00:00:00.320" to 0.32', () => {
    expect(timeStringToSeconds('00:00:00.320')).toBe(0.32)
  })

  it('should convert "00:05:58.950" to 358.95', () => {
    expect(timeStringToSeconds('00:05:58.950')).toBe(358.95)
  })

  it('should handle null/empty input', () => {
    expect(timeStringToSeconds('')).toBe(0)
    expect(timeStringToSeconds(null as any)).toBe(0)
  })

  it('should handle invalid format', () => {
    expect(timeStringToSeconds('invalid')).toBe(0)
  })
})

describe('cefrToDifficulty', () => {
  it('should map A1/A2 to beginner', () => {
    expect(cefrToDifficulty('A1')).toBe('beginner')
    expect(cefrToDifficulty('A2')).toBe('beginner')
  })

  it('should map B1/B2 to intermediate', () => {
    expect(cefrToDifficulty('B1')).toBe('intermediate')
    expect(cefrToDifficulty('B2')).toBe('intermediate')
  })

  it('should map C1/C2 to advanced', () => {
    expect(cefrToDifficulty('C1')).toBe('advanced')
    expect(cefrToDifficulty('C2')).toBe('advanced')
  })

  it('should default to beginner for unknown', () => {
    expect(cefrToDifficulty('X1')).toBe('beginner')
  })
})
```

#### 例句匹配函数测试

```typescript
describe('findWordInSubtitles', () => {
  const subtitles = [
    { original_text: "C'est vrai, c'est vrai que...", chinese_text: '这是真的...' },
    { original_text: "Tu es prêt ?", chinese_text: '你准备好了吗？' },
  ]

  it('should find word in subtitles', () => {
    const result = findWordInSubtitles('est', subtitles)
    expect(result).not.toBeNull()
    expect(result?.original).toContain('est')
  })

  it('should return null if word not found', () => {
    const result = findWordInSubtitles('nonexistent', subtitles)
    expect(result).toBeNull()
  })

  it('should handle empty subtitles array', () => {
    const result = findWordInSubtitles('est', [])
    expect(result).toBeNull()
  })
})
```

### 3.2 API 集成测试

```typescript
// __tests__/api/admin/videos/batch-upload.test.ts

describe('POST /api/admin/videos/batch-upload', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await fetch('/api/admin/videos/batch-upload', {
      method: 'POST',
      body: JSON.stringify({ videos: [] }),
    })
    expect(res.status).toBe(401)
  })

  it('should validate required fields', async () => {
    const res = await fetchAsAdmin('/api/admin/videos/batch-upload', {
      method: 'POST',
      body: JSON.stringify({
        videos: [{ subtitle_json: {} }] // 缺少 learning_material_json
      }),
    })
    expect(res.status).toBe(400)
  })

  it('should create video with subtitles and cards', async () => {
    const res = await fetchAsAdmin('/api/admin/videos/batch-upload', {
      method: 'POST',
      body: JSON.stringify({
        videos: [
          {
            subtitle_json: validSubtitleJson,
            learning_material_json: validLearningJson,
            video_url: 'https://example.com/video.mp4',
          }
        ]
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.created_count).toBe(1)
    expect(data.data.videos[0].subtitles_count).toBeGreaterThan(0)
  })

  it('should handle partial failures gracefully', async () => {
    const res = await fetchAsAdmin('/api/admin/videos/batch-upload', {
      method: 'POST',
      body: JSON.stringify({
        videos: [
          { subtitle_json: validJson, learning_material_json: validJson, video_url: 'https://...' },
          { subtitle_json: invalidJson, learning_material_json: {}, video_url: '' }, // 这条会失败
        ]
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.created_count).toBe(1)
    expect(data.data.errors.length).toBe(1)
  })
})
```

---

## Phase 4: 最小实现方案

### 4.1 数据库迁移

```sql
-- supabase/migrations/20260322_batch_upload_tables.sql

-- ============================================
-- Part 1: 语法点表
-- ============================================

CREATE TABLE IF NOT EXISTS video_grammar_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  structure TEXT,
  example_french TEXT,
  example_chinese TEXT,
  example_ipa VARCHAR(100),
  purpose TEXT,
  note TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_grammar_points IS '视频语法点';
CREATE INDEX IF NOT EXISTS idx_grammar_points_video ON video_grammar_points(video_id);

-- ============================================
-- Part 2: 发音要点表
-- ============================================

CREATE TABLE IF NOT EXISTS video_pronunciation_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  sound_symbol VARCHAR(50) NOT NULL,
  example_words TEXT[],
  instruction TEXT,
  practice_tip TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_pronunciation_tips IS '视频发音要点';
CREATE INDEX IF NOT EXISTS idx_pronunciation_tips_video ON video_pronunciation_tips(video_id);

-- ============================================
-- Part 3: 词汇网络表
-- ============================================

CREATE TABLE IF NOT EXISTS video_vocabulary_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(255),
  structure TEXT,
  related_words TEXT[],
  collocations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_vocabulary_networks IS '视频词汇网络';
CREATE INDEX IF NOT EXISTS idx_vocabulary_networks_video ON video_vocabulary_networks(video_id);

-- ============================================
-- Part 4: RLS 策略
-- ============================================

ALTER TABLE video_grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_pronunciation_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_vocabulary_networks ENABLE ROW LEVEL SECURITY;

-- 用户读取策略（需要套餐权限）
CREATE POLICY "用户读取已购套餐的语法点" ON video_grammar_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_grammar_points.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的发音要点" ON video_pronunciation_tips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_pronunciation_tips.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的词汇网络" ON video_vocabulary_networks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_vocabulary_networks.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

-- service_role 完全访问
CREATE POLICY "service_role 完全访问" ON video_grammar_points FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_pronunciation_tips FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_vocabulary_networks FOR ALL TO service_role USING (true);
```

### 4.2 类型定义

```typescript
// src/types/video.ts 追加

// ============================================
// 批量上传相关类型
// ============================================

export interface VideoGrammarPoint {
  id: string
  video_id: string
  name: string
  structure: string | null
  example_french: string | null
  example_chinese: string | null
  example_ipa: string | null
  purpose: string | null
  note: string | null
  display_order: number
  created_at: string
}

export interface VideoPronunciationTip {
  id: string
  video_id: string
  sound_symbol: string
  example_words: string[] | null
  instruction: string | null
  practice_tip: string | null
  display_order: number
  created_at: string
}

export interface VideoVocabularyNetwork {
  id: string
  video_id: string
  theme: string | null
  structure: string | null
  related_words: string[] | null
  collocations: string | null
  created_at: string
}

// API 请求类型
export interface BatchUploadVideoItem {
  subtitle_json: SubtitleJsonInput
  learning_material_json: LearningMaterialJsonInput
  video_url: string
}

export interface BatchUploadRequest {
  videos: BatchUploadVideoItem[]
}

export interface BatchUploadResult {
  id: string
  title: string
  subtitles_count: number
  words_count: number
  expressions_count: number
  grammar_points_count: number
  pronunciation_tips_count: number
  status: VideoStatus
}

export interface BatchUploadResponse {
  success: boolean
  data: {
    created_count: number
    videos: BatchUploadResult[]
    errors: Array<{
      index: number
      error: string
    }>
  }
}

// 输入 JSON 类型
export interface SubtitleJsonInput {
  unit_info: {
    unit_num: number
    theme: string
    start_time: string
    end_time: string
    subtitle_count: number
  }
  subtitles: Array<{
    index: number
    start_time: string
    end_time: string
    french: string
    chinese: string
  }>
}

export interface LearningMaterialJsonInput {
  unit_info: {
    unit_num: number
    theme: string
    start_time: string
    end_time: string
    duration_minutes: number
    cefr_level: string
  }
  language_analysis: {
    vocabulary: Array<{
      french: string
      part_of_speech: string
      ipa: string
      chinese: string
      first_appearance: string
      occurrence_count: number
      cefr_level: string
    }>
    key_expressions: Array<{
      expression: string
      ipa: string
      chinese: string
      cefr_level: string
      grammar_usage: string
      example: {
        french: string
        chinese: string
      }
    }>
  }
  deep_learning: {
    grammar_points: Array<{
      name: string
      structure: string
      example: {
        french: string
        chinese: string
        ipa: string
      }
      purpose: string
      note: string
    }>
    pronunciation: {
      key_sounds: Array<{
        sound: string
        example_words: string[]
        instruction: string
        practice_tip: string
      }>
    }
    vocabulary_network: {
      theme: string
      structure: string
    }
  }
}
```

### 4.3 工具函数实现

```typescript
// src/lib/batch-upload/utils.ts

import type { VideoDifficulty } from '@/types/video'

/** 时间格式正则：HH:MM:SS.mmm */
const TIME_REGEX = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/

/**
 * 时间字符串转秒数
 * @example "00:00:00.320" → 0.32
 */
export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0

  const match = timeStr.match(TIME_REGEX)
  if (!match) return 0

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const seconds = parseInt(match[3], 10)
  const milliseconds = parseInt(match[4], 10)

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

/**
 * CEFR 等级转系统难度
 */
export function cefrToDifficulty(cefr: string): VideoDifficulty {
  const level = cefr?.toUpperCase()?.charAt(0)
  switch (level) {
    case 'A':
      return 'beginner'
    case 'B':
      return 'intermediate'
    case 'C':
      return 'advanced'
    default:
      return 'beginner'
  }
}

/**
 * CEFR 等级转数字（1-6）
 */
export function cefrToNumber(cefr: string): number {
  const map: Record<string, number> = {
    A1: 1, A2: 2,
    B1: 3, B2: 4,
    C1: 5, C2: 6,
  }
  return map[cefr?.toUpperCase()] || 1
}

/**
 * 从字幕中查找包含指定单词的例句（不区分大小写）
 */
export function findWordInSubtitles(
  word: string,
  subtitles: Array<{ original_text: string; chinese_text: string | null }>
): { original: string; translation: string | null } | null {
  if (!word || !subtitles?.length) return null

  const wordLower = word.toLowerCase()

  for (const subtitle of subtitles) {
    const textLower = subtitle.original_text.toLowerCase()
    // 使用单词边界匹配
    const regex = new RegExp(`\\b${escapeRegex(wordLower)}\\b`, 'i')
    if (regex.test(textLower)) {
      return {
        original: subtitle.original_text,
        translation: subtitle.chinese_text,
      }
    }
  }

  return null
}

/** 转义正则特殊字符 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 去重数组
 */
export function uniqueArray<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set()
  return arr.filter(item => {
    const k = item[key]
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
```

### 4.4 批量上传 API 核心实现

```typescript
// src/app/api/admin/videos/batch-upload/route.ts

export const maxDuration = 60

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import { lookupBatch } from '@/lib/dictionary'
import { completeStep } from '@/lib/workflow-helper'
import {
  timeStringToSeconds,
  cefrToDifficulty,
  cefrToNumber,
  findWordInSubtitles,
  uniqueArray,
} from '@/lib/batch-upload/utils'
import type {
  BatchUploadRequest,
  BatchUploadResponse,
  BatchUploadResult,
  SubtitleJsonInput,
  LearningMaterialJsonInput,
} from '@/types/video'

export async function POST(request: Request) {
  try {
    // 1. 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const body: BatchUploadRequest = await request.json()
    const { videos } = body

    if (!videos?.length) {
      return NextResponse.json(
        { error: '请提供至少一个视频' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const results: BatchUploadResult[] = []
    const errors: Array<{ index: number; error: string }> = []

    // 2. 逐个处理视频（串行以避免资源竞争）
    for (let i = 0; i < videos.length; i++) {
      try {
        const item = videos[i]
        const result = await processSingleVideo(supabase, item, i)
        results.push(result)
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      data: {
        created_count: results.length,
        videos: results,
        errors,
      },
    } as BatchUploadResponse)

  } catch (error) {
    console.error('[批量上传] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * 处理单个视频上传
 */
async function processSingleVideo(
  supabase: ReturnType<typeof createAdminClient>,
  item: { subtitle_json: SubtitleJsonInput; learning_material_json: LearningMaterialJsonInput; video_url: string },
  index: number
): Promise<BatchUploadResult> {
  const { subtitle_json, learning_material_json, video_url } = item

  // 验证必要字段
  if (!subtitle_json?.unit_info?.theme) {
    throw new Error('缺少字幕 unit_info.theme')
  }
  if (!learning_material_json?.unit_info) {
    throw new Error('缺少学习材料 unit_info')
  }

  const unitInfo = subtitle_json.unit_info
  const learningInfo = learning_material_json.unit_info

  // Step 1: 创建视频记录
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      title: unitInfo.theme,
      language: 'fr', // 固定法语
      difficulty: cefrToDifficulty(learningInfo.cefr_level),
      duration: Math.round(learningInfo.duration_minutes * 60),
      video_url: video_url || null,
      status: 'draft',
    })
    .select()
    .single()

  if (videoError || !video) {
    throw new Error(`创建视频失败: ${videoError?.message}`)
  }

  const videoId = video.id

  // Step 2: 存储字幕
  const subtitlesData = subtitle_json.subtitles.map((sub, idx) => ({
    video_id: videoId,
    start_time: timeStringToSeconds(sub.start_time),
    end_time: timeStringToSeconds(sub.end_time),
    original_text: sub.french,
    chinese_text: sub.chinese,
    word_count: sub.french.split(/\s+/).length,
    display_order: idx,
  }))

  const { error: subtitlesError } = await supabase
    .from('video_subtitles')
    .insert(subtitlesData)

  if (subtitlesError) {
    throw new Error(`存储字幕失败: ${subtitlesError.message}`)
  }

  // 获取字幕用于例句匹配
  const { data: savedSubtitles } = await supabase
    .from('video_subtitles')
    .select('original_text, chinese_text')
    .eq('video_id', videoId)
    .order('display_order')

  // Step 3: 处理单词
  const vocabulary = learning_material_json.language_analysis?.vocabulary || []
  const uniqueWords = uniqueArray(vocabulary, 'french')

  let wordsCount = 0
  if (uniqueWords.length > 0) {
    // 调用词典服务批量查询
    const words = uniqueWords.map(v => v.french)
    const dictResults = await lookupBatch(words, 'fr')

    const wordCards = uniqueWords.map((v, idx) => {
      const dictResult = dictResults[idx]
      const example = findWordInSubtitles(v.french, savedSubtitles || [])

      return {
        video_id: videoId,
        word: v.french,
        phonetic: dictResult?.phonetic || v.ipa || null,
        part_of_speech: dictResult?.partOfSpeech || v.part_of_speech || null,
        chinese_definition: dictResult?.chineseDefinition || v.chinese || '',
        example_from_video: example?.original || null,
        example_translation: example?.translation || null,
        difficulty_level: cefrToNumber(v.cefr_level),
        display_order: idx,
      }
    })

    const { error: wordsError } = await supabase
      .from('video_word_cards')
      .insert(wordCards)

    if (!wordsError) {
      wordsCount = wordCards.length
    }
  }

  // Step 4: 处理地道表达
  const expressions = learning_material_json.language_analysis?.key_expressions || []
  let expressionsCount = 0

  if (expressions.length > 0) {
    const expressionCards = expressions.map((expr, idx) => ({
      video_id: videoId,
      expression: expr.expression,
      context: expr.example?.french || '',
      context_translation: expr.example?.chinese || null,
      formula: expr.grammar_usage || null,
      meaning: expr.chinese || null,
      examples: [{ original: expr.example?.french, cn: expr.example?.chinese }],
      difficulty_level: cefrToNumber(expr.cefr_level),
      display_order: idx,
    }))

    const { error: exprError } = await supabase
      .from('video_expression_cards')
      .insert(expressionCards)

    if (!exprError) {
      expressionsCount = expressionCards.length
    }
  }

  // Step 5: 处理语法点
  const grammarPoints = learning_material_json.deep_learning?.grammar_points || []
  let grammarCount = 0

  if (grammarPoints.length > 0) {
    const grammarCards = grammarPoints.map((gp, idx) => ({
      video_id: videoId,
      name: gp.name,
      structure: gp.structure || null,
      example_french: gp.example?.french || null,
      example_chinese: gp.example?.chinese || null,
      example_ipa: gp.example?.ipa || null,
      purpose: gp.purpose || null,
      note: gp.note || null,
      display_order: idx,
    }))

    const { error: grammarError } = await supabase
      .from('video_grammar_points')
      .insert(grammarCards)

    if (!grammarError) {
      grammarCount = grammarCards.length
    }
  }

  // Step 6: 处理发音要点
  const pronunciationTips = learning_material_json.deep_learning?.pronunciation?.key_sounds || []
  let pronunciationCount = 0

  if (pronunciationTips.length > 0) {
    const pronunciationCards = pronunciationTips.map((pt, idx) => ({
      video_id: videoId,
      sound_symbol: pt.sound,
      example_words: pt.example_words || [],
      instruction: pt.instruction || null,
      practice_tip: pt.practice_tip || null,
      display_order: idx,
    }))

    const { error: pronError } = await supabase
      .from('video_pronunciation_tips')
      .insert(pronunciationCards)

    if (!pronError) {
      pronunciationCount = pronunciationCards.length
    }
  }

  // Step 7: 处理词汇网络
  const vocabNetwork = learning_material_json.deep_learning?.vocabulary_network
  if (vocabNetwork) {
    await supabase
      .from('video_vocabulary_networks')
      .insert({
        video_id: videoId,
        theme: vocabNetwork.theme || null,
        structure: vocabNetwork.structure || null,
      })
  }

  // Step 8: 更新工作流状态
  await completeStep(supabase, videoId, 'subtitles')
  await completeStep(supabase, videoId, 'cards')

  return {
    id: videoId,
    title: video.title,
    subtitles_count: subtitlesData.length,
    words_count: wordsCount,
    expressions_count: expressionsCount,
    grammar_points_count: grammarCount,
    pronunciation_tips_count: pronunciationCount,
    status: 'draft',
  }
}
```

---

## Phase 5: 回归风险评估

### 5.1 影响范围

| 模块 | 风险等级 | 说明 |
|------|----------|------|
| 视频管理列表 | 低 | 仅添加入口按钮 |
| 现有视频 API | 无 | 完全独立的新 API |
| 词典服务 | 低 | 复用现有 `lookupBatch` |
| 工作流系统 | 低 | 使用现有 `completeStep` |

### 5.2 需要回归测试的场景

1. **视频列表页**：确保新按钮不影响现有布局
2. **单个视频详情页**：确保新学习 Tab 不影响现有 Tab
3. **权限控制**：确保新表 RLS 策略正确
4. **词典服务**：确保批量调用不会超时

### 5.3 兼容性检查

- [ ] 新表字段向后兼容
- [ ] 新 API 不影响现有 API
- [ ] 前端组件支持空数据状态

---

## Phase 6: 文档更新计划

### 6.1 需要更新的文档

| 文档 | 更新内容 |
|------|----------|
| `docs/VIDEO_MODULE_TECH.md` | 添加新表说明 |
| `src/types/video.ts` | 添加类型注释 |
| `README.md` | 添加批量上传功能说明 |

### 6.2 代码注释规范

```typescript
/**
 * 批量上传视频 API
 *
 * 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md Section 3
 *
 * 处理流程:
 * 1. 验证管理员权限
 * 2. 解析字幕 JSON 和学习材料 JSON
 * 3. 创建视频记录
 * 4. 存储字幕数据
 * 5. 调用词典服务处理单词
 * 6. 存储地道表达
 * 7. 存储语法点、发音要点、词汇网络
 * 8. 更新工作流状态
 *
 * @param videos - 视频数据数组
 * @returns 创建结果
 */
```

---

## Phase 7: 安全与边界审查

### 7.1 输入验证

```typescript
// 必须验证的字段
const VALIDATION_RULES = {
  'subtitle_json.unit_info.theme': { required: true, maxLength: 255 },
  'subtitle_json.subtitles': { required: true, maxItems: 1000 },
  'learning_material_json.unit_info.cefr_level': { enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
  'video_url': { format: 'url', maxLength: 2048 },
}
```

### 7.2 并发处理

- **问题**: 同时上传多个视频可能导致数据库连接耗尽
- **方案**: 串行处理，每次只处理一个视频

### 7.3 错误边界

```typescript
// 错误处理清单
const ERROR_HANDLING = [
  'JSON 解析失败 → 返回 400',
  '数据库连接失败 → 返回 503',
  '词典服务超时 → 使用原始数据降级',
  '部分视频失败 → 记录错误，继续处理其他',
  '所有视频失败 → 返回 500 + 错误详情',
]
```

### 7.4 资源限制

| 资源 | 限制 | 处理方式 |
|------|------|----------|
| 单次上传视频数 | 10 个 | 超出返回 400 |
| 字幕条数 | 1000 条/视频 | 超出截断 |
| 单词数 | 100 个/视频 | 超出截断 |
| API 超时 | 60 秒 | Vercel Pro 限制 |

### 7.5 数据一致性

- **问题**: 创建视频成功但插入字幕失败
- **方案**: 使用数据库事务（Supabase 支持）

---

## Phase 8: 质量门禁

### 8.1 PR 检查清单

- [ ] 所有测试通过
- [ ] TypeScript 无错误
- [ ] ESLint 无警告
- [ ] 新代码有注释
- [ ] 更新相关文档
- [ ] 无安全漏洞

### 8.2 部署前验证

1. **本地测试**
   ```bash
   npm run test
   npm run build
   npm run lint
   ```

2. **数据库迁移**
   ```bash
   npx supabase db push
   ```

3. **功能验证**
   - [ ] 批量上传 3 个视频成功
   - [ ] 字幕正确显示
   - [ ] 单词卡片正确生成
   - [ ] 语法点/发音要点正确存储
   - [ ] 用户端正确展示

### 8.3 监控指标

| 指标 | 阈值 | 告警 |
|------|------|------|
| API 响应时间 | < 30s | 超时告警 |
| 错误率 | < 5% | 错误告警 |
| 词典查询成功率 | > 90% | 降级告警 |

---

## 附录

### A. 相关文件索引

| 文件 | 用途 |
|------|------|
| `docs/VIDEO_BATCH_UPLOAD_PRD.md` | 需求文档 |
| `docs/VIDEO_MODULE_TECH.md` | 视频模块技术文档 |
| `src/types/video.ts` | 类型定义 |
| `src/lib/dictionary/index.ts` | 词典服务 |

### B. API 端点汇总

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/admin/videos/batch-upload` | POST | 批量上传视频 |
| `/api/admin/videos/[id]` | GET/PUT/DELETE | 单个视频操作 |
| `/api/admin/videos/[id]/generate-cards` | POST | AI 生成卡片 |

### C. 数据库表关系

```
videos
├── video_subtitles (1:N)
├── video_word_cards (1:N)
├── video_phrase_cards (1:N)
├── video_expression_cards (1:N)
├── video_exercises (1:N)
├── video_grammar_points (1:N) 🆕
├── video_pronunciation_tips (1:N) 🆕
└── video_vocabulary_networks (1:1) 🆕
```
