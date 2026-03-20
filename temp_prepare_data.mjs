import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 难度级别映射
const BOOK_LEVEL_MAP = {
  "PEP小学3年级": "基础级", "PEP小学4年级": "基础级", "PEP小学5年级": "基础级",
  "PEP小学6年级": "基础级", "KET": "基础级",
  "PEP初中7年级": "初级", "PEP初中8年级": "初级", "PEP初中9年级": "初级",
  "外研社初中英语": "初级", "PET": "初级", "初中": "初级",
  "四级": "中级", "六级": "中级", "PETS3": "中级", "FCE": "中级",
  "考研": "中高级", "托福": "中高级", "雅思": "中高级", "PTE": "中高级",
  "北京高中英语": "中高级", "PEP高中英语": "中高级", "高中": "中高级",
  "GRE": "高级", "GMAT": "高级", "SAT": "高级", "专八": "高级",
}

async function main() {
  // 读取已保存的模板例句
  const badExamples = JSON.parse(fs.readFileSync('./temp/bad_examples_full.json', 'utf-8'))
  
  // 获取词书信息
  const { data: books } = await supabase.from('books').select('id, title')
  const bookMap = new Map(books?.map(b => [b.id, b.title]) || [])
  
  // 准备数据
  const prepared = badExamples.map(w => ({
    word: w.word,
    book_id: w.book_id,
    book_title: bookMap.get(w.book_id) || '未知',
    level: BOOK_LEVEL_MAP[bookMap.get(w.book_id)] || '中级',
    old_example: w.example_sentence_en
  }))
  
  // 保存为 Python 脚本需要的格式
  fs.writeFileSync('./temp/words_to_fix.json', JSON.stringify(prepared, null, 2))
  
  console.log(`已准备 ${prepared.length} 条数据`)
  console.log('保存到 temp/words_to_fix.json')
  
  // 显示分布
  const byLevel = {}
  prepared.forEach(w => {
    byLevel[w.level] = (byLevel[w.level] || 0) + 1
  })
  console.log('\n按难度分布:')
  Object.entries(byLevel).forEach(([level, count]) => {
    console.log(`  ${level}: ${count}`)
  })
}

main().catch(console.error)
