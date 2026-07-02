export type GhostWordErrorType = 'wrong' | 'skipped'

export interface GhostWordInsertBase {
  user_id: string
  word: string
  article_id: string
  sentence_id: number
  error_type: GhostWordErrorType
}

const MIN_GHOST_WORD_LENGTH = 3

const EXCLUDED_GHOST_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'if',
  'then',
  'so',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'onto',
  'to',
  'with',
  'about',
  'after',
  'before',
  'between',
  'during',
  'through',
  'over',
  'under',
  'i',
  'me',
  'my',
  'mine',
  'you',
  'your',
  'yours',
  'he',
  'him',
  'his',
  'she',
  'her',
  'hers',
  'it',
  'its',
  'we',
  'us',
  'our',
  'ours',
  'they',
  'them',
  'their',
  'theirs',
  'this',
  'that',
  'these',
  'those',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'having',
  'will',
  'would',
  'can',
  'could',
  'may',
  'might',
  'must',
  'should',
  'shall',
  'not',
  'no',
  'yes',
  'oh',
  'yeah',
  'when',
  'where',
  'what',
  'who',
  'whom',
  'whose',
  'which',
  'why',
  'how',
  'alors',
  'au',
  'aux',
  'avec',
  'ça',
  'car',
  'ce',
  'ces',
  'cet',
  'cette',
  'chez',
  'comme',
  'dans',
  'de',
  'des',
  'donc',
  'du',
  'elle',
  'elles',
  'en',
  'et',
  'eux',
  'il',
  'ils',
  'je',
  'la',
  'le',
  'les',
  'leur',
  'leurs',
  'lui',
  'ma',
  'mais',
  'me',
  'mes',
  'moi',
  'mon',
  'ne',
  'ni',
  'nos',
  'notre',
  'nous',
  'ou',
  'où',
  'par',
  'pas',
  'plus',
  'pour',
  'quand',
  'que',
  'qui',
  'quoi',
  'sa',
  'se',
  'ses',
  'son',
  'sous',
  'sur',
  'ta',
  'te',
  'tes',
  'toi',
  'ton',
  'très',
  'tu',
  'un',
  'une',
  'vos',
  'votre',
  'vous',
  'y',
])

export function normalizeGhostWord(word: string): string {
  return word.trim().toLowerCase().replace(/[’]/g, "'").replace(/^'+|'+$/g, '')
}

export function shouldKeepGhostWord(word: string): boolean {
  const normalizedWord = normalizeGhostWord(word)

  if (normalizedWord.length < MIN_GHOST_WORD_LENGTH) {
    return false
  }

  return !EXCLUDED_GHOST_WORDS.has(normalizedWord)
}

function getPriority(errorType: GhostWordErrorType): number {
  return errorType === 'wrong' ? 2 : 1
}

export function dedupeGhostWordInserts<T extends GhostWordInsertBase>(items: T[]): T[] {
  const uniqueMap = new Map<string, T>()

  items.forEach(item => {
    if (!shouldKeepGhostWord(item.word)) {
      return
    }

    const key = `${item.user_id}-${item.article_id}-${normalizeGhostWord(item.word)}`
    const existing = uniqueMap.get(key)

    if (!existing || getPriority(item.error_type) > getPriority(existing.error_type)) {
      uniqueMap.set(key, item)
    }
  })

  return Array.from(uniqueMap.values())
}

export function getGhostWordLookupWords(items: GhostWordInsertBase[]): string[] {
  return Array.from(new Set(items.map(item => item.word).filter(shouldKeepGhostWord)))
}
