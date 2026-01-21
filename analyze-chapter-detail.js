const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'wordlists_v1/wordlists_final/FCE.json');
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

// 检查前50个单词的chapter字段
console.log('前50个单词的chapter字段:\n');
data.words.slice(0, 50).forEach((w, idx) => {
  const chapterInfo = w.chapter ? `"${w.chapter}"` : 'null';
  console.log(`${idx + 1}. ${w.word.padEnd(20)} chapter: ${chapterInfo}`);
});

// 统计每个唯一章节名称的单词数
const chapterWordMap = {};
data.words.forEach(w => {
  if (w.chapter) {
    // chapter可能是字符串或数组
    let chapterName = '';
    if (Array.isArray(w.chapter)) {
      chapterName = w.chapter[0]; // 取第一个
    } else if (typeof w.chapter === 'string') {
      chapterName = w.chapter.split(',')[0].trim();
    }

    if (chapterName) {
      if (!chapterWordMap[chapterName]) {
        chapterWordMap[chapterName] = [];
      }
      chapterWordMap[chapterName].push(w.word);
    }
  }
});

console.log('\n\n唯一章节统计:');
console.log(`总唯一章节数: ${Object.keys(chapterWordMap).length}`);
Object.keys(chapterWordMap).forEach(chapter => {
  console.log(`  "${chapter}": ${chapterWordMap[chapter].length} 词`);
});
