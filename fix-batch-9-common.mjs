/**
 * 批次9：常见单词（30个）
 * agenda, conference, library, table tennis, jam, tent, watch,
 * riding, throw, trainer, zoo, team, instructions, race, luck,
 * university, village, tired, lemon, volleyball, marketing, north,
 * tonight, traffic, flight, visitor, police car, tourist, remember, waiter
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 批次9：常见单词高质量数据
const batch9Data = [
  { word: 'agenda', definition_en: 'A list of items to be discussed at a meeting.', collocation_en: 'meeting agenda, agenda item', example_sentence_en: 'What is the first item on the agenda today?', example_sentence: '今天议程的第一项是什么？' },
  { word: 'conference', definition_en: 'A large formal meeting where people discuss ideas or work.', collocation_en: 'attend conference, press conference', example_sentence_en: 'She is presenting at the international conference next week.', example_sentence: '她下周将在国际会议上发言。' },
  { word: 'library', definition_en: 'A place where books are kept for people to read or borrow.', collocation_en: 'public library, library book', example_sentence_en: 'I spent the whole afternoon studying at the library.', example_sentence: '我整个下午都在图书馆学习。' },
  { word: 'table tennis', definition_en: 'An indoor game played with small bats and a light ball on a table.', collocation_en: 'play table tennis, table tennis match', example_sentence_en: 'Let us play table tennis during the break.', example_sentence: '我们休息时间打乒乓球吧。' },
  { word: 'jam', definition_en: 'A sweet spread made from fruit and sugar.', collocation_en: 'strawberry jam, toast with jam', example_sentence_en: 'Would you like some jam on your toast?', example_sentence: '你的吐司要加点果酱吗？' },
  { word: 'tent', definition_en: 'A shelter made of canvas or nylon, used for camping.', collocation_en: 'put up a tent, camping tent', example_sentence_en: 'We set up our tent near the lake.', example_sentence: '我们在湖边搭起了帐篷。' },
  { word: 'watch', definition_en: 'A small clock worn on the wrist or carried in a pocket.', collocation_en: 'wear a watch, wrist watch', example_sentence_en: 'I forgot to wear my watch today.', example_sentence: '我今天忘了戴手表。' },
  { word: 'riding', definition_en: 'The activity of traveling on a horse or bicycle.', collocation_en: 'go riding, horse riding', example_sentence_en: 'She goes horse riding every weekend.', example_sentence: '她每个周末都去骑马。' },
  { word: 'throw', definition_en: 'To send something through the air with force.', collocation_en: 'throw away, throw ball', example_sentence_en: 'Can you throw the ball to me?', example_sentence: '你能把球扔给我吗？' },
  { word: 'trainer', definition_en: 'A person who teaches people how to do sports or fitness.', collocation_en: 'personal trainer, dog trainer', example_sentence_en: 'My trainer helps me improve my running technique.', example_sentence: '我的教练帮我改进跑步技巧。' },
  { word: 'zoo', definition_en: 'A place where live animals are kept for people to see.', collocation_en: 'visit zoo, zoo animal', example_sentence_en: 'The children were excited to see the lions at the zoo.', example_sentence: '孩子们在动物园看到狮子很兴奋。' },
  { word: 'team', definition_en: 'A group of people who work or play together.', collocation_en: 'team member, team work', example_sentence_en: 'Our team won the championship this year.', example_sentence: '我们队今年赢得了冠军。' },
  { word: 'instructions', definition_en: 'Directions or information about how to do something.', collocation_en: 'follow instructions, read instructions', example_sentence_en: 'Please read the instructions carefully before using.', example_sentence: '使用前请仔细阅读说明。' },
  { word: 'race', definition_en: 'A competition to see who is the fastest.', collocation_en: 'run a race, car race', example_sentence_en: 'Who won the 100-meter race?', example_sentence: '谁赢了百米赛跑？' },
  { word: 'luck', definition_en: 'The force that causes good or bad things to happen.', collocation_en: 'good luck, wish luck', example_sentence_en: 'Good luck on your exam tomorrow!', example_sentence: '祝你明天考试好运！' },
  { word: 'university', definition_en: 'A place where people study for degrees.', collocation_en: 'go to university, university student', example_sentence_en: 'She is studying medicine at university.', example_sentence: '她在大学学医。' },
  { word: 'village', definition_en: 'A very small town in the countryside.', collocation_en: 'small village, village life', example_sentence_en: 'My grandparents live in a quiet village.', example_sentence: '我的祖父母住在一个安静的村庄里。' },
  { word: 'tired', definition_en: 'Feeling that you need to rest or sleep.', collocation_en: 'get tired, feel tired', example_sentence_en: 'I am so tired after the long journey.', example_sentence: '长途旅行后我太累了。' },
  { word: 'lemon', definition_en: 'A yellow citrus fruit with sour juice.', collocation_en: 'lemon juice, lemon tree', example_sentence_en: 'Would you like some lemon in your tea?', example_sentence: '你的茶里要加点柠檬吗？' },
  { word: 'volleyball', definition_en: 'A game played by hitting a large ball over a net.', collocation_en: 'play volleyball, volleyball team', example_sentence_en: 'We play volleyball on the beach every summer.', example_sentence: '我们每年夏天都在沙滩上打排球。' },
  { word: 'marketing', definition_en: 'The business of advertising and selling products.', collocation_en: 'marketing strategy, digital marketing', example_sentence_en: 'The company is investing more in online marketing.', example_sentence: '公司正在增加在线营销的投入。' },
  { word: 'north', definition_en: 'The direction that is on the left of a map.', collocation_en: 'face north, north wind', example_sentence_en: 'Which direction is north?', example_sentence: '哪个方向是北？' },
  { word: 'tonight', definition_en: 'During the night of this day.', collocation_en: 'see tonight, tonight show', example_sentence_en: 'Are you free tonight for dinner?', example_sentence: '你今晚有空吃晚饭吗？' },
  { word: 'traffic', definition_en: 'All the vehicles traveling on a road.', collocation_en: 'heavy traffic, traffic jam', example_sentence_en: 'There is always heavy traffic during rush hour.', example_sentence: '高峰时段总是交通拥堵。' },
  { word: 'flight', definition_en: 'A journey made by flying, especially in an airplane.', collocation_en: 'book flight, flight attendant', example_sentence_en: 'Our flight was delayed due to bad weather.', example_sentence: '我们的航班因天气恶劣延误了。' },
  { word: 'visitor', definition_en: 'A person who visits a place or person.', collocation_en: 'welcome visitor, hospital visitor', example_sentence_en: 'The museum receives thousands of visitors every day.', example_sentence: '博物馆每天接待数千名游客。' },
  { word: 'police car', definition_en: 'A car used by police officers.', collocation_en: 'police car siren, police car chase', example_sentence_en: 'The police car rushed to the scene of the accident.', example_sentence: '警车赶往事故现场。' },
  { word: 'tourist', definition_en: 'A person who is traveling for pleasure.', collocation_en: 'foreign tourist, tourist attraction', example_sentence_en: 'Many tourists visit the city in summer.', example_sentence: '许多游客在夏天来这个城市。' },
  { word: 'remember', definition_en: 'To keep something in your memory.', collocation_en: 'remember to do, remember well', example_sentence_en: 'Please remember to lock the door when you leave.', example_sentence: '离开时请记得锁门。' },
  { word: 'waiter', definition_en: 'A man who serves food and drinks in a restaurant.', collocation_en: 'restaurant waiter, call waiter', example_sentence_en: 'The waiter brought us the menu immediately.', example_sentence: '服务员立刻给我们拿来了菜单。' }
]

async function updateBatch9() {
  console.log('🎓 开始更新批次9：常见单词（30个）\n')

  // 获取所有单词ID
  const { data: allWords } = await supabase
    .from('words')
    .select('id, word')

  const wordToId = {}
  allWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = batch9Data
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

  console.log('\n\n✅ 批次9更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateBatch9()
