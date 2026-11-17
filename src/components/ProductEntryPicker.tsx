'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { BookOpen, GraduationCap, Languages, Play } from 'lucide-react'
import type { ProductEntry } from '@/lib/product-entries'

const ENTRY_APPEARANCE = {
  maxnote: { icon: BookOpen, backgroundColor: '#22C55E', color: '#FFFFFF' },
  video: { icon: Play, backgroundColor: '#B4F416', color: '#000000' },
  novel: { icon: BookOpen, backgroundColor: '#ADD8E6', color: '#000000' },
  'work-english': { icon: GraduationCap, backgroundColor: '#FDBCB4', color: '#000000' },
  'french-atlas': { icon: Languages, backgroundColor: '#F6F1E7', color: '#182033' },
} as const

export function ProductEntryPicker({ entries }: { entries: ProductEntry[] }) {
  const novelsOnly = entries.length > 0 && entries.every(entry => entry.kind === 'novel')
  return (
    <Dialog.Root open={entries.length > 1}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-[60]" />
        <Dialog.Content
          onEscapeKeyDown={event => event.preventDefault()}
          onPointerDownOutside={event => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 md:p-10"
          style={{ backgroundColor: 'var(--card-bg)', border: '3px solid #000000', borderRadius: '16px', boxShadow: '6px 6px 0px 0px #000000' }}
        >
          <div className="text-center mb-6 md:mb-8">
            <Dialog.Title className="text-2xl md:text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
              {novelsOnly ? '选择小说' : '选择学习入口'}
            </Dialog.Title>
            <Dialog.Description className="text-sm md:text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {novelsOnly ? '选择一本开始阅读' : '你拥有多个产品权限，请选择要进入的学习产品'}
            </Dialog.Description>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {entries.map(entry => {
              const { icon: Icon, ...colors } = ENTRY_APPEARANCE[entry.kind]
              return (
                <a
                  key={entry.id}
                  href={entry.href}
                  className="min-w-0 flex flex-col items-center gap-3 p-5 md:p-6 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4"
                  style={{ ...colors, border: '3px solid #000000', borderRadius: '14px', boxShadow: '4px 4px 0px 0px #000000' }}
                >
                  {entry.kind === 'novel' && entry.coverUrl ? (
                    // The cover is decorative; the adjacent book title names the link.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.coverUrl} alt="" className="w-28 sm:w-32 aspect-[2/3] object-cover rounded-lg shadow-md" />
                  ) : (
                    <Icon className="w-10 h-10 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  )}
                  <span className="w-full break-words text-lg md:text-xl font-black">{entry.title}</span>
                  <span className="text-xs md:text-sm font-semibold opacity-80">{entry.description}</span>
                </a>
              )
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
