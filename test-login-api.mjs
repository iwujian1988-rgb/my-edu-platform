/**
 * 直接测试登录API
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^[\\"']|[\\"']$/g, '')
      if (key && cleanValue) {
        envVars[key.trim()] = cleanValue
      }
    })

    return envVars
  } catch (error) {
    return {}
  }
}

const env = loadEnvFile()

async function testLoginAPI() {
  console.log('🔍 测试登录API...\n')

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '13800138000',
        password: 'password123'
      })
    })

    console.log('Response status:', response.status)

    const text = await response.text()
    console.log('Response body:', text)

    if (response.ok) {
      const data = JSON.parse(text)
      console.log('\n✅ 登录API成功')
      console.log('返回数据:', JSON.stringify(data, null, 2))
    } else {
      console.log('\n❌ 登录API失败')
    }

  } catch (error) {
    console.error('\n❌ 请求失败:', error.message)
  }
}

testLoginAPI()
