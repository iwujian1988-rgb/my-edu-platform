import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VideoExercise } from '@/types/video'
import { MultipleChoiceExercise } from '../MultipleChoiceExercise'

const VIDEO_ID = 'lea-interview-pagination'
const CREATED_AT = '2026-10-07T00:00:00Z'
const QUESTIONS = [
  '蕾雅认为表演主要通过什么表达？',
  '她是否表示自己一直对身体充满自信？',
  '她在日常生活中有怎样的穿衣倾向？',
  '面对摄影机时，什么发生了变化？',
] as const
const OPTIONS = { A: '身体', B: '另一个观点', C: '第三个观点', D: '第四个观点' }
const exercises: VideoExercise[] = QUESTIONS.map((question, index) => ({
  id: `pagination-${index}`,
  video_id: VIDEO_ID,
  subtitle_id: null,
  exercise_type: 'multiple_choice',
  difficulty: 'intermediate',
  original_text: question,
  blank_positions: [],
  hint_type: null,
  answer_text: 'A',
  display_order: index,
  created_at: CREATED_AT,
  exercise_metadata: { question, options: OPTIONS, answer: 'A', explanation: '对应访谈原句。' },
}))

describe('expanded multiple-choice questions', () => {
  it.each(['身体', '另一个观点'])('shows all questions before answering and independently submits %s', async (option) => {
    const user = userEvent.setup()
    const recordAnswer = vi.fn()
    render(<MultipleChoiceExercise exercises={exercises} progressMap={null} onRecordAnswer={recordAnswer} />)
    for (const question of QUESTIONS) expect(screen.getByText(question)).toBeVisible()
    expect(screen.queryByRole('button', { name: /下一题/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /上一题/ })).not.toBeInTheDocument()
    for (const [index, question] of QUESTIONS.entries()) {
      const card = within(screen.getByRole('region', { name: `第${index + 1}题` }))
      expect(card.getByText(question)).toBeVisible()
      expect(card.getByRole('button', { name: '提交' })).toBeDisabled()
      await user.click(card.getByRole('button', { name: new RegExp(option) }))
      await user.click(card.getByRole('button', { name: '提交' }))
      expect(recordAnswer).toHaveBeenLastCalledWith(exercises[index].id, option === '身体')
      expect(card.getByText(option === '身体' ? '正确!' : '错误')).toBeVisible()
    }
    expect(recordAnswer).toHaveBeenCalledTimes(QUESTIONS.length)
  })

  it('preserves another question selection and result when retrying a wrong answer', async () => {
    const user = userEvent.setup()
    const recordAnswer = vi.fn()
    render(<MultipleChoiceExercise exercises={exercises} progressMap={null} onRecordAnswer={recordAnswer} />)
    const first = within(screen.getByRole('region', { name: '第1题' }))
    const second = within(screen.getByRole('region', { name: '第2题' }))
    await user.click(first.getByRole('button', { name: /身体/ }))
    await user.click(second.getByRole('button', { name: /另一个观点/ }))
    await user.click(second.getByRole('button', { name: '提交' }))
    expect(first.getByRole('button', { name: '提交' })).toBeEnabled()
    await user.click(first.getByRole('button', { name: '提交' }))
    await user.click(second.getByRole('button', { name: '重试' }))
    expect(first.getByText('正确!')).toBeVisible()
    expect(second.queryByText('错误')).not.toBeInTheDocument()
    expect(second.getByRole('button', { name: '提交' })).toBeDisabled()
    expect(recordAnswer).toHaveBeenCalledTimes(2)
  })
})
