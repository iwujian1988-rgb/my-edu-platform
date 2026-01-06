import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, User, Calendar, Trophy, Target, Sparkles, LogOut } from 'lucide-react'
import { logout } from '../login/actions'
import { Metadata } from 'next'

type UserProfile = {
  phone_number?: string
  [key: string]: any
}

export const metadata: Metadata = {
  title: '学习中心 - 小语笔记',
  description: '小语笔记学习中心，选择单词书开始学习',
}

export default async function StudyPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get books count
  const { data: books } = await supabase
    .from('books')
    .select('id')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header - Claymorphism Floating Navbar */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="clay-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 clay-card clay-icon clay-float">
                <BookOpen className="w-6 h-6 text-[#9B8CB5]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-lilac">小语笔记</h1>
                <p className="text-xs text-gray-600 font-semibold">
                  ✨ 欢迎回来，{(profile as UserProfile | null)?.phone_number || user.email}
                </p>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 hover:text-[#9B8CB5] clay-badge transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Card - Claymorphism */}
          <div className="clay-card p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-[#9B8CB5]" />
              <h2 className="text-3xl font-bold text-gradient-lilac">
                开始学习吧！
              </h2>
            </div>
            <p className="text-lg text-gray-700 font-semibold mb-8">
              选择一个单词书开始你的英语学习之旅 📚
            </p>

            {/* Stats - Claymorphism Cards - Pastel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="clay-card-lilac p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="clay-icon p-3">
                    <BookOpen className="w-6 h-6 text-[#9B8CB5]" />
                  </div>
                  <span className="text-base font-bold text-gray-800">可用单词书</span>
                </div>
                <p className="text-4xl font-black text-gradient-lilac">{books?.length || 0}</p>
              </div>

              <div className="clay-card-mint p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="clay-icon p-3">
                    <Target className="w-6 h-6 text-[#7DD87D]" />
                  </div>
                  <span className="text-base font-bold text-gray-800">今日目标</span>
                </div>
                <p className="text-4xl font-black text-gradient-mint">20 词</p>
              </div>

              <div className="clay-card-blue p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="clay-icon p-3">
                    <Trophy className="w-6 h-6 text-[#7AB8D0]" />
                  </div>
                  <span className="text-base font-bold text-gray-800">学习天数</span>
                </div>
                <p className="text-4xl font-black text-gradient-blue">1 天</p>
              </div>
            </div>

            {/* Quick Actions - Claymorphism Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button className="clay-button-primary text-lg py-5 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-4">
                <div className="clay-icon p-4">
                  <BookOpen className="w-7 h-7 text-[#1F2937]" />
                </div>
                <div className="text-left">
                  <p className="font-black text-lg">浏览单词书</p>
                  <p className="text-sm opacity-90 font-semibold">查看所有可用课程</p>
                </div>
              </button>

              <button className="clay-button-secondary text-lg py-5 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-4">
                <div className="clay-icon p-4">
                  <Calendar className="w-7 h-7 text-[#1F2937]" />
                </div>
                <div className="text-left">
                  <p className="font-black text-lg">查看进度</p>
                  <p className="text-sm opacity-90 font-semibold">学习统计数据</p>
                </div>
              </button>
            </div>
          </div>

          {/* Info Cards - Claymorphism - Pastel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="clay-card-peach p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="clay-icon p-2">
                  <User className="w-6 h-6 text-[#E8B4A0]" />
                </div>
                👤 个人信息
              </h3>
              <div className="space-y-3">
                <div className="clay-badge px-4 py-3">
                  <p className="text-sm font-bold text-gray-800">
                    <span className="text-gray-600">手机号:</span> {(profile as UserProfile | null)?.phone_number || '未设置'}
                  </p>
                </div>
                <div className="clay-badge px-4 py-3">
                  <p className="text-sm font-bold text-gray-800">
                    <span className="text-gray-600">注册时间:</span> {new Date((profile as UserProfile | null)?.created_at || '').toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="clay-badge px-4 py-3">
                  <p className="text-sm font-bold text-gray-800">
                    <span className="text-gray-600">上次登录:</span> {new Date((profile as UserProfile | null)?.last_login_at || '').toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="clay-card-mint p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="clay-icon p-2">
                  <Trophy className="w-6 h-6 text-[#7DD87D]" />
                </div>
                🏆 今日配额
              </h3>
              <div className="clay-card p-6 text-center">
                <p className="text-lg font-bold text-gray-800 mb-2">每日智能导入配额</p>
                <p className="text-5xl font-black text-gradient-mint">500 词</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
