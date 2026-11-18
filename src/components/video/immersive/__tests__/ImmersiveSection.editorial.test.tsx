import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImmersiveSection } from '../ImmersiveSection'

describe('ImmersiveSection editorial style', () => {
  it('uses the paper style only when requested', () => {
    const props = { index: 3, title: '本期生词', subtitle: '词汇', isOpen: true, isCompleted: false, isLast: false, onToggle: vi.fn() }
    const { rerender } = render(<ImmersiveSection {...props}>内容</ImmersiveSection>)
    expect(screen.getByRole('button', { name: /本期生词/ }).className).toContain('bg-gray-50')
    rerender(<ImmersiveSection {...props} editorial>内容</ImmersiveSection>)
    expect(screen.getByRole('button', { name: /本期生词/ }).className).toContain('border-[#e7e1d7]')
  })
})
