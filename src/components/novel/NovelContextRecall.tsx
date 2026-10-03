'use client'

import { useState, type ReactNode, type RefObject } from 'react'
import { normForm } from '@/lib/novel-forms'
import type { NovelTypingContent, NovelTypingNode } from '@/lib/novel-typing'

interface NovelContextRecallProps {
  content: NovelTypingContent
  fontSize: number
  articleRef: RefObject<HTMLElement | null>
  onReveal: (lookup: string) => void
  onPractice: () => void
  enabled: boolean
}

/** Revealing is a learning aid, not evidence of mastery: this mode never writes SRS results. */
export function NovelContextRecall({ content, fontSize, articleRef, onReveal, onPractice, enabled }: NovelContextRecallProps) {
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set())
  const uniqueViewed = new Set(content.blanks.filter(blank => revealed.has(blank.id)).map(blank => normForm(blank.lookup))).size
  const uniqueTotal = new Set(content.blanks.map(blank => normForm(blank.lookup))).size
  const renderNodes = (nodes: NovelTypingNode[], path = 'recall'): ReactNode => nodes.map((node, index) => {
    const key = `${path}-${index}`
    if (node.kind === 'text') return node.text
    if (node.kind === 'paragraph') return <p key={key}>{renderNodes(node.children, key)}</p>
    if (node.kind === 'bold') return <b key={key}>{renderNodes(node.children, key)}</b>
    if (node.kind !== 'blank' && node.kind !== 'repeat') return null
    const { blank } = node
    const shown = revealed.has(blank.id)
    return <span key={key}>
      <button type="button" className="novel-recall-word" data-revealed={shown}
        aria-label={`第 ${blank.id + 1} 处${shown ? '重新遮住' : '查看法语答案'}`}
        aria-pressed={shown} onClick={() => {
          setRevealed(previous => {
            const next = new Set(previous)
            if (shown) next.delete(blank.id)
            else next.add(blank.id)
            return next
          })
          if (!shown) onReveal(blank.lookup)
        }}>
        <span aria-hidden="true">{blank.answer}</span>
      </button>
      {blank.gloss && <i className="zh">（{blank.gloss}）</i>}
    </span>
  })
  if (!enabled) return null
  return <>
    <section className="novel-learning-note" aria-label="遮词回忆说明">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">先想一想，再点空白揭晓</h2>
        <span className="text-xs font-medium" role="status">已展开 {uniqueViewed} / {uniqueTotal} 词</span>
      </div>
      <p className="mt-1 text-sm">中文语境保留，点同一个词可重新遮住。查看答案不计入掌握。</p>
    </section>
    <article ref={articleRef} className="novel-content" data-mode="recall" style={{ fontSize: `${fontSize}px` }}>{renderNodes(content.nodes)}</article>
    <section className="novel-learning-note mt-8 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-bold">能想起来，也试试写出来</h2><p className="mt-1 text-sm">拼写自测会区分独立答对和看过提示后答对。</p></div>
      <button type="button" onClick={onPractice} className="novel-primary-action">开始拼写自测 →</button>
    </section>
  </>
}
