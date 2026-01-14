-- Create function to check if user exists in auth.users by phone number
-- This function needs to be created by a superuser or with appropriate permissions
CREATE OR REPLACE FUNCTION get_user_by_phone(phone_param TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Query auth.users table (only accessible with service role key)
  RETURN QUERY
  SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'phone_number', au.email) as phone_number
  FROM auth.users au
  WHERE au.email = phone_param || '@phone.xiaoyu.com'
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_by_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_phone(TEXT) TO anon;
