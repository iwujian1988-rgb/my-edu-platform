# 开发指南 - 小语笔记

> **确保所有页面遵循设计规范的快速参考**

## 🚀 快速开始

### 1. 新页面开发流程

#### Step 1: 选择模板
```
登录/注册页 → 使用 SplitLayout
仪表盘页     → 使用 PageContainer + CardGrid
列表页       → 使用 PageContainer + FilterBar
详情页       → 使用 PageContainer
```

#### Step 2: 使用可复用组件
```tsx
// ✅ 好的做法 - 使用组件库
import { SplitLayout } from '@/components/layout/SplitLayout'
import { FormInput } from '@/components/form/FormInput'
import { PrimaryButton } from '@/components/form/PrimaryButton'

<FormInput
  label="手机号"
  icon={<Mail className="w-5 h-5 text-green-600" />}
  type="tel"
  placeholder="请输入手机号"
  value={phone}
  onChange={setPhone}
  required
/>

// ❌ 不好的做法 - 手写样式
<input className="px-4 py-2 border rounded" />
```

#### Step 3: 遵循响应式规则
```tsx
// ✅ 好的做法 - iPad First
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// ❌ 不好的做法 - 浪费平板空间
<div className="max-w-md mx-auto">
```

---

## 📋 必须遵守的规则

### 1. 颜色使用

#### 按钮
```tsx
// ✅ 主按钮 - 绿色
<button className="clay-button-primary">
  <PrimaryButton>提交</PrimaryButton>
</button>

// ✅ 副按钮 - 蓝色
<button className="clay-button-secondary">
  <SecondaryButton>取消</SecondaryButton>
</button>

// ❌ 不要使用其他颜色
<button className="bg-red-500">错误</button>
```

#### 背景
```tsx
// ✅ 正确
<div style={{ backgroundColor: '#F8F5F2' }}>
<div className="bg-[#F8F5F2]">

// ❌ 错误
<div className="bg-white">
<div className="bg-gray-100">
```

### 2. 字体使用

```tsx
// ✅ 标题自动使用 Fredoka（在 globals.css 中定义）
<h1 className="text-5xl font-black">标题</h1>

// ✅ 正文自动使用 Nunito（在 globals.css 中定义）
<p className="text-lg font-semibold">正文</p>

// ❌ 不要硬编码字体
<h1 style={{ fontFamily: 'Arial' }}>
```

### 3. 触摸目标

```tsx
// ✅ 所有按钮 ≥ 56px
<button style={{ minHeight: '56px' }}>按钮</button>

// ✅ 所有输入框 ≥ 56px
<div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>

// ❌ 太小
<button className="h-8">太小了</button>
```

### 4. 布局规则

```tsx
// ✅ 平板横屏：充分利用宽度
<div className="w-full max-w-7xl mx-auto">

// ✅ 平板横屏：左右分栏
<div className="grid grid-cols-1 lg:grid-cols-2">

// ✅ 平板横屏：3列网格
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// ❌ 平板横屏：窄容器（浪费空间）
<div className="max-w-md mx-auto">

// ❌ 移动端：多列（太小）
<div className="grid grid-cols-4">
```

---

## 🧩 组件使用示例

### 登录页示例

```tsx
'use client'

import { SplitLayout } from '@/components/layout/SplitLayout'
import { FormInput } from '@/components/form/FormInput'
import { PrimaryButton } from '@/components/form/PrimaryButton'
import { SecondaryButton } from '@/components/form/SecondaryButton'
import { GraduationCap, Target, Trophy, Zap } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      <SplitLayout
        // 左侧 - 品牌展示
        left={
          <div className="max-w-xl w-full space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 clay-card clay-icon mb-8 float-animation">
                <GraduationCap className="w-16 h-16 text-green-600" />
              </div>
              <h1 className="text-5xl font-black mb-4" style={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                小语笔记
              </h1>
            </div>

            {/* 功能展示 */}
            <FeatureCard
              icon={<Target className="w-7 h-7" />}
              title="AI 智能推荐"
              description="根据学习水平智能推荐"
              color="blue"
            />
          </div>
        }

        // 右侧 - 登录表单
        right={
          <div className="w-full max-w-2xl mx-auto">
            <div className="clay-card p-8 lg:p-12">
              <FormInput
                label="手机号"
                icon={<Mail className="w-5 h-5 text-green-600" />}
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={setPhone}
                required
              />

              <FormInput
                label="密码"
                icon={<Lock className="w-5 h-5 text-green-600" />}
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={setPassword}
                required
              />

              <PrimaryButton type="submit">
                登录
              </PrimaryButton>
            </div>
          </div>
        }
      />
    </div>
  )
}
```

### 仪表盘页示例

```tsx
import { PageContainer } from '@/components/layout/PageContainer'
import { FeatureCard } from '@/components/display/FeatureCard'

export default function DashboardPage() {
  return (
    <PageContainer>
      {/* 标题 */}
      <h1 className="text-4xl font-black mb-8">
        欢迎回来
      </h1>

      {/* 卡片网格 - iPad 横屏显示 3 列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          icon={<Target className="w-7 h-7" />}
          title="功能 1"
          description="描述文字"
          color="green"
        />
        <FeatureCard
          icon={<Trophy className="w-7 h-7" />}
          title="功能 2"
          description="描述文字"
          color="orange"
        />
        <FeatureCard
          icon={<Zap className="w-7 h-7" />}
          title="功能 3"
          description="描述文字"
          color="blue"
        />
      </div>
    </PageContainer>
  )
}
```

---

## 🎨 常用样式片段

### 卡片样式
```tsx
// 标准卡片
<div className="clay-card p-8">

// 卡片网格
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div className="clay-card p-6">内容</div>
</div>
```

### 按钮样式
```tsx
// 主按钮（绿色）
<PrimaryButton>提交</PrimaryButton>

// 副按钮（蓝色）
<SecondaryButton>取消</SecondaryButton>
```

### 输入框样式
```tsx
<FormInput
  label="标签"
  icon={<Icon className="w-5 h-5 text-green-600" />}
  type="text"
  placeholder="占位符"
  value={value}
  onChange={setValue}
  required
/>
```

### 图标容器
```tsx
<div className="clay-icon w-14 h-14">
  <Icon className="w-7 h-7 text-color" />
</div>
```

---

## 📱 响应式测试清单

开发完成后，在以下断点测试：

- [ ] **Mobile**: 375px × 667px (iPhone SE)
- [ ] **Tablet Portrait**: 768px × 1024px (iPad 竖屏)
- [ ] **Tablet Landscape**: 1024px × 768px (iPad 横屏)
- [ ] **Desktop**: 1280px × 800px
- [ ] **Large Desktop**: 1920px × 1080px

### Chrome DevTools 测试
```javascript
// 1. 打开 DevTools (F12)
// 2. 点击设备工具栏图标 (Ctrl+Shift+M)
// 3. 选择预设设备或自定义尺寸
// 4. 测试所有交互元素
```

---

## ⚠️ 常见错误

### ❌ 错误 1: 使用窄容器
```tsx
// ❌ 在平板上浪费空间
<div className="max-w-md mx-auto">

// ✅ 充分利用屏幕
<div className="w-full max-w-7xl mx-auto">
```

### ❌ 错误 2: 触摸目标太小
```tsx
// ❌ 小于 48px
<button className="h-8 px-2">点击</button>

// ✅ 大于 56px
<button className="min-h-[56px] px-6 py-4">点击</button>
```

### ❌ 错误 3: 字号太小
```tsx
// ❌ 平板上太小
<p className="text-sm">正文</p>

// ✅ 平板上合适
<p className="text-lg">正文</p>
```

### ❌ 错误 4: 颜色错误
```tsx
// ❌ 使用非标准颜色
<button className="bg-red-500">按钮</button>

// ✅ 使用标准颜色
<PrimaryButton>按钮</PrimaryButton>
```

---

## ✅ 代码审查检查清单

提交代码前，确认：

### 样式
- [ ] 使用 Educational Platform 配色（绿色主按钮、蓝色副按钮）
- [ ] 背景色为 `#F8F5F2`
- [ ] 卡片使用 `clay-card` 类
- [ ] 图标使用 `clay-icon` 类

### 布局
- [ ] iPad 横屏充分利用屏幕宽度
- [ ] 避免使用 `max-w-md` 等窄容器
- [ ] 使用响应式网格

### 触摸
- [ ] 所有按钮 ≥ 56px
- [ ] 所有输入框 ≥ 56px
- [ ] 所有可点击元素有足够内边距

### 字体
- [ ] 平板基础字号 `text-lg`
- [ ] 标题 ≥ `text-4xl`
- [ ] 正文 ≥ `text-base`

### 组件
- [ ] 优先使用可复用组件
- [ ] 避免重复代码
- [ ] 保持代码整洁

---

## 📚 参考文档

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - 完整设计系统
- [ui_design.md](./ui_design.md) - 设计规范
- [Tailwind CSS](https://tailwindcss.com/docs) - CSS 框架文档

---

**更新日期**: 2024-01-05
**版本**: 1.0.0
