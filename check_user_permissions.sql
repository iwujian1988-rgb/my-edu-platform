-- 检查用户权限
SELECT 
  u.id,
  u.email,
  u.phone,
  up.permissions,
  up.book_permissions,
  up.is_admin,
  up.is_active
FROM auth.users u
LEFT JOIN user_permissions up ON up.user_id = u.id
WHERE u.id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea';
