# 多语言适配进度追踪

> **最后更新**: 2026-03-16
> **当前阶段**: Phase 5 - 法语数据修复方案已制定
> **目标**: 达到可以给法语学生使用的标准
> **语言优先级**: 法语
> **修复方案**: [FRENCH_DATA_FIX_PLAN.md](./FRENCH_DATA_FIX_PLAN.md)

---

## 当前状态总览

| 指标 | 值 |
|-----|---|
| TTS 多语言支持 | ✅ 100% 完成 |
| API 层 bookLanguage | ✅ 100% 完成 |
| 类型统一定义 | ✅ 100% 完成 |
| 界面 gender 显示 | ✅ 100% 完成 |
| 数据库法语书籍配置 | ✅ 100% 完成 (13本书全部 language='fr') |
| 法语 gender 数据覆盖 | ⚠️ 4-32% (需要补充) |

---

## 一、TTS 多语言支持 ✅ 完成

### 1.1 统一类型定义 (`src/types/word.ts`)

```typescript
// 已添加的统一定义
export type SupportedLanguage = 'en' | 'fr' | 'ja' | 'de' | 'es' | 'it' | 'ru'
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[]
export const LANGUAGE_CODE_MAP: Record<SupportedLanguage, string>
export function getWordLanguage(word, bookLanguage?): SupportedLanguage
export function getSpeechLanguageCode(language, type?): string
export function isValidLanguage(lang): lang is SupportedLanguage
```

### 1.2 API 层修改 ✅

| 文件 | 状态 | 修改内容 |
|-----|------|---------|
| `src/app/api/words/words-service.ts` | ✅ | 查询 books.language，返回 bookLanguage |
| `src/app/api/words/types.ts` | ✅ | 添加 bookLanguage 到响应 |
| `src/services/dictationService.ts` | ✅ | 返回 bookLanguage |

### 1.3 Hooks 层修改 ✅

| 文件 | 状态 | 修改内容 |
|-----|------|---------|
| `src/hooks/useDictationWords.ts` | ✅ | 返回 bookLanguage |
| `src/hooks/useLearningPlanTTS.ts` | ✅ | 使用统一类型 |

---

## 二、界面 gender 显示状态 ✅ 完成

### 2.1 已完成 ✅ (5个需要显示词性的界面)

| 界面 | 文件 | 状态 | 说明 |
|-----|------|------|------|
| 词库卡片 | VocabularyCard.tsx | ✅ | `n. (m)` / `n. (f)` |
| 单词卡片 | WordCard.tsx | ✅ | `n. (m)` |
| 学习计划闪卡 | FlashcardQueue.tsx | ✅ | `n. (m)` |
| 闪卡页面 | flashcards/pageClient.tsx | ✅ | 已添加 `getPosDisplay` |
| 打字练习 | typing/practice/pageClient.tsx | ✅ | 已添加 `getPosDisplay` |

### 2.2 无需修改 (不显示词性的界面)

| 界面 | 文件 | 原因 |
|-----|------|------|
| 听写页面 | dictation/pageClient.tsx | 只显示释义和单词，不显示词性 |
| 学习计划听写 | DictationQueue.tsx | 只显示释义和单词，不显示词性 |
| 连连看 | match-game/pageClient.tsx | 游戏界面，不显示词性 |

---

## 三、数据库层面 ✅ 已验证

### 3.1 法语书籍配置 ✅

所有 13 本法语书籍均已正确设置 `language = 'fr'`:

| 书名 | 单词数 | language |
|-----|-------|----------|
| 法语A1 | 2745 | fr ✅ |
| 法语A2 | 2907 | fr ✅ |
| 法语B1 | 4458 | fr ✅ |
| 法语B2 | 5649 | fr ✅ |
| 法语C1 | 4984 | fr ✅ |
| 法语-文化艺术 | 5292 | fr ✅ |
| 法语-日常生活 | 689 | fr ✅ |
| 法语-旅游出行 | 447 | fr ✅ |
| 法语-健康医疗 | 46 | fr ✅ |
| 法语-教育学习 | 155 | fr ✅ |
| 法语-餐饮美食 | 102 | fr ✅ |
| 法语-商务职场 | 73 | fr ✅ |
| 法语-科技网络 | 63 | fr ✅ |

### 3.2 法语 gender 数据覆盖率 ⚠️

| 书名 | 有 gender | 总数 | 覆盖率 |
|-----|----------|------|--------|
| 法语-文化艺术 | 1669 | 5292 | 31.5% |
| 法语C1 | 848 | 4984 | 17.0% |
| 法语B2 | 824 | 5649 | 14.6% |
| 法语B1 | 573 | 4458 | 12.9% |
| 法语A2 | 286 | 2907 | 9.8% |
| 法语A1 | 225 | 2745 | 8.2% |
| 法语-商务职场 | 6 | 73 | 8.2% |
| 法语-日常生活 | 51 | 689 | 7.4% |
| 法语-旅游出行 | 30 | 447 | 6.7% |
| 法语-教育学习 | 10 | 155 | 6.5% |
| 法语-餐饮美食 | 5 | 102 | 4.9% |
| 法语-科技网络 | 3 | 63 | 4.8% |
| 法语-健康医疗 | 2 | 46 | 4.3% |

### 3.3 其他字段填充率（以法语-健康医疗为例）

| 字段 | 填充率 |
|-----|--------|
| 中文释义 | 100% ✅ |
| 英文释义 | 100% ✅ |
| 词性 (part_of_speech) | 100% ✅ |
| 复数 (plural) | 52.2% |
| 例句 (example_sentence) | 15.2% |
| 例句英文 | 0% |
| **法语 gender** | **4.3%** ⚠️ |

---

## 四、结论与建议

### 4.1 技术层面 ✅ 已完成

- [x] TTS 多语言支持（法语使用 Web Speech API）
- [x] API 层 bookLanguage 传递
- [x] 界面 gender 显示逻辑
- [x] 数据库法语书籍配置

### 4.2 数据层面 ⚠️ 需要补充

**关键问题**: 法语名词的 gender 数据覆盖率极低（4-32%）

**对法语学习者的影响**:
- 法语名词必须知道阴阳性（le/la, un/une）
- 当前只有约 10% 的名词会显示 gender
- 90% 的名词只显示 `n.` 而不是 `n. (m)` 或 `n. (f)`

**建议方案**:
1. **短期**: 当前版本可以给法语学生使用，但需要说明 gender 数据不完整
2. **中期**: 补充法语 gender 数据（可以通过 AI 批量生成）
3. **长期**: 建立数据质量监控机制

### 4.3 功能可用性评估

| 功能 | 状态 | 说明 |
|-----|------|------|
| 单词发音 | ✅ 可用 | 使用 Web Speech API |
| 闪卡练习 | ✅ 可用 | 支持法语 gender 显示 |
| 听写练习 | ✅ 可用 | 不依赖 gender 数据 |
| 打字练习 | ✅ 可用 | 支持法语 gender 显示 |
| 连连看 | ✅ 可用 | 不依赖 gender 数据 |
| **gender 显示** | ⚠️ 部分可用 | 只有 4-32% 的单词会显示 gender |

---

## 五、验收标准

### 法语学生可用标准

| 功能 | 验收标准 | 状态 |
|-----|---------|------|
| 单词发音 | 点击发音按钮能朗读法语 | ✅ |
| 词性显示 | 显示 `n. (m)` / `n. (f)` | ⚠️ 逻辑完成，数据覆盖低 |
| 复数显示 | 显示复数形式（如有） | ⚠️ 约 50% 覆盖 |
| 例句显示 | 例句正常显示 | ⚠️ 约 15% 覆盖 |
| 闪卡练习 | 完整流程可用 | ✅ |
| 听写练习 | 完整流程可用 | ✅ |
| 打字练习 | 完整流程可用 | ✅ |
| 连连看 | 完整流程可用 | ✅ |

---

## 六、法语数据修复计划

### 6.1 问题诊断结果

| 问题类型 | 数量/比例 | 严重程度 |
|---------|----------|---------|
| 动词变位形式（非原形） | 55.7% | 🔴 严重 |
| 名词缺少阴阳性 | 90%+ | 🔴 严重 |
| 释义质量差（机翻错误） | 未完全统计 | 🟡 中等 |
| 缺失 A1 基础词汇 | 61 个 | 🔴 严重 |

### 6.2 修复方案

**完整方案**: [FRENCH_DATA_FIX_PLAN.md](./FRENCH_DATA_FIX_PLAN.md)

**执行脚本**: `scripts/french-data-fix/`

```bash
# 执行步骤
node scripts/french-data-fix/01_download_sources.mjs  # 下载 Lexique 数据
node scripts/french-data-fix/02_build_index.mjs       # 构建索引
node scripts/french-data-fix/03_diagnose.mjs          # 诊断问题
node scripts/french-data-fix/04_generate_fixes.mjs    # 生成修复 SQL
# 人工审核后执行 SQL
```

### 6.3 权威数据源

| 数据源 | 许可证 | 状态 | 用途 |
|-------|-------|------|------|
| Lexique 3.0 | CC BY-NC | ✅ 已验证 | 词形、词元、阴阳性、频率 |
| kaikki.org | CC-BY-SA | ✅ 已验证 | 释义、例句（可选） |

---

## 七、新会话启动指令

**复制以下内容给新 AI 会话：**

```
请阅读以下文档，继续法语多语言适配工作：
1. docs/MULTILINGUAL_ADAPTATION_PLAN.md - 完整技术方案
2. docs/MULTILINGUAL_PROGRESS.md - 当前进度（本文件）
3. docs/FRENCH_DATA_FIX_PLAN.md - 法语数据修复方案
4. docs/AI_CODING_GUARDRAILS.md - 代码规范（严格遵守！）

当前状态：
- 技术层面：✅ 完成（TTS、API、界面全部就绪）
- 数据层面：🔴 法语数据质量问题严重
  - 55.7% 动词是变位形式而非原形
  - 90%+ 名词缺少阴阳性
  - 61 个 A1 基础词汇缺失

待办任务：
1. 执行 scripts/french-data-fix/ 工作流修复数据
2. 或者人工审核已生成的 SQL 修复命令

目标：达到可以给法语学生使用的标准
```
