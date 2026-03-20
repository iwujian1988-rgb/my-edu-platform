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
export type ExerciseType = 'fill_blank' | 'dictation'
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type HintType = 'first_letter' | 'first_last_letter' | 'none'
export type FormalityLevel = 'neutral' | 'formal' | 'informal'

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
  package_id: string
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

export interface Video {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  video_url: string | null  // 可选，工作流最后上传
  duration: number
  language: VideoLanguage
  difficulty: VideoDifficulty
  status: VideoStatus
  display_order: number
  creator_name: string | null
  source_url: string | null
  view_count: number
  package_ids: string[] | null  // 关联的套餐 ID 列表
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
  | null
  usage_note: string | null
  examples: CardExample[] | null
  scenarios: string | null
  similar_expressions: string[] | null
  formality_level: FormalityLevel
  difficulty_level: number
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
  onHighlightClick: (cardType: CardType, cardId: string) => void
  displayMode: 'bilingual' | 'original' | 'chinese'
}

export interface SubtitleWithHighlightsProps {
  subtitle: SubtitleWithHighlights
  isActive: boolean
  onHighlightClick: (cardType: CardType, cardId: string) => void
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

export interface RecordingPanelProps {
  videoId: string
  subtitle: VideoSubtitle | null
  onRecordingComplete: (recording: UserRecording) => void
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
}

export interface CreateVideoBody {
  title: string
  description?: string
  video_url: string
  thumbnail_url?: string
  duration: number
  language: VideoLanguage
  difficulty?: VideoDifficulty
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
  card: VideoCard & {
    video_title?: string
  }
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
