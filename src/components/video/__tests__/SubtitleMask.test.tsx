import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SubtitleMask } from '../SubtitleMask'

describe('video subtitle mask', () => {
  it('toggles directly on the video without invoking player clicks', () => {
    let playerClicks = 0
    render(<div data-subtitle-mask-host onClick={() => { playerClicks++ }}><SubtitleMask /></div>)
    fireEvent.click(screen.getByRole('button', { name: '遮挡字幕' }))
    expect(screen.getByRole('group', { name: '字幕遮挡区域，可拖动或缩放' })).toBeTruthy()
    expect(playerClicks).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: '显示字幕' }))
    expect(screen.queryByRole('group', { name: '字幕遮挡区域，可拖动或缩放' })).toBeNull()
  })
})
