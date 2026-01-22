'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, RotateCw } from 'lucide-react'
import Link from 'next/link'
import { PermissionGate } from '@/components/PermissionDisplay'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'

type Word = {
  id: string
  word: string
  phonetic: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
}

type WordProgress = {
  word_id: string
  status: 'new' | 'known' | 'fuzzy' | 'unknown'
  match_count?: number  // 消消乐匹配成功次数
  fail_count?: number   // 消消乐匹配失败次数
}

type Card = {
  id: string
  content: string
  type: 'word' | 'definition'
  wordId: string
  wordText?: string  // 新增：单词文本，用于灵活匹配
  isMatched: boolean
  isSelected: boolean
}

// Fisher-Yates 洗牌算法 - 真正的均匀随机
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function MatchGamePageClient() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string
  const scope = searchParams.get('scope') || 'filtered'

  const [allWords, setAllWords] = useState<Word[]>([])
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState<string>('')  // 加载提示信息
  const [bookTitle, setBookTitle] = useState('')
  const [scopeLabel, setScopeLabel] = useState('')

  // 游戏状态
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [moves, setMoves] = useState(0)
  const [gameWon, setGameWon] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [explodingCards, setExplodingCards] = useState<Set<string>>(new Set())
  const [masteredWords, setMasteredWords] = useState<string[]>([])  // 本次游戏掌握的单词列表
  const [totalMasteredWords, setTotalMasteredWords] = useState<string[]>([])  // 所有轮次掌握的单词
  const [toastMessage, setToastMessage] = useState<string | null>(null)  // 提示消息
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null)  // 选择的卡片对数：4/10/20
  const [showDifficultySelect, setShowDifficultySelect] = useState(true)  // 是否显示难度选择
  const [currentRound, setCurrentRound] = useState(1)  // 当前轮次
  const [totalRounds, setTotalRounds] = useState(1)  // 总轮次
  const [allCompleted, setAllCompleted] = useState(false)  // 是否全部通关
  const [pendingDifficulty, setPendingDifficulty] = useState<number | null>(null)  // 待切换的难度（下一轮生效）
  const [unknownWordsPool, setUnknownWordsPool] = useState<Word[]>([])  // 所有未认识的单词池

  // AbortController用于取消进行中的API请求
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup effect: 在组件挂载时创建AbortController，卸载时取消所有pending请求
  useEffect(() => {
    // 创建新的AbortController
    abortControllerRef.current = new AbortController()

    // Cleanup函数：组件卸载时执行
    return () => {
      // 取消所有pending的API请求
      abortControllerRef.current?.abort()
    }
  }, []) // 空依赖数组，只在挂载/卸载时执行

  // 智能累积阈值配置
  const MATCH_THRESHOLD = 2  // 匹配成功2次标记为认识
  const FAIL_THRESHOLD = 3   // 匹配失败3次标记为不认识

  // 难度选项配置
  const DIFFICULTY_OPTIONS = [
    { pairs: 4, cards: 8, name: '轻松', time: '约3-5分钟', color: 'from-green-50 to-green-100', borderColor: 'border-green-300', batchSize: 100 },
    { pairs: 10, cards: 20, name: '中等', time: '约8-10分钟', color: 'from-blue-50 to-blue-100', borderColor: 'border-blue-300', batchSize: 300 },
    { pairs: 20, cards: 40, name: '困难', time: '约15-20分钟', color: 'from-purple-50 to-purple-100', borderColor: 'border-purple-300', batchSize: 600 },
  ]

  // 根据难度确定每次加载的单词数量
  const getBatchSize = (difficulty: number | null) => {
    const option = DIFFICULTY_OPTIONS.find(opt => opt.pairs === difficulty)
    return option?.batchSize || 100  // 默认100
  }

  // 当前已加载的单词总数（用于分批加载）
  const [loadedWordsCount, setLoadedWordsCount] = useState(0)
  const [totalWordsCount, setTotalWordsCount] = useState(0)  // 书中总单词数
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // 加载单词数据（支持分批懒加载）
  const loadWords = useCallback(async (difficulty: number | null, offset: number = 0, isInitialLoad: boolean = false) => {
    try {
      const batchSize = getBatchSize(difficulty)

      const params = new URLSearchParams()
      params.set('bookId', bookId)
      params.set('page', String(Math.floor(offset / batchSize) + 1))
      params.set('pageSize', String(batchSize))

      // 根据难度加载足够的单词
      const wordsRes = await fetch(`/api/words?${params.toString()}`)
      if (!wordsRes.ok) throw new Error('Failed to fetch words')
      const wordsData = await wordsRes.json()

      return {
        words: wordsData.data,
        totalCount: wordsData.total || wordsData.data.length,
        hasMore: wordsData.data.length === batchSize
      }
    } catch (error) {
      console.error('Error loading words:', error)
      return { words: [], totalCount: 0, hasMore: false }
    }
  }, [bookId])

  // Fetch words and progress
  useEffect(() => {
    async function fetchData() {
      try {
        // 从 localStorage 读取上次选择的难度
        const savedDifficulty = localStorage.getItem(`match-game-difficulty-${bookId}`)
        if (savedDifficulty) {
          setSelectedDifficulty(parseInt(savedDifficulty))
        }

        setLoadingMessage('正在加载词书信息...')
        const bookRes = await fetch(`/api/books/${bookId}`)
        if (!bookRes.ok) throw new Error('Failed to fetch book')
        const bookData = await bookRes.json()
        setBookTitle(bookData.data.title)

        // 首次加载：根据默认难度加载第一批单词
        const initialDifficulty = parseInt(savedDifficulty || '4')
        const batchSize = getBatchSize(initialDifficulty)
        setLoadingMessage(`正在加载单词...（预计 ${Math.ceil(batchSize / 100)} × 100 个）`)

        const { words: initialWords, totalCount: totalWordsCount } = await loadWords(initialDifficulty, 0, true)

        setAllWords(initialWords)
        setLoadedWordsCount(initialWords.length)
        setTotalWordsCount(totalWordsCount)  // 保存总单词数

        // 生成范围标签：显示加载的单词数量
        if (totalWordsCount <= batchSize) {
          setScopeLabel(`全书 ${totalWordsCount} 个单词`)
        } else {
          setScopeLabel(`随机复习 ${initialWords.length} 个单词`)
        }

        const progressRes = await fetch(`/api/word-progress?book_id=${bookId}`)
        let progressData: any = null
        if (progressRes.ok) {
          progressData = await progressRes.json()
          setWordProgress(progressData.data || {})
        }

        // 首次加载：构建未认识单词池
        const unknownWords = initialWords.filter((word: Word) => {
          const progress = progressData?.data?.[word.id]
          return !progress || progress.status !== 'known'
        })
        setUnknownWordsPool(unknownWords)

        // 保存总单词数，用于懒加载判断
        setLoadedWordsCount(initialWords.length)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
        setLoadingMessage('')  // 清除加载提示
      }
    }

    fetchData()
  }, [bookId, scope, searchParams])

  // 初始化游戏
  useEffect(() => {
    if (unknownWordsPool.length === 0 || selectedDifficulty === null) return

    // 检查是否需要加载更多单词（单词池少于所需数量的2倍）
    const checkAndLoadMore = async () => {
      const batchSize = getBatchSize(selectedDifficulty)
      const minRequiredWords = selectedDifficulty * 2  // 至少够2轮

      // 如果当前单词池少于最小需求，且还没加载完所有单词
      if (unknownWordsPool.length < minRequiredWords && loadedWordsCount < allWords.length) {
        console.log('🔄 Loading more words...')
        setIsLoadingMore(true)

        try {
          const { words: moreWords } = await loadWords(selectedDifficulty, loadedWordsCount)

          if (moreWords.length > 0) {
            // 过滤新加载的单词
            const newUnknownWords = moreWords.filter((word: Word) => {
              const progress = wordProgress[word.id]
              return !progress || progress.status !== 'known'
            })

            // 追加到单词池
            setUnknownWordsPool(prev => [...prev, ...newUnknownWords])
            setAllWords(prev => [...prev, ...moreWords])
            setLoadedWordsCount(prev => prev + moreWords.length)

            console.log(`✅ Loaded ${moreWords.length} more words, ${newUnknownWords.length} are unknown`)
          } else {
            console.log('ℹ️ No more words to load')
          }
        } catch (error) {
          console.error('Error loading more words:', error)
        } finally {
          setIsLoadingMore(false)
        }
      }
    }

    // 异步检查并加载更多单词（不在初始化时调用，避免循环触发）
    // checkAndLoadMore() // ❌ 移除：每次轮次变化都会调用，导致重复加载

    // 单词去重：同一单词只保留一个释义（避免多义词问题）
    const wordMap = new Map<string, Word>()
    unknownWordsPool.forEach(word => {
      if (!wordMap.has(word.word)) {
        wordMap.set(word.word, word)
      }
    })
    const uniqueWords = Array.from(wordMap.values())

    // 使用 Fisher-Yates 洗牌算法随机打乱
    const shuffled = fisherYatesShuffle(uniqueWords)

    // 根据选择的难度抽取对应数量的卡片对数
    let selectedWords: Word[]
    if (shuffled.length >= selectedDifficulty) {
      selectedWords = shuffled.slice(0, selectedDifficulty)
    } else {
      selectedWords = shuffled
    }

    // 创建卡片对（英文 + 中文）
    const cardPairs: Card[] = []
    selectedWords.forEach((word, index) => {
      cardPairs.push({
        id: `word-${index}`,
        content: word.word,
        type: 'word',
        wordId: word.id,
        wordText: word.word,  // 存储单词文本，用于匹配
        isMatched: false,
        isSelected: false
      })
      cardPairs.push({
        id: `definition-${index}`,
        content: word.definition,
        type: 'definition',
        wordId: word.id,
        wordText: word.word,  // 释义卡片也存储对应的单词
        isMatched: false,
        isSelected: false
      })
    })

    // 使用 Fisher-Yates 打乱卡片顺序
    const shuffledCards = fisherYatesShuffle(cardPairs)
    setCards(shuffledCards)
    setShowDifficultySelect(false)  // 隐藏难度选择，显示游戏
    setAllCompleted(false)  // 重置通关状态
  }, [unknownWordsPool, selectedDifficulty])  // ✅ 只在单词池或难度变化时重新初始化

  // 单独处理轮次变化 - 避免循环触发
  useEffect(() => {
    if (selectedDifficulty !== null && !showDifficultySelect && currentRound > 0 && unknownWordsPool.length > 0) {
      // 当前端已经选择了难度且不在难度选择界面时，才初始化游戏
      initializeGame()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound])  // ✅ 只监听 currentRound 变化，故意忽略 initializeGame

  // 保存单词进度到数据库（带重试机制和cleanup）
  const saveWordProgress = useCallback(async (data: any, retries = 2, signal?: AbortSignal) => {
    for (let i = 0; i < retries; i++) {
      // 检查是否被中止
      if (signal?.aborted) {
        throw new Error('请求被中止')
      }

      try {
        const response = await fetch('/api/word-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: signal // 添加中止信号
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        return await response.json()
      } catch (err: any) {
        // 如果是中止错误，直接抛出
        if (err.name === 'AbortError') {
          throw err
        }

        console.error(`保存失败（尝试 ${i + 1}/${retries}）:`, err)
        if (i === retries - 1) {
          throw err
        }
        // 等待后重试（指数退避）
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }, [bookId]) // 添加bookId依赖

  // 点击卡片
  const handleCardClick = useCallback((clickedCard: Card) => {
    if (isProcessing || clickedCard.isMatched) {
      return
    }

    // 如果没有选中的卡片，选中当前卡片
    if (!selectedCard) {
      const newCards = cards.map(card =>
        card.id === clickedCard.id ? { ...card, isSelected: true } : card
      )
      setCards(newCards)
      setSelectedCard({ ...clickedCard, isSelected: true })
      return
    }

    // 如果点击的是已选中的卡片，取消选中
    if (selectedCard.id === clickedCard.id) {
      const newCards = cards.map(card =>
        card.id === clickedCard.id ? { ...card, isSelected: false } : card
      )
      setCards(newCards)
      setSelectedCard(null)
      return
    }

    // 已经有一张选中的卡片，检查是否匹配
    setIsProcessing(true)
    setMoves(prev => prev + 1)

    // 基于单词文本匹配，而不是ID - 这样相同单词的不同释义也能匹配
    const isMatch = selectedCard.wordText === clickedCard.wordText &&
                    selectedCard.type !== clickedCard.type

    if (isMatch) {
      // 匹配成功
      playSound('match')

      // 触发爆炸动画
      const cardsToExplode = cards.filter(c => c.wordText === selectedCard.wordText)
      setExplodingCards(new Set(cardsToExplode.map(c => c.id)))

      setTimeout(async () => {
        // 消除所有相同单词的卡片（从当前游戏中移除，给用户即时反馈）
        const matchedCards = cards.map(card =>
          card.wordText === selectedCard.wordText ? { ...card, isMatched: true, isSelected: false } : card
        )
        setCards(matchedCards)
        setSelectedCard(null)
        setIsProcessing(false)
        setExplodingCards(new Set())

        // 智能累积：更新单词匹配计数
        const matchedWordCards = cards.filter(c => c.wordText === selectedCard.wordText && c.type === 'word')

        // 使用Set去重，避免重复API调用
        const processedWordIds = new Set<string>()

        for (const card of matchedWordCards) {
          if (processedWordIds.has(card.wordId)) continue
          processedWordIds.add(card.wordId)

          const currentProgress = wordProgress[card.wordId]
          const currentMatchCount = currentProgress?.match_count || 0
          const newMatchCount = currentMatchCount + 1
          const currentStatus = currentProgress?.status || 'new'

          // 更新本地状态
          setWordProgress(prev => ({
            ...prev,
            [card.wordId]: {
              ...prev[card.wordId],
              match_count: newMatchCount
            }
          }))

          // 判断是否达到认识阈值（改进的状态转换逻辑）
          let shouldMarkAsKnown = false

          if (currentStatus === 'unknown') {
            // 不认识的单词需要更多次匹配（3次）
            shouldMarkAsKnown = newMatchCount >= 3
          } else if (currentStatus === 'fuzzy') {
            // 模糊的单词需要2次
            shouldMarkAsKnown = newMatchCount >= 2
          } else {
            // new状态需要2次
            shouldMarkAsKnown = newMatchCount >= MATCH_THRESHOLD
          }

          if (shouldMarkAsKnown && currentStatus !== 'known') {
            // 达到阈值，标记为认识
            try {
              setToastMessage(`💾 正在保存"${card.wordText}"...`)

              await saveWordProgress({
                word_id: card.wordId,
                book_id: bookId,
                status: 'known',
                match_count: newMatchCount
              }, 2, abortControllerRef.current?.signal) // 传递abort signal

              // 标记为已掌握
              if (card.wordText) {
                setMasteredWords(prev => {
                  if (!prev.includes(card.wordText!)) {
                    return [...prev, card.wordText!]
                  }
                  return prev
                })
              }

              setToastMessage(`✅ 已掌握"${card.wordText}"！`)
              setTimeout(() => setToastMessage(null), 2000)
            } catch (err: any) {
              // 如果是中止错误，不显示toast（静默处理）
              if (err.name === 'AbortError') {
                console.log('请求已被取消')
                return
              }
              console.error('保存失败:', err)
              setToastMessage(`⚠️ "${card.wordText}"保存失败，请重试`)
              setTimeout(() => setToastMessage(null), 3000)
            }
          } else {
            // 未达到阈值，仅更新计数，下次游戏还会随机出现
            const remaining = currentStatus === 'unknown'
              ? 3 - newMatchCount
              : MATCH_THRESHOLD - newMatchCount

            try {
              await saveWordProgress({
                word_id: card.wordId,
                book_id: bookId,
                status: currentStatus,
                match_count: newMatchCount
              }, 2, abortControllerRef.current?.signal) // 传递abort signal

              setToastMessage(`✅ 匹配成功！再匹配${remaining}次即可掌握`)
              setTimeout(() => setToastMessage(null), 2000)
            } catch (err: any) {
              // 如果是中止错误，静默处理
              if (err.name === 'AbortError') {
                console.log('请求已被取消')
                return
              }
              console.error('保存失败:', err)
              // 静默失败，不影响游戏体验
            }
          }
        }

        // 计算实际消除了多少对（可能不止一对）
        const matchedCount = cards.filter(c => c.wordText === selectedCard.wordText).length / 2
        setMatchedPairs(prev => {
          const newCount = prev + matchedCount
          if (newCount >= cards.length / 2) {
            // 本轮完成
            playSound('win')

            // 检查是否还有下一轮
            if (currentRound < totalRounds) {
              // 还有下一轮，自动进入下一轮
              setTimeout(() => {
                // 累加到总掌握单词列表
                setTotalMasteredWords(prevWords => [...prevWords, ...masteredWords])

                // 重置当前轮次状态
                setCards([])
                setSelectedCard(null)
                setMatchedPairs(0)
                setMoves(0)
                setGameWon(false)
                setIsProcessing(false)
                setExplodingCards(new Set())
                setMasteredWords([])
                setToastMessage(null)

                // 进入下一轮
                setCurrentRound(prev => prev + 1)
              }, 1500) // 1.5秒后自动进入下一轮
            } else {
              // 最后一轮完成，显示通关界面
              setTimeout(() => {
                setAllCompleted(true)
              }, 500)
            }
          }
          return newCount
        })
      }, 300) // 卡片放大消失动画300ms
    } else {
      // 匹配失败
      playSound('wrong')

      // 找到对应单词的wordId（无论点击顺序）
      const targetWordId = selectedCard.type === 'word' ? selectedCard.wordId : clickedCard.wordId

      if (targetWordId) {
        const currentProgress = wordProgress[targetWordId]
        const currentFailCount = currentProgress?.fail_count || 0
        const newFailCount = currentFailCount + 1
        const currentStatus = currentProgress?.status || 'new'

        // 更新本地状态
        setWordProgress(prev => ({
          ...prev,
          [targetWordId]: {
            ...prev[targetWordId],
            fail_count: newFailCount
          }
        }))

        // 判断是否达到不认识阈值（改进的逻辑：fuzzy也会变成unknown）
        const shouldMarkAsUnknown = newFailCount >= FAIL_THRESHOLD &&
          (currentStatus === 'new' || currentStatus === 'fuzzy')

        if (shouldMarkAsUnknown) {
          // 达到阈值，标记为不认识
          saveWordProgress({
            word_id: targetWordId,
            book_id: bookId,
            status: 'unknown',
            fail_count: newFailCount
          }, 2, abortControllerRef.current?.signal).catch(err => {
            // 如果是中止错误，静默处理
            if (err instanceof Error && err.name === 'AbortError') {
              console.log('请求已被取消')
              return
            }
            console.error('保存失败:', err)
          })
        } else {
          // 未达到阈值，仅更新计数
          saveWordProgress({
            word_id: targetWordId,
            book_id: bookId,
            status: currentStatus,
            fail_count: newFailCount
          }, 2, abortControllerRef.current?.signal).catch(err => {
            // 如果是中止错误，静默处理
            if (err instanceof Error && err.name === 'AbortError') {
              console.log('请求已被取消')
              return
            }
            console.error('保存失败:', err)
          })
        }
      }

      // 延迟后取消选中，让用户看到两张卡片同时被选中的状态
      setTimeout(() => {
        const newCards = cards.map(card =>
          card.id === selectedCard.id || card.id === clickedCard.id
            ? { ...card, isSelected: false }
            : card
        )
        setCards(newCards)
        setSelectedCard(null)
        setIsProcessing(false)
      }, 500)
    }
  }, [cards, selectedCard, isProcessing, wordProgress, bookId, saveWordProgress, MATCH_THRESHOLD, FAIL_THRESHOLD, currentRound, totalRounds, masteredWords])

  // 播放音效 - 游戏级音效
  const playSound = (type: 'match' | 'wrong' | 'win') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const masterGain = audioContext.createGain()
    masterGain.connect(audioContext.destination)
    masterGain.gain.value = 0.4  // 总体音量

    if (type === 'match') {
      // ✨ 匹配成功：愉悦的和弦（大调三和弦）
      const notes = [523.25, 659.25, 783.99]  // C5, E5, G5
      const now = audioContext.currentTime

      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()

        osc.connect(gain)
        gain.connect(masterGain)

        osc.type = 'sine'
        osc.frequency.value = freq

        // 每个音符略微错开，形成琶音效果
        const startTime = now + i * 0.05
        const duration = 0.4

        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

        osc.start(startTime)
        osc.stop(startTime + duration)
      })

      // 添加高音装饰音
      const highOsc = audioContext.createOscillator()
      const highGain = audioContext.createGain()
      highOsc.connect(highGain)
      highGain.connect(masterGain)
      highOsc.type = 'triangle'
      highOsc.frequency.value = 1046.50  // C6
      highGain.gain.setValueAtTime(0.1, now + 0.1)
      highGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
      highOsc.start(now + 0.1)
      highOsc.stop(now + 0.35)

    } else if (type === 'wrong') {
      // ❌ 匹配失败：柔和的错误提示音
      const now = audioContext.currentTime

      // 主音：低沉但不刺耳
      const osc1 = audioContext.createOscillator()
      const gain1 = audioContext.createGain()
      osc1.connect(gain1)
      gain1.connect(masterGain)
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(196.00, now)  // G3
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc1.start(now)
      osc1.stop(now + 0.25)

      // 和音：五度
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(masterGain)
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(293.66, now)  // D4
      gain2.gain.setValueAtTime(0.2, now)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc2.start(now)
      osc2.stop(now + 0.25)

    } else if (type === 'win') {
      // 🎉 胜利：激昂的旋律
      const now = audioContext.currentTime
      const melody = [
        { freq: 523.25, start: 0, duration: 0.15 },      // C5
        { freq: 659.25, start: 0.1, duration: 0.15 },   // E5
        { freq: 783.99, start: 0.2, duration: 0.15 },    // G5
        { freq: 1046.50, start: 0.3, duration: 0.3 },    // C6
        { freq: 783.99, start: 0.5, duration: 0.15 },    // G5
        { freq: 1046.50, start: 0.6, duration: 0.4 },    // C6
      ]

      melody.forEach(({ freq, start, duration }) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()

        osc.connect(gain)
        gain.connect(masterGain)

        osc.type = 'sine'
        osc.frequency.value = freq

        const startTime = now + start
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

        osc.start(startTime)
        osc.stop(startTime + duration)
      })

      // 添加和弦伴奏
      const chordFreqs = [261.63, 329.63, 392.00]  // C4, E4, G4
      for (let i = 0; i < chordFreqs.length; i++) {
        const freq = chordFreqs[i]
        const chordOsc = audioContext.createOscillator()
        const chordGain = audioContext.createGain()
        chordOsc.connect(chordGain)
        chordGain.connect(masterGain)
        chordOsc.type = 'triangle'
        chordOsc.frequency.value = freq
        chordGain.gain.setValueAtTime(0.15, now)
        chordGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8)
        chordOsc.start(now)
        chordOsc.stop(now + 0.8)
      }
    }
  }

  // 重新开始游戏（回到难度选择）
  const handleRestart = () => {
    setCards([])
    setSelectedCard(null)
    setMatchedPairs(0)
    setMoves(0)
    setGameWon(false)
    setIsProcessing(false)
    setExplodingCards(new Set())
    setMasteredWords([])
    setToastMessage(null)
    setShowDifficultySelect(true)  // 显示难度选择
    setCurrentRound(1)  // 重置轮次
    setTotalMasteredWords([])  // 重置总掌握单词
  }

  // 处理难度选择
  const handleDifficultySelect = async (pairs: number) => {
    setSelectedDifficulty(pairs)
    // 保存到 localStorage
    localStorage.setItem(`match-game-difficulty-${bookId}`, pairs.toString())

    // 根据新难度重新加载单词
    try {
      setLoading(true)
      const batchSize = getBatchSize(pairs)
      setLoadingMessage(`正在加载单词...（预计 ${Math.ceil(batchSize / 100)} × 100 个）`)

      const { words: newWords, totalCount: newTotalCount } = await loadWords(pairs, 0, true)

      setAllWords(newWords)
      setLoadedWordsCount(newWords.length)
      setTotalWordsCount(newTotalCount)

      // 重新过滤未认识单词
      const unknownWords = newWords.filter((word: Word) => {
        const progress = wordProgress[word.id]
        return !progress || progress.status !== 'known'
      })
      setUnknownWordsPool(unknownWords)

      // 计算总轮次（只在这里计算一次，之后不再改变）
      const totalRoundsCount = Math.ceil(unknownWords.length / pairs)
      setTotalRounds(totalRoundsCount)

      // 更新标签
      if (newTotalCount <= batchSize) {
        setScopeLabel(`全书 ${newTotalCount} 个单词`)
      } else {
        setScopeLabel(`随机复习 ${newWords.length} 个单词`)
      }

      // 重置游戏状态
      setCards([])
      setSelectedCard(null)
      setMatchedPairs(0)
      setMoves(0)
      setGameWon(false)
      setCurrentRound(1)

      console.log(`✅ Loaded ${newWords.length} words for difficulty ${pairs}`)
    } catch (error) {
      console.error('Error loading words for new difficulty:', error)
      setToastMessage('加载单词失败，请重试')
      setTimeout(() => setToastMessage(null), 3000)
    } finally {
      setLoading(false)
      setLoadingMessage('')  // 清除加载提示
    }
  }

  // 计算网格布局：确保卡片排列成矩形，支持响应式
  const getGridLayout = () => {
    const totalCards = cards.length
    if (totalCards === 0) return { rows: 0, cols: 0, gap: '8px' }

    // 根据卡片数量计算最优的行列排列（接近正方形）
    if (totalCards === 8) {
      // 轻松模式：2行 × 4列
      return { rows: 2, cols: 4, gap: '8px' }
    } else if (totalCards === 20) {
      // 中等模式：4行 × 5列
      return { rows: 4, cols: 5, gap: '6px' }
    } else if (totalCards === 40) {
      // 困难模式：5行 × 8列
      return { rows: 5, cols: 8, gap: '4px' }
    } else {
      // 其他情况：计算最接近正方形的排列
      const sqrt = Math.sqrt(totalCards)
      const cols = Math.ceil(sqrt)
      const rows = Math.ceil(totalCards / cols)
      return { rows, cols, gap: totalCards > 20 ? '4px' : '6px' }
    }
  }

  const gridLayout = getGridLayout()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center px-6">
          {/* 卡片翻转动画 */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">🎮</span>
            </div>
          </div>

          {/* 主加载文字 */}
          <p className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>单词消消乐</p>
          <p className="text-lg font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>正在准备游戏卡片...</p>

          {/* 详细加载信息 */}
          {loadingMessage && (
            <div className="inline-block px-4 py-2 rounded-lg border-2 border-purple-300 shadow-[2px_2px_0px_0px_#000] mb-4" style={{ backgroundColor: 'var(--card-bg)' }}>
              <p className="text-sm text-purple-700 font-semibold">{loadingMessage}</p>
            </div>
          )}

          {/* 加载提示 */}
          <div className="flex flex-col gap-2 items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>首次加载可能需要几秒钟，请稍候...</p>
          </div>
        </div>
      </div>
    )
  }

  // 检查是否单词太少
  const unknownWords = allWords.filter(word => {
    const progress = wordProgress[word.id]
    return !progress || progress.status !== 'known'
  })

  if (allWords.length > 0 && unknownWords.length < 3) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="clay-card p-8 text-center max-w-md">
          <p className="text-lg font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            单词数量太少啦，先去背几个单词再来玩吧！
          </p>
          <Link href={`/library/${bookId}`} className="clay-button-primary inline-block px-6 py-3">
            返回词书详情
          </Link>
        </div>
      </div>
    )
  }

  if (allWords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="clay-card p-8 text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>暂无单词数据</p>
          <Link href={`/library/${bookId}`} className="clay-button-primary inline-block mt-4 px-6 py-3">
            返回词书详情
          </Link>
        </div>
      </div>
    )
  }

  return (
    // <PermissionGate feature={FEATURE_PERMISSIONS.MATCH_GAME} bookId={bookId}>
    <>
      <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header - 沉浸式半透明 */}
      <header className="sticky top-0 z-50 px-4 py-2 transition-colors duration-300" style={{ background: 'rgba(255, 255, 255, 0.95)', backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="px-3 py-1.5 flex items-center justify-between shadow-[3px_3px_0px_0px_#000] border-3 border-black backdrop-blur-sm transition-colors duration-300" style={{ borderRadius: '12px', backgroundColor: 'var(--card-bg)' }}>
            <div className="flex items-center gap-2">
              <Link href={`/library/${bookId}`}>
                <button className="p-1 transition-colors border-3 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5" style={{ borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}>
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} style={{ color: 'var(--text-primary)' }} />
                </button>
              </Link>
              <div className="hidden sm:block">
                <h1 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{bookTitle}</h1>
                <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  消消乐 • {scopeLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 难度切换下拉菜单 */}
              {!showDifficultySelect && (
                <select
                  value={selectedDifficulty || ''}
                  onChange={(e) => {
                    const newDifficulty = parseInt(e.target.value)
                    if (newDifficulty !== selectedDifficulty && confirm('切换难度将重新开始当前轮次，确定吗？')) {
                      // 立即应用新难度，重新初始化游戏
                      setSelectedDifficulty(newDifficulty)
                      localStorage.setItem(`match-game-difficulty-${bookId}`, newDifficulty.toString())

                      // 重置当前轮次状态
                      setCards([])
                      setSelectedCard(null)
                      setMatchedPairs(0)
                      setMoves(0)
                      setGameWon(false)
                      setExplodingCards(new Set())
                      setMasteredWords([])
                    }
                  }}
                  className="px-2 py-1 text-xs font-bold text-gray-900 bg-white border-3 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] cursor-pointer hover:-translate-y-0.5 transition-all"
                  style={{ borderRadius: '10px' }}
                  title="切换难度（立即生效）"
                >
                  {DIFFICULTY_OPTIONS.map(option => (
                    <option key={option.pairs} value={option.pairs}>
                      {option.name} ({option.cards}张)
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={handleRestart}
                className="p-1 transition-colors border-3 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5"
                style={{ borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)' }}
                title="重新开始"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              >
                <RotateCw className="w-3.5 h-3.5" strokeWidth={3} style={{ color: 'var(--text-primary)' }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-2 flex-1 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto">
          {/* 难度选择界面 */}
          {showDifficultySelect && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>选择游戏难度</h2>
                <p style={{ color: 'var(--text-secondary)' }}>选择适合你的学习强度</p>
              </div>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.pairs}
                    onClick={() => handleDifficultySelect(option.pairs)}
                    className={`
                      relative group transition-all duration-200
                      hover:scale-105 hover:-translate-y-1
                      ${selectedDifficulty === option.pairs ? 'shadow-[8px_8px_0px_0px_#000] scale-105' : 'shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000]'}
                      bg-gradient-to-br ${option.color} border-4 ${option.borderColor}
                    `}
                    style={{
                      minWidth: '220px',
                      borderRadius: '16px'
                    }}
                  >
                    <div className="px-8 py-10 text-center">
                      <div className="text-6xl mb-4">🎮</div>
                      <h3 className="text-3xl font-black text-gray-900 mb-3">{option.name}</h3>
                      <p className="text-xl font-bold text-gray-800 mb-3">{option.cards} 张卡片</p>
                      <p className="text-base text-gray-700 font-semibold">{option.time}</p>
                    </div>
                    {selectedDifficulty === option.pairs && (
                      <div className="absolute -top-3 -right-3 bg-yellow-400 text-black border-4 border-black rounded-full w-10 h-10 flex items-center justify-center text-xl font-black shadow-[2px_2px_0px_0px_#000]">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <p>💡 提示：我们会记住你的选择，下次直接开始</p>
              </div>
            </div>
          )}

          {/* 游戏内容 - 只在难度选择后显示 */}
          {!showDifficultySelect && cards.length > 0 && (
            <>
              {/* Stats - 沉浸式半透明 */}
              <div className="flex justify-center items-center gap-2 sm:gap-3 mb-8 px-2">
                {/* 轮次进度 - 突出显示 */}
                <div className="bg-white/70 backdrop-blur-sm px-2 py-1 border-3 border-purple-400 shadow-[3px_3px_0px_0px_#000]" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-purple-800 font-black">第 {currentRound} / {totalRounds} 轮</p>
                </div>

                <div className="w-px h-5 bg-gray-400/50"></div>

                <div className="text-center px-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>已配对</p>
                  <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{matchedPairs} / {cards.length / 2}</p>
                </div>
                <div className="w-px h-5 bg-gray-400/50"></div>
                <div className="text-center px-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>步数</p>
                  <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{moves}</p>
                </div>
                <div className="w-px h-5 bg-gray-400/50"></div>
                <div className="text-center px-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>剩余</p>
                  <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{cards.length / 2 - matchedPairs}</p>
                </div>

                {/* 加载更多单词提示 */}
                {isLoadingMore && (
                  <>
                    <div className="w-px h-5 bg-gray-400/50"></div>
                    <div className="bg-blue-100/70 backdrop-blur-sm px-2 py-1 border-3 border-blue-400 shadow-[2px_2px_0px_0px_#000] animate-pulse" style={{ borderRadius: '8px' }}>
                      <p className="text-xs text-blue-800 font-black">加载中...</p>
                    </div>
                  </>
                )}

                {masteredWords.length > 0 && (
                  <>
                    <div className="w-px h-5 bg-gray-400/50"></div>
                    <div className="bg-green-100/70 backdrop-blur-sm px-2 py-1 border-3 border-green-400 shadow-[2px_2px_0px_0px_#000]" style={{ borderRadius: '8px' }}>
                      <p className="text-xs text-green-800 font-black">✨ {masteredWords.length}</p>
                    </div>
                  </>
                )}
              </div>

          {/* Toast 提示消息 */}
          {toastMessage && (
            <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
              <div className="backdrop-blur-sm px-4 py-2 text-center border-3 border-black shadow-[4px_4px_0px_0px_#000] transition-colors duration-300" style={{ borderRadius: '12px', backgroundColor: 'var(--card-bg)' }}>
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{toastMessage}</p>
              </div>
            </div>
          )}

          {/* Game Board - CSS Grid 布局 */}
          <div
            className="grid mb-10 justify-items-center w-full px-2 sm:px-4"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
              gap: gridLayout.gap,
              maxWidth: '1400px',
              margin: '0 auto'
            }}
          >
            {cards.map((card) => (
              <div
                key={card.id}
                className="relative w-full"
                style={{
                  aspectRatio: '1 / 1',
                  maxHeight: 'min(110px, 12vh)',
                  visibility: card.isMatched ? 'hidden' : 'visible'
                }}
              >
                {/* 卡片主体 - Neo-Brutalism 风格 */}
                <button
                  onClick={() => handleCardClick(card)}
                  disabled={isProcessing || card.isMatched}
                  style={{
                    borderRadius: '12px'
                  }}
                  className={`
                    relative w-full h-full font-bold text-center p-1.5 sm:p-2 md:p-3 transition-all duration-200
                    ${explodingCards.has(card.id) ? 'scale-150 opacity-0' : ''}
                    ${card.isSelected
                      ? `shadow-[6px_6px_0px_0px_#000] scale-105 z-10 ${
                          card.type === 'word'
                            ? 'bg-gradient-to-br from-purple-100 to-purple-200'
                            : 'bg-gradient-to-br from-green-100 to-green-200'
                        }`
                      : `shadow-[4px_4px_0px_0px_#000] hover:shadow-[5px_5px_0px_0px_#000] hover:-translate-y-1 hover:scale-[1.03] ${
                          card.type === 'word'
                            ? 'bg-gradient-to-br from-purple-50 to-purple-100'
                            : 'bg-gradient-to-br from-green-50 to-green-100'
                        }`
                    }
                    ${card.isSelected
                      ? 'border-4 border-yellow-400'
                      : card.type === 'word'
                        ? 'border-4 border-purple-300'
                        : 'border-4 border-green-300'
                    }
                    ${!isProcessing && !explodingCards.has(card.id) && !card.isMatched ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                >
                  <div className="flex items-center justify-center h-full w-full overflow-hidden">
                    <span className={`
                      ${card.type === 'word'
                        ? 'text-xs sm:text-sm md:text-base lg:text-lg font-black text-purple-900'
                        : 'text-xs sm:text-xs md:text-sm lg:text-base font-bold text-green-900'
                      }
                    `} style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word',
                      lineHeight: '1.3'
                    }}>
                      {card.content}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* 像素风格通关界面（全部完成） */}
          {allCompleted && (
            <div className="relative mb-4">
              {/* 像素风格背景 */}
              <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-indigo-900 to-blue-900 opacity-95 rounded-2xl"></div>

              <div className="relative clay-card p-12 text-center max-w-3xl mx-auto border-4 border-yellow-400">
                {/* 像素风格星星 */}
                <div className="text-6xl mb-4 animate-pulse">
                  ⭐🎉⭐
                </div>

                <h2 className="text-4xl font-bold text-yellow-400 mb-4" style={{
                  textShadow: '4px 4px 0px #92400e, 8px 8px 0px rgba(0,0,0,0.3)',
                  fontFamily: 'Courier New, monospace'
                }}>
                  🏆 通关成功！
                </h2>

                <p className="text-xl text-white mb-6 font-semibold">
                  恭喜你完成了所有 {totalRounds} 轮挑战！
                </p>

                {/* 统计数据 */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-yellow-400 rounded-lg p-4 border-4 border-yellow-600">
                    <p className="text-3xl font-bold text-yellow-900 mb-1">{totalRounds}</p>
                    <p className="text-sm text-yellow-800 font-semibold">完成轮数</p>
                  </div>
                  <div className="bg-green-400 rounded-lg p-4 border-4 border-green-600">
                    <p className="text-3xl font-bold text-green-900 mb-1">{totalMasteredWords.length + masteredWords.length}</p>
                    <p className="text-sm text-green-800 font-semibold">掌握单词</p>
                  </div>
                  <div className="bg-blue-400 rounded-lg p-4 border-4 border-blue-600">
                    <p className="text-3xl font-bold text-blue-900 mb-1">{moves}</p>
                    <p className="text-sm text-blue-800 font-semibold">总步数</p>
                  </div>
                </div>

                {/* 掌握的单词列表 */}
                {(totalMasteredWords.length > 0 || masteredWords.length > 0) && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-white/20">
                    <p className="text-white font-bold mb-3 text-lg">
                      📚 本次通关掌握的单词：
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-h-40 overflow-y-auto">
                      {[...totalMasteredWords, ...masteredWords].map(word => (
                        <span key={word} className="inline-block px-3 py-1 bg-yellow-400 text-yellow-900 rounded text-sm font-bold border-2 border-yellow-600">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 成就徽章 */}
                <div className="flex justify-center gap-4 mb-6">
                  <div className="text-5xl">🏅</div>
                  <div className="text-5xl">🎖️</div>
                  <div className="text-5xl">🏆</div>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleRestart}
                    className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-8 py-4 rounded-lg font-bold text-lg border-4 border-yellow-600 hover:scale-105 transition-transform"
                    style={{
                      boxShadow: '4px 4px 0px #92400e'
                    }}
                  >
                    🔄 重新挑战
                  </button>
                  <Link
                    href={`/library/${bookId}`}
                    className="bg-blue-400 hover:bg-blue-300 text-blue-900 px-8 py-4 rounded-lg font-bold text-lg border-4 border-blue-600 hover:scale-105 transition-transform"
                    style={{
                      boxShadow: '4px 4px 0px #1e40af'
                    }}
                  >
                    📚 返回词书
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 记忆规则说明 - 移到通关界面后面，只在游戏进行中显示 */}
          {!allCompleted && (
            <div className="flex flex-col items-center gap-3 px-4 mb-6">
              {/* 单词来源说明 */}
              {totalWordsCount > getBatchSize(selectedDifficulty) ? (
                <div className="bg-blue-50/70 backdrop-blur-sm px-3 py-1.5 border-2 border-blue-300/50 text-center" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-blue-700">
                    💡 <span className="font-bold">随机复习</span>：从未认识单词中随机抽取 • 自动加载更多
                  </p>
                </div>
              ) : (
                <div className="bg-purple-50/70 backdrop-blur-sm px-3 py-1.5 border-2 border-purple-300/50 text-center" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-purple-700">
                    📚 <span className="font-bold">全书复习</span>：共 {totalWordsCount} 个单词
                  </p>
                </div>
              )}

              {/* 游戏规则说明 */}
              <div className="backdrop-blur-sm px-3 py-1.5 border-2 text-center transition-colors duration-300" style={{ borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.5)', borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold">规则：</span>成功匹配 <span className="font-black" style={{ color: 'var(--text-primary)' }}>{MATCH_THRESHOLD}次</span> → 认识 •
                  失败 <span className="font-black" style={{ color: 'var(--text-primary)' }}>{FAIL_THRESHOLD}次</span> → 不认识
                </p>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>
    </div>
    </>
    // </PermissionGate>
  )
}
