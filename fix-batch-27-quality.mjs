import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'good', def: 'Of high quality.', col: 'very good, be good', ex_en: 'This is a good book.', ex: '这是本好书。' },
  { w: 'bad', def: 'Not good.', col: 'very bad, be bad', ex_en: 'That was a bad idea.', ex: '那是个坏主意。' },
  { w: 'better', def: 'More good.', col: 'get better, feel better', ex_en: 'I feel better now.', ex: '我现在感觉好多了。' },
  { w: 'best', def: 'The most good.', col: 'the best, best friend', ex_en: 'You are my best friend.', ex: '你是我最好的朋友。' },
  { w: 'worse', def: 'More bad.', col: 'get worse, even worse', ex_en: 'The weather got worse.', ex: '天气变得更糟了。' },
  { w: 'worst', def: 'The most bad.', col: 'the worst, worst case', ex_en: 'This is the worst day.', ex: '这是最糟糕的一天。' },
  { w: 'big', def: 'Of large size.', col: 'very big, too big', ex_en: 'That is a big house.', ex: '那是座大房子。' },
  { w: 'small', def: 'Of little size.', col: 'very small, too small', ex_en: 'The room is small.', ex: '房间很小。' },
  { w: 'large', def: 'Of big size.', col: 'very large, large area', ex_en: 'This is a large city.', ex: '这是座大城市。' },
  { w: 'little', def: 'Small in amount or size.', col: 'very little, a little', ex_en: 'I have a little money.', ex: '我有一点点钱。' },
  { w: 'huge', def: 'Very big.', col: 'very huge, huge success', ex_en: 'They made a huge success.', ex: '他们取得了巨大成功。' },
  { w: 'tiny', def: 'Very small.', col: 'very tiny, tiny amount', ex_en: 'A tiny bug flew in.', ex: '一只小虫子飞进来了。' },
  { w: 'same', def: 'Not different.', col: 'the same, stay the same', ex_en: 'We are in the same class.', ex: '我们在同一个班。' },
  { w: 'different', def: 'Not the same.', col: 'very different, different from', ex_en: 'We have different ideas.', ex: '我们有不同的想法。' },
  { w: 'other', def: 'Not the same one.', col: 'each other, the other', ex_en: 'Where are the others?', ex: '其他人呢？' },
  { w: 'another', def: 'One more.', col: 'one another, another one', ex_en: 'Would you like another?', ex: '你还想要一个吗？' },
  { w: 'such', def: 'Of that kind.', col: 'such as, such good', ex_en: 'I like games such as football.', ex: '我喜欢足球之类的游戏。' },
  { w: 'some', def: 'An amount of.', col: 'some people, some time', ex_en: 'I need some water.', ex: '我需要一些水。' },
  { w: 'any', def: 'One or some.', col: 'any more, any time', ex_en: 'Do you have any questions?', ex: '你有什么问题吗？' },
  { w: 'every', def: 'Each one.', col: 'every day, every time', ex_en: 'I go to school every day.', ex: '我每天都上学。' },
  { w: 'all', def: 'The whole.', col: 'all day, all of us', ex_en: 'We are all here.', ex: '我们都在这儿。' },
  { w: 'both', def: 'The two together.', col: 'both of, both and', ex_en: 'Both of them came.', ex: '他们两个都来了。' },
  { w: 'each', def: 'Every one.', col: 'each of, each other', ex_en: 'Each person gets one.', ex: '每人一个。' },
  { w: 'either', def: 'One or the other.', col: 'either of, on either', ex_en: 'You can take either one.', ex: '你可以任选一个。' },
  { w: 'neither', def: 'Not one nor the other.', col: 'neither of, neither nor', ex_en: 'Neither answer is correct.', ex: '两个答案都不对。' },
  { w: 'many', def: 'A lot.', col: 'very many, so many', ex_en: 'I have many friends.', ex: '我有很多朋友。' },
  { w: 'much', def: 'A large amount.', col: 'too much, very much', ex_en: 'There is too much traffic.', ex: '交通太堵了。' },
  { w: 'more', def: 'Greater amount.', col: 'more and more, more than', ex_en: 'I need more time.', ex: '我需要更多时间。' },
  { w: 'most', def: 'The majority.', col: 'the most, at most', ex_en: 'Most people agree.', ex: '大多数人同意。' },
  { w: 'less', def: 'Smaller amount.', col: 'less and less, even less', ex_en: 'I want less sugar.', ex: '我要少点糖。' },
  { w: 'least', def: 'The smallest amount.', col: 'at least, the least', ex_en: 'At least try.', ex: '至少试一试。' },
  { w: 'enough', def: 'As much as needed.', col: 'good enough, enough for', ex_en: 'Is that enough?', ex: '那够了吗？' },
  { w: 'too', def: 'More than needed.', col: 'too much, too many', ex_en: 'It is too hot.', ex: '太热了。' },
  { w: 'very', def: 'To a high degree.', col: 'very much, very good', ex_en: 'It is very good.', ex: '这很好。' },
  { w: 'quite', def: 'To a degree.', col: 'quite good, quite sure', ex_en: 'I am quite sure.', ex: '我很确定。' },
  { w: 'rather', def: 'Quite; or preferably.', col: 'rather than, would rather', ex_en: 'I would rather stay home.', ex: '我宁愿待在家里。' },
  { w: 'real', def: 'Not fake.', col: 'real life, very real', ex_en: 'Is this real gold?', ex: '这是真金吗？' },
  { w: 'true', def: 'Not false.', col: 'very true, come true', ex_en: 'It is true.', ex: '那是真的。' },
  { w: 'false', def: 'Not true.', col: 'very false, all false', ex_en: 'The story is false.', ex: '这个故事是假的。' },
  { w: 'right', def: 'Correct or direction.', col: 'right answer, turn right', ex_en: 'You are right.', ex: '你是对的。' },
  { w: 'wrong', def: 'Not correct.', col: 'wrong way, get wrong', ex_en: 'That is the wrong way.', ex: '方向错了。' },
  { w: 'easy', def: 'Not difficult.', col: 'very easy, quite easy', ex_en: 'The test was easy.', ex: '测验很简单。' },
  { w: 'hard', def: 'Difficult.', col: 'very hard, work hard', ex_en: 'It is hard to learn.', ex: '学习很难。' },
  { w: 'difficult', def: 'Not easy.', col: 'very difficult, be difficult', ex_en: 'It is a difficult problem.', ex: '这是个难题。' },
  { w: 'simple', def: 'Easy to understand.', col: 'very simple, quite simple', ex_en: 'Keep it simple.', ex: '保持简单。' },
  { w: 'complex', def: 'Complicated.', col: 'very complex, quite complex', ex_en: 'The problem is complex.', ex: '这个问题很复杂。' },
  { w: 'clear', def: 'Easy to see through.', col: 'very clear, quite clear', ex_en: 'The water is clear.', ex: '水很清澈。' },
  { w: 'strange', def: 'Unusual.', col: 'very strange, look strange', ex_en: 'That is strange.', ex: '那很奇怪。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次27: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次27完成: ${ok}个\n`)
}
update()
