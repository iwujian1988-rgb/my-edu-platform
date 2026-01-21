-- ============================================
-- 修复Supabase Auth用户创建失败问题
-- 在Supabase Dashboard的SQL Editor中运行
-- ============================================

-- 方案1: 删除并重建handle_new_user函数（移除password_hash字段）
-- 先删除旧函数
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 创建新函数（不包含password_hash字段）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    phone_number,
    full_name,
    avatar_url,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'username'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  );
  RETURN NEW;
END;
$$;

-- 创建触发器（如果不存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 验证函数是否创建成功
SELECT
    'handle_new_user函数已创建' as status,
    pg_get_functiondef(f.oid) as function_definition
FROM pg_proc f
JOIN pg_namespace n ON f.pronamespace = n.oid
WHERE f.proname = 'handle_new_user'
    AND n.nspname = 'public';

-- 验证触发器是否创建成功
SELECT
    '触发器已创建' as status,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
