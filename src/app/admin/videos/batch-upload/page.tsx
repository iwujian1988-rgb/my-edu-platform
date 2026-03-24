/**
 * 批量上传视频 - 服务端入口
 */

import { requireAdmin } from '@/lib/admin-auth'
import BatchUploadClient from './pageClient'

export default async function BatchUploadPage() {
  await requireAdmin()
  return <BatchUploadClient />
}
