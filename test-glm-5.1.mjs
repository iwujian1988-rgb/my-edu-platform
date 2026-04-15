#!/usr/bin/env node

/**
 * GLM-5.1 API 测试脚本
 * 用于验证模型迁移是否成功
 */

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 从环境变量获取 API 密钥
const apiKey = process.env.GLM_API_KEY;

if (!apiKey) {
  console.error('❌ 错误: 未设置 GLM_API_KEY 环境变量');
  console.error('请运行: export GLM_API_KEY=your_actual_api_key');
  process.exit(1);
}

async function testGLM51() {
  console.log('🧪 正在测试 GLM-5.1 模型...\n');

  const testCases = [
    {
      name: '基础对话测试',
      prompt: '请简述 GLM-5.1 的主要优势',
      maxTokens: 150,
    },
    {
      name: 'JSON 格式测试',
      prompt: '用 JSON 格式返回三个法语单词，包含单词、音标、释义',
      maxTokens: 200,
    },
    {
      name: '思考过程测试',
      prompt: '分析法语学习中常见的难点，并给出解决方案',
      maxTokens: 300,
      enableThinking: true,
    },
  ];

  for (const testCase of testCases) {
    console.log(`📝 测试: ${testCase.name}`);
    console.log(`   提示: ${testCase.prompt.substring(0, 50)}...\n`);

    try {
      const requestBody = {
        model: 'glm-5.1',
        messages: [
          {
            role: 'user',
            content: testCase.prompt,
          },
        ],
        max_tokens: testCase.maxTokens,
      };

      // 如果启用思考过程，添加 thinking 参数
      if (testCase.enableThinking) {
        requestBody.thinking = { type: 'enabled' };
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ 请求失败 (${response.status}): ${errorText}\n`);
        continue;
      }

      const data = await response.json();

      // 检查响应结构
      if (data.choices && data.choices[0]?.message?.content) {
        const content = data.choices[0].message.content;
        console.log(`   ✅ 成功!`);
        console.log(`   📄 响应:\n${'─'.repeat(60)}`);
        console.log(content);
        console.log(`${'─'.repeat(60)}\n`);

        // 检查是否有思考过程（如果启用了）
        if (testCase.enableThinking && data.choices[0].message.reasoning_content) {
          console.log(`   🧠 思考过程:\n${'─'.repeat(60)}`);
          console.log(data.choices[0].message.reasoning_content);
          console.log(`${'─'.repeat(60)}\n`);
        }
      } else {
        console.error(`   ❌ 响应格式异常:`, JSON.stringify(data, null, 2), '\n');
      }
    } catch (error) {
      console.error(`   ❌ 网络错误:`, error.message, '\n');
    }

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✨ 测试完成!');
  console.log('\n💡 提示:');
  console.log('   - 如果所有测试都通过，说明 GLM-5.1 迁移成功');
  console.log('   - 如果遇到 401/403 错误，请检查 API 密钥是否有效');
  console.log('   - 如果遇到 429 错误，可能达到速率限制，请稍后重试');
}

// 运行测试
testGLM51().catch(error => {
  console.error('💥 测试脚本执行失败:', error);
  process.exit(1);
});
