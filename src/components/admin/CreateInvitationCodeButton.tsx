'use client'

/**
 * 创建邀请码按钮组件（客户端组件）
 */

import { useState } from 'react'

export function CreateInvitationCodeButton() {
  const [loading, setLoading] = useState(false)

  const handleCreate = () => {
    const count = prompt('请输入要创建的邀请码数量：', '1')
    const num = parseInt(count || '1')
    if (num && num > 0 && num <= 100) {
      createInvitationCodes(num)
    } else if (num > 100) {
      alert('一次最多创建 100 个邀请码')
    }
  }

  async function createInvitationCodes(count: number) {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? '创建中...' : '+ 创建邀请码'}
    </button>
  )
}
