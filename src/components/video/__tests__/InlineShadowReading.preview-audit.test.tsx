import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InlineShadowReading } from '../immersive/InlineShadowReading'

vi.mock('@/hooks/useShadowReading', () => ({
  useShadowReading: () => ({ practicedIds: [], cleanup: vi.fn() }),
}))
vi.mock('@/services/shadowRecordingStorage', () => ({
  getAllRecordings: vi.fn().mockResolvedValue([]),
  getRecordingCount: vi.fn().mockResolvedValue(0),
}))
vi.mock('@/components/video/ShadowReadingIntro', () => ({
  ShadowReadingIntro: () => <p>跟读引导</p>,
}))
vi.mock('@/components/video/ShadowReadingPlayer', () => ({
  ShadowReadingPlayer: () => <p>跟读播放器</p>,
}))

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true, json: async () => ({ success: true, data: null }),
})))
afterEach(() => vi.unstubAllGlobals())

const VIDEO_URL = 'https://example.test/audit-video.mp4'

describe('inline shadow-reading preview integration', () => {
  it('pauses the main player when the real preview video emits play', async () => {
    const pauseMain = vi.fn()
    render(<InlineShadowReading videoId="audit-video" videoUrl={VIDEO_URL}
      subtitles={[]} onPauseMainVideo={pauseMain} onResumeMainVideo={vi.fn()} />)
    const preview = await screen.findByLabelText('跟读小视频')
    expect(preview.getAttribute('src')).toBe(VIDEO_URL)
    expect(preview.hasAttribute('playsinline')).toBe(true)
    expect(preview.getAttribute('preload')).toBe('metadata')
    expect(pauseMain).not.toHaveBeenCalled()
    fireEvent.play(preview)
    expect(pauseMain).toHaveBeenCalledTimes(1)
  })

  it('does not render a video preview for audio-only content', async () => {
    render(<InlineShadowReading videoId="audit-audio" videoUrl={VIDEO_URL} isAudio
      subtitles={[]} onPauseMainVideo={vi.fn()} onResumeMainVideo={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('跟读引导')).toBeTruthy())
    expect(screen.queryByLabelText('跟读小视频')).toBeNull()
  })

  it('shows a useful message when no media resource exists', () => {
    render(<InlineShadowReading videoId="audit-video" videoUrl={null}
      subtitles={[]} onPauseMainVideo={vi.fn()} onResumeMainVideo={vi.fn()} />)
    expect(screen.getByText('暂无音视频资源，无法使用跟读功能')).toBeTruthy()
    expect(screen.queryByLabelText('跟读小视频')).toBeNull()
  })
})
