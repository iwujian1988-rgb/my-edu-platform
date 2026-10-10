import Link from 'next/link'
import { Headphones, Subtitles, Mic, CheckCircle2, BookOpen, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import styles from './guide.module.css'

const STEPS = [
  { title: '先盲听：抓住大意', time: '第一遍', icon: Headphones, text: '先不看字幕，听懂多少算多少。视频上的「遮挡字幕」可以盖住原片自带的字幕。先记住话题和几个关键词。' },
  { title: '再精听：找到听漏的地方', time: '第二遍', icon: Subtitles, text: '点击精听的「重新播放」，从头对照字幕再听。点击字幕可跳到对应位置；遇到生词，打开单词卡查看释义，把不熟悉的词标为学习中。' },
  { title: '跟读：把句子说出来', time: '挑几句练', icon: Mic, text: '在跟读区用小视频对照原声，模仿语调和节奏。想录音时再主动开启录音；听完自己的回放，重点调整一两个地方。' },
  { title: '做练习：确认是否理解', time: '巩固一遍', icon: CheckCircle2, text: '用本集提供的填空、选择或其他练习检查理解。答错时回到原句重听，不用急着刷完所有题。不同视频提供的练习可能不同。' },
  { title: '学完留记录，明天再复习', time: '完成闭环', icon: BookOpen, text: '点击「完成学习」保存本次完成记录并回到视频首页。到「我的 → 学习记录」查看学过的内容，用卡片复习入口重新遇见不熟悉的词。' },
]

export const metadata = { title: '学习指南 · 视频学习', description: '选内容、盲听、精听、跟读、练习和复习，一条视频的完整学习路径。' }

export default function LearningGuidePage() {
  return <main className={`${styles.page} min-h-screen bg-[#faf8f3] text-slate-900 dark:bg-[#101725] dark:text-slate-100`}><div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 md:py-12">
    <Link href="/videos" className="text-sm font-medium text-indigo-600">← 返回视频首页</Link>
    <header className={`${styles.paperSurface} my-8 max-w-3xl pb-6`}>
      <p className="mb-3 text-sm font-semibold tracking-wide text-indigo-600">视频学习指南</p>
      <h1 className="max-w-3xl text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl md:text-5xl">不只看懂故事，<br />也让法语听得懂、说得出。</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">适合想提高听力、积累日常表达、练习开口的人。每天选一条适合自己程度的视频，沿着下面的步骤学；时间少，就先完成盲听和精听。</p>
      <Link href="/videos" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white">选一条视频开始 <ArrowRight size={18} /></Link>
    </header>
    <nav aria-label="学习步骤快速跳转" className={`${styles.paperSurface} mb-8 flex flex-wrap gap-2`}>{GUIDE_IMAGES.map((image, index) => <a key={image.name} href={`#${image.name}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dedbd2] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><span className="text-indigo-600 dark:text-indigo-300">{String(index + 1).padStart(2, '0')}</span>{image.label}</a>)}</nav>
    <section id="choose" aria-labelledby="choose-title" className="mb-6 grid scroll-mt-28 overflow-hidden rounded-2xl border border-[#e4e0d6] bg-white md:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
      <GuideIllustration image={GUIDE_IMAGES[0]} priority />
      <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
      <p className="mb-4 text-sm font-bold text-indigo-700 dark:text-indigo-300">01 / 从兴趣开始</p>
      <h2 id="choose-title" className="text-2xl font-bold leading-snug">选一条「大部分能跟上」的内容</h2>
      <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-slate-300">用首页分类和难度筛选，优先选感兴趣的话题。刚开始选短一些的内容；如果每句都听不懂，换一条更简单的。一次学透一条，比匆忙刷很多条更容易复习。</p>
      <p className="mt-6 border-t border-slate-100 pt-4 text-sm font-semibold leading-7 text-indigo-800 dark:border-slate-700 dark:text-indigo-200">这样操作：打开首页 → 按话题、难度选视频</p>
      </div>
    </section>
    <div className="space-y-6">{STEPS.map(({ title, time, icon: Icon, text }, index) => <section id={GUIDE_IMAGES[index + 1].name} key={title} aria-labelledby={`${GUIDE_IMAGES[index + 1].name}-title`} className="grid scroll-mt-28 overflow-hidden rounded-2xl border border-[#e4e0d6] bg-white md:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
      <GuideIllustration image={GUIDE_IMAGES[index + 1]} reverse={index % 2 === 0} />
      <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10"><div className="mb-4 flex items-center gap-3"><span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{String(index + 2).padStart(2, '0')}</span><Icon size={21} aria-hidden className="text-indigo-600 dark:text-indigo-300" /><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{time}</span></div><h2 id={`${GUIDE_IMAGES[index + 1].name}-title`} className="text-2xl font-bold leading-snug">{title}</h2><p className="mt-4 text-sm leading-8 text-slate-600 dark:text-slate-300">{text}</p><p className="mt-6 border-t border-slate-100 pt-4 text-sm font-semibold leading-7 text-indigo-800 dark:border-slate-700 dark:text-indigo-200">这样操作：{GUIDE_IMAGES[index + 1].action}</p></div>
    </section>)}</div>
    <section className="mt-10"><h2 className="text-2xl font-bold">按你今天的时间来安排</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700"><h3 className="font-bold">轻量版 · 约 10 分钟</h3><p className="mt-3 leading-7 text-gray-600 dark:text-gray-300">选一条短视频 → 盲听一遍 → 对字幕精听 → 记住一个表达。</p></div><div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700"><h3 className="font-bold">完整练习 · 约 20 分钟</h3><p className="mt-3 leading-7 text-gray-600 dark:text-gray-300">盲听和精听 → 挑几句跟读 → 做本集练习 → 完成学习，次日复习卡片。</p></div></div><p className="mt-4 text-sm text-gray-500">时长为安排参考，按视频长度和自己的程度调整。</p></section>
    <Link href="/videos" className="mt-10 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white">现在选一条，开始学习</Link>
  </div></main>
}

const GUIDE_IMAGES = [
  { name: 'choose', label: '选内容', alt: '手绘学习者在电脑上选择访谈、日常对话和旅行视频', action: '按话题、难度选一条视频' },
  { name: 'listen', label: '盲听', alt: '手绘学习者戴耳机听视频，视频字幕被深色遮罩盖住', action: '遮挡字幕 → 听一遍 → 记住话题和关键词' },
  { name: 'study', label: '精听', alt: '手绘学习者对照电脑字幕，在笔记本里记录不熟悉的表达', action: '显示字幕 → 重新播放 → 点击原句重听' },
  { name: 'speak', label: '跟读', alt: '手绘学习者看着小视频，向麦克风练习跟读', action: '听原声 → 开口跟读 → 录音回放' },
  { name: 'practice', label: '练习', alt: '手绘学习者完成选择题，选中的选项旁有一个勾', action: '完成本集练习 → 回到答错的原句' },
  { name: 'review', label: '复习', alt: '手绘学习者回顾单词卡，日历和学习记录提示次日复习', action: '完成学习 → 我的学习记录 → 次日复习卡片' },
] as const

const IMAGE_WIDTH = 900
const IMAGE_HEIGHT = 600

function GuideIllustration({ image, reverse = false, priority = false }: { image: (typeof GUIDE_IMAGES)[number]; reverse?: boolean; priority?: boolean }) {
  return <div className={`flex items-center bg-[#f6f2e9] p-4 sm:p-6 ${reverse ? 'md:order-2' : ''}`}><Image src={`/images/video-guide/${image.name}.webp`} alt={image.alt} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} sizes="(max-width: 767px) 100vw, (max-width: 1200px) 50vw, 550px" priority={priority} className="h-auto w-full rounded-xl" /></div>
}
