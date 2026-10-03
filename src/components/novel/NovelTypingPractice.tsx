'use client'

import { useEffect, useId, useRef, useState, type MouseEventHandler, type ReactNode, type RefObject } from 'react'
import { Check, Keyboard, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normForm } from '@/lib/novel-forms'
import { NovelRecallReview } from './NovelRecallReview'
import {
  frenchInitial, matchesNovelAnswer, novelTypingQuality,
  type NovelBlank, type NovelHintMode, type NovelTypingContent, type NovelTypingNode,
} from '@/lib/novel-typing'

const HINT_OPTIONS: ReadonlyArray<{ value: NovelHintMode; label: string }> = [
  { value: 'none', label: '无提示' },
  { value: 'zh', label: '中文提示' },
  { value: 'initial', label: '首字母提示' },
]
const MIN_INPUT_CHARS = 9
const MAX_INPUT_CHARS = 28
const INPUT_PADDING_CHARS = 3
const MIN_INPUT_EM = 7
const IME_KEY_CODE = 229

export function NovelTypingHints({ value, onChange }: {
  value: NovelHintMode
  onChange: (mode: NovelHintMode) => void
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-[#68718a] dark:text-[#a7b0c8]">输入提示</legend>
      <div className="grid grid-cols-3 gap-2">
        {HINT_OPTIONS.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              type="radio" name={name} value={option.value} checked={value === option.value}
              onChange={() => onChange(option.value)} className="peer sr-only"
            />
            <span className={cn(
              'flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border px-2 text-center text-xs font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-[#6550ff] peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-[#141b2d] sm:text-sm',
              value === option.value
                ? 'border-[#3447dd] bg-[#3447dd] text-white dark:border-[#687aff] dark:bg-[#4657c7]'
                : 'border-[#e7eaf2] bg-white text-[#3c4459] hover:bg-[#f3f5fb] dark:border-[#35415d] dark:bg-[#192238] dark:text-[#c5cce0] dark:hover:bg-[#25304a]',
            )}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface Attempt {
  value: string
  status: 'editing' | 'correct' | 'incorrect'
  assisted: boolean
  hadError: boolean
}

interface NovelTypingPracticeProps {
  bookId: string
  content: NovelTypingContent
  enabled: boolean
  hintMode: NovelHintMode
  onHintChange: (mode: NovelHintMode) => void
  definitions: ReadonlyMap<string, string>
  fontSize: number
  displayMode: string
  articleRef: RefObject<HTMLElement | null>
  onArticleClick: MouseEventHandler<HTMLElement>
  onInputFocusChange: (focused: boolean) => void
}

export function NovelTypingPractice({
  bookId, content, enabled, hintMode, onHintChange, definitions, fontSize, displayMode,
  articleRef, onArticleClick, onInputFocusChange,
}: NovelTypingPracticeProps) {
  const [attempts, setAttempts] = useState<Record<number, Attempt>>({})
  const inputRefs = useRef(new Map<number, HTMLInputElement>())
  const composing = useRef(new Set<number>())
  const submitted = useRef(new Set<number>())
  const hintSeen = useRef(new Set<number>())
  const [failedSync, setFailedSync] = useState<Record<string, 1 | 2 | 3>>({})
  const [syncing, setSyncing] = useState(false)
  const [revealed, setRevealed] = useState<Record<number, NovelHintMode>>({})
  const idPrefix = useId()
  const correctCount = content.blanks.filter((blank) => attempts[blank.id]?.status === 'correct').length
  const complete = content.blanks.length > 0 && correctCount === content.blanks.length
  const assistedCount = content.blanks.filter((blank) => attempts[blank.id]?.status === 'correct' && (attempts[blank.id]?.assisted || attempts[blank.id]?.hadError)).length
  useEffect(() => {
    if (enabled && hintMode !== 'none') content.blanks.forEach((blank) => hintSeen.current.add(blank.id))
  }, [enabled, hintMode, content])

  const syncResult = async (lemma: string, quality: 1 | 2 | 3) => {
    try {
      const response = await fetch(`/api/novel/${bookId}/progress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'typing', lemma, quality }),
      })
      if (!response.ok) throw new Error('Typing progress sync failed')
      setFailedSync((previous) => {
        const next = { ...previous }; delete next[lemma]; return next
      })
    } catch {
      // Keep failed results available for explicit retry instead of claiming they were saved.
      setFailedSync((previous) => ({ ...previous, [lemma]: quality }))
    }
  }

  const update = (blank: NovelBlank, value: string, check: boolean): boolean => {
    const correct = matchesNovelAnswer(value, blank.answer)
    const assisted = Boolean(attempts[blank.id]?.assisted || hintSeen.current.has(blank.id) || hintMode !== 'none' || revealed[blank.id])
    const hadError = Boolean(attempts[blank.id]?.hadError || (check && value.trim() && !correct))
    setAttempts((previous) => ({
      ...previous,
      [blank.id]: { value, assisted, hadError, status: check && value.trim() ? (correct ? 'correct' : 'incorrect') : 'editing' },
    }))
    // One long-term review per word per mounted session; immediate retries are not spaced recalls.
    if (check && value.trim() && !submitted.current.has(blank.id)) {
      submitted.current.add(blank.id)
      void syncResult(blank.lemma || blank.lookup, novelTypingQuality(correct, assisted || hadError))
    }
    return correct
  }

  const renderBlank = (blank: NovelBlank) => {
    const attempt = attempts[blank.id]
    const status = attempt?.status || 'editing'
    const inputId = `${idPrefix}-${blank.id}`
    const activeHint = revealed[blank.id] || hintMode
    const hint = activeHint === 'initial' ? frenchInitial(blank.answer)
      : activeHint === 'zh' ? blank.gloss || definitions.get(normForm(blank.lookup)) || definitions.get(normForm(blank.answer)) || '暂无中文提示'
      : ''
    // The first grid row supplies the text baseline; hints must not shift or widen the field.
    return (
      <span key={blank.id} className="inline-flex max-w-full items-baseline">
      {blank.prefix && <span className="shrink-0 whitespace-pre">{blank.prefix}</span>}
      <span className="mx-1 my-1 inline-grid max-w-full grid-cols-[minmax(0,1fr)] align-baseline text-left font-medium leading-normal"
        style={{ width: `max(${MIN_INPUT_EM}em, ${Math.min(MAX_INPUT_CHARS, Math.max(MIN_INPUT_CHARS, blank.answer.length + INPUT_PADDING_CHARS))}ch)` }}>
        <span className="relative inline-flex min-w-0 items-center">
          <input
            ref={(element) => {
              if (element) inputRefs.current.set(blank.id, element)
              else inputRefs.current.delete(blank.id)
            }}
            id={inputId} type="text" lang="fr" inputMode="text" enterKeyHint="next"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            aria-label={`第 ${blank.id + 1} 空，输入法语`}
            aria-describedby={`${inputId}-feedback${hint ? ` ${inputId}-hint` : ''}`}
            aria-invalid={status === 'incorrect'}
            placeholder="输入法语" value={attempt?.value || ''}
            style={{ fontSize: 'max(16px, 1em)' }}
            className={cn(
              'min-h-11 w-full min-w-0 scroll-mt-24 scroll-mb-24 rounded-md border bg-white px-2 py-1 pr-7 font-medium text-[#121729] outline-none placeholder:text-[#68718a] focus:ring-2 focus:ring-[#6550ff] dark:bg-[#192238] dark:text-[#edf1ff] dark:placeholder:text-[#a7b0c8]',
              status === 'correct' ? 'border-emerald-600 dark:border-emerald-400'
                : status === 'incorrect' ? 'border-rose-600 dark:border-rose-400'
                : 'border-[#a4ace0] dark:border-[#6473aa]',
            )}
            onChange={(event) => update(blank, event.target.value, false)}
            onCompositionStart={() => composing.current.add(blank.id)}
            onCompositionEnd={() => composing.current.delete(blank.id)}
            onBlur={(event) => {
              if (!composing.current.has(blank.id)) update(blank, event.target.value, true)
            }}
            onKeyDown={(event) => {
              // Enter used to accept an IME candidate must not submit or move focus (including Safari).
              if (event.key !== 'Enter' || event.nativeEvent.isComposing || composing.current.has(blank.id) || event.keyCode === IME_KEY_CODE) return
              event.preventDefault()
              if (!update(blank, event.currentTarget.value, true)) return
              const position = content.blanks.findIndex((candidate) => candidate.id === blank.id)
              const nextBlank = [...content.blanks.slice(position + 1), ...content.blanks.slice(0, position)]
                .find((candidate) => attempts[candidate.id]?.status !== 'correct')
              // Focus synchronously in the key event so mobile browsers can keep the keyboard open.
              if (nextBlank) inputRefs.current.get(nextBlank.id)?.focus()
              else event.currentTarget.blur()
            }}
          />
          {status === 'correct' && <Check aria-hidden="true" className="pointer-events-none absolute right-2 h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
        </span>
        {hint && <span id={`${inputId}-hint`} className="min-w-0 break-words pt-1 text-xs text-[#59647e] dark:text-[#bbc4de]">{hint}</span>}
        <span id={`${inputId}-feedback`} role="status" className={cn(
          'min-w-0 break-words text-xs',
          status === 'correct' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300',
        )}>
          {status === 'correct' ? (attempt?.assisted ? '提示后答对' : attempt?.hadError ? '纠正后答对' : '独立答对') : status === 'incorrect' ? '再试一次，注意重音和词形' : ''}
        </span>
        {status !== 'correct' && <span className="flex flex-wrap gap-1 text-xs">
          {(['zh', 'initial'] as const).map((mode) => <button key={mode} type="button"
            aria-label={`第 ${blank.id + 1} 空${mode === 'zh' ? '中文提示' : '首字母提示'}`}
            className="min-h-11 rounded px-1 text-[#59647e] underline focus-visible:ring-2 focus-visible:ring-[#6550ff] dark:text-[#bbc4de]"
            onClick={() => {
              setRevealed((previous) => ({ ...previous, [blank.id]: mode }))
              setAttempts((previous) => ({ ...previous, [blank.id]: { value: previous[blank.id]?.value || '', status: previous[blank.id]?.status || 'editing', hadError: previous[blank.id]?.hadError || false, assisted: true } }))
            }}>{mode === 'zh' ? '中文' : '首字母'}</button>)}
        </span>}
      </span>
      </span>
    )
  }

  const renderNodes = (nodes: NovelTypingNode[], path = 'p'): ReactNode => nodes.map((node, index) => {
    const key = `${path}-${index}`
    switch (node.kind) {
      case 'text': return node.text
      case 'blank': return renderBlank(node.blank)
      case 'repeat': return <span key={key} className="text-[#68718a] dark:text-[#a7b0c8]">{attempts[node.blank.id]?.status === 'correct' ? `${node.blank.prefix || ''}${node.blank.answer}` : '〔同词，见前一空〕'}</span>
      // Justification stretches the Chinese text around wide input boxes on narrow screens.
      case 'paragraph': return <p key={key} className="!text-left">{renderNodes(node.children, key)}</p>
      case 'bold': return <b key={key}>{renderNodes(node.children, key)}</b>
    }
  })

  return (
    <>
      {enabled && (
        <section aria-label="输入练习设置" className="mb-6 rounded-xl border border-[#dce1f2] bg-[#f1f4ff] p-4 dark:border-[#35415d] dark:bg-[#141b2d]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold"><Keyboard className="h-5 w-5" />输入练习</h2>
            <span role="status" className="text-sm font-semibold text-[#2d39bb] dark:text-[#bcc5ff]">
              {complete ? '本章全部答对！' : `已答对 ${correctCount} / ${content.blanks.length} 空`}
            </span>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-[#59647e] dark:text-[#bbc4de]">
            每个词本章只考一次。冠词留在外面，只填单词；固定词组整体填写。回车或离开输入框检查，答对后回车跳到下一空。
          </p>
          <NovelTypingHints value={hintMode} onChange={onHintChange} />
          {complete && (
            <button type="button" onClick={() => { setAttempts({}); setRevealed({}); hintSeen.current.clear(); inputRefs.current.get(content.blanks[0]?.id)?.focus() }} className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#2d39bb] focus-visible:ring-2 focus-visible:ring-[#6550ff] dark:text-[#bcc5ff]">
              <RotateCcw className="h-4 w-4" />再练一次
            </button>
          )}
          <p className="mt-3 text-xs leading-relaxed text-[#68718a] dark:text-[#a7b0c8]">独立答对 {correctCount - assistedCount} 个 · 辅助或纠正后答对 {assistedCount} 个。首次答对只记待巩固；本页反复练习不会重复延长复习间隔。</p>
          {content.blanks.length === 0 && <p role="status">本章词汇均未到复习时间，可以继续阅读，或去词库主动复习。</p>}
          {Object.keys(failedSync).length > 0 && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">复习记录未同步，答案仍保留在本页。<button type="button" disabled={syncing} className="min-h-11 px-2 underline" onClick={async () => {
            setSyncing(true)
            await Promise.all(Object.entries(failedSync).map(([lemma, quality]) => syncResult(lemma, quality)))
            setSyncing(false)
          }}>{syncing ? '同步中…' : '重试同步'}</button></p>}
        </section>
      )}
      {enabled ? (
        <article
          ref={articleRef} className="novel-content" data-mode="typing" style={{ fontSize: `${fontSize}px` }}
          onFocusCapture={(event) => { if (event.target instanceof HTMLInputElement) onInputFocusChange(true) }}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onInputFocusChange(false) }}
        >{renderNodes(content.nodes)}</article>
      ) : (
        <article ref={articleRef} className="novel-content" data-mode={displayMode} style={{ fontSize: `${fontSize}px` }} onClick={onArticleClick} dangerouslySetInnerHTML={{ __html: content.html }} />
      )}
      {enabled && <NovelRecallReview
        retryWords={complete ? content.blanks.filter((blank) => attempts[blank.id]?.assisted || attempts[blank.id]?.hadError) : []}
        articleWords={content.blanks.filter((blank) => /^(le|la)\s+$/i.test(blank.prefix || ''))}
        definitions={definitions}
      />}
    </>
  )
}
