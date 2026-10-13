import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFrenchTTS } from '../useFrenchTTS'

class TestAudio {
  src = ''
  onplaying: (() => void) | null = null
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  pause = vi.fn()
  rejectPlayback: ((reason: Error) => void) | null = null
  play = vi.fn<() => Promise<void>>(() => new Promise((_resolve, reject) => { this.rejectPlayback = reject }))
  constructor(src?: string) { this.src = src ?? ''; audios.push(this) }
}
class TestUtterance {
  lang = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(public text: string) {}
}
const audios: TestAudio[] = []
const synth = { getVoices: vi.fn((): SpeechSynthesisVoice[] => []), speak: vi.fn(), cancel: vi.fn() }
const frenchVoice = { lang: 'fr-FR' } as SpeechSynthesisVoice

beforeEach(() => {
  vi.useFakeTimers()
  audios.length = 0
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance)
  vi.stubGlobal('speechSynthesis', synth)
  synth.getVoices.mockReturnValue([])
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('French pronunciation failure recovery', () => {
  it('requests the verified dictionary audio endpoint with an explicit French language', () => {
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('  La   caution  '))
    const url = new URL(audios[0].src)
    expect(url.origin).toBe('https://dict.youdao.com')
    expect(url.pathname).toBe('/dictvoice')
    expect(url.searchParams.get('audio')).toBe('la caution')
    expect(url.searchParams.get('le')).toBe('fr')
  })

  it('keeps explicit audio URLs ahead of the system voice and reports playback state', () => {
    synth.getVoices.mockReturnValue([frenchVoice])
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour', '/bonjour.mp3'))
    expect(audios[0].src).toBe('/bonjour.mp3')
    expect(result.current.status).toBe('loading')
    act(() => audios[0].onplaying?.())
    expect(result.current.status).toBe('playing')
    act(() => audios[0].onended?.())
    expect(result.current.status).toBe('idle')
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('reuses the media element across words and stops pending playback', async () => {
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    act(() => result.current.speak('salut'))
    expect(audios).toHaveLength(1)
    expect(audios[0].src).toContain('salut')
    act(() => result.current.stop())
    await act(async () => { await vi.advanceTimersByTimeAsync(16000) })
    expect(result.current.status).toBe('idle')
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('reports a system voice that never starts', async () => {
    synth.getVoices.mockReturnValue([frenchVoice])
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBeTruthy()
    expect(synth.cancel).toHaveBeenCalled()
  })

  it('starts an available French voice synchronously in the click call', () => {
    synth.getVoices.mockReturnValue([frenchVoice])
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    expect(synth.speak).toHaveBeenCalledTimes(1)
    expect(audios).toHaveLength(0)
  })

  it('reports unavailable playback instead of silently swallowing it', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    await act(async () => { audios[0].onerror?.() })
    expect(result.current.error).toBeTruthy()
  })

  it('recovers from an audio request that never settles', async () => {
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
    expect(synth.speak).toHaveBeenCalledTimes(1)
  })

  it('ignores a rejected playback from an older word', async () => {
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    const rejectOldPlayback = audios[0].rejectPlayback
    act(() => result.current.speak('salut'))
    await act(async () => rejectOldPlayback?.(new Error('old request failed')))
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('reports synthesis permission failures and retries synchronously', async () => {
    const { result } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    await act(async () => audios[0].onerror?.())
    const utterance = synth.speak.mock.calls[0][0] as TestUtterance
    act(() => utterance.onerror?.({ error: 'not-allowed' }))
    expect(result.current.error).toBeTruthy()
    act(() => result.current.speak('bonjour'))
    expect(synth.speak).toHaveBeenCalledTimes(2)
  })

  it('cancels late fallback and speech when unmounted', async () => {
    const { result, unmount } = renderHook(() => useFrenchTTS())
    act(() => result.current.speak('bonjour'))
    const rejectOldPlayback = audios[0].rejectPlayback
    unmount()
    await act(async () => { rejectOldPlayback?.(new Error('unmounted')); await vi.advanceTimersByTimeAsync(8000) })
    expect(synth.speak).not.toHaveBeenCalled()
    expect(audios[0].pause).toHaveBeenCalled()
  })
})
