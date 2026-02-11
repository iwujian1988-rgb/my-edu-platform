/**
 * 重试装饰器 - 使用指数退避策略
 * @param fn 要重试的函数
 * @param maxRetries 最大重试次数
 * @returns Promise<T>
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      // 最后一次尝试失败则抛出错误
      if (attempt === maxRetries - 1) {
        throw error
      }

      // 如果是429错误（限流），使用指数退避
      if (error.status === 429 || error.message?.includes('429')) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await sleep(delay)
      } else {
        // 其他错误直接抛出，不重试
        throw error
      }
    }
  }

  throw new Error('Max retries exceeded')
}

/**
 * 延迟函数
 * @param ms 延迟毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 解析有道API响应（完整版，带容错处理）
 */
export function parseYoudaoResponse(data: any, word: string) {
  try {
    const simple = data.simple?.word?.[0]
    const ec = data.ec?.word?.[0]
    const ee = data.ee?.word?.[0]
    const blng = data.blng_sents_part?.['sentence-pair']
    const phrs = data.phrs?.phrs
    const syno = data.syno?.synos

    // 音标（提取英式和美式）
    const ukPhonetic = simple?.ukphone || simple?.phone || ''
    const usPhonetic = simple?.usphone || simple?.phone || ''
    const phonetic = usPhonetic || ukPhonetic || ''

    // 提取所有中文释义（可能有多个词性）
    const definitions: string[] = []
    if (ec?.trs) {
      for (const tr of ec.trs) {
        if (tr.tr?.[0]?.l?.i) {
          const pos = tr.pos || '' // 词性
          const text = tr.tr[0].l.i[0] || ''
          definitions.push(pos ? `${pos} ${text}` : text)
        }
      }
    }
    const definition = definitions.join('；')

    // 提取所有英文释义
    const definitionsEn: string[] = []
    if (ee?.trs) {
      for (const tr of ee.trs) {
        if (tr.tr?.[0]?.l?.i) {
          definitionsEn.push(tr.tr[0].l.i)
        }
      }
    }
    const definition_en = definitionsEn.join('；')

    // 词性（取第一个）
    const partOfSpeech = ec?.trs?.[0]?.pos || syno?.pos || ''

    // 提取所有例句（中英文）
    const exampleSentences: { en: string; zh: string }[] = []
    if (blng && Array.isArray(blng)) {
      for (const pair of blng.slice(0, 5)) { // 最多5个例句
        const en = pair.sentence || pair['sentence-eng'] || ''
        const zh = pair['sentence-translation'] || ''
        if (en || zh) {
          exampleSentences.push({ en, zh })
        }
      }
    }

    const exampleSentence = exampleSentences.map(s => s.zh).join('\n')
    const exampleSentenceEn = exampleSentences.map(s => s.en).join('\n')

    // 提取所有搭配
    const collocations: { en: string; zh: string }[] = []
    if (phrs && Array.isArray(phrs)) {
      for (const phr of phrs.slice(0, 5)) { // 最多5个搭配
        const en = phr.phr?.headword?.l?.i || ''
        const zh = phr.phr?.trs?.[0]?.tr?.[0]?.l?.i || ''
        if (en || zh) {
          collocations.push({ en, zh })
        }
      }
    }

    const collocationEn = collocations.map(c => c.en).join('；')
    const collocation = collocations.map(c => c.zh).join('；')

    // 同义词（带类型检查）
    const synonyms: string[] = []
    if (syno && Array.isArray(syno)) {
      for (const synoItem of syno.slice(0, 5)) { // 最多5个同义词
        const pos = synoItem.pos || ''
        // 🔧 修复：添加类型检查，确保 synoItem.syno 是数组
        const synoArray = synoItem.syno
        const words = Array.isArray(synoArray)
          ? synoArray.map((s: any) => s.word?.l?.i).filter(Boolean).join(', ')
          : (typeof synoArray === 'string' ? synoArray : '')
        if (words) {
          synonyms.push(pos ? `${pos} ${words}` : words)
        }
      }
    }

    // 词形变化（复数、过去式等）
    const forms: string[] = []
    if (simple?.wfs && Array.isArray(simple.wfs)) {
      for (const wf of simple.wfs) {
        const form = wf.wf?.name || ''
        const value = wf.wf?.value?.l?.i || ''
        if (form && value) {
          forms.push(`${form}: ${value}`)
        }
      }
    }

    return {
      word: word.trim(),
      phonetic: phonetic.replace(/\//g, ''),
      uk_phonetic: ukPhonetic.replace(/\//g, ''),
      us_phonetic: usPhonetic.replace(/\//g, ''),
      definition: definition,
      definition_en: definition_en,
      collocation: collocation,
      collocation_en: collocationEn,
      example_sentence: exampleSentence,
      example_sentence_en: exampleSentenceEn,
      part_of_speech: partOfSpeech,
      synonyms: synonyms.join('；'),
      forms: forms.join('；'),
      // 原始数据（用于调试）
      _raw_exampleSentences: exampleSentences,
      _raw_collocations: collocations,
      success: true
    }
  } catch (error) {
    // 解析失败时返回基础数据
    console.error('[parseYoudaoResponse] 解析失败，返回基础数据:', error)
    return {
      word: word.trim(),
      phonetic: '',
      uk_phonetic: '',
      us_phonetic: '',
      definition: '',
      definition_en: '',
      collocation: '',
      collocation_en: '',
      example_sentence: '',
      example_sentence_en: '',
      part_of_speech: '',
      synonyms: '',
      forms: '',
      _raw_exampleSentences: [],
      _raw_collocations: [],
      success: false
    }
  }
}
