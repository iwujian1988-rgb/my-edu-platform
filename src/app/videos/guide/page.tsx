import Link from 'next/link'
import { Headphones, Subtitles, Mic, CheckCircle2, BookOpen, ArrowRight } from 'lucide-react'

const STEPS = [
  { title: '先盲听：抓住大意', time: '第一遍', icon: Headphones, text: '先不看字幕，听懂多少算多少。视频上的「遮挡字幕」可以盖住原片自带的字幕。先记住话题和几个关键词。' },
  { title: '再精听：找到听漏的地方', time: '第二遍', icon: Subtitles, text: '点击精听的「重新播放」，从头对照字幕再听。点击字幕可跳到对应位置；遇到生词，打开单词卡查看释义，把不熟悉的词标为学习中。' },
  { title: '跟读：把句子说出来', time: '挑几句练', icon: Mic, text: '在跟读区用小视频对照原声，模仿语调和节奏。想录音时再主动开启录音；听完自己的回放，重点调整一两个地方。' },
  { title: '做练习：确认是否理解', time: '巩固一遍', icon: CheckCircle2, text: '用本集提供的填空、选择或其他练习检查理解。答错时回到原句重听，不用急着刷完所有题。不同视频提供的练习可能不同。' },
  { title: '学完留记录，明天再复习', time: '完成闭环', icon: BookOpen, text: '点击「完成学习」保存本次完成记录并回到视频首页。到「我的 → 学习记录」查看学过的内容，用卡片复习入口重新遇见不熟悉的词。' },
]

export const metadata = { title: '学习指南 · 视频学习', description: '选内容、盲听、精听、跟读、练习和复习，一条视频的完整学习路径。' }

export default function LearningGuidePage() {
  return <div className="mx-auto max-w-5xl px-5 py-10 md:py-16">
    <Link href="/videos" className="text-sm font-medium text-indigo-600">← 返回视频首页</Link>
    <header className="my-8 border-b border-gray-200 pb-10 dark:border-gray-700">
      <p className="mb-3 text-sm font-semibold tracking-wide text-indigo-600">视频学习指南</p>
      <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">不只看视频，<br />把听懂的内容变成会用的语言。</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">适合想提高听力、积累日常表达、练习开口的人。每天选一条适合自己程度的视频，沿着下面的步骤学；时间少，就先完成盲听和精听。</p>
      <Link href="/videos" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white">选一条视频开始 <ArrowRight size={18} /></Link>
    </header>
    <section className="mb-10 rounded-2xl bg-indigo-50 p-6 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-100">
      <h2 className="text-xl font-bold">第一步：选一条「大部分能跟上」的内容</h2>
      <p className="mt-3 leading-7">用首页分类和难度筛选，优先选感兴趣的话题。刚开始选短一些的内容；如果每句都听不懂，换一条更简单的。一次学透一条，比匆忙刷很多条更容易复习。</p>
    </section>
    <div className="space-y-8">{STEPS.map(({ title, time, icon: Icon, text }, index) => <section key={title} className="flex gap-5 border-b border-gray-200 pb-8 dark:border-gray-700">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-100 font-bold text-indigo-700">{index + 1}</span>
      <div><div className="flex flex-wrap items-center gap-3"><Icon size={21} className="text-indigo-600" /><h2 className="text-xl font-bold">{title}</h2><span className="text-sm text-gray-500">{time}</span></div><p className="mt-3 max-w-3xl leading-8 text-gray-600 dark:text-gray-300">{text}</p></div>
    </section>)}</div>
    <section className="mt-10"><h2 className="text-2xl font-bold">按你今天的时间来安排</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700"><h3 className="font-bold">轻量版 · 约 10 分钟</h3><p className="mt-3 leading-7 text-gray-600 dark:text-gray-300">选一条短视频 → 盲听一遍 → 对字幕精听 → 记住一个表达。</p></div><div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700"><h3 className="font-bold">完整练习 · 约 20 分钟</h3><p className="mt-3 leading-7 text-gray-600 dark:text-gray-300">盲听和精听 → 挑几句跟读 → 做本集练习 → 完成学习，次日复习卡片。</p></div></div><p className="mt-4 text-sm text-gray-500">时长为安排参考，按视频长度和自己的程度调整。</p></section>
    <Link href="/videos" className="mt-10 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white">现在选一条，开始学习</Link>
  </div>
}
