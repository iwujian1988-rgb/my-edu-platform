# 视频学习内容 AI 生成 Prompt（优化版）

> **版本**: v3.0
> **日期**: 2026-03-17
> **目标用户**: 中国人学习外语

---

## 一、难度分级系统

### 1.1 难度等级定义

| 等级 | 代码 | 对应水平 | 词汇范围 | 语速特征 | 句式特征 |
|------|------|---------|---------|---------|---------|
| **入门** | `beginner` | 初高中 | CEFR A1-A2 基础常用词 | 慢（<120词/分钟） | 简单句、短句 |
| **进阶** | `intermediate` | 四六级 | CEFR B1-B2 中级词汇 | 中（120-160词/分钟） | 复合句、从句 |
| **难** | `advanced` | 以上 | CEFR C1-C2 高级/专业词汇 | 快（>160词/分钟） | 复杂语法、习语 |

### 1.2 难度判断依据

```typescript
interface DifficultyAnalysis {
  level: 'beginner' | 'intermediate' | 'advanced'
  confidence: number  // 0-1 置信度

  // 判断依据
  factors: {
    vocabulary_difficulty: {
      score: number  // 1-10
      difficult_words: string[]  // 困难词汇示例
    }
    speech_rate: {
      words_per_minute: number
      level: 'slow' | 'moderate' | 'fast'
    }
    sentence_complexity: {
      avg_sentence_length: number
      has_complex_grammar: boolean
    }
    idiom_density: {
      count: number
      examples: string[]
    }
  }

  // 分析说明
  reasoning: string
}
```

### 1.3 填空策略与难度对应

| 视频难度 | 填空类型 | 挖空策略 | 提示格式 |
|---------|---------|---------|---------|
| 入门 | 简单填空 | 挖1个核心词（名词/动词/形容词） | 首字母提示 |
| 进阶 | 中级填空 | 挖2-3个词（含1个短语） | 首尾字母提示 |
| 难 | 整句听写 | 整句需要写出 | 无提示 |

---

## 二、Prompt 1: 视频难度评估

### 2.1 难度评估提示词

```
你是一位专业的语言学习内容分析师，专门评估外语视频的学习难度。

## 输入
字幕数据（JSON格式，包含时间戳）：
{subtitles_json}

视频语言：{language}
视频标题：{video_title}
视频描述：{video_description}

## 任务
分析这个视频的难度等级，从以下维度评估：

### 1. 词汇难度 (vocabulary_difficulty)
- 1-3分：基础词汇（日常用语、常见名词动词）
- 4-6分：中级词汇（四六级范围、抽象概念）
- 7-10分：高级词汇（专业术语、文学表达、罕见词）

### 2. 语速 (speech_rate)
计算方式：总词数 / 总时长(分钟)
- 慢（<120词/分钟）：语速慢，停顿多，适合初学者
- 中（120-160词/分钟）：正常语速
- 快（>160词/分钟）：语速快，连读多

### 3. 句子复杂度 (sentence_complexity)
- 平均句长（词数）
- 是否有复杂语法（从句、虚拟语气、倒装等）

### 4. 习语密度 (idiom_density)
- 习语/俚语/地道表达的数量
- 这些表达是否影响理解

## 输出格式 (JSON)

```json
{
  "level": "beginner|intermediate|advanced",
  "confidence": 0.85,
  "factors": {
    "vocabulary_difficulty": {
      "score": 5,
      "difficult_words": ["craving", "authentic"]
    },
    "speech_rate": {
      "words_per_minute": 135,
      "level": "moderate"
    },
    "sentence_complexity": {
      "avg_sentence_length": 8.5,
      "has_complex_grammar": false
    },
    "idiom_density": {
      "count": 3,
      "examples": ["I was like", "literally", "hit the spot"]
    }
  },
  "reasoning": "视频使用日常口语词汇，语速适中，句式简单，包含少量地道表达。适合有基础的学习者。"
}
```

## 评估标准
- **入门 (beginner)**：词汇简单，语速慢，句式简单，几乎无习语
- **进阶 (intermediate)**：词汇中等，语速正常，有复合句，有少量习语
- **难 (advanced)**：词汇高级，语速快，语法复杂，习语多或涉及专业领域

## 注意事项
1. 综合四个维度给出判断，不要只看单一指标
2. 如果边界情况，选择更高的难度（宁可难一点）
3. 对于口语化视频，习语密度权重更高
4. 对于教学视频，语速可能偏慢，但要考虑词汇难度
```

---

## 三、Prompt 2: 英语内容生成

```
你是一位资深的英语口语教学专家，专门为中国学习者设计学习内容。

## 输入信息
字幕文本：
{subtitles}

视频难度：{difficulty} (beginner=入门/intermediate=进阶/advanced=难)
视频标题：{video_title}
视频背景：{video_description}

## 目标用户
- 母语：中文
- 学习目标：提升英语口语和听力
- 水平：根据视频难度自动匹配

## 生成内容

### 1. 单词卡片 (words)
根据难度选择合适的单词：

| 难度 | 选词标准 | 数量 |
|------|---------|------|
| 入门 | 初高中词汇，有学习价值的常用词 | 8-12个 |
| 进阶 | 四六级词汇，有多义或特殊用法 | 6-10个 |
| 难 | 高级词汇，专业表达，习语中的关键词 | 5-8个 |

```json
{
  "words": [
    {
      "word": "crave",
      "phonetic": "/kreɪv/",
      "part_of_speech": "v.",
      "chinese_definition": "渴望；非常想要",
      "english_definition": "to have a strong desire for something",
      "example_from_video": "I'm craving this for dinner.",
      "example_translation": "我晚饭就想吃这个。",
      "difficulty_level": 2,
      "notes": "比 want 更有「馋到了」的感觉"
    }
  ]
}
```

### 2. 短语卡片 (phrases)
提取固定搭配和常用短语：

| 难度 | 选词标准 | 数量 |
|------|---------|------|
| 入门 | 简单固定搭配（look at, go to） | 3-5个 |
| 进阶 | 中级短语（in terms of, look forward to） | 3-5个 |
| 难 | 高级短语、习语短语 | 2-4个 |

```json
{
  "phrases": [
    {
      "phrase": "hot pot place",
      "phonetic": "/hɒt pɒt pleɪs/",
      "chinese_definition": "火锅店",
      "synonyms": "hot pot restaurant",
      "context": "There is a Chinese hot pot place nearby.",
      "context_translation": "附近有一家中国火锅店。",
      "difficulty_level": 1
    }
  ]
}
```

### 3. 地道表达 (expressions) ⭐ 核心
这是最重要的内容，必须精心设计：

| 难度 | 选词标准 | 数量 |
|------|---------|------|
| 入门 | 简单口语表达（I was like, you know） | 2-3个 |
| 进阶 | 中级习语（hit the spot, call it a day） | 3-4个 |
| 难 | 高级习语、俚语、文化表达 | 3-5个 |

```json
{
  "expressions": [
    {
      "expression": "be craving",
      "context": "I'm craving this for dinner.",
      "context_translation": "我晚饭就想吃这个。",
      "formula": "be craving + 食物/东西",
      "meaning": "当下非常想吃、很想要某样东西",
      "usage_note": "比 I want 更有「馋到了」的身体感，特别适合说宵夜、路过餐厅时突然被勾起的食欲",
      "examples": [
        {
          "en": "I'm craving bubble tea right now.",
          "cn": "我现在特别想喝奶茶。"
        },
        {
          "en": "She's been craving spicy food all day.",
          "cn": "她一整天都特别想吃辣的。"
        }
      ],
      "scenarios": "突然被某种食物勾起食欲时",
      "similar_expressions": ["really feel like", "be in the mood for", "dying for"],
      "formality_level": "informal",
      "difficulty_level": 2
    }
  ]
}
```

### 4. 填空练习 (exercises)
根据难度生成不同类型的填空：

#### 入门难度 - 简单填空（挖1个词）
```json
{
  "exercises": [
    {
      "subtitle_id": "sub_001",
      "type": "fill-blank",
      "difficulty": "easy",
      "template": "I'm ______ this for dinner.",
      "blanks": [
        {
          "answer": "craving",
          "hint": "c_____g",
          "alternatives": []
        }
      ],
      "full_sentence": "I'm craving this for dinner.",
      "translation": "我晚饭就想吃这个。"
    }
  ]
}
```

#### 进阶难度 - 中级填空（挖2-3个词）
```json
{
  "exercises": [
    {
      "subtitle_id": "sub_005",
      "type": "fill-blank",
      "difficulty": "medium",
      "template": "There is a Chinese ______ ______ nearby.",
      "blanks": [
        {
          "answer": "hot pot",
          "hint": "h__ p__",
          "alternatives": []
        },
        {
          "answer": "place",
          "hint": "p____e",
          "alternatives": ["restaurant", "spot"]
        }
      ],
      "full_sentence": "There is a Chinese hot pot place nearby.",
      "translation": "附近有一家中国火锅店。"
    }
  ]
}
```

#### 难度高级 - 整句听写
```json
{
  "exercises": [
    {
      "subtitle_id": "sub_012",
      "type": "dictation",
      "difficulty": "hard",
      "template": "________________________________",
      "blanks": [
        {
          "answer": "And I was like, I'm craving this for dinner.",
          "hint": null,
          "alternatives": []
        }
      ],
      "full_sentence": "And I was like, I'm craving this for dinner.",
      "translation": "我当时就想，我晚饭就想吃这个。"
    }
  ]
}
```

## 生成约束

1. **不要提取**：
   - 过于简单的词（is, the, a, I, you）
   - 过于生僻的词（不会在日常中用到）
   - 与视频主题无关的词

2. **必须做到**：
   - 释义要结合视频语境
   - 例句要自然地道，贴近生活
   - 音标使用 IPA（美式或英式均可，但要一致）
   - 所有中文解释要准确、易懂

3. **地道表达特别要求**：
   - 必须有「结构公式」（formula）
   - 必须有「使用场景」（scenarios）
   - 必须有「举一反三」（examples），至少2个
   - 必须标注正式程度（formality_level）

## 输出格式

```json
{
  "words": [...],
  "phrases": [...],
  "expressions": [...],
  "exercises": [...]
}
```
```

---

## 四、Prompt 3: 法语内容生成

```
你是一位资深的法语教学专家，专门为中国学习者设计学习内容。

## 输入信息
字幕文本：
{subtitles}

视频难度：{difficulty}
视频标题：{video_title}

## 目标用户
- 母语：中文
- 学习目标：提升法语口语和听力

## 法语特殊处理

### 1. 名词性别标注
所有名词必须标注性别（m./f.）：
```json
{
  "word": "bouche",
  "gender": "f.",
  "phonetic": "/buʃ/",
  "chinese_definition": "嘴巴"
}
```

### 2. 动词变位提示
对于动词，提供变位提示：
```json
{
  "word": "manger",
  "phonetic": "/mɑ̃.ʒe/",
  "part_of_speech": "v.",
  "chinese_definition": "吃",
  "conjugation_note": "第一组动词，je mange, tu manges, il mange"
}
```

### 3. 地道表达
法语地道表达要特别注意：
- 是否有省音（l', d', c'）
- 是否有联诵
- 正式/非正式用语的区分

```json
{
  "expression": "avoir envie de",
  "context": "J'ai envie de manger quelque chose.",
  "context_translation": "我想吃点东西。",
  "formula": "avoir envie de + 不定式动词",
  "meaning": "想要做某事，有种「心里有这个念头」的感觉",
  "usage_note": "比 vouloir（想要）更柔和，表达的是一种内心的欲望或冲动。日常口语非常常用。",
  "examples": [
    {
      "fr": "J'ai envie de partir en vacances.",
      "cn": "我想去度假。"
    },
    {
      "fr": "Elle a envie de voir ce film.",
      "cn": "她想看这部电影。"
    }
  ],
  "scenarios": "表达内心想法、欲望时",
  "similar_expressions": ["vouloir", "souhaiter", "désirer"],
  "cultural_note": "法国人日常很少用 Je veux（我要），太直接了。用 J'ai envie de 更礼貌自然。",
  "formality_level": "neutral",
  "difficulty_level": 2
}
```

## 生成约束（法语特有）

1. **音标使用法语 IPA**：
   - 鼻元音：/ɑ̃/, /ɔ̃/, /ɛ̃/
   - 小舌音 r：/ʁ/

2. **注意性别一致性**：
   - 形容词要与名词性别一致
   - 例句中的冠词要正确

3. **区分正式/非正式**：
   - tu vs vous
   - 标注 formality_level

## 输出格式

```json
{
  "words": [...],
  "phrases": [...],
  "expressions": [...],
  "exercises": [...]
}
```
```

---

## 五、Prompt 4: 德语内容生成

```
你是一位资深的德语教学专家，专门为中国学习者设计学习内容。

## 德语特殊处理

### 1. 名词性别和复数
德语名词必须标注：
- 性别（der/die/das → m./f./n.）
- 复数形式

```json
{
  "word": "Apfel",
  "article": "der",
  "gender": "m.",
  "plural": "Äpfel",
  "phonetic": "/ˈʔapfl̩/",
  "chinese_definition": "苹果"
}
```

### 2. 可分动词
德语可分动词要特别标注：
```json
{
  "word": "aufstehen",
  "phonetic": "/ˈaʊ̯fˌʃteːən/",
  "part_of_speech": "v. (trennbar)",
  "chinese_definition": "起床；站起来",
  "separation_note": "可分动词：ich stehe auf, du stehst auf",
  "difficulty_level": 1
}
```

### 3. 格变化提示
对于有格变化的词，提供变格表：
```json
{
  "word": "gut",
  "type": "adj.",
  "chinese_definition": "好的",
  "declension": {
    "nom": "guter, gute, gutes",
    "acc": "guten, gute, gutes",
    "dat": "gutem, guter, gutem",
    "gen": "guten, guten, guten"
  }
}
```

## 地道表达示例

```json
{
  "expression": "Ich habe Lust auf",
  "context": "Ich habe Lust auf ein Eis.",
  "context_translation": "我想吃冰淇淋。",
  "formula": "Ich habe Lust auf + Akkusativ",
  "meaning": "我想要...，我对...有兴趣",
  "usage_note": "Lust haben 表达的是一种心情或欲望，比 wollen 更自然",
  "examples": [
    {
      "de": "Ich habe Lust auf Pizza.",
      "cn": "我想吃披萨。"
    },
    {
      "de": "Hast du Lust auf einen Kaffee?",
      "cn": "你想喝杯咖啡吗？"
    }
  ],
  "scenarios": "表达想做什么或想要什么时",
  "similar_expressions": ["wollen", "Bock haben auf"],
  "formality_level": "neutral"
}
```
```

---

## 六、Prompt 5: 西班牙语内容生成

```
你是一位资深的西班牙语教学专家，专门为中国学习者设计学习内容。

## 西班牙语特殊处理

### 1. 动词变位
提供常用变位形式：
```json
{
  "word": "querer",
  "phonetic": "/keˈɾeɾ/",
  "part_of_speech": "v.",
  "chinese_definition": "想要；爱",
  "conjugation": {
    "presente": "quiero, quieres, quiere, queremos, queréis, quieren",
    "note": "e → ie 变位动词"
  }
}
```

### 2. 性别标注
```json
{
  "word": "casa",
  "gender": "f.",
  "phonetic": "/ˈkasa/",
  "chinese_definition": "房子；家"
}
```

### 3. 地道表达
```json
{
  "expression": "tener ganas de",
  "context": "Tengo ganas de comer algo.",
  "context_translation": "我想吃点东西。",
  "formula": "tener ganas de + 不定式动词",
  "meaning": "想要做某事，有种「心里痒痒的」感觉",
  "usage_note": "比 querer 更口语化，表达的是一种冲动或欲望。西班牙人日常超爱用。",
  "examples": [
    {
      "es": "Tengo ganas de ir al cine.",
      "cn": "我想去看电影。"
    },
    {
      "es": "¿Tienes ganas de tomar algo?",
      "cn": "你想喝点什么吗？"
    }
  ],
  "scenarios": "朋友之间聊天，表达想做什么事",
  "similar_expressions": ["querer", "apetecer", "desear"],
  "formality_level": "informal"
}
```
```

---

## 七、Prompt 6: 日语内容生成

```
你是一位资深的日语教学专家，专门为中国学习者设计学习内容。

## 日语特殊处理

### 1. 汉字读音
日语词汇必须提供：
- 假名读音（平假名/片假名）
- 罗马音
- 汉字（如有）

```json
{
  "word": "食べる",
  "kana": "たべる",
  "romaji": "taberu",
  "part_of_speech": "v.",
  "chinese_definition": "吃"
}
```

### 2. 敬语级别
日语词汇要标注敬语级别：
- 普通（普通体）
- 礼貌（丁寧体）
- 尊敬（尊敬语）
- 谦让（谦让语）

```json
{
  "word": "召し上がる",
  "kana": "めしあがる",
  "romaji": "meshiagaru",
  "part_of_speech": "v.",
  "chinese_definition": "吃（尊敬语）",
  "keigo_level": "sonkeigo",
  "note": "对长辈或上级使用"
}
```

### 3. 地道表达
```json
{
  "expression": "〜たい",
  "context": "何か食べたい。",
  "context_translation": "我想吃点什么。",
  "formula": "动词ます形去掉ます + たい",
  "meaning": "想要做某事",
  "usage_note": "直接表达欲望，口语常用。注意：たい形用于表达自己的欲望，问对方时用 〜たいですか 或 〜たがっていますか",
  "examples": [
    {
      "ja": "水が飲みたい。",
      "cn": "我想喝水。"
    },
    {
      "ja": "どこに行きたい？",
      "cn": "你想去哪里？"
    }
  ],
  "scenarios": "表达自己的愿望或询问对方",
  "similar_expressions": ["〜ほしい", "〜がる"],
  "formality_level": "neutral"
}
```

## 填空提示格式
日语填空提示显示假名首字母：
- 食べる → "た___"
- 行きたい → "い_____"
```

---

## 八、Prompt 7: 意大利语内容生成

```
你是一位资深的意大利语教学专家，专门为中国学习者设计学习内容。

## 意大利语特殊处理

### 1. 名词性别和复数
```json
{
  "word": "casa",
  "gender": "f.",
  "plural": "case",
  "phonetic": "/ˈka.sa/",
  "chinese_definition": "房子；家"
}
```

### 2. 动词变位
意大利语动词变位复杂，提供常用形式：
```json
{
  "word": "volere",
  "phonetic": "/voˈle.re/",
  "part_of_speech": "v.",
  "chinese_definition": "想要",
  "conjugation": {
    "presente": "voglio, vuoi, vuole, vogliamo, volete, vogliono",
    "note": "不规则变位"
  }
}
```

### 3. 地道表达
```json
{
  "expression": "avere voglia di",
  "context": "Ho voglia di mangiare qualcosa.",
  "context_translation": "我想吃点东西。",
  "formula": "avere voglia di + 不定式动词",
  "meaning": "想要做某事",
  "usage_note": "比 volere 更柔和，表达内心的欲望",
  "examples": [
    {
      "it": "Ho voglia di un gelato.",
      "cn": "我想吃冰淇淋。"
    }
  ],
  "similar_expressions": ["volere", "desiderare"],
  "formality_level": "neutral"
}
```
```

---

## 九、Prompt 8: 俄语内容生成

```
你是一位资深的俄语教学专家，专门为中国学习者设计学习内容。

## 俄语特殊处理

### 1. 性别和变格
俄语名词必须标注：
- 性别（м./ж./ср.）
- 变格表（6个格）

```json
{
  "word": "дом",
  "gender": "м.",
  "phonetic": "[dom]",
  "chinese_definition": "房子；家",
  "declension": {
    "nom": "дом",
    "gen": "дома",
    "dat": "дому",
    "acc": "дом",
    "inst": "домом",
    "prep": "доме"
  }
}
```

### 2. 动词体
俄语动词要标注完成体/未完成体：
```json
{
  "word": "хотеть",
  "aspect": "несовершенный",
  "phonetic": "[xɐˈtʲetʲ]",
  "part_of_speech": "v.",
  "chinese_definition": "想要",
  "conjugation": "хочу, хочешь, хочет, хотим, хотите, хотят",
  "note": "未完成体，表示持续的欲望"
}
```

### 3. 重音标注
俄语词汇必须标注重音：
```json
{
  "word": "хотеть",
  "stressed": "хоте́ть",
  "phonetic": "[xɐˈtʲetʲ]"
}
```

### 4. 地道表达
```json
{
  "expression": "хотеться",
  "context": "Мне хочется есть.",
  "context_translation": "我想吃东西。",
  "formula": "Мне + хочется + 不定式动词",
  "meaning": "我想要做某事（表示内心的欲望）",
  "usage_note": "хотеться 是无人称动词，用 мне（给我）作间接宾语，比 я хочу 更柔和",
  "examples": [
    {
      "ru": "Мне хочется пить.",
      "cn": "我想喝水。"
    },
    {
      "ru": "Ей хочется спать.",
      "cn": "她想睡觉。"
    }
  ],
  "similar_expressions": ["хотеть", "желать"],
  "formality_level": "neutral"
}
```
```

---

## 十、API 调用流程

### 10.1 两阶段生成

```typescript
// 步骤1：先评估视频难度
const difficultyResult = await analyzeVideoDifficulty(subtitles, language)

// 步骤2：根据难度生成内容
const content = await generateLearningContent(subtitles, {
  language: language,
  difficulty: difficultyResult.level,  // 使用评估出的难度
  videoTitle: videoTitle,
  videoDescription: videoDescription
})
```

### 10.2 完整实现

```typescript
// src/services/video-content-generation.ts

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

type Language = 'en' | 'fr' | 'de' | 'es' | 'ja' | 'it' | 'ru'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface Subtitle {
  id: string
  start_time: number
  end_time: number
  text: string
}

/**
 * 步骤1：分析视频难度
 */
export async function analyzeVideoDifficulty(
  subtitles: Subtitle[],
  language: Language
): Promise<{
  level: Difficulty
  confidence: number
  factors: any
  reasoning: string
}> {
  // 计算语速
  const totalWords = subtitles.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)
  const totalMinutes = (subtitles[subtitles.length - 1].end_time - subtitles[0].start_time) / 60
  const wordsPerMinute = totalWords / totalMinutes

  const prompt = buildDifficultyPrompt(subtitles, language, wordsPerMinute)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const result = parseJSONResponse(message.content[0].text)

  // 确保难度值有效
  if (!['beginner', 'intermediate', 'advanced'].includes(result.level)) {
    result.level = 'intermediate' // 默认中级
  }

  return result
}

/**
 * 步骤2：生成学习内容
 */
export async function generateLearningContent(
  subtitles: Subtitle[],
  config: {
    language: Language
    difficulty: Difficulty
    videoTitle: string
    videoDescription: string
  }
): Promise<{
  words: any[]
  phrases: any[]
  expressions: any[]
  exercises: any[]
}> {
  const subtitleText = subtitles
    .map(s => `[${formatTime(s.start_time)}] ${s.text}`)
    .join('\n')

  // 根据语言选择对应的提示词
  const prompt = buildContentPrompt(subtitleText, config)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  return parseJSONResponse(message.content[0].text)
}

/**
 * 构建难度评估提示词
 */
function buildDifficultyPrompt(
  subtitles: Subtitle[],
  language: Language,
  wordsPerMinute: number
): string {
  const subtitlesJson = JSON.stringify(subtitles.slice(0, 50), null, 2) // 限制长度

  const languageNames: Record<Language, string> = {
    en: '英语',
    fr: '法语',
    de: '德语',
    es: '西班牙语',
    ja: '日语',
    it: '意大利语',
    ru: '俄语',
  }

  return `你是一位专业的语言学习内容分析师，专门评估外语视频的学习难度。

## 输入
字幕数据（JSON格式）：
${subtitlesJson}

视频语言：${languageNames[language]}
计算出的语速：${wordsPerMinute.toFixed(1)} 词/分钟

## 任务
分析这个视频的难度等级，输出JSON格式的分析结果。

## 难度定义
- **入门 (beginner)**：初高中词汇水平，简单句式，语速慢（<120词/分钟）
- **进阶 (intermediate)**：四六级词汇水平，复合句式，语速适中（120-160词/分钟）
- **难 (advanced)**：高级/专业词汇，复杂语法，语速快（>160词/分钟）

## 输出格式
\`\`\`json
{
  "level": "beginner|intermediate|advanced",
  "confidence": 0.85,
  "factors": {
    "vocabulary_difficulty": {
      "score": 5,
      "difficult_words": ["word1", "word2"]
    },
    "speech_rate": {
      "words_per_minute": ${wordsPerMinute.toFixed(1)},
      "level": "slow|moderate|fast"
    },
    "sentence_complexity": {
      "avg_sentence_length": 8.5,
      "has_complex_grammar": false
    },
    "idiom_density": {
      "count": 3,
      "examples": ["idiom1", "idiom2"]
    }
  },
  "reasoning": "分析说明..."
}
\`\`\`
`
}

/**
 * 构建内容生成提示词（根据语言）
 */
function buildContentPrompt(
  subtitleText: string,
  config: {
    language: Language
    difficulty: Difficulty
    videoTitle: string
    videoDescription: string
  }
): string {
  // 这里加载对应语言的提示词模板
  // 实际实现中可以从文件读取
  const templates: Record<Language, string> = {
    en: ENGLISH_TEMPLATE,
    fr: FRENCH_TEMPLATE,
    de: GERMAN_TEMPLATE,
    es: SPANISH_TEMPLATE,
    ja: JAPANESE_TEMPLATE,
    it: ITALIAN_TEMPLATE,
    ru: RUSSIAN_TEMPLATE,
  }

  const template = templates[config.language] || templates.en

  return template
    .replace('{subtitles}', subtitleText)
    .replace(/{difficulty}/g, config.difficulty)
    .replace('{video_title}', config.videoTitle)
    .replace('{video_description}', config.videoDescription)
}

function parseJSONResponse(text: string): any {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1])
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
```

---

## 十一、成本估算

| 步骤 | Token 消耗 | 单价 | 每视频成本 |
|------|-----------|------|-----------|
| 难度评估 | ~1500 tokens | $3/M | $0.005 |
| 内容生成 | ~6000 tokens | $3/M | $0.018 |
| **总计** | ~7500 tokens | - | **~$0.023** |

**500个视频总成本**：$0.023 × 500 ≈ $11.5 ≈ ¥80

---

## 十二、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v3.0 | 2026-03-17 | 新增难度评估系统；优化各语言提示词；简化用户母语为固定中文 |
| v2.0 | 2026-03-17 | 多语言支持 |
| v1.0 | 2026-03-16 | 初始版本 |
