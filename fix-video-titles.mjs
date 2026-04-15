/**
 * 修复视频标题脚本
 * 将错误的"批量上传"标题改为CSV中的正确标题
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 解析CSV获取正确的标题映射
 */
function parseCSVForTitles(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').slice(1);

  const titleMap = new Map();

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = [];
    let currentPart = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        parts.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    if (currentPart.trim()) {
      parts.push(currentPart.trim());
    }

    if (parts.length >= 5) {
      const jsonFileName = parts[2].replace(/^"|"$/g, '');
      const videoName = parts[4].replace(/^"|"$/g, '');

      titleMap.set(jsonFileName, videoName);
    }
  }

  return titleMap;
}

/**
 * 修复视频标题
 */
async function fixVideoTitles() {
  console.log('=== 修复视频标题 ===\n');

  const csvPath = './linshi/matching_table.csv';

  // 1. 解析CSV获取正确标题
  console.log('Step 1: 解析CSV获取正确标题...');
  const titleMap = parseCSVForTitles(csvPath);
  console.log(`✅ 解析了 ${titleMap.size} 条标题记录\n`);

  // 2. 查找所有需要修复的视频
  console.log('Step 2: 查找需要修复的视频...');
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, creator_name, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    console.error('查询视频失败:', error.message);
    return;
  }

  console.log(`找到 ${videos.length} 个草稿视频\n`);

  // 3. 修复每个视频的标题
  let fixedCount = 0;
  let notFoundCount = 0;

  for (const video of videos) {
    // 判断是否是需要修复的视频（标题包含"批量上传"）
    if (!video.title.includes('批量上传')) {
      continue;
    }

    // 尝试从标题中提取原始JSON文件名的线索
    // 这需要根据实际的命名规则来匹配
    console.log(`处理视频: ${video.title}`);

    // 由于无法直接从当前标题反推JSON文件名，
    // 我们需要使用其他方法来匹配
    notFoundCount++;
  }

  console.log(`\n修复完成: ${fixedCount} 个`);
  console.log(`无法匹配: ${notFoundCount} 个`);
}

fixVideoTitles();