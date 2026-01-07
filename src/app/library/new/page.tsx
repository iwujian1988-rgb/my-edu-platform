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
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full mx-auto" style={{ maxWidth: '800px' }}>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900">新建自定义词库</h1>
              <p className="text-sm text-gray-500 mt-1">创建你自己的专属单词书</p>
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
