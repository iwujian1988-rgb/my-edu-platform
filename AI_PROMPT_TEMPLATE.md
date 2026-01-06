# AI Prompt 模板 - 开发新功能

> 使用此模板确保 AI 遵循设计规范

---

## 📋 标准开发 Prompt

### 开发新页面时使用：

```
请帮我开发 [页面名称] 页面，遵循以下规范：

1. 阅读并遵循 .clauderules 文件中的所有规则
2. 阅读 DESIGN_SYSTEM.md 和 DEVELOPMENT_GUIDE.md
3. 使用可复用组件库（优先级最高）：
   - /src/components/layout/SplitLayout.tsx
   - /src/components/layout/PageContainer.tsx
   - /src/components/form/FormInput.tsx
   - /src/components/form/PrimaryButton.tsx
   - /src/components/form/SecondaryButton.tsx
   - /src/components/display/FeatureCard.tsx

4. 必须遵守的规则：
   - 背景色: #F8F5F2（浅米色）
   - 主按钮: 绿色 #4CAF50（使用 <PrimaryButton>）
   - 副按钮: 蓝色 #87CEEB（使用 <SecondaryButton>）
   - 卡片: 白色 #FFFFFF，边框 #E2E8F0
   - iPad First: 平板横屏充分利用屏幕宽度
   - 触摸目标: 所有按钮和输入框 ≥ 56px
   - 字号: 平板上使用 text-lg（18px）

5. 布局要求：
   - 登录/注册页 → 使用 SplitLayout（左右分栏）
   - 仪表盘页 → 使用 PageContainer + 网格布局
   - 列表页 → 使用 PageContainer + CardGrid
   - 避免使用 max-w-md 等窄容器

6. 参考实现：
   - src/app/login/page.tsx（登录页示例）
   - src/app/study/page.tsx（学习中心示例）
   - src/app/page.tsx（首页示例）

页面功能描述：
[在此描述功能需求]

请生成符合上述规范的完整代码。
```

---

## 🎨 快速 Prompt 片段

### 登录页 Prompt
```
开发登录页，使用 SplitLayout 组件，左侧展示品牌信息，右侧放置登录表单。
所有输入框使用 FormInput 组件，提交按钮使用 PrimaryButton 组件。
背景色 #F8F5F2，参考 src/app/login/page.tsx 的实现。
```

### 仪表盘页 Prompt
```
开发仪表盘页，使用 PageContainer 组件。
内容区域使用响应式网格：grid-cols-1 md:grid-cols-2 lg:grid-cols-3
所有卡片使用 clay-card 类，背景色 #F8F5F2。
参考 src/app/study/page.tsx 的实现。
```

### 表单页 Prompt
```
开发表单页，所有输入框使用 FormInput 组件（自动符合 56px 高度规范）。
提交按钮使用 PrimaryButton 组件（自动符合 64px 高度和绿色规范）。
取消按钮使用 SecondaryButton 组件（自动符合蓝色规范）。
```

### 列表页 Prompt
```
开发列表页，使用 PageContainer 组件。
列表项使用 clay-card 类，排列使用响应式网格。
在 iPad 横屏上显示 3 列，避免使用 max-w-md 等窄容器。
```

---

## 🔧 组件导入模板

### 标准导入语句
```tsx
// 布局组件
import { SplitLayout } from '@/components/layout/SplitLayout'
import { PageContainer } from '@/components/layout/PageContainer'

// 表单组件
import { FormInput } from '@/components/form/FormInput'
import { PrimaryButton } from '@/components/form/PrimaryButton'
import { SecondaryButton } from '@/components/form/SecondaryButton'

// 显示组件
import { FeatureCard } from '@/components/display/FeatureCard'

// 图标
import { GraduationCap, Mail, Lock, Sparkles } from 'lucide-react'
```

---

## ⚠️ 常见错误纠正

### 如果 AI 生成了不符合规范的代码：

```
以下代码不符合设计规范，请修正：

1. ❌ 使用了错误的颜色
   <button className="bg-red-500">
   修正：<PrimaryButton> 或 className="clay-button-primary"

2. ❌ 使用了窄容器
   <div className="max-w-md mx-auto">
   修正：<div className="w-full max-w-7xl mx-auto">

3. ❌ 触摸目标太小
   <input className="h-8">
   修正：使用 <FormInput> 组件（自动符合 56px 规范）

4. ❌ 字号太小
   <p className="text-sm">
   修正：<p className="text-lg">（平板设备）

5. ❌ 没有使用组件库
   手动编写所有样式
   修正：优先使用 /src/components 中的组件

请重新生成符合规范的代码。
```

---

## 📝 质量检查 Prompt

```
请检查以下代码是否符合设计规范：

1. 是否使用了可复用组件？
2. 背景色是否为 #F8F5F2？
3. 按钮是否使用了 PrimaryButton 或 SecondaryButton？
4. 输入框是否使用了 FormInput 或符合 56px 高度规范？
5. iPad 横屏是否充分利用屏幕宽度？
6. 是否避免了 max-w-md 等窄容器？
7. 字号在平板上是否 ≥ text-lg？

如果不符合，请指出问题并修正。
```

---

## 🎯 功能开发检查清单

在开始开发前，让 AI 确认：

```
在开发 [功能名称] 之前，请确认：

- [ ] 已阅读 .clauderules 文件
- [ ] 已阅读 DESIGN_SYSTEM.md
- [ ] 已阅读 DEVELOPMENT_GUIDE.md
- [ ] 已查看参考实现（login/page.tsx, study/page.tsx）
- [ ] 确定要使用的组件（SplitLayout, PageContainer 等）
- [ ] 理解 iPad First 布局要求
- [ ] 理解触摸目标规范（≥ 56px）
- [ ] 理解配色规范（绿色主按钮、蓝色副按钮）

请确认后再开始编写代码。
```

---

## 💡 最佳实践 Prompt

```
请使用以下最佳实践开发 [页面名称]：

1. 组件优先：总是优先使用 /src/components 中的组件
2. 样式继承：不要重复编写已有的样式
3. 响应式优先：确保 iPad 横屏体验最佳
4. 触摸友好：所有交互元素适合触摸操作
5. 代码复用：参考已有实现，避免重复造轮子

如果遇到设计不明确的地方，参考 DESIGN_SYSTEM.md 或查看已有页面的实现。
```

---

## 🔍 代码审查 Prompt

```
请审查以下代码是否符合小语笔记的设计规范：

检查项：
1. 是否使用了正确的颜色？（绿色主按钮、蓝色副按钮、浅米色背景）
2. 是否使用了正确的组件？（优先使用组件库）
3. 是否符合 iPad First 规范？（平板横屏充分利用屏幕）
4. 触摸目标是否足够大？（≥ 56px）
5. 字号是否合适？（平板 ≥ text-lg）
6. 是否避免了窄容器？（不使用 max-w-md）
7. 布局是否响应式？（grid-cols-1 md:grid-cols-2 lg:grid-cols-3）

请列出所有不符合规范的地方，并提供修正建议。
```

---

## 📚 学习资源 Prompt

```
我想了解如何开发符合小语笔记设计规范的页面。

请提供：
1. 设计规范的核心要点
2. 必须使用的组件列表
3. 常见的错误和修正方法
4. 参考实现的文件路径
5. 快速检查清单

请基于以下文件提供答案：
- .clauderules
- DESIGN_SYSTEM.md
- DEVELOPMENT_GUIDE.md
- ui_design.md
```

---

**使用提示**:
1. 开发新功能时，复制对应的 Prompt 模板
2. 填写具体的功能描述
3. 发送给 AI 助手
4. AI 将自动遵循所有设计规范

**维护者**: 开发团队
**更新日期**: 2024-01-05
**版本**: 1.0.0
