import { LevelPageClient } from './pageClient'

export default async function LevelRoute({
  params,
}: {
  params: Promise<{ level: string }>
}) {
  const { level } = await params
  return <LevelPageClient level={level} />
}
