import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const data = [
  { w: 'ham', def: 'Meat from the leg of a pig.', col: 'ham sandwich, cooked ham', ex_en: 'I would like ham and eggs.', ex: '我要火腿蛋。' },
  { w: 'handkerchief', def: 'A cloth for wiping nose or face.', col: 'use handkerchief, cotton handkerchief', ex_en: 'Use a handkerchief to blow your nose.', ex: '用手帕擦鼻子。' },
  { w: 'headteacher', def: 'The principal of a school.', col: 'the headteacher, meet headteacher', ex_en: 'The headteacher spoke to us.', ex: '校长跟我们讲话了。' },
  { w: 'heating', def: 'A system for warming buildings.', col: 'central heating, turn on heating', ex_en: 'The heating is not working.', ex: '暖气坏了。' },
  { w: 'helicopter', def: 'An aircraft with spinning blades.', col: 'fly by helicopter, helicopter landing', ex_en: 'The helicopter flew over the city.', ex: '直升机飞过城市。' },
  { w: 'high street', def: 'The main street of a town.', col: 'on high street, high street shops', ex_en: 'The shops are on the high street.', ex: '商店在高街。' },
  { w: 'history', def: 'The study of past events.', col: 'study history, history lesson', ex_en: 'I like learning about history.', ex: '我喜欢学历史。' },
  { w: 'hockey', def: 'A game played with curved sticks.', col: 'play hockey, ice hockey', ex_en: 'They play hockey on weekends.', ex: '他们周末打曲棍球。' },
  { w: 'holiday', def: 'A time of rest from work.', col: 'on holiday, summer holiday', ex_en: 'We are going on holiday.', ex: '我们要去度假。' },
  { w: 'homeless', def: 'Without a home.', col: 'homeless people, become homeless', ex_en: 'The organization helps homeless people.', ex: '这个组织帮助无家可归的人。' },
  { w: 'homework', def: 'Work done at home.', col: 'do homework, homework assignment', ex_en: 'I have a lot of homework.', ex: '我有很多作业。' },
  { w: 'horizontal', def: 'Flat and level.', col: 'horizontal line, draw horizontal', ex_en: 'Draw a horizontal line.', ex: '画一条水平线。' },
  { w: 'hospital', def: 'A place for treating sick people.', col: 'in hospital, go to hospital', ex_en: 'He is in the hospital.', ex: '他在住院。' },
  { w: 'hot', def: 'Having high temperature.', col: 'very hot, hot weather', ex_en: 'It is very hot today.', ex: '今天很热。' },
  { w: 'hotel', def: 'A place for travelers to stay.', col: 'stay in hotel, five star hotel', ex_en: 'We stayed at a hotel.', ex: '我们住酒店。' },
  { w: 'house', def: 'A building for living.', col: 'my house, new house', ex_en: 'This is my house.', ex: '这是我的房子。' },
  { w: 'housework', def: 'Work done in the home.', col: 'do housework, housework duties', ex_en: 'She does all the housework.', ex: '她做所有家务。' },
  { w: 'how much', def: 'Used to ask about price or amount.', col: 'how much is', ex_en: 'How much is this book?', ex: '这本书多少钱？' },
  { w: 'how many', def: 'Used to ask about number.', col: 'how many are', ex_en: 'How many books do you have?', ex: '你有多少本书？' },
  { w: 'hundred', def: 'The number 100.', col: 'two hundred, five hundred', ex_en: 'There are five hundred students.', ex: '有五百个学生。' },
  { w: 'hungry', def: 'Needing food.', col: 'very hungry, feel hungry', ex_en: 'I am hungry.', ex: '我饿了。' },
  { w: 'hurry', def: 'To move quickly.', col: 'hurry up, in a hurry', ex_en: 'Hurry up or we will be late.', ex: '快点，否则我们要迟到了。' },
  { w: 'ice cream', def: 'Frozen sweet cream.', col: 'eat ice cream, chocolate ice cream', ex_en: 'I want ice cream.', ex: '我要冰淇淋。' },
  { w: 'identification', def: 'Proof of identity.', col: 'show identification', ex_en: 'Please show your identification.', ex: '请出示证件。' },
  { w: 'ill', def: 'Not well.', col: 'feel ill, become ill', ex_en: 'She is ill today.', ex: '她今天病了。' },
  { w: 'instructor', def: 'A person who teaches.', col: 'driving instructor', ex_en: 'My instructor is very patient.', ex: '我的教练很耐心。' },
  { w: 'internet', def: 'A global computer network.', col: 'use internet, on the internet', ex_en: 'I found it on the internet.', ex: '我在网上找到的。' },
  { w: 'jacket', def: 'A short coat.', col: 'wear jacket, leather jacket', ex_en: 'Put on your jacket.', ex: '穿上你的夹克。' },
  { w: 'jeans', def: 'Pants made of denim.', col: 'wear jeans, blue jeans', ex_en: 'I am wearing jeans.', ex: '我穿着牛仔裤。' },
  { w: 'jewellery', def: 'Decorative items worn on the body.', col: 'wear jewellery', ex_en: 'She likes wearing jewellery.', ex: '她喜欢戴首饰。' },
  { w: 'job', def: 'Work done for pay.', col: 'find job, full time job', ex_en: 'I have a new job.', ex: '我有新工作。' },
  { w: 'joke', def: 'Something said to cause laughter.', col: 'tell joke, play joke', ex_en: 'He told a funny joke.', ex: '他讲了个笑话。' },
  { w: 'journalist', def: 'A person who writes news.', col: 'work as journalist', ex_en: 'The journalist wrote an article.', ex: '记者写了一篇文章。' },
  { w: 'journey', def: 'A long trip.', col: 'long journey, go on journey', ex_en: 'Have a safe journey.', ex: '旅途平安。' },
  { w: 'juice', def: 'Liquid from fruit.', col: 'orange juice, drink juice', ex_en: 'I would like apple juice.', ex: '我要苹果汁。' },
  { w: 'kilogram', def: 'A metric unit of mass.', col: 'two kilograms', ex_en: 'This weighs one kilogram.', ex: '这个重1千克。' },
  { w: 'kilometre', def: 'A metric unit of distance.', col: 'five kilometres', ex_en: 'It is ten kilometres away.', ex: '那有10公里远。' },
  { w: 'kind', def: 'Having a friendly nature.', col: 'very kind, kind person', ex_en: 'She is very kind.', ex: '她很善良。' },
  { w: 'kindergarten', def: 'A school for young children.', col: 'go to kindergarten', ex_en: 'My son is in kindergarten.', ex: '我儿子在幼儿园。' },
  { w: 'kitchen', def: 'A room for cooking.', col: 'in kitchen, kitchen table', ex_en: 'She is cooking in the kitchen.', ex: '她在厨房做饭。' },
  { w: 'kite', def: 'A toy flown in the wind.', col: 'fly kite, make kite', ex_en: 'Let us fly a kite.', ex: '我们去放风筝吧。' },
  { w: 'knee', def: 'The joint between leg and thigh.', col: 'hurt knee, bend knee', ex_en: 'I hurt my knee.', ex: '我伤了膝盖。' },
  { w: 'knife', def: 'A tool with a sharp blade.', col: 'use knife, sharp knife', ex_en: 'Cut with a knife.', ex: '用刀切。' },
  { w: 'knock', def: 'To hit a surface.', col: 'knock on door, knock at', ex_en: 'Someone is knocking at the door.', ex: '有人在敲门。' },
  { w: 'lace', def: 'A string used to fasten.', col: 'shoe lace, tie lace', ex_en: 'Tie your shoelaces.', ex: '系好鞋带。' },
  { w: 'lamp', def: 'A device that gives light.', col: 'electric lamp, turn on lamp', ex_en: 'Turn on the lamp.', ex: '开灯。' },
  { w: 'landscape', def: 'Scenery of an area.', col: 'beautiful landscape', ex_en: 'The landscape is beautiful.', ex: '风景很美。' },
  { w: 'language', def: 'A system of communication.', col: 'speak language, learn language', ex_en: 'I can speak three languages.', ex: '我会说三种语言。' },
  { w: 'large', def: 'Of big size.', col: 'very large, large size', ex_en: 'This shirt is too large.', ex: '这件衬衫太大了。' },
  { w: 'laugh', def: 'To make sounds of happiness.', col: 'laugh at, loud laugh', ex_en: 'Don not laugh at me.', ex: '别嘲笑我。' },
  { w: 'law', def: 'Rules of a country.', col: 'follow law, break law', ex_en: 'We must obey the law.', ex: '我们要遵守法律。' },
  { w: 'lawyer', def: 'A person who practices law.', col: 'hire lawyer', ex_en: 'She is a lawyer.', ex: '她是律师。' }
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

  console.log(`KET修复批次2: ${toUpdate.length}个`)
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
