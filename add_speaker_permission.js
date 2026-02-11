const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSpeakerPermission() {
  // 获取用户
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'imwujianfei@163.com')
    .single();

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  console.log('Found user:', users.id);
  console.log('Current permissions:', users.permissions);

  // 添加 speaker 权限
  const currentPermissions = users.permissions || [];
  if (!currentPermissions.includes('speaker')) {
    const { data, error } = await supabase
      .from('users')
      .update({ permissions: [...currentPermissions, 'speaker'] })
      .eq('email', 'imwujianfei@163.com')
      .select();

    if (error) {
      console.error('Error updating permissions:', error);
    } else {
      console.log('✅ Successfully added speaker permission');
      console.log('New permissions:', data[0].permissions);
    }
  } else {
    console.log('✅ User already has speaker permission');
  }
}

addSpeakerPermission();
