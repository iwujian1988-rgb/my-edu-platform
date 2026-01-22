import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>
      <div className="text-center px-6">
        <div className="mb-8">
          <h1 className="text-9xl font-black text-gray-300">404</h1>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-black text-gray-800 mb-3">页面未找到</h2>
          <p className="text-lg text-gray-600 font-medium">
            抱歉，您访问的页面不存在
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
