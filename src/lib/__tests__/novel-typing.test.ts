import { describe, expect, it } from 'vitest'
import { parseNovelTypingContent, matchesNovelAnswer, frenchInitial, splitNovelArticle, buildNovelPracticeContent, novelTypingQuality } from '../novel-typing'

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

describe('vocabulary practice selection', () => {
  it.each([['le taxi', 'le ', 'taxi'], ['La neige', 'La ', 'neige'], ["l'école", "l'", 'école'], ['le billet de train', '', 'le billet de train'], ['en plein cœur de', '', 'en plein cœur de']])(
    'splits only standalone article nouns: %s', (source, prefix, answer) => {
      expect(splitNovelArticle(source)).toEqual({ prefix, answer })
    },
  )
  it('deduplicates canonical lemmas without changing normal-reader occurrences', () => {
    const original = parseNovelTypingContent('<p><b class="fw" data-w="le taxi">le taxi</b>（出租车）<b class="fw" data-w="taxi">taxi</b><b class="fw" data-w="aller">vais</b><b class="fw" data-w="aller">allons</b></p>')
    const practice = buildNovelPracticeContent(original, new Map([['le taxi', 'taxi']]), new Map())
    expect(practice.blanks.map((blank) => blank.answer)).toEqual(['taxi', 'vais'])
    expect(practice.blanks[0].prefix).toBe('le ')
    expect(original.blanks).toHaveLength(4)
    expect(practice.html).toBe(original.html)
    const paragraph = practice.nodes[0]
    if (paragraph.kind !== 'paragraph') throw new Error('Expected paragraph')
    const repeat = paragraph.children[3]
    expect(repeat.kind).toBe('repeat')
    if (repeat.kind === 'repeat') expect(repeat.blank.answer).toBe('allons')
  })
  it('includes due/new/weak words but does not drill future known words', () => {
    const content = parseNovelTypingContent('<p><b class="fw">taxi</b><b class="fw">neige</b><b class="fw">billet</b><b class="fw">demain</b></p>')
    const now = Date.parse('2026-10-03T00:00:00Z')
    const progress = new Map([
      ['taxi', { status: 'known', next_review_at: '2026-10-04T00:00:00Z' }],
      ['neige', { status: 'vague', next_review_at: '2026-10-04T00:00:00Z' }],
      ['billet', { status: 'known', next_review_at: '2026-10-02T00:00:00Z' }],
    ])
    expect(buildNovelPracticeContent(content, new Map(), progress, now).blanks.map((blank) => blank.answer)).toEqual(['neige', 'billet', 'demain'])
  })
  it('never grades assisted recall as independent success', () => {
    expect(novelTypingQuality(true, true)).toBe(2)
    expect(novelTypingQuality(true, false)).toBe(3)
    expect(novelTypingQuality(false, false)).toBe(1)
  })
})
