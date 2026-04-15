/**
 * 为新上传的视频匹配标签
 * 从JSON文件中提取theme和category，与系统中的标签进行匹配
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
 * 读取JSON文件获取标签信息
 */
function getTagsFromJson(jsonPath) {
  try {
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const tags = [];

    // 从 unit_1 中提取标签
    if (jsonContent.materials && jsonContent.materials.unit_1) {
      const unit1 = jsonContent.materials.unit_1;

      // 提取 theme
      if (unit1.learning_objectives) {
        const theme = unit1.learning_objectives.theme;
        if (theme) {
          tags.push({ type: 'theme', value: theme });
        }
      }

      // 提取 deep_learning 中的 categories
      if (unit1.deep_learning && unit1.deep_learning.vocabulary_network) {
        const vocabNetwork = unit1.deep_learning.vocabulary_network;

        // 添加主主题
        if (vocabNetwork.theme) {
          tags.push({ type: 'theme', value: vocabNetwork.theme });
        }

        // 添加分类
        if (vocabNetwork.related_groups && Array.isArray(vocabNetwork.related_groups)) {
          vocabNetwork.related_groups.forEach(group => {
            if (group.category) {
              tags.push({ type: 'category', value: group.category });
            }
          });
        }
      }
    }

    return tags;
  } catch (error) {
    console.error(`读取JSON失败: ${jsonPath}`, error.message);
    return [];
  }
}

/**
 * 在系统中查找或创建标签
 */
async function findOrCreateTag(tagName) {
  // 先尝试查找现有标签
  const { data: existingTag, error: findError } = await supabase
    .from('video_tags')
    .select('id, name')
    .ilike('name', `%${tagName}%`)
    .single();

  if (!findError && existingTag) {
    console.log(`  找到现有标签: ${existingTag.name}`);
    return existingTag.id;
  }

  // 如果没找到，创建新标签
  console.log(`  创建新标签: ${tagName}`);
  const { data: newTag, error: createError } = await supabase
    .from('video_tags')
    .insert({
      name: tagName,
      type: 'topic',
      color: '#3B82F6',
      display_order: 0
    })
    .select('id')
    .single();

  if (createError) {
    console.error(`    创建标签失败: ${createError.message}`);
    return null;
  }

  console.log(`    标签ID: ${newTag.id}`);
  return newTag.id;
}

/**
 * 为视频添加标签关联
 */
async function addTagsToVideo(videoId, tagIds) {
  if (tagIds.length === 0) {
    console.log('  没有标签需要添加');
    return 0;
  }

  const relations = tagIds.map(tagId => ({
    video_id: videoId,
    tag_id: tagId
  }));

  const { error: insertError } = await supabase
    .from('video_tag_relations')
    .insert(relations);

  if (insertError) {
    console.error(`  添加标签关联失败: ${insertError.message}`);
    return 0;
  }

  console.log(`  ✅ 成功添加 ${tagIds.length} 个标签关联`);
  return tagIds.length;
}

/**
 * 处理单个视频
 */
async function processVideo(video, jsonPath) {
  console.log(`\n处理视频: ${video.title}`);
  console.log(`  JSON: ${path.basename(jsonPath)}`);

  // 1. 从JSON提取标签
  const tags = getTagsFromJson(jsonPath);
  console.log(`  提取到 ${tags.length} 个标签:`);
  tags.forEach(tag => {
    console.log(`    - ${tag.type}: ${tag.value}`);
  });

  if (tags.length === 0) {
    console.log('  没有找到标签数据，跳过');
    return false;
  }

  // 2. 查找或创建标签
  const tagIds = [];
  for (const tag of tags) {
    const tagId = await findOrCreateTag(tag.value);
    if (tagId) {
      tagIds.push(tagId);
    }
  }

  // 3. 为视频添加标签关联
  const addedCount = await addTagsToVideo(video.id, tagIds);

  return addedCount > 0;
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 为新上传的视频匹配标签 ===\n');

  const linshiPath = './linshi';
  const folders = [
    path.join(linshiPath, 'InnerFrench 中级法语_processed'),
    path.join(linshiPath, 'Louis法语课_processed'),
    path.join(linshiPath, 'SBS简易法语_processed')
  ];

  // 获取最近上传的视频（草稿状态）
  const { data: draftVideos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, creator_name, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (videosError) {
    console.error('查询视频失败:', videosError.message);
    return;
  }

  console.log(`找到 ${draftVideos.length} 个草稿视频\n`);

  // 按频道分组视频
  const channelGroups = {};
  for (const video of draftVideos) {
    if (!channelGroups[video.creator_name]) {
      channelGroups[video.creator_name] = [];
    }
    channelGroups[video.creator_name].push(video);
  }

  let totalProcessed = 0;
  let totalTagsAdded = 0;

  // 处理每个频道的视频
  for (const folderPath of folders) {
    const channelName = path.basename(folderPath).replace('_processed', '');
    const videos = channelGroups[channelName] || [];

    if (videos.length === 0) {
      console.log(`\n跳过频道: ${channelName} (没有对应视频)`);
      continue;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`处理频道: ${channelName}`);
    console.log(`${'='.repeat(50)}`);

    // 获取该频道的JSON文件
    const jsonFiles = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('_materials.json'))
      .sort();

    console.log(`找到 ${jsonFiles.length} 个JSON文件`);
    console.log(`需要处理 ${videos.length} 个视频`);

    // 为每个视频匹配JSON文件并添加标签
    for (let i = 0; i < Math.min(videos.length, jsonFiles.length); i++) {
      const video = videos[i];
      const jsonFile = jsonFiles[i];
      const jsonPath = path.join(folderPath, jsonFile);

      const success = await processVideo(video, jsonPath);
      if (success) {
        totalProcessed++;
        totalTagsAdded++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('处理完成');
  console.log(`${'='.repeat(50)}`);
  console.log(`处理视频: ${totalProcessed} 个`);
  console.log(`添加标签: ${totalTagsAdded} 个`);
}

main();