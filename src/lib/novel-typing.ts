import { normForm } from './novel-forms'
import { sanitizeNovelHtml, wrapZhGlosses } from './novelSanitize'

export type NovelHintMode = 'none' | 'zh' | 'initial'

export interface NovelBlank {
  id: number
  answer: string
  lookup: string
  gloss: string
}

export type NovelTypingNode =
  | { kind: 'text'; text: string }
  | { kind: 'paragraph' | 'bold'; children: NovelTypingNode[] }
  | { kind: 'blank'; blank: NovelBlank }

export interface NovelTypingContent {
  html: string
  nodes: NovelTypingNode[]
  blanks: NovelBlank[]
}

export const EMPTY_NOVEL_TYPING_CONTENT: NovelTypingContent = { html: '', nodes: [], blanks: [] }

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
