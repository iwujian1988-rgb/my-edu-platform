import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const data = [
  { w: 'mess', def: 'A state of disorder.', col: 'make mess', ex_en: 'Clean up this mess.', ex: '清理这个混乱。' },
  { w: 'message', def: 'Information sent.', col: 'send message', ex_en: 'I sent you a message.', ex: '我给你发了消息。' },
  { w: 'metal', def: 'A hard material.', col: 'metal box', ex_en: 'This is made of metal.', ex: '这是金属做的。' },
  { w: 'metre', def: 'A metric unit of length.', col: '100 metres', ex_en: 'It is 50 metres away.', ex: '那有50米远。' },
  { w: 'microphone', def: 'A device for sound.', col: 'use microphone', ex_en: 'Speak into the microphone.', ex: '对着麦克风说。' },
  { w: 'microwave', def: 'An oven for quick cooking.', col: 'microwave oven', ex_en: 'Heat it in the microwave.', ex: '在微波炉里热一下。' },
  { w: 'midday', def: 'The middle of the day.', col: 'at midday', ex_en: 'We eat at midday.', ex: '我们中午吃饭。' },
  { w: 'middle', def: 'The center point.', col: 'in middle', ex_en: 'Sit in the middle.', ex: '坐在中间。' },
  { w: 'mile', def: 'A unit of distance.', col: 'five miles', ex_en: 'It is ten miles away.', ex: '那有10英里远。' },
  { w: 'milk', def: 'White liquid from cows.', col: 'drink milk', ex_en: 'I drink milk every day.', ex: '我每天喝牛奶。' },
  { w: 'million', def: 'The number 1,000,000.', col: 'two million', ex_en: 'There are three million people.', ex: '有三百万人。' },
  { w: 'mind', def: 'To object or the thinking part.', col: 'do you mind', ex_en: 'Do you mind if I sit here?', ex: '你介意我坐这里吗？' },
  { w: 'mine', def: 'A place for digging.', col: 'coal mine', ex_en: 'He works in a mine.', ex: '他在矿山工作。' },
  { w: 'minute', def: 'A unit of time.', col: 'five minutes', ex_en: 'Wait a minute.', ex: '等一下。' },
  { w: 'mirror', def: 'A reflecting surface.', col: 'look in mirror', ex_en: 'Look in the mirror.', ex: '照镜子。' },
  { w: 'miss', def: 'To fail to hit or feel sad.', col: 'miss bus', ex_en: 'I missed the bus.', ex: '我没赶上公交车。' },
  { w: 'mistake', def: 'An error.', col: 'make mistake', ex_en: 'I made a mistake.', ex: '我犯了个错。' },
  { w: 'mix', def: 'To combine.', col: 'mix together', ex_en: 'Mix the flour and sugar.', ex: '把面粉和糖混合。' },
  { w: 'model', def: 'A small copy or a person displaying.', col: 'model plane', ex_en: 'He builds model planes.', ex: '他做模型飞机。' },
  { w: 'modern', def: 'Current or new.', col: 'modern art', ex_en: 'This is a modern building.', ex: '这是座现代建筑。' },
  { w: 'moment', def: 'A very short time.', col: 'wait a moment', ex_en: 'Wait a moment please.', ex: '请稍等。' },
  { w: 'Monday', def: 'The second day of the week.', col: 'on Monday', ex_en: 'See you on Monday.', ex: '周一见。' },
  { w: 'money', def: 'Coins and notes.', col: 'spend money', ex_en: 'I need some money.', ex: '我需要些钱。' },
  { w: 'month', def: 'A period of about 30 days.', col: 'next month', ex_en: 'My birthday is next month.', ex: '我生日在下个月。' },
  { w: 'monument', def: 'A structure for memory.', col: 'historical monument', ex_en: 'This is an ancient monument.', ex: '这是座古纪念碑。' },
  { w: 'moon', def: 'The earth satellite.', col: 'full moon', ex_en: 'The moon is bright tonight.', ex: '今晚月亮很亮。' },
  { w: 'more', def: 'Greater amount.', col: 'more and more', ex_en: 'I need more time.', ex: '我需要更多时间。' },
  { w: 'morning', def: 'The early part of the day.', col: 'in morning', ex_en: 'I exercise in the morning.', ex: '我早上锻炼。' },
  { w: 'most', def: 'The majority.', col: 'at most', ex_en: 'Most people agree.', ex: '大多数人同意。' },
  { w: 'mother', def: 'Female parent.', col: 'my mother', ex_en: 'My mother is a teacher.', ex: '我妈妈是老师。' },
  { w: 'motorbike', def: 'A small motorcycle.', col: 'ride motorbike', ex_en: 'He rides a motorbike.', ex: '他骑摩托车。' },
  { w: 'motorway', def: 'A fast road.', col: 'drive on motorway', ex_en: 'Join the motorway.', ex: '上高速公路。' },
  { w: 'mountain', def: 'A high landform.', col: 'climb mountain', ex_en: 'The mountain is high.', ex: '山很高。' },
  { w: 'mouse', def: 'A small rodent or computer device.', col: 'computer mouse', ex_en: 'Click the mouse.', ex: '点击鼠标。' },
  { w: 'mouth', def: 'For eating and speaking.', col: 'open mouth', ex_en: 'Close your mouth when eating.', ex: '吃饭时闭上嘴。' },
  { w: 'move', def: 'To change position.', col: 'move house', ex_en: 'Let us move to the city.', ex: '我们搬到城里去吧。' },
  { w: 'movie', def: 'A film.', col: 'watch movie', ex_en: 'Let us watch a movie.', ex: '我们看电影吧。' },
  { w: 'much', def: 'A large amount.', col: 'too much', ex_en: 'There is too much traffic.', ex: '交通太堵了。' },
  { w: 'museum', def: 'A place for old things.', col: 'visit museum', ex_en: 'We visited the museum.', ex: '我们参观了博物馆。' },
  { w: 'music', def: 'Sounds in patterns.', col: 'listen to music', ex_en: 'I like pop music.', ex: '我喜欢流行音乐。' },
  { w: 'must', def: 'To be required.', col: 'must do', ex_en: 'You must finish this.', ex: '你必须完成这个。' },
  { w: 'my', def: 'Belonging to me.', col: 'this is my', ex_en: 'This is my book.', ex: '这是我的书。' },
  { w: 'myself', def: 'The person speaking.', col: 'by myself', ex_en: 'I can do it myself.', ex: '我自己能做。' },
  { w: 'nail', def: 'A metal fastener.', col: 'hammer nail', ex_en: 'Hammer a nail into the wall.', ex: '把钉子钉进墙里。' },
  { w: 'name', def: 'A word for a person.', col: 'what is your name', ex_en: 'My name is John.', ex: '我叫约翰。' },
  { w: 'narrow', def: 'Not wide.', col: 'very narrow', ex_en: 'The road is too narrow.', ex: '路太窄了。' },
  { w: 'near', def: 'Not far.', col: 'near here', ex_en: 'The school is near my house.', ex: '学校离我家很近。' },
  { w: 'nearly', def: 'Almost.', col: 'nearly finished', ex_en: 'I am nearly ready.', ex: '我快准备好了。' },
  { w: 'neat', def: 'Tidy.', col: 'very neat', ex_en: 'His room is always neat.', ex: '他的房间总是很整洁。' },
  { w: 'neck', def: 'Between head and body.', col: 'hurt neck', ex_en: 'I have a pain in my neck.', ex: '我脖子疼。' },
  { w: 'necklace', def: 'Jewelry worn on neck.', col: 'wear necklace', ex_en: 'She wears a gold necklace.', ex: '她戴着金项链。' }
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

  console.log(`KET修复批次4: ${toUpdate.length}个`)
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
