# MAX笔记 - 英语学习平台

> **🤖 AI 助手必读**: 在提供任何帮助前，必须先读取 [.claude/SYSTEM_PROMPT.md](.claude/SYSTEM_PROMPT.md)

---

## ⚠️ 给 ClaudeCode/AI 的强制指令

### 📋 每次对话开始时，必须按顺序执行：

1. **读取强制规则**
   ```bash
   Read .claude/SYSTEM_PROMPT.md
   ```

2. **读取质量清单**
   ```bash
   Read TECH_LEAD_OWNER_CHECKLIST.md
   ```

3. **确认理解**
   ```
   我已阅读并理解以下规则：
   ✅ 禁止未包装的 console.log
   ✅ 所有 async 必须有错误处理
   ✅ 数据库操作必须检查 error
   ✅ 必须考虑并发安全
   ✅ 必须设置超时
   ✅ 避免内存泄漏
   ```

4. **然后才开始工作**

---

## 🚀 快速开始

### 开发
```bash
npm run dev
```

### 质量检查
```bash
npm run quality-check
```

### 调试
```bash
# 编辑 .env.local
DEBUG=true
```

---

## 📚 重要文档

| 文档 | 用途 | 优先级 |
|------|------|--------|
| [.claude/SYSTEM_PROMPT.md](.claude/SYSTEM_PROMPT.md) | **AI 强制规则** | 🔴 HIGHEST |
| [TECH_LEAD_OWNER_CHECKLIST.md](TECH_LEAD_OWNER_CHECKLIST.md) | 质量检查清单 | 🔴 HIGHEST |
| [docs/AI_INSTRUCTIONS.md](docs/AI_INSTRUCTIONS.md) | AI 编码指令 | 🔴 HIGH |
| [docs/PREVENTION_ARCHITECTURE.md](docs/PREVENTION_ARCHITECTURE.md) | 防御性编码 | 🟡 MEDIUM |
| [QUALITY_IMPROVEMENTS.md](QUALITY_IMPROVEMENTS.md) | 改进总结 | 🟢 LOW |

---

## 🎯 当前状态

- ✅ 服务器运行中: http://localhost:3000
- ✅ 内存占用: 331MB (优化后)
- ✅ 日志控制: 已启用
- ✅ ESLint: 已配置

---

## 🤖 给 AI 助手的最后提醒

**在提供任何代码前，必须先通过所有检查！**

违反规则 = 失败

**记住**: 你的目标是写出**生产级、安全、高性能**的代码，而不是快速完成任务！
