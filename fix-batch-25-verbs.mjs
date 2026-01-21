import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'start', def: 'To begin.', col: 'start doing, start from', ex_en: 'Let us start now.', ex: '我们现在开始吧。' },
  { w: 'begin', def: 'To start.', col: 'begin with, to begin with', ex_en: 'Knowledge begins with practice.', ex: '实践出真知。' },
  { w: 'end', def: 'To finish; or the final part.', col: 'at the end, end with', ex_en: 'The movie ends at 10 pm.', ex: '电影晚上10点结束。' },
  { w: 'finish', def: 'To complete.', col: 'finish doing, finish work', ex_en: 'When will you finish?', ex: '你什么时候做完？' },
  { w: 'continue', def: 'To keep going.', col: 'continue doing, continue with', ex_en: 'Please continue.', ex: '请继续。' },
  { w: 'stop', def: 'To cease.', col: 'stop doing, stop crying', ex_en: 'Stop that noise.', ex: '停止那噪音。' },
  { w: 'go', def: 'To move.', col: 'go to, go back', ex_en: 'Let us go home.', ex: '我们回家吧。' },
  { w: 'come', def: 'To move towards.', col: 'come here, come back', ex_en: 'Please come to my office.', ex: '请来我办公室。' },
  { w: 'arrive', def: 'To reach a place.', col: 'arrive at, arrive on time', ex_en: 'When did you arrive?', ex: '你什么时候到的？' },
  { w: 'leave', def: 'To go away.', col: 'leave for, leave work', ex_en: 'I leave work at 6 pm.', ex: '我下午6点下班。' },
  { w: 'enter', def: 'To go into.', col: 'enter room, enter password', ex_en: 'Please enter through the door.', ex: '请从门进入。' },
  { w: 'exit', def: 'To go out.', col: 'exit from, emergency exit', ex_en: 'Where is the exit?', ex: '出口在哪里？' },
  { w: 'stay', def: 'To remain.', col: 'stay here, stay at home', ex_en: 'Please stay with me.', ex: '请陪陪我。' },
  { w: 'wait', def: 'To stay until something happens.', col: 'wait for, wait here', ex_en: 'Wait for me.', ex: '等等我。' },
  { w: 'look', def: 'To see.', col: 'look at, look for', ex_en: 'Look at the blackboard.', ex: '看黑板。' },
  { w: 'see', def: 'To notice with eyes.', col: 'see something, go see', ex_en: 'I see what you mean.', ex: '我明白你的意思了。' },
  { w: 'watch', def: 'To look at for a time.', col: 'watch TV, watch game', ex_en: 'We watched a movie.', ex: '我们看了一场电影。' },
  { w: 'listen', def: 'To hear with attention.', col: 'listen to, listen carefully', ex_en: 'Listen to me.', ex: '听我说。' },
  { w: 'hear', def: 'To notice sound.', col: 'hear something, can not hear', ex_en: 'Can you hear me?', ex: '你能听见我说话吗？' },
  { w: 'sound', def: 'What you hear; or to make noise.', col: 'loud sound, sound like', ex_en: 'That sounds good.', ex: '听起来不错。' },
  { w: 'speak', def: 'To say words.', col: 'speak English, speak loudly', ex_en: 'Please speak slowly.', ex: '请说慢点。' },
  { w: 'talk', def: 'To say words to someone.', col: 'talk about, talk to', ex_en: 'Can I talk to you?', ex: '我能和你谈谈吗？' },
  { w: 'tell', def: 'To inform.', col: 'tell me, tell story', ex_en: 'Tell me the truth.', ex: '告诉我真相。' },
  { w: 'say', def: 'To speak words.', col: 'say hello, say goodbye', ex_en: 'What did he say?', ex: '他说了什么？' },
  { w: 'shout', def: 'To speak very loud.', col: 'shout at, shout for help', ex_en: 'Do not shout.', ex: '别喊。' },
  { w: 'call', def: 'To phone or name.', col: 'call someone, call back', ex_en: 'I will call you.', ex: '我会给你打电话。' },
  { w: 'answer', def: 'To reply.', col: 'answer phone, answer question', ex_en: 'Please answer my question.', ex: '请回答我的问题。' },
  { w: 'ask', def: 'To question.', col: 'ask question, ask for', ex_en: 'You can ask me anything.', ex: '你可以问我任何问题。' },
  { w: 'need', def: 'To require.', col: 'need help, need to', ex_en: 'I need your help.', ex: '我需要你的帮助。' },
  { w: 'want', def: 'To desire.', col: 'want to, want something', ex_en: 'I want to go home.', ex: '我想回家。' },
  { w: 'like', def: 'To find pleasant.', col: 'would like, feel like', ex_en: 'I like reading.', ex: '我喜欢阅读。' },
  { w: 'love', def: 'To like very much.', col: 'love doing, fall in love', ex_en: 'I love music.', ex: '我爱音乐。' },
  { w: 'hope', def: 'To want something to happen.', col: 'hope to, I hope', ex_en: 'I hope to see you again.', ex: '希望能再见到你。' },
  { w: 'try', def: 'To attempt.', col: 'try to, try doing', ex_en: 'Try your best.', ex: '尽你最大努力。' },
  { w: 'use', def: 'To employ for some purpose.', col: 'use something, make use', ex_en: 'May I use your phone?', ex: '我可以用你的电话吗？' },
  { w: 'help', def: 'To assist.', col: 'help someone, help with', ex_en: 'Can you help me?', ex: '你能帮我吗？' },
  { w: 'work', def: 'To do a job.', col: 'work hard, work at', ex_en: 'I work at home.', ex: '我在家工作。' },
  { w: 'play', def: 'To enjoy activity.', col: 'play game, play with', ex_en: 'Let us play together.', ex: '我们一起玩吧。' },
  { w: 'learn', def: 'To gain knowledge.', col: 'learn English, learn from', ex_en: 'I learn new words every day.', ex: '我每天学新单词。' },
  { w: 'study', def: 'To learn about.', col: 'study hard, study for', ex_en: 'He studies at university.', ex: '他在上大学。' },
  { w: 'know', def: 'To have knowledge.', col: 'know about, know that', ex_en: 'I know the answer.', ex: '我知道答案。' },
  { w: 'understand', def: 'To comprehend.', col: 'understand that, understand me', ex_en: 'Do you understand?', ex: '你明白吗？' },
  { w: 'think', def: 'To use the mind.', col: 'think about, think that', ex_en: 'I think you are right.', ex: '我认为你是对的。' },
  { w: 'believe', def: 'To accept as true.', col: 'believe in, believe me', ex_en: 'I believe you.', ex: '我相信你。' },
  { w: 'remember', def: 'To keep in mind.', col: 'remember to, remember well', ex_en: 'Remember to lock the door.', ex: '记得锁门。' },
  { w: 'forget', def: 'To lose from memory.', col: 'forget about, forget to', ex_en: 'Do not forget me.', ex: '别忘了我。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次25: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次25完成: ${ok}个\n`)
}
update()
