'use client'

import {useState} from 'react'
import Link from 'next/link'
import {Search, ArrowUpRight, BookOpen, Check, LogOut, Headphones, Bookmark} from 'lucide-react'
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
    {hasAccess && dueReviewWords.length > 0 && <section className="we-due-review" aria-label="今日词汇复习"><div className="we-due-review-heading"><div><p className="we-eyebrow">WORD REVIEW</p><h2>今天复习 <span>{dueReviewWords.length}</span> 个词</h2><p>先看中文回想英文，再点开核对。</p></div><span>来自你收藏过的课程</span></div><div className="we-due-review-list">{dueReviewWords.slice(0,6).map((item,index)=><article className="we-due-review-card" key={`${item.lessonId}-${item.id}`}><span className="we-due-review-index">{String(index+1).padStart(2,'0')}</span><div className="we-due-review-main"><span>{item.companyZh} · 第 {item.lessonId} 期</span><p>{item.meaning}</p><details><summary>显示英文答案</summary><strong>{item.word}</strong><small>{item.example}{item.translation ? ` · ${item.translation}` : ''}</small></details></div><Link href={`${WORK_ENGLISH_PATH}/lessons/${item.lessonId}#review`} aria-label={`进入第 ${item.lessonId} 期复习`}>进入本期 <ArrowUpRight size={14}/></Link></article>)}</div>{dueReviewWords.length>6&&<p className="we-due-review-more">还有 {dueReviewWords.length-6} 个词待复习</p>}</section>}
    {filter === 'scenes' && !searchTerm && <section className="we-scenes" aria-label="职场场景路线"><div className="we-scenes-heading"><div><p className="we-eyebrow">CHOOSE A WORK SITUATION</p><h2>先选一个你会遇到的场景</h2></div><p>每条路线从名企原文出发，逐步练到自己的工作表达。</p></div><div className="we-scene-options">{SCENE_PATHS.map(scene => <button key={scene.id} className={sceneId===scene.id?'selected':''} aria-pressed={sceneId===scene.id} onClick={()=>setSceneId(scene.id)}><span>{scene.name}</span><strong>{scene.question}</strong><small>{scene.lessonIds.length} 期 · {scene.description}</small></button>)}</div>
      <div className="we-route-next"><div><span className="we-route-kicker">{activeScene.name} · 下一步</span><strong>{nextLesson ? nextLesson.title : '这条路线已经完成'}</strong><p>{nextLesson ? `读 ${nextLesson.companyZh} 的${nextLesson.sourceType}，完成本期练习。` : '可以换一条场景路线继续学习。'}</p></div>{nextLesson && <a href={hasAccess?`${WORK_ENGLISH_PATH}/lessons/${nextLesson.id}#${summaries[nextLesson.id]?.lastSection??'reading'}`:'#package-access'}>{summaries[nextLesson.id]?.started?'继续学习':'从原文开始'} <ArrowUpRight size={16}/></a>}</div>
    </section>}
    {filter === 'scenes' && !searchTerm && <section className="we-shelves we-shelves-entry" aria-label="全部资料的场景分类"><div className="we-scenes-heading"><div><p className="we-eyebrow">100 LESSONS BY SITUATION</p><h2>更多工作场景</h2></div><p>按你遇到的问题找资料。</p></div><div className="we-shelf-options">{SCENE_GROUPS.map(group=><button key={group.id} onClick={()=>{setGroupId(group.id);setFilter('all')}}>{group.name} <span>{group.lessonIds.length}</span></button>)}</div></section>}
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
