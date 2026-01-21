import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'agenda', def: 'A list of items to be discussed.', col: 'on the agenda, daily agenda', ex_en: 'What is on the agenda today?', ex: '今天议程是什么？' },
  { w: 'schedule', def: 'A planned timeline.', col: 'tight schedule, work schedule', ex_en: 'I have a busy schedule.', ex: '我日程很紧。' },
  { w: 'meeting', def: 'A gathering for discussion.', col: 'attend meeting, hold meeting', ex_en: 'The meeting starts at 9 am.', ex: '会议早上9点开始。' },
  { w: 'deadline', def: 'The latest time to complete.', col: 'miss deadline, meet deadline', ex_en: 'We must meet the deadline.', ex: '我们必须按时完成。' },
  { w: 'project', def: 'A planned undertaking.', col: 'new project, complete project', ex_en: 'The project is progressing well.', ex: '项目进展顺利。' },
  { w: 'collaborate', def: 'To work together.', col: 'collaborate with, collaborate on', ex_en: 'We collaborate on many projects.', ex: '我们在很多项目上合作。' },
  { w: 'facilitate', def: 'To make easier.', col: 'facilitate learning, help facilitate', ex_en: 'Technology facilitates communication.', ex: '科技促进沟通。' },
  { w: 'consensus', def: 'General agreement.', col: 'reach consensus, build consensus', ex_en: 'We reached a consensus.', ex: '我们达成了一致。' },
  { w: 'priority', def: 'More important thing.', col: 'high priority, top priority', ex_en: 'Safety is our top priority.', ex: '安全是我们的首要任务。' },
  { w: 'efficient', def: 'Working well.', col: 'very efficient, more efficient', ex_en: 'This method is more efficient.', ex: '这个方法更高效。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次28: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次28完成: ${ok}个\n`)
}
update()
