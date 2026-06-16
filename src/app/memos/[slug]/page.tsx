import { MemoDetailPageClient } from './pageClient'

export default async function MemoDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <MemoDetailPageClient slug={slug} />
}
