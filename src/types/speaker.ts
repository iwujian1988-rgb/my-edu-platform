/**
 * 演说家模块 - 统一类型定义
 *
 * 用途：定义所有演说家相关的 TypeScript 接口和类型
 * 参考：shangwenjie.md 第 6 节（数据库表结构）
 *       TECHNICAL_MODIFICATION_PLAN.md 第 1.2 节（数据库表兼容性）
 */

// ========================================
// 1. 文章相关类型
// ========================================

/**
 * 文章难度等级（1-5级）
 */
export type SpeakerLevel = 1 | 2 | 3 | 4 | 5

/**
 * 难度等级显示名称
 */
export const LEVEL_NAMES: Record<SpeakerLevel, string> = {
  1: '入门级',
  2: '基础级',
  3: '进阶级',
  4: '高级',
  5: '专家级'
}

/**
 * 文章状态
 */
export type SpeakerArticleStatus = 'draft' | 'published' | 'active' | 'archived'
export type PublicSpeakerArticleStatus = Extract<SpeakerArticleStatus, 'published' | 'active'>

/**
 * 支持的语言列表
 */
export type SupportedLanguage = 'en' | 'pl' | 'es' | 'fr' | 'de' | 'ja'

/**
 * 语言显示名称（i18n）
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: '英语',
  pl: '波兰语',
  es: '西班牙语',
  fr: '法语',
  de: '德语',
  ja: '日语'
}

/**
 * 语言图标/国旗（用于 UI 显示）
 */
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  en: '🇬🇧',
  pl: '🇵🇱',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  ja: '🇯🇵'
}

/**
 * 文章分类
 */
export type ArticleCategory = '健康' | '心理' | '成长' | '学习' | '社交' | '生活'

/**
 * 分类常量数组（用于 UI 渲染）
 */
export const ARTICLE_CATEGORIES: ArticleCategory[] = ['健康', '心理', '成长', '学习', '社交', '生活']

/**
 * 演说家文章元数据
 *
 * 对应数据库表：speaker_articles
 */
export interface SpeakerArticle {
  id: string
  level: SpeakerLevel
  language: SupportedLanguage  // ✅ 新增：语种
  category: ArticleCategory    // ✅ 新增：分类
  title: string
  source_url: string | null
  audio_url: string
  image_url: string | null
  has_preroll_ad: boolean

  // 统计信息
  total_sentences: number
  duration_seconds: number | null
  word_count: number | null

  // 句子列表（从 json_data.sentences 提取到顶层）
  sentences: SpeakerSentence[]

  // 完整的 JSON 数据（包含句子列表）
  json_data: {
    meta: {
      level: number
      title: string
      source_url: string
      audio_filename: string
      image_filename: string | null
      has_preroll_ad: boolean
      status: string
    }
    sentences: SpeakerSentence[]
  }

  // 状态
  status: SpeakerArticleStatus
  created_at: string
  updated_at: string

  // 可选：用户学习进度（仅在文章列表 API 中返回）
  progress?: {
    status: ProgressStatus
    isCompleted: boolean
    step1Completed?: boolean
    step2Completed?: boolean
    step3WordsCompleted?: boolean
    step3Completed?: boolean
    step4Completed?: boolean
  } | null
}

// ========================================
// 2. 句子相关类型
// ========================================

/**
 * 句子数据
 *
 * 对应数据库表：speaker_sentences
 */
export interface SpeakerSentence {
  id: string
  article_id: string
  sentence_index: number
  text: string
  text_en: string  // 英文原文（与 text 字段值相同，便于代码理解）

  // 时间戳（可能为 null，需要特殊处理）
  start_time: number | null
  end_time: number | null

  created_at: string
}

// ========================================
// 3. 学习进度相关类型
// ========================================

/**
 * 学习进度状态
 */
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed'

/**
 * Step 2 听写草稿数据
 */
export interface Step2Draft {
  // 当前句子索引
  currentSentenceIndex: number
  // 每个句子的用户输入
  answers: Record<number, string>  // key: sentence_index, value: user input
  // 放弃的单词列表
  skippedWords: Array<{
    sentenceIndex: number
    wordIndex: number
    word: string
  }>
  // 最后保存时间
  lastSavedAt: string
}

/**
 * 用户学习进度
 *
 * 对应数据库表：speaker_progress
 */
export interface SpeakerProgress {
  id: string
  user_id: string
  article_id: string

  // Step 1: 盲听
  step1_completed: boolean
  step1_last_position: number | null  // 上次播放到的秒数

  // Step 2: 听写
  step2_completed: boolean
  step2_draft: Step2Draft | null  // 草稿数据（JSONB）
  step2_last_sentence_index: number | null

  // Step 3: 搞懂单词
  step3_words_completed: boolean

  // Step 4: 跟读
  step3_completed: boolean
  step3_practiced_sentences: number[] | null  // 已练习的句子索引列表

  // Step 5: KTV 对比
  step4_completed: boolean

  // 整体状态
  status: ProgressStatus
  completed_at: string | null

  created_at: string
  updated_at: string
}

// ========================================
// 4. 听写相关类型
// ========================================

/**
 * 单词遮罩状态
 *
 * 用于 Step 2 听写页面的逐词遮罩显示
 */
export interface SpeakerDictationMask {
  // 单词在句子中的唯一 ID
  wordId: string
  // 是否被遮罩（显示为 ___ 或半透明色块）
  isMasked: boolean
  // 用户输入的文本
  userInput: string
  // 是否正确（提交后设置）
  isCorrect: boolean | null
  // 是否被放弃（用户右键跳过）
  isSkipped: boolean
  // 正确答案（原文）
  correctWord: string
}

/**
 * 听写提交记录
 *
 * 对应数据库表：speaker_dictation_submissions
 */
export interface SpeakerDictationSubmission {
  id: string
  user_id: string
  article_id: string

  // 提交数据
  answers: Record<number, string>  // key: sentence_index, value: user input
  total_sentences: number
  correct_count: number
  wrong_count: number
  skipped_count: number
  accuracy_rate: number | null

  // 时间统计
  time_spent_seconds: number | null

  created_at: string
}

/**
 * 单句听写结果
 */
export interface SentenceDictationResult {
  sentenceIndex: number
  correctWords: number
  wrongWords: number
  skippedWords: number
  accuracy: number  // 0-100
}

// ========================================
// 5. 魔鬼生词本相关类型
// ========================================

/**
 * 错误类型
 */
export type GhostWordErrorType = 'wrong' | 'skipped'

/**
 * 魔鬼生词本条目
 *
 * 对应数据库表：speaker_ghost_words
 */
export interface SpeakerGhostWord {
  id: string
  user_id: string

  // 单词数据
  word: string
  article_id: string
  sentence_id: number
  sentence_text: string
  start_time: number | null

  // 错误类型
  error_type: GhostWordErrorType

  // 有道 API 数据（缓存 7 天）
  phonetic: string | null  // 音标
  definition: string | null  // 释义
  example_sentence: string | null  // 例句
  example_audio_url: string | null  // 例句音频

  // 状态
  is_mastered: boolean  // 是否已掌握
  mastered_at: string | null

  created_at: string
}

// ========================================
// 6. KTV 相关类型
// ========================================

/**
 * KTV 播放状态
 */
export interface SpeakerKTVState {
  // 当前播放时间（秒）
  currentTime: number
  // 当前句子索引
  currentSentenceIndex: number
  // 是否正在播放
  isPlaying: boolean
  // 播放速度（0.5x - 1.5x）
  playbackRate: number
}

// ========================================
// 7. API 请求/响应类型
// ========================================

/**
 * 获取文章列表的响应
 */
export interface GetArticlesResponse {
  articles: SpeakerArticle[]
  total: number
}

/**
 * 提交听写的请求参数
 */
export interface SubmitDictationParams {
  articleId: string
  answers: Record<number, string>  // key: sentence_index, value: user input
  skippedWords: Array<{
    sentenceIndex: number
    wordIndex: number
    word: string
  }>
  timeSpentSeconds: number
}

/**
 * 保存听写草稿的请求参数
 */
export interface SaveDraftParams {
  articleId: string
  currentSentenceIndex: number
  answers: Record<number, string>
  skippedWords: Array<{
    sentenceIndex: number
    wordIndex: number
    word: string
  }>
}

// ========================================
// 8. 组件 Props 类型
// ========================================

/**
 * 文章卡片组件的 Props
 */
export interface SpeakerCardProps {
  article: SpeakerArticle
  onClick?: () => void
  showStatus?: boolean  // 是否显示学习状态
}

/**
 * 音频播放器组件的 Props
 */
export interface AudioPlayerProps {
  audioUrl: string
  startTime?: number | null  // 开始时间（秒）
  endTime?: number | null  // 结束时间（秒，用于自动暂停）
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (currentTime: number) => void
  showPlaybackRate?: boolean  // 是否显示语速调节
}

/**
 * 句子遮罩显示组件的 Props
 */
export interface SentenceMaskDisplayProps {
  sentence: string
  wordMasks: SpeakerDictationMask[]
  globalMaskToggle: boolean
  onWordHover?: (wordId: string) => void
  onWordLeave?: () => void
}

/**
 * 句子输入框组件的 Props
 */
export interface SentenceInputProps {
  wordMasks: SpeakerDictationMask[]
  onInputChange: (wordId: string, value: string) => void
  onWordSkip?: (wordId: string) => void
  disabled?: boolean
  onSubmit?: () => void
}

// ========================================
// 9. 工具函数返回类型
// ========================================

/**
 * 句子解析结果
 */
export interface ParsedSentence {
  words: string[]  // 单词数组
  punctuation: Array<{
    char: string
    position: number  // 在句子中的位置
  }>
}

/**
 * 音频文件检查结果
 */
export interface AudioCheckResult {
  exists: boolean
  url: string
  error?: string
}

// ========================================
// 10. 常量类型
// ========================================

/**
 * 播放速度选项
 */
export const PLAYBACK_RATES = [0.5, 0.8, 1.0, 1.2, 1.5] as const
export type PlaybackRate = typeof PLAYBACK_RATES[number]

/**
 * 学习步骤枚举
 */
export enum LearningStep {
  Timeline = 'timeline',
  Step1 = 'step1',  // 盲听
  Step2 = 'step2',  // 听写
  Step3Words = 'step3_words',  // 搞懂单词
  Step4Recitation = 'step3',  // 跟读（保留旧路由/字段名）
  Step5Ktv = 'step4',  // KTV 对比（保留旧路由/字段名）
}

/**
 * 步骤完成状态
 */
export interface StepCompletionStatus {
  step: LearningStep
  completed: boolean
  canUnlock: boolean  // 是否可以解锁下一步
}

// ========================================
// 11. 多语言和权限相关类型（新增）
// ========================================

/**
 * 购买类型
 */
export type PurchaseType = 'subscription' | 'lifetime'

/**
 * 购买状态
 */
export type PurchaseStatus = 'active' | 'cancelled' | 'expired' | 'refunded'

/**
 * 用户语言包购买记录
 *
 * 对应数据库表：user_language_purchases
 */
export interface UserLanguagePurchase {
  id: string
  user_id: string
  language: SupportedLanguage

  // 购买信息
  purchase_type: PurchaseType
  started_at: string
  expires_at: string | null

  // 支付信息
  amount: number | null
  currency: string
  payment_method: string | null
  order_id: string | null
  transaction_id: string | null

  // 状态
  status: PurchaseStatus
  notes: string | null

  created_at: string
  updated_at: string
}

/**
 * 语言包产品配置
 *
 * 对应数据库表：language_products
 */
export interface LanguageProduct {
  id: string
  language: SupportedLanguage
  language_name: string

  // 定价
  price_monthly: number | null
  price_yearly: number | null
  price_lifetime: number | null

  // 产品状态
  is_active: boolean
  sort_order: number

  // 描述
  description: string | null
  features: string[]  // 产品特性列表

  created_at: string
  updated_at: string
}

/**
 * 用户可用语言信息（用于 UI 显示）
 */
export interface UserAvailableLanguage {
  user_id: string
  language: SupportedLanguage
  language_name: string
  price_monthly: number | null
  price_yearly: number | null
  price_lifetime: number | null
  is_active: boolean
  purchase_type: PurchaseType | null
  expires_at: string | null
  purchase_status: PurchaseStatus | null
  is_purchased: boolean  // 用户是否已购买且在有效期内
}

/**
 * 获取文章列表的请求参数（更新）
 */
export interface GetArticlesParams {
  level?: SpeakerLevel
  language?: SupportedLanguage  // ✅ 新增
  languages?: SupportedLanguage[]
  category?: ArticleCategory    // ✅ 新增
  status?: SpeakerArticleStatus
  limit?: number
  offset?: number
  page?: number       // 页码（从1开始）
  pageSize?: number   // 每页数量
}

