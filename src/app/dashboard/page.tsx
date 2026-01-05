import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // 重定向到首页（方案 C：首页直达）
  redirect('/')
}
