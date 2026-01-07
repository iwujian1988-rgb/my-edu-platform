import { redirect } from 'next/navigation'

// 简化的重定向页面
export default async function StudyPage() {
  // 直接重定向到首页
  // 用户应该从首页的"继续学习"卡片进入学习
  redirect('/')
}
