import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'sport', def: 'Physical games or exercise.', col: 'play sport, team sport', ex_en: 'Football is my favorite sport.', ex: '足球是我最喜欢的运动。' },
  { w: 'game', def: 'An activity for fun.', col: 'play game, football game', ex_en: 'Let us play a game.', ex: '我们玩游戏吧。' },
  { w: 'football', def: 'A game played with a round ball.', col: 'play football, football match', ex_en: 'We played football after school.', ex: '放学后我们踢了足球。' },
  { w: 'basketball', def: 'A game with a ball and hoops.', col: 'play basketball, basketball court', ex_en: 'He is good at basketball.', ex: '他擅长篮球。' },
  { w: 'tennis', def: 'A game with rackets and a ball.', col: 'play tennis, tennis ball', ex_en: 'Do you play tennis?', ex: '你打网球吗？' },
  { w: 'swim', def: 'To move through water.', col: 'learn to swim, swim fast', ex_en: 'I swim every weekend.', ex: '我每个周末游泳。' },
  { w: 'run', def: 'To move quickly on foot.', col: 'run fast, go for a run', ex_en: 'I run in the park every morning.', ex: '我每天早上在公园跑步。' },
  { w: 'walk', def: 'To move on foot.', col: 'go for a walk, take a walk', ex_en: 'Let us go for a walk.', ex: '我们去散步吧。' },
  { w: 'jump', def: 'To push off the ground.', col: 'jump high, long jump', ex_en: 'The horse can jump very high.', ex: '这匹马能跳得很高。' },
  { w: 'dance', def: 'To move to music.', col: 'learn to dance, dance music', ex_en: 'They love to dance.', ex: '他们喜欢跳舞。' },
  { w: 'sing', def: 'To make music with voice.', col: 'sing song, sing along', ex_en: 'Can you sing?', ex: '你会唱歌吗？' },
  { w: 'play', def: 'To enjoy an activity.', col: 'play with, play game', ex_en: 'Children love to play.', ex: '孩子们喜欢玩耍。' },
  { w: 'win', def: 'To be the best.', col: 'win game, win prize', ex_en: 'Our team won the match.', ex: '我们队赢了比赛。' },
  { w: 'lose', def: 'To not win.', col: 'lose game, lose match', ex_en: 'Do not be sad if you lose.', ex: '输了也别难过。' },
  { w: 'team', def: 'A group playing together.', col: 'team member, team work', ex_en: 'Our team is strong.', ex: '我们队很强。' },
  { w: 'match', def: 'A game or competition.', col: 'football match, watch match', ex_en: 'The match was exciting.', ex: '比赛很精彩。' },
  { w: 'score', def: 'Points in a game.', col: 'high score, final score', ex_en: 'What is the score?', ex: '比分多少？' },
  { w: 'goal', def: 'Scoring in a game; or an aim.', col: 'score goal, life goal', ex_en: 'He scored a goal!', ex: '他进球了！' },
  { w: 'prize', def: 'Something given to a winner.', col: 'win prize, big prize', ex_en: 'She won first prize.', ex: '她赢得了一等奖。' },
  { w: 'champion', def: 'The winner.', col: 'world champion, become champion', ex_en: 'He is the world champion.', ex: '他是世界冠军。' },
  { w: 'fan', def: 'Someone who likes something much.', col: 'football fan, big fan', ex_en: 'I am a big fan of music.', ex: '我是音乐迷。' },
  { w: 'player', def: 'Someone who plays a game.', col: 'football player, tennis player', ex_en: 'He is a professional player.', ex: '他是职业选手。' },
  { w: 'coach', def: 'Someone who trains.', col: 'football coach, head coach', ex_en: 'The coach is very strict.', ex: '教练很严格。' },
  { w: 'club', def: 'A group for people with same interest.', col: 'join club, football club', ex_en: 'I joined a book club.', ex: '我加入了一个读书俱乐部。' },
  { w: 'gym', def: 'A place for exercise.', col: 'go to gym, gym class', ex_en: 'I go to the gym three times a week.', ex: '我每周去健身房三次。' },
  { w: 'stadium', def: 'A place for sports.', col: 'football stadium, big stadium', ex_en: 'The stadium is huge.', ex: '体育场很大。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次22: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次22完成: ${ok}个\n`)
}
update()
