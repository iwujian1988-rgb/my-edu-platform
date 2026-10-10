import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { DesktopFloatingPlayer } from '../DesktopFloatingPlayer'

const KEY = 'video.desktopFloating.enabled'

describe('desktop floating playback', () => {
  beforeEach(() => { localStorage.clear() })

  function scrollPast() {
    const slot = screen.getByTestId('floating-player-slot')
    vi.spyOn(slot, 'getBoundingClientRect').mockReturnValue({ bottom: -1, top: -401, height: 400 } as DOMRect)
    act(() => { window.dispatchEvent(new Event('scroll')) })
  }

  it('floats the same video node and restores it when scrolling back', () => {
    render(<DesktopFloatingPlayer desktop><video data-testid="video" /></DesktopFloatingPlayer>)
    const video = screen.getByTestId('video')
    scrollPast()
    expect(screen.getByTestId('floating-player-frame')).toHaveAttribute('data-floating', 'true')
    expect(screen.getByTestId('video')).toBe(video)
    vi.spyOn(screen.getByTestId('floating-player-slot'), 'getBoundingClientRect').mockReturnValue({ bottom: 400 } as DOMRect)
    fireEvent.scroll(window)
    expect(screen.getByTestId('floating-player-frame')).toHaveAttribute('data-floating', 'false')
    expect(screen.getByTestId('video')).toBe(video)
  })

  it('remembers closing across remounts and permits re-enabling', () => {
    const view = render(<DesktopFloatingPlayer desktop><video /></DesktopFloatingPlayer>)
    scrollPast()
    fireEvent.click(screen.getByRole('button', { name: '关闭悬浮播放' }))
    expect(localStorage.getItem(KEY)).toBe('false')
    view.unmount()
    render(<DesktopFloatingPlayer desktop><video /></DesktopFloatingPlayer>)
    scrollPast()
    expect(screen.getByTestId('floating-player-frame')).toHaveAttribute('data-floating', 'false')
    fireEvent.click(screen.getByRole('button', { name: '开启滚动悬浮' }))
    expect(screen.getByTestId('floating-player-frame')).toHaveAttribute('data-floating', 'true')
    expect(localStorage.getItem(KEY)).toBe('true')
  })

  it('does not float or show desktop controls on mobile', () => {
    render(<DesktopFloatingPlayer desktop={false}><video /></DesktopFloatingPlayer>)
    scrollPast()
    expect(screen.getByTestId('floating-player-frame')).toHaveAttribute('data-floating', 'false')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('continues to function when storage is blocked', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    render(<DesktopFloatingPlayer desktop><video /></DesktopFloatingPlayer>)
    scrollPast()
    fireEvent.click(screen.getByRole('button', { name: '关闭悬浮播放' }))
    expect(screen.getByTestId('floating-player-frame')).toHaveAttribute('data-floating', 'false')
    read.mockRestore()
    write.mockRestore()
  })
})
