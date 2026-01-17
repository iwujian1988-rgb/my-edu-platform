# SageVocab 打字练习模块 - 移交文档

## 📦 模块概述

**模块名称**: `src/app/practice/`
**版本**: v3.0.0 (TTS Integrated)
**开发日期**: 2026-01-14
**状态**: ✅ 生产就绪

---

## 🎯 模块化设计原则

### 1. 数据解耦 (Data Decoupling)

**设计目标**: 将数据源从业务逻辑中完全分离，便于未来切换数据源。

**实现方式**:
- 所有数据加载逻辑封装在 `data-loader.ts`
- 当前使用本地 JSON 文件（`master_words_pool.json`）
- 切换为 API 时，只需修改 `DATA_SOURCE` 配置

**数据源切换步骤**:

```typescript
// 📂 data-loader.ts

// Step 1: 修改数据源配置
export const DATA_SOURCE: 'local' | 'api' = 'api'  // 改为 'api'

// Step 2: 确保 API 路由存在
// POST /api/books/:id - 获取单词书信息
// GET /api/words?bookId=:id - 获取单词列表

// Step 3: 主逻辑无需任何修改！
```

**API 数据格式要求**:

```typescript
// API 返回格式（示例）
{
  "id": "cet4-book-1",
  "title": "CET-4 核心词汇",
  "description": "大学英语四级核心词汇",
  "words": [
    {
      "id": "word-001",
      "word": "abandon",
      "definition": "v. 抛弃，放弃",
      "phonetic": "/əˈbændən/"
    }
  ]
}
```

---

### 2. 状态封装 (State Encapsulation)

**设计目标**: 避免对全局状态（Context/Redux）的依赖，实现"插拔式"组件。

**实现方式**:
- 所有应用状态在组件内部管理（`useState`）
- 不依赖项目全局 Context（除 React 内置）
- 设置保存到 `localStorage`，不涉及服务器

**拷贝即用**:

```bash
# 完整拷贝文件夹到目标项目
cp -r src/app/practice /target/project/src/app/

# 无需额外配置，直接运行！
```

**依赖清单**:

```json
{
  "dependencies": {
    "next": ">=15.0.0",
    "react": ">=19.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.300.0"
  }
}
```

---

### 3. 逻辑标准化 (Logic Standardization)

**设计目标**: 代码清晰易读，核心逻辑包含详细注释。

**文件结构**:

```
src/app/practice/
├── page.tsx              # 主应用组件 (800+ 行)
├── types.ts              # 类型定义 (200+ 行)
├── data-loader.ts        # 数据加载模块 (160 行)
├── tts-engine.ts         # TTS 引擎 (NEW!)
├── Popover.tsx           # Popover 组件
├── Tooltip.tsx           # Tooltip 组件
├── SettingsModal.tsx     # 设置对话框
├── ShortcutsModal.tsx    # 快捷键提示
└── README.md             # 本文档
```

**核心函数说明**:

| 函数名 | 职责 | 文件位置 |
|--------|------|----------|
| `handleKeyPress` | 键盘事件处理（打字判断） | page.tsx:318 |
| `playWordPronunciation` | TTS 单词发音 | page.tsx:254 |
| `playTranslationPronunciation` | TTS 释义发音 | page.tsx:273 |
| `calculateWPM` | 计算 WPM（每分钟单词数） | page.tsx:286 |
| `calculateAccuracy` | 计算正确率 | page.tsx:291 |
| `loadDict` | 统一数据加载接口 | data-loader.ts:98 |
| `speakWord` | TTS 引擎核心方法 | tts-engine.ts:122 |

---

## 🚀 使用指南

### 安装步骤

1. **拷贝模块**:
```bash
# 将整个 practice 文件夹拷贝到目标项目
cp -r practice /target/project/src/app/
```

2. **准备数据** (三种方式):

**方式 A: 使用本地测试数据** (推荐用于开发)
```bash
# 拷贝测试数据文件
cp practice/data/words.json /target/project/src/app/practice/data/
```

**方式 B: 连接主项目 API** (生产环境)
```typescript
// 修改 data-loader.ts
export const DATA_SOURCE: 'local' | 'api' = 'api'
```

**方式 C: 使用自定义数据源** (扩展)
```typescript
// 参考 data-loader.ts 的 loadAPIDict 函数
// 实现自己的数据加载逻辑
```

3. **访问页面**:
```
http://localhost:3000/practice
```

---

## ⚙️ 配置说明

### 默认设置

```typescript
// 音效设置（page.tsx:95）
const DEFAULT_SOUND_SETTINGS = {
  wordPronunciation: true,        // 单词自动发音（打对后触发）
  wordVolume: 80,                 // 音量 0-100
  wordSpeed: 0.9,                 // 语速 0.5-2.0
  pronunciationScheme: 'us',      // 美音/英音/自动
  keySound: false,                // 按键音（默认关闭）
  // ...
}

// 显示设置（page.tsx:119）
const DEFAULT_DISPLAY_SETTINGS = {
  foreignFontSize: 48,            // 外语字体大小 20-100px
  chineseFontSize: 18,            // 中文字体大小 12-50px
  darkMode: false,                // 深色模式
}
```

### 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 开始/继续练习 |
| `Ctrl + V` | 切换默写模式 |
| `Ctrl + Shift + V` | 切换释义显示 |
| `Ctrl + J` | 显示快捷键列表 |
| `Backspace` | 删除字符 |

---

## 🔧 TTS 发音系统

### 特性

- ✅ **浏览器原生**: 使用 `window.speechSynthesis`，无需外部依赖
- ✅ **美音/英音切换**: 通过 `pronunciationScheme` 配置
- ✅ **异步队列**: 不阻塞打字，保证流畅性
- ✅ **自动降级**: 浏览器不支持时自动静默失败

### 配置示例

```typescript
// 美式发音
pronunciationScheme: 'us'

// 英式发音
pronunciationScheme: 'uk'

// 自动选择（浏览器默认）
pronunciationScheme: 'auto'
```

### 扩展说明

如需替换为其他 TTS 服务（如 Azure TTS、Google TTS）：

1. 修改 `tts-engine.ts` 的 `TTSEngine` 类
2. 实现 `speakWord` 方法
3. 主逻辑 (`page.tsx`) 无需修改

---

## 📊 数据结构

### Word 类型

```typescript
interface Word {
  id: number | string
  word: string           // 单词拼写（必填）
  trans: string          // 中文释义（必填）
  category?: string      // 分类（可选）
  phonetic?: string      // 音标（可选）
}
```

### Dict 类型

```typescript
interface Dict {
  id: string             // 词库唯一标识
  name: string           // 词库名称
  description: string    // 词库描述
  words: Word[]          // 单词列表
}
```

### 统计数据

```typescript
interface Statistics {
  time: number           // 学习时间（秒）
  inputCount: number     // 输入字符数
  wpm: number            // 每分钟单词数
  correctCount: number   // 正确字符数
  accuracy: number       // 正确率 (0-100)
}
```

---

## 🐛 常见问题

### Q1: 页面显示空白？

**A**: 检查数据文件是否正确加载：
```javascript
// 打开浏览器控制台
console.log('Available Dicts:', availableDicts)
```

### Q2: TTS 发音不工作？

**A**: 检查浏览器是否支持 `speechSynthesis`：
```javascript
console.log('TTS Support:', 'speechSynthesis' in window)
```

### Q3: 快捷键不生效？

**A**: 确保焦点在页面上（点击页面任意位置）

### Q4: 切换 API 后数据加载失败？

**A**: 检查 API 返回格式是否符合 `APIWord` 类型定义

---

## 🔄 版本历史

### v3.0.0 (2026-01-14) - TTS 集成版
- ✅ 集成浏览器原生 TTS 引擎
- ✅ 美音/英音切换支持
- ✅ 打对单词自动发音
- ✅ 移除 Web Audio beep 音效
- ✅ 完整模块化重构

### v2.0.0 (2026-01-14) - Qwerty Learner 风格
- ✅ 紫色渐变背景
- ✅ 悬浮布局设计
- ✅ 三态开始/暂停逻辑
- ✅ 完整设置系统

### v1.0.0 (2026-01-13) - 初始版本
- ✅ 基础打字练习功能
- ✅ 词库加载系统

---

## 📞 技术支持

如有问题，请参考：
- `types.ts` - 完整类型定义
- `tts-engine.ts` - TTS 引擎文档
- `data-loader.ts` - 数据加载逻辑

---

**移交状态**: ✅ 完成
**测试状态**: ✅ 通过
**文档状态**: ✅ 完整
