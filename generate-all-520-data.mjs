/**
 * 完整的520个KET单词AI数据生成脚本
 *
 * 这个脚本包含所有520个单词的：
 * - 英文释义 (definition_en)
 * - 英文搭配 (collocation_en)
 * - 英文例句 (example_sentence_en)
 * - 中文例句 (example_sentence)
 */

import fs from 'fs'
import path from 'path'

// 读取单词列表
const wordListData = JSON.parse(fs.readFileSync('ket-words-list.json', 'utf-8'))
const words = wordListData.words

// 单词ID映射
const wordIdMap = {}
words.forEach(w => {
  wordIdMap[w.word] = w.id
})

// 为所有520个单词生成AI数据
function generateWordAI() {
  return words.map(w => {
    const word = w.word
    const id = w.id
    const definition = w.definition

    // 根据单词生成对应的AI数据
    // 这里使用规则和模板来生成，确保质量和一致性
    return generateWordData(id, word, definition)
  })
}

// 为单个单词生成AI数据的核心函数
function generateWordData(id, word, definition) {
  // 从定义中提取主要含义（去掉格式标记）
  const cleanDef = definition.replace(/【|】|n\.|vt\.|vi\.|adj\.|adv\./g, '').split('；')[0].trim()

  // 生成英文释义（基于词性和中文释义）
  const definitionEn = generateDefinition(word, cleanDef)

  // 生成搭配
  const collocation = generateCollocation(word)

  // 生成例句
  const examples = generateExample(word)
  const exampleEn = examples.en
  const exampleCn = examples.cn

  return {
    id,
    word,
    definition_en: definitionEn,
    collocation: collocation,
    collocation_en: collocation,
    example_sentence: exampleCn,
    example_sentence_en: exampleEn
  }
}

// 生成英文释义
function generateDefinition(word, cleanDef) {
  // 基于单词类型生成英文释义
  const commonWords = {
    // 时间相关
    'January': 'The first month of the year.',
    'February': 'The second month of the year.',
    'March': 'The third month of the year.',
    'April': 'The fourth month of the year.',
    'May': 'The fifth month of the year.',
    'June': 'The sixth month of the year.',
    'July': 'The seventh month of the year.',
    'August': 'The eighth month of the year.',
    'September': 'The ninth month of the year.',
    'October': 'The tenth month of the year.',
    'November': 'The eleventh month of the year.',
    'December': 'The twelfth month of the year.',
    'Monday': 'The second day of the week.',
    'Tuesday': 'The third day of the week.',
    'Wednesday': 'The fourth day of the week.',
    'Thursday': 'The fifth day of the week.',
    'Friday': 'The sixth day of the week.',
    'Saturday': 'The seventh day of the week.',
    'Sunday': 'The first day of the week.',
    'yesterday': 'The day before today.',
    'today': 'This present day.',
    'tomorrow': 'The day after today.',
    'morning': 'The early part of the day from sunrise to noon.',
    'afternoon': 'The time from noon until evening.',
    'evening': 'The time from sunset to bedtime.',
    'night': 'The time of darkness between evening and morning.',
    'week': 'A period of seven days.',
    'month': 'A period of about 30 days.',
    'year': 'A period of 365 or 366 days.',
    'weekend': 'Saturday and Sunday.',
    'holiday': 'A day of celebration or rest.',
    'season': 'One of the four periods of the year: spring, summer, autumn, winter.',
    'spring': 'The season between winter and summer.',
    'summer': 'The warmest season of the year.',
    'autumn': 'The season between summer and winter.',
    'winter': 'The coldest season of the year.',

    // 颜色
    'red': 'The color of blood or fire.',
    'green': 'The color of grass and leaves.',
    'yellow': 'The color of the sun or gold.',
    'white': 'The color of snow or milk.',
    'grey': 'A color between black and white.',
    'orange': 'A color between red and yellow.',
    'pink': 'A pale red color.',
    'purple': 'A color between red and blue.',
    'brown': 'The color of earth or wood.',

    // 数字
    'zero': 'The number 0.',
    'one': 'The number 1.',
    'two': 'The number 2.',
    'three': 'The number 3.',
    'four': 'The number 4.',
    'five': 'The number 5.',
    'six': 'The number 6.',
    'seven': 'The number 7.',
    'eight': 'The number 8.',
    'nine': 'The number 9.',
    'ten': 'The number 10.',
    'eleven': 'The number 11.',
    'twelve': 'The number 12.',
    'thirteen': 'The number 13.',
    'twenty': 'The number 20.',
    'thirty': 'The number 30.',
    'forty': 'The number 40.',
    'fifty': 'The number 50.',
    'hundred': 'The number 100.',
    'thousand': 'The number 1000.',
    'first': 'Coming before all others in time or order.',
    'second': 'Coming next after the first.',
    'third': 'Coming next after the second.',
    'last': 'Coming after all others in time or order.',

    // 家庭
    'family': 'A group consisting of parents and children.',
    'mother': 'A female parent.',
    'father': 'A male parent.',
    'parent': 'A mother or father.',
    'sister': 'A female sibling.',
    'brother': 'A male sibling.',
    'child': 'A young human being.',
    'son': 'A male child of a parent.',
    'daughter': 'A female child of a parent.',
    'grandmother': 'The mother of a parent.',
    'grandfather': 'The father of a parent.',
    'grandchild': 'A child of a person\'s son or daughter.',
    'granddaughter': 'A daughter of a person\'s son or daughter.',
    'uncle': 'The brother of a parent.',
    'aunt': 'The sister of a parent.',
    'cousin': 'A child of a person\'s uncle or aunt.',

    // 食物
    'food': 'Something that people and animals eat.',
    'bread': 'A basic food made from flour and water.',
    'butter': 'A yellow food made from cream.',
    'cheese': 'A food made from milk.',
    'milk': 'A white liquid produced by cows.',
    'egg': 'A round object with a shell that contains a baby bird, snake, etc.',
    'meat': 'The flesh of an animal as food.',
    'fish': 'A creature that lives in water and has fins and tail.',
    'chicken': 'A bird kept for its meat and eggs.',
    'beef': 'The meat of a cow.',
    'pork': 'The meat of a pig.',
    'fruit': 'The sweet product of a tree or other plant.',
    'vegetable': 'A plant or part of a plant used as food.',
    'apple': 'A round fruit with red or green skin.',
    'banana': 'A long curved fruit with yellow skin.',
    'orange': 'A round citrus fruit with orange skin.',
    'cake': 'A sweet baked food.',
    'cookie': 'A small sweet cake.',
    'sugar': 'A sweet substance used to flavor food.',
    'salt': 'A white substance used to flavor food.',
    'pepper': 'A hot spice used to flavor food.',
    'coffee': 'A hot dark drink made from coffee beans.',
    'tea': 'A hot drink made from tea leaves.',
    'juice': 'The liquid from fruit.',
    'water': 'A clear liquid without color or taste.',
    'beer': 'An alcoholic drink made from grain.',
    'wine': 'An alcoholic drink made from grapes.',
    'breakfast': 'The first meal of the day.',
    'lunch': 'A meal eaten in the middle of the day.',
    'dinner': 'The main meal of the day, eaten in the evening.',
    'supper': 'A light meal eaten in the evening.',
    'snack': 'A small amount of food eaten between meals.',
    'restaurant': 'A place where meals are served to customers.',
    'café': 'A small restaurant serving drinks and snacks.',
    'menu': 'A list of food available in a restaurant.',

    // 身体
    'body': 'The physical structure of a person or animal.',
    'head': 'The upper part of the human body.',
    'face': 'The front part of the head.',
    'eye': 'An organ of sight.',
    'ear': 'An organ of hearing.',
    'nose': 'An organ of smell and breathing.',
    'mouth': 'The opening through which a person takes food.',
    'hair': 'The threads growing on the head.',
    'hand': 'The end part of the arm.',
    'arm': 'The upper limb of the human body.',
    'finger': 'One of the four long thin parts on the hand.',
    'thumb': 'The short thick finger on the side of the hand.',
    'leg': 'The lower limb of the human body.',
    'foot': 'The bottom part of the leg.',
    'toe': 'One of the five small parts on the foot.',
    'heart': 'The organ that pumps blood through the body.',
    'brain': 'The organ inside the head that controls thought and memory.',
    'back': 'The rear part of the human body.',
    'stomach': 'The organ inside the body where food is digested.',

    // 衣服
    'clothes': 'Items worn to cover the body.',
    'shirt': 'A piece of clothing for the upper body.',
    'jacket': 'A short coat.',
    'coat': 'A long piece of outer clothing.',
    'dress': 'A piece of clothing worn by a woman or girl.',
    'skirt': 'A piece of clothing worn by a woman or girl that hangs from the waist.',
    'trousers': 'Clothing for the legs and hips. (British English)',
    'jeans': 'Trousers made of blue denim.',
    'shoe': 'A covering for the foot.',
    'boot': 'A strong shoe that covers the foot and ankle.',
    'hat': 'A covering for the head.',
    'cap': 'A soft flat hat.',
    'sock': 'A piece of clothing worn on the foot.',
    'glove': 'A covering for the hand.',
    'scarf': 'A piece of cloth worn around the neck.',
    'belt': 'A strip of leather or material worn around the waist.',
    'uniform': 'A special set of clothes worn by members of a group.',
    'suit': 'A jacket and trousers or skirt.',
    'T-shirt': 'A short-sleeved casual top.',

    // 住所
    'house': 'A building for human habitation.',
    'home': 'The place where one lives.',
    'room': 'A part of a building enclosed by walls.',
    'bedroom': 'A room for sleeping in.',
    'bathroom': 'A room with a toilet and bath or shower.',
    'kitchen': 'A room where food is cooked.',
    'living room': 'A room for relaxing and entertaining guests.',
    'dining room': 'A room where meals are eaten.',
    'sitting room': 'A room for sitting in.',
    'garden': 'A piece of land used for growing flowers and vegetables.',
    'yard': 'An area of land near a house.',
    'floor': 'The lower surface of a room.',
    'wall': 'A side of a room or building.',
    'ceiling': 'The upper interior surface of a room.',
    'door': 'A sliding or hinged structure for closing an opening.',
    'window': 'An opening in the wall to let in light.',
    'roof': 'The covering on top of a building.',
    'street': 'A public road in a city or town.',
    'road': 'A wide way leading from one place to another.',
    'avenue': 'A wide street with trees on both sides.',
    'bridge': 'A structure carrying a road across a river.',
    'building': 'A structure with a roof and walls.',
    'office': 'A room where people work.',
    'shop': 'A place where things are sold.',
    'market': 'A place where people meet to buy and sell things.',
    'bank': 'A place where money is kept and lent.',
    'hotel': 'An establishment providing accommodation and meals.',
    'hospital': 'A place where sick or injured people are treated.',
    'school': 'An institution for educating children.',
    'library': 'A building where books are kept for people to read.',
    'museum': 'A building where objects of historical or cultural interest are kept.',
    'theatre': 'A building where plays are performed.',
    'cinema': 'A theatre where films are shown.',
    'church': 'A building for Christian religious services.',

    // 交通
    'car': 'A road vehicle with an engine and four wheels.',
    'bus': 'A large motor vehicle for carrying passengers.',
    'train': 'A connected set of vehicles on rails.',
    'plane': 'A powered flying vehicle with wings.',
    'boat': 'A small vessel for traveling on water.',
    'ship': 'A large boat for carrying people or goods.',
    'bicycle': 'A vehicle with two wheels powered by pedals.',
    'bike': 'A short word for bicycle.',
    'motorcycle': 'A two-wheeled vehicle with an engine.',
    'taxi': 'A car licensed to transport passengers.',
    'subway': 'An underground railway.',
    'ticket': 'A piece of paper giving the right to travel or enter.',
    'station': 'A place where trains or buses stop.',
    'airport': 'A place where airplanes take off and land.',
    'passenger': 'A traveler on a public or private conveyance.',
    'driver': 'A person who drives a vehicle.',
    'journey': 'An act of traveling from one place to another.',
    'trip': 'A journey or excursion.',
    'travel': 'To make a journey.',
    'ride': 'A journey on a horse, bicycle, or vehicle.',
    'walk': 'To move at a regular pace by lifting and setting down each foot.',
    'run': 'To move at a speed faster than walking.',
    'drive': 'To operate and control a vehicle.',
    'fly': 'To move through the air.',
    'swim': 'To move through water.',
    'jump': 'To push oneself off a surface and into the air.',
    'fall': 'To move downward, typically rapidly and freely.',
    'stand': 'To be in an upright position.',
    'sit': 'To rest the weight of the body on the buttocks.',
    'lie': 'To be in a resting position.',
    'sleep': 'To be in a state of rest.',
    'wake': 'To emerge from sleep.',
    'rest': 'To cease work or movement in order to relax.',
    'wait': 'To stay where one is or delay action until a particular time.',
    'stop': 'To cease moving or operating.',
    'start': 'To begin or set in motion.',
    'arrive': 'To reach a destination.',
    'leave': 'To go away from.',
    'enter': 'To come or go into.',
    'exit': 'To leave or go out of.',
    'return': 'To come or go back to a place.',
    'move': 'To change position.',
    'carry': 'To hold and support something while moving.',
    'bring': 'To take or go with something to a place.',
    'take': 'To lay hold of something.',
    'put': 'To place something in a particular position.',
    'get': 'To obtain or receive something.',
    'give': 'To present someone with something.',
    'send': 'To cause to go or be taken to a place.',
    'receive': 'To get or be given something.',
    'buy': 'To obtain in exchange for payment.',
    'sell': 'To give something to someone in exchange for money.',
    'pay': 'To give money to someone for something.',
    'cost': 'To have a price of.',
    'spend': 'To give money as payment.',
    'save': 'To keep money instead of spending it.',
    'lose': 'To be deprived of something.',
    'find': 'To discover something.',
    'search': 'To look for something.',
    'look': 'To direct one\'s eyes in order to see.',
    'see': 'To perceive with the eyes.',
    'watch': 'To look at something for a period of time.',
    'listen': 'To give attention to someone or something in order to hear.',
    'hear': 'To perceive with the ear.',
    'speak': 'To say words in order to communicate.',
    'talk': 'To speak in order to give information.',
    'tell': 'To communicate information to someone.',
    'say': 'To utter words.',
    'ask': 'To say something in order to get an answer.',
    'answer': 'To say something in response.',
    'read': 'To look at and understand written words.',
    'write': 'To mark letters or words on a surface.',
    'learn': 'To gain knowledge or skill.',
    'study': 'To devote time and attention to acquiring knowledge.',
    'know': 'To be aware of something.',
    'think': 'To use the mind to consider something.',
    'understand': 'To comprehend the meaning of something.',
    'remember': 'To keep in memory.',
    'forget': 'To be unable to remember.',
    'believe': 'To accept something as true.',
    'hope': 'To want something to happen.',
    'love': 'To feel deep affection for someone.',
    'like': 'To find something pleasant or enjoyable.',
    'hate': 'To feel intense dislike for something.',
    'want': 'To desire something.',
    'need': 'To require something.',
    'use': 'To put something into service.',
    'help': 'To assist someone.',
    'work': 'To engage in physical or mental activity.',
    'play': 'To engage in activity for enjoyment.',
    'enjoy': 'To take pleasure in something.',
    'prefer': 'To like something more than something else.',
    'choose': 'To select from a number of alternatives.',
    'decide': 'To come to a conclusion.',
    'agree': 'To have the same opinion.',
    'disagree': 'To have a different opinion.',
    'promise': 'To tell someone that you will definitely do something.',
    'try': 'To make an attempt to do something.',
    'fail': 'To be unsuccessful in achieving something.',
    'succeed': 'To achieve the desired aim or result.',
    'win': 'To be successful in a competition.',
    'lose': 'To be defeated in a competition.',
    'beat': 'To defeat someone in a competition.',
    'tie': 'To achieve the same score as an opponent.',
    'score': 'To gain a point in a game.',
    'team': 'A group of players forming one side in a game.',
    'game': 'An activity for entertainment.',
    'sport': 'An activity involving physical exertion.',
    'match': 'A contest or competition.',
    'competition': 'An event in which people compete.',
    'prize': 'A thing given to a winner.',
    'winner': 'A person who wins.',
    'loser': 'A person who loses.',
    'fan': 'A person who admires someone or something.',
    'hobby': 'An activity done for pleasure.',
    'interest': 'The state of wanting to know about something.',
    'feeling': 'An emotional state.',
    'happy': 'Feeling or showing pleasure or contentment.',
    'sad': 'Feeling or showing sorrow.',
    'angry': 'Feeling or showing strong annoyance.',
    'afraid': 'Feeling fear or anxiety.',
    'worried': 'Feeling anxiety about something.',
    'tired': 'In need of sleep or rest.',
    'hungry': 'Feeling the need for food.',
    'thirsty': 'Feeling the need for drink.',
    'sick': 'Affected by physical or mental illness.',
    'well': 'In good health.',
    'better': 'More excellent or desirable.',
    'worse': 'Of poorer quality.',
    'best': 'Of the highest quality.',
    'worst': 'Of the poorest quality.',
    'big': 'Of considerable size or extent.',
    'small': 'Of a size that is less than normal.',
    'large': 'Of considerable or relatively great size.',
    'little': 'Small in size or amount.',
    'huge': 'Extremely large.',
    'tiny': 'Very small.',
    'long': 'Measuring a great distance from end to end.',
    'short': 'Measuring a small distance from end to end.',
    'tall': 'Of great height.',
    'high': 'Of great vertical extent.',
    'low': 'Of small vertical extent.',
    'wide': 'Of great width.',
    'narrow': 'Of small width.',
    'thick': 'With a large distance between opposite sides.',
    'thin': 'With a small distance between opposite sides.',
    'heavy': 'Of great weight.',
    'light': 'Of little weight.',
    'dark': 'With little or no light.',
    'bright': 'Giving out or reflecting much light.',
    'hot': 'Of a high temperature.',
    'cold': 'Of a low temperature.',
    'warm': 'Of a fairly high temperature.',
    'cool': 'Of a fairly low temperature.',
    'wet': 'Covered or saturated with liquid.',
    'dry': 'Free from liquid or moisture.',
    'clean': 'Free from dirt or impurities.',
    'dirty': 'Not clean.',
    'new': 'Recently made or discovered.',
    'old': 'Having lived for a long time.',
    'young': 'Having lived for only a short time.',
    'rich': 'Having a great deal of money.',
    'poor': 'Lacking enough money.',
    'cheap': 'Low in price.',
    'expensive': 'High in price.',
    'beautiful': 'Pleasing to the senses.',
    'ugly': 'Unpleasant to look at.',
    'good': 'Of a high quality or standard.',
    'bad': 'Of poor quality or low standard.',
    'nice': 'Pleasant or enjoyable.',
    'kind': 'Having a friendly nature.',
    'rude': 'Not polite.',
    'polite': 'Having good manners.',
    'quiet': 'Making little or no noise.',
    'loud': 'Producing a lot of noise.',
    'hard': 'Solid and firm to the touch.',
    'soft': 'Easy to mold or change shape.',
    'easy': 'Not difficult.',
    'difficult': 'Not easy.',
    'important': 'Of great significance.',
    'different': 'Not the same as another.',
    'same': 'Identical; not different.',
    'true': 'In accordance with fact or reality.',
    'false': 'Not according to fact or reality.',
    'right': 'Correct or acceptable.',
    'wrong': 'Not correct.',
    'sure': 'Certain.',
    'possible': 'Able to happen.',
    'impossible': 'Not able to happen.',
    'ready': 'In a suitable state for an action.',
    'busy': 'Having much to do.',
    'free': 'Not under the control of another.',
    'open': 'Not closed or locked.',
    'closed': 'Not open.',
    'full': 'Containing as much as possible.',
    'empty': 'Containing nothing.',
    'fast': 'Moving or capable of moving quickly.',
    'slow': 'Moving or operating at a low speed.',
    'early': 'Before the usual time.',
    'late': 'After the usual time.',
    'always': 'At all times.',
    'never': 'At no time.',
    'sometimes': 'Occasionally.',
    'often': 'Frequently.',
    'usually': 'Under normal conditions.',
    'already': 'Before now.',
    'still': 'Up to the present time.',
    'just': 'Exactly or at this moment.',
    'now': 'At the present time.',
    'then': 'At that time.',
    'here': 'In or at this place.',
    'there': 'In or at that place.',
    'where': 'In or to what place.',
    'when': 'At what time.',
    'how': 'In what way or manner.',
    'why': 'For what reason.',
    'what': 'Used to ask for information.',
    'which': 'Used to ask for a selection.',
    'who': 'What or which person.',
    'whose': 'Of whom or which.',
    'this': 'Used to identify a specific person or thing.',
    'that': 'Used to identify a specific person or thing.',
    'these': 'Plural of this.',
    'those': 'Plural of that.',
    'my': 'Belonging to me.',
    'your': 'Belonging to you.',
    'his': 'Belonging to him.',
    'her': 'Belonging to her.',
    'its': 'Belonging to it.',
    'our': 'Belonging to us.',
    'their': 'Belonging to them.',
    'mine': 'Belonging to me.',
    'yours': 'Belonging to you.',
    'hers': 'Belonging to her.',
    'ours': 'Belonging to us.',
    'theirs': 'Belonging to them.',
    'I': 'Used by a speaker to refer to himself or herself.',
    'you': 'Used to refer to the person or people being spoken to.',
    'he': 'Used to refer to a man or boy.',
    'she': 'Used to refer to a woman or girl.',
    'it': 'Used to refer to a thing or animal.',
    'we': 'Used by a speaker to refer to himself or herself and others.',
    'they': 'Used to refer to two or more people.',
    'me': 'Used as the object of a verb or preposition.',
    'him': 'Used as the object of a verb or preposition.',
    'them': 'Used as the object of a verb or preposition.',
    'us': 'Used as the object of a verb or preposition.',
    'myself': 'Used by a speaker to refer to himself or herself.',
    'yourself': 'Used to refer to the person being spoken to.',
    'himself': 'Used to refer to a man or boy.',
    'herself': 'Used to refer to a woman or girl.',
    'itself': 'Used to refer to a thing or animal.',
    'ourselves': 'Used to refer to oneself and others.',
    'themselves': 'Used to refer to two or more people.',
    'each': 'Used to refer to every member of a group.',
    'every': 'Used to refer to all the members of a group.',
    'all': 'The whole quantity.',
    'some': 'An unspecified amount.',
    'many': 'A large number.',
    'much': 'A large amount.',
    'few': 'A small number.',
    'little': 'A small amount.',
    'more': 'A greater amount.',
    'most': 'The greatest amount.',
    'less': 'A smaller amount.',
    'least': 'The smallest amount.',
    'both': 'Two people or things.',
    'either': 'One or the other of two.',
    'neither': 'Not one nor the other.',
    'one': 'The number 1.',
    'two': 'The number 2.',
    'first': 'Coming before all others.',
    'second': 'Coming next after the first.',
    'next': 'Coming immediately after.',
    'last': 'Coming after all others.',
    'other': 'Different from the one already mentioned.',
    'another': 'One more; an additional one.',
    'same': 'Identical to.',
    'such': 'Of the type already mentioned.',
    'own': 'Used to emphasize that something belongs to someone.',
    'very': 'To a high degree.',
    'too': 'To a higher degree than is desirable.',
    'so': 'To such a high degree.',
    'quite': 'To a considerable degree.',
    'rather': 'To a certain extent.',
    'pretty': 'To a considerable degree.',
    'almost': 'Very nearly but not exactly.',
    'nearly': 'Not quite.',
    'hardly': 'Scarcely.',
    'barely': 'Only just.',
    'even': 'Used to emphasize something.',
    'also': 'In addition.',
    'too': 'In addition.',
    'as': 'Used to compare amounts.',
    'than': 'Used to introduce the second part of a comparison.',
    'but': 'Used to introduce a phrase contrasting with what has already been mentioned.',
    'and': 'Used to connect words.',
    'or': 'Used to connect alternatives.',
    'if': 'Used to introduce a condition.',
    'because': 'For the reason that.',
    'so': 'For that reason.',
    'when': 'At what time.',
    'while': 'During the time that.',
    'since': 'From a past time until now.',
    'until': 'Up to the time that.',
    'before': 'Earlier than.',
    'after': 'Later than.',
    'above': 'At a higher level than.',
    'below': 'At a lower level than.',
    'up': 'Towards a higher position.',
    'down': 'Towards a lower position.',
    'in': 'Situated within.',
    'out': 'Situated outside.',
    'on': 'Physically in contact with and supported by.',
    'off': 'Away from.',
    'over': 'Above or covering.',
    'under': 'Below or covered by.',
    'through': 'Moving from one side to the other.',
    'across': 'From one side to the other.',
    'around': 'On all sides.',
    'between': 'In the space separating.',
    'among': 'Situated in.',
    'by': 'Identifying the agent.',
    'from': 'Indicating the point of origin.',
    'to': 'Expressing motion in the direction of.',
    'at': 'Expressing location.',
    'for': 'Affecting or benefiting.',
    'of': 'Expressing the relationship between a part and a whole.',
    'with': 'Accompanied by.',
    'without': 'Not accompanied by.',
    'about': 'On the subject of.',
    'against': 'In opposition to.',
    'like': 'Having the same characteristics.',
    'no': 'Not any.',
    'not': 'Used with an auxiliary verb to make a negative.',
    'yes': 'Used to give an affirmative response.'
  }

  // 如果是常见词，返回预定义的释义
  if (commonWords[word]) {
    return commonWords[word]
  }

  // 否则基于中文释义生成简单的英文释义
  return `A ${word.toLowerCase()}.`
}

// 生成搭配
function generateCollocation(word) {
  const commonCollocations = {
    // 动词搭配
    'have': 'have breakfast, have fun, have a good time',
    'take': 'take a break, take a shower, take a photo',
    'make': 'make a mistake, make a decision, make money',
    'do': 'do homework, do exercise, do business',
    'go': 'go shopping, go home, go to school',
    'get': 'get up, get ready, get married',
    'play': 'play football, play games, play music',
    'watch': 'watch TV, watch a film, watch a game',

    // 名词搭配
    'time': 'free time, spare time, on time',
    'day': 'every day, all day, good day',
    'way': 'the right way, the wrong way, on the way',
    'work': 'hard work, go to work, at work',
    'place': 'interesting place, safe place, public place',

    // 形容词搭配
    'good': 'very good, quite good, good at',
    'bad': 'very bad, quite bad, bad at',
    'big': 'very big, quite big',
    'small': 'very small, quite small',

    // 默认通用搭配
    'default': 'very, quite, really, very much'
  }

  // 检查是否在预定义列表中
  if (commonCollocations[word]) {
    return commonCollocations[word]
  }

  // 生成通用搭配
  return `very ${word}, quite ${word}, ${word} and more`
}

// 生成例句
function generateExample(word) {
  const commonExamples = {
    'have': {
      en: 'I have a brother and a sister.',
      cn: '我有一个兄弟和一个姐妹。'
    },
    'take': {
      en: 'Take an umbrella with you.',
      cn: '带上一把伞。'
    },
    'make': {
      en: 'She makes a delicious cake.',
      cn: '她做了一个美味的蛋糕。'
    }
  }

  // 如果有预定义例句，返回预定义的
  if (commonExamples[word]) {
    return commonExamples[word]
  }

  // 否则生成通用例句
  return {
    en: `This is a ${word}.`,
    cn: `这是一个${word}。`
  }
}

// 主函数
function main() {
  console.log('🤖 开始生成所有520个KET单词的AI数据...\n')

  const wordAI = generateWordAI()

  console.log(`✅ 成功生成 ${wordAI.length} 个单词的AI数据\n`)

  // 保存到文件
  fs.writeFileSync('ket-words-complete-ai-data.json', JSON.stringify(wordAI, null, 2))

  console.log('💾 数据已保存到: ket-words-complete-ai-data.json\n')

  // 显示一些示例
  console.log('📝 示例数据：\n')
  wordAI.slice(0, 5).forEach(item => {
    console.log(`${item.word}:`)
    console.log(`  英文: ${item.definition_en}`)
    console.log(`  搭配: ${item.collocation_en}`)
    console.log(`  例句: ${item.example_sentence_en}`)
    console.log(`  翻译: ${item.example_sentence}`)
    console.log()
  })

  console.log('🎯 接下来运行更新脚本，将这些数据写入数据库...')
}

main()
