import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MedicalTrainingPanel } from '../MedicalTrainingPanel'
import type { MedicalMaterial } from '@/lib/medical-training'

const evidence = { subtitle_ids: ['11111111-1111-4111-8111-111111111111'], start: 12, end: 18, quote: 'It started yesterday.', chinese: '昨天开始的。' }
const material: MedicalMaterial = {
  version: 1, title: '起病时间', context_type: 'patient_dialogue', disclosure: '英语试学，非诊疗指南',
  history_listening: [{ id: 'onset', field: '起病时间', question: '何时开始？', options: ['昨天', '上周'], answer: 0, explanation: '原文说yesterday', evidence }],
  expression_views: [{ id: 'onset', topic: '起病时间', patient: 'It started yesterday.', clinician: 'When did it start?', handover: 'The patient reports symptoms starting yesterday.', explanation: '保留患者报告性质', origin: 'teaching_example', evidence }],
  sbar: null,
}
const payload = { features: ['history_listening', 'expression_views'], material, progress: [] }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset() })
afterEach(() => vi.unstubAllGlobals())

describe('clinical training interaction', () => {
  it('switches accessible training tabs with the keyboard', async () => {
    fetchMock.mockResolvedValue(response(payload))
    render(<MedicalTrainingPanel videoId="medical" language="en" onPlaySegment={vi.fn()} />)
    const listening = await screen.findByRole('tab', { name: '病史信息听辨' })
    listening.focus()
    fireEvent.keyDown(listening, { key: 'ArrowRight' })
    const expressions = screen.getByRole('tab', { name: '三种表达视角' })
    expect(expressions).toHaveAttribute('aria-selected', 'true')
    expect(expressions).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('三种表达视角')
    fireEvent.keyDown(expressions, { key: 'Home' })
    expect(listening).toHaveFocus()
    expect(listening).toHaveAttribute('aria-selected', 'true')
  })
  it('does not request or display clinical data for French videos', () => {
    render(<MedicalTrainingPanel videoId="french" language="fr" onPlaySegment={vi.fn()} />)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText('临床英语工作台')).not.toBeInTheDocument()
  })
  it('hides unavailable package training', async () => {
    fetchMock.mockResolvedValue(response({ error: '套餐未开放' }, 403))
    render(<MedicalTrainingPanel videoId="medical" language="en" onPlaySegment={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('临床英语工作台')).not.toBeInTheDocument())
  })
  it('restores saved listening and replays its actual evidence range', async () => {
    fetchMock.mockResolvedValue(response({ ...payload, progress: [{ feature: 'history_listening', submission: { feature: 'history_listening', version: 1, answers: { onset: 0 } }, result: { completed: true, correct: 1, total: 1 } }] }))
    const replay = vi.fn()
    render(<MedicalTrainingPanel videoId="medical" language="en" onPlaySegment={replay} />)
    await screen.findByText('回答正确')
    expect(screen.getByRole('radio', { name: '昨天' })).toBeChecked()
    fireEvent.click(screen.getByText(/查看原片依据/))
    fireEvent.click(screen.getByRole('button', { name: '回听这一段' }))
    expect(replay).toHaveBeenCalledWith(12, 18)
  })
  it('keeps answers after a failed save and supports retry', async () => {
    fetchMock.mockResolvedValueOnce(response(payload)).mockResolvedValueOnce(response({ error: '保存失败，请重试' }, 500)).mockResolvedValueOnce(response({ result: { completed: true } }))
    render(<MedicalTrainingPanel videoId="medical" language="en" onPlaySegment={vi.fn()} />)
    fireEvent.click(await screen.findByRole('radio', { name: '昨天' }))
    fireEvent.click(screen.getByRole('button', { name: '提交听辨，查看原片依据' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('radio', { name: '昨天' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '提交听辨，查看原片依据' }))
    await screen.findByText('回答正确')
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ feature: 'history_listening', version: 1, answers: { onset: 0 } })
  })
  it('locks submitted inputs and ignores a previous video save response', async () => {
    let finishSave: (value: Response) => void = () => { throw new Error('Save not started') }
    fetchMock.mockResolvedValueOnce(response(payload)).mockImplementationOnce(() => new Promise<Response>(resolve => { finishSave = resolve })).mockResolvedValueOnce(response(payload))
    const view = render(<MedicalTrainingPanel videoId="first" language="en" onPlaySegment={vi.fn()} />)
    fireEvent.click(await screen.findByRole('radio', { name: '昨天' }))
    fireEvent.click(screen.getByRole('button', { name: '提交听辨，查看原片依据' }))
    expect(screen.getByRole('radio', { name: '上周' })).toBeDisabled()
    view.rerender(<MedicalTrainingPanel videoId="second" language="en" onPlaySegment={vi.fn()} />)
    await screen.findByRole('radio', { name: '昨天' })
    await act(async () => { finishSave(response({ result: { completed: true } })) })
    expect(screen.queryByText('回答正确')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '昨天' })).not.toBeChecked()
  })
})
