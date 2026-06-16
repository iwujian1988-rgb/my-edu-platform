/**
 * contentManifest.js — Unified content registry for the Portal.
 *
 * All courses and external resources are registered here.
 * Pages should import from this manifest rather than hardcoded data.
 */

// ─── Course Registry ──────────────────────────────────────────────────
// Each entry: { file, slug, title, level, tags[] }
// The `file` field is the JSON module imported lazily or statically.

import course30days from '../course-30days-listening.json'
import courseA1RealFrench from '../parcours-a1-real-french.json'

const courseRegistry = [
  {
    slug: '30days-listening',
    title: '30天听懂法国人说话',
    level: 'A1',
    description: '通过真实法语视频和系统训练，30天内建立法语听力基础。',
    tags: ['听力', '入门', 'A1'],
    file: course30days,
  },
  {
    slug: 'a1-real-french',
    title: 'A1 法语真实入门：法国人天天会说的话',
    level: 'A1',
    description: '用真实法语素材带学习者进入法语听力，先建立“能听懂一点真实法语”的成就感。',
    tags: ['听力', '真实表达', 'A1'],
    file: courseA1RealFrench,
  },
]

// ─── External Resource Registry ───────────────────────────────────────

const resourceRegistry = [
  {
    id: 'tv5monde',
    name: 'TV5MONDE Apprendre',
    desc: '法语官方媒体出品，按级别分类的视频听力练习，完全免费。',
    url: 'https://apprendre.tv5monde.com/',
    icon: '📺',
    iconBg: 'bg-red-50',
    category: 'listening',
  },
  {
    id: 'francais-avec-pierre',
    name: 'Français avec Pierre',
    desc: '适合中级学习者的法语播客和 YouTube 频道，讲解清晰有趣。',
    url: 'https://www.francaisavecpierre.com/',
    icon: '🎙️',
    iconBg: 'bg-indigo-50',
    category: 'listening',
  },
  {
    id: 'conjugaison',
    name: 'Conjugaison Française',
    desc: '法语动词变位查询工具，覆盖所有时态和语式。',
    url: 'https://la-conjugaison.nouvelobs.com/',
    icon: '🔤',
    iconBg: 'bg-green-50',
    category: 'grammar',
  },
  {
    id: 'rfi-savoirs',
    name: 'RFI Savoirs',
    desc: '法国国际广播电台法语学习频道，新闻慢速法语和专题课程。',
    url: 'https://savoirs.rfi.fr/',
    icon: '📻',
    iconBg: 'bg-blue-50',
    category: 'listening',
  },
  {
    id: 'le-point-du-fle',
    name: 'Le Point du FLE',
    desc: '面向法语教师的资源聚合站，语法、词汇、文化主题一应俱全。',
    url: 'https://www.lepointdufle.net/',
    icon: '📖',
    iconBg: 'bg-amber-50',
    category: 'grammar',
  },
  {
    id: 'lingolia',
    name: 'Lingolia Français',
    desc: '系统语法讲解 + 在线练习，适合需要巩固语法规则的学习者。',
    url: 'https://francais.lingolia.com/',
    icon: '✏️',
    iconBg: 'bg-teal-50',
    category: 'grammar',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Get all registered courses (fully resolved JSON data).
 */
export function getManifestCourses() {
  return courseRegistry.map(entry => ({
    ...entry.file,
    _manifest: { slug: entry.slug, tags: entry.tags },
  }))
}

/**
 * Get a single course by slug.
 */
export function getManifestCourse(slug: string) {
  const entry = courseRegistry.find(c => c.slug === slug)
  if (!entry) return null
  return { ...entry.file, _manifest: { slug: entry.slug, tags: entry.tags } }
}

/**
 * Get all registered courses (raw registry entries with metadata).
 */
export function getCourseRegistry() {
  return courseRegistry
}

/**
 * Get all external resources, optionally filtered by category.
 */
export function getResources(category?: string) {
  if (!category) return resourceRegistry
  return resourceRegistry.filter(r => r.category === category)
}

/**
 * Collect all lessons from all registered courses.
 * Returns flat array with course/module context attached.
 */
export function getAllLessons() {
  const lessons: Array<Record<string, unknown>> = []
  for (const entry of courseRegistry) {
    const course = entry.file
    for (const mod of (course.modules || [])) {
      if (!mod.lessons) continue
      for (const lesson of mod.lessons) {
        lessons.push({
          ...lesson,
          courseSlug: course.slug,
          courseTitle: course.title,
          courseLevel: course.level,
          moduleSlug: mod.slug,
          moduleTitle: mod.title,
          blockCount: lesson.blocks?.length || 0,
        })
      }
    }
  }
  return lessons
}

/**
 * Get the most recently added N lessons.
 */
export function getRecentLessons(count = 6) {
  const all = getAllLessons()
  return all.slice(-count).reverse()
}
