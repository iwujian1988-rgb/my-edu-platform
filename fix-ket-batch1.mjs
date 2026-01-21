import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const data = [
  { w: 'belt', def: 'A strip of leather or material worn around the waist.', col: 'wear belt, leather belt', ex_en: 'He wears a black belt.', ex: '他戴着黑腰带。' },
  { w: 'bill', def: 'A written statement of money owed.', col: 'pay bill, electricity bill', ex_en: 'I need to pay the electricity bill.', ex: '我需要付电费。' },
  { w: 'blonde', def: 'Having fair hair and skin.', col: 'blonde hair, go blonde', ex_en: 'She has blonde hair.', ex: '她是金发。' },
  { w: 'blouse', def: 'A shirt for women.', col: 'silk blouse, wear blouse', ex_en: 'She bought a new blouse.', ex: '她买了件新女衬衫。' },
  { w: 'board', def: 'A long thin piece of wood or a group of people.', col: 'on board, blackboard', ex_en: 'Please write on the board.', ex: '请在黑板上写。' },
  { w: 'bookshelf', def: 'A shelf for books.', col: 'wooden bookshelf, fill bookshelf', ex_en: 'The bookshelf is full of books.', ex: '书架摆满了书。' },
  { w: 'bookshop', def: 'A shop that sells books.', col: 'in bookshop, bookshop nearby', ex_en: 'I bought this book at a bookshop.', ex: '我在书店买的这本书。' },
  { w: 'cassette player', def: 'A machine that plays cassettes.', col: 'use cassette player, old cassette player', ex_en: 'I listen to music on my cassette player.', ex: '我用卡带播放器听音乐。' },
  { w: 'cassette recorder', def: 'A machine that records sound on cassettes.', col: 'cassette recorder work', ex_en: 'The cassette recorder is broken.', ex: '卡带录音机坏了。' },
  { w: 'closed', def: 'Not open.', col: 'shop closed, keep closed', ex_en: 'The shop is closed today.', ex: '商店今天关门。' },
  { w: 'comb', def: 'A toothed instrument for hair.', col: 'comb hair, use comb', ex_en: 'I need a comb.', ex: '我需要把梳子。' },
  { w: 'computer', def: 'An electronic machine for processing data.', col: 'use computer, personal computer', ex_en: 'I work on my computer every day.', ex: '我每天用电脑工作。' },
  { w: 'credit card', def: 'A card for buying things now and paying later.', col: 'pay by credit card', ex_en: 'Can I pay by credit card?', ex: '我可以用信用卡支付吗？' },
  { w: 'crossroads', def: 'A place where roads cross.', col: 'at crossroads, meet crossroads', ex_en: 'Turn left at the crossroads.', ex: '在十字路口左转。' },
  { w: 'cupboard', def: 'A storage cabinet with shelves.', col: 'kitchen cupboard, in cupboard', ex_en: 'The plates are in the cupboard.', ex: '盘子在碗柜里。' },
  { w: 'customer', def: 'A person who buys things.', col: 'new customer, serve customer', ex_en: 'The customer is always right.', ex: '顾客永远是对的。' },
  { w: 'dad', def: 'Father.', col: 'my dad, stay with dad', ex_en: 'My dad is a doctor.', ex: '我爸爸是医生。' },
  { w: 'dangerous', def: 'Likely to cause harm.', col: 'very dangerous, dangerous animal', ex_en: 'This road is dangerous.', ex: '这条路很危险。' },
  { w: 'dead', def: 'No longer alive.', col: 'dead body, fall dead', ex_en: 'The plant is dead.', ex: '植物死了。' },
  { w: 'degree', def: 'An academic rank or unit of measurement.', col: 'university degree, high degree', ex_en: 'She has a degree in English.', ex: '她有英语学位。' },
  { w: 'department store', def: 'A large shop with many departments.', col: 'go to department store', ex_en: 'I bought this at a department store.', ex: '我在百货商店买的这个。' },
  { w: 'dictionary', def: 'A book that lists words with meanings.', col: 'use dictionary, look up dictionary', ex_en: 'Use a dictionary to check the meaning.', ex: '用词典查意思。' },
  { w: 'difficult', def: 'Not easy.', col: 'very difficult, difficult problem', ex_en: 'This question is difficult.', ex: '这道题很难。' },
  { w: 'dining room', def: 'A room for eating meals.', col: 'in dining room, large dining room', ex_en: 'We eat in the dining room.', ex: '我们在餐厅吃饭。' },
  { w: 'diploma', def: 'A certificate of education.', col: 'get diploma, high school diploma', ex_en: 'She received her diploma yesterday.', ex: '她昨天收到了文凭。' },
  { w: 'disco', def: 'A place for dancing to recorded music.', col: 'go to disco, dance disco', ex_en: 'Let us go to the disco.', ex: '我们去迪斯科吧。' },
  { w: 'dish', def: 'A plate or food prepared in a certain way.', col: 'wash dish, main dish', ex_en: 'Please wash the dishes.', ex: '请洗碗。' },
  { w: 'dollar', def: 'Money in the US and other countries.', col: 'US dollar, spend dollars', ex_en: 'It costs ten dollars.', ex: '这个要十美元。' },
  { w: 'downstairs', def: 'On a lower floor.', col: 'go downstairs, downstairs room', ex_en: 'He is downstairs.', ex: '他在楼下。' },
  { w: 'driving licence', def: 'Official permission to drive.', col: 'get driving licence', ex_en: 'I have a driving licence.', ex: '我有驾照。' },
  { w: 'drum', def: 'A musical instrument played by hitting.', col: 'play drum, bass drum', ex_en: 'He plays the drums.', ex: '他打鼓。' },
  { w: 'email', def: 'Messages sent by computer.', col: 'send email, check email', ex_en: 'Please send me an email.', ex: '请给我发邮件。' },
  { w: 'entrance', def: 'A door or opening for entering.', col: 'main entrance, front entrance', ex_en: 'Where is the entrance?', ex: '入口在哪里？' },
  { w: 'Euro', def: 'Money used in Europe.', col: 'pay in Euros, spend Euro', ex_en: 'It costs fifty Euros.', ex: '这个要五十欧元。' },
  { w: 'examination', def: 'A formal test of knowledge.', col: 'pass examination, take examination', ex_en: 'I have an examination tomorrow.', ex: '我明天有考试。' },
  { w: 'example', def: 'A thing showing the rule.', col: 'for example, good example', ex_en: 'For example, apples and oranges.', ex: '例如苹果和橙子。' },
  { w: 'exhibition', def: 'A public show of items.', col: 'art exhibition, visit exhibition', ex_en: 'We visited the art exhibition.', ex: '我们参观了艺术展。' },
  { w: 'flight', def: 'A journey by air.', col: 'book flight, flight attendant', ex_en: 'My flight arrives at 5 PM.', ex: '我的航班下午5点到。' },
  { w: 'for sale', def: 'Available to buy.', col: 'house for sale, put for sale', ex_en: 'This house is for sale.', ex: '这房子出售。' },
  { w: 'garage', def: 'A place for cars or repairs.', col: 'park in garage, garage door', ex_en: 'The car is in the garage.', ex: '车在车库。' },
  { w: 'gate', def: 'A door in a fence or wall.', col: 'open gate, front gate', ex_en: 'Please close the gate.', ex: '请关门。' },
  { w: 'Geography', def: 'The study of earth and lands.', col: 'study Geography, Geography lesson', ex_en: 'I like Geography class.', ex: '我喜欢地理课。' },
  { w: 'glasses', def: 'Lenses for eyes.', col: 'wear glasses, sun glasses', ex_en: 'I wear glasses for reading.', ex: '我读书戴眼镜。' },
  { w: 'golf', def: 'A game played on grass with clubs.', col: 'play golf, golf course', ex_en: 'They play golf on weekends.', ex: '他们周末打高尔夫。' },
  { w: 'gram', def: 'A metric unit of weight.', col: '100 grams, per gram', ex_en: 'This weighs 500 grams.', ex: '这个重500克。' },
  { w: 'gramme', def: 'British spelling of gram.', col: 'gramme weight', ex_en: 'Add 50 grammes of sugar.', ex: '加50克糖。' },
  { w: 'grandparent', def: 'Parent of one parent.', col: 'my grandparent, live with grandparent', ex_en: 'I visit my grandparents often.', ex: '我常去看祖父母。' },
  { w: 'grandson', def: 'Son of one child.', col: 'her grandson, have grandson', ex_en: 'His grandson is cute.', ex: '他孙子很可爱。' },
  { w: 'grape', def: 'A small round fruit growing in clusters.', col: 'green grape, eat grape', ex_en: 'I like green grapes.', ex: '我喜欢青葡萄。' },
  { w: 'grilled', def: 'Cooked over direct heat.', col: 'grilled chicken, grilled meat', ex_en: 'I would like grilled fish.', ex: '我要烤鱼。' }
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

  console.log(`KET修复批次1: ${toUpdate.length}个`)
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
