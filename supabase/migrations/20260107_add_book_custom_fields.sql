-- 添加自定义词库所需的字段到 books 表

-- 添加封面颜色字段
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_color TEXT DEFAULT 'from-green-400 to-green-500';

-- 添加创建者字段
ALTER TABLE books ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 添加封面URL字段（AI生成的封面）
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 添加注释
COMMENT ON COLUMN books.cover_color IS '封面渐变色（Tailwind CSS类名）';
COMMENT ON COLUMN books.created_by IS '创建者用户ID（自定义词库）';
COMMENT ON COLUMN books.cover_url IS 'AI生成的封面图片URL';

-- 创建索引
CREATE INDEX IF NOT EXISTS books_created_by_idx ON books(created_by);
