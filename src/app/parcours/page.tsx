import { getCurrentUser } from '@/lib/supabase/server'
import { hasFrenchVideoAccess } from '@/lib/maxclass-access'
import { getParcoursCourses } from '@/lib/parcours/server'
import { redirect } from 'next/navigation'
import { ParcoursHeader } from './components/ParcoursHeader'
import { ParcoursHubClient } from './pageClient'

export default async function ParcoursHubPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent('/parcours'))
  }

  if (!(await hasFrenchVideoAccess(user.id))) {
    redirect('/videos?language=fr')
  }

  const courses = await getParcoursCourses()
  if (courses.length === 0) {
    return null
  }

  return (
    <div data-maxclass-skin="true">
      <ParcoursHeader />
      <ParcoursHubClient courses={courses} />
    </div>
  )
}
