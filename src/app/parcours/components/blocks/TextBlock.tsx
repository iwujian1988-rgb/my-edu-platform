import type { Block } from '@/data/parcours-mock'

export function TextBlock({ block }: { block: Block }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      {block.title && (
        <h3 className="font-bold text-gray-800 mb-3">{block.title}</h3>
      )}
      <div
        className="course-content-html prose prose-sm max-w-none text-gray-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: block.content || '' }}
      />
    </div>
  )
}
