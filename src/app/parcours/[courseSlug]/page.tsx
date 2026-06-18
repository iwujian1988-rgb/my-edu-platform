import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { hasFrenchVideoAccess } from '@/lib/maxclass-access'
import { getParcoursCourse } from '@/lib/parcours/server'
import { CourseLandingPageClient } from './pageClient'

export default async function CourseLandingRoute({
  params,
}: {
  params: Promise<{ courseSlug: string }>
}) {
  const { courseSlug } = await params
  const requestedPath = `/parcours/${courseSlug}`
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent(requestedPath))
  }

  if (!(await hasFrenchVideoAccess(user.id))) {
    redirect('/videos?language=fr')
  }

  const course = await getParcoursCourse(courseSlug)
  if (!course) {
    notFound()
  }
  return (
    <div data-maxclass-skin="true">
      <CourseLandingPageClient course={course} />
    </div>
  )
}
