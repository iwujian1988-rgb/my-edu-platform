/**
 * 演说家模块 - Step 2 听写训练工具函数
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md 第 3.1 节（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md 第 4.2 节（开发指南）
 */

/**
 * Token 类型：单词或标点
 */
export interface Token {
  text: string          // 原始文本
  type: 'word' | 'punctuation'  // 类型
  skipInput?: boolean   // 是否跳过输入（如缩写词 i'm, i'll 等，或数字）
}

/**
 * 解析句子为 Token 数组
 *
 * 功能：
 * - 分离单词和标点符号
 * - 保留标点符号用于右栏预置
 * - 数字跳过输入（直接显示）
 *
 * @example
 * parseSentenceTokens("Hello, world!")
 * // Returns: [
 * //   { text: "Hello", type: "word" },
 * //   { text: ",", type: "punctuation" },
 * //   { text: "world", type: "word" },
 * //   { text: "!", type: "punctuation" }
 * // ]
 */
export function parseSentenceTokens(sentence: string): Token[] {
  if (!sentence || sentence.trim().length === 0) {
    return []
  }

  const tokens: Token[] = []

  // 常见缩写词列表（不需要用户输入）
  const contractionWords = new Set([
    "i'm", "i'll", "i've", "i'd",
    "you're", "you'll", "you've", "you'd",
    "he's", "he'll", "he'd",
    "she's", "she'll", "she'd",
    "it's", "it'll", "it'd",
    "we're", "we'll", "we've", "we'd",
    "they're", "they'll", "they've", "they'd",
    "that's", "there's", "here's",
    "what's", "where's", "when's", "who's", "how's", "why's",
    "let's",
    "can't", "won't", "don't", "didn't", "shouldn't", "wouldn't", "couldn't",
    "haven't", "hasn't", "hadn't", "isn't", "aren't", "wasn't", "weren't"
  ])

  // 正则：匹配英文单词 | 数字 | 标点符号
  const regex = /([\p{L}]+(?:[’'][\p{L}]+)*)|(\d+)|([^\p{L}\d\s])/gu

  let match
  while ((match = regex.exec(sentence)) !== null) {
    const word = match[1]        // 单词
    const number = match[2]      // 数字
    const punctuation = match[3] // 标点

    if (word) {
      const wordLower = word.toLowerCase()
      // 检测：1. 常见缩写词 2. 所有格形式（如 Adam's, John's）
      const isContraction = contractionWords.has(wordLower) || /^.+['']s$/i.test(word)
      tokens.push({ text: word, type: 'word', skipInput: isContraction })
    } else if (number) {
      // 数字跳过输入，直接显示
      tokens.push({ text: number, type: 'word', skipInput: true })
    } else if (punctuation) {
      tokens.push({ text: punctuation, type: 'punctuation' })
    }
  }

  return tokens
}

/**
 * 验证用户输入的单词
 *
 * 判分容错标准（shangwenjie.md 第 2.4-F 节）：
 * 1. 大小写不敏感
 * 2. 缩写不兼容（I'm ≠ I am）
 * 3. 多空格处理（自动 trim）
 *
 * @param userInput - 用户输入
 * @param correctWord - 正确单词
 * @returns 是否正确
 */
export function validateWordInput(userInput: string, correctWord: string): boolean {
  // 1. trim 去除首尾空格
  const normalizedInput = normalizeComparableWord(userInput)
  const normalizedCorrect = normalizeComparableWord(correctWord)

  // 2. 大小写不敏感
  const inputLower = normalizedInput
  const correctLower = normalizedCorrect

  // 3. 严格比对（不支持缩写展开）
  return inputLower === correctLower
}

function normalizeComparableWord(value: string): string {
  return value.trim().toLowerCase().replace(/[’]/g, "'")
}

/**
 * 计算句子级别的判分结果
 *
 * @param userTokens - 用户输入的单词数组
 * @param correctTokens - 正确的单词数组
 * @returns 统计结果
 */
export interface SentenceGradingResult {
  totalWords: number
  correctCount: number
  wrongCount: number
  skippedCount: number
  accuracy: number
  wrongWords: WrongWord[]
}

export interface WrongWord {
  wordIndex: number
  userInput: string
  correctWord: string
  errorType: 'wrong' | 'skipped'
}

export function gradeSentence(
  userTokens: Array<string | null>,  // null 表示 skipped
  correctTokens: string[]
): SentenceGradingResult {
  const totalWords = correctTokens.length
  let correctCount = 0
  let wrongCount = 0
  let skippedCount = 0
  const wrongWords: WrongWord[] = []

  correctTokens.forEach((correctWord, index) => {
    const userInput = userTokens[index]

    if (userInput === null) {
      // 用户右键放弃
      skippedCount++
      wrongWords.push({
        wordIndex: index,
        userInput: '(SKIPPED)',
        correctWord,
        errorType: 'skipped'
      })
    } else if (validateWordInput(userInput, correctWord)) {
      // 正确
      correctCount++
    } else {
      // 错误
      wrongCount++
      wrongWords.push({
        wordIndex: index,
        userInput,
        correctWord,
        errorType: 'wrong'
      })
    }
  })

  const accuracy = totalWords > 0
    ? Math.round((correctCount / totalWords) * 100)
    : 0

  return {
    totalWords,
    correctCount,
    wrongCount,
    skippedCount,
    accuracy,
    wrongWords
  }
}

/**
 * 格式化时间显示
 */
export function formatTime(seconds: number): string {
  if (seconds === null || seconds === undefined) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 估算句子播放时间（用于时间戳为 null 的情况）
 *
 * @param sentence - 句子文本
 * @returns 估算的秒数
 */
export function estimateSentenceDuration(sentence: string): number {
  // 每个字符约 0.15 秒
  const charCount = sentence.length
  return Math.max(2, Math.round(charCount * 0.15))
}
