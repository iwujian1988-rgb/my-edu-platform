import publishedLessons from './published.json'
import internalPreviewLessons from './internal-preview.json'

export const WORK_ENGLISH_PATH = '/work-english'
export const WORK_ENGLISH_PACKAGE_ID = '741aee1a-1fd4-49c4-bf69-44900d18b301'
export const WORK_ENGLISH_PERMISSION = 'work_english'
export const WORK_ENGLISH_TITLE = '跟着谷歌、微软学职场英语'
export const PROGRESS_MAX_BYTES = 32_768
export const LESSONS = publishedLessons
// Keep unpublished entries separate from the public release catalog.
export const INTERNAL_PREVIEW_LESSONS = internalPreviewLessons
export function getCatalogLessons(includeInternalPreview = false) {
  return includeInternalPreview ? [...LESSONS, ...INTERNAL_PREVIEW_LESSONS] : LESSONS
}
export function findLesson(id: string) { return LESSONS.find(lesson => lesson.id === id) }
export function findInternalPreviewLesson(id: string) { return INTERNAL_PREVIEW_LESSONS.find(lesson => lesson.id === id) }
