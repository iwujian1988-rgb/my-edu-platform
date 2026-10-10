import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { VideoCategoryFilters } from '../VideoCategoryFilters'

const tags = ['访谈谈话', '个人成长', '法国生活', '纪录片', '影视原声', '生活Vlog', '考试干货', '法国文化', '语法', '词汇', '社交'].map(name => ({ name }))

describe('compact video categories', () => {
  it('shows only eight quick categories, and exposes all existing filters on request', () => {
    const onSelect = vi.fn()
    render(<VideoCategoryFilters tags={tags} selected="all" onSelect={onSelect} />)
    expect(screen.queryByRole('button', { name: '语法' })).toBeNull()
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(8)
    fireEvent.click(screen.getByRole('button', { name: '更多分类' }))
    fireEvent.click(screen.getByRole('button', { name: '语法' }))
    expect(onSelect).toHaveBeenCalledWith('语法')
    fireEvent.click(screen.getByRole('button', { name: '收起分类' }))
    expect(screen.queryByRole('button', { name: '语法' })).toBeNull()
  })

  it('keeps a selected non-quick category visible when collapsed', () => {
    render(<VideoCategoryFilters tags={tags} selected="社交" onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: '社交', pressed: true })).toBeTruthy()
  })
})
