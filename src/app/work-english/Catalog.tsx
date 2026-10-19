'use client'

import {useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {ArrowLeft, ArrowRight, ArrowUpRight, LogOut} from 'lucide-react'
import {WORK_ENGLISH_PATH, WORK_ENGLISH_TITLE} from '@/lib/work-english/constants'
import {authEntryPath} from '@/lib/auth-return-path'
import {createClient} from '@/lib/supabase/client'
import type {DueReviewWord} from '@/lib/work-english/review'

interface Props {
  signedIn:boolean; hasAccess:boolean;
  catalogLessons: {id:string;version:number;company:string;companyZh:string;title:string;description:string;topic:string;sourceType:string;minutes:number;words:number;level:string;status?:string}[]
  summaries:Record<string,{complete:boolean; started:boolean; words:number; lastSection:string}>
  dueReviewWords:DueReviewWord[]
}

const PAGE_SIZE = 12

export default function Catalog({signedIn,hasAccess,summaries,dueReviewWords,catalogLessons}:Props) {
  const [page,setPage] = useState(1)
  const [message,setMessage] = useState('')
  const lessons = [...catalogLessons].sort((a,b) => Number(a.id) - Number(b.id))
  const latest = [...catalogLessons].sort((a,b) => Number(b.id) - Number(a.id))[0]
  const pageCount = Math.max(1,Math.ceil(lessons.length / PAGE_SIZE))
  const currentPage = Math.min(page,pageCount)
  const pageLessons = lessons.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)
  const completed = Object.values(summaries).filter(row => row.complete).length

  async function signOut() {
    const {error} = await createClient().auth.signOut()
    if (error) {setMessage('退出失败，请重试'); return}
    window.location.assign(WORK_ENGLISH_PATH)
  }

  const lessonHref = (id:string) => hasAccess
    ? `${WORK_ENGLISH_PATH}/lessons/${id}#${summaries[id]?.lastSection ?? 'reading'}`
    : '#package-access'

  return <div className="work-english">
    <header className="we-top">
      <Link href={WORK_ENGLISH_PATH} className="we-brand"><span>W</span><span>名企职场英语</span><i>WORKPLACE ENGLISH</i></Link>
      <div className="we-account">{signedIn ? <><span>{hasAccess?'学习空间':'账号已登录'}</span><button onClick={signOut}><LogOut size={14}/>退出</button></> : <Link href={authEntryPath('login',WORK_ENGLISH_PATH)}>登录 / 继续学习 <ArrowUpRight size={15}/></Link>}</div>
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
          <div className="we-hero-art" aria-hidden="true">{hasAccess && <Image src={`${WORK_ENGLISH_PATH}/lessons/${latest.id}/media/illustration.png`} alt="" fill sizes="(max-width: 760px) 100vw, 48vw" unoptimized priority/>}</div>
          <div className="we-hero-copy"><span className="we-hero-label">最新更新 <i>第 {latest.id} 期</i></span><span className="we-hero-company">{latest.companyZh}　·　{latest.topic}</span><strong>{latest.title}</strong><span className="we-hero-action">{summaries[latest.id]?.started?'继续学习':'开始今天的学习'} <ArrowUpRight size={18}/></span></div>
          <span className="we-hero-mark" aria-hidden="true">↗</span>
        </Link>}
      </section>

      {!hasAccess && <section className="we-access-notice" id="package-access" tabIndex={-1} aria-label="套餐权限提示"><div><h2>当前账号暂无有效的名企英语套餐</h2><p>如已购买，请联系店铺客服核对注册账号与套餐有效期。</p></div><button onClick={signOut}>切换账号 <ArrowUpRight size={15}/></button></section>}
      {message && <p className="we-error" role="alert">{message}</p>}

      <section className="we-catalog" aria-label="按场景学习">
        <div className="we-catalog-heading"><div><h2>按场景学习</h2><p>选一篇你正需要的内容，开始练习。</p></div><span className="we-catalog-count">共 {lessons.length} 篇</span></div>
        <div className="we-list">{pageLessons.map((lesson,index)=>{
          const done = summaries[lesson.id]?.complete
          const started = summaries[lesson.id]?.started
          return <Link href={lessonHref(lesson.id)} className="we-list-row" key={lesson.id}>
            <span className="we-list-number">{String(Number(lesson.id)).padStart(3,'0')}</span>
            <span className="we-list-art">{hasAccess && <Image src={`${WORK_ENGLISH_PATH}/lessons/${lesson.id}/media/illustration.png`} alt="" fill sizes="150px" unoptimized loading={index < 3 ? 'eager' : 'lazy'}/>}</span>
            <span className="we-list-copy"><span className="we-list-meta"><b>{lesson.companyZh}</b><i>{lesson.topic}</i><i>{lesson.minutes} 分钟</i><i>{lesson.level}</i></span><strong>{lesson.title}</strong></span>
            <span className={`we-list-status${done?' is-done':''}`}>{done?'已完成':started?'继续学习':'开始学习'} <ArrowUpRight size={16}/></span>
          </Link>
        })}</div>
        {lessons.length===0 && <div className="we-list-empty">暂时还没有可学习的内容。</div>}
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
