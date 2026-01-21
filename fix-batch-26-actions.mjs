import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'give', def: 'To present something.', col: 'give me, give back', ex_en: 'Give me that book.', ex: '把那本书给我。' },
  { w: 'take', def: 'To get and hold.', col: 'take away, take time', ex_en: 'It takes time.', ex: '这需要时间。' },
  { w: 'get', def: 'To receive or obtain.', col: 'get up, get ready', ex_en: 'I get up at 7 am.', ex: '我早上7点起床。' },
  { w: 'put', def: 'To place.', col: 'put on, put away', ex_en: 'Put it on the table.', ex: '把它放在桌子上。' },
  { w: 'place', def: 'To put; or a location.', col: 'take place, parking place', ex_en: 'Where is this place?', ex: '这是哪里？' },
  { w: 'keep', def: 'To have and not lose.', col: 'keep doing, keep safe', ex_en: 'Keep going.', ex: '继续前进。' },
  { w: 'let', def: 'To allow.', col: 'let me, let go', ex_en: 'Let me help you.', ex: '让我帮你。' },
  { w: 'make', def: 'To create.', col: 'make bed, make money', ex_en: 'I will make coffee.', ex: '我去煮咖啡。' },
  { w: 'create', def: 'To make something new.', col: 'create art, create new', ex_en: 'God created the world.', ex: '上帝创造了世界。' },
  { w: 'build', def: 'To construct.', col: 'build house, build up', ex_en: 'They built a new bridge.', ex: '他们建了一座新桥。' },
  { w: 'grow', def: 'To increase in size.', col: 'grow up, grow fast', ex_en: 'Children grow fast.', ex: '孩子长得快。' },
  { w: 'change', def: 'To make different.', col: 'change clothes, change mind', ex_en: 'Can we change the plan?', ex: '我们能改变计划吗？' },
  { w: 'move', def: 'To change position.', col: 'move house, move on', ex_en: 'Let us move to the city.', ex: '我们搬到城里去吧。' },
  { w: 'turn', def: 'To rotate or change direction.', col: 'turn left, turn right', ex_en: 'Turn right at the corner.', ex: '在拐角处右转。' },
  { w: 'open', def: 'To unclose.', col: 'open door, open eyes', ex_en: 'Please open the window.', ex: '请打开窗户。' },
  { w: 'close', def: 'To shut.', col: 'close door, close eyes', ex_en: 'Close the door.', ex: '关门。' },
  { w: 'show', def: 'To cause to see.', col: 'show me, show that', ex_en: 'Show me your ticket.', ex: '给我看你的票。' },
  { w: 'hide', def: 'To put out of sight.', col: 'hide from, hide and seek', ex_en: 'Where did you hide it?', ex: '你把它藏在哪了？' },
  { w: 'find', def: 'To discover.', col: 'find out, find lost', ex_en: 'I found my keys.', ex: '我找到我的钥匙了。' },
  { w: 'lose', def: 'To no longer have.', col: 'lose weight, lose way', ex_en: 'I lost my phone.', ex: '我把手机弄丢了。' },
  { w: 'break', def: 'To damage into pieces.', col: 'break down, break up', ex_en: 'Do not break the glass.', ex: '别打碎玻璃。' },
  { w: 'fix', def: 'To repair.', col: 'fix problem, fix car', ex_en: 'Can you fix this?', ex: '你能修好这个吗？' },
  { w: 'cut', def: 'To slice.', col: 'cut hair, cut paper', ex_en: 'Please cut the cake.', ex: '请切开蛋糕。' },
  { w: 'hold', def: 'To carry or keep.', col: 'hold on, hold hands', ex_en: 'Hold my hand.', ex: '牵着我的手。' },
  { w: 'carry', def: 'To transport.', col: 'carry bag, carry heavy', ex_en: 'Let me carry that.', ex: '我来搬那个。' },
  { w: 'bring', def: 'To take with.', col: 'bring back, bring here', ex_en: 'Bring me some water.', ex: '给我拿点水。' },
  { w: 'send', def: 'To cause to go.', col: 'send message, send away', ex_en: 'I sent you an email.', ex: '我给你发了邮件。' },
  { w: 'receive', def: 'To get something.', col: 'receive gift, receive message', ex_en: 'Did you receive my letter?', ex: '你收到我的信了吗？' },
  { w: 'meet', def: 'To encounter.', col: 'meet someone, meet for', ex_en: 'Nice to meet you.', ex: '很高兴见到你。' },
  { w: 'follow', def: 'To go behind.', col: 'follow me, follow advice', ex_en: 'Follow my instructions.', ex: '按照我的指示做。' },
  { w: 'lead', def: 'To guide.', col: 'lead to, lead team', ex_en: 'This road leads to the station.', ex: '这条路通往车站。' },
  { w: 'join', def: 'To become part of.', col: 'join army, join club', ex_en: 'I want to join the team.', ex: '我想加入这个队。' },
  { w: 'connect', def: 'To link together.', col: 'connect to, connect with', ex_en: 'Connect to the internet.', ex: '连接到互联网。' },
  { w: 'change', def: 'To make different.', col: 'change clothes, change job', ex_en: 'I need to change my clothes.', ex: '我需要换衣服。' },
  { w: 'choose', def: 'To select.', col: 'choose from, choose between', ex_en: 'Choose your favorite.', ex: '选择你喜欢的。' },
  { w: 'decide', def: 'To determine.', col: 'decide to, decide on', ex_en: 'I decided to go.', ex: '我决定去了。' },
  { w: 'plan', def: 'To arrange.', col: 'plan to, make plan', ex_en: 'We plan to travel.', ex: '我们计划去旅行。' },
  { w: 'prepare', def: 'To make ready.', col: 'prepare for, prepare food', ex_en: 'Prepare for the exam.', ex: '准备考试。' },
  { w: 'organize', def: 'To arrange.', col: 'organize event, organize work', ex_en: 'She organized the meeting.', ex: '她组织了这次会议。' },
  { w: 'save', def: 'To rescue; or to keep.', col: 'save money, save time', ex_en: 'I need to save more money.', ex: '我需要多存钱。' },
  { w: 'spend', def: 'To use money or time.', col: 'spend money, spend time', ex_en: 'I spend too much time.', ex: '我花了太多时间。' },
  { w: 'waste', def: 'To use badly.', col: 'waste time, do not waste', ex_en: 'Do not waste food.', ex: '别浪费食物。' },
  { w: 'mean', def: 'To intend; or unkind.', col: 'mean that, what mean', ex_en: 'What do you mean?', ex: '你什么意思？' },
  { w: 'show', def: 'To cause to see.', col: 'show me, show up', ex_en: 'Show me the way.', ex: '给我指路。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次26: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次26完成: ${ok}个\n`)
}
update()
