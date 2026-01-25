import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Sparkles, Plus, X, Check, AlertCircle } from 'lucide-react'
import { NewBookClient } from '@/components/NewBookClient'
import { Suspense } from 'react'

// 强制动态渲染，因为子组件使用了 useRouter
export const dynamic = 'force-dynamic'

export default async function NewBookPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent('/library/new'))
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header - Neo-Brutalism Style */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4 backdrop-blur-md border-b transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="w-full mx-auto" style={{ maxWidth: '800px' }}>
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/"
              className="transition-all duration-300 p-2 flex items-center justify-center"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '2px solid #000000',
                borderRadius: '8px',
                boxShadow: '2px 2px 0px 0px #000000'
              }}
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--text-primary)' }} strokeWidth={2.5} />
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center p-2 transition-all duration-300"
                style={{
                  backgroundColor: '#3B82F6',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  boxShadow: '2px 2px 0px 0px #000000'
                }}
              >
                <BookOpen className="w-6 h-6 md:w-7 md:h-7" style={{ color: '#ffffff' }} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>新建自定义词库</h1>
                <p className="text-xs md:text-sm font-bold mt-0.5 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>✨ 创建你自己的专属单词书</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <div className="w-full mx-auto" style={{ maxWidth: '800px' }}>
          <Suspense fallback={<div className="text-center py-12 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Loading...</div>}>
            <NewBookClient userId={user.id} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
