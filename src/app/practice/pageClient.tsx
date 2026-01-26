'use client'

/**
 * SageVocab 打字练习模块 - UI设计规范优化版
 *
 * ========== 字体设计规范 ==========
 *
 * 英文字体：Inter（优先）→ sans-serif（回退）
 * 中文字体：PingFang SC（苹方）→ Microsoft YaHei（微软雅黑）
 * 组合字体：'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif
 *
 * 字间距：超大字号英文添加 tracking-wide（0.025em）
 * 字重：英文 500/600（Medium/Semibold），中文 400（Normal）
 *
 * ========== 功能特性 ==========
 *
 * - 浏览器原生 TTS 发音（美音/英音/自动切换）
 * - 打对单词自动触发发音
 * - 三态开始/暂停逻辑（暂停时按任意键继续）
 * - 实时统计（时间、输入数、WPM、正确率）
 * - 默写模式、深色模式、释义显示切换
 * - 完整快捷键支持
 * - 三次错误自动删除整词重练
 *
 * @version 4.0.0 (UI Design Specs Optimized)
 * @module practice
 * @author Claude Code
 */



import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Volume2,
  Eye,
  EyeOff,
  Settings,
  Moon,
  Sun,
  Book,
  BookOpen,
  List,
  Keyboard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  Play,
  Pause,
  GripVertical,
  Repeat,
  AlertCircle,
  BarChart3,
} from 'lucide-react'

import { SettingsModal } from './SettingsModal'
import { ShortcutsModal } from './ShortcutsModal'
import { Popover } from './Popover'
import { getTTSEngine } from './tts-engine'
import { PronunciationPanel } from './PronunciationPanel'
import { useTTS } from '@/hooks/use-tts'
import { SoundEffectPanel } from './SoundEffectPanel'
import { LoopPanel } from './LoopPanel'
import { MistakesPanel } from './MistakesPanel'
import { StatsPanel } from './StatsPanel'
import { useMistakeBook, MistakeEntry } from './useMistakeBook'
import { BookSelectorModal } from '@/components/BookSelectorModal'
import type { Book } from '@/types/book'

// ==================== 类型导入 ====================

import {
  Word,
  Dict,
  AppState,
  SoundSettings,
  AdvancedSettings,
  DisplaySettings,
  Statistics,
  LearningMode,
  SettingsTabType,
} from './types'

import { loadDict, getAvailableDicts } from './data-loader'
import { storageManager } from '@/lib/storage'

// ==================== 默认设置 ====================

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  wordPronunciation: true,
  wordVolume: 80,
  wordSpeed: 0.9,
  pronunciationScheme: 'us',
  transPronunciation: false,
  transVolume: 80,
  keySound: true, // 默认开启按键音
  keyVolume: 30,
  keySoundType: 'typewriter', // 改为打字机声音
  effectSound: true, // 默认开启效果音
  effectVolume: 50,
}

const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  shuffle: false,
  showContextWords: false,
  ignoreCase: false,
  allowTextSelection: false,
  showHintInBlindMode: false,
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  foreignFontSize: 52, // 调整为52，乘以2.5后为130px，接近原始的128px
  chineseFontSize: 18,
  darkMode: false,
}

const DEFAULT_STATISTICS: Statistics = {
  time: 0,
  inputCount: 0,
  wpm: 0,
  correctCount: 0,
  accuracy: 100,
}

// ==================== 主组件 ====================

function QwertyPracticePage() {
  // 获取 URL 参数
  const searchParams = useSearchParams()
  const urlBookId = searchParams.get('bookId')
  const urlScope = searchParams.get('scope') as 'all' | 'new' | 'known' | 'fuzzy' | 'unknown' | 'mistakes' | undefined

  // ==================== 数据加载 ====================
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typewriterText, setTypewriterText] = useState('')  // 打字机效果文字
  const [availableDicts, setAvailableDicts] = useState<Dict[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [scopeStatsMap, setScopeStatsMap] = useState<Record<string, any>>({})  // 🔧 性能优化：缓存统计数据
  const [showBookSelector, setShowBookSelector] = useState(false)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [showStartOverlay, setShowStartOverlay] = useState(true) // 开始遮罩

  // ✅ 渐进式加载状态
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadedWordCount, setLoadedWordCount] = useState(0) // 已加载的单词总数
  const [totalWordCount, setTotalWordCount] = useState(0) // 词库总单词数（如果知道的话）
  const isLoadingMoreRef = useRef(false) // 防止重复加载
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200) // 窗口宽度
  const [controlBarExpanded, setControlBarExpanded] = useState(false) // 控制栏展开状态（默认折叠）

  // ==================== mounted 状态（防止 hydration mismatch）====================
  const [mounted, setMounted] = useState(false)

  // ==================== 应用状态 ====================
  const [state, setState] = useState<AppState>({
    currentDict: '',
    currentChapter: 'all',
    currentIndex: 0,
    userInput: '',
    charErrorCount: [],
    learningMode: {
      blindMode: false,
      showTranslation: true,
    },
    soundSettings: DEFAULT_SOUND_SETTINGS,
    advancedSettings: DEFAULT_ADVANCED_SETTINGS,
    displaySettings: DEFAULT_DISPLAY_SETTINGS,
    statistics: DEFAULT_STATISTICS,
    isPlaying: false,
    isPaused: false,
    shakeTrigger: 0,
    startTime: null,
    settingsOpen: false,
    settingsTab: 'sound',
    shortcutsOpen: false,
    // 新增：子面板状态
    pronunciationPanelOpen: false,
    soundEffectPanelOpen: false,
    loopPanelOpen: false,
    mistakesPanelOpen: false,
    statsPanelOpen: false,
    // 新增：循环设置
    loopCount: 1, // 默认不循环
    currentWordCompletionCount: 0, // 当前单词完成次数
    // 新增：错误记录
    mistakeRecord: {},
    // 防挫败机制状态
    consecutiveMistakes: 0,
    showSkipButton: false,
  })

  // ==================== 计时器状态 ====================
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ==================== TTS 引擎初始化 ====================
  const ttsEngine = useRef(getTTSEngine())

  // ==================== 使用高质量TTS Hook ====================
  // 动态映射 pronunciationScheme 到 type 参数
  const pronunciationType: '1' | '2' = useMemo(() => {
    switch (state.soundSettings.pronunciationScheme) {
      case 'uk': return '1'  // 英音
      case 'us': return '2'  // 美音
      default: return '2'    // auto 默认美音
    }
  }, [state.soundSettings.pronunciationScheme])

  const { play: playWordAudio, isPlaying: isAudioPlaying, preload: preloadWordAudio } = useTTS({
    type: pronunciationType,
    showFallbackToast: false  // 不显示toast，避免干扰打字
  })

  // ==================== 音频预加载：提前加载未来2-3个单词 ====================
  useEffect(() => {
    // ========== 边界检查 ==========
    if (!currentWord || !currentDict) return
    if (!currentWord.word) return

    // 预加载接下来3个单词的音频
    const preloadNextWords = async () => {
      console.log(`[预加载] 当前单词: "${currentWord.word}" (索引: ${state.currentIndex})`)

      for (let i = 1; i <= 3; i++) {
        const nextIndex = state.currentIndex + i

        // ========== 边界检查：防止越界 ==========
        if (nextIndex >= currentDict.words.length) {
          console.log(`[预加载] 已到达词库末尾，跳过索引 ${nextIndex}`)
          break
        }

        const nextWord = currentDict.words[nextIndex]

        // ========== 边界检查：单词有效性 ==========
        if (!nextWord || !nextWord.word) {
          console.warn(`[预加载] 第${nextIndex}个单词无效，跳过`)
          continue
        }

        try {
          console.log(`[预加载] 开始加载第 ${nextIndex + 1} 个单词: "${nextWord.word}"`)
          await preloadWordAudio(nextWord.word, nextWord.audio_url)
          console.log(`[预加载] ✅ 第 ${nextIndex + 1} 个单词加载完成`)
        } catch (error) {
          // 预加载失败不影响主功能，静默处理
          console.warn(`[预加载] ⚠️ 第 ${nextIndex + 1} 个单词加载失败（忽略）:`, error)
        }
      }

      console.log(`[预加载] ========== 预加载批次完成 ==========`)
    }

    // 延迟500ms预加载，避免影响当前单词的播放性能
    const timer = setTimeout(preloadNextWords, 500)

    return () => {
      clearTimeout(timer)
      console.log(`[预加载] 清理定时器`)
    }
  }, [currentWordStr, state.currentIndex, currentDict, preloadWordAudio])

  // ==================== AudioContext 实例（复用）====================
  const audioContextRef = useRef<AudioContext | null>(null)

  // ==================== 按键音效音频缓存（使用真实音频文件）====================
  const keySoundAudioRef = useRef<HTMLAudioElement | null>(null)
  const successSoundRef = useRef<HTMLAudioElement | null>(null)  // 🎵 单词完成奖励音效

  // ==================== 错题本 Hook ====================
  const mistakeBook = useMistakeBook()

  // ==================== 防挫败机制状态 ====================
  const [isSpecialReviewMode, setIsSpecialReviewMode] = useState(false) // 是否为错题专项练习模式
  const [specialReviewWords, setSpecialReviewWords] = useState<string[]>([]) // 专项练习单词列表

  // ==================== 当前数据（必须在 useCallback 之前定义）====================
  const currentDict = availableDicts.find((d) => d.id === state.currentDict) || availableDicts[0]

  // 使用 useMemo 缓存当前单词，避免对象引用变化
  const currentWord = useMemo(() => {
    if (isSpecialReviewMode) {
      return currentDict?.words.find((w) => w.word === specialReviewWords[state.currentIndex])
    }
    return currentDict?.words[state.currentIndex]
  }, [isSpecialReviewMode, specialReviewWords, state.currentIndex, currentDict])

  const currentTrans = currentWord?.trans || ''
  const currentWordStr = currentWord?.word || '' // 用于依赖项的稳定字符串

  // ==================== 窗口大小监听（响应式字号）====================
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ==================== 辅助函数 ====================

  // 关闭所有子面板
  const closeAllSubPanels = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pronunciationPanelOpen: false,
      soundEffectPanelOpen: false,
      loopPanelOpen: false,
      mistakesPanelOpen: false,
      statsPanelOpen: false,
    }))
  }, [])

  // 切换发音面板
  const togglePronunciationPanel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pronunciationPanelOpen: !prev.pronunciationPanelOpen,
      soundEffectPanelOpen: false,
      loopPanelOpen: false,
    }))
  }, [])

  // 切换音效面板
  const toggleSoundEffectPanel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pronunciationPanelOpen: false,
      soundEffectPanelOpen: !prev.soundEffectPanelOpen,
      loopPanelOpen: false,
    }))
  }, [])

  // 切换循环面板
  const toggleLoopPanel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pronunciationPanelOpen: false,
      soundEffectPanelOpen: false,
      loopPanelOpen: !prev.loopPanelOpen,
    }))
  }, [])

  // ==================== 防挫败机制函数 ====================

  // 跳过当前单词
  const skipCurrentWord = useCallback(() => {
    const word = currentWord?.word
    if (!word || !currentDict) return

    // 添加到错题本
    mistakeBook.addMistake(word, currentWord.trans || '', currentWord.phonetic)

    // 跳转到下一个单词，同时重置连续错误计数
    const nextIndex = state.currentIndex + 1
    setState((prev) => ({
      ...prev,
      currentIndex: nextIndex >= currentDict.words.length ? 0 : nextIndex,
      userInput: '',
      charErrorCount: [],
      currentWordCompletionCount: 0,
      consecutiveMistakes: 0,
      showSkipButton: false,
    }))
  }, [currentWord, currentDict, state.currentIndex, mistakeBook])

  // 开始错题专项练习
  const startSpecialReview = useCallback(() => {
    const unmasteredMistakes = mistakeBook.getUnmasteredList()
    if (unmasteredMistakes.length === 0) return

    // 设置专项练习模式
    setIsSpecialReviewMode(true)
    setSpecialReviewWords(unmasteredMistakes.map((m) => m.word))

    // 关闭错题本面板
    setState((prev) => ({
      ...prev,
      mistakesPanelOpen: false,
      currentIndex: 0,
      userInput: '',
      charErrorCount: [],
      currentWordCompletionCount: 0,
    }))
  }, [mistakeBook])

  // 退出专项练习模式
  const exitSpecialReviewMode = useCallback(() => {
    setIsSpecialReviewMode(false)
    setSpecialReviewWords([])

    // 恢复正常词库的第一个单词，同时重置连续错误计数
    setState((prev) => ({
      ...prev,
      currentIndex: 0,
      userInput: '',
      charErrorCount: [],
      currentWordCompletionCount: 0,
      consecutiveMistakes: 0,
      showSkipButton: false,
    }))
  }, [])

  // 清空已掌握的错题
  const clearMasteredMistakes = useCallback(() => {
    mistakeBook.clearMastered()
  }, [mistakeBook])

  // 清空所有错题
  const clearAllMistakes = useCallback(() => {
    mistakeBook.clearAll()
  }, [mistakeBook])

  // ==================== 词库切换 ====================
  const handleDictChange = useCallback(async (dictId: string) => {
    try {
      // 如果是当前词库，不需要切换
      if (dictId === state.currentDict) return

      // 加载新词库的单词数据
      const fullDict = await loadDict(dictId)

      // 更新 availableDicts，将新词库替换为完整版本
      setAvailableDicts((prev) =>
        prev.map((d) => (d.id === dictId ? fullDict : d))
      )

      // 更新当前词库和重置状态
      setState((prev) => ({
        ...prev,
        currentDict: dictId,
        currentIndex: 0,
        userInput: '',
        charErrorCount: [],
        startTime: null,
        isPaused: false,
        currentWordCompletionCount: 0,
      }))

      // 重置计时器和统计
      setElapsedTime(0)

      // 保存到 localStorage
      localStorage.setItem(
        'sagevocab-progress',
        JSON.stringify({ currentDict: dictId, currentIndex: 0 })
      )
    } catch (error) {
      console.error('Failed to switch dict:', error)
      alert(`切换词库失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [state.currentDict])

  // 播放错题发音
  const playMistakePronunciation = useCallback(
    async (word: string) => {
      await playWordAudio(word, null)  // 错题没有audio_url，传null
    },
    [playWordAudio]
  )

  // 练习特定错题
  const practiceMistakeWord = useCallback(
    (word: string) => {
      // 退出专项练习模式（如果在的话）
      if (isSpecialReviewMode) {
        const wordIndex = specialReviewWords.indexOf(word)
        if (wordIndex >= 0) {
          setState((prev) => ({
            ...prev,
            currentIndex: wordIndex,
            userInput: '',
            charErrorCount: [],
            mistakesPanelOpen: false,
            currentWordCompletionCount: 0,
          }))
        }
      } else {
        // 正常模式：跳转到该单词
        const wordIndex = currentDict?.words.findIndex((w) => w.word === word)
        if (wordIndex !== undefined && wordIndex >= 0) {
          setState((prev) => ({
            ...prev,
            currentIndex: wordIndex,
            userInput: '',
            charErrorCount: [],
            mistakesPanelOpen: false,
            currentWordCompletionCount: 0,
          }))
        }
      }
    },
    [isSpecialReviewMode, specialReviewWords, currentDict]
  )

  // ==================== 数据加载 ====================
  useEffect(() => {
    async function loadData() {
      try {
        // ⚠️ 修复：每次开始加载数据时，确保显示开始遮罩并重置游戏状态
        setShowStartOverlay(true)
        setIsLoading(true)
        // 确保游戏状态为暂停，防止用户在加载过程中就开始输入
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          startTime: null,
          userInput: '',
        }))

        // 如果 URL 中没有 bookId，获取books列表并显示选择器
        if (!urlBookId) {
          try {
            // 获取当前用户信息
            const userRes = await fetch('/api/auth/user')
            if (userRes.ok) {
              const userData = await userRes.json()
              setUserId(userData.id)
            }

            // 获取可用的词库列表
            const booksRes = await fetch('/api/books')
            console.log('[Practice] /api/books response status:', booksRes.status)

            if (booksRes.ok) {
              const booksData = await booksRes.json()
              console.log('[Practice] /api/books response data:', booksData)
              setBooks(booksData || [])

              // 如果没有可用的词库，显示提示信息
              if (!booksData || booksData.length === 0) {
                console.log('[Practice] No books available')
                setLoadError('暂无可用的词库，请联系管理员获取权限')
                setIsLoading(false)
                return
              }

              // 🔧 性能优化：批量预加载所有词库的统计数据
              try {
                const bookIds = booksData.map((b: any) => b.id)
                const { data: progressData } = await (await fetch('/api/word-progress/batch-stats', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ bookIds })
                })).json()

                // 构建统计数据映射
                const statsMap: Record<string, any> = {}
                for (const book of booksData) {
                  const bookStats = progressData?.[book.id] || { unknown: 0, fuzzy: 0, known: 0 }
                  const totalWords = book.total_words || 0
                  statsMap[book.id] = {
                    all: totalWords,
                    unknown: bookStats.unknown || 0,
                    fuzzy: bookStats.fuzzy || 0,
                    known: bookStats.known || 0,
                    new: Math.max(0, totalWords - (bookStats.unknown || 0) - (bookStats.fuzzy || 0) - (bookStats.known || 0)),
                    mistakes: 0
                  }
                }
                setScopeStatsMap(statsMap)
                console.log('[Practice] Preloaded stats for', Object.keys(statsMap).length, 'books')
              } catch (error) {
                console.error('[Practice] Failed to preload stats:', error)
                // 失败不影响显示，只是每个词库需要单独请求
              }
            } else {
              const errorText = await booksRes.text()
              console.error('[Practice] /api/books error:', booksRes.status, errorText)
              setLoadError(`获取词库列表失败 (${booksRes.status})，请稍后重试`)
              setIsLoading(false)
              return
            }

            // 显示词库选择器
            setShowBookSelector(true)
            setIsLoading(false)
          } catch (error) {
            console.error('[BookSelector] Failed to load data:', error)
            setLoadError('加载词库列表失败，请刷新页面重试')
            setIsLoading(false)
          }
          return
        }

        console.log('[Practice] Loading data for:', urlBookId, urlScope)

        // 并行执行：获取进度和加载词库数据（先加载默认位置）
        const [progressData, fullDict] = await Promise.all([
          // 获取进度
          fetch(`/api/typing/progress?bookId=${urlBookId}&scope=${urlScope}`)
            .then(res => res.ok ? res.json() : { hasProgress: false, savedIndex: null })
            .catch(() => ({ hasProgress: false, savedIndex: null })),
          // 加载词库（从位置0开始，快速响应）
          loadDict(urlBookId, urlScope, undefined)
        ])

        let savedIndex = null
        let finalDict = fullDict

        // 如果有保存的进度且超出当前加载范围，重新加载
        if (progressData?.hasProgress && progressData.savedIndex !== null) {
          savedIndex = progressData.savedIndex
          console.log('[TypingProgress] Found saved progress:', savedIndex)

          // 如果savedIndex超出当前加载范围，重新加载对应位置
          if (savedIndex >= fullDict.words.length) {
            console.log('[Practice] Reloading dict at saved index:', savedIndex)
            finalDict = await loadDict(urlBookId, urlScope, savedIndex)
          }
        }

        // 更新状态
        setAvailableDicts([finalDict])
        setState((prev) => ({
          ...prev,
          currentDict: urlBookId,
          currentIndex: savedIndex !== null ? savedIndex : 0,
        }))

        console.log('[Practice] Data loaded successfully, total words:', finalDict.words.length, 'currentIndex:', savedIndex !== null ? savedIndex : 0)

        // 添加调试：检查加载完成后的状态
        console.log('[DEBUG] After loading:', {
          dictId: finalDict.id,
          dictName: finalDict.name,
          wordsCount: finalDict.words.length,
          word0: finalDict.words[0],
          currentIndex: savedIndex !== null ? savedIndex : 0,
          currentWordAtStart: finalDict.words[savedIndex !== null ? savedIndex : 0]
        })

        console.log('[Loading] About to set isLoading to false')
        setIsLoading(false)

        // ✅ 初始化渐进式加载状态
        setLoadedWordCount(finalDict.words.length)
        console.log('[Loading] isLoading set to false - component should re-render')
      } catch (error) {
        console.error('Error loading data:', error)
        setLoadError(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`)
        setIsLoading(false)
      }
    }

    loadData()
  }, [urlBookId, urlScope])

  // ✅ 渐进式加载：当接近已加载单词末尾时，自动加载下一批
  const loadMoreWords = useCallback(async () => {
    // 防止重复加载
    if (isLoadingMoreRef.current || isLoadingMore) {
      console.log('[渐进式加载] 已在加载中，跳过')
      return
    }

    const currentDict = availableDicts[0]
    if (!currentDict) return

    const startIndex = loadedWordCount
    console.log('[渐进式加载] 开始加载更多单词，从索引:', startIndex)

    isLoadingMoreRef.current = true
    setIsLoadingMore(true)

    try {
      // 加载下一批50个单词
      const moreDict = await loadDict(urlBookId, urlScope, startIndex)

      if (moreDict.words.length > 0) {
        // 追加新单词到现有词库
        const updatedDict = {
          ...currentDict,
          words: [...currentDict.words, ...moreDict.words]
        }

        setAvailableDicts([updatedDict])
        setLoadedWordCount(startIndex + moreDict.words.length)

        console.log('[渐进式加载] 成功加载', moreDict.words.length, '个单词，总计', loadedWordCount + moreDict.words.length)
      } else {
        console.log('[渐进式加载] 没有更多单词了')
        setTotalWordCount(loadedWordCount) // 设置总数
      }
    } catch (error) {
      console.error('[渐进式加载] 加载失败:', error)
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [availableDicts, loadedWordCount, urlBookId, urlScope, isLoadingMore])

  // 监听currentIndex，当接近已加载单词末尾时触发加载
  useEffect(() => {
    if (!availableDicts[0]) return

    const currentDict = availableDicts[0]
    const wordsRemaining = currentDict.words.length - state.currentIndex

    // 当剩余单词少于10个时，触发自动加载
    if (wordsRemaining <= 10 && wordsRemaining > 0 && !isLoadingMore && !isLoadingMoreRef.current) {
      console.log('[渐进式加载] 剩余', wordsRemaining, '个单词，触发加载')
      loadMoreWords()
    }
  }, [state.currentIndex, availableDicts, isLoadingMore, loadMoreWords])

  // ==================== localStorage 持久化 ====================

  // 🔧 性能优化：使用StorageManager进行防抖保存，避免频繁写入
  useEffect(() => {
    const settingsToSave = {
      soundSettings: state.soundSettings,
      advancedSettings: state.advancedSettings,
      displaySettings: state.displaySettings,
      learningMode: state.learningMode,
      loopCount: state.loopCount,
    }
    // 使用防抖保存，1秒内的多次变化只保存最后一次
    storageManager.save('sagevocab-settings', settingsToSave, 1000)
  }, [state.soundSettings, state.advancedSettings, state.displaySettings, state.learningMode, state.loopCount])

  // 保存错题记录到 localStorage
  useEffect(() => {
    // 错题记录使用较短的防抖时间（500ms），因为错题数据很重要
    storageManager.save('sagevocab-mistakes', state.mistakeRecord, 500)
  }, [state.mistakeRecord])

  // 保存学习统计到 localStorage
  useEffect(() => {
    // 统计数据变化频繁，使用1秒防抖
    storageManager.save('sagevocab-stats', state.statistics, 1000)
  }, [state.statistics])

  // 保存当前进度到 localStorage 和服务器
  useEffect(() => {
    // 保存到 localStorage（使用防抖）
    const progressToSave = {
      currentDict: state.currentDict,
      currentIndex: state.currentIndex,
    }
    storageManager.save('sagevocab-progress', progressToSave, 1000)

    // 如果有URL参数（bookId和scope），同时保存到服务器
    if (urlBookId && urlScope && currentDict && state.currentIndex >= 0) {
      const saveToServer = async () => {
        try {
          await fetch('/api/typing/save-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookId: urlBookId,
              scope: urlScope,
              index: state.currentIndex,
              totalWords: currentDict.words.length
            })
          })
        } catch (error) {
          console.warn('[TypingProgress] Failed to save to server:', error)
        }
      }

      // 使用防抖，避免频繁请求
      const timeoutId = setTimeout(saveToServer, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [state.currentDict, state.currentIndex, urlBookId, urlScope, currentDict])

  // 加载设置从 localStorage（仅在组件挂载时执行一次）
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('sagevocab-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setState((prev) => ({
          ...prev,
          soundSettings: { ...prev.soundSettings, ...parsed.soundSettings },
          advancedSettings: { ...prev.advancedSettings, ...parsed.advancedSettings },
          displaySettings: { ...prev.displaySettings, ...parsed.displaySettings },
          learningMode: { ...prev.learningMode, ...parsed.learningMode },
          loopCount: parsed.loopCount ?? 1,
        }))
      }
    } catch (error) {
      console.warn('[localStorage] Failed to load settings:', error)
    }
  }, [])

  // 加载错题记录从 localStorage（仅在组件挂载时执行一次）
  useEffect(() => {
    try {
      const savedMistakes = localStorage.getItem('sagevocab-mistakes')
      if (savedMistakes) {
        const parsed = JSON.parse(savedMistakes)
        setState((prev) => ({
          ...prev,
          mistakeRecord: parsed,
        }))
      }
    } catch (error) {
      console.warn('[localStorage] Failed to load mistakes:', error)
    }
  }, [])

  // 加载学习统计从 localStorage（仅在组件挂载时执行一次）
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem('sagevocab-stats')
      if (savedStats) {
        const parsed = JSON.parse(savedStats)
        setState((prev) => ({
          ...prev,
          statistics: { ...prev.statistics, ...parsed },
        }))
      }
    } catch (error) {
      console.warn('[localStorage] Failed to load stats:', error)
    }
  }, [])

  // ==================== 计时器逻辑（支持暂停）====================
  useEffect(() => {
    if (state.startTime && !state.isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state.startTime, state.isPaused])

  // ==================== 组件卸载清理 ====================
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      ttsEngine.current.cancel()

      // 清理 AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      // 🔧 性能优化：组件卸载时立即保存所有待保存的localStorage数据
      storageManager.flush()
    }
  }, [])

  // ==================== 计算函数 ====================
  const calculateWPM = useCallback(() => {
    if (!state.startTime || state.statistics.correctCount === 0) return 0
    const minutes = elapsedTime / 60
    // 使用正确字符数计算WPM，而不是总输入数
    return Math.round(state.statistics.correctCount / 5 / minutes) || 0
  }, [state.startTime, state.statistics.correctCount, elapsedTime])

  const calculateAccuracy = useCallback(() => {
    if (state.statistics.inputCount === 0) return 100
    return Math.round((state.statistics.correctCount / state.statistics.inputCount) * 100)
  }, [state.statistics.inputCount, state.statistics.correctCount])

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // ==================== 打字机效果 ====================
  const startOverlayText = [
    '准备好了吗？Are You Ready?',
    '按 ENTER 或点击下方开始',
    '开始练习 Start Practice'
  ]

  useEffect(() => {
    if (!showStartOverlay || isLoading) return

    let currentIndex = 0
    let fullText = ''

    // 打字机效果：逐句显示（不是逐词）
    const typeNextSentence = () => {
      if (currentIndex < startOverlayText.length) {
        const sentence = startOverlayText[currentIndex]
        fullText += (currentIndex > 0 ? '\n' : '') + sentence
        setTypewriterText(fullText)
        currentIndex++
        setTimeout(typeNextSentence, 600) // 每600ms显示一句
      }
    }

    // 开始打字机效果
    setTypewriterText('')
    setTimeout(typeNextSentence, 500) // 延迟500ms开始

    return () => {
      setTypewriterText('')
    }
  }, [showStartOverlay, isLoading])

  // ==================== 按键音效播放（使用真实音频文件）====================
  const playKeySound = useCallback((isCorrect: boolean) => {
    if (typeof window === 'undefined') return // SSR兼容

    try {
      // 初始化音频缓存（使用真实音频文件）
      if (!keySoundAudioRef.current) {
        const audio = new Audio('/sounds/keyboard.wav')
        audio.preload = 'auto'  // 预加载音频
        keySoundAudioRef.current = audio
      }

      const audio = keySoundAudioRef.current
      const volume = state.soundSettings.keyVolume / 100

      // 设置音量并播放
      audio.volume = volume
      audio.currentTime = 0  // 重置到开头，支持快速连续播放

      // 使用 play() 方法播放
      audio.play().catch((error) => {
        console.warn('[KeySound] Play failed:', error)
      })
    } catch (error) {
      console.warn('[KeySound] Failed to play:', error)
    }
  }, [state.soundSettings.keyVolume])

  // ==================== 单词完成奖励音效 ====================
  const playSuccessSound = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      // 使用 Web Audio API 生成学习奖励音效（三音符上升琶音，更有成就感）
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // 创建三个振荡器，形成大三和弦琶音
      const notes = [
        { freq: 523.25, startTime: 0, duration: 0.15 },      // C5
        { freq: 659.25, startTime: 0.1, duration: 0.15 },    // E5
        { freq: 783.99, startTime: 0.2, duration: 0.25 }     // G5
      ]

      notes.forEach(({ freq, startTime, duration }) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // 使用正弦波，声音更温暖
        oscillator.type = 'sine'

        // 设置音调
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + startTime)

        // 设置音量包络（柔和的淡入淡出）
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime)
        gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + startTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration)

        oscillator.start(audioContext.currentTime + startTime)
        oscillator.stop(audioContext.currentTime + startTime + duration)
      })
    } catch (error) {
      console.warn('[SuccessSound] Failed to play:', error)
    }
  }, [])

  // ==================== 键盘处理 ====================
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      console.log('[KeyPress] Key pressed:', {
        key: e.key,
        showStartOverlay,
        isLoading,
        startTime: state.startTime
      })

      // ========== ⚠️ 重要防御：开始遮罩状态下阻止所有输入（除了Enter）==========
      if (showStartOverlay) {
        if (e.key === 'Enter') {
          console.log('[KeyPress] ENTER pressed on start overlay - dismissing')
          e.preventDefault()
          setShowStartOverlay(false)
          setState((prev) => {
            console.log('[KeyPress] Updating state:', { ...prev, isPlaying: true, startTime: Date.now() })
            return { ...prev, isPlaying: true, startTime: Date.now() }
          })
        } else {
          // 阻止所有其他按键，防止用户在开始之前就输入
          console.log('[KeyPress] Blocking key press while showing start overlay')
          e.preventDefault()
        }
        return
      }

      // ========== 暂停状态下按任意键继续 ==========
      if (state.isPaused && state.startTime) {
        if (e.key === 'Escape') return

        if (
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          e.key.length === 1 &&
          e.key !== 'F5' &&
          e.key !== 'F12'
        ) {
          e.preventDefault()
          setState((prev) => ({ ...prev, isPaused: false }))
          return
        }

        if (e.key === 'Enter') {
          e.preventDefault()
          setState((prev) => ({ ...prev, isPaused: false }))
          return
        }
        return
      }

      // ========== 快捷键处理 ==========
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'v') {
          e.preventDefault()
          setState((prev) => ({
            ...prev,
            soundSettings: {
              ...prev.soundSettings,
              keySound: !prev.soundSettings.keySound,
            },
          }))
          return
        }
        if (e.key === 'm') {
          e.preventDefault()
          setState((prev) => ({
            ...prev,
            learningMode: {
              ...prev.learningMode,
              blindMode: !prev.learningMode.blindMode,
            },
          }))
          return
        }
        if (e.shiftKey && e.key === 'V') {
          e.preventDefault()
          setState((prev) => ({
            ...prev,
            learningMode: {
              ...prev.learningMode,
              showTranslation: !prev.learningMode.showTranslation,
            },
          }))
          return
        }
        if (e.key === 'j') {
          e.preventDefault()
          setState((prev) => ({ ...prev, shortcutsOpen: !prev.shortcutsOpen }))
          return
        }
      }

      // Tab 键显示翻译（在默写模式下）
      if (e.key === 'Tab') {
        e.preventDefault()
        return
      }

      // ========== Enter 开始/继续 ==========
      if (e.key === 'Enter') {
        if (!state.startTime) {
          setState((prev) => ({ ...prev, startTime: Date.now(), isPaused: false }))
          setElapsedTime(0)
        } else if (state.isPaused) {
          return
        }
        return
      }

      // ========== Esc 跳过当前单词 ==========
      if (e.key === 'Escape' && state.showSkipButton) {
        e.preventDefault()
        skipCurrentWord()
        return
      }

      // ========== 普通字符输入 ==========
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // 允许字母、连字符（-）和空格（支持词组如 mini-skirt, hot dog）
        if (!/^[a-zA-Z\-\s]$/.test(e.key)) {
          return
        }

        if (!currentWord) return
        if (state.userInput.length >= currentWord.word.length) return

        const targetChar = currentWord.word[state.userInput.length]

        // ✅ 特殊符号宽松匹配：如果目标字符是特殊符号，任何输入都算正确
        // 🔧 修复：添加更多特殊符号（标点、数学符号等）
        const isSpecialChar = /^[\-'\s=;,.()（）【】\[\]{}、，。；：！？""''""«»〈〉《》]/.test(targetChar)
        // 注意：空格比较时需要原样比较，不转小写
        const isCorrect = isSpecialChar || // 特殊符号：任意字符都算对
          (e.key === ' ' && targetChar === ' ') ||
          (e.key !== ' ' && e.key.toLowerCase() === targetChar.toLowerCase())

        if (state.soundSettings.keySound) {
          playKeySound(isCorrect)
        }

        setState((prev) => {
          const currentInputIndex = prev.userInput.length

          if (isCorrect) {
            const newUserInput = prev.userInput + e.key
            const newCharErrorCount = [...prev.charErrorCount, 0]

            return {
              ...prev,
              userInput: newUserInput,
              charErrorCount: newCharErrorCount,
              statistics: {
                ...prev.statistics,
                inputCount: prev.statistics.inputCount + 1,
                correctCount: prev.statistics.correctCount + 1,
              },
            }
          } else {
            const newCharErrorCount = [...prev.charErrorCount]
            if (!newCharErrorCount[currentInputIndex]) {
              newCharErrorCount[currentInputIndex] = 0
            }
            newCharErrorCount[currentInputIndex]++

            if (newCharErrorCount[currentInputIndex] >= 3) {
              // 三次错误，删除整个单词并增加连续错误计数
              const newConsecutiveMistakes = prev.consecutiveMistakes + 1

              // 添加到错题本（使用useMistakeBook）
              const word = currentWord?.word
              if (word) {
                mistakeBook.addMistake(word, currentWord.trans || '', currentWord.phonetic)
              }

              return {
                ...prev,
                userInput: '',
                charErrorCount: [],
                shakeTrigger: prev.shakeTrigger + 1,
                consecutiveMistakes: newConsecutiveMistakes,
                showSkipButton: newConsecutiveMistakes >= 4,
                statistics: {
                  ...prev.statistics,
                  inputCount: prev.statistics.inputCount + 1,
                },
              }
            } else {
              return {
                ...prev,
                charErrorCount: newCharErrorCount,
                shakeTrigger: prev.shakeTrigger + 1,
                statistics: {
                  ...prev.statistics,
                  inputCount: prev.statistics.inputCount + 1,
                },
              }
            }
          }
        })
      }

      // ========== Backspace 删除 ==========
      if (e.key === 'Backspace' && state.userInput.length > 0) {
        setState((prev) => ({
          ...prev,
          userInput: prev.userInput.slice(0, -1),
        }))
      }
    },
    [
      state.userInput,
      state.startTime,
      state.isPaused,
      state.soundSettings,
      currentWordStr,
      currentWord, // 仍然需要用于访问 word, trans 等属性
      state.statistics,
      state.showSkipButton,
      skipCurrentWord,
      mistakeBook,
    ]
  )

  // ==================== 键盘事件监听器 ====================
  useEffect(() => {
    console.log('[EventListener] Setting up keyboard listener:', {
      isLoading,
      showStartOverlay,
      willAttach: !isLoading
    })

    if (!isLoading) {
      console.log('[EventListener] Attaching keyboard listener')
      window.addEventListener('keydown', handleKeyPress)

      return () => {
        console.log('[EventListener] Removing keyboard listener')
        window.removeEventListener('keydown', handleKeyPress)
      }
    } else {
      console.log('[EventListener] NOT attaching - still loading')
    }
  }, [handleKeyPress, isLoading, showStartOverlay])

  // ==================== 新单词出现时播放 TTS 发音 ====================
  useEffect(() => {
    if (currentWord && state.startTime && !state.isPaused && state.soundSettings.wordPronunciation) {
      playWordAudio(currentWord.word, currentWord.audio_url).catch((error) => {
        console.warn('[TTS] Word pronunciation failed:', error)
      })
    }
  }, [currentWordStr, state.startTime, state.isPaused, state.soundSettings.wordPronunciation, playWordAudio, currentWord])

  // ==================== 单词完成检测 ====================
  useEffect(() => {
    // ✅ 防御性检查：确保 currentWord 和 currentDict 存在
    if (!currentWord?.word || !currentDict?.words) {
      console.warn('[WordComplete] Missing currentWord or currentDict', { currentWord, currentDict })
      return
    }

    // ✅ 单词完成判断：考虑特殊符号的宽松匹配
    // 规则：如果输入长度等于单词长度，且所有非特殊符号位置都匹配，则视为完成
    const wordLength = currentWord.word.length
    const isLengthMatch = state.userInput.length === wordLength

    if (!isLengthMatch) return

    // 检查是否所有非特殊符号位置都正确输入
    let allNonSpecialCharsCorrect = true
    for (let i = 0; i < wordLength; i++) {
      const targetChar = currentWord.word[i]
      const inputChar = state.userInput[i]

      // 🔧 修复：跳过特殊符号（它们允许任意输入）
      // 包含：标点、数学符号、中英文标点等
      if (/^[\-'\s=;,.()（）【】\[\]{}、，。；：！？""''""«»〈〉《》]/.test(targetChar)) {
        continue
      }

      // 检查非特殊符号是否正确
      if (inputChar?.toLowerCase() !== targetChar?.toLowerCase()) {
        allNonSpecialCharsCorrect = false
        break
      }
    }

    if (allNonSpecialCharsCorrect) {
      console.log('[WordComplete] Word completed:', currentWord.word, 'input:', state.userInput)

      // 🎵 播放单词完成奖励音效
      playSuccessSound()

      const timer = setTimeout(() => {
        setState((prev) => {
          // ✅ 防御性检查
          if (!currentDict || !currentDict.words || currentDict.words.length === 0) {
            console.error('[WordComplete] Invalid dictionary state')
            return prev
          }

          // 循环逻辑
          const targetLoopCount = prev.loopCount === 0 ? Infinity : prev.loopCount
          const newCompletionCount = prev.currentWordCompletionCount + 1

          // 如果还未达到循环次数，重置当前单词继续练习
          if (newCompletionCount < targetLoopCount) {
            console.log('[WordComplete] Looping same word, count:', newCompletionCount)
            return {
              ...prev,
              userInput: '',
              charErrorCount: [],
              currentWordCompletionCount: newCompletionCount,
            }
          }

          // 达到循环次数，移动到下一个单词并重置完成次数
          const nextIndex = prev.currentIndex + 1
          console.log('[WordComplete] Moving to next word:', nextIndex, 'total:', currentDict.words.length)

          if (nextIndex >= currentDict.words.length) {
            console.log('[WordComplete] Reached end, wrapping to start')
            return {
              ...prev,
              currentIndex: 0,
              userInput: '',
              charErrorCount: [],
              currentWordCompletionCount: 0, // 重置完成次数
            }
          }
          return {
            ...prev,
            currentIndex: nextIndex,
            userInput: '',
            charErrorCount: [],
            currentWordCompletionCount: 0, // 重置完成次数
          }
        })
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [state.userInput, currentWordStr, currentDict, state.loopCount, state.currentWordCompletionCount, playSuccessSound])

  // ==================== 单词切换时重置连续错误计数 ====================
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      consecutiveMistakes: 0,
      showSkipButton: false,
    }))
  }, [currentWordStr])

  // ==================== 正确完成单词时重置连续错误计数 ====================
  useEffect(() => {
    if (state.userInput === currentWordStr && state.userInput.length > 0) {
      setState((prev) => ({
        ...prev,
        consecutiveMistakes: 0,
        showSkipButton: false,
      }))
    }
  }, [state.userInput, currentWordStr])

  // ==================== mounted 状态初始化 ====================
  useEffect(() => {
    setMounted(true)
  }, [])

  // ==================== 加载状态（Neo-Brutalism 游戏化，响应式，黑暗模式）====================
  if (isLoading) {
    // 客户端未 mounted 时显示占位，避免 hydration mismatch
    if (!mounted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      )
    }

    // 客户端已 mounted，现在可以安全检测系统黑暗模式
    const isSystemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden px-4 transition-colors duration-300 ${
        isSystemDark ? 'bg-gray-950' : 'bg-neo-bg'
      }`}>
        {/* Neo-Brutalism 几何装饰背景 */}
        <div className={`absolute inset-0 overflow-hidden ${isSystemDark ? 'opacity-5' : 'opacity-10'}`}>
          {/* 网格线 */}
          <div className="absolute inset-0" style={{
            backgroundImage: isSystemDark
              ? 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)'
              : 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>

          {/* 装饰性方块 */}
          <div className={`absolute top-20 left-20 w-20 h-20 border-4 shadow-neo-md hidden sm:block ${
            isSystemDark ? 'border-gray-700 bg-lime-900/30' : 'border-black bg-yellow-400'
          }`}></div>
          <div className={`absolute top-40 right-32 w-16 h-16 border-4 shadow-neo-md hidden sm:block ${
            isSystemDark ? 'border-gray-700 bg-blue-900/30' : 'border-black bg-yellow-400'
          }`}></div>
          <div className={`absolute bottom-32 left-40 w-24 h-24 border-4 shadow-neo-md hidden sm:block ${
            isSystemDark ? 'border-gray-700 bg-purple-900/30' : 'border-black bg-blue-400'
          }`}></div>
          <div className={`absolute bottom-20 right-20 w-12 h-12 border-4 shadow-neo-md hidden sm:block ${
            isSystemDark ? 'border-gray-700 bg-rose-900/30' : 'border-black bg-red-400'
          }`}></div>
        </div>

        {/* 加载内容卡片 */}
        <motion.div
          className={`relative z-10 border-4 shadow-neo-lg p-6 sm:p-8 md:p-12 max-w-lg w-full mx-4 transition-colors duration-300 ${
            isSystemDark
              ? 'bg-gray-900 border-gray-700'
              : 'bg-white border-black'
          }`}
          initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* 标题栏 */}
          <div className={`border-b-4 pb-4 sm:pb-6 mb-6 sm:mb-8 ${
            isSystemDark ? 'border-gray-700' : 'border-black'
          }`}>
            <motion.h1
              className={`text-2xl sm:text-3xl md:text-4xl font-black mb-2 ${
                isSystemDark ? 'text-lime-100' : 'text-neo-black'
              }`}
              animate={{ x: [0, -5, 5, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            >
              加载中...
            </motion.h1>
            <p className={`text-base sm:text-lg font-semibold ${
              isSystemDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              正在准备打字练习词库
            </p>
          </div>

          {/* 游戏化进度展示 */}
          <div className="space-y-4 sm:space-y-6">
            {/* 跳动的方块动画 - 黑暗模式优化 */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {(isSystemDark
                ? ['bg-lime-500', 'bg-blue-500', 'bg-rose-500', 'bg-purple-500']
                : ['bg-yellow-400', 'bg-blue-400', 'bg-red-400', 'bg-green-400']
              ).map((color, index) => (
                <motion.div
                  key={index}
                  className={`w-8 h-8 sm:w-12 sm:h-12 border-3 shadow-neo-sm ${color} ${
                    isSystemDark ? 'border-gray-600' : 'border-black'
                  }`}
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: index * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>

            {/* Neo-Brutalism 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className={isSystemDark ? 'text-gray-200' : 'text-neo-black'}>加载进度</span>
                <motion.span
                  className={isSystemDark ? 'text-gray-400' : 'text-neo-black'}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  准备中...
                </motion.span>
              </div>
              <div className={`h-4 sm:h-6 border-3 shadow-neo-sm relative overflow-hidden ${
                isSystemDark
                  ? 'border-gray-600 bg-gray-800'
                  : 'border-black bg-gray-100'
              }`}>
                <motion.div
                  className={`h-full ${
                    isSystemDark
                      ? 'bg-gradient-to-r from-lime-500 via-blue-500 to-rose-500'
                      : 'bg-gradient-to-r from-yellow-400 via-blue-400 to-red-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* 提示框 */}
            <motion.div
              className={`border-3 shadow-neo-sm p-3 sm:p-4 ${
                isSystemDark
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-yellow-100 border-black'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <p className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${
                isSystemDark ? 'text-gray-200' : 'text-neo-black'
              }`}>
                <span className="text-lg sm:text-xl">💡</span>
                <span>提示：准备好开始练习了吗？</span>
              </p>
            </motion.div>
          </div>

          {/* 底部装饰 */}
          <div className={`mt-6 sm:mt-8 pt-4 sm:pt-6 border-t-4 flex justify-between items-center ${
            isSystemDark ? 'border-gray-700' : 'border-black'
          }`}>
            <div className={`text-xs font-bold ${isSystemDark ? 'text-gray-500' : 'text-gray-500'}`}>
              WORD PRACTICE
            </div>
            <motion.div
              className={`w-6 h-6 sm:w-8 sm:h-8 border-3 shadow-neo-sm ${
                isSystemDark ? 'border-gray-600 bg-lime-500' : 'border-black bg-neo-black'
              }`}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  // ==================== 错误状态 ====================
  // 如果显示词库选择器，渲染一个包含Modal的页面
  if (showBookSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 transition-colors duration-300">
        {books.length > 0 && (
          <BookSelectorModal
            books={books}
            onClose={() => setShowBookSelector(false)}
            userId={userId}
            initialScopeStats={scopeStatsMap}
          />
        )}
      </div>
    )
  }

  if (loadError || !currentDict) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <p className="text-lg text-red-600 font-semibold mb-4">{loadError || '词库加载失败'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  // ==================== 开始/暂停处理函数 ====================
  const handleTogglePause = () => {
    if (!state.startTime) {
      setState((prev) => ({ ...prev, startTime: Date.now(), isPaused: false }))
      setElapsedTime(0)
    } else if (state.isPaused) {
      setState((prev) => ({ ...prev, isPaused: false }))
    } else {
      setState((prev) => ({ ...prev, isPaused: true }))
    }
  }

  // ==================== 渲染页面 ====================
  // 渲染状态日志
  console.log('[Render] Page rendering with state:', {
    isLoading,
    loadError,
    showBookSelector,
    booksLength: books.length,
    currentDictId: currentDict?.id,
    currentDictWordsLength: currentDict?.words?.length,
    showStartOverlay,
    startTime: state.startTime
  })

  return (
    <div
      className="h-screen w-screen font-sans overflow-hidden relative"
      style={{
        background: state.displaySettings.darkMode
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : `
            linear-gradient(135deg,
              rgba(99, 102, 241, 0.15) 0%,
              rgba(168, 85, 247, 0.15) 25%,
              rgba(236, 72, 153, 0.15) 50%,
              rgba(239, 68, 68, 0.15) 75%,
              rgba(249, 115, 22, 0.15) 100%
            )
          `,
        color: state.displaySettings.darkMode ? '#ffffff' : '#1f2937',
      }}
    >
      {/* Liquid flow effect layer - only in light mode */}
      {!state.displaySettings.darkMode && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, rgba(255, 107, 107, 0.1), rgba(254, 202, 87, 0.1), rgba(72, 219, 251, 0.1), rgba(255, 159, 243, 0.1), rgba(84, 160, 255, 0.1))',
            backgroundSize: '400% 400%',
            animation: 'liquidFlow 20s ease infinite',
          }}
        />
      )}

      {/* Glassmorphism overlay - only in light mode */}
      {!state.displaySettings.darkMode && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: 'radial-gradient(circle at center, transparent 0%, rgba(255, 255, 255, 0.1) 100%)',
          }}
        />
      )}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');

        body, html {
          overflow: hidden !important;
          height: 100vh !important;
          width: 100vw !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
        }
        * {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .word-display {
          font-family: 'Roboto', 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ==================== 右上角设置按钮 ==================== */}
      <button
        onClick={() => setControlBarExpanded(!controlBarExpanded)}
        className="fixed top-6 right-6 z-50 w-12 h-12 bg-white/90 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 hover:scale-105 transition-all"
        title="设置"
      >
        <Settings size={20} />
      </button>

      {/* ==================== 控制面板（点击设置按钮显示） ==================== */}
      {controlBarExpanded && (
        <div className="fixed top-6 right-20 z-50 bg-white/90 backdrop-blur-md shadow-xl rounded-2xl px-3 py-2 flex items-center gap-1.5">
          {/* 1. 词典选择按钮 */}
          <button
            onClick={() => setShowBookSelector(true)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="切换词库"
          >
            <GripVertical size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-700">
              {currentDict?.name || currentDict?.description || '选择词库'}
            </span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {/* 分隔线 */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* 2. 默写模式 */}
          <button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                learningMode: {
                  ...prev.learningMode,
                  blindMode: !prev.learningMode.blindMode,
                },
              }))
            }
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            title={state.learningMode.blindMode ? '关闭默写模式 (Ctrl+M)' : '开启默写模式 (Ctrl+M)'}
          >
            {state.learningMode.blindMode ? (
              <Eye className="w-4 h-4 text-indigo-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* 3. 释义显示 */}
          <button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                learningMode: {
                  ...prev.learningMode,
                  showTranslation: !prev.learningMode.showTranslation,
                },
              }))
            }
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            title={state.learningMode.showTranslation ? '隐藏释义' : '显示释义'}
          >
            {state.learningMode.showTranslation ? (
              <BookOpen className="w-4 h-4 text-indigo-600" />
            ) : (
              <Book className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* 4. 明暗切换 */}
          <button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                displaySettings: {
                  ...prev.displaySettings,
                  darkMode: !prev.displaySettings.darkMode,
                },
              }))
            }
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            title={state.displaySettings.darkMode ? '切换到浅色模式' : '切换到深色模式'}
          >
            {state.displaySettings.darkMode ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* 分隔线 */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* 5. 错题本 */}
          <button
            onClick={() => {
              closeAllSubPanels()
              setState((prev) => ({ ...prev, mistakesPanelOpen: !prev.mistakesPanelOpen }))
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            title="错题本"
          >
            <AlertCircle size={16} className="text-red-500" />
          </button>

          {/* 6. 数据统计 */}
          <button
            onClick={() => {
              closeAllSubPanels()
              setState((prev) => ({ ...prev, statsPanelOpen: !prev.statsPanelOpen }))
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            title="数据统计"
          >
            <BarChart3 size={16} className="text-indigo-500" />
          </button>

          {/* 分隔线 */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* 7. 设置按钮 */}
          <button
            onClick={() => {
              closeAllSubPanels()
              setState((prev) => ({ ...prev, settingsOpen: !prev.settingsOpen }))
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center text-gray-500 hover:text-gray-700"
            title="高级设置"
          >
            <Settings size={16} />
          </button>

          {/* 8. 暂停按钮（只在已开始且未暂停时显示） */}
          {state.startTime && !state.isPaused && (
            <button
              onClick={() => {
                setState((prev) => ({ ...prev, isPaused: true }))
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
              style={{
                backgroundColor: '#F0F4FF',
                color: '#5B6EF3',
                minWidth: '40px',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#5B6EF3' }}></div>
              <span>暂停</span>
            </button>
          )}
        </div>
      )}

      {/* ==================== 主内容区 ==================== */}
      <main className={`flex flex-col items-center justify-center h-[calc(100vh-120px)] relative ${windowWidth < 768 ? 'px-2' : 'px-4'}`} style={{ paddingTop: windowWidth < 768 ? '4vh' : '8vh' }}>
        {/* 上方左右切换按钮 - 固定在屏幕两侧 */}
        {/* 上一个单词按钮 - 左侧固定 */}
        {state.currentIndex > 0 && currentDict && (
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                currentIndex: prev.currentIndex - 1,
                userInput: '',
                charErrorCount: [],
                currentWordCompletionCount: 0, // 重置完成次数
              }))
            }}
            className="fixed z-30 flex flex-col items-start gap-3 group transition-all hover:scale-105"
            style={{
              left: '32px',
              top: '30%',
              transform: 'translateY(-50%)',
              transformOrigin: 'center left',
            }}
            title="上一个单词"
          >
            <div className="flex items-center gap-3">
              <ChevronLeft size={32} className="text-gray-300 group-hover:text-gray-500" />
              <div className="text-left">
                <p
                  className="text-lg text-gray-400"
                  style={{
                    fontWeight: 400,
                    backgroundImage: 'linear-gradient(to right, rgba(156, 163, 175, 0.2), rgba(156, 163, 175, 1))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {currentDict.words[state.currentIndex - 1]?.word}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* 下一个单词按钮 - 右侧固定 */}
        {currentDict && state.currentIndex < currentDict.words.length - 1 && (
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                currentIndex: prev.currentIndex + 1,
                userInput: '',
                charErrorCount: [],
                currentWordCompletionCount: 0, // 重置完成次数
              }))
            }}
            className="fixed z-30 flex flex-col items-end gap-3 group transition-all hover:scale-105"
            style={{
              right: '32px',
              top: '30%',
              transform: 'translateY(-50%)',
              transformOrigin: 'center right',
            }}
            title="下一个单词"
          >
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p
                  className="text-lg text-gray-400"
                  style={{
                    fontWeight: 400,
                    backgroundImage: 'linear-gradient(to left, rgba(156, 163, 175, 0.2), rgba(156, 163, 175, 1))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {currentDict.words[state.currentIndex + 1]?.word}
                </p>
              </div>
              <ChevronRight size={32} className="text-gray-300 group-hover:text-gray-500" />
            </div>
          </button>
        )}

        {/* 单词卡片 */}
        <div
          className={`text-center max-w-6xl w-full flex flex-col items-center justify-center transition-all duration-300 ${windowWidth < 768 ? 'py-2' : 'py-6'}`}
          style={{
            filter: state.isPaused ? 'blur(8px)' : 'blur(0px)',
          }}
        >
          {/* ==================== 完成奖励动画 ==================== */}
          {!currentWord && currentDict && state.currentIndex >= currentDict.words.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl mx-auto"
            >
              {/* Neo-Brutalism 完成卡片 */}
              <div className={`relative border-4 shadow-2xl p-8 sm:p-12 ${
                state.displaySettings.darkMode
                  ? 'bg-gray-900 border-yellow-500'
                  : 'bg-white border-black'
              }`}>
                {/* 装饰性背景元素 */}
                <div className={`absolute inset-0 overflow-hidden rounded-lg ${
                  state.displaySettings.darkMode ? 'opacity-20' : 'opacity-10'
                }`}>
                  <div className="absolute top-4 left-4 w-16 h-16 border-4 border-yellow-400 rotate-12"></div>
                  <div className="absolute bottom-4 right-4 w-20 h-20 border-4 border-blue-400 -rotate-12"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-green-400 rounded-full"></div>
                </div>

                {/* 主内容 */}
                <div className="relative z-10">
                  {/* 胜利奖杯图标 - 动画 */}
                  <motion.div
                    initial={{ y: -100, opacity: 0, rotate: -180 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.2
                    }}
                    className="flex justify-center mb-8"
                  >
                    <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center ${
                      state.displaySettings.darkMode
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50'
                        : 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg'
                    }`}>
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                    </div>
                  </motion.div>

                  {/* 完成标题 */}
                  <motion.h1
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className={`text-3xl sm:text-4xl md:text-5xl font-black mb-4 ${
                      state.displaySettings.darkMode ? 'text-yellow-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500'
                    }`}
                  >
                    🎉 恭喜完成！
                  </motion.h1>

                  {/* 副标题 */}
                  <motion.p
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={`text-lg sm:text-xl font-semibold mb-8 ${
                      state.displaySettings.darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {currentDict?.name || currentDict?.description || '当前词库'} 全部练习完成
                  </motion.p>

                  {/* 统计数据卡片 */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className={`grid grid-cols-2 gap-4 mb-8 ${
                      state.displaySettings.darkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}
                  >
                    <div className={`p-4 rounded-lg border-3 ${
                      state.displaySettings.darkMode
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-black'
                    }`}>
                      <div className="text-2xl sm:text-3xl font-black text-blue-500">
                        {state.statistics.correctCount}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold">正确字符</div>
                    </div>
                    <div className={`p-4 rounded-lg border-3 ${
                      state.displaySettings.darkMode
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-gradient-to-br from-green-50 to-emerald-50 border-black'
                    }`}>
                      <div className="text-2xl sm:text-3xl font-black text-green-500">
                        {calculateAccuracy()}%
                      </div>
                      <div className="text-xs sm:text-sm font-semibold">准确率</div>
                    </div>
                    <div className={`p-4 rounded-lg border-3 ${
                      state.displaySettings.darkMode
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-gradient-to-br from-purple-50 to-pink-50 border-black'
                    }`}>
                      <div className="text-2xl sm:text-3xl font-black text-purple-500">
                        {calculateWPM()}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold">WPM</div>
                    </div>
                    <div className={`p-4 rounded-lg border-3 ${
                      state.displaySettings.darkMode
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-gradient-to-br from-orange-50 to-amber-50 border-black'
                    }`}>
                      <div className="text-2xl sm:text-3xl font-black text-orange-500">
                        {formatTime(elapsedTime)}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold">用时</div>
                    </div>
                  </motion.div>

                  {/* 彩色庆祝方块动画 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center gap-2 mb-8"
                  >
                    {['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-red-400', 'bg-purple-400'].map((color, index) => (
                      <motion.div
                        key={index}
                        className={`w-10 h-10 sm:w-12 sm:h-12 border-3 ${
                          state.displaySettings.darkMode ? 'border-gray-600' : 'border-black'
                        } ${color}`}
                        animate={{
                          y: [0, -20, 0],
                          rotate: [0, 360],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: index * 0.1,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </motion.div>

                  {/* 操作按钮 */}
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center"
                  >
                    <button
                      onClick={() => {
                        setState(prev => ({
                          ...prev,
                          currentIndex: 0,
                          userInput: '',
                          charErrorCount: [],
                          currentWordCompletionCount: 0,
                          statistics: DEFAULT_STATISTICS,
                          startTime: null,
                          isPaused: false,
                        }))
                        setElapsedTime(0)
                      }}
                      className={`px-6 py-3 sm:px-8 sm:py-4 font-bold rounded-lg border-3 shadow-lg transition-all hover:scale-105 active:scale-95 ${
                        state.displaySettings.darkMode
                          ? 'bg-blue-600 border-blue-400 text-white hover:bg-blue-500'
                          : 'bg-black text-white border-black hover:bg-gray-800'
                      }`}
                    >
                      🔄 重新练习
                    </button>
                    <button
                      onClick={() => setShowBookSelector(true)}
                      className={`px-6 py-3 sm:px-8 sm:py-4 font-bold rounded-lg border-3 shadow-lg transition-all hover:scale-105 active:scale-95 ${
                        state.displaySettings.darkMode
                          ? 'bg-gray-700 border-gray-500 text-gray-200 hover:bg-gray-600'
                          : 'bg-white text-black border-black hover:bg-gray-50'
                      }`}
                    >
                      📚 切换词库
                    </button>
                  </motion.div>
                </div>

                {/* 庆祝彩带效果 */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '-10px',
                      width: '10px',
                      height: '10px',
                      backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
                    }}
                    animate={{
                      y: [0, window.innerHeight],
                      rotate: [0, 720],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* 音标显示 - 全时显示，默写模式下不隐藏 */}
          {currentWord?.phonetic && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-center ${windowWidth < 768 ? 'mb-4 gap-2' : 'mb-8 gap-3'}`}
            >
              <span
                className="inline-block px-4 py-2 rounded-lg tracking-wider"
                style={{
                  color: state.displaySettings.darkMode ? '#60a5fa' : '#3b82f6',
                  fontSize: `${state.displaySettings.foreignFontSize * 0.4 * (windowWidth < 768 ? 0.7 : windowWidth < 1024 ? 0.85 : 1)}px`, // 响应式字号
                  fontWeight: 400,
                  backgroundColor: state.displaySettings.darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                  fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
                }}
              >
                [{currentWord.phonetic}]
              </span>
              {/* 发音喇叭按钮 - 唯一入口，精美设计 */}
              <button
                onClick={() => {
                  if (currentWord) {
                    playWordAudio(currentWord.word, currentWord.audio_url)
                  }
                }}
                className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 active:scale-95"
                style={{
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="播放发音"
              >
                <Volume2
                  size={22}
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                  style={{ strokeWidth: 2 }}
                />
              </button>
            </motion.div>
          )}

          {/* 英文单词 - 统一超大字体，绝对视觉中心 */}
          <div className={`mb-16 flex items-center justify-center ${windowWidth < 768 ? 'px-4 overflow-x-auto' : ''}`}>
            {/* 当前单词 - 动态字号槽位下划线设计 */}
            <div
              className="flex items-end justify-center"
              style={{
                maxWidth: windowWidth < 768 ? 'calc(100vw - 32px)' : 'calc(100vw - 200px)',
                // 根据屏幕宽度计算最大可用宽度，避免单词超出屏幕
              }}
            >
              <AnimatePresence mode="popLayout">
                {currentWord?.word.split('').map((char, index) => {
                  const isInput = index < state.userInput.length
                  const isCurrent = index === state.userInput.length

                  // ✅ 特殊符号宽松匹配：如果目标字符是特殊符号，任何输入都算正确
                  // 🔧 修复：添加更多特殊符号（标点、数学符号等）
                  const isSpecialChar = /^[\-'\s=;,.()（）【】\[\]{}、，。；：！？""''""«»〈〉《》]/.test(char)
                  const isCorrect = isInput && (
                    isSpecialChar || // 特殊符号：任意字符都算对
                    state.userInput[index]?.toLowerCase() === char?.toLowerCase()
                  )

                  // 动态字号计算（基础字号 + 设置值）
                  const fontSize = state.displaySettings.foreignFontSize // 20-100
                  const baseScaledFontSize = fontSize * 2.5 // 放大到 50-250px 范围

                  // ✅ 智能响应式字号：根据屏幕宽度和单词长度动态计算
                  const wordLength = currentWord.word.length
                  const availableWidth = windowWidth < 768
                    ? windowWidth - 32 // 移动端减去padding
                    : windowWidth - 200 // 桌面端减去左右按钮和边距

                  // 计算每个字符平均可用宽度
                  const avgCharWidth = availableWidth / wordLength

                  // 根据字符宽度计算合适的字号（确保字符不重叠）
                  // 字符宽度大约是字号的 0.6 倍
                  let optimalFontSize = Math.min(baseScaledFontSize, avgCharWidth / 0.6)

                  // 应用响应式缩放系数作为上限
                  let responsiveScale = 1.0
                  if (windowWidth < 768) {
                    responsiveScale = 0.45
                  } else if (windowWidth < 1024) {
                    responsiveScale = 0.7
                  }

                  // 最终字号 = min(智能计算字号, 响应式上限字号)
                  const scaledFontSize = Math.min(optimalFontSize, baseScaledFontSize * responsiveScale)

                  // 确保最小字号，避免太小看不清
                  const finalFontSize = Math.max(scaledFontSize, windowWidth < 768 ? 24 : 32)

                  // 等比例缩放相关尺寸（基于最终字号）
                  const isMobile = windowWidth < 768
                  const slotWidthRatio = isMobile ? 0.55 : 0.75 // 移动端槽位更窄
                  const slotWidth = finalFontSize * slotWidthRatio // 槽位宽度
                  const slotHeight = finalFontSize * 1.3125 // 槽位高度
                  const paddingBelow = finalFontSize * 0.1875 // 字母与下划线间距
                  const gapRatio = isMobile ? 0.04 : 0.125 // 移动端间距更小
                  const gapBetween = finalFontSize * gapRatio // 字母间距
                  const borderWidth = finalFontSize * 0.03125 // 下划线粗细

                  return (
                    <motion.div
                      key={`${index}-${state.userInput[index] || 'empty'}-${state.shakeTrigger}`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{
                        scale: isCurrent ? 1.05 : 1,
                        opacity: 1,
                      }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="flex flex-col items-center justify-end"
                      style={{
                        marginRight: index < currentWord.word.length - 1 ? `${gapBetween}px` : '0px', // 最后一个字母没有右边距
                        borderBottom: `${borderWidth}px solid ${isCurrent ? '#94a3b8' : '#94a3b8'}`, // 统一使用 slate-400 中灰色
                        width: `${slotWidth}px`,
                        height: `${slotHeight}px`,
                        paddingBottom: '0px',
                      }}
                    >
                      {/* 字母悬浮在横线之上 */}
                      <motion.span
                        className="inline-block transition-all duration-150"
                        style={{
                          fontFamily: "'Roboto', 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
                          fontSize: `${finalFontSize}px`, // 使用智能计算的字号
                          fontWeight: 500,
                          lineHeight: 1,
                          display: 'inline-block',
                          paddingBottom: `${paddingBelow}px`, // 动态间距
                          color: isInput
                            ? (isCorrect ? '#16a34a' : '#f87171')
                            : (isCurrent ? '#94a3b8' : '#cbd5e1'), // 使用更清晰的中灰色
                          textAlign: 'center',
                        }}
                      >
                        {/* 默写模式：未输入显示空，已输入显示字母 */}
                        {/* 正常模式：显示原字母或已输入的字母 */}
                        {state.learningMode.blindMode
                          ? (isInput ? state.userInput[index] : '')
                          : (isInput ? state.userInput[index] : char)
                        }
                      </motion.span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* 中文释义 - 固定高度占位，防止布局跳动 */}
          <div
            className={`${windowWidth < 768 ? 'mb-6' : 'mb-12'} transition-all duration-300`}
            style={{
              minHeight: windowWidth < 768 ? '40px' : '60px',
            }}
          >
            {state.learningMode.showTranslation && currentTrans ? (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="tracking-wide"
                style={{
                  color: state.displaySettings.darkMode ? '#9ca3af' : '#64748b', // slate-500
                  fontSize: `${state.displaySettings.chineseFontSize * 1.2 * (windowWidth < 768 ? 0.7 : windowWidth < 1024 ? 0.85 : 1)}px`, // 响应式字号
                  fontWeight: 400,
                  lineHeight: 1.6,
                  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
                }}
              >
                {currentTrans}
              </motion.p>
            ) : (
              <div style={{ minHeight: '60px' }}></div>
            )}
          </div>

          {/* 极简进度点 */}
          <div className={`flex justify-center ${windowWidth < 768 ? 'gap-1 mb-4' : 'gap-1.5 mb-8'}`}>
            {currentWord?.word.split('').map((_, index) => {
              let dotColor = 'bg-gray-200'
              if (index < state.userInput.length) {
                dotColor =
                  state.userInput[index]?.toLowerCase() === currentWord.word[index]?.toLowerCase()
                    ? 'bg-emerald-400'
                    : 'bg-rose-400'
              } else if (index === state.userInput.length) {
                dotColor = 'bg-blue-400'
              }
              return (
                <motion.div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${dotColor} transition-colors duration-200`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: index === state.userInput.length ? 1.2 : 1 }}
                />
              )
            })}
          </div>

          {/* 提示文字 */}
          {!state.startTime && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-400"
            >
              按 Enter 键或点击右上角"开始"按钮开始练习
            </motion.p>
          )}

          {/* 专项练习模式提示 */}
          {isSpecialReviewMode && !state.isPaused && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl border-2 border-indigo-300"
            >
              <p className="text-base font-bold text-indigo-800">
                🔥 错题专项练习模式中
              </p>
              <p className="text-sm text-indigo-700 mt-1">
                共 {specialReviewWords.length} 个错题 · 当前进度 {state.currentIndex + 1}/{specialReviewWords.length}
              </p>
              <button
                onClick={exitSpecialReviewMode}
                className="mt-3 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors border border-indigo-300"
              >
                退出专项练习
              </button>
            </motion.div>
          )}

          {/* 跳过按钮（连续错误4次时显示） */}
          {state.showSkipButton && !state.isPaused && state.startTime && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={skipCurrentWord}
              className="mt-6 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all font-bold text-base hover:scale-105"
            >
              跳过此单词 (Esc)
            </motion.button>
          )}
        </div>

        {/* 暂停覆盖层 - 模糊效果最上层 */}
        {state.isPaused && state.startTime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ pointerEvents: 'none' }}
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-2xl border border-gray-200"
              >
                <p className="text-2xl font-bold text-gray-800 mb-2">已暂停</p>
                <p className="text-lg text-gray-600">按任意键继续</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </main>

      {/* ==================== 底部居中悬浮统计卡片 ==================== */}
      <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4">
        <div
          className="w-full max-w-4xl"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E0E0E0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-around">
              {/* 时间 */}
              <div className="flex flex-col items-center px-2 sm:px-4">
                <span className="text-[14px] sm:text-[18px] font-bold tabular-nums" style={{ color: '#555555' }}>
                  {formatTime(elapsedTime)}
                </span>
                <span className="text-[10px] sm:text-[12px] font-normal mt-1" style={{ color: '#888888' }}>时间</span>
              </div>

              {/* 输入数 */}
              <div className="flex flex-col items-center px-2 sm:px-4">
                <span className="text-[14px] sm:text-[18px] font-bold tabular-nums" style={{ color: '#555555' }}>
                  {state.statistics.inputCount}
                </span>
                <span className="text-[10px] sm:text-[12px] font-normal mt-1" style={{ color: '#888888' }}>输入数</span>
              </div>

              {/* WPM */}
              <div className="flex flex-col items-center px-2 sm:px-4">
                <span className="text-[14px] sm:text-[18px] font-bold tabular-nums" style={{ color: '#555555' }}>
                  {calculateWPM()}
                </span>
                <span className="text-[10px] sm:text-[12px] font-normal mt-1" style={{ color: '#888888' }}>每分钟</span>
              </div>

              {/* 正确数 */}
              <div className="flex flex-col items-center px-2 sm:px-4">
                <span className="text-[14px] sm:text-[18px] font-bold tabular-nums" style={{ color: '#555555' }}>
                  {state.statistics.correctCount}
                </span>
                <span className="text-[10px] sm:text-[12px] font-normal mt-1" style={{ color: '#888888' }}>正确数</span>
              </div>

              {/* 正确率 */}
              <div className="flex flex-col items-center px-2 sm:px-4">
                <span className="text-[14px] sm:text-[18px] font-bold tabular-nums" style={{ color: '#555555' }}>
                  {calculateAccuracy()}%
                </span>
                <span className="text-[10px] sm:text-[12px] font-normal mt-1" style={{ color: '#888888' }}>正确率</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 完整设置对话框 ==================== */}
      <SettingsModal
        isOpen={state.settingsOpen}
        onClose={() => setState((prev) => ({ ...prev, settingsOpen: false }))}
        activeTab={state.settingsTab}
        onTabChange={(tab) => setState((prev) => ({ ...prev, settingsTab: tab }))}
        soundSettings={state.soundSettings}
        onSoundSettingsChange={(settings) => setState((prev) => ({ ...prev, soundSettings: settings }))}
        advancedSettings={state.advancedSettings}
        onAdvancedSettingsChange={(settings) => setState((prev) => ({ ...prev, advancedSettings: settings }))}
        displaySettings={state.displaySettings}
        onDisplaySettingsChange={(settings) => setState((prev) => ({ ...prev, displaySettings: settings }))}
        onResetProgress={() =>
          setState((prev) => ({
            ...prev,
            statistics: DEFAULT_STATISTICS,
            currentIndex: 0,
            userInput: '',
            startTime: null,
            isPaused: false,
          }))
        }
        onResetFont={() =>
          setState((prev) => ({
            ...prev,
            displaySettings: DEFAULT_DISPLAY_SETTINGS,
          }))
        }
      />

      {/* ==================== 快捷键提示对话框 ==================== */}
      <ShortcutsModal isOpen={state.shortcutsOpen} onClose={() => setState((prev) => ({ ...prev, shortcutsOpen: false }))} />

      {/* ==================== 灵动岛子面板 ==================== */}

      {/* 发音设置子面板 */}
      <PronunciationPanel
        isOpen={state.pronunciationPanelOpen}
        onClose={() => setState((prev) => ({ ...prev, pronunciationPanelOpen: false }))}
        settings={state.soundSettings}
        onChange={(settings) => setState((prev) => ({ ...prev, soundSettings: settings }))}
      />

      {/* 音效设置子面板 */}
      <SoundEffectPanel
        isOpen={state.soundEffectPanelOpen}
        onClose={() => setState((prev) => ({ ...prev, soundEffectPanelOpen: false }))}
        settings={state.soundSettings}
        onChange={(settings) => setState((prev) => ({ ...prev, soundSettings: settings }))}
      />

      {/* 单词循环子面板 */}
      <LoopPanel
        isOpen={state.loopPanelOpen}
        onClose={() => setState((prev) => ({ ...prev, loopPanelOpen: false }))}
        loopCount={state.loopCount}
        onLoopCountChange={(count) => setState((prev) => ({ ...prev, loopCount: count }))}
      />

      {/* 错题本面板 */}
      <MistakesPanel
        isOpen={state.mistakesPanelOpen}
        onClose={() => setState((prev) => ({ ...prev, mistakesPanelOpen: false }))}
        mistakes={mistakeBook.getMistakeList()}
        onPracticeWord={practiceMistakeWord}
        onStartSpecialReview={startSpecialReview}
        onClearMastered={clearMasteredMistakes}
        onPlayPronunciation={playMistakePronunciation}
      />

      {/* 数据统计面板 */}
      <StatsPanel
        isOpen={state.statsPanelOpen}
        onClose={() => setState((prev) => ({ ...prev, statsPanelOpen: false }))}
        stats={{
          todayTime: Math.floor(elapsedTime / 60),
          totalWords: state.statistics.correctCount,
          accuracy: calculateAccuracy(),
          weeklyData: [30, 45, 60, 40, 50, 55, 35], // 示例数据，后续可以替换为真实统计
        }}
      />

      {/* ==================== 开始遮罩 ==================== */}
      {showStartOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 液态半透明背景 - 黑暗模式适配 */}
          <div
            className="absolute inset-0"
            style={{
              background: state.displaySettings.darkMode
                ? `
                  linear-gradient(135deg,
                    rgba(26, 26, 46, 0.95) 0%,
                    rgba(22, 33, 62, 0.95) 50%,
                    rgba(15, 23, 42, 0.95) 100%
                  )
                `
                : `
                  linear-gradient(135deg,
                    rgba(99, 102, 241, 0.4) 0%,
                    rgba(168, 85, 247, 0.4) 25%,
                    rgba(236, 72, 153, 0.4) 50%,
                    rgba(239, 68, 68, 0.4) 75%,
                    rgba(249, 115, 22, 0.4) 100%
                  )
                `,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          />

          {/* 液态流动效果 - 仅浅色模式 */}
          {!state.displaySettings.darkMode && (
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)',
                backgroundSize: '400% 400%',
                animation: 'liquidFlow 15s ease infinite',
              }}
            />
          )}

          {/* 额外的半透明叠加层 - 黑暗模式加深 */}
          <div
            className="absolute inset-0"
            style={{
              background: state.displaySettings.darkMode
                ? 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%)'
                : 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
            }}
          />

          {/* 内容 - 打字机效果展示中英对照（响应式，居中） */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 text-center space-y-8 px-4 sm:space-y-12 max-w-4xl mx-auto"
          >
            {/* 打字机文字区域 - 按换行符分隔显示 */}
            <div className="space-y-4 sm:space-y-8">
              {typewriterText.split('\n').map((line, index) => {
                // 第一句：标题（大字，响应式）
                if (index === 0) {
                  return (
                    <motion.h2
                      key={index}
                      className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight"
                      style={{
                        textShadow: '0 4px 30px rgba(0, 0, 0, 0.6)',
                        letterSpacing: '0.02em',
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {line || '准备好了吗？'}
                    </motion.h2>
                  )
                }
                // 第二句：说明（中等，响应式）
                if (index === 1) {
                  return (
                    <motion.p
                      key={index}
                      className="text-lg sm:text-xl md:text-2xl text-white/95 font-medium drop-shadow-lg leading-relaxed"
                      style={{
                        textShadow: '0 2px 15px rgba(0, 0, 0, 0.4)',
                      }}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {line || ''}
                    </motion.p>
                  )
                }
                // 第三句：按钮文本（隐藏，只用于判断按钮显示时机）
                return null
              })}
            </div>

            {/* 开始按钮 - 等打字机效果完成后显示（响应式，黑暗模式适配） */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: typewriterText.split('\n').length >= 3 ? 1 : 0,
                y: typewriterText.split('\n').length >= 3 ? 0 : 20
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => {
                console.log('[StartButton] Clicked - dismissing overlay')
                setShowStartOverlay(false)
                setState((prev) => {
                  console.log('[StartButton] Updating state:', { ...prev, isPlaying: true, startTime: Date.now() })
                  return { ...prev, isPlaying: true, startTime: Date.now() }
                })
              }}
              className={`px-8 py-4 sm:px-12 sm:py-5 backdrop-blur-md border-3 rounded-2xl text-2xl sm:text-3xl font-black transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                state.displaySettings.darkMode
                  ? 'bg-lime-500/20 border-lime-400/40 text-lime-100 hover:bg-lime-500/30 hover:border-lime-400/60'
                  : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
              }`}
              style={{
                textShadow: state.displaySettings.darkMode
                  ? '0 3px 25px rgba(180, 244, 22, 0.5)'
                  : '0 3px 25px rgba(0, 0, 0, 0.5)',
                letterSpacing: '0.05em',
                boxShadow: state.displaySettings.darkMode
                  ? '0 10px 40px rgba(180, 244, 22, 0.3), 0 0 20px rgba(180, 244, 22, 0.2)'
                  : '0 10px 40px rgba(0, 0, 0, 0.3)',
              }}
            >
              开始练习
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* ==================== 词库选择对话框 ==================== */}
      {showBookSelector && (
        <BookSelectorModal
          books={books}
          onClose={() => setShowBookSelector(false)}
          userId={userId}
          initialScopeStats={scopeStatsMap}
        />
      )}
    </div>
  )
}

// ==================== Suspense边界包裹 ====================
export default function PracticePageWrapperClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <QwertyPracticePage />
    </Suspense>
  )
}
