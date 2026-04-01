import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/user-permission
 *
 * 获取用户权限信息
 *
 * 认证方式：API Key + HMAC 签名
 *
 * 请求头：
 * - Authorization: Bearer YOUR_API_KEY
 * - X-API-Signature: HMAC-SHA256 签名
 * - X-API-Timestamp: Unix 时间戳
 *
 * 签名生成：
 * signature = HMAC-SHA256(apiSecret, apiKey + timestamp)
 */

// 从环境变量读取 API 密钥配置
const API_KEYS = JSON.parse(process.env.EXTERNAL_API_KEYS || '{}')

interface RequestBody {
  phone: string
}

interface UserData {
  id: string
  phone_number: string | null
  permission_expires_at: string | null
  invitation_code_id: string | null
}

interface PackageData {
  name: string
  validity_days: number | null
}

export async function POST(request: Request) {
  try {
    // ===== 1. 验证签名 =====
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
    const signature = request.headers.get('x-api-signature')
    const timestamp = request.headers.get('x-api-timestamp')

    if (!apiKey || !signature || !timestamp) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: '缺少认证信息'
      }, { status: 401 })
    }

    // 验证 API Key
    const apiSecret = API_KEYS[apiKey]
    if (!apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: '无效的 API Key'
      }, { status: 401 })
    }

    // 验证时间戳（5分钟内有效）
    const now = Date.now()
    const requestTime = parseInt(timestamp)
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return NextResponse.json({
        success: false,
        error: 'SIGNATURE_EXPIRED',
        message: '签名已过期'
      }, { status: 401 })
    }

    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', apiSecret)
      .update(apiKey + timestamp)
      .digest('hex')

    if (signature !== expectedSignature) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: '签名验证失败'
      }, { status: 401 })
    }

    // ===== 2. 解析请求参数 =====
    const body: RequestBody = await request.json()
    const { phone } = body

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_PARAMS',
        message: '手机号格式错误'
      }, { status: 400 })
    }

    // ===== 3. 查询用户数据 =====
    const supabase = await createClient()

    // 先查询用户基本信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone_number, permission_expires_at, invitation_code_id')
      .eq('phone_number', phone)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      }, { status: 404 })
    }

    // 查询套餐信息（通过 users.package_ids）
    let packageDataList: PackageData[] = []
    const userPackageIds = (user as Record<string, unknown>).package_ids as string[] | null
    if (userPackageIds && userPackageIds.length > 0) {
      const { data: packages } = await supabase
        .from('invitation_packages')
        .select('name, validity_days')
        .in('id', userPackageIds)

      if (packages) {
        packageDataList = packages as PackageData[]
      }
    } else if (user.invitation_code_id) {
      // 兜底：通过邀请码查找套餐
      const { data: invitationCode } = await supabase
        .from('invitation_codes')
        .select('package_id, invitation_packages (name, validity_days)')
        .eq('id', user.invitation_code_id)
        .single()

      if (invitationCode) {
        packageDataList = [(invitationCode as Record<string, unknown>).invitation_packages as PackageData].filter(Boolean)
      }
    }

    // ===== 4. 处理数据 =====
    const userData = user as UserData

    // 计算是否有权限
    const hasPermission = userData.permission_expires_at === null ||
      new Date(userData.permission_expires_at) > new Date()

    // 获取套餐名称（合并所有套餐）
    const planName = packageDataList.length > 0
      ? packageDataList.map(p => p.name).join(' + ')
      : '未知套餐'

    // 计算套餐说明（取最长有效期）
    const validityDays = packageDataList.length > 0
      ? packageDataList.reduce<number | null>((max, p) => {
          if (p.validity_days === null) return null
          if (max === null) return p.validity_days
          return Math.max(max, p.validity_days)
        }, null as number | null)
      : null
    let planNameText = '未知'
    if (validityDays === null) {
      planNameText = '终身有效'
    } else if (validityDays >= 365) {
      const years = Math.floor(validityDays / 365)
      planNameText = `${years}年有效`
    } else if (validityDays >= 30) {
      const months = Math.floor(validityDays / 30)
      planNameText = `${months}个月有效`
    } else {
      planNameText = `${validityDays}天有效`
    }

    // 格式化到期时间
    let expiryDate = userData.permission_expires_at
    let expiryDateText = ''
    if (expiryDate === null) {
      expiryDateText = '永久有效'
    } else {
      const date = new Date(expiryDate)
      expiryDateText = date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }

    // ===== 5. 返回结果 =====
    return NextResponse.json({
      success: true,
      message: '查询成功',
      data: {
        has_permission: hasPermission,
        has_permission_text: hasPermission ? '有权限' : '无权限',
        expiry_date: expiryDate,
        expiry_date_text: expiryDateText,
        plan_name: planName,
        plan_name_text: planNameText
      }
    })

  } catch (error: any) {
    console.error('Error in POST /api/user-permission:', error)
    return NextResponse.json({
      success: false,
      error: 'SERVER_ERROR',
      message: '服务器错误'
    }, { status: 500 })
  }
}
