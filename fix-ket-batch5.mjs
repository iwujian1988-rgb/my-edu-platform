import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const data = [
  { w: 'guest', def: 'A person invited.', col: 'welcome guest', ex_en: 'We have a guest tonight.', ex: '我们今晚有客人。' },
  { w: 'guide', def: 'A person who shows the way.', col: 'tour guide', ex_en: 'The guide led us through the museum.', ex: '导游带我们参观博物馆。' },
  { w: 'guidebook', def: 'A book with information.', col: 'travel guidebook', ex_en: 'Buy a guidebook before traveling.', ex: '旅行前买本指南。' },
  { w: 'guitar', def: 'A string instrument.', col: 'play guitar', ex_en: 'She plays the guitar well.', ex: '她吉他弹得很好。' },
  { w: 'hall', def: 'A large room or building.', col: 'concert hall', ex_en: 'The meeting is in the main hall.', ex: '会议在大厅举行。' },
  { w: 'heart attack', def: 'When heart stops working.', col: 'have heart attack', ex_en: 'He had a heart attack.', ex: '他心脏病发作了。' },
  { w: 'husband', def: 'A married man.', col: 'her husband', ex_en: 'Her husband is a doctor.', ex: '她丈夫是医生。' },
  { w: 'information', def: 'Facts or details.', col: 'get information', ex_en: 'I need more information.', ex: '我需要更多信息。' },
  { w: 'instruction', def: 'Directions on how to do.', col: 'follow instruction', ex_en: 'Read the instructions carefully.', ex: '仔细阅读说明。' },
  { w: 'Internet', def: 'A global network.', col: 'use Internet', ex_en: 'I found it on the Internet.', ex: '我在网上找到的。' },
  { w: 'job', def: 'Work for pay.', col: 'full time job', ex_en: 'I have a new job.', ex: '我有新工作。' },
  { w: 'joke', def: 'Something funny.', col: 'tell joke', ex_en: 'He told a funny joke.', ex: '他讲了个笑话。' },
  { w: 'journey', def: 'A long trip.', col: 'long journey', ex_en: 'Have a safe journey.', ex: '旅途平安。' },
  { w: 'juice', def: 'Liquid from fruit.', col: 'orange juice', ex_en: 'I would like apple juice.', ex: '我要苹果汁。' },
  { w: 'key', def: 'A metal device for locks.', col: 'use key', ex_en: 'I lost my keys.', ex: '我把钥匙丢了。' },
  { w: 'kilogram', def: 'A metric weight unit.', col: 'two kilograms', ex_en: 'This weighs one kilogram.', ex: '这个重1千克。' },
  { w: 'kilometre', def: 'A metric distance unit.', col: 'five kilometres', ex_en: 'It is ten kilometres away.', ex: '那有10公里远。' },
  { w: 'kind', def: 'Friendly nature.', col: 'very kind', ex_en: 'She is very kind.', ex: '她很善良。' },
  { w: 'king', def: 'A male ruler.', col: 'the king', ex_en: 'The king lives in a palace.', ex: '国王住在宫殿里。' },
  { w: 'kitchen', def: 'A room for cooking.', col: 'in kitchen', ex_en: 'She is cooking in the kitchen.', ex: '她在厨房做饭。' },
  { w: 'kite', def: 'A toy flown in wind.', col: 'fly kite', ex_en: 'Let us fly a kite.', ex: '我们去放风筝吧。' },
  { w: 'knee', def: 'The leg joint.', col: 'hurt knee', ex_en: 'I hurt my knee.', ex: '我伤了膝盖。' },
  { w: 'knife', def: 'A cutting tool.', col: 'use knife', ex_en: 'Cut with a knife.', ex: '用刀切。' },
  { w: 'knock', def: 'To hit a surface.', col: 'knock on door', ex_en: 'Someone is knocking at the door.', ex: '有人在敲门。' },
  { w: 'lace', def: 'A string for fastening.', col: 'shoe lace', ex_en: 'Tie your shoelaces.', ex: '系好鞋带。' },
  { w: 'lady', def: 'A woman.', col: 'young lady', ex_en: 'That lady is my teacher.', ex: '那位女士是我的老师。' },
  { w: 'lake', def: 'A large water area.', col: 'swim in lake', ex_en: 'We went to the lake.', ex: '我们去了湖边。' },
  { w: 'lamp', def: 'A light device.', col: 'electric lamp', ex_en: 'Turn on the lamp.', ex: '开灯。' },
  { w: 'land', def: 'Ground not water.', col: 'on land', ex_en: 'We saw land from the ship.', ex: '我们从船上看到了陆地。' },
  { w: 'language', def: 'A communication system.', col: 'learn language', ex_en: 'I can speak three languages.', ex: '我会说三种语言。' },
  { w: 'large', def: 'Big in size.', col: 'very large', ex_en: 'This shirt is too large.', ex: '这件衬衫太大了。' },
  { w: 'last', def: 'Coming after all others.', col: 'last time', ex_en: 'See you next time not last time.', ex: '下次见不是上次。' },
  { w: 'late', def: 'After the right time.', col: 'be late', ex_en: 'Sorry I am late.', ex: '抱歉我迟到了。' },
  { w: 'laugh', def: 'Make sounds of joy.', col: 'laugh at', ex_en: 'Do not laugh at me.', ex: '别嘲笑我。' },
  { w: 'law', def: 'Rules of a country.', col: 'follow law', ex_en: 'We must obey the law.', ex: '我们要遵守法律。' },
  { w: 'lawyer', def: 'A legal worker.', col: 'hire lawyer', ex_en: 'She is a lawyer.', ex: '她是律师。' },
  { w: 'lay', def: 'To put down.', col: 'lay table', ex_en: 'Lay the book on the table.', ex: '把书放在桌上。' },
  { w: 'lazy', def: 'Not wanting to work.', col: 'very lazy', ex_en: 'He is too lazy.', ex: '他太懒了。' },
  { w: 'lead', def: 'To guide or be in front.', col: 'lead team', ex_en: 'She leads our team.', ex: '她领导我们的团队。' },
  { w: 'leader', def: 'A person in charge.', col: 'team leader', ex_en: 'He is a natural leader.', ex: '他天生是领导。' },
  { w: 'leaf', def: 'A flat green plant part.', col: 'green leaf', ex_en: 'Leaves fall in autumn.', ex: '秋天落叶。' },
  { w: 'learn', def: 'To get knowledge.', col: 'learn English', ex_en: 'I learn new words every day.', ex: '我每天学新单词。' },
  { w: 'leave', def: 'To go away.', col: 'leave work', ex_en: 'I leave work at 6 pm.', ex: '我下午6点下班。' },
  { w: 'lecture', def: 'A talk to teach.', col: 'give lecture', ex_en: 'The lecture was interesting.', ex: '讲座很有趣。' },
  { w: 'left', def: 'Direction or remaining.', col: 'turn left', ex_en: 'Turn left at the corner.', ex: '在拐角处左转。' },
  { w: 'leg', def: 'A limb for walking.', col: 'hurt leg', ex_en: 'My legs are tired.', ex: '我的腿累了。' },
  { w: 'lemon', def: 'A yellow sour fruit.', col: 'lemon juice', ex_en: 'Add some lemon.', ex: '加点柠檬。' }
]

async function update() {
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('book_id', 'd6db96cf-080d-4294-9eea-63813bfc4227')

  const chapterIds = chapters.map(c => c.id)

  const { data: allWords } = await supabase
    .from('words')
    .select('id, word')
    .in('chapter_id', chapterIds)

  const wordToId = {}
  allWords.forEach(w => { wordToId[w.word] = w.id })

  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({
    id: wordToId[d.w],
    definition_en: d.def,
    collocation_en: d.col,
    example_sentence_en: d.ex_en,
    example_sentence: d.ex
  }))

  console.log(`KET修复批次5: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({
      definition_en: w.definition_en,
      collocation: w.example_sentence,
      collocation_en: w.collocation_en,
      example_sentence: w.example_sentence,
      example_sentence_en: w.example_sentence_en
    }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`完成: ${ok}个\n`)
}
update()
