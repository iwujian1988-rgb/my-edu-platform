import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
);

const { data: a1Book } = await supabase
  .from('books')
  .select('id')
  .eq('title', '法语A1')
  .single();

console.log('=== 法语A1 全面诊断报告 ===\n');
console.log(`书籍ID: ${a1Book.id}\n`);

// 1. 获取所有单词
const { data: allWords } = await supabase
  .from('words')
  .select('id, word, definition, definition_en, part_of_speech, example_sentence, language_data')
  .eq('book_id', a1Book.id);

console.log(`总单词数: ${allWords.length}\n`);

// 2. 问题分类统计
const issues = {
  conjugation: [],      // 动词变位形式
  missingGender: [],    // 名词缺少阴阳性
  badDefinition: [],    // 释义质量差
  duplicate: [],        // 重复单词
  missingBasic: [],     // 缺失的基础词汇
  wrongCategory: [],    // 词性分类错误
};

// 3. 检测动词变位形式
// 法语动词变位特征：原形以 -er, -ir, -re 结尾
// 变位形式通常不以这些结尾
const infinitiveEndings = ['er', 'ir', 're', 'oir', 'aire'];
const conjugationPatterns = [
  /ent$/, /ons$/, /ez$/, /ais$/, /ait$/, /aient$/,  // 直陈式
  /erai$/, /eras$/, /era$/, /erons$/, /erez$/, /eront$/,  // 将来时
  /irai$/, /iras$/, /ira$/, /irons$/, /irez$/, /iront$/,
  /asse$/, /asses$/, /ât$/, /âmes$/, /âtes$/, /assent$/,  // 虚拟式未完成过去时
  /isse$/, /isses$/, /ît$/, /îmes$/, /îtes$/, /issent$/,
  /eusse$/, /eusses$/, /eût$/, /eûmes$/, /eûtes$/, /eussent$/,
  /ant$/,  // 现在分词
];

allWords.forEach(w => {
  if (w.part_of_speech === 'verb') {
    const word = w.word.toLowerCase();
    const isInfinitive = infinitiveEndings.some(end => word.endsWith(end));
    const isConjugation = conjugationPatterns.some(p => p.test(word));

    // 特殊情况：某些以er结尾的不是原形
    const specialCases = ['mer', 'fer', 'ver', 'cher', 'air']; // 这些可能是其他词

    if (!isInfinitive || isConjugation) {
      issues.conjugation.push({
        word: w.word,
        definition: w.definition,
        suggestion: `可能是变位形式，建议检查是否有原形动词`
      });
    }
  }
});

// 4. 检测名词缺少阴阳性
allWords.forEach(w => {
  if (w.part_of_speech === 'noun') {
    const hasGender = w.language_data?.fr?.gender;
    if (!hasGender) {
      issues.missingGender.push(w.word);
    }
  }
});

// 5. 检测释义质量问题
const badPatterns = [
  { pattern: /的变位/, issue: '释义包含"的变位"' },
  { pattern: /他她/, issue: '释义包含"他她"' },
  { pattern: /动词变位/, issue: '释义包含"动词变位"' },
  { pattern: /^[a-z]+的$/, issue: '释义以"的"结尾' },
];

allWords.forEach(w => {
  badPatterns.forEach(({ pattern, issue }) => {
    if (pattern.test(w.definition)) {
      issues.badDefinition.push({
        word: w.word,
        definition: w.definition,
        issue
      });
    }
  });
});

// 6. 检测重复单词
const wordCount = {};
allWords.forEach(w => {
  const key = w.word.toLowerCase();
  if (!wordCount[key]) wordCount[key] = [];
  wordCount[key].push(w);
});

Object.entries(wordCount).forEach(([word, entries]) => {
  if (entries.length > 1) {
    issues.duplicate.push({
      word,
      count: entries.length,
      poses: entries.map(e => e.part_of_speech).join(', ')
    });
  }
});

// 7. 检测缺失的基础词汇（CECR A1标准）
const a1BasicWords = [
  // 动词
  'être', 'avoir', 'faire', 'aller', 'venir', 'prendre', 'donner', 'parler',
  'dire', 'savoir', 'connaître', 'voir', 'entendre', 'vouloir', 'pouvoir',
  'devoir', 'lire', 'écrire', 'comprendre', 'manger', 'boire', 'dormir',
  'travailler', 'étudier', 'habiter', 'aimer', 'adorer', 'détester',
  // 冠词
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'au', 'aux',
  // 代词
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'leur', 'y', 'en',
  // 疑问词
  'qui', 'que', 'quoi', 'où', 'quand', 'comment', 'pourquoi', 'combien',
  // 连词
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que',
  // 介词
  'à', 'de', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'chez', 'en',
  // 副词
  'oui', 'non', 'ne', 'pas', 'plus', 'très', 'beaucoup', 'peu', 'aussi',
  'toujours', 'jamais', 'souvent', 'maintenant', 'aujourd\'hui', 'demain', 'hier',
  // 名词
  'bonjour', 'bonsoir', 'merci', 'au revoir', 'monsieur', 'madame', 'mademoiselle',
  'homme', 'femme', 'enfant', 'fille', 'garçon', 'personne', 'ami', 'famille',
  'maison', 'appartement', 'chambre', 'école', 'travail', 'jour', 'année',
  // 形容词
  'bon', 'mauvais', 'grand', 'petit', 'beau', 'nouveau', 'vieux', 'jeune',
  'français', 'anglais', 'chinois', 'autre', 'même', 'tout',
];

a1BasicWords.forEach(word => {
  const found = allWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (!found) {
    issues.missingBasic.push(word);
  }
});

// 8. 输出报告
console.log('=== 问题统计 ===\n');
console.log(`1. 动词变位形式（应删除或替换为原形）: ${issues.conjugation.length}`);
console.log(`2. 名词缺少阴阳性: ${issues.missingGender.length}`);
console.log(`3. 释义质量差: ${issues.badDefinition.length}`);
console.log(`4. 重复单词: ${issues.duplicate.length}`);
console.log(`5. 缺失的A1基础词汇: ${issues.missingBasic.length}`);

console.log('\n=== 详细问题 ===\n');

console.log('1. 动词变位形式（前30个）:');
issues.conjugation.slice(0, 30).forEach(item => {
  console.log(`  - ${item.word}: ${item.definition}`);
});

console.log('\n2. 释义质量差（前30个）:');
issues.badDefinition.slice(0, 30).forEach(item => {
  console.log(`  - ${item.word}: "${item.definition}" (${item.issue})`);
});

console.log('\n3. 重复单词（重复次数>2）:');
issues.duplicate.filter(d => d.count > 2).forEach(item => {
  console.log(`  - ${item.word}: 出现 ${item.count} 次 (${item.poses})`);
});

console.log('\n4. 缺失的A1基础词汇（全部）:');
console.log(issues.missingBasic.join(', '));

console.log('\n5. 名词缺少阴阳性（前20个）:');
console.log(issues.missingGender.slice(0, 20).join(', '));

// 9. 保存完整报告到文件
import fs from 'fs';
fs.writeFileSync('temp_a1_full_report.json', JSON.stringify({
  total: allWords.length,
  issues: {
    conjugation: issues.conjugation.length,
    missingGender: issues.missingGender.length,
    badDefinition: issues.badDefinition.length,
    duplicate: issues.duplicate.length,
    missingBasic: issues.missingBasic.length,
  },
  details: issues
}, null, 2));

console.log('\n完整报告已保存到 temp_a1_full_report.json');
