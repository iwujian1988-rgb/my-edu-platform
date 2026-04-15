/**
 * 为视频智能匹配标签 v2
 * 基于视频标题和内容关键词匹配，不固定频道标签
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 系统标签列表（排除"法语"）
const SYSTEM_TAGS = [
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

// 关键词匹配规则（优先级高到低）
const TAG_RULES = [
  // 社会观察
  { keywords: ['politique', 'élection', 'société', 'social', 'manifestation', 'grève', 'loi', 'gouvernement'], tag: '社会观察', priority: 10 },

  // 文化深度
  { keywords: ['culture', 'art', 'littérature', 'histoire', 'philosophie', 'écrivain', 'livre', 'roman'], tag: '文化深度', priority: 9 },

  // 个人成长
  { keywords: ['immersion', 'bilingue', 'apprendre', 'méthode', 'progresser', 'développer', 'competence', 'croissance'], tag: '个人成长', priority: 8 },

  // 专家见解
  { keywords: ['expert', 'spécialiste', 'professeur', 'chercheur', 'étude', 'recherche', 'analyse', 'scientifique'], tag: '专家见解', priority: 7 },

  // 新闻时事
  { keywords: ['actualité', 'journal', 'news', 'énigme', 'affaire', 'polémique', ' scandale'], tag: '新闻时事', priority: 6 },

  // 旅行地理
  { keywords: ['voyage', 'géographie', 'pays', 'région', 'ville', 'toulouse', 'marseille', 'paris', 'france'], tag: '旅行地理', priority: 5 },

  // 科普百科
  { keywords: ['science', 'technologie', 'expliquer', 'comprendre', 'découvrir', 'phénomène', 'curiosité'], tag: '科普百科', priority: 5 },

  // 生活Vlog
  { keywords: ['vie', 'quotidien', 'journal', 'vlog', 'jour', 'semiane', 'routine', 'expérience'], tag: '生活Vlog', priority: 4 },

  // 美食烹饪
  { keywords: ['cuisine', 'recette', 'plat', 'restaurant', 'manger', 'déjeuner', 'dîner', 'gastronomie'], tag: '美食烹饪', priority: 4 },

  // 考试干货
  { keywords: ['examen', 'test', 'concours', 'étude', 'réviser', 'préparer', 'grammaire', 'vocabulaire'], tag: '考试干货', priority: 3 },

  // 职场商务
  { keywords: ['travail', 'carrière', 'entreprise', 'profession', 'job', 'recrutement', 'salaire'], tag: '职场商务', priority: 3 },

  // 艺术人文
  { keywords: ['cinéma', 'film', 'musique', 'théâtre', 'exposition', 'musée', 'spectacle'], tag: '艺术人文', priority: 3 },

  // 励志演讲
  { keywords: ['motivation', 'succès', 'défi', 'objectif', 'réaliser', 'ambition', 'confiance'], tag: '励志演讲', priority: 2 },

  // 纪录片
  { keywords: ['documentaire', 'reportage', 'enquête', 'témoignage'], tag: '纪录片', priority: 2 },

  // 访谈谈话
  { keywords: ['interview', 'entretien', 'discussion', 'conversation', 'dialogue'], tag: '访谈谈话', priority: 2 }
];

/**
 * 为视频匹配标签（基于内容）
 */
function matchTagsForVideo(title) {
  const lowerTitle = title.toLowerCase();

  // 计算每个标签的匹配分数
  const tagScores = new Map();

  for (const rule of TAG_RULES) {
    let matchCount = 0;
    for (const keyword of rule.keywords) {
      if (lowerTitle.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const score = matchCount * rule.priority;
      const existing = tagScores.get(rule.tag) || 0;
      tagScores.set(rule.tag, existing + score);
    }
  }

  // 按分数排序，取前2个
  const sortedTags = Array.from(tagScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(entry => entry[0]);

  // 如果没有匹配到，返回默认标签
  if (sortedTags.length === 0) {
    return ['个人成长', '文化深度']; // 默认标签
  }

  // 如果只匹配到1个，补充一个相关标签
  if (sortedTags.length === 1) {
    const primaryTag = sortedTags[0];

    // 根据主标签选择相关标签
    const relatedMap = {
      '社会观察': ['新闻时事', '专家见解'],
      '文化深度': ['艺术人文', '专家见解'],
      '个人成长': ['考试干货', '科普百科'],
      '专家见解': ['科普百科', '社会观察'],
      '新闻时事': ['社会观察', '生活Vlog'],
      '旅行地理': ['法国生活', '文化深度'],
      '科普百科': ['专家见解', '个人成长'],
      '生活Vlog': ['美食烹饪', '旅行地理'],
      '美食烹饪': ['生活Vlog', '法国生活'],
      '考试干货': ['个人成长', '科普百科']
    };

    const relatedTags = relatedMap[primaryTag] || ['文化深度', '个人成长'];
    const secondaryTag = relatedTags[Math.floor(Math.random() * relatedTags.length)];

    return [primaryTag, secondaryTag];
  }

  return sortedTags;
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
  console.log('=== 智能匹配视频标签（基于内容）===\n');

  // 先删除现有的标签关联
  console.log('1. 清理现有标签关联...');
  const { error: deleteError } = await supabase
    .from('video_tag_relations')
    .delete()
    .not('tag_id', 'is', null);

  if (deleteError) {
    console.error('删除失败:', deleteError.message);
  } else {
    console.log('✅ 已清理现有标签关联\n');
  }

  // 2. 获取所有草稿视频
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, creator_name')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (videosError) {
    console.error('查询视频失败:', videosError.message);
    return;
  }

  console.log(`2. 找到 ${videos.length} 个草稿视频\n`);

  let successCount = 0;

  // 3. 为每个视频匹配并添加标签
  for (const video of videos) {
    const matchedTags = matchTagsForVideo(video.title);
    console.log(`处理: ${video.title.substring(0, 50)}...`);
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

  // 4. 显示标签统计
  const { data: allRelations } = await supabase
    .from('video_tag_relations')
    .select('tag_id, video_tags!inner(name)');

  if (allRelations) {
    const tagStats = new Map();
    for (const rel of allRelations) {
      const tagName = rel.video_tags?.name;
      tagStats.set(tagName, (tagStats.get(tagName) || 0) + 1);
    }

    console.log('\n标签使用统计:');
    const sortedStats = Array.from(tagStats.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [tag, count] of sortedStats) {
      console.log(`  ${tag}: ${count} 次`);
    }
  }
}

main();
