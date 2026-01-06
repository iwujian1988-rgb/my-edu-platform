-- ============================================
-- 修改 books 表 - 添加审核相关字段
-- 版本: v1.0
-- 创建日期: 2026-01-06
-- 说明: 为用户创建的词库添加审核功能，支持审核通过/拒绝流程
-- ============================================

-- 步骤 1: 添加审核相关字段
ALTER TABLE books ADD COLUMN IF NOT EXISTS review_status VARCHAR(20)
  CHECK (review_status IN ('pending', 'approved', 'rejected'))
  DEFAULT 'pending';

ALTER TABLE books ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS reviewed_by UUID;  -- 审核人ID（可关联 administrators）
ALTER TABLE books ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- 步骤 2: 添加注释
COMMENT ON COLUMN books.review_status IS '审核状态：pending(待审核) | approved(已通过) | rejected(已拒绝)';
COMMENT ON COLUMN books.review_reason IS '审核意见/拒绝原因';
COMMENT ON COLUMN books.reviewed_by IS '审核人ID（管理员）';
COMMENT ON COLUMN books.reviewed_at IS '审核时间';

-- 步骤 3: 添加索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_books_review_status ON books(review_status);
CREATE INDEX IF NOT EXISTS idx_books_reviewed_at ON books(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_reviewed_by ON books(reviewed_by);

-- ============================================
-- 字段说明与业务逻辑
-- ============================================

-- 审核流程:
--
-- 1. 用户创建自定义词库:
--    is_official = false
--    is_published = true (默认)
--    review_status = 'pending' (默认)
--    → 词库对创建者可见，对其他用户不可见
--
-- 2. 管理员审核词库:
--    审核通过:
--      review_status = 'approved'
--      reviewed_by = 管理员ID
--      reviewed_at = 当前时间
--      → 词库对所有用户可见
--
--    审核拒绝:
--      review_status = 'rejected'
--      review_reason = '拒绝原因'
--      reviewed_by = 管理员ID
--      reviewed_at = 当前时间
--      → 词库对创建者可见，但标记为"已拒绝"
--      → 创建者可以修改后重新提交审核

-- 3. 官方词库:
--    is_official = true
--    review_status = 'approved' (自动设置)
--    → 无需审核，直接发布

-- ============================================
-- 视图：词库审核列表
-- ============================================

-- 创建视图，方便管理后台查询待审核词库
CREATE OR REPLACE VIEW books_pending_review AS
SELECT
  b.*,
  u.phone_number as creator_phone,
  u.email as creator_email,
  (SELECT COUNT(*) FROM words w JOIN chapters c ON w.chapter_id = c.id WHERE c.book_id = b.id) as actual_word_count
FROM books b
LEFT JOIN users u ON b.created_by = u.id
WHERE b.review_status = 'pending'
  AND b.is_official = false
ORDER BY b.created_at ASC;

COMMENT ON VIEW books_pending_review IS '待审核词库视图 - 管理后台使用';

-- ============================================
-- 辅助函数
-- ============================================

-- 函数：提交词库审核（用户修改后重新提交）
CREATE OR REPLACE FUNCTION resubmit_book_for_review(book_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE books
  SET review_status = 'pending',
      review_reason = NULL,
      reviewed_by = NULL,
      reviewed_at = NULL
  WHERE id = book_id
    AND is_official = false;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resubmit_book_for_review IS '重新提交词库审核';

-- ============================================
-- 使用示例
-- ============================================

-- 示例 1: 用户创建自定义词库
-- INSERT INTO books (title, description, category, is_official, created_by, review_status)
-- VALUES ('我的英语词库', '日常学习使用', 'custom', false, 'user-uuid', 'pending');

-- 示例 2: 管理员审核通过
-- UPDATE books
-- SET
--   review_status = 'approved',
--   reviewed_by = 'admin-uuid',
--   reviewed_at = NOW()
-- WHERE id = 'book-uuid';

-- 示例 3: 管理员审核拒绝
-- UPDATE books
-- SET
--   review_status = 'rejected',
--   review_reason = '词库包含违规内容，请修改后重新提交',
--   reviewed_by = 'admin-uuid',
--   reviewed_at = NOW()
-- WHERE id = 'book-uuid';

-- 示例 4: 用户修改后重新提交审核
-- SELECT resubmit_book_for_review('book-uuid');

-- 示例 5: 查询待审核词库列表
-- SELECT
--   id,
--   title,
--   creator_phone,
--   created_at,
--   actual_word_count
-- FROM books_pending_review
-- ORDER BY created_at ASC;

-- 示例 6: 查询某个用户创建的词库及审核状态
-- SELECT
--   title,
--   review_status,
--   review_reason,
--   reviewed_at
-- FROM books
-- WHERE created_by = 'user-uuid'
--   AND is_official = false
-- ORDER BY created_at DESC;

-- 示例 7: 统计各状态词库数量
-- SELECT
--   review_status,
--   COUNT(*) as count
-- FROM books
-- WHERE is_official = false
-- GROUP BY review_status;

-- ============================================
-- 前端显示逻辑
-- ============================================

-- 词库列表页（用户端）:
--   - 只显示 review_status = 'approved' 的词库
--   - 或者自己创建的词库（任何状态）
--
-- 查询示例:
-- SELECT * FROM books
-- WHERE review_status = 'approved'
--    OR created_by = current_user_id
-- ORDER BY created_at DESC;

-- 我的词库页面（用户端）:
--   - 显示当前用户创建的所有词库
--   - 根据 review_status 显示不同标签:
--     - pending: "审核中"
--     - approved: "已通过"
--     - rejected: "已拒绝" + 显示拒绝原因
--
-- 审核结果通知:
--   - 当 review_status 从 pending 变为 approved/rejected 时
--   - 发送站内信或邮件通知创建者

-- ============================================
-- 数据完整性
-- ============================================

-- 约束：官方词库自动设置为已审核
-- 使用触发器实现（可选）

CREATE OR REPLACE FUNCTION auto_approve_official_books()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_official = true AND NEW.review_status = 'pending' THEN
    NEW.review_status := 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_approve_official_books
  BEFORE INSERT OR UPDATE ON books
  FOR EACH ROW
  WHEN (NEW.is_official = true)
  EXECUTE FUNCTION auto_approve_official_books();

COMMENT ON FUNCTION auto_approve_official_books IS '官方词库自动设置为已审核状态';

-- ============================================
-- 注意事项
-- ============================================

-- 1. review_status 与 is_published 的关系:
--    - is_published: 控制词库是否上架（软删除）
--    - review_status: 控制审核状态
--    - 两者独立，但查询时需要同时考虑
--
-- 2. 审核通过后的词库:
--    - review_status = 'approved'
--    - is_published = true
--    - 对所有用户可见
--
-- 3. 审核拒绝的词库:
--    - review_status = 'rejected'
--    - is_published = true (默认)
--    - 只对创建者可见，其他用户看不到
--
-- 4. 待审核的词库:
--    - review_status = 'pending'
--    - is_published = true (默认)
--    - 只对创建者可见
--
-- 5. 下架的词库:
--    - is_published = false
--    - 无论 review_status 是什么，都不显示
--    - 相当于软删除

-- 查询示例：获取对用户可见的词库
-- SELECT * FROM books
-- WHERE is_published = true
--   AND (
--     review_status = 'approved'  -- 已通过审核的词库
--     OR created_by = current_user_id  -- 或自己创建的词库
--   )
-- ORDER BY created_at DESC;
