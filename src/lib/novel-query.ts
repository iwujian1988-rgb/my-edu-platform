const PAGE_SIZE = 500
const FILTER_BATCH_SIZE = 80
const CONCURRENT_BATCHES = 4

interface QueryResult<T> {
  data: T[] | null
  error: { message: string } | null
}

/** Read every REST page; silently truncated results must not look like an empty review queue. */
export async function readNovelRows<T>(
  getPage: (from: number, to: number) => PromiseLike<QueryResult<T>>,
): Promise<QueryResult<T>> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await getPage(from, from + PAGE_SIZE - 1)
    if (result.error) return { data: null, error: result.error }
    const page = result.data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return { data: rows, error: null }
  }
}

/** Bound URL filters as well as concurrency; French phrases can exceed proxy URL limits. */
export async function readNovelRowsByValues<T>(
  values: string[],
  getPage: (batch: string[], from: number, to: number) => PromiseLike<QueryResult<T>>,
): Promise<QueryResult<T>> {
  const uniqueValues = [...new Set(values)]
  const batches: string[][] = []
  for (let start = 0; start < uniqueValues.length; start += FILTER_BATCH_SIZE) {
    batches.push(uniqueValues.slice(start, start + FILTER_BATCH_SIZE))
  }
  const rows: T[] = []
  for (let start = 0; start < batches.length; start += CONCURRENT_BATCHES) {
    const results = await Promise.all(batches.slice(start, start + CONCURRENT_BATCHES)
      .map(batch => readNovelRows((from, to) => getPage(batch, from, to))))
    for (const result of results) {
      if (result.error) return { data: null, error: result.error }
      rows.push(...(result.data || []))
    }
  }
  return { data: rows, error: null }
}
