# GLM Coding Plan 使用说明

## 📋 您的套餐类型

**GLM Coding Plan** - 专为 AI 编程工具设计的订阅套餐

### ✅ 可以使用场景

根据官方文档，Coding Plan **仅** 在以下工具中可用：

- ✅ **Claude Code** (您正在使用)
- ✅ Kilo Code
- ✅ Cline
- ✅ OpenCode
- ✅ TRAE
- ✅ CodeBuddy
- ✅ OpenClaw

### ❌ 不可使用场景

- ❌ **直接 API 调用** (`https://open.bigmodel.cn/api/paas/v4/...`)
- ❌ **项目后端 API** (如您的 `/api/admin/videos/*` 接口)

## 🔧 当前配置状态

### 1. Claude Code 配置 ✅ (可用)

**配置文件**: `C:\Users\imwuj\.claude\settings.json`

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "您的密钥",
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5.1"
  }
}
```

**状态**: ✅ 完全配置好，可以在 Claude Code 中使用 GLM-5.1

### 2. 项目 API 配置 ⚠️ (需要额外资源包)

**文件**:
- `src/app/api/admin/videos/[id]/generate-cards/route.ts`
- `src/app/api/admin/videos/batch-publish/auto-analyze/route.ts`
- `src/app/api/admin/videos/analyze-subtitles/route.ts`

**当前状态**: 代码已更新为 `glm-5.1`，但 **不能用 Coding Plan 套餐**

## 💡 解决方案

### 方案 1: 购买 API 资源包 (用于项目后端)

如果需要在项目 API 中使用 GLM-5.1：

1. **访问**: https://open.bigmodel.cn/pricing
2. **购买**: 按量计费或资源包
3. **使用**: 配置到 `.env.local` 的 `GLM_API_KEY`

### 方案 2: 继续使用 Coding Plan (仅 Claude Code)

**好处**:
- ✅ Coding Plan 性价比高
- ✅ 额度充足（Lite: 80次/5小时，Pro: 400次/5小时）
- ✅ 适合日常编程辅助

**限制**:
- ⚠️ 不能用于项目后端 API
- ⚠️ 只能在 Claude Code 等编程工具中使用

### 方案 3: 混合方案 (推荐)

**Claude Code**: 使用 Coding Plan 套餐
**项目 API**: 使用其他 AI 服务（如 Anthropic Claude）

## 🎯 Coding Plan 套餐详情

### 额度限制

| 套餐 | 每 5 小时限额 | 每周限额 |
|------|-------------|---------|
| Lite | ~80 次 prompts | ~400 次 |
| Pro | ~400 次 prompts | ~2000 次 |
| Max | ~1600 次 prompts | ~8000 次 |

### 支持的模型

- ✅ GLM-5.1
- ✅ GLM-5-Turbo
- ✅ GLM-4.7
- ✅ GLM-4.5-Air

## 📝 使用建议

### 在 Claude Code 中使用

您现在就可以在 Claude Code 中使用 GLM-5.1：

```bash
# 重新启动 Claude Code
claude

# 检查状态
/status
```

### 项目 API 替代方案

如果项目后端需要 AI 功能，建议：

1. **Anthropic Claude API** (推荐)
   - 稳定可靠
   - 全球可用

2. **OpenAI API**
   - 生态成熟
   - 文档完善

3. **购买 GLM API 资源包**
   - 与 Coding Plan 分开计费
   - 按量付费

## ⚠️ 重要提示

**Coding Plan ≠ API 资源包**

- **Coding Plan**: 专门给 AI 编程工具用的套餐
- **API 资源包**: 直接调用 API 用的资源包

两者是**分开的**，不能混用！

## 📚 参考文档

- [Coding Plan 套餐概览](https://docs.bigmodel.cn/cn/coding-plan/overview)
- [Claude Code 集成指南](https://docs.bigmodel.cn/cn/coding-plan/tool/claude)
- [API 定价](https://open.bigmodel.cn/pricing)

---

**总结**: 您的 Coding Plan 套餐在 Claude Code 中完全可用！但如果要在项目后端 API 中使用 GLM，需要单独购买 API 资源包。
