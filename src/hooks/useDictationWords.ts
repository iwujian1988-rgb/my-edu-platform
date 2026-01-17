// src/hooks/useDictationWords.ts
// 对应方案：Section 6.6.3 - useDictationWords: 获取单词列表

import { useState, useEffect } from 'react'
import { dictationService } from '@/services/dictationService'
import { DictationScopeType } from '@/types/dictation'

/**
 * useDictationWords: 获取单词列表
 * 对应方案：Section 6.6.3
 */
export function useDictationWords(
  bookId: string,
  scopeType: DictationScopeType,
  shuffle: boolean = false
) {
  const [words, setWords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchWords() {
      // 对应方案：防御性编程 - 参数校验
      if (!bookId || !scopeType) return

      setLoading(true)
      setError(null)

      try {
        const data = await dictationService.getWords(bookId, scopeType, shuffle)

        if (!mounted) return

        setWords(data)
      } catch (err) {
        console.error('❌ [useDictationWords] 获取单词列表失败:', err)
        if (!mounted) return
        setError(err as Error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchWords()

    return () => {
      mounted = false
    }
  }, [bookId, scopeType, shuffle])

  return {
    words,
    loading,
    error
  }
}
