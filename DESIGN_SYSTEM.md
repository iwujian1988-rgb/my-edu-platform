# 小语笔记 - 设计系统文档

> **Last Updated**: 2024-01-05
> **Version**: 1.0.0
> **Status**: Active

## 📋 目录

1. [核心原则](#核心原则)
2. [色彩系统](#色彩系统)
3. [字体系统](#字体系统)
4. [组件规范](#组件规范)
5. [布局规范（iPad First）](#布局规范ipad-first)
6. [间距与尺寸](#间距与尺寸)
7. [可复用组件库](#可复用组件库)
8. [开发检查清单](#开发检查清单)

---

## 🎯 核心原则

### 设计理念
- **Educational Platform**: 现代、友好、专业的教育平台风格
- **Clean & Accessible**: 简洁清晰，易于访问
- **iPad First**: 优先考虑平板设备体验
- **Touch-Friendly**: 所有交互元素适合触摸操作

### 技术栈
- Tailwind CSS 4.x
- React 19 / Next.js 16
- TypeScript
- Lucide Icons

---

## 🎨 色彩系统

### 主色调
```css
--primary-green: #4CAF50;      /* 主按钮、CTA */
--primary-green-hover: #45A049;
--secondary-blue: #87CEEB;     /* 次按钮、辅助元素 */
--secondary-blue-hover: #7DD3E8;
--accent-orange: #FF8C61;      /* 强调、警告 */
```

### 背景色
```css
--bg-primary: #F8F5F2;         /* 主背景（浅米色） */
--bg-card: #FFFFFF;            /* 卡片背景 */
--bg-input: #F7FAFC;           /* 输入框背景 */
```

### 文字色
```css
--text-primary: #2D3748;       /* 主要文字 */
--text-secondary: #718096;     /* 次要文字 */
--text-muted: #A0AEC0;         /* 弱化文字 */
```

### 边框色
```css
--border-default: #E2E8F0;     /* 默认边框 */
--border-focus: #4CAF50;       /* 聚焦边框 */
```

### 渐变色
```css
/* 主按钮渐变 */
gradient-primary: linear-gradient(135deg, #4CAF50 0%, #45A049 100%);

/* 副按钮渐变 */
gradient-secondary: linear-gradient(135deg, #87CEEB 0%, #7DD3E8 100%);

/* 强调渐变 */
gradient-accent: linear-gradient(135deg, #FF8C61 0%, #FF7A4D 100%);
```

---

## ✏️ 字体系统

### 字体族
```css
/* 标题字体 */
font-heading: 'Fredoka', sans-serif;

/* 正文字体 */
font-body: 'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### 字号规范（适配平板）
```tsx
// 标题
text-5xl: 48px   // 主标题（H1）
text-4xl: 36px   // 二级标题（H2）
text-3xl: 30px   // 三级标题（H3）
text-2xl: 24px   // 四级标题（H4）
text-xl: 20px    // 五级标题（H5）

// 正文
text-lg: 18px    // 重要文字（平板基础字号）
text-base: 16px  // 正文（标准）
text-sm: 14px    // 辅助文字
text-xs: 12px    // 标签、注释
```

### 字重
```tsx
font-black: 900  // 强调标题
font-bold: 700   // 标题、按钮
font-semibold: 600  // 重要文字
font-medium: 500  // 正文
```

---

## 🧩 组件规范

### 按钮

#### 主按钮（绿色）
```tsx
<button className="btn-primary">
  <Sparkles className="w-5 h-5" />
  <span>立即开始</span>
</button>
```
**样式要求**:
- 最小高度: `64px` (平板)
- 背景: 绿色渐变 `linear-gradient(135deg, #4CAF50 0%, #45A049 100%)`
- 文字: 白色、粗体、`text-lg`
- 阴影: `0 4px 8px rgba(76, 175, 80, 0.3)`
- 圆角: `0.75rem` (12px)

#### 副按钮（蓝色）
```tsx
<button className="btn-secondary">
  <span>了解更多</span>
  <ChevronRight className="w-5 h-5" />
</button>
```
**样式要求**:
- 最小高度: `64px` (平板)
- 背景: 蓝色渐变 `linear-gradient(135deg, #87CEEB 0%, #7DD3E8 100%)`
- 文字: 深灰色 `#2D3748`、粗体、`text-lg`
- 阴影: `0 4px 8px rgba(135, 206, 235, 0.3)`

### 输入框

```tsx
<div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>
  <input
    type="text"
    placeholder="请输入..."
    className="w-full bg-transparent border-none outline-none
                   text-gray-800 placeholder-gray-400
                   font-semibold text-lg"
  />
</div>
```

**样式要求**:
- 容器: 最小高度 `56px`
- 内边距: `px-5 py-4`
- 背景: 白色卡片
- 边框: `2px solid #E2E8F0`
- 圆角: `0.75rem`
- 文字: `text-lg` (18px)
- Placeholder: 灰色 `#A0AEC0`

### 卡片

```tsx
<div className="clay-card p-8">
  {/* 内容 */}
</div>
```

**样式要求**:
- 背景: 白色 `#FFFFFF`
- 边框: `2px solid #E2E8F0`
- 圆角: `0.75rem`
- 阴影: `0 1px 3px rgba(0, 0, 0, 0.05)`
- 悬停: `0 4px 6px rgba(0, 0, 0, 0.07)` + `translateY(-2px)`

### 图标容器

```tsx
<div className="clay-icon w-14 h-14">
  <Target className="w-7 h-7 text-blue-600" />
</div>
```

**样式要求**:
- 尺寸: 根据内容调整（常用 `w-12 h-12`, `w-14 h-14`）
- 背景: `#F7FAFC`
- 边框: `2px solid #E2E8F0`
- 圆角: `0.75rem`
- 图标: `w-7 h-7` (平板)

---

## 📱 布局规范（iPad First）

### 响应式断点

```tsx
// Mobile First 策略
Mobile:    < 768px   (手机竖屏)
Tablet:     768px - 1024px  (平板竖屏)
Desktop:   1024px - 1280px  (平板横屏、小桌面)
Large:     > 1280px   (大桌面)
```

### 网格布局规则

#### ✅ 好的做法（充分利用屏幕）
```tsx
// 平板横屏：2-3列
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 卡片 */}
</div>

// 平板横屏：左右分栏
<div className="grid grid-cols-1 lg:grid-cols-2">
  <div>左侧内容（品牌展示）</div>
  <div>右侧内容（表单）</div>
</div>
```

#### ❌ 错误的做法（浪费空间）
```tsx
// 避免在平板上使用窄容器
<div className="max-w-md mx-auto">  {/* ❌ 在平板上太窄 */}
  {/* 内容 */}
</div>

// 正确做法
<div className="w-full max-w-7xl mx-auto px-4">  {/* ✅ 充分利用 */}
  {/* 内容 */}
</div>
```

### 触摸目标规范

所有可点击元素必须满足：
- **最小高度**: `48px` (推荐 `56px` - `64px`)
- **最小宽度**: `48px`
- **内边距**: 至少 `12px`

```tsx
// ✅ 好的按钮
<button className="min-h-[56px] px-6 py-4">
  点击我
</button>

// ❌ 太小的按钮
<button className="h-8 px-2 py-1">  {/* ❌ 小于48px */}
  点击
</button>
```

### 字号适配

平板设备上使用更大的字号：

```tsx
// Mobile
<p className="text-base">16px</p>

// Tablet (md, lg)
<p className="text-lg">18px</p>

// 标题也要更大
<h1 className="text-5xl md:text-6xl">主标题</h1>
```

---

## 📏 间距与尺寸

### 间距系统（基于 Tailwind）

```tsx
spacing-1: 4px
spacing-2: 8px
spacing-3: 12px
spacing-4: 16px   // 卡片内边距
spacing-6: 24px   // 元素间距
spacing-8: 32px   // 区块间距
spacing-12: 48px  // 大区块间距
spacing-16: 64px
```

### 常用间距

```tsx
// 卡片内边距
p-6: 24px        // 小卡片
p-8: 32px        // 标准卡片
p-12: 48px       // 大卡片

// 元素间距
gap-4: 16px      // 紧凑
gap-6: 24px      // 标准
gap-8: 32px      // 宽松

// 网格间距
gap-4 md:gap-6 lg:gap-8
```

---

## 🧰 可复用组件库

### 布局组件

#### 1. PageContainer（页面容器）
```tsx
// src/components/layout/PageContainer.tsx
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  )
}
```

#### 2. SplitLayout（左右分栏布局）
```tsx
// src/components/layout/SplitLayout.tsx
interface SplitLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      <div className="hidden lg:flex flex-col justify-center p-12">
        {left}
      </div>
      <div className="flex flex-col justify-center p-6 lg:p-12">
        {right}
      </div>
    </div>
  )
}
```

#### 3. CardGrid（卡片网格）
```tsx
// src/components/layout/CardGrid.tsx
interface CardGridProps {
  children: React.ReactNode
}

export function CardGrid({ children }: CardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  )
}
```

### 表单组件

#### 1. FormInput（标准输入框）
```tsx
// src/components/form/FormInput.tsx
interface FormInputProps {
  label: string
  icon?: React.ReactNode
  type?: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function FormInput({
  label,
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false
}: FormInputProps) {
  return (
    <div>
      <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none
                         text-gray-800 placeholder-gray-400
                         font-semibold text-lg"
          required={required}
        />
      </div>
    </div>
  )
}
```

#### 2. PrimaryButton（主按钮）
```tsx
// src/components/form/PrimaryButton.tsx
interface PrimaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button'
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full clay-button-primary text-lg py-5
                 shadow-lg hover:shadow-xl transition-all duration-300
                 disabled:opacity-60 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
      style={{ minHeight: '64px' }}
    >
      {loading ? '加载中...' : children}
    </button>
  )
}
```

### 显示组件

#### 1. FeatureCard（功能卡片）
```tsx
// src/components/display/FeatureCard.tsx
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color?: 'green' | 'blue' | 'orange' | 'purple'
}

export function FeatureCard({ icon, title, description, color = 'green' }: FeatureCardProps) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600'
  }

  return (
    <div className="clay-card p-8 hover:scale-105 transition-transform">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 clay-icon flex items-center justify-center">
          <span className={colorClasses[color]}>{icon}</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-base text-gray-600 font-medium leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## ✅ 开发检查清单

### 新页面开发前

- [ ] 阅读本设计系统文档
- [ ] 确定页面类型（登录页、仪表盘、列表页等）
- [ ] 选择合适的页面模板
- [ ] 规划响应式布局（Mobile / Tablet / Desktop）

### 开发过程中

#### 样式检查
- [ ] 使用正确的色彩（绿色主按钮、蓝色副按钮）
- [ ] 背景色为 `#F8F5F2`（浅米色）
- [ ] 卡片背景为白色，边框 `#E2E8F0`
- [ ] 标题使用 Fredoka 字体
- [ ] 正文使用 Nunito 字体

#### 布局检查
- [ ] iPad 横屏下内容充分利用屏幕宽度
- [ ] 避免使用 `max-w-md` 等窄容器
- [ ] 使用响应式网格：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- [ ] Mobile 单列，Tablet 2-3列

#### 触摸目标检查
- [ ] 所有按钮高度 ≥ 48px（推荐 56-64px）
- [ ] 所有输入框高度 ≥ 48px（推荐 56px）
- [ ] 所有可点击元素有足够的内边距

#### 字号检查
- [ ] 平板上基础字号使用 `text-lg` (18px)
- [ ] 标题字号 `text-4xl` 或更大
- [ ] 正文不小于 `text-base` (16px)

### 开发完成后

- [ ] 在 Mobile 视图测试（375px）
- [ ] 在 Tablet Portrait 测试（768px）
- [ ] 在 Tablet Landscape 测试（1024px）
- [ ] 在 Desktop 测试（1280px+）
- [ ] 测试所有触摸目标
- [ ] 检查颜色对比度
- [ ] 验证所有交互状态（hover, active, focus）

---

## 📚 页面模板

### 1. 登录/注册页模板
```tsx
// 使用 SplitLayout 组件
<SplitLayout
  left={<BrandSection />}
  right={<AuthForm />}
/>
```

### 2. 仪表盘页模板
```tsx
<PageContainer>
  <Header />
  <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* 内容卡片 */}
  </main>
</PageContainer>
```

### 3. 列表页模板
```tsx
<PageContainer>
  <Header />
  <FilterBar />
  <CardGrid>
    {items.map(item => (
      <ItemCard key={item.id} {...item} />
    ))}
  </CardGrid>
</PageContainer>
```

---

## 🔧 实用工具

### Tailwind 配置检查

在 `tailwind.config.ts` 中确保：
```ts
theme: {
  extend: {
    colors: {
      primary: '#4CAF50',
      secondary: '#87CEEB',
      background: '#F8F5F2',
    },
    fontFamily: {
      heading: ['Fredoka', 'sans-serif'],
      body: ['Nunito', 'sans-serif'],
    },
  }
}
```

### CSS 变量检查

在 `globals.css` 中确保定义了所有必要变量。

---

## 📖 参考资源

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/icons/)
- [iPad 人机界面指南](https://developer.apple.com/design/human-interface-guidelines/ipad)
- [Web 内容可访问性指南 (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

---

**维护者**: 开发团队
**更新频率**: 每个迭代周期更新
**问题反馈**: 在项目 Issues 中提交
