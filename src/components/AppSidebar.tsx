'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Library, Dumbbell, Settings, Cat } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: any
  comingSoon?: boolean
}

const navItems: NavItem[] = [
  { label: '工作台', href: '/', icon: Home },
  { label: '系统词库', href: '/library', icon: Library },
  { label: '肌肉训练', href: '/training', icon: Dumbbell, comingSoon: true },
  { label: '账号设置', href: '/settings', icon: Settings, comingSoon: true },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop/Pad Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#F1F5F9] border-r-[3px] border-black flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b-[3px] border-black bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#B4F416] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <Cat size={28} strokeWidth={3} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">喵喵笔记</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] border-black bg-gray-100 opacity-60 cursor-not-allowed relative"
                >
                  <Icon size={24} strokeWidth={2} className="text-gray-400" />
                  <span className="font-bold text-gray-400">{item.label}</span>
                  <span className="absolute right-3 text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md border border-gray-300">
                    敬请期待
                  </span>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] transition-all font-bold ${
                  isActive
                    ? 'bg-[#B4F416] border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                    : 'bg-white border-black hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000]'
                }`}
              >
                <Icon size={24} strokeWidth={2} className={isActive ? 'text-black' : 'text-gray-600'} />
                <span className={isActive ? 'text-black' : 'text-gray-700'}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-black">
          <div className="bg-gray-50 border-[3px] border-black rounded-xl p-4">
            <p className="text-xs font-bold text-gray-600 text-center">
              🎓 喵喵笔记 © 2026
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
