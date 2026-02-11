# 演说家模块 - 旧代码改造计划书

**文档版本**: v1.0
**创建日期**: 2026-02-05
**负责人**: 项目原作者兼首席维护工程师

---

## 📋 执行摘要

本文档基于**最小侵入原则**，分析现有代码库，规划"演说家"模块的实现方案，确保不影响现有功能的前提下高效开发。

**核心原则**：
1. ✅ **优先复用**现有组件和工具函数
2. ✅ **独立新建**演说家专用组件
3. ✅ **最小修改**现有代码
4. ✅ **保持架构一致性**（App Router + Server Components）

---

## 1️⃣ 代码复用评估

### ✅ 可直接复用的代码

| 现有模块 | 复用场景 | 演说家对应功能 |
|---------|---------|---------------|
| `useTTS` Hook | 音频播放 | Step 1 盲听、Step 2 单句播放、Step 3 背诵、Step 4 KTV |
| `getSpeakerAudioUrl()` | 获取音频 URL | 所有模块的音频加载 |
| `src/lib/oss.ts` | OSS 上传 | 管理后台上传音频文件 |
| `AppSidebar.tsx` | 左侧导航栏 | 添加"演说家"入口（移除 comingSoon） |
| `useTheme()` | 主题切换 | 所有页面适配暗黑模式 |
| `useLoading()` | 加载状态 | 页面切换时显示 loading |
| `src/lib/logger.ts` | 日志记录 | 错误追踪和调试 |

### 🔄 需要扩展的代码

| 现有模块 | 扩展方式 | 扩展内容 |
|---------|---------|---------|
| `useTTS` | 新增参数 | 支持**指定时间范围播放**（start_time, end_time）|
| `AppSidebar` | 修改导航项 | 移除 `comingSoon: true` |
| `src/lib/speech.ts` | 无需修改 | 作为降级方案保留 |

### ❌ 不复用的代码

| 现有模块 | 原因 | 演说家替代方案 |
|---------|------|---------------|
| `DictationQueue` | 逻辑完全不同 | 新建 `SpeakerDictation.tsx`（基于句子，而非单词）|
| `FlashcardQueue` | 功能不相关 | 新建 `SpeakerRecitation.tsx` |
| `learning-plan-*` | 独立的业务逻辑 | 新建 `speaker-*` 系列表 |
| `WordCard` | 数据结构不同 | 新建 `SpeakerArticleCard.tsx` |

---

## 2️⃣ 数据库影响分析

### ✅ 现有表结构（无需修改）

现有词库相关的表**完全不受影响**：
- `books` - 词库表
- `words` - 单词表
- `word_progress` - 单词进度表
- `learning_plans` - 学习计划表
- `daily_tasks` - 每日任务表

### 🆕 新增表（不影响现有表）

根据 PRD 设计，需要新建 **5 张独立表**：

```sql
-- 1. speaker_articles（文章表）
-- 2. speaker_sentences（句子表）
-- 3. speaker_progress（学习进度表）
-- 4. speaker_dictation_submissions（听写记录表）
-- 5. speaker_ghost_words（魔鬼生词本表）
```

**关键设计决策**：
- ✅ **完全独立**于现有词库系统
- ✅ 不修改现有表结构
- ✅ 通过 `user_id` 关联用户体系

---

## 3️⃣ 影响范围清单

### 📂 需要修改的现有文件

#### 3.1 导航栏（1 个文件）

| 文件 | 修改内容 | 影响范围 | 风险等级 |
|------|---------|---------|---------|
| `src/components/AppSidebar.tsx` | 移除 `comingSoon: true` | 导航菜单 | 🟢 低 |

**修改方案**：
```typescript
// 修改前（第 28 行）
{ label: '演说家', href: '/speaker', icon: Mic, comingSoon: true },

// 修改后
{ label: '演说家', href: '/speaker', icon: Mic },
```

---

#### 3.2 TTS Hook（1 个文件）

| 文件 | 修改内容 | 影响范围 | 风险等级 |
|------|---------|---------|---------|
| `src/hooks/use-tts.ts` | 新增可选参数 `startTime` 和 `endTime` | 音频播放逻辑 | 🟡 中 |

**修改方案**：
```typescript
// 新增接口参数
export interface UseTTSOptions {
  type?: '1' | '2'
  showFallbackToast?: boolean
  startTime?: number  // 🆕 新增：开始时间（秒）
  endTime?: number    // 🆕 新增：结束时间（秒）
}

// 修改 playAudioFile 函数，监听 timeupdate 事件
audioRef.current.addEventListener('timeupdate', () => {
  if (endTime && audioRef.current.currentTime >= endTime) {
    audioRef.current.pause()
  }
})
```

**向下兼容**：新参数为可选，不影响现有调用。

---

### 🆕 需要新建的文件

#### 3.3 演说家专用页面（7 个主页面）

| 文件路径 | 功能 | 优先级 |
|---------|------|-------|
| `src/app/speaker/page.tsx` | 首页（文章列表） | P0 |
| `src/app/speaker/[articleId]/page.tsx` | 时间轴页（4步骤导航） | P0 |
| `src/app/speaker/[articleId]/step1/page.tsx` | Step 1 盲听 | P0 |
| `src/app/speaker/[articleId]/step2/page.tsx` | Step 2 听写 | P0（最复杂）|
| `src/app/speaker/[articleId]/step3/page.tsx` | Step 3 背诵 | P1 |
| `src/app/speaker/[articleId]/step4/page.tsx` | Step 4 KTV 对比 | P1 |
| `src/app/speaker/ghost-words/page.tsx` | 魔鬼生词本 | P1 |

#### 3.4 演说家专用组件（10+ 个组件）

| 组件文件 | 功能 | 复用现有代码 |
|---------|------|-------------|
| `src/components/speaker/ArticleCard.tsx` | 文章卡片 | 参考 `BookCard.tsx` |
| `src/components/speaker/TimelineCard.tsx` | 时间轴步骤卡片 | 新建 |
| `src/components/speaker/AudioPlayer.tsx` | 音频播放器 | 基于现有 `useTTS` |
| `src/components/speaker/SplitLayout.tsx` | 左右分栏布局 | 参考 `layout/SplitLayout.tsx` |
| `src/components/speaker/MaskedText.tsx` | 原文遮罩 | 新建 |
| `src/components/speaker/DictationInput.tsx` | 听写输入流 | 新建 |
| `src/components/speaker/SubmissionModal.tsx` | 结果提交弹窗 | 参考 `ScopeSelectorModal.tsx` |
| `src/components/speaker/GhostWordCard.tsx` | 生词卡片 | 新建 |
| `src/components/speaker/RecitationItem.tsx` | 背诵条目 | 新建 |
| `src/components/speaker/KTVText.tsx` | KTV 滚动文本 | 新建 |

#### 3.5 API 路由（5 个接口）

| API 路径 | 功能 | 优先级 |
|---------|------|-------|
| `src/app/api/speaker/articles/route.ts` | 获取文章列表 | P0 |
| `src/app/api/speaker/[articleId]/route.ts` | 获取文章详情 | P0 |
| `src/app/api/speaker/[articleId]/progress/route.ts` | 保存/加载进度 | P0 |
| `src/app/api/speaker/dictation/submit/route.ts` | 提交听写结果 | P0 |
| `src/app/api/speaker/ghost-words/route.ts` | 魔鬼生词本 CRUD | P1 |

#### 3.6 数据库迁移文件（1 个文件）

| 文件路径 | 内容 | 优先级 |
|---------|------|-------|
| `supabase/migrations/20260205_create_speaker_tables.sql` | 创建 5 张演说家表 | P0 |

---

## 4️⃣ 技术债务与风险控制

### 4.1 现有代码的潜在冲突点

| 风险点 | 冲突场景 | 缓解方案 |
|-------|---------|---------|
| `useTTS` Hook 现有调用 | 修改后可能导致单词音频播放异常 | **向下兼容设计**，新参数默认为 undefined |
| 导航栏 `comingSoon` 逻辑 | 移除后其他功能误开启 | 仅移除演说家的 `comingSoon`，保留其他 |
| 数据库表命名冲突 | 新表可能与现有表名冲突 | 使用 `speaker_` 前缀，确保命名空间隔离 |

### 4.2 性能影响评估

| 影响点 | 预估影响 | 优化方案 |
|-------|---------|---------|
| 音频文件加载 | 15 个文件，约 85 MB | 开发阶段本地文件，生产环境 OSS + CDN |
| 数据库查询 | 新增 5 张表 | 建立索引，避免 JOIN 查询 |
| 客户端内存 | 长文章可能有 100+ 句子 | 虚拟滚动，只渲染可见句子 |

---

## 5️⃣ 开发优先级与依赖关系

### 阶段 1：基础设施（第 1-2 周）

**任务清单**：
1. ✅ 创建数据库表（SQL 迁移文件）
2. ✅ 导入音频文件到 `public/audio/speaker/`
3. ✅ 导入 JSON 数据到数据库
4. ✅ 创建 `getSpeakerAudioUrl()` 工具函数
5. ✅ 修改 `AppSidebar.tsx`（移除 comingSoon）
6. ✅ 扩展 `useTTS` Hook（支持 start_time/end_time）

**产出物**：
- 5 张数据库表
- 音频文件就位
- 导航菜单可点击进入 `/speaker`

---

### 阶段 2：首页与时间轴（第 2-3 周）

**任务清单**：
1. ✅ 创建 `src/app/speaker/page.tsx`（文章列表页）
2. ✅ 创建 `src/components/speaker/ArticleCard.tsx`
3. ✅ 创建 `src/app/api/speaker/articles/route.ts`
4. ✅ 创建 `src/app/speaker/[articleId]/page.tsx`（时间轴页）
5. ✅ 创建 `src/components/speaker/TimelineCard.tsx`
6. ✅ 创建 `src/app/api/speaker/[articleId]/route.ts`

**产出物**：
- 可浏览文章列表
- 可进入时间轴页
- 可看到 4 步骤导航

---

### 阶段 3：Step 1 盲听（第 3 周）

**任务清单**：
1. ✅ 创建 `src/app/speaker/[articleId]/step1/page.tsx`
2. ✅ 创建 `src/components/speaker/AudioPlayer.tsx`
3. ✅ 实现语速调节（0.5x - 1.5x）
4. ✅ 实现断点续播（localStorage）
5. ✅ 实现鼓励语滚动（Marquee）

**产出物**：
- 可播放整段音频
- 可调节语速
- 可断点续播
- 可进入 Step 2

---

### 阶段 4：Step 2 听写（第 4-6 周，⚠️ 最复杂）

**任务清单**：
1. ✅ 创建 `src/app/speaker/[articleId]/step2/page.tsx`
2. ✅ 创建 `src/components/speaker/SplitLayout.tsx`（左右分栏）
3. ✅ 创建 `src/components/speaker/MaskedText.tsx`（原文遮罩）
   - PC 端：鼠标悬停显示
   - 移动端：按住显示按钮
   - 全局开关
4. ✅ 创建 `src/components/speaker/DictationInput.tsx`（填空流）
   - 单词输入框（下划线样式）
   - 空格跳转
   - 右键放弃
   - 移动端键盘适配
5. ✅ 实现双栏同步滚动
6. ✅ 实现单句自动暂停（监听 timeupdate）
7. ✅ 创建 `src/app/api/speaker/dictation/submit/route.ts`（判分逻辑）
8. ✅ 创建 `src/components/speaker/SubmissionModal.tsx`（结果弹窗）
9. ✅ 创建 `src/app/api/speaker/ghost-words/route.ts`（生词本生成）

**产出物**：
- 完整的听写训练流程
- 自动生成魔鬼生词本
- 历史记录保存

---

### 阶段 5：Step 3 背诵（第 7 周）

**任务清单**：
1. ✅ 创建 `src/app/speaker/[articleId]/step3/page.tsx`
2. ✅ 创建 `src/components/speaker/RecitationItem.tsx`
3. ✅ 实现单句播放 + 自动暂停
4. ✅ 实现已练习标记（绿色竖条）
5. ✅ 实现掌握勾选框
6. ✅ 更新 `speaker_progress.step3_practiced_sentences`

**产出物**：
- 可逐句播放背诵
- 可标记已掌握句子
- 全文掌握后可进入 Step 4

---

### 阶段 6：Step 4 KTV 对比（第 7-8 周）

**任务清单**：
1. ✅ 创建 `src/app/speaker/[articleId]/step4/page.tsx`
2. ✅ 创建 `src/components/speaker/KTVText.tsx`
   - 监听 `audio.currentTime`
   - 根据时间戳计算当前句
   - 高亮 + scrollIntoView 居中
3. ✅ 实现"我已学完"按钮
4. ✅ 更新 `speaker_progress` 状态为 `completed`

**产出物**：
- KTV 模式对比训练
- 完成学习后首页显示"COMPLETED"印章

---

### 阶段 7：魔鬼生词本（第 8 周）

**任务清单**：
1. ✅ 创建 `src/app/speaker/ghost-words/page.tsx`
2. ✅ 创建 `src/components/speaker/GhostWordCard.tsx`
3. ✅ 集成有道 API（后端代理）
4. ✅ 实现原声回放（播放单词所在句）
5. ✅ 实现上下文回溯（跳转回 Step 2 + 锚点定位）
6. ✅ 实现"我已掌握"功能

**产出物**：
- 完整的魔鬼生词本功能
- 可消灭错词
- 可回溯上下文

---

## 6️⃣ 代码复用矩阵

### 6.1 组件级复用

```typescript
// ✅ 直接复用
import { useTTS } from '@/hooks/use-tts'
import { useTheme } from '@/contexts/ThemeContext'
import { useLoading } from '@/components/LoadingOverlay'
import { AppSidebar } from '@/components/AppSidebar'

// 🔄 扩展现有组件
import { BookCard } from '@/components/BookCard'
// 参考 BookCard 的设计，新建 SpeakerArticleCard.tsx

import { SplitLayout } from '@/components/layout/SplitLayout'
// 复用 SplitLayout，但演说家需要左右分栏（而非上下）
```

### 6.2 工具函数级复用

```typescript
// ✅ 直接复用
import { getSpeakerAudioUrl } from '@/lib/speaker-audio'
import { uploadToOSS } from '@/lib/oss'
import { logger } from '@/lib/logger'

// 🍊 新建工具函数
// src/lib/speaker-dictation.ts - 听写判分逻辑
// src/lib/speaker-progress.ts - 进度管理
// src/lib/ktv-scroller.ts - KTV 滚动逻辑
```

---

## 7️⃣ 最小侵入修改方案

### 7.1 导航栏修改（唯一需要修改的现有组件）

**文件**: `src/components/AppSidebar.tsx`

**修改内容**：仅 1 行代码

```typescript
// 第 28 行，移除 comingSoon: true
{ label: '演说家', href: '/speaker', icon: Mic },
```

**风险评估**：🟢 低风险
- 仅影响演说家入口
- 不影响其他导航项
- 可逆修改（出现问题可立即回滚）

---

### 7.2 TTS Hook 扩展（向下兼容）

**文件**: `src/hooks/use-tts.ts`

**修改内容**：新增 2 个可选参数

```typescript
export interface UseTTSOptions {
  type?: '1' | '2'
  showFallbackToast?: boolean
  startTime?: number  // 🆕 可选参数
  endTime?: number    // 🆕 可选参数
}
```

**风险评估**：🟡 中风险
- 新参数为可选，默认值为 undefined
- 不传新参数时，行为与原函数完全一致
- 传新参数时，启用时间范围播放功能
- 需要充分测试单词音频播放（确保不受影响）

**测试策略**：
1. 单元测试：验证不传参数时行为不变
2. 集成测试：在词库页面测试单词音频
3. 回归测试：运行现有功能的测试用例

---

## 8️⃣ 架构一致性保证

### 8.1 路由结构（App Router）

```
src/app/speaker/
├── page.tsx                    # 首页
├── ghost-words/
│   └── page.tsx                # 魔鬼生词本
└── [articleId]/
    ├── page.tsx                # 时间轴页
    ├── step1/
    │   └── page.tsx            # 盲听
    ├── step2/
    │   └── page.tsx            # 听写
    ├── step3/
    │   └── page.tsx            # 背诵
    └── step4/
        └── page.tsx            # KTV 对比
```

**符合现有架构**：
- ✅ 使用 App Router（非 Pages Router）
- ✅ 使用 Server Components + Client Components 混合
- ✅ 使用 `src/app/api/` 组织 API 路由
- ✅ 使用 `src/components/` 组织组件

### 8.2 样式系统一致性

```typescript
// ✅ 复用 CSS 变量
style={{
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-primary)',
  borderColor: 'var(--border)'
}}

// ✅ 复用 Tailwind 类名
className="border-[3px] border-black rounded font-bold transition-colors"

// ✅ 复用主题切换
import { useTheme } from '@/contexts/ThemeContext'
const { theme } = useTheme()
const isDark = theme === 'dark'
```

### 8.3 状态管理模式

```typescript
// ✅ 使用 React Hooks（不引入 Redux/Zustand）
const [state, setState] = useState()

// ✅ 使用自定义 Hooks（符合现有模式）
import { useTTS } from '@/hooks/use-tts'
import { useLoading } from '@/components/LoadingOverlay'
```

---

## 9️⃣ 文件清单总结

### 9.1 需要修改的现有文件（2 个）

| 文件 | 修改类型 | 代码行数 | 风险等级 |
|------|---------|---------|---------|
| `src/components/AppSidebar.tsx` | 删除 1 个属性 | -1 行 | 🟢 低 |
| `src/hooks/use-tts.ts` | 新增 2 个可选参数 | +20 行 | 🟡 中 |

**总计**：2 个文件，净增 19 行代码

---

### 9.2 需要新建的文件（30+ 个）

#### 数据库（1 个）
- `supabase/migrations/20260205_create_speaker_tables.sql`

#### 页面（7 个）
- `src/app/speaker/page.tsx`
- `src/app/speaker/ghost-words/page.tsx`
- `src/app/speaker/[articleId]/page.tsx`
- `src/app/speaker/[articleId]/step1/page.tsx`
- `src/app/speaker/[articleId]/step2/page.tsx`
- `src/app/speaker/[articleId]/step3/page.tsx`
- `src/app/speaker/[articleId]/step4/page.tsx`

#### API 路由（5 个）
- `src/app/api/speaker/articles/route.ts`
- `src/app/api/speaker/[articleId]/route.ts`
- `src/app/api/speaker/[articleId]/progress/route.ts`
- `src/app/api/speaker/dictation/submit/route.ts`
- `src/app/api/speaker/ghost-words/route.ts`

#### 组件（10+ 个）
- `src/components/speaker/ArticleCard.tsx`
- `src/components/speaker/TimelineCard.tsx`
- `src/components/speaker/AudioPlayer.tsx`
- `src/components/speaker/SplitLayout.tsx`
- `src/components/speaker/MaskedText.tsx`
- `src/components/speaker/DictationInput.tsx`
- `src/components/speaker/SubmissionModal.tsx`
- `src/components/speaker/GhostWordCard.tsx`
- `src/components/speaker/RecitationItem.tsx`
- `src/components/speaker/KTVText.tsx`

#### 工具函数（3+ 个）
- `src/lib/speaker-audio.ts` ✅ 已创建
- `src/lib/speaker-dictation.ts`（待创建）
- `src/lib/speaker-progress.ts`（待创建）

**总计**：30+ 个新文件

---

## 🔟 风险控制与回滚计划

### 10.1 紧急回滚方案

如果新功能出现问题，可立即回滚：

#### 方案 A：禁用演说家入口（30 秒）
```typescript
// 修改 AppSidebar.tsx，恢复 comingSoon
{ label: '演说家', href: '/speaker', icon: Mic, comingSoon: true },
```

#### 方案 B：删除路由（5 分钟）
```bash
# 删除演说家相关路由
rm -rf src/app/speaker
```

#### 方案 C：数据库回滚（1 分钟）
```bash
# 删除演说家表
psql -f supabase/migrations/rollback_speaker.sql
```

### 10.2 灰度发布策略

1. **第 1 周**：仅完成基础设施（数据库表 + 音频文件）
2. **第 2-3 周**：完成首页 + 时间轴 + Step 1（低风险功能）
3. **第 4-6 周**：完成 Step 2（核心功能，充分测试）
4. **第 7-8 周**：完成 Step 3 + Step 4 + 生词本

---

## 1️⃣1️⃣ 最终建议

### ✅ 可以立即开始的工作

1. ✅ 创建数据库表（SQL 迁移文件）
2. ✅ 导入音频文件和 JSON 数据
3. ✅ 修改 `AppSidebar.tsx`（移除 comingSoon）
4. ✅ 创建 `src/app/speaker/page.tsx`（首页）

### ⏸️ 需要谨慎处理的工作

1. ⏸️ 扩展 `useTTS` Hook（需要充分测试）
2. ⏸️ 开发 Step 2 听写功能（最复杂，需要多轮测试）

### 🎯 推荐开发顺序

```
第 1 天：数据库 + 音频文件 + 导航栏
第 2-3 天：首页（文章列表）
第 4-5 天：时间轴页 + Step 1 盲听
第 6-10 天：Step 2 听写（核心功能）
第 11-13 天：Step 3 背诵 + Step 4 对比
第 14-15 天：魔鬼生词本 + 优化调整
```

---

**文档结束**

**下一步行动**：等待你的指令，开始执行第一阶段任务。
