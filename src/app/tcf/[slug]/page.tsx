import { TcfTestPageClient } from './pageClient'

export default async function TcfTestRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <TcfTestPageClient slug={slug} />
}
