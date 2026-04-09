'use client'

/**
 * 路由切换顶部进度条
 *
 * 监听 Next.js App Router 的路由事件，
 * 在页面切换时显示顶部荧光绿进度条。
 * 不依赖 nprogress，纯手写 ~60 行。
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const BAR_COLOR = '#B4F416'
const BAR_HEIGHT = 3

export function TopLoadingBar() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 路由变化开始 → 显示进度条
    setVisible(true)
    setProgress(20)

    const t1 = setTimeout(() => setProgress(60), 100)
    const t2 = setTimeout(() => setProgress(85), 300)

    // 路由变化完成（pathname 已更新）→ 完成
    const done = () => {
      setProgress(100)
      setTimeout(() => setVisible(false), 200)
    }

    // pathname 更新即代表新页面已挂载
    const t3 = setTimeout(done, 50)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pathname])

  // 首次加载不显示
  if (!visible && progress === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${progress}%`,
        height: `${BAR_HEIGHT}px`,
        background: BAR_COLOR,
        boxShadow: `0 0 8px ${BAR_COLOR}`,
        zIndex: 99999,
        opacity: visible ? 1 : 0,
        transition: visible
          ? 'width 200ms ease-out, opacity 150ms'
          : 'width 100ms ease-out, opacity 200ms 100ms',
      }}
    />
  )
}
