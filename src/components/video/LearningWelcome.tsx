'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export const LEARNING_WELCOME_KEY = 'videos_learning_guide_seen_v1'

export function LearningWelcome() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setOpen(localStorage.getItem(LEARNING_WELCOME_KEY) !== '1') }
      catch { setOpen(true) }
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  const dismiss = () => {
    try { localStorage.setItem(LEARNING_WELCOME_KEY, '1') }
    catch { /* 私密浏览禁用存储时，仍允许用户关闭弹层。 */ }
    setOpen(false)
  }
  return <Dialog open={open} onOpenChange={next => { if (!next) dismiss() }}>
    <DialogContent className="max-w-lg rounded-2xl p-7">
      <p className="text-sm font-semibold text-indigo-600">从看懂，到听懂，再到说出来</p>
      <DialogTitle className="text-2xl font-bold">一条视频，学得更扎实</DialogTitle>
      <DialogDescription className="text-base leading-7">先选一条适合你的内容，再按「盲听 → 精听 → 跟读 → 练习」走一遍。每天从一条开始，不用一次学完所有内容。</DialogDescription>
      <div className="rounded-xl bg-indigo-50 p-4 text-sm leading-7 text-indigo-950">第一次来？看看学习指南，了解每个按钮怎么用，以及如何安排每天的学习。</div>
      <Link href="/videos/guide" onClick={dismiss} className="rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white">查看学习指南</Link>
      <button type="button" onClick={dismiss} className="rounded-xl px-5 py-3 font-medium text-gray-600">先逛逛</button>
    </DialogContent>
  </Dialog>
}
