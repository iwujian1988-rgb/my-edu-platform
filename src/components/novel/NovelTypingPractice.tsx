'use client'

import { useId, useRef, useState, type MouseEventHandler, type ReactNode, type RefObject } from 'react'
import { Check, Keyboard, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normForm } from '@/lib/novel-forms'
import {
  frenchInitial, matchesNovelAnswer,
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
}

interface NovelTypingPracticeProps {
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
  content, enabled, hintMode, onHintChange, definitions, fontSize, displayMode,
  articleRef, onArticleClick, onInputFocusChange,
}: NovelTypingPracticeProps) {
  const [attempts, setAttempts] = useState<Record<number, Attempt>>({})
  const inputRefs = useRef(new Map<number, HTMLInputElement>())
  const composing = useRef(new Set<number>())
  const idPrefix = useId()
  const correctCount = content.blanks.filter((blank) => attempts[blank.id]?.status === 'correct').length
  const complete = content.blanks.length > 0 && correctCount === content.blanks.length

  const update = (blank: NovelBlank, value: string, check: boolean): boolean => {
    const correct = matchesNovelAnswer(value, blank.answer)
    setAttempts((previous) => ({
      ...previous,
      [blank.id]: { value, status: check && value.trim() ? (correct ? 'correct' : 'incorrect') : 'editing' },
    }))
    return correct
  }

  const renderBlank = (blank: NovelBlank) => {
    const attempt = attempts[blank.id]
    const status = attempt?.status || 'editing'
    const inputId = `${idPrefix}-${blank.id}`
    const hint = hintMode === 'initial' ? frenchInitial(blank.answer)
      : hintMode === 'zh' ? blank.gloss || definitions.get(normForm(blank.lookup)) || definitions.get(normForm(blank.answer)) || '暂无中文提示'
      : ''
    return (
      <span key={blank.id} className="mx-1 my-1 inline-flex max-w-full flex-col align-middle text-left leading-normal">
        <span className="relative inline-flex max-w-full items-center">
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
            style={{ width: `${Math.min(MAX_INPUT_CHARS, Math.max(MIN_INPUT_CHARS, blank.answer.length + INPUT_PADDING_CHARS))}ch`, fontSize: 'max(16px, 1em)' }}
            className={cn(
              'min-h-11 max-w-full scroll-mt-24 scroll-mb-24 rounded-md border bg-white px-2 py-1 pr-7 font-medium text-[#121729] outline-none placeholder:text-[#68718a] focus:ring-2 focus:ring-[#6550ff] dark:bg-[#192238] dark:text-[#edf1ff] dark:placeholder:text-[#a7b0c8]',
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
              const nextBlank = [...content.blanks.slice(blank.id + 1), ...content.blanks.slice(0, blank.id)]
                .find((candidate) => attempts[candidate.id]?.status !== 'correct')
              // Focus synchronously in the key event so mobile browsers can keep the keyboard open.
              if (nextBlank) inputRefs.current.get(nextBlank.id)?.focus()
              else event.currentTarget.blur()
            }}
          />
          {status === 'correct' && <Check aria-hidden="true" className="pointer-events-none absolute right-2 h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
        </span>
        {hint && <span id={`${inputId}-hint`} className="max-w-[28ch] break-words pt-1 text-xs text-[#59647e] dark:text-[#bbc4de]">{hint}</span>}
        <span id={`${inputId}-feedback`} role="status" className={cn(
          'max-w-[28ch] text-xs',
          status === 'correct' ? 'sr-only' : 'text-rose-700 dark:text-rose-300',
        )}>
          {status === 'correct' ? `第 ${blank.id + 1} 空正确` : status === 'incorrect' ? '再试一次，注意重音和词形' : ''}
        </span>
      </span>
    )
  }

  const renderNodes = (nodes: NovelTypingNode[], path = 'p'): ReactNode => nodes.map((node, index) => {
    const key = `${path}-${index}`
    switch (node.kind) {
      case 'text': return node.text
      case 'blank': return renderBlank(node.blank)
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
            点空格输入原文法语词或词组，回车或离开输入框检查；答对后回车跳到下一空。重音也要写对。
          </p>
          <NovelTypingHints value={hintMode} onChange={onHintChange} />
          {complete && (
            <button type="button" onClick={() => { setAttempts({}); inputRefs.current.get(0)?.focus() }} className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#2d39bb] focus-visible:ring-2 focus-visible:ring-[#6550ff] dark:text-[#bcc5ff]">
              <RotateCcw className="h-4 w-4" />再练一次
            </button>
          )}
          <p className="mt-3 text-xs leading-relaxed text-[#68718a] dark:text-[#a7b0c8]">提示也可随时在顶部“字号与显示”中切换。退出再开启会保留本页答案；刷新或换章后重置，不计入词库掌握度。</p>
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
    </>
  )
}
