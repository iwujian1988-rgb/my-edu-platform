import { DiplomaDetailPageClient } from './pageClient'

export default async function DiplomaDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <DiplomaDetailPageClient slug={slug} />
}
