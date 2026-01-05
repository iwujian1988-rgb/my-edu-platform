# UI 设计系统文档 (UI Design System)

**项目**: 小语笔记 - 英语学习平台
**基于**: Educational Platform Design System
**版本**: v1.0
**更新日期**: 2026-01-04

---

## 目录

- [1. 设计原则](#1-设计原则)
- [2. 配色方案](#2-配色方案)
- [3. 字体排版](#3-字体排版)
- [4. 组件样式](#4-组件样式)
- [5. 间距与布局](#5-间距与布局)
- [6. 动画与交互](#6-动画与交互)
- [7. Tailwind 配置](#7-tailwind-配置)

---

## 1. 设计原则

### 核心价值观

- **清晰优先**: 信息层级分明，降低认知负荷
- **友好亲和**: 圆角设计，柔和色彩，营造轻松学习氛围
- **即时反馈**: 每个操作都有明确的视觉/听觉反馈
- **响应式**: 无缝适配 PC、平板、手机
- **无障碍**: 符合 WCAG 2.1 AA 标准

### 视觉语言

- **现代简洁**: 扁平化设计，适度阴影增加层次
- **色彩鲜明**: 主色调体现教育属性，辅助色点缀提升活力
- **圆角友好**: 统一使用圆角，降低视觉锐度
- **留白充足**: 给内容呼吸空间，提升阅读体验

---

## 2. 配色方案

### 2.1 主色调（Primary Colors）

基于教育平台的 **蓝色系**，传达专业、可信赖的感觉。

```css
/* 主色 - 靛蓝 */
--primary-50: #eef2ff;
--primary-100: #e0e7ff;
--primary-200: #c7d2fe;
--primary-300: #a5b4fc;
--primary-400: #818cf8;
--primary-500: #6366f1;  /* 主色 */
--primary-600: #4f46e5;  /* 主色深 */
--primary-700: #4338ca;
--primary-800: #3730a3;
--primary-900: #312e81;
```

**使用场景**:
- 主要按钮（CTA）
- 导航激活状态
- 链接文字
- 重要信息强调

---

### 2.2 辅助色（Secondary Colors）

**绿色** - 成功/正确状态

```css
--success-50: #f0fdf4;
--success-100: #dcfce7;
--success-200: #bbf7d0;
--success-300: #86efac;
--success-400: #4ade80;
--success-500: #22c55e;  /* 成功主色 */
--success-600: #16a34a;
```

**使用场景**:
- "认识"状态标记
- 正确答案反馈
- 成功提示
- 进度条完成状态

---

**红色** - 错误/危险状态

```css
--danger-50: #fef2f2;
--danger-100: #fee2e2;
--danger-200: #fecaca;
--danger-300: #fca5a5;
--danger-400: #f87171;
--danger-500: #ef4444;  /* 错误主色 */
--danger-600: #dc2626;
```

**使用场景**:
- "不认识"状态标记
- 错误答案反馈
- 删除确认
- 警告提示

---

**黄色** - 警告/模糊状态

```css
--warning-50: #fefce8;
--warning-100: #fef9c3;
--warning-200: #fef08a;
--warning-300: #fde047;
--warning-400: #facc15;
--warning-500: #eab308;  /* 警告主色 */
--warning-600: #ca8a04;
```

**使用场景**:
- "模糊"状态标记
- 待处理事项
- 配额不足提示

---

### 2.3 中性色（Neutral Colors）

```css
/* 灰色系 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

**使用场景**:
- 文本内容（gray-600, gray-700）
- 边框分割线（gray-200, gray-300）
- 背景色（gray-50, gray-100）
- 占位符文字（gray-400）

---

### 2.4 语义化颜色映射

```typescript
// src/lib/colors.ts
export const colors = {
  // 单词状态
  status: {
    known: '#22c55e',      // 认识 - 绿色
    vague: '#eab308',      // 模糊 - 黄色
    unknown: '#ef4444',    // 不认识 - 红色
    new: '#9ca3af',        // 未标注 - 灰色
  },

  // 练习反馈
  feedback: {
    correct: '#22c55e',    // 正确 - 绿色
    wrong: '#ef4444',      // 错误 - 红色
  },

  // 书籍分类
  category: {
    exam: '#6366f1',       // 考试 - 靛蓝
    scenario: '#8b5cf6',   // 场景 - 紫色
    textbook: '#06b6d4',   // 教材 - 青色
    custom: '#f59e0b',     // 自定义 - 橙色
  },
}
```

---

## 3. 字体排版

### 3.1 字体栈（Font Stack）

```css
/* 主要字体 - 系统默认 */
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* 等宽字体 - 用于代码 */
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas,
             "Liberation Mono", "Courier New", monospace;

/* IPA 音标字体 - 用于音标 */
--font-ipa: "Lucida Sans Unicode", "Arial Unicode MS", "Times New Roman", serif;
```

### 3.2 字体大小（Type Scale）

基于 **1.250**（Major Third）比例，确保良好的层级关系。

```css
/* Tailwind Typography Scale */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */
```

### 3.3 字重（Font Weight）

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 3.4 行高（Line Height）

```css
--leading-tight: 1.25;   /* 标题 */
--leading-snug: 1.375;
--leading-normal: 1.5;   /* 正文 */
--leading-relaxed: 1.625;
--leading-loose: 2;      /* 特殊强调 */
```

### 3.5 应用实例

```typescript
// 标题层级
export const typography = {
  h1: 'text-4xl font-bold leading-tight',        // 36px / 页面主标题
  h2: 'text-3xl font-bold leading-tight',        // 30px / 区块标题
  h3: 'text-2xl font-semibold leading-tight',    // 24px / 章节标题
  h4: 'text-xl font-semibold leading-snug',      // 20px / 卡片标题
  h5: 'text-lg font-medium leading-snug',        // 18px / 小标题

  // 正文
  body: 'text-base text-gray-700 leading-normal',    // 16px / 正文
  bodyLarge: 'text-lg text-gray-700 leading-relaxed', // 18px / 大段文字
  small: 'text-sm text-gray-600 leading-normal',      // 14px / 辅助文字

  // 特殊用途
  word: 'text-2xl font-semibold text-gray-900',      // 单词展示
  phonetic: 'text-base text-gray-500 font-normal',   // 音标
  definition: 'text-base text-gray-700 leading-relaxed', // 释义
}
```

---

## 4. 组件样式

### 4.1 卡片（Cards）

#### 基础卡片

```tsx
// components/ui/card.tsx
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  )
}
```

**样式规格**:
- `border-radius`: `0.75rem` (12px)
- `border`: `1px solid #e5e7eb` (gray-200)
- `background`: `#ffffff`
- `shadow`: `0 1px 3px rgba(0, 0, 0, 0.1)` (shadow-sm)
- `padding`: `1.5rem` (24px)

---

#### 单词书卡片（Book Card）

```tsx
// components/book/BookCard.tsx
export function BookCard({ book }: { book: Book }) {
  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* 封面图 */}
      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-100 mb-4">
        <img
          src={book.coverUrl}
          alt={book.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
        {book.title}
      </h3>

      {/* 描述 */}
      <p className="text-sm text-gray-600 line-clamp-2 mt-2">
        {book.description}
      </p>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <BookOpen className="h-4 w-4" />
          {book.totalWords} 词
        </span>
        <span className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          {book.totalChapters} 章
        </span>
      </div>

      {/* 学习状态 */}
      {book.isLearning && (
        <Badge className="mt-3" variant="secondary">
          学习中
        </Badge>
      )}
    </Card>
  )
}
```

**交互状态**:
- **Hover**:
  - `shadow-lg`: 阴影加深
  - `-translate-y-1`: 向上浮动 4px
  - 封面图放大 1.05 倍
- **Transition**: `duration-300` 平滑过渡

---

#### 单词卡片（Word Card）

```tsx
// components/book/WordCard.tsx
export function WordCard({ word, status }: WordCardProps) {
  return (
    <div className="group p-4 rounded-lg border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition-all duration-200">
      {/* 状态标记点 */}
      <button
        className={cn(
          "w-4 h-4 rounded-full border-2 transition-colors",
          status === 'known' && "bg-success-500 border-success-500",
          status === 'vague' && "bg-warning-500 border-warning-500",
          status === 'unknown' && "bg-danger-500 border-danger-500",
          status === 'new' && "border-gray-300"
        )}
      />

      {/* 单词 */}
      <div className="flex items-center gap-3 mt-3">
        <h3 className="text-2xl font-semibold text-gray-900">
          {word.word}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => playAudio(word.word)}
        >
          <Volume2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 音标 */}
      {word.phonetic && (
        <p className="text-sm text-gray-500 font-ipa mt-1">
          /{word.phonetic}/
        </p>
      )}

      {/* 释义 */}
      <div className="mt-3 space-y-2">
        <p className="text-base text-gray-700">
          {word.definition}
        </p>
        {word.collocation && (
          <p className="text-sm text-gray-600">
            搭配：{word.collocation}
          </p>
        )}
        {word.exampleSentence && (
          <p className="text-sm text-gray-500 italic">
            例句：{word.exampleSentence}
          </p>
        )}
      </div>
    </div>
  )
}
```

**样式规格**:
- `padding`: `1rem` (16px)
- `border-radius`: `0.5rem` (8px)
- `border`: `1px solid #e5e7eb`
- `hover`: 边框变为主色，阴影加深

---

### 4.2 按钮（Buttons）

#### 主按钮（Primary Button）

```tsx
// components/ui/button.tsx
export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",

        // Variants
        variant === 'primary' && "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
        variant === 'secondary' && "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
        variant === 'success' && "bg-success-500 text-white hover:bg-success-600 focus:ring-success-500",
        variant === 'danger' && "bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500",
        variant === 'ghost' && "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500",

        // Sizes
        size === 'sm' && "px-3 py-1.5 text-sm rounded-md",
        size === 'md' && "px-4 py-2 text-base rounded-lg",
        size === 'lg' && "px-6 py-3 text-lg rounded-lg",

        className
      )}
      {...props}
    />
  )
}
```

**样式规格**:

| 变体 | 背景色 | 文字色 | Hover |
|------|--------|--------|-------|
| `primary` | `#4f46e5` | `#ffffff` | `#4338ca` |
| `secondary` | `#f3f4f6` | `#111827` | `#e5e7eb` |
| `success` | `#22c55e` | `#ffffff` | `#16a34a` |
| `danger` | `#ef4444` | `#ffffff` | `#dc2626` |
| `ghost` | `transparent` | `#374151` | `#f3f4f6` |

**尺寸**:

| 尺寸 | Padding | 字体大小 | 圆角 |
|------|---------|----------|------|
| `sm` | `0.5rem 0.75rem` | `0.875rem` (14px) | `0.375rem` (6px) |
| `md` | `0.5rem 1rem` | `1rem` (16px) | `0.5rem` (8px) |
| `lg` | `0.75rem 1.5rem` | `1.125rem` (18px) | `0.5rem` (8px) |

**交互状态**:
- **Focus**: `ring-2 ring-offset-2`（2px 外环，4px 偏移）
- **Disabled**: `opacity-50 cursor-not-allowed`
- **Transition**: `duration-200` 平滑过渡

---

#### 圆形按钮（Icon Button）

```tsx
export function IconButton({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-full",
        "transition-all duration-200",
        "hover:bg-gray-100 active:bg-gray-200",
        "focus:outline-none focus:ring-2 focus:ring-primary-500",
        className
      )}
      {...props}
    />
  )
}
```

---

### 4.3 输入框（Inputs）

```tsx
// components/ui/input.tsx
export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full px-4 py-2.5 rounded-lg border",
        "bg-white text-gray-900 placeholder-gray-400",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
        "disabled:bg-gray-50 disabled:cursor-not-allowed",
        error ? "border-danger-500 focus:ring-danger-500" : "border-gray-300",
        className
      )}
      {...props}
    />
  )
}
```

**样式规格**:
- `padding`: `0.625rem 1rem` (10px 16px)
- `border-radius`: `0.5rem` (8px)
- `border`: `1px solid #d1d5db` (gray-300)
- `focus`:
  - `ring-2` (2px 主色外环)
  - `border-transparent`
- `error`: 边框变红色

**状态**:
- **正常**: 灰色边框
- **聚焦**: 主色外环，透明边框
- **错误**: 红色边框 + 红色外环
- **禁用**: 灰色背景，不可点击

---

### 4.4 徽章（Badges）

```tsx
// components/ui/badge.tsx
export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variant === 'default' && "bg-gray-100 text-gray-800",
        variant === 'primary' && "bg-primary-100 text-primary-800",
        variant === 'success' && "bg-success-100 text-success-800",
        variant === 'warning' && "bg-warning-100 text-warning-800",
        variant === 'danger' && "bg-danger-100 text-danger-800",
        className
      )}
      {...props}
    />
  )
}
```

**使用场景**:
- 书籍状态（"学习中" Badge - Primary）
- 单词分类（"考试" Badge - Primary）
- 配额提示（"剩余 50 词" Badge - Warning）

---

### 4.5 进度条（Progress Bar）

```tsx
// components/ui/progress.tsx
export function Progress({ value, max = 100, className }: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className={cn("w-full h-2 bg-gray-200 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-primary-600 transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
```

**样式规格**:
- 高度: `0.5rem` (8px)
- 背景色: `#e5e7eb` (gray-200)
- 填充色: `#4f46e5` (primary-600)
- `transition`: `duration-300 ease-out`（平滑过渡）

---

## 5. 间距与布局

### 5.1 间距系统（Spacing Scale）

基于 **4px** 基准单位的倍数。

```css
--spacing-0: 0;
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */
--spacing-20: 5rem;    /* 80px */
```

### 5.2 容器宽度

```css
/* 最大宽度 */
--container-sm: 640px;   /* 小屏幕 */
--container-md: 768px;   /* 平板 */
--container-lg: 1024px;  /* 桌面 */
--container-xl: 1280px;  /* 大桌面 */
--container-2xl: 1536px; /* 超大屏 */
```

### 5.3 网格布局（Grid Layout）

```tsx
// 单词书卡片网格（响应式）
<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {books.map(book => <BookCard key={book.id} book={book} />)}
</div>
```

**断点**:
- `sm`: `640px`（平板竖屏）- 2 列
- `md`: `768px`（平板横屏）- 2 列
- `lg`: `1024px`（桌面）- 3 列
- `xl`: `1280px`（大桌面）- 4 列
- `2xl`: `1536px`（超大屏）- 5 列

---

## 6. 动画与交互

### 6.1 缓动函数（Easing）

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### 6.2 动画时长

```css
--duration-150: 150ms;  /* 快速反馈（按钮 hover） */
--duration-200: 200ms;  /* 标准过渡 */
--duration-300: 300ms;  /* 平滑动画（卡片浮动） */
--duration-500: 500ms;  /* 复杂动画（页面切换） */
```

### 6.3 常用动画

#### 淡入淡出（Fade）

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fadeIn {
  animation: fadeIn 300ms ease-out;
}
```

#### 滑入（Slide）

```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideIn {
  animation: slideInUp 300ms ease-out;
}
```

#### 震动（Shake - 错误反馈）

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 300ms ease-in-out;
}
```

#### 缩放（Scale - 匹配消除）

```css
@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0);
  }
}

.animate-scaleOut {
  animation: scaleOut 300ms ease-in;
}
```

#### 翻转（Flip - 卡片背单词）

```css
.card-container {
  perspective: 1000px;
}

.card-inner {
  transition: transform 600ms;
  transform-style: preserve-3d;
}

.card-container.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front, .card-back {
  backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
}
```

---

### 6.4 加载状态（Loading）

#### 骨架屏（Skeleton）

```tsx
// components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 rounded",
        className
      )}
    />
  )
}

// 使用示例
<Skeleton className="h-4 w-3/4 mb-2" />
<Skeleton className="h-4 w-1/2 mb-2" />
<Skeleton className="h-32 w-full" />
```

#### 转圈加载（Spinner）

```tsx
// components/ui/spinner.tsx
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-primary-600",
        size === 'sm' && "h-4 w-4 border",
        size === 'md' && "h-8 w-8 border-2",
        size === 'lg' && "h-12 w-12 border-4"
      )}
    />
  )
}
```

---

## 7. Tailwind 配置

### 7.1 扩展配置（tailwind.config.ts）

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主色调
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // 语义化颜色
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },

      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
        ipa: [
          '"Lucida Sans Unicode"',
          '"Arial Unicode MS"',
          '"Times New Roman"',
          'serif',
        ],
      },

      fontSize: {
        '2xs': '0.625rem', // 10px
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      borderRadius: {
        '4xl': '2rem',
      },

      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },

      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-in': 'slideInUp 300ms ease-out',
        'shake': 'shake 300ms ease-in-out',
        'scale-out': 'scaleOut 300ms ease-in',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInUp: {
          from: {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        scaleOut: {
          from: {
            opacity: '1',
            transform: 'scale(1)',
          },
          to: {
            opacity: '0',
            transform: 'scale(0)',
          },
        },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### 7.2 全局样式（globals.css）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 239 84% 58%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 239 84% 58%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  /* 滚动条样式 */
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    @apply bg-gray-100;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded-full;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400;
  }

  /* 文本截断 */
  .line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .line-clamp-3 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}
```

---

## 附录

### A. 设计资源

- **图标**: Lucide React (https://lucide.dev)
- **插画**: undraw.co, storyset.com
- **占位图**: unsplash.com, picsum.photos
- **配色工具**: Coolors, Adobe Color

### B. 无障碍检查清单

- [ ] 所有交互元素可通过键盘访问（Tab 键）
- [ ] 表单输入有明确的 label
- [ ] 颜色对比度符合 WCAG AA 标准（4.5:1）
- [ ] 图片有 alt 文本
- [ ] 按钮有清晰的 focus 状态
- [ ] 动画可被 `prefers-reduced-motion` 禁用

### C. 性能优化建议

- 使用 `will-change` 提示浏览器优化动画
- 大列表使用虚拟滚动（react-window）
- 图片使用 WebP 格式 + 懒加载
- 关键 CSS 内联到 HTML
- 使用 `content-visibility: auto` 优化渲染

---

**文档版本**: v1.0
**最后更新**: 2026-01-04
**设计工具**: Figma, Tailwind CSS, Shadcn/UI
