/**
 * 视频学习模块类型定义
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md v2.0
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 */

// ============================================
// 基础类型
// ============================================

export type VideoLanguage = 'en' | 'fr' | 'de' | 'es' | 'ja' | 'it' | 'ru'
export type VideoDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type VideoStatus = 'draft' | 'published' | 'archived'
export type CardType = 'word' | 'phrase' | 'expression'
export type CardStatus = 'known' | 'unknown' | 'learning'
export type CardProgressStatus = 'known' | 'unknown' | 'learning'
export type ExerciseType = 'fill_blank' | 'dictation' | 'sentence_pattern' | 'scenario' | 'multiple_choice' | 'translation' | 'grammar_drill'
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type HintType = 'first_letter' | 'first_last_letter' | 'none'
export type FormalityLevel = 'neutral' | 'formal' | 'informal'
export type ContentType = 'video' | 'audio'
export type CreatorPlatform = 'youtube' | 'bilibili' | 'tiktok' | 'instagram' | 'twitter' | 'other'

export const VIDEO_LANGUAGE_LABELS: Record<VideoLanguage, string> = {
  en: '英语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ja: '日语',
  it: '意大利语',
  ru: '俄语',
}

export const VIDEO_DIFFICULTY_LABELS: Record<VideoDifficulty, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '难',
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: '视频',
  audio: '播客',
}

export const CREATOR_PLATFORM_LABELS: Record<CreatorPlatform, string> = {
  youtube: 'YouTube',
  bilibili: 'B站',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  other: '其他',
}

// ============================================
// 工作流类型
// ============================================

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface WorkflowProgress {
  current_step: number  // 0-6
  steps: {
    subtitles: WorkflowStepStatus      // Step 0: 字幕上传+分析
    info: WorkflowStepStatus           // Step 1: 基本信息
    translation: WorkflowStepStatus    // Step 2: 字幕翻译（可跳过）
    cards: WorkflowStepStatus          // Step 3: 生成卡片
    review: WorkflowStepStatus         // Step 4: 审核卡片
    video: WorkflowStepStatus          // Step 5: 上传视频（可跳过）
    publish: WorkflowStepStatus        // Step 6: 发布
  }
}

export const WORKFLOW_STEPS = [
  { key: 'subtitles', label: '字幕上传', index: 0, canSkip: false },
  { key: 'info', label: '基本信息', index: 1, canSkip: false },
  { key: 'translation', label: '字幕翻译', index: 2, canSkip: true },
  { key: 'cards', label: '生成卡片', index: 3, canSkip: false },
  { key: 'review', label: '审核卡片', index: 4, canSkip: false },
  { key: 'video', label: '上传视频', index: 5, canSkip: true },
  { key: 'publish', label: '发布', index: 6, canSkip: false },
] as const

export const DEFAULT_WORKFLOW_PROGRESS: WorkflowProgress = {
  current_step: 0,
  steps: {
    subtitles: 'pending',
    info: 'pending',
    translation: 'pending',
    cards: 'pending',
    review: 'pending',
    video: 'pending',
    publish: 'pending',
  },
}

// ============================================
// 视频套餐类型（核心售卖逻辑）
// ============================================

export interface VideoPackage {
  id: string
  name: string
  description: string | null
  price: number
  validity_days: number
  language: VideoLanguage | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface UserVideoPackage {
  id: string
  user_id: string
  package_ids: string[]
  invitation_code_id: string | null
  activated_at: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  package?: VideoPackage
}

export interface VideoPackageListItem extends VideoPackage {
  video_count: number
  user_has_access: boolean
  user_expires_at: string | null
}

// ============================================
// 视频基础类型
// ============================================

/** 影子跟读 — 逐词时间戳 */
export interface ShadowReadingWord {
  text: string
  start: number
  end: number
}

/** 影子跟读 — 精选句 */
export interface ShadowReadingEntry {
  subtitle_index: number
  start_time: string
  end_time: string
  spanish?: string   // 西语
  french?: string    // 法语
  chinese: string
  score: number
  selection_reason: string
  words: ShadowReadingWord[]
}

export interface Video {
  id: string
  title: string  // 视频名称，导入时从 unit_info.unit_name_cn 填充
  original_title: string | null  // 原语言标题（法语/英语等）
  album_title: string | null  // 专辑名称，导入时从 unit_info.video_title_cn 填充
  description: string | null
  thumbnail_url: string | null
  video_url: string | null  // 可选，工作流最后上传
  duration: number
  language: VideoLanguage
  difficulty: VideoDifficulty
  content_type: ContentType  // 'video' 或 'audio'（音频博客）
  cover_url: string | null  // 音频博客封面图 URL
  status: VideoStatus
  display_order: number
  creator_name: string | null
  creator_id: string | null  // 关联的 UP主 ID
  source_url: string | null
  source_video_id: string | null  // YouTube video ID for grouping segments
  view_count: number
  package_ids: string[] | null  // 关联的套餐 ID 列表
  learning_date: string | null  // 学习归属时间，用于前台排序
  shadow_reading: ShadowReadingEntry[] | null  // 影子跟读精选句+逐词时间戳
  workflow_progress: WorkflowProgress | null  // 工作流进度
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

// UP主/创作者接口
export interface UpstreamCreator {
  id: string
  name: string
  platform: CreatorPlatform | null
  platform_user_id: string | null
  avatar_url: string | null
  description: string | null
  follower_count: number
  channel_url: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// ============================================
// 字幕类型
// ============================================

export interface VideoSubtitle {
  id: string
  video_id: string
  start_time: number
  end_time: number
  original_text: string
  chinese_text: string | null
  word_count: number
  display_order: number
  created_at: string
}

export interface SubtitleHighlight {
  card_type: CardType
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

// 例句结构（用于多条例句存储）
export interface WordCardExample {
  fr?: string    // 原文（法语等）
  en?: string    // 原文（英语等）
  zh: string     // 中文翻译
}

export interface VideoWordCard {
  id: string
  video_id: string
  word: string
  phonetic: string | null
  part_of_speech: string | null
  chinese_definition: string
  english_definition: string | null
  // 视频中的例句（原字段，保留兼容）
  example_from_video: string | null
  example_translation: string | null
  // 单词书例句和搭配（新增）
  example_sentence: string | null      // 单词书例句（原文）
  example_sentence_cn: string | null   // 单词书例句（中文）
  collocation: string | null           // 搭配/用法（原文）
  collocation_cn: string | null        // 搭配/用法（中文）
  // 词典扩展字段（新增）
  gender: string | null                // 名词性别（法语：m=阳性, f=阴性）
  cefr_level: string | null            // CEFR等级原始值（A1-C2）
  definitions: string[] | null         // 多条释义数组
  examples: WordCardExample[] | null   // 多个例句数组
  subtitle_start_time: number  // 单词在字幕中首次出现的时间（秒），用于 [📍] 跳转播放
  subtitle_end_time: number    // 单词所在字幕的结束时间（秒）
  difficulty_level: number
  is_reviewed: boolean
  reviewed_at: string | null
  reviewed_by: string | null
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
  is_reviewed: boolean
  reviewed_at: string | null
  reviewed_by: string | null
  display_order: number
  created_at: string
}

export interface CardExample {
  original: string
  cn: string
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
  formality_level: FormalityLevel
  difficulty_level: number
  subtitle_start_time: number  // 表达在字幕中首次出现的时间（秒），用于 [▶ 播放这段]
  subtitle_end_time: number    // 表达所在字幕的结束时间（秒）
  is_reviewed: boolean
  reviewed_at: string | null
  reviewed_by: string | null
  display_order: number
  created_at: string
}

export type VideoCard = VideoWordCard | VideoPhraseCard | VideoExpressionCard

// 统一的卡片展示接口（用于列表和复习）
export interface UnifiedVideoCard {
  id: string
  video_id: string
  text: string  // word/phrase/expression
  phonetic: string | null
  translation: string  // chinese_definition/meaning
  definition?: string | null
  part_of_speech?: string | null
  examples?: CardExample[] | null
  video_title?: string
  video_language?: VideoLanguage  // 用于 TTS 语言选择
  difficulty_level: number
}

// ============================================
// 填空练习类型
// ============================================

export interface BlankPosition {
  start: number
  end: number
  word: string
  hint?: string
}

// ============================================
// 练习 Metadata 类型
// ============================================

/** 句型模式练习的元数据 */
export interface SentencePatternMetadata {
  pattern: string
  explanation: string
  example: {
    french: string
    chinese: string
  }
}

/** 情景练习的元数据 */
export interface ScenarioMetadata {
  description: string
  requirements: string | string[]
  starter?: string
}

export interface VideoExercise {
  id: string
  video_id: string
  subtitle_id: string
  exercise_type: ExerciseType
  difficulty: ExerciseDifficulty
  original_text: string
  blank_positions: BlankPosition[]
  hint_type: HintType | null
  answer_text: string
  display_order: number
  created_at: string
  // 扩展字段（由 API 填充）
  subtitle_text?: string
  translation?: string
  text_with_blanks?: string
  answers?: string[]
  explanation?: string
  subtitle_start_time?: number  // 字幕开始时间（秒），用于播放按钮跳转
  subtitle_end_time?: number    // 字幕结束时间（秒），用于播放按钮自动暂停
  exercise_metadata?: SentencePatternMetadata | ScenarioMetadata | null  // 新增：扩展练习元数据
}

// ============================================
// 难度分析类型
// ============================================

export interface VideoDifficultyAnalysis {
  id: string
  video_id: string
  vocabulary_score: number | null
  speech_rate: number | null
  sentence_complexity: number | null
  idiom_density: number | null
  final_difficulty: VideoDifficulty
  analysis_reason: string | null
  total_words: number
  total_sentences: number
  avg_sentence_length: number
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
  status: CardStatus
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

export interface VideoCardNote {
  id: string
  user_id: string
  video_id: string
  card_id: string
  card_type: CardType
  note: string
  created_at: string
  updated_at: string
}

export interface VideoLearningCalendar {
  id: string
  user_id: string
  learning_date: string
  video_count: number
  total_minutes: number
  cards_reviewed: number
  recordings_count: number
  created_at: string
}

// ============================================
// API 响应类型
// ============================================

export interface VideoListItem extends Video {
  tags: string[]
  packages: string[]
  creator?: UpstreamCreator | null  // 关联的 UP主信息
  user_progress: {
    last_position: number
    max_progress: number
    is_completed: boolean
  } | null
  has_access: boolean
}

export interface VideoListResponse {
  items: VideoListItem[]
  total: number
  user_packages: Array<{
    id: string
    name: string
    expires_at: string | null
  }>
  available_languages?: VideoLanguage[]
}

export interface VideoFullResponse {
  video: Video
  subtitles: SubtitleWithHighlights[]
  cards: VideoCards
  exercises: VideoExercise[]
  difficulty_analysis: VideoDifficultyAnalysis | null
  has_access: boolean
  user_progress: {
    last_position: number
    max_progress: number
    is_completed: boolean
  } | null
}

export interface VideoCards {
  words: VideoWordCard[]
  phrases: VideoPhraseCard[]
  expressions: VideoExpressionCard[]
}

export interface CardDetailResponse {
  card: VideoCard & { user_status?: CardStatus }
}

export interface AccessCheckResponse {
  has_access: boolean
  packages: Array<{
    id: string
    name: string
    user_has_access: boolean
  }>
}

// ============================================
// 组件 Props 类型
// ============================================

export interface VideoPlayerProps {
  video: Video
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  autoPlay?: boolean
}

export interface SubtitleListProps {
  subtitles: SubtitleWithHighlights[]
  currentVideoTime: number
  onSubtitleClick: (subtitle: VideoSubtitle) => void
  onHighlightClick: (cardType: CardType, cardId: string, event: React.MouseEvent) => void
  displayMode: 'bilingual' | 'original' | 'chinese'
}

export interface SubtitleWithHighlightsProps {
  subtitle: SubtitleWithHighlights
  isActive: boolean
  onHighlightClick: (cardType: CardType, cardId: string, event: React.MouseEvent) => void
  displayMode: 'bilingual' | 'original' | 'chinese'
}

export interface CardPopoverProps {
  card: VideoCard
  cardType: CardType
  onClose: () => void
  onStatusChange: (status: CardStatus) => void
  onFavorite: () => void
  isFavorited: boolean
}

export interface FlashcardModeProps {
  cards: Array<{
    card: VideoCard
    type: CardType
    userStatus?: CardStatus
  }>
  onStatusChange: (cardType: CardType, cardId: string, status: CardStatus) => void
}

export interface LearningTabsProps {
  activeTab: 'listen' | 'speak' | 'write' | 'learn'
  onTabChange: (tab: 'listen' | 'speak' | 'write' | 'learn') => void
}

export interface VideoCardProps {
  video: VideoListItem
  onClick: () => void
}

export interface PackageCardProps {
  package: VideoPackageListItem
  onPurchase?: () => void
}

export interface AccessDeniedProps {
  packages: AccessCheckResponse['packages']
  videoTitle: string
}

// ============================================
// API 请求类型
// ============================================

export interface VideoListQuery {
  limit?: number
  offset?: number
  language?: VideoLanguage
  difficulty?: VideoDifficulty
  tag?: string
  search?: string
  only_accessible?: boolean
  content_type?: ContentType
}

export interface CreateVideoBody {
  title: string
  description?: string
  video_url: string
  thumbnail_url?: string
  duration: number
  language: VideoLanguage
  difficulty?: VideoDifficulty
  content_type?: ContentType
  cover_url?: string
  creator_name?: string
  source_url?: string
  tags?: string[]
  package_ids?: string[]
}

export interface UpdateVideoBody extends Partial<CreateVideoBody> {
  status?: VideoStatus
}

export interface CreateSubtitleBody {
  video_id: string
  sentences: Array<{
    text: string
    start_time: number
    end_time: number
  }>
}

export interface CreateCardBody {
  video_id: string
  card_type: CardType
  data: Omit<VideoWordCard, 'id' | 'video_id' | 'created_at' | 'display_order'> |
        Omit<VideoPhraseCard, 'id' | 'video_id' | 'created_at' | 'display_order'> |
        Omit<VideoExpressionCard, 'id' | 'video_id' | 'created_at' | 'display_order'>
}

export interface UpdateCardProgressBody {
  video_id: string
  card_type: CardType
  card_id: string
  status: CardStatus
}

export interface UpdateVideoProgressBody {
  last_position?: number
  watch_duration_increment?: number
}

// ============================================
// 工具函数类型
// ============================================

export type DurationCategory = 'short' | 'medium' | 'long'

export function getDurationCategory(duration: number): DurationCategory {
  if (duration < 180) return 'short'      // < 3分钟
  if (duration < 600) return 'medium'     // 3-10分钟
  return 'long'                           // > 10分钟
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================
// Flashcard 复习类型
// ============================================

export interface FlashcardReviewItem {
  card: UnifiedVideoCard
  card_type: CardType
  next_review: string | null
  review_count: number
  ease_factor: number
}

export interface FlashcardReviewResponse {
  items: FlashcardReviewItem[]
  total: number
}

export interface RecordingWithEvaluation extends UserRecording {
  score: number | null
  evaluation: {
    pronunciation: number
    fluency: number
    overall: number
    feedback: string
  } | null
}

// ============================================
// Video Exercise 扩展类型
// ============================================

export interface VideoExerciseWithSubtitle extends VideoExercise {
  subtitle_text?: string
  translation?: string
  text_with_blanks: string
  answers: string[]
  explanation?: string
}

// ============================================
// 批量上传相关类型
// 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md v1.2
// ============================================

// --------------------------------------------
// 新增学习内容类型
// --------------------------------------------

/** 语法点 */
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

/** 发音要点 */
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

/** 词汇网络中的词详情 */
export interface VocabWordDetail {
  word: string
  meaning: string
  example?: string
  example_translation?: string
}

/** 词汇网络 */
export interface VideoVocabularyNetwork {
  id: string
  video_id: string
  theme: string | null
  structure: string | null
  related_words: string[] | null
  collocations: string | null
  core_word: string | null
  word_details: VocabWordDetail[] | null
  created_at: string
}

// --------------------------------------------
// 输入 JSON 类型
// --------------------------------------------

/** 字幕 JSON 输入结构 */
export interface SubtitleJsonInput {
  unit_info: {
    unit_num: number
    theme: string
    start_time: string
    end_time: string
    subtitle_count: number
    creator?: string  // UP主名称（用于匹配）
    video_title_cn?: string  // 专辑名称（新增）
    unit_name_cn?: string  // 视频中文名称（新增），导入时映射到 videos.title
    source_video_name?: string  // 源视频文件名
    tags?: string[]  // 标签
  }
  subtitles: Array<{
    index: number
    start_time: string
    end_time: string
    french: string
    chinese: string
  }>
}

/** 学习材料 JSON 输入结构 */
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
      related_words?: string[]
      collocations?: string
      related_groups?: Array<{
        category: string
        words: string[]
      }>
    }
  }
  practice?: {
    vocabulary_exercises?: Array<{
      word: string
      sentence: string
      answer: string
      hint: string
    }>
    sentence_patterns?: Array<{
      pattern: string
      example: string
      task: string
    }>
    scenario?: {
      description: string
      requirements: string
      starter: string
    }
  }
}

// --------------------------------------------
// API 请求/响应类型
// --------------------------------------------

/** 批量上传单个视频项 */
export interface BatchUploadVideoItem {
  subtitle_json: SubtitleJsonInput
  learning_material_json: LearningMaterialJsonInput
  video_url: string
}

/** 批量上传请求 */
export interface BatchUploadRequest {
  videos: BatchUploadVideoItem[]
}

/** 批量上传单个视频结果 */
export interface BatchUploadResult {
  id: string
  title: string
  subtitles_count: number
  words_count: number
  expressions_count: number
  grammar_points_count: number
  pronunciation_tips_count: number
  exercises_count: number
  status: VideoStatus
}

/** 批量上传响应 */
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

// ============================================
// 合并批量上传类型
// ============================================

/** 合并格式的单个 unit 输入 */
export interface MergedUnitInput {
  unit_info: {
    unit_num: number
    theme: string
    start_time?: string
    end_time?: string
    duration_minutes?: number
    cefr_level?: string
    video_title_cn?: string
    unit_name_cn?: string
    source_video_name?: string
    creator?: string        // 保留用于名称匹配
    creator_id?: string     // 新增：直接使用UP主ID
    tags?: string[]
  }
  subtitles?: Array<{
    id: number
    start_time: string
    end_time: string
    french: string
    chinese: string
  }>
  language_analysis?: {
    vocabulary?: Array<{
      french: string
      part_of_speech: string
      ipa: string
      chinese: string
      first_appearance?: string
      occurrence_count?: number
      cefr_level: string
      source_ids?: string[]
      examples?: Array<{
        french: string
        chinese: string
        source_id?: string
      }>
      example_sentence?: {
        french: string
        chinese: string
      }
    }>
    key_expressions?: Array<{
      expression: string
      ipa?: string
      chinese?: string
      meaning?: string
      cefr_level?: string
      grammar_usage?: string
      usage_note?: string
      example?: {
        french: string
        chinese: string
      }
    }>
  }
  deep_learning?: {
    grammar_points?: Array<{
      name: string
      structure?: string
      example?: {
        french: string
        chinese: string
        ipa?: string
      }
      purpose?: string
      explanation?: string
      note?: string
      usage_note?: string
    }>
    pronunciation?: {
      key_sounds?: Array<{
        sound: string
        example_words?: string[]
        examples?: string[]
        instruction?: string
        description?: string
        practice_tip?: string
      }>
      liaison?: string[]
      intonation?: string
    }
    vocabulary_network?: {
      theme?: string
      structure?: string
      related_words?: string[]
      collocations?: string[]
      related_groups?: Array<{
        category: string
        words: string[]
      }>
      core_word?: string
    }
  }
  practice?: {
    vocabulary_exercises?: Array<{
      word?: string
      sentence?: string
      question?: string
      answer: string
      hint?: string
    }>
    sentence_patterns?: Array<{
      pattern: string
      explanation: string
      examples: Array<{ french: string; chinese: string }>
    }>
    scenario?: {
      context: string
      dialogue: Array<{ french: string; chinese: string; speaker?: string }>
    }
  }
}

/** 合并格式 JSON 结构 */
export interface MergedBatchUploadJson {
  channel?: string
  materials: Record<string, MergedUnitInput>
}

/** 合并批量上传请求 */
export interface MergedBatchUploadRequest {
  merged_json: MergedBatchUploadJson
  video_url?: string
  video_urls?: Record<string, string>
}

/** 合并批量上传响应 */
export interface MergedBatchUploadResponse {
  success: boolean
  data: {
    created_count: number
    videos: BatchUploadResult[]
    errors: Array<{
      unit_key: string
      index: number
      error: string
    }>
  }
}

// --------------------------------------------
// 扩展的 VideoFullResponse
// --------------------------------------------

/** 练习答题进度（服务端预取格式） */
export interface ExerciseProgressEntry {
  exerciseId: string
  isCorrect: boolean
  attempts: number
}

/** 播放列表项（同 source_video_id 的视频片段） */
export interface PlaylistItem {
  id: string
  title: string
  duration: number
  display_order: number
  thumbnail_url: string | null
  cover_url: string | null
}

/** 完整视频响应（包含新增的学习内容） */
export interface VideoFullResponseExtended extends VideoFullResponse {
  grammar_points: VideoGrammarPoint[]
  pronunciation_tips: VideoPronunciationTip[]
  vocabulary_network: VideoVocabularyNetwork | null
  creator?: UpstreamCreator | null  // 关联的 UP主信息
  exerciseProgress?: ExerciseProgressEntry[]  // 用户答题记录（预取）
  source_video_id: string | null  // 同源视频分组 ID
  playlist: PlaylistItem[] | null  // 同一 source_video_id 的视频片段列表
  canContinuousPlay: boolean  // 当前用户是否可开启连续播放
}

// ============================================
// 播客专区 + 播主详情类型
// ============================================

/** 播客专区：播主卡片数据 */
export interface PodcastCreatorListItem {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  platform: CreatorPlatform | null
  audio_count: number
  latest_covers: string[]
}

/** 播主详情：播主信息 */
export interface CreatorInfo {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  platform: CreatorPlatform | null
  platform_user_id: string | null
  channel_url: string | null
  follower_count: number
  is_active: boolean
  display_order: number
  audio_count: number
  video_count: number
}

/** 播主详情：内容列表项（复用 VideoListItem） */
export interface CreatorContentResponse {
  creator: CreatorInfo
  items: VideoListItem[]
  total: number
}

/** 播主详情排序方式 */
export type CreatorSortMode = 'time' | 'episode'
