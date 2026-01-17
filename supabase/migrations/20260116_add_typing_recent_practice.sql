-- ============================================================================
-- 最近打字记录功能
-- 版本: v1.0.0
-- 日期: 2026-01-16
-- 说明: 存储用户最近的打字练习配置（词库+范围），方便快速继续
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 新增表：typing_recent_practice
-- ----------------------------------------------------------------------------
-- 说明：记录用户最近使用的词库+范围组合，最多保留10条
CREATE TABLE IF NOT EXISTS typing_recent_practice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  scope TEXT NOT NULL, -- all, new, known, fuzzy, unknown, mistakes
  last_practice_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  practice_count INTEGER DEFAULT 1 NOT NULL, -- 练习次数
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_typing_recent_practice_user_book
ON typing_recent_practice(user_id, book_id, scope);

CREATE INDEX IF NOT EXISTS idx_typing_recent_practice_last_practice
ON typing_recent_practice(user_id, last_practice_at DESC);

-- 添加注释
COMMENT ON TABLE typing_recent_practice IS '用户最近的打字练习配置记录（词库+范围）';
COMMENT ON COLUMN typing_recent_practice.user_id IS '用户ID';
COMMENT ON COLUMN typing_recent_practice.book_id IS '词库ID';
COMMENT ON COLUMN typing_recent_practice.scope IS '学习范围：all(全部) | new(生词) | known(已掌握) | fuzzy(模糊) | unknown(陌生) | mistakes(错词)';
COMMENT ON COLUMN typing_recent_practice.last_practice_at IS '最后练习时间';
COMMENT ON COLUMN typing_recent_practice.practice_count IS '该配置的练习次数统计';

-- 启用RLS
ALTER TABLE typing_recent_practice ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能查看自己的记录
CREATE POLICY "Users can view own recent typing practice"
ON typing_recent_practice FOR SELECT
USING (auth.uid() = user_id);

-- RLS策略：用户可以插入自己的记录
CREATE POLICY "Users can insert own recent typing practice"
ON typing_recent_practice FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS策略：用户可以更新自己的记录
CREATE POLICY "Users can update own recent typing practice"
ON typing_recent_practice FOR UPDATE
USING (auth.uid() = user_id);

-- RLS策略：用户可以删除自己的记录
CREATE POLICY "Users can delete own recent typing practice"
ON typing_recent_practice FOR DELETE
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 自动更新 updated_at 触发器
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_typing_recent_practice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER typing_recent_practice_updated_at
BEFORE UPDATE ON typing_recent_practice
FOR EACH ROW
EXECUTE FUNCTION update_typing_recent_practice_updated_at();

-- ----------------------------------------------------------------------------
-- 函数：记录或更新最近打字练习配置
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION save_typing_recent_practice(
  p_user_id UUID,
  p_book_id UUID,
  p_scope TEXT
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
BEGIN
  -- 查找是否已存在相同配置
  SELECT id INTO v_record_id
  FROM typing_recent_practice
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND scope = p_scope;

  IF v_record_id IS NOT NULL THEN
    -- 更新现有记录
    UPDATE typing_recent_practice
    SET
      last_practice_at = NOW(),
      practice_count = practice_count + 1
    WHERE id = v_record_id;

    RETURN v_record_id;
  ELSE
    -- 插入新记录
    INSERT INTO typing_recent_practice (user_id, book_id, scope)
    VALUES (p_user_id, p_book_id, p_scope)
    RETURNING id INTO v_record_id;

    -- 限制每个用户最多保留10条记录，删除最旧的
    DELETE FROM typing_recent_practice
    WHERE user_id = p_user_id
      AND id NOT IN (
        SELECT id
        FROM typing_recent_practice
        WHERE user_id = p_user_id
        ORDER BY last_practice_at DESC
        LIMIT 10
      );

    RETURN v_record_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_typing_recent_practice IS '保存或更新用户最近的打字练习配置（词库+范围）';

-- ----------------------------------------------------------------------------
-- 函数：获取用户最近的打字练习配置（最多5条）
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_typing_recent_practice(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  book_id UUID,
  book_title VARCHAR(255),
  scope TEXT,
  last_practice_at TIMESTAMPTZ,
  practice_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    trp.id,
    trp.book_id,
    COALESCE(b.title, b.name, '未命名词库') AS book_title,
    trp.scope,
    trp.last_practice_at,
    trp.practice_count
  FROM typing_recent_practice trp
  JOIN books b ON trp.book_id = b.id
  WHERE trp.user_id = p_user_id
  ORDER BY trp.last_practice_at DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_typing_recent_practice IS '获取用户最近的5条打字练习配置记录';

-- 授权
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION save_typing_recent_practice TO authenticated;
GRANT EXECUTE ON FUNCTION get_typing_recent_practice TO authenticated;
