# 法语数据质量修复方案

> **版本**: 1.0
> **日期**: 2026-03-16
> **状态**: 已验证数据源，可直接执行
> **目标**: 将法语词库从当前低质量状态修复为专业可用标准

---

## 一、问题诊断摘要

### 1.1 当前数据质量问题

| 问题类型 | 数量/比例 | 严重程度 |
|---------|----------|---------|
| 动词变位形式（非原形） | 55.7% | 🔴 严重 |
| 名词缺少阴阳性 | 90%+ | 🔴 严重 |
| 释义质量差（机翻错误） | 未完全统计 | 🟡 中等 |
| 缺失 A1 基础词汇 | 61 个 | 🔴 严重 |
| 重复单词 | 待统计 | 🟡 中等 |

### 1.2 典型错误示例

```
单词: pond
当前释义: 他她下蛋（机翻错误，应为"池塘"）
问题: AI 在没有上下文的情况下选择了错误的词义

单词: mange
当前词性: verb
问题: 这是 manger 的变位形式，应该用原形 manger
```

---

## 二、权威数据源（已验证可用）

### 2.1 Lexique 3.0（主要数据源）✅ 已验证

| 属性 | 值 |
|-----|-----|
| **来源** | lexique.org（法国 CNRS 学术项目） |
| **词数** | 140,000+ 法语词汇 |
| **许可证** | CC BY-NC（非商业使用免费） |
| **格式** | JSON / TSV |
| **下载地址** | `http://www.lexique.org/databases/_json/Lexique383.json` |
| **备用地址** | OpenLexicon GitHub: `chrplr/openlexicon` |

**包含字段**:
- `ortho`: 拼写
- `lemme`: 词元（原形）
- `cgram`: 语法类别（名词、动词等）
- `genre`: 阴阳性（m/f）
- `nombre`: 单复数
- `freqfilms`: 频率（电影字幕）
- `freqlivres`: 频率（书籍）

### 2.2 kaikki.org（补充数据源）✅ 已验证

| 属性 | 值 |
|-----|-----|
| **来源** | kaikki.org（维基词典结构化数据） |
| **词数** | 2,623,250 词义 |
| **许可证** | CC-BY-SA |
| **格式** | JSONL（每行一个 JSON） |
| **下载地址** | `https://kaikki.org/dictionary/French/kaikki.org/dictionary/French.jsonl` |

**包含字段**:
- 词形、词元、词性
- 多语言释义
- 例句
- 变位形式

---

## 三、数据修复工作流

### 3.1 整体流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    法语数据修复工作流                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: 下载权威数据                                             │
│ - 下载 Lexique383.json                                           │
│ - 下载 kaikki.org French.jsonl                                   │
│ - 验证文件完整性（MD5/行数）                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: 构建本地索引                                             │
│ - 从 Lexique 提取: 词形 → 词元, 词性, 阴阳性, 频率                  │
│ - 从 kaikki 提取: 词形 → 释义, 例句                                │
│ - 合并为统一索引: word_index.json                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: 诊断现有数据                                             │
│ - 标记变位形式 → 映射到原形                                        │
│ - 标记缺失阴阳性                                                  │
│ - 标记释义质量问题                                                │
│ - 生成: diagnosis_report.json                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 4: 自动修复                                                 │
│ - 替换变位形式为原形（保留原词作为变位示例）                          │
│ - 补充阴阳性数据                                                  │
│ - 修正可验证的释义                                                │
│ - 生成: fix_commands.json（SQL 更新语句）                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 5: 人工审核                                                 │
│ - 审核无法自动修复的词                                             │
│ - 确认高频词（前 5000）的修复                                      │
│ - 批准执行 SQL                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 6: 执行更新                                                 │
│ - 执行 SQL 更新                                                   │
│ - 验证更新结果                                                    │
│ - 更新 MULTILINGUAL_PROGRESS.md                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Phase 1: 下载脚本

```javascript
// scripts/french-data-fix/01_download_sources.mjs

import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
import fetch from 'node-fetch'

const SOURCES = {
  lexique: {
    url: 'http://www.lexique.org/databases/_json/Lexique383.json',
    output: 'temp/lexique383.json',
    description: 'Lexique 3.0 词汇数据库'
  },
  // kaikki 文件较大，可选下载
  kaikki: {
    url: 'https://kaikki.org/dictionary/French/kaikki.org/dictionary/French.jsonl',
    output: 'temp/kaikki_french.jsonl',
    description: 'kaikki.org 法语词典数据'
  }
}

async function downloadFile(url, outputPath) {
  console.log(`下载: ${url}`)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`)
  }

  const fileStream = createWriteStream(outputPath)
  await pipeline(response.body, fileStream)

  console.log(`✓ 已保存到: ${outputPath}`)
}

async function main() {
  console.log('=== Phase 1: 下载权威数据源 ===\n')

  // 下载 Lexique（必需）
  await downloadFile(SOURCES.lexique.url, SOURCES.lexique.output)

  // 下载 kaikki（可选，文件较大约 500MB+）
  const args = process.argv.slice(2)
  if (args.includes('--full')) {
    await downloadFile(SOURCES.kaikki.url, SOURCES.kaikki.output)
  } else {
    console.log('\n提示: 使用 --full 参数下载 kaikki.org 数据（较大）')
  }

  console.log('\n✓ Phase 1 完成')
}

main().catch(console.error)
```

### 3.3 Phase 2: 构建索引脚本

```javascript
// scripts/french-data-fix/02_build_index.mjs

import { readFileSync, writeFileSync } from 'fs'

/**
 * 从 Lexique 数据构建词形索引
 * 关键: 使用词元(lemme)而非词形(ortho)作为标准形式
 */
function buildLexiqueIndex(lexiquePath) {
  console.log('读取 Lexique 数据...')
  const data = JSON.parse(readFileSync(lexiquePath, 'utf-8'))

  const index = new Map()

  for (const entry of data) {
    const wordForm = entry.ortho?.toLowerCase()
    const lemma = entry.lemme?.toLowerCase()
    const pos = entry.cgram // cl, nom, adj, adv, etc.
    const gender = entry.genre // m, f
    const freq = entry.freqfilms2 || entry.freqlivres || 0

    if (!wordForm || !lemma) continue

    // 存储词形信息
    if (!index.has(wordForm)) {
      index.set(wordForm, {
        forms: [],
        preferredLemma: null,
        preferredPos: null,
        gender: null,
        frequency: 0
      })
    }

    const record = index.get(wordForm)

    // 记录所有可能的词元（一个词形可能对应多个词元）
    record.forms.push({
      lemma,
      pos: mapLexiquePos(pos),
      gender: pos === 'NOM' ? gender : null,
      frequency: freq
    })

    // 选择最高频率的词元作为首选
    if (freq > record.frequency) {
      record.frequency = freq
      record.preferredLemma = lemma
      record.preferredPos = mapLexiquePos(pos)
      if (pos === 'NOM') {
        record.gender = gender
      }
    }
  }

  console.log(`✓ 索引构建完成: ${index.size} 个词形`)
  return index
}

/**
 * 映射 Lexique 词性到系统词性
 */
function mapLexiquePos(lexiquePos) {
  const mapping = {
    'NOM': 'noun',
    'VER': 'verb',
    'ADJ': 'adj',
    'ADV': 'adv',
    'PRO': 'pron',
    'PRE': 'prep',
    'CON': 'conj',
    'INT': 'interj',
    'DET': 'det',
    'NUM': 'num',
  }
  return mapping[lexiquePos] || lexiquePos?.toLowerCase()
}

async function main() {
  console.log('=== Phase 2: 构建本地索引 ===\n')

  const lexiqueIndex = buildLexiqueIndex('temp/lexique383.json')

  // 转换为可序列化格式
  const serializable = Object.fromEntries(lexiqueIndex)

  writeFileSync('temp/french_word_index.json', JSON.stringify(serializable, null, 2))
  console.log('✓ 索引已保存到: temp/french_word_index.json')

  console.log('\n✓ Phase 2 完成')
}

main().catch(console.error)
```

### 3.4 Phase 3: 诊断脚本

```javascript
// scripts/french-data-fix/03_diagnose.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function diagnoseBook(bookId, bookTitle, wordIndex) {
  console.log(`\n诊断: ${bookTitle}`)

  const { data: words } = await supabase
    .from('words')
    .select('id, word, definition, definition_en, part_of_speech, language_data')
    .eq('book_id', bookId)

  if (!words) return null

  const issues = {
    conjugationForms: [],    // 变位形式（应替换为原形）
    missingGender: [],       // 缺失阴阳性
    lowQualityDefinition: [], // 低质量释义
    notInLexique: [],        // Lexique 中不存在
    total: words.length
  }

  for (const word of words) {
    const wordLower = word.word.toLowerCase()
    const indexEntry = wordIndex[wordLower]

    if (!indexEntry) {
      issues.notInLexique.push({
        id: word.id,
        word: word.word,
        definition: word.definition
      })
      continue
    }

    // 检查是否为变位形式
    if (word.part_of_speech === 'verb') {
      const isInfinitive = wordLower.endsWith('er') ||
                           wordLower.endsWith('ir') ||
                           wordLower.endsWith('re') ||
                           wordLower.endsWith('oir')

      if (!isInfinitive && indexEntry.preferredLemma !== wordLower) {
        issues.conjugationForms.push({
          id: word.id,
          word: word.word,
          currentPos: word.part_of_speech,
          suggestedLemma: indexEntry.preferredLemma,
          confidence: indexEntry.frequency > 100 ? 'high' : 'medium'
        })
      }
    }

    // 检查名词阴阳性
    if (word.part_of_speech === 'noun') {
      const currentGender = word.language_data?.fr?.gender
      const expectedGender = indexEntry.gender

      if (!currentGender && expectedGender) {
        issues.missingGender.push({
          id: word.id,
          word: word.word,
          suggestedGender: expectedGender,
          confidence: 'high' // Lexique 数据可信
        })
      }
    }

    // 检查释义质量
    if (word.definition) {
      const badPatterns = [
        /的变位/,
        /他她/,
        /动词变位/,
        /^[a-z]+的$/
      ]

      for (const pattern of badPatterns) {
        if (pattern.test(word.definition)) {
          issues.lowQualityDefinition.push({
            id: word.id,
            word: word.word,
            definition: word.definition,
            issue: pattern.source
          })
          break
        }
      }
    }
  }

  return issues
}

async function main() {
  console.log('=== Phase 3: 诊断现有数据 ===\n')

  // 加载索引
  const wordIndex = JSON.parse(readFileSync('temp/french_word_index.json', 'utf-8'))
  console.log(`已加载词形索引: ${Object.keys(wordIndex).length} 条`)

  // 获取所有法语书籍
  const { data: books } = await supabase
    .from('books')
    .select('id, title')
    .eq('language', 'fr')

  const allIssues = {}

  for (const book of books) {
    const issues = await diagnoseBook(book.id, book.title, wordIndex)
    if (issues) {
      allIssues[book.title] = issues

      console.log(`  - 变位形式: ${issues.conjugationForms.length}`)
      console.log(`  - 缺失阴阳性: ${issues.missingGender.length}`)
      console.log(`  - 低质量释义: ${issues.lowQualityDefinition.length}`)
      console.log(`  - Lexique 无记录: ${issues.notInLexique.length}`)
    }
  }

  // 保存诊断报告
  writeFileSync('temp/french_diagnosis_report.json', JSON.stringify(allIssues, null, 2))
  console.log('\n✓ 诊断报告已保存到: temp/french_diagnosis_report.json')

  console.log('\n✓ Phase 3 完成')
}

main().catch(console.error)
```

### 3.5 Phase 4: 生成修复脚本

```javascript
// scripts/french-data-fix/04_generate_fixes.mjs

import { readFileSync, writeFileSync } from 'fs'

/**
 * 生成 SQL 更新语句
 *
 * 安全原则:
 * 1. 只生成更新语句，不自动执行
 * 2. 每条语句包含 WHERE 条件确保精确匹配
 * 3. 添加注释说明修复原因
 */
function generateFixCommands(diagnosisPath, wordIndexPath) {
  const diagnosis = JSON.parse(readFileSync(diagnosisPath, 'utf-8'))
  const wordIndex = JSON.parse(readFileSync(wordIndexPath, 'utf-8'))

  const commands = []

  for (const [bookTitle, issues] of Object.entries(diagnosis)) {
    // 修复名词阴阳性（高置信度）
    for (const item of issues.missingGender) {
      if (item.confidence === 'high') {
        commands.push({
          type: 'UPDATE_GENDER',
          book: bookTitle,
          wordId: item.id,
          word: item.word,
          sql: `-- 修复阴阳性: ${item.word} (${bookTitle})
UPDATE words
SET language_data = jsonb_set(
  COALESCE(language_data, '{}'::jsonb),
  '{fr}',
  COALESCE(language_data->'fr', '{}'::jsonb) || '{"gender": "${item.suggestedGender}"}'::jsonb
)
WHERE id = '${item.id}' AND word = '${item.word}';`,
          reason: `Lexique 标注该词为 ${item.suggestedGender === 'm' ? '阳性' : '阴性'}`
        })
      }
    }

    // 标记变位形式（需人工确认）
    for (const item of issues.conjugationForms) {
      if (item.confidence === 'high') {
        commands.push({
          type: 'MARK_CONJUGATION',
          book: bookTitle,
          wordId: item.id,
          word: item.word,
          suggestedLemma: item.suggestedLemma,
          sql: `-- 变位形式标记: ${item.word} → 原形 ${item.suggestedLemma} (${bookTitle})
-- 建议: 将此词替换为原形 "${item.suggestedLemma}" 或添加到变位示例字段
-- UPDATE words SET word = '${item.suggestedLemma}' WHERE id = '${item.id}';`,
          reason: `高频词（频率>${item.confidence === 'high' ? '100' : '0'}），建议替换为原形`,
          requiresReview: true
        })
      }
    }
  }

  return commands
}

async function main() {
  console.log('=== Phase 4: 生成修复命令 ===\n')

  const commands = generateFixCommands(
    'temp/french_diagnosis_report.json',
    'temp/french_word_index.json'
  )

  // 按类型分组
  const grouped = {
    autoExecute: commands.filter(c => !c.requiresReview),
    requiresReview: commands.filter(c => c.requiresReview)
  }

  // 保存可直接执行的 SQL
  const autoSql = grouped.autoExecute.map(c => c.sql).join('\n\n')
  writeFileSync('temp/fix_auto_execute.sql', autoSql)
  console.log(`✓ 自动执行 SQL: ${grouped.autoExecute.length} 条`)

  // 保存需审核的 SQL
  const reviewSql = grouped.requiresReview.map(c => c.sql).join('\n\n')
  writeFileSync('temp/fix_requires_review.sql', reviewSql)
  console.log(`✓ 待审核 SQL: ${grouped.requiresReview.length} 条`)

  // 保存完整 JSON（用于审核界面）
  writeFileSync('temp/fix_commands.json', JSON.stringify(commands, null, 2))

  console.log('\n✓ Phase 4 完成')
  console.log('\n下一步: 人工审核 temp/fix_requires_review.sql 后执行')
}

main().catch(console.error)
```

---

## 四、执行计划

### 4.1 执行顺序

```bash
# Step 1: 下载权威数据
node scripts/french-data-fix/01_download_sources.mjs

# Step 2: 构建索引
node scripts/french-data-fix/02_build_index.mjs

# Step 3: 诊断现有数据
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/french-data-fix/03_diagnose.mjs

# Step 4: 生成修复命令
node scripts/french-data-fix/04_generate_fixes.mjs

# Step 5: 人工审核
# - 检查 temp/fix_requires_review.sql
# - 确认变位形式 → 原形的映射是否正确

# Step 6: 执行更新
# - 执行 temp/fix_auto_execute.sql
# - 审核后执行 temp/fix_requires_review.sql
```

### 4.2 预期修复量

| 修复类型 | 预估数量 | 置信度 |
|---------|---------|-------|
| 补充名词阴阳性 | ~15,000 | 高（来自 Lexique） |
| 标记变位形式 | ~8,000 | 中（需人工确认） |
| 释义修正 | 待诊断后确定 | 低（需人工审核） |

---

## 五、验收标准

### 5.1 数据质量指标

| 指标 | 当前 | 目标 |
|-----|------|------|
| 名词阴阳性覆盖率 | 4-32% | **≥90%** |
| 动词原形比例 | ~45% | **≥95%** |
| A1 基础词汇完整性 | 缺失 61 个 | **0 缺失** |
| 释义质量 | 未量化 | **0 机翻错误** |

### 5.2 功能验证

- [ ] 所有法语名词显示阴阳性 `n. (m)` / `n. (f)`
- [ ] 动词全部为原形（avoir, être, aller 等）
- [ ] A1 词汇包含 CECR 标准基础词
- [ ] 释义准确，无机翻痕迹

---

## 六、风险与应对

### 6.1 数据源风险

| 风险 | 可能性 | 影响 | 应对措施 |
|-----|-------|------|---------|
| Lexique 服务器不可用 | 低 | 高 | 使用 OpenLexicon GitHub 镜像 |
| 词性映射不一致 | 中 | 中 | 建立映射表，人工审核边界情况 |
| 频率数据过时 | 低 | 低 | 使用相对频率排名即可 |

### 6.2 执行风险

| 风险 | 可能性 | 影响 | 应对措施 |
|-----|-------|------|---------|
| 批量更新失败 | 低 | 高 | 事务包装，失败自动回滚 |
| 误修复正确数据 | 中 | 高 | 生成前人工审核，保留原数据备份 |

---

## 七、后续维护

### 7.1 数据质量监控

建议建立定期检查机制：
- 每月检查新增词汇的质量
- 监控阴阳性覆盖率
- 用户反馈收集

### 7.2 新词汇添加流程

1. 从 Lexique 获取标准词形
2. 自动填充阴阳性、频率
3. 释义需人工审核
4. 例句从 kaikki.org 获取

---

## 八、参考资源

- [Lexique 3.0 官网](http://www.lexique.org/)
- [OpenLexicon GitHub](https://github.com/chrplr/openlexicon)
- [kaikki.org 法语版](https://kaikki.org/dictionary/French/)
- [CECR A1 词汇标准](https://www.coe.int/en/web/common-european-framework-reference-languages)
