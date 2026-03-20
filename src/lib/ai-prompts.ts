/**
 * AI 提示词加载器
 *
 * 根据视频语言加载对应的提示词模板
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.8
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import type { VideoLanguage } from '@/types/video'

// 提示词文件路径映射
const PROMPT_FILES: Record<VideoLanguage, string> = {
  en: 'en-video-cards.md',
  fr: 'fr-video-cards.md',
  de: 'de-video-cards.md',
  es: 'es-video-cards.md',
  ja: 'ja-video-cards.md',
  it: 'it-video-cards.md',
  ru: 'ru-video-cards.md',
}

// 语言名称映射
const LANGUAGE_NAMES: Record<VideoLanguage, string> = {
  en: '英语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ja: '日语',
  it: '意大利语',
  ru: '俄语',
}

// 缓存
let promptCache: Map<VideoLanguage, string> | null = null

/**
 * 获取指定语言的提示词模板
 *
 * @param language - 视频语言
 * @returns 提示词模板内容
 */
export async function getVideoCardPrompt(language: VideoLanguage): Promise<string> {
  // 初始化缓存
  if (!promptCache) {
    promptCache = new Map()
  }

  // 检查缓存
  const cached = promptCache.get(language)
  if (cached) {
    return cached
  }

  // 读取文件
  const fileName = PROMPT_FILES[language]
  const filePath = join(process.cwd(), 'src', 'prompts', fileName)

  try {
    const content = await readFile(filePath, 'utf-8')
    promptCache.set(language, content)
    return content
  } catch (error) {
    console.error(`[ai-prompts] Failed to load prompt for ${language}:`, error)
    // 降级到英语提示词
    if (language !== 'en') {
      console.warn(`[ai-prompts] Falling back to English prompt`)
      return getVideoCardPrompt('en')
    }
    throw new Error(`Failed to load prompt file: ${fileName}`)
  }
}

/**
 * 构建完整的 AI 提示词
 *
 * @param language - 视频语言
 * @param subtitles - 字幕文本
 * @param additionalContext - 额外上下文
 * @returns 完整的提示词
 */
export async function buildAIPrompt(
  language: VideoLanguage,
  subtitles: Array<{
    id: string
    original_text: string
    start_time: number
    end_time: number
  }>,
  additionalContext?: {
    videoTitle?: string
    videoDescription?: string
    creatorName?: string
  }
): Promise<string> {
  // 1. 加载语言对应的提示词模板
  const template = await getVideoCardPrompt(language)

  // 2. 构建字幕文本
  const subtitleText = subtitles
    .map((s, index) => {
      const startTime = formatTime(s.start_time)
      return `[${startTime}] ${s.original_text}`
    })
    .join('\n')

  // 3. 构建完整提示词
  const fullPrompt = `# 任务

根据以下${LANGUAGE_NAMES[language]}视频字幕，提取学习内容并生成卡片。

## 视频信息

- 标题：${additionalContext?.videoTitle || '未知'}
- 描述：${additionalContext?.videoDescription || '无'}
- 创作者：${additionalContext?.creatorName || '未知'}
- 语言：${LANGUAGE_NAMES[language]}

## 字幕内容

${subtitleText}

---

${template}

## 输出要求

1. 严格按照上述 JSON 格式输出
2. 不要输出任何额外文本或解释
3. 确保所有中文翻译准确、自然
4. 难度评估要客观

请开始生成：`

  return fullPrompt
}

/**
 * 构建难度评估提示词（第一阶段）
 *
 * @param language - 视频语言
 * @param subtitles - 字幕文本
 * @returns 难度评估提示词
 */
export async function buildDifficultyAnalysisPrompt(
  language: VideoLanguage,
  subtitles: Array<{
    original_text: string
    start_time: number
    end_time: number
  }>
): Promise<string> {
  // 计算统计数据
  const totalText = subtitles.map(s => s.original_text).join(' ')
  const words = totalText.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  // 计算语速（词/分钟）
  const totalDuration = subtitles.reduce((sum, s) => sum + (s.end_time - s.start_time), 0)
  const durationMinutes = totalDuration / 60
  const speechRate = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0

  // 句子数量
  const sentences = totalText.split(/[.!?。！？]+/).filter(Boolean)
  const sentenceCount = sentences.length
  const avgSentenceLength = sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : '0'

  const prompt = `# 任务

分析以下${LANGUAGE_NAMES[language]}视频的难度等级。

## 基本统计

- 总词数：${wordCount}
- 总时长：${Math.round(totalDuration)}秒
- 语速：${speechRate} 词/分钟
- 句子数：${sentenceCount}
- 平均句长：${avgSentenceLength} 词

## 字幕内容

${subtitles.map(s => s.original_text).join('\n')}

## 评估标准

| 难度 | 对应水平 | 语速特征 | 词汇特征 |
|------|---------|---------|---------|
| beginner | 初高中 | <120词/分钟 | 基础常用词 |
| intermediate | 四六级 | 120-160词/分钟 | 中级词汇，有多义或特殊用法 |
| advanced | 以上 | >160词/分钟 | 高级词汇，专业表达，习语关键词 |

## 输出格式

请严格按照以下 JSON 格式输出，不要添加任何额外文本：

\`\`\`json
{
  "vocabulary_score": 5,
  "speech_rate": ${speechRate},
  "sentence_complexity": 4,
  "idiom_density": 0.2,
  "final_difficulty": "intermediate",
  "analysis_reason": "语速适中，以四六级词汇为主，有少量习语"
}
\`\`\`

请开始分析：`

  return prompt
}

/**
 * 构建内容生成提示词（第二阶段）
 *
 * @param language - 视频语言
 * @param subtitles - 字幕文本
 * @param difficulty - 已评估的难度等级
 * @param additionalContext - 额外上下文
 * @returns 内容生成提示词
 */
export async function buildContentGenerationPrompt(
  language: VideoLanguage,
  subtitles: Array<{
    id: string
    original_text: string
    start_time: number
    end_time: number
  }>,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  additionalContext?: {
    videoTitle?: string
    videoDescription?: string
    creatorName?: string
  }
): Promise<string> {
  const basePrompt = await buildAIPrompt(language, subtitles, additionalContext)

  // 添加难度约束
  const difficultyConstraint = `

## 难度约束

视频难度已评估为：**${difficulty}**

请根据难度生成相应内容：

- **beginner**：生成入门级内容，挖1个简单词作为练习
- **intermediate**：生成进阶级内容，挖2-3个词作为练习
- **advanced**：生成高级内容，整句听写作为练习
`

  return basePrompt + difficultyConstraint
}

// ============================================
// 辅助函数
// ============================================

/**
 * 格式化时间为 MM:SS 格式
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 清除缓存（用于测试）
 */
export function clearPromptCache(): void {
  promptCache = null
}

/**
 * 获取所有支持的语言列表
 */
export function getSupportedLanguages(): VideoLanguage[] {
  return Object.keys(PROMPT_FILES) as VideoLanguage[]
}

/**
 * 获取语言名称
 */
export function getLanguageName(language: VideoLanguage): string {
  return LANGUAGE_NAMES[language]
}
