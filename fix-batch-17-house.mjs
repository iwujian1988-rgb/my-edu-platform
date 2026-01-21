import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const batch17Data = [
  { w: 'house', def: 'A building for human living.', col: 'buy house, new house', ex_en: 'They bought a new house near the park.', ex: '他们在公园附近买了新房子。' },
  { w: 'home', def: 'The place where you live.', col: 'go home, stay at home', ex_en: 'I want to go home early today.', ex: '我今天想早点回家。' },
  { w: 'room', def: 'A part of a building.', col: 'living room, hotel room', ex_en: 'My bedroom is small but comfortable.', ex: '我的卧室很小但很舒适。' },
  { w: 'kitchen', def: 'Where food is prepared.', col: 'kitchen table, modern kitchen', ex_en: 'Mother is cooking in the kitchen.', ex: '妈妈在厨房做饭。' },
  { w: 'bedroom', def: 'A room for sleeping.', col: 'master bedroom, small bedroom', ex_en: 'The bedroom has a large window.', ex: '卧室有一扇大窗户。' },
  { w: 'bathroom', def: 'A room with a toilet and bath.', col: 'clean bathroom, go to bathroom', ex_en: 'Where is the bathroom?', ex: '厕所在哪里？' },
  { w: 'living room', def: 'A room for relaxing and socializing.', col: 'in living room, large living room', ex_en: 'We watched TV in the living room.', ex: '我们在客厅看电视。' },
  { w: 'garden', def: 'A place with plants and flowers.', col: 'in garden, beautiful garden', ex_en: 'They have a beautiful garden.', ex: '他们有一个漂亮的花园。' },
  { w: 'yard', def: 'An area around a house.', col: 'front yard, back yard', ex_en: 'The children are playing in the yard.', ex: '孩子们在院子里玩。' },
  { w: 'roof', def: 'The top covering of a building.', col: 'on the roof, flat roof', ex_en: 'There is a cat on the roof.', ex: '屋顶上有只猫。' },
  { w: 'wall', def: 'A side of a room or building.', col: 'paint wall, brick wall', ex_en: 'Hang the picture on the wall.', ex: '把画挂在墙上。' },
  { w: 'floor', def: 'The surface you walk on indoors.', col: 'on the floor, clean floor', ex_en: 'The floor is made of wood.', ex: '地板是木头做的。' },
  { w: 'door', def: 'A moving part to close an opening.', col: 'open door, close door', ex_en: 'Please close the door.', ex: '请关门。' },
  { w: 'window', def: 'Glass in a wall to see through.', col: 'open window, break window', ex_en: 'Open the window to let fresh air in.', ex: '打开窗户让新鲜空气进来。' },
  { w: 'chair', def: 'A seat with a back.', col: 'sit on chair, comfortable chair', ex_en: 'Please take a chair.', ex: '请拿把椅子。' },
  { w: 'table', def: 'A flat top on legs.', col: 'dining table, on the table', ex_en: 'Dinner is on the table.', ex: '晚饭在桌子上。' },
  { w: 'desk', def: 'A table for working.', col: 'writing desk, office desk', ex_en: 'My desk is always messy.', ex: '我的书桌总是很乱。' },
  { w: 'sofa', def: 'A long comfortable seat.', col: 'sit on sofa, leather sofa', ex_en: 'We sat on the sofa and watched TV.', ex: '我们坐在沙发上看电视。' },
  { w: 'bed', def: 'A piece of furniture for sleeping.', col: 'go to bed, make bed', ex_en: 'I go to bed at 10 pm.', ex: '我晚上10点上床睡觉。' },
  { w: 'lamp', def: 'A device that gives light.', col: 'turn on lamp, table lamp', ex_en: 'Please turn on the lamp.', ex: '请打开灯。' },
  { w: 'television', def: 'A device for watching programs.', col: 'watch television, big television', ex_en: 'Let us watch television.', ex: '我们看电视吧。' },
  { w: 'computer', def: 'An electronic machine.', col: 'use computer, personal computer', ex_en: 'I work on my computer all day.', ex: '我整天用电脑工作。' },
  { w: 'phone', def: 'A device for talking to people far away.', col: 'answer phone, mobile phone', ex_en: 'My phone battery is low.', ex: '我手机电量低了。' },
  { w: 'clock', def: 'A device showing time.', col: 'alarm clock, wall clock', ex_en: 'The clock says it is noon.', ex: '时钟显示是中午。' },
  { w: 'key', def: 'A small metal object for locks.', col: 'house key, car key', ex_en: 'I lost my house key.', ex: '我把家门钥匙弄丢了。' },
  { w: 'lock', def: 'A device that keeps things closed.', col: 'door lock, open lock', ex_en: 'Lock the door when you leave.', ex: '离开时记得锁门。' }
]
async function updateBatch17() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = batch17Data.filter(d => wordToId[d.w]).map(d => ({
    id: wordToId[d.w],
    definition_en: d.def,
    collocation_en: d.col,
    example_sentence: d.ex,
    example_sentence_en: d.ex_en
  }))
  console.log(`批次17: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次17完成: ${ok}个\n`)
}
updateBatch17()
