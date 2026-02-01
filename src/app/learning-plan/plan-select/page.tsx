import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlanSelectClient from './pageClient'

interface PageProps {
  searchParams: Promise<{
    bookId?: string
  }>
}

export default async function PlanSelectPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin?redirect=/learning-plan/plan-select')
  }

  const params = await searchParams
  const { bookId } = params

  if (!bookId) {
    redirect('/')
  }

  return <PlanSelectClient bookId={bookId} />
}
