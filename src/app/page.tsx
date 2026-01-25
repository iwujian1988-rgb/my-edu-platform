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
    let recentStudyBooks: Array<{ id: string; title: string; progress: number; continueURL: string; mode: string }> = []
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
        const flattenedCards: any[] = []

        for (const book of recentBooks) {
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
        }

        // 4. 按 lastStudyTime 降序排序，取前3个
        progressCards = flattenedCards
          .sort((a, b) => b.lastStudyTime - a.lastStudyTime)
          .slice(0, 3)
          .map(card => ({
            ...card,
            _uniqueKey: `${card.bookId}-${card.mode}` // 添加唯一标识符
          }))
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

          // ⭐ Phase 3: 多模式进度展示 - 从 summary 读取多个学习活动
          const resumeSummary = userPref?.last_resume_summary
          const resumeState = userPref?.last_resume_state
          let activities: Array<{
            mode: string
            updatedAt: number
            scopeType: string
            currentIndex: number
            totalWords: number
            filters?: {  // ⭐ 添加筛选参数（用于单词列表）
              page?: number
              status?: string
              theme?: string
              scenario?: string
              chapter?: string
            }
          }> = []

          // 1. 优先从 summary 解析 (Map -> Array) - 练习模式
          if (resumeSummary && typeof resumeSummary === 'object' && Object.keys(resumeSummary).length > 0) {
            activities = Object.entries(resumeSummary)
              .map(([mode, info]: [string, any]) => ({
                mode,
                updatedAt: info.updatedAt || 0,
                scopeType: info.scopeType || 'all',
                currentIndex: info.currentIndex || 0,
                totalWords: info.totalWords || 0
              }))
              .sort((a, b) => b.updatedAt - a.updatedAt) // 按时间倒序
              .slice(0, 3) // 只取前3个

            console.log('📚 [Homepage] Using resume_summary, activities:', activities.length)
          }

          // 2. ⭐ 检查单词列表进度（独立字段 last_reading_progress）
          const readingProgress = userPref?.last_reading_progress
          const lastAccessedAt = userPref?.last_accessed_at
          if (readingProgress) {
            const hasProgress = (readingProgress.page && readingProgress.page > 1) ||
                               (readingProgress.status && readingProgress.status !== 'all') ||
                               (readingProgress.theme && readingProgress.theme !== 'all') ||
                               (readingProgress.scenario && readingProgress.scenario !== 'all') ||
                               (readingProgress.chapter && readingProgress.chapter !== 'all')

            // 只有当有实际进度时才添加（避免纯 page=1 且无筛选的情况）
            if (hasProgress) {
              // 检查是否已经有 word-list 在 activities 中
              const hasWordList = activities.some(a => a.mode === 'word-list')

              if (!hasWordList) {
                // 使用 last_accessed_at 作为 updatedAt（转换为毫秒时间戳）
                const accessedTime = lastAccessedAt ? new Date(lastAccessedAt).getTime() : Date.now()

                activities.push({
                  mode: 'word-list',
                  updatedAt: accessedTime,
                  scopeType: 'all',
                  currentIndex: (readingProgress.page || 1) * 20, // 粗略估算：每页20个单词
                  totalWords: 0, // 不需要显示
                  filters: {  // ⭐ 保存筛选参数，用于生成 continueURL
                    page: readingProgress.page,
                    status: readingProgress.status,
                    theme: readingProgress.theme,
                    scenario: readingProgress.scenario,
                    chapter: readingProgress.chapter
                  }
                })
                console.log('📚 [Homepage] Added word-list from last_reading_progress, page:', readingProgress.page, 'accessedAt:', accessedTime)
              }
            }
          }

          // 重新排序：按 updatedAt 倒序（最新的在前）
          if (activities.length > 0) {
            activities.sort((a, b) => b.updatedAt - a.updatedAt)
            console.log('📚 [Homepage] After sorting, activities:', activities.map(a => `${a.mode}:${a.updatedAt}`))
          }

          // 3. 降级策略 (Fallback)：如果 summary 为空，使用旧 state
          if (activities.length === 0 && resumeState) {
            const mode = resumeState.mode || 'word-list'
            const context = resumeState.context || {}
            activities = [{
              mode,
              updatedAt: resumeState.updatedAt || Date.now(),
              scopeType: context?.scopeType || context?.scope || 'all',
              currentIndex: context?.currentIndex ?? context?.index ?? 0,
              totalWords: context?.totalWords || 0
            }]

            console.log('📚 [Homepage] Fallback to resume_state, mode:', mode)
          }

          // 3. 为每个 activity 生成 continueURL
          recentStudyBooks = activities.map(activity => {
            const { mode, scopeType, currentIndex, filters } = activity
            let continueURL = `/library/${lastBookId}` // 默认跳转到词书详情页

            if (mode === 'word-list') {
              // ⭐ 单词列表：带完整的筛选参数
              const params = new URLSearchParams()
              if (filters?.page && filters.page > 1) params.set('page', filters.page.toString())
              if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
              if (filters?.theme && filters.theme !== 'all') params.set('theme', filters.theme)
              if (filters?.scenario && filters.scenario !== 'all') params.set('scenario', filters.scenario)
              if (filters?.chapter && filters.chapter !== 'all') params.set('chapter', filters.chapter)

              const queryString = params.toString()
              continueURL = `/library/${lastBookId}${queryString ? '?' + queryString : ''}`
            } else if (mode === 'flashcards') {
              // 卡片模式：带范围和索引
              const hash = `#word-${currentIndex}`
              continueURL = `/study/${lastBookId}/flashcards?scope=${scopeType}${hash}`
            } else if (mode === 'dictation') {
              // 听写模式：使用 hash 传递 index
              const hash = `#word-${currentIndex}`
              continueURL = `/study/${lastBookId}/dictation?scope=${scopeType}&resume=true${hash}`
            } else if (mode === 'match-game') {
              continueURL = `/practice?bookId=${lastBookId}&mode=match`
            }

            return {
              id: book.id,
              title: book.title,
              progress,
              continueURL,
              mode
            }
          })

          // 保持向后兼容：第一个 activity 作为 lastStudyBook
          if (recentStudyBooks.length > 0) {
            lastStudyBook = recentStudyBooks[0]
          }

          console.log('📚 [Homepage] Generated recentStudyBooks:', recentStudyBooks.length)

          // ⭐ Phase 3: 将 recentStudyBooks 转换为 progressCards 格式
          // 如果有 summary 数据，优先使用；否则保持原有 progressCards
          if (recentStudyBooks.length > 0) {
            // 转换为 progressCards 格式
            const multiModeProgressCards: ProgressCardProps[] = recentStudyBooks.map((studyBook, index) => {
              const book = books.find((b: any) => b.id === studyBook.id)
              return {
                bookId: studyBook.id,
                bookTitle: studyBook.title,
                mode: studyBook.mode as any,
                progress: studyBook.progress,
                scopeType: 'all', // summary 中有这个信息，但这里简化处理
                currentIndex: 0,    // 会从 continueURL 中解析
                totalWords: book?.total_words || 0,
                learnedCount: Math.round((studyBook.progress / 100) * (book?.total_words || 0)),
                lastStudyTime: Date.now(),
                continueURL: studyBook.continueURL,
                // ⭐ 添加唯一标识符：bookId + mode
                _uniqueKey: `${studyBook.id}-${studyBook.mode}`
              }
            })

            // 覆盖原有的 progressCards（只取前3个）
            progressCards = multiModeProgressCards.slice(0, 3)
            console.log('📚 [Homepage] Converted to progressCards:', progressCards.length)
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
        recentStudyBooks={recentStudyBooks}
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
