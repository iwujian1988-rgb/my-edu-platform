import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { authEntryPath } from '@/lib/auth-return-path'
import { getWorkEnglishSession } from '@/lib/work-english/server'
import { lessonStateSchema } from '@/lib/work-english/schema'
import { collectDueReviewWords, sortDueReviewWords, type DueReviewWord } from '@/lib/work-english/review'
import { getCatalogLessons, WORK_ENGLISH_TITLE, WORK_ENGLISH_PATH } from '@/lib/work-english/constants'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import Catalog from './Catalog'
import './work-english.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {title: `${WORK_ENGLISH_TITLE} · MAX笔记`, robots: {index:false, follow:false}}
export default async function WorkEnglishPage() {
  const session = await getWorkEnglishSession()
  if (!session.user) redirect(authEntryPath('login', WORK_ENGLISH_PATH))
  if (!session.hasAccess) {
    return <main className="work-english we-no-access"><p>您未开通权限，请联系管理员！</p><a href="/logout">退出登录</a></main>
  }
  const catalogLessons = getCatalogLessons(session.hasAccess)
  const summaries: Record<string, {complete:boolean; started:boolean; words:number; lastSection:string}> = {}
  let dueReviewWords: DueReviewWord[] = []
  if (session.user && session.hasAccess) {
    const {data, error} = await session.progress.from('work_english_progress').select('*').eq('user_id', session.user.id)
    if (error) throw new Error('无法读取学习进度，请重试')
    for (const row of data ?? []) {
      if (!catalogLessons.some(lesson => lesson.id === row.lesson_id && lesson.version === row.lesson_version)) continue
      const parsed = lessonStateSchema.safeParse(row.state)
      if (!parsed.success) continue
      const state = parsed.data
      const lessonMeta = catalogLessons.find(lesson => lesson.id === row.lesson_id)!
      summaries[row.lesson_id] = {complete:!!state.complete, started:true,
        words:Object.values(state.words).filter(Boolean).length, lastSection:state.lastSection ?? 'reading'}
      const lessonDir = path.join(process.cwd(), 'src', 'content', 'work-english', row.lesson_id)
      try {
        let content: {words?: {id:string;word:string;meaning?:string;zh?:string;example:string;translation?:string}[]}
        try { content = JSON.parse(await readFile(path.join(lessonDir, 'lesson.json'), 'utf8')) }
        catch { content = JSON.parse(await readFile(path.join(lessonDir, 'data.json'), 'utf8')) }
        const words = (content.words ?? []).map(word => ({...word, meaning:word.meaning ?? word.zh ?? ''}))
        dueReviewWords.push(...collectDueReviewWords(state, lessonMeta, words))
      } catch {
        // Ignore malformed or missing lesson content; progress itself remains available.
      }
    }
  }
  return <Catalog signedIn={!!session.user} hasAccess={session.hasAccess} summaries={summaries} dueReviewWords={sortDueReviewWords(dueReviewWords)} catalogLessons={catalogLessons}/>
}
