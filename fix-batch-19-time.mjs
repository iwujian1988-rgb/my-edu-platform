import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'time', def: 'The indefinite continued progress.', col: 'on time, spend time', ex_en: 'What time is it?', ex: '现在几点？' },
  { w: 'hour', def: 'A period of 60 minutes.', col: 'per hour, half hour', ex_en: 'The shop is open 24 hours a day.', ex: '这家店每天24小时营业。' },
  { w: 'minute', def: 'A period of 60 seconds.', col: 'wait a minute, in a minute', ex_en: 'I will be ready in a minute.', ex: '我一分钟就好。' },
  { w: 'second', def: 'A unit of time.', col: 'wait a second, every second', ex_en: 'Wait a second.', ex: '等一下。' },
  { w: 'day', def: 'A period of 24 hours.', col: 'every day, all day', ex_en: 'I work every day.', ex: '我每天工作。' },
  { w: 'week', def: 'A period of 7 days.', col: 'next week, last week', ex_en: 'See you next week.', ex: '下周见。' },
  { w: 'month', def: 'A period of about 30 days.', col: 'next month, last month', ex_en: 'My birthday is next month.', ex: '我生日在下个月。' },
  { w: 'year', def: 'A period of 365 days.', col: 'next year, last year', ex_en: 'I will graduate next year.', ex: '我明年毕业。' },
  { w: 'today', def: 'On this day.', col: 'today is, see today', ex_en: 'What are you doing today?', ex: '你今天在做什么？' },
  { w: 'tomorrow', def: 'On the day after today.', col: 'see tomorrow, until tomorrow', ex_en: 'See you tomorrow.', ex: '明天见。' },
  { w: 'yesterday', def: 'On the day before today.', col: 'yesterday was, since yesterday', ex_en: 'I saw him yesterday.', ex: '我昨天见到他了。' },
  { w: 'morning', def: 'The early part of the day.', col: 'in morning, good morning', ex_en: 'I exercise every morning.', ex: '我每天早上锻炼。' },
  { w: 'afternoon', def: 'The middle part of the day.', col: 'in afternoon, this afternoon', ex_en: 'Let us meet this afternoon.', ex: '我们今天下午见面吧。' },
  { w: 'evening', def: 'The late part of the day.', col: 'in evening, this evening', ex_en: 'I usually relax in the evening.', ex: '我通常在晚上放松。' },
  { w: 'night', def: 'The dark part of each day.', col: 'at night, last night', ex_en: 'I sleep at night.', ex: '我晚上睡觉。' },
  { w: 'early', def: 'Before the expected time.', col: 'wake up early, very early', ex_en: 'The train arrived early.', ex: '火车早到了。' },
  { w: 'late', def: 'After the expected time.', col: 'be late, very late', ex_en: 'Sorry I am late.', ex: '对不起我迟到了。' },
  { w: 'now', def: 'At the present time.', col: 'right now, by now', ex_en: 'I am busy now.', ex: '我现在很忙。' },
  { w: 'then', def: 'At that time.', col: 'by then, since then', ex_en: 'We were friends back then.', ex: '那时我们是朋友。' },
  { w: 'later', def: 'At a time in the future.', col: 'see later, sooner or later', ex_en: 'See you later.', ex: '回头见。' },
  { w: 'ago', def: 'Before the present.', col: 'long ago, a while ago', ex_en: 'I saw him a week ago.', ex: '我一周前见过他。' },
  { w: 'before', def: 'Earlier than something.', col: 'before that, long before', ex_en: 'Please arrive before 9 am.', ex: '请在上午9点前到达。' },
  { w: 'after', def: 'Later than something.', col: 'after that, day after', ex_en: 'Let us meet after lunch.', ex: '我们午饭后见面吧。' },
  { w: 'always', def: 'At all times.', col: 'always do, very always', ex_en: 'She is always happy.', ex: '她总是很开心。' },
  { w: 'never', def: 'At no time.', col: 'never do, almost never', ex_en: 'I never drink coffee.', ex: '我从不喝咖啡。' },
  { w: 'sometimes', def: 'Occasionally.', col: 'sometimes do, quite sometimes', ex_en: 'Sometimes I go to the park.', ex: '有时我会去公园。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次19: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次19完成: ${ok}个\n`)
}
update()
