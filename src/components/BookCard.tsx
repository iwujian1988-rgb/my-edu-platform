'use client'

import Link from 'next/link'
import { BookOpen, ArrowRight, GraduationCap } from 'lucide-react'

interface Book {
  id: string
  title: string
  description: string
  total_words: number
  cover_url?: string
  cover_color?: string
}

export function BookCard({ book, index }: { book: Book; index: number }) {
  const router = useRouter()
  const variants = [
    { variant: 'typo' as const, color: 'bg-[#B4F416]', tag: '考试' },
    { variant: 'stripes' as const, color: 'bg-[#FF6B6B]', tag: '场景' },
    { variant: 'grid' as const, color: 'bg-[#4ECDC4]', tag: '教材' },
    { variant: 'default' as const, color: 'bg-[#A29BFE]', tag: '其他' }
  ]

  const config = variants[index % variants.length]

  // 记录点击到最近访问
  const handleClick = () => {
    // 异步发送请求，不等待结果，让Link正常跳转
    fetch('/api/recent-books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id })
    }).catch(error => {
      console.error('Failed to record book access:', error)
    })
  }

  return (
    <Link href={`/library/${book.id}`} className="group" onClick={handleClick}>
      <div className="flex flex-col bg-white border-[3px] border-black rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_#000] lg:shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all cursor-pointer h-full">
        {/* 封面 */}
        <div className="h-32 border-b-[3px] border-black relative bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-6xl font-black text-gray-200">
            {book.title?.slice(0, 2).toUpperCase() || '词'}
          </div>
          <div className="absolute top-2 left-2">
            <span className="bg-white text-black border-[3px] border-black text-[10px] font-bold px-2 py-0.5 rounded-md shadow-[2px_2px_0px_0px_#000]">
              {config.tag}
            </span>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-4 flex-1 flex flex-col gap-3">
          <div>
            <h3 className="font-black text-lg leading-tight text-black mb-1 line-clamp-1">{book.title || '未命名词书'}</h3>
            <p className="text-xs font-bold text-gray-400 line-clamp-2">{book.description || '暂无描述'}</p>
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 border-t-2 border-gray-100">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-black" strokeWidth={2} />
              <span className="text-xs font-black text-black">{book.total_words?.toLocaleString() || 0} 词</span>
            </div>

            <div className="w-8 h-8 rounded-lg bg-black text-white border-[3px] border-black flex items-center justify-center transition-all group-hover:bg-[#B4F416] group-hover:text-black">
              <ArrowRight size={18} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
