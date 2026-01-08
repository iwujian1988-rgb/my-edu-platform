const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const NEXT_PUBLIC_SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)?.[1]?.trim();
const SUPABASE_SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)?.[1]?.trim();

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const userId = '7078b0aa-d06a-4209-b669-1a0d4985c8ea';

  console.log('========================================');
  console.log('检查用户权限数据');
  console.log('========================================\n');

  // 1. 查询用户详细信息
  console.log('【1】用户详细信息：');
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('  邮箱:', user.email);
  console.log('  功能权限:', user.feature_permissions);
  console.log('  单词书权限:', user.book_permissions);
  console.log('  权限到期时间:', user.permission_expires_at);
  console.log('  邀请码ID:', user.invitation_code_id);

  // 2. 查询邀请码信息
  console.log('\n【2】邀请码信息：');
  const { data: invitationCode } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('id', user.invitation_code_id)
    .single();

  if (invitationCode) {
    console.log('  邀请码:', invitationCode.code);
    console.log('  套餐ID:', invitationCode.package_id);
    console.log('  邀请码有效期(天):', invitationCode.validity_days);
    console.log('  邀请码功能权限快照:', invitationCode.feature_permissions);
    console.log('  邀请码书权限快照:', invitationCode.book_permissions);
  }

  // 3. 查询套餐信息
  if (invitationCode?.package_id) {
    console.log('\n【3】套餐信息：');
    const { data: pkg } = await supabase
      .from('invitation_packages')
      .select('*')
      .eq('id', invitationCode.package_id)
      .single();

    if (pkg) {
      console.log('  套餐名称:', pkg.name);
      console.log('  套餐描述:', pkg.description);
      console.log('  套餐有效期(天):', pkg.duration_days);
      console.log('  套餐功能权限:', pkg.feature_permissions);
      console.log('  套餐书权限:', pkg.book_permissions);

      // 4. 分析问题
      console.log('\n========================================');
      console.log('【问题分析】');
      console.log('========================================\n');

      console.log('套餐配置:');
      console.log('  - duration_days:', pkg.duration_days, (pkg.duration_days ? '(非null，具体天数)' : '(null，永久)'));
      console.log('\n用户权限:');
      console.log('  - permission_expires_at:', user.permission_expires_at);
      console.log('  - 期望:', pkg.duration_days ? '应该有具体到期时间' : '应该是null（永久）');

      if (pkg.duration_days === null && user.permission_expires_at !== null) {
        console.log('\n❌ BUG发现：套餐是永久的，但用户权限有到期时间！');
        console.log('   可能原因：注册时没有正确使用套餐的duration_days');
      } else if (pkg.duration_days === null && user.permission_expires_at === null) {
        console.log('\n✅ 正确：套餐是永久的，用户权限也是永久的');
      }
    }
  }

  // 5. 计算到期时间
  if (user.permission_expires_at) {
    const now = new Date();
    const expireDate = new Date(user.permission_expires_at);
    const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    console.log('\n到期时间计算:');
    console.log('  当前时间:', now.toISOString());
    console.log('  到期时间:', expireDate.toISOString());
    console.log('  剩余天数:', daysLeft, '天');
  }
})();
