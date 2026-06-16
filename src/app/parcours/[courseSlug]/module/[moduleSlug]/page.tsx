import { notFound } from 'next/navigation'
import { getCourse, getCourseModule } from '@/data/parcours-mock'
import { ParcoursHeader } from '../../../components/ParcoursHeader'
import { CourseModuleClient } from './pageClient'

export default async function CourseModulePage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>
}) {
  const { courseSlug, moduleSlug } = await params
  const course = getCourse(courseSlug)
  // 命名为 courseModule 而非 module，避免 Next.js 保留字冲突
  const courseModule = getCourseModule(courseSlug, moduleSlug)

  if (!course || !courseModule) {
    notFound()
  }

  return (
    <>
      <ParcoursHeader />
      <CourseModuleClient course={course} module={courseModule} />
    </>
  )
}
