/**
 * 录音上传 OSS STS Token API
 *
 * 为普通用户提供临时 OSS 上传凭证
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STS } from 'ali-oss'

export async function POST() {
  try {
    // 验证用户身份
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = {
      accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
      roleArn: process.env.OSS_STS_ROLE_ARN!
    }

    if (!config.accessKeyId || !config.accessKeySecret || !config.roleArn) {
      console.error('[oss-token] 缺少环境变量')
      return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 })
    }

    const sts = new STS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
    })

    // 生成临时凭证，有效期 1小时
    const result = await sts.assumeRole(
      config.roleArn,
      '', // policy 留空表示继承角色所有权限
      3600,
      `recording-upload-${user.id.slice(0, 8)}`
    )

    return NextResponse.json({
      region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hongkong',
      bucket: process.env.ALIYUN_OSS_BUCKET,
      accessKeyId: result.credentials.AccessKeyId,
      accessKeySecret: result.credentials.AccessKeySecret,
      stsToken: result.credentials.SecurityToken,
    })
  } catch (error: any) {
    console.error('[oss-token] STS Token 生成失败:', error)
    return NextResponse.json(
      { error: 'Failed to get STS token', details: error.message },
      { status: 500 }
    )
  }
}
