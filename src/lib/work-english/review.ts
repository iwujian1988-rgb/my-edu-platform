import type {LessonState} from './schema'

export interface ReviewWord {
  id: string
  word: string
  meaning: string
  example: string
  translation?: string
}

export interface DueReviewWord extends ReviewWord {
  lessonId: string
  lessonTitle: string
  companyZh: string
  due: number
}

export function collectDueReviewWords(
  state: LessonState,
  lesson: {id: string; title: string; companyZh: string},
  words: ReviewWord[],
  now = Date.now(),
): DueReviewWord[] {
  return words.flatMap(word => {
    const review = state.review[word.id]
    if (!state.words[word.id] || !review || review.due > now) return []
    return [{...word, lessonId: lesson.id, lessonTitle: lesson.title, companyZh: lesson.companyZh, due: review.due}]
  })
}

export function sortDueReviewWords(words: DueReviewWord[]): DueReviewWord[] {
  return [...words].sort((a, b) => a.due - b.due || a.lessonId.localeCompare(b.lessonId) || a.word.localeCompare(b.word))
}
