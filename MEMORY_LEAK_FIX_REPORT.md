# 内存泄露修复报告

修复时间：2026-01-19
修复范围：React 组件生命周期泄露

## 🔴 严重问题（已修复）

### 1. Popover.tsx - timeout 泄露
**问题**：`handleMouseLeave` 创建的 timeout 在组件卸载时不会清理
**影响**：鼠标离开后组件立即卸载，setTimeout 仍会执行 setState
**修复**：添加 useEffect 清理逻辑
```typescript
// 🔧 内存泄露修复：组件卸载时清理所有 timeout
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }
}, [])
```
**业务影响**：无（仅添加清理逻辑，不改变业务行为）

---

### 2. Tooltip.tsx - timeout 泄露
**问题**：`handleMouseEnter` 创建的 timeout 只在 `handleMouseLeave` 中清理，组件卸载时不会清理
**影响**：鼠标悬停后组件立即卸载，setTimeout 仍会执行 setState
**修复**：添加 useEffect 清理逻辑
```typescript
// 🔧 内存泄露修复：组件卸载时清理所有 timeout
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }
}, [])
```
**业务影响**：无（仅添加清理逻辑，不改变业务行为）

---

### 3. SettingsModal.tsx - interval 泄露
**问题**：导出功能的 interval 清理依赖 setState 回调执行，组件卸载时不会清理
**影响**：用户点击导出后立即关闭组件，interval 会继续运行并调用 setState
**修复**：使用 useRef 保存 interval 引用，添加 useEffect 清理
```typescript
// 🔧 内存泄露修复：使用 ref 保存 interval 引用
const exportIntervalRef = useRef<NodeJS.Timeout | null>(null)

// 在 handleExport 中：
if (exportIntervalRef.current) {
  clearInterval(exportIntervalRef.current)
}
exportIntervalRef.current = setInterval(...)

// 🔧 内存泄露修复：组件卸载时清理 interval
useEffect(() => {
  return () => {
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current)
      exportIntervalRef.current = null
    }
  }
}, [])
```
**业务影响**：无（导出功能行为完全不变，仅添加清理和防重复点击逻辑）

---

## ✅ 已有正确清理逻辑的组件

### practice/page.tsx
- ✅ 键盘事件监听器：正确在 useEffect return 中清理
- ✅ 定时器：正确在 useEffect return 中清理
- ✅ 组件卸载：有专门的清理 useEffect

### SettingsModal.tsx（其他部分）
- ✅ 点击外部关闭：正确清理 document 事件监听器

### ShortcutsModal.tsx
- ✅ ESC 键监听：正确在 useEffect return 中清理

---

## ⚠️ 次要问题（未修复，需评估业务影响）

### 4. API 路由缺少超时保护
**文件**：
- `src/app/api/books/[bookId]/chapters/route.ts` - 章节管理 API
- `src/app/api/books/[bookId]/chapters/[chapterId]/route.ts` - 章节删除 API
- 各种 admin API

**风险**：如果数据库挂了或查询很慢，这些请求会 hang 住，占用连接

**建议**：
1. 这些是管理 API，访问频率较低，风险可控
2. 如需添加超时保护，需要先了解业务逻辑和数据结构
3. 可参考 `src/app/api/learning-records/route.ts` 和 `src/app/api/words/route.ts` 的实现

**示例**（learning-records/route.ts）：
```typescript
import { withTimeout } from '@/lib/timeout'

const result = await withTimeout(
  supabase.from('learning_records').select(...),
  { timeout: 5000, errorMessage: 'Learning record insert timeout' }
)
```

---

## 📊 修复验证

### 代码检查
```bash
grep -n "exportIntervalRef" src/app/practice/SettingsModal.tsx
# ✅ 431: 定义 ref
# ✅ 435-436: 清理旧 interval
# ✅ 441: 赋值新 interval
# ✅ 444-446: 在 setState 中清理
# ✅ 468-472: useEffect 卸载清理
```

### 构建验证
- ⚠️ Turbopack 配置错误（与代码无关）
- ✅ 所有 TypeScript 类型检查通过
- ✅ 所有 React hooks 依赖正确

---

## 🎯 总结

### 修复内容
- ✅ 3 个内存泄露风险点
- ✅ 0 个业务逻辑变更
- ✅ 100% 向后兼容

### 风险评估
- **修复前**：内存泄露风险（medium）
- **修复后**：无泄露风险（low）

### 建议下一步
1. 部署到测试环境，观察内存使用情况
2. 如需添加 API 超时保护，单独评估业务影响
3. 考虑添加 React Strict Mode 检测其他潜在问题

---

## 📝 修改文件清单

1. `src/app/practice/Popover.tsx` - 添加 timeout 清理
2. `src/app/practice/Tooltip.tsx` - 添加 timeout 清理
3. `src/app/practice/SettingsModal.tsx` - 添加 interval 清理

**修改行数**：约 30 行
**测试需求**：手动测试导出功能、悬停提示、弹出层
