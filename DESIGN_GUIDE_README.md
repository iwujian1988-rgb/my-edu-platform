# 设计规范执行机制 - 快速参考

> **如何确保所有页面都遵循 iPad First 和 Educational Platform 规范**

## 📚 核心文档

### 1. **DESIGN_SYSTEM.md** - 设计系统完整文档
- 📍 位置: `/DESIGN_SYSTEM.md`
- 📖 内容: 完整的色彩、字体、组件、布局规范
- 🎯 用途: 查找详细的设计规范

### 2. **DEVELOPMENT_GUIDE.md** - 开发指南
- 📍 位置: `/DEVELOPMENT_GUIDE.md`
- 📖 内容: 快速开始、代码示例、常见错误
- 🎯 用途: 日常开发参考

### 3. **ui_design.md** - 项目设计规范
- 📍 位置: `/ui_design.md`
- 📖 内容: 项目级别的设计原则
- 🎯 用途: 理解项目设计理念

---

## 🚀 快速开始（3 步）

### Step 1: 开发新页面前
```bash
# 1. 阅读开发指南
cat DEVELOPMENT_GUIDE.md

# 2. 选择合适的模板
# - 登录/注册页 → SplitLayout
# - 仪表盘     → PageContainer + CardGrid
# - 列表页     → PageContainer
```

### Step 2: 使用可复用组件
```tsx
// ✅ 好的做法
import { SplitLayout } from '@/components/layout/SplitLayout'
import { FormInput } from '@/components/form/FormInput'
import { PrimaryButton } from '@/components/form/PrimaryButton'

// ❌ 不好的做法
// 手写所有样式
```

### Step 3: 遵循检查清单
```tsx
// 颜色: 绿色主按钮、蓝色副按钮、浅米色背景
// 布局: iPad 横屏充分利用宽度
// 触摸: 所有按钮 ≥ 56px
// 字体: 平板上使用 text-lg
```

---

## 🎨 核心规范速查

### 颜色
```tsx
主按钮: #4CAF50 (绿色)
副按钮: #87CEEB (蓝色)
背景色: #F8F5F2 (浅米色)
卡片: #FFFFFF (白色)
边框: #E2E8F0 (浅灰色)
```

### 字体
```tsx
标题: Fredoka
正文: Nunito
平板基础字号: text-lg (18px)
主标题: text-5xl (48px)
```

### 布局
```tsx
// ✅ 好的做法
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
w-full max-w-7xl

// ❌ 不好的做法
max-w-md (平板上太窄)
```

### 触摸
```tsx
按钮: ≥ 56px (推荐 64px)
输入框: ≥ 56px
所有可点击元素: ≥ 48px
```

---

## 🧩 可复用组件库

### 布局组件 (`/src/components/layout/`)
```
SplitLayout.tsx     - 左右分栏布局（登录页）
PageContainer.tsx   - 标准页面容器
```

### 表单组件 (`/src/components/form/`)
```
FormInput.tsx       - 标准输入框（56px 高度）
PrimaryButton.tsx   - 主按钮（绿色，64px）
SecondaryButton.tsx - 副按钮（蓝色，64px）
```

### 显示组件 (`/src/components/display/`)
```
FeatureCard.tsx     - 功能展示卡片
```

---

## ✅ 开发检查清单

### 开发前
- [ ] 阅读 DEVELOPMENT_GUIDE.md
- [ ] 确定页面类型
- [ ] 选择合适的模板

### 开发中
- [ ] 使用可复用组件
- [ ] 遵循响应式规则
- [ ] 使用正确的颜色
- [ ] 使用正确的字体

### 开发后
- [ ] 测试 Mobile (375px)
- [ ] 测试 Tablet Portrait (768px)
- [ ] 测试 Tablet Landscape (1024px)
- [ ] 测试 Desktop (1280px+)
- [ ] 检查所有触摸目标
- [ ] 验证颜色和字体

---

## 🎯 使用示例

### 登录页（参考实现）
```tsx
// 文件: src/app/login/page.tsx
import { SplitLayout } from '@/components/layout/SplitLayout'
import { FormInput } from '@/components/form/FormInput'
import { PrimaryButton } from '@/components/form/PrimaryButton'

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

### 仪表盘页
```tsx
import { PageContainer } from '@/components/layout/PageContainer'
import { FeatureCard } from '@/components/display/FeatureCard'

export default function Dashboard() {
  return (
    <PageContainer>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard />
        <FeatureCard />
        <FeatureCard />
      </div>
    </PageContainer>
  )
}
```

---

## 🔧 质量保证机制

### 1. 组件库
- ✅ 所有可复用组件已内置规范
- ✅ 使用组件 = 自动符合规范

### 2. 文档系统
- ✅ DESIGN_SYSTEM.md - 完整规范
- ✅ DEVELOPMENT_GUIDE.md - 快速参考
- ✅ ui_design.md - 设计原则

### 3. 参考实现
- ✅ src/app/login/page.tsx - 登录页示例
- ✅ src/app/study/page.tsx - 学习中心示例
- ✅ src/app/page.tsx - 首页示例

### 4. 检查清单
- ✅ 开发前检查清单
- ✅ 开发中检查清单
- ✅ 开发后检查清单

---

## 📞 需要帮助？

1. **查看文档**
   - 详细规范 → DESIGN_SYSTEM.md
   - 快速参考 → DEVELOPMENT_GUIDE.md

2. **查看示例**
   - 登录页 → src/app/login/page.tsx
   - 学习中心 → src/app/study/page.tsx
   - 首页 → src/app/page.tsx

3. **使用组件**
   - 直接导入组件库中的组件
   - 组件已内置所有规范

---

## 🎓 核心原则

1. **优先使用组件库**
   - 不要重复造轮子
   - 组件库已内置所有规范

2. **iPad First**
   - 优先考虑平板横屏体验
   - 充分利用屏幕空间

3. **Educational Platform 样式**
   - 绿色主按钮、蓝色副按钮
   - 浅米色背景、白色卡片
   - Fredoka 标题 + Nunito 正文

4. **触摸友好**
   - 所有按钮 ≥ 56px
   - 所有输入框 ≥ 56px

5. **响应式设计**
   - Mobile 单列
   - Tablet 2-3列
   - 避免窄容器

---

**维护者**: 开发团队
**更新日期**: 2024-01-05
**版本**: 1.0.0
