import type { Block } from '@/data/parcours-mock'

export function TextBlock({ block }: { block: Block }) {
  return (
    <div
      className="rounded-lg border p-4 md:p-5"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {block.title && (
        <h3
          className="mb-2 text-base font-bold leading-snug md:mb-3 md:text-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          {block.title}
        </h3>
      )}
      <div
        className="course-content-html max-w-none text-[15px] leading-7 md:text-base"
        style={{ color: 'var(--text-secondary)' }}
        dangerouslySetInnerHTML={{ __html: block.content || '' }}
      />
    </div>
  )
}
