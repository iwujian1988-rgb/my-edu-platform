/**
 * 验证上传结果
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUploads() {
  console.log('=== 验证上传结果 ===\n');

  // 检查各个频道的视频数量
  const channels = ['InnerFrench 中级法语', 'Louis法语课', 'SBS简易法语'];

  for (const channel of channels) {
    const { data, error } = await supabase
      .from('videos')
      .select('id, title, status, creator_name, created_at')
      .eq('creator_name', channel)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`查询${channel}失败:`, error.message);
      continue;
    }

    console.log(`${channel}: ${data.length} 个视频`);

    // 统计状态
    const draftCount = data.filter(v => v.status === 'draft').length;
    const publishedCount = data.filter(v => v.status === 'published').length;

    console.log(`  草稿: ${draftCount}, 已发布: ${publishedCount}`);

    // 显示最新的几个视频
    if (data.length > 0) {
      console.log('  最新视频:');
      data.slice(0, 3).forEach(video => {
        console.log(`    - ${video.title.substring(0, 40)}... (${video.status})`);
      });
    }
    console.log('');
  }

  // 总统计
  const { data: allVideos } = await supabase
    .from('videos')
    .select('id, status, creator_name');

  if (allVideos) {
    const totalDraft = allVideos.filter(v => v.status === 'draft').length;
    const totalPublished = allVideos.filter(v => v.status === 'published').length;

    console.log('=== 总计 ===');
    console.log(`总视频数: ${allVideos.length}`);
    console.log(`草稿状态: ${totalDraft}`);
    console.log(`已发布状态: ${totalPublished}`);
  }
}

verifyUploads();