import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NovelRecallReview } from '../NovelRecallReview'

const words = ['taxi', 'billet', 'neige', 'gare'].map((answer, id) => ({ id, answer, lookup: answer, gloss: `中文${id}`, prefix: id < 2 ? 'le ' : 'la ' }))
describe('NovelRecallReview', () => {
  it('separates article recall from spelling and reinserts wrong cards after other words', async () => {
    const user = userEvent.setup()
    render(<NovelRecallReview retryWords={words} articleWords={words} definitions={new Map()} />)
    await user.click(screen.getByRole('button', { name: '冠词练习（4）' }))
    await user.click(screen.getByRole('button', { name: 'la' }))
    expect(screen.getByText(/正确答案：le taxi/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '下一题' }))
    expect(screen.getByText('billet ·')).toBeVisible()
    for (const answer of ['le', 'la', 'la']) {
      await user.click(screen.getByRole('button', { name: answer }))
      await user.click(screen.getByRole('button', { name: '下一题' }))
    }
    expect(screen.getByText('taxi ·')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'le' }))
    await user.click(screen.getByRole('button', { name: '下一题' }))
    expect(screen.getByText(/本轮补练完成/)).toBeVisible()
  })
  it('a hinted correct answer still requires another unaided recall', async () => {
    const user = userEvent.setup()
    render(<NovelRecallReview retryWords={[words[0]]} articleWords={[]} definitions={new Map()} />)
    await user.click(screen.getByRole('button', { name: '拼写补练（1）' }))
    await user.click(screen.getByRole('button', { name: '首字母提示' }))
    await user.type(screen.getByRole('textbox'), 'taxi{Enter}')
    expect(screen.getByText('提示后答对，稍后再练')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '下一题' }))
    expect(screen.queryByText(/本轮补练完成/)).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox'), 'taxi{Enter}')
    await user.click(screen.getByRole('button', { name: '下一题' }))
    expect(screen.getByText(/本轮补练完成/)).toBeVisible()
  })
})
