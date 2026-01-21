# AI Coding Guidelines (SOP)

## 1. 核心原则 (Core Principles)
- **先读后写 (Read First)**: 修改代码前，必须先读取相关文件的完整上下文，禁止猜测。
- **防御性编程 (Defensive Coding)**: 必须处理边缘情况（如空值、网络错误），代码不能一跑就崩。
- **保持一致 (Consistency)**: 严格遵守现有的代码风格、命名规范和目录结构。

## 2. 工作流程 (Workflow)
1.  **Planning**: 在写代码前，先分析依赖，输出 Step-by-Step 的实现计划。
2.  **TDD (推荐)**: 对于复杂逻辑，优先编写测试用例，再编写实现代码。
3.  **Self-Review**: 代码生成后，自我检查是否存在语法错误、类型错误或逻辑漏洞。

## 3. 编码规范 (Coding Standards)
- **类型安全**: 禁止使用 `any`，必须定义清晰的 Interface/Type。
- **注释**: 关键逻辑和复杂函数必须包含 JSDoc/文档注释。
- **错误处理**: 易错逻辑（IO、网络）必须使用 try-catch 包裹，并输出清晰的错误日志。