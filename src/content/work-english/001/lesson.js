(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const data = JSON.parse($('lessonData').textContent);
 const {state,save} = window.workEnglishStore;
 let toastTimer;
 state.results ||= {}; state.words ||= {}; state.review ||= {};
 const toast = text => { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 2800); };
 document.querySelectorAll('[data-save]').forEach(el => {
   if (Object.prototype.hasOwnProperty.call(state, el.id)) { if (el.type === 'checkbox') el.checked = !!state[el.id]; else el.value = state[el.id]; }
   el.addEventListener('input', () => { state[el.id] = el.type === 'checkbox' ? el.checked : el.value; save(); });
 });
 function toggle(button, panel, onText, offText) { $(button).addEventListener('click', () => { const show = $(panel).hidden; $(panel).hidden = !show; $(button).textContent = show ? onText : offText; $(button).setAttribute('aria-expanded', String(show)); }); }
 toggle('translationBtn','translation','隐藏中文对照','显示中文对照');
 toggle('caseTranslateBtn','caseTranslation','隐藏场景中文','显示场景中文');
 function mode(on) { $('sourceSheet').classList.toggle('annotated-mode', on); $('plainReadBtn').setAttribute('aria-pressed', String(!on)); $('annotateReadBtn').setAttribute('aria-pressed', String(on)); $('segmentGuide').hidden = !on; if (!on) closeDocumentNote(false); }
 $('plainReadBtn').addEventListener('click', () => mode(false)); $('annotateReadBtn').addEventListener('click', () => mode(true));
 // Learning notes belong to this independent course, not to the source company's employees.
 const documentNotes = [
   ['通常而言','In general 放在句首，引出一般原则，同时为特殊情况保留余地。','In general, we share the agenda before the meeting.'],
   ['礼貌和尊重，也是一项工作要求','It is important to + 动词原形，用来说明原则。与后面的 while also 连读：礼貌与表达清楚需要同时做到。','It is important to be specific when giving feedback.'],
   ['同时做到清楚、有帮助','while also being … 补充同时成立的要求。反馈礼貌，并不意味着避开真正的问题。','Keep the update brief while also being clear about the risks.'],
   ['你正在审阅其代码的开发者','whose 表示所属关系：the developer 的 code。这个从句限定前面的 developer。','Talk to the colleague whose report you are reviewing.'],
   ['始终围绕工作内容评论','about the code 与下一句 about the developer 形成对照。把评价对象放在文档、流程或具体行为上。','The report needs a clearer summary of the findings.'],
   ['避免把工作问题变成人身评价','always … and never … 明确划出原则边界。这里强调评论工作产物，而不是给开发者本人贴标签。','The update is missing a delivery date.'],
   ['尤其是在可能引起争议的时候','when saying … 表示说某些话时；otherwise 表示如果不采用前面的做法；contentious 指可能引起争议的。','Be specific when discussing a contentious issue.'],
   ['说明你观察到的收益不足','without 表示缺少；that I can see 限定为自己目前能观察到的情况，给对方补充信息留下空间。','This extra step adds time without any clear benefit that I can see.'],
   ['给出具体、可以执行的建议','it is best for … to … 提出推荐做法；instead of 引出要替代的做法。这比只指出问题更有助于推进修改。','It is best for this report to lead with the findings instead of the background.'],
 ];
 const documentMarks = [...$('sourceText').querySelectorAll('.seg')];
 let activeDocumentMark = null;
 function closeDocumentNote(restoreFocus) {
   const previous = activeDocumentMark;
   documentMarks.forEach(mark => { mark.classList.remove('doc-selected'); mark.setAttribute('aria-expanded','false'); });
   $('docNoteDetail').hidden=true; $('docNoteIntro').hidden=false; activeDocumentMark=null;
   if (restoreFocus && previous) previous.focus();
 }
 function showDocumentNote(index) {
   const mark=documentMarks[index], note=documentNotes[index]; if (!mark || !note) return;
   mode(true); closeDocumentNote(false); activeDocumentMark=mark;
   mark.classList.add('doc-selected'); mark.setAttribute('aria-expanded','true');
   $('docNoteNumber').textContent='表达批注 '+String(index+1).padStart(2,'0');
   $('docNoteQuote').textContent=mark.textContent;
   $('docNoteMeaning').textContent=note[0]; $('docNoteExplain').textContent=note[1]; $('docNoteExample').textContent=note[2];
   $('docNoteIntro').hidden=true; $('docNoteDetail').hidden=false;
   if (innerWidth>760 && innerWidth<=1050) $('docNoteDetail').scrollIntoView({block:'nearest'});
 }
 documentMarks.forEach((mark,index)=>{
   mark.setAttribute('role','button');mark.tabIndex=0;mark.setAttribute('aria-controls','docNoteDetail');mark.setAttribute('aria-expanded','false');
   mark.setAttribute('aria-label',mark.textContent+'：查看学习批注');
   mark.addEventListener('click',()=>showDocumentNote(index));
   mark.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showDocumentNote(index);}});
 });
 document.querySelectorAll('[data-note-jump]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.noteJump);showDocumentNote(index);documentMarks[index].scrollIntoView({block:'center'});}));
 $('docNoteClose').addEventListener('click',()=>closeDocumentNote(true));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('docNoteDetail').hidden)closeDocumentNote(true);});
 const outlineLinks=[...document.querySelectorAll('.doc-outline a')];
 outlineLinks.forEach(link=>link.addEventListener('click',()=>{outlineLinks.forEach(item=>item.classList.toggle('active',item===link));}));
 $('caseAnnotateBtn').addEventListener('click', () => { const on = $('longReading').classList.toggle('annotation-on'); $('caseAnnotateBtn').setAttribute('aria-pressed', String(on)); $('caseAnnotateBtn').textContent = on ? '关闭场景表达批注' : '打开场景表达批注'; });
 $('printBtn').addEventListener('click', () => window.print());
 document.querySelectorAll('.copyBtn').forEach(btn => btn.addEventListener('click', async () => {
   try { if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(btn.dataset.copy);
     else { const box = document.createElement('textarea'); box.value = btn.dataset.copy; box.style.cssText = 'position:fixed;opacity:0'; document.body.append(box); box.select(); const ok = document.execCommand('copy'); box.remove(); if (!ok) throw new Error(); }
     toast('已复制示例');
   } catch { toast('请选中示例文字手动复制。'); }
 }));
 const player = $('lessonAudio'); let currentClip = 'original'; player.dataset.key = currentClip;
 player.src = data.audio.original.src;
 player.load();
 player.playbackRate = Number($('speedSelect').value);
 function setSelected() { document.querySelectorAll('[data-play]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.play === currentClip))); }
 setSelected();
 async function playClip(id) {
   const clip = data.audio[id]; if (!clip) return;
   if (currentClip !== id) { currentClip = id; player.src = clip.src; player.dataset.key = id; player.load(); }
   else player.currentTime = 0;
   setSelected();
   player.playbackRate = Number($('speedSelect').value); player.loop = $('loopClip').checked;
   $('audioNow').textContent = clip.label; $('audioStatus').textContent = '正在准备播放…';
   try { await player.play(); } catch { $('audioStatus').textContent = '暂时无法播放，请在上方播放器中点播放，或重试播放。'; setSelected(); }
 }
 document.querySelectorAll('[data-play]').forEach(btn => btn.addEventListener('click', () => playClip(btn.dataset.play)));
 player.addEventListener('play', () => { setSelected(); $('audioStatus').textContent = '正在播放：' + data.audio[currentClip].label; $('miniAudio').hidden=false; $('miniAudioLabel').textContent=data.audio[currentClip].label; $('miniPause').textContent='暂停'; });
 player.addEventListener('pause', () => { setSelected(); $('audioStatus').textContent = player.ended ? '播放完成。可以再听一次，或跟读后继续。' : '已暂停；可在播放器中继续。'; $('miniPause').textContent='继续'; });
 player.addEventListener('ended', () => { setSelected(); $('audioStatus').textContent = '播放完成。可以再听一次，或跟读后继续。'; $('miniAudio').hidden=true; });
 $('miniPause').addEventListener('click',async()=>{if(player.paused){try{await player.play();}catch{toast('请在听音模块的播放器中重试。');}}else player.pause();});
 $('miniStop').addEventListener('click',()=>{player.pause();player.currentTime=0;$('miniAudio').hidden=true;$('audioStatus').textContent='已停止播放。';});
 player.addEventListener('error', () => { setSelected(); $('audioStatus').textContent = '音频未能载入。文字与练习仍可使用；请重试播放。'; });
 $('speedSelect').addEventListener('change', () => player.playbackRate = Number($('speedSelect').value));
 $('docSpeed').addEventListener('change',()=>{ $('speedSelect').value=$('docSpeed').value; $('speedSelect').dispatchEvent(new Event('change')); });
 $('speedSelect').addEventListener('change',()=>{ $('docSpeed').value=$('speedSelect').value; });
 $('loopClip').addEventListener('change', () => player.loop = $('loopClip').checked);
 $('hideTranscript').addEventListener('change', () => { document.querySelectorAll('.sentence-transcript').forEach(p => p.hidden = $('hideTranscript').checked); document.querySelectorAll('.transcript-placeholder').forEach(p => p.hidden = !$('hideTranscript').checked); });
 window.addEventListener('pagehide', () => player.pause());
 $('vocabRecall').addEventListener('change', () => document.querySelectorAll('.word-entry details').forEach(d => d.open = !$('vocabRecall').checked));
 const nextDay = days => { const date = new Date(); date.setDate(date.getDate() + days); date.setHours(0,0,0,0); return date.getTime(); };
 function wordButtons() { document.querySelectorAll('.save-word').forEach(btn => { const active = !!state.words[btn.dataset.word]; btn.setAttribute('aria-pressed',String(active)); btn.textContent = active ? '已加入词本' : '加入词本'; }); const selected = data.words.filter(w => state.words[w.id]).length; $('wordCount').textContent = selected + ' / ' + data.words.length + ' 个表达已加入词本'; }
 document.querySelectorAll('.save-word').forEach(btn => btn.addEventListener('click', () => { const id = btn.dataset.word; state.words[id] = !state.words[id]; if (state.words[id] && !state.review[id]) state.review[id] = {due:nextDay(1), last:'待自测'}; save(); wordButtons(); renderReview(); }));
 wordButtons();
 const labels = {c1:'表达填空：locate',c2:'表达填空：Could we',c3:'表达填空：That way',d1:'听写：原文短句',d2:'听写：报告修改建议',quiz:'语气判断：给出可执行的反馈'};
 function record(id, correct) { state.results[id] = {correct, attempts:(state.results[id]?.attempts || 0) + 1}; save(); renderReview(); }
 const normalize = text => text.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9'\s]/g,' ').replace(/\s+/g,' ').trim();
 const clozes = [{id:'c1',answer:'locate',why:'hard to locate：不容易找到。locate 强调在文档中找到具体内容。'},{id:'c2',answer:'could',why:'Could we + 动词原形：用疑问句提出建议。'},{id:'c3',answer:'that',why:'That way：这样一来，用来说明前一个建议的好处。'}];
 $('checkCloze').addEventListener('click', () => { clozes.forEach(c => { const value = normalize($(c.id).value); const out = $(c.id+'Feedback'); out.hidden = false; if (!value) { out.dataset.result = ''; out.textContent = '先填一个单词，再检查。'; return; } const correct = value === c.answer; out.dataset.result = correct ? 'correct' : 'retry'; out.textContent = (correct ? '正确。' : '再看搭配。本题参考词：'+c.answer+'。') + c.why; record(c.id,correct); }); });
 function matchedWords(actual, expected) {
   const a = actual.split(' ').filter(Boolean), b = expected.split(' ').filter(Boolean), dp = Array.from({length:a.length+1}, () => Array(b.length+1).fill(0));
   for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
   const found = new Set(); let i=a.length,j=b.length; while(i>0&&j>0){if(a[i-1]===b[j-1]){found.add(j-1);i--;j--;}else if(dp[i-1][j]>=dp[i][j-1])i--;else j--;}
   return {found,words:b};
 }
 data.dictations.forEach(d => $(d.id+'Check').addEventListener('click', () => {
   const out = $(d.id+'Feedback'), actual = normalize($(d.id+'Input').value), expected = normalize(d.text); out.hidden = false; out.replaceChildren();
   if(!actual){out.textContent='先听一遍并写下内容，再核对。';return;}
   const correct = actual === expected; out.dataset.result = correct?'correct':'retry'; const p=document.createElement('p'); p.textContent=correct?'与音频文本一致。'+d.explain:'对照原句，看看漏掉或听错了哪些词。';out.append(p);
   const diff=matchedWords(actual,expected); const line=document.createElement('div');d.text.split(/\s+/).forEach((w,i)=>{const span=document.createElement('span');span.className='diff-word '+(diff.found.has(i)?'match':'missing');span.textContent=w;line.append(span)});out.append(line);record(d.id,correct);
 }));
 $('checkBtn').addEventListener('click', () => { const selected = document.querySelector('input[name=quiz]:checked'), out=$('quizFeedback');out.hidden=false;if(!selected){out.textContent='请先选择一个答案。';return;}const ok=selected.value==='b';out.textContent=ok?'选对了。B 说明关键发现不容易找到，提出放到第一页，并解释客户会更容易找到重点。':'A、C 只说报告不好，没有给出可执行的改法。比较 B：问题、建议和好处都说清楚了。';state.quizSelection=selected.value;record('quiz',ok); });
 if(state.quizSelection){const radio=document.querySelector('input[name=quiz][value="'+({a:'a',b:'b',c:'c'}[state.quizSelection]||'a')+'"]');if(radio)radio.checked=true;}
 $('compareWriting').addEventListener('click', () => {
   const firstAttempt = $('warmupInput').value.trim();
   const newAttempt = $('practiceInput').value.trim();
   if (!firstAttempt) {
     $('outputCheck').textContent = '先完成页面开头的第一次试写，再来对照。';
     $('warmupInput').focus();
     $('warmupInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
     return;
   }
   if (!newAttempt) {
     $('outputCheck').textContent = '先完成这道演示文稿练习，再来对照两次表达。';
     $('practiceInput').focus();
     return;
   }
   $('beforeWriting').textContent = firstAttempt;
   $('afterWriting').textContent = newAttempt;
   $('writingComparison').hidden = false;
   $('outputCheck').textContent = '对照两次表达：问题说清楚了吗？建议具体吗？有没有说明这样修改的作用？';
 });
 let reviewIds=[],reviewIndex=0;
 function renderReview() {
   const entries=Object.entries(state.results).filter(([id])=>labels[id]); const checked=entries.length, correct=entries.filter(([,r])=>r.correct).length;
   $('exerciseSummary').textContent='客观题已检查 '+checked+' / 6 道；最近一次正确 '+correct+' 道。';
   const wrong=entries.filter(([,r])=>!r.correct), selected=data.words.filter(w=>state.words[w.id]); $('reviewQueue').replaceChildren();
   wrong.forEach(([id])=>{const li=document.createElement('li'),span=document.createElement('span'),a=document.createElement('a');span.textContent='待重做 · '+labels[id];a.textContent='返回练习';a.href=id==='quiz'?'#quizFeedback':id[0]==='d'?'#'+id+'Input':'#'+id;li.append(span,a);$('reviewQueue').append(li);});
   if(!wrong.length){const li=document.createElement('li');li.textContent=checked?'当前已作答题目没有待纠正项。':'还没有作答记录；需要再练的题会出现在这里。';$('reviewQueue').append(li);}
   const due=selected.filter(w=>(state.review[w.id]?.due||0)<=Date.now()).length;
   $('reviewStats').textContent='词本 '+selected.length+' 个表达 · 到期复习 '+due+' 个 · 待纠正 '+wrong.length+' 题';
 }
 function showReview() {
   if(reviewIndex>=reviewIds.length){$('reviewCard').hidden=true;toast('本轮自测已记录；可以明天回来复习。');renderReview();return;}
   const w=data.words.find(x=>x.id===reviewIds[reviewIndex]);$('reviewCard').hidden=false;$('reviewPosition').textContent='词汇自测 '+(reviewIndex+1)+' / '+reviewIds.length;$('reviewMeaning').textContent=w.zh;$('reviewWord').textContent=(w.word+' '+(w.ipa||'')).trim();$('reviewExample').textContent=w.example;$('reviewAnswer').hidden=true;$('reviewRating').hidden=true;$('reviewReveal').hidden=false;
 }
 $('reviewStart').addEventListener('click',()=>{reviewIds=data.words.filter(w=>state.words[w.id]).map(w=>w.id);if(!reviewIds.length)reviewIds=data.words.map(w=>w.id);reviewIndex=0;showReview();});
 $('reviewReveal').addEventListener('click',()=>{$('reviewAnswer').hidden=false;$('reviewRating').hidden=false;$('reviewReveal').hidden=true;});
 function rateReview(remembered){const id=reviewIds[reviewIndex];state.words[id]=true;state.review[id]={due:remembered?nextDay(1):Date.now(),last:remembered?'自评已想起':'需要再练'};save();wordButtons();reviewIndex++;showReview();renderReview();}
 $('reviewRemember').addEventListener('click',()=>rateReview(true));$('reviewAgain').addEventListener('click',()=>rateReview(false));
 renderReview();
 function setComplete(done){$('completeBtn').textContent=done?'本期已标记完成 · 撤销':'标记本期完成';$('completeBtn').setAttribute('aria-pressed',String(done));$('completionStatus').textContent=done?'完成状态已由你记录；可以随时回来复习词汇、错题和输出。':'写下自己的反馈并对照修改后，再记录本期学习。';}
 setComplete(!!state.complete);$('completeBtn').addEventListener('click',()=>{state.complete=!state.complete;save();setComplete(state.complete);});
 $('exportNotes').addEventListener('click',()=>{
   const lines=['跟着谷歌、微软学职场英语｜第 001 期学习记录','主题：怎样提意见，才能明确又不伤人？','原文：https://google.github.io/eng-practices/review/reviewer/comments.html','','我的第一版：', $('warmupInput').value||'尚未填写','','我的学后表达：',$('practiceInput').value||'尚未填写','','我的词本：',...data.words.filter(w=>state.words[w.id]).map(w=>w.word+' — '+w.zh+'\n'+w.example),'','客观题最近结果：',...Object.entries(state.results).filter(([id])=>labels[id]).map(([id,r])=>labels[id]+'：'+(r.correct?'正确':'待重做')+'，尝试 '+r.attempts+' 次'),''];
   const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='第001期_我的英语学习记录.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('学习记录已导出。');
 });
 const links=[...document.querySelectorAll('.rail nav a')], sections=[...document.querySelectorAll('.section')];
 let navFrame=0;
 function refreshNav(){navFrame=0;const current=sections.filter(s=>s.getBoundingClientRect().top<=innerHeight*.25).at(-1)||sections[0];links.forEach(a=>{const active=a.hash==='#'+current.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
 document.addEventListener('scroll',()=>{if(!navFrame)navFrame=requestAnimationFrame(refreshNav);},{passive:true});
 links.forEach(link => link.addEventListener('click',()=>{state.lastSection=link.hash.slice(1);save();}));
 window.addEventListener('pageshow',refreshNav);window.addEventListener('resize',refreshNav);refreshNav();
})();
