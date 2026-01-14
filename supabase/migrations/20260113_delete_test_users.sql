-- 创建删除测试用户的 RPC 函数
-- 使用 service role 权限删除 auth.users

CREATE OR REPLACE FUNCTION delete_test_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_auth_users INTEGER;
  deleted_word_progress INTEGER;
  deleted_user_book_preferences INTEGER;
BEGIN
  -- 删除 word_progress
  DELETE FROM word_progress;
  GET DIAGNOSTICS ROW_COUNT INTO deleted_word_progress;

  -- 删除 user_book_preferences
  DELETE FROM user_book_preferences;
  GET DIAGNOSTICS ROW_COUNT INTO deleted_user_book_preferences;

  -- 删除 auth.users（需要 service role）
  -- 注意：这里只能删除非管理员用户
  DELETE FROM auth.users
  WHERE id NOT IN (
    SELECT user_id FROM auth.users
    WHERE raw_user_meta_data->>'email' = '15652936305@phone.xiaoyu.com' -- 保留你的管理员账号
  );
  GET DIAGNOSTICS ROW_COUNT INTO deleted_auth_users;

  RETURN json_build_object(
    'success', true,
    'deleted_auth_users', deleted_auth_users,
    'deleted_word_progress', deleted_word_progress,
    'deleted_user_book_preferences', deleted_user_book_preferences,
    'message', '测试用户已清空'
  );
END;
$$;

COMMENT ON FUNCTION delete_test_users IS '删除所有测试用户（保留管理员账号）';
