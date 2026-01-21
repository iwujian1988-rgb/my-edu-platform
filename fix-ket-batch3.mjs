import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const data = [
  { w: 'leaflet', def: 'A printed sheet of information.', col: 'distribute leaflet', ex_en: 'Take a leaflet.', ex: '拿张传单。' },
  { w: 'leather', def: 'Material made from animal skin.', col: 'leather jacket', ex_en: 'This bag is made of leather.', ex: '这个包是皮做的。' },
  { w: 'left', def: 'Direction or remaining.', col: 'turn left, left hand', ex_en: 'Turn left at the corner.', ex: '在拐角处左转。' },
  { w: 'lemonade', def: 'A drink from lemons.', col: 'fresh lemonade', ex_en: 'This lemonade is cold.', ex: '这柠檬水很凉。' },
  { w: 'lesson', def: 'A period of learning.', col: 'have lesson, music lesson', ex_en: 'We have a math lesson.', ex: '我们有数学课。' },
  { w: 'library', def: 'A place with books to read.', col: 'public library', ex_en: 'I study in the library.', ex: '我在图书馆学习。' },
  { w: 'lift', def: 'A machine for going up and down.', col: 'take lift, use lift', ex_en: 'Take the lift to the fifth floor.', ex: '坐电梯到五楼。' },
  { w: 'light', def: 'Not dark or heavy.', col: 'turn on light', ex_en: 'The light is too bright.', ex: '光线太亮了。' },
  { w: 'lime', def: 'A green citrus fruit.', col: 'lime juice', ex_en: 'Add some lime.', ex: '加点酸橙。' },
  { w: 'line', def: 'A long mark.', col: 'draw line, straight line', ex_en: 'Draw a line.', ex: '画一条线。' },
  { w: 'lion', def: 'A large wild cat.', col: 'see lion', ex_en: 'The lion is sleeping.', ex: '狮子在睡觉。' },
  { w: 'list', def: 'A series of names.', col: 'make list', ex_en: 'Make a shopping list.', ex: '列个购物清单。' },
  { w: 'literature', def: 'Written works.', col: 'study literature', ex_en: 'She studies English literature.', ex: '她研究英国文学。' },
  { w: 'little', def: 'Small in size or amount.', col: 'very little', ex_en: 'I have a little money.', ex: '我有一点点钱。' },
  { w: 'living room', def: 'A room for daily activities.', col: 'in living room', ex_en: 'We watch TV in the living room.', ex: '我们在客厅看电视。' },
  { w: 'loaf', def: 'A shaped mass of bread.', col: 'loaf of bread', ex_en: 'I bought a loaf of bread.', ex: '我买了一条面包。' },
  { w: 'local', def: 'Nearby.', col: 'local shop', ex_en: 'I go to a local school.', ex: '我上当地的学校。' },
  { w: 'lock', def: 'A device for fastening.', col: 'lock door', ex_en: 'Lock the door.', ex: '锁门。' },
  { w: 'long', def: 'Measuring much.', col: 'very long', ex_en: 'It is a long way.', ex: '那是段长路。' },
  { w: 'look', def: 'To see with eyes.', col: 'look at', ex_en: 'Look at the blackboard.', ex: '看黑板。' },
  { w: 'lorry', def: 'A large truck.', col: 'drive lorry', ex_en: 'The lorry is too big.', ex: '卡车太大了。' },
  { w: 'lose', def: 'To no longer have.', col: 'lose weight', ex_en: 'I lost my phone.', ex: '我把手机弄丢了。' },
  { w: 'lot', def: 'A large amount.', col: 'a lot of', ex_en: 'I have a lot of books.', ex: '我有很多书。' },
  { w: 'loud', def: 'Making much noise.', col: 'very loud', ex_en: 'The music is too loud.', ex: '音乐太吵了。' },
  { w: 'love', def: 'To like very much.', col: 'fall in love', ex_en: 'I love music.', ex: '我爱音乐。' },
  { w: 'lovely', def: 'Beautiful or pleasant.', col: 'very lovely', ex_en: 'You look lovely today.', ex: '你今天很可爱。' },
  { w: 'low', def: 'Not high.', col: 'very low', ex_en: 'The temperature is low.', ex: '温度很低。' },
  { w: 'luggage', def: 'Bags for traveling.', col: 'pack luggage', ex_en: 'I have three pieces of luggage.', ex: '我有三件行李。' },
  { w: 'lunch', def: 'A midday meal.', col: 'have lunch', ex_en: 'What did you have for lunch?', ex: '午饭你吃了什么？' },
  { w: 'machine', def: 'A device with moving parts.', col: 'use machine', ex_en: 'This machine is broken.', ex: '这台机器坏了。' },
  { w: 'magazine', def: 'A paper publication.', col: 'read magazine', ex_en: 'I read magazines.', ex: '我看杂志。' },
  { w: 'main', def: 'Most important.', col: 'main road', ex_en: 'This is the main entrance.', ex: '这是正门。' },
  { w: 'make', def: 'To create.', col: 'make bed', ex_en: 'I will make coffee.', ex: '我去煮咖啡。' },
  { w: 'man', def: 'An adult male person.', col: 'old man', ex_en: 'That man is my father.', ex: '那个男人是我父亲。' },
  { w: 'manage', def: 'To control or handle.', col: 'manage to', ex_en: 'I can manage it.', ex: '我能搞定。' },
  { w: 'manager', def: 'A person in charge.', col: 'hotel manager', ex_en: 'The manager is busy.', ex: '经理很忙。' },
  { w: 'many', def: 'A large number.', col: 'very many', ex_en: 'I have many friends.', ex: '我有很多朋友。' },
  { w: 'map', def: 'A drawing of an area.', col: 'read map', ex_en: 'Look at the map.', ex: '看地图。' },
  { w: 'marker', def: 'A pen for marking.', col: 'use marker', ex_en: 'Use a red marker.', ex: '用红色记号笔。' },
  { w: 'market', def: 'A place to buy things.', col: 'go to market', ex_en: 'We go to the market.', ex: '我们去市场。' },
  { w: 'marriage', def: 'The state of being married.', col: 'happy marriage', ex_en: 'They have a good marriage.', ex: '他们婚姻美满。' },
  { w: 'married', def: 'Having a spouse.', col: 'get married', ex_en: 'She is married.', ex: '她已婚。' },
  { w: 'matter', def: 'A subject or trouble.', col: 'what is the matter', ex_en: 'What is the matter?', ex: '怎么了？' },
  { w: 'may', def: 'Expressing possibility.', col: 'may be', ex_en: 'You may go now.', ex: '你现在可以走了。' },
  { w: 'maybe', def: 'Perhaps.', col: 'maybe yes', ex_en: 'Maybe tomorrow.', ex: '也许明天。' },
  { w: 'me', def: 'The person speaking.', col: 'give me', ex_en: 'Please help me.', ex: '请帮我。' },
  { w: 'meal', def: 'Food eaten at a time.', col: 'have meal', ex_en: 'We have three meals a day.', ex: '我们一天吃三顿饭。' },
  { w: 'meat', def: 'Flesh of animals.', col: 'eat meat', ex_en: 'I do not eat meat.', ex: '我不吃肉。' },
  { w: 'mechanic', def: 'A person who repairs machines.', col: 'car mechanic', ex_en: 'The mechanic fixed my car.', ex: '机械师修好了我的车。' },
  { w: 'medicine', def: 'Substance for treating illness.', col: 'take medicine', ex_en: 'Take this medicine twice a day.', ex: '这药每天吃两次。' },
  { w: 'meet', def: 'To encounter.', col: 'meet someone', ex_en: 'Nice to meet you.', ex: '很高兴见到你。' },
  { w: 'meeting', def: 'A gathering for discussion.', col: 'attend meeting', ex_en: 'I have a meeting at 3 PM.', ex: '我下午3点有会议。' },
  { w: 'menu', def: 'A list of food.', col: 'look at menu', ex_en: 'Can I see the menu?', ex: '我能看菜单吗？' }
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

  console.log(`KET修复批次3: ${toUpdate.length}个`)
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
