import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VideoLearningClient from './pageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VideoLearningPage({ params }: PageProps) {
  const { id } = await params

  // 验证视频是否存在
  const supabase = await createClient()
  const { data: video, error } = await supabase
    .from('videos')
    .select('id, title')
    .eq('id', id)
    .single()

  if (error || !video) {
    notFound()
  }

  return <VideoLearningClient videoId={id} />
}
