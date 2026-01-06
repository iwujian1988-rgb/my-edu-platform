'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, RotateCw } from 'lucide-react'
import Link from 'next/link'

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
}

type Card = {
  id: string
  content: string
  type: 'word' | 'definition'
  wordId: string
  isFlipped: boolean
  isMatched: boolean
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
  const [flippedCards, setFlippedCards] = useState<Card[]>([])
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [moves, setMoves] = useState(0)
  const [gameWon, setGameWon] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch words and progress
  useEffect(() => {
    async function fetchData() {
      try {
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
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          setWordProgress(progressData.data || {})
        }
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
    if (allWords.length === 0) return

    // 筛选非"认识"的单词
    const unknownWords = allWords.filter(word => {
      const progress = wordProgress[word.id]
      return !progress || progress.status !== 'known'
    })

    // 边界值处理
    if (unknownWords.length < 3) {
      return
    }

    // 随机抽取单词
    let selectedWords: Word[]
    if (unknownWords.length >= 10) {
      // 随机抽取10个
      const shuffled = [...unknownWords].sort(() => Math.random() - 0.5)
      selectedWords = shuffled.slice(0, 10)
    } else {
      // 抽取全部
      selectedWords = unknownWords
    }

    // 创建卡片对（英文 + 中文）
    const cardPairs: Card[] = []
    selectedWords.forEach((word, index) => {
      cardPairs.push({
        id: `word-${index}`,
        content: word.word,
        type: 'word',
        wordId: word.id,
        isFlipped: false,
        isMatched: false
      })
      cardPairs.push({
        id: `definition-${index}`,
        content: word.definition,
        type: 'definition',
        wordId: word.id,
        isFlipped: false,
        isMatched: false
      })
    })

    // 打乱卡片顺序
    const shuffled = cardPairs.sort(() => Math.random() - 0.5)
    setCards(shuffled)
  }, [allWords, wordProgress])

  // 点击卡片
  const handleCardClick = useCallback((clickedCard: Card) => {
    if (isProcessing || clickedCard.isMatched || clickedCard.isFlipped) {
      return
    }

    if (flippedCards.length === 2) {
      return
    }

    // 翻转卡片
    const newCards = cards.map(card =>
      card.id === clickedCard.id ? { ...card, isFlipped: true } : card
    )
    setCards(newCards)

    const newFlippedCards = [...flippedCards, { ...clickedCard, isFlipped: true }]
    setFlippedCards(newFlippedCards)

    // 检查是否翻了两张
    if (newFlippedCards.length === 2) {
      setIsProcessing(true)
      setMoves(prev => prev + 1)

      const [first, second] = newFlippedCards
      const isMatch = first.wordId === second.wordId && first.type !== second.type

      if (isMatch) {
        // 匹配成功
        playSound('match')

        setTimeout(() => {
          const matchedCards = newCards.map(card =>
            card.wordId === first.wordId ? { ...card, isMatched: true } : card
          )
          setCards(matchedCards)
          setFlippedCards([])
          setIsProcessing(false)
          setMatchedPairs(prev => {
            const newCount = prev + 1
            if (newCount === cards.length / 2) {
              setGameWon(true)
              playSound('win')
            }
            return newCount
          })
        }, 500)
      } else {
        // 匹配失败
        playSound('wrong')

        setTimeout(() => {
          const resetCards = newCards.map(card =>
            card.id === first.id || card.id === second.id
              ? { ...card, isFlipped: false }
              : card
          )
          setCards(resetCards)
          setFlippedCards([])
          setIsProcessing(false)
        }, 1000)
      }
    }
  }, [cards, flippedCards, isProcessing])

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

  // 重新开始游戏
  const handleRestart = () => {
    setCards([])
    setFlippedCards([])
    setMatchedPairs(0)
    setMoves(0)
    setGameWon(false)
    setIsProcessing(false)

    // 重新初始化游戏
    const unknownWords = allWords.filter(word => {
      const progress = wordProgress[word.id]
      return !progress || progress.status !== 'known'
    })

    if (unknownWords.length < 3) {
      return
    }

    let selectedWords: Word[]
    if (unknownWords.length >= 10) {
      const shuffled = [...unknownWords].sort(() => Math.random() - 0.5)
      selectedWords = shuffled.slice(0, 10)
    } else {
      selectedWords = unknownWords
    }

    const cardPairs: Card[] = []
    selectedWords.forEach((word, index) => {
      cardPairs.push({
        id: `word-${index}`,
        content: word.word,
        type: 'word',
        wordId: word.id,
        isFlipped: false,
        isMatched: false
      })
      cardPairs.push({
        id: `definition-${index}`,
        content: word.definition,
        type: 'definition',
        wordId: word.id,
        isFlipped: false,
        isMatched: false
      })
    })

    const shuffled = cardPairs.sort(() => Math.random() - 0.5)
    setCards(shuffled)
  }

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
            <button
              onClick={handleRestart}
              className="clay-icon p-2 hover:scale-110 transition-transform"
              title="重新开始"
            >
              <RotateCw className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="clay-card p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold">已配对</p>
              <p className="text-2xl font-bold text-[#9B8CB5]">{matchedPairs} / {cards.length / 2}</p>
            </div>
            <div className="clay-card p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold">步数</p>
              <p className="text-2xl font-bold text-[#4CAF50]">{moves}</p>
            </div>
            <div className="clay-card p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold">剩余</p>
              <p className="text-2xl font-bold text-[#FF8C61]">{cards.length / 2 - matchedPairs}</p>
            </div>
          </div>

          {/* Game Board */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card)}
                disabled={card.isMatched || isProcessing}
                className={`
                  relative h-32 rounded-xl font-semibold text-center p-4 transition-all duration-300
                  ${card.isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                  ${card.isFlipped || card.isMatched ? 'bg-white' : 'bg-gradient-to-br from-[#9B8CB5] to-[#B8A5D6]'}
                  ${!card.isFlipped && !card.isMatched ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : ''}
                  ${flippedCards.length === 2 && !card.isFlipped && !card.isMatched ? 'pointer-events-none' : ''}
                  shadow-md
                `}
              >
                {card.isFlipped || card.isMatched ? (
                  <div className="flex items-center justify-center h-full">
                    <span className={`
                      ${card.type === 'word' ? 'text-xl font-bold text-gray-900' : 'text-base font-semibold text-gray-700'}
                    `}>
                      {card.content}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-4xl text-white">?</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Win Message */}
          {gameWon && (
            <div className="clay-card-lilac p-8 text-center animate-bounce">
              <h3 className="text-3xl font-bold text-gradient-lilac mb-2">
                🎉 恭喜完成！
              </h3>
              <p className="text-gray-700 font-semibold mb-2">
                你用了 {moves} 步完成了配对游戏
              </p>
              <p className="text-gray-600 mb-4">
                继续加油，消灭更多单词吧！
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleRestart}
                  className="clay-button-primary px-6 py-3 font-bold"
                >
                  再玩一次
                </button>
                <Link href={`/library/${bookId}`} className="clay-button-secondary px-6 py-3 font-bold">
                  返回词书详情
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
