import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LearningFlowClient from './pageClient'

interface PageProps {
  searchParams: Promise<{
    bookId?: string
    mode?: string
  }>
}

export default async function LearningFlowPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin?redirect=/learning-plan/learning-flow')
  }

  const params = await searchParams
  const { bookId, mode } = params

  if (!bookId) {
    redirect('/')
  }

  return <LearningFlowClient bookId={bookId} initialMode={mode || 'flashcard'} />
}
