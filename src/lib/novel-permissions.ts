/**
 * 小说模块 - 权限检查与套餐绑定
 *
 * 权限模型与 videos 同款：books.package_ids 与 users.package_ids 相交即解锁
 * （邀请套餐绑定，注册邀请码自动生效，无 feature_permissions 旁路）
 *
 * 可见性约定（完全隐藏）：无权限用户在书库/详情/搜索/API 全链路看不到小说，
 * 行为等同"书不存在"，不出现锁定页或试读。
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'

// ============================================
// 纯函数：套餐相交判定（供列表过滤复用，避免 N+1 查询）
// ============================================

export function hasNovelPackageOverlap(
  bookPackageIds: string[] | null | undefined,
  userPackageIds: string[] | null | undefined,
  isExpired?: boolean
): boolean {
  if (isExpired) return false
  const bookPkgs = bookPackageIds || []
  const userPkgs = userPackageIds || []
  if (bookPkgs.length === 0 || userPkgs.length === 0) return false
  return userPkgs.some((id) => bookPkgs.includes(id))
}

// ============================================
// 核心权限检查（API 路由 / 详情页卡点）
// ============================================

/**
 * 检查用户是否有某本小说的访问权限
 *
 * 条件（全部满足）：
 * 1. 书存在且 is_novel / is_published
 * 2. books.package_ids 非空（未绑定套餐 = 未上架）
 * 3. 用户 package_ids 与之相交
 * 4. 用户权限未过期
 */
export async function hasNovelAccess(userId: string, bookId: string): Promise<boolean> {
  const supabase = await createAdminClient()

  const { data: book } = await supabase
    .from('books')
    .select('id, is_novel, is_published, package_ids')
    .eq('id', bookId)
    .maybeSingle()

  if (!book || !book.is_novel || !book.is_published) return false

  const bookPkgs = (book.package_ids as string[] | null) || []
  if (bookPkgs.length === 0) return false

  const { data: user } = await supabase
    .from('users')
    .select('package_ids, permission_expires_at')
    .eq('id', userId)
    .maybeSingle()

  if (!user) return false

  const expiresAt = user.permission_expires_at as string | null
  if (expiresAt && new Date(expiresAt) <= new Date()) return false

  const userPkgs = (user.package_ids as string[] | null) || []
  return userPkgs.some((id) => bookPkgs.includes(id))
}

/**
 * 列出全部小说书（admin 用；is_novel=true 的书）
 */
export async function listNovelBooks(): Promise<
  Array<{ id: string; title: string; package_ids: string[]; is_published: boolean; total_chapters: number; total_words: number }>
> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('books')
    .select('id, title, package_ids, is_published, total_chapters, total_words')
    .eq('is_novel', true)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as Array<{ id: string; title: string; package_ids: string[]; is_published: boolean; total_chapters: number; total_words: number }>
}

/**
 * 获取小说已绑定的套餐（admin 用，照 video-permissions 模式）
 */
export async function getNovelPackages(
  bookId: string
): Promise<Array<{ id: string; name: string; is_active: boolean }>> {
  const supabase = await createAdminClient()
  const { data: book } = await supabase
    .from('books')
    .select('id, package_ids')
    .eq('id', bookId)
    .maybeSingle()
  const packageIds = (book?.package_ids as string[] | null) || []
  if (packageIds.length === 0) return []
  const { data: packages } = await supabase
    .from('invitation_packages')
    .select('id, name, is_active')
    .in('id', packageIds)
  return (packages as Array<{ id: string; name: string; is_active: boolean }>) || []
}

/**
 * 更新小说绑定的套餐（admin 用，写 books.package_ids）
 */
export async function updateNovelPackages(bookId: string, packageIds: string[]): Promise<boolean> {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('books')
    .update({ package_ids: packageIds })
    .eq('id', bookId)
  return !error
}

/**
 * 邀请码导出/复制链接用：套餐若绑定了小说 → 返回小说落地路径（/read/[bookId]）
 * 多本时取最先创建的一本；未绑定返回 null。
 */
export async function getNovelRedirectForPackage(packageId: string): Promise<string | null> {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('books')
    .select('id')
    .eq('is_novel', true)
    .eq('is_published', true)
    .contains('package_ids', [packageId])
    .order('created_at', { ascending: true })
    .limit(1)
  const id = data?.[0]?.id
  return id ? `/read/${id}` : null
}
