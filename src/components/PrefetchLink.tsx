'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback } from 'react'

/**
 * 带 hover prefetch 的 Link 组件
 *
 * Next.js 默认只 prefetch viewport 内的链接，
 * 这个组件在鼠标悬停时主动 prefetch 目标页路由，
 * 让点击时页面数据已就绪，实现即时导航。
 */
export function PrefetchLink({
  href,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  const router = useRouter()

  const handleMouseEnter = useCallback(() => {
    router.prefetch(String(href))
  }, [router, href])

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </Link>
  )
}
