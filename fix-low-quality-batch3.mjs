/**
 * 批量修复低质量单词数据 - 第3批（C组）
 * 专门处理132个C开头的词
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// 高质量数据 - C组：132个词
const batch3HighQuality = [
  // C开头 - 动词 (40个)
  { word: 'call', definition_en: 'To use a phone to talk to someone.', collocation_en: 'call someone, make a call, phone call', example_sentence_en: 'I\'ll call you tonight after dinner.', example_sentence: '我晚饭后给你打电话。' },
  { word: 'can', definition_en: 'To be able to do something.', collocation_en: 'can do, can speak, can help', example_sentence_en: 'I can swim very well.', example_sentence: '我游泳游得很好。' },
  { word: 'careful', definition_en: 'Giving attention to avoid mistakes or danger.', collocation_en: 'be careful, very careful', example_sentence_en: 'Be careful when you cross the street.', example_sentence: '过马路时要小心。' },
  { word: 'carry', definition_en: 'To hold and move something from one place to another.', collocation_en: 'carry bag, carry heavy thing', example_sentence_en: 'Can you help me carry these heavy bags?', example_sentence: '你能帮我提这些重袋子吗？' },
  { word: 'catch', definition_en: 'To stop and hold a moving object.', collocation_en: 'catch ball, catch bus, catch cold', example_sentence_en: 'Hurry up or we\'ll miss the bus!', example_sentence: '快点，不然我们要错过公交车了！' },
  { word: 'cause', definition_en: 'To make something happen.', collocation_en: 'cause problem, cause accident', example_sentence_en: 'Smoking can cause health problems.', example_sentence: '吸烟会导致健康问题。' },
  { word: 'change', definition_en: 'To make or become different.', collocation_en: 'change clothes, change mind, make changes', example_sentence_en: 'You need to change your clothes before dinner.', example_sentence: '晚饭前你需要换衣服。' },
  { word: 'chat', definition_en: 'To talk in a friendly way.', collocation_en: 'chat with, chat online', example_sentence_en: 'I like to chat with my friends online.', example_sentence: '我喜欢和朋友在线聊天。' },
  { word: 'check', definition_en: 'To examine something to see if it is correct.', collocation_en: 'check email, check answer, check homework', example_sentence_en: 'Please check your answers before you submit.', example_sentence: '提交前请检查你的答案。' },
  { word: 'choose', definition_en: 'To pick out from a number of alternatives.', collocation_en: 'choose between, choose carefully', example_sentence_en: 'You can choose any color you like.', example_sentence: '你可以选择你喜欢的任何颜色。' },
  { word: 'clean', definition_en: 'To remove dirt from something.', collocation_en: 'clean room, clean house, clean up', example_sentence_en: 'I help my mom clean the house every weekend.', example_sentence: '我每个周末帮妈妈打扫房子。' },
  { word: 'clear', definition_en: 'Easy to see or understand.', collocation_en: 'clear answer, clear explanation, make clear', example_sentence_en: 'Can you give me a clear explanation?', example_sentence: '你能给我一个清晰的解释吗？' },
  { word: 'climb', definition_en: 'To go up something towards the top.', collocation_en: 'climb mountain, climb tree, climb stairs', example_sentence_en: 'We climbed to the top of the hill.', example_sentence: '我们爬到了山顶。' },
  { word: 'close', definition_en: 'To shut something.', collocation_en: 'close door, close window, close early', example_sentence_en: 'Please close the door - it\'s cold outside.', example_sentence: '请关门 - 外面很冷。' },
  { word: 'collect', definition_en: 'To gather things together.', collocation_en: 'collect stamps, collect money', example_sentence_en: 'My grandpa likes to collect stamps.', example_sentence: '我爷爷喜欢集邮。' },
  { word: 'come', definition_en: 'To move towards someone.', collocation_en: 'come here, come back, come in', example_sentence_en: 'Can you come here for a moment?', example_sentence: '你能过来一下吗？' },
  { word: 'compare', definition_en: 'To examine differences between things.', collocation_en: 'compare with, compare prices', example_sentence_en: 'Let\'s compare the prices before we buy.', example_sentence: '买之前让我们比较一下价格。' },
  { word: 'complete', definition_en: 'To finish making or doing something.', collocation_en: 'complete work, complete task', example_sentence_en: 'It took me two hours to complete my homework.', example_sentence: '我花了两个小时完成作业。' },
  { word: 'connect', definition_en: 'To join or link things together.', collocation_en: 'connect to, connect internet', example_sentence_en: 'Can\'t connect to the WiFi - something is wrong.', example_sentence: '连不上WiFi - 有问题。' },
  { word: 'consider', definition_en: 'To think carefully about something.', collocation_en: 'consider doing, consider option', example_sentence_en: 'Please consider my suggestion carefully.', example_sentence: '请仔细考虑我的建议。' },
  { word: 'contain', definition_en: 'To have something inside.', collocation_en: 'contain information, contain vitamin', example_sentence_en: 'This book contains useful information.', example_sentence: '这本书包含有用的信息。' },
  { word: 'continue', definition_en: 'To keep doing something without stopping.', collocation_en: 'continue doing, continue work', example_sentence_en: 'Let\'s continue our lesson after the break.', example_sentence: '休息后我们继续上课。' },
  { word: 'control', definition_en: 'To have power over something.', collocation_en: 'control yourself, remote control', example_sentence_en: 'You need to learn to control your anger.', example_sentence: '你需要学会控制你的愤怒。' },
  { word: 'cook', definition_en: 'To prepare food for eating by heating it.', collocation_en: 'cook dinner, cook meal', example_sentence_en: 'My dad loves to cook for the family.', example_sentence: '我爸爸喜欢为家人做饭。' },
  { word: 'copy', definition_en: 'To make something that looks like another.', collocation_en: 'copy file, copy homework', example_sentence_en: 'Don\'t copy others\' work - do it yourself!', example_sentence: '不要抄别人的作业 - 自己做！' },
  { word: 'correct', definition_en: 'Right or accurate.', collocation_en: 'correct answer, correct mistake', example_sentence_en: 'Is my answer correct?', example_sentence: '我的答案对吗？' },
  { word: 'cost', definition_en: 'The price paid for something.', collocation_en: 'cost money, how much cost', example_sentence_en: 'How much does this book cost?', example_sentence: '这本书多少钱？' },
  { word: 'count', definition_en: 'To say numbers in order.', collocation_en: 'count from, count to', example_sentence_en: 'Can you count from 1 to 100 in English?', example_sentence: '你能用英语从1数到100吗？' },
  { word: 'cover', definition_en: 'To put something over something else.', collocation_en: 'cover table, cover with', example_sentence_en: 'Please cover the food so it doesn\'t get cold.', example_sentence: '请把食物盖上，这样不会变冷。' },
  { word: 'cross', definition_en: 'To go from one side to another.', collocation_en: 'cross street, cross road', example_sentence_en: 'Be careful when you cross the street.', example_sentence: '过马路时要小心。' },
  { word: 'cry', definition_en: 'To produce tears from your eyes.', collocation_en: 'cry loudly, cry because', example_sentence_en: 'The baby started crying when he was hungry.', example_sentence: '宝宝饿的时候开始哭。' },
  { word: 'cut', definition_en: 'To use a knife or tool to divide something.', collocation_en: 'cut paper, cut hair, cut into pieces', example_sentence_en: 'Can you cut this cake into equal pieces?', example_sentence: '你能把蛋糕切成等份吗？' },

  // C开头 - 名词 (40个)
  { word: 'cake', definition_en: 'A sweet baked food made from flour, sugar, and eggs.', collocation_en: 'birthday cake, chocolate cake, piece of cake', example_sentence_en: 'I made a chocolate cake for his birthday.', example_sentence: '我为他生日做了一个巧克力蛋糕。' },
  { word: 'call', definition_en: 'A phone conversation or request for someone to come.', collocation_en: 'make a call, answer call', example_sentence_en: 'I received an important call this morning.', example_sentence: '我今天早上接到了一个重要的电话。' },
  { word: 'camera', definition_en: 'A device for taking photographs.', collocation_en: 'digital camera, take photo with camera', example_sentence_en: 'I brought my camera to take photos of the beautiful view.', example_sentence: '我带了相机来拍这美丽的风景。' },
  { word: 'camp', definition_en: 'A place with tents or huts for outdoor living.', collocation_en: 'summer camp, camping trip', example_sentence_en: 'We are going to summer camp next week!', example_sentence: '我们下周要去夏令营！' },
  { word: 'campus', definition_en: 'The grounds and buildings of a school or college.', collocation_en: 'university campus, school campus', example_sentence_en: 'Our university campus is very beautiful in spring.', example_sentence: '我们大学校园在春天很美。' },
  { word: 'can', definition_en: 'A metal container, usually for food or drink.', collocation_en: 'can of soda, open can', example_sentence_en: 'Would you like a can of cold soda?', example_sentence: '你想来罐冷苏打水吗？' },
  { word: 'capital', definition_en: 'The most important city in a country.', collocation_en: 'national capital, capital city', example_sentence_en: 'Beijing is the capital of China.', example_sentence: '北京是中国的首都。' },
  { word: 'captain', definition_en: 'The leader of a team or ship.', collocation_en: 'team captain, ship captain', example_sentence_en: 'The captain led the team to victory.', example_sentence: '队长带领队伍取得了胜利。' },
  { word: 'car', definition_en: 'A road vehicle with an engine and four wheels.', collocation_en: 'drive car, new car', example_sentence_en: 'My dad drives me to school by car.', example_sentence: '我爸爸开车送我去学校。' },
  { word: 'card', definition_en: 'A piece of thick paper for writing or games.', collocation_en: 'birthday card, play cards', example_sentence_en: 'I made a birthday card for my best friend.', example_sentence: '我给最好的朋友做了张生日卡。' },
  { word: 'care', definition_en: 'The process of protecting someone or something.', collocation_en: 'take care of, health care', example_sentence_en: 'Please take care of my cat while I\'m away.', example_sentence: '我不在的时候请照顾我的猫。' },
  { word: 'career', definition_en: 'A job or profession that you do for a long time.', collocation_en: 'choose career, successful career', example_sentence_en: 'Teaching is a wonderful career choice.', example_sentence: '教书是一个很棒的职业选择。' },
  { word: 'case', definition_en: 'A particular situation or example of something.', collocation_en: 'in this case, special case', example_sentence_en: 'In this case, we should ask the teacher for help.', example_sentence: '在这种情况下，我们应该向老师求助。' },
  { word: 'cash', definition_en: 'Money in coins or notes.', collocation_en: 'pay by cash, in cash', example_sentence_en: 'Do you want to pay by cash or credit card?', example_sentence: '你想付现金还是刷卡？' },
  { word: 'castle', definition_en: 'A large strong building for protection in the past.', collocation_en: 'old castle, beautiful castle', example_sentence_en: 'We visited an ancient castle in Scotland.', example_sentence: '我们在苏格兰参观了一座古老的城堡。' },
  { word: 'cat', definition_en: 'A small furry animal that people keep as a pet.', collocation_en: 'pet cat, feed cat', example_sentence_en: 'My cat likes to sleep on my bed.', example_sentence: '我的猫喜欢睡在我的床上。' },
  { word: 'catch', definition_en: 'The act of grabbing something that is moving.', collocation_en: 'good catch, make a catch', example_sentence_en: 'Nice catch! You\'re really good at baseball.', example_sentence: '接得好！你真的很擅长棒球。' },
  { word: 'cause', definition_en: 'The reason why something happens.', collocation_en: 'find cause, main cause', example_sentence_en: 'What is the cause of this problem?', example_sentence: '这个问题的原因是什么？' },
  { word: 'celebration', definition_en: 'A happy event to celebrate something special.', collocation_en: 'birthday celebration, hold celebration', example_sentence_en: 'We are having a celebration for her graduation.', example_sentence: '我们正在为她的毕业举行庆祝。' },
  { word: 'center', definition_en: 'The middle point or part of something.', collocation_en: 'city center, shopping center', example_sentence_en: 'Let\'s meet at the shopping center at 3 PM.', example_sentence: '我们下午3点在购物中心见面。' },
  { word: 'century', definition_en: 'A period of 100 years.', collocation_en: 'twenty-first century, last century', example_sentence_en: 'We live in the twenty-first century.', example_sentence: '我们生活在21世纪。' },
  { word: 'ceremony', definition_en: 'A formal public event.', collocation_en: 'graduation ceremony, wedding ceremony', example_sentence_en: 'The graduation ceremony will be held in June.', example_sentence: '毕业典礼将在六月举行。' },
  { word: 'challenge', definition_en: 'Something that is difficult but possible to achieve.', collocation_en: 'face challenge, accept challenge', example_sentence_en: 'This math problem is a real challenge!', example_sentence: '这道数学题真是挑战！' },
  { word: 'champion', definition_en: 'A person or team that wins a competition.', collocation_en: 'world champion, become champion', example_sentence_en: 'He trained hard to become a swimming champion.', example_sentence: '他刻苦训练成为游泳冠军。' },
  { word: 'chance', definition_en: 'An opportunity to do something.', collocation_en: 'good chance, take a chance', example_sentence_en: 'You have a good chance to win this game.', example_sentence: '你有很好的机会赢得这场比赛。' },
  { word: 'change', definition_en: 'Money given back when you pay more than the cost.', collocation_en: 'keep the change, small change', example_sentence_en: 'You can keep the change.', example_sentence: '零钱不用找了。' },
  { word: 'character', definition_en: 'A person in a story, movie, or play.', collocation_en: 'main character, movie character', example_sentence_en: 'Who is your favorite character in this movie?', example_sentence: '这部电影里你最喜欢哪个角色？' },
  { word: 'chat', definition_en: 'A friendly informal conversation.', collocation_en: 'have a chat, online chat', example_sentence_en: 'Let\'s have a chat about your plans.', example_sentence: '我们聊聊你的计划吧。' },
  { word: 'cheap', definition_en: 'Not expensive; low price.', collocation_en: 'very cheap, quite cheap', example_sentence_en: 'This shop sells very cheap clothes.', example_sentence: '这家店卖的衣服很便宜。' },
  { word: 'check', definition_en: 'An examination to test if something is correct.', collocation_en: 'security check, health check', example_sentence_en: 'You need a health check before playing sports.', example_sentence: '运动前你需要做健康检查。' },
  { word: 'chemistry', definition_en: 'The science of elements and substances.', collocation_en: 'study chemistry, chemistry class', example_sentence_en: 'Chemistry is my favorite subject this year.', example_sentence: '化学是我今年最喜欢的科目。' },
  { word: 'chess', definition_en: 'A game for two players on a board with black and white squares.', collocation_en: 'play chess, chess game', example_sentence_en: 'Do you want to play chess with me?', example_sentence: '你想和我下棋吗？' },
  { word: 'chicken', definition_en: 'A bird kept for its meat and eggs.', collocation_en: 'fried chicken, cook chicken', example_sentence_en: 'We\'re having roast chicken for dinner tonight.', example_sentence: '我们今晚吃烤鸡。' },
  { word: 'child', definition_en: 'A young human being.', collocation_en: 'young child, only child', example_sentence_en: 'Every child has the right to education.', example_sentence: '每个孩子都有受教育的权利。' },
  { word: 'chocolate', definition_en: 'A sweet brown food made from cocoa.', collocation_en: 'dark chocolate, chocolate bar', example_sentence_en: 'I love dark chocolate - it\'s delicious!', example_sentence: '我喜欢黑巧克力 - 很好吃！' },
  { word: 'choice', definition_en: 'The act of choosing between things.', collocation_en: 'make choice, right choice', example_sentence_en: 'Making the right choice is important for your future.', example_sentence: '做出正确的选择对你的未来很重要。' },
  { word: 'choose', definition_en: 'To select from options.', collocation_en: 'choose from, choose wisely', example_sentence_en: 'You can choose any book from this shelf.', example_sentence: '你可以从这书架上选择任何书。' },
  { word: 'city', definition_en: 'A large town with many buildings and people.', collocation_en: 'big city, city center', example_sentence_en: 'New York is a very big city in America.', example_sentence: '纽约是美国的一个大城市。' },
  { word: 'class', definition_en: 'A group of students learning together.', collocation_en: 'have class, attend class', example_sentence_en: 'Our class has 25 students.', example_sentence: '我们班有25个学生。' },
  { word: 'classmate', definition_en: 'A member of the same class at school.', collocation_en: 'my classmate, classmate help', example_sentence_en: 'She is my best friend and classmate.', example_sentence: '她是我最好的朋友和同班同学。' },
  { word: 'classroom', definition_en: 'A room where students have lessons.', collocation_en: 'in classroom, clean classroom', example_sentence_en: 'Please keep our classroom clean and tidy.', example_sentence: '请保持我们的教室干净整洁。' },
  { word: 'climate', definition_en: 'The typical weather conditions of an area.', collocation_en: 'warm climate, change climate', example_sentence_en: 'I prefer living in a warm climate.', example_sentence: '我更喜欢住在气候温暖的地方。' },
  { word: 'climb', definition_en: 'The act of going up towards the top.', collocation_en: 'steep climb, difficult climb', example_sentence_en: 'The climb to the mountain top took 5 hours.', example_sentence: '爬到山顶用了5小时。' },
  { word: 'clock', definition_en: 'A device that shows the time.', collocation_en: 'alarm clock, wall clock', example_sentence_en: 'Look at the clock - it\'s already 10 PM!', example_sentence: '看钟 - 已经晚上10点了！' },
  { word: 'close', definition_en: 'The end of something or near to something.', collocation_en: 'close friend, quite close', example_sentence_en: 'She is a close friend of mine.', example_sentence: '她是我的一个亲密朋友。' },
  { word: 'clothes', definition_en: 'Items worn to cover the body.', collocation_en: 'wear clothes, new clothes', example_sentence_en: 'I need to buy some new clothes for winter.', example_sentence: '我需要买些冬装。' },
  { word: 'cloud', definition_en: 'White or grey mass floating in the sky.', collocation_en: 'dark cloud, white cloud', example_sentence_en: 'Look at those dark clouds - it might rain!', example_sentence: '看那些乌云 - 可能要下雨了！' },
  { word: 'club', definition_en: 'A group of people who meet for an activity.', collocation_en: 'join club, book club', example_sentence_en: 'I joined the English club to practice speaking.', example_sentence: '我加入了英语俱乐部来练习口语。' },
  { word: 'coach', definition_en: 'A person who trains a team or player.', collocation_en: 'football coach, head coach', example_sentence_en: 'Our coach is very strict but kind.', example_sentence: '我们的教练很严格但很友善。' },
  { word: 'coast', definition_en: 'The land beside the sea.', collocation_en: 'west coast, live on coast', example_sentence_en: 'We live on the east coast of the country.', example_sentence: '我们住在国家的东海岸。' },
  { word: 'coat', definition_en: 'A long piece of clothing worn for warmth.', collocation_en: 'winter coat, wear coat', example_sentence_en: 'Put on your coat - it\'s freezing outside!', example_sentence: '穿上外套 - 外面冻死了！' },
  { word: 'coffee', definition_en: 'A hot drink made from roasted beans.', collocation_en: 'drink coffee, cup of coffee', example_sentence_en: 'Would you like a cup of coffee?', example_sentence: '你想来杯咖啡吗？' },
  { word: 'coin', definition_en: 'A flat piece of metal used as money.', collocation_en: 'gold coin, silver coin', example_sentence_en: 'I found a coin on the street today.', example_sentence: '我今天在街上捡到了一枚硬币。' },
  { word: 'cold', definition_en: 'Low temperature.', collocation_en: 'very cold, catch cold', example_sentence_en: 'It\'s very cold today - wear a warm jacket.', example_sentence: '今天很冷 - 穿件暖和的外套。' },
  { word: 'college', definition_en: 'A school for higher education.', collocation_en: 'go to college, college student', example_sentence_en: 'She wants to go to college next year.', example_sentence: '她想明年上大学。' },
  { word: 'color', definition_en: 'The appearance of things described as red, blue, etc.', collocation_en: 'favorite color, bright color', example_sentence_en: 'What is your favorite color?', example_sentence: '你最喜欢的颜色是什么？' },
  { word: 'come', definition_en: 'The act of moving towards someone.', collocation_en: 'come here, come back', example_sentence_en: 'Come here and look at this!', example_sentence: '过来看看这个！' },
  { word: 'comedy', definition_en: 'A funny movie or show.', collocation_en: 'watch comedy, romantic comedy', example_sentence_en: 'I love watching comedies - they make me laugh!', example_sentence: '我喜欢看喜剧 - 它们让我笑！' },
  { word: 'comfortable', definition_en: 'Physically relaxed and not feeling pain.', collocation_en: 'very comfortable, feel comfortable', example_sentence_en: 'This chair is very comfortable to sit on.', example_sentence: '这把椅子坐起来很舒服。' },
  { word: 'comment', definition_en: 'A written or spoken remark.', collocation_en: 'make comment, leave comment', example_sentence_en: 'Can I make a comment on your presentation?', example_sentence: '我可以在你的演讲上提点意见吗？' },
  { word: 'common', definition_en: 'Happening often; usual.', collocation_en: 'very common, quite common', example_sentence_en: 'Colds are very common in winter.', example_sentence: '感冒在冬天很常见。' },
  { word: 'company', definition_en: 'A business organization or being with others.', collocation_en: 'large company, in company', example_sentence_en: 'She works for a large technology company.', example_sentence: '她在一家大型科技公司工作。' },
  { word: 'compare', definition_en: 'To examine similarities and differences.', collocation_en: 'compare prices, compare with', example_sentence_en: 'Let\'s compare these two products.', example_sentence: '让我们比较这两个产品。' },
  { word: 'competition', definition_en: 'An event where people try to win.', collocation_en: 'enter competition, win competition', example_sentence_en: 'I entered the English speaking competition.', example_sentence: '我参加了英语演讲比赛。' },
  { word: 'complete', definition_en: 'Having all parts; finished.', collocation_en: 'complete sentence, complete work', example_sentence_en: 'Is this homework complete?', example_sentence: '这作业完成了吗？' },
  { word: 'computer', definition_en: 'An electronic machine for storing and processing data.', collocation_en: 'use computer, personal computer', example_sentence_en: 'I use my computer for homework every day.', example_sentence: '我每天用电脑做作业。' },
  { word: 'concert', definition_en: 'A musical performance.', collocation_en: 'attend concert, music concert', example_sentence_en: 'We went to a concert last weekend.', example_sentence: '我们上周末去听音乐会了。' },
  { word: 'condition', definition_en: 'The state something is in.', collocation_en: 'good condition, bad condition', example_sentence_en: 'This car is in excellent condition.', example_sentence: '这车状况极佳。' },
  { word: 'connect', definition_en: 'To join together or link.', collocation_en: 'connect to, connect internet', example_sentence_en: 'Can you connect the printer to my computer?', example_sentence: '你能把打印机连到我的电脑上吗？' },
  { word: 'consider', definition_en: 'To think carefully about something.', collocation_en: 'carefully consider, all things considered', example_sentence_en: 'Please consider my suggestion.', example_sentence: '请考虑我的建议。' },
  { word: 'construction', definition_en: 'The building of something.', collocation_en: 'under construction, road construction', example_sentence_en: 'The new library is under construction.', example_sentence: '新图书馆正在建设中。' },
  { word: 'contact', definition_en: 'To communicate with someone.', collocation_en: 'contact by, contact information', example_sentence_en: 'You can contact me by email or phone.', example_sentence: '你可以通过邮件或电话联系我。' },
  { word: 'contain', definition_en: 'To have or hold something inside.', collocation_en: 'contain vitamin, contain alcohol', example_sentence_en: 'This juice contains no sugar.', example_sentence: '这果汁不含糖。' },
  { word: 'content', definition_en: 'The things inside something.', collocation_en: 'page content, course content', example_sentence_en: 'The content of this book is very useful.', example_sentence: '这本书的内容非常有用。' },
  { word: 'continue', definition_en: 'To keep doing something.', collocation_en: 'continue with, continue to do', example_sentence_en: 'Please continue with your work.', example_sentence: '请继续你的工作。' },
  { word: 'contract', definition_en: 'A legal written agreement.', collocation_en: 'sign contract, break contract', example_sentence_en: 'You need to sign the contract before starting work.', example_sentence: '开始工作前你需要签合同。' },
  { word: 'control', definition_en: 'Power to direct or manage something.', collocation_en: 'have control, under control', example_sentence_en: 'The driver lost control of the car.', example_sentence: '司机失去了对汽车的控制。' },
  { word: 'conversation', definition_en: 'A talk between people.', collocation_en: 'have conversation, start conversation', example_sentence_en: 'I had an interesting conversation with my teacher.', example_sentence: '我和老师进行了一次有趣的谈话。' },
  { word: 'cook', definition_en: 'A person who prepares food.', collocation_en: 'professional cook, good cook', example_sentence_en: 'She is an excellent cook.', example_sentence: '她是个很棒的厨师。' },
  { word: 'cooker', definition_en: 'A machine for cooking food.', collocation_en: 'rice cooker, slow cooker', example_sentence_en: 'Use a rice cooker to make perfect rice.', example_sentence: '用电饭煲煮出完美的米饭。' },
  { word: 'cookie', definition_en: 'A small sweet cake.', collocation_en: 'chocolate cookie, eat cookie', example_sentence_en: 'Would you like a chocolate chip cookie?', example_sentence: '你想要块巧克力曲奇吗？' },
  { word: 'copy', definition_en: 'A thing made to look like another.', collocation_en: 'make copy, hard copy', example_sentence_en: 'Can you make a copy of this document for me?', example_sentence: '你能帮我复印这份文件吗？' },
  { word: 'core', definition_en: 'The central or most important part.', collocation_en: 'core value, core subject', example_sentence_en: 'English is a core subject in our school.', example_sentence: '英语是我们学校的核心科目。' },
  { word: 'corner', definition_en: 'A point where two lines or sides meet.', collocation_en: 'street corner, corner of', example_sentence_en: 'Meet me at the corner of the street.', example_sentence: '在街角见我。' },
  { word: 'correct', definition_en: 'Free from error; right.', collocation_en: 'correct answer, correct spelling', example_sentence_en: 'Your pronunciation is completely correct!', example_sentence: '你的发音完全正确！' },
  { word: 'cost', definition_en: 'The price paid to get something.', collocation_en: 'total cost, cost of living', example_sentence_en: 'The total cost of the trip is $500.', example_sentence: '旅行的总费用是500美元。' },
  { word: 'cotton', definition_en: 'Soft white cloth made from a plant.', collocation_en: 'cotton shirt, 100% cotton', example_sentence_en: 'I prefer cotton clothes - they are comfortable.', example_sentence: '我更喜欢棉质衣服 - 很舒服。' },
  { word: 'cough', definition_en: 'To force air through your throat with a sudden sound.', collocation_en: 'bad cough, have cough', example_sentence_en: 'Cover your mouth when you cough.', example_sentence: '咳嗽时捂住嘴巴。' },
  { word: 'could', definition_en: 'Used to express possibility or ability.', collocation_en: 'could do, could be', example_sentence_en: 'I could help you with your homework.', example_sentence: '我可以帮你做作业。' },
  { word: 'count', definition_en: 'The act of saying numbers in order.', collocation_en: 'count from, head count', example_sentence_en: 'Let\'s count the students in the class.', example_sentence: '让我们数一下班上的学生。' },
  { word: 'country', definition_en: 'A nation with its own government.', collocation_en: 'my country, foreign country', example_sentence_en: 'China is a beautiful country.', example_sentence: '中国是一个美丽的国家。' },
  { word: 'countryside', definition_en: 'Land outside cities and towns.', collocation_en: 'live in countryside', example_sentence_en: 'I love the fresh air in the countryside.', example_sentence: '我喜欢乡村的新鲜空气。' },
  { word: 'couple', definition_en: 'Two people or things together.', collocation_en: 'couple of, young couple', example_sentence_en: 'I\'ll be ready in a couple of minutes.', example_sentence: '我几分钟就好。' },
  { word: 'course', definition_en: 'A series of lessons or classes.', collocation_en: 'take course, of course', example_sentence_en: 'I\'m taking an English course this summer.', example_sentence: '这个夏天我在上英语课。' },
  { word: 'court', definition_en: 'An area for playing games like tennis.', collocation_en: 'tennis court, basketball court', example_sentence_en: 'We played basketball on the court.', example_sentence: '我们在球场打篮球。' },
  { word: 'cousin', definition_en: 'A child of your aunt or uncle.', collocation_en: 'my cousin, cousin sister', example_sentence_en: 'My cousin is coming to visit us next week.', example_sentence: '我表弟下周要来看我们。' },
  { word: 'cover', definition_en: 'Something that goes over or protects something.', collocation_en: 'book cover, remove cover', example_sentence_en: 'The book has a beautiful cover.', example_sentence: '这本书有漂亮的封面。' },
  { word: 'cow', definition_en: 'A large farm animal that produces milk.', collocation_en: 'dairy cow, milk cow', example_sentence_en: 'Cows eat grass in the field.', example_sentence: '牛在田野里吃草。' },
  { word: 'crack', definition_en: 'A thin line on something where it is broken.', collocation_en: 'crack in window, deep crack', example_sentence_en: 'Be careful - there is a crack in the window.', example_sentence: '小心 - 窗户上有条裂缝。' },
  { word: 'cream', definition_en: 'Thick liquid from milk, used in food.', collocation_en: 'ice cream, face cream', example_sentence_en: 'Would you like some cream in your coffee?', example_sentence: '你咖啡里想要加点奶油吗？' },
  { word: 'create', definition_en: 'To make something new exist.', collocation_en: 'create art, create problem', example_sentence_en: 'Children love to create art with paints.', example_sentence: '孩子们喜欢用颜料创作艺术。' },
  { word: 'creative', definition_en: 'Good at thinking of new ideas.', collocation_en: 'very creative, creative person', example_sentence_en: 'She is very creative - she writes stories and draws.', example_sentence: '她很有创造力 - 写故事和画画。' },
  { word: 'creature', definition_en: 'Any living thing, especially an animal.', collocation_en: 'living creature, sea creature', example_sentence_en: 'The ocean is home to many amazing creatures.', example_sentence: '海洋是许多神奇生物的家园。' },
  { word: 'credit', definition_en: 'Praise or approval for something you did.', collocation_en: 'get credit, take credit', example_sentence_en: 'She deserves credit for her hard work.', example_sentence: '她的努力值得表扬。' },
  { word: 'crime', definition_en: 'An illegal act against the law.', collocation_en: 'commit crime, fight crime', example_sentence_en: 'Stealing is a serious crime.', example_sentence: '偷窃是严重的犯罪。' },
  { word: 'criminal', definition_en: 'A person who has committed a crime.', collocation_en: 'dangerous criminal, catch criminal', example_sentence_en: 'The police caught the criminal.', example_sentence: '警察抓住了罪犯。' },
  { word: 'crisis', definition_en: 'A time of great difficulty or danger.', collocation_en: 'financial crisis, face crisis', example_sentence_en: 'The country faced an economic crisis.', example_sentence: '国家面临经济危机。' },
  { word: 'critic', definition_en: 'A person who gives opinions about things.', collocation_en: 'film critic, music critic', example_sentence_en: 'The critic gave the movie a good review.', example_sentence: '评论家给了这部电影好评。' },
  { word: 'critical', definition_en: 'Expressing disapproval; very important.', collocation_en: 'critical thinking, critical condition', example_sentence_en: 'Critical thinking is an important skill.', example_sentence: '批判性思维是一项重要技能。' },
  { word: 'crop', definition_en: 'A plant grown for food.', collocation_en: 'grow crop, main crop', example_sentence_en: 'Wheat and corn are important crops.', example_sentence: '小麦和玉米是重要作物。' },
  { word: 'cross', definition_en: 'A mark shaped like an X.', collocation_en: 'sign cross, red cross', example_sentence_en: 'Put a cross next to the correct answer.', example_sentence: '在正确答案旁边打个叉。' },
  { word: 'crowd', definition_en: 'A large number of people together.', collocation_en: 'large crowd, crowd of people', example_sentence_en: 'There was a large crowd at the concert.', example_sentence: '音乐会上人很多。' },
  { word: 'crowded', definition_en: 'Filled with many people.', collocation_en: 'very crowded, crowded place', example_sentence_en: 'The train was so crowded that I couldn\'t find a seat.', example_sentence: '火车太挤了，我找不到座位。' },
  { word: 'cry', definition_en: 'Tears coming from your eyes.', collocation_en: 'loud cry, start to cry', example_sentence_en: 'Don\'t cry - everything will be okay!', example_sentence: '别哭 - 一切都会好的！' },
  { word: 'culture', definition_en: 'The beliefs and customs of a group of people.', collocation_en: 'learn culture, different culture', example_sentence_en: 'I love learning about different cultures.', example_sentence: '我喜欢了解不同的文化。' },
  { word: 'cup', definition_en: 'A small container for drinking.', collocation_en: 'cup of tea, coffee cup', example_sentence_en: 'Would you like a cup of tea or coffee?', example_sentence: '你想喝茶还是咖啡？' },
  { word: 'cure', definition_en: 'To make someone healthy again after an illness.', collocation_en: 'cure disease, find cure', example_sentence_en: 'Doctors hope to find a cure for cancer.', example_sentence: '医生希望找到治愈癌症的方法。' },
  { word: 'curious', definition_en: 'Wanting to learn or know more.', collocation_en: 'curious about, very curious', example_sentence_en: 'Children are naturally curious about the world.', example_sentence: '孩子天生对世界充满好奇。' },
  { word: 'current', definition_en: 'Happening or being used now.', collocation_en: 'current situation, current events', example_sentence_en: 'What is the current price of this product?', example_sentence: '这个产品的当前价格是多少？' },
  { word: 'curtain', definition_en: 'A piece of cloth that covers a window.', collocation_en: 'open curtain, draw curtain', example_sentence_en: 'Please close the curtains - it\'s too bright.', example_sentence: '请拉上窗帘 - 太亮了。' },
  { word: 'custom', definition_en: 'Something that people in a country usually do.', collocation_en: 'local custom, follow custom', example_sentence_en: 'It\'s a custom to give gifts on birthdays.', example_sentence: '生日送礼物是一种习俗。' },
  { word: 'customer', definition_en: 'A person who buys things from a shop.', collocation_en: 'happy customer, serve customer', example_sentence_en: 'The customer is always right.', example_sentence: '顾客永远是对的。' },
  { word: 'cut', definition_en: 'Made with a knife or other sharp tool.', collocation_en: 'make cut, deep cut', example_sentence_en: 'I have a small cut on my finger.', example_sentence: '我手指上有个小伤口。' },
  { word: 'cute', definition_en: 'Attractive in an endearing way.', collocation_en: 'very cute, look cute', example_sentence_en: 'Your puppy is so cute!', example_sentence: '你的小狗真可爱！' }
]

async function updateBatch3() {
  console.log('🎓 开始更新第3批高质量数据（C组132个词）\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = batch3HighQuality
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

  console.log(`✅ 找到 ${wordsToUpdate.length} 个C组词在数据库中\n`)
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

  console.log('\n\n✅ 第3批更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)

  // 验证一些示例
  console.log('\n🔍 验证C组示例：\n')
  const samples = ['call', 'clean', 'city', 'computer', 'class']

  for (const w of samples) {
    const { data } = await supabase
      .from('words')
      .select('word, definition_en, collocation_en, example_sentence_en')
      .eq('word', w)
      .single()

    if (data) {
      console.log(`${data.word}:`)
      console.log(`  ${data.definition_en}`)
      console.log(`  ${data.example_sentence_en}`)
      console.log()
    }
  }

  console.log('🎉 C组词汇更新完成')
}

updateBatch3()
