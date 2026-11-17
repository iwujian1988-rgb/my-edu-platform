'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { captureException } from '@sentry/nextjs'
import { getVideoListReturnUrl } from '@/lib/video-list-navigation'

export default function VideoDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const searchParams = useSearchParams()
  const returnUrl = getVideoListReturnUrl(searchParams.get('returnTo'))

  useEffect(() => { captureException(error) }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">页面暂时打不开</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">请重试，或返回视频列表继续学习。</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={reset} className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white">再试一次</button>
          <Link href={returnUrl} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">返回视频列表</Link>
        </div>
      </div>
    </div>
  )
}
