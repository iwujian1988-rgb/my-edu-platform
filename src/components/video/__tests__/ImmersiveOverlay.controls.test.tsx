import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ImmersiveOverlay } from '../immersive/ImmersiveOverlay'

vi.mock('../VideoPlayer', () => ({ VideoPlayer: () => <video data-testid="main-video" /> }))
vi.mock('../AudioPlayer', () => ({ AudioPlayer: () => <audio /> }))
vi.mock('../SubtitleMask', () => ({ SubtitleMask: () => null }))
vi.mock('../CardPopover', () => ({ CardPopover: () => null }))
vi.mock('../immersive/ImmersiveAccordion', () => ({ ImmersiveAccordion: () => <div>练习区</div> }))

function props(): React.ComponentProps<typeof ImmersiveOverlay> {
  const noop = vi.fn()
  return {
    data: { video: { id: 'test-video', title: '测试访谈', video_url: '/test.mp4', language: 'fr' }, subtitles: [{ id: 's1', start_time: 0, end_time: 10, original_text: 'Bonjour', chinese_text: '你好' }], cards: { words: [], expressions: [], phrases: [] }, exercises: [] } as unknown as React.ComponentProps<typeof ImmersiveOverlay>['data'],
    videoId: 'test-video', isLargeScreen: true, isAudioContent: false,
    currentVideoTime: 1, seekToTime: undefined, seekTrigger: 0, segmentEndTime: undefined, pauseMainVideo: false,
    mainVideoRef: { current: null }, mainAudioRef: { current: null },
    onTimeUpdate: noop, onSeekTo: noop, onSeekTrigger: noop, onSubtitleClick: noop,
    onPlaySegment: noop, onHighlightClick: noop, onPauseMainVideo: noop, onResumeMainVideo: noop,
    onExit: noop, onCompleteLearning: vi.fn().mockResolvedValue(undefined), displayMode: 'bilingual',
    selectedCard: null, onSelectedCardClose: noop, exerciseProgressMap: null,
    onRecordExerciseAnswer: noop, getCardStatus: noop, onCardStatusChange: vi.fn().mockResolvedValue(undefined),
    shouldAutoEnable: false, onVideoEnded: noop, shadowReadingSubtitles: [],
  }
}

describe('immersive subtitle controls', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    localStorage.clear()
  })

  it('lets the learner hide and restore subtitles without remounting the video', () => {
    render(<ImmersiveOverlay {...props()} />)
    const video = screen.getByTestId('main-video')
    fireEvent.click(screen.getByRole('button', { name: '隐藏字幕' }))
    expect(screen.queryByText('Bonjour')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '显示字幕' }))
    expect(screen.getByText('Bonjour')).toBeTruthy()
    expect(screen.getByTestId('main-video')).toBe(video)
  })
})
