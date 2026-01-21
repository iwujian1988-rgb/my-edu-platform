'use client'

import { useState } from 'react'
import { BookSelectorModal } from '@/components/BookSelectorModal'

// 测试数据
const testBooks = [
  {
    id: '1',
    title: 'CET-4 核心词汇',
    name: 'CET-4 核心词汇',
    description: '大学英语四级核心词汇',
    total_words: 4500,
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_official: true,
    published: true,
  },
  {
    id: '2',
    title: 'CET-6 高频词汇',
    name: 'CET-6 高频词汇',
    description: '大学英语六级高频词汇',
    total_words: 6000,
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_official: true,
    published: true,
  }
]

export default function TestModalPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">BookSelectorModal 测试页面</h1>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <p className="text-gray-600 mb-6">
            点击下面的按钮打开单词本选择器
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[#B4F416] border-4 border-black text-black font-black py-4 px-8 rounded-xl hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_#000] active:translate-y-0 transition-all"
          >
            打开单词本选择器
          </button>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-bold text-lg mb-2">测试数据：</h2>
            <ul className="list-disc list-inside text-gray-700">
              <li>CET-4 核心词汇 (4,500词)</li>
              <li>CET-6 高频词汇 (6,000词)</li>
            </ul>
          </div>
        </div>
      </div>

      {showModal && (
        <BookSelectorModal
          books={testBooks}
          onClose={() => setShowModal(false)}
          userId="test-user"
        />
      )}
    </div>
  )
}
