// src/hooks/useDictationProgress.ts
// 对应方案：Section 6.6.2 - useDictationProgress: 管理听写进度

import { useState, useEffect, useCallback } from 'react'
import { dictationService } from '@/services/dictationService'
import { progressManager } from '@/services/progressManager'
import { DictationScopeType, DictationProgress } from '@/types/dictation'

/**
 * useDictationProgress: 管理听写进度
 * 对应方案：Section 6.6.2
 */
export function useDictationProgress(
  bookId: string,
  scopeType: DictationScopeType,
  totalWords: number
) {
  const [progress, setProgress] = useState<DictationProgress>({
    currentIndex: 0,
    totalWords: 0,
    lastStudyTime: Date.now()
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 对应方案：Section 6.6.2 - 加载进度
  useEffect(() => {
    let mounted = true

    async function fetchProgress() {
      // 对应方案：防御性编程 - 参数校验
      if (!bookId || !scopeType) return

      setLoading(true)
      setError(null)

      try {
        const data = await dictationService.getProgress(bookId, scopeType)

        if (!mounted) return

        if (data) {
          setProgress(data)
        } else {
          // 对应方案：Section 6.6.2 - 没有进度，使用默认值
          setProgress({
            currentIndex: 0,
            totalWords: 0,
            lastStudyTime: Date.now()
          })
        }
      } catch (err) {
        console.error('❌ [useDictationProgress] 获取进度失败:', err)
        if (!mounted) return
        setError(err as Error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchProgress()

    return () => {
      mounted = false
    }
  }, [bookId, scopeType])

  /**
   * 保存进度（使用progressManager防抖）
   * 对应方案：Section 6.6.2 - 防抖保存实现
   */
  const saveProgress = useCallback((currentIndex: number) => {
    try {
      // 对应方案：Section 6.6.2 - 1. 使用progressManager防抖保存
      progressManager.saveProgress(bookId, scopeType, currentIndex, totalWords)

      // 对应方案：Section 6.6.2 - 2. 保存到resumeState（用于首页"继续学习"）
      // TODO: 实现resumeState保存逻辑
      // saveResumeState(bookId, 'dictation', {
      //   scope: scopeType,
      //   index: currentIndex,
      //   totalWords: totalWords
      // })

      // 对应方案：Section 6.6.2 - 3. 更新本地状态
      setProgress(prev => ({
        ...prev,
        currentIndex,
        lastStudyTime: Date.now()
      }))

      console.log(`✅ [useDictationProgress] 进度已加入保存队列: ${currentIndex + 1}/${totalWords}`)
    } catch (err) {
      console.error('❌ [useDictationProgress] 保存进度失败:', err)
      // 对应方案：防御性编程 - 静默失败，不影响用户继续学习
    }
  }, [bookId, scopeType, totalWords])

  // 对应方案：Section 6.6.2 - 组件卸载时，确保保存所有待保存的进度
  useEffect(() => {
    return () => {
      progressManager.flush()
    }
  }, [])

  return {
    progress,
    loading,
    error,
    saveProgress
  }
}
