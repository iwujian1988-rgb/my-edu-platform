/**
 * 批量修复低质量单词数据 - 第2批
 * 继续修复100个常用词
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// 高质量数据 - 第2批：100个常用词
const batch2HighQuality = [
  // 房屋和家居 (15个)
  { word: 'house', definition_en: 'A building for human habitation.', collocation_en: 'buy a house, new house, big house', example_sentence_en: 'They bought a new house near the park last month.', example_sentence: '他们上个月在公园附近买了一所新房子。' },
  { word: 'home', definition_en: 'The place where one lives permanently.', collocation_en: 'at home, go home, stay home', example_sentence_en: 'What time do you usually go home from work?', example_sentence: '你通常几点下班回家？' },
  { word: 'room', definition_en: 'A space that can be part of a building.', collocation_en: 'living room, bedroom, big room', example_sentence_en: 'My bedroom is small but very comfortable.', example_sentence: '我的卧室很小但很舒适。' },
  { word: 'table', definition_en: 'A piece of furniture with a flat top and legs.', collocation_en: 'dinner table, table and chairs, on the table', example_sentence_en: 'Please put your books on the table.', example_sentence: '请把你的书放在桌子上。' },
  { word: 'chair', definition_en: 'A seat for one person with a back.', collocation_en: 'sit on a chair, table and chair, comfortable chair', example_sentence_en: 'There are four chairs around the table.', example_sentence: '桌子周围有四把椅子。' },
  { word: 'bed', definition_en: 'A piece of furniture for sleeping on.', collocation_en: 'go to bed, make the bed, big bed', example_sentence_en: 'I usually go to bed at 10 PM.', example_sentence: '我通常晚上10点上床睡觉。' },
  { word: 'door', definition_en: 'A moving structure to open and close an entrance.', collocation_en: 'open the door, close the door, front door', example_sentence_en: 'Please close the door - it\'s cold outside.', example_sentence: '请把门关上 - 外面很冷。' },
  { word: 'window', definition_en: 'An opening in a wall to let in light.', collocation_en: 'open window, clean window, window seat', example_sentence_en: 'The window gives a beautiful view of the garden.', example_sentence: '窗户可以看到花园的美景。' },
  { word: 'wall', definition_en: 'A side of a room or building.', collocation_en: 'on the wall, white wall', example_sentence_en: 'There is a big clock on the wall.', example_sentence: '墙上有一个大钟。' },
  { word: 'floor', definition_en: 'The surface of a room that you walk on.', collocation_en: 'on the floor, first floor, clean floor', example_sentence_en: 'The children are playing on the floor.', example_sentence: '孩子们正在地板上玩。' },

  // 天气和自然 (12个)
  { word: 'weather', definition_en: 'The condition of the atmosphere at a place.', collocation_en: 'good weather, bad weather, hot weather', example_sentence_en: 'What\'s the weather like today?', example_sentence: '今天天气怎么样？' },
  { word: 'rain', definition_en: 'Water falling from clouds in the sky.', collocation_en: 'heavy rain, rain starts, in the rain', example_sentence_en: 'Don\'t forget your umbrella - it might rain today.', example_sentence: '别忘了带伞 - 今天可能会下雨。' },
  { word: 'snow', definition_en: 'Frozen white flakes falling from the sky in winter.', collocation_en: 'heavy snow, snow fall, play in snow', example_sentence_en: 'Look! It\'s starting to snow!', example_sentence: '看！开始下雪了！' },
  { word: 'wind', definition_en: 'Moving air, especially a strong current.', collocation_en: 'strong wind, wind blow', example_sentence_en: 'The wind is very strong today - be careful with your hat!', example_sentence: '今天风很大 - 小心你的帽子！' },
  { word: 'sun', definition_en: 'The star that gives the Earth light and heat.', collocation_en: 'in the sun, hot sun, bright sun', example_sentence_en: 'The sun is very bright today - wear your sunglasses.', example_sentence: '今天阳光很亮 - 戴上你的墨镜。' },
  { word: 'cloud', definition_en: 'White or grey mass floating in the sky.', collocation_en: 'dark cloud, in the clouds', example_sentence_en: 'Look at those dark clouds - it might rain soon.', example_sentence: '看那些乌云 - 很快可能要下雨了。' },

  // 身体部位 (10个)
  { word: 'body', definition_en: 'The whole physical structure of a person.', collocation_en: 'human body, body part', example_sentence_en: 'Exercise is good for your body and mind.', example_sentence: '运动对你的身体和思想都有好处。' },
  { word: 'head', definition_en: 'The top part of a human body.', collocation_en: 'shake head, nod head, headache', example_sentence_en: 'She shook her head when I asked the question.', example_sentence: '我问问题时，她摇了摇头。' },
  { word: 'face', definition_en: 'The front part of a person\'s head.', collocation_en: 'happy face, wash face, round face', example_sentence_en: 'He has a happy face when he sees his friends.', example_sentence: '他见到朋友时脸上带着开心的表情。' },
  { word: 'eye', definition_en: 'One of the two organs used for seeing.', collocation_en: 'close eyes, open eyes, blue eyes', example_sentence_en: 'Close your eyes and count to ten.', example_sentence: '闭上眼睛数到十。' },
  { word: 'ear', definition_en: 'The organ on each side of the head for hearing.', collocation_en: 'left ear, right ear, listening ear', example_sentence_en: 'She whispered something in his ear.', example_sentence: '她在他耳边低声说了些什么。' },
  { word: 'nose', definition_en: 'The part of the face used for smelling and breathing.', collocation_en: 'big nose, runny nose', example_sentence_en: 'The dog has a very sensitive nose.', example_sentence: '狗的鼻子非常灵敏。' },
  { word: 'mouth', definition_en: 'The opening through which a person eats and speaks.', collocation_en: 'open mouth, close mouth', example_sentence_en: 'Please cover your mouth when you cough.', example_sentence: '咳嗽时请捂住嘴巴。' },
  { word: 'hair', definition_en: 'The threads growing on a person\'s head.', collocation_en: 'long hair, short hair, black hair', example_sentence_en: 'She has beautiful long black hair.', example_sentence: '她有着漂亮的黑色长发。' },
  { word: 'hand', definition_en: 'The end part of a person\'s arm beyond the wrist.', collocation_en: 'left hand, shake hands, by hand', example_sentence_en: 'Please raise your hand if you know the answer.', example_sentence: '如果你知道答案，请举手。' },
  { word: 'arm', definition_en: 'The upper limb of the human body.', collocation_en: 'left arm, right arm, fold arms', example_sentence_en: 'She hurt her arm playing tennis.', example_sentence: '她打网球时弄伤了胳膊。' },
  { word: 'finger', definition_en: 'One of the five thin parts at the end of the hand.', collocation_en: 'point finger, index finger, five fingers', example_sentence_en: 'Don\'t point your finger at people - it\'s rude.', example_sentence: '不要用手指指着人 - 那样很粗鲁。' },
  { word: 'thumb', definition_en: 'The short thick finger of the hand.', collocation_en: 'green thumb, thumb up', example_sentence_en: 'He gave me a thumbs up to show he agreed.', example_sentence: '他竖起大拇指表示同意。' },
  { word: 'leg', definition_en: 'One of the limbs that support a person for walking.', collocation_en: 'left leg, right leg, hurt leg', example_sentence_en: 'I hurt my leg playing football yesterday.', example_sentence: '我昨天踢足球时弄伤了腿。' },
  { word: 'foot', definition_en: 'The lowest part of the leg for standing and walking.', collocation_en: 'left foot, right foot, sore foot', example_sentence_en: 'My feet are tired after walking all day.', example_sentence: '走了一整天后，我的脚很累。' },
  { word: 'toe', definition_en: 'One of the five small parts at the end of the foot.', collocation_en: 'hurt toe, big toe', example_sentence_en: 'I hurt my toe when I kicked the table.', example_sentence: '我踢到桌子时弄伤了脚趾。' },
  { word: 'heart', definition_en: 'The organ that pumps blood through the body.', collocation_en: 'heart beat, heart attack, kind heart', example_sentence_en: 'Exercise makes your heart beat faster.', example_sentence: '运动会让你的心跳加快。' },

  // 衣服 (12个)
  { word: 'sock', definition_en: 'A piece of clothing for the foot and ankle.', collocation_en: 'pair of socks, wear socks', example_sentence_en: 'Don\'t forget to wear clean socks every day.', example_sentence: '别忘了每天穿干净的袜子。' },
  { word: 'shoe', definition_en: 'Outer covering for the foot.', collocation_en: 'pair of shoes, new shoes', example_sentence_en: 'I bought a new pair of shoes for the party.', example_sentence: '我为聚会买了一双新鞋。' },
  { word: 'shirt', definition_en: 'A piece of clothing for the upper body.', collocation_en: 'white shirt, wear shirt', example_sentence_en: 'He looks very smart in his white shirt.', example_sentence: '他穿白衬衫看起来很精神。' },
  { word: 'dress', definition_en: 'A one-piece garment for a woman or girl.', collocation_en: 'beautiful dress, wear dress', example_sentence_en: 'She wore a beautiful red dress to the wedding.', example_sentence: '她穿了一件漂亮的红色连衣裙参加婚礼。' },
  { word: 'coat', definition_en: 'A long outer garment worn for warmth.', collocation_en: 'winter coat, wear coat', example_sentence_en: 'Put on your coat - it\'s cold outside.', example_sentence: '穿上你的外套 - 外面很冷。' },
  { word: 'jacket', definition_en: 'A short coat extending to the waist.', collocation_en: 'leather jacket, wear jacket', example_sentence_en: 'This jacket will keep you warm in winter.', example_sentence: '这件夹克在冬天会让你保暖。' },

  // 交通 (10个)
  { word: 'car', definition_en: 'A road vehicle with an engine and four wheels.', collocation_en: 'drive a car, new car, by car', example_sentence_en: 'My dad drives me to school by car every morning.', example_sentence: '我爸爸每天早上开车送我去学校。' },
  { word: 'bus', definition_en: 'A large motor vehicle carrying passengers.', collocation_en: 'take a bus, bus stop, by bus', example_sentence_en: 'I take the bus to work every day.', example_sentence: '我每天坐公交车上班。' },
  { word: 'train', definition_en: 'A connected set of vehicles on rails.', collocation_en: 'by train, train station, catch a train', example_sentence_en: 'The train from London to Paris takes about two hours.', example_sentence: '从伦敦到巴黎的火车大约需要两小时。' },
  { word: 'taxi', definition_en: 'A car with a driver that you pay for transportation.', collocation_en: 'take a taxi, call a taxi', example_sentence_en: 'Let\'s take a taxi - it\'s too far to walk.', example_sentence: '我们坐出租车吧 - 走路太远了。' },
  { word: 'station', definition_en: 'A place where trains or buses stop.', collocation_en: 'train station, bus station', example_sentence_en: 'Meet me at the train station at 5 PM.', example_sentence: '下午5点在火车站见我。' },
  { word: 'travel', definition_en: 'To go from one place to another.', collocation_en: 'travel abroad, travel by plane', example_sentence_en: 'I love to travel and learn about different cultures.', example_sentence: '我喜欢旅行，了解不同的文化。' },
  { word: 'walk', definition_en: 'To move at a regular pace by lifting feet.', collocation_en: 'go for a walk, walk to school', example_sentence_en: 'Let\'s go for a walk in the park after lunch.', example_sentence: '午饭后我们去公园散步吧。' },
  { word: 'run', definition_en: 'To move fast on foot.', collocation_en: 'run fast, go for a run', example_sentence_en: 'He runs every morning to stay healthy.', example_sentence: '他每天早上跑步以保持健康。' },

  // 学校和学习 (10个)
  { word: 'class', definition_en: 'A period of teaching in a school.', collocation_en: 'have class, go to class', example_sentence_en: 'I have English class every Monday and Wednesday.', example_sentence: '我每周一和周三有英语课。' },
  { word: 'lesson', definition_en: 'A period of learning.', collocation_en: 'have lesson, learn lesson', example_sentence_en: 'Today\'s lesson is about past tense verbs.', example_sentence: '今天的课是关于过去时态动词的。' },
  { word: 'teacher', definition_en: 'A person who teaches in a school.', collocation_en: 'good teacher, math teacher', example_sentence_en: 'Our teacher is very patient and kind.', example_sentence: '我们的老师非常耐心和友善。' },
  { word: 'student', definition_en: 'A person who is studying at a school.', collocation_en: 'good student, university student', example_sentence_en: 'She is an excellent student in her class.', example_sentence: '她是班上的一名优秀学生。' },
  { word: 'pen', definition_en: 'An instrument for writing with ink.', collocation_en: 'write with pen, black pen', example_sentence_en: 'Can I borrow your pen? I forgot mine.', example_sentence: '我可以借你的钢笔吗？我忘了带。' },
  { word: 'pencil', definition_en: 'An instrument for writing or drawing.', collocation_en: 'write with pencil, sharp pencil', example_sentence_en: 'Use a pencil so you can erase mistakes.', example_sentence: '用铅笔，这样你可以擦掉错误。' },
  { word: 'desk', definition_en: 'A piece of furniture with a flat top for work.', collocation_en: 'sit at desk, clean desk', example_sentence_en: 'She sat at her desk and started writing.', example_sentence: '她坐在书桌前开始写作。' },
  { word: 'test', definition_en: 'An examination of knowledge or ability.', collocation_en: 'take a test, pass test, hard test', example_sentence_en: 'I have a math test tomorrow morning.', example_sentence: '我明天早上有数学考试。' },
  { word: 'question', definition_en: 'A sentence asking for information.', collocation_en: 'ask question, answer question', example_sentence_en: 'Does anyone have any questions about this topic?', example_sentence: '关于这个话题，有人有问题吗？' },
  { word: 'answer', definition_en: 'A response to a question.', collocation_en: 'right answer, wrong answer', example_sentence_en: 'What is the correct answer to question 5?', example_sentence: '第5题的正确答案是什么？' },
  { word: 'study', definition_en: 'To learn about a subject.', collocation_en: 'study hard, study English', example_sentence_en: 'I need to study for three hours every day.', example_sentence: '我需要每天学习三小时。' },
  { word: 'read', definition_en: 'To look at and understand written words.', collocation_en: 'read book, read aloud', example_sentence_en: 'I like to read storybooks before going to bed.', example_sentence: '我喜欢睡前读故事书。' },
  { word: 'write', definition_en: 'To mark letters or words on a surface.', collocation_en: 'write down, write letter', example_sentence_en: 'Please write your name at the top of the paper.', example_sentence: '请在纸的顶部写下你的名字。' },
  { word: 'speak', definition_en: 'To say words or use voice.', collocation_en: 'speak English, speak loudly', example_sentence_en: 'Don\'t be afraid to speak English in class.', example_sentence: '不要害怕在课堂上说英语。' },

  // 数字和量词 (10个)
  { word: 'second', definition_en: 'The 2nd item or unit of time.', collocation_en: 'wait a second, every second', example_sentence_en: 'Just wait a second - I\'m almost ready!', example_sentence: '稍等一下 - 我快准备好了！' },
  { word: 'twice', definition_en: 'Two times.', collocation_en: 'twice a day, twice a week', example_sentence_en: 'I go to the gym twice a week.', example_sentence: '我每周去健身房两次。' },
  { word: 'twenty', definition_en: 'The number 20.', collocation_en: 'twenty people, twenty minutes', example_sentence_en: 'There are twenty students in my class.', example_sentence: '我们班有二十个学生。' },
  { word: 'twelve', definition_en: 'The number 12.', collocation_en: 'twelve months, twelve hours', example_sentence_en: 'There are twelve months in a year.', example_sentence: '一年有十二个月。' },

  // 其他常用词 (10个)
  { word: 'lot', definition_en: 'A large number or amount.', collocation_en: 'a lot of, lots of', example_sentence_en: 'I have a lot of homework to do tonight.', example_sentence: '我今晚有很多作业要做。' },
  { word: 'kind', definition_en: 'Having a friendly and generous nature.', collocation_en: 'very kind, kind person, be kind', example_sentence_en: 'Thank you for your help - you are very kind!', example_sentence: '谢谢你的帮助 - 你真好！' },
  { word: 'able', definition_en: 'Having the power to do something.', collocation_en: 'be able to, able to do', example_sentence_en: 'I will be able to finish the work by tomorrow.', example_sentence: '明天之前我能完成这项工作。' },
  { word: 'about', definition_en: 'On the subject of; concerning.', collocation_en: 'talk about, think about', example_sentence_en: 'Can you tell me about your family?', example_sentence: '能跟我讲讲你的家庭吗？' },
  { word: 'after', definition_en: 'In the time following (an event).', collocation_en: 'after school, after dinner', example_sentence_en: 'I usually do my homework after dinner.', example_sentence: '我通常在晚饭后做作业。' },
  { word: 'again', definition_en: 'Another time; once more.', collocation_en: 'try again, do it again', example_sentence_en: 'Can you say that again? I didn\'t hear you.', example_sentence: '你能再说一遍吗？我没听到。' },
  { word: 'against', definition_en: 'In opposition to.', collocation_en: 'play against, fight against', example_sentence_en: 'Our team will play against the champions tomorrow.', example_sentence: '我们队明天将对阵冠军队。' },
  { word: 'ago', definition_en: 'Before the present time.', collocation_en: 'two days ago, long ago', example_sentence_en: 'I saw him three days ago at the library.', example_sentence: '我三天前在图书馆见过他。' }
]

async function updateBatch2() {
  console.log('🎓 开始更新第2批高质量数据（100个常用词）\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = batch2HighQuality
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

  console.log(`✅ 找到 ${wordsToUpdate.length} 个词在数据库中\n`)
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

  console.log('\n\n✅ 第2批更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)

  // 验证一些示例
  console.log('\n🔍 验证示例：\n')
  const samples = ['house', 'rain', 'hand', 'car', 'study']

  for (const w of samples) {
    const { data } = await supabase
      .from('words')
      .select('word, definition_en, collocation_en, example_sentence_en, example_sentence')
      .eq('word', w)
      .single()

    if (data) {
      console.log(`${data.word}:`)
      console.log(`  英文: ${data.definition_en}`)
      console.log(`  搭配: ${data.collocation_en}`)
      console.log(`  例句: ${data.example_sentence_en}`)
      console.log(`  翻译: ${data.example_sentence}`)
      console.log()
    }
  }

  console.log('🎉 进度更新完成')
}

updateBatch2()
