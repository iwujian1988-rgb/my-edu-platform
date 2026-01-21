import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'body', def: 'The whole physical structure.', col: 'human body, my body', ex_en: 'Exercise is good for your body.', ex: '锻炼对你的身体有好处。' },
  { w: 'head', def: 'Top part of body.', col: 'shake head, my head', ex_en: 'My head hurts.', ex: '我头疼。' },
  { w: 'face', def: 'Front of head.', col: 'on your face, beautiful face', ex_en: 'She has a round face.', ex: '她圆脸。' },
  { w: 'eye', def: 'Part for seeing.', col: 'close your eyes, blue eyes', ex_en: 'She has big eyes.', ex: '她眼睛很大。' },
  { w: 'ear', def: 'Part for hearing.', col: 'in my ear, left ear', ex_en: 'Listen with both ears.', ex: '用双耳听。' },
  { w: 'nose', def: 'Part for smelling.', col: 'big nose, my nose', ex_en: 'The nose is for smelling.', ex: '鼻子是用来闻的。' },
  { w: 'mouth', def: 'Part for eating and speaking.', col: 'open your mouth, my mouth', ex_en: 'Close your mouth when eating.', ex: '吃饭时闭上嘴。' },
  { w: 'hair', def: 'Thread-like growth on head.', col: 'long hair, black hair', ex_en: 'She has long black hair.', ex: '她有长黑发。' },
  { w: 'hand', def: 'Part at end of arm.', col: 'shake hands, wash hands', ex_en: 'Wash your hands before eating.', ex: '饭前洗手。' },
  { w: 'arm', def: 'Upper limb.', col: 'left arm, my arm', ex_en: 'She carried the baby in her arms.', ex: '她抱着孩子。' },
  { w: 'finger', def: 'Part of hand.', col: 'point with finger, index finger', ex_en: 'Do not point with your finger.', ex: '别用手指指人。' },
  { w: 'heart', def: 'Organ that pumps blood.', col: 'my heart, heart attack', ex_en: 'My heart beats fast.', ex: '我心脏跳得快。' },
  { w: 'blood', def: 'Red liquid in body.', col: 'blood pressure, give blood', ex_en: 'Blood is red.', ex: '血液是红色的。' },
  { w: 'leg', def: 'Lower limb.', col: 'left leg, my leg', ex_en: 'My legs are tired.', ex: '我的腿累了。' },
  { w: 'foot', def: 'Part for standing.', col: 'left foot, sore foot', ex_en: 'My foot hurts.', ex: '我脚疼。' },
  { w: 'back', def: 'Rear part of body.', col: 'on my back, back pain', ex_en: 'I have back pain.', ex: '我背痛。' },
  { w: 'stomach', def: 'Part for digesting food.', col: 'upset stomach, my stomach', ex_en: 'My stomach is empty.', ex: '我肚子空了。' },
  { w: 'health', def: 'Condition of body.', col: 'good health, in good health', ex_en: 'Exercise is good for health.', ex: '锻炼对健康有益。' },
  { w: 'sick', def: 'Not well.', col: 'feel sick, very sick', ex_en: 'She is sick in bed.', ex: '她生病卧床。' },
  { w: 'pain', def: 'Physical suffering.', col: 'in pain, feel pain', ex_en: 'I have pain in my leg.', ex: '我腿疼。' },
  { w: 'hurt', def: 'To cause pain.', col: 'hurt yourself, very hurt', ex_en: 'My head hurts.', ex: '我头疼。' },
  { w: 'medicine', def: 'Substance to cure illness.', col: 'take medicine, give medicine', ex_en: 'Take this medicine twice a day.', ex: '这药每天吃两次。' },
  { w: 'hospital', def: 'Place for treating sick people.', col: 'in hospital, go to hospital', ex_en: 'He is in the hospital.', ex: '他在住院。' },
  { w: 'doctor', def: 'Medical person.', col: 'see doctor, family doctor', ex_en: 'The doctor will see you now.', ex: '医生现在给你看病。' },
  { w: 'nurse', def: 'Hospital worker.', col: 'nurse station, check nurse', ex_en: 'The nurse checked my temperature.', ex: '护士量了我的体温。' },
  { w: 'die', def: 'To stop living.', col: 'die of, old die', ex_en: 'Flowers die in winter.', ex: '花在冬天会死。' },
  { w: 'born', def: 'Coming out of the womb.', col: 'be born, new born', ex_en: 'I was born in 1990.', ex: '我生于1990年。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次24: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次24完成: ${ok}个\n`)
}
update()
