import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
const file=process.argv[2];
if(!file)throw new Error('Pass a lesson JSON file');
const lesson=JSON.parse(await fs.readFile(file,'utf8'));
const issues=[];
const warnings=[];
const required=['id','title','source','notes','scenario','firstAttempt','words','structure','rewrite','cloze','dictation','translationPractice','choice','output','credits','review'];
for(const key of required)if(!lesson[key])issues.push('Missing '+key);
if(!/^\d{3}$/.test(lesson.id))issues.push('Invalid lesson ID');
if(lesson.firstAttempt?.prompt&&lesson.output?.prompt&&lesson.firstAttempt.prompt.trim()===lesson.output.prompt.trim())issues.push('Transfer task duplicates the opening attempt; use a new work situation to check transfer');
if(lesson.firstAttempt?.sample&&lesson.output?.sample&&lesson.firstAttempt.sample.trim()===lesson.output.sample.trim())issues.push('Transfer answer duplicates the opening sample; provide a new response for the transfer task');
const source=lesson.source||{};
if(!source.url?.startsWith('https://'))issues.push('Source URL required');
if(source.usageBasis==='project_authorized'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(source.authorizationConfirmedAt||''))issues.push('Project authorization confirmation date required');
}else if(!source.licenseEvidence?.startsWith('https://'))issues.push('License evidence required');
if(!source.paragraphs?.length||source.paragraphs.length!==source.translations?.length)issues.push('Source/translation paragraph mismatch');
for(const [index,translation] of (source.translations||[]).entries())if(typeof translation!=='string'||!translation.trim()||/^\s*\{\s*['\"](?:i|text)['\"]\s*:/.test(translation.trim()))issues.push(`Malformed translation ${index}`);
const sourceCache=await fs.readFile(`linshi/work-english-source-cache/${lesson.id}.json`,'utf8').then(JSON.parse).catch(()=>null);
if(sourceCache)for(const paragraph of source.paragraphs||[])if(!sourceCache.paragraphs?.includes(paragraph))issues.push('Source paragraph is not verbatim from cached official page');
if(!source.fullTextParagraphs?.length)issues.push('Full original text is missing');
if(sourceCache&&source.fullTextParagraphs?.length){
 const expected=(sourceCache.paragraphs||[]).filter(text=>typeof text==='string'&&text.trim()&&!/^Heads up! This page uses features your browser doesn’t support\./i.test(text.trim()));
 if(JSON.stringify(source.fullTextParagraphs)!==JSON.stringify(expected))issues.push('Full original text differs from the verified source cache');
 const fullText=source.fullTextParagraphs.join('\n').toLowerCase();
 for(const note of lesson.notes||[])if(!fullText.includes(note.phrase.toLowerCase()))issues.push('Full text is missing annotation phrase: '+note.phrase);
 const wordCount=fullText.split(/\s+/).filter(Boolean).length;
 if(wordCount>3000)warnings.push(`Long source (${wordCount} words): keep the lesson focus passage explicit; full reading should not be a prerequisite for completing the daily lesson`);
}
if(source.displayScope!=='完整原文')issues.push('Source display scope must identify the full original text');
for(const [label,text] of [
 ['first-attempt sample',lesson.firstAttempt?.sample],
 ['scenario English',lesson.scenario?.english?.join(' ')],
 ['sentence transfer',lesson.structure?.transfer],
 ['imitation sample',lesson.rewrite?.good],
 ['output sample',lesson.output?.sample],
 ['dictation',lesson.dictation?.map(item=>item.text).join(' ')],
 ['vocabulary examples',lesson.words?.map(item=>item.example).join(' ')]
])if(typeof text==='string'&&/[\u3400-\u9fff]/.test(text))issues.push(`Chinese characters found in learner English: ${label}`);
if(new Set((lesson.words||[]).map(row=>row.id)).size!==lesson.words?.length)issues.push('Duplicate word ID');
if(lesson.words?.length<2)issues.push('Too few source vocabulary items (minimum 2)');
if(lesson.words?.length>6)issues.push('Source vocabulary exceeds six items; move lower-priority items to optional extension or remove them');
if(!lesson.taskPhrases?.length)warnings.push('Task-focused work expressions have not been curated');
if(lesson.id!=='001'&&lesson.taskPhrases?.length!==3)issues.push('Exactly three task-focused work expressions are required');
if((lesson.taskPhrases||[]).length>5)issues.push('Task-focused expressions exceed five items');
for(const phrase of lesson.taskPhrases||[])for(const field of ['id','word','meaning','collocation','example','translation'])if(typeof phrase[field]!=='string'||!phrase[field].trim())issues.push('Incomplete task expression: '+field);
if(new Set([...(lesson.words||[]),...(lesson.optionalWords||[]),...(lesson.taskPhrases||[])].map(row=>row.id)).size!==(lesson.words||[]).length+(lesson.optionalWords||[]).length+(lesson.taskPhrases||[]).length)issues.push('Duplicate IDs across vocabulary and task expressions');
if(lesson.taskPhrases?.length)for(const item of lesson.translationPractice||[])if(!lesson.taskPhrases.some(phrase=>phrase.example===item.answer&&phrase.translation===item.prompt))issues.push('Translation practice is not paired with a task expression');
if(lesson.taskPhrases?.length&&new Set(lesson.taskPhrases.map(phrase=>phrase.example.trim().toLowerCase())).size!==lesson.taskPhrases.length)issues.push('Core task expressions repeat the same example; teach three distinct expressions');
for(const item of lesson.translationPractice||[]){
 const matches=(lesson.taskPhrases||[]).filter(phrase=>phrase.example===item.answer&&phrase.translation===item.prompt);
 if(matches.length>1)issues.push('Translation practice maps to duplicate task expressions; each item must reinforce one expression');
}
if((lesson.optionalWords||[]).length>5)issues.push('Optional vocabulary exceeds five items');
for(const word of lesson.optionalWords||[])for(const field of ['id','word','meaning','example','translation'])if(typeof word[field]!=='string'||!word[field].trim())issues.push('Incomplete optional vocabulary: '+field);
if(new Set([...(lesson.words||[]),...(lesson.optionalWords||[])].map(row=>row.id)).size!==(lesson.words||[]).length+(lesson.optionalWords||[]).length)issues.push('Duplicate core/optional vocabulary ID');
if((lesson.scenario?.english||[]).some(text=>text.includes('Mina is working on ')))issues.push('Generic workplace scenario must be replaced');
if((lesson.notes||[]).some(note=>note.meaning==='结合上下文理解的工作表达'))issues.push('Generic annotation meaning must be replaced');
if((lesson.words||[]).some(item=>item.meaning==='结合上下文理解的工作表达'||/^use [a-z-]+$/i.test(item.collocation||'')||/^We should [a-z-]+ this point before the next meeting\.$/i.test(item.example||'')))issues.push('Generic or malformed vocabulary must be replaced');
if(lesson.firstAttempt?.sample==='I understand the concern. Let’s clarify the reason, agree on one next step, and check the result on Friday.'||lesson.output?.sample==='I understand the concern. Let’s clarify the reason, agree on one next step, and check the result on Friday.')issues.push('Generic output sample must be replaced');
for(const word of lesson.words||[])for(const field of ['id','word','pos','meaning','collocation','example','translation'])if(!word[field]?.trim())issues.push(`Incomplete vocabulary ${word.id||word.word||'?'}: ${field}`);
for(const note of lesson.notes||[])for(const field of ['phrase','meaning','explain','example'])if(!note[field]?.trim())issues.push(`Incomplete annotation: ${field}`);
if(lesson.cloze?.length<3||lesson.dictation?.length<2||lesson.translationPractice?.length<2)issues.push('Exercises missing');
if(lesson.choice?.correct<0||lesson.choice?.correct>=lesson.choice?.options?.length)issues.push('Choice answer invalid');
for(const note of lesson.notes||[])if(!source.paragraphs?.[note.paragraph]?.toLowerCase().includes(note.phrase.toLowerCase()))issues.push('Note does not match source: '+note.phrase);
for(const item of lesson.cloze||[])if(!item.prompt.includes('___')||!item.answer||!item.why)issues.push('Incomplete cloze: '+item.id);
const lessonWords=new Set([...(lesson.words||[]),...(lesson.taskPhrases||[])].flatMap(row=>(`${row.word} ${row.example||''} ${row.collocation||''}`.toLowerCase().match(/[a-z]+/g)||[])));
if((lesson.cloze||[]).filter(item=>(item.answer.toLowerCase().match(/[a-z]+/g)||[]).some(token=>lessonWords.has(token))).length<2)issues.push('Cloze answers do not reinforce the vocabulary or task expressions');
for(const item of lesson.dictation||[]){
 if(!item.text)issues.push('Incomplete dictation: '+item.id);
 if(item.why==='听清句中的工作任务、动作和时间信息。')issues.push('Generic dictation cue must be removed or made clip-specific: '+item.id);
}
if(!lesson.structure?.original||!source.paragraphs?.some(p=>p.includes(lesson.structure.original)))issues.push('Structure sentence is not verbatim source');
if(lesson.structure?.original?.split(/[.!?](?:\s|$)/).filter(Boolean).length>1)issues.push('Structure example contains multiple sentences');
const media=path.join(path.dirname(file),'media');
const audioIndices=source.audioIndices||[0,1,2];
if(audioIndices.length!==3||audioIndices.some(index=>!Number.isInteger(index)||!source.paragraphs?.[index]))issues.push('Invalid audio paragraph indices');
const audio=['original','scenario',...audioIndices.map((_,i)=>'sentence'+(i+1)),...(lesson.words||[]).map(item=>'word_'+item.id),...(lesson.dictation||[]).map(item=>item.id)];
for(const name of ['illustration.png',...audio.map(name=>name+'.mp3')]){
 try{const stat=await fs.stat(path.join(media,name));if(stat.size<1000)issues.push('Empty media: '+name);}
 catch{issues.push('Missing media: '+name);}
}
const html=await fs.readFile(path.join(path.dirname(file),'lesson.html'),'utf8').catch(()=>null);
if(!html||!html.includes('{{WORK_ENGLISH_RUNTIME}}'))issues.push('HTML/runtime missing');
if(html&&source.fullTextParagraphs?.length){
 const $=cheerio.load(html);
 const rendered=$('#sourceText .article-paragraph').map((_,node)=>$(node).text()).get();
 if(JSON.stringify(rendered)!==JSON.stringify(source.fullTextParagraphs))issues.push('Rendered article is not the complete original text');
 if(!$('#sourceText').length)issues.push('Full-text reading area is missing');
 const renderedOutput=$('#output').text();
 for(const [label,value] of [['transfer prompt',lesson.output?.prompt],['transfer sample',lesson.output?.sample],...((lesson.output?.check||[]).map((value,index)=>[`transfer check ${index+1}`,value]))]){
  if(typeof value==='string'&&value.trim()&&!renderedOutput.includes(value.trim()))issues.push(`Rendered output is missing ${label}`);
 }
 const renderedAttempt=$('#warmup').text();
 for(const [label,value] of [['opening prompt',lesson.firstAttempt?.prompt],['opening sample',lesson.firstAttempt?.sample]]){
  if(typeof value==='string'&&value.trim()&&!renderedAttempt.includes(value.trim()))issues.push(`Rendered warmup is missing ${label}`);
 }
}
for(const term of ['今天带走','本样例','AI 生成'])if(html?.includes(term))issues.push('Internal copy: '+term);
const result={id:lesson.id,status:issues.length?'FAIL':'PASS',audio:audio.length,sourceWords:source.fullTextParagraphs?.join(' ').split(/\s+/).length||source.paragraphs?.join(' ').split(/\s+/).length||0,issues,warnings};
console.log(JSON.stringify(result,null,2));
if(issues.length)process.exitCode=1;
