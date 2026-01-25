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
        // 查询1：获取用户最近访问的词库（限制为10个，支持跨书籍多模式展示）
        // 🔥 新逻辑：展平 last_resume_summary 后排序，所以需要查询更多书籍
        supabase
          .from('user_book_preferences')
          .select('book_id, last_accessed_at, last_resume_state, last_resume_summary, last_reading_progress')
          .eq('user_id', user.id)
          .not('last_accessed_at', 'is', null)
          .order('last_accessed_at', { ascending: false })
          .limit(10),

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

      // 🔍 调试：详细打印 recentPrefs 的内容
      if (recentPrefs && recentPrefs.length > 0) {
        console.log('📚 [recentPrefs 详细]:', recentPrefs.map((p: any) => ({
          book_id: p.book_id,
          last_accessed_at: p.last_accessed_at,
          有last_resume_state: !!p.last_resume_state,
          有last_resume_summary: !!p.last_resume_summary,
          summary_keys: p.last_resume_summary ? Object.keys(p.last_resume_summary) : []
        })))
      }

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
                last_resume_summary: pref.last_resume_summary,  // ⭐ 添加 summary 字段
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

        // 🔥 新逻辑：展平 last_resume_summary，为每个有进度记录的模式生成独立卡片
        // 这样可以跨书籍展示最近学习，支持同一本书的多个模式同时显示

        // 🛡️ [卫语句] 边界检查：确保 recentBooks 存在且不为空
        if (!recentBooks || recentBooks.length === 0) {
          console.log('⚠️ [首页展平] recentBooks 为空，跳过展平逻辑')
        } else {
          const flattenedCards: any[] = []

          console.log('📚 [首页展平] 开始处理 recentBooks:', recentBooks.map(b => ({
            id: b.id,
            title: b.title,
            有last_resume_state: !!b.last_resume_state,
            有last_resume_summary: !!b.last_resume_summary,
            summary_keys: b.last_resume_summary ? Object.keys(b.last_resume_summary) : []
          })))

          for (const book of recentBooks) {
            // 🛡️ [边界检查] 确保 book 对象有效
            if (!book || !book.id) {
              console.warn('⚠️ [首页展平] 跳过无效的 book 对象')
              continue
            }

            const stats = statsMap[book.id] || { known: 0, fuzzy: 0, total: 0 }
            const totalWords = book.total_words || 0
            const learnedCount = stats.known + stats.fuzzy
            const progress = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0

            // 1. 优先处理 last_resume_state（当前活动的模式）
            const resumeState = book.last_resume_state
            const readingProgress = book.last_reading_progress

            // 🔧 检查是否有有效的状态
            const hasValidReadingProgress = readingProgress &&
              typeof readingProgress === 'object' &&
              Object.keys(readingProgress).length > 0

            const hasValidResumeState = resumeState &&
              typeof resumeState === 'object' &&
              Object.keys(resumeState).length > 0 &&
              (resumeState.mode || resumeState.context)

            // 🔥 修复：检查是否是残留的 word-list mode 数据（修复前产生的）
            const isLegacyWordListData = resumeState?.mode === 'word-list'
            const hasValidPracticeMode = hasValidResumeState && !isLegacyWordListData

            let currentMode: 'word-list' | 'flashcards' | 'dictation' | 'match-game' | 'typing' = 'word-list'
            let currentModeTime = 0

            // 确定当前活动的模式
            if (hasValidPracticeMode || hasValidReadingProgress) {
              const resumeStateTime = resumeState?.updatedAt || 0
              const readingProgressTime = readingProgress?.updatedAt || readingProgress?.timestamp || 0

              if (hasValidPracticeMode && hasValidReadingProgress) {
                if (resumeStateTime > 0 && readingProgressTime > 0) {
                  currentMode = resumeStateTime >= readingProgressTime
                    ? (resumeState?.mode || 'word-list')
                    : 'word-list'
                  currentModeTime = Math.max(resumeStateTime, readingProgressTime)
                } else if (resumeStateTime > 0) {
                  currentMode = resumeState?.mode || 'word-list'
                  currentModeTime = resumeStateTime
                }
              } else if (hasValidPracticeMode) {
                currentMode = resumeState?.mode || 'word-list'
                currentModeTime = resumeStateTime
              } else if (hasValidReadingProgress) {
                currentMode = 'word-list'
                currentModeTime = readingProgressTime
              }
            }

            // 2. 添加当前活动模式的卡片
            if (currentModeTime > 0) {
              const scopeType = resumeState?.context?.scope || resumeState?.context?.scopeType || readingProgress?.status || 'all'
              const currentIndex = resumeState?.context?.index || resumeState?.context?.currentIndex || 0

              // 检查所选 scope 是否有单词
              const bookScopeStats = scopeStatsMap[book.id]
              let finalScopeType = scopeType
              if (bookScopeStats && scopeType !== 'all') {
                const scopeWordCount = bookScopeStats[scopeType] || 0
                if (scopeWordCount === 0) {
                  finalScopeType = 'all'
                }
              }

              // 生成 continue URL
              let continueURL = `/library/${book.id}`
              if (currentMode === 'word-list') {
                continueURL = `/library/${book.id}`
              } else if (currentMode === 'flashcards') {
                const hash = `#word-${currentIndex}`
                continueURL = `/study/${book.id}/flashcards?scope=${finalScopeType}${hash}`
              } else if (currentMode === 'dictation') {
                const hash = `#word-${currentIndex}`
                continueURL = `/study/${book.id}/dictation?scope=${finalScopeType}&resume=true${hash}`
              } else if (currentMode === 'typing') {
                continueURL = `/practice?bookId=${book.id}&scope=${finalScopeType}`
              }

              console.log(`✅ [展平] 添加当前活动模式: ${book.title} - ${currentMode} (${new Date(currentModeTime).toLocaleString('zh-CN')})`)

              flattenedCards.push({
                bookId: book.id,
                bookTitle: book.title,
                mode: currentMode,
                progress,
                scopeType: finalScopeType,
                currentIndex,
                totalWords,
                learnedCount,
                lastStudyTime: currentModeTime,
                continueURL
              })
            }

            // 3. 展平 last_resume_summary，为每个模式生成独立卡片
            const resumeSummary = book.last_resume_summary || {}
            const supportedModes = ['word-list', 'flashcards', 'dictation', 'match-game', 'typing']

            console.log(`📖 [展平] 处理 ${book.title} 的 last_resume_summary:`, {
              模式数量: Object.keys(resumeSummary).length,
              模式列表: Object.keys(resumeSummary)
            })

            for (const mode of supportedModes) {
              const summary = resumeSummary[mode]
              if (!summary) continue

              // 跳过当前活动模式（已经添加过了）
              if (mode === currentMode) continue

              const { updatedAt, scopeType, currentIndex, totalWords: summaryTotalWords } = summary
              if (!updatedAt) continue

              // 检查所选 scope 是否有单词
              const bookScopeStats = scopeStatsMap[book.id]
              let finalScopeType = scopeType
              if (bookScopeStats && scopeType !== 'all') {
                const scopeWordCount = bookScopeStats[scopeType] || 0
                if (scopeWordCount === 0) {
                  finalScopeType = 'all'
                }
              }

              // 生成 continue URL
              let continueURL = `/library/${book.id}`
              if (mode === 'word-list') {
                continueURL = `/library/${book.id}`
              } else if (mode === 'flashcards') {
                const hash = `#word-${currentIndex}`
                continueURL = `/study/${book.id}/flashcards?scope=${finalScopeType}${hash}`
              } else if (mode === 'dictation') {
                const hash = `#word-${currentIndex}`
                continueURL = `/study/${book.id}/dictation?scope=${finalScopeType}&resume=true${hash}`
              } else if (mode === 'typing') {
                continueURL = `/practice?bookId=${book.id}&scope=${finalScopeType}`
              }

              console.log(`✅ [展平] 从summary添加: ${book.title} - ${mode} (${new Date(updatedAt).toLocaleString('zh-CN')})`)

              flattenedCards.push({
                bookId: book.id,
                bookTitle: book.title,
                mode: mode as any,
                progress,
                scopeType: finalScopeType,
                currentIndex,
                totalWords: summaryTotalWords || totalWords,
                learnedCount,
                lastStudyTime: updatedAt,
                continueURL
              })
            }

            // 4. ⭐ 特殊处理：last_reading_progress 字段（单词列表阅读进度）
            // 该字段独立存储单词列表的阅读进度，需要单独处理
            // 🛡️ [卫语句] 检查是否已经存在 word-list 卡片（避免重复）
            const hasWordListCard = flattenedCards.some(c => c.bookId === book.id && c.mode === 'word-list')

            if (!hasWordListCard && readingProgress) {
              // 🛡️ [边界检查] 确保 readingProgress 是有效对象
              if (typeof readingProgress === 'object' && Object.keys(readingProgress).length > 0) {
                // 📋 [边界检查] 检查是否有实际进度（非默认状态）
                const hasProgress =
                  (readingProgress.page && readingProgress.page > 1) ||
                  (readingProgress.status && readingProgress.status !== 'all') ||
                  (readingProgress.theme && readingProgress.theme !== 'all') ||
                  (readingProgress.scenario && readingProgress.scenario !== 'all') ||
                  (readingProgress.chapter && readingProgress.chapter !== 'all')

                if (hasProgress) {
                  const lastAccessedAt = book.last_accessed_at
                  const accessedTime = lastAccessedAt ? new Date(lastAccessedAt).getTime() : Date.now()

                  // 🎯 生成 continue URL（携带筛选参数）
                  const params = new URLSearchParams()
                  if (readingProgress.page && readingProgress.page > 1) {
                    params.set('page', readingProgress.page.toString())
                  }
                  if (readingProgress.status && readingProgress.status !== 'all') {
                    params.set('status', readingProgress.status)
                  }
                  if (readingProgress.theme && readingProgress.theme !== 'all') {
                    params.set('theme', readingProgress.theme)
                  }
                  if (readingProgress.scenario && readingProgress.scenario !== 'all') {
                    params.set('scenario', readingProgress.scenario)
                  }
                  if (readingProgress.chapter && readingProgress.chapter !== 'all') {
                    params.set('chapter', readingProgress.chapter)
                  }

                  const queryString = params.toString()
                  const continueURL = `/library/${book.id}${queryString ? '?' + queryString : ''}`

                  console.log(`✅ [展平] 从last_reading_progress添加word-list: ${book.title} (page:${readingProgress.page}, ${new Date(accessedTime).toLocaleString('zh-CN')})`)

                  flattenedCards.push({
                    bookId: book.id,
                    bookTitle: book.title,
                    mode: 'word-list',
                    progress,
                    scopeType: readingProgress.status || 'all',
                    currentIndex: (readingProgress.page || 1) * 20, // 粗略估计
                    totalWords,
                    learnedCount,
                    lastStudyTime: accessedTime,
                    continueURL
                  })
                } else {
                  console.log(`⏭️ [展平] 跳过 ${book.title} 的 last_reading_progress：无实际进度`)
                }
              } else {
                console.log(`⏭️ [展平] 跳过 ${book.title} 的 last_reading_progress：无效数据`)
              }
            }
          }

          // 4. 按 lastStudyTime 降序排序，取前3个
          progressCards = flattenedCards
            .sort((a, b) => b.lastStudyTime - a.lastStudyTime)
            .slice(0, 3)
            .map(card => ({
              ...card,
              _uniqueKey: `${card.bookId}-${card.mode}` // 添加唯一标识符
            }))

          // 🔍 [可观测性] 打印最终结果
          console.log('=== 展平后的卡片数据 ===', {
            总卡片数: flattenedCards.length,
            展示卡片数: progressCards.length,
            卡片详情: progressCards.map(c => ({
              书名: c.bookTitle,
              模式: c.mode,
              时间: new Date(c.lastStudyTime).toLocaleString('zh-CN')
            }))
          })
        }
      }

      console.log('=== progressCards 生成了 ===', { length: progressCards.length, cards: progressCards.map(c => ({ bookId: c.bookId, mode: c.mode, progress: c.progress })) })

    } catch (error) {
      console.error('❌ [Homepage] Error fetching user learning data:', error)
    }

    // 显示工作台内容 - Premium Neo-Brutalism Design
    return (
      <DashboardClient
        books={books}
        userId={user.id}
        scopeStatsMap={scopeStatsMap}
        progressCards={progressCards}
        // 🔥 性能优化：移除统计数字，让客户端异步加载
        userPhone={userPhone}
        recentBooks={recentBooks}
      />
    )
  }

  // 未登录，显示 Landing Page
  // 🔍 时间判断：18:00-6:00 自动显示黑暗模式
  const now = new Date()
  const hour = now.getHours()
  const shouldUseDarkMode = hour >= 18 || hour < 6

  // 为暗色模式设置CSS变量
  const rootStyle = shouldUseDarkMode ? {
    '--bg-secondary': '#1a1a1a',
    '--card-bg': '#2a2a2a',
    '--text-primary': '#ffffff',
    '--text-secondary': '#a0a0a0',
    '--border': '#333333',
    '--bg-tertiary': '#333333',
    backgroundColor: '#1a1a1a',
    color: '#ffffff'
  } : {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)'
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={rootStyle}>
      {/* Header - Neo-Brutalism Navbar */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4 backdrop-blur-md border-b transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 transition-all duration-300"
                style={{
                  backgroundColor: '#B4F416',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0px 0px #000000'
                }}
              >
                <GraduationCap className="w-5 h-5 md:w-7 md:h-7" style={{ color: '#000000' }} strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl md:text-2xl font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>MAX笔记</h1>
                <p className="text-xs font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>✨ 智能英语学习平台</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/login"
                className="px-4 md:px-6 py-2 md:py-3 text-sm font-black transition-all duration-300 hidden sm:block"
                style={{
                  color: 'var(--text-primary)',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  backgroundColor: 'var(--card-bg)',
                  boxShadow: '2px 2px 0px 0px #000000'
                }}
              >
                登录
              </Link>
              <Link
                href="/register"
                className="px-4 md:px-6 py-2 md:py-3 text-sm font-black text-white flex items-center gap-2 transition-all duration-300"
                style={{
                  backgroundColor: '#FF8C61',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0px 0px #000000'
                }}
              >
                <Sparkles className="w-4 h-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">注册</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Storytelling Landing Page */}
      <main className="flex-1 px-3 sm:px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">

          {/* INTRO HOOK */}
          <section
            className="p-6 md:p-12 lg:p-16 mb-6 md:mb-8 text-center transition-all duration-300"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '3px solid #000000',
              borderRadius: '16px',
              boxShadow: '6px 6px 0px 0px #000000'
            }}
          >
            <div
              className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 mb-6 md:mb-8 transition-all duration-300"
              style={{
                backgroundColor: '#B4F416',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '4px 4px 0px 0px #000000'
              }}
            >
              <BookOpen className="w-8 h-8 md:w-12 md:h-12" style={{ color: '#000000' }} strokeWidth={2.5} />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
              英语学习，从此不同
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl font-semibold mb-6 md:mb-8 max-w-3xl mx-auto transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
              📚 告别死记硬背 · 🎯 AI 智能推荐 · 🏆 成就系统激励
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
              <Link
                href="/register"
                className="text-base md:text-xl px-8 md:px-12 py-3 md:py-5 flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto font-black text-white transition-all duration-300"
                style={{
                  backgroundColor: '#FF8C61',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                立即开始学习
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
              </Link>
              <Link
                href="/login"
                className="text-base md:text-xl px-8 md:px-12 py-3 md:py-5 flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto font-black transition-all duration-300"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--card-bg)',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                了解更多
              </Link>
            </div>

            <p className="text-sm md:text-base font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
              🎓 已有 <span className="font-black" style={{ color: '#FF8C61' }}>1,234</span> 位学习者加入
            </p>
          </section>

          <div className="hidden sm:block h-1 my-6 md:my-8 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}></div>

          {/* CHAPTER 1: THE PROBLEM */}
          <section className="mb-12 md:mb-16">
            <div className="text-center mb-8 md:mb-12">
              <span
                className="text-xs md:text-sm font-black px-4 py-2 mb-4 inline-block transition-all duration-300"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: '#FACC15',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0px 0px #000000'
                }}
              >Chapter 1</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 md:mb-4 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                你是否也遇到过这些问题？
              </h2>
              <p className="text-base md:text-lg font-semibold max-w-2xl mx-auto transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                传统背单词方式效率低，容易遗忘，学习动力不足
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div
                className="p-5 md:p-8 transition-all duration-300"
                style={{
                  backgroundColor: '#FFB6D9',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div
                  className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 mx-auto flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <span className="text-3xl md:text-4xl">😫</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 text-center transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  记不住
                </h3>
                <p className="text-sm md:text-base font-semibold text-center transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  今天记的单词，明天就忘了，反复记反复忘
                </p>
              </div>

              <div
                className="p-5 md:p-8 transition-all duration-300"
                style={{
                  backgroundColor: '#E9D5FF',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div
                  className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 mx-auto flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <span className="text-3xl md:text-4xl">😴</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 text-center transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  没动力
                </h3>
                <p className="text-sm md:text-base font-semibold text-center transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  学习枯燥无味，很难坚持超过三天
                </p>
              </div>

              <div
                className="p-5 md:p-8 transition-all duration-300"
                style={{
                  backgroundColor: '#FDBCB4',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div
                  className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 mx-auto flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <span className="text-3xl md:text-4xl">😵</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 text-center transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  效率低
                </h3>
                <p className="text-sm md:text-base font-semibold text-center transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  不知从何学起，浪费时间在已掌握的单词上
                </p>
              </div>
            </div>
          </section>

          <div className="hidden sm:block h-1 my-6 md:my-8 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}></div>

          {/* CHAPTER 2: THE JOURNEY */}
          <section className="mb-12 md:mb-16">
            <div className="text-center mb-8 md:mb-12">
              <span
                className="text-xs md:text-sm font-black px-4 py-2 mb-4 inline-block transition-all duration-300"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: '#B4F416',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0px 0px #000000'
                }}
              >Chapter 2</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 md:mb-4 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                MAX笔记，重新定义单词学习
              </h2>
              <p className="text-base md:text-lg font-semibold max-w-2xl mx-auto transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                科学的学习方法 + 有趣的学习体验 = 高效的记忆效果
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div
                className="p-5 md:p-8 transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: '#ADD8E6',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div
                  className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <Target className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  🎯 AI 智能推荐
                </h3>
                <p className="text-sm md:text-base font-semibold mb-3 md:mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  根据你的学习水平，智能推荐最适合的单词，告别无效学习
                </p>
                <div className="w-full h-2 md:h-3 mb-2 rounded-full transition-all duration-300" style={{ backgroundColor: '#ffffff', border: '2px solid #000000' }}>
                  <div className="h-full rounded-full" style={{ width: '85%', backgroundColor: '#3B82F6' }}></div>
                </div>
                <p className="text-xs md:text-sm font-black mt-2" style={{ color: '#3B82F6' }}>学习效率提升 85%</p>
              </div>

              <div
                className="p-5 md:p-8 transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: '#FDBCB4',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div
                  className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <Trophy className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#FF8C61' }} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  🏆 成就系统
                </h3>
                <p className="text-sm md:text-base font-semibold mb-3 md:mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  完成学习目标解锁成就，让学习像游戏一样有趣
                </p>
                <div className="flex items-center gap-1 md:gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Trophy key={i} className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#FF8C61' }} strokeWidth={2.5} />
                  ))}
                  {[...Array(2)].map((_, i) => (
                    <Trophy key={i} className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#E5E7EB' }} strokeWidth={2.5} />
                  ))}
                </div>
                <p className="text-xs md:text-sm font-black mt-2" style={{ color: '#FF8C61' }}>连续学习 7 天</p>
              </div>

              <div
                className="p-5 md:p-8 transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: '#BBF7D0',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div
                  className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <Zap className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  ⚡ 间隔重复
                </h3>
                <p className="text-sm md:text-base font-semibold mb-3 md:mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  科学的记忆曲线算法，在最佳时机复习，记忆更持久
                </p>
                <div className="space-y-1 md:space-y-2">
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }}></div>
                    <span className="font-semibold transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>今天：20 词</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9B8CB5' }}></div>
                    <span className="font-semibold transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>复习：50 词</span>
                  </div>
                </div>
                <p className="text-xs md:text-sm font-black mt-2" style={{ color: '#22C55E' }}>记忆保持率提升 3 倍</p>
              </div>
            </div>
          </section>

          <div className="hidden sm:block h-1 my-6 md:my-8 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}></div>

          {/* CHAPTER 3: THE SOLUTION - Course Catalog + Progress */}
          <section className="mb-12 md:mb-16">
            <div className="text-center mb-8 md:mb-12">
              <span
                className="text-xs md:text-sm font-black px-4 py-2 mb-4 inline-block transition-all duration-300"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: '#FACC15',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0px 0px #000000'
                }}
              >Chapter 3</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 md:mb-4 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                精选课程，满足不同需求
              </h2>
              <p className="text-base md:text-lg font-semibold max-w-2xl mx-auto transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                从四六级到雅思托福，总有一款适合你
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
              {/* Daily Progress */}
              <div
                className="p-5 md:p-8 transition-all duration-300"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-xl md:text-2xl font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>📅 今日学习</h3>
                  <div
                    className="p-2 md:p-3 flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: '#B4F416',
                      border: '3px solid #000000',
                      borderRadius: '8px',
                      boxShadow: '2px 2px 0px 0px #000000'
                    }}
                  >
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#000000' }} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                  <div
                    className="p-3 md:p-4 text-center transition-all duration-300"
                    style={{
                      backgroundColor: '#FACC15',
                      border: '3px solid #000000',
                      borderRadius: '10px',
                      boxShadow: '2px 2px 0px 0px #000000'
                    }}
                  >
                    <p className="text-xs md:text-sm font-semibold mb-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>今日目标</p>
                    <p className="text-2xl md:text-3xl font-black" style={{ color: '#FF8C61' }}>20 词</p>
                  </div>
                  <div
                    className="p-3 md:p-4 text-center transition-all duration-300"
                    style={{
                      backgroundColor: '#B4F416',
                      border: '3px solid #000000',
                      borderRadius: '10px',
                      boxShadow: '2px 2px 0px 0px #000000'
                    }}
                  >
                    <p className="text-xs md:text-sm font-semibold mb-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>已完成</p>
                    <p className="text-2xl md:text-3xl font-black" style={{ color: '#22C55E' }}>15 词</p>
                  </div>
                </div>

                <div className="mb-3 md:mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>今日进度</span>
                    <span className="text-xs md:text-sm font-black" style={{ color: '#9B8CB5' }}>75%</span>
                  </div>
                  <div className="w-full h-2 md:h-3 rounded-full transition-all duration-300" style={{ backgroundColor: '#F3F4F6', border: '2px solid #000000' }}>
                    <div className="h-full rounded-full" style={{ width: '75%', backgroundColor: '#22C55E' }}></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs md:text-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  <Zap className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#FACC15' }} strokeWidth={2.5} />
                  <span className="font-semibold">连续学习 <span className="font-black" style={{ color: '#FF8C61' }}>7 天</span></span>
                </div>
              </div>

              {/* Course Grid */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div
                  className="p-3 md:p-4 transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: '#E9D5FF',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '3px 3px 0px 0px #000000'
                  }}
                >
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div
                      className="p-1 md:p-2 flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #000000',
                        borderRadius: '6px',
                        boxShadow: '1px 1px 0px 0px #000000'
                      }}
                    >
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#9B8CB5' }} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black" style={{ color: '#9B8CB5' }}>热门</span>
                  </div>
                  <h4 className="text-base md:text-lg font-black mb-1 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>CET-4</h4>
                  <p className="text-xs font-semibold mb-2 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>4,500 词</p>
                  <div className="w-full h-1.5 md:h-2 mb-1 rounded-full transition-all duration-300" style={{ backgroundColor: '#ffffff', border: '2px solid #000000' }}>
                    <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#9B8CB5' }}></div>
                  </div>
                  <p className="text-xs font-black" style={{ color: '#9B8CB5' }}>100%</p>
                </div>

                <div
                  className="p-3 md:p-4 transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: '#FFB6D9',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '3px 3px 0px 0px #000000'
                  }}
                >
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div
                      className="p-1 md:p-2 flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #000000',
                        borderRadius: '6px',
                        boxShadow: '1px 1px 0px 0px #000000'
                      }}
                    >
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#E8B4A0' }} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black" style={{ color: '#E8B4A0' }}>推荐</span>
                  </div>
                  <h4 className="text-base md:text-lg font-black mb-1 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>CET-6</h4>
                  <p className="text-xs font-semibold mb-2 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>6,000 词</p>
                  <div className="w-full h-1.5 md:h-2 mb-1 rounded-full transition-all duration-300" style={{ backgroundColor: '#ffffff', border: '2px solid #000000' }}>
                    <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#E8B4A0' }}></div>
                  </div>
                  <p className="text-xs font-black" style={{ color: '#E8B4A0' }}>100%</p>
                </div>

                <div
                  className="p-3 md:p-4 transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: '#BBF7D0',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '3px 3px 0px 0px #000000'
                  }}
                >
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div
                      className="p-1 md:p-2 flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #000000',
                        borderRadius: '6px',
                        boxShadow: '1px 1px 0px 0px #000000'
                      }}
                    >
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black" style={{ color: '#22C55E' }}>新课</span>
                  </div>
                  <h4 className="text-base md:text-lg font-black mb-1 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>IELTS</h4>
                  <p className="text-xs font-semibold mb-2 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>8,000 词</p>
                  <div className="w-full h-1.5 md:h-2 mb-1 rounded-full transition-all duration-300" style={{ backgroundColor: '#ffffff', border: '2px solid #000000' }}>
                    <div className="h-full rounded-full" style={{ width: '44%', backgroundColor: '#22C55E' }}></div>
                  </div>
                  <p className="text-xs font-black" style={{ color: '#22C55E' }}>44%</p>
                </div>

                <div
                  className="p-3 md:p-4 transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: '#ADD8E6',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '3px 3px 0px 0px #000000'
                  }}
                >
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div
                      className="p-1 md:p-2 flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #000000',
                        borderRadius: '6px',
                        boxShadow: '1px 1px 0px 0px #000000'
                      }}
                    >
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black" style={{ color: '#3B82F6' }}>精选</span>
                  </div>
                  <h4 className="text-base md:text-lg font-black mb-1 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>TOEFL</h4>
                  <p className="text-xs font-semibold mb-2 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>8,000 词</p>
                  <div className="w-full h-1.5 md:h-2 mb-1 rounded-full transition-all duration-300" style={{ backgroundColor: '#ffffff', border: '2px solid #000000' }}>
                    <div className="h-full rounded-full" style={{ width: '63%', backgroundColor: '#3B82F6' }}></div>
                  </div>
                  <p className="text-xs font-black" style={{ color: '#3B82F6' }}>63%</p>
                </div>
              </div>
            </div>
          </section>

          <div className="hidden sm:block h-1 my-6 md:my-8 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}></div>

          {/* STUDENT TESTIMONIALS */}
          <section className="mb-12 md:mb-16">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 md:mb-4 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                学员真实反馈
              </h2>
              <p className="text-base md:text-lg font-semibold max-w-2xl mx-auto transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                看看其他学习者怎么说
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div
                className="p-5 md:p-6 transition-all duration-300"
                style={{
                  backgroundColor: '#FEF3C7',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div className="flex items-center gap-1 mb-3 md:mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 md:w-5 md:h-5" style={{ fill: '#FF8C61', color: '#FF8C61' }} strokeWidth={2} />
                  ))}
                </div>
                <p className="text-sm md:text-base font-semibold mb-3 md:mb-4 leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  "AI 智能推荐太准了！总是能找到我不会的单词，再也不浪费时间在已经掌握的词汇上。"
                </p>
                <div className="flex items-center gap-2 md:gap-3">
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '2px solid #000000',
                      borderRadius: '8px',
                      boxShadow: '2px 2px 0px 0px #000000'
                    }}
                  >
                    <span className="text-xl md:text-2xl">👨‍🎓</span>
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>张同学</p>
                    <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>CET-4 学习者</p>
                  </div>
                </div>
              </div>

              <div
                className="p-5 md:p-6 transition-all duration-300"
                style={{
                  backgroundColor: '#FFB6D9',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div className="flex items-center gap-1 mb-3 md:mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 md:w-5 md:h-5" style={{ fill: '#FF8C61', color: '#FF8C61' }} strokeWidth={2} />
                  ))}
                </div>
                <p className="text-sm md:text-base font-semibold mb-3 md:mb-4 leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  "成就系统让我每天都有动力学习！连续学习 30 天，词汇量提升了一倍，太有成就感了！"
                </p>
                <div className="flex items-center gap-2 md:gap-3">
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '2px solid #000000',
                      borderRadius: '8px',
                      boxShadow: '2px 2px 0px 0px #000000'
                    }}
                  >
                    <span className="text-xl md:text-2xl">👩‍💼</span>
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>李女士</p>
                    <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>IELTS 备考中</p>
                  </div>
                </div>
              </div>

              <div
                className="p-5 md:p-6 transition-all duration-300"
                style={{
                  backgroundColor: '#ADD8E6',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <div className="flex items-center gap-1 mb-3 md:mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 md:w-5 md:h-5" style={{ fill: '#FF8C61', color: '#FF8C61' }} strokeWidth={2} />
                  ))}
                </div>
                <p className="text-sm md:text-base font-semibold mb-3 md:mb-4 leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  "界面设计很漂亮，Neo-Brutalism 风格很有趣，用起来很开心。间隔重复算法让记忆效果特别好！"
                </p>
                <div className="flex items-center gap-2 md:gap-3">
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '2px solid #000000',
                      borderRadius: '8px',
                      boxShadow: '2px 2px 0px 0px #000000'
                    }}
                  >
                    <span className="text-xl md:text-2xl">👨‍💻</span>
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>王同学</p>
                    <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>TOEFL 学习者</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="hidden sm:block h-1 my-6 md:my-8 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}></div>

          {/* CLIMAX CTA */}
          <section className="mb-12 md:mb-16">
            <div
              className="p-8 md:p-12 lg:p-16 text-center relative overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: '#FF8C61',
                border: '3px solid #000000',
                borderRadius: '16px',
                boxShadow: '6px 6px 0px 0px #000000'
              }}
            >
              <div
                className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 mb-6 md:mb-8 transition-all duration-300"
                style={{
                  backgroundColor: '#ffffff',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <GraduationCap className="w-8 h-8 md:w-12 md:h-12" style={{ color: '#FF8C61' }} strokeWidth={2.5} />
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 md:mb-6 text-white">
                准备好开始学习了吗？
              </h2>

              <p className="text-lg md:text-xl font-semibold mb-6 md:mb-8 max-w-2xl mx-auto text-white">
                加入 <span className="font-black" style={{ color: '#000000' }}>1,234</span> 位学习者，一起开启英语提升之旅！
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
                <Link
                  href="/register"
                  className="text-base md:text-xl px-8 md:px-12 py-3 md:py-5 flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto font-black text-white transition-all duration-300"
                  style={{
                    backgroundColor: '#B4F416',
                    border: '3px solid #000000',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0px 0px #000000'
                  }}
                >
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                  免费注册
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                </Link>
                <Link
                  href="/login"
                  className="text-base md:text-xl px-8 md:px-12 py-3 md:py-5 flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto font-black transition-all duration-300"
                  style={{
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0px 0px #000000'
                  }}
                >
                  立即登录
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm font-semibold text-black">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                  完全免费
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#9B8CB5' }} strokeWidth={2.5} />
                  无需信用卡
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#E8B4A0' }} strokeWidth={2.5} />
                  随时取消
                </span>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <div
              className="p-4 md:p-6 text-center transition-all duration-300"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '3px 3px 0px 0px #000000'
              }}
            >
              <div className="text-2xl md:text-4xl font-black mb-1 md:mb-2" style={{ color: '#9B8CB5' }}>500+</div>
              <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>📚 精选单词书</p>
            </div>

            <div
              className="p-4 md:p-6 text-center transition-all duration-300"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '3px 3px 0px 0px #000000'
              }}
            >
              <div className="text-2xl md:text-4xl font-black mb-1 md:mb-2" style={{ color: '#E8B4A0' }}>10万+</div>
              <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>📖 词汇总量</p>
            </div>

            <div
              className="p-4 md:p-6 text-center transition-all duration-300"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '3px 3px 0px 0px #000000'
              }}
            >
              <div className="text-2xl md:text-4xl font-black mb-1 md:mb-2" style={{ color: '#22C55E' }}>98%</div>
              <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>😊 用户满意度</p>
            </div>

            <div
              className="p-4 md:p-6 text-center transition-all duration-300"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '3px 3px 0px 0px #000000'
              }}
            >
              <div className="text-2xl md:text-4xl font-black mb-1 md:mb-2" style={{ color: '#3B82F6' }}>∞</div>
              <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>🚀 学习无止境</p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div
            className="px-6 md:px-8 py-4 md:py-6 text-center transition-all duration-300"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '3px solid #000000',
              borderRadius: '12px',
              boxShadow: '3px 3px 0px 0px #000000'
            }}
          >
            <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
              © 2026 MAX笔记 · 智能英语学习平台 · Made with ❤️
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
