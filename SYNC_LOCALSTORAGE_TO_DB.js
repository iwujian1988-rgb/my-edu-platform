// ============================================
// 在浏览器控制台执行这个脚本
// 用于同步 localStorage 中的历史状态到数据库
// ============================================

(async function syncLocalStorageToDatabase() {
  console.log('🔄 开始同步 localStorage 到数据库...')

  // 获取所有词书的进度数据
  const allKeys = Object.keys(localStorage)
  const progressKeys = allKeys.filter(key => key.startsWith('word-progress-'))

  console.log(`📦 发现 ${progressKeys.length} 个词书的进度数据`)

  let totalSynced = 0
  let totalFailed = 0

  for (const key of progressKeys) {
    const bookId = key.replace('word-progress-', '')
    const data = localStorage.getItem(key)

    if (!data) continue

    try {
      const statusMap = JSON.parse(data)
      const wordIds = Object.keys(statusMap)

      if (wordIds.length === 0) continue

      console.log(`📚 词书 ${bookId}: ${wordIds.length} 个单词`)

      // 批量同步到数据库
      for (const wordId of wordIds) {
        const status = statusMap[wordId]

        try {
          const response = await fetch('/api/word-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              word_id: wordId,
              book_id: bookId,
              status: status
            })
          })

          if (response.ok) {
            totalSynced++
            console.log(`  ✅ ${wordId}: ${status}`)
          } else {
            totalFailed++
            console.error(`  ❌ ${wordId}: 失败`, response.status)
          }
        } catch (error) {
          totalFailed++
          console.error(`  ❌ ${wordId}: 异常`, error)
        }

        // 避免请求过快，延迟 100ms
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`❌ 解析 ${key} 失败:`, error)
    }
  }

  console.log(`\n✨ 同步完成！`)
  console.log(`  ✅ 成功: ${totalSynced}`)
  console.log(`  ❌ 失败: ${totalFailed}`)
  console.log(`\n💡 现在可以刷新错题本页面查看结果`)
})()
