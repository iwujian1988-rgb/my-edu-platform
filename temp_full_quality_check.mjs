import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取更多样本
  const { data: words } = await supabase
    .from('words')
    .select('word, example_sentence_en, part_of_speech')
    .not('example_sentence_en', 'is', null)
    .limit(10000)
  
  const problems = {
    template: [],      // 模板句
    tooShort: [],      // 太短（<5词的完整句子）
    grammar: [],       // 语法问题
    noContext: [],     // 无语境的简单句
  }
  
  // 检测模式
  const templatePattern = /This is a \w+\. \| I like/
  const grammarPatterns = [
    /This is a [aeiouAEIOU]\w+\. \|/,  // "This is a apple" (应该是 an)
    /^I like \w+\. \|/,                 // 开头就是 "I like X. |"
    /^This is a \w+ed\./,              // "This is a confused" (形容词不该加a)
  ]
  const simpleSentencePatterns = [
    /^[A-Z][a-z]+ (have|has|like|likes|love|loves|want|wants|need|needs) (a|an|the) \w+[\.\!]$/m,
  ]
  
  words?.forEach(w => {
    const ex = w.example_sentence_en || ''
    const sentences = ex.split('|').map(s => s.trim()).filter(s => s)
    
    // 1. 模板句检测
    if (templatePattern.test(ex)) {
      problems.template.push({ word: w.word, text: ex.substring(0, 60) })
      return
    }
    
    // 2. 检查每个句子
    for (const s of sentences) {
      const wordCount = s.split(/\s+/).length
      
      // 太短的完整句子
      if (wordCount < 5 && /^[A-Z]/.test(s) && /[\.!\?]$/.test(s)) {
        problems.tooShort.push({ word: w.word, text: s, count: wordCount })
      }
      
      // 语法问题
      for (const pattern of grammarPatterns) {
        if (pattern.test(s)) {
          problems.grammar.push({ word: w.word, text: s.substring(0, 60) })
          break
        }
      }
      
      // 无语境简单句
      if (simpleSentencePatterns.some(p => p.test(s))) {
        problems.noContext.push({ word: w.word, text: s })
      }
    }
  })
  
  console.log('============ 低质量例句全面检测 (样本10000条) ============\n')
  console.log(`模板句 (This is a X | I like X): ${problems.template.length}`)
  console.log(`太短的完整句子 (<5词): ${problems.tooShort.length}`)
  console.log(`语法问题: ${problems.grammar.length}`)
  console.log(`无语境简单句: ${problems.noContext.length}`)
  
  console.log('\n============ 模板句样本 ============')
  problems.template.slice(0, 5).forEach(p => console.log(`  ${p.word}: ${p.text}...`))
  
  console.log('\n============ 太短句子样本 ============')
  problems.tooShort.slice(0, 10).forEach(p => console.log(`  ${p.word} (${p.count}词): ${p.text}`))
  
  console.log('\n============ 语法问题样本 ============')
  problems.grammar.slice(0, 10).forEach(p => console.log(`  ${p.word}: ${p.text}...`))
  
  console.log('\n============ 无语境简单句样本 ============')
  problems.noContext.slice(0, 10).forEach(p => console.log(`  ${p.word}: ${p.text}`))
  
  // 估算总数
  const total = problems.template.length + problems.tooShort.length + problems.grammar.length + problems.noContext.length
  console.log(`\n============ 估算 ============`)
  console.log(`样本中问题例句: ${total} 条`)
  console.log(`按比例推算全部: ${Math.round(total / 10000 * 114806)} 条`)
}

main().catch(console.error)
