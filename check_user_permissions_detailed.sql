-- 检查用户权限详细信息
SELECT 
  u.id,
  u.email,
  u.phone,
  u.created_at,
  u.updated_at,
  -- users 表的权限字段
  u.feature_permissions,
  u.book_permissions,
  u.permission_expires_at,
  -- user_permissions 表的权限字段（如果存在）
  up.permissions as user_permissions_permissions,
  up.book_permissions as user_permissions_books,
  up.is_admin,
  up.is_active
FROM auth.users u
LEFT JOIN public.users u2 ON u2.id = u.id
LEFT JOIN public.user_permissions up ON up.user_id = u.id
WHERE u.id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea';
