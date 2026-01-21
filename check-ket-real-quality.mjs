import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const ketBookId = 'd6db96cf-080d-4294-9eea-63813bfc4227'

async function check() {
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('book_id', ketBookId)

  const chapterIds = chapters.map(c => c.id)

  const { data: words } = await supabase
    .from('words')
    .select('id, word, definition_en, collocation_en, example_sentence_en, example_sentence')
    .in('chapter_id', chapterIds)
    .order('word')

  console.log('KET单词总数:', words.length)

  const lowQuality = []

  for (const w of words) {
    let issues = []

    // 检查释义质量
    if (!w.definition_en || w.definition_en === 'related concept or action') {
      issues.push('无释义')
    } else if (w.definition_en.toLowerCase() === `a ${w.word.toLowerCase()}.` || w.definition_en.toLowerCase() === `an ${w.word.toLowerCase()}.`) {
      issues.push('释义重复')
    } else if (w.definition_en.length < 10) {
      issues.push('释义过短')
    }

    // 检查搭配
    if (!w.collocation_en) {
      issues.push('无搭配')
    } else if (w.collocation_en.includes('very') && w.collocation_en.includes('quite') && w.collocation_en.includes('and more')) {
      issues.push('搭配模板化')
    }

    // 检查例句
    if (!w.example_sentence_en) {
      issues.push('无英文例句')
    } else if (w.example_sentence_en.startsWith('This is a')) {
      issues.push('例句模板化')
    }

    // 检查中文例句
    if (!w.example_sentence) {
      issues.push('无中文例句')
    } else {
      // 检查是否包含英文单词
      const hasEnglish = /[a-zA-Z]{3,}/.test(w.example_sentence)
      if (hasEnglish) {
        issues.push('中文含英文')
      }
    }

    if (issues.length > 0) {
      lowQuality.push({
        word: w.word,
        issues: issues,
        def: w.definition_en,
        ex_en: w.example_sentence_en,
        ex: w.example_sentence
      })
    }
  }

  console.log('')
  console.log('真正高质量:', words.length - lowQuality.length)
  console.log('低质量:', lowQuality.length)
  console.log('进度: ' + (((words.length - lowQuality.length) / words.length) * 100).toFixed(1) + '%')
  console.log('')
  console.log('低质量单词列表 (前50个):')
  console.log('')

  lowQuality.slice(0, 50).forEach(w => {
    console.log(`【${w.word}】`)
    console.log(`  问题: ${w.issues.join(', ')}`)
    console.log(`  释义: ${w.def}`)
    console.log(`  英文例: ${w.ex_en}`)
    console.log(`  中文例: ${w.ex}`)
    console.log('')
  })
}
check()
