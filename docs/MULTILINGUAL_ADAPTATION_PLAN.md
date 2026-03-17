# 多语言适配实施方案

> **版本**: v1.0
> **日期**: 2026-03-12
> **作者**: Architecture Team
> **状态**: 待实施

---

## 一、项目背景

### 1.1 目标

将现有英语单词本系统扩展为多语言平台，支持：
- **日语** (Japanese)
- **法语** (French) - 优先级
- **德语** (German)
- **西班牙语** (Spanish)
- **意大利语** (Italian)
- **俄语** (Russian)

### 1.2 核心约束

| 约束 | 说明 |
|-----|------|
| **零影响存量用户** | 所有购买英语单词书的用户，功能不受任何影响 |
| **最小侵入修改** | 不重构现有架构，只做必要的扩展 |
| **向后兼容** | 新字段可选，旧字段保留，逻辑回退 |

---

## 二、现状分析

### 2.1 已完成的工作

| 模块 | 文件 | 状态 | 说明 |
|-----|------|------|------|
| 权威类型定义 | `src/types/word.ts` | ✅ 已完成 | 支持 6 种语言的类型定义 |
| Service 层 | `src/services/word.ts` | ✅ 已完成 | 查询已包含 `language_data` |
| Service 层 | `src/services/wordbook.ts` | ✅ 已完成 | 单词本服务 |
| 数据库 | `words.language_data` | ✅ 已存在 | JSONB 字段，存储多语言数据 |

### 2.2 类型定义结构

```typescript
// src/types/word.ts 中的多语言类型

/** 法语单词数据 */
interface FrenchWordData {
  gender?: 'm' | 'f' | 'm/f' | 'n'  // 性别
  plural?: string                    // 复数形式
  conjugation?: Conjugation          // 动词变位
  feminine_form?: string             // 形容词阴性形式
}

/** 德语单词数据 */
interface GermanWordData {
  gender?: 'm' | 'f' | 'n'
  plural?: string
  cases?: { /* 格变化 */ }
}

/** 日语单词数据 */
interface JapaneseWordData {
  kana?: string           // 假名
  romaji?: string         // 罗马音
  pitch_accent?: string   // 音调
}

// ... 其他语言类似

/** 统一的语种数据结构 */
interface LanguageData {
  fr?: FrenchWordData
  de?: GermanWordData
  ja?: JapaneseWordData
  es?: SpanishWordData
  it?: ItalianWordData
  ru?: RussianWordData
}
```

### 2.3 待修改的位置

共发现 **21 处** 重复定义 Word 接口的位置：

#### P0 - 核心组件（3 个）

| 文件 | 模块 | 风险 |
|-----|------|------|
| `src/components/WordList.tsx` | 单词列表 | 低 |
| `src/components/VocabularyCard.tsx` | 单词卡片 | 低 |
| `src/components/WordCard.tsx` | 单词卡片（旧） | 低 |

#### P1 - 学习模块（8 个）

| 文件 | 模块 | 风险 |
|-----|------|------|
| `src/components/learning-plan/FlashcardQueue.tsx` | 学习计划-闪卡 | 中 |
| `src/components/learning-plan/DictationQueue.tsx` | 学习计划-听写 | 中 |
| `src/app/study/[bookId]/flashcards/pageClient.tsx` | 闪卡练习 | 中 |
| `src/app/study/[bookId]/dictation/pageClient.tsx` | 听写练习 | 中 |
| `src/app/study/[bookId]/match-game/pageClient.tsx` | 连连看 | 中 |
| `src/app/study/[bookId]/typing/practice/pageClient.tsx` | 打字练习 | 中 |
| `src/app/practice/types.ts` | 练习模式类型 | 低 |
| `src/app/learning-plan/learning-flow/pageClient.tsx` | 学习流程 | 中 |

#### P2 - 基础设施（10 个）

| 文件 | 模块 | 风险 |
|-----|------|------|
| `src/stores/typingStore.ts` | 打字 Store | 中 |
| `src/hooks/useWordData.ts` | Word Hook | 低 |
| `src/lib/words-server.ts` | 服务端工具 | 低 |
| `src/lib/learning-plan-strategies.ts` | 学习策略 | 低 |
| `src/components/WordTableEditor.tsx` | 表格编辑器 | 中 |
| `src/components/cards/WordCard.tsx` | 卡片组件 | 低 |
| `src/app/admin/word-books/[bookId]/words/page.tsx` | 管理后台 | 低 |
| `src/app/admin/word-books/[bookId]/words/[wordId]/edit/page.tsx` | 后台编辑 | 低 |

---

## 三、修改规范

### 3.1 类型扩展规范

```typescript
// ❌ 错误：删除旧字段
interface Word {
  language_data: LanguageData  // 必填，存量数据崩溃！
}

// ✅ 正确：可选扩展
interface Word {
  // 保留所有旧字段
  phonetic?: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en?: string
  // ...

  // 新增字段（全部可选）
  language_data?: LanguageData
}
```

### 3.2 显示逻辑规范 - 回退模式

```typescript
// ❌ 错误：直接使用新字段
const display = word.language_data.ja.kana  // 存量数据会崩溃！

// ✅ 正确：回退模式（Fallback Pattern）
const getPhoneticDisplay = (word: Word) => {
  // 优先新字段，回退旧字段
  const ja = word.language_data?.ja
  const fr = word.language_data?.fr

  // 日语：假名 + 罗马音
  if (ja?.kana) {
    return `${ja.kana}${ja.romaji ? ' / ' + ja.romaji : ''}`
  }

  // 存量英语数据走这里
  return word.us_phonetic || word.uk_phonetic || word.phonetic
}
```

### 3.3 各语言显示规则

| 语言 | 发音显示 | 特殊显示 | 示例 |
|-----|---------|---------|------|
| 英语 | `phonetic` / `uk_phonetic` / `us_phonetic` | 无 | `/həˈləʊ/` |
| 日语 | `kana` + `romaji` | 无 | `こんにちは / konnichiwa` |
| 法语 | `phonetic` | 词性 + 阴阳性 | `n. (m)` |
| 德语 | `phonetic` | 词性 + 格变化 | `m` |
| 西班牙语 | `phonetic` | 词性 | `m/f` |
| 意大利语 | `phonetic` | 词性 | `m/f` |
| 俄语 | `phonetic` | 词性 + 格变化 | `m/f/n` |

---

## 四、法语适配详细设计

### 4.1 法语特有字段

```typescript
interface FrenchWordData {
  gender?: 'm' | 'f' | 'm/f' | 'n'  // 性别（阳性/阴性）
  plural?: string                    // 复数形式
  conjugation?: Conjugation          // 动词变位（完整时态）
  feminine_form?: string             // 形容词阴性形式
}
```

### 4.2 法语显示逻辑

```typescript
/**
 * 获取法语词性显示（含阴阳性）
 */
const getFrenchPosDisplay = (word: Word): string => {
  const fr = word.language_data?.fr
  const pos = word.part_of_speech

  if (fr?.gender) {
    return `${pos} (${fr.gender})`  // n. (m) 或 n. (f)
  }

  return pos
}

/**
 * 获取法语单词完整显示
 */
const getFrenchWordDisplay = (word: Word): string => {
  const fr = word.language_data?.fr
  let display = word.word

  // 名词：显示阴阳性
  if (fr?.gender) {
    const article = fr.gender === 'm' ? 'le ' : 'la '
    display = article + display
  }

  // 形容词：显示阴性形式
  if (fr?.feminine_form) {
    display += ` / ${fr.feminine_form}`
  }

  return display
}
```

### 4.3 法语动词变位结构

```typescript
interface Conjugation {
  // 不定式和分词
  infinitif?: string
  participe_passe?: string    // 过去分词
  participe_present?: string  // 现在分词

  // 直陈式 (Indicatif)
  indicatif_present?: FrenchPersons
  indicatif_imparfait?: FrenchPersons
  indicatif_passe_simple?: FrenchPersons
  indicatif_futur_simple?: FrenchPersons
  indicatif_passe_compose?: FrenchPersons

  // 条件式 (Conditionnel)
  conditionnel_present?: FrenchPersons

  // 虚拟式 (Subjonctif)
  subjonctif_present?: FrenchPersons
  subjonctif_imparfait?: FrenchPersons

  // 命令式 (Impératif)
  imperatif_present?: {
    tu?: string
    nous?: string
    vous?: string
  }
}

interface FrenchPersons {
  je?: string      // 第一人称单数
  tu?: string      // 第二人称单数
  il?: string      // 第三人称单数阳性
  elle?: string    // 第三人称单数阴性
  on?: string      // 泛指人称
  nous?: string    // 第一人称复数
  vous?: string    // 第二人称复数/敬称
  ils?: string     // 第三人称复数阳性
  elles?: string   // 第三人称复数阴性
}
```

---

## 五、实施计划

### 5.1 阶段划分

```
Phase 0（类型定义确认）→ TypeScript 编译验证
         ↓
Phase 1（P0 核心组件，3个文件）→ 存量英语功能测试
         ↓
Phase 2（P1 学习模块，8个文件）→ 存量英语功能测试
         ↓
Phase 3（P2 基础设施，10个文件）→ 存量英语功能测试
         ↓
       全量回归测试
```

### 5.2 时间估算

| 阶段 | 文件数 | 预估工时 | 累计 |
|-----|-------|---------|------|
| Phase 0 | 1 | 0.5h | 0.5h |
| Phase 1 | 3 | 1.5h | 2h |
| Phase 2 | 8 | 4h | 6h |
| Phase 3 | 10 | 4h | 10h |
| 测试验收 | - | 2h | 12h |

---

## 六、测试验收标准

### 6.1 回归测试（存量英语用户）

| 测试项 | 测试步骤 | 通过标准 |
|-------|---------|---------|
| 单词本列表 | 打开任意英语单词本 | 显示正常，无报错 |
| 单词卡片 | 查看 VocabularyCard | 音标、释义正常显示 |
| 闪卡练习 | 完成 10 张闪卡 | 功能正常 |
| 听写练习 | 完成 10 个单词 | 功能正常 |
| 连连看 | 完成一局游戏 | 功能正常 |
| 打字练习 | 完成练习 | 功能正常 |
| 学习计划 | 运行完整学习计划 | 功能正常 |

### 6.2 新功能测试（法语/日语）

| 测试项 | 测试步骤 | 通过标准 |
|-------|---------|---------|
| 法语单词显示 | 导入法语数据 | 显示阴阳性 `n. (m)` |
| 法语动词变位 | 查看动词详情 | 变位表正确显示 |
| 日语单词显示 | 导入日语数据 | 显示假名+罗马音 |
| 多语言混排 | 同一书中有多种语言 | 各自正确显示 |

---

## 七、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 存量数据显示异常 | 低 | 高 | 回退模式 + 充分测试 |
| TypeScript 类型错误 | 中 | 低 | 逐阶段编译验证 |
| 某些模块遗漏 | 中 | 中 | 全面搜索 + 检查清单 |
| 性能影响 | 低 | 低 | `language_data` 可选查询 |
| 法语变位数据过大 | 低 | 低 | 按需加载 |

---

## 八、决策记录

| 决策项 | 决策结果 | 决策日期 |
|-------|---------|---------|
| 实施范围 | 全部修改（P0 + P1 + P2） | 2026-03-12 |
| 语言优先级 | 法语优先 | 2026-03-12 |
| 实施方式 | 分阶段批量 + 逐阶段验证 | 2026-03-12 |

---

## 九、附录

### A. 修改文件检查清单

```
□ Phase 0
  □ src/types/word.ts - 确认法语类型完整

□ Phase 1
  □ src/components/WordList.tsx
  □ src/components/VocabularyCard.tsx
  □ src/components/WordCard.tsx

□ Phase 2
  □ src/components/learning-plan/FlashcardQueue.tsx
  □ src/components/learning-plan/DictationQueue.tsx
  □ src/app/study/[bookId]/flashcards/pageClient.tsx
  □ src/app/study/[bookId]/dictation/pageClient.tsx
  □ src/app/study/[bookId]/match-game/pageClient.tsx
  □ src/app/study/[bookId]/typing/practice/pageClient.tsx
  □ src/app/practice/types.ts
  □ src/app/learning-plan/learning-flow/pageClient.tsx

□ Phase 3
  □ src/stores/typingStore.ts
  □ src/hooks/useWordData.ts
  □ src/lib/words-server.ts
  □ src/lib/learning-plan-strategies.ts
  □ src/components/WordTableEditor.tsx
  □ src/components/cards/WordCard.tsx
  □ src/app/admin/word-books/[bookId]/words/page.tsx
  □ src/app/admin/word-books/[bookId]/words/[wordId]/edit/page.tsx
```

### B. 代码模板

```typescript
// 组件 Word 接口扩展模板
interface LanguageData {
  fr?: {
    gender?: 'm' | 'f' | 'm/f' | 'n'
    plural?: string
    conjugation?: Conjugation
    feminine_form?: string
  }
  ja?: {
    kana?: string
    romaji?: string
    pitch_accent?: string
  }
  // ... 其他语言
}

interface Word {
  // 保留所有现有字段
  id: string
  word: string
  phonetic?: string
  // ...

  // 新增可选字段
  language_data?: LanguageData
}

// 发音显示逻辑模板
const getPhoneticDisplay = (word: Word): string => {
  const ja = word.language_data?.ja
  const fr = word.language_data?.fr

  // 日语
  if (ja?.kana) {
    return `${ja.kana}${ja.romaji ? ' / ' + ja.romaji : ''}`
  }

  // 英语（默认，存量数据）
  return word.us_phonetic || word.uk_phonetic || word.phonetic || ''
}
```

---

**文档结束**
