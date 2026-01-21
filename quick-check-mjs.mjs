// 快速检查：查看有多少单词没有任何进度记录
// 在浏览器控制台运行

async function quickCheck() {
  const bookId = 'YOUR_BOOK_ID' // 替换为实际的bookId

  // 获取总单词数
  const booksRes = await fetch(`/api/books/${bookId}`)
  const bookData = await booksRes.json()
  const totalWords = bookData.data.total_words

  // 获取有进度记录的单词数
  const progressRes = await fetch(`/api/word-progress?book_id=${bookId}`)
  const progressData = await progressRes.json()
  const progressCount = Object.keys(progressData.data || {}).length

  // 获取统计
  const statsRes = await fetch(`/api/words/stats?bookId=${bookId}`)
  const statsData = await statsRes.json()
  const stats = statsData.data

  console.log('📊 单词书统计')
  console.log(`总单词数: ${totalWords}`)
  console.log(`有进度记录: ${progressCount}`)
  console.log(`未标注: ${stats.new}`)
  console.log(`认识: ${stats.known}`)
  console.log(`模糊: ${stats.fuzzy}`)
  console.log(`不认识: ${stats.unknown}`)

  // 计算未标注的百分比
  const newPercentage = (stats.new / totalWords * 100).toFixed(1)
  console.log(`\n未标注占比: ${newPercentage}%`)

  if (stats.new < totalWords * 0.1) {
    console.log('\n⚠️ 警告：只有10%以下的单词是未标注状态！')
    console.log('建议：使用"重置进度"功能重新开始学习')
  }
}

// 运行检查
quickCheck()
