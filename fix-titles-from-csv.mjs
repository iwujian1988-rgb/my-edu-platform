/**
 * 从CSV数据修复视频标题
 * 通过匹配创建时间和频道来找到对应的视频
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
function parseCSV(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').slice(1);

  const records = [];

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
      records.push({
        audioUrl: parts[0].replace(/^"|"$/g, ''),
        jsonFileName: parts[2].replace(/^"|"$/g, ''),
        channel: parts[3].replace(/^"|"$/g, ''),
        videoName: parts[4].replace(/^"|"$/g, '')
      });
    }
  }

  return records;
}

/**
 * 修复视频标题
 */
async function fixVideoTitles() {
  console.log('=== 修复视频标题 ===\n');

  const csvPath = './linshi/matching_table.csv';

  // 1. 解析CSV
  console.log('Step 1: 解析CSV...');
  const csvRecords = parseCSV(csvPath);
  console.log(`✅ 解析了 ${csvRecords.length} 条记录\n`);

  // 2. 按频道分组
  const channelGroups = {};
  csvRecords.forEach(record => {
    if (!channelGroups[record.channel]) {
      channelGroups[record.channel] = [];
    }
    channelGroups[record.channel].push(record);
  });

  console.log(`频道数量: ${Object.keys(channelGroups).length}\n`);

  // 3. 处理每个频道
  let totalFixed = 0;

  for (const [channel, records] of Object.entries(channelGroups)) {
    console.log(`处理频道: ${channel}`);
    console.log(`记录数量: ${records.length}`);

    // 获取该频道最近上传的草稿视频
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, creator_name, created_at')
      .eq('creator_name', channel)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(records.length + 10); // 多取一些以确保覆盖

    if (error || !videos) {
      console.error(`查询${channel}失败:`, error?.message);
      continue;
    }

    console.log(`找到 ${videos.length} 个草稿视频`);

    // 逐个匹配并修复
    let recordIndex = 0;

    for (const video of videos) {
      if (recordIndex >= records.length) break;

      const record = records[recordIndex];

      // 检查是否需要修复（标题包含"批量上传"）
      if (video.title.includes('批量上传')) {
        console.log(`修复: "${video.title}" -> "${record.videoName}"`);

        const { error: updateError } = await supabase
          .from('videos')
          .update({ title: record.videoName })
          .eq('id', video.id);

        if (updateError) {
          console.error(`❌ 修复失败:`, updateError.message);
        } else {
          console.log(`✅ 修复成功`);
          totalFixed++;
        }

        recordIndex++;
      }
    }

    console.log('');
  }

  console.log(`=== 修复完成 ===`);
  console.log(`总共修复: ${totalFixed} 个视频标题`);
}

fixVideoTitles();