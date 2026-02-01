'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from './AppSidebar'
import { SettingsView } from './SettingsView'
import { FilterableBookGrid } from './FilterableBookGrid'
import { MobileBottomNav } from './MobileBottomNav'

interface LibraryClientProps {
  books: any[]
  userId?: string
}

export function LibraryClient({ books, userId }: LibraryClientProps) {
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard')

  useEffect(() => {
    console.log('LibraryClient view changed to:', view)
  }, [view])

  const handleViewChange = (newView: 'dashboard' | 'settings') => {
    console.log('LibraryClient handleViewChange called with:', newView)
    setView(newView)
  }

  return (
    <>
      <AppSidebar
        books={books}
        currentView={view}
        onViewChange={handleViewChange}
      />
      {view === 'settings' ? (
        <div className="lg:ml-64 min-h-screen p-4 md:p-8 pb-20 lg:pb-8 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <SettingsView />
          </div>
        </div>
      ) : (
        <div className="lg:ml-64 pb-20 lg:pb-0">
          {books.length === 0 ? (
            <div className="min-h-screen p-8 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="max-w-7xl mx-auto text-center py-16 border-[3px] border-black rounded transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)' }}>
                <p className="font-bold mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>还没有可用的词库</p>
                <p className="text-sm transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>请联系管理员获取词库访问权限</p>
              </div>
            </div>
          ) : (
            <FilterableBookGrid books={books} />
          )}
        </div>
      )}
      <MobileBottomNav
        currentView={view}
        onViewChange={handleViewChange}
      />
    </>
  )
}
