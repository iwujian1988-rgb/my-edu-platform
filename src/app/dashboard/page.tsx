import { redirect } from 'next/navigation'

// 强制动态渲染，避免预渲染问题
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  // 重定向到首页（方案 C：首页直达）
  redirect('/')
}
