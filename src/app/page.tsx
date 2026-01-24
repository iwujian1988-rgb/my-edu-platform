import { createClient, getCurrentUser, getUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Target, Calendar, Plus, GraduationCap, Zap, LayoutGrid, Cat, LogOut, ChevronRight, Sparkles, ArrowRight, Trophy, TrendingUp, Star, Clock } from 'lucide-react'
import { PermissionWarningBanner } from '@/components/PermissionDisplay'
import { getUserPermissions } from '@/lib/permissions'
import { DashboardContent } from '@/components/DashboardContent'
import { AppSidebar } from '@/components/AppSidebar'
import type { ProgressCardProps } from '@/types/progress'
import { DashboardClient } from '@/components/DashboardClient'
import { getAllBooks } from '@/lib/books-server'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function Home() {
  // 获取用户信息
  const user = await getCurrentUser()

  // 如果用户已登录，获取数据并显示工作台
  if (user) {
    const supabase = await createClient()

    // 获取用户权限
    const userPermissions = await getUserPermissions()
    const userBookIds = userPermissions?.bookPermissions || []
    const hasAllBooks = userBookIds.includes('*') || userBookIds.includes('全部')

    // 获取用户资料（包含手机号）
    const userProfile = await getUserProfile()
    const userPhone = userProfile?.phone_number || user.email || '未设置'

    // 🚀 使用统一的缓存函数获取词书数据
    // 这会使用 React cache 机制，避免重复查询数据库
    const books = await getAllBooks(user.id, userPermissions)

    console.log(`[Homepage] Loaded ${books.length} books`)

    // 获取用户学习数据
    let lastStudyBook = null as { id: string; title: string; progress: number; continueURL: string } | null
    let mistakesCount = 0
    let todayNewWordsCount = 0
    let recentBooks: any[] = []  // 🔧 性能优化：在服务端获取最近访问的词库
    let scopeStatsMap: Record<string, any> = {}  // 🔧 性能优化：缓存所有词库的统计信息
    let progressCards: ProgressCardProps[] = []  // 🔧 转换后的进度卡片数据

    try {
      // 🔥 极致性能优化：首页只加载必要数据，统计数据由客户端异步加载
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0] + 'T00:00:00Z'

      const [
        recentPrefsResult,
        recentProgressResult
      ] = await Promise.all([
        // 查询1：获取用户最近访问的词库（限制为3个）
        supabase
          .from('user_book_preferences')
          .select('book_id, last_accessed_at, last_resume_state, last_reading_progress')
          .eq('user_id', user.id)
          .not('last_accessed_at', 'is', null)
          .order('last_accessed_at', { ascending: false })
          .limit(3),

        // 查询2：获取最近学习进度（前20条，用于确定最近学习的书籍）
        supabase
          .from('word_progress')
          .select('book_id, status, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(20)
      ])

      // 🔥 性能优化：RPC 查询设置1秒超时，不阻塞首页加载
      // 如果超时或失败，使用空数据，不影响其他功能
      let typingRecentResult = { data: null, error: null }
      const rpcPromise = supabase.rpc('get_typing_recent_practice', { p_user_id: user.id })
        .then(result => {
          typingRecentResult = result
          return result
        })
        .catch(error => {
          console.warn('[Homepage] RPC query failed:', error?.message || 'Unknown error')
          return { data: null, error }
        })

      // ⏱️ 设置1秒超时
      const timeoutPromise = new Promise(resolve =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 1000)
      )

      // 等待 RPC 完成（最多1秒）
      await Promise.race([rpcPromise, timeoutPromise])

      // 处理查询结果
      const recentPrefs = recentPrefsResult.data
      const typingRecent = typingRecentResult.data
      const recentProgress = recentProgressResult.data || []

      // 🔧 性能优化：先确定最近访问的书籍ID列表
      // 优先级: user_book_preferences > typing_recent_practice > word_progress
      let recentBookIds: string[] = []

      if (recentPrefs && recentPrefs.length > 0) {
        // 使用 user_book_preferences 的数据
        recentBookIds = recentPrefs.map((pref: any) => pref.book_id)
      } else if (typingRecent && typingRecent.length > 0) {
        // 使用 typing_recent_practice 的数据
        const uniqueBooks = new Map<string, string>()
        for (const row of typingRecent) {
          if (!uniqueBooks.has(row.book_id)) {
            uniqueBooks.set(row.book_id, row.last_practice_at || row.created_at)
            if (uniqueBooks.size >= 3) break
          }
        }
        recentBookIds = Array.from(uniqueBooks.keys())
      } else if (recentProgress && recentProgress.length > 0) {
        // 从 word_progress 提取最近学习的词库（去重，取前3个）
        const uniqueBooks = new Map<string, string>()
        for (const row of recentProgress) {
          if (!uniqueBooks.has(row.book_id)) {
            uniqueBooks.set(row.book_id, row.updated_at)
            if (uniqueBooks.size >= 3) break
          }
        }
        recentBookIds = Array.from(uniqueBooks.keys())
      }

      // 🔍 调试：打印关键数据
      console.log('=== 首页数据加载 ===', {
        recentPrefs: recentPrefs?.length,
        typingRecent: typingRecent?.length,
        recentProgress: recentProgress?.length,
        recentBookIds,
        mistakesCount,
        todayNewWordsCount
      })

      // 🔥 性能优化：只为最近访问的3本书查询统计信息
      scopeStatsMap = {}
      const bookStats: Record<string, { unknown: number, fuzzy: number, known: number }> = {}

      if (books.length > 0 && recentBookIds.length > 0) {
        // 使用 recentProgress 中的数据计算统计（只统计最近访问的书籍）
        for (const row of recentProgress) {
          if (!recentBookIds.includes(row.book_id)) continue

          if (!bookStats[row.book_id]) {
            bookStats[row.book_id] = { unknown: 0, fuzzy: 0, known: 0 }
          }
          if (row.status === 'unknown') bookStats[row.book_id].unknown++
          else if (row.status === 'fuzzy') bookStats[row.book_id].fuzzy++
          else if (row.status === 'known') bookStats[row.book_id].known++
        }

        // 只为最近访问的书籍生成统计信息
        for (const bookId of recentBookIds) {
          const stats = bookStats[bookId] || { unknown: 0, fuzzy: 0, known: 0 }
          const book = books.find((b: any) => b.id === bookId)
          const totalWords = book?.total_words || 0
          scopeStatsMap[bookId] = {
            all: totalWords,
            unknown: stats.unknown,
            fuzzy: stats.fuzzy,
            known: stats.known,
            new: Math.max(0, totalWords - stats.unknown - stats.fuzzy - stats.known),
            mistakes: 0  // 暂不缓存错题数
          }
        }
      }

      // 🔥 性能优化：直接使用前面查询过的 books 数组，不再重复查询数据库
      // 从 books 数组中筛选出最近访问的书籍
      if (recentBookIds.length > 0) {
        // 创建 books 的 Map 以便快速查找
        const booksMap = new Map(books.map((book: any) => [book.id, book]))

        // 根据数据源使用相应的顺序
        if (recentPrefs && recentPrefs.length > 0) {
          const mappedBooks = recentPrefs
            .map((pref: any) => {
              const book = booksMap.get(pref.book_id)
              return book ? {
                id: book.id,
                title: book.title,
                description: book.description,
                total_words: book.total_words,
                cover_url: book.cover_url,
                cover_color: book.cover_color,
                last_accessed_at: pref.last_accessed_at,
                last_resume_state: pref.last_resume_state,
                last_reading_progress: pref.last_reading_progress  // ✅ 添加阅读进度
              } : null
            })
            .filter((book: any) => book !== null)
          recentBooks = mappedBooks
        } else if (typingRecent && typingRecent.length > 0) {
          const uniqueBooks = new Map<string, string>()
          for (const row of typingRecent) {
            if (!uniqueBooks.has(row.book_id)) {
              uniqueBooks.set(row.book_id, row.last_practice_at || row.created_at)
              if (uniqueBooks.size >= 3) break
            }
          }

          const mappedBooks = Array.from(uniqueBooks.entries())
            .map(([bookId, practiceAt]) => {
              const book = booksMap.get(bookId)
              return book ? {
                id: book.id,
                title: book.title,
                description: book.description,
                total_words: book.total_words,
                cover_url: book.cover_url,
                cover_color: book.cover_color,
                last_accessed_at: practiceAt
              } : null
            })
            .filter((book: any) => book !== null)
          recentBooks = mappedBooks
        } else {
          const uniqueBooks = new Map<string, string>()
          for (const row of recentProgress!) {
            if (!uniqueBooks.has(row.book_id)) {
              uniqueBooks.set(row.book_id, row.updated_at)
            }
          }

          const mappedBooks = Array.from(uniqueBooks.entries())
            .slice(0, 3)
            .map(([bookId, updatedAt]) => {
              const book = booksMap.get(bookId)
              return book ? {
                id: book.id,
                title: book.title,
                description: book.description,
                total_words: book.total_words,
                cover_url: book.cover_url,
                cover_color: book.cover_color,
                last_accessed_at: updatedAt
              } : null
            })
            .filter((book: any) => book !== null)
          recentBooks = mappedBooks
        }
      }

      console.log('=== recentBooks 生成了 ===', { length: recentBooks.length, books: recentBooks.map(b => ({ id: b.id, title: b.title })) })

      // 🔧 转换 recentBooks 为 progressCards 格式
      if (recentBooks && recentBooks.length > 0) {

        // ✅ 性能优化：使用前面已经查询过的 scopeStatsMap，避免重复查询
        const statsMap: Record<string, { known: number, fuzzy: number, total: number }> = {}
        for (const bookId in scopeStatsMap) {
          const stats = scopeStatsMap[bookId]
          statsMap[bookId] = {
            known: stats.known || 0,
            fuzzy: stats.fuzzy || 0,
            total: (stats.known || 0) + (stats.fuzzy || 0) + (stats.unknown || 0)
          }
        }

        // 转换为 ProgressCard 格式（直接使用 recentBooks 中的 last_resume_state 和 last_reading_progress）
        progressCards = recentBooks.slice(0, 3).map((book: any) => {
          const resumeState = book.last_resume_state  // 断点续做状态（练习模式）
          const readingProgress = book.last_reading_progress  // 阅读进度（浏览页码）

          const stats = statsMap[book.id] || { known: 0, fuzzy: 0, total: 0 }
          const totalWords = book.total_words || 0

          // 计算学习进度
          const learnedCount = stats.known + stats.fuzzy
          const progress = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0

          // 🔧 检查是否有有效的状态
          const hasValidReadingProgress = readingProgress &&
            typeof readingProgress === 'object' &&
            Object.keys(readingProgress).length > 0

          const hasValidResumeState = resumeState &&
            typeof resumeState === 'object' &&
            Object.keys(resumeState).length > 0 &&
            (resumeState.mode || resumeState.context)

          // ✅ 根据最后更新时间决定使用哪个模式
          // resumeState 有 updatedAt，readingProgress 可能没有
          // 如果 resumeState.mode 存在且不是 word-list，说明是练习模式
          // 如果 readingProgress 存在，说明是浏览模式（word-list）
          const resumeStateTime = resumeState?.updatedAt || 0
          const readingProgressTime = readingProgress?.updatedAt || readingProgress?.timestamp || 0

          let mode: 'word-list' | 'flashcards' | 'dictation' | 'match-game' | 'typing' = 'word-list'

          if (hasValidResumeState && hasValidReadingProgress) {
            // 两个都有：比较更新时间
            if (resumeStateTime > 0 && readingProgressTime > 0) {
              // 都有时间戳：使用更晚的
              mode = resumeStateTime >= readingProgressTime
                ? (resumeState?.mode || 'word-list')
                : 'word-list'
            } else if (resumeStateTime > 0) {
              // 只有 resumeState 有时间戳
              mode = resumeState?.mode || 'word-list'
            } else {
              // 都没有时间戳：优先使用练习模式（如果有）
              mode = (resumeState?.mode && resumeState.mode !== 'word-list')
                ? resumeState.mode
                : 'word-list'
            }
          } else if (hasValidResumeState) {
            // 只有 resumeState
            mode = resumeState?.mode || 'word-list'
          } else if (hasValidReadingProgress) {
            // 只有 readingProgress
            mode = 'word-list'
          }
          // 都没有：默认 word-list
          let scopeType = resumeState?.context?.scope || resumeState?.context?.scopeType || readingProgress?.status || 'all'
          const currentIndex = resumeState?.context?.index || resumeState?.context?.currentIndex || 0

          // 🔧 检查所选 scope 是否有单词，如果没有则回退到 'all'
          const bookScopeStats = scopeStatsMap[book.id]
          if (bookScopeStats && scopeType !== 'all') {
            const scopeWordCount = bookScopeStats[scopeType] || 0
            if (scopeWordCount === 0) {
              scopeType = 'all'
            }
          }

          // 生成 continue URL
          // ✅ 对于 word-list 模式，不添加参数到URL，让恢复对话框自然触发
          // 对于练习模式（flashcards/dictation/typing），直接跳转到断点
          let continueURL = `/library/${book.id}`  // 默认跳转到词书详情页

          if (hasValidReadingProgress || hasValidResumeState) {
            if (mode === 'word-list') {
              // ✅ word-list模式：不添加任何参数，让页面显示恢复对话框
              // 用户可以选择"继续学习"或"从头开始"
              continueURL = `/library/${book.id}`
            } else if (mode === 'flashcards') {
              // ✅ 使用 hash 传递 index（修复断点跳转）
              const hash = `#word-${currentIndex}`
              continueURL = `/study/${book.id}/flashcards?scope=${scopeType}&shuffle=true${hash}`
            } else if (mode === 'dictation') {
              // ✅ 使用 hash 传递 index，并添加 scope（修复断点跳转）
              const hash = `#word-${currentIndex}`
              continueURL = `/study/${book.id}/dictation?scope=${scopeType}${hash}`
            } else if (mode === 'typing') {
              // ⚠️ 打字游戏暂不支持断点续做，只传 scope
              continueURL = `/practice?bookId=${book.id}&scope=${scopeType}`
            }
          }

          return {
            bookId: book.id,
            bookTitle: book.title,
            mode,
            progress,
            scopeType,
            currentIndex,
            totalWords,
            learnedCount,  // ✅ 添加已学习词数
            lastStudyTime: new Date(book.last_accessed_at || Date.now()).getTime(),
            continueURL
          }
        })
      }

      console.log('=== progressCards 生成了 ===', { length: progressCards.length, cards: progressCards.map(c => ({ bookId: c.bookId, mode: c.mode, progress: c.progress })) })

      let lastBookId = null

      // 优先使用最近访问记录（包括 user_book_preferences 和 word_progress）
      if (recentPrefs && recentPrefs.length > 0) {
        lastBookId = (recentPrefs as any)[0].book_id
      } else if (recentProgress && recentProgress.length > 0) {
        // 使用 word_progress 中的最新记录
        lastBookId = (recentProgress as any)[0].book_id
      }

      if (lastBookId) {
        // 🔥 性能优化：直接使用已查询的数据，不再重复查询数据库
        const book = books.find((b: any) => b.id === lastBookId)
        const bookProgress = recentProgress.filter(p => p.book_id === lastBookId)
        const userPref = recentPrefs?.find((p: any) => p.book_id === lastBookId)

        if (book && bookProgress.length > 0) {
          // 只统计"认识"的单词作为学习进度
          const learnedCount = bookProgress.filter((p: any) =>
            p.status === 'known' || p.status === 'fuzzy'
          ).length
          const progress = book.total_words > 0
            ? Math.round((learnedCount / book.total_words) * 100)
            : 0

          const resumeState = userPref?.last_resume_state
          let continueURL = `/library/${lastBookId}` // 默认跳转到词书详情页

          // ⭐ 根据学习模式生成不同的跳转 URL
          if (resumeState?.mode === 'word-list') {
            // 单词列表：带筛选参数
            const ctx = resumeState.context
            const params = new URLSearchParams()
            if (ctx.filters?.theme && ctx.filters.theme !== 'all') params.append('theme', ctx.filters.theme)
            if (ctx.filters?.scenario && ctx.filters.scenario !== 'all') params.append('scenario', ctx.filters.scenario)
            if (ctx.filters?.status && ctx.filters.status !== 'all') params.append('status', ctx.filters.status)
            if (ctx.page && ctx.page > 1) params.append('page', ctx.page.toString())

            continueURL = `/library/${lastBookId}${params.toString() ? `?${params.toString()}` : ''}`
          } else if (resumeState?.mode === 'flashcards') {
            // 卡片模式：带范围和索引
            const scope = resumeState.context?.scope || 'unknown'
            const index = resumeState.context?.index || 0
            continueURL = `/study/${lastBookId}/flashcards?scope=${scope}&shuffle=true&index=${index}`
          } else if (resumeState?.mode === 'dictation') {
            // 🔥 听写模式：使用正确的字段名，同时兼容 Flashcards 的字段名
            // 优先使用新字段（currentIndex/scopeType），降级到旧字段（index/scope）
            const currentIndex = resumeState.context?.currentIndex || resumeState.context?.index || 0
            const scopeType = resumeState.context?.scopeType || resumeState.context?.scope || 'all'

            // 🔥 修复：总是添加 resume=true 参数（即使 currentIndex=0 也要恢复）
            // 因为用户可能正在学习第1个单词（index=0），需要恢复到该位置
            continueURL = `/study/${lastBookId}/dictation?resume=true&scope=${scopeType}&index=${currentIndex}#word-${currentIndex}`
          }

          lastStudyBook = {
            id: book.id,
            title: book.title,
            progress,
            continueURL
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user learning data:', error)
    }

    // 显示工作台内容 - Premium Neo-Brutalism Design
    return (
      <DashboardClient
        books={books}
        userId={user.id}
        scopeStatsMap={scopeStatsMap}
        progressCards={progressCards}
        lastStudyBook={lastStudyBook}
        // 🔥 性能优化：移除统计数字，让客户端异步加载
        userPhone={userPhone}
        recentBooks={recentBooks}
      />
    )
  }

  // 未登录，显示 Landing Page
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header - Floating Claymorphism Navbar */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="clay-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 clay-card clay-icon clay-float">
                <GraduationCap className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-purple">MAX笔记</h1>
                <p className="text-xs text-gray-600 font-semibold">✨ 智能英语学习平台</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-bold text-purple-600 hover:text-orange-600 clay-badge transition-all duration-300"
              >
                登录
              </Link>
              <Link
                href="/login"
                className="clay-button-orange px-6 py-3 text-sm font-bold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                注册
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Storytelling Landing Page */}
      <main className="flex-1 px-4 py-16">
        <div className="max-w-7xl mx-auto">

          {/* INTRO HOOK */}
          <section className="clay-card p-16 mb-8 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 clay-card clay-icon mb-8 clay-float">
              <BookOpen className="w-12 h-12 text-purple-600" />
            </div>

            <h1 className="text-5xl md:text-6xl font-black mb-6 text-gradient-purple">
              英语学习，从此不同
            </h1>

            <p className="text-xl md:text-2xl text-gray-800 font-semibold mb-8 max-w-3xl mx-auto">
              📚 告别死记硬背 · 🎯 AI 智能推荐 · 🏆 成就系统激励
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/login"
                className="clay-button-orange text-xl px-12 py-5 flex items-center gap-3 w-full sm:w-auto justify-center"
              >
                <Sparkles className="w-6 h-6" />
                立即开始学习
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="clay-button-primary text-xl px-12 py-5 flex items-center gap-3 w-full sm:w-auto justify-center"
              >
                了解更多
              </Link>
            </div>

            <p className="text-sm text-gray-600 font-medium">
              🎓 已有 <span className="text-orange-600 font-black">1,234</span> 位学习者加入
            </p>
          </section>

          <div className="chapter-divider" />

          {/* CHAPTER 1: THE PROBLEM */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <span className="clay-badge text-sm mb-4 inline-block text-purple-600">Chapter 1</span>
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-gradient-purple">
                你是否也遇到过这些问题？
              </h2>
              <p className="text-lg text-gray-600 font-semibold max-w-2xl mx-auto">
                传统背单词方式效率低，容易遗忘，学习动力不足
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="clay-card-pink p-8">
                <div className="clay-icon w-16 h-16 mb-6 mx-auto">
                  <span className="text-4xl">😫</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">
                  记不住
                </h3>
                <p className="text-gray-600 font-semibold text-center">
                  今天记的单词，明天就忘了，反复记反复忘
                </p>
              </div>

              <div className="clay-card-purple p-8">
                <div className="clay-icon w-16 h-16 mb-6 mx-auto">
                  <span className="text-4xl">😴</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">
                  没动力
                </h3>
                <p className="text-gray-600 font-semibold text-center">
                  学习枯燥无味，很难坚持超过三天
                </p>
              </div>

              <div className="clay-card-orange p-8">
                <div className="clay-icon w-16 h-16 mb-6 mx-auto">
                  <span className="text-4xl">😵</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">
                  效率低
                </h3>
                <p className="text-gray-600 font-semibold text-center">
                  不知从何学起，浪费时间在已掌握的单词上
                </p>
              </div>
            </div>
          </section>

          <div className="chapter-divider" />

          {/* CHAPTER 2: THE JOURNEY */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <span className="clay-badge text-sm mb-4 inline-block text-purple-600">Chapter 2</span>
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-gradient-purple">
                MAX笔记，重新定义单词学习
              </h2>
              <p className="text-lg text-gray-600 font-semibold max-w-2xl mx-auto">
                科学的学习方法 + 有趣的学习体验 = 高效的记忆效果
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="clay-card-blue p-8 hover:scale-105 transition-transform">
                <div className="clay-icon w-16 h-16 mb-6">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  🎯 AI 智能推荐
                </h3>
                <p className="text-gray-600 font-semibold mb-4">
                  根据你的学习水平，智能推荐最适合的单词，告别无效学习
                </p>
                <div className="clay-progress">
                  <div className="clay-progress-bar" style={{ width: '85%' }}></div>
                </div>
                <p className="text-sm text-blue-600 font-bold mt-2">学习效率提升 85%</p>
              </div>

              <div className="clay-card-orange p-8 hover:scale-105 transition-transform">
                <div className="clay-icon w-16 h-16 mb-6">
                  <Trophy className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  🏆 成就系统
                </h3>
                <p className="text-gray-600 font-semibold mb-4">
                  完成学习目标解锁成就，让学习像游戏一样有趣
                </p>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-600" />
                  <Trophy className="w-5 h-5 text-orange-600" />
                  <Trophy className="w-5 h-5 text-orange-600" />
                  <Trophy className="w-5 h-5 text-gray-300" />
                  <Trophy className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-orange-600 font-bold mt-2">连续学习 7 天</p>
              </div>

              <div className="clay-card-green p-8 hover:scale-105 transition-transform">
                <div className="clay-icon w-16 h-16 mb-6">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  ⚡ 间隔重复
                </h3>
                <p className="text-gray-600 font-semibold mb-4">
                  科学的记忆曲线算法，在最佳时机复习，记忆更持久
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    <span className="font-semibold text-gray-900">今天：20 词</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    <span className="font-semibold text-gray-900">复习：50 词</span>
                  </div>
                </div>
                <p className="text-sm text-green-600 font-bold mt-2">记忆保持率提升 3 倍</p>
              </div>
            </div>
          </section>

          <div className="chapter-divider" />

          {/* CHAPTER 3: THE SOLUTION - Course Catalog + Progress */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <span className="clay-badge text-sm mb-4 inline-block text-purple-600">Chapter 3</span>
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-gradient-purple">
                精选课程，满足不同需求
              </h2>
              <p className="text-lg text-gray-600 font-semibold max-w-2xl mx-auto">
                从四六级到雅思托福，总有一款适合你
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* Daily Progress */}
              <div className="clay-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-gray-900">📅 今日学习</h3>
                  <div className="clay-icon p-3">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="clay-badge p-4 text-center">
                    <p className="text-sm font-semibold text-gray-600 mb-1">今日目标</p>
                    <p className="text-3xl font-black text-orange-600">20 词</p>
                  </div>
                  <div className="clay-badge p-4 text-center">
                    <p className="text-sm font-semibold text-gray-600 mb-1">已完成</p>
                    <p className="text-3xl font-black text-green-600">15 词</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">今日进度</span>
                    <span className="text-sm font-black text-purple-600">75%</span>
                  </div>
                  <div className="clay-progress">
                    <div className="clay-progress-bar" style={{ width: '75%' }}></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4 text-orange-600 clay-pulse" />
                  <span className="font-semibold">连续学习 <span className="text-orange-600 font-black">7 天</span></span>
                </div>
              </div>

              {/* Course Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="clay-card-purple p-4 hover:scale-105 transition-transform cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="clay-icon p-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs font-bold text-purple-600">热门</span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-1">CET-4</h4>
                  <p className="text-xs text-gray-600 font-semibold mb-2">4,500 词</p>
                  <div className="clay-progress h-2 mb-1">
                    <div className="clay-progress-bar" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-xs font-black text-purple-600">100%</p>
                </div>

                <div className="clay-card-pink p-4 hover:scale-105 transition-transform cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="clay-icon p-2">
                      <BookOpen className="w-5 h-5 text-pink-600" />
                    </div>
                    <span className="text-xs font-bold text-pink-600">推荐</span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-1">CET-6</h4>
                  <p className="text-xs text-gray-600 font-semibold mb-2">6,000 词</p>
                  <div className="clay-progress h-2 mb-1">
                    <div className="clay-progress-bar" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-xs font-black text-pink-600">100%</p>
                </div>

                <div className="clay-card-teal p-4 hover:scale-105 transition-transform cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="clay-icon p-2">
                      <BookOpen className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="text-xs font-bold text-teal-600">新课</span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-1">IELTS</h4>
                  <p className="text-xs text-gray-600 font-semibold mb-2">8,000 词</p>
                  <div className="clay-progress h-2 mb-1">
                    <div className="clay-progress-bar" style={{ width: '44%' }}></div>
                  </div>
                  <p className="text-xs font-black text-teal-600">44%</p>
                </div>

                <div className="clay-card-blue p-4 hover:scale-105 transition-transform cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="clay-icon p-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-blue-600">精选</span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-1">TOEFL</h4>
                  <p className="text-xs text-gray-600 font-semibold mb-2">8,000 词</p>
                  <div className="clay-progress h-2 mb-1">
                    <div className="clay-progress-bar" style={{ width: '63%' }}></div>
                  </div>
                  <p className="text-xs font-black text-blue-600">63%</p>
                </div>
              </div>
            </div>
          </section>

          <div className="chapter-divider" />

          {/* STUDENT TESTIMONIALS */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-gradient-purple">
                学员真实反馈
              </h2>
              <p className="text-lg text-gray-600 font-semibold max-w-2xl mx-auto">
                看看其他学习者怎么说
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="clay-card-yellow p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                  ))}
                </div>
                <p className="text-gray-800 font-semibold mb-4 leading-relaxed">
                  "AI 智能推荐太准了！总是能找到我不会的单词，再也不浪费时间在已经掌握的词汇上。"
                </p>
                <div className="flex items-center gap-3">
                  <div className="clay-icon w-12 h-12">
                    <span className="text-2xl">👨‍🎓</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">张同学</p>
                    <p className="text-sm text-gray-600 font-medium">CET-4 学习者</p>
                  </div>
                </div>
              </div>

              <div className="clay-card-pink p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                  ))}
                </div>
                <p className="text-gray-800 font-semibold mb-4 leading-relaxed">
                  "成就系统让我每天都有动力学习！连续学习 30 天，词汇量提升了一倍，太有成就感了！"
                </p>
                <div className="flex items-center gap-3">
                  <div className="clay-icon w-12 h-12">
                    <span className="text-2xl">👩‍💼</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">李女士</p>
                    <p className="text-sm text-gray-600 font-medium">IELTS 备考中</p>
                  </div>
                </div>
              </div>

              <div className="clay-card-blue p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                  ))}
                </div>
                <p className="text-gray-800 font-semibold mb-4 leading-relaxed">
                  "界面设计很漂亮，Claymorphism 风格很有趣，用起来很开心。间隔重复算法让记忆效果特别好！"
                </p>
                <div className="flex items-center gap-3">
                  <div className="clay-icon w-12 h-12">
                    <span className="text-2xl">👨‍💻</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">王同学</p>
                    <p className="text-sm text-gray-600 font-medium">TOEFL 学习者</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="chapter-divider" />

          {/* CLIMAX CTA */}
          <section className="mb-16">
            <div className="clay-card-orange p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-orange-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-24 h-24 clay-card clay-icon mb-8 clay-float">
                  <GraduationCap className="w-12 h-12 text-orange-600" />
                </div>

                <h2 className="text-4xl md:text-5xl font-black mb-6 text-gradient-purple">
                  准备好开始学习了吗？
                </h2>

                <p className="text-xl text-gray-800 font-semibold mb-8 max-w-2xl mx-auto">
                  加入 <span className="text-orange-600 font-black">1,234</span> 位学习者，一起开启英语提升之旅！
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                  <Link
                    href="/login"
                    className="clay-button-primary text-xl px-12 py-5 flex items-center gap-3 w-full sm:w-auto justify-center"
                  >
                    <Sparkles className="w-6 h-6" />
                    免费注册
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="clay-button-orange text-xl px-12 py-5 flex items-center gap-3 w-full sm:w-auto justify-center"
                  >
                    立即登录
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-6 text-sm text-gray-700 font-semibold">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    完全免费
                  </span>
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    无需信用卡
                  </span>
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-600" />
                    随时取消
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="clay-card p-6 text-center">
              <div className="text-4xl font-black text-gradient-purple mb-2">500+</div>
              <p className="text-gray-600 font-semibold">📚 精选单词书</p>
            </div>

            <div className="clay-card p-6 text-center">
              <div className="text-4xl font-black text-gradient-pink mb-2">10万+</div>
              <p className="text-gray-600 font-semibold">📖 词汇总量</p>
            </div>

            <div className="clay-card p-6 text-center">
              <div className="text-4xl font-black text-green-600 mb-2">98%</div>
              <p className="text-gray-600 font-semibold">😊 用户满意度</p>
            </div>

            <div className="clay-card p-6 text-center">
              <div className="text-4xl font-black text-blue-600 mb-2">∞</div>
              <p className="text-gray-600 font-semibold">🚀 学习无止境</p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="clay-card px-8 py-6 text-center">
            <p className="text-gray-600 font-semibold">
              © 2026 MAX笔记 · 智能英语学习平台 · Made with ❤️
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
