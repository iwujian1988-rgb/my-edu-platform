'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/composables/usePageSeo.js
 *
 * 设置 document.title 和 meta description。
 *
 * 差异：原版依赖 vue-i18n，本项目 Phase 1 不引入 i18n（按计划文档硬编码中文）。
 * 默认 locale='zh'；后续引入 i18n 时再扩展为响应式。
 */

import { useEffect } from 'react'

interface PageSeoOptions {
  title?: string
  description?: string
}

const DEFAULT_META = {
  fr: {
    title: 'MAX 外语 — Exercices, videos et parcours de langues',
    description: "MAX 外语 est un ensemble de produits pour apprendre les langues avec des contenus reels, des parcours structures et des outils de progression.",
    suffix: 'MAX 外语',
  },
  zh: {
    title: 'MAX 外语 — 课程、视频与词汇学习',
    description: 'MAX 外语是一个围绕真实内容和系统学习路径构建的外语学习产品体系，包含课程、视频与词汇学习入口。',
    suffix: 'MAX 外语',
  },
} as const

const LOCALE = 'zh' // Phase 1 硬编码；后续接 i18n 时改为 prop 或 context

export function usePageSeo(opts: PageSeoOptions = {}) {
  const meta = DEFAULT_META[LOCALE]

  const setTitle = (val?: string) => {
    document.title = val ? `${val} | ${meta.suffix}` : meta.title
  }

  const setDescription = (val?: string) => {
    let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.name = 'description'
      document.head.appendChild(el)
    }
    el.content = val || meta.description
  }

  useEffect(() => {
    setTitle(opts.title)
    setDescription(opts.description)
  }, [opts.title, opts.description])

  return { setTitle, setDescription }
}
