import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const ledger=JSON.parse(fs.readFileSync('docs/work-english/100期制作台账.json','utf8'));
const published=JSON.parse(fs.readFileSync('src/lib/work-english/published.json','utf8'));
const internalPreview=JSON.parse(fs.readFileSync('src/lib/work-english/internal-preview.json','utf8'));
const permissionCatalog=[...new Map([...published,...internalPreview].map(row=>[row.id,row])).values()];
const results=[];
const imageHashes=new Map();
for(let number=1;number<=100;number++){
 const id=String(number).padStart(3,'0');
 const dir=path.join('src/content/work-english',id);
 const file=path.join(dir,'lesson.json');
 const entry=ledger.lessons.find(row=>row.id===id);
 const lesson=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 const check=lesson?spawnSync(process.execPath,['tools/work-english-validate-lesson.mjs',file],{encoding:'utf8'}):null;
 let validation=id==='001'&&fs.existsSync(path.join(dir,'lesson.html'))?{status:'PASS',issues:[]}:{status:'MISSING',issues:['lesson.json missing']};
 if(check){try{validation=JSON.parse(check.stdout)}catch{validation={status:'FAIL',issues:[check.stderr||check.stdout||'validator did not return JSON']}}}
 const mediaDir=path.join(dir,'media');
 const media=fs.existsSync(mediaDir)?fs.readdirSync(mediaDir):[];
 const audioFiles=media.filter(name=>name.endsWith('.mp3'));
 const imagePath=path.join(mediaDir,'illustration.png');
 const hasImage=fs.existsSync(imagePath);
 if(hasImage){const hash=createHash('sha256').update(fs.readFileSync(imagePath)).digest('hex');imageHashes.set(hash,[...(imageHashes.get(hash)||[]),id]);}
 const sourceText=lesson?.source?.paragraphs?.join(' ')||'';
 const sourceCache=JSON.parse(fs.readFileSync(`linshi/work-english-source-cache/${id}.json`,'utf8'));
 results.push({
  id,title:lesson?.title||entry?.title||null,baseline:id==='001',
  validation:validation.status,
  validationIssues:validation.issues||[],
  sourceWords:sourceText.split(/\s+/).filter(Boolean).length,
  fullTextWords:(lesson?.source?.fullTextParagraphs?.join(' ')||'').split(/\s+/).filter(Boolean).length,
  fullTextParagraphs:lesson?.source?.fullTextParagraphs?.length||0,
  focusParagraphs:lesson?.source?.paragraphs?.length||0,
  sourceCacheWords:sourceCache.wordCount||0,
  vocab:lesson?.words?.length||0,notes:lesson?.notes?.length||0,
  exercises:{cloze:lesson?.cloze?.length||0,dictation:lesson?.dictation?.length||0,translation:lesson?.translationPractice?.length||0},
  audioFiles:audioFiles.length,hasImage,hasHtml:fs.existsSync(path.join(dir,'lesson.html')),
  inCatalog:published.some(row=>row.id===id),userAccessible:permissionCatalog.some(row=>row.id===id),review:lesson?.review?.status||null,
  editorialWarnings:validation.warnings||[],
  genericScenario:lesson?.scenario?.english?.some(text=>text.includes('Mina is working on '))||false,
  ledgerStatus:entry?.lessonStatus||'not_in_ledger'
 });
}
const report={
 generatedAt:new Date().toISOString(),target:100,
 summary:{lessons:results.filter(row=>row.validation==='PASS').length,validationFailed:results.filter(row=>row.validation!=='PASS').length,sourceCacheAtLeast150:results.filter(row=>row.sourceCacheWords>=150).length,sourceCacheBelow150:results.filter(row=>row.sourceCacheWords<150).length,publishedCatalogCount:results.filter(row=>row.inCatalog).length,permissionCatalogCount:results.filter(row=>row.userAccessible).length,notInPermissionCatalog:results.filter(row=>row.validation==='PASS'&&!row.userAccessible).length,html:results.filter(row=>row.hasHtml).length,illustrations:results.filter(row=>row.hasImage).length,uniqueIllustrations:imageHashes.size,audioAssets:results.reduce((sum,row)=>sum+row.audioFiles,0),audioComplete:results.filter(row=>row.audioFiles>=13).length,needsEditorialReview:results.filter(row=>row.review==='needs_editorial_review').length,editoriallyApproved:results.filter(row=>row.review==='approved').length,longSourceWarnings:results.filter(row=>row.editorialWarnings.length>0).length},
 duplicateImageGroups:[...imageHashes.values()].filter(ids=>ids.length>1),
 failures:results.filter(row=>row.validation!=='PASS'||!row.hasImage||row.audioFiles<13),
 lessons:results
};
fs.writeFileSync('docs/work-english/100期自测报告.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary:report.summary,duplicateImageGroups:report.duplicateImageGroups,failures:report.failures.map(({id,validation,validationIssues,audioFiles,hasImage,hasHtml})=>({id,validation,validationIssues,audioFiles,hasImage,hasHtml}))},null,2));
