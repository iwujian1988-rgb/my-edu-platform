'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/stores/ui.js (Pinia)
 *
 * 管理 MAXCLASS layout 的全局 UI 状态：mega menu / search / mobile menu。
 * React 端用 Context + useReducer 替代 Pinia store。
 */

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'

interface UiState {
  megaMenuOpen: boolean
  megaMenuSection: string | null
  searchOpen: boolean
  mobileMenuOpen: boolean
}

type UiAction =
  | { type: 'openMegaMenu'; section?: string | null }
  | { type: 'closeMegaMenu' }
  | { type: 'toggleMegaMenu'; section?: string | null }
  | { type: 'toggleSearch' }
  | { type: 'closeSearch' }
  | { type: 'toggleMobileMenu' }
  | { type: 'closeMobileMenu' }

const INITIAL: UiState = {
  megaMenuOpen: false,
  megaMenuSection: null,
  searchOpen: false,
  mobileMenuOpen: false,
}

function reducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'openMegaMenu':
      return { ...state, megaMenuOpen: true, megaMenuSection: action.section ?? null }
    case 'closeMegaMenu':
      return { ...state, megaMenuOpen: false, megaMenuSection: null }
    case 'toggleMegaMenu': {
      const section = action.section ?? null
      if (state.megaMenuOpen && state.megaMenuSection === section) {
        return { ...state, megaMenuOpen: false, megaMenuSection: null }
      }
      return { ...state, megaMenuOpen: true, megaMenuSection: section }
    }
    case 'toggleSearch':
      return { ...state, searchOpen: !state.searchOpen, megaMenuOpen: false, megaMenuSection: null }
    case 'closeSearch':
      return { ...state, searchOpen: false }
    case 'toggleMobileMenu':
      return { ...state, mobileMenuOpen: !state.mobileMenuOpen }
    case 'closeMobileMenu':
      return { ...state, mobileMenuOpen: false }
    default:
      return state
  }
}

interface UiStore extends UiState {
  openMegaMenu: (section?: string | null) => void
  closeMegaMenu: () => void
  toggleMegaMenu: (section?: string | null) => void
  toggleSearch: () => void
  closeSearch: () => void
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
}

const Ctx = createContext<UiStore | null>(null)

export function MaxclassUiProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const store = useMemo<UiStore>(
    () => ({
      ...state,
      openMegaMenu: (section) => dispatch({ type: 'openMegaMenu', section }),
      closeMegaMenu: () => dispatch({ type: 'closeMegaMenu' }),
      toggleMegaMenu: (section) => dispatch({ type: 'toggleMegaMenu', section }),
      toggleSearch: () => dispatch({ type: 'toggleSearch' }),
      closeSearch: () => dispatch({ type: 'closeSearch' }),
      toggleMobileMenu: () => dispatch({ type: 'toggleMobileMenu' }),
      closeMobileMenu: () => dispatch({ type: 'closeMobileMenu' }),
    }),
    [state],
  )
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useUiStore(): UiStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUiStore must be used within MaxclassUiProvider')
  return ctx
}
