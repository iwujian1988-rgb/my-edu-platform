import { TopicPageClient } from './pageClient'

export default async function TopicRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <TopicPageClient slug={slug} />
}
