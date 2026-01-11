'use client'

import { useState, useMemo } from 'react'
import { WordCard } from './WordCard'
import { Trophy, BookOpen, Filter, ArrowDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface MistakeWord {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown' | 'new'
  book_id: string
  book_title: string
}

interface MistakesClientProps {
  initialWords: MistakeWord[]
}

type SortOption = 'default' | 'book' | 'status'
type StatusFilter = 'all' | 'unknown' | 'fuzzy'

export function MistakesClient({ initialWords }: MistakesClientProps) {
  const [words, setWords] = useState<MistakeWord[]>(initialWords)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  // 筛选和排序状态
  const [selectedBook, setSelectedBook] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // 获取所有唯一的词书
  const uniqueBooks = useMemo(() => {
    const bookMap = new Map<string, string>()
    initialWords.forEach(word => {
      if (!bookMap.has(word.book_id)) {
        bookMap.set(word.book_id, word.book_title)
      }
    })
    return Array.from(bookMap.entries()).map(([id, title]) => ({ id, title }))
  }, [initialWords])

  // 统计信息
  const stats = useMemo(() => {
    return {
      total: initialWords.length,
      unknown: initialWords.filter(w => w.status === 'unknown').length,
      fuzzy: initialWords.filter(w => w.status === 'fuzzy').length,
    }
  }, [initialWords])

  // 应用筛选和排序
  const filteredAndSortedWords = useMemo(() => {
    let result = [...words]

    // 按词书筛选
    if (selectedBook !== 'all') {
      result = result.filter(w => w.book_id === selectedBook)
    }

    // 按状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter)
    }

    // 排序
    if (sortBy === 'book') {
      result.sort((a, b) => a.book_title.localeCompare(b.book_title))
    } else if (sortBy === 'status') {
      const statusOrder: Record<string, number> = { unknown: 0, fuzzy: 1, known: 2, new: 3 }
      result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
    }

    return result
  }, [words, selectedBook, statusFilter, sortBy])

  // 处理状态变更
  const handleStatusChange = async (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => {
    console.log('🔄 MistakesClient: Status change requested', { wordId, status })

    // 如果标记为"认识"，先播放删除动画
    if (status === 'known') {
      setRemovingIds(prev => new Set([...prev, wordId]))

      // 等待动画完成
      await new Promise(resolve => setTimeout(resolve, 400))

      // 从列表中移除
      setWords(prev => prev.filter(w => w.id !== wordId))
      setRemovingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(wordId)
        return newSet
      })
    }

    // 保存到数据库
    try {
      const response = await fetch('/api/word-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word_id: wordId,
          book_id: initialWords.find(w => w.id === wordId)?.book_id || '',
          status: status
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to save word progress:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        })
      } else {
        const result = await response.json()
        console.log('✅ Word progress saved:', result)
      }
    } catch (error) {
      console.error('❌ Exception in handleStatusChange:', error)
    }
  }

  // 空状态组件
  if (filteredAndSortedWords.length === 0 && words.length > 0) {
    return (
      <div className="clay-card p-12 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">没有符合条件的单词</h3>
        <p className="text-gray-500">请尝试调整筛选条件</p>
      </div>
    )
  }

  // 真正的空状态（没有错题）
  if (words.length === 0) {
    return (
      <div className="clay-card p-12 text-center relative overflow-hidden">
        {/* 礼花效果容器 */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 左上礼花 */}
          <div className="absolute top-10 left-10">
            {[...Array(12)].map((_, i) => (
              <div
                key={`firework-left-${i}`}
                className="absolute w-2 h-2 rounded-full animate-firework"
                style={{
                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][i % 6],
                  transform: `rotate(${i * 30}deg) translateY(-60px)`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>

          {/* 右上礼花 */}
          <div className="absolute top-20 right-10">
            {[...Array(12)].map((_, i) => (
              <div
                key={`firework-right-${i}`}
                className="absolute w-2 h-2 rounded-full animate-firework"
                style={{
                  backgroundColor: ['#A8E6CF', '#FFD93D', '#FF6B9D', '#C4A1FF', '#6BCB77', '#FF8C42'][i % 6],
                  transform: `rotate(${i * 30}deg) translateY(-60px)`,
                  animationDelay: `${0.3 + i * 0.05}s`
                }}
              />
            ))}
          </div>

          {/* 底部礼花 */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
            {[...Array(16)].map((_, i) => (
              <div
                key={`firework-bottom-${i}`}
                className="absolute w-2 h-2 rounded-full animate-firework-up"
                style={{
                  backgroundColor: ['#FF69B4', '#FFD700', '#00CED1', '#FF6347', '#9370DB', '#3CB371'][i % 6],
                  transform: `rotate(${i * 22.5}deg) translateY(-80px)`,
                  animationDelay: `${0.6 + i * 0.05}s`
                }}
              />
            ))}
          </div>

          {/* 飘落的彩纸 */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="absolute w-3 h-3 animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#A8E6CF', '#FFD93D'][i % 8],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>

        {/* 庆祝图标 */}
        <div className="mb-8 relative z-10">
          {/* 外圈装饰 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 animate-pulse" />
          </div>

          {/* 星星装饰 */}
          <div className="absolute -top-2 -right-2 text-4xl animate-bounce" style={{ animationDelay: '0s' }}>
            ⭐
          </div>
          <div className="absolute -top-4 left-0 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>
            ✨
          </div>
          <div className="absolute -bottom-2 -right-4 text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>
            🌟
          </div>

          {/* 主图标 */}
          <div className="relative z-10 flex items-center justify-center w-24 h-24 mx-auto">
            <div className="text-6xl animate-[bounce_1s_ease-in-out_infinite]">
              🎉
            </div>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 relative z-10">
          太棒了！你消灭了所有错题。
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto relative z-10">
          继续保持这个势头，开始学习新的单词吧！
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 relative z-10"
        >
          <BookOpen className="w-5 h-5" />
          去背新单词
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="clay-card p-4">
          <div className="text-2xl md:text-3xl font-black text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500 mt-1">待复习总数</div>
        </div>
        <div className="clay-card p-4">
          <div className="text-2xl md:text-3xl font-black text-red-600">{stats.unknown}</div>
          <div className="text-sm text-gray-500 mt-1">不认识</div>
        </div>
        <div className="clay-card p-4">
          <div className="text-2xl md:text-3xl font-black text-yellow-600">{stats.fuzzy}</div>
          <div className="text-sm text-gray-500 mt-1">模糊</div>
        </div>
      </div>

      {/* 筛选和排序栏 */}
      <div className="clay-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* 按词书筛选 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">词书:</label>
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">全部 ({stats.total})</option>
              {uniqueBooks.map(book => {
                const count = initialWords.filter(w => w.book_id === book.id).length
                return (
                  <option key={book.id} value={book.id}>
                    {book.title} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* 按状态筛选 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">状态:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">全部</option>
              <option value="unknown">不认识 ({stats.unknown})</option>
              <option value="fuzzy">模糊 ({stats.fuzzy})</option>
            </select>
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">排序:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="default">默认</option>
              <option value="book">按词书</option>
              <option value="status">按状态</option>
            </select>
          </div>

          {/* 结果数 */}
          <div className="ml-auto text-sm text-gray-500">
            显示 <span className="font-bold text-gray-900">{filteredAndSortedWords.length}</span> 个单词
          </div>
        </div>
      </div>

      {/* 单词列表 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {filteredAndSortedWords.map((word, index) => {
        const isRemoving = removingIds.has(word.id)

        return (
          <div
            key={word.id}
            className={`relative transition-all duration-300 ease-out ${
              isRemoving
                ? 'opacity-0 translate-x-full scale-95'
                : 'opacity-100 translate-x-0 scale-100'
            }`}
          >
            <WordCard
              word={word}
              index={index}
              onStatusChange={handleStatusChange}
            />
            {/* 书名标签 */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full z-10">
              {word.book_title}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
