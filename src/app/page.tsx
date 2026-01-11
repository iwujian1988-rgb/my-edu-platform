import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Target, Calendar, Plus, GraduationCap, Zap, LayoutGrid, Cat, LogOut, ChevronRight, Sparkles, ArrowRight, Trophy, TrendingUp, Star, Clock } from 'lucide-react'
import { PermissionWarningBanner } from '@/components/PermissionDisplay'
import { getUserPermissions } from '@/lib/permissions'
import { DashboardContent } from '@/components/DashboardContent'
import { AppSidebar } from '@/components/AppSidebar'

export default async function Home() {
  // 获取用户信息
  const user = await getCurrentUser()

  // 如果用户已登录，获取数据并显示工作台
  if (user) {
    const supabase = await createClient()

    // 获取用户权限
    const userPermissions = await getUserPermissions()
    const hasAllBooks = (userPermissions?.bookPermissions.includes('*') || userPermissions?.bookPermissions.includes('全部')) || false
    const userBookIds = userPermissions?.bookPermissions || []

    // 获取词书数据（只从数据库获取）
    let books: any[] = []

    try {
      const { data: booksData } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })

      if (booksData && booksData.length > 0) {
        // 映射数据库字段到组件需要的格式，并根据权限过滤
        books = booksData
          .filter((book: any) => {
            // 如果用户有全部权限，或者有该书的权限，则显示
            return hasAllBooks || userBookIds.includes(book.id)
          })
          .map((book: any) => ({
            id: book.id,
            name: book.title,
            description: book.description || '',
            word_count: book.total_words || 0,
            cover_color: book.cover_color || 'from-green-400 to-green-500',
            cover_url: book.cover_url || null,
            progress: 0,
            status: 'not_started'
          }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }

    // 获取用户学习数据
    let lastStudyBook = null as { id: string; title: string; progress: number; continueURL: string } | null
    let mistakesCount = 0
    let todayNewWordsCount = 0

    try {
      // 获取用户最近访问的词库（优先使用 last_accessed_at）
      const { data: recentPrefs, error: prefsError } = await supabase
        .from('user_book_preferences')
        .select('book_id, last_accessed_at')
        .eq('user_id', user.id)
        .not('last_accessed_at', 'is', null)
        .order('last_accessed_at', { ascending: false })
        .limit(1)

      let lastBookId = null

      // 优先使用最近访问记录
      if (recentPrefs && recentPrefs.length > 0) {
        lastBookId = (recentPrefs as any)[0].book_id
      } else {
        // 如果没有访问记录，回退到查找有学习进度的词库
        const { data: progressData } = await supabase
          .from('word_progress')
          .select('book_id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (progressData && progressData.length > 0) {
          lastBookId = (progressData as any)[0].book_id
        }
      }

      if (lastBookId) {

        // 获取该书信息和用户的学习状态
        const { data: bookData } = await supabase
          .from('books')
          .select('id, title, total_words')
          .eq('id', lastBookId)
          .single()

        if (bookData) {
          // 计算该书的学习进度
          const { data: bookProgress } = await supabase
            .from('word_progress')
            .select('status')
            .eq('user_id', user.id)
            .eq('book_id', lastBookId)

          if (bookProgress) {
            // 只统计"认识"的单词作为学习进度
            // known: 认识（计入进度）
            // fuzzy: 模糊（部分掌握，也可计入）
            // unknown: 不认识（不应计入进度）
            // new: 未标注（不应计入进度）
            const learnedCount = bookProgress.filter((p: any) =>
              p.status === 'known' || p.status === 'fuzzy'
            ).length
            const progress = (bookData as any).total_words > 0
              ? Math.round((learnedCount / (bookData as any).total_words) * 100)
              : 0

            // ⭐ 获取用户最后的学习状态
            const { data: userPrefs } = await supabase
              .from('user_book_preferences')
              .select('last_resume_state')
              .eq('user_id', user.id)
              .eq('book_id', lastBookId)
              .maybeSingle()

            const resumeState = (userPrefs as any)?.last_resume_state
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
              // 卡片模式：带索引
              const index = resumeState.context?.index || 0
              continueURL = `/study/${lastBookId}/flashcards?index=${index}`
            } else if (resumeState?.mode === 'dictation') {
              // 听写模式：带索引
              const index = resumeState.context?.index || 0
              continueURL = `/study/${lastBookId}/dictation?index=${index}`
            }

            console.log('📍 Resume state:', { mode: resumeState?.mode, continueURL })

            lastStudyBook = {
              id: (bookData as any).id,
              title: (bookData as any).title,
              progress,
              continueURL
            }
          }
        }
      }

      // 获取错题数量（状态为 unknown 或 fuzzy 的单词）
      const { data: mistakesData } = await supabase
        .from('word_progress')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['unknown', 'fuzzy'])

      mistakesCount = mistakesData?.length || 0

      // 获取今日新增生词数量（今天有学习活动的单词）
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: todayWords } = await supabase
        .from('word_progress')
        .select('id')
        .eq('user_id', user.id)
        .gte('updated_at', today.toISOString())  // 使用 updated_at 而不是 created_at
        .eq('status', 'new')  // 只统计今天新遇到的单词

      todayNewWordsCount = todayWords?.length || 0
    } catch (error) {
      console.error('Error fetching user learning data:', error)
    }

    // 显示工作台内容 - Premium Neo-Brutalism Design
    return (
      <>
        <AppSidebar />
        <DashboardContent
          books={books}
          lastStudyBook={lastStudyBook}
          mistakesCount={mistakesCount}
          todayNewWordsCount={todayNewWordsCount}
          userEmail={user.email}
        />
      </>
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
                <h1 className="text-2xl font-bold text-gradient-purple">喵喵笔记</h1>
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
                喵喵笔记，重新定义单词学习
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
              🎓 喵喵笔记 © 2026 · 让英语学习更简单、更有趣
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
