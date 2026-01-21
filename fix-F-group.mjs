/**
 * 批量修复F组词汇（79个）
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// F组高质量数据
const fGroupData = [
  { word: 'factory', definition_en: 'A building where goods are made in large quantities.', collocation_en: 'work in factory, car factory', example_sentence_en: 'My father works in a car factory.', example_sentence: '我父亲在汽车厂工作。' },
  { word: 'fridge', definition_en: 'A refrigerator for keeping food cold.', collocation_en: 'in the fridge, fridge door', example_sentence_en: 'Is there any milk in the fridge?', example_sentence: '冰箱里有牛奶吗？' },
  { word: 'flight', definition_en: 'A journey made by flying, especially in an airplane.', collocation_en: 'long flight, flight attendant', example_sentence_en: 'Our flight to London takes 10 hours.', example_sentence: '我们要飞往伦敦的航班需要10小时。' },
  { word: 'fog', definition_en: 'Thick cloud near the ground that makes it hard to see.', collocation_en: 'heavy fog, thick fog', example_sentence_en: 'The fog was so thick I couldn\'t see the road.', example_sentence: '雾太浓了，我看不清路。' },
  { word: 'field', definition_en: 'An area of open land, especially used for farming.', collocation_en: 'football field, rice field', example_sentence_en: 'The children are playing in the field.', example_sentence: '孩子们在田野里玩。' },
  { word: 'forest', definition_en: 'A large area covered with trees.', collocation_en: 'in the forest, rain forest', example_sentence_en: 'Many animals live in the forest.', example_sentence: '许多动物住在森林里。' },
  { word: 'foggy', definition_en: 'With fog; hard to see through.', collocation_en: 'foggy day, foggy weather', example_sentence_en: 'It\'s too foggy to drive safely.', example_sentence: '雾太大了，无法安全驾驶。' },
  { word: 'fire', definition_en: 'Flames that burn and give heat and light.', collocation_en: 'catch fire, on fire', example_sentence_en: 'Don\'t play with fire - it\'s dangerous!', example_sentence: '不要玩火 - 危险！' },
  { word: 'fried', definition_en: 'Cooked in hot oil.', collocation_en: 'fried egg, fried chicken', example_sentence_en: 'I love fried chicken with French fries.', example_sentence: '我喜欢炸鸡配薯条。' },
  { word: 'fail', definition_en: 'To not succeed in something.', collocation_en: 'fail exam, fail to do', example_sentence_en: 'Don\'t worry if you fail - try again!', example_sentence: '即使失败了也别担心 - 再试一次！' },
  { word: 'farm', definition_en: 'Land used for growing crops and raising animals.', collocation_en: 'work on farm, farm animals', example_sentence_en: 'My grandparents live on a farm.', example_sentence: '我祖父母住在农场。' },
  { word: 'family', definition_en: 'A group of people related to each other.', collocation_en: 'big family, family member', example_sentence_en: 'I love spending time with my family.', example_sentence: '我喜欢和家人一起度过时光。' },
  { word: 'fall', definition_en: 'To move down towards the ground.', collocation_en: 'fall down, fall asleep', example_sentence_en: 'Leaves fall from trees in autumn.', example_sentence: '秋天树叶从树上落下。' },
  { word: 'famous', definition_en: 'Known about by many people.', collocation_en: 'very famous, famous person', example_sentence_en: 'The Great Wall is famous all over the world.', example_sentence: '长城闻名于世。' },
  { word: 'flat', definition_en: 'Level and smooth; or an apartment.', collocation_en: 'very flat, flat surface', example_sentence_en: 'The land here is very flat.', example_sentence: '这里的土地很平坦。' },
  { word: 'flower', definition_en: 'The colored part of a plant.', collocation_en: 'beautiful flower, red flower', example_sentence_en: 'The flowers in the garden are blooming.', example_sentence: '花园里的花正在盛开。' },
  { word: 'football', definition_en: 'A game played with a round ball.', collocation_en: 'play football, football match', example_sentence_en: 'We play football every weekend.', example_sentence: '我们每个周末踢足球。' },
  { word: 'feel', definition_en: 'To experience a physical or emotional sensation.', collocation_en: 'feel happy, feel tired', example_sentence_en: 'I feel very happy today!', example_sentence: '我今天很开心！' },
  { word: 'father', definition_en: 'A male parent.', collocation_en: 'my father, like father', example_sentence_en: 'My father is a doctor.', example_sentence: '我父亲是医生。' },
  { word: 'friend', definition_en: 'A person you like and trust.', collocation_en: 'best friend, good friend', example_sentence_en: 'She is my best friend at school.', example_sentence: '她是我学校里最好的朋友。' },
  { word: 'finance', definition_en: 'The management of money.', collocation_en: 'study finance, finance department', example_sentence_en: 'He works in finance at a bank.', example_sentence: '他在银行做财务工作。' },
  { word: 'furniture', definition_en: 'Movable items in a room like tables and chairs.', collocation_en: 'office furniture, wooden furniture', example_sentence_en: 'We need to buy new furniture for the living room.', example_sentence: '我们需要为客厅买新家具。' },
  { word: 'floor', definition_en: 'The surface of a room that you walk on.', collocation_en: 'first floor, on the floor', example_sentence_en: 'Please sit on the floor.', example_sentence: '请坐在地板上。' },
  { word: 'form', definition_en: 'A document with blank spaces to fill in; or shape.', collocation_en: 'fill form, take form', example_sentence_en: 'Please fill out this form with your information.', example_sentence: '请在这张表上填入你的信息。' },
  { word: 'face', definition_en: 'The front part of a person\'s head.', collocation_en: 'happy face, wash face', example_sentence_en: 'She has a smiling face.', example_sentence: '她带着笑脸。' },
  { word: 'fact', definition_en: 'Something that is known to be true.', collocation_en: 'in fact, real fact', example_sentence_en: 'It\'s a fact that the earth goes around the sun.', example_sentence: '地球绕着太阳转是个事实。' },
  { word: 'factor', definition_en: 'A fact or situation that influences something.', collocation_en: 'important factor, key factor', example_sentence_en: 'Price is an important factor when buying things.', example_sentence: '购物时价格是一个重要因素。' },
  { word: 'fail', definition_en: 'To not pass a test or exam.', collocation_en: 'fail test, never fail', example_sentence_en: 'Study hard so you don\'t fail the exam.', example_sentence: '努力学习，这样你就不会考试不及格。' },
  { word: 'failure', definition_en: 'Lack of success.', collocation_en: 'total failure, learn from failure', example_sentence_en: 'Don\'t be afraid of failure - learn from it.', example_sentence: '不要害怕失败 - 从中学习。' },
  { word: 'fair', definition_en: 'Treating people equally; or quite good.', collocation_en: 'very fair, fair play', example_sentence_en: 'It\'s not fair to cheat in games.', example_sentence: '在游戏中作弊是不公平的。' },
  { word: 'faith', definition_en: 'Complete trust in someone or something.', collocation_en: 'have faith, lose faith', example_sentence_en: 'Have faith in yourself!', example_sentence: '相信自己！' },
  { word: 'fall', definition_en: 'The season between summer and winter.', collocation_en: 'in fall, autumn fall', example_sentence_en: 'Leaves change color in fall.', example_sentence: '秋天树叶会变色。' },
  { word: 'false', definition_en: 'Not true or correct.', collocation_en: 'false information, true or false', example_sentence_en: 'That statement is false.', example_sentence: '那个陈述是假的。' },
  { word: 'familiar', definition_en: 'Well known to you.', collocation_en: 'familiar face, look familiar', example_sentence_en: 'That song sounds familiar.', example_sentence: '那首歌听起来很熟悉。' },
  { word: 'family', definition_en: 'Parents and children living together.', collocation_en: 'family time, whole family', example_sentence_en: 'We eat dinner together as a family every evening.', example_sentence: '我们每天晚上一家人一起吃晚饭。' },
  { word: 'famous', definition_en: 'Known by many people.', collocation_en: 'famous for, world famous', example_sentence_en: 'This city is famous for its delicious food.', example_sentence: '这座城市以美食闻名。' },
  { word: 'fan', definition_en: 'A machine that moves air; or someone who admires someone.', collocation_en: 'electric fan, big fan', example_sentence_en: 'Please turn on the fan - it\'s hot.', example_sentence: '请打开风扇 - 很热。' },
  { word: 'fancy', definition_en: 'Decorated in an elaborate way.', collocation_en: 'very fancy, fancy restaurant', example_sentence_en: 'We went to a fancy restaurant for her birthday.', example_sentence: '我们去了一家高档餐厅庆祝她的生日。' },
  { word: 'fantastic', definition_en: 'Extremely good or wonderful.', collocation_en: 'fantastic idea, fantastic job', example_sentence_en: 'You did a fantastic job on this project!', example_sentence: '你在项目上做得太棒了！' },
  { word: 'far', definition_en: 'At a great distance.', collocation_en: 'very far, far away', example_sentence_en: 'The school is not far from my home.', example_sentence: '学校离我家不远。' },
  { word: 'fare', definition_en: 'Money paid for travel on a bus, train, etc.', collocation_en: 'bus fare, taxi fare', example_sentence_en: 'What\'s the fare to the airport?', example_sentence: '到机场的车费是多少？' },
  { word: 'farm', definition_en: 'A place where crops are grown or animals are raised.', collocation_en: 'visit farm, organic farm', example_sentence_en: 'We visited a farm last weekend.', example_sentence: '我们上周末参观了农场。' },
  { word: 'farmer', definition_en: 'A person who owns or manages a farm.', collocation_en: 'become farmer, local farmer', example_sentence_en: 'The farmer works hard every day.', example_sentence: '农夫每天辛勤工作。' },
  { word: 'farming', definition_en: 'The activity of growing crops and raising animals.', collocation_en: 'do farming, organic farming', example_sentence_en: 'Farming is important for our food supply.', example_sentence: '农业对我们的食物供应很重要。' },
  { word: 'fashion', definition_en: 'Popular style of clothes or behavior.', collocation_en: 'fashion show, follow fashion', example_sentence_en: 'She always wears the latest fashion.', example_sentence: '她总是穿着最新时尚。' },
  { word: 'fast', definition_en: 'Moving or happening quickly.', collocation_en: 'very fast, run fast', example_sentence_en: 'The fastest runner won the race.', example_sentence: '跑得最快的人赢了比赛。' },
  { word: 'fasten', definition_en: 'To attach or close something.', collocation_en: 'fasten seatbelt, fasten your', example_sentence_en: 'Please fasten your seatbelt before we start.', example_sentence: '出发前请系好安全带。' },
  { word: 'fat', definition_en: 'Having too much flesh; or oily substance in food.', collocation_en: 'very fat, lose fat', example_sentence_en: 'Too much fat is not healthy.', example_sentence: '太多脂肪不健康。' },
  { word: 'father', definition_en: 'A male parent of a child.', collocation_en: 'like father, father and son', example_sentence_en: 'My father teaches me how to ride a bike.', example_sentence: '我父亲教我骑自行车。' },
  { word: 'fault', definition_en: 'A mistake or responsibility for something wrong.', collocation_en: 'my fault, find fault', example_sentence_en: 'It\'s not your fault - don\'t worry.', example_sentence: '这不是你的错 - 别担心。' },
  { word: 'favor', definition_en: 'An act of kindness beyond what is due.', collocation_en: 'do favor, ask favor', example_sentence_en: 'Can you do me a favor?', example_sentence: '能帮我个忙吗？' },
  { word: 'favourite', definition_en: 'Liked more than others.', collocation_en: 'my favorite, favorite food', example_sentence_en: 'Pizza is my favorite food.', example_sentence: '披萨是我最喜欢的食物。' },
  { word: 'fear', definition_en: 'An unpleasant feeling of danger.', collocation_en: 'have fear, without fear', example_sentence_en: 'Don\'t let fear stop you from trying.', example_sentence: '不要让恐惧阻止你尝试。' },
  { word: 'feather', definition_en: 'One of the light coverings of a bird.', collocation_en: 'bird feather, soft feather', example_sentence_en: 'Birds have feathers to help them fly.', example_sentence: '鸟有羽毛帮助它们飞翔。' },
  { word: 'feature', definition_en: 'An important part or quality of something.', collocation_en: 'main feature, special feature', example_sentence_en: 'The best feature of this phone is the camera.', example_sentence: '这部手机最好的功能是相机。' },
  { word: 'February', definition_en: 'The second month of the year.', collocation_en: 'in February, February 14th', example_sentence_en: 'February is the shortest month of the year.', example_sentence: '二月是一年中最短的月份。' },
  { word: 'fee', definition_en: 'Money paid for a service or privilege.', collocation_en: 'pay fee, entrance fee', example_sentence_en: 'Is there an entrance fee for this museum?', example_sentence: '这个博物馆要门票费吗？' },
  { word: 'feed', definition_en: 'To give food to a person or animal.', collocation_en: 'feed baby, feed animals', example_sentence_en: 'Please feed the cat while I\'m away.', example_sentence: '我不在的时候请喂猫。' },
  { word: 'feel', definition_en: 'To experience an emotion or physical sensation.', collocation_en: 'feel like, feel better', example_sentence_en: 'I feel like having some ice cream.', example_sentence: '我想要吃冰淇淋。' },
  { word: 'feeling', definition_en: 'An emotional state or physical sensation.', collocation_en: 'good feeling, hurt feeling', example_sentence_en: 'Thank you for your kind feelings.', example_sentence: '谢谢你的好意。' },
  { word: 'fellow', definition_en: 'A man or boy; a companion.', collocation_en: 'my fellow, young fellow', example_sentence_en: 'Hello my fellow students!', example_sentence: '你好，同学们！' },
  { word: 'female', definition_en: 'Belonging to the sex that can have babies.', collocation_en: 'female student, male or female', example_sentence_en: 'More females than males study medicine.', example_sentence: '学医的女性比男性多。' },
  { word: 'fence', definition_en: 'A structure that divides two areas of land.', collocation_en: 'wooden fence, climb fence', example_sentence_en: 'We need to fix the broken fence.', example_sentence: '我们需要修理破损的栅栏。' },
  { word: 'festival', definition_en: 'A day or period of celebration.', collocation_en: 'music festival, hold festival', example_sentence_en: 'Our town has a summer festival every year.', example_sentence: '我们的镇每年举办夏季节日。' },
  { word: 'fetch', definition_en: 'To go and get something and bring it back.', collocation_en: 'fetch water, fetch book', example_sentence_en: 'Please fetch me a glass of water.', example_sentence: '请给我拿杯水来。' },
  { word: 'fever', definition_en: 'A high body temperature when you are sick.', collocation_en: 'have fever, high fever', example_sentence_en: 'She has a fever and needs to rest.', example_sentence: '她发烧了需要休息。' },
  { word: 'few', definition_en: 'Not many; a small number.', collocation_en: 'very few, a few', example_sentence_en: 'Only a few students came to class today.', example_sentence: '今天只有几个学生来上课。' },
  { word: 'field', definition_en: 'An area of land used for a particular purpose.', collocation_en: 'play field, in the field', example_sentence_en: 'The football field is very large.', example_sentence: '足球场很大。' },
  { word: 'fifth', definition_en: 'Number 5 in a sequence.', collocation_en: 'fifth floor, fifth grade', example_sentence_en: 'My birthday is on the fifth of May.', example_sentence: '我的生日是5月5日。' },
  { word: 'fifty', definition_en: 'The number 50.', collocation_en: 'fifty people, fifty years', example_sentence_en: 'My grandfather is fifty years old.', example_sentence: '我祖父50岁了。' },
  { word: 'fight', definition_en: 'To use physical force to try to defeat someone.', collocation_en: 'fight against, fight for', example_sentence_en: 'We should fight against pollution.', example_sentence: '我们应该与污染作斗争。' },
  { word: 'figure', definition_en: 'A number or symbol; or the shape of a human body.', collocation_en: 'see figure, good figure', example_sentence_en: 'Look at figure 3 on page 10.', example_sentence: '看第10页的图3。' },
  { word: 'file', definition_en: 'A container for keeping papers together; or computer document.', collocation_en: 'save file, open file', example_sentence_en: 'Please save your file before closing.', example_sentence: '关闭前请保存文件。' },
  { word: 'fill', definition_en: 'To make something full.', collocation_en: 'fill in, fill up', example_sentence_en: 'Please fill in this form.', example_sentence: '请填写这张表格。' },
  { word: 'film', definition_en: 'A movie; or material for taking photographs.', collocation_en: 'watch film, shoot film', example_sentence_en: 'We watched an interesting film last night.', example_sentence: '我们昨晚看了一部有趣的电影。' },
  { word: 'final', definition_en: 'Coming at the end; last.', collocation_en: 'final exam, final match', example_sentence_en: 'The final exam is next week.', example_sentence: '期末考试在下周。' },
  { word: 'finally', definition_en: 'At the end of a process or time.', collocation_en: 'finally arrive, finally finish', example_sentence_en: 'We finally arrived home after a long journey.', example_sentence: '经过长途旅行，我们终于到家了。' },
  { word: 'finance', definition_en: 'Money management; or money for a project.', collocation_en: 'personal finance, raise finance', example_sentence_en: 'She studied finance at university.', example_sentence: '她在大学学的是财务。' },
  { word: 'financial', definition_en: 'Related to money.', collocation_en: 'financial help, financial problem', example_sentence_en: 'The company has financial problems.', example_sentence: '公司有财务问题。' },
  { word: 'find', definition_en: 'To discover or locate something.', collocation_en: 'find job, find out', example_sentence_en: 'I can\'t find my keys anywhere!', example_sentence: '我哪里都找不到我的钥匙！' },
  { word: 'fine', definition_en: 'Good quality; or a punishment of money.', collocation_en: 'very fine, pay fine', example_sentence_en: 'The weather is fine today.', example_sentence: '今天天气很好。' },
  { word: 'finger', definition_en: 'One of the five parts at the end of your hand.', collocation_en: 'point finger, index finger', example_sentence_en: 'Don\'t point your finger at people.', example_sentence: '不要用手指着人。' },
  { word: 'finish', definition_en: 'To complete something.', collocation_en: 'finish work, finish homework', example_sentence_en: 'What time does the meeting finish?', example_sentence: '会议几点结束？' },
  { word: 'fire', definition_en: 'To shoot a weapon; or to dismiss from a job.', collocation_en: 'fire at, catch fire', example_sentence_en: 'The hunter fired at the deer.', example_sentence: '猎人向鹿开枪。' },
  { word: 'first', definition_en: 'Coming before all others.', collocation_en: 'first time, at first', example_sentence_en: 'This is my first time here.', example_sentence: '这是我第一次来这里。' },
  { word: 'fish', definition_en: 'A creature that lives in water; or to catch them.', collocation_en: 'catch fish, eat fish', example_sentence_en: 'We went fishing at the lake.', example_sentence: '我们去湖边钓鱼了。' }
]

async function updateFGroup() {
  console.log('🎓 开始更新F组词汇（79个词）\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = fGroupData
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

  console.log(`✅ 找到 ${wordsToUpdate.length} 个F组词在数据库中\n`)
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

  console.log('\n\n✅ F组更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateFGroup()
