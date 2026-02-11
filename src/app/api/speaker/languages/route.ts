/**
 * 演说家模块 - 用户语言包管理 API
 *
 * 路由：/api/speaker/languages
 * 功能：
 * - GET: 获取用户已购买的语言列表
 * - POST: 购买语言包
 *
 * 参考：
 * - shangwenjie.md（演说家需求文档）
 * - TECHNICAL_MODIFICATION_PLAN.md（多语言支持方案）
 */

import { NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import type { SupportedLanguage, UserLanguagePurchase, LanguageProduct } from '@/types/speaker'

/**
 * GET - 获取用户可用语言列表（已购 + 未购）
 */
export async function GET(request: Request) {
  console.log('[Speaker Languages API] 获取用户语言列表')

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 获取所有语言包产品
    const { data: products, error: productsError } = await supabase
      .from('speaker_language_products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (productsError) {
      console.error('[Speaker Languages API] ❌ 获取语言包产品失败:', productsError)
      throw productsError
    }

    // 获取用户已购语言包
    const { data: purchases, error: purchasesError } = await supabase
      .from('speaker_user_language_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (purchasesError) {
      console.error('[Speaker Languages API] ❌ 获取用户购买记录失败:', purchasesError)
      throw purchasesError
    }

    // 创建已购语言映射
    const purchaseMap = new Map<SupportedLanguage, UserLanguagePurchase>()
    purchases?.forEach(purchase => {
      // 检查是否在有效期内
      const isActive = purchase.expires_at === null || new Date(purchase.expires_at) > new Date()
      if (isActive) {
        purchaseMap.set(purchase.language as SupportedLanguage, purchase)
      }
    })

    // 组合数据：产品 + 购买状态
    const languages = products?.map(product => ({
      ...product,
      is_purchased: purchaseMap.has(product.language as SupportedLanguage),
      purchase: purchaseMap.get(product.language as SupportedLanguage) || null
    })) || []

    console.log('[Speaker Languages API] ✅ 成功获取语言列表:', {
      total: languages.length,
      purchased: languages.filter(l => l.is_purchased).length
    })

    return NextResponse.json({ languages })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Languages API] ❌ 获取语言列表失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * POST - 购买语言包
 *
 * Body: {
 *   language: SupportedLanguage
 *   purchaseType: 'subscription' | 'lifetime'
 *   amount: number
 *   paymentMethod: string
 *   orderId?: string
 * }
 */
export async function POST(request: Request) {
  console.log('[Speaker Languages API] 购买语言包')

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { language, purchaseType, amount, paymentMethod, orderId } = body

    // 验证参数
    const validLanguages: SupportedLanguage[] = ['en', 'pl', 'es', 'fr', 'de', 'ja']
    if (!language || !validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'INVALID_LANGUAGE', message: '无效的语种' },
        { status: 400 }
      )
    }

    if (!['subscription', 'lifetime'].includes(purchaseType)) {
      return NextResponse.json(
        { error: 'INVALID_PURCHASE_TYPE', message: '无效的购买类型' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 检查是否已购买该语言
    const { data: existing } = await supabase
      .from('speaker_user_language_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('language', language)
      .eq('status', 'active')
      .single()

    if (existing) {
      // 如果是永久包，不能重复购买
      if (existing.purchase_type === 'lifetime') {
        return NextResponse.json(
          { error: 'ALREADY_PURCHASED', message: '您已拥有该语言包的永久权限' },
          { status: 400 }
        )
      }

      // 如果是订阅包，检查是否过期
      if (existing.expires_at && new Date(existing.expires_at) > new Date()) {
        return NextResponse.json(
          { error: 'ALREADY_PURCHASED', message: '您已拥有该语言包，有效期至 ' + existing.expires_at },
          { status: 400 }
        )
      }
    }

    // 计算到期时间
    let expiresAt: string | null = null
    if (purchaseType === 'subscription') {
      // 订阅制：默认1年
      const startDate = new Date()
      expiresAt = new Date(startDate.setFullYear(startDate.getFullYear() + 1)).toISOString()
    }

    // 插入购买记录
    const { data: purchase, error: insertError } = await supabase
      .from('speaker_user_language_purchases')
      .insert({
        user_id: user.id,
        language,
        purchase_type: purchaseType,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        amount,
        currency: 'CNY',
        payment_method: paymentMethod || 'manual',
        order_id: orderId || null,
        status: 'active'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Speaker Languages API] ❌ 插入购买记录失败:', insertError)
      throw insertError
    }

    console.log('[Speaker Languages API] ✅ 成功购买语言包:', {
      user: user.id,
      language,
      purchaseType,
      expiresAt
    })

    return NextResponse.json({
      success: true,
      purchase
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Languages API] ❌ 购买语言包失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '购买失败，请稍后重试' },
      { status: 500 }
    )
  }
}
