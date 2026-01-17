// 全局类型声明
declare global {
  interface Window {
    updateFlashcardStats?: (oldStatus: string | null, newStatus: string) => void
  }
}

export {}
