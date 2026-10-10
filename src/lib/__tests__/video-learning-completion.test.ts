import { describe, expect, it, vi } from 'vitest'
import { completeLearningAndReturn } from '../video-learning-completion'

describe('completeLearningAndReturn', () => {
  it('does not mark complete or leave when the initial save fails', async () => {
    const markCompleted = vi.fn()
    const returnHome = vi.fn()
    await expect(completeLearningAndReturn({
      saveProgress: async () => { throw new Error('save failed') }, markCompleted, returnHome,
    })).rejects.toThrow('save failed')
    expect(markCompleted).not.toHaveBeenCalled()
    expect(returnHome).not.toHaveBeenCalled()
  })
  it('can successfully retry after a completion write failure', async () => {
    const markCompleted = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
    const returnHome = vi.fn()
    const actions = { saveProgress: vi.fn().mockResolvedValue(undefined), markCompleted, returnHome }
    await expect(completeLearningAndReturn(actions)).rejects.toThrow('network')
    await completeLearningAndReturn(actions)
    expect(markCompleted).toHaveBeenCalledTimes(2)
    expect(returnHome).toHaveBeenCalledTimes(1)
  })
  it('saves completion before leaving the lesson', async () => {
    const order: string[] = []
    await completeLearningAndReturn({ saveProgress: async () => { order.push('save') }, markCompleted: async () => { order.push('complete') }, returnHome: () => { order.push('home') } })
    expect(order).toEqual(['save', 'complete', 'home'])
  })
  it('does not leave when completion persistence fails', async () => {
    const returnHome = vi.fn()
    await expect(completeLearningAndReturn({ saveProgress: async () => {}, markCompleted: async () => { throw new Error('network') }, returnHome })).rejects.toThrow('network')
    expect(returnHome).not.toHaveBeenCalled()
  })
})
