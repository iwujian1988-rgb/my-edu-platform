import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Sparkles, Plus, X, Check, AlertCircle } from 'lucide-react'
import { NewBookClient } from '@/components/NewBookClient'

export default async function NewBookPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent('/library/new'))
  }

  return (
    <div className="min-h-screen bg-neo-bg">
      {/* Header - Neo-Brutalism Style */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="w-full mx-auto" style={{ maxWidth: '800px' }}>
          <div className="bg-white border-3 border-neo-black shadow-neo-md px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-4">
            <Link href="/" className="bg-neo-bg border-2 border-neo-black p-2 hover:scale-110 transition-transform shadow-neo-sm">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-neo-blue border-2 border-neo-black p-2 shadow-neo-sm">
                <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-neo-black">新建自定义词库</h1>
                <p className="text-xs md:text-sm text-gray-600 font-bold mt-0.5">✨ 创建你自己的专属单词书</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <div className="w-full mx-auto" style={{ maxWidth: '800px' }}>
          <NewBookClient userId={user.id} />
        </div>
      </main>
    </div>
  )
}
