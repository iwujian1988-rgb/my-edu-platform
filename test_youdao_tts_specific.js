/**
 * 测试有道 TTS API 对特定文本的响应
 */

const YOUDAO_TTS_BASE_URL = 'https://dict.youdao.com/dictvoice'
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function testYoudaoTTS(text, type = '2') {
  const url = `${YOUDAO_TTS_BASE_URL}?audio=${encodeURIComponent(text)}&type=${type}`

  console.log(`\n📡 测试文本: "${text}"`)
  console.log(`🔗 URL: ${url}`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
      },
    })

    console.log(`✅ 状态码: ${response.status}`)
    console.log(`📄 Content-Type: ${response.headers.get('Content-Type')}`)
    console.log(`📦 Content-Length: ${response.headers.get('Content-Length')}`)

    if (response.ok) {
      const buffer = await response.arrayBuffer()
      console.log(`🎵 音频数据大小: ${buffer.byteLength} bytes`)
      return { success: true, status: response.status, size: buffer.byteLength }
    } else {
      const text = await response.text()
      console.log(`❌ 响应内容: ${text.substring(0, 200)}`)
      return { success: false, status: response.status, error: text }
    }
  } catch (error) {
    console.error(`❌ 请求失败:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('有道 TTS API 测试')
  console.log('='.repeat(60))

  const testCases = [
    { text: 'protect', type: '2' },
    { text: 'protect sth. against sth.', type: '2' },
    { text: 'sth.', type: '2' },
    { text: 'someone', type: '2' },
    { text: 'hello world', type: '2' },
    { text: 'test.text', type: '2' },
  ]

  for (const testCase of testCases) {
    await testYoudaoTTS(testCase.text, testCase.type)
    await new Promise(resolve => setTimeout(resolve, 500)) // 延迟 500ms
  }

  console.log('\n' + '='.repeat(60))
  console.log('测试完成')
  console.log('='.repeat(60))
}

main()
