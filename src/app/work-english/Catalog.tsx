'use client'

import {useRef, useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {Search, ArrowUpRight, BookOpen, Check, LogOut, Headphones, Bookmark, ChevronLeft, ChevronRight} from 'lucide-react'
import {WORK_ENGLISH_PATH, WORK_ENGLISH_TITLE} from '@/lib/work-english/constants'
import {authEntryPath} from '@/lib/auth-return-path'
import {createClient} from '@/lib/supabase/client'
import type {DueReviewWord} from '@/lib/work-english/review'
import {SCENE_GROUPS, SCENE_PATHS, type SceneGroupId, type ScenePathId} from './catalog-scenes'
import LessonCover from './LessonCover'

interface Props {
  signedIn:boolean; hasAccess:boolean;
  catalogLessons: {id:string;version:number;company:string;companyZh:string;title:string;description:string;topic:string;sourceType:string;minutes:number;words:number;level:string;status?:string}[]
  summaries:Record<string,{complete:boolean; started:boolean; words:number; lastSection:string}>
  dueReviewWords:DueReviewWord[]
}
type Filter = 'scenes' | 'all' | 'started' | 'complete'
export default function Catalog({signedIn,hasAccess,summaries,dueReviewWords,catalogLessons}:Props) {
  const [query,setQuery] = useState('')
  const [filter,setFilter] = useState<Filter>('scenes')
  const [sceneId,setSceneId] = useState<ScenePathId>('daily')
  const [groupId,setGroupId] = useState<SceneGroupId | null>(null)
  const [message,setMessage] = useState('')
  const complete = Object.values(summaries).filter(row => row.complete).length
  const wordCount = Object.values(summaries).reduce((sum,row) => sum + row.words,0)
  const activeScene = SCENE_PATHS.find(scene => scene.id === sceneId) ?? SCENE_PATHS[0]
  const sceneLessons = activeScene.lessonIds.flatMap(id => {
    const lesson = catalogLessons.find(item => item.id === id)
    return lesson ? [lesson] : []
  })
  const nextLesson = sceneLessons.find(lesson => !summaries[lesson.id]?.complete)
  const searchTerm = query.toLowerCase().trim()
  const latestLessons = [...catalogLessons].sort((a,b) => Number(b.id) - Number(a.id)).slice(0,5)
  const baseLessons = filter === 'scenes' && !searchTerm ? sceneLessons : catalogLessons
  const lessons = baseLessons.filter(lesson => `${lesson.company} ${lesson.companyZh} ${lesson.title} ${lesson.topic} ${lesson.description}`.toLowerCase().includes(searchTerm)
    && (filter !== 'all' || searchTerm || !groupId || SCENE_GROUPS.find(group => group.id === groupId)?.lessonIds.some(id => id === lesson.id))
    && (filter === 'all' || filter === 'scenes' || (filter === 'complete' ? summaries[lesson.id]?.complete : summaries[lesson.id]?.started && !summaries[lesson.id]?.complete)))

  async function signOut() {
    const {error} = await createClient().auth.signOut()
    if (error) {setMessage('退出失败，请重试'); return}
    window.location.assign(WORK_ENGLISH_PATH)
  }
  return <div className="work-english">
    <header className="we-top"><Link href={WORK_ENGLISH_PATH} className="we-brand"><span>W</span> 名企职场英语<span className="we-edition">LEARNING LIBRARY</span></Link>
      <div className="we-account">{signedIn ? <><span>{hasAccess?'套餐已开通':'账号已登录'}</span><button onClick={signOut}><LogOut size={14}/>退出</button></> : <Link href={authEntryPath('login',WORK_ENGLISH_PATH)}>登录 / 继续学习 <ArrowUpRight size={15}/></Link>}</div>
    </header>
    <div className="we-shell"><aside className="we-sidebar"><p className="we-eyebrow">MY WORKSPACE</p><nav aria-label="知识库筛选">
      <button className={filter==='scenes'?'selected':''} onClick={()=>{setFilter('scenes');setQuery('')}}><BookOpen size={17}/>场景路线</button>
      <button className={filter==='started'?'selected':''} onClick={()=>setFilter('started')}><Headphones size={17}/>继续学习</button>
      <button className={filter==='complete'?'selected':''} onClick={()=>setFilter('complete')}><Check size={17}/>已完成<span>{complete}</span></button>
      <button className={filter==='all'?'selected':''} onClick={()=>{setFilter('all');setQuery('')}}><BookOpen size={17}/>全部资料<span>{catalogLessons.length}</span></button>
    </nav><div className="we-note"><Bookmark size={19}/><strong>把读到的表达，变成自己的。</strong><p>原文精读 → 词汇与听读 → 工作表达 → 回来复习</p><span>词本已收藏 {wordCount} 个词</span></div><p className="we-side-foot">MAX笔记 · 独立学习空间</p></aside>
    <main className="we-main"><div className="we-intro"><p className="we-eyebrow">COMPANY DOCUMENTS, REAL WORK</p><h1>{WORK_ENGLISH_TITLE}</h1><p>先找你正在遇到的工作场景，再读名企原文、练习自己的表达。</p><div className="we-count"><span>推荐路线 <b>{SCENE_PATHS.reduce((sum,scene)=>sum+scene.lessonIds.length,0)}</b> 期</span><span>资料 <b>{catalogLessons.length}</b> 期</span><span>已完成 <b>{complete}</b> 期</span></div></div>
    {!hasAccess && <section className="we-access-notice" id="package-access" tabIndex={-1} aria-label="套餐权限提示"><div><h2>当前账号暂无有效的名企英语套餐</h2><p>如已购买，请联系店铺客服核对注册账号与套餐有效期。</p></div><button onClick={signOut}>切换账号 <ArrowUpRight size={15}/></button></section>}
    {message && <p className="we-error" role="alert">{message}</p>}
    {filter === 'scenes' && !searchTerm && latestLessons.length > 0 && <LatestLessonsCarousel lessons={latestLessons} hasAccess={hasAccess} summaries={summaries}/>}
    {hasAccess && dueReviewWords.length > 0 && <section className="we-due-review" aria-label="今日词汇复习"><div className="we-due-review-heading"><div><p className="we-eyebrow">WORD REVIEW</p><h2>今天复习 <span>{dueReviewWords.length}</span> 个词</h2><p>先看中文回想英文，再点开核对。</p></div><span>来自你收藏过的课程</span></div><div className="we-due-review-list">{dueReviewWords.slice(0,6).map((item,index)=><article className="we-due-review-card" key={`${item.lessonId}-${item.id}`}><span className="we-due-review-index">{String(index+1).padStart(2,'0')}</span><div className="we-due-review-main"><span>{item.companyZh} · 第 {item.lessonId} 期</span><p>{item.meaning}</p><details><summary>显示英文答案</summary><strong>{item.word}</strong><small>{item.example}{item.translation ? ` · ${item.translation}` : ''}</small></details></div><Link href={`${WORK_ENGLISH_PATH}/lessons/${item.lessonId}#review`} aria-label={`进入第 ${item.lessonId} 期复习`}>进入本期 <ArrowUpRight size={14}/></Link></article>)}</div>{dueReviewWords.length>6&&<p className="we-due-review-more">还有 {dueReviewWords.length-6} 个词待复习</p>}</section>}
    {filter === 'scenes' && !searchTerm && <section className="we-scenes" aria-label="职场场景路线">
      <div className="we-scenes-heading"><div><p className="we-eyebrow">按场景学习</p><h2>今天想练什么？</h2></div><p className="we-learning-steps"><span>选场景</span><i>›</i><span>读原文</span><i>›</i><span>练表达</span></p></div>
      <div className="we-scene-options">{SCENE_PATHS.map(scene => <button key={scene.id} className={sceneId===scene.id?'selected':''} aria-pressed={sceneId===scene.id} onClick={()=>setSceneId(scene.id)}><span>{scene.name}</span><strong>{scene.question}</strong><small>{scene.lessonIds.length} 篇</small></button>)}</div>
      <div className="we-route-next"><span>{nextLesson ? `${nextLesson.companyZh} · ${nextLesson.title}` : '这条路线已经完成'}</span>{nextLesson && <a href={hasAccess?`${WORK_ENGLISH_PATH}/lessons/${nextLesson.id}#${summaries[nextLesson.id]?.lastSection??'reading'}`:'#package-access'}>{summaries[nextLesson.id]?.started?'继续':'开始'}这条路线 <ArrowUpRight size={15}/></a>}</div>
    </section>}
    {filter === 'scenes' && !searchTerm && <section className="we-shelves we-shelves-entry" aria-label="更多工作场景"><div className="we-scenes-heading"><div><h2>更多场景</h2></div><button className="we-all-link" onClick={()=>{setGroupId(null);setFilter('all')}}>全部资料 <ArrowUpRight size={14}/></button></div><div className="we-shelf-options">{SCENE_GROUPS.map(group=><button key={group.id} onClick={()=>{setGroupId(group.id);setFilter('all')}}>{group.name} <span>{group.lessonIds.length}</span></button>)}</div></section>}
    {filter === 'all' && !searchTerm && <section className="we-shelves" aria-label="按场景浏览全部资料"><div className="we-scenes-heading"><div><p className="we-eyebrow">BROWSE BY SITUATION</p><h2>按工作场景找原文</h2></div><p>这里收录全部资料；推荐路线可从左侧进入。</p></div><div className="we-shelf-options"><button className={!groupId?'selected':''} aria-pressed={!groupId} onClick={()=>setGroupId(null)}>全部 <span>{catalogLessons.length}</span></button>{SCENE_GROUPS.map(group=><button key={group.id} className={groupId===group.id?'selected':''} aria-pressed={groupId===group.id} onClick={()=>setGroupId(group.id)}>{group.name} <span>{group.lessonIds.length}</span></button>)}</div></section>}
    <div className="we-toolbar"><div className="we-tabs"><span>{searchTerm?'搜索结果':filter==='scenes'?activeScene.name:filter==='all'?(SCENE_GROUPS.find(group=>group.id===groupId)?.name??'全部资料'):filter==='complete'?'已完成':'继续学习'}</span><small>{lessons.length} 期</small></div><label className="we-search"><Search size={16}/><input aria-label="搜索内容" placeholder="搜索公司、话题、表达场景" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <div className="we-grid">{lessons.map(lesson=>{
      const action = hasAccess ? (summaries[lesson.id]?.started?'继续学习':'开始学习') : '查看套餐状态'
      const routeStep = filter === 'scenes' && !searchTerm ? sceneLessons.findIndex(item => item.id === lesson.id) + 1 : null
      return <article className="we-card" key={lesson.id}><a className="we-card-link" aria-label={`第 ${lesson.id} 期：${lesson.title}，${action}`} href={hasAccess?`${WORK_ENGLISH_PATH}/lessons/${lesson.id}#${summaries[lesson.id]?.lastSection??'reading'}`:'#package-access'}>
      <LessonCover id={lesson.id} company={lesson.company} sourceType={lesson.sourceType} title={lesson.title} routeStep={routeStep} action={action}/>
      <div className="we-card-body"><div className="we-card-meta"><span>{lesson.level}</span><span>{lesson.topic}</span><span>{lesson.minutes} 分钟</span></div><h2>{lesson.title}</h2><p>{lesson.description}</p><div className="we-card-features"><span>原文精读</span><span>{lesson.words} 个核心词</span><span>听读与练习</span></div><div className="we-card-bottom"><span>{summaries[lesson.id]?.complete?'✓ 本期已完成':summaries[lesson.id]?.started?'已有学习记录':'从原文开始'}</span><span className="we-card-cta">{action}<ArrowUpRight size={17}/></span></div></div>
    </a></article>})}</div>
    {!lessons.length && <div className="we-empty"><BookOpen size={28}/><h2>这里暂时没有内容</h2><p>{query?'换一个公司或场景关键词试试。':'开始学习后，记录会出现在这里。'}</p><button onClick={()=>{setQuery('');setFilter('all')}}>查看全部资料</button></div>}
    <footer className="we-footer"><span>从一段原文开始，留下一次自己的表达。</span><p>来源为企业公开资料。教学内容由本学习库独立编写；不代表相关企业官方课程或背书。</p></footer>
    </main></div>
  </div>
}

function LatestLessonsCarousel({
  lessons,
  hasAccess,
  summaries,
}: {
  lessons: Props['catalogLessons']
  hasAccess: boolean
  summaries: Props['summaries']
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollTo = (index: number) => {
    const track = trackRef.current
    const slide = track?.children[index] as HTMLElement | undefined
    if (track && slide) track.scrollTo({left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth'})
    setActiveIndex(index)
  }
  const goTo = (direction: -1 | 1) => scrollTo(Math.max(0, Math.min(lessons.length - 1, activeIndex + direction)))
  const updateActiveIndex = () => {
    const track = trackRef.current
    if (!track) return
    let nearest = 0
    let distance = Number.POSITIVE_INFINITY
    Array.from(track.children).forEach((child, index) => {
      const nextDistance = Math.abs((child as HTMLElement).offsetLeft - track.offsetLeft - track.scrollLeft)
      if (nextDistance < distance) { nearest = index; distance = nextDistance }
    })
    setActiveIndex(nearest)
  }

  return <section className="we-latest" aria-label="最新更新内容" aria-roledescription="carousel">
    <div className="we-latest-heading"><div><p className="we-eyebrow">每日更新</p><h2>最近更新</h2></div><span>从最新一期开始，也可以左右滑动看前几期</span></div>
    <div className="we-latest-track-window" ref={trackRef} onScroll={updateActiveIndex}>
      <div className="we-latest-track">
        {lessons.map((item, index) => <article className="we-latest-slide" key={item.id} aria-label={`第 ${index + 1} 项，共 ${lessons.length} 项`}>
          <Link href={hasAccess ? `${WORK_ENGLISH_PATH}/lessons/${item.id}#${summaries[item.id]?.lastSection ?? 'reading'}` : '#package-access'} className="we-latest-card">
            <div className="we-latest-art">{hasAccess ? <Image src={`${WORK_ENGLISH_PATH}/lessons/${item.id}/media/illustration.png`} alt={`${item.companyZh}第${item.id}期封面`} fill sizes="(max-width: 720px) 82vw, 370px" unoptimized priority={index < 3}/> : <LessonCover id={item.id} company={item.company} sourceType={item.sourceType} title={item.title} routeStep={null} action="开始学习"/>}</div>
            <div className="we-latest-copy"><div className="we-latest-meta"><span>{item.companyZh}</span><span>第 {item.id} 期</span><span>{item.minutes} 分钟</span></div><h3>{item.title}</h3><div className="we-latest-footer"><span>{item.topic}</span><span>{summaries[item.id]?.started ? '继续学习' : '开始学习'} <ArrowUpRight size={14}/></span></div></div>
          </Link>
        </article>)}
      </div>
    </div>
    <div className="we-latest-controls" aria-label="选择最新内容">
      <span>{String(activeIndex + 1).padStart(2, '0')} <i>/</i> {String(lessons.length).padStart(2, '0')}</span>
      <div className="we-latest-dots">{lessons.map((item, index) => <button key={item.id} className={index === activeIndex ? 'selected' : ''} onClick={() => scrollTo(index)} aria-label={`查看第 ${item.id} 期`} aria-current={index === activeIndex ? 'true' : undefined}/>)}</div>
      <div className="we-latest-arrows"><button onClick={() => goTo(-1)} aria-label="上一期"><ChevronLeft size={17}/></button><button onClick={() => goTo(1)} aria-label="下一期"><ChevronRight size={17}/></button></div>
    </div>
  </section>
}
