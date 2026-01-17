// src/stores/typingStore.ts
// 打字练习状态管理（基于 Zustand）

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * 单词类型定义
 */
export type Word = {
  id: string
  word: string
  definition: string
  phonetic?: string
  uk_phonetic?: string
  us_phonetic?: string
  part_of_speech?: string
}

/**
 * 练习范围类型
 */
export type ScopeType = 'all' | 'new' | 'known' | 'fuzzy' | 'unknown' | 'mistakes' | 'chapter'

/**
 * 发音方案
 */
export type PronunciationScheme = 'us' | 'uk' | 'auto'

/**
 * 单词输入状态
 */
export type CharStatus = 'correct' | 'wrong' | 'pending'

/**
 * 当前会话状态
 */
export interface SessionState {
  bookId: string | null
  scope: ScopeType | null
  chapterId: string | null
  currentWordIndex: number
  words: Word[]
  userInput: string
  isPlaying: boolean
  isPaused: boolean
  startTime: number | null
  endTime: number | null
  charStatuses: CharStatus[]  // 每个字符的状态
}

/**
 * 循环设置
 */
export interface LoopSettings {
  enabled: boolean
  loopCount: number  // 1, 3, 5, 9, Infinity
  currentWordCompletionCount: number
}

/**
 * 错题记录（临时存储）
 */
export interface TempMistake {
  wordId: string
  wrongCount: number
  typingWrongCount: number
  lastWrongAt: number
}

/**
 * 用户设置
 */
export interface UserSettings {
  wordAutoPronounce: boolean      // 自动发音
  wordVolume: number              // 音量 (0-100)
  wordSpeed: number               // 语速 (0.5-2.0)
  pronunciationScheme: PronunciationScheme
  foreignFontSize: number         // 外语字号
  chineseFontSize: number         // 中文字号
  darkMode: boolean
  showTranslation: boolean        // 显示翻译
  blindMode: boolean              // 盲打模式
  defaultLoopCount: number
}

/**
 * 统计数据
 */
export interface Statistics {
  totalWords: number
  completedWords: number
  skippedWords: number
  correctCount: number
  errorCount: number
  wpm: number                     // Words Per Minute
  accuracy: number                // 正确率 (0-1)
}

/**
 * UI 状态
 */
export interface UIState {
  modalsOpen: {
    settings: boolean
    mistakes: boolean
    stats: boolean
    shortcuts: boolean
    complete: boolean
  }
  activeTab: 'sound' | 'display' | 'loop' | 'shortcuts'
  shakeTrigger: number            // 触发抖动动画
}

/**
 * Store 状态类型
 */
export interface TypingState {
  // 核心状态
  currentSession: SessionState
  loopSettings: LoopSettings
  tempMistakes: Map<string, TempMistake>
  settings: UserSettings
  statistics: Statistics
  ui: UIState

  // Actions
  actions: {
    // 会话控制
    startSession: (bookId: string, scope: ScopeType, chapterId: string | null, words: Word[]) => void
    pauseSession: () => void
    resumeSession: () => void
    endSession: () => void

    // 单词导航
    goToNextWord: () => void
    goToPreviousWord: () => void
    skipWord: () => void
    goToWord: (index: number) => void

    // 输入处理
    handleInput: (char: string) => void
    handleBackspace: () => void
    resetCurrentWord: () => void

    // 循环控制
    setLoopCount: (count: number) => void
    incrementWordCompletion: () => void

    // 错题记录
    addMistake: (wordId: string, wrongCount: number, typingWrongCount: number) => void
    clearTempMistakes: () => void

    // 设置
    updateSettings: (newSettings: Partial<UserSettings>) => void

    // UI 控制
    openModal: (modal: keyof UIState['modalsOpen']) => void
    closeModal: (modal: keyof UIState['modalsOpen']) => void
    setActiveTab: (tab: UIState['activeTab']) => void
    triggerShake: () => void

    // 统计更新
    updateStatistics: () => void
  }
}

/**
 * 创建 Zustand Store
 */
export const useTypingStore = create<TypingState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentSession: {
        bookId: null,
        scope: null,
        chapterId: null,
        currentWordIndex: 0,
        words: [],
        userInput: '',
        isPlaying: false,
        isPaused: false,
        startTime: null,
        endTime: null,
        charStatuses: [],
      },

      loopSettings: {
        enabled: false,
        loopCount: 1,
        currentWordCompletionCount: 0,
      },

      tempMistakes: new Map(),

      settings: {
        wordAutoPronounce: true,
        wordVolume: 80,
        wordSpeed: 1.0,
        pronunciationScheme: 'us',
        foreignFontSize: 48,
        chineseFontSize: 18,
        darkMode: false,
        showTranslation: true,
        blindMode: false,
        defaultLoopCount: 1,
      },

      statistics: {
        totalWords: 0,
        completedWords: 0,
        skippedWords: 0,
        correctCount: 0,
        errorCount: 0,
        wpm: 0,
        accuracy: 0,
      },

      ui: {
        modalsOpen: {
          settings: false,
          mistakes: false,
          stats: false,
          shortcuts: false,
          complete: false,
        },
        activeTab: 'sound',
        shakeTrigger: 0,
      },

      // Actions 实现
      actions: {
        // 开始会话
        startSession: (bookId, scope, chapterId, words) => {
          set({
            currentSession: {
              bookId,
              scope,
              chapterId,
              currentWordIndex: 0,
              words,
              userInput: '',
              isPlaying: true,
              isPaused: false,
              startTime: Date.now(),
              endTime: null,
              charStatuses: words.length > 0 ? Array(words[0].word.length).fill('pending') : [],
            },
            statistics: {
              totalWords: words.length,
              completedWords: 0,
              skippedWords: 0,
              correctCount: 0,
              errorCount: 0,
              wpm: 0,
              accuracy: 0,
            },
            tempMistakes: new Map(),
          })
        },

        // 暂停会话
        pauseSession: () => {
          set((state) => ({
            currentSession: {
              ...state.currentSession,
              isPaused: true,
            },
          }))
        },

        // 恢复会话
        resumeSession: () => {
          set((state) => ({
            currentSession: {
              ...state.currentSession,
              isPaused: false,
            },
          }))
        },

        // 结束会话
        endSession: () => {
          set((state) => ({
            currentSession: {
              ...state.currentSession,
              isPlaying: false,
              endTime: Date.now(),
            },
          }))
        },

        // 下一个单词
        goToNextWord: () => {
          const state = get()
          const { currentWordIndex, words } = state.currentSession

          if (currentWordIndex < words.length - 1) {
            set({
              currentSession: {
                ...state.currentSession,
                currentWordIndex: currentWordIndex + 1,
                userInput: '',
                charStatuses: Array(words[currentWordIndex + 1].word.length).fill('pending'),
              },
              loopSettings: {
                ...state.loopSettings,
                currentWordCompletionCount: 0,
              },
            })
          }
        },

        // 上一个单词
        goToPreviousWord: () => {
          const state = get()
          const { currentWordIndex, words } = state.currentSession

          if (currentWordIndex > 0) {
            set({
              currentSession: {
                ...state.currentSession,
                currentWordIndex: currentWordIndex - 1,
                userInput: '',
                charStatuses: Array(words[currentWordIndex - 1].word.length).fill('pending'),
              },
              loopSettings: {
                ...state.loopSettings,
                currentWordCompletionCount: 0,
              },
            })
          }
        },

        // 跳过当前单词
        skipWord: () => {
          const state = get()
          const { currentWordIndex } = state.currentSession

          // 记录到错题
          const currentWord = state.currentSession.words[currentWordIndex]
          if (currentWord) {
            state.actions.addMistake(currentWord.id, 1, 1)
          }

          // 更新统计
          set((prevState) => ({
            statistics: {
              ...prevState.statistics,
              skippedWords: prevState.statistics.skippedWords + 1,
            },
          }))

          // 跳转到下一个
          state.actions.goToNextWord()
        },

        // 跳转到指定单词
        goToWord: (index: number) => {
          const state = get()
          const { words } = state.currentSession

          if (index >= 0 && index < words.length) {
            set({
              currentSession: {
                ...state.currentSession,
                currentWordIndex: index,
                userInput: '',
                charStatuses: Array(words[index].word.length).fill('pending'),
              },
              loopSettings: {
                ...state.loopSettings,
                currentWordCompletionCount: 0,
              },
            })
          }
        },

        // 处理输入
        handleInput: (char: string) => {
          const state = get()
          const { userInput, words, currentWordIndex } = state.currentSession
          const currentWord = words[currentWordIndex]

          if (!currentWord) return

          const targetWord = currentWord.word.toLowerCase()
          const nextIndex = userInput.length
          const targetChar = targetWord[nextIndex]

          // 验证字符
          const isCorrect = char.toLowerCase() === targetChar

          // 更新字符状态
          const newCharStatuses = [...state.currentSession.charStatuses]
          newCharStatuses[nextIndex] = isCorrect ? 'correct' : 'wrong'

          // 更新输入
          const newUserInput = userInput + char

          set({
            currentSession: {
              ...state.currentSession,
              userInput: newUserInput,
              charStatuses: newCharStatuses,
            },
          })

          // 如果输入错误，记录错题
          if (!isCorrect) {
            state.actions.addMistake(currentWord.id, 1, 1)
          }

          // 检查是否完成当前单词
          if (newUserInput.length === targetWord.length) {
            state.actions.incrementWordCompletion()
          }
        },

        // 处理退格
        handleBackspace: () => {
          const state = get()
          const { userInput, charStatuses } = state.currentSession

          if (userInput.length > 0) {
            const newCharStatuses = [...charStatuses]
            newCharStatuses[userInput.length - 1] = 'pending'

            set({
              currentSession: {
                ...state.currentSession,
                userInput: userInput.slice(0, -1),
                charStatuses: newCharStatuses,
              },
            })
          }
        },

        // 重置当前单词
        resetCurrentWord: () => {
          const state = get()
          const { words, currentWordIndex } = state.currentSession
          const currentWord = words[currentWordIndex]

          set({
            currentSession: {
              ...state.currentSession,
              userInput: '',
              charStatuses: currentWord ? Array(currentWord.word.length).fill('pending') : [],
            },
          })
        },

        // 设置循环次数
        setLoopCount: (count: number) => {
          set({
            loopSettings: {
              ...get().loopSettings,
              loopCount: count,
              enabled: count > 1,
            },
          })
        },

        // 增加单词完成次数
        incrementWordCompletion: () => {
          const state = get()
          const { loopCount, currentWordCompletionCount } = state.loopSettings

          // 检查是否达到循环次数
          if (currentWordCompletionCount + 1 >= loopCount) {
            // 完成当前单词，移动到下一个
            set((prevState) => ({
              statistics: {
                ...prevState.statistics,
                completedWords: prevState.statistics.completedWords + 1,
              },
            }))

            setTimeout(() => {
              state.actions.goToNextWord()
            }, 500)
          } else {
            // 继续循环当前单词
            setTimeout(() => {
              state.actions.resetCurrentWord()
            }, 500)
          }

          set({
            loopSettings: {
              ...state.loopSettings,
              currentWordCompletionCount: currentWordCompletionCount + 1,
            },
          })
        },

        // 添加错题
        addMistake: (wordId, wrongCount, typingWrongCount) => {
          set((state) => {
            const newMistakes = new Map(state.tempMistakes)
            const existing = newMistakes.get(wordId)

            if (existing) {
              newMistakes.set(wordId, {
                ...existing,
                wrongCount: existing.wrongCount + wrongCount,
                typingWrongCount: existing.typingWrongCount + typingWrongCount,
                lastWrongAt: Date.now(),
              })
            } else {
              newMistakes.set(wordId, {
                wordId,
                wrongCount,
                typingWrongCount,
                lastWrongAt: Date.now(),
              })
            }

            return { tempMistakes: newMistakes }
          })
        },

        // 清除临时错题
        clearTempMistakes: () => {
          set({ tempMistakes: new Map() })
        },

        // 更新设置
        updateSettings: (newSettings) => {
          set((state) => ({
            settings: {
              ...state.settings,
              ...newSettings,
            },
          }))
        },

        // 打开模态框
        openModal: (modal) => {
          set((state) => ({
            ui: {
              ...state.ui,
              modalsOpen: {
                ...state.ui.modalsOpen,
                [modal]: true,
              },
            },
          }))
        },

        // 关闭模态框
        closeModal: (modal) => {
          set((state) => ({
            ui: {
              ...state.ui,
              modalsOpen: {
                ...state.ui.modalsOpen,
                [modal]: false,
              },
            },
          }))
        },

        // 设置活动标签
        setActiveTab: (tab) => {
          set((state) => ({
            ui: {
              ...state.ui,
              activeTab: tab,
            },
          }))
        },

        // 触发抖动动画
        triggerShake: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              shakeTrigger: state.ui.shakeTrigger + 1,
            },
          }))
        },

        // 更新统计数据
        updateStatistics: () => {
          const state = get()
          const { startTime, words } = state.currentSession
          const { completedWords, correctCount, errorCount } = state.statistics

          if (!startTime) return

          const timeElapsed = (Date.now() - startTime) / 1000 / 60 // 分钟
          const wpm = timeElapsed > 0 ? Math.round(completedWords / timeElapsed) : 0
          const totalAttempts = correctCount + errorCount
          const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0

          set({
            statistics: {
              ...state.statistics,
              wpm,
              accuracy,
            },
          })
        },
      },
    }),
    {
      name: 'typing-storage',
      storage: createJSONStorage(() => localStorage),
      // 持久化配置
      partialize: (state) => ({
        // 持久化：用户设置
        settings: state.settings,
        // 持久化：循环设置
        loopSettings: state.loopSettings,
        // 持久化：当前会话（恢复进度）
        currentSession: {
          bookId: state.currentSession.bookId,
          scope: state.currentSession.scope,
          chapterId: state.currentSession.chapterId,
          currentWordIndex: state.currentSession.currentWordIndex,
          words: state.currentSession.words,
          userInput: state.currentSession.userInput,
          charStatuses: state.currentSession.charStatuses,
          isPlaying: state.currentSession.isPlaying,
          isPaused: state.currentSession.isPaused,
          startTime: state.currentSession.startTime,
        },
        // 不持久化：临时状态（UI、tempMistakes、statistics、userInput、isPlaying等）
      }),
    }
  )
)
