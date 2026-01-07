/**
 * 邀请码管理页面
 * 显示邀请码列表、创建新邀请码、禁用邀请码等功能
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { InvitationCodeList } from '@/components/admin/InvitationCodeList'

export default async function AdminInvitationCodesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  // 解析搜索参数
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const search = params.search || ''
  const status = params.status || ''

  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // 构建查询
  let query = supabase
    .from('invitation_codes')
    .select('*', { count: 'exact' })

  // 搜索条件
  if (search) {
    query = query.or(`code.ilike.%${search}%,note.ilike.%${search}%`)
  }

  // 状态筛选
  if (status === 'unused') {
    query = query.is('used_by', null)
  } else if (status === 'used') {
    query = query.not('used_by', 'is', null)
  } else if (status === 'disabled') {
    query = query.not('disabled_at', 'is', null)
  }

  // 分页查询
  const { data: codes, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching invitation codes:', error)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 1

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            邀请码管理
          </h1>
          <p className="text-gray-600 font-semibold">
            查看和管理邀请码，共 {count || 0} 个邀请码
          </p>
        </div>
        <CreateInvitationCodeButton />
      </div>

      {/* 邀请码列表 */}
      <InvitationCodeList
        codes={codes || []}
        totalCodes={count || 0}
        currentPage={page}
        totalPages={totalPages}
        search={search}
        status={status}
      />
    </div>
  )
}

/**
 * 创建邀请码按钮（服务端组件）
 */
function CreateInvitationCodeButton() {
  return (
    <button
      onClick={() => {
        const count = prompt('请输入要创建的邀请码数量：', '1')
        const num = parseInt(count || '1')
        if (num && num > 0) {
          createInvitationCodes(num)
        }
      }}
      className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all"
    >
      + 创建邀请码
    </button>
  )
}

/**
 * 创建邀请码的客户端函数
 */
async function createInvitationCodes(count: number) {
  try {
    const response = await fetch('/api/admin/invitation-codes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count })
    })

    if (response.ok) {
      const data = await response.json()
      alert(`成功创建 ${data.codes.length} 个邀请码！\n\n${data.codes.map((c: any) => c.code).join('\n')}`)
      window.location.reload()
    } else {
      const errorData = await response.json()
      alert(errorData.error || '创建失败')
    }
  } catch (error) {
    console.error('Error creating invitation codes:', error)
    alert('创建失败，请稍后重试')
  }
}
