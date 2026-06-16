import { SeriesPageClient } from './pageClient'

export default async function SeriesRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <SeriesPageClient slug={slug} />
}
