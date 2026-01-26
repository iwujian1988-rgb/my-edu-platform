/**
 * 打字练习背单词 - 类型定义（Qwerty Learner 风格）
 *
 * 完整的类型系统，支持词典、章节、设置、统计等功能
 */

// ==================== 单词数据类型 ====================

/**
 * 单词数据结构
 */
export interface Word {
  id: number | string
  word: string           // 单词拼写
  trans: string          // 中文释义
  category?: string      // 分类（可选）
  phonetic?: string      // 音标（可选）
  audio_url?: string | null  // 音频URL（可选）
}

// ==================== 词库数据类型 ====================

/**
 * 词库数据结构
 */
export interface Dict {
  id: string             // 词库唯一标识
  name: string           // 词库名称
  description: string    // 词库描述
  words: Word[]          // 单词列表
}

/**
 * 章节数据结构
 */
export interface Chapter {
  id: string             // 章节ID
  name: string           // 章节名称
  startIndex: number     // 起始索引
  endIndex: number       // 结束索引
}

// ==================== 音效设置类型 ====================

/**
 * 发音方案类型（TTS 集成）
 * - us: 美式英语 (en-US)
 * - uk: 英式英语 (en-GB)
 * - auto: 自动选择浏览器默认
 */
export type PronunciationScheme = 'us' | 'uk' | 'auto'

/**
 * 键盘音效类型
 */
export type KeyboardSoundType = 'default' | 'mech' | 'soft' | 'typewriter' | 'none'

/**
 * 音效设置（TTS 版本）
 */
export interface SoundSettings {
  // === TTS 发音设置 ===
  wordPronunciation: boolean        // 单词自动发音开关（打对后触发）
  wordVolume: number                // 单词发音音量 (0-100)
  wordSpeed: number                 // 单词发音语速 (0.5-2.0)
  pronunciationScheme: PronunciationScheme  // 发音方案 (美音/英音/自动)

  transPronunciation: boolean       // 释义发音开关
  transVolume: number               // 释义发音音量

  // === 按键音效（保留简单 feedback）===
  keySound: boolean                 // 按键音开关
  keyVolume: number                 // 按键音音量
  keySoundType: KeyboardSoundType   // 按键音类型

  // === 效果音（已废弃，保留字段兼容性）===
  effectSound: boolean              // 效果音开关（TTS 模式下不使用）
  effectVolume: number              // 效果音音量
}

// ==================== 高级设置类型 ====================

/**
 * 高级设置
 */
export interface AdvancedSettings {
  shuffle: boolean                  // 章节乱序
  showContextWords: boolean         // 显示前后单词
  ignoreCase: boolean               // 忽略大小写
  allowTextSelection: boolean       // 允许选择文本
  showHintInBlindMode: boolean      // 默写模式显示提示
}

// ==================== 显示设置类型 ====================

/**
 * 显示设置
 */
export interface DisplaySettings {
  foreignFontSize: number           // 外语字体大小 (20-100px)
  chineseFontSize: number           // 中文字体大小 (12-50px)
  darkMode: boolean                 // 深色模式
}

// ==================== 统计数据类型 ====================

/**
 * 统计数据
 */
export interface Statistics {
  time: number                      // 学习时间（秒）
  inputCount: number                // 输入字符数
  wpm: number                       // 每分钟单词数
  correctCount: number              // 正确单词数
  accuracy: number                  // 正确率 (0-100)
}

// ==================== 学习状态类型 ====================

/**
 * 学习模式
 */
export interface LearningMode {
  blindMode: boolean                // 默写模式
  showTranslation: boolean          // 显示释义
}

/**
 * 用户进度数据
 */
export interface UserProgress {
  dictId: string                    // 当前词库ID
  chapterId: string                 // 当前章节ID
  wordIndex: number                 // 当前单词索引
  mistakes: string[]                // 错题单词ID列表
  statistics: Statistics            // 统计数据
}

// ==================== 应用全局状态 ====================

/**
 * 应用全局状态
 */
export interface AppState {
  // 当前学习内容
  currentDict: string
  currentChapter: string
  currentIndex: number
  userInput: string

  // 字母错误计数（每个位置的错误次数）
  charErrorCount: number[]

  // 学习模式
  learningMode: LearningMode

  // 设置
  soundSettings: SoundSettings
  advancedSettings: AdvancedSettings
  displaySettings: DisplaySettings

  // 统计数据
  statistics: Statistics

  // UI 状态
  isPlaying: boolean
  isPaused: boolean
  shakeTrigger: number
  startTime: number | null

  // 对话框状态
  settingsOpen: boolean
  settingsTab: SettingsTabType
  shortcutsOpen: boolean          // 快捷键提示对话框

  // 新增：子面板状态
  pronunciationPanelOpen: boolean // 发音设置子面板
  soundEffectPanelOpen: boolean  // 音效设置子面板
  loopPanelOpen: boolean         // 单词循环子面板
  mistakesPanelOpen: boolean     // 错题本面板
  statsPanelOpen: boolean        // 数据统计面板

  // 新增：循环设置
  loopCount: number              // 循环次数（0=无限，1=不循环）
  currentWordCompletionCount: number  // 当前单词完成次数

  // 新增：错误记录（单词 -> 错误次数）
  mistakeRecord: Record<string, number>

  // 防挫败机制状态
  consecutiveMistakes: number    // 连续错误次数
  showSkipButton: boolean        // 是否显示跳过按钮
}

// ==================== 设置对话框类型 ====================

/**
 * 设置标签页类型
 */
export type SettingsTabType = 'sound' | 'advanced' | 'display' | 'data'

// ==================== API 相关类型（未来迁移用）====================

/**
 * 从主项目API获取的单词数据格式
 */
export interface APIWord {
  id: string
  word: string
  phonetic: string
  definition: string
  definition_en?: string
  part_of_speech?: string
  collocation?: string
  example_sentence?: string
  audio_url?: string | null
}

/**
 * 将API单词格式转换为打字练习所需的Word格式
 */
export function convertAPIWordToWord(apiWord: APIWord): Word {
  return {
    id: apiWord.id,
    word: apiWord.word,
    trans: apiWord.definition,
    phonetic: apiWord.phonetic,
    audio_url: apiWord.audio_url,
  }
}

// ==================== 快捷键类型 ====================

/**
 * 快捷键动作
 */
export type ShortcutAction =
  | 'toggleBlindMode'
  | 'toggleTranslation'
  | 'showShortcuts'
  | 'start'
  | 'pause'
  | 'nextWord'
  | 'previousWord'

/**
 * 快捷键定义
 */
export interface Shortcut {
  key: string                       // 按键
  ctrl?: boolean                    // 是否需要 Ctrl
  shift?: boolean                   // 是否需要 Shift
  alt?: boolean                     // 是否需要 Alt
  action: ShortcutAction            // 对应的动作
  description: string               // 描述
}
