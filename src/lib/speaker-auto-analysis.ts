/**
 * Speaker 文章自动分析模块
 *
 * 功能：
 * - 自动判断文章分类
 * - 自动评估难度等级（1-5级）
 * - 自动匹配封面图片
 *
 * 难度评估维度：
 * 1. 句子数量 (15%) - 文章长度
 * 2. 平均句长 (20%) - 句子复杂度
 * 3. CEFR 词汇等级 (35%) - 词汇难度（基于词频）
 * 4. 语速 (20%) - 每分钟词数
 * 5. 时长 (10%) - 听力耐力
 */

import { SupportedLanguage, ArticleCategory } from '@/types/speaker'
import cefrAnalyzer, { calculateComplexityScore } from 'cefr-analyzer'

// 难度等级类型（1-5级）
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

// 难度等级描述
export const LEVEL_NAMES: Record<DifficultyLevel, string> = {
  1: '入门级（小学-初中基础）',
  2: '基础级（高中-四级基础）',
  3: '进阶级（四级高分-六级）',
  4: '高级（雅思托福-考研）',
  5: '专家级（GRE-学术专业）'
}

// 难度等级简称
export const LEVEL_SHORT_NAMES: Record<DifficultyLevel, string> = {
  1: 'Level 1',
  2: 'Level 2',
  3: 'Level 3',
  4: 'Level 4',
  5: 'Level 5'
}

// ========================================
// 1. 分类关键词字典
// ========================================

const CATEGORY_KEYWORDS: Record<ArticleCategory, string[]> = {
  '健康': [
    // 健康/医疗
    'health', 'medical', 'doctor', 'hospital', 'medicine', 'treatment', 'disease',
    'exercise', 'fitness', 'workout', 'diet', 'nutrition', 'sleep', 'mental',
    '健康', '医疗', '医生', '运动', '锻炼', '饮食', '营养', '睡眠', '心理',
    'therapy', 'wellness', 'healing', 'body', 'physical'
  ],
  '心理': [
    // 心理/情感
    'psychology', 'mental', 'emotion', 'feeling', 'mind', 'stress', 'anxiety',
    'depression', 'happiness', 'therapy', 'counseling', 'behavior', 'personality',
    '心理', '情感', '情绪', '压力', '焦虑', '抑郁', '快乐', '幸福', '性格',
    'mood', 'brain', 'cognitive', 'thought', 'believe'
  ],
  '成长': [
    // 成长/自我提升
    'growth', 'improve', 'develop', 'learn', 'skill', 'habit', 'success', 'achievement',
    'goal', 'progress', 'challenge', 'overcome', 'potential', 'motivation',
    '成长', '提升', '进步', '成功', '目标', '挑战', '克服', '潜力', '动力',
    'self', 'personal', 'development', 'better', 'change', 'transform'
  ],
  '学习': [
    // 学习/教育
    'learn', 'study', 'education', 'school', 'knowledge', 'reading', 'writing',
    'language', 'practice', 'memory', 'understand', 'teach', 'student',
    '学习', '教育', '学校', '知识', '阅读', '写作', '语言', '练习', '记忆', '理解',
    'academic', 'course', 'lesson', 'train', 'master'
  ],
  '社交': [
    // 社交/人际关系
    'social', 'friend', 'relationship', 'communication', 'talk', 'conversation',
    'connect', 'network', 'team', 'group', 'community', 'family', 'parent',
    '社交', '朋友', '关系', '沟通', '交流', '连接', '团队', '社区', '家庭', '父母',
    'people', 'interact', 'meet', 'together', 'collaborate'
  ],
  '生活': [
    // 生活/日常
    'life', 'daily', 'routine', 'lifestyle', 'home', 'house', 'living', 'work',
    'job', 'career', 'money', 'travel', 'hobby', 'fun', 'enjoy', 'relax',
    '生活', '日常', '家', '工作', '职业', '钱', '旅行', '爱好', '快乐', '放松',
    'time', 'day', 'weekend', 'holiday', 'vacation', 'experience'
  ]
}

// ========================================
// 2. 难度评估规则（5级）
// ========================================

interface DifficultyMetrics {
  totalSentences: number
  totalWords: number
  avgSentenceLength: number
  avgWordLength: number
  longWordRatio: number  // 7字母以上长词占比（保留用于对比）
  durationSeconds: number | null
  speakingSpeedWpm: number | null  // 每分钟词数 (Words Per Minute)
  cefrScore: number  // CEFR 词汇难度分 (1-6 对应 A1-C2)
}

interface DifficultyAnalysisDetails {
  sentenceScore: number
  lengthScore: number
  cefrVocabScore: number  // CEFR 词汇评分（替代旧的 vocabScore）
  speakingSpeedScore: number  // 语速评分
  durationScore: number
  weightedScore: number
  // CEFR 详细信息
  cefrDetails?: {
    level: string
    score: number
    a1Percent: number
    a2Percent: number
    b1Percent: number
    b2Percent: number
    c1Percent: number
    c2Percent: number
  }
}

// ========================================
// 3. 自动分类函数
// ========================================

/**
 * 根据文章标题和内容自动判断分类
 */
export function autoDetectCategory(
  title: string,
  sentences: Array<{ text: string }>,
  language: SupportedLanguage
): { category: ArticleCategory; confidence: number } {
  // 合并标题和前3个句子作为分析文本
  const analysisText = [
    title,
    ...sentences.slice(0, 3).map(s => s.text)
  ].join(' ').toLowerCase()

  const scores: Record<ArticleCategory, number> = {
    '健康': 0,
    '心理': 0,
    '成长': 0,
    '学习': 0,
    '社交': 0,
    '生活': 0
  }

  // 关键词匹配
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = analysisText.match(regex)
      if (matches) {
        scores[category as ArticleCategory] += matches.length
      }
    }
  }

  // 找出得分最高的分类
  let maxScore = 0
  let detectedCategory: ArticleCategory = '生活' // 默认分类

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedCategory = category as ArticleCategory
    }
  }

  // 计算置信度 (0-1)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.1

  return {
    category: detectedCategory,
    confidence: Math.min(confidence, 1)
  }
}

// ========================================
// 4. 自动难度评估函数
// ========================================

/**
 * 规则1：句子数量评分（权重 25%）
 */
function getSentenceScore(totalSentences: number): number {
  if (totalSentences < 15) return 1
  if (totalSentences < 30) return 2
  if (totalSentences < 50) return 3
  if (totalSentences < 80) return 4
  return 5
}

/**
 * 规则2：平均句长评分（权重 30%）
 */
function getSentenceLengthScore(sentences: Array<{ text: string }>): number {
  const totalWords = sentences.reduce((sum, s) => {
    return sum + s.text.split(/\s+/).filter(w => w.length > 0).length
  }, 0)
  const avgWordsPerSentence = totalWords / sentences.length

  if (avgWordsPerSentence < 10) return 1
  if (avgWordsPerSentence < 13) return 2
  if (avgWordsPerSentence < 16) return 3
  if (avgWordsPerSentence < 20) return 4
  return 5
}

/**
 * 规则3a：平均单词长度评分
 */
function getWordLengthScore(sentences: Array<{ text: string }>): number {
  let totalChars = 0
  let totalWords = 0

  sentences.forEach(s => {
    const words = s.text.split(/\s+/).filter(w => w.length > 0)
    words.forEach(w => {
      totalChars += w.replace(/[^a-zA-Z]/g, '').length
    })
    totalWords += words.length
  })

  const avgWordLength = totalChars / totalWords

  if (avgWordLength < 4.0) return 1
  if (avgWordLength < 4.5) return 2
  if (avgWordLength < 5.0) return 3
  if (avgWordLength < 5.5) return 4
  return 5
}

/**
 * 规则3b：长词占比评分（7个字母以上的词占比）
 */
function getLongWordRatio(sentences: Array<{ text: string }>): number {
  let totalWords = 0
  let longWords = 0

  sentences.forEach(s => {
    const words = s.text.split(/\s+/).filter(w => w.length > 0)
    words.forEach(w => {
      const cleanWord = w.replace(/[^a-zA-Z]/g, '')
      if (cleanWord.length >= 7) longWords++
      totalWords++
    })
  })

  const ratio = totalWords > 0 ? longWords / totalWords : 0

  if (ratio < 0.10) return 1
  if (ratio < 0.15) return 2
  if (ratio < 0.20) return 3
  if (ratio < 0.25) return 4
  return 5
}

/**
 * 规则3：词汇复杂度综合评分（权重 35%）
 */
function getVocabularyScore(sentences: Array<{ text: string }>): number {
  const lengthScore = getWordLengthScore(sentences)
  const ratioScore = getLongWordRatio(sentences)

  // 长词占比权重更大（60%）
  return Math.round(lengthScore * 0.4 + ratioScore * 0.6)
}

/**
 * 规则4：时长评分（权重 10%）
 */
function getDurationScore(durationSeconds: number | null): number {
  if (!durationSeconds) return 3  // 默认中等

  const minutes = durationSeconds / 60

  if (minutes < 3) return 1
  if (minutes < 6) return 2
  if (minutes < 12) return 3
  if (minutes < 18) return 4
  return 5
}

/**
 * 规则5：CEFR 词汇等级评分（权重 35%）
 *
 * 使用 cefr-analyzer 库分析文本词汇的 CEFR 等级分布
 * CEFR 等级: A1(1), A2(2), B1(3), B2(4), C1(5), C2(6)
 *
 * cefr-analyzer 分数阈值：
 * - A1: < 1.2
 * - A2: 1.2 - 1.7
 * - B1: 1.7 - 2.2
 * - B2: 2.2 - 2.8
 * - C1: 2.8 - 3.5
 * - C2: > 3.5
 *
 * 返回值说明：
 * - score: 映射到 Level 1-5 的分数，用于加权计算
 * - details: CEFR 分析详情，用于 UI 展示
 */
function getCefrVocabScore(sentences: Array<{ text: string }>): {
  score: number  // 1-5 映射后的分数
  details: DifficultyAnalysisDetails['cefrDetails']
} {
  try {
    // 合并所有句子为一段文本
    const text = sentences.map(s => s.text).join(' ')

    // 使用 cefr-analyzer 分析
    const analysisResult = cefrAnalyzer.analyze(text, {
      includeUnknownWords: false,
      analyzeByPartOfSpeech: false
    })

    // 计算复杂度分数 (cefr-analyzer 的评分范围)
    const complexityResult = calculateComplexityScore(analysisResult)
    const rawScore = complexityResult.score

    // 根据 cefr-analyzer 的实际阈值映射到 Level 1-5
    // 这是非线性映射，因为 cefr-analyzer 的分数分布不是均匀的
    let mappedScore: number
    if (rawScore < 1.2) {
      mappedScore = 1.0  // A1
    } else if (rawScore < 1.7) {
      mappedScore = 1.5  // A2
    } else if (rawScore < 2.2) {
      mappedScore = 2.0  // B1
    } else if (rawScore < 2.8) {
      mappedScore = 3.0  // B2
    } else if (rawScore < 3.5) {
      mappedScore = 4.0  // C1
    } else {
      mappedScore = 5.0  // C2
    }

    const details: DifficultyAnalysisDetails['cefrDetails'] = {
      level: complexityResult.level.toUpperCase(),
      score: Number(rawScore.toFixed(2)),
      a1Percent: Number(analysisResult.levelPercentages.a1.toFixed(1)),
      a2Percent: Number(analysisResult.levelPercentages.a2.toFixed(1)),
      b1Percent: Number(analysisResult.levelPercentages.b1.toFixed(1)),
      b2Percent: Number(analysisResult.levelPercentages.b2.toFixed(1)),
      c1Percent: Number(analysisResult.levelPercentages.c1.toFixed(1)),
      c2Percent: Number(analysisResult.levelPercentages.c2.toFixed(1))
    }

    return { score: mappedScore, details }
  } catch (error) {
    // 降级：CEFR 分析失败时使用词长评估
    console.warn('[CEFR分析失败，使用降级方案]', error)
    const fallbackScore = getVocabularyScore(sentences)
    return { score: fallbackScore, details: undefined }
  }
}

/**
 * 规则6：语速评分（权重 20%）
 *
 * 语速 = 总词数 / 时长（分钟）
 *
 * 参考标准：
 * - 慢速教学: 80-100 WPM (Level 1)
 * - 正常口语: 120-150 WPM (Level 2-3)
 * - 快速演讲: 160-180 WPM (Level 4)
 * - 极速新闻: 190+ WPM (Level 5)
 */
function getSpeakingSpeedScore(
  totalWords: number,
  durationSeconds: number | null
): { score: number; wpm: number | null } {
  if (!durationSeconds || durationSeconds <= 0) {
    return { score: 3, wpm: null }  // 无时长数据，默认中等
  }

  const durationMinutes = durationSeconds / 60
  const wpm = Math.round(totalWords / durationMinutes)

  if (wpm < 100) return { score: 1, wpm }
  if (wpm < 130) return { score: 2, wpm }
  if (wpm < 160) return { score: 3, wpm }
  if (wpm < 190) return { score: 4, wpm }
  return { score: 5, wpm }
}

/**
 * 计算难度指标
 */
function calculateDifficultyMetrics(
  sentences: Array<{ text: string }>
): Omit<DifficultyMetrics, 'durationSeconds' | 'speakingSpeedWpm' | 'cefrScore'> {
  const totalSentences = sentences.length
  let totalWords = 0
  let totalChars = 0
  let longWords = 0

  sentences.forEach(sentence => {
    const words = sentence.text.split(/\s+/).filter(w => w.length > 0)
    totalWords += words.length
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '')
      totalChars += cleanWord.length
      if (cleanWord.length >= 7) longWords++
    })
  })

  const avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 0
  const avgWordLength = totalWords > 0 ? totalChars / totalWords : 0
  const longWordRatio = totalWords > 0 ? longWords / totalWords : 0

  return {
    totalSentences,
    totalWords,
    avgSentenceLength,
    avgWordLength,
    longWordRatio
  }
}

/**
 * 根据指标自动评估难度等级（1-5级）
 *
 * 新版权重分配（共 5 个维度）：
 * 1. 句子数量 (15%) - 文章长度
 * 2. 平均句长 (20%) - 句子复杂度
 * 3. CEFR 词汇等级 (35%) - 词汇难度（已映射到 1-5）
 * 4. 语速 (20%) - 每分钟词数
 * 5. 时长 (10%) - 听力耐力
 */
export function autoDetectLevel(
  sentences: Array<{ text: string }>,
  durationSeconds: number | null
): {
  level: DifficultyLevel
  confidence: number
  metrics: DifficultyMetrics
  details: DifficultyAnalysisDetails
} {
  // 计算基础指标
  const baseMetrics = calculateDifficultyMetrics(sentences)

  // 计算各项得分（1-5）
  const sentenceScore = getSentenceScore(baseMetrics.totalSentences)
  const lengthScore = getSentenceLengthScore(sentences)

  // 语速评分（1-5）
  const speedResult = getSpeakingSpeedScore(baseMetrics.totalWords, durationSeconds)
  const speakingSpeedScore = speedResult.score

  // 时长评分（1-5）
  const durationScore = getDurationScore(durationSeconds)

  // CEFR 词汇评分（已映射到 1-5）
  const cefrResult = getCefrVocabScore(sentences)
  const cefrVocabScore = cefrResult.score

  // 加权计算总分
  const weightedScore =
    sentenceScore * 0.15 +        // 句子数量 15%
    lengthScore * 0.20 +          // 平均句长 20%
    cefrVocabScore * 0.35 +       // CEFR 词汇 35%
    speakingSpeedScore * 0.20 +   // 语速 20%
    durationScore * 0.10          // 时长 10%

  // 四舍五入到整数等级，并限制在 1-5 范围内
  const rawLevel = Math.round(weightedScore)
  const level = Math.max(1, Math.min(5, rawLevel)) as DifficultyLevel

  // 计算置信度（0-1）
  // 分数越接近整数边界（x.5），置信度越低
  const decimal = weightedScore - Math.floor(weightedScore)
  let confidence: number
  if (decimal < 0.3 || decimal > 0.7) {
    confidence = 0.85  // 远离边界，高置信度
  } else if (decimal < 0.5) {
    confidence = 1 - decimal + 0.4  // 接近下边界
  } else {
    confidence = decimal + 0.4  // 接近上边界
  }

  // 限制置信度范围
  confidence = Math.min(Math.max(confidence, 0.5), 0.95)

  // 构建完整指标
  const metrics: DifficultyMetrics = {
    ...baseMetrics,
    durationSeconds,
    speakingSpeedWpm: speedResult.wpm,
    cefrScore: cefrResult.details?.score ?? 0
  }

  const details: DifficultyAnalysisDetails = {
    sentenceScore,
    lengthScore,
    cefrVocabScore,
    speakingSpeedScore,
    durationScore,
    weightedScore: Number(weightedScore.toFixed(2)),
    cefrDetails: cefrResult.details
  }

  return { level, confidence, metrics, details }
}

// ========================================
// 5. 自动图片匹配函数
// ========================================

/**
 * 从互联网获取相关图片
 *
 * 使用 loremflickr - 免费的图片搜索服务
 * 可以根据关键词（psychology, business, study 等）返回真实相关图片
 *
 * 注意：会自动解析 302 重定向，返回最终的真实图片 URL
 * 图片尺寸：400x250 (适配前台 SpeakerCard 192px 高度容器)
 */
export async function fetchMatchingImage(
  category: ArticleCategory,
  title: string,
  language: SupportedLanguage
): Promise<{ imageUrl: string; keywords: string[] } | null> {
  try {
    // 生成搜索关键词
    const searchKeywords = generateSearchKeywords(category, title, language)

    // 尝试多个关键词，优先使用分类关键词
    const categoryKeywords: Record<ArticleCategory, string[]> = {
      '健康': ['health', 'wellness', 'fitness', 'medical'],
      '心理': ['psychology', 'mind', 'mental', 'brain'],
      '成长': ['success', 'growth', 'achievement', 'motivation'],
      '学习': ['study', 'education', 'learning', 'book'],
      '社交': ['people', 'communication', 'team', 'friends'],
      '生活': ['lifestyle', 'daily', 'home', 'life']
    }

    const primaryKeywords = categoryKeywords[category] || [searchKeywords[0]]

    // 使用 loremflickr 获取真实图片
    // 尺寸：400x250 (适配前台 SpeakerCard 的 192px 高度容器，宽高比约 1.6:1)
    // 格式: https://loremflickr.com/400/250/{keyword1},{keyword2}?lock={random}
    const randomLock = Math.floor(Math.random() * 10000)
    const keywordsString = primaryKeywords.slice(0, 2).join(',')
    const initialUrl = `https://loremflickr.com/400/250/${keywordsString}?lock=${randomLock}`

    console.log(`[AutoAnalysis] 图片关键词: ${keywordsString}`)
    console.log(`[AutoAnalysis] 初始 URL: ${initialUrl}`)

    // 解析 302 重定向，获取最终的真实图片 URL
    let finalUrl = initialUrl
    try {
      const response = await fetch(initialUrl, { method: 'HEAD' })
      if (response.ok && response.redirected) {
        finalUrl = response.url
        console.log(`[AutoAnalysis] 重定向到: ${finalUrl}`)
      } else if (response.ok) {
        console.log(`[AutoAnalysis] 无重定向，使用原始 URL`)
      }
    } catch (redirectError) {
      // 如果解析重定向失败，使用原始 URL
      console.warn(`[AutoAnalysis] 解析重定向失败，使用原始 URL:`, redirectError)
    }

    return {
      imageUrl: finalUrl,
      keywords: searchKeywords
    }
  } catch (error) {
    console.error('[AutoAnalysis] 图片搜索失败:', error)
    return null
  }
}

/**
 * 生成搜索关键词
 */
function generateSearchKeywords(
  category: ArticleCategory,
  title: string,
  language: SupportedLanguage
): string[] {
  const keywords: string[] = []

  // 1. 添加分类相关关键词
  const categoryKeywords: Record<ArticleCategory, string[]> = {
    '健康': ['health', 'wellness', 'fitness', 'medical', 'exercise'],
    '心理': ['psychology', 'mind', 'mental health', 'meditation', 'emotion'],
    '成长': ['growth', 'success', 'motivation', 'achievement', 'progress'],
    '学习': ['study', 'learning', 'education', 'book', 'knowledge'],
    '社交': ['people', 'community', 'team', 'friends', 'social'],
    '生活': ['lifestyle', 'daily life', 'home', 'travel', 'relax']
  }

  keywords.push(...categoryKeywords[category])

  // 2. 从标题中提取关键词（只取前3个有意义的词）
  const titleWords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 3)

  keywords.push(...titleWords)

  // 去重并限制数量
  return [...new Set(keywords)].slice(0, 8)
}

// ========================================
// 6. 综合分析函数
// ========================================

export interface ArticleAnalysisResult {
  category: ArticleCategory
  categoryConfidence: number
  level: DifficultyLevel
  levelConfidence: number
  metrics: DifficultyMetrics
  details: DifficultyAnalysisDetails  // 详细评分
  suggestedImage: string | null
  imageKeywords: string[]
}

/**
 * 对文章进行全面自动分析
 */
export async function analyzeArticle(
  title: string,
  sentences: Array<{ text: string }>,
  language: SupportedLanguage,
  durationSeconds: number | null
): Promise<ArticleAnalysisResult> {
  // 1. 自动分类
  const { category, confidence: categoryConfidence } = autoDetectCategory(
    title,
    sentences,
    language
  )

  // 2. 自动难度
  const { level, confidence: levelConfidence, metrics, details } = autoDetectLevel(
    sentences,
    durationSeconds
  )

  // 3. 自动匹配图片
  let suggestedImage: string | null = null
  let imageKeywords: string[] = []

  const imageResult = await fetchMatchingImage(category, title, language)
  if (imageResult) {
    suggestedImage = imageResult.imageUrl
    imageKeywords = imageResult.keywords
  }

  return {
    category,
    categoryConfidence,
    level,
    levelConfidence,
    metrics,
    details,
    suggestedImage,
    imageKeywords
  }
}

/**
 * 解析图片 URL 的重定向，获取最终真实 URL
 *
 * 功能：
 * - 处理 loremflickr 等 302 重定向服务
 * - 非 loremflickr URL 直接透传（OSS、其他图床）
 * - 解析失败时降级到原 URL
 *
 * @param url - 原始 URL（可能是 loremflickr 重定向前 URL）
 * @returns 最终的真实 URL（重定向后或原 URL）
 *
 * @example
 * // loremflickr URL 会解析为真实图片 URL
 * await resolveImageUrl('https://loremflickr.com/400/250/psychology?lock=123')
 * // => 'https://farm5.staticflickr.com/4123/abc_xyz.jpg'
 *
 * // 其他 URL 直接透传
 * await resolveImageUrl('https://mysite.com/image.jpg')
 * // => 'https://mysite.com/image.jpg'
 */
export async function resolveImageUrl(url: string | null): Promise<string | null> {
  // 1. 空值直接返回
  if (!url) return null

  // 2. 非 loremflickr URL 直接透传（OSS、其他图床）
  if (!url.includes('loremflickr.com')) return url

  // 3. 解析 302 重定向，获取真实图片 URL
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (response.ok && response.redirected) {
      console.log(`[resolveImageUrl] ${url.substring(0, 50)}... → ${response.url.substring(0, 50)}...`)
      return response.url // 返回重定向后的真实 URL
    }
    return url // 无重定向，返回原 URL
  } catch (error) {
    console.warn(`[resolveImageUrl] 解析失败，使用原 URL:`, error)
    return url // 降级：解析失败时返回原 URL
  }
}
