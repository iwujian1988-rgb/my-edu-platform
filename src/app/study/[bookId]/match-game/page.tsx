'use client'

import { useState, useEffect, useCallback } from 'react'
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
  status: 'new' | 'known' | 'vague' | 'unknown'
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

export default function MatchGamePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string
  const scope = searchParams.get('scope') || 'filtered'

  const [allWords, setAllWords] = useState<Word[]>([])
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({})
  const [loading, setLoading] = useState(true)
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

  // 智能累积阈值配置
  const MATCH_THRESHOLD = 2  // 匹配成功2次标记为认识
  const FAIL_THRESHOLD = 3   // 匹配失败3次标记为不认识

  // 难度选项配置
  const DIFFICULTY_OPTIONS = [
    { pairs: 4, cards: 8, name: '轻松', time: '约3-5分钟', color: 'from-green-50 to-green-100', borderColor: 'border-green-300' },
    { pairs: 10, cards: 20, name: '中等', time: '约8-10分钟', color: 'from-blue-50 to-blue-100', borderColor: 'border-blue-300' },
    { pairs: 20, cards: 40, name: '困难', time: '约15-20分钟', color: 'from-purple-50 to-purple-100', borderColor: 'border-purple-300' },
  ]

  // Fetch words and progress
  useEffect(() => {
    async function fetchData() {
      try {
        // 从 localStorage 读取上次选择的难度
        const savedDifficulty = localStorage.getItem(`match-game-difficulty-${bookId}`)
        if (savedDifficulty) {
          setSelectedDifficulty(parseInt(savedDifficulty))
        }

        const bookRes = await fetch(`/api/books/${bookId}`)
        if (!bookRes.ok) throw new Error('Failed to fetch book')
        const bookData = await bookRes.json()
        setBookTitle(bookData.data.title)

        const params = new URLSearchParams()
        params.set('bookId', bookId)

        if (scope === 'filtered') {
          const theme = searchParams.get('theme')
          const scene = searchParams.get('scene')
          const status = searchParams.get('status')

          if (theme && theme !== 'all') params.set('theme', theme)
          if (scene && scene !== 'all') params.set('scene', scene)
          if (status && status !== 'all') params.set('status', status)
        }

        const wordsRes = await fetch(`/api/words?${params.toString()}`)
        if (!wordsRes.ok) throw new Error('Failed to fetch words')
        const wordsData = await wordsRes.json()

        setAllWords(wordsData.data)

        // Generate scope label
        if (scope === 'all') {
          setScopeLabel('全书')
        } else {
          const parts = []
          const theme = searchParams.get('theme')
          const scene = searchParams.get('scene')
          const status = searchParams.get('status')

          if (theme && theme !== 'all') parts.push(theme)
          if (scene && scene !== 'all') parts.push(scene)
          if (status && status !== 'all') {
            const statusMap: Record<string, string> = {
              'new': '未标注',
              'known': '认识',
              'fuzzy': '模糊',
              'unknown': '不认识'
            }
            parts.push(statusMap[status] || status)
          }

          setScopeLabel(parts.length > 0 ? parts.join(' - ') : '全部')
        }

        const progressRes = await fetch(`/api/word-progress?book_id=${bookId}`)
        let progressData: any = null
        if (progressRes.ok) {
          progressData = await progressRes.json()
          setWordProgress(progressData.data || {})
        }

        // 首次加载：构建未认识单词池
        const unknownWords = wordsData.data.filter((word: Word) => {
          const progress = progressData?.data?.[word.id]
          return !progress || progress.status !== 'known'
        })
        setUnknownWordsPool(unknownWords)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [bookId, scope, searchParams])

  // 初始化游戏
  useEffect(() => {
    if (unknownWordsPool.length === 0 || selectedDifficulty === null) return

    // 计算总轮次
    const totalRoundsCount = Math.ceil(unknownWordsPool.length / selectedDifficulty)
    setTotalRounds(totalRoundsCount)

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
  }, [unknownWordsPool, selectedDifficulty, currentRound])  // ✅ 在单词池、难度或轮次变化时重新初始化

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

      setTimeout(() => {
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
        matchedWordCards.forEach(card => {
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

          // 判断是否达到认识阈值
          if (newMatchCount >= MATCH_THRESHOLD && currentStatus !== 'known') {
            // 达到阈值，标记为认识
            fetch('/api/word-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                word_id: card.wordId,
                book_id: bookId,
                status: 'known',
                match_count: newMatchCount
              })
            }).then(() => {
              // 标记为已掌握
              if (card.wordText) {
                setMasteredWords(prev => {
                  if (!prev.includes(card.wordText!)) {
                    return [...prev, card.wordText!]
                  }
                  return prev
                })
              }
              setToastMessage(`🎉 已掌握"${card.wordText}"！`)
              setTimeout(() => setToastMessage(null), 2000)
            }).catch(err => console.error('Failed to save word progress:', err))
          } else {
            // 未达到阈值，仅更新计数，下次游戏还会随机出现
            const remaining = MATCH_THRESHOLD - newMatchCount
            setToastMessage(`✅ 匹配成功！再匹配${remaining}次即可掌握`)
            setTimeout(() => setToastMessage(null), 2000)

            fetch('/api/word-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                word_id: card.wordId,
                book_id: bookId,
                status: currentStatus,
                match_count: newMatchCount
              })
            }).catch(err => console.error('Failed to save word progress:', err))
          }
        })

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

      // 更新失败计数（仅更新选中的卡片，因为用户点击的那张可能是尝试猜测）
      if (selectedCard.type === 'word') {
        const currentProgress = wordProgress[selectedCard.wordId]
        const currentFailCount = currentProgress?.fail_count || 0
        const newFailCount = currentFailCount + 1
        const currentStatus = currentProgress?.status || 'new'

        // 更新本地状态
        setWordProgress(prev => ({
          ...prev,
          [selectedCard.wordId]: {
            ...prev[selectedCard.wordId],
            fail_count: newFailCount
          }
        }))

        // 判断是否达到不认识阈值（比较宽松）
        if (newFailCount >= FAIL_THRESHOLD && currentStatus === 'new') {
          // 达到阈值，标记为不认识
          fetch('/api/word-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              word_id: selectedCard.wordId,
              book_id: bookId,
              status: 'unknown',
              fail_count: newFailCount
            })
          }).catch(err => console.error('Failed to save word progress:', err))
        } else {
          // 未达到阈值，仅更新计数
          fetch('/api/word-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              word_id: selectedCard.wordId,
              book_id: bookId,
              status: currentStatus,
              fail_count: newFailCount
            })
          }).catch(err => console.error('Failed to save word progress:', err))
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
  }, [cards, selectedCard, isProcessing])

  // 播放音效
  const playSound = (type: 'match' | 'wrong' | 'win') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === 'match') {
      // 匹配成功音效：两个连续的音符
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } else if (type === 'wrong') {
      // 匹配失败音效：低频锯齿波
      oscillator.frequency.value = 150
      oscillator.type = 'sawtooth'
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } else if (type === 'win') {
      // 胜利音效：上升的琶音
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.2)
        osc.start(audioContext.currentTime + i * 0.1)
        osc.stop(audioContext.currentTime + i * 0.1 + 0.2)
      })
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
  const handleDifficultySelect = (pairs: number) => {
    setSelectedDifficulty(pairs)
    // 保存到 localStorage
    localStorage.setItem(`match-game-difficulty-${bookId}`, pairs.toString())
  }

  // 根据难度动态计算卡片宽度，控制在2-3行内
  const getCardWidth = () => {
    if (selectedDifficulty === 4) {
      // 轻松模式：8张卡片，2行，每行4张
      return { width: 'calc(25% - 16px)', minWidth: '180px', maxWidth: '250px' }
    } else if (selectedDifficulty === 10) {
      // 中等模式：20张卡片，2-3行，每行7-10张
      return { width: 'calc(14.28% - 16px)', minWidth: '130px', maxWidth: '180px' }
    } else {
      // 困难模式：40张卡片，3-4行，每行10-13张
      return { width: 'calc(9.09% - 16px)', minWidth: '110px', maxWidth: '150px' }
    }
  }

  const cardWidth = getCardWidth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#9B8CB5] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-semibold">加载中...</p>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>
        <div className="clay-card p-8 text-center max-w-md">
          <p className="text-lg text-gray-700 font-semibold mb-4">
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>
        <div className="clay-card p-8 text-center">
          <p className="text-lg text-gray-700 font-semibold">暂无单词数据</p>
          <Link href={`/library/${bookId}`} className="clay-button-primary inline-block mt-4 px-6 py-3">
            返回词书详情
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PermissionGate feature={FEATURE_PERMISSIONS.MATCH_GAME} bookId={bookId}>
      <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="clay-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/library/${bookId}`}>
                <button className="clay-icon p-2 hover:scale-110 transition-transform">
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gradient-lilac">{bookTitle}</h1>
                <p className="text-xs text-gray-600 font-semibold">
                  消消乐 • {scopeLabel} • {cards.length / 2}对单词
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
                  className="clay-card px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
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
                className="clay-icon p-2 hover:scale-110 transition-transform"
                title="重新开始"
              >
                <RotateCw className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* 难度选择界面 */}
          {showDifficultySelect && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">选择游戏难度</h2>
                <p className="text-gray-600">选择适合你的学习强度</p>
              </div>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.pairs}
                    onClick={() => handleDifficultySelect(option.pairs)}
                    className={`
                      relative group clay-card px-8 py-10 text-center transition-all duration-200
                      hover:scale-105 hover:shadow-xl
                      ${selectedDifficulty === option.pairs ? 'ring-4 ring-offset-2 ring-purple-400' : ''}
                      bg-gradient-to-br ${option.color} border-2 ${option.borderColor}
                    `}
                    style={{ minWidth: '200px' }}
                  >
                    <div className="text-5xl mb-3">🎮</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{option.name}</h3>
                    <p className="text-lg text-gray-700 font-semibold mb-2">{option.cards} 张卡片</p>
                    <p className="text-sm text-gray-600">{option.time}</p>
                    {selectedDifficulty === option.pairs && (
                      <div className="absolute -top-3 -right-3 bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>💡 提示：我们会记住你的选择，下次直接开始</p>
              </div>
            </div>
          )}

          {/* 游戏内容 - 只在难度选择后显示 */}
          {!showDifficultySelect && cards.length > 0 && (
            <>
              {/* Stats */}
              <div className="flex justify-center items-center gap-8 mb-6 text-gray-600">
                {/* 轮次进度 - 突出显示 */}
                <div className="clay-card px-6 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
                  <p className="text-xs text-purple-600 mb-1 font-bold">游戏进度</p>
                  <p className="text-2xl font-bold text-purple-700">第 {currentRound} / {totalRounds} 轮</p>
                </div>

                <div className="w-px h-12 bg-gray-300"></div>

                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">已配对</p>
                  <p className="text-lg font-semibold text-gray-700">{matchedPairs} / {cards.length / 2}</p>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">步数</p>
                  <p className="text-lg font-semibold text-gray-700">{moves}</p>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">剩余</p>
                  <p className="text-lg font-semibold text-gray-700">{cards.length / 2 - matchedPairs}</p>
                </div>
                {masteredWords.length > 0 && (
                  <>
                    <div className="w-px h-8 bg-gray-300"></div>
                    <div className="text-center">
                      <p className="text-xs text-purple-600 mb-1">✨ 本次掌握</p>
                      <p className="text-lg font-semibold text-purple-700">{masteredWords.length}</p>
                    </div>
                  </>
                )}
              </div>

          {/* Toast 提示消息 */}
          {toastMessage && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
              <div className="clay-card px-6 py-3 text-center shadow-lg animate-bounce">
                <p className="text-sm font-semibold text-gray-700">{toastMessage}</p>
              </div>
            </div>
          )}

          {/* Game Board */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className="relative flex-shrink-0"
                style={{
                  ...cardWidth,
                  visibility: card.isMatched ? 'hidden' : 'visible'
                }}
              >
                {/* 卡片主体 */}
                <button
                  onClick={() => handleCardClick(card)}
                  disabled={isProcessing || card.isMatched}
                  style={{
                    height: '100px',
                    minHeight: '100px',
                  }}
                  className={`
                    relative w-full rounded-2xl font-semibold text-center p-4
                    ${explodingCards.has(card.id) ? 'scale-150 opacity-0 transition-all duration-300' : 'transition-transform duration-150'}
                    ${card.isSelected
                      ? `ring-4 ring-offset-2 shadow-xl scale-105 ${card.type === 'word' ? 'ring-purple-400' : 'ring-emerald-400'}`
                      : `shadow-md hover:shadow-lg ${card.type === 'word' ? 'from-purple-50 to-purple-100' : 'from-emerald-50 to-emerald-100'} bg-gradient-to-br`
                    }
                    ${!isProcessing && !explodingCards.has(card.id) && !card.isMatched ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                >
                  <div className="flex items-center justify-center h-full w-full overflow-hidden">
                    <span className={card.type === 'word' ? 'text-lg font-bold text-purple-900' : 'text-base font-semibold text-emerald-900'} style={{
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

          {/* 记忆规则说明 - 科学依据 */}
          <div className="flex justify-center mb-8">
            <div className="clay-card px-5 py-3" style={{ maxWidth: '520px' }}>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">
                  <span className="font-semibold">规则：</span>成功匹配 <span className="font-bold text-gray-800">{MATCH_THRESHOLD}次</span> → 认识 |
                  失败 <span className="font-bold text-gray-800">{FAIL_THRESHOLD}次</span> → 不认识
                </p>
                <p className="text-xs text-gray-500">
                  原因：符合记忆曲线，重复可将短期记忆转化为长期记忆
                </p>
              </div>
            </div>
          </div>

          {/* 像素风格通关界面（全部完成） */}
          {allCompleted && (
            <div className="relative">
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
            </>
          )}
        </div>
      </main>
    </div>
    </PermissionGate>
  )
}
