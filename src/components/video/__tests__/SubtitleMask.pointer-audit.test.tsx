import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SubtitleMask } from '../SubtitleMask'

const PLAYER_WIDTH = 1000
const PLAYER_HEIGHT = 500
beforeEach(() => vi.stubGlobal('PointerEvent', MouseEvent))
afterEach(() => vi.unstubAllGlobals())

function openMask() {
  const view = render(<div data-subtitle-mask-host><SubtitleMask /></div>)
  const host = view.container.firstElementChild
  if (!(host instanceof HTMLElement)) throw new Error('Missing player host')
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT))
  fireEvent.click(screen.getByRole('button', { name: '遮挡字幕' }))
  const mask = screen.getByRole('group')
  Object.defineProperty(mask, 'setPointerCapture', { value: vi.fn() })
  return mask
}

describe('subtitle mask pointer interactions', () => {
  it('moves relative to the player and stays inside its bounds', () => {
    const mask = openMask()
    fireEvent.pointerDown(mask, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(mask, { clientX: 150, clientY: 125 })
    expect(mask.style.left).toBe('13%')
    expect(mask.style.top).toBe('78%')
    fireEvent.pointerMove(mask, { clientX: 10000, clientY: 10000 })
    expect(mask.style.left).toBe('16%')
    expect(mask.style.top).toBe('86%')
    fireEvent.pointerUp(mask)
    fireEvent.pointerMove(mask, { clientX: 0, clientY: 0 })
    expect(mask.style.left).toBe('16%')
  })

  it('resizes without moving the mask, enforcing player bounds and minimum size', () => {
    const mask = openMask()
    const handle = mask.firstElementChild
    if (!(handle instanceof HTMLElement)) throw new Error('Missing resize handle')
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() })
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(handle, { clientX: 200, clientY: 200 })
    expect(mask.style.left).toBe('8%')
    expect(mask.style.top).toBe('73%')
    expect(mask.style.width).toBe('92%')
    expect(mask.style.height).toBe('27%')
    fireEvent.pointerMove(handle, { clientX: -10000, clientY: -10000 })
    expect(mask.style.width).toBe('20%')
    expect(mask.style.height).toBe('8%')
    fireEvent.pointerUp(handle)
  })
})
