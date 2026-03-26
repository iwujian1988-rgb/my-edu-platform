/**
 * UP主管理页面
 */

import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import UpstreamCreatorList from '@/components/admin/UpstreamCreatorList'

export const dynamic = 'force-dynamic'

export default async function UpstreamCreatorsPage() {
  try {
    await requireAdmin()
  } catch (error) {
    redirect('/admin/login')
  }

  const supabase = await createAdminClient()

  const { data: creators } = await supabase
    .from('upstream_creators')
    .select('*')
    .order('display_order', { ascending: true })
    .order('follower_count', { ascending: false })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UP主管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理视频来源的创作者信息</p>
        </div>
      </div>

      <UpstreamCreatorList initialCreators={creators || []} />
    </div>
  )
}
