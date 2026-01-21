/**
 * 批次11：动作动词（30个）
 * walk, run, jump, climb, swim, dance, sing, play, watch, listen,
 * speak, talk, say, tell, ask, answer, call, shout, whisper, smile,
 * laugh, cry, shout, wave, point, nod, shake, push, pull, carry, lift
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

const batch11Data = [
  { word: 'walk', definition_en: 'To move forward by putting one foot in front of the other.', collocation_en: 'go for a walk, walk away', example_sentence_en: 'I walk to work every day.', example_sentence: '我每天步行上班。' },
  { word: 'run', definition_en: 'To move quickly on your feet.', collocation_en: 'run fast, go for a run', example_sentence_en: 'She runs in the park every morning.', example_sentence: '她每天早上在公园跑步。' },
  { word: 'jump', definition_en: 'To push yourself off the ground into the air.', collocation_en: 'jump high, long jump', example_sentence_en: 'The cat can jump very high.', example_sentence: '猫能跳得很高。' },
  { word: 'climb', definition_en: 'To go up something towards the top.', collocation_en: 'climb mountain, climb stairs', example_sentence_en: 'We climbed to the top of the hill.', example_sentence: '我们爬到了山顶。' },
  { word: 'swim', definition_en: 'To move through water using your body.', collocation_en: 'learn to swim, swim fast', example_sentence_en: 'Can you swim across the river?', example_sentence: '你能游过这条河吗？' },
  { word: 'dance', definition_en: 'To move your body to music.', collocation_en: 'dance music, learn to dance', example_sentence_en: 'They love to dance at parties.', example_sentence: '他们喜欢在派对上跳舞。' },
  { word: 'sing', definition_en: 'To make musical sounds with your voice.', collocation_en: 'sing song, sing along', example_sentence_en: 'She sings beautifully in the choir.', example_sentence: '她在合唱团唱得很好听。' },
  { word: 'play', definition_en: 'To enjoy yourself doing something; or to perform music.', collocation_en: 'play game, play football', example_sentence_en: 'Children love to play in the park.', example_sentence: '孩子们喜欢在公园里玩。' },
  { word: 'watch', definition_en: 'To look at something for a period of time.', collocation_en: 'watch TV, watch movie', example_sentence_en: 'We watched a movie last night.', example_sentence: '我们昨晚看了一部电影。' },
  { word: 'listen', definition_en: 'To give attention to someone or something in order to hear.', collocation_en: 'listen to music, listen carefully', example_sentence_en: 'Please listen to what I am saying.', example_sentence: '请听我说。' },
  { word: 'speak', definition_en: 'To say words or talk to someone.', collocation_en: 'speak English, speak loudly', example_sentence_en: 'Can you speak Spanish?', example_sentence: '你会说西班牙语吗？' },
  { word: 'talk', definition_en: 'To say words to communicate with someone.', collocation_en: 'talk about, talk to someone', example_sentence_en: 'Let us talk about your future plans.', example_sentence: '我们谈谈你未来的计划吧。' },
  { word: 'say', definition_en: 'To speak words.', collocation_en: 'say hello, say goodbye', example_sentence_en: 'What did you say?', example_sentence: '你说什么？' },
  { word: 'tell', definition_en: 'To communicate information to someone.', collocation_en: 'tell story, tell truth', example_sentence_en: 'Can you tell me the time?', example_sentence: '能告诉我现在几点吗？' },
  { word: 'ask', definition_en: 'To speak to someone to get an answer.', collocation_en: 'ask question, ask for help', example_sentence_en: 'Do not be afraid to ask questions.', example_sentence: '不要害怕提问。' },
  { word: 'answer', definition_en: 'To speak or write back to someone.', collocation_en: 'answer question, answer phone', example_sentence_en: 'Please answer my question.', example_sentence: '请回答我的问题。' },
  { word: 'call', definition_en: 'To use a phone; or to shout out.', collocation_en: 'call someone, phone call', example_sentence_en: 'I will call you later.', example_sentence: '我晚点给你打电话。' },
  { word: 'shout', definition_en: 'To speak very loudly.', collocation_en: 'shout at, shout for help', example_sentence_en: 'Do not shout at me!', example_sentence: '别对我大喊大叫！' },
  { word: 'whisper', definition_en: 'To speak very quietly.', collocation_en: 'whisper in ear, whisper something', example_sentence_en: 'She whispered the secret to me.', example_sentence: '她悄悄把秘密告诉了我。' },
  { word: 'smile', definition_en: 'To make a happy face.', collocation_en: 'smile at, big smile', example_sentence_en: 'She smiled when she saw me.', example_sentence: '她看到我时笑了。' },
  { word: 'laugh', definition_en: 'To make sounds because something is funny.', collocation_en: 'laugh at, laugh loudly', example_sentence_en: 'We laughed at his funny jokes.', example_sentence: '我们被他讲的笑话逗乐了。' },
  { word: 'cry', definition_en: 'To produce tears from your eyes.', collocation_en: 'cry loudly, cry for help', example_sentence_en: 'The baby cried all night.', example_sentence: '宝宝哭了一整夜。' },
  { word: 'wave', definition_en: 'To move your hand as a greeting.', collocation_en: 'wave goodbye, wave hand', example_sentence_en: 'She waved at me from across the street.', example_sentence: '她在街对面向我挥手。' },
  { word: 'point', definition_en: 'To use your finger to show where something is.', collocation_en: 'point at, point finger', example_sentence_en: 'He pointed to the mountain in the distance.', example_sentence: '他指向远处的山。' },
  { word: 'nod', definition_en: 'To move your head up and down to say yes.', collocation_en: 'nod head, nod agreement', example_sentence_en: 'She nodded in agreement.', example_sentence: '她点头表示同意。' },
  { word: 'shake', definition_en: 'To move something quickly from side to side.', collocation_en: 'shake hand, shake head', example_sentence_en: 'He shook his head in disagreement.', example_sentence: '他摇头表示不同意。' },
  { word: 'push', definition_en: 'To use force to move something away.', collocation_en: 'push button, push door', example_sentence_en: 'Please push the door to open it.', example_sentence: '请推门打开。' },
  { word: 'pull', definition_en: 'To hold something and move it towards you.', collocation_en: 'pull handle, pull chair', example_sentence_en: 'Pull the door gently.', example_sentence: '轻轻地拉门。' },
  { word: 'carry', definition_en: 'To hold something and take it somewhere.', collocation_en: 'carry bag, carry heavy', example_sentence_en: 'Can you help me carry these boxes?', example_sentence: '能帮我搬这些箱子吗？' },
  { word: 'lift', definition_en: 'To raise something to a higher position.', collocation_en: 'lift heavy, lift up', example_sentence_en: 'This box is too heavy to lift.', example_sentence: '这个箱子太重了，搬不动。' }
]

async function updateBatch11() {
  console.log('🎓 开始更新批次11：动作动词（30个）\n')

  const { data: allWords } = await supabase
    .from('words')
    .select('id, word')

  const wordToId = {}
  allWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  const wordsToUpdate = batch11Data
    .map(item => {
      const id = wordToId[item.word]
      if (!id) return null
      return {
        id,
        definition_en: item.definition_en,
        collocation: item.example_sentence,
        collocation_en: item.collocation_en,
        example_sentence: item.example_sentence,
        example_sentence_en: item.example_sentence_en
      }
    })
    .filter(w => w !== null)

  console.log(`✅ 找到 ${wordsToUpdate.length} 个单词在数据库中\n`)
  console.log('📊 开始更新...\n')

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < wordsToUpdate.length; i++) {
    const word = wordsToUpdate[i]

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / wordsToUpdate.length * 100)}% (${i + 1}/${wordsToUpdate.length}) - 成功: ${successCount}, 错误: ${errorCount}`)

    try {
      const { error } = await supabase
        .from('words')
        .update({
          definition_en: word.definition_en,
          collocation: word.collocation,
          collocation_en: word.collocation_en,
          example_sentence: word.example_sentence,
          example_sentence_en: word.example_sentence_en
        })
        .eq('id', word.id)

      if (error) {
        errorCount++
      } else {
        successCount++
      }
    } catch (e) {
      errorCount++
    }
  }

  console.log('\n\n✅ 批次11更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateBatch11()
