'use client'

import { useEffect, useRef } from 'react'

export default function TestAutoFocusPage() {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        console.log('自动聚焦已触发')
      }
    }, 500)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">测试自动聚焦</h1>
      <input
        ref={inputRef}
        type="text"
        placeholder="这个输入框应该自动聚焦"
        className="border-2 border-black p-2"
      />
      <p className="mt-4 text-gray-600">
        如果页面加载后光标已经在输入框中，说明自动聚焦功能正常。
      </p>
    </div>
  )
}
