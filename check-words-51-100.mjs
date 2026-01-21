import fs from 'fs';
const data = JSON.parse(fs.readFileSync('ket-words-list.json', 'utf-8'));
console.log('Total:', data.words.length);
console.log('\nWords 51-100:\n');
data.words.slice(50, 100).forEach((w, i) => {
  console.log(`${50 + i + 1}. ${w.word} (${w.id})`);
});
