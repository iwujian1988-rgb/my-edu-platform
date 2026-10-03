import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import userEvent from '@testing-library/user-event'
import { NovelReader } from '../NovelReader'
import type { NovelWord } from '../NewWordsPanel'
import { saveNovelProgress } from '@/lib/readingProgress'

vi.mock('@/lib/readingProgress', () => ({ saveNovelProgress: vi.fn() }))
vi.mock('../WordPopover', () => ({ WordPopover: ({ rawText }: { rawText: string }) => <div role="dialog">词卡：{rawText}</div> }))

const chapter = {
  number: 2, title: '门外的一天',
  contentHtml: '<p>我说 <b class="fw" data-w="bonjour">Bonjour</b>（你好），接着到了 <b class="fw" data-w="école">école</b>（学校）。</p><p>后来又说 <b class="fw" data-w="bonjour">bonjour</b>，<b class="fw" data-w="salut">Salut</b>。</p>',
}
const props = { bookId: 'test-novel', totalChapters: 5, chapter, newWords: [] as NovelWord[] }
const entries = ['bonjour', 'salut'].map((word) => ({ form_key: word, lemma: word, display_form: word, definition: '词典问候语', chapter_first: 1 }))
const api = vi.fn(async (url: string, _options?: RequestInit) => ({ ok: true, json: async () => ({ data: url.endsWith('/lexicon') ? entries : [] }) }))

function article() {
  const element = document.querySelector('article')
  if (!element) throw new Error('Reader article missing')
  return within(element)
}

describe('vocabulary-focused typing', () => {
  it('keeps articles outside inputs, hides repeated answers and records only the first outcome', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} chapter={{ ...chapter, contentHtml: '<p><b class="fw" data-w="le taxi">le taxi</b>（出租车），<b class="fw" data-w="le taxi">le taxi</b>。</p>' }} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(article().getByText('le')).toBeVisible()
    expect(article().getByText('〔同词，见前一空〕')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '第 1 空提示' }))
    await user.click(screen.getByRole('button', { name: '第 1 空首字母提示' }))
    expect(article().getByText('t…')).toBeVisible()
    await user.type(screen.getByRole('textbox'), 'taxi{Enter}')
    expect(article().getByText('提示后答对')).toBeVisible()
    expect(article().getByText('le taxi')).toBeVisible()
    expect(screen.getByRole('button', { name: '拼写补练（1）' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '冠词练习（1）' })).toBeEnabled()
    const posts = api.mock.calls.filter((args) => args[1]?.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({ action: 'typing', lemma: 'le taxi', quality: 2 })
    await user.click(screen.getByRole('button', { name: '再练一次' }))
    await user.type(screen.getByRole('textbox'), 'taxi{Enter}')
    expect(api.mock.calls.filter((args) => args[1]?.method === 'POST')).toHaveLength(1)
  })
  it('turning a seen hint off does not turn it into independent recall', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    await user.click(screen.getByLabelText('首字母提示'))
    await user.click(screen.getByLabelText('无提示'))
    await user.type(screen.getAllByRole('textbox')[0], 'bonjour{Enter}')
    expect(article().getByText('提示后答对')).toBeVisible()
    const post = api.mock.calls.find((args) => args[1]?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body)).quality).toBe(2)
  })
})

beforeEach(() => {
  localStorage.clear()
  vi.mocked(saveNovelProgress).mockClear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined)
  api.mockImplementation(async (url?: string) => ({ ok: true, json: async () => ({ data: url?.endsWith('/lexicon') ? entries : [] }) }))
  vi.stubGlobal('fetch', api)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  api.mockClear()
})

describe('NovelReader typing practice', () => {
  it('exposes three modes, retains revealed words and does not count answer viewing as mastery', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    expect(screen.getByRole('group', { name: '学习模式' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '遮词回忆' }))
    expect(document.querySelector('article')).toHaveAttribute('data-mode', 'recall')
    expect(article().getByText('（你好）')).toBeVisible()
    const reveal = screen.getByRole('button', { name: '第 1 处查看法语答案' })
    await user.click(reveal)
    expect(screen.getByText('已展开 1 / 3 词')).toBeVisible()
    expect(api.mock.calls.filter(args => args[1]?.method === 'POST')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: '读故事' }))
    await user.click(screen.getByRole('button', { name: '遮词回忆' }))
    expect(screen.getByRole('button', { name: '第 1 处重新遮住' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    await user.type(screen.getAllByRole('textbox')[0], 'bonjour{Enter}')
    expect(article().getByText('提示后答对')).toBeVisible()
    const post = api.mock.calls.find(args => args[1]?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body)).quality).toBe(2)
  })

  it('opens word cards using the keyboard in reading mode', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    const word = await screen.findByRole('button', { name: '查看词卡：Bonjour' })
    word.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toHaveTextContent('词卡：bonjour')
  })

  it('defaults to normal reading; enabled mode deduplicates words without leaking glosses', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    expect(article().getByText('Bonjour')).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    expect(article().queryByText('Bonjour')).not.toBeInTheDocument()
    expect(article().queryByText(/你好|学校/)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('已答对 0 / 3 空')).toBeVisible()
  })

  it('switches contextual Chinese / dictionary fallback / first letter hints without clearing typed text', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    const first = screen.getByRole('textbox', { name: '第 1 空，输入法语' })
    await user.type(first, 'bon')
    await user.click(screen.getByLabelText('中文提示'))
    expect(article().getByText('你好')).toBeVisible()
    expect(article().getByText('学校')).toBeVisible()
    expect(article().getByText('词典问候语')).toBeVisible()
    await user.click(screen.getByLabelText('首字母提示'))
    expect(article().getByText('B…')).toBeVisible()
    expect(article().getByText('é…')).toBeVisible()
    expect(article().queryByText('你好')).not.toBeInTheDocument()
    expect(first).toHaveValue('bon')
    await user.click(screen.getByLabelText('无提示'))
    expect(article().queryByText('B…')).not.toBeInTheDocument()
  })

  it('checks answers on Enter or blur, requires accents, skips correct blanks and keeps focus for errors', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    const [first, second, third] = screen.getAllByRole('textbox')
    await user.type(first, 'BONJOUR{Enter}')
    expect(second).toHaveFocus()
    expect(screen.getByText('已答对 1 / 3 空')).toBeVisible()
    await user.type(second, 'ecole{Enter}')
    expect(second).toHaveFocus()
    expect(second).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('再试一次，注意重音和词形')).toBeVisible()
    await user.clear(second)
    await user.type(second, 'école{Enter}')
    expect(third).toHaveFocus()
    await user.type(third, 'salut')
    await user.tab()
    expect(screen.getByText('本章全部答对！')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '再练一次' }))
    expect(first).toHaveValue('')
    expect(first).toHaveFocus()
    expect(screen.getByText('已答对 0 / 3 空')).toBeVisible()
    const posts = api.mock.calls.filter((args) => args[1]?.method === 'POST')
    expect(posts).toHaveLength(3)
  })

  it('does not submit an Enter that confirms an IME candidate', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    const [first, second] = screen.getAllByRole('textbox')
    act(() => first.focus())
    fireEvent.compositionStart(first)
    fireEvent.change(first, { target: { value: 'bonjour' } })
    fireEvent.keyDown(first, { key: 'Enter', isComposing: true, keyCode: 229 })
    expect(first).toHaveFocus()
    expect(screen.getByText('已答对 0 / 3 空')).toBeVisible()
    fireEvent.compositionEnd(first)
    fireEvent.keyDown(first, { key: 'Enter', keyCode: 229 })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(second).toHaveFocus()
    await act(async () => undefined)
  })

  it('temporarily overrides hidden-French mode, restores it on exit and preserves this page’s answers', async () => {
    localStorage.setItem('novel-display-mode:test-novel', 'hide-fr')
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    expect(document.querySelector('article')).toHaveAttribute('data-mode', 'hide-fr')
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    expect(document.querySelector('article')).toHaveAttribute('data-mode', 'typing')
    await user.type(screen.getAllByRole('textbox')[0], 'bonj')
    expect(screen.getByRole('navigation', { hidden: true })).toHaveClass('hidden')
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    expect(document.querySelector('article')).toHaveAttribute('data-mode', 'hide-fr')
    expect(screen.getByRole('navigation')).not.toHaveClass('hidden')
    expect(article().getByText('Bonjour')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('bonj')
    expect(localStorage.getItem('novel-display-mode:test-novel')).toBe('hide-fr')
  })

  it('makes hints accessible from the existing modal and disables conflicting display modes', async () => {
    const warning = vi.spyOn(console, 'warn')
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    await user.click(screen.getByRole('button', { name: '字号与显示' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('button', { name: '隐藏法语' })).toBeDisabled()
    await user.click(dialog.getByLabelText('中文提示'))
    await user.click(dialog.getByRole('button', { name: '关闭阅读设置' }))
    expect(article().getByText('你好')).toBeVisible()
    expect(warning).not.toHaveBeenCalled()
  })

  it('resets attempts on chapter changes and explains chapters with no exercises', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<NovelReader {...props} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    await user.type(screen.getAllByRole('textbox')[0], 'bonjour{Enter}')
    rerender(<NovelReader {...props} chapter={{ ...chapter, number: 3 }} />)
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('')
    expect(screen.getByText('已答对 0 / 3 空')).toBeVisible()
    rerender(<NovelReader {...props} chapter={{ ...chapter, number: 4, contentHtml: '<p>只有中文剧情。</p>' }} />)
    expect(screen.getByRole('button', { name: '拼写自测' })).toBeDisabled()
    expect(screen.getByText(/本章是纯剧情章/)).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('does not depend on successful lexicon loading for blanking or contextual hints', async () => {
    api.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    await user.click(screen.getByLabelText('中文提示'))
    expect(article().getByText('你好')).toBeVisible()
    expect(article().getByText('暂无中文提示')).toBeVisible()
    await user.type(screen.getAllByRole('textbox')[0], 'bonjour{Enter}')
    expect(screen.getByText('已答对 1 / 3 空')).toBeVisible()
  })

  it('keeps the visible paragraph anchored when switching modes mid-chapter', async () => {
    const user = userEvent.setup()
    render(<NovelReader {...props} />)
    const scroll = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(500)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = this.closest('[data-mode="typing"]') ? 120 : 80
      return { top, bottom: top + 100, left: 0, right: 300, width: 300, height: 100, x: 0, y: top, toJSON: () => ({}) }
    })
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 40, behavior: 'instant' })
    scroll.mockRestore()
    // Flush the existing reading-progress RAF before unmounting.
    await act(async () => undefined)
  })

  it('hydrates without mismatches and restores reading position after the article is ready', async () => {
    const element = <NovelReader {...props} initialPercent={50} />
    const container = document.createElement('div')
    container.innerHTML = renderToString(element)
    document.body.append(container)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(() => container.querySelector('article p') ? 2000 : 0)
    const recoverableError = vi.fn()
    let root: Root
    await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: recoverableError }) })
    try {
      expect(container.querySelectorAll('article p')).toHaveLength(2)
      expect(recoverableError).not.toHaveBeenCalled()
      await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: (2000 - window.innerHeight) / 2 }))
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })

  it('does not save the expanded exercise layout percentage as a normal-reading bookmark', async () => {
    const user = userEvent.setup()
    const height = vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(1000)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(500)
    const y = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(50)
    render(<NovelReader {...props} />)
    fireEvent.scroll(window)
    await screen.findByText('10%')
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    height.mockReturnValue(2000)
    y.mockReturnValue(900)
    fireEvent.scroll(window)
    await screen.findByText('60%')
    fireEvent(window, new Event('pagehide'))
    expect(saveNovelProgress).toHaveBeenLastCalledWith('test-novel', 2, 10)
    await user.click(screen.getByRole('button', { name: '拼写自测' }))
    height.mockReturnValue(1000)
    y.mockReturnValue(200)
    fireEvent.scroll(window)
    await screen.findByText('40%')
    fireEvent(window, new Event('pagehide'))
    expect(saveNovelProgress).toHaveBeenLastCalledWith('test-novel', 2, 40)
  })
})
