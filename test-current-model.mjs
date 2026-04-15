// 测试当前实际使用的模型
const testModel = async () => {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || "8b6a992c2e57421cbb06b42cf1bfedd9.JKUiPI6Vx6ujyzvv";
  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://open.bigmodel.cn/api/anthropic";
  const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || "glm-5.1";

  console.log("🔍 测试配置:");
  console.log("API Base URL:", baseUrl);
  console.log("Model:", model);
  console.log("");

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: '请简单回答：你现在使用的是哪个模型？'
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ 连接成功!");
      console.log("📝 响应:", data.content[0].text);
      console.log("");
      console.log("📊 完整响应:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("❌ 连接失败");
      console.log("状态码:", response.status);
      const errorData = await response.json().catch(() => ({}));
      console.log("错误信息:", JSON.stringify(errorData, null, 2));
    }
  } catch (error) {
    console.log("❌ 网络错误:", error.message);
  }
};

testModel();