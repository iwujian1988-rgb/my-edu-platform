import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'colleague', def: 'A person you work with.', col: 'work colleague, colleague meeting', ex_en: 'I am having lunch with a colleague.', ex: '我要和一个同事去吃午饭。' },
  { w: 'deadline', def: 'The latest time to finish.', col: 'meet deadline, tight deadline', ex_en: 'The project deadline is next Friday.', ex: '项目的截止日期是下周五。' },
  { w: 'recruit', def: 'To hire someone for a job.', col: 'recruit new staff, recruit workers', ex_en: 'We need to recruit more sales staff.', ex: '我们需要招聘更多的销售人员。' },
  { w: 'proposal', def: 'A plan or suggestion.', col: 'make a proposal, accept proposal', ex_en: 'The committee rejected the proposal.', ex: '委员会拒绝了这个提议。' },
  { w: 'negotiate', def: 'To discuss to reach agreement.', col: 'negotiate a deal, negotiate price', ex_en: 'We need to negotiate a better deal.', ex: '我们需要谈成一笔更好的交易。' },
  { w: 'consensus', def: 'General agreement.', col: 'reach consensus, build consensus', ex_en: 'We could not reach a consensus.', ex: '我们未能达成共识。' },
  { w: 'leverage', def: 'To use something for advantage.', col: 'leverage resources, financial leverage', ex_en: 'We can leverage this opportunity.', ex: '我们可以利用这个机会。' },
  { w: 'concession', def: 'Something given up in agreement.', col: 'make concession, win concession', ex_en: 'Both sides made concessions.', ex: '双方都做出了让步。' },
  { w: 'abbreviate', def: 'To make something shorter.', col: 'abbreviate word, commonly abbreviated', ex_en: 'Please abbreviate this word.', ex: '请缩写这个词。' },
  { w: 'appetizer', def: 'Small dish before main meal.', col: 'order appetizer, serve appetizer', ex_en: 'I would like an appetizer first.', ex: '我想要先开胃菜。' },
  { w: 'recommendation', def: 'A suggestion or advice.', col: 'make recommendation, letter of recommendation', ex_en: 'Can you give a recommendation?', ex: '你能推荐一下吗？' },
  { w: 'compromise', def: 'An agreement by both sides.', col: 'reach compromise, make compromise', ex_en: 'We need to find a compromise.', ex: '我们需要找到折中方案。' },
  { w: 'clarify', def: 'To make something clear.', col: 'clarify meaning, please clarify', ex_en: 'Let me clarify my point.', ex: '让我澄清我的观点。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word, collocation_en, example_sentence_en')
  const toUpdate = []
  for (const d of data) {
    const matches = allWords.filter(w => w.word === d.w && (!w.collocation_en || w.example_sentence_en === 'undefined'))
    for (const m of matches) {
      toUpdate.push({ id: m.id, definition_en: d.def, collocation_en: d.col, example_sentence_en: d.ex_en, example_sentence: d.ex })
    }
  }
  console.log(`批次30: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次30完成: ${ok}个\n`)
}
update()
