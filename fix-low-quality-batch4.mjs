/**
 * 批量修复低质量单词数据 - 第4批（P组）
 * 处理110个P开头的词
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// 高质量数据 - P组：110个词
const batch4HighQuality = [
  // P开头 - 动词 (25个)
  { word: 'pack', definition_en: 'To put things into bags or boxes.', collocation_en: 'pack bag, pack clothes', example_sentence_en: 'I need to pack my bags for the trip.', example_sentence: '我需要为旅行收拾行李。' },
  { word: 'paint', definition_en: 'To cover something with colored liquid.', collocation_en: 'paint picture, paint wall', example_sentence_en: 'The children love to paint pictures.', example_sentence: '孩子们喜欢画画。' },
  { word: 'park', definition_en: 'To bring a vehicle to a stop and leave it.', collocation_en: 'park car, park here', example_sentence_en: 'Can we park the car here?', example_sentence: '我们可以把车停在这儿吗？' },
  { word: 'participate', definition_en: 'To take part in an activity.', collocation_en: 'participate in, participate activity', example_sentence_en: 'Everyone should participate in class discussions.', example_sentence: '每个人都应该参与课堂讨论。' },
  { word: 'pass', definition_en: 'To give something to someone else.', collocation_en: 'pass exam, pass ball, pass by', example_sentence_en: 'Can you pass me the salt, please?', example_sentence: '能把盐递给我吗？' },
  { word: 'pay', definition_en: 'To give money for something.', collocation_en: 'pay money, pay for, pay by', example_sentence_en: 'I need to pay for these books.', example_sentence: '我需要为这些书付钱。' },
  { word: 'pick', definition_en: 'To choose or take something from a group.', collocation_en: 'pick up, pick out', example_sentence_en: 'Can you pick me up at the station?', example_sentence: '你能在车站接我吗？' },
  { word: 'place', definition_en: 'To put something in a position.', collocation_en: 'place order, place on', example_sentence_en: 'Please place your books on the desk.', example_sentence: '请把你的书放在桌子上。' },
  { word: 'plan', definition_en: 'To decide what to do in the future.', collocation_en: 'make plan, plan to do', example_sentence_en: 'We plan to visit Beijing next summer.', example_sentence: '我们计划明年夏天去北京。' },
  { word: 'play', definition_en: 'To enjoy yourself doing something.', collocation_en: 'play game, play football, play music', example_sentence_en: 'Let\'s play a game together!', example_sentence: '让我们一起玩游戏吧！' },
  { word: 'point', definition_en: 'To direct someone\'s attention to something.', collocation_en: 'point at, point to', example_sentence_en: 'Look at that! He\'s pointing at the bird.', example_sentence: '看那个！他正指着那只鸟。' },
  { word: 'prefer', definition_en: 'To like one thing more than another.', collocation_en: 'prefer to, prefer doing', example_sentence_en: 'I prefer tea to coffee.', example_sentence: '比起咖啡，我更喜欢茶。' },
  { word: 'prepare', definition_en: 'To make something ready.', collocation_en: 'prepare for, prepare food', example_sentence_en: 'I need to prepare for my exam tomorrow.', example_sentence: '我需要为明天的考试做准备。' },
  { word: 'present', definition_en: 'To show or offer something for others to see.', collocation_en: 'present idea, present work', example_sentence_en: 'She will present her project tomorrow.', example_sentence: '她明天将展示她的项目。' },
  { word: 'press', definition_en: 'To push something firmly.', collocation_en: 'press button, press hard', example_sentence_en: 'Press the button to start the machine.', example_sentence: '按按钮启动机器。' },
  { word: 'prevent', definition_en: 'To stop something from happening.', collocation_en: 'prevent accident, prevent from', example_sentence_en: 'Wearing a helmet can prevent head injuries.', example_sentence: '戴头盔可以防止头部受伤。' },
  { word: 'print', definition_en: 'To produce text or pictures on paper.', collocation_en: 'print document, print out', example_sentence_en: 'Can you print this document for me?', example_sentence: '你能帮我打印这份文件吗？' },
  { word: 'produce', definition_en: 'To make or grow something.', collocation_en: 'produce food, produce energy', example_sentence_en: 'This factory produces car parts.', example_sentence: '这家工厂生产汽车零件。' },
  { word: 'promise', definition_en: 'To say you will definitely do something.', collocation_en: 'make promise, promise to do', example_sentence_en: 'I promise to help you with your homework.', example_sentence: '我承诺帮你做作业。' },
  { word: 'protect', definition_en: 'To keep someone or something safe.', collocation_en: 'protect from, protect environment', example_sentence_en: 'Wear a hat to protect your head from the sun.', example_sentence: '戴帽子保护头部免受阳光照射。' },
  { word: 'prove', definition_en: 'To show that something is true.', collocation_en: 'prove that, prove to be', example_sentence_en: 'Can you prove your answer is correct?', example_sentence: '你能证明你的答案正确吗？' },
  { word: 'provide', definition_en: 'To give something to someone.', collocation_en: 'provide with, provide for', example_sentence_en: 'The hotel provides free WiFi for guests.', example_sentence: '酒店为客人提供免费WiFi。' },
  { word: 'pull', definition_en: 'To hold something and move it towards you.', collocation_en: 'pull door, pull hard', example_sentence_en: 'Pull the door to open it.', example_sentence: '拉门打开它。' },
  { word: 'push', definition_en: 'To use force to move something away.', collocation_en: 'push door, push button', example_sentence_en: 'Push the button to call the elevator.', example_sentence: '按按钮叫电梯。' },
  { word: 'put', definition_en: 'To move something into a place.', collocation_en: 'put on, put away, put down', example_sentence_en: 'Please put your toys away after playing.', example_sentence: '玩完后请把玩具收好。' },

  // P开头 - 名词 (60个)
  { word: 'page', definition_en: 'One side of a piece of paper in a book.', collocation_en: 'read page, turn page, next page', example_sentence_en: 'Please turn to page 10 in your book.', example_sentence: '请翻到书的第10页。' },
  { word: 'pain', definition_en: 'Physical suffering in a part of the body.', collocation_en: 'feel pain, have pain', example_sentence_en: 'I have a pain in my back.', example_sentence: '我背痛。' },
  { word: 'paint', definition_en: 'Colored liquid used to cover surfaces.', collocation_en: 'oil paint, face paint', example_sentence_en: 'The artist used bright colors in her paint.', example_sentence: '艺术家在她的画作中使用了明亮的颜色。' },
  { word: 'painting', definition_en: 'A picture made with paint.', collocation_en: 'beautiful painting, oil painting', example_sentence_en: 'This painting is worth a lot of money.', example_sentence: '这幅画很值钱。' },
  { word: 'pair', definition_en: 'Two things that are used together.', collocation_en: 'pair of shoes, a pair of', example_sentence_en: 'I bought a new pair of shoes yesterday.', example_sentence: '我昨天买了一双新鞋。' },
  { word: 'palace', definition_en: 'A large grand house where a king or queen lives.', collocation_en: 'beautiful palace, royal palace', example_sentence_en: 'We visited the Summer Palace in Beijing.', example_sentence: '我们参观了北京的颐和园。' },
  { word: 'pale', definition_en: 'Light in color or having less color than usual.', collocation_en: 'pale blue, pale face', example_sentence_en: 'She looks pale - maybe she is sick.', example_sentence: '她脸色苍白 - 也许病了。' },
  { word: 'pan', definition_en: 'A round metal container used for cooking.', collocation_en: 'frying pan, cook with pan', example_sentence_en: 'Use a frying pan to make eggs.', example_sentence: '用平底锅做鸡蛋。' },
  { word: 'paper', definition_en: 'Thin material used for writing on.', collocation_en: 'piece of paper, write on paper', example_sentence_en: 'Please write your name on this piece of paper.', example_sentence: '请在这张纸上写下你的名字。' },
  { word: 'paragraph', definition_en: 'A section of writing with sentences about one idea.', collocation_en: 'write paragraph, read paragraph', example_sentence_en: 'Write a paragraph about your summer holiday.', example_sentence: '写一段关于你暑假的话。' },
  { word: 'park', definition_en: 'A public garden or place for recreation.', collocation_en: 'city park, theme park', example_sentence_en: 'We had a picnic in the park.', example_sentence: '我们在公园野餐了。' },
  { word: 'parking', definition_en: 'Space or place for leaving vehicles.', collocation_en: 'parking lot, no parking', example_sentence_en: 'Is there any parking near the station?', example_sentence: '车站附近有停车位吗？' },
  { word: 'part', definition_en: 'A piece of something.', collocation_en: 'take part in, part of', example_sentence_en: 'Music is an important part of my life.', example_sentence: '音乐是我生活中重要的一部分。' },
  { word: 'participant', definition_en: 'Someone who takes part in something.', collocation_en: 'active participant', example_sentence_en: 'Every participant gets a certificate.', example_sentence: '每个参与者都能得到证书。' },
  { word: 'particle', definition_en: 'A very small piece of something.', collocation_en: 'small particle, dust particle', example_sentence_en: 'Dust particles floated in the sunlight.', example_sentence: '灰尘颗粒在阳光下飘浮。' },
  { word: 'particular', definition_en: 'Special or specific.', collocation_en: 'particular about, in particular', example_sentence_en: 'Is there any particular food you don\'t eat?', example_sentence: '有什么特别的食物你不吃吗？' },
  { word: 'partly', definition_en: 'To some extent but not completely.', collocation_en: 'partly cloudy, partly true', example_sentence_en: 'The story is partly true and partly fiction.', example_sentence: '这个故事部分真实部分虚构。' },
  { word: 'partner', definition_en: 'A person you do something with.', collocation_en: 'business partner, dance partner', example_sentence_en: 'She is my dance partner in the competition.', example_sentence: '她是我在比赛中的舞伴。' },
  { word: 'party', definition_en: 'A social gathering for enjoyment.', collocation_en: 'birthday party, have party', example_sentence_en: 'We are having a party this weekend!', example_sentence: '我们要在这个周末举办派对！' },
  { word: 'pass', definition_en: 'Successful completion of an exam or course.', collocation_en: 'pass mark, get a pass', example_sentence_en: 'I got a pass in my math exam!', example_sentence: '我数学考试及格了！' },
  { word: 'passage', definition_en: 'A short part of a written work.', collocation_en: 'read passage, short passage', example_sentence_en: 'Read the passage and answer the questions.', example_sentence: '阅读短文并回答问题。' },
  { word: 'passenger', definition_en: 'A person traveling in a vehicle.', collocation_en: 'bus passenger, train passenger', example_sentence_en: 'The bus was full of passengers.', example_sentence: '公交车上挤满了乘客。' },
  { word: 'passion', definition_en: 'Strong feeling of love or enthusiasm.', collocation_en: 'have passion, passion for', example_sentence_en: 'She has a passion for teaching.', example_sentence: '她对教学充满热情。' },
  { word: 'passport', definition_en: 'A document for international travel.', collocation_en: 'valid passport, show passport', example_sentence_en: 'Don\'t forget your passport when traveling abroad.', example_sentence: '出国旅行别忘了护照。' },
  { word: 'password', definition_en: 'A secret word for accessing something.', collocation_en: 'enter password, create password', example_sentence_en: 'Please enter your password to log in.', example_sentence: '请输入密码登录。' },
  { word: 'past', definition_en: 'The time before the present.', collocation_en: 'in the past, past event', example_sentence_en: 'We learn from mistakes in the past.', example_sentence: '我们从过去的错误中学习。' },
  { word: 'path', definition_en: 'A way or track for walking.', collocation_en: 'follow path, garden path', example_sentence_en: 'Stay on the path in the forest.', example_sentence: '在森林里要沿着路走。' },
  { word: 'patience', definition_en: 'The ability to wait without getting angry.', collocation_en: 'have patience, lose patience', example_sentence_en: 'Teaching children requires a lot of patience.', example_sentence: '教孩子需要很多耐心。' },
  { word: 'patient', definition_en: 'A person receiving medical care.', collocation_en: 'hospital patient, treat patient', example_sentence_en: 'The doctor visited all the patients this morning.', example_sentence: '医生今天早上查看了所有病人。' },
  { word: 'pattern', definition_en: 'A repeated decorative design.', collocation_en: 'check pattern, follow pattern', example_sentence_en: 'The dress has a beautiful flower pattern.', example_sentence: '这件裙子有漂亮的花朵图案。' },
  { word: 'pause', definition_en: 'A short stop in action.', collocation_en: 'pause for, make a pause', example_sentence_en: 'Let\'s pause for a break.', example_sentence: '我们暂停休息一下。' },
  { word: 'pay', definition_en: 'Money given for work or goods.', collocation_en: 'monthly pay, equal pay', example_sentence_en: 'Nurses deserve higher pay for their hard work.', example_sentence: '护士的努力工作值得更高的报酬。' },
  { word: 'payment', definition_en: 'The act of paying money.', collocation_en: 'make payment, payment method', example_sentence_en: 'What is your preferred payment method?', example_sentence: '你更喜欢哪种付款方式？' },
  { word: 'peace', definition_en: 'Freedom from war and violence.', collocation_en: 'world peace, live in peace', example_sentence_en: 'We all hope for world peace.', example_sentence: '我们都希望世界和平。' },
  { word: 'peach', definition_en: 'A soft juicy fruit with fuzzy skin.', collocation_en: 'eat peach, sweet peach', example_sentence_en: 'Fresh peaches are delicious in summer.', example_sentence: '新鲜桃子在夏天很好吃。' },
  { word: 'peak', definition_en: 'The top of a mountain.', collocation_en: 'mountain peak, reach peak', example_sentence_en: 'We reached the peak after 4 hours of climbing.', example_sentence: '我们爬了4小时到达了山顶。' },
  { word: 'pear', definition_en: 'A sweet fruit narrower at the stem.', collocation_en: 'eat pear, ripe pear', example_sentence_en: 'Pears are good for your health.', example_sentence: '梨对你的健康有好处。' },
  { word: 'pen', definition_en: 'A tool for writing with ink.', collocation_en: 'write with pen, black pen', example_sentence_en: 'Can I borrow your pen for a moment?', example_sentence: '我能借你的钢笔用一下吗？' },
  { word: 'pencil', definition_en: 'A tool for writing or drawing.', collocation_en: 'write with pencil, sharp pencil', example_sentence_en: 'Always bring two pencils to the test.', example_sentence: '考试总是带两支铅笔。' },
  { word: 'people', definition_en: 'Persons in general.', collocation_en: 'many people, young people', example_sentence_en: 'Many people enjoy listening to music.', example_sentence: '许多人喜欢听音乐。' },
  { word: 'pepper', definition_en: 'A spice used to add flavor to food.', collocation_en: 'black pepper, add pepper', example_sentence_en: 'Add some pepper to make it tastier.', example_sentence: '加点胡椒会更美味。' },
  { word: 'per', definition_en: 'For each; according to.', collocation_en: 'per hour, per day, per person', example_sentence_en: 'The cost is $10 per person.', example_sentence: '费用是每人10美元。' },
  { word: 'percent', definition_en: 'One part in every hundred.', collocation_en: 'ten percent, percent of', example_sentence_en: 'Fifty percent of students passed the exam.', example_sentence: '50%的学生通过了考试。' },
  { word: 'perfect', definition_en: 'Completely correct or excellent.', collocation_en: 'perfect score, perfect answer', example_sentence_en: 'She got a perfect score on the test!', example_sentence: '她考试得了满分！' },
  { word: 'perform', definition_en: 'To do something in front of an audience.', collocation_en: 'perform on stage, perform well', example_sentence_en: 'The band will perform at the concert tonight.', example_sentence: '乐队今晚将在音乐会上表演。' },
  { word: 'performance', definition_en: 'The act of performing for an audience.', collocation_en: 'good performance, give performance', example_sentence_en: 'The students gave an excellent performance.', example_sentence: '学生们表演得非常好。' },
  { word: 'perhaps', definition_en: 'Possibly; maybe.', collocation_en: 'perhaps yes, perhaps not', example_sentence_en: 'Perhaps we can go to the beach tomorrow.', example_sentence: '也许我们明天可以去海滩。' },
  { word: 'period', definition_en: 'A length of time.', collocation_en: 'time period, short period', example_sentence_en: 'We lived there for a short period of time.', example_sentence: '我们在那里住了很短一段时间。' },
  { word: 'permission', definition_en: 'Agreement to do something.', collocation_en: 'ask permission, give permission', example_sentence_en: 'You need permission to leave early.', example_sentence: '你需要许可才能早退。' },
  { word: 'person', definition_en: 'A human being.', collocation_en: 'young person, old person', example_sentence_en: 'That person is very kind and helpful.', example_sentence: '那个人很善良乐于助人。' },
  { word: 'personal', definition_en: 'Relating to one individual.', collocation_en: 'personal opinion, personal information', example_sentence_en: 'Don\'t ask too many personal questions.', example_sentence: '不要问太多私人问题。' },
  { word: 'personality', definition_en: 'The combination of qualities that make a person unique.', collocation_en: 'good personality, strong personality', example_sentence_en: 'She has a very friendly personality.', example_sentence: '她的性格很友善。' },
  { word: 'phone', definition_en: 'A device for talking to people far away.', collocation_en: 'mobile phone, answer phone', example_sentence_en: 'My phone battery is dead.', example_sentence: '我的手机没电了。' },
  { word: 'photo', definition_en: 'A picture made with a camera.', collocation_en: 'take photo, family photo', example_sentence_en: 'Let\'s take a photo together!', example_sentence: '我们一起拍张照吧！' },
  { word: 'photograph', definition_en: 'A picture taken with a camera.', collocation_en: 'take photograph, old photograph', example_sentence_en: 'This photograph brings back good memories.', example_sentence: '这张照片带来了美好的回忆。' },
  { word: 'phrase', definition_en: 'A group of words that express an idea.', collocation_en: 'learn phrase, useful phrase', example_sentence_en: 'What does this phrase mean in English?', example_sentence: '这个短语用英语是什么意思？' },
  { word: 'physical', definition_en: 'Relating to the body.', collocation_en: 'physical education, physical health', example_sentence_en: 'Physical exercise is important for children.', example_sentence: '体育锻炼对孩子很重要。' },
  { word: 'physics', definition_en: 'The scientific study of matter and energy.', collocation_en: 'study physics, physics class', example_sentence_en: 'Physics helps us understand how things work.', example_sentence: '物理帮助我们理解事物如何运作。' },
  { word: 'piano', definition_en: 'A large musical instrument with keys.', collocation_en: 'play piano, piano lesson', example_sentence_en: 'She has been playing piano for 5 years.', example_sentence: '她弹钢琴已经5年了。' },
  { word: 'pick', definition_en: 'The best choice or selection.', collocation_en: 'first pick, make a pick', example_sentence_en: 'He was the first pick for the team.', example_sentence: '他是队伍的首选。' },
  { word: 'picnic', definition_en: 'A meal eaten outdoors.', collocation_en: 'go picnic, have picnic', example_sentence_en: 'Let\'s have a picnic in the park this Sunday!', example_sentence: '我们这周日去公园野餐吧！' },
  { word: 'picture', definition_en: 'A drawing or painting.', collocation_en: 'draw picture, take picture', example_sentence_en: 'This picture is so beautiful!', example_sentence: '这幅画太美了！' },
  { word: 'pie', definition_en: 'A baked dish with fruit or meat in pastry.', collocation_en: 'apple pie, piece of pie', example_sentence_en: 'Grandma makes the best apple pie.', example_sentence: '奶奶做的苹果派最好吃。' },
  { word: 'piece', definition_en: 'A part of something.', collocation_en: 'piece of cake, piece of paper', example_sentence_en: 'Can I have another piece of cake?', example_sentence: '我能再来块蛋糕吗？' },
  { word: 'pig', definition_en: 'A pink farm animal.', collocation_en: 'farm pig, little pig', example_sentence_en: 'Pigs are very intelligent animals.', example_sentence: '猪是非常聪明的动物。' },
  { word: 'pile', definition_en: 'A heap of things.', collocation_en: 'pile of books, pile up', example_sentence_en: 'There is a pile of clothes on the bed.', example_sentence: '床上有堆衣服。' },
  { word: 'pillow', definition_en: 'A cloth bag filled with soft material for resting your head.', collocation_en: 'sleep on pillow, soft pillow', example_sentence_en: 'I need a new pillow for my bed.', example_sentence: '我的床需要一个新枕头。' },
  { word: 'pilot', definition_en: 'A person who flies an airplane.', collocation_en: 'airplane pilot, become pilot', example_sentence_en: 'Her dream is to become a pilot.', example_sentence: '她的梦想是成为飞行员。' },
  { word: 'ping-pong', definition_en: 'A game played with small bats and a light ball.', collocation_en: 'play ping-pong, ping-pong ball', example_sentence_en: 'Let\'s play ping-pong after school!', example_sentence: '我们放学后打乒乓球吧！' },
  { word: 'pink', definition_en: 'A pale red color.', collocation_en: 'pink dress, light pink', example_sentence_en: 'She wore a beautiful pink dress.', example_sentence: '她穿了漂亮的粉色裙子。' },
  { word: 'pipe', definition_en: 'A tube for carrying water or gas.', collocation_en: 'water pipe, metal pipe', example_sentence_en: 'The water pipe is broken.', example_sentence: '水管破了。' },
  { word: 'pitch', definition_en: 'To throw a ball; or an area for playing sports.', collocation_en: 'pitch ball, football pitch', example_sentence_en: 'He can pitch really fast!', example_sentence: '他能投得很快！' },
  { word: 'place', definition_en: 'A particular position or point.', collocation_en: 'meet place, living place', example_sentence_en: 'This is my favorite place to read.', example_sentence: '这是我喜欢读书的地方。' },
  { word: 'plain', definition_en: 'Simple and without decoration.', collocation_en: 'plain white, quite plain', example_sentence_en: 'I prefer plain clothes without patterns.', example_sentence: '我更喜欢没有图案的素色衣服。' },
  { word: 'plan', definition_en: 'A detailed proposal for doing something.', collocation_en: 'make plan, business plan', example_sentence_en: 'We need a plan for our project.', example_sentence: '我们的项目需要一个计划。' },
  { word: 'plane', definition_en: 'A flying vehicle with wings.', collocation_en: 'by plane, board plane', example_sentence_en: 'We traveled to London by plane.', example_sentence: '我们坐飞机去伦敦。' },
  { word: 'planet', definition_en: 'A large body moving around the sun.', collocation_en: 'planet Earth, other planets', example_sentence_en: 'Earth is the only planet with life.', example_sentence: '地球是唯一有生命的行星。' },
  { word: 'plant', definition_en: 'A living thing with leaves and roots.', collocation_en: 'grow plant, green plant', example_sentence_en: 'Plants need sunlight and water to grow.', example_sentence: '植物需要阳光和水才能生长。' },
  { word: 'plastic', definition_en: 'A light synthetic material.', collocation_en: 'plastic bag, plastic bottle', example_sentence_en: 'We should reduce plastic waste.', example_sentence: '我们应该减少塑料垃圾。' },
  { word: 'plate', definition_en: 'A flat dish for eating from.', collocation_en: 'dinner plate, clean plate', example_sentence_en: 'Please put your dirty plate in the sink.', example_sentence: '请把脏盘子放在水槽里。' },
  { word: 'play', definition_en: 'Activity done for enjoyment.', collocation_en: 'watch play, role play', example_sentence_en: 'We watched a play at the theater.', example_sentence: '我们在剧院看了场话剧。' },
  { word: 'player', definition_en: 'A person who plays a game or sport.', collocation_en: 'football player, music player', example_sentence_en: 'He is the best player on the team.', example_sentence: '他是队里最好的球员。' },
  { word: 'playground', definition_en: 'An outdoor area for children to play.', collocation_en: 'school playground, in playground', example_sentence_en: 'Children love playing in the playground.', example_sentence: '孩子们喜欢在游乐场玩。' },
  { word: 'pleasant', definition_en: 'Nice or enjoyable.', collocation_en: 'very pleasant, pleasant surprise', example_sentence_en: 'We had a pleasant evening together.', example_sentence: '我们一起度过了一个愉快的晚上。' },
  { word: 'please', definition_en: 'Used to make polite requests.', collocation_en: 'please help, please come', example_sentence_en: 'Please close the door on your way out.', example_sentence: '出去时请关门。' },
  { word: 'pleasure', definition_en: 'A feeling of happiness or satisfaction.', collocation_en: 'great pleasure, with pleasure', example_sentence_en: 'It\'s a pleasure to meet you.', example_sentence: '很高兴见到你。' },
  { word: 'plot', definition_en: 'A secret plan; or the events in a story.', collocation_en: 'plot of story, secret plot', example_sentence_en: 'The plot of this movie is very exciting.', example_sentence: '这部电影的故事情节很刺激。' },
  { word: 'pocket', definition_en: 'A small bag sewn into clothes.', collocation_en: 'in pocket, empty pocket', example_sentence_en: 'I put my keys in my pocket.', example_sentence: '我把钥匙放在口袋里。' },
  { word: 'poem', definition_en: 'A piece of writing in verse form.', collocation_en: 'write poem, read poem', example_sentence_en: 'The student wrote a beautiful poem.', example_sentence: '那个学生写了一首优美的诗。' },
  { word: 'poet', definition_en: 'A person who writes poems.', collocation_en: 'famous poet, become poet', example_sentence_en: 'Li Bai is one of China\'s greatest poets.', example_sentence: '李白是中国最伟大的诗人之一。' },
  { word: 'poetry', definition_en: 'Poems in general as a form of literature.', collocation_en: 'love poetry, read poetry', example_sentence_en: 'Our class is studying poetry this month.', example_sentence: '我们班这个月在学诗歌。' },
  { word: 'point', definition_en: 'The main idea or purpose.', collocation_en: 'main point, make a point', example_sentence_en: 'What\'s the point of this discussion?', example_sentence: '这个讨论的重点是什么？' },
  { word: 'police', definition_en: 'The official force responsible for keeping order.', collocation_en: 'call police, police officer', example_sentence_en: 'Call the police if you see anything suspicious.', example_sentence: '如果你看到可疑的事情，报警。' },
  { word: 'policy', definition_en: 'A set of rules for a organization or government.', collocation_en: 'company policy, government policy', example_sentence_en: 'You need to follow the school policy.', example_sentence: '你需要遵守学校政策。' },
  { word: 'polite', definition_en: 'Having good manners.', collocation_en: 'very polite, be polite', example_sentence_en: 'It\'s important to be polite to everyone.', example_sentence: '对每个人都有礼貌很重要。' },
  { word: 'political', definition_en: 'Related to government and politics.', collocation_en: 'political party, political leader', example_sentence_en: 'We should learn about political issues.', example_sentence: '我们应该了解政治问题。' },
  { word: 'politics', definition_en: 'Activities related to government.', collocation_en: 'study politics, world politics', example_sentence_en: 'My uncle is very interested in politics.', example_sentence: '我叔叔对政治很感兴趣。' },
  { word: 'pollution', definition_en: 'Damage to the environment.', collocation_en: 'air pollution, water pollution', example_sentence_en: 'Air pollution is a big problem in cities.', example_sentence: '空气污染是城市的大问题。' },
  { word: 'pool', definition_en: 'A small area of water.', collocation_en: 'swimming pool, in pool', example_sentence_en: 'Let\'s go swimming in the pool!', example_sentence: '我们去游泳池游泳吧！' },
  { word: 'poor', definition_en: 'Having little money; not good.', collocation_en: 'very poor, poor family', example_sentence_en: 'We should help poor people in our community.', example_sentence: '我们应该帮助社区里的穷人。' },
  { word: 'popular', definition_en: 'Liked by many people.', collocation_en: 'very popular, popular song', example_sentence_en: 'That restaurant is very popular with students.', example_sentence: '那家餐厅很受学生欢迎。' },
  { word: 'population', definition_en: 'All the people living in a place.', collocation_en: 'large population, city population', example_sentence_en: 'What is the population of your city?', example_sentence: '你们城市的人口是多少？' },
  { word: 'pork', definition_en: 'Meat from a pig.', collocation_en: 'eat pork, cook pork', example_sentence_en: 'Some people don\'t eat pork for religious reasons.', example_sentence: '有些人因宗教原因不吃猪肉。' },
  { word: 'port', definition_en: 'A place where ships load and unload.', collocation_en: 'sea port, ship port', example_sentence_en: 'Shanghai is a major port city in China.', example_sentence: '上海是中国主要的港口城市。' },
  { word: 'position', definition_en: 'The place where something is.', collocation_en: 'current position, in position', example_sentence_en: 'Can you find our position on the map?', example_sentence: '你能在地图上找到我们的位置吗？' },
  { word: 'positive', definition_en: 'Good or hopeful.', collocation_en: 'very positive, positive attitude', example_sentence_en: 'She always has a positive attitude.', example_sentence: '她总是持积极的态度。' },
  { word: 'possibility', definition_en: 'Something that might exist or happen.', collocation_en: 'explore possibility, real possibility', example_sentence_en: 'We need to explore all possibilities.', example_sentence: '我们需要探索所有可能性。' },
  { word: 'possible', definition_en: 'Able to happen or exist.', collocation_en: 'if possible, as soon as possible', example_sentence_en: 'I will come as soon as possible.', example_sentence: '我会尽快来。' },
  { word: 'possibly', definition_en: 'Perhaps; maybe.', collocation_en: 'possibly yes, possibly not', example_sentence_en: 'Can you possibly help me with this?', example_sentence: '你能帮我做这个吗？' },
  { word: 'post', definition_en: 'To send a letter or package by mail.', collocation_en: 'post letter, post online', example_sentence_en: 'Did you post my letter yet?', example_sentence: '你寄我的信了吗？' },
  { word: 'post office', definition_en: 'A place where you send and receive mail.', collocation_en: 'go to post office', example_sentence_en: 'I need to go to the post office to mail a package.', example_sentence: '我需要去邮局寄包裹。' },
  { word: 'poster', definition_en: 'A large printed notice or picture.', collocation_en: 'put up poster, movie poster', example_sentence_en: 'We put up posters to advertise the event.', example_sentence: '我们张贴海报来宣传这个活动。' },
  { word: 'pot', definition_en: 'A container for cooking.', collocation_en: 'cooking pot, flower pot', example_sentence_en: 'Use a big pot to make the soup.', example_sentence: '用大锅做汤。' },
  { word: 'potato', definition_en: 'A round vegetable that grows underground.', collocation_en: 'mashed potato, baked potato', example_sentence_en: 'Would you like mashed or baked potato?', example_sentence: '你想要土豆泥还是烤土豆？' },
  { word: 'potential', definition_en: 'Possible in the future.', collocation_en: 'great potential, full potential', example_sentence_en: 'This student has great potential.', example_sentence: '这个学生潜力很大。' },
  { word: 'pound', definition_en: 'A unit of weight or money.', collocation_en: 'one pound, half pound', example_sentence_en: 'I need a pound of sugar for this recipe.', example_sentence: '这个配方我需要一磅糖。' },
  { word: 'pour', definition_en: 'To make a liquid flow from a container.', collocation_en: 'pour water, pour into', example_sentence_en: 'Please pour me a cup of tea.', example_sentence: '请给我倒杯茶。' },
  { word: 'powder', definition_en: 'Dry solid in very small pieces.', collocation_en: 'baking powder, milk powder', example_sentence_en: 'Add a little baking powder to make it rise.', example_sentence: '加一点泡打粉让它发起来。' },
  { word: 'power', definition_en: 'Energy or strength.', collocation_en: 'electric power, great power', example_sentence_en: 'The power went out during the storm.', example_sentence: '暴风雨期间停电了。' },
  { word: 'powerful', definition_en: 'Having great power or strength.', collocation_en: 'very powerful, powerful computer', example_sentence_en: 'This computer is very powerful.', example_sentence: '这台电脑非常强大。' },
  { word: 'practical', definition_en: 'Useful and suitable for actual use.', collocation_en: 'very practical, practical solution', example_sentence_en: 'We need a practical solution to this problem.', example_sentence: '我们需要一个实用的解决方案。' },
  { word: 'practice', definition_en: 'Doing something repeatedly to improve.', collocation_en: 'practice English, daily practice', example_sentence_en: 'You need to practice English every day.', example_sentence: '你需要每天练习英语。' },
  { word: 'praise', definition_en: 'To express approval or admiration.', collocation_en: 'praise for, highly praise', example_sentence_en: 'The teacher praised him for his good work.', example_sentence: '老师表扬了他的好作业。' },
  { word: 'prefer', definition_en: 'To like one thing more than another.', collocation_en: 'prefer doing, prefer to', example_sentence_en: 'I prefer reading e-books than paper books.', example_sentence: '比起纸质书，我更喜欢读电子书。' },
  { word: 'preference', definition_en: 'A greater liking for one thing over another.', collocation_en: 'have preference, personal preference', example_sentence_en: 'What is your preference for lunch?', example_sentence: '你午餐偏好什么？' },
  { word: 'pregnant', definition_en: 'Having a baby developing inside the body.', collocation_en: 'become pregnant, pregnant woman', example_sentence_en: 'She is pregnant with her second child.', example_sentence: '她怀了第二个孩子。' },
  { word: 'prepare', definition_en: 'To make ready for something.', collocation_en: 'prepare for, prepare food', example_sentence_en: 'The students are preparing for the exam.', example_sentence: '学生们正在准备考试。' },
  { word: 'preparation', definition_en: 'The act of making something ready.', collocation_en: 'make preparation, in preparation', example_sentence_en: 'Preparation is key to success.', example_sentence: '准备是成功的关键。' },
  { word: 'present', definition_en: 'A thing given to someone as a gift.', collocation_en: 'birthday present, give present', example_sentence_en: 'What did you get as a birthday present?', example_sentence: '你生日收到了什么礼物？' },
  { word: 'presentation', definition_en: 'A talk showing information to an audience.', collocation_en: 'give presentation, make presentation', example_sentence_en: 'She gave an excellent presentation.', example_sentence: '她做了一个精彩的演讲。' },
  { word: 'preserve', definition_en: 'To keep something in its original state.', collocation_en: 'preserve food, preserve environment', example_sentence_en: 'We must preserve our natural resources.', example_sentence: '我们必须保护我们的自然资源。' },
  { word: 'president', definition_en: 'The head of a country or organization.', collocation_en: 'country president, company president', example_sentence_en: 'The president visited our school yesterday.', example_sentence: '总统昨天访问了我们学校。' },
  { word: 'press', definition_en: 'To push firmly on something.', collocation_en: 'press button, press hard', example_sentence_en: 'Press this button to start.', example_sentence: '按这个按钮开始。' },
  { word: 'pressure', definition_en: 'The force of pushing on something.', collocation_en: 'under pressure, high pressure', example_sentence_en: 'Don\'t put too much pressure on yourself.', example_sentence: '不要给自己太大压力。' },
  { word: 'pretend', definition_en: 'To act as if something is true when it is not.', collocation_en: 'pretend to, just pretend', example_sentence_en: 'Let\'s pretend we are explorers!', example_sentence: '让我们假装是探险家！' },
  { word: 'pretty', definition_en: 'Attractive in a delicate way.', collocation_en: 'very pretty, quite pretty', example_sentence_en: 'You look pretty in that dress!', example_sentence: '你穿那件裙子很漂亮！' },
  { word: 'prevent', definition_en: 'To stop something from happening.', collocation_en: 'prevent from, prevent disease', example_sentence_en: 'Exercise can prevent many health problems.', example_sentence: '运动可以预防许多健康问题。' },
  { word: 'previous', definition_en: 'Happening or existing before.', collocation_en: 'previous day, previous experience', example_sentence_en: 'I couldn\'t attend the previous meeting.', example_sentence: '我没能参加上次会议。' },
  { word: 'price', definition_en: 'The amount of money needed to buy something.', collocation_en: 'high price, low price', example_sentence_en: 'The price of this book is reasonable.', example_sentence: '这本书的价格合理。' },
  { word: 'pride', definition_en: 'A feeling of satisfaction in yourself.', collocation_en: 'take pride in, sense of pride', example_sentence_en: 'She takes pride in her work.', example_sentence: '她为她的工作感到自豪。' },
  { word: 'primary', definition_en: 'Most important; first.', collocation_en: 'primary school, primary reason', example_sentence_en: 'English is my primary focus this year.', example_sentence: '英语是我今年的主要关注点。' },
  { word: 'prime', definition_en: 'Main or most important.', collocation_en: 'prime minister, prime example', example_sentence_en: 'The prime minister will visit next week.', example_sentence: '首相下周将访问。' },
  { word: 'print', definition_en: 'Text or pictures produced on paper.', collocation_en: 'small print, in print', example_sentence_en: 'The print is too small to read.', example_sentence: '印刷字体太小看不清。' },
  { word: 'printer', definition_en: 'A machine that prints documents.', collocation_en: 'connect printer, use printer', example_sentence_en: 'The printer is out of ink.', example_sentence: '打印机没墨了。' },
  { word: 'priority', definition_en: 'Something more important than others.', collocation_en: 'high priority, first priority', example_sentence_en: 'Safety is our top priority.', example_sentence: '安全是我们的首要任务。' },
  { word: 'prison', definition_en: 'A place where criminals are kept.', collocation_en: 'go to prison, in prison', example_sentence_en: 'The thief was sent to prison for stealing.', example_sentence: '小偷因偷窃被送进监狱。' },
  { word: 'private', definition_en: 'Not for public viewing.', collocation_en: 'private property, keep private', example_sentence_en: 'This is a private conversation.', example_sentence: '这是私人谈话。' },
  { word: 'prize', definition_en: 'Something given to a winner.', collocation_en: 'win prize, first prize', example_sentence_en: 'She won first prize in the competition!', example_sentence: '她在比赛中获得了一等奖！' },
  { word: 'probable', definition_en: 'Likely to happen.', collocation_en: 'quite probable, highly probable', example_sentence_en: 'It is probable that it will rain today.', example_sentence: '今天很可能下雨。' },
  { word: 'probably', definition_en: 'Most likely.', collocation_en: 'probably yes, probably not', example_sentence_en: 'I\'ll probably be home by 6 PM.', example_sentence: '我可能晚上6点到家。' },
  { word: 'problem', definition_en: 'A difficult situation that needs solving.', collocation_en: 'big problem, solve problem', example_sentence_en: 'Can you help me solve this math problem?', example_sentence: '你能帮我解这道数学题吗？' },
  { word: 'procedure', definition_en: 'A way of doing something.', collocation_en: 'follow procedure, safety procedure', example_sentence_en: 'Please follow the emergency procedure.', example_sentence: '请遵循应急程序。' },
  { word: 'proceed', definition_en: 'To continue doing something.', collocation_en: 'proceed with, please proceed', example_sentence_en: 'Please proceed with your presentation.', example_sentence: '请继续你的演示。' },
  { word: 'process', definition_en: 'A series of actions to achieve something.', collocation_en: 'learning process, manufacturing process', example_sentence_en: 'Learning a language is a slow process.', example_sentence: '学习语言是一个缓慢的过程。' },
  { word: 'produce', definition_en: 'Things that have been grown or made.', collocation_en: 'farm produce, fresh produce', example_sentence_en: 'The market sells local farm produce.', example_sentence: '市场出售当地农产品。' },
  { word: 'product', definition_en: 'Something that is made to be sold.', collocation_en: 'new product, sell product', example_sentence_en: 'This company makes electronic products.', example_sentence: '这家公司生产电子产品。' },
  { word: 'production', definition_en: 'The act of making something.', collocation_en: 'mass production, film production', example_sentence_en: 'The factory increased car production.', example_sentence: '工厂增加了汽车产量。' },
  { word: 'profession', definition_en: 'A job that needs special training.', collocation_en: 'medical profession, legal profession', example_sentence_en: 'Teaching is a noble profession.', example_sentence: '教学是一个高尚的职业。' },
  { word: 'professional', definition_en: 'Doing something for money; expert.', collocation_en: 'professional player, look professional', example_sentence_en: 'He is a professional football player.', example_sentence: '他是职业足球运动员。' },
  { word: 'professor', definition_en: 'A teacher at a university.', collocation_en: 'university professor, become professor', example_sentence_en: 'The professor gave an interesting lecture.', example_sentence: '教授做了一个有趣的讲座。' },
  { word: 'profile', definition_en: 'A description of someone or something.', collocation_en: 'user profile, company profile', example_sentence_en: 'Please complete your profile information.', example_sentence: '请完成你的个人资料信息。' },
  { word: 'profit', definition_en: 'Money earned from business.', collocation_en: 'make profit, net profit', example_sentence_en: 'The company made a huge profit last year.', example_sentence: '公司去年利润很高。' },
  { word: 'program', definition_en: 'A plan of things to be done; or computer software.', collocation_en: 'computer program, training program', example_sentence_en: 'I\'m learning to write computer programs.', example_sentence: '我在学习编写电脑程序。' },
  { word: 'progress', definition_en: 'Movement towards a better state.', collocation_en: 'make progress, good progress', example_sentence_en: 'You\'re making good progress in English!', example_sentence: '你的英语进步很大！' },
  { word: 'project', definition_en: 'A planned piece of work.', collocation_en: 'school project, complete project', example_sentence_en: 'We are working on a science project.', example_sentence: '我们正在做一个科学项目。' },
  { word: 'promise', definition_en: 'A statement that you will definitely do something.', collocation_en: 'make promise, keep promise', example_sentence_en: 'I made a promise to call her every week.', example_sentence: '我承诺每周给她打电话。' },
  { word: 'promote', definition_en: 'To help something develop or increase.', collocation_en: 'promote product, promote health', example_sentence_en: 'The campaign promotes healthy eating.', example_sentence: '这个活动推广健康饮食。' },
  { word: 'promotion', definition_en: 'Being given a higher position at work.', collocation_en: 'get promotion, job promotion', example_sentence_en: 'She got a promotion to manager.', example_sentence: '她升职为经理了。' },
  { word: 'prompt', definition_en: 'To cause something to happen.', collocation_en: 'prompt action, prompt response', example_sentence_en: 'His question prompted an interesting discussion.', example_sentence: '他的问题引发了有趣的讨论。' },
  { word: 'proof', definition_en: 'Evidence that shows something is true.', collocation_en: 'show proof, have proof', example_sentence_en: 'Do you have any proof of your identity?', example_sentence: '你有身份证明吗？' },
  { word: 'proper', definition_en: 'Correct or suitable.', collocation_en: 'proper way, proper care', example_sentence_en: 'Please use the proper tools for the job.', example_sentence: '请使用合适的工具做这项工作。' },
  { word: 'properly', definition_en: 'In a correct or suitable way.', collocation_en: 'work properly, behave properly', example_sentence_en: 'This machine isn\'t working properly.', example_sentence: '这台机器运转不正常。' },
  { word: 'property', definition_en: 'A thing or things owned by someone.', collocation_en: 'private property, own property', example_sentence_en: 'Respect other people\'s property.', example_sentence: '尊重他人的财产。' },
  { word: 'proposal', definition_en: 'A plan or suggestion offered to people.', collocation_en: 'make proposal, accept proposal', example_sentence_en: 'The committee accepted our proposal.', example_sentence: '委员会接受了我们的提议。' },
  { word: 'propose', definition_en: 'To suggest a plan or idea.', collocation_en: 'propose change, propose to do', example_sentence_en: 'I propose that we take a break now.', example_sentence: '我建议我们现在休息一下。' },
  { word: 'prospect', definition_en: 'The possibility that something will happen.', collocation_en: 'good prospect, future prospect', example_sentence_en: 'The job has good career prospects.', example_sentence: '这份工作有很好的职业前景。' },
  { word: 'protect', definition_en: 'To keep someone or something safe.', collocation_en: 'protect environment, protect from', example_sentence_en: 'We must protect our environment.', example_sentence: '我们必须保护环境。' },
  { word: 'protection', definition_en: 'The act of keeping something safe.', collocation_en: 'need protection, give protection', example_sentence_en: 'Wear sunscreen for sun protection.', example_sentence: '涂防晒霜以防晒。' },
  { word: 'protective', definition_en: 'Wanting to keep someone safe.', collocation_en: 'protective parent, very protective', example_sentence_en: 'He is very protective of his younger sister.', example_sentence: '他很保护他的妹妹。' },
  { word: 'proud', definition_en: 'Feeling pleased about achievements.', collocation_en: 'proud of, very proud', example_sentence_en: 'I am proud of your success!', example_sentence: '我为你的成功感到骄傲！' },
  { word: 'prove', definition_en: 'To show something is true.', collocation_en: 'prove that, prove to be', example_sentence_en: 'Can you prove you are right?', example_sentence: '你能证明你是对的吗？' },
  { word: 'provide', definition_en: 'To give or supply something.', collocation_en: 'provide for, provide with', example_sentence_en: 'The sun provides light and warmth.', example_sentence: '太阳提供光和热。' },
  { word: 'provider', definition_en: 'A person or company that supplies something.', collocation_en: 'service provider, internet provider', example_sentence_en: 'Choose a reliable internet provider.', example_sentence: '选择一个可靠的互联网供应商。' },
  { word: 'province', definition_en: 'A region of a country.', collocation_en: 'visit province, local province', example_sentence_en: 'Which province do you live in?', example_sentence: '你住在哪个省？' },
  { word: 'provision', definition_en: 'The act of supplying something.', collocation_en: 'make provision, food provision', example_sentence_en: 'Make provision for unexpected costs.', example_sentence: '为意外费用做好准备。' },
  { word: 'public', definition_en: 'For all people to see or use.', collocation_en: 'public place, public transport', example_sentence_en: 'Libraries are public places.', example_sentence: '图书馆是公共场所。' },
  { word: 'publish', definition_en: 'To prepare and print a book for sale.', collocation_en: 'publish book, publish article', example_sentence_en: 'When will the new book be published?', example_sentence: '这本新书什么时候出版？' },
  { word: 'pull', definition_en: 'The act of drawing something towards you.', collocation_en: 'give a pull, sharp pull', example_sentence_en: 'Give the door a pull to open it.', example_sentence: '拉门打开它。' },
  { word: 'pump', definition_en: 'A machine for moving liquid or air.', collocation_en: 'water pump, gas pump', example_sentence_en: 'The water pump supplies water to the house.', example_sentence: '水泵为房子供水。' },
  { word: 'punish', definition_en: 'To make someone suffer for wrong behavior.', collocation_en: 'punish for, punish severely', example_sentence_en: 'Parents should not punish children too harshly.', example_sentence: '父母不应该太严厉地惩罚孩子。' },
  { word: 'punishment', definition_en: 'Suffering for doing something wrong.', collocation_en: 'receive punishment, severe punishment', example_sentence_en: 'The punishment for cheating is expulsion.', example_sentence: '对作弊的惩罚是开除。' },
  { word: 'pupil', definition_en: 'A student in school.', collocation_en: 'school pupil, good pupil', example_sentence_en: 'Every pupil must wear a uniform.', example_sentence: '每个学生必须穿校服。' },
  { word: 'purchase', definition_en: 'To buy something.', collocation_en: 'purchase online, make purchase', example_sentence_en: 'I purchased this book online.', example_sentence: '我在网上买了这本书。' },
  { word: 'pure', definition_en: 'Not mixed with anything else.', collocation_en: 'pure water, 100% pure', example_sentence_en: 'This juice is made from pure fruit.', example_sentence: '这果汁是用纯水果做的。' },
  { word: 'purpose', definition_en: 'The reason for doing something.', collocation_en: 'main purpose, serve purpose', example_sentence_en: 'What is the purpose of your visit?', example_sentence: '你来访的目的是什么？' },
  { word: 'purse', definition_en: 'A small bag for carrying money.', collocation_en: 'carry purse, leather purse', example_sentence_en: 'She keeps her money in a purse.', example_sentence: '她把钱放在钱包里。' },
  { word: 'pursue', definition_en: 'To follow or chase something.', collocation_en: 'pursue dream, pursue career', example_sentence_en: 'You should pursue your dreams.', example_sentence: '你应该追求你的梦想。' },
  { word: 'push', definition_en: 'Using force to move something away.', collocation_en: 'give push, hard push', example_sentence_en: 'The car won\'t start - we need a push.', example_sentence: '车发动不了 - 我们需要推一下。' },
  { word: 'put', definition_en: 'To move something into a place.', collocation_en: 'put away, put on', example_sentence_en: 'Where did you put my book?', example_sentence: '你把我的书放哪儿了？' }
]

async function updateBatch4() {
  console.log('🎓 开始更新第4批高质量数据（P组110个词）\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = batch4HighQuality
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

  console.log(`✅ 找到 ${wordsToUpdate.length} 个P组词在数据库中\n`)
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

  console.log('\n\n✅ 第4批更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)

  console.log('\n🎉 P组词汇更新完成')
}

updateBatch4()
