'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

const QUICK_CATEGORY_LIMIT = 8
const QUICK_CATEGORY_ORDER = ['访谈谈话', '个人成长', '法国生活', '纪录片', '影视原声', '生活Vlog', '考试干货', '法国文化']

interface VideoCategoryFiltersProps {
  tags: { name: string }[]
  selected: string
  onSelect: (tag: string) => void
}

export function VideoCategoryFilters({ tags, selected, onSelect }: VideoCategoryFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const names = [...new Set(tags.map(tag => tag.name))]
  const prioritized = [...QUICK_CATEGORY_ORDER.filter(name => names.includes(name)), ...names.filter(name => !QUICK_CATEGORY_ORDER.includes(name))]
  const quick = prioritized.slice(0, QUICK_CATEGORY_LIMIT)
  // 深链接或更多分类选中的标签保持可见，避免用户不知道当前正在筛选什么。
  const visible = expanded ? names : [...quick, ...(selected !== 'all' && !quick.includes(selected) && names.includes(selected) ? [selected] : [])]
  return (
    <section aria-label="分类快速筛选" className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">分类 · 快速筛选</h2>
        <Link href="/videos/guide" className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">不知道怎么学？查看指南 →</Link>
      </div>
      <div id="video-category-options" className="flex flex-wrap gap-2">
        {['all', ...visible].map(name => (
          <button type="button" key={name} aria-pressed={selected === name} onClick={() => onSelect(name)} className={`min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 ${selected === name ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-indigo-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`}>
            {name === 'all' ? '全部' : name}
          </button>
        ))}
        {names.length > QUICK_CATEGORY_LIMIT && <button type="button" aria-expanded={expanded} aria-controls="video-category-options" onClick={() => setExpanded(value => !value)} className="flex min-h-11 cursor-pointer items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
          {expanded ? '收起分类' : '更多分类'}<ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
        </button>}
      </div>
    </section>
  )
}
