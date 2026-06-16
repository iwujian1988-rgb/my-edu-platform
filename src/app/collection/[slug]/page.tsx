import { CollectionPageClient } from './pageClient'

export default async function CollectionRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <CollectionPageClient slug={slug} />
}
