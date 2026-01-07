/**
 * 最近活动组件
 * 显示管理员操作日志
 */

import Link from 'next/link'

interface Log {
  id: string
  action: string
  target_type: string | null
  target_id: string | null
  created_at: string
  administrator: {
    name: string
    email: string
  } | null
}

interface RecentActivityProps {
  logs: Log[]
}

export function RecentActivity({ logs }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">最近活动</h3>
        <Link
          href="/admin/audit-logs"
          className="text-sm text-green-600 hover:text-green-700 font-semibold"
        >
          查看全部 →
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 font-semibold">暂无活动记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border-[2px] border-gray-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {log.administrator?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">
                  {log.administrator?.name || '未知管理员'}{' '}
                  <span className="text-gray-600">{getActionDisplayName(log.action)}</span>
                </p>
                {log.target_type && (
                  <p className="text-sm text-gray-600 mt-1">
                    {getTargetDisplayName(log.target_type, log.target_id)}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(log.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 获取操作显示名称
 */
function getActionDisplayName(action: string): string {
  const actionNames: Record<string, string> = {
    admin_login: '登录了管理后台',
    admin_logout: '退出了管理后台',
    create_invitation_code: '创建了邀请码',
    disable_invitation_code: '禁用了邀请码',
    delete_invitation_code: '删除了邀请码',
    ban_user: '封禁了用户',
    unban_user: '解封了用户',
    reset_password: '重置了用户密码',
    approve_book: '通过了词库审核',
    reject_book: '拒绝了词库审核',
    create_book: '创建了词库',
    delete_book: '删除了词库',
    modify_settings: '修改了系统设置'
  }

  return actionNames[action] || action
}

/**
 * 获取目标显示名称
 */
function getTargetDisplayName(type: string | null, id: string | null): string {
  if (!type) return ''

  const typeNames: Record<string, string> = {
    invitation_code: '邀请码',
    user: '用户',
    administrator: '管理员',
    book: '词库'
  }

  const typeName = typeNames[type] || type
  return id ? `${typeName} (${id.slice(0, 8)}...)` : typeName
}

/**
 * 格式化时间
 */
function formatTime(time: string): string {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}分钟前`
  }

  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}小时前`
  }

  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days}天前`
  }

  // 格式化为日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
