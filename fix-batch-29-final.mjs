import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'agenda', def: 'A list of items to discuss.', col: 'on the agenda, daily agenda', ex_en: 'What is on the agenda today?', ex: '今天议程是什么？' },
  { w: 'conference', def: 'A large formal meeting.', col: 'press conference, attend conference', ex_en: 'The conference starts tomorrow.', ex: '会议明天开始。' },
  { w: 'marketing', def: 'Promoting and selling products.', col: 'marketing campaign, digital marketing', ex_en: 'Our marketing is working well.', ex: '我们的营销效果很好。' },
  { w: 'customer', def: 'A person who buys things.', col: 'customer service, new customer', ex_en: 'The customer is always right.', ex: '顾客永远是对的。' },
  { w: 'schedule', def: 'A planned timeline.', col: 'tight schedule, work schedule', ex_en: 'My schedule is very full.', ex: '我的日程很满。' },
  { w: 'waitress', def: 'A woman who serves food.', col: 'the waitress, ask waitress', ex_en: 'The waitress brought our food.', ex: '女服务员端来了我们的食物。' },
  { w: 'client', def: 'A person using a service.', col: 'new client, client relationship', ex_en: 'We have many satisfied clients.', ex: '我们有很多满意的客户。' },
  { w: 'investment', def: 'Money put into something.', col: 'foreign investment, make investment', ex_en: 'Real estate is a good investment.', ex: '房地产是很好的投资。' },
  { w: 'analysis', def: 'Detailed examination.', col: 'careful analysis, data analysis', ex_en: 'We need a detailed analysis.', ex: '我们需要详细分析。' },
  { w: 'contract', def: 'A legal agreement.', col: 'sign a contract, break contract', ex_en: 'Read the contract carefully.', ex: '仔细阅读合同。' },
  { w: 'meeting', def: 'A gathering for discussion.', col: 'attend a meeting, hold meeting', ex_en: 'I have a meeting at 3 PM.', ex: '我下午3点有会议。' },
  { w: 'proposal', def: 'A plan or suggestion.', col: 'make a proposal, accept proposal', ex_en: 'I have a proposal for you.', ex: '我有个提议给你。' },
  { w: 'agreement', def: 'A shared decision.', col: 'reach an agreement, sign agreement', ex_en: 'We finally reached an agreement.', ex: '我们最终达成了协议。' },
  { w: 'service', def: 'Work done for others.', col: 'good service, customer service', ex_en: 'The service was excellent.', ex: '服务很棒。' },
  { w: 'network', def: 'Connected computers or people.', col: 'fast network, computer network', ex_en: 'Our network is very fast.', ex: '我们的网络很快。' },
  { w: 'flight', def: 'A journey by air.', col: 'book a flight, flight attendant', ex_en: 'My flight was delayed.', ex: '我的航班延误了。' },
  { w: 'petrol', def: 'Fuel for cars.', col: 'petrol station, petrol price', ex_en: 'We need to stop for petrol.', ex: '我们需要停下来加油。' },
  { w: 'platform', def: 'A raised surface or online space.', col: 'train platform, digital platform', ex_en: 'The train is on platform 3.', ex: '火车在3号站台。' },
  { w: 'roundabout', def: 'A circular road junction.', col: 'at the roundabout, go roundabout', ex_en: 'Turn left at the roundabout.', ex: '在环岛处左转。' },
  { w: 'lorry', def: 'A large truck for goods.', col: 'drive a lorry, delivery lorry', ex_en: 'The lorry is too big.', ex: '卡车太大了。' },
  { w: 'improve', def: 'To make better.', col: 'improve your, improve skills', ex_en: 'You need to improve.', ex: '你需要进步。' },
  { w: 'through', def: 'From one side to another.', col: 'go through, walk through', ex_en: 'We drove through the tunnel.', ex: '我们开车穿过隧道。' },
  { w: 'left', def: 'Direction or remaining.', col: 'turn left, left hand', ex_en: 'Turn left at the corner.', ex: '在拐角处左转。' },
  { w: 'outdoor', def: 'Outside activities.', col: 'outdoor activities, outdoor sports', ex_en: 'I love outdoor sports.', ex: '我喜欢户外运动。' },
  { w: 'steak', def: 'A piece of meat.', col: 'cook steak, steak dinner', ex_en: 'I would like a steak.', ex: '我想要牛排。' },
  { w: 'tomato', def: 'A red juicy fruit.', col: 'tomato sauce, eat tomato', ex_en: 'Tomatoes are healthy.', ex: '西红柿很健康。' },
  { w: 'ice', def: 'Frozen water.', col: 'ice cream, on the ice', ex_en: 'Would you like some ice?', ex: '你要加冰吗？' },
  { w: 'lemonade', def: 'A drink from lemons.', col: 'fresh lemonade, make lemonade', ex_en: 'This lemonade is cold.', ex: '这柠檬水很凉。' },
  { w: 'wool', def: 'Soft hair from sheep.', col: 'wool sweater, wear wool', ex_en: 'This sweater is pure wool.', ex: '这件毛衣是纯羊毛的。' },
  { w: 'wood', def: 'Material from trees.', col: 'wooden table, chop wood', ex_en: 'The table is made of wood.', ex: '桌子是木制的。' },
  { w: 'omelette', def: 'Eggs cooked in flat shape.', col: 'make omelette, cheese omelette', ex_en: 'I want an omelette.', ex: '我要煎蛋卷。' },
  { w: 'world', def: 'The earth and all people.', col: 'around the world, whole world', ex_en: 'Travel around the world.', ex: '环游世界。' },
  { w: 'pasta', def: 'Italian food from flour.', col: 'pasta dish, cook pasta', ex_en: 'I love pasta.', ex: '我爱吃意大利面。' },
  { w: 'barbecue', def: 'Cooking on a grill.', col: 'have a barbecue, barbecue sauce', ex_en: 'Let us have a barbecue.', ex: '我们烧烤吧。' },
  { w: 'boil', def: 'To heat to 100 degrees.', col: 'boil water, boil egg', ex_en: 'Boil some water for tea.', ex: '烧点水泡茶。' },
  { w: 'spelt', def: 'A type of grain.', col: 'spelt flour, eat spelt', ex_en: 'Spelt is a healthy grain.', ex: '斯佩耳特小麦是健康谷物。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次29: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次29完成: ${ok}个\n`)
}
update()
