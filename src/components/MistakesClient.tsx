'use client'

import { useState, useMemo, useEffect } from 'react'
import { VocabularyCard } from './VocabularyCard'
import { Trophy, BookOpen, Filter, Check, ChevronDown, Lightbulb, TrendingUp } from 'lucide-react'
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
  const [showBookMenu, setShowBookMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)

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

  // 学习小贴士 - 避免hydration错误
  const randomTips = [
    '复习错题时，先看英文释义，回忆不起来再看中文',
    '标记为"认识"的单词会从错题本中移除',
    '建议每天复习错题，巩固记忆效果',
    '可以按词书或状态筛选错题'
  ]
  const [randomTip, setRandomTip] = useState(randomTips[0]) // 初始值固定，避免hydration错误

  // 在客户端随机选择
  useEffect(() => {
    setRandomTip(randomTips[Math.floor(Math.random() * randomTips.length)])
  }, [])

  // 空状态组件
  if (filteredAndSortedWords.length === 0 && words.length > 0) {
    return (
      <div
        className="p-12 text-center"
        style={{
          backgroundColor: '#ffffff',
          border: '3px solid #000000',
          borderRadius: '12px',
          boxShadow: '4px 4px 0px 0px #000000',
        }}
      >
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">没有符合条件的单词</h3>
        <p className="text-gray-500">请尝试调整筛选条件</p>
      </div>
    )
  }

  // 真正的空状态（没有错题）
  if (words.length === 0) {
    return (
      <div
        className="p-12 text-center relative overflow-hidden"
        style={{
          backgroundColor: '#ffffff',
          border: '3px solid #000000',
          borderRadius: '12px',
          boxShadow: '4px 4px 0px 0px #000000',
        }}
      >
        {/* 礼花效果 */}
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
            <div
              className="w-32 h-32 rounded-full animate-pulse"
              style={{
                background: 'linear-gradient(to bottom right, #FEF9C3, #FEF08A)',
              }}
            />
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
          className="inline-flex items-center gap-2 px-8 py-4 font-bold text-white rounded transition-all transform hover:scale-105 relative z-10"
          style={{
            background: 'linear-gradient(to right, #22c55e, #16a34a)',
            boxShadow: '4px 4px 0px 0px #000000',
          }}
        >
          <BookOpen className="w-5 h-5" />
          去背新单词
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* 学习小贴士 */}
      <div className="mb-1 md:mb-2 text-right">
        <h3 className="text-xs md:text-sm font-black mb-0.5 md:mb-1 flex items-center gap-1 md:gap-2 justify-end transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
          <Lightbulb className="w-3 h-3 md:w-4 md:h-4" style={{ color: '#FACC15' }} strokeWidth={2.5} />
          学习小贴士
        </h3>
        <p className="text-[10px] md:text-xs font-bold leading-relaxed text-right transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>{randomTip}</p>
      </div>

      {/* 统计卡片 - Neo-Brutalism */}
      <div
        className="grid grid-cols-3 gap-2 md:gap-4 mb-2 md:mb-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        <div
          className="p-3 md:p-4 text-center transition-colors duration-300"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '3px solid #000000',
            borderRadius: '12px',
            boxShadow: '4px 4px 0px 0px #000000',
          }}
        >
          <div className="text-xl md:text-3xl font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
          <div className="text-[10px] md:text-sm mt-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>待复习总数</div>
        </div>
        <div
          className="p-3 md:p-4 text-center transition-colors duration-300"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '3px solid #000000',
            borderRadius: '12px',
            boxShadow: '4px 4px 0px 0px #FF6B6B',
          }}
        >
          <div className="text-xl md:text-3xl font-black" style={{ color: '#DC2626' }}>{stats.unknown}</div>
          <div className="text-[10px] md:text-sm mt-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>不认识</div>
        </div>
        <div
          className="p-3 md:p-4 text-center transition-colors duration-300"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '3px solid #000000',
            borderRadius: '12px',
            boxShadow: '4px 4px 0px 0px #FACC15',
          }}
        >
          <div className="text-xl md:text-3xl font-black" style={{ color: '#CA8A04' }}>{stats.fuzzy}</div>
          <div className="text-[10px] md:text-sm mt-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>模糊</div>
        </div>
      </div>

      {/* 筛选栏 - 移动端优化为图标按钮 */}
      <section
        className="flex items-center justify-between gap-2 lg:gap-3 mb-3 md:mb-4 p-2 md:p-3 transition-colors duration-300"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '3px solid #000000',
          borderRadius: '12px',
          boxShadow: '4px 4px 0px 0px #000000',
        }}
      >
        {/* 移动端+平板：紧凑图标按钮 */}
        <div className="flex items-center gap-1.5 lg:hidden">
          {/* 词书选择器 - 移动端图标 */}
          <div className="relative">
            <button
              onClick={() => setShowBookMenu(!showBookMenu)}
              className={`w-9 h-9 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                selectedBook !== 'all'
                  ? 'bg-[#3B82F6] border-black text-black shadow-none translate-y-[2px]'
                  : 'bg-white border-black text-black shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <BookOpen className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* 移动端下拉菜单 */}
            {showBookMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBookMenu(false)} />
                <div className="absolute left-0 mt-2 w-48 rounded z-20 max-h-80 overflow-y-auto transition-colors duration-300 border-[3px] border-black shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <button
                    onClick={() => { setSelectedBook('all'); setShowBookMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 ${
                      selectedBook === 'all' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    全部词书 ({stats.total})
                    {selectedBook === 'all' && <Check className="w-3 h-3" strokeWidth={3} />}
                  </button>
                  {uniqueBooks.map(book => {
                    const count = initialWords.filter(w => w.book_id === book.id).length
                    return (
                      <button
                        key={book.id}
                        onClick={() => { setSelectedBook(book.id); setShowBookMenu(false) }}
                        className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          selectedBook === book.id ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate flex-1">{book.title}</span>
                        <span className="text-gray-400">({count})</span>
                        {selectedBook === book.id && <Check className="w-3 h-3" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* 状态筛选 - 移动端图标 */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`w-9 h-9 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                statusFilter !== 'all'
                  ? 'bg-gray-900 border-black text-white shadow-none translate-y-[2px]'
                  : 'bg-white border-black text-black shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <Filter className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* 移动端筛选菜单 */}
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 mt-2 w-36 rounded z-20 overflow-hidden transition-colors duration-300 border-[3px] border-black shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <button
                    onClick={() => { setStatusFilter('all'); setShowFilterMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 ${
                      statusFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-700'
                    }`}
                  >
                    全部
                    {statusFilter === 'all' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                  <button
                    onClick={() => { setStatusFilter('unknown'); setShowFilterMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 ${
                      statusFilter === 'unknown' ? 'bg-[#FF6B6B] text-white' : 'text-gray-700'
                    }`}
                  >
                    不认识
                    {statusFilter === 'unknown' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                  <button
                    onClick={() => { setStatusFilter('fuzzy'); setShowFilterMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                      statusFilter === 'fuzzy' ? 'bg-[#FACC15] text-black' : 'text-gray-700'
                    }`}
                  >
                    模糊
                    {statusFilter === 'fuzzy' && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 排序 - 移动端图标 */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`w-9 h-9 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                sortBy !== 'default'
                  ? 'bg-[#3B82F6] border-black text-black shadow-none translate-y-[2px]'
                  : 'bg-white border-black text-black shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* 移动端排序菜单 */}
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 mt-2 w-32 rounded z-20 overflow-hidden transition-colors duration-300 border-[3px] border-black shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <button
                    onClick={() => { setSortBy('default'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 ${
                      sortBy === 'default' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    默认
                    {sortBy === 'default' && <Check className="w-3 h-3" strokeWidth={3} />}
                  </button>
                  <button
                    onClick={() => { setSortBy('book'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 ${
                      sortBy === 'book' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    按词书
                    {sortBy === 'book' && <Check className="w-3 h-3" strokeWidth={3} />}
                  </button>
                  <button
                    onClick={() => { setSortBy('status'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                      sortBy === 'status' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    按状态
                    {sortBy === 'status' && <Check className="w-3 h-3" strokeWidth={3} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 结果数 */}
          <div className="ml-auto text-[10px] md:text-xs text-gray-500 font-black">
            {filteredAndSortedWords.length} 个单词
          </div>
        </div>

        {/* 桌面端：完整按钮 */}
        <div className="hidden lg:flex lg:flex-row lg:items-center gap-4 w-full">
          {/* 词书选择器 */}
          <div className="relative">
            <button
              onClick={() => setShowBookMenu(!showBookMenu)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded border-2 text-sm font-black transition-all duration-200 cursor-pointer ${
                selectedBook !== 'all'
                  ? 'bg-[#3B82F6] border-black text-black shadow-none translate-y-[2px]'
                  : 'bg-white border-black text-black hover:bg-gray-50 shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <span>{selectedBook === 'all' ? '全部词书' : uniqueBooks.find(b => b.id === selectedBook)?.title || '全部词书'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showBookMenu ? 'rotate-180' : ''}`} strokeWidth={2.5} />
            </button>

            {/* 桌面端下拉菜单 */}
            {showBookMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBookMenu(false)} />
                <div className="absolute left-0 mt-2 w-56 rounded z-20 max-h-80 overflow-y-auto transition-colors duration-300 border-[3px] border-black shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <button
                    onClick={() => { setSelectedBook('all'); setShowBookMenu(false) }}
                    className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b-2 border-gray-100 ${
                      selectedBook === 'all' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    全部词书 ({stats.total})
                    {selectedBook === 'all' && <ChevronDown className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </button>
                  {uniqueBooks.map(book => {
                    const count = initialWords.filter(w => w.book_id === book.id).length
                    return (
                      <button
                        key={book.id}
                        onClick={() => { setSelectedBook(book.id); setShowBookMenu(false) }}
                        className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b-2 border-gray-100 last:border-b-0 ${
                          selectedBook === book.id ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate">{book.title}</span>
                        <span className="text-gray-400">({count})</span>
                        {selectedBook === book.id && <ChevronDown className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* 状态筛选 */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded border-2 text-sm font-black transition-all duration-200 cursor-pointer ${
                statusFilter !== 'all'
                  ? 'bg-gray-900 border-black text-white shadow-none translate-y-[2px]'
                  : 'bg-white border-black text-black hover:bg-gray-50 shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <Filter className="w-4 h-4" strokeWidth={2.5} />
              {statusFilter === 'all' ? '全部状态' : statusFilter === 'unknown' ? '不认识' : '模糊'}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} strokeWidth={2.5} />
            </button>

            {/* 桌面端筛选菜单 */}
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute left-0 mt-2 w-40 rounded z-20 overflow-hidden transition-colors duration-300 border-[3px] border-black shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <button
                    onClick={() => { setStatusFilter('all'); setShowFilterMenu(false) }}
                    className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b-2 border-gray-100 ${
                      statusFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-700'
                    }`}
                  >
                    全部
                    {statusFilter === 'all' && <ChevronDown className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={() => { setStatusFilter('unknown'); setShowFilterMenu(false) }}
                    className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b-2 border-gray-100 ${
                      statusFilter === 'unknown' ? 'bg-[#FF6B6B] text-white' : 'text-gray-700'
                    }`}
                  >
                    不认识
                    {statusFilter === 'unknown' && <ChevronDown className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={() => { setStatusFilter('fuzzy'); setShowFilterMenu(false) }}
                    className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                      statusFilter === 'fuzzy' ? 'bg-[#FACC15] text-black' : 'text-gray-700'
                    }`}
                  >
                    模糊
                    {statusFilter === 'fuzzy' && <ChevronDown className="w-4 h-4 rotate-180 text-black" strokeWidth={2.5} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 排序 */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded border-2 text-sm font-black transition-all duration-200 cursor-pointer ${
                sortBy !== 'default'
                  ? 'bg-[#3B82F6] border-black text-black shadow-none translate-y-[2px]'
                  : 'bg-white border-black text-black hover:bg-gray-50 shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
              {sortBy === 'default' ? '默认排序' : sortBy === 'book' ? '按词书' : '按状态'}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`} strokeWidth={2.5} />
            </button>

            {/* 桌面端排序菜单 */}
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute left-0 mt-2 w-40 rounded z-20 overflow-hidden transition-colors duration-300 border-[3px] border-black shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: 'var(--card-bg)' }}>
                  <button
                    onClick={() => { setSortBy('default'); setShowSortMenu(false) }}
                    className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b-2 border-gray-100 ${
                      sortBy === 'default' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    默认
                    {sortBy === 'default' && <ChevronDown className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={() => { setSortBy('book'); setShowSortMenu(false) }}
                    className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b-2 border-gray-100 ${
                      sortBy === 'book' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    按词书
                    {sortBy === 'book' && <ChevronDown className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={() => { setSortBy('status'); setShowSortMenu(false) }}
                    className={`w-full px-4 py-3 text-left text-sm font-black flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                      sortBy === 'status' ? 'bg-[#3B82F6] text-black' : 'text-gray-700'
                    }`}
                  >
                    按状态
                    {sortBy === 'status' && <ChevronDown className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 结果数 */}
          <div className="ml-auto text-sm text-gray-500 font-black">
            显示 <span className="font-bold text-gray-900">{filteredAndSortedWords.length}</span> 个单词
          </div>
        </div>
      </section>

      {/* 单词列表 - 响应式网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20">
        {filteredAndSortedWords.map((word, index) => {
        const isRemoving = removingIds.has(word.id)

        return (
          <div
            key={word.id}
            className="relative"
          >
            <div className={`h-full transition-all duration-300 ease-out ${
              isRemoving
                ? 'opacity-0 translate-x-full scale-95'
                : 'opacity-100 translate-x-0 scale-100'
            }`}
          >
            <VocabularyCard
              word={word}
              index={index}
              onStatusChange={handleStatusChange}
              isSaving={false}
              globalHideChinese={false}
            />
            {/* 书名标签 - Neo-Brutalism - 移到卡片外部上方 */}
            <div
              className="absolute -top-3 left-2 px-2 py-1 text-xs font-black rounded z-20"
              style={{
                backgroundColor: '#F3E8FF',
                border: '2px solid #000000',
                color: '#7C3AED',
                boxShadow: '2px 2px 0px 0px #000000'
              }}
            >
              {word.book_title}
            </div>
          </div>
        </div>
      )
      })}
      </div>
    </div>
  )
}
