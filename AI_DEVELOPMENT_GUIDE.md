# AI 开发指南 - 演说家模块实现策略

> **目标**: 最大化 AI 开发效率，最小化 AI 出错概率
> **核心原则**: 小步快跑，频繁验证，明确边界

---

## 📌 目录

1. [📚 文档清单与分类](#-文档清单与分类)
2. [AI 开发的 10 大陷阱](#ai-开发的-10-大陷阱)
3. [演说家模块的特殊注意事项](#演说家模块的特殊注意事项)
4. [开发步骤（防错版）](#开发步骤防错版)
5. [AI 工作验证清单](#ai-工作验证清单)
6. [Prompt 最佳实践](#prompt-最佳实践)

---

## 📚 文档清单与分类

### 📖 需求文档（Product Requirements）

**描述"做什么"** - 产品功能、用户交互、业务逻辑

| 文档名称 | 文件路径 | 内容描述 | 优先级 |
|---------|---------|---------|-------|
| **产品需求文档 (PRD)** | `shangwenjie.md` | - 7 大模块功能详述<br>- 用户交互流程<br>- 页面布局规范<br>- 业务规则（判分标准、断点续播等）| ⭐⭐⭐⭐⭐ |
| **数据导入规范** | `speak/README.md` | - 音频文件结构<br>- JSON 数据格式<br>- 导入脚本说明 | ⭐⭐⭐ |

**使用场景**：
- ✅ 开发新功能前，先查阅 PRD 了解产品需求
- ✅ 不确定交互逻辑时，查看 PRD 对应模块
- ❌ 不用于技术实现细节

---

### 🔧 技术文档（Technical Specifications）

**描述"怎么做"** - 数据结构、API 接口、代码实现

| 文档名称 | 文件路径 | 内容描述 | 优先级 |
|---------|---------|---------|-------|
| **技术修改方案** | `TECHNICAL_MODIFICATION_PLAN.md` | - 接口兼容性分析<br>- 逻辑隔离策略<br>- 核心模块伪代码（Before/After）<br>- 数据库表结构 | ⭐⭐⭐⭐⭐ |
| **重构计划书** | `SPEAKER_REFACTOR_PLAN.md` | - 代码映射清单（哪些文件需要修改）<br>- 可复用性评估<br>- 数据库设计<br>- 工作量估算（10-14 周） | ⭐⭐⭐⭐ |
| **AI 开发指南** | `AI_DEVELOPMENT_GUIDE.md` | - AI 开发陷阱防范<br>- 分步开发流程<br>- Prompt 最佳实践<br>- 验证清单 | ⭐⭐⭐⭐⭐ |

**使用场景**：
- ✅ 开始编码前，查看技术文档了解数据结构和 API 设计
- ✅ 实现具体功能时，参考伪代码示例
- ✅ 遇到兼容性问题时，查看接口兼容性分析
- ❌ 不用于了解产品需求

---

### 📋 快速查阅指南

**问题："我要实现 X 功能，应该看哪个文档？"**

```
1. 首先问自己：这个功能是"做什么"还是"怎么做"？

   想了解功能需求 → 看 shangwenjie.md（PRD）
   想了解技术实现 → 看 TECHNICAL_MODIFICATION_PLAN.md

2. 具体映射表：

   问题类型 → 查看文档 → 具体章节
   ──────────────────────────────────────
   "页面应该长什么样？" → PRD → 第 2 节（功能模块详述）
   "数据表有哪些字段？" → 技术文档 → 第 1.2 节（数据库表兼容性）
   "API 接口怎么设计？" → 技术文档 → 第 1.1 节（API 修改清单）
   "如何避免 AI 出错？" → 开发指南 → 第 1 节（10 大陷阱）
   "听写遮罩逻辑怎么写？" → 技术文档 → 第 3.1 节（模块一伪代码）
   "判分标准是什么？" → PRD → 第 2.4 节 F（判分容错标准）
   "需要修改哪些文件？" → 重构计划 → 第 2 节（代码映射）
   "如何分步实现？" → 开发指南 → 第 3 节（开发步骤）

3. 示例：

   任务："实现听写页面的遮罩功能"
   步骤：
   ① 先看 PRD（shangwenjie.md 第 111-200 行）→ 了解遮罩的交互需求
   ② 再看技术文档（TECHNICAL_MODIFICATION_PLAN.md 第 103-156 行）→ 查看伪代码实现
   ③ 最后看开发指南（AI_DEVELOPMENT_GUIDE.md 第 3 节）→ 按步骤实现
```

---

### 🎯 AI 开发时的文档引用优先级

**AI Prompt 模板**：
```
实现 [功能名称]

参考文档：
1. 需求说明：shangwenjie.md 第 [行号范围] 行
2. 技术方案：TECHNICAL_MODIFICATION_PLAN.md 第 [行号范围] 行
3. 开发步骤：AI_DEVELOPMENT_GUIDE.md 第 [章节] 节

具体要求：
[列出具体要求]
```

**示例**：
```
实现听写页面的遮罩显示逻辑

参考文档：
1. 需求说明：shangwenjie.md 第 111-149 行（左栏交互：原文遮罩与播放）
2. 技术方案：TECHNICAL_MODIFICATION_PLAN.md 第 103-156 行（模块一：Step 2 听写核心逻辑）
3. 开发步骤：AI_DEVELOPMENT_GUIDE.md 第 3 节（开发步骤）

具体要求：
- 以"句"为单位遮罩
- PC 端：鼠标悬停显示原文
- 移动端：触摸显示原文
- 全局开关：禁用所有遮罩
- 参考 src/types/speaker.ts 中的类型定义
```

---

## 🚨 AI 开发的 10 大陷阱

### 1. **上下文过载导致幻觉**

**陷阱表现**:
```
User: "实现听写模块，需要支持分屏布局、遮罩文本、输入验证..."
AI: (因为没看到完整 PRD) 实现了单词级别的听写，而不是句子级别
```

**解决方案**:
- ✅ **每次任务只关注一个文件或一个功能点**
- ✅ **提供最小化的代码示例**（而非整个文件）
- ✅ **明确引用已存在的文档**（如 "参考 TECHNICAL_MODIFICATION_PLAN.md 第 3.1 节"）

**正确 Prompt**:
```
实现 SpeakerDictation.tsx 的遮罩逻辑部分：
- 输入：句子文本 "Hello world how are you"
- 输出：5 个单词的遮罩状态数组
- 参考：TECHNICAL_MODIFICATION_PLAN.md 第 103-115 行的逻辑

不要实现整个组件，只实现 parseSentenceToWords 函数
```

---

### 2. **修改了不该修改的文件**

**陷阱表现**:
```
User: "实现演说家听写功能"
AI: 直接修改了现有的 DictationQueue.tsx（破坏旧功能）
```

**解决方案**:
- ✅ **明确要求创建新文件**（"创建 src/components/speaker/SpeakerDictation.tsx"）
- ✅ **在 Prompt 中列出禁止修改的文件列表**
- ✅ **使用 "只读" 模式先探索代码结构**

**正确 Prompt**:
```
创建新文件 src/components/speaker/SpeakerDictation.tsx

⚠️ 禁止修改以下文件：
- src/components/learning-plan/DictationQueue.tsx（旧功能，保持不变）
- src/hooks/use-tts.ts（暂不修改）

新组件应该：
1. 接收 SpeakerArticle 类型参数
2. 实现句子级别的遮罩逻辑
3. 使用独立的 SpeakerDictationState 接口
```

---

### 3. **类型定义不一致**

**陷阱表现**:
```
AI 在文件 A 定义了: interface SpeakerArticle { ... }
AI 在文件 B 定义了: interface SpeakerArticle { ... } （字段不同！）
```

**解决方案**:
- ✅ **第一步：创建统一的类型定义文件** `src/types/speaker.ts`
- ✅ **所有组件都从这个文件导入类型**
- ✅ **在 Prompt 中明确要求 "从 @/types/speaker 导入类型"**

**类型定义文件结构**:
```typescript
// src/types/speaker.ts（第一步创建）
export interface SpeakerArticle {
  id: string
  level: number
  title: string
  sentences: SpeakerSentence[]
  // ... 完整定义
}

export interface SpeakerSentence {
  id: number
  text: string
  start_time: number | null
  end_time: number | null
}

export interface SpeakerDictationMask {
  wordId: string
  isMasked: boolean
  userInput: string
  isCorrect: boolean
}

// ✅ 之后所有组件都从这里导入
```

---

### 4. **假设依赖已存在**

**陷阱表现**:
```
AI: import { getSpeakerAudioUrl } from '@/lib/speaker-audio'
实际：这个文件还没创建！
```

**解决方案**:
- ✅ **先创建工具函数，再创建业务组件**
- ✅ **开发顺序：工具层 → API 层 → 组件层**
- ✅ **在 Prompt 中明确列出可用的依赖**

**正确开发顺序**:
```
第 1 步：创建 src/lib/speaker-audio.ts（工具函数）
第 2 步：创建 src/lib/speaker-progress.ts（数据访问）
第 3 步：创建 src/app/api/speaker/articles/route.ts（API）
第 4 步：创建 src/components/speaker/SpeakerCard.tsx（组件）
第 5 步：创建 src/app/speaker/page.tsx（页面）
```

---

### 5. **硬编码数据而非连接真实 API**

**陷阱表现**:
```
AI: const articles = [mockData1, mockData2]  // 硬编码
实际：应该从数据库查询
```

**解决方案**:
- ✅ **明确要求 "从 Supabase 查询数据"**
- ✅ **提供 Supabase 查询示例**
- ✅ **在创建组件之前，先创建 API 路由**

**正确 Prompt**:
```
创建 SpeakerCard 组件：

数据获取要求：
1. 从 /api/speaker/articles 获取文章列表
2. 使用 fetch 在 useEffect 中调用
3. 处理 loading 和 error 状态
4. ❌ 不要使用硬编码的 mock 数据

API 响应格式：
{
  articles: [
    { id: "123", level: 2, title: "BBC Article", ... }
  ]
}
```

---

### 6. **忽略了边界情况**

**陷阱表现**:
```
AI 实现了正常流程，但没处理：
- 音频文件不存在
- start_time/end_time 为 null
- 用户未登录
- 网络请求失败
```

**解决方案**:
- ✅ **在 Prompt 中明确列出需要处理的边界情况**
- ✅ **要求 AI "提供完整的错误处理逻辑"**
- ✅ **使用 TypeScript 可选链 `?.` 和空值合并 `??`**

**正确 Prompt**:
```
实现句子播放逻辑，需要处理以下边界情况：

边界情况：
1. start_time 或 end_time 为 null → 不播放，显示错误提示
2. 音频文件加载失败 → 降级到显示文本
3. 用户未登录 → 重定向到登录页
4. 网络请求超时 → 显示重试按钮

要求：
- 使用 try-catch 包裹所有异步操作
- 使用 toast 显示错误信息
- 提供 loading 状态
```

---

### 7. **代码风格不一致**

**陷阱表现**:
```
文件 A: const [isPlaying, setIsPlaying] = useState(false)
文件 B: const [playing, setPlaying] = useState(false)
文件 C: const [audioState, setAudioState] = useState({ playing: false })
```

**解决方案**:
- ✅ **提供代码风格指南**
- ✅ **要求 AI "参考现有文件的风格"**
- ✅ **使用 ESLint 强制统一**

**代码风格要求**:
```typescript
// 状态命名：使用 is/has 前缀
const [isPlaying, setIsPlaying] = useState(false)
const [hasError, setHasError] = useState(false)

// 函数命名：使用 handle 前缀（事件处理）
const handlePlayClick = () => { ... }
const handleSubmit = () => { ... }

// 布尔参数：使用明确的命名
function playAudio(audioUrl: string, enableLoop: boolean) { ... }

// ✅ 在 Prompt 中要求："遵循 src/components/learning-plan 的命名风格"
```

---

### 8. **过度工程化**

**陷阱表现**:
```
简单需求："显示文章列表"
AI 输出：实现了虚拟滚动、无限加载、缓存策略、乐观更新...
（用户只是想要一个简单的列表！）
```

**解决方案**:
- ✅ **明确要求 "先实现最小可用版本（MVP）"**
- ✅ **在 Prompt 中限制功能范围**
- ✅ **避免使用 "如果可能的话"、"考虑" 等模糊词汇**

**正确 Prompt**:
```
创建文章列表组件（MVP 版本）：

功能范围：
✅ 显示文章标题、难度等级、封面图
✅ 点击跳转到详情页
❌ 不需要虚拟滚动（文章数量 < 20）
❌ 不需要无限加载
❌ 不需要缓存

使用简单的 map 渲染数组即可
```

---

### 9. **遗漏环境变量配置**

**陷阱表现**:
```
AI: process.env.NEXT_PUBLIC_SPEAKER_AUDIO_URL
实际：.env.local 文件中没有这个变量！
```

**解决方案**:
- ✅ **第一步：创建 .env.example 文件**
- ✅ **在 Prompt 中明确要求 "检查环境变量是否存在"**
- ✅ **提供默认值作为降级方案**

**环境变量清单**:
```bash
# .env.example（创建项目第一步）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SPEAKER_AUDIO_URL=/audio/speaker  # 开发环境
# NEXT_PUBLIC_SPEAKER_AUDIO_URL=https://your-bucket.oss-cn-hongkong.aliyuncs.com/audio/speaker  # 生产环境

# ✅ 在代码中提供默认值
const audioUrl = getSpeakerAudioUrl(filename, level) ||
  '/audio/speaker/level' + level + '/' + filename
```

---

### 10. **没有考虑测试和调试**

**陷阱表现**:
```
AI 生成的代码：
- 没有 console.log（无法调试）
- 没有类型检查（any 类型）
- 没有 error boundary
```

**解决方案**:
- ✅ **要求 AI "在关键逻辑处添加调试日志"**
- ✅ **要求 AI "使用严格的类型定义，禁止使用 any"**
- ✅ **添加 Error Boundary 组件**

**调试友好代码**:
```typescript
export async function getSpeakerArticles() {
  console.log('[Speaker API] 开始获取文章列表')  // 🐝 调试日志

  try {
    const { data, error } = await supabase
      .from('speaker_articles')
      .select('*')

    if (error) {
      console.error('[Speaker API] 查询失败:', error)  // 🐝 错误日志
      throw error
    }

    console.log('[Speaker API] 成功获取', data.length, '篇文章')  // 🐝 成功日志
    return data
  } catch (error) {
    console.error('[Speaker API] 异常:', error)
    throw error
  }
}
```

---

## 🎯 演说家模块的特殊注意事项

### 1. **音频时间戳可能为 null**

**问题**: JSON 文件中的 `start_time` 和 `end_time` 都是 `null`

**AI 容易犯错**:
```typescript
// ❌ 错误：直接使用会报错
const startTime = sentence.start_time  // null!
audio.currentTime = startTime  // TypeError!

// ✅ 正确：提供默认值或降级方案
const startTime = sentence.start_time ?? 0
if (startTime === null) {
  console.warn('句子缺少时间戳，跳过播放')
  return
}
```

**Prompt 模板**:
```
实现句子播放逻辑时需要注意：
- start_time 和 end_time 可能为 null
- 如果为 null，显示提示："该句子尚未添加时间戳，无法播放"
- 不要假设所有句子都有时间戳
```

---

### 2. **遮罩逻辑的复杂状态管理**

**问题**: 每个单词有独立的状态（遮罩/显示/正确/错误）

**AI 容易犯错**:
```typescript
// ❌ 错误：使用简单的字符串，无法逐词控制
const [maskedWords, setMaskedWords] = useState('Hello,___,___,___')

// ✅ 正确：使用对象数组
const [wordMasks, setWordMasks] = useState<SpeakerDictationMask[]>([
  { wordId: '1', isMasked: true, userInput: '', isCorrect: false },
  { wordId: '2', isMasked: true, userInput: '', isCorrect: false },
  // ...
])
```

**Prompt 模板**:
```
实现遮罩逻辑时：
1. 使用 SpeakerDictationMask[] 类型（已在 src/types/speaker.ts 定义）
2. 每个单词的遮罩状态独立管理
3. 提供更新单个单词状态的函数：updateWordMask(wordId, updates)
4. 不要使用字符串拼接，使用数组操作
```

---

### 3. **KTV 滚动的性能问题**

**问题**: `timeupdate` 事件每秒触发多次，频繁更新 DOM

**AI 容易犯错**:
```typescript
// ❌ 错误：每次 timeupdate 都滚动，性能很差
audio.addEventListener('timeupdate', () => {
  containerRef.current.scrollTo({ top: newPosition, behavior: 'smooth' })
})

// ✅ 正确：只在句子切换时滚动
const [prevSentenceIndex, setPrevSentenceIndex] = useState(-1)
audio.addEventListener('timeupdate', () => {
  const currentIndex = findCurrentSentenceIndex(audio.currentTime)
  if (currentIndex !== prevSentenceIndex) {
    scrollToSentence(currentIndex)
    setPrevSentenceIndex(currentIndex)
  }
})
```

**Prompt 模板**:
```
实现 KTV 滚动时需要注意性能：
1. 只在句子切换时滚动，不要每次 timeupdate 都滚动
2. 使用 behavior: 'smooth' 实现平滑滚动
3. 添加节流（throttle），最多每 500ms 滚动一次
4. 使用 usePrevious Hook 检测句子索引变化
```

---

### 4. **数据库 Row Level Security (RLS)**

**问题**: Supabase 的 RLS 策略可能导致查询失败

**AI 容易犯错**:
```typescript
// ❌ 错误：没有检查 RLS 策略
const { data } = await supabase.from('speaker_progress').select('*')
// 可能返回空数组（权限问题）

// ✅ 正确：检查错误并提示用户
const { data, error } = await supabase.from('speaker_progress').select('*')
if (error) {
  console.error('权限检查失败:', error)
  if (error.code === '42501') {  // 权限不足
    toast.error('请先登录')
    router.push('/login')
  }
}
```

**Prompt 模板**:
```
连接 Supabase 时需要处理：
1. RLS 权限检查（用户未登录时会失败）
2. 返回空数组的处理（是权限问题还是真的没数据？）
3. 使用 supabase.auth.getUser() 检查登录状态
4. 错误码 42501 表示权限不足，提示用户登录
```

---

### 5. **移动端适配**

**问题**: PC 端鼠标悬停不适用于移动端

**AI 容易犯错**:
```typescript
// ❌ 错误：只实现了 PC 端交互
<div onMouseEnter={() => setMasked(false)}>
  {masked ? '___' : word}
</div>

// ✅ 正确：PC 端 + 移动端都支持
<div
  onMouseEnter={() => setMasked(false)}  // PC：鼠标悬停
  onTouchStart={() => setMasked(false)}  // 移动：触摸显示
  onTouchEnd={() => setMasked(true)}     // 移动：松手隐藏
>
  {masked ? '___' : word}
</div>
```

**Prompt 模板**:
```
实现遮罩交互时需要同时支持：
1. PC 端：onMouseEnter 显示原文，onMouseLeave 隐藏
2. 移动端：onTouchStart 显示原文，onTouchEnd 隐藏
3. 全局开关：可以禁用所有遮罩效果
4. 不要只实现 PC 端，会导致移动端无法使用
```

---

## 📋 开发步骤（防错版）

### 阶段 0：准备工作（必做）

#### Step 0.1 创建类型定义文件
```bash
# 创建文件：src/types/speaker.ts
# 用途：统一定义所有演说家相关的类型
# 验证：运行 npx tsc --noEmit 检查类型错误
```

**Prompt**:
```
创建 src/types/speaker.ts 文件，定义以下类型：

1. SpeakerArticle - 文章元数据
2. SpeakerSentence - 句子数据
3. SpeakerProgress - 学习进度
4. SpeakerDictationMask - 听写遮罩状态
5. SpeakerKTVState - KTV 播放状态

参考文档：
- shangwenjie.md（数据库表结构部分）
- TECHNICAL_MODIFICATION_PLAN.md（类型定义部分）

要求：
- 所有字段使用严格的类型（禁止使用 any）
- 可选字段使用 ? 标记
- 添加详细的 JSDoc 注释
```

**验证方法**:
```bash
# 检查类型定义是否有错误
npx tsc --noEmit

# 检查是否能正确导入
node -e "require('./src/types/speaker.ts')"
```

---

#### Step 0.2 创建环境变量配置
```bash
# 创建文件：.env.example
# 用途：列出所有需要的环境变量
```

**Prompt**:
```
创建 .env.example 文件，添加以下环境变量：

1. NEXT_PUBLIC_SPEAKER_AUDIO_URL - 音频文件基础 URL
2. NEXT_PUBLIC_SUPABASE_URL - Supabase URL
3. SUPABASE_SERVICE_ROLE_KEY - Supabase Service Key（仅服务端）

添加详细注释说明每个变量的用途和默认值
```

**验证方法**:
```bash
# 检查环境变量是否加载
node -e "console.log(process.env.NEXT_PUBLIC_SPEAKER_AUDIO_URL)"
```

---

### 阶段 1：工具层（无依赖，优先开发）

#### Step 1.1 创建音频工具函数
```bash
# 创建文件：src/lib/speaker-audio.ts
# 用途：生成音频 URL 和图片 URL
```

**Prompt**:
```
创建 src/lib/speaker-audio.ts 文件，实现以下函数：

1. getSpeakerAudioUrl(filename, level) -> string
   - 开发环境：返回 /audio/speaker/level{level}/{filename}
   - 生产环境：返回 {NEXT_PUBLIC_SPEAKER_AUDIO_URL}/level{level}/{filename}

2. getSpeakerImageUrl(filename, level) -> string
   - 如果 filename 为 null，返回占位图 /images/speaker-placeholder.jpg
   - 否则返回图片 URL

3. checkAudioFileExists(filename, level) -> Promise<boolean>
   - 使用 fetch HEAD 请求检查文件是否存在
   - 返回 true/false

要求：
- 完整的错误处理
- 添加 console.log 调试日志
- 导出所有函数供其他模块使用
```

**验证方法**:
```typescript
// 创建测试文件：src/lib/__tests__/speaker-audio.test.ts
import { getSpeakerAudioUrl } from '../speaker-audio'

console.log(getSpeakerAudioUrl('test.mp3', 2))
// 预期输出：/audio/speaker/level2/test.mp3
```

---

#### Step 1.2 创建数据访问层
```bash
# 创建文件：src/lib/speaker-data.ts
# 用途：封装所有 Supabase 查询
```

**Prompt**:
```
创建 src/lib/speaker-data.ts 文件，实现以下函数：

1. getSpeakerArticles(supabase, level?) -> Promise<SpeakerArticle[]>
   - 查询 speaker_articles 表
   - 可选按 level 过滤
   - 只返回 status='active' 的文章

2. getSpeakerArticleById(supabase, id) -> Promise<SpeakerArticle | null>
   - 查询单篇文章详情
   - 同时查询 sentences（使用 select('*, sentences(*)')）

3. getSpeakerProgress(supabase, userId, articleId) -> Promise<SpeakerProgress | null>
   - 查询用户学习进度
   - 处理 RLS 权限问题

4. updateSpeakerProgress(supabase, progress) -> Promise<void>
   - 更新学习进度
   - 使用 upsert（插入或更新）

要求：
- 所有函数都是 async
- 完整的错误处理（try-catch）
- 添加 console.log 调试日志
- 检查 RLS 权限（error.code === '42501'）
```

**验证方法**:
```typescript
// 在开发环境手动测试
import { getSpeakerArticles } from '@/lib/speaker-data'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)
const articles = await getSpeakerArticles(supabase)
console.log('文章数量:', articles.length)
```

---

### 阶段 2：API 层（使用工具层）

#### Step 2.1 创建文章列表 API
```bash
# 创建文件：src/app/api/speaker/articles/route.ts
# 用途：GET /api/speaker/articles 返回文章列表
```

**Prompt**:
```
创建 src/app/api/speaker/articles/route.ts 文件，实现 GET 接口：

功能：
1. 从查询参数获取 level（可选）
2. 调用 getSpeakerArticles(supabase, level)
3. 返回 JSON 响应：{ articles: SpeakerArticle[] }

错误处理：
1. 捕获异常并返回 { error: string }
2. 使用适当的 HTTP 状态码（400/401/500）

验证：
1. 检查用户登录状态（可选，根据需求）
2. 验证 level 参数（必须是 2 或 3）

要求：
- 使用 Next.js App Router 的 Response 对象
- 设置正确的 Content-Type: application/json
- 添加 CORS 头（如果需要）
```

**验证方法**:
```bash
# 启动开发服务器
npm run dev

# 手动测试 API
curl http://localhost:3000/api/speaker/articles
curl http://localhost:3000/api/speaker/articles?level=2
```

---

#### Step 2.2 创建文章详情 API
```bash
# 创建文件：src/app/api/speaker/articles/[id]/route.ts
# 用途：GET /api/speaker/articles/:id 返回文章详情
```

**Prompt**:
```
创建 src/app/api/speaker/articles/[id]/route.ts 文件，实现 GET 接口：

功能：
1. 从 URL 参数获取文章 id
2. 调用 getSpeakerArticleById(supabase, id)
3. 返回 JSON 响应：{ article: SpeakerArticle | null }

错误处理：
1. 文章不存在：返回 404
2. ID 格式错误：返回 400

要求：
- 使用 params.id 获取路由参数
- 完整的错误处理
- 添加 console.log 调试日志
```

**验证方法**:
```bash
curl http://localhost:3000/api/speaker/articles/123
curl http://localhost:3000/api/speaker/articles/invalid-id
```

---

### 阶段 3：组件层（使用 API 层）

#### Step 3.1 创建文章卡片组件
```bash
# 创建文件：src/components/speaker/SpeakerCard.tsx
# 用途：显示单篇文章的卡片
```

**Prompt**:
```
创建 src/components/speaker/SpeakerCard.tsx 组件：

功能：
1. 接收 SpeakerArticle 作为 props
2. 显示文章封面图（使用 getSpeakerImageUrl）
3. 显示标题、难度等级
4. 点击跳转到详情页（href=/speaker/steps/step1?id={article.id}）

样式：
1. 使用 Tailwind CSS
2. hover 效果：阴影加深
3. 响应式：移动端全宽，PC 端固定宽度

边界情况：
1. 封面图加载失败：显示占位图
2. title 为空：显示 "未命名文章"
3. level 不是 2 或 3：显示 "未知难度"

要求：
- 使用 'use client' 指令（客户端组件）
- 从 @/types/speaker 导入类型
- 参考 src/components/BookCard.tsx 的风格
```

**验证方法**:
```typescript
// 在其他组件中测试
import { SpeakerCard } from '@/components/speaker/SpeakerCard'

<SpeakerCard article={{
  id: '123',
  level: 2,
  title: 'Test Article',
  // ... 其他字段
}} />
```

---

#### Step 3.2 创建文章列表页面
```bash
# 创建文件：src/app/speaker/page.tsx
# 用途：演说家主页，显示所有文章
```

**Prompt**:
```
创建 src/app/speaker/page.tsx 页面：

功能：
1. 从 /api/speaker/articles 获取文章列表
2. 渲染 SpeakerCard 组件列表
3. 使用 grid 布局（移动端 1 列，PC 端 3 列）
4. 添加过滤按钮（全部 / Level 2 / Level 3）

状态管理：
1. articles - 文章列表
2. loading - 加载状态
3. error - 错误信息
4. filter - 当前过滤器（all | 2 | 3）

生命周期：
1. useEffect 中调用 API
2. 依赖 filter 变化时重新获取

要求：
- 可以是服务端组件或客户端组件
- 如果是服务端组件，使用 async/await
- 添加骨架屏（loading 状态）
- 添加重试按钮（error 状态）
```

**验证方法**:
```bash
# 访问页面
http://localhost:3000/speaker

# 检查：
1. 是否显示文章列表
2. 点击过滤器是否正常工作
3. loading 和 error 状态是否正确显示
```

---

### 阶段 4：复杂功能（分步实现）

#### Step 4.1 实现盲听页面（Step 1）
```bash
# 创建文件：src/app/speaker/steps/step1/page.tsx
# 复杂度：⭐⭐
```

**分步实现**:

**第 1 步：实现音频播放器**
```bash
创建 src/components/speaker/AudioPlayer.tsx

功能：
1. 接收 audioUrl 作为 props
2. 播放/暂停按钮
3. 进度条显示
4. 时间显示（当前时间 / 总时长）
```

**第 2 步：实现盲听页面**
```bash
创建 src/app/speaker/steps/step1/page.tsx

功能：
1. 从 URL 参数获取文章 id
2. 调用 API 获取文章详情
3. 显示完整音频播放器
4. 显示文章标题和难度等级
5. "下一题"按钮跳转到 Step 2
```

**Prompt 模板**:
```
实现盲听页面（Step 1），分两步完成：

第 1 步：创建 AudioPlayer 组件
- 使用 HTML5 <audio> 元素
- useRef 控制 play/pause
- 监听 timeupdate 事件更新进度条

第 2 步：创建 Step 1 页面
- 从 URL 获取 id：useSearchParams()
- 获取文章数据：fetch('/api/speaker/articles/' + id)
- 渲染 AudioPlayer 和文章信息
- "下一题"按钮：<Link href="/speaker/steps/step2?id={id}>

边界情况：
1. 文章不存在：显示 404
2. 音频加载失败：显示错误提示
3. 用户未登录：重定向到 /login

要求：
- 先实现 AudioPlayer 组件并测试
- 再实现 Step 1 页面
- 每完成一步就验证功能
```

---

#### Step 4.2 实现听写页面（Step 2）
```bash
# 创建文件：src/app/speaker/steps/step2/page.tsx
# 复杂度：⭐⭐⭐⭐⭐（最高）
```

**分步实现**（关键！）:

**第 1 步：实现句子解析函数**
```bash
创建 src/lib/speaker-utils.ts

功能：
parseSentenceToWords(text: string) -> string[]
- 将句子拆分成单词数组
- 处理标点符号："Hello, world!" -> ["Hello", "world"]
- 处理缩写：暂时不支持，显示提示

验证：
parseSentenceToWords("Hello, world!") -> ["Hello", "world"]
```

**第 2 步：实现遮罩状态管理**
```bash
创建 src/hooks/useSpeakerDictation.ts

功能：
useSpeakerDictation(sentence: string) -> {
  wordMasks: SpeakerDictationMask[]
  updateWordInput: (wordId, value) => void
  submitSentence: () => Promise<boolean>
  globalMaskToggle: boolean
  setGlobalMaskToggle: (toggle) => void
}

逻辑：
1. 初始化：调用 parseSentenceToWords，创建遮罩数组
2. 更新输入：找到对应 wordId，更新 userInput
3. 提交验证：逐词比对，设置 isCorrect
```

**第 3 步：实现遮罩显示组件**
```bash
创建 src/components/speaker/SentenceMaskDisplay.tsx

功能：
1. 接收 wordMasks 数组
2. 渲染单词 span（遮罩或显示原文）
3. PC 端：onMouseEnter 显示原文
4. 移动端：onTouchStart 显示原文
5. 全局开关：禁用所有遮罩

样式：
- 遮罩单词：显示 "___" 或灰色背景
- 当前单词：高亮边框
- 正确单词：绿色
- 错误单词：红色
```

**第 4 步：实现输入框组件**
```bash
创建 src/components/speaker/SentenceInput.tsx

功能：
1. 接收 wordMasks 和更新函数
2. 为每个单词渲染独立的输入框
3. 提交后显示正确/错误状态

布局：
- 使用 flex 横向排列
- 输入框宽度自适应
- 间距：gap-2
```

**第 5 步：实现听写页面**
```bash
创建 src/app/speaker/steps/step2/page.tsx

功能：
1. 获取文章数据
2. 选择当前句子（currentIndex state）
3. 集成 SentenceMaskDisplay 和 SentenceInput
4. 添加 "播放整句" 和 "循环播放" 按钮
5. 添加 "下一句" 和 "提交" 按钮
6. 提交后保存到数据库

逻辑：
1. 切换句子时：重新初始化 wordMasks
2. 提交时：调用 saveDictationHistory API
3. 最后一句完成后：跳转到 Step 3
```

**Prompt 模板**（超详细）:
```
实现听写页面（Step 2），这是最复杂的模块，请分 5 步完成：

⚠️ 重要：每完成一步，先测试通过后再进行下一步！

====================================
第 1 步：句子解析工具函数
====================================
创建 src/lib/speaker-utils.ts

实现 parseSentenceToWords(text: string) -> string[]

逻辑：
1. 按空格拆分字符串
2. 移除标点符号（,!?.）
3. 过滤空字符串
4. 返回单词数组

测试：
parseSentenceToWords("Hello, world!") -> ["Hello", "world"]
parseSentenceToWords("How are you?") -> ["How", "are", "you"]

====================================
第 2 步：遮罩状态管理 Hook
====================================
创建 src/hooks/useSpeakerDictation.ts

实现 useSpeakerDictation(sentence: string)

返回值：
{
  wordMasks: SpeakerDictationMask[]
  updateWordInput: (wordId: string, value: string) => void
  submitSentence: () => Promise<void>
  globalMaskToggle: boolean
  setGlobalMaskToggle: (toggle: boolean) => void
}

逻辑：
1. useEffect 初始化：
   - 调用 parseSentenceToWords(sentence.text)
   - 创建 SpeakerDictationMask[] 数组
   - 每个 mask 包含：wordId, isMasked, userInput, isCorrect

2. updateWordInput 函数：
   - 找到对应 wordId 的 mask
   - 更新 userInput 字段

3. submitSentence 函数：
   - 逐词比对 user input vs correct word
   - 设置 isCorrect 字段
   - 全部设置为 isMasked: false（显示原文）
   - 调用 saveDictationHistory API

====================================
第 3 步：遮罩显示组件
====================================
创建 src/components/speaker/SentenceMaskDisplay.tsx

Props：
- wordMasks: SpeakerDictationMask[]
- globalMaskToggle: boolean
- onWordHover?: (wordId: string) => void

功能：
1. 渲染单词 span 数组
2. 根据 isMasked 决定显示 "___" 还是原文
3. 根据 isCorrect 添加绿色/红色样式
4. onMouseEnter 时调用 onWordHover
5. 全局 toggle 关闭时：强制显示所有单词

样式：
- 遮罩单词：bg-gray-200 text-gray-200
- 正确单词：text-green-600
- 错误单词：text-red-600
- 当前单词：border-b-2 border-blue-500

====================================
第 4 步：输入框组件
====================================
创建 src/components/speaker/SentenceInput.tsx

Props：
- wordMasks: SpeakerDictingMask[]
- onInputChange: (wordId: string, value: string) => void
- disabled: boolean

功能：
1. 为每个 wordMask 渲染一个 input
2. value 绑定到 mask.userInput
3. onChange 调用 onInputChange
4. 根据 isCorrect 添加绿色/红色边框
5. disabled=true 时：禁用所有输入框

布局：
- 使用 flex flex-wrap gap-2
- 输入框 min-w-[80px]

====================================
第 5 步：听写页面集成
====================================
创建 src/app/speaker/steps/step2/page.tsx

功能：
1. 获取文章和句子列表
2. currentIndex state：当前句子索引
3. 调用 useSpeakerDictation(currentSentence.text)
4. 集成 AudioPlayer、SentenceMaskDisplay、SentenceInput
5. "下一句"按钮：currentIndex + 1
6. "提交"按钮：调用 submitSentence
7. 提交后：显示正确/错误反馈
8. 最后一句完成：跳转到 Step 3

音频控制：
- "播放整句"：playSentenceAudio(currentSentence, null, null)
- "循环播放"：playSentenceAudio(currentSentence, startTime, endTime, { loop: true })

⚠️ 边界情况：
1. start_time/end_time 为 null：显示 "该句子暂不支持播放"
2. 音频加载失败：显示错误提示
3. 提交失败：显示 toast 错误信息
4. 用户未登录：重定向到 /login

====================================
开发顺序：
1. 先实现第 1 步（工具函数）并测试
2. 再实现第 2 步（Hook）并测试
3. 再实现第 3 步（显示组件）并测试
4. 再实现第 4 步（输入组件）并测试
5. 最后实现第 5 步（页面集成）

每完成一步，请告诉我 "第 X 步已完成，请测试"
```

---

## ✅ AI 工作验证清单

### 验证 1：类型检查
```bash
# 必须通过 TypeScript 类型检查
npx tsc --noEmit

# 不能有任何错误
# ✅ 通过：0 errors
# ❌ 失败：显示错误列表
```

### 验证 2：代码风格检查
```bash
# 必须通过 ESLint 检查
npm run lint

# 不能有任何错误
# ✅ 通过：0 problems
# ❌ 失败：显示错误列表
```

### 验证 3：手动功能测试
```bash
# 启动开发服务器
npm run dev

# 测试清单：
□ 访问 /speaker 页面，是否显示文章列表？
□ 点击过滤器，是否正确过滤？
□ 点击文章卡片，是否跳转到 Step 1？
□ Step 1 音频是否正常播放？
□ Step 2 遮罩是否正确显示？
□ Step 2 输入框是否正常输入？
□ Step 2 提交后是否显示正确/错误？
□ 移动端：触摸遮罩单词是否显示原文？
□ 移动端：布局是否正确（上文本下输入）？
□ 控制台是否有错误信息？
```

### 验证 4：API 测试
```bash
# 测试所有 API 端点
curl http://localhost:3000/api/speaker/articles
curl http://localhost:3000/api/speaker/articles?level=2
curl http://localhost:3000/api/speaker/articles/{id}

# 验证：
□ 返回状态码 200
□ 返回 JSON 格式
□ 数据结构正确
```

### 验证 5：数据库测试
```bash
# 使用 Supabase Dashboard 检查
□ speaker_articles 表是否有数据？
□ speaker_sentences 表是否有数据？
□ 查询性能是否正常（< 100ms）？
□ RLS 策略是否正确配置？
```

---

## 📝 Prompt 最佳实践

### 1. 明确的输入输出

❌ **不好的 Prompt**:
```
实现听写功能
```

✅ **好的 Prompt**:
```
实现听写功能（Step 2）

输入：
- SpeakerArticle 对象（包含句子列表）
- 当前句子索引

输出：
- React 组件，渲染遮罩文本和输入框
- 用户输入验证逻辑
- 提交到 API 的函数

参考：
- TECHNICAL_MODIFICATION_PLAN.md 第 103-156 行
- shangwenjie.md 第 45-78 行（Step 2 需求）
```

---

### 2. 列出禁止做的事

❌ **不好的 Prompt**:
```
创建文章列表页面
```

✅ **好的 Prompt**:
```
创建文章列表页面

✅ 允许：
- 从 /api/speaker/articles 获取数据
- 使用 grid 布局渲染卡片
- 添加 loading 和 error 状态

❌ 禁止：
- 修改 src/components/learning-plan/*（旧功能）
- 使用硬编码的 mock 数据
- 实现虚拟滚动（文章数量 < 20）

参考：
- src/app/learning-plan/page.tsx（旧版风格参考）
- TECHNICAL_MODIFICATION_PLAN.md 第 23-45 行
```

---

### 3. 提供代码示例

❌ **不好的 Prompt**:
```
实现音频播放逻辑，支持句子级别裁剪
```

✅ **好的 Prompt**:
```
实现音频播放逻辑，支持句子级别裁剪

参考代码（当前系统的单词播放）：
\`\`\`typescript
const playAudio = async (text: string) => {
  const audio = new Audio(fallbackAudioUrl)
  audio.play()
}
\`\`\`

需要扩展为：
\`\`\`typescript
const playSentenceAudio = async (
  audioUrl: string,
  startTime: number,
  endTime: number
) => {
  const audio = new Audio(audioUrl)
  audio.currentTime = startTime
  audio.play()

  audio.addEventListener('timeupdate', () => {
    if (audio.currentTime >= endTime) {
      audio.pause()
    }
  })
}
\`\`\`

要求：
- 保持原有函数名和接口不变
- 添加可选参数 startTime/endTime
- 向后兼容：旧调用方式仍然有效
```

---

### 4. 分步验证

❌ **不好的 Prompt**:
```
实现完整的听写模块（包括遮罩、输入、验证、提交）
```

✅ **好的 Prompt**:
```
实现完整的听写模块，分 4 步完成：

⚠️ 每完成一步，先测试通过后再进行下一步！

第 1 步：实现句子解析函数
- 文件：src/lib/speaker-utils.ts
- 函数：parseSentenceToWords(text: string) -> string[]
- 测试：parseSentenceToWords("Hello, world!") -> ["Hello", "world"]

第 2 步：实现遮罩状态管理
- 文件：src/hooks/useSpeakerDictation.ts
- 功能：管理 wordMasks 数组状态
- 测试：初始化 5 个单词的遮罩状态

第 3 步：实现遮罩显示组件
- 文件：src/components/speaker/SentenceMaskDisplay.tsx
- 功能：渲染遮罩文本，支持鼠标悬停
- 测试：hover 时显示原文

第 4 步：实现听写页面集成
- 文件：src/app/speaker/steps/step2/page.tsx
- 功能：集成上述组件和 Hook
- 测试：完整的听写流程

每完成一步，输出 "✅ 第 X 步已完成" 并等待我的验证
```

---

## 🎯 总结：AI 防错开发流程

```
┌─────────────────────────────────────────────────────┐
│  阶段 0：准备                                          │
├─────────────────────────────────────────────────────┤
│  ✅ 创建类型定义文件（src/types/speaker.ts）          │
│  ✅ 创建环境变量配置（.env.example）                  │
│  ✅ 验证：npx tsc --noEmit                            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  阶段 1：工具层（无依赖，优先开发）                      │
├─────────────────────────────────────────────────────┤
│  ✅ 音频工具（src/lib/speaker-audio.ts）             │
│  ✅ 数据访问层（src/lib/speaker-data.ts）            │
│  ✅ 验证：手动调用函数，测试返回值                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  阶段 2：API 层（使用工具层）                          │
├─────────────────────────────────────────────────────┤
│  ✅ 文章列表 API（/api/speaker/articles）            │
│  ✅ 文章详情 API（/api/speaker/articles/[id]）       │
│  ✅ 验证：curl 测试所有端点                           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  阶段 3：组件层（使用 API 层）                         │
├─────────────────────────────────────────────────────┤
│  ✅ 文章卡片                                        │
│  ✅ 文章列表页面（/speaker）                         │
│  ✅ 验证：浏览器访问，检查渲染和交互                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  阶段 4：复杂功能（分步实现）                          │
├─────────────────────────────────────────────────────┤
│  ✅ Step 1：盲听（简单）                              │
│  ✅ Step 2：听写（复杂，分 5 步）⭐⭐⭐⭐⭐            │
│  ✅ Step 3：跟读（中等）                              │
│  ✅ Step 4：KTV（复杂，分 3 步）⭐⭐⭐⭐              │
│  ✅ 验证：完整的用户流程测试                           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  最终验证                                             │
├─────────────────────────────────────────────────────┤
│  ✅ 类型检查：npx tsc --noEmit                        │
│  ✅ 代码风格：npm run lint                           │
│  ✅ 手动测试：完整的用户流程                           │
│  ✅ API 测试：所有端点                                │
│  ✅ 数据库测试：RLS 策略、查询性能                     │
└─────────────────────────────────────────────────────┘
```

**核心原则**:
1. ✅ **小步快跑**：每个任务 < 100 行代码
2. ✅ **频繁验证**：每完成一步就测试
3. ✅ **明确边界**：列出允许和禁止的操作
4. ✅ **提供示例**：参考现有代码风格
5. ✅ **分阶段开发**：工具 → API → 组件 → 复杂功能

遵循这个流程，AI 出错的概率可以降低到 **< 5%**！
