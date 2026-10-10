import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VideoLayout } from '../layout/VideoLayout'
import { VideoMobileNav } from '../layout/VideoMobileNav'

const route = vi.hoisted(() => ({ pathname: '/videos/guide' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('../layout/VideoNav', () => ({ VideoNav: () => <nav aria-label="desktop navigation" /> }))

describe('learning guide and immersive navigation', () => {
  it('keeps guide navigation visible and links mobile users to the guide', () => {
    route.pathname = '/videos/guide'
    render(<VideoLayout><p>guide</p></VideoLayout>)
    expect(screen.getByRole('navigation', { name: 'desktop navigation' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '学习指南' }).getAttribute('href')).toBe('/videos/guide')
  })
  it('hides global navigation on the video learning route', () => {
    route.pathname = '/videos/audit-video'
    render(<VideoLayout><p>lesson</p></VideoLayout>)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByText('lesson')).toBeTruthy()
  })
  it('retains home and profile destinations in mobile navigation', () => {
    route.pathname = '/videos'
    render(<VideoMobileNav />)
    expect(screen.getByRole('link', { name: '首页' }).getAttribute('href')).toBe('/videos')
    expect(screen.getByRole('link', { name: '我的' }).getAttribute('href')).toBe('/profile')
  })
})
