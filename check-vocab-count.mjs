import fs from 'fs';
const files = [
  './linshi/InnerFrench 中级法语_processed/E174 Apprendre le français en immersion dans l' + 'Utah_materials.json',
  './linshi/InnerFrench 中级法语_processed/E176 À la découverte des côtes normandes et bretonnes_materials.json'
];

files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const vocab = data.materials.unit_1.language_analysis.vocabulary;
    console.log(file.split('/').pop());
    console.log('  vocabulary.length:', vocab.length);
  } catch(e) {
    console.log(file.split('/').pop(), ':', e.message);
  }
});