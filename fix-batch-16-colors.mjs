import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const batch16Data = [
  { word: 'red', definition_en: 'The color of blood or fire.', collocation_en: 'red color, bright red', example_sentence_en: 'She wore a red dress to the party.', example_sentence: '她穿着红色连衣裙参加派对。' },
  { word: 'blue', definition_en: 'The color of the sky on a clear day.', collocation_en: 'blue sky, dark blue', example_sentence_en: 'The ocean is deep blue.', example_sentence: '大海是深蓝色的。' },
  { word: 'green', definition_en: 'The color of grass and leaves.', collocation_en: 'green grass, light green', example_sentence_en: 'The fields are lush and green in spring.', example_sentence: '春天田野郁郁葱葱。' },
  { word: 'yellow', definition_en: 'The color of the sun and ripe bananas.', collocation_en: 'yellow flower, bright yellow', example_sentence_en: 'The sunflowers are bright yellow.', example_sentence: '向日葵是鲜艳的黄色。' },
  { word: 'orange', definition_en: 'A color between red and yellow; or the fruit.', collocation_en: 'orange juice, orange color', example_sentence_en: 'I would like some orange juice.', example_sentence: '我要喝橙汁。' },
  { word: 'purple', definition_en: 'A color made by mixing red and blue.', collocation_en: 'purple flower, dark purple', example_sentence_en: 'She loves the color purple.', example_sentence: '她喜欢紫色。' },
  { word: 'pink', definition_en: 'A pale red color.', collocation_en: 'pink dress, light pink', example_sentence_en: 'The baby girl wore a pink hat.', example_sentence: '女宝宝戴着粉色帽子。' },
  { word: 'brown', definition_en: 'The color of earth and wood.', collocation_en: 'brown hair, dark brown', example_sentence_en: 'He has brown eyes and brown hair.', example_sentence: '他是棕色头发和棕色眼睛。' },
  { word: 'black', definition_en: 'The darkest color, like coal.', collocation_en: 'black hair, black and white', example_sentence_en: 'He is wearing a black suit.', example_sentence: '他穿着黑色西装。' },
  { word: 'white', definition_en: 'The color of snow or milk.', collocation_en: 'white paper, pure white', example_sentence_en: 'She wore a beautiful white dress.', example_sentence: '她穿着漂亮的白色连衣裙。' },
  { word: 'gray', definition_en: 'A color between black and white.', collocation_en: 'gray sky, dark gray', example_sentence_en: 'The sky turned gray before the storm.', example_sentence: '暴风雨前天空变灰了。' },
  { word: 'gold', definition_en: 'A shiny yellow metal; or the color.', collocation_en: 'gold ring, pure gold', example_sentence_en: 'She wears a gold necklace.', example_sentence: '她戴着金项链。' },
  { word: 'silver', definition_en: 'A shiny gray-white metal; or the color.', collocation_en: 'silver coin, silver color', example_sentence_en: 'The second prize is a silver medal.', example_sentence: '二等奖是银牌。' },
  { word: 'light', definition_en: 'Not dark; having brightness.', collocation_en: 'light blue, light color', example_sentence_en: 'She wore a light green dress.', example_sentence: '她穿着浅绿色的连衣裙。' },
  { word: 'dark', definition_en: 'Having little or no light.', collocation_en: 'dark room, dark blue', example_sentence_en: 'The room is too dark to read.', example_sentence: '房间太暗了，没法读书。' },
  { word: 'color', definition_en: 'The appearance of things from light.', collocation_en: 'bright color, favorite color', example_sentence_en: 'What is your favorite color?', example_sentence: '你最喜欢什么颜色？' },
  { word: 'big', definition_en: 'Of large size.', collocation_en: 'big house, very big', example_sentence_en: 'They live in a big house.', example_sentence: '他们住在大房子里。' },
  { word: 'small', definition_en: 'Of little size.', collocation_en: 'small room, very small', example_sentence_en: 'The car is too small for our family.', example_sentence: '这辆车对我们家来说太小了。' },
  { word: 'long', definition_en: 'Measuring a great distance.', collocation_en: 'long time, long hair', example_sentence_en: 'It takes a long time to get there.', example_sentence: '到那里要花很长时间。' },
  { word: 'short', definition_en: 'Measuring a small distance.', collocation_en: 'short time, short hair', example_sentence_en: 'The meeting was very short.', example_sentence: '会议很短。' },
  { word: 'tall', definition_en: 'Of great height.', collocation_en: 'tall building, very tall', example_sentence_en: 'He is tall and strong.', example_sentence: '他又高又壮。' },
  { word: 'wide', definition_en: 'Measuring a large distance from side to side.', collocation_en: 'wide river, very wide', example_sentence_en: 'The river is too wide to swim across.', example_sentence: '河太宽了，游不过去。' },
  { word: 'narrow', definition_en: 'Measuring a small distance from side to side.', collocation_en: 'narrow road, very narrow', example_sentence_en: 'Be careful on the narrow bridge.', example_sentence: '在窄桥上要小心。' },
  { word: 'round', definition_en: 'Shaped like a circle.', collocation_en: 'round face, all year round', example_sentence_en: 'The earth is round.', example_sentence: '地球是圆的。' },
  { word: 'square', definition_en: 'Having four equal sides and four right angles.', collocation_en: 'square box, town square', example_sentence_en: 'They met in the town square.', example_sentence: '他们在市镇广场见面。' },
  { word: 'straight', definition_en: 'Not bending or curving.', collocation_en: 'straight line, go straight', example_sentence_en: 'Go straight and turn left.', example_sentence: '直走然后左转。' }
]

async function updateBatch16() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}
  allWords.forEach(w => { wordToId[w.word] = w.id })

  const wordsToUpdate = batch16Data
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

  console.log(`批次16: ${wordsToUpdate.length}个单词\n`)
  let successCount = 0
  for (const word of wordsToUpdate) {
    const { error } = await supabase.from('words').update({
      definition_en: word.definition_en,
      collocation: word.collocation,
      collocation_en: word.collocation_en,
      example_sentence: word.example_sentence,
      example_sentence_en: word.example_sentence_en
    }).eq('id', word.id)
    if (!error) successCount++
  }
  console.log(`批次16完成: ${successCount}个\n`)
}
updateBatch16()
