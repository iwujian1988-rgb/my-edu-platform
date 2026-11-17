'use client'

import { useEffect, useId, useMemo, useRef, useState, type MouseEventHandler, type ReactNode, type RefObject } from 'react'
import { Check, Keyboard, PenLine, RotateCcw } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { normForm } from '@/lib/novel-forms'
import { NOVEL_WORD_STATUS_LABELS } from '@/lib/novel-word-status'
import type { NovelWordStatus } from '@/types/database'
import { useNovelInputMethod } from '@/hooks/useNovelInputMethod'
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
  hidden?: boolean
  viewedAnswers?: ReadonlySet<string>
  readingContent: NovelTypingContent
  wordStatuses?: ReadonlyMap<string, NovelWordStatus>
  activeLookup?: string
  handwritingRequest?: string | null
}

export function NovelTypingPractice({
  bookId, content, enabled, hintMode, onHintChange, definitions, fontSize, displayMode,
  articleRef, onArticleClick, onInputFocusChange, hidden = false, viewedAnswers, readingContent, wordStatuses, activeLookup, handwritingRequest,
}: NovelTypingPracticeProps) {
  const [attempts, setAttempts] = useState<Record<number, Attempt>>({})
  const { inputMethod, changeInputMethod } = useNovelInputMethod()
  const handwriting = inputMethod === 'handwriting'
  // Native handwriting may replace a whole token asynchronously. Keep its draft in the DOM,
  // instead of rewriting every field in the story on each recognition update.
  const draftValues = useRef(new Map<number, string>())
  const inputRefs = useRef(new Map<number, HTMLInputElement>())
  const composing = useRef(new Set<number>())
  const [composingId, setComposingId] = useState<number | null>(null)
  const submitted = useRef(new Set<number>())
  const hintSeen = useRef(new Set<number>())
  const [failedSync, setFailedSync] = useState<Record<string, 1 | 2 | 3>>({})
  const [syncing, setSyncing] = useState(false)
  const [revealed, setRevealed] = useState<Record<number, NovelHintMode>>({})
  const [openHint, setOpenHint] = useState<number | null>(null)
  const [focusedBlank, setFocusedBlank] = useState<number | null>(null)
  const modalInput = useRef<HTMLTextAreaElement>(null)
  const handledRequest = useRef<string | null>(null)
  const idPrefix = useId()
  const blankNumbers = useMemo(() => new Map(content.blanks.map((blank, index) => [blank.id, index + 1])), [content.blanks])
  const correctCount = content.blanks.filter((blank) => attempts[blank.id]?.status === 'correct').length
  const complete = content.blanks.length > 0 && correctCount === content.blanks.length
  const assistedCount = content.blanks.filter((blank) => attempts[blank.id]?.status === 'correct' && (attempts[blank.id]?.assisted || attempts[blank.id]?.hadError)).length
  useEffect(() => {
    if (enabled && hintMode !== 'none') content.blanks.forEach((blank) => hintSeen.current.add(blank.id))
  }, [enabled, hintMode, content])
  useEffect(() => {
    if (!handwritingRequest) { handledRequest.current = null; return }
    if (!enabled || !handwritingRequest || handledRequest.current === handwritingRequest) return
    const blank = content.blanks.find(item => normForm(item.lookup) === normForm(handwritingRequest) || normForm(item.lemma || '') === normForm(handwritingRequest))
    if (!blank) return
    handledRequest.current = handwritingRequest
    changeInputMethod('handwriting')
    setFocusedBlank(blank.id)
  }, [enabled, handwritingRequest, content.blanks, changeInputMethod])
  useEffect(() => {
    if (focusedBlank !== null) modalInput.current?.focus({ preventScroll: true })
  }, [focusedBlank])

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
    const correct = check && matchesNovelAnswer(value, blank.answer)
    const assisted = Boolean(attempts[blank.id]?.assisted || hintSeen.current.has(blank.id) || hintMode !== 'none' || revealed[blank.id]
      || viewedAnswers?.has(normForm(blank.lookup)) || (blank.lemma && viewedAnswers?.has(normForm(blank.lemma))))
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

  const checkAndAdvance = (blank: NovelBlank) => {
    const input = inputRefs.current.get(blank.id)
    if (!input || composing.current.has(blank.id)) return
    const value = input.value
    draftValues.current.set(blank.id, value)
    if (!value.trim() || !update(blank, value, true)) { input.focus({ preventScroll: true }); return }
    const position = content.blanks.findIndex(candidate => candidate.id === blank.id)
    const nextBlank = [...content.blanks.slice(position + 1), ...content.blanks.slice(0, position)]
      .find(candidate => attempts[candidate.id]?.status !== 'correct')
    // Synchronous focus preserves the system input session when advancing to the next word.
    const nextInput = nextBlank ? inputRefs.current.get(nextBlank.id) : undefined
    if (nextInput) {
      nextInput.focus({ preventScroll: handwriting })
      if (handwriting) nextInput.scrollIntoView?.({ block: 'nearest', behavior: 'instant' })
    } else if (!handwriting) input.blur()
  }

  const resetAttempts = () => {
    draftValues.current.clear()
    inputRefs.current.forEach(input => { input.value = '' })
    setAttempts({}); setRevealed({}); hintSeen.current.clear()
    inputRefs.current.get(content.blanks[0]?.id)?.focus()
  }

  const renderBlank = (blank: NovelBlank) => {
    const attempt = attempts[blank.id]
    const status = attempt?.status || 'editing'
    const inputId = `${idPrefix}-${blank.id}`
    const number = blankNumbers.get(blank.id) || blank.id + 1
    const activeHint = revealed[blank.id] || hintMode
    const hint = activeHint === 'initial' ? frenchInitial(blank.answer)
      : activeHint === 'zh' ? blank.gloss || definitions.get(normForm(blank.lookup)) || definitions.get(normForm(blank.answer)) || '暂无中文提示'
      : ''
    // The first grid row supplies the text baseline; hints must not shift or widen the field.
    return (
      <span key={blank.id} className={handwriting ? 'novel-handwriting-answer' : 'inline-flex max-w-full min-w-0 items-baseline'}>
      {!handwriting && blank.prefix && <span className="shrink-0 whitespace-pre">{blank.prefix}</span>}
      <span className="novel-blank-field mx-1 my-1 inline-grid max-w-full min-w-0 grid-cols-[minmax(0,1fr)] align-baseline text-left font-medium leading-normal"
        style={handwriting ? undefined : { width: `max(${MIN_INPUT_EM}em, ${Math.min(MAX_INPUT_CHARS, Math.max(MIN_INPUT_CHARS, blank.answer.length + INPUT_PADDING_CHARS))}ch)` }}>
        {handwriting && <span className="novel-handwriting-field-heading">
          <label htmlFor={inputId}><span>{String(number).padStart(2, '0')}</span>填写法语</label>
          <span>{blank.prefix ? <>冠词 <span lang="fr">{blank.prefix.trim()}</span></> : '单词 / 词组'}</span>
        </span>}
        <span className="relative inline-flex min-w-0 items-center">
          <input
            ref={(element) => {
              if (element) inputRefs.current.set(blank.id, element)
              else inputRefs.current.delete(blank.id)
            }}
            id={inputId} type="text" lang="fr" inputMode="text" enterKeyHint="next"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            aria-label={`第 ${handwriting ? number : blank.id + 1} 空，输入法语`}
            aria-describedby={`${inputId}-feedback${hint ? ` ${inputId}-hint` : ''}`}
            aria-invalid={status === 'incorrect'}
            placeholder={handwriting ? '在此书写' : '输入法语'} defaultValue={draftValues.current.get(blank.id) ?? attempt?.value ?? ''}
            style={{ fontSize: handwriting ? 'max(22px, 1em)' : 'max(16px, 1em)' }}
            className={cn(
              'min-h-11 w-full min-w-0 scroll-mt-24 scroll-mb-24 rounded-md border bg-white px-2 py-1 pr-7 font-medium text-[#121729] outline-none placeholder:text-[#68718a] focus:ring-2 focus:ring-[#6550ff] dark:bg-[#192238] dark:text-[#edf1ff] dark:placeholder:text-[#a7b0c8]',
              handwriting && 'novel-handwriting-input',
              status === 'correct' ? 'border-emerald-600 dark:border-emerald-400'
                : status === 'incorrect' ? 'border-rose-600 dark:border-rose-400'
                : 'border-[#a4ace0] dark:border-[#6473aa]',
            )}
            onInput={event => {
              draftValues.current.set(blank.id, event.currentTarget.value)
              if (handwriting && (attempt?.status === 'correct' || attempt?.status === 'incorrect')) update(blank, event.currentTarget.value, false)
            }}
            onChange={(event) => {
              draftValues.current.set(blank.id, event.target.value)
              if (!handwriting) update(blank, event.target.value, false)
            }}
            onCompositionStart={() => { composing.current.add(blank.id); setComposingId(blank.id) }}
            onCompositionEnd={event => {
              draftValues.current.set(blank.id, event.currentTarget.value)
              composing.current.delete(blank.id); setComposingId(null)
            }}
            onBlur={(event) => {
              draftValues.current.set(blank.id, event.target.value)
              // A system handwriting palette can temporarily take focus before its final replacement arrives.
              if (!handwriting && !composing.current.has(blank.id)) update(blank, event.target.value, true)
            }}
            onKeyDown={(event) => {
              // Enter used to accept an IME candidate must not submit or move focus (including Safari).
              if (event.key !== 'Enter' || event.nativeEvent.isComposing || composing.current.has(blank.id) || event.keyCode === IME_KEY_CODE) return
              event.preventDefault()
              // In pen mode Enter may accept a system recognition candidate, so checking stays explicit.
              if (!handwriting) checkAndAdvance(blank)
            }}
          />
          {status === 'correct' && <Check aria-hidden="true" className="pointer-events-none absolute right-2 h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
        </span>
        <span className="novel-blank-assistance">
        {hint && <span id={`${inputId}-hint`} className="min-w-0 break-words pt-1 text-xs text-[#59647e] dark:text-[#bbc4de]">{hint}</span>}
        <span id={`${inputId}-feedback`} role="status" className={cn(
          'min-w-0 break-words text-xs',
          status === 'correct' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300',
        )}>
          {status === 'correct' ? (attempt?.assisted ? '提示后答对' : attempt?.hadError ? '纠正后答对' : '独立答对') : status === 'incorrect' ? '再试一次，注意重音和词形' : ''}
        </span>
        </span>
        {(handwriting || status !== 'correct') && <span className={cn('flex flex-wrap items-center gap-1 text-xs', handwriting && 'novel-handwriting-actions')}>
          {handwriting && <button type="button" disabled={composingId === blank.id}
            onPointerDown={event => event.preventDefault()} onClick={() => checkAndAdvance(blank)}
            className="novel-handwriting-check">{composingId === blank.id ? '识别中…' : '检查并下一空'}</button>}
          {(handwriting || status !== 'correct') && <>
          <button type="button" disabled={handwriting && status === 'correct'} aria-label={`第 ${handwriting ? number : blank.id + 1} 空提示`} aria-expanded={openHint === blank.id}
            className="novel-hint-trigger" onClick={() => setOpenHint(previous => previous === blank.id ? null : blank.id)}>提示{openHint === blank.id ? ' −' : ' +'}</button>
          {openHint === blank.id && <span className={cn('flex flex-wrap gap-1', handwriting && 'novel-handwriting-hint-menu')}>
          {(['zh', 'initial'] as const).map((mode) => <button key={mode} type="button"
            aria-label={`第 ${handwriting ? number : blank.id + 1} 空${mode === 'zh' ? '中文提示' : '首字母提示'}`}
            className="min-h-11 rounded px-1 text-[#59647e] underline focus-visible:ring-2 focus-visible:ring-[#6550ff] dark:text-[#bbc4de]"
            onClick={() => {
              setRevealed((previous) => ({ ...previous, [blank.id]: mode }))
              setOpenHint(null)
              setAttempts((previous) => ({ ...previous, [blank.id]: { value: draftValues.current.get(blank.id) ?? previous[blank.id]?.value ?? '', status: previous[blank.id]?.status || 'editing', hadError: previous[blank.id]?.hadError || false, assisted: true } }))
            }}>{mode === 'zh' ? '中文' : '首字母'}</button>)}
          </span>}
          </>}
        </span>}
      </span>
      </span>
    )
  }

  const renderHandwritingContext = (nodes: NovelTypingNode[], path: string): ReactNode => nodes.map((node, index) => {
    const key = `${path}-${index}`
    if (node.kind === 'text') return node.text
    if (node.kind === 'bold' || node.kind === 'paragraph') return <span key={key}>{renderHandwritingContext(node.children, key)}</span>
    if (node.kind !== 'blank' && node.kind !== 'repeat') return null
    const number = blankNumbers.get(node.blank.id) || node.blank.id + 1
    return <span key={key} className="novel-handwriting-context-gap">
      {node.blank.prefix && <span lang="fr">{node.blank.prefix}</span>}
      <button type="button" aria-label={`填写第 ${number} 空`} data-result={attempts[node.blank.id]?.status || 'editing'}
        onClick={() => {
          setFocusedBlank(node.blank.id)
        }}>{node.kind === 'repeat' ? '同词 ' : ''}{String(number).padStart(2, '0')}</button>
    </span>
  })

  const paragraphBlanks = (nodes: NovelTypingNode[]): NovelBlank[] => nodes.flatMap(node => {
    if (node.kind === 'blank') return [node.blank]
    if (node.kind === 'paragraph' || node.kind === 'bold') return paragraphBlanks(node.children)
    return []
  })

  const renderNodes = (nodes: NovelTypingNode[], path = 'p'): ReactNode => nodes.map((node, index) => {
    const key = `${path}-${index}`
    switch (node.kind) {
      case 'text': return node.text
      case 'blank': return renderBlank(node.blank)
      case 'repeat': return <span key={key} className="text-[#68718a] dark:text-[#a7b0c8]">{attempts[node.blank.id]?.status === 'correct' ? `${node.blank.prefix || ''}${node.blank.answer}` : '〔同词，见前一空〕'}</span>
      // Justification stretches the Chinese text around wide input boxes on narrow screens.
      case 'paragraph': {
        if (!handwriting) return <p key={key} className="!text-left">{renderNodes(node.children, key)}</p>
        return <div key={key} className="novel-handwriting-passage">
          <p className="novel-handwriting-context">{renderHandwritingContext(node.children, key)}</p>
        </div>
      }
      case 'bold': return <b key={key}>{renderNodes(node.children, key)}</b>
    }
  })

  const renderReading = (nodes: NovelTypingNode[], path = 'read'): ReactNode => nodes.map((node, index) => {
    const key = `${path}-${index}`
    if (node.kind === 'text') return node.text
    if (node.kind === 'paragraph') return <p key={key}>{renderReading(node.children, key)}</p>
    if (node.kind === 'bold') return <b key={key}>{renderReading(node.children, key)}</b>
    if (node.kind !== 'blank' && node.kind !== 'repeat') return null
    const status = wordStatuses?.get(normForm(node.blank.lookup)) || 'new'
    return <span key={key}><b className="fw" data-w={node.blank.lookup} role="button" tabIndex={0}
      data-status={status} data-active={Boolean(activeLookup && normForm(activeLookup) === normForm(node.blank.lookup))}
      aria-describedby={`${idPrefix}-word-status-${node.blank.id}`}
      aria-label={displayMode === 'hide-fr' ? `查看第 ${node.blank.id + 1} 处词卡` : `查看词卡：${node.blank.answer}`}>
      {node.blank.answer}
    </b><span id={`${idPrefix}-word-status-${node.blank.id}`} className="sr-only">{NOVEL_WORD_STATUS_LABELS[status]}</span>
    {node.blank.gloss && <i className="zh">（{node.blank.gloss}）</i>}</span>
  })

  if (hidden) return null

  return (
    <>
      {enabled && (
        <section aria-label="输入练习设置" className={cn('novel-learning-note', handwriting && 'novel-handwriting-settings')}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold">{handwriting ? <PenLine className="h-5 w-5" /> : <Keyboard className="h-5 w-5" />}{handwriting ? '手写练习' : '写出来，才是真的记住'}</h2>
            <span role="status" className="text-sm font-semibold text-[#2d39bb] dark:text-[#bcc5ff]">
              {complete ? '本章全部答对！' : `已答对 ${correctCount} / ${content.blanks.length} 空`}
            </span>
          </div>
          <div className="novel-practice-progress" aria-hidden="true"><span style={{ width: `${content.blanks.length ? correctCount / content.blanks.length * 100 : 0}%` }} /></div>
          <p className="mb-3 text-sm leading-relaxed text-[#59647e] dark:text-[#bbc4de]">
            {handwriting ? '点正文中的编号，打开大面积手写区域。写完后确认并进入下一空。' : '保留冠词，只填核心词；词组整体填写。回车检查，答对跳到下一空。'}
          </p>
          <div className="novel-practice-options">
          <div className="novel-input-method-group" role="group" aria-label="输入方式">
            <p className="novel-input-method-label">输入方式</p>
            <div className="flex gap-2">
            <button type="button" aria-pressed={!handwriting} onPointerDown={event => event.preventDefault()} onClick={() => changeInputMethod('keyboard')} className="novel-input-method"><Keyboard className="h-4 w-4" />键盘输入</button>
            <button type="button" aria-pressed={handwriting} onPointerDown={event => event.preventDefault()} onClick={() => changeInputMethod('handwriting')} className="novel-input-method"><PenLine className="h-4 w-4" />手写笔</button>
          </div>
          </div>
          <NovelTypingHints value={hintMode} onChange={onHintChange} />
          </div>
          {complete && (
            <button type="button" onClick={resetAttempts} className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#2d39bb] focus-visible:ring-2 focus-visible:ring-[#6550ff] dark:text-[#bcc5ff]">
              <RotateCcw className="h-4 w-4" />再练一次
            </button>
          )}
          <div className="novel-practice-summary">
          <p className="mt-3 text-xs leading-relaxed text-[#68718a] dark:text-[#a7b0c8]">独立答对 {correctCount - assistedCount} 个 · 待巩固 {assistedCount} 个</p>
          <details className="mt-1 text-xs leading-relaxed"><summary className="cursor-pointer py-2">复习记录怎么算？</summary><p>首次答对只记待巩固；看过答案、使用提示或纠正后答对不算独立回忆。本页反复练习不会重复延长复习间隔。</p></details>
          </div>
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
          ref={articleRef} className="novel-content" data-mode="typing" data-input-method={inputMethod} style={{ fontSize: `${fontSize}px` }}
          onFocusCapture={(event) => { if (event.target instanceof HTMLInputElement) onInputFocusChange(true) }}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onInputFocusChange(false) }}
        >{renderNodes(content.nodes)}</article>
      ) : (
        <article ref={articleRef} className="novel-content" data-mode={displayMode} style={{ fontSize: `${fontSize}px` }} onClick={onArticleClick}
          onKeyDown={event => {
            if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLElement && event.target.matches('b.fw')) {
              event.preventDefault()
              event.target.click()
            }
          }}>{renderReading(readingContent.nodes)}</article>
      )}
      {enabled && <NovelRecallReview
        inputMethod={inputMethod}
        retryWords={complete ? content.blanks.filter((blank) => attempts[blank.id]?.assisted || attempts[blank.id]?.hadError) : []}
        articleWords={content.blanks.filter((blank) => /^(le|la)\s+$/i.test(blank.prefix || ''))}
        definitions={definitions}
      />}
      {enabled && handwriting && focusedBlank !== null && (() => {
        const blank = content.blanks.find(item => item.id === focusedBlank)
        if (!blank) return null
        const paragraphs = content.nodes.filter(node => node.kind === 'paragraph')
        const index = paragraphs.findIndex(node => node.kind === 'paragraph' && paragraphBlanks(node.children).some(item => item.id === blank.id))
        const contextText = (nodes: NovelTypingNode[]): ReactNode => nodes.map((node, i) => {
          if (node.kind === 'text') return node.text
          if (node.kind === 'paragraph' || node.kind === 'bold') return <span key={i}>{contextText(node.children)}</span>
          if (node.kind !== 'blank' && node.kind !== 'repeat') return null
          if (node.blank.id === blank.id) return <span className="novel-focus-missing" key={i}>{blank.gloss || definitions.get(normForm(blank.lookup)) || '填写法语'}</span>
          return node.blank.gloss ? `（${node.blank.gloss}）` : '〔词语〕'
        })
        const paragraphText = (offset: number) => {
          const paragraph = paragraphs[index + offset]
          return paragraph?.kind === 'paragraph' ? contextText(paragraph.children) : null
        }
        const attempt = attempts[blank.id]
        const nextBlank = content.blanks.slice(content.blanks.indexOf(blank) + 1).find(item => attempts[item.id]?.status !== 'correct')
          || content.blanks.slice(0, content.blanks.indexOf(blank)).find(item => attempts[item.id]?.status !== 'correct')
        const hint = revealed[blank.id] || hintMode
        return <DialogPrimitive.Root open onOpenChange={open => { if (!open) setFocusedBlank(null) }}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="novel-focus-overlay" />
            <DialogPrimitive.Content className="novel-focus-dialog" onOpenAutoFocus={event => { event.preventDefault(); modalInput.current?.focus({ preventScroll: true }) }}>
              <header className="novel-focus-header"><DialogPrimitive.Title><PenLine className="h-4 w-4" />手写专注 <span>{blankNumbers.get(blank.id)} / {content.blanks.length}</span></DialogPrimitive.Title>
                <DialogPrimitive.Close className="novel-focus-close">回到故事 ×</DialogPrimitive.Close></header>
              <DialogPrimitive.Description className="sr-only">根据上下文写出法语，完成后点确认并下一词。</DialogPrimitive.Description>
              <div className="novel-focus-context novel-focus-context-top"><p className="novel-focus-far">{paragraphText(-1)}</p><p className="novel-focus-near">{paragraphText(0)}</p></div>
              <div className="novel-focus-writing"><div className="novel-focus-label"><span>写出法语 · {blank.gloss || definitions.get(normForm(blank.lookup)) || '单词 / 词组'}</span><span>系统全局手写</span></div>
                <div className="novel-focus-field">{blank.prefix && <span className="novel-focus-prefix" lang="fr">{blank.prefix}</span>}
                  <textarea key={blank.id} ref={modalInput} lang="fr" aria-label={`第 ${blankNumbers.get(blank.id)} 空，输入法语`} aria-invalid={attempt?.status === 'incorrect'}
                    autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="在这里写" defaultValue={draftValues.current.get(blank.id) ?? attempt?.value ?? ''}
                    onInput={event => { draftValues.current.set(blank.id, event.currentTarget.value); if (attempt?.status === 'incorrect') update(blank, event.currentTarget.value, false) }}
                    onCompositionStart={() => { composing.current.add(blank.id); setComposingId(blank.id) }}
                    onCompositionEnd={event => { draftValues.current.set(blank.id, event.currentTarget.value); composing.current.delete(blank.id); setComposingId(null) }}
                    onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault() }} />
                  <span className="novel-focus-tip">书写中不会自动跳词</span></div></div>
              <div className="novel-focus-context novel-focus-context-bottom"><p className="novel-focus-near">{paragraphText(1)}</p><p className="novel-focus-far">{paragraphText(2)}</p></div>
              <footer className="novel-focus-footer"><div><button type="button" onClick={() => { hintSeen.current.add(blank.id); setRevealed(previous => ({ ...previous, [blank.id]: 'initial' })) }}>首字母提示</button>
                {hint !== 'none' && <span>{hint === 'initial' ? frenchInitial(blank.answer) : blank.gloss || definitions.get(normForm(blank.lookup))}</span>}
                <span role="status">{attempt?.status === 'incorrect' ? '再试一次，注意重音和词形' : ''}</span></div>
                <button type="button" className="novel-focus-confirm" disabled={composingId === blank.id} onPointerDown={event => event.preventDefault()} onClick={() => {
                  const value = modalInput.current?.value || ''
                  if (composing.current.has(blank.id) || !value.trim()) { modalInput.current?.focus({ preventScroll: true }); return }
                  draftValues.current.set(blank.id, value)
                  if (!update(blank, value, true)) { modalInput.current?.focus({ preventScroll: true }); return }
                  if (nextBlank) setFocusedBlank(nextBlank.id); else setFocusedBlank(null)
                }}>{composingId === blank.id ? '识别中…' : nextBlank ? '确认并下一词 →' : '确认并完成'}</button></footer>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      })()}
    </>
  )
}
