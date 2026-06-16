'use client'

import type { Block } from '@/data/parcours-mock'
import { TextBlock } from './TextBlock'
import { VideoBlock } from './VideoBlock'
import { ExerciseBlock } from './ExerciseBlock'
import { MaxtubeLinkBlock } from './MaxtubeLinkBlock'
import { QuizBlock } from './QuizBlock'

export function BlockRenderer({
  block,
  onCompleted,
}: {
  block: Block
  onCompleted?: () => void
}) {
  switch (block.type) {
    case 'text':
      return <TextBlock block={block} />
    case 'video':
      return <VideoBlock block={block} />
    case 'exercise':
      return <ExerciseBlock block={block} />
    case 'maxtube_link':
      return <MaxtubeLinkBlock block={block} />
    case 'quiz':
      return <QuizBlock block={block} onCompleted={onCompleted} />
    default:
      return (
        <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300 text-sm text-gray-400">
          <p>{block.title || '未知内容类型'}</p>
          <p className="text-xs mt-1">
            Block type &quot;{block.type}&quot; 暂不支持渲染。
          </p>
        </div>
      )
  }
}
