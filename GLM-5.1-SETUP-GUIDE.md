# GLM-5.1 完整配置指南

## ✅ 已完成的配置

### 1. 项目 API 配置 (已完成)

**配置文件**: `src/lib/glm-api.ts` (3个API端点)

| 文件 | 状态 | 模型 |
|------|------|------|
| `src/app/api/admin/videos/[id]/generate-cards/route.ts` | ✅ | `glm-5.1` |
| `src/app/api/admin/videos/batch-publish/auto-analyze/route.ts` | ✅ | `glm-5.1` |
| `src/app/api/admin/videos/analyze-subtitles/route.ts` | ✅ | `glm-5.1` |

**环境变量**: `.env.local`
```bash
GLM_API_KEY=8b6a992c2e57421cbb06b42cf1bfedd9.JKUiPI6Vx6ujyzvv
```

### 2. Claude Code 配置 (已完成)

**配置文件**: `C:\Users\imwuj\.claude\settings.json`

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "8b6a992c2e57421cbb06b42cf1bfedd9.JKUiPI6Vx6ujyzvv",
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5.1"
  }
}
```

**状态**: ✅ Claude Code 现在使用 GLM-5.1 作为所有模型

## 🔧 当前状态

### 代码层面
- ✅ 所有 API 文件已更新为 `glm-5.1`
- ✅ 环境变量已配置
- ✅ 测试脚本已创建 (`test-glm-5.1.mjs`)

### 账户状态
- ⚠️ API 密钥有效但账户余额不足
- 错误代码: `1113` - 余额不足或无可用资源包

## 🚀 激活步骤

### 方案 1: 充值账户 (推荐)

1. **登录智谱 AI 开放平台**
   - 网址: https://open.bigmodel.cn/
   - 使用获取 API 密钥的账户登录

2. **充值账户**
   - 进入"费用中心" → "充值"
   - 查看定价: https://open.bigmodel.cn/pricing
   - 选择合适的资源包

3. **验证激活**
   ```bash
   # 运行测试脚本
   node test-glm-5.1.mjs
   ```

### 方案 2: 检查免费额度

1. **登录账户**: https://open.bigmodel.cn/usercenter/apikeys
2. **查看**:
   - 账户余额
   - 可用资源包
   - 免费额度状态

3. **如果有免费额度但未激活**:
   - 可能需要完成实名认证
   - 或绑定手机/邮箱

## 📊 GLM-5.1 新特性

您的代码现在支持以下 GLM-5.1 高级功能：

### 1. 思考过程输出
```javascript
{
  model: "glm-5.1",
  thinking: { type: "enabled" },
  messages: [...]
}
```

### 2. 流式推理
```javascript
// 响应中包含 reasoning_content 字段
{
  "choices": [{
    "message": {
      "content": "最终答案",
      "reasoning_content": "思考过程..."
    }
  }]
}
```

### 3. 工具调用流式输出
```javascript
{
  model: "glm-5.1",
  tool_stream: true,
  tools: [...]
}
```

## 🧪 测试功能

### 1. API 连接测试
```bash
node test-glm-5.1.mjs
```

### 2. 管理后台测试
1. 登录管理后台
2. 创建新视频并上传字幕
3. 点击"AI生成学习卡片"
4. 验证生成的卡片质量

### 3. 批量发布测试
1. 使用"批量发布"功能
2. 验证自动分析功能
3. 检查视频描述生成

## 💡 使用建议

### 优化参数

**1. 温度参数调整**
```javascript
// 创意性任务 (如: 生成例句)
temperature: 0.8 - 1.0

// 准确性任务 (如: 难度评估)
temperature: 0.3 - 0.5

// 平衡模式 (默认)
temperature: 0.7
```

**2. Token 限制**
```javascript
// 简短回答
max_tokens: 150

// 中等长度
max_tokens: 500

// 长内容生成
max_tokens: 2000-4000
```

**3. 启用思考过程** (适用于复杂任务)
```javascript
{
  model: "glm-5.1",
  thinking: { type: "enabled" },
  messages: [{
    role: "user",
    content: "分析这个法语句子的语法结构和用法..."
  }]
}
```

## 📈 性能对比

| 特性 | glm-4-flash | glm-5.1 |
|------|-------------|---------|
| 响应速度 | 快 | 更快 |
| 理解能力 | 良好 | 优秀 |
| 输出质量 | 好 | 更好 |
| 思考过程 | ❌ | ✅ |
| 流式推理 | ❌ | ✅ |
| 工具调用 | ✅ | ✅ 增强 |

## ⚠️ 常见问题

### Q1: 429 错误
**原因**: 余额不足或速率限制
**解决**: 充值或降低请求频率

### Q2: 401/403 错误
**原因**: API 密钥无效或过期
**解决**: 检查 `.env.local` 中的密钥

### Q3: 响应质量不佳
**原因**: 温度参数不合适
**解决**: 根据任务类型调整 temperature

## 📚 参考文档

- [智谱AI官方文档](https://docs.bigmodel.cn/cn/guide/start/migrate-to-glm-new)
- [GLM-5.1 迁移指南](https://docs.bigmodel.cn/cn/guide/start/migrate-to-glm-new)
- [Claude Code 集成](https://docs.bigmodel.cn/cn/coding-plan/tool/claude)
- [API 密钥管理](https://open.bigmodel.cn/usercenter/apikeys)
- [定价页面](https://open.bigmodel.cn/pricing)

---

**配置状态**: ✅ 完成
**验证状态**: ⏳ 待账户充值
**最后更新**: 2026-04-14
