import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()

  // Create the function to check if user exists in auth.users
  const sql = `
    -- Create function to check if user exists in auth.users by phone number
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

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION get_user_by_phone(TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION get_user_by_phone(TEXT) TO anon;
  `

  // Execute SQL using RPC
  const { data, error } = await (supabase as any).rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
