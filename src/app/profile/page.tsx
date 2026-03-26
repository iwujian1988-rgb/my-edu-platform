import { Suspense } from 'react'
import { ProfileClient } from './pageClient'

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <ProfileClient />
    </Suspense>
  )
}
