/**
 * 测试API连接
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testAPI() {
  console.log('测试合并上传API连接...');
  console.log(`API地址: ${API_BASE_URL}/api/admin/videos/merged-batch-upload`);

  // 构建一个最小的测试请求
  const testData = {
    merged_json: {
      channel: "测试频道",
      video_name: "API连接测试",
      materials: {
        "unit_1": {
          unit_info: {
            theme: "测试视频",
            duration: 60,
            difficulty: "intermediate"
          },
          subtitles: [],
          language_analysis: {},
          practice: {},
          deep_learning: {}
        }
      }
    },
    video_urls: {
      "unit_1": "" // 空URL用于测试
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/videos/merged-batch-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify(testData)
    });

    console.log(`响应状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API连接成功');
      console.log('响应数据:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.json();
      console.log('❌ API调用失败');
      console.log('错误信息:', errorData);
    }

  } catch (error) {
    console.error('❌ 网络错误:', error.message);
  }
}

testAPI();