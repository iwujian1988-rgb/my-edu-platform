import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LearningWelcome, LEARNING_WELCOME_KEY } from '../LearningWelcome'

describe('first-visit learning guide', () => {
  beforeEach(() => { cleanup(); localStorage.clear() })
  it('offers a guide on the first visit and remembers dismissal', async () => {
    const view = render(<LearningWelcome />)
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('link', { name: '查看学习指南' }).getAttribute('href')).toBe('/videos/guide')
    fireEvent.click(screen.getByRole('button', { name: '先逛逛' }))
    expect(localStorage.getItem(LEARNING_WELCOME_KEY)).toBe('1')
    view.unmount()
    render(<LearningWelcome />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
