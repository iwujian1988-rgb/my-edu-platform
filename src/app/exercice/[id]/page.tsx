import { ExercisePageClient } from './pageClient'

export default async function ExerciseRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ExercisePageClient id={id} />
}
