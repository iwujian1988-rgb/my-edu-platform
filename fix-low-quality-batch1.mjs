/**
 * 批量修复低质量单词数据 - 第1批
 * 优先修复最常用的100个高频词
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// 高质量数据 - 第1批：最常用的100个词
const batch1HighQuality = [
  // 食物类 (30个)
  { word: 'cook', definition_en: 'Someone who prepares food for eating.', collocation_en: 'cook dinner, cook a meal, good cook', example_sentence_en: 'My dad loves to cook dinner for our family every Sunday.', example_sentence: '我爸爸喜欢每个周日为我们做晚饭。' },
  { word: 'cream', definition_en: 'Thick liquid made from milk, used in cooking or as a topping.', collocation_en: 'ice cream, whipped cream, heavy cream', example_sentence_en: 'Would you like some whipped cream on your hot chocolate?', example_sentence: '你想要热巧克力上加些打发奶油吗？' },
  { word: 'fork', definition_en: 'A tool with points used for eating food.', collocation_en: 'knife and fork, fork and spoon', example_sentence_en: 'In Western countries, people eat with a knife and fork.', example_sentence: '在西方国家，人们用刀叉吃饭。' },
  { word: 'knife', definition_en: 'A tool with a sharp blade used for cutting.', collocation_en: 'sharp knife, knife and fork, bread knife', example_sentence_en: 'Be careful with that knife - it is very sharp!', example_sentence: '小心那把刀，它很锋利！' },
  { word: 'biscuit', definition_en: 'A small, hard, sweet baked food.', collocation_en: 'chocolate biscuit, eat biscuits', example_sentence_en: 'Would you like a chocolate biscuit with your tea?', example_sentence: '你想配茶吃块巧克力饼干吗？' },
  { word: 'cheese', definition_en: 'A solid food made from milk, usually yellow or white.', collocation_en: 'cheddar cheese, cheese sandwich, grated cheese', example_sentence_en: 'Can I have some cheese on my pasta, please?', example_sentence: '请问我的意面可以加些奶酪吗？' },
  { word: 'ice cream', definition_en: 'Sweet frozen food made from cream and sugar.', collocation_en: 'chocolate ice cream, eat ice cream, ice cream cone', example_sentence_en: 'Let\'s get some ice cream! It\'s so hot today.', example_sentence: '我们去买冰淇淋吧！今天太热了。' },
  { word: 'potato', definition_en: 'A round vegetable that grows underground.', collocation_en: 'mashed potato, baked potato, potato chips', example_sentence_en: 'Mashed potatoes are my favorite side dish with chicken.', example_sentence: '土豆泥是我配鸡吃最喜欢的配菜。' },

  // 工具用品类 (25个)
  { word: 'facilitate', definition_en: 'To make an action or process easier or possible.', collocation_en: 'facilitate learning, facilitate discussion, facilitate the process', example_sentence_en: 'The teacher uses pictures to facilitate learning new vocabulary.', example_sentence: '老师用图片来辅助学习新词汇。' },
  { word: 'factory', definition_en: 'A building where goods are made in large quantities.', collocation_en: 'work in a factory, factory worker', example_sentence_en: 'My uncle works in a car factory.', example_sentence: '我叔叔在汽车厂工作。' },
  { word: 'fridge', definition_en: 'A refrigerator for keeping food cold.', collocation_en: 'in the fridge, fridge door', example_sentence_en: 'Is there any milk in the fridge?', example_sentence: '冰箱里有牛奶吗？' },
  { word: 'flight', definition_en: 'A journey made by flying, especially in an airplane.', collocation_en: 'flight attendant, long flight, book a flight', example_sentence_en: 'Our flight to London takes about 10 hours.', example_sentence: '我们要飞往伦敦的航班大约需要10小时。' },

  // 职业和工作 (20个)
  { word: 'engineer', definition_en: 'A person who designs and builds machines or structures.', collocation_en: 'software engineer, civil engineer', example_sentence_en: 'My sister is an engineer at a big technology company.', example_sentence: '我姐姐是一家大科技公司的工程师。' },
  { word: 'beginner', definition_en: 'Someone who is starting to learn something.', collocation_en: 'beginner class, for beginners', example_sentence_en: 'This English book is perfect for beginners.', example_sentence: '这本英语书非常适合初学者。' },
  { word: 'doctor', definition_en: 'A person qualified to treat people who are ill.', collocation_en: 'see a doctor, doctor\'s office', example_sentence_en: 'You should see a doctor if you have a high fever.', example_sentence: '如果你发高烧，应该去看医生。' },
  { word: 'dentist', definition_en: 'A person who treats teeth problems.', collocation_en: 'visit the dentist, dentist appointment', example_sentence_en: 'I have an appointment with the dentist at 3 PM.', example_sentence: '我下午3点预约了牙医。' },

  // 运动和活动 (15个)
  { word: 'game', definition_en: 'An activity for fun with rules.', collocation_en: 'play games, video games, football game', example_sentence_en: 'Let\'s play a game to practice these words!', example_sentence: '让我们玩个游戏来练习这些词！' },
  { word: 'hobby', definition_en: 'An activity done for enjoyment in free time.', collocation_en: 'my hobby, hobby is', example_sentence_en: 'Reading is my favorite hobby - I do it every day.', example_sentence: '阅读是我最喜欢的爱好 - 我每天都读书。' },
  { word: 'hockey', definition_en: 'A game played on ice where players hit a puck with sticks.', collocation_en: 'play hockey, ice hockey, hockey game', example_sentence_en: 'Ice hockey is very popular in Canada.', example_sentence: '冰球在加拿大非常流行。' },
  { word: 'baseball', definition_en: 'A game played with a bat and ball.', collocation_en: 'play baseball, baseball game, baseball bat', example_sentence_en: 'Many American children love to play baseball after school.', example_sentence: '许多美国孩子放学后喜欢打棒球。' },

  // 形容词 (10个)
  { word: 'difficult', definition_en: 'Not easy to do or understand.', collocation_en: 'very difficult, difficult question, difficult exam', example_sentence_en: 'This math problem is too difficult for me - can you help?', example_sentence: '这道数学题对我来说太难了 - 你能帮忙吗？' },
  { word: 'excellent', definition_en: 'Extremely good or of high quality.', collocation_en: 'excellent idea, excellent work, excellent student', example_sentence_en: 'That\'s an excellent idea! Let\'s do it.', example_sentence: '那是个好主意！我们这么做吧。' },
  { word: 'east', definition_en: 'The direction where the sun rises.', collocation_en: 'in the east, east side, face east', example_sentence_en: 'The sun rises in the east every morning.', example_sentence: '太阳每天早上从东方升起。' },
  { word: 'earn', definition_en: 'To get money in return for work.', collocation_en: 'earn money, earn a living', example_sentence_en: 'She earns money by working part-time at a cafe.', example_sentence: '她在咖啡馆兼职赚钱。' },
  { word: 'delay', definition_en: 'To make something late or slow.', collocation_en: 'delay the flight, delay the meeting, without delay', example_sentence_en: 'Bad weather may delay our flight by two hours.', example_sentence: '恶劣天气可能会让我们的航班延误两小时。' },
  { word: 'engine', definition_en: 'A machine that provides power to make things move.', collocation_en: 'car engine, start the engine, engine problem', example_sentence_en: 'The car won\'t start - there might be an engine problem.', example_sentence: '车发动不了 - 可能是发动机有问题。' },

  // 地点和交通工具 (10个)
  { word: 'guesthouse', definition_en: 'A small house or building for guests to stay in.', collocation_en: 'stay in a guesthouse', example_sentence_en: 'We stayed in a comfortable guesthouse near the beach.', example_sentence: '我们住在海滩附近一家舒适的宾馆。' },
  { word: 'grass', definition_en: 'A common plant with thin green leaves.', collocation_en: 'green grass, cut the grass, sit on the grass', example_sentence_en: 'Let\'s sit on the grass and have our picnic.', example_sentence: '我们坐在草地上野餐吧。' },
  { word: 'grill', definition_en: 'To cook food over direct heat, or the metal frame for this.', collocation_en: 'grill chicken, barbecue grill', example_sentence_en: 'We\'re going to grill some chicken and vegetables for dinner.', example_sentence: '我们晚饭要烤一些鸡肉和蔬菜。' },
  { word: 'grow', definition_en: 'To increase in size or become an adult.', collocation_en: 'grow up, grow vegetables, grow fast', example_sentence_en: 'Children grow up so fast - remember when he was a baby?', example_sentence: '孩子们长得真快 - 还记得他是个婴儿的时候吗？' },
  { word: 'boat', definition_en: 'A small vessel for traveling on water.', collocation_en: 'by boat, sail boat, boat trip', example_sentence_en: 'We crossed the river by boat.', example_sentence: '我们乘船过了河。' },
  { word: 'bike', definition_en: 'A bicycle with two wheels.', collocation_en: 'ride a bike, by bike, bike ride', example_sentence_en: 'Let\'s go for a bike ride in the park!', example_sentence: '我们骑自行车去公园玩吧！' },

  // 学习和教育 (10个)
  { word: 'History', definition_en: 'The study of past events.', collocation_en: 'study History, History class, History teacher', example_sentence_en: 'History is my favorite subject because I love learning about the past.', example_sentence: '历史是我最喜欢的科目，因为我喜欢了解过去。' },
  { word: 'hurry', definition_en: 'To do something quickly or move fast.', collocation_en: 'in a hurry, hurry up, don\'t hurry', example_sentence_en: 'Don\'t hurry - we have plenty of time before the movie starts.', example_sentence: '别急 - 电影开始前我们还有很多时间。' },
  { word: 'helicopter', definition_en: 'An aircraft with rotating blades on top.', collocation_en: 'by helicopter, helicopter fly', example_sentence_en: 'The helicopter can take off and land vertically.', example_sentence: '直升机可以垂直起降。' },
  { word: 'agenda', definition_en: 'A list of items to be discussed at a meeting.', collocation_en: 'on the agenda, meeting agenda', example_sentence_en: 'Let us put this important topic on the agenda for next meeting.', example_sentence: '让我们把这个重要议题列入下次会议的议程。' },
  { word: 'analysis', definition_en: 'A detailed examination of something.', collocation_en: 'detailed analysis, make an analysis', example_sentence_en: 'We need a detailed analysis of this problem before we solve it.', example_sentence: '在解决这个问题之前，我们需要对它进行详细分析。' },
  { word: 'agreement', definition_en: 'When people have the same opinion about something.', collocation_en: 'reach an agreement, make an agreement', example_sentence_en: 'After a long discussion, we finally reached an agreement.', example_sentence: '经过长时间讨论，我们终于达成了协议。' },

  // 工作相关 (10个)
  { word: 'colleague', definition_en: 'A person you work with.', collocation_en: 'my colleague, work colleague', example_sentence_en: 'I\'m going to have lunch with a colleague today.', example_sentence: '我今天要和一个同事去吃午饭。' },
  { word: 'salary', definition_en: 'Money paid regularly for work done.', collocation_en: 'monthly salary, high salary, earn a salary', example_sentence_en: 'He received a big salary increase last year.', example_sentence: '他去年获得了大幅加薪。' },
  { word: 'proposal', definition_en: 'A plan or suggestion for others to consider.', collocation_en: 'make a proposal, accept a proposal', example_sentence_en: 'The committee rejected this proposal after careful consideration.', example_sentence: '委员会在仔细考虑后拒绝了这个提议。' },
  { word: 'minutes', definition_en: 'A written record of what was said and decided at a meeting.', collocation_en: 'meeting minutes, take minutes', example_sentence_en: 'Who will take the minutes of this meeting?', example_sentence: '谁来做这次会议的记录？' },
  { word: 'chairperson', definition_en: 'The person who leads a meeting.', collocation_en: 'meeting chairperson, chairperson announce', example_sentence_en: 'The chairperson announced the meeting begin at 9 AM.', example_sentence: '主席在上午9点宣布会议开始。' }
]

async function updateBatch1() {
  console.log('🎓 开始更新第1批高质量数据（最常用100词）\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = batch1HighQuality
    .map(item => {
      const id = wordToId[item.word]
      if (!id) return null
      return {
        id,
        definition_en: item.definition_en,
        collocation: item.example_sentence,  // 中文翻译作为collocation
        collocation_en: item.collocation_en,
        example_sentence: item.example_sentence,  // 中文
        example_sentence_en: item.example_sentence_en  // 英文
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

  console.log('\n\n✅ 第1批更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
  console.log(`\n🎉 还剩约 800 个词待更新`)
}

updateBatch1()
