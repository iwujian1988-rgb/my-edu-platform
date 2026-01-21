/**
 * 批次12：交通和旅行（30个）
 * car, bus, train, plane, bicycle, taxi, subway, ticket, passport,
 * luggage, journey, trip, travel, holiday, vacation, hotel, room,
 * bed, pillow, blanket, towel, soap, shower, bath, toilet, wash,
 * clean, dirty, sleep, wake up, dream
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

const batch12Data = [
  { word: 'car', definition_en: 'A road vehicle with four wheels.', collocation_en: 'drive car, car park', example_sentence_en: 'My father drives me to school every day.', example_sentence: '我爸爸每天开车送我上学。' },
  { word: 'bus', definition_en: 'A large road vehicle that carries many passengers.', collocation_en: 'take bus, bus stop', example_sentence_en: 'I take the bus to work every morning.', example_sentence: '我每天早上坐公交车上班。' },
  { word: 'train', definition_en: 'A railway vehicle with many carriages.', collocation_en: 'take train, train station', example_sentence_en: 'The train arrived at the station on time.', example_sentence: '火车准时到达车站。' },
  { word: 'plane', definition_en: 'A flying vehicle with wings.', collocation_en: 'by plane, plane ticket', example_sentence_en: 'We flew to Paris by plane.', example_sentence: '我们坐飞机去巴黎。' },
  { word: 'bicycle', definition_en: 'A vehicle with two wheels that you ride.', collocation_en: 'ride bicycle, bicycle lane', example_sentence_en: 'I ride my bicycle to school every day.', example_sentence: '我每天骑自行车上学。' },
  { word: 'taxi', definition_en: 'A car with a driver that you pay to travel in.', collocation_en: 'take taxi, call taxi', example_sentence_en: 'Let us take a taxi to the airport.', example_sentence: '我们坐出租车去机场吧。' },
  { word: 'subway', definition_en: 'An electric railway that runs under the ground.', collocation_en: 'take subway, subway station', example_sentence_en: 'The subway is faster than the bus during rush hour.', example_sentence: '高峰时段地铁比公交车快。' },
  { word: 'ticket', definition_en: 'A piece of paper that shows you have paid to enter or travel.', collocation_en: 'buy ticket, train ticket', example_sentence_en: 'I bought a ticket for the concert.', example_sentence: '我买了一张音乐会门票。' },
  { word: 'passport', definition_en: 'An official document that identifies you as a citizen.', collocation_en: 'show passport, passport control', example_sentence_en: 'Do you have your passport with you?', example_sentence: '你带护照了吗？' },
  { word: 'luggage', definition_en: 'Bags and suitcases that you carry when traveling.', collocation_en: 'check luggage, carry luggage', example_sentence_en: 'How many pieces of luggage do you have?', example_sentence: '你有几件行李？' },
  { word: 'journey', definition_en: 'The act of traveling from one place to another.', collocation_en: 'long journey, journey time', example_sentence_en: 'Have a safe journey home!', example_sentence: '祝你回家旅途平安！' },
  { word: 'trip', definition_en: 'A visit to a place and back, especially for a short time.', collocation_en: 'go on trip, business trip', example_sentence_en: 'We are planning a trip to the mountains.', example_sentence: '我们计划去山里旅行。' },
  { word: 'travel', definition_en: 'To go from one place to another.', collocation_en: 'travel abroad, travel agent', example_sentence_en: 'I love to travel to different countries.', example_sentence: '我喜欢去不同的国家旅行。' },
  { word: 'holiday', definition_en: 'A time of rest from work or school.', collocation_en: 'summer holiday, on holiday', example_sentence_en: 'Where are you going for your summer holiday?', example_sentence: '你暑假打算去哪里？' },
  { word: 'vacation', definition_en: 'A holiday, especially when you are away from home.', collocation_en: 'summer vacation, family vacation', example_sentence_en: 'They went to Hawaii for their vacation.', example_sentence: '他们去夏威夷度假了。' },
  { word: 'hotel', definition_en: 'A place where you pay to stay when traveling.', collocation_en: 'book hotel, luxury hotel', example_sentence_en: 'We stayed at a hotel near the beach.', example_sentence: '我们住在海滩附近的酒店。' },
  { word: 'room', definition_en: 'A part of a building with walls and a floor.', collocation_en: 'hotel room, living room', example_sentence_en: 'Our hotel room has a beautiful view.', example_sentence: '我们酒店房间景色很美。' },
  { word: 'bed', definition_en: 'A piece of furniture for sleeping on.', collocation_en: 'go to bed, make bed', example_sentence_en: 'I go to bed at 10 pm every night.', example_sentence: '我每晚10点上床睡觉。' },
  { word: 'pillow', definition_en: 'A soft support for your head when sleeping.', collocation_en: 'sleep on pillow, soft pillow', example_sentence_en: 'This pillow is too soft.', example_sentence: '这个枕头太软了。' },
  { word: 'blanket', definition_en: 'A thick cloth cover for warmth on a bed.', collocation_en: 'electric blanket, warm blanket', example_sentence_en: 'It is cold tonight; I need an extra blanket.', example_sentence: '今晚很冷，我需要再加条毯子。' },
  { word: 'towel', definition_en: 'A piece of cloth for drying your body.', collocation_en: 'beach towel, paper towel', example_sentence_en: 'Please bring a towel to the swimming pool.', example_sentence: '请带条毛巾去游泳池。' },
  { word: 'soap', definition_en: 'A substance used for washing.', collocation_en: 'wash with soap, hand soap', example_sentence_en: 'Use soap to clean your hands.', example_sentence: '用肥皂洗手。' },
  { word: 'shower', definition_en: 'A device for spraying water on your body to wash.', collocation_en: 'take shower, shower gel', example_sentence_en: 'I usually take a shower in the morning.', example_sentence: '我通常早上洗澡。' },
  { word: 'bath', definition_en: 'A long container that you fill with water to wash in.', collocation_en: 'take bath, bath towel', example_sentence_en: 'A hot bath helps me relax before bed.', example_sentence: '睡前泡个热水澡帮我放松。' },
  { word: 'toilet', definition_en: 'A room with a toilet bowl; or the bowl itself.', collocation_en: 'go to toilet, public toilet', example_sentence_en: 'Where is the toilet, please?', example_sentence: '请问厕所在哪里？' },
  { word: 'wash', definition_en: 'To clean something with water.', collocation_en: 'wash hands, wash clothes', example_sentence_en: 'Remember to wash your hands before eating.', example_sentence: '记得饭前洗手。' },
  { word: 'clean', definition_en: 'Free from dirt or marks.', collocation_en: 'keep clean, clean room', example_sentence_en: 'Please keep your room clean and tidy.', example_sentence: '请保持房间整洁。' },
  { word: 'dirty', definition_en: 'Not clean; covered in dirt or marks.', collocation_en: 'dirty clothes, get dirty', example_sentence_en: 'Your shoes are very dirty.', example_sentence: '你的鞋很脏。' },
  { word: 'sleep', definition_en: 'To rest your body and mind with your eyes closed.', collocation_en: 'go to sleep, deep sleep', example_sentence_en: 'I slept for eight hours last night.', example_sentence: '我昨晚睡了八小时。' },
  { word: 'wake up', definition_en: 'To stop sleeping and become awake.', collocation_en: 'wake up early, time to wake up', example_sentence_en: 'What time do you usually wake up?', example_sentence: '你通常几点醒来？' },
  { word: 'dream', definition_en: 'Images and feelings in your mind while sleeping.', collocation_en: 'have dream, sweet dream', example_sentence_en: 'I had a strange dream last night.', example_sentence: '我昨晚做了一个奇怪的梦。' }
]

async function updateBatch12() {
  console.log('🎓 开始更新批次12：交通和旅行（30个）\n')

  const { data: allWords } = await supabase
    .from('words')
    .select('id, word')

  const wordToId = {}
  allWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  const wordsToUpdate = batch12Data
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

  console.log('\n\n✅ 批次12更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateBatch12()
