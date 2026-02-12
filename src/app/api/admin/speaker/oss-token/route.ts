/**
 * OSS STS Token API (安全版)
 *
 * 功能：使用 STS 生成临时凭证，避免永久密钥泄露
 */

import { NextRequest, NextResponse } from 'next/server'
import { STS } from 'ali-oss'

export async function POST(request: NextRequest) {
  const config = {
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
    roleArn: process.env.OSS_STS_ROLE_ARN!
  }

  if (!config.accessKeyId || !config.accessKeySecret || !config.roleArn) {
    console.error('[OSS-Token] 缺少环境变量:', {
      hasAccessKeyId: !!config.accessKeyId,
      hasAccessKeySecret: !!config.accessKeySecret,
      hasRoleArn: !!config.roleArn
    })
    return NextResponse.json(
      { error: 'Server Configuration Error' },
      { status: 500 }
    )
  }

  try {
    const sts = new STS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
    })

    // 生成临时凭证，有效期 1小时 (3600秒)
    const result = await sts.assumeRole(
      config.roleArn,
      '', // policy 留空表示继承角色所有权限
      3600,
      'speaker-upload-session'
    )

    console.log('[OSS-Token] STS Token 生成成功')

    // 返回临时凭证（只返回临时值，不返回永久密钥）
    return NextResponse.json({
      region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hongkong',
      bucket: process.env.ALIYUN_OSS_BUCKET,
      accessKeyId: result.credentials.AccessKeyId,
      accessKeySecret: result.credentials.AccessKeySecret,
      stsToken: result.credentials.SecurityToken,
    })
  } catch (error: any) {
    console.error('[OSS-Token] STS Token 生成失败:', error)
    return NextResponse.json(
      { error: 'Failed to get STS token', details: error.message },
      { status: 500 }
    )
  }
}
