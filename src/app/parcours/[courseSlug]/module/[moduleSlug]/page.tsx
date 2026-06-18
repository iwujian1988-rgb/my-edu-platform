import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { hasFrenchVideoAccess } from '@/lib/maxclass-access'
import { getParcoursCourse, getParcoursCourseModule } from '@/lib/parcours/server'
import { ParcoursHeader } from '../../../components/ParcoursHeader'
import { CourseModuleClient } from './pageClient'

export default async function CourseModulePage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>
}) {
  const { courseSlug, moduleSlug } = await params
  const requestedPath = `/parcours/${courseSlug}/module/${moduleSlug}`
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent(requestedPath))
  }

  if (!(await hasFrenchVideoAccess(user.id))) {
    redirect('/videos?language=fr')
  }

  const course = await getParcoursCourse(courseSlug)
  // 命名为 courseModule 而非 module，避免 Next.js 保留字冲突
  const courseModule = await getParcoursCourseModule(courseSlug, moduleSlug)

  if (!course || !courseModule) {
    notFound()
  }

  return (
    <div data-maxclass-skin="true">
      <ParcoursHeader />
      <CourseModuleClient course={course} module={courseModule} />
    </div>
  )
}
