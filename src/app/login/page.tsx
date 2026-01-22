import { Suspense } from 'react'
import LoginFormClient from './LoginFormClient'

// 强制动态渲染，因为使用了 useSearchParams
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>加载中...</div>}>
      <LoginFormClient />
    </Suspense>
  )
}
