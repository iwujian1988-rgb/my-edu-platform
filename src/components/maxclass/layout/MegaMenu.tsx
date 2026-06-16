'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/MegaMenu.vue
 * 全屏 mega menu：8 个分类标签 + 内容网格（练习/主题/课程/文凭/合集/词汇/记忆卡/TCF）
 */

import { useState } from 'react'
import Link from 'next/link'
import { useUiStore } from '@/lib/maxclass/uiStore'
import { t } from '@/lib/maxclass/i18n'
import { levels, themes, collections, courses, diplomas, memoCategories } from '@/data/maxclass'

function levelCode(level: string): string {
  return level.replace(/[+-]/g, '').toLowerCase()
}

function levelBadgeClass(level: string): string {
  return `level-badge level-${levelCode(level)}`
}

export function MegaMenu() {
  const uiStore = useUiStore()
  const [activeSection, setActiveSection] = useState('exercises')

  if (!uiStore.megaMenuOpen) return null

  const vocabularyDifficulties = [
    { slug: 'easy', label: t('mega.easy', '简单'), icon: '🌱' },
    { slug: 'medium', label: t('mega.medium', '中等'), icon: '🌿' },
    { slug: 'hard', label: t('mega.hard', '困难'), icon: '🌳' },
  ]

  const tcfItems = [
    { slug: 'practice', label: t('mega.tcfPractice', 'TCF 练习'), description: t('mega.tcfPracticeDesc', '熟悉 TCF 考试题型'), icon: '📝', to: '/tcf' },
    { slug: 'faq', label: t('mega.tcfFaq', 'TCF FAQ'), description: t('mega.tcfFaqDesc', '常见问题解答'), icon: '❓', to: '/tcf' },
    { slug: 'tips', label: t('mega.tcfTips', 'TCF 技巧'), description: t('mega.tcfTipsDesc', '备考策略与技巧'), icon: '💡', to: '/tcf' },
    { slug: 'download', label: t('mega.tcfDownload', 'TCF 资料'), description: t('mega.tcfDownloadDesc', '下载备考资料'), icon: '📥', to: '/tcf' },
  ]

  const sections = [
    { key: 'exercises', label: t('mega.exercises', '练习') },
    { key: 'themes', label: t('mega.themes', '主题') },
    { key: 'courses', label: t('mega.courses', '课程') },
    { key: 'diplomas', label: t('mega.diplomas', '文凭') },
    { key: 'collections', label: t('mega.collections', '合集') },
    { key: 'vocabulary', label: t('mega.vocab', '词汇') },
    { key: 'memos', label: t('mega.memos', '记忆卡') },
    { key: 'tcf', label: t('mega.tcf', 'TCF') },
  ]

  const discoverAllMap: Record<string, string> = {
    exercises: '/exercices',
    themes: '/themes',
    courses: '/parcours',
    diplomas: '/diplomes',
    collections: '/exercices',
    vocabulary: '/vocabulaire',
    memos: '/memos',
    tcf: '/tcf',
  }
  const discoverAllLink = discoverAllMap[activeSection] || '/exercices'

  return (
    <div
      className="absolute top-[104px] left-0 right-0 bg-white border-b shadow-xl z-20"
      onMouseLeave={() => uiStore.closeMegaMenu()}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Section tabs */}
        <div className="flex border-b mb-4 gap-0 overflow-x-auto">
          {sections.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeSection === sec.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        <div className="min-h-[200px]">
          {/* Exercices */}
          {activeSection === 'exercises' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <h3 className="text-lg font-bold mb-2">{t('nav.exercises', '练习')}</h3>
                <p className="text-gray-600 text-sm mb-3">{t('mega.over4000', '超过 4000 个练习')}</p>
                <Link
                  href="/exercices"
                  onClick={() => uiStore.closeMegaMenu()}
                  className="btn-primary text-sm"
                >
                  {t('nav.allExercises', '全部练习')}
                </Link>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase">{t('common.seeLevel', '选择级别').replace(/[：:]/g, '')}</h4>
                {levels.map((level) => (
                  <Link
                    key={level.code}
                    href={`/exercices/${level.slug}`}
                    onClick={() => uiStore.closeMegaMenu()}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    <span className={`${levelBadgeClass(level.code)} px-2 py-0.5 text-xs`}>{level.code}</span>
                    <span>{t(`levels.${level.code.toLowerCase()}.name`, level.label)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Thèmes */}
          {activeSection === 'themes' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {themes.map((theme) => (
                <Link
                  key={theme.slug}
                  href={`/themes/${theme.slug}`}
                  onClick={() => uiStore.closeMegaMenu()}
                  className="p-4 rounded-lg border hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                >
                  <span className="text-2xl mb-2 block">{theme.icon}</span>
                  <h4 className="font-medium text-sm group-hover:text-primary-700">{theme.label}</h4>
                  <p className="text-xs text-gray-400 mt-1">{t('common.exercises', { count: theme.exerciseCount })}</p>
                </Link>
              ))}
            </div>
          )}

          {/* Parcours */}
          {activeSection === 'courses' && (
            <div className="space-y-3">
              {courses.map((course) => {
                const c = course as { id: number | string; slug: string; title: string; level: string; description: string; exerciseCount?: number }
                return (
                  <Link
                    key={c.id}
                    href={`/parcours/${c.slug}`}
                    onClick={() => uiStore.closeMegaMenu()}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary-300 hover:bg-primary-50/50 transition-all"
                  >
                    <span className={`${levelBadgeClass(c.level)} px-2 py-0.5 text-xs shrink-0`}>{c.level}</span>
                    <div>
                      <h4 className="font-medium">{c.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                      {c.exerciseCount != null && (
                        <p className="text-xs text-gray-400 mt-1">{t('common.exercises', { count: c.exerciseCount })}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Diplômes */}
          {activeSection === 'diplomas' && (
            <div className="space-y-3">
              {diplomas.map((dip) => (
                <Link
                  key={dip.id}
                  href={`/diplomes/${dip.slug}`}
                  onClick={() => uiStore.closeMegaMenu()}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary-300 hover:bg-primary-50/50 transition-all"
                >
                  <div>
                    <h4 className="font-medium">{dip.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{dip.description}</p>
                    <div className="flex gap-1 mt-2">
                      {dip.levels.map((l: string) => (
                        <span key={l} className={`${levelBadgeClass(l)} px-2 py-0.5 text-xs`}>{l}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Collections */}
          {activeSection === 'collections' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collection/${col.slug}`}
                  onClick={() => uiStore.closeMegaMenu()}
                  className="p-4 rounded-lg border hover:border-primary-300 hover:bg-primary-50/50 transition-all"
                >
                  <h4 className="font-medium text-sm">{col.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{col.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{t('common.exercises', { count: col.exerciseCount })}</p>
                </Link>
              ))}
            </div>
          )}

          {/* Vocabulaire */}
          {activeSection === 'vocabulary' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vocabularyDifficulties.map((diff) => (
                <Link
                  key={diff.slug}
                  href={`/vocabulaire?difficulty=${diff.slug}`}
                  onClick={() => uiStore.closeMegaMenu()}
                  className="p-6 rounded-lg border hover:border-primary-300 hover:bg-primary-50/50 transition-all text-center"
                >
                  <span className="text-3xl mb-2 block">{diff.icon}</span>
                  <h4 className="font-medium">{diff.label}</h4>
                </Link>
              ))}
            </div>
          )}

          {/* Mémos */}
          {activeSection === 'memos' && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {memoCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/memos?category=${cat.slug}`}
                  onClick={() => uiStore.closeMegaMenu()}
                  className="p-4 rounded-lg border hover:border-primary-300 hover:bg-primary-50/50 transition-all text-center"
                >
                  <span className="text-2xl mb-2 block">{cat.icon}</span>
                  <h4 className="font-medium text-sm">{cat.label}</h4>
                </Link>
              ))}
            </div>
          )}

          {/* TCF */}
          {activeSection === 'tcf' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tcfItems.map((item) => (
                <Link
                  key={item.slug}
                  href={item.to}
                  onClick={() => uiStore.closeMegaMenu()}
                  className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary-300 hover:bg-primary-50/50 transition-all"
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <h4 className="font-medium">{item.label}</h4>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t text-center">
          <Link
            href={discoverAllLink}
            onClick={() => uiStore.closeMegaMenu()}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            {t('nav.discoverAll', '查看全部')} →
          </Link>
        </div>
      </div>
    </div>
  )
}
