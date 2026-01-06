# 组件库索引

> **快速查找和使用可复用组件**

## 📂 组件目录结构

```
/src/components/
├── layout/          # 布局组件
├── form/            # 表单组件
└── display/         # 显示组件
```

---

## 🏗️ 布局组件

### 1. SplitLayout - 左右分栏布局

**文件**: `/src/components/layout/SplitLayout.tsx`

**用途**: 登录页、注册页等需要左右分栏的页面

**特点**:
- iPad 横屏自动显示为左右两列
- 移动端自动切换为上下堆叠
- 左侧：品牌展示区域
- 右侧：表单/内容区域

**使用示例**:
```tsx
import { SplitLayout } from '@/components/layout/SplitLayout'

export default function LoginPage() {
  return (
    <div style={{ backgroundColor: '#F8F5F2' }}>
      <SplitLayout
        left={<BrandSection />}
        right={<AuthForm />}
      />
    </div>
  )
}
```

**适用场景**:
- ✅ 登录页
- ✅ 注册页
- ✅ 认证相关页面
- ❌ 不适合内容复杂的页面

---

### 2. PageContainer - 标准页面容器

**文件**: `/src/components/layout/PageContainer.tsx`

**用途**: 大多数标准页面的外层容器

**特点**:
- 提供统一的背景色（#F8F5F2）
- 自动处理最大宽度和内边距
- 响应式设计

**使用示例**:
```tsx
import { PageContainer } from '@/components/layout/PageContainer'

export default function Dashboard() {
  return (
    <PageContainer>
      <h1 className="text-4xl font-black mb-8">标题</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 内容 */}
      </div>
    </PageContainer>
  )
}
```

**适用场景**:
- ✅ 仪表盘页
- ✅ 列表页
- ✅ 详情页
- ✅ 大多数标准页面

---

## 📝 表单组件

### 1. FormInput - 标准输入框

**文件**: `/src/components/form/FormInput.tsx`

**用途**: 所有表单输入场景

**特点**:
- 最小高度 56px（符合 iPad First 规范）
- 自动应用正确的样式
- 支持图标、标签、验证
- 触摸友好

**Props**:
```tsx
interface FormInputProps {
  label: string          // 标签文本
  icon?: React.ReactNode // 图标
  type?: 'text' | 'email' | 'tel' | 'password'
  placeholder: string    // 占位符
  value: string          // 值
  onChange: (value: string) => void
  required?: boolean     // 是否必填
  name?: string          // 字段名
  autoComplete?: string  // 自动完成
}
```

**使用示例**:
```tsx
import { FormInput } from '@/components/form/FormInput'
import { Mail, Lock } from 'lucide-react'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <form>
      <FormInput
        label="手机号"
        icon={<Mail className="w-5 h-5 text-green-600" />}
        type="tel"
        placeholder="请输入手机号"
        value={email}
        onChange={setEmail}
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
    </form>
  )
}
```

**适用场景**:
- ✅ 所有表单输入
- ✅ 登录/注册表单
- ✅ 设置页面
- ✅ 搜索框

---

### 2. PrimaryButton - 主按钮（绿色）

**文件**: `/src/components/form/PrimaryButton.tsx`

**用途**: 主要操作按钮（提交、确认等）

**特点**:
- 绿色渐变背景（#4CAF50）
- 最小高度 64px（触摸友好）
- 支持加载状态
- 支持图标
- 自动应用悬停效果

**Props**:
```tsx
interface PrimaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
  icon?: React.ReactNode
}
```

**使用示例**:
```tsx
import { PrimaryButton } from '@/components/form/PrimaryButton'
import { Sparkles } from 'lucide-react'

export default function FormActions() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    // 提交逻辑
    setLoading(false)
  }

  return (
    <PrimaryButton
      type="submit"
      onClick={handleSubmit}
      loading={loading}
      icon={<Sparkles className="w-5 h-5" />}
    >
      提交
    </PrimaryButton>
  )
}
```

**适用场景**:
- ✅ 表单提交按钮
- ✅ 主要操作（确认、保存）
- ✅ CTA 按钮
- ❌ 不适合次要操作

---

### 3. SecondaryButton - 副按钮（蓝色）

**文件**: `/src/components/form/SecondaryButton.tsx`

**用途**: 次要操作按钮（取消、返回等）

**特点**:
- 蓝色渐变背景（#87CEEB）
- 最小高度 64px（触摸友好）
- 支持加载状态
- 支持图标
- 自动应用悬停效果

**Props**:
```tsx
interface SecondaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
  icon?: React.ReactNode
}
```

**使用示例**:
```tsx
import { SecondaryButton } from '@/components/form/SecondaryButton'
import { X } from 'lucide-react'

export default function FormActions() {
  return (
    <div className="flex gap-4">
      <PrimaryButton>提交</PrimaryButton>
      <SecondaryButton
        onClick={() => router.back()}
        icon={<X className="w-5 h-5" />}
      >
        取消
      </SecondaryButton>
    </div>
  )
}
```

**适用场景**:
- ✅ 取消按钮
- ✅ 返回按钮
- ✅ 次要操作
- ❌ 不适合主要操作

---

## 🎨 显示组件

### 1. FeatureCard - 功能展示卡片

**文件**: `/src/components/display/FeatureCard.tsx`

**用途**: 展示功能、特色、优势等

**特点**:
- 支持 4 种颜色主题（绿/蓝/橙/紫）
- Claymorphism 风格
- 悬停缩放效果
- 响应式设计

**Props**:
```tsx
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color?: 'green' | 'blue' | 'orange' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}
```

**使用示例**:
```tsx
import { FeatureCard } from '@/components/display/FeatureCard'
import { Target, Trophy, Zap } from 'lucide-react'

export default function Features() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FeatureCard
        icon={<Target className="w-7 h-7" />}
        title="AI 智能推荐"
        description="根据学习水平智能推荐最适合的单词"
        color="blue"
      />

      <FeatureCard
        icon={<Trophy className="w-7 h-7" />}
        title="成就系统"
        description="完成学习目标解锁成就"
        color="orange"
      />

      <FeatureCard
        icon={<Zap className="w-7 h-7" />}
        title="间隔重复"
        description="科学的记忆曲线算法"
        color="green"
      />
    </div>
  )
}
```

**适用场景**:
- ✅ 功能展示
- ✅ 特色介绍
- ✅ 优势列表
- ✅ 首页亮点

---

## 🎯 快速查找

### 我要开发...

#### 登录/注册页
```
1. 使用 SplitLayout 布局
2. 使用 FormInput 输入框
3. 使用 PrimaryButton 提交按钮
参考: src/app/login/page.tsx
```

#### 仪表盘页
```
1. 使用 PageContainer 容器
2. 使用响应式网格布局
3. 使用 FeatureCard 展示数据
参考: src/app/study/page.tsx
```

#### 表单页
```
1. 使用 PageContainer 容器
2. 使用 FormInput 输入框
3. 使用 PrimaryButton 提交
4. 使用 SecondaryButton 取消
```

#### 列表页
```
1. 使用 PageContainer 容器
2. 使用 clay-card 卡片样式
3. 使用响应式网格布局
```

---

## 📊 组件对比

### 按钮组件选择

| 组件 | 颜色 | 用途 | 示例 |
|------|------|------|------|
| PrimaryButton | 绿色 #4CAF50 | 主要操作 | 提交、确认、保存 |
| SecondaryButton | 蓝色 #87CEEB | 次要操作 | 取消、返回、下一步 |

### 布局组件选择

| 组件 | 用途 | 适用场景 |
|------|------|----------|
| SplitLayout | 左右分栏 | 登录页、注册页 |
| PageContainer | 标准容器 | 仪表盘、列表页、详情页 |

---

## ✅ 使用检查清单

使用组件前，确认：

- [ ] 组件已存在于 `/src/components/` 目录
- [ ] 已导入正确的组件路径
- [ ] 已传递所有必需的 props
- [ ] 已参考使用示例
- [ ] 已参考实现文件

---

## 📖 更多信息

- **DESIGN_SYSTEM.md** - 完整设计系统
- **DEVELOPMENT_GUIDE.md** - 开发指南
- **AI_PROMPT_TEMPLATE.md** - AI Prompt 模板

---

**维护者**: 开发团队
**更新日期**: 2024-01-05
**版本**: 1.0.0
