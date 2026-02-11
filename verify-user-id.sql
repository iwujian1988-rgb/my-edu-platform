-- 查询用户ID
SELECT id, email, raw_user_meta_data->>'phone' as phone 
FROM auth.users 
WHERE email = '15652936305@phone.xiaoyu.com' 
   OR raw_user_meta_data->>'phone' = '15652936305';
