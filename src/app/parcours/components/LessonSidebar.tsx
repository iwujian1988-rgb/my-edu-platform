'use client'

import type { Block, BlockType } from '@/data/parcours-mock'

const TYPE_LABELS: Record<BlockType, string> = {
  text: '文字讲解',
  video: '视频',
  exercise: '练习',
  quiz: '小测验',
  maxtube_link: 'Maxtube',
  audio: '音频',
  image: '图片',
}

function TypeIcon({ type }: { type: BlockType }) {
  const common = 'w-4 h-4'
  if (type === 'text') {
    return (
      <svg
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    )
  }
  if (type === 'video') {
    return (
      <svg
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    )
  }
  if (type === 'exercise') {
    return (
      <svg
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    )
  }
  if (type === 'quiz') {
    return (
      <svg
        className={common}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    )
  }
  // default: link icon
  return (
    <svg
      className={common}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  )
}

export function LessonSidebar({
  blocks,
  blockIds,
  activeIndex,
  lessonId,
  isBlockDone,
  onSelect,
}: {
  blocks: Block[]
  blockIds: string[]
  activeIndex: number
  lessonId: string
  isBlockDone: (lessonId: string, blockId: string) => boolean
  onSelect: (index: number) => void
}) {
  return (
    <nav className="space-y-1">
      {blocks.map((block, bi) => {
        const done = isBlockDone(lessonId, blockIds[bi])
        const isActive = bi === activeIndex
        const containerCls = isActive
          ? 'bg-primary-50 text-primary-700 font-medium border border-primary-200'
          : done
            ? 'text-green-700 hover:bg-green-50'
            : 'text-gray-500 hover:bg-gray-50'

        return (
          <button
            key={bi}
            onClick={() => onSelect(bi)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${containerCls}`}
          >
            <span
              className={`shrink-0 ${
                isActive
                  ? 'text-primary-500'
                  : done
                    ? 'text-green-500'
                    : 'text-gray-400'
              }`}
            >
              {done && !isActive ? (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : isActive ? (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              ) : (
                <TypeIcon type={block.type} />
              )}
            </span>
            <span className="truncate flex-1">
              {block.title || TYPE_LABELS[block.type]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
