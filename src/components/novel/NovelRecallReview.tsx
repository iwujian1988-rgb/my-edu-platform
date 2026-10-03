'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { normForm } from '@/lib/novel-forms'
import { frenchInitial, matchesNovelAnswer, NOVEL_RETRY_GAP, type NovelBlank } from '@/lib/novel-typing'

const CONTROL_STYLE = 'min-h-11 rounded-lg border border-[#a4ace0] bg-white px-3 text-sm font-semibold text-[#121729] focus-visible:ring-2 focus-visible:ring-[#6550ff] dark:border-[#6473aa] dark:bg-[#192238] dark:text-[#edf1ff]'

/** This is consolidation, not another long-term review; it never writes to the SRS API. */
export function NovelRecallReview({ retryWords, articleWords, definitions }: {
  retryWords: NovelBlank[]
  articleWords: NovelBlank[]
  definitions: ReadonlyMap<string, string>
}) {
  const [queue, setQueue] = useState<NovelBlank[] | null>(null)
  const [mode, setMode] = useState<'spelling' | 'article'>('spelling')
  const [value, setValue] = useState('')
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [hint, setHint] = useState(false)
  const current = queue?.[0]

  const start = (nextMode: 'spelling' | 'article') => {
    setMode(nextMode)
    setQueue(nextMode === 'spelling' ? retryWords : articleWords)
    setValue(''); setResult(null); setHint(false)
  }
  const next = () => {
    if (!current || !result) return
    const remaining = queue?.slice(1) || []
    if (result === 'incorrect' || hint) remaining.splice(Math.min(NOVEL_RETRY_GAP, remaining.length), 0, current)
    setQueue(remaining); setValue(''); setResult(null); setHint(false)
  }
  const check = (answer: string) => {
    const expected = mode === 'article' ? current?.prefix?.trim() || '' : current?.answer || ''
    setResult(matchesNovelAnswer(answer, expected) ? 'correct' : 'incorrect')
  }

  if (!retryWords.length && !articleWords.length && queue === null) return null
  return <section aria-label="单词补练" className="my-6 rounded-xl border border-[#dce1f2] bg-[#f1f4ff] p-4 text-[#121729] dark:border-[#35415d] dark:bg-[#141b2d] dark:text-[#edf1ff]">
    <h2 className="mb-2 font-bold">单词补练</h2>
    <p className="mb-3 text-sm text-[#59647e] dark:text-[#bbc4de]">先练错词和提示词，冠词单独练。答错或用提示的词隔几题再出现；补练不重复增加词库复习次数。</p>
    <div className="mb-4 flex flex-wrap gap-2">
      <button type="button" className={CONTROL_STYLE} disabled={!retryWords.length} onClick={() => start('spelling')}>拼写补练（{retryWords.length}）</button>
      <button type="button" className={CONTROL_STYLE} disabled={!articleWords.length} onClick={() => start('article')}>冠词练习（{articleWords.length}）</button>
    </div>
    {queue?.length === 0 && <p role="status">本轮补练完成！之后还要按词库安排复习。</p>}
    {current && <div>
      <p className="mb-2 text-sm">{mode === 'article' ? '选择原文中的冠词' : '根据中文回忆法语'} · 剩余 {queue?.length} 题</p>
      <p className="mb-3 text-lg font-semibold">{mode === 'article' && <span lang="fr">{current.answer} · </span>}{current.gloss || definitions.get(normForm(current.lookup)) || '结合刚才的故事回忆这个词'}</p>
      {mode === 'article' ? <div className="flex gap-2">{['le', 'la'].map((article) => <button key={article} type="button" disabled={result !== null} className={CONTROL_STYLE} onClick={() => check(article)}>{article}</button>)}</div>
        : <form onSubmit={(event) => { event.preventDefault(); if (!result && value.trim()) check(value) }}>
          <input aria-label="补练法语单词" lang="fr" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={value} disabled={result !== null}
            onChange={(event) => setValue(event.target.value)} className={cn(CONTROL_STYLE, 'w-full text-base')} />
          {hint && <p className="mt-2 text-sm">{frenchInitial(current.answer)}</p>}
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={result !== null || !value.trim()} className={CONTROL_STYLE}>检查答案</button>
            <button type="button" disabled={result !== null} className={CONTROL_STYLE} onClick={() => setHint(true)}>首字母提示</button>
          </div>
        </form>}
      {result && <div className="mt-3">
        <p role="status" className={result === 'correct' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>{result === 'correct' ? (hint ? '提示后答对，稍后再练' : '答对了') : `正确答案：${mode === 'article' ? current.prefix : ''}${current.answer}，稍后再练`}</p>
        <button type="button" className={cn(CONTROL_STYLE, 'mt-2')} onClick={next}>下一题</button>
      </div>}
    </div>}
  </section>
}
