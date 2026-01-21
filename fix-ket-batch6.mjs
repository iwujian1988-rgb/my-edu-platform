import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const data = [
  { w: 'closed', def: 'Not open for business.', col: 'shop closed', ex_en: 'The shop is closed today.', ex: '商店今天关门。' },
  { w: 'dad', def: 'Informal word for father.', col: 'my dad', ex_en: 'My dad is a doctor.', ex: '我爸爸是医生。' },
  { w: 'difficult', def: 'Not easy to do.', col: 'very difficult', ex_en: 'This question is difficult.', ex: '这道题很难。' },
  { w: 'insurance', def: 'Protection against loss.', col: 'buy insurance', ex_en: 'I have car insurance.', ex: '我有车险。' },
  { w: 'island', def: 'Land surrounded by water.', col: 'small island', ex_en: 'We visited a beautiful island.', ex: '我们参观了一个美丽的岛屿。' },
  { w: 'kilo', def: 'Short for kilogram.', col: 'two kilos', ex_en: 'I need one kilo of sugar.', ex: '我要一千克糖。' },
  { w: 'level', def: 'A position or height.', col: 'high level', ex_en: 'What is your English level?', ex: '你英语什么水平？' },
  { w: 'licence', def: 'Official permission.', col: 'driving licence', ex_en: 'I have a driving licence.', ex: '我有驾照。' },
  { w: 'lie down', def: 'To rest in horizontal position.', col: 'lie down bed', ex_en: 'Go and lie down.', ex: '去躺下休息。' },
  { w: 'litre', def: 'A metric volume unit.', col: 'two litres', ex_en: 'I need a litre of milk.', ex: '我要一升牛奶。' },
  { w: 'mobile', def: 'A portable phone.', col: 'mobile phone', ex_en: 'Call my mobile.', ex: '打我手机。' },
  { w: 'neighbour', def: 'A person living nearby.', col: 'my neighbour', ex_en: 'My neighbour is very friendly.', ex: '我邻居很友善。' },
  { w: 'newsagent', def: 'A shop selling newspapers.', col: 'at newsagent', ex_en: 'I bought a magazine at the newsagent.', ex: '我在报刊亭买了本杂志。' },
  { w: 'newspaper', def: 'A paper publication with news.', col: 'read newspaper', ex_en: 'I read the newspaper every morning.', ex: '我每天早上看报纸。' },
  { w: 'noon', def: 'The middle of the day.', col: 'at noon', ex_en: 'We have lunch at noon.', ex: '我们中午吃饭。' },
  { w: 'note', def: 'A short written record.', col: 'take notes', ex_en: 'Take notes during the lesson.', ex: '上课时做笔记。' },
  { w: 'occupation', def: 'A job or profession.', col: 'what is your occupation', ex_en: 'Teaching is a noble occupation.', ex: '教学是高尚的职业。' },
  { w: 'onion', def: 'A round vegetable.', col: 'cut onion', ex_en: 'I like onions in my salad.', ex: '我喜欢沙拉里放洋葱。' },
  { w: 'opera', def: 'A musical drama.', col: 'go to opera', ex_en: 'We watched an opera last night.', ex: '我们昨晚看了歌剧。' },
  { w: 'painter', def: 'An artist who paints.', col: 'famous painter', ex_en: 'He is a painter.', ex: '他是画家。' },
  { w: 'pay for', def: 'To give money.', col: 'pay for meal', ex_en: 'I will pay for dinner.', ex: '我来付晚餐钱。' },
  { w: 'pen-friend', def: 'A friend by letter.', col: 'write to pen-friend', ex_en: 'I have a pen-friend in England.', ex: '我有个英国笔友。' },
  { w: 'pence', def: 'British pennies.', col: 'fifty pence', ex_en: 'It costs fifty pence.', ex: '这个要50便士。' },
  { w: 'pennies', def: 'Many one-cent coins.', col: 'save pennies', ex_en: 'I have a few pennies.', ex: '我有几个硬币。' },
  { w: 'penny', def: 'One cent.', col: 'spend a penny', ex_en: 'I found a penny on the ground.', ex: '我在地上捡到一便士。' },
  { w: 'petrol station', def: 'A place for car fuel.', col: 'at petrol station', ex_en: 'Stop at the petrol station.', ex: '在加油站停车。' },
  { w: 'pharmacy', def: 'A shop for medicine.', col: 'go to pharmacy', ex_en: 'I need to go to the pharmacy.', ex: '我要去药店。' },
  { w: 'photographer', def: 'A person who takes photos.', col: 'professional photographer', ex_en: 'She is a photographer.', ex: '她是摄影师。' },
  { w: 'photography', def: 'The art of taking photos.', col: 'study photography', ex_en: 'I like photography.', ex: '我喜欢摄影。' },
  { w: 'pizza', def: 'Italian dish with toppings.', col: 'eat pizza', ex_en: 'Let us order pizza.', ex: '我们点披萨吧。' },
  { w: 'postcard', def: 'A card sent by mail.', col: 'send postcard', ex_en: 'I sent a postcard from Paris.', ex: '我从巴黎寄了张明信片。' },
  { w: 'practise', def: 'To do repeatedly.', col: 'practise English', ex_en: 'You need to practise more.', ex: '你需要多练习。' },
  { w: 'programme', def: 'A plan or show.', col: 'TV programme', ex_en: 'What is your favourite TV programme?', ex: '你最喜欢什么电视节目？' },
  { w: 'quarter', def: 'One fourth or 25 cents.', col: 'quarter past', ex_en: 'It is a quarter past three.', ex: '三点一刻。' },
  { w: 'railway', def: 'Trains and tracks.', col: 'railway station', ex_en: 'The railway station is near here.', ex: '火车站就在附近。' },
  { w: 'raincoat', def: 'A coat for rain.', col: 'wear raincoat', ex_en: 'Take a raincoat.', ex: '带件雨衣。' },
  { w: 'receptionist', def: 'A person welcoming guests.', col: 'hotel receptionist', ex_en: 'The receptionist was helpful.', ex: '接待员很热心。' },
  { w: 'roast', def: 'Cooked in dry heat.', col: 'roast chicken', ex_en: 'I would like roast beef.', ex: '我要烤牛肉。' },
  { w: 'ruin', def: 'To destroy or remains.', col: 'ancient ruins', ex_en: 'The rain will ruin the picnic.', ex: '雨会毁了野餐。' },
  { w: 'shoe', def: 'Footwear.', col: 'wear shoes', ex_en: 'These shoes are comfortable.', ex: '这鞋很舒服。' },
  { w: 'shorts', def: 'Short trousers.', col: 'wear shorts', ex_en: 'I wear shorts in summer.', ex: '夏天我穿短裤。' },
  { w: 'sick', def: 'Not well.', col: 'feel sick', ex_en: 'She is sick in bed.', ex: '她生病卧床。' },
  { w: 'sitting room', def: 'A room for relaxing.', col: 'in sitting room', ex_en: 'We watch TV in the sitting room.', ex: '我们在客厅看电视。' },
  { w: 'skiing', def: 'Moving on snow.', col: 'go skiing', ex_en: 'We went skiing last winter.', ex: '我们去年冬天去滑雪了。' },
  { w: 'south', def: 'Direction down on map.', col: 'in the south', ex_en: 'Africa is in the south.', ex: '非洲在南方。' },
  { w: 'spell', def: 'To write words correctly.', col: 'spell word', ex_en: 'How do you spell your name?', ex: '你名字怎么拼？' },
  { w: 'sports centre', def: 'A place for sports.', col: 'at sports centre', ex_en: 'I exercise at the sports centre.', ex: '我在体育中心锻炼。' },
  { w: 'suit', def: 'A jacket with trousers.', col: 'wear suit', ex_en: 'He wears a suit to work.', ex: '他上班穿西装。' },
  { w: 'surname', def: 'Family name.', col: 'what is your surname', ex_en: 'My surname is Smith.', ex: '我姓史密斯。' },
  { w: 'sweater', def: 'A knitted top.', col: 'wear sweater', ex_en: 'It is cold so wear a sweater.', ex: '天冷，穿上毛衣。' },
  { w: 'teenager', def: 'A person 13-19 years old.', col: 'young teenager', ex_en: 'He is still a teenager.', ex: '他还是个青少年。' },
  { w: 'terrible', def: 'Very bad.', col: 'very terrible', ex_en: 'The weather is terrible.', ex: '天气很糟糕。' },
  { w: 'theatre', def: 'A place for plays.', col: 'go to theatre', ex_en: 'We went to the theatre.', ex: '我们去了剧院。' },
  { w: 'thunderstorm', def: 'Storm with thunder.', col: 'heavy thunderstorm', ex_en: 'There was a thunderstorm last night.', ex: '昨晚有雷暴。' },
  { w: 'tights', def: 'Thin clothing for legs.', col: 'wear tights', ex_en: 'She wears black tights.', ex: '她穿黑色紧身裤。' },
  { w: 'toothbrush', def: 'A brush for teeth.', col: 'use toothbrush', ex_en: 'Use your toothbrush twice a day.', ex: '每天用牙刷刷两次牙。' },
  { w: 'tour', def: 'A journey for pleasure.', col: 'go on tour', ex_en: 'We took a tour of the city.', ex: '我们游览了城市。' },
  { w: 'tour guide', def: 'A person showing places.', col: 'hire tour guide', ex_en: 'The tour guide was very knowledgeable.', ex: '导游很博学。' },
  { w: 'tourist information centre', def: 'A place for visitor help.', col: 'at tourist information centre', ex_en: 'Go to the tourist information centre.', ex: '去游客咨询中心。' },
  { w: 'traffic lights', def: 'Road signals.', col: 'at traffic lights', ex_en: 'Turn left at the traffic lights.', ex: '在红绿灯处左转。' },
  { w: 'trainers', def: 'Sports shoes.', col: 'wear trainers', ex_en: 'I put on my trainers.', ex: '我穿上运动鞋。' },
  { w: 'travel agency', def: 'A business for trips.', col: 'at travel agency', ex_en: 'I booked at a travel agency.', ex: '我在旅行社预订的。' },
  { w: 'try on', def: 'To wear to test.', col: 'try on clothes', ex_en: 'Can I try on this shirt?', ex: '我可以试穿这件衬衫吗？' },
  { w: 'umbrella', def: 'Rain protection.', col: 'open umbrella', ex_en: 'Take an umbrella.', ex: '带把伞。' },
  { w: 'underground', def: 'Below surface or train.', col: 'go by underground', ex_en: 'We went by underground.', ex: '我们坐地铁去的。' },
  { w: 'visit', def: 'To go see.', col: 'visit friend', ex_en: 'I will visit my grandmother.', ex: '我要去看祖母。' },
  { w: 'website', def: 'Pages on internet.', col: 'visit website', ex_en: 'Check our website for details.', ex: '查看我们的网站了解详情。' },
  { w: 'west', def: 'Direction where sun sets.', col: 'in the west', ex_en: 'The sun sets in the west.', ex: '太阳在西方落下。' },
  { w: 'wheel', def: 'A round rotating part.', col: 'steering wheel', ex_en: 'The car has four wheels.', ex: '车有四个轮子。' },
  { w: 'wife', def: 'A married woman.', col: 'his wife', ex_en: 'His wife is a teacher.', ex: '他妻子是老师。' },
  { w: 'winner', def: 'A person who wins.', col: 'prize winner', ex_en: 'She was the winner.', ex: '她是获胜者。' }
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

  console.log(`KET修复批次6: ${toUpdate.length}个`)
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
