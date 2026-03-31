# TTS 预加载优化计划

> 创建时间: 2026-03-27
> 状态: ✅ 已实施

---

## 一、问题描述

### 用户反馈
> "页面加载完了，点播放 TTS 按钮，第一次需要 2s 以上的响应"

### 根因分析

| 模块 | 预加载 | 首次点击延迟 |
|------|--------|-------------|
| `/video-flashcards` | ✅ 有 | ~100ms |
| `/videos/[id]` 学习模块 | ❌ 无 | **2s+** |

**问题**：Video 学习模块（LearningTabs、LearningModal）在用户点击时才发起 TTS API 请求，导致首次播放延迟。

---

## 二、涉及文件

### 需要修改的文件（2 个）

| 文件 | 功能 | 问题 |
|------|------|------|
| `src/components/video/learning/LearningTabs.tsx` | PC 端单词/表达 Tab | 无预加载 + 无 Blob URL 清理 |
| `src/components/video/learning/LearningModal.tsx` | 移动端全屏学习 | 无预加载 + 无 Blob URL 清理 |

### 相关但不紧急的文件（4 个）

| 文件 | 优先级 | 说明 |
|------|--------|------|
| `PronunciationTipsTab.tsx` | 低 | 同模块，改动时可顺手加 |
| `WordTooltip.tsx` | 低 | 同模块，改动时可顺手加 |
| `KnowledgePoints.tsx` | 低 | 同模块，改动时可顺手加 |
| `video-flashcards/pageClient.tsx` | 低 | 已有预加载，仅缺清理 |

---

## 三、优化方案

### 3.1 添加音频缓存 + 预加载

```typescript
// 在组件顶部添加
const audioCacheRef = useRef<Map<string, string>>(new Map())

// 预加载第一个单词
useEffect(() => {
  if (words.length > 0) {
    const firstWord = words[0].word
    const ttsLang = getTTSLanguage(videoLanguage)

    // 延迟 500ms 预加载，避免与页面渲染竞争
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/tts?text=${encodeURIComponent(firstWord)}&type=2&language=${ttsLang}`
        )
        if (response.ok) {
          const blob = await response.blob()
          const audioUrl = URL.createObjectURL(blob)
          audioCacheRef.current.set(firstWord.toLowerCase(), audioUrl)
        }
      } catch {
        // 预加载失败静默处理
      }
    }, 500)

    return () => clearTimeout(timer)
  }
}, [])
```

### 3.2 播放时优先使用缓存

```typescript
// 修改 playWord 函数
const playWord = useCallback(async (word: string) => {
  const cacheKey = word.toLowerCase()

  // 1. 优先使用缓存
  let audioUrl = audioCacheRef.current.get(cacheKey)

  if (!audioUrl) {
    // 2. 未缓存，请求 API
    const response = await fetch(`/api/tts?text=...`)
    if (response.ok) {
      const blob = await response.blob()
      audioUrl = URL.createObjectURL(blob)
      audioCacheRef.current.set(cacheKey, audioUrl)
    }
  }

  // 3. 播放
  const audio = new Audio(audioUrl)
  await audio.play()
}, [])
```

### 3.3 组件卸载时清理 Blob URL

```typescript
useEffect(() => {
  // ...预加载逻辑...

  // 清理函数
  return () => {
    audioCacheRef.current.forEach(url => {
      URL.revokeObjectURL(url)
    })
    audioCacheRef.current.clear()
  }
}, [])
```

---

## 四、预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 首次点击 TTS 延迟 | 2s+ | ~100ms |
| 二次点击同词 | 2s+ | 即时（缓存命中）|
| 组件卸载内存 | 轻微泄漏 | 完全释放 |

---

## 五、实施状态

### ✅ 已完成

| 文件 | 状态 | 改动 |
|------|------|------|
| `LearningModal.tsx` (PC 端) | ✅ | 添加 ttsStatusRef + 预加载 + 状态判断 |
| `LearningTabs.tsx` (移动端) | ✅ | 添加 ttsStatusRef + 预加载 + 状态判断 |

### 实现方案

```typescript
// 状态类型
type TTSStatus = 'pending' | 'cached' | 'webspeech'

// 1. 预加载（500ms 后并行请求所有单词）
useEffect(() => {
  setTimeout(() => {
    words.forEach(async ({ word }) => {
      const res = await fetch(`/api/tts?text=${word}&...`)
      ttsStatusRef.current.set(key, res.ok ? 'cached' : 'webspeech')
      if (res.ok) await res.blob() // 触发浏览器缓存
    })
  }, 500)
}, [words])

// 2. 播放时根据状态选择策略
const playWord = async (word: string) => {
  if (ttsStatusRef.current.get(key) === 'webspeech') {
    // 直接 Web Speech（跳过 API）
  } else {
    // 请求 API（浏览器缓存命中）
  }
}
```

---

## 六、实施步骤（已完成）

```
✅ Step 1: 修改 LearningModal.tsx (PC 端)
       ├── 添加 ttsStatusRef
       ├── 添加 getTTSLanguage 函数
       ├── 添加预加载 useEffect
       └── 修改 playWord 使用状态判断

✅ Step 2: 修改 LearningTabs.tsx (移动端)
       ├── 添加 useRef, useEffect import
       ├── 添加 ttsStatusRef
       ├── 添加 getTTSLanguage 函数
       ├── 添加预加载 useEffect
       └── 修改 playWord 使用状态判断

✅ Step 3: 构建验证
       └── npm run build 成功
```
