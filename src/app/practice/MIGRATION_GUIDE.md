# 打字练习背单词 - 迁移指南

## 📦 当前状态

✅ **已完成**：打字练习背单词功能模块已独立开发完成

### 文件结构
```
src/app/practice/
├── page.tsx              # 主页面组件（已完成）
├── types.ts              # 类型定义（已完成）
├── data-loader.ts        # 数据加载模块（已完成）
└── MIGRATION_GUIDE.md    # 本文档
```

### 测试数据
```
src/app/data/
└── words.json            # 测试用词库数据（10个单词）
```

---

## 🎯 功能特性

### 核心功能
1. **打字练习** - 通过键盘输入练习单词拼写
2. **实时统计** - WPM（每分钟单词数）、准确率、用时统计
3. **双模式** - 默写模式（隐藏单词）+ 练习模式（显示单词）
4. **音效反馈** - 机械键盘/柔和键盘/关闭三种音效
5. **自动发音** - 使用有道词典API或Web Speech API
6. **进度管理** - 自动切换到下一个单词

### 数据源
- **当前**：从 `src/app/data/words.json` 加载测试数据
- **未来**：可切换到主项目 API（修改 `DATA_SOURCE` 配置）

---

## 🔧 迁移到主项目的步骤

### 步骤 1：移动文件（推荐）

将整个 `practice` 文件夹移动到主项目的正确位置：

```bash
# 如果主项目使用不同的路由结构，可能需要调整
cp -r src/app/practice/* [主项目路径]/src/app/practice/
```

### 步骤 2：切换数据源到 API

修改 `src/app/practice/data-loader.ts`：

```typescript
// 将这一行：
export const DATA_SOURCE: 'local' | 'api' = 'local'

// 改为：
export const DATA_SOURCE: 'local' | 'api' = 'api'
```

### 步骤 3：添加路由链接

在主项目的导航中添加入口：

```tsx
// 例如在导航菜单中添加
<Link href="/practice">
  <button>打字练习</button>
</Link>
```

### 步骤 4：集成权限系统（可选）

如果需要使用主项目的权限控制：

```tsx
// 在 page.tsx 顶部添加
import { PermissionGate } from '@/components/PermissionDisplay'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'

export default function PracticePage() {
  return (
    <PermissionGate feature={FEATURE_PERMISSIONS.TYPING_PRACTICE}>
      {/* 现有组件内容 */}
    </PermissionGate>
  )
}
```

### 步骤 5：保存学习进度（可选）

如果需要将练习进度保存到数据库：

```typescript
// 在单词完成时调用保存接口
const saveProgress = async (wordId: string, status: 'known' | 'fuzzy' | 'unknown') => {
  await fetch('/api/word-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word_id: wordId,
      book_id: currentBookId,
      status: status,
    }),
  })
}
```

---

## 🎨 样式适配

### 当前样式系统
打字练习使用的是 **Qwerty Learner** 风格的配色：
- 主色：Indigo (#6366f1)
- 成功：Emerald (#10b981)
- 错误：Red (#ef4444)
- 背景：浅灰蓝渐变

### 主项目样式
如果主项目使用 **Claymorphism** 风格，需要调整样式类：

```typescript
// 需要替换的样式类：
- shadow-glass → clay-card-xl
- bg-primary → 柔和的渐变色
- text-primary → 适合的文字色
```

建议创建一个 `practice-styles.css` 文件来覆盖样式：

```css
/* 覆盖默认样式以匹配主项目 */
.practice-container {
  /* 使用主项目的 clay-card 样式 */
}

.practice-header {
  /* 使用主项目的导航栏样式 */
}
```

---

## 📊 数据结构映射

### 测试数据格式（当前）
```json
{
  "id": 1,
  "word": "apple",
  "trans": "n. 苹果",
  "category": "fruit"
}
```

### 主项目 API 格式（目标）
```typescript
interface APIWord {
  id: string
  word: string
  phonetic: string
  definition: string        // 中文释义（对应 trans）
  definition_en?: string    // 英文释义
  part_of_speech?: string   // 词性
  collocation?: string      // 搭配
  example_sentence?: string // 例句
}
```

### 转换函数
已在 `types.ts` 中提供：

```typescript
export function convertAPIWordToWord(apiWord: APIWord): Word {
  return {
    id: apiWord.id,
    word: apiWord.word,
    trans: apiWord.definition,  // 映射 definition → trans
    phonetic: apiWord.phonetic,
  }
}
```

---

## ⚙️ 配置选项

### 数据源配置
在 `data-loader.ts` 中：

```typescript
// 开发测试阶段
export const DATA_SOURCE: 'local' | 'api' = 'local'

// 生产环境
export const DATA_SOURCE: 'local' | 'api' = 'api'
```

### 功能开关
可以根据需要禁用某些功能：

```typescript
// 禁用音效
const [soundEnabled, setSoundEnabled] = useState(false)

// 禁用自动发音
const [pronunciationEnabled, setPronunciationEnabled] = useState(false)

// 默认显示单词（非默写模式）
const [isBlindMode, setIsBlindMode] = useState(false)
```

---

## 🐛 常见问题

### Q1: 页面显示空白
**A**: 检查：
1. 浏览器控制台是否有错误
2. `words.json` 文件路径是否正确
3. Next.js 开发服务器是否正在运行

### Q2: 单词显示不出来
**A**: 检查：
1. JSON 文件格式是否正确
2. 浏览器控制台是否有 "Failed to load" 错误
3. 尝试刷新页面

### Q3: 打字没有反应
**A**: 检查：
1. 点击页面确保获得焦点
2. 检查浏览器是否支持键盘事件
3. 查看控制台是否有 JavaScript 错误

### Q4: 音效不播放
**A**: 检查：
1. 音效文件是否存在于 `/public/sounds/` 目录
2. 浏览器是否允许自动播放音频
3. 尝试关闭音效开关再重新打开

---

## 🔍 调试方法

### 开启调试日志
在浏览器控制台中查看：

```javascript
// 查看加载的词库数据
console.log('Available dicts:', window.availableDicts)

// 查看当前状态
console.log('Current state:', window.currentState)
```

### 检查网络请求
1. 打开开发者工具（F12）
2. 切换到 Network 标签
3. 刷新页面
4. 查看 `words.json` 是否成功加载（状态码 200）

---

## 📝 待办事项（可选增强）

- [ ] 添加更多测试数据（建议至少 50 个单词）
- [ ] 支持多词库选择（不同难度级别）
- [ ] 添加错题本功能
- [ ] 保存学习进度到数据库
- [ ] 添加成就系统
- [ ] 支持自定义快捷键
- [ ] 添加打字游戏模式（限时挑战）

---

## 📧 技术支持

如有问题，请检查：
1. 本文档的"常见问题"部分
2. 浏览器控制台的错误信息
3. Next.js 开发服务器的日志

---

## ✅ 验收清单

迁移完成后，请确认以下功能正常：

- [ ] 页面能正常访问（`/practice`）
- [ ] 词库数据正确加载（显示正确的单词数量）
- [ ] 可以正常打字输入
- [ ] WPM 和准确率统计正常
- [ ] 音效和发音功能正常
- [ ] 设置面板功能正常
- [ ] 移动端响应式显示正常

---

**文档版本**: v1.0
**最后更新**: 2026-01-14
**作者**: Claude Code
