import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useVideoProgress } from '../useVideoProgress'
import type { UserVideoProgress } from '@/types/video'

const VIDEO_ID = 'audit-video'
const SAVE_INTERVAL_MS = 60_000
const INITIAL_PROGRESS: UserVideoProgress = {
  id: 'audit-progress', user_id: 'audit-user', video_id: VIDEO_ID,
  last_position: 0, watch_duration: 0, max_progress: 0,
  is_completed: false, completed_at: null, updated_at: '2026-10-09T00:00:00Z',
}

afterEach(() => vi.restoreAllMocks())

describe('video completion persistence audit', () => {
  it('propagates strict save failures for the completion UI to retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onSave = vi.fn().mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useVideoProgress({ videoId: VIDEO_ID, onSave }))
    await act(async () => {
      await expect(result.current.saveProgress(true)).rejects.toThrow('network')
    })
    expect(result.current.isSaving).toBe(false)
  })

  it('does not report completion before a failed write has persisted', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useVideoProgress({
      videoId: VIDEO_ID, initialProgress: INITIAL_PROGRESS, onSave,
    }))
    await act(async () => {
      await expect(result.current.markCompleted()).rejects.toThrow('network')
    })
    expect(result.current.isCompleted).toBe(false)
  })

  it('reports a successful first completion even when no prior progress row exists', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useVideoProgress({ videoId: VIDEO_ID, onSave }))
    await act(async () => { await result.current.markCompleted() })
    expect(onSave).toHaveBeenCalledWith({ is_completed: true, max_progress: 100, last_position: 0 })
    expect(result.current.isCompleted).toBe(true)
  })

  it('does not resolve a strict save while an earlier save is still pending', async () => {
    let releaseSave: (() => void) | undefined
    const pending = new Promise<void>(resolve => { releaseSave = resolve })
    const onSave = vi.fn().mockReturnValue(pending)
    const { result } = renderHook(() => useVideoProgress({
      videoId: VIDEO_ID, onSave, saveInterval: SAVE_INTERVAL_MS,
    }))
    let firstSave: Promise<void> | undefined
    act(() => { firstSave = result.current.saveProgress() })
    let strictSettled = false
    let settledBeforePersistence = false
    await act(async () => {
      const strictSave = result.current.saveProgress(true).then(() => { strictSettled = true })
      await Promise.resolve()
      await Promise.resolve()
      settledBeforePersistence = strictSettled
      releaseSave?.()
      await Promise.all([firstSave, strictSave])
    })
    expect(settledBeforePersistence).toBe(false)
  })

  it('retains playback updates received during a pending save', async () => {
    let releaseSave: (() => void) | undefined
    const pending = new Promise<void>(resolve => { releaseSave = resolve })
    const onSave = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined)
    const { result } = renderHook(() => useVideoProgress({
      videoId: VIDEO_ID, onSave, saveInterval: SAVE_INTERVAL_MS,
    }))
    act(() => result.current.updateProgress(10, 100))
    await act(async () => {
      const saving = result.current.saveProgress()
      await Promise.resolve()
      result.current.updateProgress(11, 100)
      releaseSave?.()
      await saving
    })
    await act(async () => { await result.current.saveProgress(true) })
    expect(onSave).toHaveBeenNthCalledWith(1, {
      last_position: 10, max_progress: 10, watch_duration_increment: 1,
    })
    expect(onSave).toHaveBeenNthCalledWith(2, {
      last_position: 11, max_progress: 11, watch_duration_increment: 1,
    })
  })

  it('retries a failed completion without prematurely changing progress or clearing position', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined)
    const { result } = renderHook(() => useVideoProgress({
      videoId: VIDEO_ID, initialProgress: INITIAL_PROGRESS, onSave,
    }))
    act(() => result.current.updateProgress(25, 100))
    await act(async () => {
      await expect(result.current.markCompleted()).rejects.toThrow('network')
    })
    expect(result.current.maxProgress).toBe(25)
    expect(result.current.progress?.is_completed).toBe(false)
    await act(async () => { await result.current.markCompleted() })
    expect(result.current.isCompleted).toBe(true)
    expect(result.current.progress?.is_completed).toBe(true)
    expect(onSave).toHaveBeenLastCalledWith({
      is_completed: true, max_progress: 100, last_position: 25,
    })
  })

  it('serializes completion behind a pending progress write', async () => {
    let releaseSave: (() => void) | undefined
    const pending = new Promise<void>(resolve => { releaseSave = resolve })
    const onSave = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined)
    const { result } = renderHook(() => useVideoProgress({ videoId: VIDEO_ID, onSave }))
    await act(async () => {
      const saving = result.current.saveProgress()
      await Promise.resolve()
      const completion = result.current.markCompleted()
      await Promise.resolve()
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(result.current.isCompleted).toBe(false)
      releaseSave?.()
      await Promise.all([saving, completion])
    })
    expect(result.current.isCompleted).toBe(true)
    expect(onSave).toHaveBeenCalledTimes(2)
    expect(result.current.isSaving).toBe(false)
  })

  it('allows a strict retry after a failed background write without discarding watch duration', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onSave = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined)
    const { result } = renderHook(() => useVideoProgress({ videoId: VIDEO_ID, onSave }))
    act(() => result.current.updateProgress(10, 100))
    await act(async () => {
      const background = result.current.saveProgress()
      const retry = result.current.saveProgress(true)
      await Promise.all([background, retry])
    })
    expect(onSave).toHaveBeenCalledTimes(2)
    expect(onSave).toHaveBeenLastCalledWith({
      last_position: 10, max_progress: 10, watch_duration_increment: 1,
    })
    expect(result.current.isSaving).toBe(false)
  })
})
