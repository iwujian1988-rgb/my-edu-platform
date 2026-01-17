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
 * 解析有道API响应
 */
export function parseYoudaoResponse(data: any, word: string) {
  const simple = data.simple?.word?.[0]
  const ec = data.ec?.word?.[0]
  const ee = data.ee?.word?.[0]
  const blng = data.blng_sents_part?.['sentence-pair']?.[0]
  const phrs = data.phrs?.phrs?.[0]
  const syno = data.syno?.synos?.[0]

  // 音标（提取英式和美式）
  const ukPhonetic = simple?.ukphone || simple?.phone || ''
  const usPhonetic = simple?.usphone || simple?.phone || ''
  const phonetic = usPhonetic || ukPhonetic || ''

  // 中文释义（从ec中提取）
  const definition = ec?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || ''

  // 英文释义（从ee中提取）
  let definition_en = ''
  if (ee?.trs) {
    for (const tr of ee.trs) {
      if (tr.tr?.[0]?.l?.i) {
        definition_en = tr.tr[0].l.i
        break
      }
    }
  }

  // 词性
  const partOfSpeech = syno?.syno?.pos || ''

  // 例句（中英文）
  const exampleSentence = blng?.['sentence-translation'] || ''
  const exampleSentenceEn = blng?.['sentence-eng'] || blng?.sentence || ''

  // 搭配
  const collocationEn = phrs?.phr?.headword?.l?.i || ''
  const collocation = phrs?.phr?.trs?.[0]?.tr?.[0]?.l?.i || ''

  return {
    word: word.trim(),
    phonetic: phonetic.replace(/\//g, ''), // 移除音标符号
    uk_phonetic: ukPhonetic.replace(/\//g, ''),
    us_phonetic: usPhonetic.replace(/\//g, ''),
    definition: definition,
    definition_en: definition_en,
    collocation: collocation,
    collocation_en: collocationEn,
    example_sentence: exampleSentence,
    example_sentence_en: exampleSentenceEn,
    part_of_speech: partOfSpeech,
    success: true
  }
}
