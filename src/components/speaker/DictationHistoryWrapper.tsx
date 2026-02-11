'use client'

import { useSearchParams } from 'next/navigation'
import { DictationHistoryPage } from '@/components/speaker/DictationHistoryPage'

interface DictationHistoryWrapperProps {
  userId: string
}

export function DictationHistoryWrapper({ userId }: DictationHistoryWrapperProps) {
  const searchParams = useSearchParams()
  const articleId = searchParams.get('id') || ''

  return <DictationHistoryPage userId={userId} articleId={articleId} />
}
