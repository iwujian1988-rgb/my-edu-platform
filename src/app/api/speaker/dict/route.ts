/**
 * Speaker dictionary lookup API.
 *
 * English keeps the historical Youdao path. French uses the local dictionary
 * provider first, then falls back to DeepSeek for Speaker ghost-word repair.
 */

import { NextResponse } from 'next/server'
import { getDictEntry } from '@/lib/dict-service'
import { lookupWord, type DictionaryLanguage, type UnifiedDictEntry } from '@/lib/dictionary'

const SUPPORTED_SPEAKER_DICT_LANGUAGES: DictionaryLanguage[] = ['en', 'fr']
const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions'
const FRENCH_LLM_MODEL = process.env.DEEPSEEK_DICT_MODEL || 'deepseek-v4-flash'
const SPEAKER_DICT_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const FRENCH_LLM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const FRENCH_LLM_TIMEOUT_MS = 12 * 1000

interface SpeakerDictRequestBody {
  word?: unknown
  language?: unknown
}

interface DictCacheEntry {
  entry: UnifiedDictEntry
  expiresAt: number
}

interface FrenchLlmPayload {
  word: string
  lemma?: string
  phonetic?: string
  part_of_speech?: string
  gender?: 'm' | 'f' | 'm/f' | 'n'
  definition: string
  example_sentence_fr?: string
  example_sentence_zh?: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const speakerDictCache = new Map<string, DictCacheEntry>()
const speakerDictInflight = new Map<string, Promise<UnifiedDictEntry>>()
const frenchLlmCache = new Map<string, DictCacheEntry>()

export async function POST(request: Request) {
  try {
    const body = await request.json() as SpeakerDictRequestBody
    const word = typeof body.word === 'string' ? body.word.trim() : ''
    const language = typeof body.language === 'string' ? body.language : 'en'

    if (!word) {
      return NextResponse.json(
        { error: 'MISSING_WORD', message: '缺少单词参数' },
        { status: 400 }
      )
    }

    const dictLanguage = SUPPORTED_SPEAKER_DICT_LANGUAGES.includes(language as DictionaryLanguage)
      ? language as DictionaryLanguage
      : 'en'

    const entry = await getCachedSpeakerDictEntry(word, dictLanguage)

    return NextResponse.json({
      success: true,
      entry
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Dict API] Lookup failed:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}

async function getCachedSpeakerDictEntry(word: string, language: DictionaryLanguage): Promise<UnifiedDictEntry> {
  const key = getSpeakerDictCacheKey(word, language)
  const cached = speakerDictCache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.entry
  }

  if (cached) {
    speakerDictCache.delete(key)
  }

  const inflight = speakerDictInflight.get(key)
  if (inflight) {
    return inflight
  }

  const lookupPromise = lookupSpeakerDictEntry(word, language)
    .then(entry => {
      speakerDictCache.set(key, {
        entry,
        expiresAt: Date.now() + SPEAKER_DICT_CACHE_TTL_MS
      })
      return entry
    })
    .finally(() => {
      speakerDictInflight.delete(key)
    })

  speakerDictInflight.set(key, lookupPromise)
  return lookupPromise
}

function getSpeakerDictCacheKey(word: string, language: DictionaryLanguage): string {
  return `${language}:${word.trim().toLowerCase()}`
}

async function lookupSpeakerDictEntry(word: string, language: DictionaryLanguage): Promise<UnifiedDictEntry> {
  if (language === 'en') {
    const entry = await getDictEntry(word)
    return {
      ...entry,
      word: entry.word || word.trim(),
      language: 'en',
      source: 'youdao',
      success: entry.success !== false && Boolean(entry.definition || entry.definition_en || entry.phonetic),
      _fetched_at: Date.now(),
    }
  }

  return lookupFrenchSpeakerWord(word)
}

async function lookupFrenchSpeakerWord(word: string): Promise<UnifiedDictEntry> {
  const candidates = getFrenchLookupCandidates(word)
  let fallbackEntry: UnifiedDictEntry | null = null

  for (const candidate of candidates) {
    const localEntry = await lookupWord(candidate, 'fr', { skipCache: true })
    if (localEntry.success) {
      return localEntry
    }
    fallbackEntry = fallbackEntry || localEntry
  }

  const cachedEntry = getFrenchLlmCache(word)
  if (cachedEntry) {
    return cachedEntry
  }

  const llmEntry = await lookupFrenchWordWithLlm(word)
  if (llmEntry.success) {
    setFrenchLlmCache(word, llmEntry)
    return llmEntry
  }

  return fallbackEntry || createFailedFrenchEntry(word.trim())
}

function getFrenchLookupCandidates(word: string): string[] {
  const normalizedWord = normalizeFrenchWord(word)
  const candidates = [normalizedWord]

  if (normalizedWord === 'jusqu') {
    candidates.push("jusqu'a", "jusqu'à", 'jusque')
  }

  return Array.from(new Set(candidates.filter(Boolean)))
}

function getFrenchLlmCache(word: string): UnifiedDictEntry | null {
  const key = normalizeCacheKey(word)
  const cached = frenchLlmCache.get(key)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    frenchLlmCache.delete(key)
    return null
  }

  return cached.entry
}

function setFrenchLlmCache(word: string, entry: UnifiedDictEntry): void {
  frenchLlmCache.set(normalizeCacheKey(word), {
    entry,
    expiresAt: Date.now() + FRENCH_LLM_CACHE_TTL_MS
  })
}

function normalizeCacheKey(word: string): string {
  return normalizeFrenchWord(word).toLowerCase()
}

function normalizeFrenchWord(word: string): string {
  return word.trim().toLowerCase().replace(/[’`]/g, "'")
}

async function lookupFrenchWordWithLlm(word: string): Promise<UnifiedDictEntry> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const normalizedWord = normalizeFrenchWord(word)

  if (!apiKey) {
    return createFailedFrenchEntry(normalizedWord)
  }

  try {
    const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: FRENCH_LLM_MODEL,
        temperature: 0.1,
        max_tokens: 500,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'system',
            content: [
              '你是法语学习词典 API，只返回严格 JSON，不要 Markdown。',
              '面向中文母语学习者，释义要短、准、适合背诵。',
              '如果输入是变位、复数、阴阳性形式，或带撇号的省音形式，请给出 lemma。',
              '如果输入看起来像 ASR 或分词造成的半截词，请尽量还原最可能的法语词，但不要编造不存在的词。',
            ].join('\n')
          },
          {
            role: 'user',
            content: [
              `查询法语词或短语：${normalizedWord}`,
              '返回 JSON 字段：',
              '{',
              '  "word": "最终识别出的法语词",',
              '  "lemma": "原形，可省略",',
              '  "phonetic": "IPA 或常见音标，可省略",',
              '  "part_of_speech": "词性，中文或缩写",',
              '  "gender": "m/f/n，可省略",',
              '  "definition": "中文释义，多个义项用；分隔",',
              '  "example_sentence_fr": "自然法语例句，可省略",',
              '  "example_sentence_zh": "例句中文翻译，可省略"',
              '}',
            ].join('\n')
          }
        ],
      }),
      signal: AbortSignal.timeout(FRENCH_LLM_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.error('[Speaker Dict API] French DeepSeek lookup failed:', response.status)
      return createFailedFrenchEntry(normalizedWord)
    }

    const data = await response.json() as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return createFailedFrenchEntry(normalizedWord)
    }

    const parsed = parseFrenchLlmPayload(content)
    if (!parsed?.definition) {
      return createFailedFrenchEntry(normalizedWord)
    }

    return {
      word: parsed.word || normalizedWord,
      language: 'fr',
      source: 'llm',
      success: true,
      phonetic: parsed.phonetic || '',
      definition: parsed.definition,
      part_of_speech: parsed.part_of_speech || '',
      example_sentence: parsed.example_sentence_zh || '',
      example_sentence_en: parsed.example_sentence_fr || '',
      gender: parsed.gender,
      forms: parsed.lemma && parsed.lemma !== normalizedWord ? `原形: ${parsed.lemma}` : undefined,
      _fetched_at: Date.now(),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Dict API] French DeepSeek lookup exception:', { error: errorMessage })
    return createFailedFrenchEntry(normalizedWord)
  }
}

function parseFrenchLlmPayload(content: string): FrenchLlmPayload | null {
  const jsonText = extractJsonObject(content)
  if (!jsonText) return null

  try {
    const value = JSON.parse(jsonText) as Partial<FrenchLlmPayload>
    if (typeof value.definition !== 'string' || !value.definition.trim()) {
      return null
    }

    return {
      word: toOptionalString(value.word) || '',
      lemma: toOptionalString(value.lemma),
      phonetic: toOptionalString(value.phonetic),
      part_of_speech: toOptionalString(value.part_of_speech),
      gender: toFrenchGender(value.gender),
      definition: value.definition.trim(),
      example_sentence_fr: toOptionalString(value.example_sentence_fr),
      example_sentence_zh: toOptionalString(value.example_sentence_zh),
    }
  } catch {
    return null
  }
}

function extractJsonObject(content: string): string | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const candidate = fenced?.[1] || content
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  return candidate.slice(start, end + 1)
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toFrenchGender(value: unknown): FrenchLlmPayload['gender'] | undefined {
  if (value === 'm' || value === 'f' || value === 'm/f' || value === 'n') {
    return value
  }
  return undefined
}

function createFailedFrenchEntry(word: string): UnifiedDictEntry {
  return {
    word,
    language: 'fr',
    source: 'llm',
    success: false,
    _fetched_at: Date.now(),
  }
}
