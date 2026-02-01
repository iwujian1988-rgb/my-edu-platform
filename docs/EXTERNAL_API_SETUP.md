# 外部 API 接口配置指南

## 概述

为第三方产品提供用户权限查询接口。

## 接口地址

```
POST /api/user-permission
```

## 认证方式

### 1. 生成 API 密钥对

联系主站管理员获取 API 密钥对：
- `API_KEY`: 公钥（用于标识调用方）
- `API_SECRET`: 私钥（用于签名，**请妥善保管**）

### 2. 签名生成算法

```javascript
// 小程序端示例
const apiKey = 'YOUR_API_KEY';
const apiSecret = 'YOUR_API_SECRET';
const timestamp = Date.now().toString();

// 签名内容：apiKey + timestamp
const signContent = apiKey + timestamp;

// 生成 HMAC-SHA256 签名
const signature = CryptoJS.HmacSHA256(signContent, apiSecret).toString();

// 发送请求
fetch('https://your-domain.com/api/user-permission', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-API-Signature': signature,
    'X-API-Timestamp': timestamp
  },
  body: JSON.stringify({
    phone: '13800138000'
  })
})
```

### 3. 请求示例

```bash
curl -X POST https://your-domain.com/api/user-permission \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-API-Signature: GENERATED_SIGNATURE" \
  -H "X-API-Timestamp: 1704067200000" \
  -d '{
    "phone": "13800138000"
  }'
```

## 返回数据

### 成功响应

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "has_permission": true,
    "has_permission_text": "有权限",
    "expiry_date": "2026-03-31T23:59:59Z",
    "expiry_date_text": "2026-03-31 23:59",
    "plan_name": "英语永久版",
    "plan_name_text": "终身有效"
  }
}
```

### 错误响应

| 错误码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| INVALID_PARAMS | 400 | 手机号格式错误 |
| INVALID_SIGNATURE | 401 | 签名无效或 API Key 错误 |
| SIGNATURE_EXPIRED | 401 | 签名过期（超过5分钟） |
| USER_NOT_FOUND | 404 | 用户不存在 |
| SERVER_ERROR | 500 | 服务器错误 |

## 环境变量配置

在 `.env.local` 或服务器环境变量中添加：

```bash
# 外部 API 密钥配置（JSON 格式）
# 格式：{"API_KEY": "API_SECRET", ...}
EXTERNAL_API_KEYS='{"test_client_2024": "secret_key_here", "prod_client_2024": "another_secret_key"}'
```

## 安全建议

1. **API Secret**: 仅在服务端使用，**不要暴露在前端代码**
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **时间戳**: 验证时间戳防止重放攻击
4. **限流**: 建议对每个 API Key 设置请求频率限制

## 测试

### 方式1：使用测试脚本

创建 `test-user-permission-api.js`：

```javascript
const crypto = require('crypto');

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;
const phone = process.env.PHONE || '13800138000';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const timestamp = Date.now().toString();
const signContent = apiKey + timestamp;
const signature = crypto.createHmac('sha256', apiSecret).update(signContent).digest('hex');

fetch(`${baseUrl}/api/user-permission`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-API-Signature': signature,
    'X-API-Timestamp': timestamp
  },
  body: JSON.stringify({ phone })
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)));
```

运行测试：

```bash
API_KEY=test_key API_SECRET=test_secret PHONE=13800138000 node test-user-permission-api.js
```

### 方式2：使用 Postman

1. 设置环境变量：
   - `api_key`: 你的 API Key
   - `api_secret`: 你的 API Secret
   - `base_url`: 接口域名

2. Pre-request Script（自动生成签名）：

```javascript
const timestamp = Date.now().toString();
const signContent = pm.environment.get('api_key') + timestamp;
const signature = CryptoJS.HmacSHA256(signContent, pm.environment.get('api_secret')).toString();

pm.request.headers.add({
  key: 'X-API-Signature',
  value: signature
});

pm.request.headers.add({
  key: 'X-API-Timestamp',
  value: timestamp
});
```

## 联系方式

如有问题，请联系技术团队。
