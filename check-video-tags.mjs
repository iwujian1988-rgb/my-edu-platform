/**
 * 检查视频标签情况
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVideoTags() {
  console.log('=== 检查视频标签情况 ===\n');

  // 1. 检查系统中有哪些标签
  const { data: tags, error: tagsError } = await supabase
    .from('video_tags')
    .select('id, name, slug')
    .order('name');

  if (tagsError) {
    console.error('查询标签失败:', tagsError.message);
    return;
  }

  console.log(`系统中的标签 (${tags.length}个):`);
  tags.forEach(tag => {
    console.log(`  - ${tag.name} (${tag.slug})`);
  });
  console.log('');

  // 2. 检查视频标签关联
  const { data: videoTags, error: videoTagsError } = await supabase
    .from('videos_tags')
    .select('video_id, tag_id')
    .limit(20);

  if (videoTagsError) {
    console.error('查询视频标签关联失败:', videoTagsError.message);
    return;
  }

  console.log(`视频标签关联 (${videoTags.length}条):`);
  if (videoTags.length > 0) {
    videoTags.forEach(vt => {
      console.log(`  视频ID: ${vt.video_id}, 标签ID: ${vt.tag_id}`);
    });
  } else {
    console.log('  (没有视频标签关联)');
  }
  console.log('');

  // 3. 检查新上传的视频是否有标签
  const { data: recentVideos, error: videosError } = await supabase
    .from('videos')
    .select('id, title, creator_name, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(5);

  if (videosError) {
    console.error('查询视频失败:', videosError.message);
    return;
  }

  console.log('最近上传的视频:');
  for (const video of recentVideos) {
    // 检查每个视频的标签
    const { data: vTags } = await supabase
      .from('videos_tags')
      .select('tag_id')
      .eq('video_id', video.id);

    const tagCount = vTags ? vTags.length : 0;
    console.log(`  ${video.title.substring(0, 40)}...`);
    console.log(`    标签数量: ${tagCount}`);
  }
}

checkVideoTags();