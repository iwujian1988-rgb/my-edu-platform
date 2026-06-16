'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/AppHeader.vue
 * 组合顶部导航的 5 个子组件：MetaNav + MainNav + MegaMenu + SearchBar + MobileMenu
 */

import { MetaNav } from './MetaNav'
import { MainNav } from './MainNav'
import { MegaMenu } from './MegaMenu'
import { SearchBar } from './SearchBar'
import { MobileMenu } from './MobileMenu'

export function AppHeader() {
  return (
    <header className="relative">
      <MetaNav />
      <MainNav />
      <MegaMenu />
      <SearchBar />
      <MobileMenu />
    </header>
  )
}
