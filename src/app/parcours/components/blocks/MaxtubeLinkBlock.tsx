import type { Block } from '@/data/parcours-mock'

export function MaxtubeLinkBlock({ block }: { block: Block }) {
  const href = block.url || '/videos?language=fr'
  const isExternal = /^https?:\/\//i.test(href)

  return (
    <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-5 dark:border-indigo-800 dark:bg-gray-950 dark:from-indigo-950/40 dark:to-purple-950/40">
      <h3 className="mb-2 font-bold text-indigo-800 dark:text-indigo-200">{block.title}</h3>
      {block.description && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{block.description}</p>
      )}
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden
        >
          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
        </svg>
        前往 Maxtube
      </a>
    </div>
  )
}
