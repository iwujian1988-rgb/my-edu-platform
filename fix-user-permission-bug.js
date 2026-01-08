const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const NEXT_PUBLIC_SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)?.[1]?.trim();
const SUPABASE_SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)?.[1]?.trim();

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const userId = '7078b0aa-d06a-4209-b669-1a0d4985c8ea';

  console.log('========================================');
  console.log('修复用户权限bug');
  console.log('========================================\n');

  // 获取用户和邀请码信息
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: invitationCode } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('id', user.invitation_code_id)
    .single();

  const { data: pkg } = await supabase
    .from('invitation_packages')
    .select('*')
    .eq('id', invitationCode.package_id)
    .single();

  console.log('修复前：');
  console.log('  权限到期:', user.permission_expires_at);
  console.log('  书权限数量:', user.book_permissions.length);
  console.log('  功能权限数量:', user.feature_permissions.length);

  console.log('\n套餐配置（应该使用这个）：');
  console.log('  duration_days:', pkg.duration_days || 'null（永久）');
  console.log('  书权限:', pkg.book_permissions);
  console.log('  功能权限:', pkg.feature_permissions);

  // 修复：使用套餐的配置更新用户权限
  console.log('\n开始修复...');

  const { error: updateError } = await supabase
    .from('users')
    .update({
      // 使用套餐的duration_days，如果是null则设为null（永久）
      permission_expires_at: pkg.duration_days ? new Date(Date.now() + pkg.duration_days * 24 * 60 * 60 * 1000).toISOString() : null,
      // 使用邀请码快照的权限（应该等于套餐权限）
      book_permissions: invitationCode.book_permissions,
      feature_permissions: invitationCode.feature_permissions
    })
    .eq('id', userId);

  if (updateError) {
    console.log('❌ 修复失败:', updateError);
  } else {
    console.log('✅ 修复成功！\n');

    // 验证修复结果
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('修复后：');
    console.log('  权限到期:', updatedUser.permission_expires_at || 'null（永久）');
    console.log('  书权限:', updatedUser.book_permissions);
    console.log('  功能权限:', updatedUser.feature_permissions);
  }
})();
