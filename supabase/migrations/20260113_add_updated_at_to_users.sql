-- 修复 public.users 表缺少 updated_at 字段的问题
-- 这个字段是 Supabase Auth 触发器需要的

-- 添加 updated_at 字段
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 添加注释
COMMENT ON COLUMN public.users.updated_at IS '最后更新时间（Supabase Auth 触发器需要）';

-- 创建自动更新触发器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
