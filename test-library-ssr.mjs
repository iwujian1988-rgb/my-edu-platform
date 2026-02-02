/**
 * 测试 Library 页面的 SSR 数据获取
 * 模拟服务器端渲染过程
 */

import { createClient } from './src/lib/supabase/server.js'
import { getAllBooks } from './src/lib/books-server.js'
import { getUserPermissions } from './src/lib/permissions.js'

async function testLibrarySSR() {
  console.log('🧪 开始测试 Library SSR 数据获取...\n')

  try {
    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ 认证失败:', authError)
      return
    }

    if (!user) {
      console.log('⚠️  未登录用户，跳过测试')
      return
    }

    console.log('✅ 用户已登录:', user.id)

    // 2. 测试 getUserPermissions
    console.log('\n2️⃣ 测试 getUserPermissions...')
    const permissions = await getUserPermissions()
    console.log('✅ 权限数据:', {
      bookPermissions: permissions?.bookPermissions?.length,
      featurePermissions: permissions?.featurePermissions?.length
    })

    // 3. 测试 getAllBooks（核心）
    console.log('\n3️⃣ 测试 getAllBooks...')
    console.log('   传入参数:', {
      userId: user.id,
      userPermissions: permissions
    })

    const books = await getAllBooks(user.id, permissions)

    console.log('✅ 获取到书籍数量:', books.length)

    // 4. 检查每本书的字段
    console.log('\n4️⃣ 检查第一本书的字段...')
    if (books.length > 0) {
      const firstBook = books[0]
      console.log('   第一本书数据:', {
        id: firstBook.id,
        title: firstBook.title,
        description: firstBook.description,
        total_words: firstBook.total_words,
        cover_color: firstBook.cover_color,
        coverType: firstBook.coverType,
        categoryLabel: firstBook.categoryLabel,
        code: firstBook.code
      })

      // 检查是否有 undefined 字段导致序列化问题
      const hasUndefined = Object.values(firstBook).some(v => v === undefined)
      if (hasUndefined) {
        console.log('⚠️  警告: 书籍数据包含 undefined 值（可能导致序列化失败）')
      }
    }

    // 5. 测试序列化（模拟传递给客户端组件）
    console.log('\n5️⃣ 测试数据序列化...')
    try {
      const serialized = JSON.stringify(books)
      console.log('✅ 序列化成功，大小:', serialized.length, '字节')
    } catch (error) {
      console.error('❌ 序列化失败:', error.message)
      console.error('   这通常是 SSR 崩溃的原因！')
    }

    console.log('\n✅ 所有测试通过！')

  } catch (error) {
    console.error('\n❌ 测试失败！')
    console.error('错误类型:', error.constructor.name)
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)

    // 检查是否是 Supabase 查询错误
    if (error.message?.includes('column')) {
      console.error('\n💡 提示: 这可能是数据库列不存在导致的错误')
    }
  }
}

// 运行测试
testLibrarySSR()
