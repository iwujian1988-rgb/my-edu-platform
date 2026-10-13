import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReviewClient } from '../ReviewClient'

vi.mock('@/hooks/useFrenchTTS', () => ({ useFrenchTTS: () => ({ speak: vi.fn(), stop: vi.fn() }) }))
const api = vi.fn()
const word = { word: 'bonjour', lemma: 'bonjour', chapter_number: 1, definition: '你好' }
function response(words: typeof word[], progress = {}) {
  return { ok: true, json: async () => ({ data: { words, progress } }) }
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', api) })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); api.mockReset() })

describe('review loading and empty states', () => {
  it('explains an actually empty notebook instead of claiming cards are not due', async () => {
    api.mockResolvedValue(response([]))
    render(<ReviewClient bookId="novel" bookTitle="小说" range="notebook" />)
    expect(await screen.findByText(/生词本还是空的/)).toBeVisible()
    expect(screen.queryByText(/暂无到期或未练习/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '复习全部（含未到期）' })).not.toBeInTheDocument()
  })

  it('offers all-card practice when the notebook contains only future cards', async () => {
    api.mockResolvedValue(response([word], { bonjour: { next_review_at: '2099-01-01T00:00:00Z', repetition_count: 1 } }))
    render(<ReviewClient bookId="novel" bookTitle="小说" range="notebook" />)
    expect(await screen.findByText(/暂无到期或未练习/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '复习全部（含未到期）' }))
    expect((await screen.findAllByText('bonjour'))[0]).toBeVisible()
  })

  it('retries the same failed notebook request instead of switching to chapter words', async () => {
    api.mockResolvedValueOnce({ ok: false }).mockResolvedValue(response([word]))
    render(<ReviewClient bookId="novel" bookTitle="小说" range="notebook" />)
    fireEvent.click(await screen.findByRole('button', { name: '重试' }))
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    expect(api.mock.calls[1][0]).toBe('/api/novel/novel/words?notebook=true')
  })

  it('still displays downloaded cards when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked') })
    api.mockResolvedValue(response([word]))
    render(<ReviewClient bookId="novel" bookTitle="小说" range="all" />)
    await waitFor(() => expect(screen.queryByText('加载词卡中…')).not.toBeInTheDocument())
    expect(screen.getAllByText('bonjour')[0]).toBeVisible()
    expect(screen.queryByText(/词卡暂时没加载出来/)).not.toBeInTheDocument()
  })
})
