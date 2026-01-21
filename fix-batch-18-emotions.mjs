import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const batch18Data = [
  { w: 'happy', def: 'Feeling or showing pleasure.', col: 'very happy, happy life', ex_en: 'I am very happy to see you.', ex: '很高兴见到你。' },
  { w: 'sad', def: 'Feeling unhappy.', col: 'feel sad, very sad', ex_en: 'Why are you so sad?', ex: '你为什么这么伤心？' },
  { w: 'angry', def: 'Feeling strong displeasure.', col: 'get angry, very angry', ex_en: 'Do not be angry with me.', ex: '别生我的气。' },
  { w: 'excited', def: 'Feeling very enthusiastic.', col: 'get excited, be excited', ex_en: 'I am excited about the trip.', ex: '我对这次旅行很兴奋。' },
  { w: 'tired', def: 'Needing rest.', col: 'get tired, feel tired', ex_en: 'I am tired after work.', ex: '下班后我很累。' },
  { w: 'hungry', def: 'Needing food.', col: 'feel hungry, very hungry', ex_en: 'I am hungry. Let us eat.', ex: '我饿了，我们吃饭吧。' },
  { w: 'thirsty', def: 'Needing drink.', col: 'feel thirsty, very thirsty', ex_en: 'I am thirsty.', ex: '我渴了。' },
  { w: 'afraid', def: 'Feeling fear.', col: 'be afraid, afraid of', ex_en: 'Do not be afraid of the dark.', ex: '别怕黑。' },
  { w: 'worried', def: 'Feeling anxiety.', col: 'feel worried, worried about', ex_en: 'Do not worry about it.', ex: '别担心。' },
  { w: 'surprised', def: 'Feeling sudden surprise.', col: 'be surprised, very surprised', ex_en: 'I was surprised by the news.', ex: '这个消息让我很惊讶。' },
  { w: 'proud', def: 'Feeling deep pleasure.', col: 'be proud, proud of', ex_en: 'I am proud of my son.', ex: '我为我的儿子感到骄傲。' },
  { w: 'sorry', def: 'Feeling sadness or regret.', col: 'say sorry, very sorry', ex_en: 'I am sorry for being late.', ex: '对不起我迟到了。' },
  { w: 'love', def: 'To like someone very much.', col: 'fall in love, love someone', ex_en: 'I love my family.', ex: '我爱我的家人。' },
  { w: 'hate', def: 'To dislike strongly.', col: 'hate doing, very hate', ex_en: 'I hate waiting in line.', ex: '我讨厌排队。' },
  { w: 'like', def: 'To find pleasant.', col: 'would like, feel like', ex_en: 'I like reading books.', ex: '我喜欢读书。' },
  { w: 'hope', def: 'To want something to happen.', col: 'hope to, I hope', ex_en: 'I hope to see you again.', ex: '希望能再见到你。' },
  { w: 'wish', def: 'To want something.', col: 'make wish, wish for', ex_en: 'I wish you good luck.', ex: '我祝你好运。' },
  { w: 'enjoy', def: 'To get pleasure from.', col: 'enjoy doing, enjoy life', ex_en: 'I enjoy listening to music.', ex: '我喜欢听音乐。' },
  { w: 'mind', def: 'To object to something.', col: 'would you mind, do you mind', ex_en: 'Do you mind if I open the window?', ex: '你介意我开窗吗？' },
  { w: 'care', def: 'To feel concern.', col: 'take care, care about', ex_en: 'I do not care what people think.', ex: '我不在乎别人怎么想。' },
  { w: 'believe', def: 'To think something is true.', col: 'believe in, believe me', ex_en: 'I believe you.', ex: '我相信你。' },
  { w: 'think', def: 'To use your mind.', col: 'think about, think that', ex_en: 'I think this is correct.', ex: '我认为这是对的。' },
  { w: 'know', def: 'To have information.', col: 'know about, know that', ex_en: 'I know the answer.', ex: '我知道答案。' },
  { w: 'understand', def: 'To know the meaning.', col: 'understand that, understand me', ex_en: 'Do you understand what I mean?', ex: '你明白我的意思吗？' },
  { w: 'remember', def: 'To keep in memory.', col: 'remember to, remember well', ex_en: 'Remember to lock the door.', ex: '记得锁门。' },
  { w: 'forget', def: 'To lose memory.', col: 'forget about, forget to', ex_en: 'Do not forget to call me.', ex: '别忘了给我打电话。' }
]
async function updateBatch18() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = batch18Data.filter(d => wordToId[d.w]).map(d => ({
    id: wordToId[d.w],
    definition_en: d.def,
    collocation_en: d.col,
    example_sentence: d.ex,
    example_sentence_en: d.ex_en
  }))
  console.log(`批次18: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次18完成: ${ok}个\n`)
}
updateBatch18()
