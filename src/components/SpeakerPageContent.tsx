/**
 * 演说家模块 - 文章列表页面内容
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { SpeakerCard } from '@/components/speaker/SpeakerCard'
import type { SpeakerArticle, ArticleCategory } from '@/types/speaker'
import { ARTICLE_CATEGORIES } from '@/types/speaker'
import React from 'react'

interface FilterState {
  level: 'all' | 1 | 2 | 3 | 4 | 5
  category: ArticleCategory | 'all'
}

export function SpeakerPageContent({ initialArticles }: { initialArticles: SpeakerArticle[] }) {
  const [articles, setArticles] = useState<SpeakerArticle[]>(initialArticles)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState>({
    level: 'all',
    category: 'all'
  })
  const isFirstRender = useRef(true)

  // 获取文章列表
  useEffect(() => {
    // 首次渲染：如果没有初始数据，则获取
    // 过滤器改变：总是重新获取
    if (isFirstRender.current) {
      if (initialArticles.length === 0) {
        fetchArticles()
      }
      isFirstRender.current = false
    } else {
      fetchArticles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.level, filter.category])

  const fetchArticles = async () => {
    console.log('[Speaker Page] 获取文章列表，过滤器:', filter)

    setLoading(true)
    setError(null)

    try {
      // 构建 URL 参数
      const params = new URLSearchParams()
      if (filter.level !== 'all') {
        params.append('level', filter.level.toString())
      }
      if (filter.category !== 'all') {
        params.append('category', filter.category)
      }

      const url = `/api/speaker/articles?${params.toString()}`
      console.log('[Speaker Page] 发起请求:', url)

      const response = await fetch(url)

      console.log('[Speaker Page] 收到响应:', {
        status: response.status,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '请求失败' }))
        throw new Error(errorData.message || '获取文章列表失败')
      }

      const data = await response.json()
      console.log('[Speaker Page] 响应数据:', data)

      if (!data.articles) {
        throw new Error('响应数据格式错误：缺少 articles 字段')
      }

      console.log('[Speaker Page] ✅ 成功获取文章列表:', { count: data.articles.length })

      setArticles(data.articles)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      console.error('[Speaker Page] ❌ 获取文章列表失败:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
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
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-black text-black text-base">魔鬼生词本</span>
              <svg className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
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
            <div className="min-w-[800px] flex items-stretch gap-4">
              {[
                { id: 1, num: '01', title: "整段盲听", desc: "纯听觉输入" },
                { id: 2, num: '02', title: "听写训练", desc: "逐句听写" },
                { id: 3, num: '03', title: "跟读背诵", desc: "模仿发音" },
                { id: 4, num: '04', title: "原音对比", desc: "KTV式对比" }
              ].map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex-1 relative group min-w-[180px]">
                    <div className="h-full bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 p-0 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:-translate-y-1 transition-all flex flex-col">
                      <div className="bg-black dark:bg-gray-700 text-white px-3 py-1 flex justify-between items-center border-b-[3px] border-black dark:border-gray-600">
                        <span className="font-mono font-bold text-xs">STEP</span>
                        <span className="font-mono font-black text-lg text-[#B4F416]">{step.num}</span>
                      </div>
                      <div className="p-4 flex flex-col items-center text-center flex-1">
                        <h3 className="font-black text-base mb-1 text-black dark:text-white transition-colors duration-300">{step.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                  {/* 简单的连接箭头 */}
                  {index < 3 && (
                    <div className="flex items-center justify-center px-2 text-black dark:text-white font-black text-2xl transition-colors duration-300">→</div>
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
                <button
                  onClick={() => setFilter({ ...filter, level: 1 })}
                  className={`
                    px-4 py-2 rounded-sm text-sm font-black tracking-tight
                    border-[3px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 1
                      ? 'bg-[#B4F416] shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  L1
                </button>
                <button
                  onClick={() => setFilter({ ...filter, level: 2 })}
                  className={`
                    px-4 py-2 rounded-sm text-sm font-black tracking-tight
                    border-[3px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 2
                      ? 'bg-[#B4F416] shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  L2
                </button>
                <button
                  onClick={() => setFilter({ ...filter, level: 3 })}
                  className={`
                    px-4 py-2 rounded-sm text-sm font-black tracking-tight
                    border-[3px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 3
                      ? 'bg-purple-400 shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  L3
                </button>
                <button
                  onClick={() => setFilter({ ...filter, level: 4 })}
                  className="px-4 py-2 rounded-sm text-sm font-black tracking-tight border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#666] hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-[4px_4px_0px_#666] hover:-translate-y-1 transition-all duration-150 text-black dark:text-white"
                >
                  L4
                </button>
                <button
                  onClick={() => setFilter({ ...filter, level: 5 })}
                  className="px-4 py-2 rounded-sm text-sm font-black tracking-tight border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#666] hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-[4px_4px_0px_#666] hover:-translate-y-1 transition-all duration-150 text-black dark:text-white"
                >
                  L5
                </button>
              </div>
            </div>

            {/* 内容分类筛选 */}
            <div className="flex-1 text-right">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300 transition-colors duration-300 mb-3">内容分类：</div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setFilter({ ...filter, category: 'all' })}
                  className={`
                    px-3 py-1.5 rounded-sm text-xs font-bold tracking-tight
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
                      px-3 py-1.5 rounded-sm text-xs font-bold tracking-tight
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
                <button
                  onClick={() => setFilter({ ...filter, level: 1 })}
                  className={`
                    px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                    border-[2px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 1
                      ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  L1
                </button>
                <button
                  onClick={() => setFilter({ ...filter, level: 2 })}
                  className={`
                    px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                    border-[2px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 2
                      ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  L2
                </button>
                <button
                  onClick={() => setFilter({ ...filter, level: 3 })}
                  className={`
                    px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                    border-[2px] border-black dark:border-gray-600
                    transition-all duration-150
                    ${filter.level === 3
                      ? 'bg-purple-400 shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                    }
                  `}
                >
                  L3
                </button>
              </div>
            </div>

            {/* 内容分类筛选 */}
            <div className="text-right mb-6">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300 transition-colors duration-300 mb-2">内容分类：</div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setFilter({ ...filter, category: 'all' })}
                  className={`
                    px-2 py-1 rounded-sm text-xs font-bold tracking-tight
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
                      px-2 py-1 rounded-sm text-xs font-bold tracking-tight
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
          // 加载状态
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-sm h-12 w-12 border-[3px] border-black dark:border-gray-500 border-t-[#B4F416]"></div>
              <p className="mt-4 text-sm font-mono font-bold text-black dark:text-white transition-colors duration-300">
                加载中...
              </p>
            </div>
          </div>
        ) : error ? (
          // 错误状态
          <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm p-6 transition-colors duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-500 border-[3px] border-black rounded-sm flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-black tracking-tighter italic text-black dark:text-white transition-colors duration-300">
                  加载失败
                </h3>
                <div className="mt-2 text-sm font-mono font-bold text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchArticles}
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
              <span className="text-6xl">📭</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                共 <span className="text-[#B4F416] text-lg">{articles.length}</span> 篇文章
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
