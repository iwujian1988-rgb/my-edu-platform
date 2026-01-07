'use server'

/**
 * 管理员登录 Server Action
 */

import { adminLogin } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: '请输入邮箱和密码' }
  }

  const result = await adminLogin(email, password)

  if (result.success) {
    // 登录成功，重定向到仪表盘或目标页面
    const redirectTo = formData.get('redirect') as string || '/admin/dashboard'
    redirect(redirectTo)
  } else {
    // 登录失败，返回错误信息
    return { error: result.error }
  }
}
