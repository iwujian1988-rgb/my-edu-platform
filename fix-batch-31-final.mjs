import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { id: '770e8400-e29b-41d4-a716-446655440001', w: 'agenda', def: 'A list of items to discuss.', col: 'on the agenda, daily agenda', ex_en: 'Could you please send me the agenda?', ex: '请把议程发给我好吗？' },
  { id: '0838a7a8-d179-4886-81f1-38e579753c7d', w: 'agenda', def: 'A list of items to discuss at a meeting.', col: 'meeting agenda, add to agenda', ex_en: 'Please check the agenda before the meeting.', ex: '请在会议前查看议程。' },
  { id: '2da62b11-b704-4efe-9c1f-437c304c324e', w: 'agenda', def: 'A plan of items to discuss.', col: 'set agenda, agenda items', ex_en: 'Let us add this to the agenda.', ex: '我们把这个加入议程吧。' },
  { id: 'de3042b2-a1db-4d16-af89-f9b4f411af64', w: 'schedule', def: 'A planned timeline of events.', col: 'tight schedule, work schedule', ex_en: 'I have a busy schedule today.', ex: '我今天日程很紧。' },
  { id: '2c49508b-a8ef-4c4d-8044-ddb9b1bd5836', w: 'meeting', def: 'A formal gathering for discussion.', col: 'attend meeting, hold meeting', ex_en: 'The meeting was very productive.', ex: '会议很富有成效。' },
  { id: '9ab09032-837f-426c-a014-d723dc091d85', w: 'project', def: 'A planned undertaking.', col: 'new project, project manager', ex_en: 'The project is going well.', ex: '项目进展顺利。' }
]
async function update() {
  console.log(`批次31: ${data.length}个`)
  let ok = 0
  for (const w of data) {
    const { error } = await supabase.from('words').update({ definition_en: w.def, collocation: w.ex, collocation_en: w.col, example_sentence: w.ex, example_sentence_en: w.ex_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次31完成: ${ok}个\n`)
}
update()
