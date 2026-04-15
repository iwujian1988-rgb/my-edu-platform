/**
 * 为视频智能匹配标签
 * 基于视频标题和频道名称，从24个系统标签中智能匹配2个
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 系统标签列表
const SYSTEM_TAGS = [
  '法语',
  '法国生活',
  '着装',
  '美食',
  '影视原声',
  '励志演讲',
  '纪录片',
  '职场商务',
  '科技前沿',
  '新闻时事',
  '生活Vlog',
  '旅行地理',
  '科普百科',
  '访谈谈话',
  '美食烹饪',
  '动漫二次元',
  '顶级思维',
  '搞钱',
  '个人成长',
  '考试干货',
  '文化深度',
  '社会观察',
  '艺术人文',
  '专家见解'
];

// 标签匹配规则（频道 + 关键词）
const CHANNEL_TAG_RULES = {
  'InnerFrench 中级法语': {
    primary: '法语',
    secondary: ['文化深度', '社会观察', '个人成长', '专家见解']
  },
  'Louis法语课': {
    primary: '法语',
    secondary: ['考试干货', '科普百科', '文化深度']
  },
  'SBS简易法语': {
    primary: '法语',
    secondary: ['新闻时事', '生活Vlog', '旅行地理', '美食烹饪']
  }
};

// 关键词匹配规则
const KEYWORD_TAG_RULES = [
  { keywords: ['immersion', 'bilingue', 'éducation', 'apprendre'], tag: '个人成长' },
  { keywords: ['politique', 'élection', 'société', 'social'], tag: '社会观察' },
  { keywords: ['culture', 'art', 'littérature', 'histoire'], tag: '文化深度' },
  { keywords: ['science', 'technologie', 'recherche'], tag: '科普百科' },
  { keywords: ['voyage', 'géographie', 'pays', 'région'], tag: '旅行地理' },
  { keywords: ['cuisine', 'recette', 'plat', 'restaurant'], tag: '美食烹饪' },
  { keywords: ['_mode', 'vêtement', 'style', 'fashion'], tag: '着装' },
  { keywords: ['travail', 'carrière', 'entreprise', 'profession'], tag: '职场商务' },
  { keywords: ['économie', 'argent', 'finances', 'investissement'], tag: '搞钱' },
  { keywords: [' examen', 'test', 'concours', 'étude'], tag: '考试干货' },
  { keywords: ['actualité', 'journal', 'news'], tag: '新闻时事' },
  { keywords: ['expert', 'spécialiste', 'professeur', 'chercheur'], tag: '专家见解' },
  { keywords: ['motivation', 'succès', 'défier'], tag: '励志演讲' },
  { keywords: ['documentaire', 'reportage'], tag: '纪录片' }
];

/**
 * 为视频智能匹配标签
 */
function matchTagsForVideo(video) {
  const { title, creator_name } = video;
  const lowerTitle = title.toLowerCase();
  const channel = creator_name;

  // 获取频道规则
  const channelRule = CHANNEL_TAG_RULES[channel];
  if (!channelRule) {
    return [SYSTEM_TAGS[0], SYSTEM_TAGS[19]]; // 默认：法语 + 个人成长
  }

  const tags = [channelRule.primary];

  // 基于关键词匹配第二个标签
  let matchedTag = null;

  for (const rule of KEYWORD_TAG_RULES) {
    const hasKeyword = rule.keywords.some(keyword => lowerTitle.includes(keyword));
    if (hasKeyword) {
      matchedTag = rule.tag;
      break;
    }
  }

  // 如果没有匹配到关键词，使用频道默认的 secondary 标签
  if (!matchedTag) {
    const secondaries = channelRule.secondary;
    matchedTag = secondaries[Math.floor(Math.random() * secondaries.length)];
  }

  tags.push(matchedTag);

  return tags.slice(0, 2);
}

/**
 * 获取标签ID
 */
async function getTagIds(tagNames) {
  const { data: tags, error } = await supabase
    .from('video_tags')
    .select('id, name')
    .in('name', tagNames);

  if (error) {
    console.error('查询标签失败:', error.message);
    return [];
  }

  return tags.map(tag => tag.id);
}

/**
 * 为视频添加标签关联
 */
async function addTagsToVideo(videoId, tagIds) {
  const relations = tagIds.map(tagId => ({
    video_id: videoId,
    tag_id: tagId
  }));

  const { error } = await supabase
    .from('video_tag_relations')
    .insert(relations);

  if (error) {
    console.error(`  添加标签关联失败: ${error.message}`);
    return false;
  }

  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 智能匹配视频标签 ===\n');

  // 1. 获取所有草稿视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, creator_name')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (videosError) {
    console.error('查询视频失败:', videosError.message);
    return;
  }

  console.log(`找到 ${videos.length} 个草稿视频\n`);

  let successCount = 0;

  // 2. 为每个视频匹配并添加标签
  for (const video of videos) {
    const matchedTags = matchTagsForVideo(video);
    console.log(`处理: ${video.title.substring(0, 50)}...`);
    console.log(`  频道: ${video.creator_name}`);
    console.log(`  匹配标签: ${matchedTags.join(', ')}`);

    const tagIds = await getTagIds(matchedTags);

    if (tagIds.length === 0) {
      console.log(`  ❌ 未找到标签ID\n`);
      continue;
    }

    const success = await addTagsToVideo(video.id, tagIds);

    if (success) {
      console.log(`  ✅ 标签添加成功\n`);
      successCount++;
    } else {
      console.log(`  ❌ 标签添加失败\n`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('处理完成');
  console.log(`${'='.repeat(50)}`);
  console.log(`成功处理: ${successCount}/${videos.length} 个视频`);
}

main();
