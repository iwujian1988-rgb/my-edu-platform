/**
 * 批次15：天气和季节（25个）
 * sunny, cloudy, rainy, windy, snowy, stormy, hot, cold, warm, cool,
 * wet, dry, spring, summer, autumn, winter, weather, temperature, rain, snow,
 * wind, sun, cloud, storm, fog
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
const supabase = createClient(supabaseUrl, supabaseKey)

const batch15Data = [
  { word: 'sunny', definition_en: 'Bright with sunlight.', collocation_en: 'sunny day, sunny weather', example_sentence_en: 'It is a sunny day today.', example_sentence: '今天阳光明媚。' },
  { word: 'cloudy', definition_en: 'With many clouds in the sky.', collocation_en: 'cloudy day, cloudy sky', example_sentence_en: 'It is cloudy and looks like rain.', example_sentence: '多云，看起来要下雨。' },
  { word: 'rainy', definition_en: 'With rain falling.', collocation_en: 'rainy day, rainy season', example_sentence_en: 'I do not like rainy days.', example_sentence: '我不喜欢下雨天。' },
  { word: 'windy', definition_en: 'With strong wind blowing.', collocation_en: 'windy day, very windy', example_sentence_en: 'It is too windy to play tennis.', example_sentence: '风太大，不适合打网球。' },
  { word: 'snowy', definition_en: 'With snow falling.', collocation_en: 'snowy day, snowy weather', example_sentence_en: 'The children love playing in snowy weather.', example_sentence: '孩子们喜欢在雪天玩耍。' },
  { word: 'stormy', definition_en: 'With storms and bad weather.', collocation_en: 'stormy night, stormy weather', example_sentence_en: 'It was a stormy night.', example_sentence: '那是个暴风雨之夜。' },
  { word: 'hot', definition_en: 'Having a high temperature.', collocation_en: 'very hot, hot weather', example_sentence_en: 'It is very hot today.', example_sentence: '今天很热。' },
  { word: 'cold', definition_en: 'Having a low temperature.', collocation_en: 'very cold, cold weather', example_sentence_en: 'It is cold outside.', example_sentence: '外面很冷。' },
  { word: 'warm', definition_en: 'Having a comfortable temperature.', collocation_en: 'warm day, stay warm', example_sentence_en: 'The water is warm and nice for a bath.', example_sentence: '水很暖和，适合洗澡。' },
  { word: 'cool', definition_en: 'Slightly cold; fashionable.', collocation_en: 'cool day, cool water', example_sentence_en: 'Let us go for a walk in this cool weather.', example_sentence: '在这个凉爽的天气里去散步吧。' },
  { word: 'wet', definition_en: 'Covered with liquid.', collocation_en: 'wet ground, get wet', example_sentence_en: 'Do not sit on the wet grass.', example_sentence: '别坐在湿草地上。' },
  { word: 'dry', definition_en: 'Without water; not wet.', collocation_en: 'dry weather, dry skin', example_sentence_en: 'My skin gets dry in winter.', example_sentence: '冬天我的皮肤很干燥。' },
  { word: 'spring', definition_en: 'The season between winter and summer.', collocation_en: 'in spring, early spring', example_sentence_en: 'Flowers bloom in spring.', example_sentence: '春天花开。' },
  { word: 'summer', definition_en: 'The warmest season.', collocation_en: 'in summer, summer holiday', example_sentence_en: 'I love swimming in summer.', example_sentence: '我喜欢夏天游泳。' },
  { word: 'autumn', definition_en: 'The season between summer and winter.', collocation_en: 'in autumn, late autumn', example_sentence_en: 'Leaves turn yellow in autumn.', example_sentence: '秋天叶子变黄。' },
  { word: 'winter', definition_en: 'The coldest season.', collocation_en: 'in winter, winter clothes', example_sentence_en: 'It snows a lot here in winter.', example_sentence: '这里冬天雪很多。' },
  { word: 'weather', definition_en: 'The condition of the atmosphere.', collocation_en: 'good weather, bad weather', example_sentence_en: 'The weather is nice today.', example_sentence: '今天天气很好。' },
  { word: 'temperature', definition_en: 'How hot or cold something is.', collocation_en: 'high temperature, body temperature', example_sentence_en: 'What is the temperature today?', example_sentence: '今天气温多少？' },
  { word: 'rain', definition_en: 'Water falling from clouds.', collocation_en: 'heavy rain, light rain', example_sentence_en: 'Take an umbrella; it might rain.', example_sentence: '带把伞，可能会下雨。' },
  { word: 'snow', definition_en: 'Soft white pieces of frozen water falling from sky.', collocation_en: 'heavy snow, play in snow', example_sentence_en: 'Look! It is starting to snow.', example_sentence: '看！开始下雪了。' },
  { word: 'wind', definition_en: 'Moving air.', collocation_en: 'strong wind, cold wind', example_sentence_en: 'The wind is blowing hard.', example_sentence: '风刮得很厉害。' },
  { word: 'sun', definition_en: 'The star that gives the earth light and heat.', collocation_en: 'hot sun, in the sun', example_sentence_en: 'The sun is very bright today.', example_sentence: '今天太阳很耀眼。' },
  { word: 'cloud', definition_en: 'White or grey mass in the sky.', collocation_en: 'dark cloud, white cloud', example_sentence_en: 'Look at those dark clouds.', example_sentence: '看那些乌云。' },
  { word: 'storm', definition_en: 'Extreme weather with strong wind and rain.', collocation_en: 'big storm, thunder storm', example_sentence_en: 'A storm is coming.', example_sentence: '暴风雨要来了。' },
  { word: 'fog', definition_en: 'Thick cloud near ground that makes it hard to see.', collocation_en: 'thick fog, dense fog', example_sentence_en: 'Drive carefully in the fog.', example_sentence: '雾中开车要小心。' }
]

async function updateBatch15() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}
  allWords.forEach(w => { wordToId[w.word] = w.id })

  const wordsToUpdate = batch15Data
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

  console.log(`批次15: ${wordsToUpdate.length}个单词\n`)

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
  console.log(`批次15完成: ${successCount}个\n`)
}
updateBatch15()
