-- 修复 RPC 函数重载冲突：删除旧版 12 参数函数，只保留 13 参数版本（含 p_content_type）
-- 根因：两个同名函数参数数量不同，PostgREST 无法自动选择，导致所有 RPC 调用失败

-- 删除旧版（12 参数，无 p_content_type）
DROP FUNCTION IF EXISTS get_published_videos_paginated(
  int, int, varchar, varchar, uuid[], uuid[], varchar, uuid[], boolean, date
);
