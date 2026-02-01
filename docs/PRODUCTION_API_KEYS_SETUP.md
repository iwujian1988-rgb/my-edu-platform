# 生产环境 API 密钥配置指南

## 🔑 生成的密钥对

```
API Key:      IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb
API Secret:   lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i
```

## 📋 手动配置步骤

### 方式1：SSH 登录配置（推荐）

```bash
# 1. SSH 登录服务器
ssh root@43.99.58.240

# 2. 进入项目目录
cd /root/my-edu-platform

# 3. 编辑环境变量文件
nano .env.production

# 4. 找到或添加以下内容：
EXTERNAL_API_KEYS='{"IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb": "lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i"}'

# 5. 保存并退出（Ctrl+X, Y, Enter）

# 6. 重启服务
pm2 restart my-edu-platform

# 7. 验证配置
pm2 logs my-edu-platform --lines 20
```

### 方式2：使用 sed 命令更新

```bash
ssh root@43.99.58.240

# 删除旧的配置（如果存在）
cd /root/my-edu-platform
sed -i '/EXTERNAL_API_KEYS/d' .env.production

# 添加新配置
echo "EXTERNAL_API_KEYS='{\"IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb\": \"lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i\"}'" >> .env.production

# 重启服务
pm2 restart my-edu-platform
```

## ✅ 验证配置是否成功

### 1. 检查环境变量

```bash
ssh root@43.99.58.240 "cd /root/my-edu-platform && grep EXTERNAL_API_KEYS .env.production"
```

应该输出：
```
EXTERNAL_API_KEYS='{"IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb": "lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i"}'
```

### 2. 测试接口

使用提供的测试脚本 `test-user-permission-api.js`：

```bash
# 在本地测试
API_KEY=IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb \
API_SECRET=lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i \
PHONE=13800138000 \
BASE_URL=https://你的域名 \
node test-user-permission-api.js
```

或使用 curl：

```bash
# 生成签名
API_KEY="IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb"
API_SECRET="lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i"
TIMESTAMP=$(date +%s)000
SIGNATURE=$(echo -n "${API_KEY}${TIMESTAMP}" | openssl dgst -sha256 -hmac "$API_SECRET" -binary | xxd -p -c 256)

# 发送测试请求
curl -X POST https://你的域名/api/user-permission \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Signature: $SIGNATURE" \
  -H "X-API-Timestamp: $TIMESTAMP" \
  -d '{"phone": "13800138000"}'
```

## 📤 提供给对方的信息

请将以下信息提供给第三方产品团队：

### 接口信息

```
接口地址: https://你的域名/api/user-permission
请求方法: POST
Content-Type: application/json
```

### 认证信息

```
API Key: IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb
API Secret: lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i
```

### 签名算法

```
签名内容: API_KEY + TIMESTAMP (字符串拼接)
签名算法: HMAC-SHA256
```

### 请求示例

```javascript
const apiKey = 'IYrohXOAwJCKoeQNuWYgpY1V3Odw9JTb';
const apiSecret = 'lryXgC1GSN5FAMsa9siSqQE0usIX9Dj8DRt5JaXNwhpFTaUJCLRoJ7u4OZO1M45i';
const timestamp = Date.now().toString();

// 生成签名
const signContent = apiKey + timestamp;
const signature = CryptoJS.HmacSHA256(signContent, apiSecret).toString();

// 发送请求
fetch('https://你的域名/api/user-permission', {
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

## 🔒 安全建议

1. **妥善保管密钥**：API Secret 仅在服务端使用，不要暴露给前端
2. **定期更换密钥**：建议每3-6个月更换一次
3. **监控接口调用**：关注异常调用，防止滥用
4. **配置限流**：建议对每个 API Key 设置请求频率限制
5. **使用 HTTPS**：生产环境必须使用 HTTPS 协议

## 📝 密钥管理

### 生成新密钥

如需生成新的密钥对，执行：

```bash
# 生成 API Key（32位）
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1

# 生成 API Secret（64位）
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1
```

### 更换密钥

1. 生成新密钥对
2. 更新 `.env.production` 文件
3. 重启服务：`pm2 restart my-edu-platform`
4. 通知第三方团队更新密钥
5. 确认对方已更新后，可删除旧密钥

## 🆘 常见问题

### 1. 签名验证失败

- 检查 API Secret 是否正确
- 确认签名算法：HMAC-SHA256
- 验证签名内容格式：apiKey + timestamp（字符串拼接）

### 2. 时间戳过期

- 时间戳有效期：5分钟
- 确保服务器时间准确
- 使用 Unix 时间戳（毫秒）

### 3. 用户不存在

- 确认手机号格式：11位数字，1开头
- 检查用户是否在 `users` 表中
- 验证 `phone_number` 字段是否有值

---

**生成时间**：2026-02-01
**密钥有效期**：长期有效（建议定期更换）
**技术支持**：联系你的技术团队
