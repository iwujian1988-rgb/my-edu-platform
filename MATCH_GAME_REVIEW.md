# 消消乐功能代码审查报告

## 一、功能概述

消消乐（Match Game）是一个单词配对学习游戏，通过卡片翻转配对的方式来学习和记忆单词。

## 二、技术架构

### 2.1 前端架构

```
┌─────────────────────────────────────────┐
│  Match Game Page (Client Component)    │
│  src/app/study/[bookId]/match-game/    │
└──────────────┬──────────────────────────┘
               │
               ├──> API调用
               │    ├──> GET /api/books/{id}
               │    ├──> GET /api/words
               │    └──> POST /api/word-progress
               │
               ├──> 本地状态管理
               │    ├──> 游戏状态 (React State)
               │    ├──> 单词进度 (wordProgress)
               │    └──> 用户偏好 (localStorage)
               │
               └──> 权限控制
                    └──> PermissionGate组件
```

### 2.2 数据流

#### 数据获取流程
1. **初始加载** (useEffect)
   - 获取词书信息
   - 获取单词列表
   - 获取用户进度
   - 构建"未认识单词池"

2. **游戏初始化** (useEffect)
   - 从单词池随机抽取单词
   - 创建卡片对（英文+中文）
   - Fisher-Yates洗牌算法打乱顺序
   - 根据难度显示不同数量的卡片

#### 游戏交互流程
```
用户点击卡片
    ↓
选中第一张卡片
    ↓
选中第二张卡片
    ↓
判断是否匹配？
    ├─ 是 → 匹配成功
    │    ├─ 更新 match_count
    │    ├─ 达到阈值 → 标记为 known
    │    ├─ 播放音效
    │    ├─ 触发爆炸动画
    │    └─ 检查是否通关
    │
    └─ 否 → 匹配失败
         ├─ 更新 fail_count
         ├─ 达到阈值 → 标记为 unknown
         └─ 延迟取消选中
```

### 2.3 核心数据结构

#### Word（单词）
```typescript
type Word = {
  id: string
  word: string           // 英文单词
  phonetic: string      // 音标
  definition: string    // 中文释义
  definition_en: string // 英文释义
  part_of_speech: string // 词性
}
```

#### WordProgress（学习进度）
```typescript
type WordProgress = {
  word_id: string
  status: 'new' | 'known' | 'fuzzy' | 'unknown'
  match_count?: number  // 匹配成功次数（新增）
  fail_count?: number   // 匹配失败次数（新增）
}
```

#### Card（游戏卡片）
```typescript
type Card = {
  id: string
  content: string      // 显示内容（单词或释义）
  type: 'word' | 'definition'
  wordId: string
  wordText?: string    // 单词文本（用于灵活匹配）
  isMatched: boolean   // 是否已配对
  isSelected: boolean  // 是否被选中
}
```

### 2.4 智能累积算法

#### 匹配成功逻辑
```javascript
// 状态转换规则
if (currentStatus === 'unknown') {
  // 不认识 → 需要3次匹配
  shouldMarkAsKnown = newMatchCount >= 3
} else if (currentStatus === 'fuzzy') {
  // 模糊 → 需要2次匹配
  shouldMarkAsKnown = newMatchCount >= 2
} else {
  // 新单词 → 需要2次匹配
  shouldMarkAsKnown = newMatchCount >= 2
}
```

#### 匹配失败逻辑
```javascript
// 失败3次标记为不认识
if (newFailCount >= 3 &&
    (currentStatus === 'new' || currentStatus === 'fuzzy')) {
  shouldMarkAsUnknown = true
}
```

### 2.5 多轮次机制

#### 轮次划分
- 根据单词池大小和难度自动计算总轮次
- 每轮完成后自动进入下一轮
- 最后一轮完成显示通关界面

#### 单词去重
```javascript
// 同一单词只保留一个释义（避免多义词问题）
const wordMap = new Map<string, Word>()
unknownWordsPool.forEach(word => {
  if (!wordMap.has(word.word)) {
    wordMap.set(word.word, word)
  }
})
```

### 2.6 难度配置

```javascript
const DIFFICULTY_OPTIONS = [
  { pairs: 4, cards: 8, name: '轻松' },    // 8张卡片，4对
  { pairs: 10, cards: 20, name: '中等' },  // 20张卡片，10对
  { pairs: 20, cards: 40, name: '困难' },  // 40张卡片，20对
]
```

### 2.7 API接口

#### POST /api/word-progress
保存单词进度
```json
{
  "word_id": "uuid",
  "book_id": "uuid",
  "status": "known",
  "match_count": 2
}
```

#### GET /api/word-progress?book_id={id}
获取词书的单词进度

### 2.8 音效系统

使用 Web Audio API 生成音效：
- 匹配成功：两个连续音符（C5 → E5）
- 匹配失败：低频锯齿波
- 游戏胜利：上升琶音（C5 → E5 → G5 → C6）

### 2.9 权限控制

通过 `PermissionGate` 组件检查权限：
```javascript
<PermissionGate feature={FEATURE_PERMISSIONS.MATCH_GAME} bookId={bookId}>
  {/* 游戏内容 */}
</PermissionGate>
```

## 三、数据库设计

### word_progress表新增字段

| 字段名 | 类型 | 说明 | 新增 |
|--------|------|------|------|
| match_count | integer | 匹配成功次数 | ✅ |
| fail_count | integer | 匹配失败次数 | ✅ |

## 四、关键技术点

### 4.1 Fisher-Yates 洗牌算法
确保真正的均匀随机，避免有偏随机。

### 4.2 AbortController
组件卸载时取消所有pending的API请求，避免内存泄漏。

### 4.3 多义词处理
使用 `wordText` 字段进行匹配，而非ID，这样相同单词的不同释义也能正确配对。

### 4.4 难度持久化
使用 localStorage 保存用户选择的难度，下次自动应用。

### 4.5 智能进度保存
- 实时更新本地状态
- 异步保存到数据库（带重试机制）
- 失败不阻塞游戏流程

## 五、用户体验优化

### 5.1 视觉反馈
- 选中状态：ring-4外边框 + scale-105放大
- 配对成功：爆炸动画 + scale-150放大消失
- 颜色区分：英文卡片紫色，中文卡片绿色

### 5.2 Toast提示
- 即时反馈：显示"正在保存..."、"已掌握"等消息
- 自动消失：2-3秒后自动隐藏

### 5.3 音效反馈
- 匹配成功：愉悦的双音
- 匹配失败：低沉的错误音
- 游戏胜利：庆祝琶音

### 5.4 自动化流程
- 本轮完成 → 自动进入下一轮（1.5秒延迟）
- 全部完成 → 显示通关界面

## 六、性能优化

### 6.1 Set去重
使用Set避免重复API调用：
```javascript
const processedWordIds = new Set<string>()
```

### 6.2 指数退避重试
API失败后等待更长时间再重试：
```javascript
setTimeout(resolve, 1000 * (i + 1))
```

### 6.3 延迟状态更新
使用setTimeout批量更新状态，减少渲染次数。

## 七、待优化项

1. **性能**：大量卡片时可考虑虚拟滚动
2. **统计**：添加更详细的游戏数据统计
3. **挑战**：可加入排行榜或挑战模式
4. **离线**：支持离线游玩，恢复网络后同步

## 八、总结

消消乐功能设计完善，代码质量高：
- ✅ 状态管理清晰
- ✅ 数据流向明确
- ✅ 错误处理完善
- ✅ 用户体验友好
- ✅ 权限控制严格
- ✅ API接口规范

唯一需要修改的是**权限控制**，当前被PermissionGate限制，需要移除或配置为开放状态。
