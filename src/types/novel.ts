/** Shared novel vocabulary shape returned by novel word and review APIs. */
export interface NovelWord {
  chapter_number: number
  word: string
  /** Canonical dictionary lemma used as the stable review-progress key. */
  lemma?: string
  phonetic: string | null
  definition: string
  part_of_speech: string | null
  gender: string | null
  cefr: string | null
  theme: string | null
  star: boolean
  order_index: number
  example_sentence: string | null
}
