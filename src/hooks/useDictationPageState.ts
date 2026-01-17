// src/hooks/useDictationPageState.ts
// 对应方案：Section 7.1 - 听写页面状态管理

import { useState } from 'react'

type PageState = 'idle' | 'loading' | 'saving' | 'switching'

/**
 * 听写页面状态管理
 * 对应方案：Section 7.1 - 职责：防止并发操作冲突、提供操作锁机制、确保状态一致性
 */
export function useDictationPageState() {
  const [pageState, setPageState] = useState<PageState>('idle')
  const [currentOperation, setCurrentOperation] = useState<string | null>(null)

  /**
   * 执行操作（带状态检查）
   * 对应方案：Section 7.1 - executeOperation方法
   */
  async function executeOperation<T>(
    operationName: string,
    state: PageState,
    fn: () => Promise<T>
  ): Promise<T> {
    // 对应方案：Section 7.1 - 1. 检查是否可以执行操作
    if (pageState === 'saving' || pageState === 'switching') {
      throw new Error(`无法执行${operationName}：当前正在${currentOperation}`)
    }

    // 对应方案：Section 7.1 - 2. 设置状态
    setPageState(state)
    setCurrentOperation(operationName)

    try {
      // 对应方案：Section 7.1 - 3. 执行操作
      const result = await fn()
      return result
    } finally {
      // 对应方案：Section 7.1 - 4. 恢复状态
      setPageState('idle')
      setCurrentOperation(null)
    }
  }

  return {
    pageState,
    currentOperation,
    isIdle: pageState === 'idle',
    isLoading: pageState === 'loading',
    isSaving: pageState === 'saving',
    isSwitching: pageState === 'switching',
    canOperate: pageState === 'idle',
    executeOperation
  }
}
