'use client'

import {useMemo, useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {ArrowLeft, ArrowRight, ArrowUpRight, LogOut, Search} from 'lucide-react'
import {WORK_ENGLISH_PATH, WORK_ENGLISH_TITLE} from '@/lib/work-english/constants'
import {authEntryPath} from '@/lib/auth-return-path'
import type {DueReviewWord} from '@/lib/work-english/review'
import {SCENE_GROUPS} from './catalog-scenes'
import {CompanyLogo} from './CompanyLogo'

interface Props {
  signedIn:boolean; hasAccess:boolean;
  catalogLessons: {id:string;version:number;company:string;companyZh:string;title:string;description:string;topic:string;sourceType:string;minutes:number;words:number;level:string;status?:string;illustrationFile?:string}[]
  summaries:Record<string,{complete:boolean; started:boolean; words:number; lastSection:string}>
  dueReviewWords:DueReviewWord[]
}

const PAGE_SIZE = 12

export default function Catalog({signedIn,hasAccess,summaries,dueReviewWords,catalogLessons}:Props) {
  const [page,setPage] = useState(1)
  const [scene,setScene] = useState('all')
  const [query,setQuery] = useState('')
  const lessons = useMemo(()=>[...catalogLessons].sort((a,b) => Number(a.id) - Number(b.id)),[catalogLessons])
  const latest = lessons.at(-1)
  const filteredLessons = useMemo(()=>lessons.filter(lesson=>{
    const inScene = scene === 'all' || (SCENE_GROUPS.find(group=>group.id===scene)?.lessonIds as readonly string[]|undefined)?.includes(lesson.id)
    const needle = query.trim().toLocaleLowerCase()
    const matches = !needle || `${lesson.company} ${lesson.companyZh} ${lesson.title} ${lesson.topic}`.toLocaleLowerCase().includes(needle)
    return inScene && matches
  }),[lessons,query,scene])
  const pageCount = Math.max(1,Math.ceil(filteredLessons.length / PAGE_SIZE))
  const currentPage = Math.min(page,pageCount)
  const pageLessons = filteredLessons.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)
  const completed = Object.values(summaries).filter(row => row.complete).length

  function changeScene(next:string) {setScene(next);setPage(1)}
  function changeQuery(next:string) {setQuery(next);setPage(1)}
  const lessonHref = (id:string) => hasAccess
    ? `${WORK_ENGLISH_PATH}/lessons/${id}#${summaries[id]?.lastSection ?? 'reading'}`
    : '#package-access'

  return <div className="work-english">
    <header className="we-top">
      <Link href={WORK_ENGLISH_PATH} className="we-brand"><span>W</span><span>名企职场英语</span><i>WORKPLACE ENGLISH</i></Link>
      <div className="we-account">{signedIn ? <><span>学习空间</span><Link href="/logout" prefetch={false}><LogOut size={14}/>退出登录</Link></> : <Link href={authEntryPath('login',WORK_ENGLISH_PATH)}>登录 / 继续学习 <ArrowUpRight size={15}/></Link>}</div>
    </header>
    <main className="we-main">
      <section className="we-masthead">
        <div className="we-masthead-copy">
          <div className="we-masthead-brands" aria-label="Google、Microsoft、GitLab、Basecamp"><span>Google</span><span>Microsoft</span><span>GitLab</span><span>Basecamp</span></div>
          <p className="we-masthead-kicker">把真实工作里的英语，学成自己的表达</p>
          <h1 aria-label={WORK_ENGLISH_TITLE}><span>跟着谷歌、微软</span><span>学职场英语</span></h1>
          <p className="we-masthead-desc">从邮件、会议到反馈和协作，每天读一篇真实职场材料，学会在工作里说清楚、写明白。</p>
          <div className="we-masthead-stats"><span><b>{catalogLessons.length}</b> 篇学习内容</span><span><b>{completed}</b> 篇已完成</span><span>每天更新</span></div>
        </div>
        {latest && <Link href={lessonHref(latest.id)} className="we-hero" aria-label={`学习最新一期：${latest.title}`}>
          <div className="we-hero-art" aria-hidden="true">{hasAccess && <Image src={`${WORK_ENGLISH_PATH}/lessons/${latest.id}/media/${latest.illustrationFile ?? 'illustration.png'}`} alt="" fill sizes="(max-width: 760px) 100vw, 48vw" unoptimized priority/>}</div>
          <div className="we-hero-copy"><span className="we-hero-label">最新更新 <i>第 {latest.id} 期</i></span><span className="we-hero-company"><CompanyLogo company={latest.company}/>{latest.topic && latest.topic !== latest.title ? `　·　${latest.topic}` : ''}</span><strong>{latest.title}</strong><span className="we-hero-action">{summaries[latest.id]?.started?'继续学习':'开始今天的学习'} <ArrowUpRight size={18}/></span></div>
          <span className="we-hero-mark" aria-hidden="true">↗</span>
        </Link>}
      </section>

      <section className="we-catalog" aria-label="学习内容">
        <div className="we-catalog-heading"><div><h2>按场景学习</h2><p>选一篇你正需要的内容，开始练习。</p></div><span className="we-catalog-count">共 {filteredLessons.length} 篇</span></div>
        <div className="we-catalog-filters" aria-label="筛选学习内容">
          <div className="we-scene-filters" role="group" aria-label="工作场景">
            <button className={scene==='all'?'selected':''} aria-pressed={scene==='all'} onClick={()=>changeScene('all')}>全部 <small>{lessons.length}</small></button>
            {SCENE_GROUPS.map(group=><button key={group.id} className={scene===group.id?'selected':''} aria-pressed={scene===group.id} onClick={()=>changeScene(group.id)}>{group.name}<small>{lessons.filter(lesson=>(group.lessonIds as readonly string[]).includes(lesson.id)).length}</small></button>)}
          </div>
          <label className="we-catalog-search"><Search size={17}/><input value={query} onChange={event=>changeQuery(event.target.value)} placeholder="搜索公司、主题或文章" aria-label="搜索公司、主题或文章"/>{query&&<button type="button" aria-label="清空搜索" onClick={()=>changeQuery('')}>清空</button>}</label>
        </div>
        <div className="we-catalog-results"><strong>{scene==='all'?'全部内容':SCENE_GROUPS.find(group=>group.id===scene)?.name}</strong><span>{filteredLessons.length} 篇</span></div>
        <div className="we-lesson-grid">{pageLessons.map((lesson,index)=>{
          const done = summaries[lesson.id]?.complete
          const started = summaries[lesson.id]?.started
          const group = SCENE_GROUPS.find(item=>(item.lessonIds as readonly string[]).includes(lesson.id))
          return <Link href={lessonHref(lesson.id)} className="we-lesson-card" key={lesson.id}>
            <div className="we-lesson-card-art">
              {hasAccess && <Image src={`${WORK_ENGLISH_PATH}/lessons/${lesson.id}/media/${lesson.illustrationFile ?? 'illustration.png'}`} alt="" fill sizes="(max-width: 650px) 50vw, (max-width: 1100px) 33vw, 25vw" unoptimized loading={index < 4 ? 'eager' : 'lazy'}/>}
              <span className="we-lesson-company"><CompanyLogo company={lesson.company}/></span>
              <span className="we-lesson-issue">第 {lesson.id} 期</span>
            </div>
            <div className="we-lesson-card-copy">
              <span className="we-lesson-topic">{group?.name ?? '职场英语'}<i>{lesson.level}</i><i>{lesson.minutes} 分钟</i></span>
              <strong>{lesson.title}</strong>
              <span className="we-lesson-card-footer"><span>{done?'已完成':started?'继续学习':'开始学习'}</span><ArrowUpRight size={17}/></span>
            </div>
          </Link>
        })}</div>
        {filteredLessons.length===0 && <div className="we-list-empty">没有找到相关内容，试试其他关键词或场景。</div>}
        {pageCount>1 && <nav className="we-pagination" aria-label="学习内容分页">
          <button onClick={()=>setPage(n=>Math.max(1,n-1))} disabled={currentPage===1}><ArrowLeft size={16}/>上一页</button>
          <span>第 <b>{currentPage}</b> 页 <i>/</i> 共 {pageCount} 页</span>
          <button onClick={()=>setPage(n=>Math.min(pageCount,n+1))} disabled={currentPage===pageCount}>下一页<ArrowRight size={16}/></button>
        </nav>}
      </section>

      {hasAccess && dueReviewWords.length > 0 && <section className="we-due-review" aria-label="今日词汇复习"><div className="we-due-review-heading"><div><h2>今天复习 <span>{dueReviewWords.length}</span> 个词</h2><p>先看中文回想英文，再点开核对。</p></div></div><div className="we-due-review-list">{dueReviewWords.slice(0,6).map((item,index)=><article className="we-due-review-card" key={`${item.lessonId}-${item.id}`}><span className="we-due-review-index">{String(index+1).padStart(2,'0')}</span><div className="we-due-review-main"><span>{item.companyZh} · 第 {item.lessonId} 期</span><p>{item.meaning}</p><details><summary>显示英文答案</summary><strong>{item.word}</strong><small>{item.example}{item.translation ? ` · ${item.translation}` : ''}</small></details></div><Link href={`${WORK_ENGLISH_PATH}/lessons/${item.lessonId}#review`} aria-label={`进入第 ${item.lessonId} 期复习`}>进入本期 <ArrowUpRight size={14}/></Link></article>)}</div>{dueReviewWords.length>6&&<p className="we-due-review-more">还有 {dueReviewWords.length-6} 个词待复习</p>}</section>}
    </main>
  </div>
}
