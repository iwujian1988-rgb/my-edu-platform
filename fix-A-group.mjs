/**
 * 批量修复A组词汇（55个）
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// A组高质量数据
const aGroupData = [
  { word: 'agenda', definition_en: 'A list of items to be discussed at a meeting.', collocation_en: 'on the agenda, meeting agenda', example_sentence_en: 'Climate change is at the top of the agenda.', example_sentence: '气候变化是议程的首要议题。' },
  { word: 'as well as', definition_en: 'In addition to; also.', collocation_en: 'as well as', example_sentence_en: 'She speaks French as well as Spanish.', example_sentence: '她除了西班牙语还会说法语。' },
  { word: 'analysis', definition_en: 'A detailed examination of something.', collocation_en: 'detailed analysis, make an analysis', example_sentence_en: 'We need a careful analysis of the problem.', example_sentence: '我们需要对这个问题进行仔细分析。' },
  { word: 'agreement', definition_en: 'When people have the same opinion.', collocation_en: 'reach agreement, make an agreement', example_sentence_en: 'Finally, we reached an agreement.', example_sentence: '最后，我们达成了协议。' },
  { word: 'actor', definition_en: 'A person who performs in plays or movies.', collocation_en: 'famous actor, become actor', example_sentence_en: 'He is a talented actor.', example_sentence: '他是个有天赋的演员。' },
  { word: 'advertisement', definition_en: 'A notice to promote a product or service.', collocation_en: 'watch advertisement, place advertisement', example_sentence_en: 'I saw an advertisement for the job.', example_sentence: '我看到了这个工作的广告。' },
  { word: 'assistant', definition_en: 'A person who helps in their work.', collocation_en: 'shop assistant, personal assistant', example_sentence_en: 'She works as a teaching assistant.', example_sentence: '她担任助教。' },
  { word: 'airport', definition_en: 'A place where airplanes take off and land.', collocation_en: 'go to airport, at the airport', example_sentence_en: 'We need to get to the airport by 5 PM.', example_sentence: '我们需要在下午5点前到达机场。' },
  { word: 'ambulance', definition_en: 'A vehicle that takes sick people to hospital.', collocation_en: 'call ambulance, ambulance service', example_sentence_en: 'Call an ambulance - he\'s hurt badly!', example_sentence: '叫救护车 - 他伤得很重！' },
  { word: 'apartment', definition_en: 'A set of rooms for living in.', collocation_en: 'rent apartment, small apartment', example_sentence_en: 'They live in a nice apartment near the park.', example_sentence: '他们住在公园附近的一间好公寓里。' },
  { word: 'able', definition_en: 'Having the power or skill to do something.', collocation_en: 'be able to, able to do', example_sentence_en: 'I will be able to finish tomorrow.', example_sentence: '我明天能完成。' },
  { word: 'about', definition_en: 'On the subject of; concerning.', collocation_en: 'talk about, think about', example_sentence_en: 'Tell me about your family.', example_sentence: '告诉我关于你家庭的事。' },
  { word: 'above', definition_en: 'At a higher level or position.', collocation_en: 'above all, above table', example_sentence_en: 'The picture is above the sofa.', example_sentence: '画在沙发上方。' },
  { word: 'abroad', definition_en: 'In or to a foreign country.', collocation_en: 'go abroad, study abroad', example_sentence_en: 'She plans to study abroad next year.', example_sentence: '她计划明年出国留学。' },
  { word: 'absence', definition_en: 'Not being present.', collocation_en: 'in absence, absence from', example_sentence_en: 'His absence was noticed by everyone.', example_sentence: '大家都注意到了他的缺席。' },
  { word: 'absent', definition_en: 'Not present; missing.', collocation_en: 'be absent, absent from', example_sentence_en: 'Why was he absent from school yesterday?', example_sentence: '他昨天为什么没来上学？' },
  { word: 'absolute', definition_en: 'Complete; total.', collocation_en: 'absolute power, absolute certainty', example_sentence_en: 'I have absolute confidence in her.', example_sentence: '我对她完全有信心。' },
  { word: 'absolutely', definition_en: 'Completely; totally.', collocation_en: 'absolutely sure, absolutely right', example_sentence_en: 'You are absolutely correct!', example_sentence: '你完全正确！' },
  { word: 'absorb', definition_en: 'To take in or soak up something.', collocation_en: 'absorb water, absorb knowledge', example_sentence_en: 'Plants absorb water through their roots.', example_sentence: '植物通过根部吸收水分。' },
  { word: 'abstract', definition_en: 'Existing in thought or as an idea.', collocation_en: 'abstract concept, abstract art', example_sentence_en: 'Truth and beauty are abstract concepts.', example_sentence: '真和美是抽象概念。' },
  { word: 'academic', definition_en: 'Related to education and scholarship.', collocation_en: 'academic year, academic achievement', example_sentence_en: 'She has excellent academic performance.', example_sentence: '她学业成绩优异。' },
  { word: 'academy', definition_en: 'A school or institution for special training.', collocation_en: 'art academy, police academy', example_sentence_en: 'He graduated from the military academy.', example_sentence: '他毕业于军校。' },
  { word: 'accelerate', definition_en: 'To make something go faster.', collocation_en: 'accelerate speed, accelerate growth', example_sentence_en: 'The car began to accelerate.', example_sentence: '汽车开始加速。' },
  { word: 'accent', definition_en: 'A way of pronouncing words.', collocation_en: 'foreign accent, strong accent', example_sentence_en: 'She speaks English with a French accent.', example_sentence: '她说法语带有法国口音。' },
  { word: 'accept', definition_en: 'To agree to take something.', collocation_en: 'accept offer, accept invitation', example_sentence_en: 'I happily accepted the invitation.', example_sentence: '我愉快地接受了邀请。' },
  { word: 'acceptable', definition_en: 'Good enough to be received.', collocation_en: 'acceptable level, quite acceptable', example_sentence_en: 'Your work is acceptable but could be better.', example_sentence: '你的工作还可以接受，但可以更好。' },
  { word: 'access', definition_en: 'The right or opportunity to use something.', collocation_en: 'have access, internet access', example_sentence_en: 'All students have access to the library.', example_sentence: '所有学生都能使用图书馆。' },
  { word: 'accessible', definition_en: 'Easy to reach or enter.', collocation_en: 'easily accessible, accessible to', example_sentence_en: 'The beach is accessible by car.', example_sentence: '开车可以到海滩。' },
  { word: 'accident', definition_en: 'Something bad that happens unexpectedly.', collocation_en: 'car accident, have accident', example_sentence_en: 'He was late because he had a car accident.', example_sentence: '他因为车祸迟到了。' },
  { word: 'accompany', definition_en: 'To go somewhere with someone.', collocation_en: 'accompany by, accompany someone', example_sentence_en: 'May I accompany you home?', example_sentence: '我可以陪你回家吗？' },
  { word: 'accomplish', definition_en: 'To succeed in doing something.', collocation_en: 'accomplish goal, accomplish task', example_sentence_en: 'We accomplished a lot today.', example_sentence: '我们今天完成了很多事。' },
  { word: 'accordance', definition_en: 'Following a rule or agreement.', collocation_en: 'in accordance with', example_sentence_en: 'Everything was done in accordance with the plan.', example_sentence: '一切都是按照计划完成的。' },
  { word: 'according', definition_en: 'As stated by someone or something.', collocation_en: 'according to', example_sentence_en: 'According to the weather report, it will rain.', example_sentence: '根据天气预报，会下雨。' },
  { word: 'account', definition_en: 'A record of money; or a description of an event.', collocation_en: 'bank account, take account', example_sentence_en: 'I opened a new bank account.', example_sentence: '我开了一个新银行账户。' },
  { word: 'accountant', definition_en: 'A person who keeps financial records.', collocation_en: 'work as accountant, chartered accountant', example_sentence_en: 'My sister is an accountant.', example_sentence: '我姐姐是会计师。' },
  { word: 'accumulate', definition_en: 'To gather together over time.', collocation_en: 'accumulate wealth, accumulate knowledge', example_sentence_en: 'Dust accumulates if you don\'t clean.', example_sentence: '如果不打扫，灰尘会积聚。' },
  { word: 'accurate', definition_en: 'Correct and exact.', collocation_en: 'accurate information, very accurate', example_sentence_en: 'Please give me accurate information.', example_sentence: '请给我准确的信息。' },
  { word: 'accuse', definition_en: 'To say someone did something wrong.', collocation_en: 'accuse of, accuse someone', example_sentence_en: 'He accused me of stealing his pen.', example_sentence: '他指责我偷了他的钢笔。' },
  { word: 'achieve', definition_en: 'To succeed in doing something.', collocation_en: 'achieve goal, achieve success', example_sentence_en: 'Hard work helps you achieve your dreams.', example_sentence: '努力工作帮助你实现梦想。' },
  { word: 'achievement', definition_en: 'Something done successfully.', collocation_en: 'great achievement, sense of achievement', example_sentence_en: 'Winning the competition was a great achievement.', example_sentence: '赢得比赛是伟大的成就。' },
  { word: 'acquire', definition_en: 'To get or buy something.', collocation_en: 'acquire knowledge, acquire skill', example_sentence_en: 'She acquired fluency in Spanish.', example_sentence: '她西班牙语说得很流利。' },
  { word: 'across', definition_en: 'From one side to the other.', collocation_en: 'across from, walk across', example_sentence_en: 'The bank is across from the supermarket.', example_sentence: '银行在超市对面。' },
  { word: 'act', definition_en: 'To do something; or perform in a play.', collocation_en: 'act quickly, act as', example_sentence_en: 'You must act now before it\'s too late.', example_sentence: '你要现在行动，趁还不太晚。' },
  { word: 'action', definition_en: 'Something done; the process of doing.', collocation_en: 'take action, immediate action', example_sentence_en: 'We need to take action to solve this.', example_sentence: '我们需要采取行动解决这个问题。' },
  { word: 'active', definition_en: 'Moving or doing things; energetic.', collocation_en: 'very active, stay active', example_sentence_en: 'My grandfather is still very active at 80.', example_sentence: '我祖父80岁了还很活跃。' },
  { word: 'activity', definition_en: 'Something done for interest or work.', collocation_en: 'outdoor activity, leisure activity', example_sentence_en: 'Reading is my favorite leisure activity.', example_sentence: '阅读是我最喜欢的休闲活动。' },
  { word: 'actor', definition_en: 'Male performer in plays or movies.', collocation_en: 'supporting actor, actor and actress', example_sentence_en: 'He wants to be a Hollywood actor.', example_sentence: '他想成为好莱坞演员。' },
  { word: 'actress', definition_en: 'Female performer in plays or movies.', collocation_en: 'famous actress, become actress', example_sentence_en: 'She is a talented actress.', example_sentence: '她是个有天赋的女演员。' },
  { word: 'actual', definition_en: 'Real; existing in fact.', collocation_en: 'actual cost, actual situation', example_sentence_en: 'The actual cost was higher than estimated.', example_sentence: '实际成本比估计的高。' },
  { word: 'actually', definition_en: 'Really; in fact.', collocation_en: 'actually yes, actually not', example_sentence_en: 'Actually, I don\'t like coffee.', example_sentence: '其实，我不喜欢咖啡。' },
  { word: 'adapt', definition_en: 'To change to fit new conditions.', collocation_en: 'adapt to, adapt for', example_sentence_en: 'Animals adapt to their environment.', example_sentence: '动物适应环境。' },
  { word: 'add', definition_en: 'To put something with something else.', collocation_en: 'add to, add up', example_sentence_en: 'Please add some sugar to my coffee.', example_sentence: '请给我的咖啡加点糖。' },
  { word: 'addition', definition_en: 'The process of adding something.', collocation_en: 'in addition to', example_sentence_en: 'In addition to English, she speaks French.', example_sentence: '除了英语，她还会说法语。' },
  { word: 'additional', definition_en: 'Added; extra.', collocation_en: 'additional cost, additional information', example_sentence_en: 'There is no additional charge.', example_sentence: '没有额外费用。' },
  { word: 'address', definition_en: 'Details of where someone lives.', collocation_en: 'home address, email address', example_sentence_en: 'What is your home address?', example_sentence: '你的家庭地址是什么？' },
  { word: 'adequate', definition_en: 'Enough; satisfactory.', collocation_en: 'adequate time, quite adequate', example_sentence_en: 'We need adequate time to prepare.', example_sentence: '我们需要足够的时间来准备。' },
  { word: 'adjust', definition_en: 'To change slightly to fit better.', collocation_en: 'adjust to, adjust the', example_sentence_en: 'You need to adjust the mirror.', example_sentence: '你需要调整镜子。' },
  { word: 'administration', definition_en: 'The management of public or business affairs.', collocation_en: 'business administration, hospital administration', example_sentence_en: 'She works in hospital administration.', example_sentence: '她在医院行政部门工作。' },
  { word: 'admire', definition_en: 'To respect and like someone.', collocation_en: 'admire for, greatly admire', example_sentence_en: 'I admire your courage.', example_sentence: '我佩服你的勇气。' },
  { word: 'admission', definition_en: 'Permission to enter a place.', collocation_en: 'gain admission, admission fee', example_sentence_en: 'Admission to the museum is free on Sundays.', example_sentence: '周日博物馆免费开放。' },
  { word: 'admit', definition_en: 'To agree something is true; to allow entry.', collocation_en: 'admit that, admit to', example_sentence_en: 'He admitted his mistake.', example_sentence: '他承认了自己的错误。' },
  { word: 'adopt', definition_en: 'To take someone else\'s child into your family.', collocation_en: 'adopt child, adopt policy', example_sentence_en: 'They decided to adopt a baby.', example_sentence: '他们决定收养一个婴儿。' },
  { word: 'adult', definition_en: 'A fully grown person.', collocation_en: 'young adult, adult education', example_sentence_en: 'You must be an adult to vote.', example_sentence: '你必须成年才能投票。' },
  { word: 'advance', definition_en: 'To move forward; or before an event.', collocation_en: 'in advance, advance booking', example_sentence_en: 'Please book your ticket in advance.', example_sentence: '请提前预订门票。' },
  { word: 'advanced', definition_en: 'Far on in progress; complex.', collocation_en: 'advanced level, advanced course', example_sentence_en: 'This is an advanced English class.', example_sentence: '这是高级英语班。' },
  { word: 'advantage', definition_en: 'Something that helps you.', collocation_en: 'have advantage, take advantage', example_sentence_en: 'Fluency in English is a big advantage.', example_sentence: '英语流利是个大优势。' },
  { word: 'adventure', definition_en: 'An exciting or unusual experience.', collocation_en: 'go adventure, great adventure', example_sentence_en: 'Traveling alone is a great adventure.', example_sentence: '独自旅行是伟大的冒险。' },
  { word: 'advertise', definition_en: 'To tell the public about something.', collocation_en: 'advertise job, advertise product', example_sentence_en: 'We need to advertise to sell this house.', example_sentence: '我们需要登广告卖这所房子。' },
  { word: 'advertisement', definition_en: 'A public notice about a product.', collocation_en: 'place advertisement, watch advertisement', example_sentence_en: 'I saw an advertisement for a job.', example_sentence: '我看到了一个招聘广告。' },
  { word: 'advice', definition_en: 'Suggestions about what to do.', collocation_en: 'give advice, take advice', example_sentence_en: 'Can you give me some advice?', example_sentence: '你能给我一些建议吗？' },
  { word: 'advise', definition_en: 'To give someone advice.', collocation_en: 'advise someone, advise doing', example_sentence_en: 'I advise you to study harder.', example_sentence: '我建议你更努力学习。' },
  { word: 'affair', definition_en: 'An event or situation.', collocation_en: 'personal affair, foreign affair', example_sentence_en: 'Mind your own affairs.', example_sentence: '管好你自己的事。' },
  { word: 'affect', definition_en: 'To influence or change something.', collocation_en: 'affect by, greatly affect', example_sentence_en: 'Weather affects my mood.', example_sentence: '天气影响我的情绪。' },
  { word: 'affection', definition_en: 'A feeling of liking and caring.', collocation_en: 'show affection, deep affection', example_sentence_en: 'She shows affection to her pets.', example_sentence: '她喜欢她的宠物。' },
  { word: 'afford', definition_en: 'To have enough money for something.', collocation_en: 'afford to, can afford', example_sentence_en: 'I can\'t afford a new car right now.', example_sentence: '我现在买不起新车。' },
  { word: 'afraid', definition_en: 'Feeling fear or worry.', collocation_en: 'be afraid, afraid of', example_sentence_en: 'Don\'t be afraid of making mistakes.', example_sentence: '不要害怕犯错。' },
  { word: 'Africa', definition_en: 'A continent with many countries.', collocation_en: 'visit Africa, in Africa', example_sentence_en: 'She went on safari in Africa.', example_sentence: '她在非洲去狩猎旅行了。' },
  { word: 'African', definition_en: 'From or related to Africa.', collocation_en: 'African country, African culture', example_sentence_en: 'He studies African history.', example_sentence: '他研究非洲历史。' },
  { word: 'after', definition_en: 'Later in time; following.', collocation_en: 'after school, after dinner', example_sentence_en: 'Let\'s go for a walk after dinner.', example_sentence: '晚饭后我们去散步吧。' },
  { word: 'afternoon', definition_en: 'The time between noon and evening.', collocation_en: 'in afternoon, this afternoon', example_sentence_en: 'I have a meeting this afternoon.', example_sentence: '我今天下午有个会议。' },
  { word: 'afterwards', definition_en: 'At a later time.', collocation_en: 'meeting afterwards, call afterwards', example_sentence_en: 'We went to a restaurant afterwards.', example_sentence: '后来我们去了餐馆。' },
  { word: 'again', definition_en: 'Another time; once more.', collocation_en: 'try again, do again', example_sentence_en: 'Can you say that again?', example_sentence: '你能再说一遍吗？' },
  { word: 'against', definition_en: 'In opposition to; touching.', collocation_en: 'against wall, play against', example_sentence_en: 'Don\'t lean against the glass.', example_sentence: '不要靠在玻璃上。' },
  { word: 'age', definition_en: 'How old someone is; a period of history.', collocation_en: 'my age, middle age', example_sentence_en: 'What is your age?', example_sentence: '你多大了？' },
  { word: 'aged', definition_en: 'Being a specific age; old.', collocation_en: 'aged 5, middle aged', example_sentence_en: 'The book is suitable for children aged 5-10.', example_sentence: '这本书适合5-10岁的孩子。' },
  { word: 'agency', definition_en: 'A business that provides a service.', collocation_en: 'travel agency, news agency', example_sentence_en: 'I booked the trip through a travel agency.', example_sentence: '我通过旅行社订了这次旅行。' },
  { word: 'agenda', definition_en: 'A list of things to be done.', collocation_en: 'on the agenda, set agenda', example_sentence_en: 'What\'s on the agenda for today?', example_sentence: '今天的议程是什么？' },
  { word: 'agent', definition_en: 'A person who acts for another.', collocation_en: 'real estate agent, travel agent', example_sentence_en: 'Our agent helped us find a house.', example_sentence: '我们的中介帮我们找房子。' },
  { word: 'aggressive', definition_en: 'Ready to attack or argue; forceful.', collocation_en: 'very aggressive, aggressive behavior', example_sentence_en: 'His aggressive style worries me.', example_sentence: '他激进的态度让我担心。' },
  { word: 'ago', definition_en: 'Before the present time.', collocation_en: 'long ago, a week ago', example_sentence_en: 'I saw him three days ago.', example_sentence: '我三天前见过他。' },
  { word: 'agree', definition_en: 'To have the same opinion.', collocation_en: 'agree with, agree to do', example_sentence_en: 'I agree with your opinion.', example_sentence: '我同意你的看法。' },
  { word: 'agreement', definition_en: 'A decision made by people together.', collocation_en: 'reach agreement, sign agreement', example_sentence_en: 'We have an agreement to help each other.', example_sentence: '我们有一个互相帮助的协议。' },
  { word: 'agriculture', definition_en: 'Farming; growing crops and raising animals.', collocation_en: 'study agriculture, modern agriculture', example_sentence_en: 'Agriculture is important for the economy.', example_sentence: '农业对经济很重要。' },
  { word: 'ahead', definition_en: 'In front; forward.', collocation_en: 'go ahead, ahead of', example_sentence_en: 'Go ahead - I\'m listening.', example_sentence: '请说 - 我在听。' },
  { word: 'aid', definition_en: 'Help or support.', collocation_en: 'first aid, give aid', example_sentence_en: 'She gave first aid to the injured man.', example_sentence: '她给那个受伤的人进行了急救。' },
  { word: 'aim', definition_en: 'To point at; or a goal.', collocation_en: 'aim at, main aim', example_sentence_en: 'My aim is to become a doctor.', example_sentence: '我的目标是成为医生。' },
  { word: 'air', definition_en: 'The invisible gas around us.', collocation_en: 'fresh air, in the air', example_sentence_en: 'Let\'s go outside for some fresh air.', example_sentence: '我们出去呼吸新鲜空气吧。' },
  { word: 'aircraft', definition_en: 'A vehicle that can fly.', collocation_en: 'military aircraft, passenger aircraft', example_sentence_en: 'The aircraft can carry 200 passengers.', example_sentence: '这架飞机能载200名乘客。' },
  { word: 'airline', definition_en: 'A company that carries people by air.', collocation_en: 'fly airline, airline company', example_sentence_en: 'Which airline are you taking?', example_sentence: '你坐哪家航空公司的航班？' },
  { word: 'airport', definition_en: 'A place where airplanes land and take off.', collocation_en: 'at airport, airport terminal', example_sentence_en: 'The airport is 30 km from the city.', example_sentence: '机场离城市30公里。' },
  { word: 'alarm', definition_en: 'A warning sound or device.', collocation_en: 'fire alarm, set alarm', example_sentence_en: 'The fire alarm rang at midnight.', example_sentence: '火警在午夜响了。' },
  { word: 'album', definition_en: 'A book for keeping photos or stamps.', collocation_en: 'photo album, music album', example_sentence_en: 'I keep all my photos in an album.', example_sentence: '我把所有照片保存在相册里。' },
  { word: 'alcohol', definition_en: 'A drink that can make you drunk.', collocation_en: 'drink alcohol, alcohol content', example_sentence_en: 'Too much alcohol is bad for health.', example_sentence: '太多酒精对健康有害。' },
  { word: 'alert', definition_en: 'Quick to notice; or a warning.', collocation_en: 'stay alert, on alert', example_sentence_en: 'Stay alert while driving.', example_sentence: '开车时要保持警惕。' },
  { word: 'alien', definition_en: 'A creature from space; foreign.', collocation_en: 'alien spaceship, illegal alien', example_sentence_en: 'Do you believe aliens exist?', example_sentence: '你相信外星人存在吗？' },
  { word: 'alike', definition_en: 'Similar; looking the same.', collocation_en: 'look alike, think alike', example_sentence_en: 'The twins look exactly alike.', example_sentence: '双胞胎长得一模一样。' },
  { word: 'alive', definition_en: 'Living; not dead.', collocation_en: 'stay alive, come alive', example_sentence_en: 'It\'s a miracle that he is still alive.', example_sentence: '他还活着真是奇迹。' },
  { word: 'all', definition_en: 'The whole number or amount.', collocation_en: 'all day, all of', example_sentence_en: 'I worked all day yesterday.', example_sentence: '我昨天工作了一整天。' },
  { word: 'allergic', definition_en: 'Having a bad reaction to something.', collocation_en: 'allergic to, highly allergic', example_sentence_en: 'I\'m allergic to cats.', example_sentence: '我对猫过敏。' },
  { word: 'allergy', definition_en: 'A condition that makes you react badly to things.', collocation_en: 'have allergy, peanut allergy', example_sentence_en: 'She has a nut allergy.', example_sentence: '她坚果过敏。' },
  { word: 'allow', definition_en: 'To let someone do something.', collocation_en: 'allow to, allow for', example_sentence_en: 'Smoking is not allowed here.', example_sentence: '这里不允许吸烟。' },
  { word: 'ally', definition_en: 'A person or country that helps another.', collocation_en: 'close ally, ally with', example_sentence_en: 'The two countries are allies.', example_sentence: '这两个国家是盟友。' },
  { word: 'almost', definition_en: 'Nearly but not quite.', collocation_en: 'almost there, almost all', example_sentence_en: 'The dinner is almost ready.', example_sentence: '晚餐快准备好了。' },
  { word: 'alone', definition_en: 'Without other people.', collocation_en: 'live alone, go alone', example_sentence_en: 'I prefer to work alone.', example_sentence: '我更喜欢独自工作。' },
  { word: 'along', definition_en: 'Moving forward on a path.', collocation_en: 'walk along, along with', example_sentence_en: 'We walked along the river.', example_sentence: '我们沿着河走。' },
  { word: 'aloud', definition_en: 'In a voice that can be heard.', collocation_en: 'read aloud, say aloud', example_sentence_en: 'Please read the text aloud.', example_sentence: '请大声朗读课文。' },
  { word: 'alphabet', definition_en: 'The letters of a language in order.', collocation_en: 'learn alphabet, English alphabet', example_sentence_en: 'Children learn the alphabet in kindergarten.', example_sentence: '孩子们在幼儿园学字母表。' },
  { word: 'already', definition_en: 'Before now; sooner than expected.', collocation_en: 'already done, already have', example_sentence_en: 'I have already finished my homework.', example_sentence: '我已经做完作业了。' },
  { word: 'also', definition_en: 'Too; as well.', collocation_en: 'also be, also can', example_sentence_en: 'I can also speak French.', example_sentence: '我还会说法语。' },
  { word: 'alter', definition_en: 'To change something.', collocation_en: 'alter plan, alter course', example_sentence_en: 'We need to alter our plans.', example_sentence: '我们需要改变计划。' },
  { word: 'alternative', definition_en: 'Another possibility; a choice.', collocation_en: 'no alternative, alternative energy', example_sentence_en: 'We have no alternative but to wait.', example_sentence: '我们别无选择只能等待。' },
  { word: 'although', definition_en: 'In spite of the fact that.', collocation_en: 'although, although but', example_sentence_en: 'Although it rained, we went out.', example_sentence: '虽然下雨了，我们还是出去了。' },
  { word: 'altogether', definition_en: 'Completely; totally.', collocation_en: 'altogether different, altogether', example_sentence_en: 'That\'s altogether different from what I expected.', example_sentence: '那和我想的完全不同。' },
  { word: 'always', definition_en: 'At all times; every time.', collocation_en: 'always be, always do', example_sentence_en: 'She always arrives early.', example_sentence: '她总是早到。' },
  { word: 'amazing', definition_en: 'Very surprising or wonderful.', collocation_en: 'amazing grace, truly amazing', example_sentence_en: 'The view from the mountain is amazing!', example_sentence: '山上的景色令人惊叹！' },
  { word: 'ambition', definition_en: 'A strong desire to do something.', collocation_en: 'have ambition, great ambition', example_sentence_en: 'Her ambition is to become a doctor.', example_sentence: '她的志向是成为医生。' },
  { word: 'ambulance', definition_en: 'A vehicle for taking sick people to hospital.', collocation_en: 'call ambulance, ambulance service', example_sentence_en: 'Dial 120 for an ambulance in China.', example_sentence: '在中国拨打120叫救护车。' },
  { word: 'among', definition_en: 'In the middle of; surrounded by.', collocation_en: 'among friends, among them', example_sentence_en: 'She is popular among her classmates.', example_sentence: '她在同学中很受欢迎。' },
  { word: 'amount', definition_en: 'How much there is of something.', collocation_en: 'large amount, amount of', example_sentence_en: 'A large amount of money was spent.', example_sentence: '花了很多钱。' },
  { word: 'amuse', definition_en: 'To make someone laugh or smile.', collocation_en: 'amuse children, feel amused', example_sentence_en: 'The clown amused the children.', example_sentence: '小丑逗乐了孩子们。' },
  { word: 'amusing', definition_en: 'Funny; enjoyable.', collocation_en: 'amusing story, quite amusing', example_sentence_en: 'He told us an amusing story.', example_sentence: '他给我们讲了个有趣的故事。' },
  { word: 'analyse', definition_en: 'To study something carefully.', collocation_en: 'analyse data, analyse problem', example_sentence_en: 'Let\'s analyse the results.', example_sentence: '让我们分析一下结果。' },
  { word: 'analysis', definition_en: 'A careful study of something.', collocation_en: 'detailed analysis, make analysis', example_sentence_en: 'Your analysis is very good.', example_sentence: '你的分析很好。' },
  { word: 'ancestor', definition_en: 'A person in your family who lived long ago.', collocation_en: 'family ancestor, early ancestor', example_sentence_en: 'My ancestors came from Europe.', example_sentence: '我的祖先来自欧洲。' },
  { word: 'ancient', definition_en: 'Very old; from long ago.', collocation_en: 'ancient history, ancient building', example_sentence_en: 'This is an ancient city.', example_sentence: '这是一座古城。' },
  { word: 'anger', definition_en: 'A strong feeling of annoyance.', collocation_en: 'feel anger, show anger', example_sentence_en: 'He couldn\'t hide his anger.', example_sentence: '他无法掩饰愤怒。' },
  { word: 'angry', definition_en: 'Feeling strong annoyance.', collocation_en: 'very angry, get angry', example_sentence_en: 'Why are you angry with me?', example_sentence: '你为什么生我的气？' },
  { word: 'animal', definition_en: 'A living creature that is not a plant.', collocation_en: 'wild animal, farm animal', example_sentence_en: 'Dogs are my favorite animals.', example_sentence: '狗是我最喜欢的动物。' },
  { word: 'announce', definition_en: 'To tell people something publicly.', collocation_en: 'announce that, announce result', example_sentence_en: 'They announced their engagement yesterday.', example_sentence: '他们昨天宣布了订婚。' },
  { word: 'announcement', definition_en: 'A public statement.', collocation_en: 'make announcement, official announcement', example_sentence_en: 'There was an announcement about the delay.', example_sentence: '有关于延期的通知。' },
  { word: 'annoy', definition_en: 'To make someone slightly angry.', collocation_en: 'annoy by, annoy someone', example_sentence_en: 'Please don\'t annoy me when I\'m working.', example_sentence: '我工作时请不要打扰我。' },
  { word: 'annoying', definition_en: 'Making you feel annoyed.', collocation_en: 'very annoying, quite annoying', example_sentence_en: 'This noise is annoying!', example_sentence: '这噪音真烦人！' },
  { word: 'annual', definition_en: 'Happening once every year.', collocation_en: 'annual event, annual income', example_sentence_en: 'The annual meeting is in December.', example_sentence: '年会在十二月。' },
  { word: 'another', definition_en: 'One more; a different one.', collocation_en: 'another one, another day', example_sentence_en: 'Would you like another cup of coffee?', example_sentence: '你想再来杯咖啡吗？' },
  { word: 'answer', definition_en: 'A response to a question.', collocation_en: 'correct answer, answer to', example_sentence_en: 'What is the answer to question 5?', example_sentence: '第5题的答案是什么？' },
  { word: 'anxious', definition_en: 'Feeling worried or nervous.', collocation_en: 'anxious about, feel anxious', example_sentence_en: 'Students are anxious about their exams.', example_sentence: '学生们对考试感到焦虑。' },
  { word: 'any', definition_en: 'Some; no matter which one.', collocation_en: 'any time, any more', example_sentence_en: 'Call me any time you need help.', example_sentence: '你需要帮助时随时给我打电话。' },
  { word: 'anybody', definition_en: 'Any person.', collocation_en: 'help anybody, see anybody', example_sentence_en: 'Did anybody call me?', example_sentence: '有人给我打电话吗？' },
  { word: 'anymore', definition_en: 'Any longer; now.', collocation_en: 'not anymore, don\'t anymore', example_sentence_en: 'I don\'t live there anymore.', example_sentence: '我不再住在那儿了。' },
  { word: 'anyone', definition_en: 'Any person at all.', collocation_en: 'help anyone, ask anyone', example_sentence_en: 'Can anyone help me?', example_sentence: '有人能帮我吗？' },
  { word: 'anything', definition_en: 'Any thing or matter.', collocation_en: 'do anything, say anything', example_sentence_en: 'I would do anything for my family.', example_sentence: '为了家人我什么都愿意做。' },
  { word: 'anyway', definition_en: 'Whatever the situation; in any case.', collocation_en: 'anyway, anyway but', example_sentence_en: 'It\'s raining, but I\'m going out anyway.', example_sentence: '下雨了，但我还是要出去。' },
  { word: 'anywhere', definition_en: 'In, at, or to any place.', collocation_en: 'go anywhere, find anywhere', example_sentence_en: 'I can\'t find my keys anywhere!', example_sentence: '我哪里都找不到我的钥匙！' },
  { word: 'apart', definition_en: 'Separated by distance.', collocation_en: 'fall apart, apart from', example_sentence_en: 'The two houses are 100 meters apart.', example_sentence: '两所房子相距100米。' },
  { word: 'apartment', definition_en: 'A set of rooms for living in.', collocation_en: 'rent apartment, nice apartment', example_sentence_en: 'Their apartment has three bedrooms.', example_sentence: '他们的公寓有三间卧室。' },
  { word: 'apologize', definition_en: 'To say sorry for something.', collocation_en: 'apologize for, apologize to', example_sentence_en: 'You should apologize to her.', example_sentence: '你应该向她道歉。' },
  { word: 'apology', definition_en: 'A statement saying sorry.', collocation_en: 'make apology, accept apology', example_sentence_en: 'Please accept my sincere apology.', example_sentence: '请接受我诚挚的道歉。' },
  { word: 'apparent', definition_en: 'Easy to see or understand.', collocation_en: 'apparent reason, quite apparent', example_sentence_en: 'It became apparent that he was lying.', example_sentence: '很明显他在撒谎。' },
  { word: 'apparently', definition_en: 'As it appears; seemingly.', collocation_en: 'apparently yes, apparently not', example_sentence_en: 'Apparently, the meeting is cancelled.', example_sentence: '显然，会议取消了。' },
  { word: 'appeal', definition_en: 'To attract or interest; or a serious request.', collocation_en: 'appeal to, make appeal', example_sentence_en: 'This book appeals to young readers.', example_sentence: '这本书吸引年轻读者。' },
  { word: 'appear', definition_en: 'To start to be seen; to seem.', collocation_en: 'appear to, it appears', example_sentence_en: 'She appeared happy.', example_sentence: '她看起来很开心。' },
  { word: 'appearance', definition_en: 'The way someone or something looks.', collocation_en: 'personal appearance, change appearance', example_sentence_en: 'Don\'t judge by appearance.', example_sentence: '不要以貌取人。' },
  { word: 'apple', definition_en: 'A round fruit with red or green skin.', collocation_en: 'eat apple, apple tree', example_sentence_en: 'An apple a day keeps the doctor away.', example_sentence: '一天一苹果，医生远离我。' },
  { word: 'application', definition_en: 'A formal request to get something.', collocation_en: 'job application, submit application', example_sentence_en: 'I sent my application yesterday.', example_sentence: '我昨天提交了申请。' },
  { word: 'apply', definition_en: 'To make a formal request; to put on something.', collocation_en: 'apply for, apply to', example_sentence_en: 'You can apply for the job online.', example_sentence: '你可以在线申请这份工作。' },
  { word: 'appoint', definition_en: 'To choose someone for a job or position.', collocation_en: 'appoint as, appoint to', example_sentence_en: 'The committee appointed her as chair.', example_sentence: '委员会任命她为主席。' },
  { word: 'appointment', definition_en: 'An arrangement to meet someone.', collocation_en: 'make appointment, have appointment', example_sentence_en: 'I have an appointment at 3 PM.', example_sentence: '我下午3点有预约。' },
  { word: 'appreciate', definition_en: 'To be grateful for something.', collocation_en: 'appreciate help, greatly appreciate', example_sentence_en: 'I really appreciate your help.', example_sentence: '我真的很感激你的帮助。' },
  { word: 'approach', definition_en: 'To come near; or a way of doing something.', collocation_en: 'approach to, different approach', example_sentence_en: 'We need a new approach to this problem.', example_sentence: '我们需要用新方法处理这个问题。' },
  { word: 'appropriate', definition_en: 'Right or suitable.', collocation_en: 'appropriate for, quite appropriate', example_sentence_en: 'Please wear appropriate clothing.', example_sentence: '请穿合适的衣服。' },
  { word: 'approval', definition_en: 'The feeling that something is good.', collocation_en: 'ask approval, give approval', example_sentence_en: 'We need approval for the plan.', example_sentence: '我们需要计划获得批准。' },
  { word: 'approve', definition_en: 'To agree to something; to think something is good.', collocation_en: 'approve of, approve plan', example_sentence_en: 'The boss approved my request.', example_sentence: '老板批准了我的请求。' },
  { word: 'approximate', definition_en: 'Close to but not exactly.', collocation_en: 'approximate number, quite approximate', example_sentence_en: 'What is the approximate cost?', example_sentence: '大约费用是多少？' },
  { word: 'arbitrary', definition_en: 'Based on random choice rather than reason.', collocation_en: 'quite arbitrary, arbitrary decision', example_sentence_en: 'The choice seems completely arbitrary.', example_sentence: '这个选择看起来完全是随意的。' },
  { word: 'architect', definition_en: 'A person who designs buildings.', collocation_en: 'become architect, famous architect', example_sentence_en: 'He is a talented architect.', example_sentence: '他是个有天赋的建筑师。' },
  { word: 'architecture', definition_en: 'The art of designing buildings.', collocation_en: 'study architecture, modern architecture', example_sentence_en: 'The architecture of this building is amazing.', example_sentence: '这座建筑的建筑风格令人惊叹。' },
  { word: 'area', definition_en: 'A region or part of a place.', collocation_en: 'local area, this area', example_sentence_en: 'This is a nice area to live in.', example_sentence: '这是个居住的好地方。' },
  { word: 'argue', definition_en: 'To disagree in words; to give reasons.', collocation_en: 'argue about, argue with', example_sentence_en: 'Don\'t argue with your parents.', example_sentence: '不要和父母争吵。' },
  { word: 'argument', definition_en: 'A disagreement; or reasons for something.', collocation_en: 'have argument, strong argument', example_sentence_en: 'They had an argument about money.', example_sentence: '他们为钱争吵。' },
  { word: 'arise', definition_en: 'To happen or appear.', collocation_en: 'arise from, problem arise', example_sentence_en: 'A new problem has arisen.', example_sentence: '出现了新问题。' },
  { word: 'arithmetic', definition_en: 'The part of math about numbers.', collocation_en: 'study arithmetic, mental arithmetic', example_sentence_en: 'Children learn arithmetic in primary school.', example_sentence: '孩子们在小学学算术。' },
  { word: 'arm', definition_en: 'The upper limb of the body.', collocation_en: 'left arm, right arm', example_sentence_en: 'She hurt her arm playing tennis.', example_sentence: '她打网球时弄伤了胳膊。' },
  { word: 'army', definition_en: 'An organized force for fighting on land.', collocation_en: 'join army, in the army', example_sentence_en: 'Her brother is in the army.', example_sentence: '她哥哥在军队。' },
  { word: 'around', definition_en: 'On all sides; about.', collocation_en: 'look around, walk around', example_sentence_en: 'Let\'s walk around the park.', example_sentence: '我们在公园周围走走。' },
  { word: 'arrange', definition_en: 'To plan or organize something.', collocation_en: 'arrange meeting, arrange for', example_sentence_en: 'I can arrange a meeting for next week.', example_sentence: '我可以安排下周的会议。' },
  { word: 'arrangement', definition_en: 'A plan for how something will happen.', collocation_en: 'make arrangement, travel arrangement', example_sentence_en: 'We made arrangements for the trip.', example_sentence: '我们为旅行做了安排。' },
  { word: 'arrest', definition_en: 'To seize someone by legal authority.', collocation_en: 'arrest for, under arrest', example_sentence_en: 'The police arrested the thief.', example_sentence: '警察逮捕了小偷。' },
  { word: 'arrival', definition_en: 'The act of coming to a place.', collocation_en: 'on arrival, arrival time', example_sentence_en: 'We are waiting for your arrival.', example_sentence: '我们在等你的到来。' },
  { word: 'arrive', definition_en: 'To reach a place.', collocation_en: 'arrive at, arrive in', example_sentence_en: 'When will you arrive at the airport?', example_sentence: '你什么时候到达机场？' },
  { word: 'arrow', definition_en: 'A thin stick with a point, shot from a bow.', collocation_en: 'shoot arrow, bow and arrow', example_sentence_en: 'He shot an arrow at the target.', example_sentence: '他向目标射了一箭。' },
  { word: 'art', definition_en: 'The creation of beautiful things.', collocation_en: 'work of art, study art', example_sentence_en: 'She loves painting and other forms of art.', example_sentence: '她喜欢绘画和其他艺术形式。' },
  { word: 'article', definition_en: 'A piece of writing in a newspaper or magazine.', collocation_en: 'write article, read article', example_sentence_en: 'I read an interesting article today.', example_sentence: '我今天读了一篇有趣的文章。' },
  { word: 'artificial', definition_en: 'Made by people; not natural.', collocation_en: 'artificial light, artificial intelligence', example_sentence_en: 'This sweetener is artificial.', example_sentence: '这种甜味剂是人工的。' },
  { word: 'artist', definition_en: 'A person who creates art.', collocation_en: 'famous artist, become artist', example_sentence_en: 'She is a talented artist.', example_sentence: '她是个有天赋的艺术家。' },
  { word: 'as', definition_en: 'While; because; in the role of.', collocation_en: 'as soon as, as well as', example_sentence_en: 'As I was leaving, the phone rang.', example_sentence: '我正要离开时，电话响了。' }
]

async function updateAGroup() {
  console.log('🎓 开始更新A组词汇（55个词）\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = aGroupData
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

  console.log(`✅ 找到 ${wordsToUpdate.length} 个A组词在数据库中\n`)
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

  console.log('\n\n✅ A组更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateAGroup()
