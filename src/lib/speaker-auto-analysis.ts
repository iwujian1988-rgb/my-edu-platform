/**
 * Speaker 文章自动分析模块
 *
 * 功能：
 * - 自动判断文章分类
 * - 自动评估难度等级（1-5级）
 * - 自动匹配封面图片
 */

import { SupportedLanguage, ArticleCategory } from '@/types/speaker'

// 难度等级类型（1-5级）
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

// 难度等级描述
export const LEVEL_NAMES: Record<DifficultyLevel, string> = {
  1: '入门级（初中-高中基础）',
  2: '基础级（四级水平）',
  3: '进阶级（六级-托福基础）',
  4: '高级（雅思-托福进阶）',
  5: '专家级（GRE-专业学术）'
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
  longWordRatio: number  // 7字母以上长词占比
  durationSeconds: number | null
}

interface DifficultyAnalysisDetails {
  sentenceScore: number
  lengthScore: number
  vocabScore: number
  durationScore: number
  weightedScore: number
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
 * 计算难度指标
 */
function calculateDifficultyMetrics(
  sentences: Array<{ text: string }>
): Omit<DifficultyMetrics, 'durationSeconds'> {
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
  // 计算指标
  const baseMetrics = calculateDifficultyMetrics(sentences)
  const metrics: DifficultyMetrics = {
    ...baseMetrics,
    durationSeconds
  }

  // 计算各项得分
  const sentenceScore = getSentenceScore(metrics.totalSentences)
  const lengthScore = getSentenceLengthScore(sentences)
  const vocabScore = getVocabularyScore(sentences)
  const durationScore = getDurationScore(durationSeconds)

  // 加权计算总分
  const weightedScore =
    sentenceScore * 0.25 +        // 句子数量 25%
    lengthScore * 0.30 +          // 平均句长 30%
    vocabScore * 0.35 +           // 词汇复杂度 35%
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

  const details: DifficultyAnalysisDetails = {
    sentenceScore,
    lengthScore,
    vocabScore,
    durationScore,
    weightedScore: Number(weightedScore.toFixed(2))
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
