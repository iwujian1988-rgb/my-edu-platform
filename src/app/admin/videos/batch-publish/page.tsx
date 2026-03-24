/**
 * 批量发布视频 - 服务端入口
 */

import { requireAdmin } from '@/lib/admin-auth'
import BatchPublishClient from './pageClient'

export default async function BatchPublishPage() {
  await requireAdmin()
  return <BatchPublishClient />
}
