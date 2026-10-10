import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VideoExercise } from '@/types/video'
import { FillBlankExercise } from '../FillBlankExercise'
import { MultipleChoiceExercise } from '../MultipleChoiceExercise'

const VIDEO_ID = 'interview-video'
const CREATED_AT = '2026-10-07T00:00:00Z'
const CHOICE_COUNT = 4
const choices: VideoExercise[] = Array.from({ length: CHOICE_COUNT }, (_, index) => ({
  id: `choice-${index}`,
  video_id: VIDEO_ID,
  subtitle_id: 'subtitle-1',
  exercise_type: 'multiple_choice',
  difficulty: 'intermediate',
  original_text: '她获奖时有什么特别之处？\nA. 她正在孕期\nB. 她拒绝领奖',
  blank_positions: [],
  hint_type: null,
  answer_text: 'A',
  display_order: index,
  created_at: CREATED_AT,
}))

describe('exercise type empty states', () => {
  it('does not render a page-wide empty message for an absent fill-blank section', () => {
    const { container } = render(<FillBlankExercise exercises={[]} progressMap={null} onRecordAnswer={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows existing choices without claiming there are no exercises, and still records answers', async () => {
    const user = userEvent.setup()
    const recordAnswer = vi.fn()
    render(<>
      <FillBlankExercise exercises={[]} progressMap={null} onRecordAnswer={recordAnswer} />
      <MultipleChoiceExercise exercises={choices} progressMap={null} onRecordAnswer={recordAnswer} />
    </>)
    expect(screen.queryByText('暂无练习题')).not.toBeInTheDocument()
    expect(screen.getByText('选择题')).toBeVisible()
    const firstQuestion = within(screen.getByRole('region', { name: '第1题' }))
    await user.click(firstQuestion.getByRole('button', { name: /她正在孕期/ }))
    await user.click(firstQuestion.getByRole('button', { name: '提交' }))
    expect(recordAnswer).toHaveBeenCalledWith(choices[0].id, true)
  })
})
