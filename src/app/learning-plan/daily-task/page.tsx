import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import DailyTaskClient from './pageClient'

interface PageProps {
  searchParams: Promise<{
    bookId?: string
  }>
}

export default async function DailyTaskPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin?redirect=/learning-plan/daily-task')
  }

  const params = await searchParams
  const { bookId } = params

  if (!bookId) {
    redirect('/')
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DailyTaskClient bookId={bookId} />
    </Suspense>
  )
}
