/**
 * 删除批量上传的标签
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteTags() {
  console.log('=== 删除批量上传的标签 ===\n');

  // 1. 删除视频标签关联
  const { error: relationsError } = await supabase
    .from('video_tag_relations')
    .delete()
    .not('tag_id', 'is', null);

  if (relationsError) {
    console.error('删除标签关联失败:', relationsError.message);
  } else {
    console.log('✅ 已删除所有视频标签关联');
  }

  // 2. 删除今天创建的标签
  const { data: tags, error: tagsError } = await supabase
    .from('video_tags')
    .select('id, name, created_at');

  if (tagsError) {
    console.error('查询标签失败:', tagsError.message);
    return;
  }

  console.log(`找到 ${tags.length} 个标签`);

  // 删除今天创建的标签
  const today = new Date().toISOString().split('T')[0];
  const todayTags = tags.filter(tag => tag.created_at && tag.created_at.startsWith(today));

  console.log(`其中今天创建的标签: ${todayTags.length} 个`);

  if (todayTags.length > 0) {
    const tagIds = todayTags.map(tag => tag.id);

    const { error: deleteError } = await supabase
      .from('video_tags')
      .delete()
      .in('id', tagIds);

    if (deleteError) {
      console.error('删除标签失败:', deleteError.message);
    } else {
      console.log(`✅ 已删除 ${tagIds.length} 个今天创建的标签`);
    }
  }

  // 3. 验证删除结果
  const { data: remainingTags, error: remainingError } = await supabase
    .from('video_tags')
    .select('id, name');

  if (!remainingError) {
    console.log(`\n剩余标签数量: ${remainingTags.length}`);
    if (remainingTags.length > 0) {
      console.log('剩余标签:');
      remainingTags.forEach(tag => {
        console.log(`  - ${tag.name}`);
      });
    }
  }

  const { count: remainingRelations } = await supabase
    .from('video_tag_relations')
    .select('*', { count: 'exact', head: true });

  console.log(`剩余标签关联数量: ${remainingRelations || 0}`);
}

deleteTags();
