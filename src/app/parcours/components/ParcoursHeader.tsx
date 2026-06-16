'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function ParcoursHeader() {
  const pathname = usePathname()

  return (
    <header className="relative z-30">
      {/* MetaNav: 顶部暗灰条 */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-10 text-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold text-xs tracking-wider uppercase">
              MAX 外语 · 法语
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span
              className="hidden sm:inline-block"
              aria-label="French flag"
              title="Français"
            >
              🇫🇷
            </span>
            <button
              type="button"
              className="hidden sm:inline-block hover:text-primary-300 transition-colors"
              aria-label="Search"
            >
              搜索
            </button>
            <Link
              href="/profile"
              className="hover:text-primary-300 transition-colors"
            >
              我的
            </Link>
          </div>
        </div>
      </div>

      {/* MainNav: sticky 白色导航 */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link
              href="/parcours"
              className="flex items-center gap-2 font-bold text-lg text-primary-800"
            >
              <span className="text-2xl" aria-hidden>
                🗼
              </span>
              <span className="hidden sm:inline">MAX 外语</span>
            </Link>
            <nav className="hidden md:flex items-center gap-2 ml-6">
              <Link
                href="/parcours"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname?.startsWith('/parcours')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                MaxClass
              </Link>
              <Link
                href="/videos"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                MaxTube
              </Link>
              <a
                href="https://maxnote.example.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                MaxNote
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
