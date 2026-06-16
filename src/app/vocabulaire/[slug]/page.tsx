import { VocabDetailPageClient } from './pageClient'

export default async function VocabDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <VocabDetailPageClient slug={slug} />
}
