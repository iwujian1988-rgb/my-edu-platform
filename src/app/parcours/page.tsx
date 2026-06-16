import { parcoursCourses } from '@/data/parcours-mock'
import { ParcoursHeader } from './components/ParcoursHeader'
import { ParcoursHubClient } from './pageClient'

export default function ParcoursHubPage() {
  // Phase 1：只有 1 门首发课程；Phase 2 接 Supabase 时再展开列表
  const featured = parcoursCourses[0]
  if (!featured) {
    return null
  }

  return (
    <>
      <ParcoursHeader />
      <ParcoursHubClient course={featured} />
    </>
  )
}
