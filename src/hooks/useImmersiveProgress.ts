'use client'

import { useState, useCallback, useEffect } from 'react'

export type ImmersivePhase =
  | 'phase1_blindListen'
  | 'phase2_intensiveListen'
  | 'phase3_vocabulary'
  | 'phase4_shadowReading'
  | 'phase5_grammar'
  | 'phase6_exercises'
  | 'phase7_summary'

export interface ImmersivePhaseProgress {
  phase1_blindListen: boolean
  phase2_intensiveListen: boolean
  phase3_vocabulary: boolean
  phase4_shadowReading: boolean
  phase5_grammar: boolean
  phase6_exercises: boolean
  phase7_summary: boolean
}

const DEFAULT_PROGRESS: ImmersivePhaseProgress = {
  phase1_blindListen: false,
  phase2_intensiveListen: false,
  phase3_vocabulary: false,
  phase4_shadowReading: false,
  phase5_grammar: false,
  phase6_exercises: false,
  phase7_summary: false,
}

const STORAGE_KEY_PREFIX = 'immersive-progress-'

export function useImmersiveProgress(videoId: string) {
  const [progress, setProgress] = useState<ImmersivePhaseProgress>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + videoId)
      if (raw) {
        return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) }
      }
    } catch {
      // ignore parse errors
    }
    return { ...DEFAULT_PROGRESS }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + videoId, JSON.stringify(progress))
    } catch {
      // ignore storage errors
    }
  }, [videoId, progress])

  const markPhaseComplete = useCallback((phase: ImmersivePhase) => {
    setProgress(prev => {
      if (prev[phase]) return prev
      return { ...prev, [phase]: true }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setProgress({ ...DEFAULT_PROGRESS })
  }, [])

  const completedCount = Object.values(progress).filter(Boolean).length

  return { progress, markPhaseComplete, resetProgress, completedCount }
}
