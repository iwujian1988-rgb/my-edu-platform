/**
 * 演说家模块 - 文章列表页面内容
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { SpeakerCard } from '@/components/speaker/SpeakerCard'
import type { SpeakerArticle, ArticleCategory } from '@/types/speaker'
import { ARTICLE_CATEGORIES } from '@/types/speaker'
import React from 'react'
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface FilterState {
  level: 'all' | 1 | 2 | 3 | 4 | 5
  category: ArticleCategory | 'all'
}

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const LEVEL_FILTERS = [
  { value: 1, label: 'L1 入门' },
  { value: 2, label: 'L2 基础' },
  { value: 3, label: 'L3 进阶' },
  { value: 4, label: 'L4 高级' },
  { value: 5, label: 'L5 专家' }
] as const

export function SpeakerPageContent({ initialArticles }: { initialArticles: SpeakerArticle[] }) {
  const [articles, setArticles] = useState<SpeakerArticle[]>(initialArticles)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState>({
    level: 'all',
    category: 'all'
  })
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0
  })
  const isFirstRender = useRef(true)

  // 获取文章列表
  useEffect(() => {
    if (isFirstRender.current) {
      if (initialArticles.length === 0) {
        fetchArticles()
      }
      isFirstRender.current = false
    } else {
      // 过滤器改变时重置页码
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchArticles(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.level, filter.category])

  // 页码改变时获取数据
  useEffect(() => {
    if (!isFirstRender.current) {
      fetchArticles(pagination.page)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page])

  const fetchArticles = async (page: number = pagination.page) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filter.level !== 'all') {
        params.append('level', filter.level.toString())
      }
      if (filter.category !== 'all') {
        params.append('category', filter.category)
      }
      params.append('page', page.toString())
      params.append('pageSize', pagination.pageSize.toString())

      const url = `/api/speaker/articles?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '操作没有成功，请稍后再试' }))
        throw new Error(errorData.message || '获取文章列表失败')
      }

      const data = await response.json()

      if (!data.articles) {
        throw new Error('响应数据格式错误：缺少 articles 字段')
      }

      setArticles(data.articles)
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 翻页
  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic text-black dark:text-white transition-colors duration-300">
                雯姐外语学习法
              </h1>
              <p className="mt-2 text-sm font-mono font-bold text-gray-600 dark:text-gray-300 transition-colors duration-300">
                从盲听听写到原音复刻，还原语言学习的底层逻辑
              </p>
            </div>

            {/* 生词本入口按钮 */}
            <a
              href="/speaker/ghost-words"
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-[#B4F416] hover:bg-[#a3e014] border-3 border-black dark:border-gray-600 rounded-sm shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 transition-all group"
            >
              <BookOpen className="w-5 h-5 text-black" strokeWidth={3} />
              <span className="font-black text-black text-base">魔鬼生词本</span>
              <ChevronRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" strokeWidth={3} />
            </a>
          </div>
        </div>
      </div>

      {/* 学习路径板块 - 在 Header 之后，Filter 之前 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mb-12">
          {/* 板块标题 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666] transition-colors duration-300">
              <span className="font-bold">M</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wide text-black dark:text-white transition-colors duration-300">学习路径</h2>
          </div>

          {/* 卡带式时间轴 */}
          <div className="overflow-x-auto pb-6">
            <div className="flex items-stretch gap-2 md:gap-4 min-w-max">
              {[
                { id: 1, num: '01', title: "整段盲听", desc: "纯听觉输入" },
                { id: 2, num: '02', title: "听写训练", desc: "逐句听写" },
                { id: 3, num: '03', title: "跟读背诵", desc: "模仿发音" },
                { id: 4, num: '04', title: "原音对比", desc: "KTV式对比" }
              ].map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex-1 relative group min-w-[70px] md:min-w-[140px]">
                    <div className="h-full bg-white dark:bg-gray-800 border-[2px] md:border-[3px] border-black dark:border-gray-600 p-0 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 transition-all flex flex-col">
                      <div className="bg-black dark:bg-gray-700 text-white px-1.5 md:px-3 py-0.5 md:py-1 flex justify-between items-center border-b-[2px] md:border-b-[3px] border-black dark:border-gray-600">
                        <span className="font-mono font-bold text-[10px] md:text-xs">STEP</span>
                        <span className="font-mono font-black text-sm md:text-lg text-[#B4F416]">{step.num}</span>
                      </div>
                      <div className="p-2 md:p-4 flex flex-col items-center text-center flex-1">
                        <h3 className="font-black text-xs md:text-base mb-0.5 md:mb-1 text-black dark:text-white transition-colors duration-300">{step.title}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                  {/* 简单的连接箭头 */}
                  {index < 3 && (
                    <div className="flex items-center justify-center px-1 md:px-2 text-black dark:text-white font-black text-lg md:text-2xl transition-colors duration-300">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* 过滤器工具栏 */}
        <div className="mb-6">
          {/* PC端：难度等级和内容分类在同一行，标签在上方 */}
          <div className="hidden md:flex items-start gap-8">
            {/* 难度等级筛选 */}
            <div className="flex-1">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300 transition-colors duration-300 mb-3">难度等级：</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter({ ...filter, level: 'all' })}
                  className={`
                    px-4 py-2 rounded-sm text-sm font-black tracking-tight
                    border-[3px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 'all'
                      ? 'bg-[#B4F416] shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  全部
                </button>
                {LEVEL_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilter({ ...filter, level: value })}
                    title={`${label} 难度`}
                    className={`
                      px-4 py-2 rounded-sm text-sm font-black tracking-tight
                      border-[3px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${filter.level === value
                        ? value === 3
                          ? 'bg-purple-400 shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                          : value === 4
                            ? 'bg-orange-400 shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                            : value === 5
                              ? 'bg-red-400 shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                              : 'bg-[#B4F416] shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                        : 'bg-white dark:bg-gray-800 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容分类筛选 */}
            <div className="flex-1 text-right">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300 transition-colors duration-300 mb-3">内容分类：</div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setFilter({ ...filter, category: 'all' })}
                  className={`
                    px-4 py-2 rounded-sm text-sm font-black tracking-tight
                    border-[3px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.category === 'all'
                      ? 'bg-[#B4F416] shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  全部
                </button>
                {ARTICLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter({ ...filter, category: cat })}
                    className={`
                      px-4 py-2 rounded-sm text-sm font-black tracking-tight
                      border-[3px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${filter.category === cat
                        ? 'bg-[#B4F416] shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                        : 'bg-white dark:bg-gray-800 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                      }
                    `}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 移动端：难度等级和内容分类分两行，标签在上方 */}
          <div className="md:hidden">
            {/* 难度等级筛选 */}
            <div className="mb-4">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300 transition-colors duration-300 mb-2">难度等级：</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilter({ ...filter, level: 'all' })}
                  className={`
                    px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                    border-[2px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 'all'
                      ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  全部
                </button>
                {LEVEL_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilter({ ...filter, level: value })}
                    title={`${label} 难度`}
                    className={`
                      px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                      border-[2px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${filter.level === value
                        ? value === 3
                          ? 'bg-purple-400 shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                          : value === 4
                            ? 'bg-orange-400 shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                            : value === 5
                              ? 'bg-red-400 shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                              : 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                        : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容分类筛选 */}
            <div className="text-left mb-6">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300 transition-colors duration-300 mb-2">内容分类：</div>
              <div className="flex flex-wrap gap-2 justify-start">
                <button
                  onClick={() => setFilter({ ...filter, category: 'all' })}
                  className={`
                    px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                    border-[2px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.category === 'all'
                      ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  全部
                </button>
                {ARTICLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter({ ...filter, category: cat })}
                    className={`
                      px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                      border-[2px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${filter.category === cat
                        ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                        : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                      }
                    `}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>

      {/* 文章列表区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          // 加载状态：保持卡片布局，避免筛选时页面大幅跳动。
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6" aria-label="正在加载文章">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-[320px] bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm overflow-hidden animate-pulse"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700 border-b-[3px] border-black dark:border-gray-600" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                  <div className="flex gap-2">
                    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                  </div>
                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // 错误状态
          <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm p-6 transition-colors duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-500 border-[3px] border-black rounded-sm flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-white" strokeWidth={3} />
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-black tracking-tighter italic text-black dark:text-white transition-colors duration-300">
                  内容暂时没有加载出来，请稍后再试
                </h3>
                <div className="mt-2 text-sm font-mono font-bold text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => fetchArticles()}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 text-sm font-black tracking-tight transition-all duration-150 text-black dark:text-white"
                  >
                    重试
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : articles.length === 0 ? (
          // 空状态
          <div className="text-center py-12">
            <div className="inline-block p-6 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm mb-4 transition-colors duration-300">
              <FileText className="w-14 h-14 text-black dark:text-white" strokeWidth={2.5} />
              <span className="sr-only">暂无文章</span>
            </div>
            <h3 className="text-xl font-black tracking-tighter italic text-black dark:text-white mb-2 transition-colors duration-300">
              暂无文章
            </h3>
            <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300">
              当前难度等级下没有可用的学习素材
            </p>
          </div>
        ) : (
          // 文章网格
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {articles.map((article) => (
              <SpeakerCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* 文章数量统计 */}
        {!loading && !error && articles.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-block px-6 py-3 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] rounded-sm transition-colors duration-300">
              <span className="text-sm font-mono font-bold text-black dark:text-white transition-colors duration-300">
                共 <span className="text-[#B4F416] text-lg">{pagination.total}</span> 篇文章
              </span>
            </div>
          </div>
        )}

        {/* 分页 */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {/* 上一页 */}
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_0px_#000] transition-all font-bold text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </button>

            {/* 页码 */}
            <div className="flex items-center gap-1">
              {generatePageNumbers(pagination.page, pagination.totalPages).map((pageNum, index) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 font-bold text-gray-500">...</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum as number)}
                    className={`w-10 h-10 flex items-center justify-center border-[3px] border-black dark:border-gray-600 font-bold text-sm transition-all ${
                      pagination.page === pageNum
                        ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]'
                        : 'bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>

            {/* 下一页 */}
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_0px_#000] transition-all font-bold text-sm"
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 页码信息 */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="mt-4 text-center text-sm font-mono text-gray-500">
            第 {pagination.page} / {pagination.totalPages} 页
          </div>
        )}
      </div>
    </div>
  )
}

// 生成页码数组
function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = []
  const showPages = 5 // 显示的页码数量

  if (totalPages <= showPages + 2) {
    // 总页数较少，显示全部
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // 总页数较多，显示部分
    pages.push(1)

    if (currentPage > 3) {
      pages.push('...')
    }

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('...')
    }

    pages.push(totalPages)
  }

  return pages
}
