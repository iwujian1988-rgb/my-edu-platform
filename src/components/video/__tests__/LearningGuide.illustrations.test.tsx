import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import LearningGuidePage from '@/app/videos/guide/page'

vi.mock('next/image', () => ({
  // 模拟图片优化组件，便于断言原始资源路径而非优化 URL。
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const STEP_NAMES = ['choose', 'listen', 'study', 'speak', 'practice', 'review']

describe('illustrated learning guide', () => {
  it('gives every learning introduction a distinct, accessible local illustration', () => {
    render(<LearningGuidePage />)
    const illustrations = screen.getAllByRole('img')
    expect(illustrations).toHaveLength(STEP_NAMES.length)
    STEP_NAMES.forEach((name, index) => {
      const source = `/images/video-guide/${name}.webp`
      expect(illustrations[index]).toHaveAttribute('src', source)
      expect(illustrations[index].getAttribute('alt')).toBeTruthy()
      expect(existsSync(resolve(process.cwd(), `public${source}`))).toBe(true)
    })
  })

  it('links every shortcut to its own introduction and keeps the start-learning action', () => {
    render(<LearningGuidePage />)
    STEP_NAMES.forEach(name => {
      expect(document.querySelector(`a[href="#${name}"]`)).not.toBeNull()
      expect(document.getElementById(name)).not.toBeNull()
    })
    expect(screen.getByRole('link', { name: /选一条视频开始/ })).toHaveAttribute('href', '/videos')
    expect(screen.getByRole('heading', { name: '按你今天的时间来安排' })).toBeInTheDocument()
  })
})
