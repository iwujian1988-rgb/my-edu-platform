import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRealWrong() {
  console.log('=== 检查历史听写记录中的实际答错单词 ===\n')

  const { data: submissions, error } = await supabase
    .from('speaker_dictation_submissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('查询失败:', error)
    return
  }

  console.log(`总共 ${submissions.length} 条听写记录\n`)

  let totalRealWrong = 0
  let totalSkipped = 0
  const wrongWordsList = []

  for (const submission of submissions) {
    const answers = submission.answers
    if (!answers) continue

    console.log(`\n记录 ${submission.id.slice(0, 8)}:`)
    console.log(`  统计: ${submission.wrong_count} 错误, ${submission.skipped_count} 放弃`)

    let realWrong = 0
    let skipped = 0

    for (const [sentenceIndexStr, answerEntry] of Object.entries(answers)) {
      const entry = answerEntry
      if (!entry.correctWords) continue

      const userWords = entry.userWords || []

      entry.correctWords.forEach((correctWord, wordIndex) => {
        const userInput = userWords[wordIndex]

        if (userInput === null || userInput === undefined || userInput === '') {
          skipped++
        } else if (userInput.trim().toLowerCase() !== correctWord.trim().toLowerCase()) {
          realWrong++
          wrongWordsList.push({
            word: correctWord,
            userInput: userInput,
            articleId: submission.article_id.slice(0, 8)
          })
        }
      })
    }

    totalRealWrong += realWrong
    totalSkipped += skipped

    console.log(`  实际分析: ${realWrong} 答错, ${skipped} 放弃`)
  }

  console.log('\n=== 总结 ===')
  console.log(`实际答错的单词总数: ${totalRealWrong}`)
  console.log(`放弃的单词总数: ${totalSkipped}`)
  console.log(`应该迁移到生词本的数量: ${totalRealWrong}`)

  if (wrongWordsList.length > 0) {
    console.log('\n=== 前10个答错的单词 ===')
    wrongWordsList.slice(0, 10).forEach(w => {
      console.log(`  "${w.userInput}" → "${w.word}" (文章: ${w.articleId})`)
    })
  }
}

checkRealWrong()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err)
    process.exit(1)
  })
