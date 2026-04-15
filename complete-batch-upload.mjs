/**
 * 完整批量合并上传脚本
 *
 * 功能：
 * 1. 处理3个文件夹的所有视频
 * 2. 跳过已上传的E174-E179
 * 3. 自动从CSV提取OSS URL
 * 4. 所有视频状态设为草稿
 * 5. 分批处理（每批最多10个视频）
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// API配置
const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * 解析CSV文件，提取URL映射
 */
function parseCSV(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').slice(1); // 跳过标题行

  const urlMap = new Map();

  for (const line of lines) {
    if (!line.trim()) continue;

    // 简单的CSV解析（处理引号）
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
      const audioUrl = parts[0];
      const jsonFileName = parts[2];
      const channel = parts[3];
      const videoName = parts[4];

      // 移除引号
      const cleanUrl = audioUrl.replace(/^"|"$/g, '');
      const cleanJson = jsonFileName.replace(/^"|"$/g, '');
      const cleanChannel = channel.replace(/^"|"$/g, '');
      const cleanName = videoName.replace(/^"|"$/g, '');

      urlMap.set(cleanJson, {
        audioUrl: cleanUrl,
        channel: cleanChannel,
        videoName: cleanName
      });
    }
  }

  return urlMap;
}

/**
 * 获取文件夹中所有JSON文件
 */
function getJsonFiles(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);
    return files.filter(file => file.endsWith('_materials.json'));
  } catch (error) {
    console.error(`读取文件夹失败: ${folderPath}`, error.message);
    return [];
  }
}

/**
 * 检查视频是否已存在
 */
async function videoExists(title) {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id')
      .eq('title', title)
      .single();

    return !error && data;
  } catch {
    return false;
  }
}

/**
 * 读取并处理JSON文件
 */
function processJsonFile(jsonPath) {
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取JSON失败: ${jsonPath}`, error.message);
    return null;
  }
}

/**
 * 构建合并格式的JSON
 * 注意：这里的JSON文件已经是单unit格式，需要转换为合并格式
 */
function buildMergedJson(jsonFiles, folderPath, urlMap, channelName) {
  const materials = {};

  // 按文件名排序，确保顺序一致
  const sortedFiles = [...jsonFiles].sort();

  sortedFiles.forEach((jsonFile, index) => {
    const unitKey = `unit_${index + 1}`;
    const jsonPath = path.join(folderPath, jsonFile);
    const jsonContent = processJsonFile(jsonPath);

    if (!jsonContent) {
      console.error(`跳过无效JSON: ${jsonFile}`);
      return;
    }

    // 从CSV获取数据
    const csvData = urlMap.get(jsonFile) || {
      audioUrl: '',
      channel: channelName,
      videoName: jsonFile.replace('_materials.json', '')
    };

    // 检查JSON文件结构
    // 如果是单unit格式（包含materials.unit_1），提取unit_1的内容
    // 如果已经是合并格式，直接使用
    let unitData;
    if (jsonContent.materials && jsonContent.materials.unit_1) {
      unitData = jsonContent.materials.unit_1;
    } else {
      // 假设是其他格式，尝试直接使用
      unitData = jsonContent;
    }

    // 构建符合合并格式要求的unit数据
    materials[unitKey] = {
      unit_info: {
        theme: csvData.videoName || jsonContent.video_name || unitData?.unit_info?.theme || jsonFile.replace('_materials.json', ''),
        duration: jsonContent.duration_minutes || unitData?.unit_info?.duration || 0,
        difficulty: 'intermediate'
      },
      // 确保包含必需的字段
      subtitles: unitData?.subtitles || [],
      language_analysis: unitData?.language_analysis || {},
      practice: unitData?.practice || {},
      deep_learning: unitData?.deep_learning || {},
      // 添加音频URL
      audio_url: csvData.audioUrl
    };
  });

  return {
    channel: channelName,
    video_name: `${channelName} 批量上传 ${new Date().toISOString()}`,
    materials
  };
}

/**
 * 构建video_urls映射
 */
function buildVideoUrls(jsonFiles, urlMap) {
  const videoUrls = {};
  const sortedFiles = [...jsonFiles].sort();

  sortedFiles.forEach((jsonFile, index) => {
    const unitKey = `unit_${index + 1}`;
    const csvData = urlMap.get(jsonFile);
    videoUrls[unitKey] = csvData?.audioUrl || '';
  });

  return videoUrls;
}

/**
 * 调用合并上传API
 */
async function callMergedUploadAPI(mergedJson, videoUrls) {
  const apiUrl = `${API_BASE_URL}/api/admin/videos/merged-batch-upload`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify({
        merged_json: mergedJson,
        video_urls: videoUrls
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API调用失败: ${response.status} - ${errorData.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API调用错误:', error.message);
    throw error;
  }
}

/**
 * 处理单个批次
 */
async function processBatch(jsonFiles, folderPath, urlMap, channelName) {
  console.log(`\n处理批次: ${jsonFiles.length} 个文件`);

  try {
    // 1. 构建合并JSON
    console.log('构建合并JSON...');
    const mergedJson = buildMergedJson(jsonFiles, folderPath, urlMap, channelName);

    // 2. 构建video_urls
    const videoUrls = buildVideoUrls(jsonFiles, urlMap);

    // 3. 调用API
    console.log('调用合并上传API...');
    const result = await callMergedUploadAPI(mergedJson, videoUrls);

    // 4. 处理结果
    if (result.success && result.data) {
      console.log(`✅ 批次上传成功`);

      if (result.data.results) {
        result.data.results.forEach((r, index) => {
          const fileName = jsonFiles[index];
          if (r.success) {
            console.log(`  ✅ ${fileName}: ${r.data?.title || '成功'} (ID: ${r.data?.id})`);
          } else {
            console.log(`  ❌ ${fileName}: ${r.error}`);
          }
        });
      }

      return {
        success: true,
        total: jsonFiles.length,
        uploaded: result.data.results?.filter(r => r.success).length || 0,
        failed: result.data.results?.filter(r => !r.success).length || 0
      };
    } else {
      throw new Error(result.error || '上传失败');
    }

  } catch (error) {
    console.error(`❌ 批次处理失败:`, error.message);
    return {
      success: false,
      total: jsonFiles.length,
      uploaded: 0,
      failed: jsonFiles.length,
      error: error.message
    };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 完整批量合并上传脚本 ===');
  console.log(`API地址: ${API_BASE_URL}/api/admin/videos/merged-batch-upload`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  const linshiPath = './linshi';
  const csvPath = path.join(linshiPath, 'matching_table.csv');

  // 1. 解析CSV
  console.log('Step 1: 解析CSV文件...');
  const urlMap = parseCSV(csvPath);
  console.log(`✅ 解析了 ${urlMap.size} 条URL记录\n`);

  // 2. 定义文件夹和频道
  const folders = [
    {
      path: path.join(linshiPath, 'InnerFrench 中级法语_processed'),
      name: 'InnerFrench 中级法语'
    },
    {
      path: path.join(linshiPath, 'Louis法语课_processed'),
      name: 'Louis法语课'
    },
    {
      path: path.join(linshiPath, 'SBS简易法语_processed'),
      name: 'SBS简易法语'
    }
  ];

  // 3. 已上传的视频（跳过）
  const skipVideos = [
    'E174 Apprendre le français en immersion dans l\'Utah_materials.json',
    'E175 L\'aide médicale à mourir, bientôt possible en France_materials.json',
    'E176 À la découverte des côtes normandes et bretonnes_materials.json',
    'E177 Les festivals, une passion française __materials.json',
    'E179 La France est-elle anti-enfants __materials.json'
  ];

  console.log(`Step 2: 跳过已上传的 ${skipVideos.length} 个视频\n`);

  // 统计数据
  let totalProcessed = 0;
  let totalUploaded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // 4. 处理每个文件夹
  for (const folder of folders) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`处理频道: ${folder.name}`);
    console.log(`${'='.repeat(50)}`);

    // 获取JSON文件
    const jsonFiles = getJsonFiles(folder.path);
    console.log(`找到 ${jsonFiles.length} 个JSON文件`);

    if (jsonFiles.length === 0) {
      console.log('没有JSON文件，跳过此频道');
      continue;
    }

    // 过滤已上传的视频
    const newFiles = jsonFiles.filter(file => !skipVideos.includes(file));
    const skippedCount = jsonFiles.length - newFiles.length;

    console.log(`需要上传: ${newFiles.length} 个文件`);
    console.log(`跳过已上传: ${skippedCount} 个文件`);

    if (newFiles.length === 0) {
      console.log('没有新文件需要上传\n');
      totalSkipped += skippedCount;
      continue;
    }

    // 分批处理（每批最多10个）
    const batchSize = 10;
    for (let i = 0; i < newFiles.length; i += batchSize) {
      const batch = newFiles.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(newFiles.length / batchSize);

      console.log(`\n批次 ${batchNum}/${totalBatches}: ${batch.length} 个文件`);

      const result = await processBatch(batch, folder.path, urlMap, folder.name);

      totalProcessed += result.total;
      totalUploaded += result.uploaded;
      totalFailed += result.failed;

      // 批次间延迟，避免过载
      if (i + batchSize < newFiles.length) {
        console.log('等待2秒后处理下一批...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    totalSkipped += skippedCount;
  }

  // 5. 最终总结
  console.log(`\n${'='.repeat(50)}`);
  console.log('上传完成总结');
  console.log(`${'='.repeat(50)}`);
  console.log(`总处理: ${totalProcessed} 个视频`);
  console.log(`上传成功: ${totalUploaded} 个 ✅`);
  console.log(`上传失败: ${totalFailed} 个 ❌`);
  console.log(`跳过已上传: ${totalSkipped} 个 ⏭️`);
  console.log(`结束时间: ${new Date().toLocaleString()}`);

  if (totalFailed > 0) {
    console.log(`\n⚠️  有 ${totalFailed} 个视频上传失败，请检查错误信息`);
    process.exit(1);
  } else {
    console.log(`\n🎉 所有视频上传成功！`);
  }
}

// 执行主函数
main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});