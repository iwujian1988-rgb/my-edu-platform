import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type ProgressRow = { video_id: string; user_id: string; max_progress: number; is_completed: boolean; updated_at: string }
type VideoRow = { id: string; title: string }
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }
type LearningDatabase = { public: { Tables: { user_video_progress: Table<ProgressRow>; videos: Table<VideoRow> }; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } }

const PAGE_SIZE = 24
export const dynamic = 'force-dynamic'
export default async function LearningRecordsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=%2Fprofile%2Flearning-records')
  const requestedPage = Number((await searchParams).page || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  // 项目全局数据库类型尚未包含视频表，局部声明已使用的真实表字段。
  const supabase = await createClient() as unknown as SupabaseClient<LearningDatabase>
  const { data: records, count, error } = await supabase.from('user_video_progress').select('video_id,max_progress,is_completed,updated_at', { count: 'exact' }).eq('user_id', user.id).order('updated_at', { ascending: false }).range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1)
  const ids = records?.map(record => record.video_id) || []
  const { data: videos, error: videoError } = ids.length ? await supabase.from('videos').select('id,title').in('id', ids) : { data: [], error: null }
  const visibleVideos = new Map<string, string>(videos?.map(video => [video.id, video.title] as const) || [])
  return <main className="mx-auto max-w-4xl px-5 py-10">
    <Link href="/profile" className="text-sm font-semibold text-indigo-600">← 返回我的</Link>
    <h1 className="mt-6 text-3xl font-bold">学习记录</h1><p className="mb-8 mt-3 text-gray-500">回顾最近学过的内容，接着上次的位置继续学习。</p>
    {error || videoError ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">记录暂时加载失败，请刷新后重试。</p> : !records?.length ? <div className="rounded-xl border border-dashed p-8 text-center"><p>还没有学习记录，先从一条视频开始。</p><Link href="/videos" className="mt-4 inline-block font-semibold text-indigo-600">去选视频 →</Link></div> : <div className="space-y-3">{records.map(record => <Link key={record.video_id} href={visibleVideos.has(record.video_id) ? `/videos/${record.video_id}` : '/videos'} className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700"><div><h2 className="font-semibold">{visibleVideos.get(record.video_id) || '该内容暂不可访问'}</h2><p className="mt-2 text-sm text-gray-500">{new Date(record.updated_at).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p></div><span className="shrink-0 text-sm font-semibold text-indigo-600">{record.is_completed ? '已完成' : `已观看 ${Math.round(record.max_progress || 0)}%`}</span></Link>)}</div>}
    <nav aria-label="学习记录分页" className="mt-7 flex justify-between">{page>1?<Link href={`/profile/learning-records?page=${page-1}`}>上一页</Link>:<span/>}{page*PAGE_SIZE<(count||0)&&<Link href={`/profile/learning-records?page=${page+1}`}>下一页</Link>}</nav>
    <Link href="/videos" className="mt-8 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">返回视频首页</Link>
  </main>
}
