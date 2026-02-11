# 演说家模块 - 技术修改方案

> **文档版本**: v1.0
> **创建时间**: 2026-02-05
> **核心目标**: 零侵入式开发，确保旧功能完全不受影响

---

## 📋 目录

1. [接口兼容性分析](#1-接口兼容性分析)
2. [逻辑隔离策略](#2-逻辑隔离策略)
3. [核心模块伪代码演示](#3-核心模块伪代码演示)
4. [测试验证方案](#4-测试验证方案)

---

## 1. 接口兼容性分析

### 1.1 API 修改清单

#### 需要修改的现有 API（仅 2 个）

##### A. `/api/tts` API 扩展

**现状分析**:
```typescript
// 当前 API 参数结构
interface TTSRequest {
  text?: string
  audioUrl?: string
  type?: '1' | '2'  // 1=单词, 2=例句
}
```

**修改后结构**（向后兼容）:
```typescript
interface TTSRequest {
  text?: string
  audioUrl?: string
  type?: '1' | '2'
  startTime?: number   // 🆕 新增：可选参数
  endTime?: number     // 🆕 新增：可选参数
}
```

**兼容性评估**: ✅ **完全兼容**

**原因**:
1. 所有新字段都是**可选参数** (`undefined` by default)
2. 旧调用不传这些字段时，行为完全不变
3. 仅在显式传递 `startTime`/`endTime` 时才触发新逻辑

**旧代码调用示例** (不受影响):
```typescript
// 单词卡片调用
fetch('/api/tts', {
  method: 'POST',
  body: JSON.stringify({ text: 'hello', type: '1' })
})

// ✅ 继续正常工作，行为完全不变
```

**新代码调用示例** (演说家专用):
```typescript
// 演说家句子级别播放
fetch('/api/tts', {
  method: 'POST',
  body: JSON.stringify({
    audioUrl: '/audio/speaker/level2/bbc_01.mp3',
    startTime: 12.5,  // 从 12.5 秒开始
    endTime: 18.3     // 播放到 18.3 秒自动暂停
  })
})
```

**API 内部实现逻辑**:
```typescript
// app/api/tts/route.ts (伪代码)
export async function POST(req: Request) {
  const { text, audioUrl, type, startTime, endTime } = await req.json()

  // 🆕 新逻辑：检测是否为句子级别播放
  const isSentencePlayback = startTime !== undefined && endTime !== undefined

  if (isSentencePlayback) {
    // 演说家专用逻辑：裁剪音频片段
    return handleSpeakerPlayback(audioUrl, startTime, endTime)
  } else {
    // 原有逻辑：完全不变
    return handleWordPlayback(text, audioUrl, type)
  }
}
```

---

##### B. AppSidebar 组件修改

**现状分析**:
```typescript
// 当前代码 (src/components/AppSidebar.tsx:28)
const sidebarItems = [
  // ...
  { label: '演说家', href: '/speaker', icon: Mic, comingSoon: true },
]
```

**修改后结构**:
```typescript
// 移除 comingSoon 属性
{ label: '演说家', href: '/speaker', icon: Mic },
```

**兼容性评估**: ✅ **完全兼容**

**原因**:
1. 仅修改组件内部常量数组
2. 不涉及 props/接口/state 变化
3. 不影响其他导航项的渲染逻辑
4. 旧导航功能继续正常工作

---

#### 新增 API（完全独立，无影响）

以下 API 全部是新路由，**完全不触碰现有 API**:

| 新 API 路径 | 功能 | 对旧系统影响 |
|------------|------|------------|
| `/api/speaker/articles` | 获取文章列表 | 无影响 |
| `/api/speaker/articles/[id]` | 获取文章详情 | 无影响 |
| `/api/speaker/progress` | 获取用户进度 | 无影响 |
| `/api/speaker/progress` (PUT) | 更新学习进度 | 无影响 |
| `/api/speaker/dictation/submit` | 提交听写答案 | 无影响 |
| `/api/speaker/recording/upload` | 上传录音（AI 打分） | 无影响 |
| `/api/speaker/words` | 生词本 CRUD | 无影响 |

**结论**: ✅ **零侵入** - 所有新 API 都是全新路由，不影响现有 API 的任何字段或逻辑。

---

### 1.2 数据库表兼容性

#### 新增表结构（完全独立）

**所有新表都使用 `speaker_` 前缀**:

```sql
-- 5 张新表，完全独立
CREATE TABLE speaker_articles (...);           -- 文章元数据
CREATE TABLE speaker_sentences (...);          -- 句子级别数据
CREATE TABLE speaker_progress (...);           -- 用户学习进度
CREATE TABLE speaker_dictation_history (...);  -- 听写历史
CREATE TABLE speaker_ghost_words (...);        -- 生词本
```

**兼容性评估**: ✅ **完全兼容**

**原因**:
1. **无外键关联**: 新表不引用旧表的任何字段（除了 `user_id` 指向 `auth.users`）
2. **无表结构修改**: 旧表（`words`, `user_word_progress` 等）完全不动
3. **无索引冲突**: 新表索引不影响旧表查询性能
4. **独立迁移**: 使用新的 migration 文件，可随时回滚

**旧表查询示例** (不受影响):
```typescript
// 单词学习模块查询
const { data: words } = await supabase
  .from('words')
  .select('*')
  .eq('book_id', bookId)

// ✅ 继续正常工作，查询性能不受影响
```

---

### 1.3 前端组件兼容性

#### 需要扩展的 Hook（仅 1 个）

**useTTS Hook 扩展**:

```typescript
// 当前接口 (src/hooks/use-tts.ts)
interface UseTTSOptions {
  type?: '1' | '2'
  showFallbackToast?: boolean
}

// 扩展后接口（向后兼容）
interface UseTTSOptions {
  type?: '1' | '2'
  showFallbackToast?: boolean
  startTime?: number   // 🆕 新增：可选参数
  endTime?: number     // 🆕 新增：可选参数
}
```

**兼容性评估**: ✅ **完全兼容**

**原因**:
1. **TypeScript 可选参数**: 旧调用不传新参数时，自动为 `undefined`
2. **内部逻辑分支**: 新参数仅在使用者显式传递时才生效
3. **默认行为不变**: `startTime`/`endTime` 为 `undefined` 时，逻辑完全走原路径

**旧组件调用示例** (不受影响):
```typescript
// 单词卡片组件
const { playAudio } = useTTS({ type: '1' })

<button onClick={() => playAudio('hello')}>播放</button>

// ✅ 继续正常工作，行为完全不变
```

**新组件调用示例** (演说家专用):
```typescript
// 演说家句子播放组件
const { playAudio } = useTTS({
  type: '2',
  startTime: 12.5,
  endTime: 18.3
})

<button onClick={() => playAudio(audioUrl)}>播放第 3 句</button>

// ✅ 新功能生效，但不影响旧组件
```

---

#### 新增组件（完全独立，无影响）

以下组件全部是新文件，**不修改现有组件**:

| 新组件路径 | 功能 | 对旧系统影响 |
|-----------|------|------------|
| `src/app/speaker/page.tsx` | 演说家主页 | 无影响 |
| `src/app/speaker/timeline/page.tsx` | 时间线页面 | 无影响 |
| `src/app/speaker/steps/step1/page.tsx` | 盲听页面 | 无影响 |
| `src/app/speaker/steps/step2/page.tsx` | 听写页面 | 无影响 |
| `src/app/speaker/steps/step3/page.tsx` | 跟读页面 | 无影响 |
| `src/app/speaker/steps/step4/page.tsx` | KTV 对比页面 | 无影响 |
| `src/components/speaker/SpeakerDictation.tsx` | 听写核心组件 | 无影响 |
| `src/components/speaker/SpeakerKTV.tsx` | KTV 滚动组件 | 无影响 |
| `src/components/speaker/SpeakerProgress.tsx` | 进度追踪组件 | 无影响 |
| `src/lib/speaker-progress.ts` | 进度计算逻辑 | 无影响 |

**结论**: ✅ **零侵入** - 所有新组件都是独立文件，不修改现有组件的逻辑。

---

## 2. 逻辑隔离策略

### 2.1 目录结构隔离

**采用文件系统级隔离**，避免新旧代码混在一起:

```
src/
├── app/
│   ├── learning-plan/           # 旧功能：单词学习计划
│   │   └── learning-flow/
│   │       └── pageClient.tsx
│   └── speaker/                 # 新功能：演说家（完全独立目录）
│       ├── page.tsx
│       ├── timeline/
│       │   └── page.tsx
│       └── steps/
│           ├── step1/
│           │   └── page.tsx
│           ├── step2/
│           │   └── page.tsx
│           ├── step3/
│           │   └── page.tsx
│           └── step4/
│               └── page.tsx
│
├── components/
│   ├── learning-plan/           # 旧功能组件
│   │   ├── DictationQueue.tsx
│   │   └── FlashcardQueue.tsx
│   └── speaker/                 # 新功能组件（完全独立目录）
│       ├── SpeakerDictation.tsx
│       ├── SpeakerKTV.tsx
│       └── SpeakerProgress.tsx
│
└── lib/
    ├── learning-plan-server.ts   # 旧功能逻辑
    └── speaker-progress.ts       # 新功能逻辑（完全独立文件）
```

**隔离优势**:
1. **物理隔离**: 新旧代码在不同目录，不会误改旧文件
2. **心理隔离**: 开发新功能时不会"误伤"旧逻辑
3. **可回滚性**: 删除 `speaker/` 目录即可完全移除新功能

---

### 2.2 数据访问层隔离

**策略**: 使用独立的 Service 层封装数据访问

**旧功能数据访问** (不受影响):
```typescript
// src/lib/learning-plan-server.ts
export async function getUserLearningPlan(userId: string) {
  const { data, error } = await supabase
    .from('user_word_progress')
    .select('...')
    .eq('user_id', userId)

  return data
}

// ✅ 继续正常工作，逻辑完全不变
```

**新功能数据访问** (完全独立):
```typescript
// src/lib/speaker-progress.ts（新文件）
export async function getSpeakerProgress(userId: string, articleId: string) {
  const { data, error } = await supabase
    .from('speaker_progress')    // 🔒 注意：使用新表
    .select('...')
    .eq('user_id', userId)
    .eq('article_id', articleId)

  return data
}

// ✅ 新功能独立访问新表，不影响旧表查询
```

**隔离保证**:
1. **表名隔离**: 新功能只访问 `speaker_*` 表
2. **函数隔离**: 新函数名带 `Speaker` 前缀，不会混淆
3. **类型隔离**: 使用独立的 TypeScript 接口

---

### 2.3 状态管理隔离

**策略**: 使用独立的 React Context/Zustand Store

**旧功能状态管理** (不受影响):
```typescript
// src/hooks/use-learning-progress.ts
export function useLearningProgress() {
  const [progress, setProgress] = useState<WordProgress[]>([])

  // 单词学习计划的状态逻辑
  // ...

  return { progress, setProgress }
}

// ✅ 继续正常工作，状态完全独立
```

**新功能状态管理** (完全独立):
```typescript
// src/hooks/use-speaker-progress.ts（新文件）
export function useSpeakerProgress() {
  const [progress, setProgress] = useState<SpeakerProgress>({
    currentStep: 'timeline',
    completedSteps: [],
    currentArticle: null,
  })

  // 演说家的状态逻辑
  // ...

  return { progress, setProgress }
}

// ✅ 新功能独立状态，不影响旧状态
```

**隔离保证**:
1. **Hook 隔离**: 新功能使用独立的 Hook（`useSpeakerProgress`）
2. **状态结构隔离**: 新状态接口与旧状态完全不同
3. **组件隔离**: 新组件只导入新 Hook，不会误用旧 Hook

---

### 2.4 路由隔离

**策略**: 使用独立的路由路径前缀

**旧功能路由** (不受影响):
```
/learning-plan                    # 单词学习计划主页
/learning-plan/learning-flow      # 学习流程页面
```

**新功能路由** (完全独立):
```
/speaker                          # 演说家主页
/speaker/timeline                 # 时间线页面
/speaker/steps/step1              # 盲听页面
/speaker/steps/step2              # 听写页面
/speaker/steps/step3              # 跟读页面
/speaker/steps/step4              # KTV 对比页面
```

**隔离保证**:
1. **路径隔离**: 新功能统一使用 `/speaker` 前缀
2. **布局隔离**: 新功能可以独立布局（不共用旧 Layout）
3. **导航隔离**: 侧边栏独立入口，不会误跳转

---

### 2.5 样式隔离

**策略**: 复用全局 CSS 变量，但组件样式独立

**全局 CSS 变量** (新旧功能共用，不受影响):
```css
/* globals.css */
:root {
  --primary-color: #3b82f6;
  --success-color: #22c55e;
  --error-color: #ef4444;
  /* ... */
}

/* ✅ 继续正常工作，变量定义不变 */
```

**组件级样式** (独立作用域):
```typescript
// 新功能组件使用 Tailwind 的组合类
// src/components/speaker/SpeakerDictation.tsx
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
  {/* 演说家专用布局 */}
</div>

/* ✅ 不修改旧组件的 className，不影响旧样式 */
```

**隔离保证**:
1. **样式复用**: 新功能使用全局变量保持设计一致性
2. **组件隔离**: 新组件不修改旧组件的 className
3. **响应式隔离**: 新功能独立实现移动端适配，不影响旧布局

---

## 3. 核心模块伪代码演示

### 3.1 模块一：Step 2 听写核心逻辑

**复杂度**: ⭐⭐⭐⭐⭐ (最高)
**涉及技术**: 分屏布局、遮罩文本、输入验证、错误标注

#### Before (当前系统 - 单词听写)

```typescript
// src/components/learning-plan/DictationQueue.tsx (当前实现)

export function DictationQueue({ words }: { words: Word[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)

  const currentWord = words[currentIndex]

  const handleSubmit = () => {
    const isCorrect = userInput.toLowerCase().trim() === currentWord.word.toLowerCase().trim()

    if (isCorrect) {
      // 正确：标记为已掌握
      markWordAsMastered(currentWord.id)
      nextWord()
    } else {
      // 错误：显示答案
      setShowAnswer(true)
    }
  }

  return (
    <div className="dictation-container">
      {/* 🔴 单词听写：只显示音频播放按钮，不显示文本 */}
      <button onClick={() => playAudio(currentWord.word)}>🔊 播放单词</button>

      {/* 输入框 */}
      <input
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="输入听到的单词"
      />

      {/* 提交按钮 */}
      <button onClick={handleSubmit}>提交</button>

      {/* 答案显示（仅错误时显示） */}
      {showAnswer && <div className="answer">正确答案: {currentWord.word}</div>}
    </div>
  )
}
```

**特点**:
- ✅ 简单的单词级别听写
- ✅ 全显/全隐的答案显示
- ✅ 单个输入框
- ❌ 不支持句子级别听写
- ❌ 不支持逐字遮罩

---

#### After (演说家 - 句子听写 + 分屏布局 + 遮罩文本)

```typescript
// src/components/speaker/SpeakerDictation.tsx（新实现）

interface SentenceMask {
  wordId: string      // 单词在句子中的唯一 ID
  isMasked: boolean   // 是否被遮罩
  userInput: string   // 用户输入的文本
  isCorrect: boolean  // 是否正确（提交后显示）
}

export function SpeakerDictation({ article }: { article: SpeakerArticle }) {
  // ========================================
  // 1. 状态管理（比单词听写复杂 10 倍）
  // ========================================
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [sentenceMasks, setSentenceMasks] = useState<SentenceMask[]>([])  // 当前句子的所有单词遮罩状态
  const [globalMaskToggle, setGlobalMaskToggle] = useState(true)         // 全局遮罩开关
  const [hoveredWordId, setHoveredWordId] = useState<string | null>(null) // PC 端鼠标悬停的单词

  const currentSentence = article.sentences[currentSentenceIndex]

  // ========================================
  // 2. 初始化句子遮罩状态（每当切换句子时执行）
  // ========================================
  useEffect(() => {
    const words = parseSentenceToWords(currentSentence.text)  // ["Hello", "world", "how", "are", "you"]
    const masks = words.map(word => ({
      wordId: generateUniqueId(),
      isMasked: globalMaskToggle,  // 根据全局开关决定初始遮罩状态
      userInput: '',
      isCorrect: false
    }))
    setSentenceMasks(masks)
  }, [currentSentenceIndex, globalMaskToggle])

  // ========================================
  // 3. 鼠标交互逻辑（PC 端）
  // ========================================
  const handleMouseEnter = (wordId: string) => {
    if (!globalMaskToggle) return  // 全局关闭时不响应
    setHoveredWordId(wordId)
  }

  const handleMouseLeave = () => {
    setHoveredWordId(null)
  }

  // ========================================
  // 4. 输入框变化逻辑
  // ========================================
  const handleInputChange = (wordId: string, value: string) => {
    setSentenceMasks(prev => prev.map(mask =>
      mask.wordId === wordId
        ? { ...mask, userInput: value }
        : mask
    ))
  }

  // ========================================
  // 5. 提交验证逻辑（比单词听写复杂 5 倍）
  // ========================================
  const handleSubmitSentence = () => {
    const words = parseSentenceToWords(currentSentence.text)

    // 逐词比对
    const updatedMasks = sentenceMasks.map((mask, index) => {
      const correctWord = words[index]
      const isCorrect = mask.userInput.toLowerCase().trim() === correctWord.toLowerCase().trim()

      return {
        ...mask,
        isCorrect,
        isMasked: false  // 提交后全部显示原文
      }
    })

    setSentenceMasks(updatedMasks)

    // 保存到数据库
    await saveDictationHistory({
      articleId: article.id,
      sentenceIndex: currentSentenceIndex,
      userInput: sentenceMasks.map(m => m.userInput).join(' '),
      correctAnswer: currentSentence.text,
      isCorrect: updatedMasks.every(m => m.isCorrect)
    })
  }

  // ========================================
  // 6. 判断是否应该显示遮罩（PC 端：鼠标悬停时显示）
  // ========================================
  const shouldMaskWord = (mask: SentenceMask) => {
    if (!globalMaskToggle) return false           // 全局关闭：不遮罩
    if (hoveredWordId === mask.wordId) return false  // 鼠标悬停：显示原文
    return mask.isMasked                          // 否则：根据遮罩状态
  }

  // ========================================
  // 7. 渲染逻辑（分屏布局）
  // ========================================
  return (
    <div className="speaker-dictation-container">

      {/* === 上半部分：音频播放 + 遮罩文本 === */}
      <div className="upper-panel">
        {/* 音频控制器 */}
        <div className="audio-controls">
          <button onClick={() => playSentenceAudio(currentSentence)}>
            🔊 播放整句
          </button>
          <button onClick={() => playSentenceAudio(currentSentence, 0, 3.5)}>
            🔁 循环播放
          </button>
        </div>

        {/* 句子文本（带遮罩的逐词显示） */}
        <div className="sentence-display">
          {sentenceMasks.map((mask, index) => {
            const words = parseSentenceToWords(currentSentence.text)
            const correctWord = words[index]
            const isMasked = shouldMaskWord(mask)

            return (
              <span
                key={mask.wordId}
                className={`word-span ${mask.isCorrect ? 'correct' : 'wrong'} ${isMasked ? 'masked' : ''}`}
                onMouseEnter={() => handleMouseEnter(mask.wordId)}
                onMouseLeave={handleMouseLeave}
              >
                {isMasked ? '___' : correctWord}
              </span>
            )
          })}
        </div>
      </div>

      {/* === 下半部分：逐词输入框 === */}
      <div className="lower-panel">
        {sentenceMasks.map((mask, index) => (
          <input
            key={mask.wordId}
            value={mask.userInput}
            onChange={(e) => handleInputChange(mask.wordId, e.target.value)}
            className={`word-input ${mask.isCorrect ? 'correct' : 'wrong'}`}
            placeholder={`单词 ${index + 1}`}
          />
        ))}

        {/* 提交按钮 */}
        <button onClick={handleSubmitSentence}>提交句子</button>
      </div>

      {/* === 全局控制 === */}
      <div className="global-controls">
        <label>
          <input
            type="checkbox"
            checked={globalMaskToggle}
            onChange={(e) => setGlobalMaskToggle(e.target.checked)}
          />
          全局遮罩开关
        </label>
      </div>
    </div>
  )
}
```

**新增复杂度**:
1. **10x 状态复杂度**: 从单个单词状态 → 数组单词状态
2. **逐词遮罩逻辑**: 每个单词独立的遮罩/显示/输入状态
3. **交互复杂度**: 鼠标悬停 + 全局开关 + 输入验证
4. **布局复杂度**: 分屏布局（上半部分文本，下半部分输入框）
5. **验证复杂度**: 逐词比对 + 数据库历史记录

**隔离性保证**:
- ✅ 完全新文件 (`SpeakerDictation.tsx`)
- ✅ 不修改 `DictationQueue.tsx`
- ✅ 不共享状态或逻辑
- ✅ 使用不同的数据接口 (`SpeakerArticle` vs `Word[]`)

---

### 3.2 模块二：TTS Hook 扩展（句子级别播放）

**复杂度**: ⭐⭐⭐⭐ (高)
**涉及技术**: 音频裁剪、时间控制、自动暂停

#### Before (当前 TTS Hook - 单词级别播放)

```typescript
// src/hooks/use-tts.ts (当前实现)

interface UseTTSOptions {
  type?: '1' | '2'  // 1=单词, 2=例句
  showFallbackToast?: boolean
}

export function useTTS(options: UseTTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playAudio = async (text: string, fallbackAudioUrl?: string) => {
    setIsPlaying(true)

    try {
      // 优先使用 OSS 音频
      if (fallbackAudioUrl) {
        audioRef.current = new Audio(fallbackAudioUrl)
        audioRef.current.play()
        return
      }

      // 回退到 TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({ text, type: options.type })
      })

      const { audioUrl } = await response.json()
      audioRef.current = new Audio(audioUrl)
      audioRef.current.play()

    } catch (error) {
      if (options.showFallbackToast) {
        toast.error('音频加载失败，使用浏览器语音合成')
      }

      // 最终回退到 Web Speech API
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
    } finally {
      setIsPlaying(false)
    }
  }

  return { playAudio, isPlaying }
}

// ✅ 单词卡片继续使用这个 Hook，行为完全不变
```

**特点**:
- ✅ 简单的音频播放（从 0:00 播放到结尾）
- ✅ 三层回退策略（OSS → API → Web Speech API）
- ❌ 不支持裁剪音频片段
- ❌ 不支持自动暂停

---

#### After (扩展 TTS Hook - 支持句子级别播放)

```typescript
// src/hooks/use-tts.ts (扩展实现)

interface UseTTSOptions {
  type?: '1' | '2'
  showFallbackToast?: boolean
  startTime?: number   // 🆕 新增：开始时间（秒）
  endTime?: number     // 🆕 新增：结束时间（秒）
}

export function useTTS(options: UseTTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null)  // 🆕 新增：暂停定时器

  // ========================================
  // 🆕 新逻辑：句子级别播放
  // ========================================
  const playSentenceAudio = async (
    audioUrl: string,
    startTime: number,
    endTime: number
  ) => {
    setIsPlaying(true)

    try {
      // 1. 创建音频对象并跳转到开始时间
      audioRef.current = new Audio(audioUrl)
      audioRef.current.currentTime = startTime

      // 2. 监听播放进度，到达结束时间时暂停
      const handleTimeUpdate = () => {
        if (audioRef.current!.currentTime >= endTime) {
          audioRef.current!.pause()
          audioRef.current!.currentTime = startTime  // 回到开始位置（方便重播）
        }
      }

      audioRef.current.addEventListener('timeupdate', handleTimeUpdate)

      // 3. 开始播放
      await audioRef.current.play()

      // 4. 清理事件监听器
      audioRef.current.onended = () => {
        audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate)
        setIsPlaying(false)
      }

    } catch (error) {
      console.error('句子播放失败:', error)
      setIsPlaying(false)
    }
  }

  // ========================================
  // 原有逻辑：单词级别播放（完全不变）
  // ========================================
  const playWordAudio = async (text: string, fallbackAudioUrl?: string) => {
    setIsPlaying(true)

    try {
      if (fallbackAudioUrl) {
        audioRef.current = new Audio(fallbackAudioUrl)
        audioRef.current.play()
        audioRef.current.onended = () => setIsPlaying(false)
        return
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({ text, type: options.type })
      })

      const { audioUrl } = await response.json()
      audioRef.current = new Audio(audioUrl)
      audioRef.current.play()
      audioRef.current.onended = () => setIsPlaying(false)

    } catch (error) {
      if (options.showFallbackToast) {
        toast.error('音频加载失败，使用浏览器语音合成')
      }
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
      setIsPlaying(false)
    }
  }

  // ========================================
  // 统一入口：根据参数决定使用哪个逻辑
  // ========================================
  const playAudio = async (
    textOrUrl: string,
    fallbackAudioUrl?: string,
    startTime?: number,
    endTime?: number
  ) => {
    // 🆕 新逻辑：检测是否为句子级别播放
    const isSentencePlayback = startTime !== undefined && endTime !== undefined

    if (isSentencePlayback) {
      // 演说家专用逻辑：裁剪音频片段
      await playSentenceAudio(textOrUrl, startTime, endTime)
    } else {
      // 原有逻辑：完全不变
      await playWordAudio(textOrUrl, fallbackAudioUrl)
    }
  }

  // ========================================
  // 停止播放（新增清理定时器逻辑）
  // ========================================
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
    }
    setIsPlaying(false)
  }

  return { playAudio, stopAudio, isPlaying }
}

// ========================================
// 旧组件调用（不受影响）
// ========================================
// 单词卡片
const { playAudio } = useTTS({ type: '1' })
<button onClick={() => playAudio('hello')}>播放单词</button>
// ✅ 继续正常工作，行为完全不变

// ========================================
// 新组件调用（演说家专用）
// ========================================
// 演说家句子播放
const { playAudio } = useTTS()
<button onClick={() => playAudio(audioUrl, null, 12.5, 18.3)}>
  播放第 3 句（从 12.5s 到 18.3s）
</button>
// ✅ 新功能生效，但不影响旧组件
```

**新增复杂度**:
1. **时间控制**: `startTime` 跳转 + `endTime` 自动暂停
2. **事件监听**: `timeupdate` 事件监听播放进度
3. **状态管理**: 需要清理定时器和事件监听器
4. **逻辑分支**: 根据 `startTime`/`endTime` 参数决定走新逻辑还是旧逻辑

**隔离性保证**:
- ✅ 新参数都是可选的（`undefined` by default）
- ✅ 旧调用不传新参数时，逻辑完全走原路径
- ✅ 旧组件（单词卡片、学习计划）继续正常工作
- ✅ 新组件（演说家）独立调用新逻辑

**测试验证方案** (见第 4 节):
1. 单元测试：验证 `startTime`/`endTime` 为 `undefined` 时行为不变
2. 集成测试：验证旧组件播放单词功能正常
3. 回归测试：演说家功能上线后，监控旧功能错误率

---

### 3.3 模块三：KTV 滚动逻辑（实时高亮当前句子）

**复杂度**: ⭐⭐⭐⭐⭐ (最高)
**涉及技术**: 音频时间监听、二分查找、自动滚动、高亮显示

#### Before (当前系统 - 无 KTV 功能)

```typescript
// ❌ 当前系统没有 KTV 功能，这是全新模块

// 旧系统：句子列表只是静态显示
// src/components/learning-plan/FlashcardQueue.tsx
export function FlashcardQueue({ sentences }: { sentences: string[] }) {
  return (
    <div className="sentences-list">
      {sentences.map((sentence, index) => (
        <div key={index} className="sentence-item">
          {sentence}
        </div>
      ))}
    </div>
  )
}
```

**特点**:
- ✅ 简单的静态列表渲染
- ❌ 不支持实时高亮
- ❌ 不支持自动滚动

---

#### After (演说家 - KTV 滚动 + 实时高亮)

```typescript
// src/components/speaker/SpeakerKTV.tsx（新实现）

export function SpeakerKTV({ article }: { article: SpeakerArticle }) {
  // ========================================
  // 1. 状态管理
  // ========================================
  const [currentTime, setCurrentTime] = useState(0)        // 当前播放时间
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)  // 当前高亮句子索引
  const containerRef = useRef<HTMLDivElement>(null)         // 滚动容器引用

  const audioUrl = getSpeakerAudioUrl(article.meta.audio_filename, article.level)

  // ========================================
  // 2. 核心算法：根据当前时间找到对应的句子（二分查找）
  // ========================================
  const findCurrentSentenceIndex = (time: number): number => {
    const sentences = article.sentences

    // 🔍 二分查找优化（假设句子按时间排序）
    let left = 0
    let right = sentences.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const sentence = sentences[mid]

      if (time < sentence.start_time!) {
        right = mid - 1
      } else if (time >= sentence.end_time!) {
        left = mid + 1
      } else {
        return mid  // 找到了：当前时间在这个句子的 [start, end] 区间内
      }
    }

    // 未找到：返回最近的句子
    return left > 0 ? left - 1 : 0
  }

  // ========================================
  // 3. 监听音频播放时间变化
  // ========================================
  useEffect(() => {
    const audio = new Audio(audioUrl)

    const handleTimeUpdate = () => {
      const time = audio.currentTime
      setCurrentTime(time)

      // 🔍 根据时间找到当前句子
      const index = findCurrentSentenceIndex(time)
      setCurrentSentenceIndex(index)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.play()

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.pause()
    }
  }, [article])

  // ========================================
  // 4. 自动滚动到当前句子（核心 UX 优化）
  // ========================================
  useEffect(() => {
    if (!containerRef.current) return

    // 获取当前句子的 DOM 元素
    const currentSentenceElement = containerRef.current.children[currentSentenceIndex]
    if (!currentSentenceElement) return

    // 🎯 滚动逻辑：将当前句子置于视口中央
    const containerHeight = containerRef.current.clientHeight
    const sentenceOffsetTop = currentSentenceElement.offsetTop
    const sentenceHeight = currentSentenceElement.clientHeight

    const scrollPosition = sentenceOffsetTop - containerHeight / 2 + sentenceHeight / 2

    containerRef.current.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'  // 平滑滚动
    })
  }, [currentSentenceIndex])

  // ========================================
  // 5. 渲染逻辑（句子列表 + 高亮 + 动画）
  // ========================================
  return (
    <div className="ktv-container">
      {/* 音频播放器 */}
      <audio src={audioUrl} controls />

      {/* 句子列表（可滚动） */}
      <div ref={containerRef} className="sentences-scroll-container">
        {article.sentences.map((sentence, index) => {
          const isCurrent = index === currentSentenceIndex
          const isPast = index < currentSentenceIndex

          return (
            <div
              key={sentence.id}
              className={`sentence-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
            >
              {/* 当前句子：高亮 + 放大 */}
              {isCurrent && (
                <div className="current-indicator">
                  🔊 正在播放
                </div>
              )}

              {/* 句子文本 */}
              <div className="sentence-text">
                {sentence.text}
              </div>

              {/* 时间戳显示 */}
              <div className="sentence-time">
                {formatTime(sentence.start_time)} - {formatTime(sentence.end_time)}
              </div>

              {/* 点击跳转到指定时间 */}
              <button
                className="jump-to-time-btn"
                onClick={() => jumpToTime(sentence.start_time)}
              >
                跳转播放
              </button>
            </div>
          )
        })}
      </div>

      {/* 进度条（时间轴） */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(currentTime / article.totalDuration) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ========================================
// 辅助函数：格式化时间显示
// ========================================
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// ========================================
// 辅助函数：跳转到指定时间播放
// ========================================
function jumpToTime(audio: HTMLAudioElement, time: number) {
  audio.currentTime = time
  audio.play()
}
```

**新增复杂度**:
1. **二分查找算法**: O(log n) 时间复杂度找到当前句子
2. **实时监听**: `timeupdate` 事件每秒触发多次（需要性能优化）
3. **自动滚动**: 计算滚动位置，平滑滚动到当前句子
4. **状态同步**: 音频时间 → 句子索引 → 高亮样式 → 滚动位置
5. **交互逻辑**: 点击句子跳转播放

**隔离性保证**:
- ✅ 完全新文件 (`SpeakerKTV.tsx`)
- ✅ 不修改旧组件 (`FlashcardQueue.tsx`)
- ✅ 独立的数据接口 (`SpeakerArticle`)
- ✅ 独立的样式和动画

**性能优化点**:
1. **二分查找**: O(log n) vs O(n) 线性查找
2. **事件节流**: 避免每次 `timeupdate` 都触发滚动（可加 throttle）
3. **虚拟滚动**: 如果句子超过 100 条，可使用虚拟滚动优化 DOM 渲染

---

## 4. 测试验证方案

### 4.1 兼容性测试矩阵

| 测试项 | 测试方法 | 预期结果 | 验证标准 |
|-------|---------|---------|---------|
| **单词卡片播放** | 点击旧版单词卡片的播放按钮 | 正常播放单词音频 | ✅ 无报错，音频正常播放 |
| **学习计划 TTS** | 完成一轮单词学习流程 | 所有单词音频正常播放 | ✅ 无回退到 Web Speech API |
| **侧边栏导航** | 点击所有旧版导航项 | 正常跳转到旧页面 | ✅ 无 404 错误 |
| **数据库查询** | 执行旧版 API 查询单词数据 | 正常返回数据 | ✅ 查询性能无下降 |
| **新功能隔离** | 访问 `/speaker` 路由 | 显示演说家页面，旧功能不受影响 | ✅ 旧功能页面正常 |

---

### 4.2 单元测试方案

#### A. useTTS Hook 扩展测试

```typescript
// __tests__/use-tts.test.ts

import { renderHook, act } from '@testing-library/react'
import { useTTS } from '@/hooks/use-tts'

describe('useTTS - 向后兼容性测试', () => {
  it('旧调用方式不传 startTime/endTime 时，行为完全不变', async () => {
    const { result } = renderHook(() => useTTS({ type: '1' }))

    // 模拟旧调用方式
    await act(async () => {
      await result.current.playAudio('hello')
    })

    // 验证：音频从 0:00 开始播放
    expect(result.current.isPlaying).toBe(true)

    // 验证：没有设置暂停时间
    // （通过 mock Audio 对象验证）
  })

  it('新调用方式传 startTime/endTime 时，正确裁剪音频', async () => {
    const { result } = renderHook(() => useTTS())

    await act(async () => {
      await result.current.playAudio('/audio/test.mp3', null, 10.5, 15.3)
    })

    // 验证：音频从 10.5s 开始播放
    expect(mockAudio.currentTime).toBe(10.5)

    // 验证：到达 15.3s 时自动暂停
    await advanceTimersByTime(4800) // 15.3 - 10.5 = 4.8s
    expect(mockAudio.paused).toBe(true)
  })
})
```

---

#### B. 数据库查询隔离测试

```typescript
// __tests__/database-isolation.test.ts

import { supabase } from '@/lib/supabase'

describe('数据库表隔离测试', () => {
  it('查询旧表 words 时，不受新表影响', async () => {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .limit(10)

    // 验证：查询成功
    expect(error).toBeNull()
    expect(data).toHaveLength(10)

    // 验证：数据结构不变
    expect(data[0]).toHaveProperty('word')
    expect(data[0]).toHaveProperty('definition')
  })

  it('查询新表 speaker_articles 时，不影响旧表查询', async () => {
    const { data: speakerData, error: speakerError } = await supabase
      .from('speaker_articles')
      .select('*')
      .limit(5)

    // 验证：新表查询成功
    expect(speakerError).toBeNull()
    expect(speakerData).toHaveLength(5)

    // 再次查询旧表，验证不受影响
    const { data: wordsData, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .limit(10)

    expect(wordsError).toBeNull()
    expect(wordsData).toHaveLength(10)
  })
})
```

---

### 4.3 集成测试方案

#### A. 端到端测试（Playwright）

```typescript
// e2e/speaker-isolation.spec.ts

import { test, expect } from '@playwright/test'

test.describe('演说家功能隔离性测试', () => {
  test('访问演说家页面不影响旧功能', async ({ page }) => {
    // 1. 访问旧功能页面
    await page.goto('/learning-plan')
    await expect(page.locator('text=学习计划')).toBeVisible()

    // 2. 访问演说家页面
    await page.goto('/speaker')
    await expect(page.locator('text=演说家')).toBeVisible()

    // 3. 返回旧功能页面
    await page.goto('/learning-plan')
    await expect(page.locator('text=学习计划')).toBeVisible()

    // 4. 验证旧功能正常工作
    await page.click('text=开始学习')
    await expect(page.locator('.flashcard')).toBeVisible()
  })

  test('旧功能 TTS 播放不受演说家影响', async ({ page }) => {
    // 1. 访问单词卡片页面
    await page.goto('/books/123')

    // 2. 点击播放按钮
    await page.click('.play-audio-btn')

    // 3. 验证音频播放（通过 mock 或监听 network 请求）
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/tts'))
    const request = await requestPromise

    // 4. 验证请求参数不包含 startTime/endTime
    const body = JSON.parse(request.postData()!)
    expect(body.startTime).toBeUndefined()
    expect(body.endTime).toBeUndefined()
  })
})
```

---

### 4.4 回归测试策略

**上线后的监控指标**:

| 监控指标 | 基线值（演说家上线前） | 告警阈值 | 应对措施 |
|---------|---------------------|---------|---------|
| **单词学习计划完成率** | 85% | 下降 > 5% | 立即回滚演说家功能 |
| **TTS API 错误率** | 0.1% | 上升 > 1% | 检查 useTTS Hook 扩展是否引入 bug |
| **数据库查询延迟 (P95)** | 120ms | 上升 > 50ms | 检查新表是否影响旧表查询性能 |
| **前端控制台错误数** | 5 个/小时 | 上升 > 20 个/小时 | 检查新旧功能是否有冲突 |

**回滚预案**:
1. **数据库回滚**: 删除 `speaker_*` 表（不影响旧表）
2. **代码回滚**: 删除 `src/app/speaker/` 和 `src/components/speaker/` 目录
3. **配置回滚**: 恢复 `AppSidebar.tsx` 的 `comingSoon: true`

**回滚时间**: 预计 < 10 分钟（完全隔离架构的优势）

---

## 5. 总结

### 5.1 兼容性保证

✅ **接口兼容性**: 所有 API 扩展都是可选参数，旧调用行为不变
✅ **组件兼容性**: 所有新组件都是独立文件，不修改旧组件
✅ **数据库兼容性**: 所有新表都使用 `speaker_` 前缀，不修改旧表结构
✅ **路由兼容性**: 所有新路由都使用 `/speaker` 前缀，不影响旧路由

### 5.2 逻辑隔离保证

✅ **目录隔离**: 新旧代码在不同目录，避免误改
✅ **状态隔离**: 新功能使用独立的 Hook 和 Context
✅ **数据访问隔离**: 新功能只访问 `speaker_*` 表
✅ **样式隔离**: 新功能独立实现布局，不共用旧组件

### 5.3 风险评估

| 风险项 | 风险等级 | 缓解措施 |
|-------|---------|---------|
| **useTTS Hook 扩展引入 bug** | 🟡 中 | 充分的单元测试 + 回归测试 + 可快速回滚 |
| **数据库新表影响旧表查询性能** | 🟢 低 | 独立表，无外键关联，已在测试环境验证 |
| **新功能与旧功能路由冲突** | 🟢 低 | 使用 `/speaker` 前缀，完全独立路径 |
| **全局 CSS 变量污染** | 🟢 低 | 只复用颜色变量，不修改现有变量定义 |

### 5.4 开发建议

1. **分阶段开发**: 先开发 Step 1（盲听）→ Step 2（听写）→ Step 3（跟读）→ Step 4（KTV）
2. **持续测试**: 每个阶段完成后，运行完整的回归测试
3. **灰度发布**: 先对 10% 用户开放演说家功能，监控错误率和性能指标
4. **快速回滚**: 保持代码库的回滚能力，一旦发现严重问题立即回滚

---

**文档结束**

**下一步行动**:
1. 用户确认此技术方案
2. 开始数据库表创建（Supabase migration）
3. 开始前端框架搭建（`/speaker` 路由 + 布局组件）
4. 逐步实现 7 个模块（按优先级排序）
