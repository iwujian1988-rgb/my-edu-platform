import { Suspense } from 'react'
import { SearchResultsPageClient } from './pageClient'

export default function RechercheRoute() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8">加载中...</div>}>
      <SearchResultsPageClient />
    </Suspense>
  )
}
