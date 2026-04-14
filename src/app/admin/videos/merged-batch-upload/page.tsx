/**
 * 合并批量上传视频 - 服务端入口
 */

import { requireAdmin } from '@/lib/admin-auth'
import MergedBatchUploadClient from './pageClient'

export default async function MergedBatchUploadPage() {
  await requireAdmin()
  return <MergedBatchUploadClient />
}
