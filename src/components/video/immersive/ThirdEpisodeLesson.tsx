'use client'

import { useState } from 'react'
import type { SubtitleWithHighlights } from '@/types/video'

interface Part {
  title: string
  time: string
  start: number
  end: number
  preview: string[]
  dictation: { before: string; answer: string; after: string }[]
  note: { expression: string; meaning: string; example: string; translation: string }
  task: string
  answer: string
}

const PARTS: Part[] = [
  {
    title: '先了解，再决定', time: '00:00–00:11', start: 0, end: 11.84,
    preview: ['我建议你先上网了解一下，再决定要不要买这本书。', '接下来是这个视频的最后一个类别：小工具。'],
    dictation: [
      { before: 'Je vous invite à vous ', answer: 'renseigner', after: ' sur internet.' },
      { before: 'On passe à la ', answer: 'catégorie', after: ' gadgets.' },
    ],
    note: { expression: 'se renseigner sur + 事物', meaning: '先打听、了解某件事。sur 后面放你想了解的内容。', example: 'Je vais me renseigner sur ce livre.', translation: '我先去了解一下这本书。' },
    task: '朋友准备买一件东西，你想建议她先了解一下。你会怎么说？', answer: 'Tu peux te renseigner sur ce produit avant de l’acheter.',
  },
  {
    title: '介绍一个小风扇', time: '00:11–00:37', start: 11.8, end: 37.08,
    preview: ['这是一个便携式小风扇，能吹出凉风。', '有次在火车上很热，它帮了我大忙。', '我可以用旋钮调节风力，大概花了 60 欧元。'],
    dictation: [
      { before: "Il s’agit d’un mini ", answer: 'ventilateur', after: ' portable.' },
      { before: "Je peux ", answer: 'régler', after: " l’intensité avec la molette." },
      { before: "C’est aux alentours de 60 ", answer: 'euros', after: '.' },
    ],
    note: { expression: 'Je peux + 动词原形 + avec …', meaning: '先说能做什么，再用 avec 说借助什么工具。片中 régler 是「调节」，molette 是「小旋钮」。', example: 'Je peux régler la luminosité avec ce bouton.', translation: '我可以用这个按钮调节亮度。' },
    task: '介绍一个你常带出门的小物件：它是什么？你能用它做什么？', answer: 'Il s’agit d’un petit chargeur portable. Je peux recharger mon téléphone avec.',
  },
  {
    title: '分享结束，邀请互动', time: '00:37–01:09', start: 37, end: 69.14,
    preview: ['希望这期视频让你们发现了一些好东西。', '这是我在 YouTube 上看得最多的内容类型，所以我也想试试。', '如果你们喜欢，欢迎点赞、评论和订阅。'],
    dictation: [
      { before: "J’espère que je vous aurai quand même fait découvrir des ", answer: 'pépites', after: '.' },
      { before: "N’hésitez pas à ", answer: 'liker', after: ' cette vidéo.' },
    ],
    note: { expression: 'N’hésitez pas à + 动词原形', meaning: '字面是「不要犹豫」，放在这里更像亲切地说「欢迎……」。对熟悉的单个人，可以说 N’hésite pas à …。', example: 'N’hésitez pas à poser des questions.', translation: '欢迎提问。' },
    task: '你刚向朋友介绍完一本书。试着邀请对方告诉你读后的感受。', answer: 'N’hésite pas à me dire ce que tu en penses.',
  },
]

function StudyPart({ part, index, subtitles, onPlaySegment, onHideSubtitle }: { part: Part; index: number; subtitles: SubtitleWithHighlights[]; onPlaySegment: (start: number, end: number) => void; onHideSubtitle: () => void }) {
  const [answers, setAnswers] = useState<string[]>(part.dictation.map(() => ''))
  const [checked, setChecked] = useState(false)
  const normalized = (value: string) => value.trim().toLocaleLowerCase('fr').replace(/[’]/g, "'")
  return (
    <section className="border-t border-[#e7e1d7] py-7 dark:border-stone-700">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-bold"><span className="mr-3 font-serif italic text-[#a66b52]">0{index + 1}</span>{part.title}</h3><span className="text-xs text-stone-500">{part.time}</span></div>
      <h4 className="mt-6 text-base font-bold">一、先看中文，试着说</h4>
      <p className="mt-2 text-sm leading-7 text-stone-500">不用逐字翻译。先想想，如果是你，会怎么说。</p>
      <div className="mt-3 border-l-[3px] border-[#d6b8a5] pl-4 text-sm leading-7">{part.preview.map(line => <p key={line}>{line}</p>)}</div>
      <h4 className="mt-6 text-base font-bold">二、先听一遍，再填空</h4>
      <button type="button" onClick={() => { onHideSubtitle(); onPlaySegment(part.start, part.end) }} className="mt-3 border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-semibold text-white">▶ 播放这一段 · 隐藏字幕</button>
      <div className="mt-4 space-y-3 bg-[#f5f4ef] px-4 py-4 text-sm leading-8 dark:bg-stone-800">
        {part.dictation.map((item, i) => <div key={item.answer}><span>{item.before}</span><input aria-label={`第 ${i + 1} 空`} value={answers[i]} onChange={event => { const next = [...answers]; next[i] = event.target.value; setAnswers(next); setChecked(false) }} className="mx-1 w-28 max-w-full border-b-2 border-stone-400 bg-transparent px-1 text-stone-900 outline-none focus:border-amber-700 dark:text-white" /><span>{item.after}</span>{checked && <span className="ml-2 text-xs text-[#8a614d] dark:text-orange-300">{normalized(answers[i]) === normalized(item.answer) ? '✓' : `参考：${item.answer}`}</span>}</div>)}
        <button type="button" onClick={() => setChecked(true)} className="border border-stone-500 px-3 py-1 text-xs font-semibold">核对填空</button>
      </div>
      <h4 className="mt-6 text-base font-bold">三、中法对照</h4><p className="mt-2 text-xs leading-6 text-stone-500">展开后点击句子，可以回听对应片段。</p>
      <details className="mt-3 border border-[#e7e1d7] dark:border-stone-700"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">展开原文与翻译</summary><div className="divide-y divide-[#eee8dd] px-4 dark:divide-stone-700">{subtitles.map(line => <div key={line.id} className="py-3"><button type="button" onClick={() => onPlaySegment(line.start_time, line.end_time)} className="text-left text-sm font-medium leading-7 underline decoration-[#c8a78e] underline-offset-4">▶ {line.original_text}</button><p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">{line.chinese_text}</p></div>)}</div></details>
      <h4 className="mt-6 text-base font-bold">四、记住这个说法</h4><p className="mt-3 inline-block bg-[#f5e9b8] px-2 py-1 text-base font-semibold text-[#58462f] dark:bg-amber-900 dark:text-amber-100">{part.note.expression}</p><p className="mt-3 text-sm leading-7">{part.note.meaning}</p><div className="mt-3 border-l-[3px] border-[#d6b8a5] pl-4 text-sm leading-7"><p className="text-xs font-semibold text-[#9b6c59]">换个场景</p><p>{part.note.example}</p><p className="text-stone-500">{part.note.translation}</p></div>
      <div className="mt-6 bg-[#faf5df] px-4 py-4 dark:bg-stone-800"><h4 className="text-sm font-bold">五、轮到你说</h4><p className="mt-2 text-sm leading-7">{part.task}</p><details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold">看看一种说法</summary><p className="mt-2 leading-7">{part.answer}</p><p className="mt-1 text-xs text-stone-500">意思相近的其他说法也可以。</p></details></div>
    </section>
  )
}

export function ThirdEpisodeLesson({ subtitles, onPlaySegment, onHideSubtitle }: { subtitles: SubtitleWithHighlights[]; onPlaySegment: (start: number, end: number) => void; onHideSubtitle: () => void }) {
  return (
    <article className="mb-6 border border-[#e6e1d8] bg-[#fffefa] px-5 py-6 text-[#2f302e] sm:px-8 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
      <p className="text-xs font-medium tracking-[0.2em] text-[#a66b52]">NOTES · 本期精读</p><h2 className="mt-3 text-xl font-bold sm:text-2xl">从一个小风扇，学会介绍好物</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">这期分三段。先试着说，再听、填、对照；最后用学到的句子介绍你自己的东西。</p>
      <p className="mt-3 text-xs leading-6 text-stone-500">字幕依据现有转写整理，尚未完成逐句人工听校。</p>
      {PARTS.map((part, index) => <StudyPart key={part.title} part={part} index={index} subtitles={subtitles.filter(line => line.start_time >= part.start && (index === PARTS.length - 1 || line.start_time < PARTS[index + 1].start))} onPlaySegment={onPlaySegment} onHideSubtitle={onHideSubtitle} />)}
      <p className="border-t border-[#e7e1d7] pt-5 text-sm leading-7 text-stone-600 dark:border-stone-700 dark:text-stone-300">学完后可以继续用下面的本期闪卡、跟读和练习复习。</p>
    </article>
  )
}
