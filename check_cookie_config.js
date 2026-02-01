// 检查 Supabase 客户端配置
const fs = require('fs');
const path = require('path');

// 检查 client.ts
const clientPath = path.join(__dirname, 'src/lib/supabase/client.ts');
if (fs.existsSync(clientPath)) {
  const content = fs.readFileSync(clientPath, 'utf-8');
  console.log('=== src/lib/supabase/client.ts ===');
  console.log(content);
}

console.log('\n=== Environment Variables ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
