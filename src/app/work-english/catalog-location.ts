import { WORK_ENGLISH_PATH } from '@/lib/work-english/constants'
import { SCENE_GROUPS } from './catalog-scenes'

type CatalogLocation = { page: number; scene: string; query: string }

export function readCatalogLocation(params: Pick<URLSearchParams, 'get'>): CatalogLocation {
  const page = Number(params.get('page'))
  const scene = params.get('scene')
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    scene: SCENE_GROUPS.find(group => group.id === scene)?.id ?? 'all',
    query: params.get('q') ?? '',
  }
}

function catalogParams({ page, scene, query }: CatalogLocation) {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (scene !== 'all') params.set('scene', scene)
  if (query) params.set('q', query)
  return params
}

export function catalogHref(location: CatalogLocation) {
  const query = catalogParams(location).toString()
  return query ? `${WORK_ENGLISH_PATH}?${query}` : WORK_ENGLISH_PATH
}

export function lessonHref(id: string, section: string, from?: CatalogLocation) {
  const query = from ? `?${new URLSearchParams([['from', 'catalog'], ...catalogParams(from)])}` : ''
  return `${WORK_ENGLISH_PATH}/lessons/${id}${query}#${section}`
}

export function lessonCatalogHref(params: URLSearchParams, id: string) {
  if (params.get('from') !== 'catalog' || !/^\d{3}$/.test(id)) return WORK_ENGLISH_PATH
  return `${catalogHref(readCatalogLocation(params))}#lesson-${id}`
}
