import { describe, expect, it } from 'vitest'
import { parseNovelTypingContent, matchesNovelAnswer, frenchInitial } from '../novel-typing'

describe('novel typing content', () => {
  it('blanks only marked French, preserving surface forms, occurrences and contextual glosses', () => {
    const content = parseNovelTypingContent(`<p>我说 bonjour，<b class='fw' data-w='aller'>Vais</b>（去）。<b class="fw" data-w="aller">vais</b>。</p>`)
    expect(content.blanks).toEqual([
      { id: 0, answer: 'Vais', lookup: 'aller', gloss: '去' },
      { id: 1, answer: 'vais', lookup: 'aller', gloss: '' },
    ])
    expect(content.html).toContain('我说 bonjour')
    expect(content.nodes[0].kind).toBe('paragraph')
    expect(matchesNovelAnswer('aller', content.blanks[0].answer)).toBe(false)
  })

  it('keeps the existing sanitizer boundary and does not create blanks for empty markers', () => {
    const content = parseNovelTypingContent('<p onclick="evil()"><b class="fw" data-w="été" onmouseover="evil()">été</b>（夏天）<img src=x onerror="evil()"><b class="fw"> </b></p>')
    expect(content.html).not.toMatch(/onclick|onmouseover|onerror|<img/)
    expect(content.blanks).toHaveLength(1)
  })

  it('accepts plain chapters with no exercises', () => {
    expect(parseNovelTypingContent('<p>这一章是中文剧情。</p>').blanks).toEqual([])
    expect(parseNovelTypingContent('').nodes).toEqual([])
  })
})

describe('French typing answers', () => {
  it.each([
    ['  BONJOUR  ', 'Bonjour'],
    ['aujourd’hui', "aujourd'hui"],
    ['la   sortie', 'la sortie'],
    ['e\u0301te\u0301', 'été'],
    ['l’ été', "l'été"],
  ])('accepts keyboard formatting differences: %s', (value, answer) => {
    expect(matchesNovelAnswer(value, answer)).toBe(true)
  })

  it.each([['ete', 'été'], ['', 'bonjour'], ['va', 'vais'], ['sortie', 'la sortie']])(
    'does not accept a missing accent, empty answer or different word form: %s',
    (value, answer) => expect(matchesNovelAnswer(value, answer)).toBe(false),
  )

  it('shows only the first letter of the original French phrase, preserving its accent', () => {
    expect(frenchInitial('École')).toBe('É…')
    expect(frenchInitial('la sortie')).toBe('l…')
    expect(frenchInitial('« aujourd’hui »')).toBe('a…')
  })
})
