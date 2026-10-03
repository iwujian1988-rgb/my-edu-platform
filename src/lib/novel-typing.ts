import { normForm } from './novel-forms'
import { sanitizeNovelHtml, wrapZhGlosses } from './novelSanitize'

export type NovelHintMode = 'none' | 'zh' | 'initial'

export interface NovelBlank {
  id: number
  answer: string
  lookup: string
  gloss: string
  prefix?: string
  lemma?: string
}

export type NovelTypingNode =
  | { kind: 'text'; text: string }
  | { kind: 'paragraph' | 'bold'; children: NovelTypingNode[] }
  | { kind: 'blank'; blank: NovelBlank }
  | { kind: 'repeat'; blank: NovelBlank }

export interface NovelTypingContent {
  html: string
  nodes: NovelTypingNode[]
  blanks: NovelBlank[]
}

export const EMPTY_NOVEL_TYPING_CONTENT: NovelTypingContent = { html: '', nodes: [], blanks: [] }

export interface NovelTypingSchedule {
  status: string
  next_review_at: string | null
}

/** Only standalone nouns are split: multiword expressions retain their original answer. */
export function splitNovelArticle(answer: string): { prefix: string; answer: string } {
  const match = answer.match(/^(le\s+|la\s+|l['’])([\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*)$/iu)
  return match ? { prefix: match[1], answer: match[2] } : { prefix: '', answer }
}

/** Keep source occurrences intact for the reader; only the exercise is deduplicated. */
export function buildNovelPracticeContent(
  content: NovelTypingContent,
  lemmas: ReadonlyMap<string, string>,
  schedules: ReadonlyMap<string, NovelTypingSchedule>,
  now = Date.now(),
): NovelTypingContent {
  const selected = new Map<string, NovelBlank>()
  const transform = (nodes: NovelTypingNode[]): NovelTypingNode[] => nodes.map((node) => {
    if (node.kind === 'paragraph' || node.kind === 'bold') return { ...node, children: transform(node.children) }
    if (node.kind !== 'blank') return node
    const lemma = lemmas.get(normForm(node.blank.lookup)) || node.blank.lookup
    const key = normForm(lemma)
    const existing = selected.get(key)
    if (existing) return { kind: 'repeat', blank: { ...node.blank, ...splitNovelArticle(node.blank.answer), id: existing.id } }
    const schedule = schedules.get(key)
    const due = schedule?.next_review_at ? Date.parse(schedule.next_review_at) : Number.NaN
    // Future known words remain readable; unknown/vague words are never excluded by a future date.
    if (schedule?.status === 'known' && Number.isFinite(due) && due > now) {
      return { kind: 'text', text: node.blank.answer }
    }
    const blank = { ...node.blank, ...splitNovelArticle(node.blank.answer), lemma }
    selected.set(key, blank)
    return { kind: 'blank', blank }
  })
  const nodes = transform(content.nodes)
  return { html: content.html, nodes, blanks: [...selected.values()] }
}

export const NOVEL_MASTERY_REPETITIONS = 2
export const NOVEL_RETRY_GAP = 3

/** Local retries consolidate recall but must not advance the long-term schedule repeatedly. */
export function novelTypingQuality(correct: boolean, assisted: boolean): 1 | 2 | 3 {
  return !correct ? 1 : assisted ? 2 : 3
}

/** Retain accents: formatting from a mobile keyboard is not a spelling mistake. */
export function matchesNovelAnswer(value: string, answer: string): boolean {
  const normalize = (text: string) => normForm(text.normalize('NFC')).replace(/\s*'\s*/g, "'")
  return Boolean(value.trim()) && normalize(value) === normalize(answer)
}

export function frenchInitial(answer: string): string {
  const letter = answer.normalize('NFC').match(/\p{L}/u)?.[0]
  return letter ? `${letter}…` : '…'
}

/** The normal reader and exercises share one sanitizer and one source of word markers. */
export function parseNovelTypingContent(rawHtml: string): NovelTypingContent {
  if (typeof document === 'undefined' || !rawHtml) return EMPTY_NOVEL_TYPING_CONTENT
  const html = wrapZhGlosses(sanitizeNovelHtml(rawHtml))
  const template = document.createElement('template')
  template.innerHTML = html
  const blanks: NovelBlank[] = []

  const parseChildren = (parent: Node): NovelTypingNode[] => {
    const result: NovelTypingNode[] = []
    const children = Array.from(parent.childNodes)
    for (let index = 0; index < children.length; index++) {
      const node = children[index]
      if (node.nodeType === Node.TEXT_NODE) {
        result.push({ kind: 'text', text: node.textContent || '' })
        continue
      }
      if (!(node instanceof Element)) continue
      if (node.matches('b.fw') && node.textContent?.trim()) {
        const next = children[index + 1]
        const gloss = next instanceof Element && next.matches('i.zh') ? next.textContent?.trim() || '' : ''
        const answer = node.textContent.trim()
        const blank: NovelBlank = {
          id: blanks.length,
          // data-w can be a lemma; the exercise expects the form actually used in the sentence.
          answer,
          lookup: node.getAttribute('data-w') || answer,
          gloss: gloss.replace(/^（|）$/g, ''),
        }
        blanks.push(blank)
        result.push({ kind: 'blank', blank })
        // A gloss belongs to its blank. Leaving it in the paragraph would defeat "no hint".
        if (gloss) index++
      } else if (node.tagName === 'P' || node.tagName === 'B') {
        result.push({ kind: node.tagName === 'P' ? 'paragraph' : 'bold', children: parseChildren(node) })
      } else {
        result.push({ kind: 'text', text: node.textContent || '' })
      }
    }
    return result
  }

  return { html, nodes: parseChildren(template.content), blanks }
}
