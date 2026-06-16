import { notFound } from 'next/navigation'
import { getCourse } from '@/data/parcours-mock'
import { CourseLandingPageClient } from './pageClient'

export default async function CourseLandingRoute({
  params,
}: {
  params: Promise<{ courseSlug: string }>
}) {
  const { courseSlug } = await params
  const course = getCourse(courseSlug)
  if (!course) {
    notFound()
  }
  return <CourseLandingPageClient course={course} />
}
