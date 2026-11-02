(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = JSON.parse($('lessonData').textContent);
  const state = window.workEnglishStore.state;
  const save = window.workEnglishStore.save;
  const player = $('lessonAudio');
  const toast = message => {
    const element = $('toast');
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.hidden = true, 2800);
  };
  const media = key => '/work-english/lessons/' + encodeURIComponent(data.id) + '/media/' + encodeURIComponent(key) + '.mp3';
  player.dataset.key = 'original';
  player.src = media('original');
  player.load();
  const audioStatus = message => { $('audioStatus').textContent = message; };
  const originalButton = document.querySelector('.audio-studio [data-play="original"]');
  if (originalButton) {
    originalButton.setAttribute('aria-pressed', 'true');
    $('audioNow').textContent = '原文朗读';
  }
  document.querySelectorAll('[data-play]').forEach(button => button.addEventListener('click', async () => {
    const key = button.dataset.play;
    if (player.dataset.key !== key) {
      player.src = media(key);
      player.dataset.key = key;
      player.load();
    } else player.currentTime = 0;
    document.querySelectorAll('[data-play]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    player.playbackRate = Number($('speedSelect').value);
    $('audioNow').textContent = button.textContent.replace(/^▶\s*/, '').trim();
    player.loop = $('loopClip').checked;
    audioStatus('正在准备播放：' + $('audioNow').textContent);
    try { await player.play(); } catch { audioStatus('暂时无法播放，请在播放器中点击播放，或稍后重试。'); toast('音频暂时无法播放，请重试。'); }
  }));
  player.addEventListener('play', () => { $('miniAudio').hidden = false; $('miniPause').textContent = '暂停'; audioStatus('正在播放：' + $('audioNow').textContent); });
  player.addEventListener('pause', () => { $('miniPause').textContent = '继续'; if (!player.ended) audioStatus('已暂停；可在播放器中继续。'); });
  player.addEventListener('ended', () => { $('miniAudio').hidden = true; audioStatus('播放完成。可以再听一次，或跟读后继续。'); });
  player.addEventListener('error', () => audioStatus('音频未能载入。页面文字和练习仍可使用；请重试播放。'));
  $('speedSelect').addEventListener('change', () => { player.playbackRate = Number($('speedSelect').value); });
  $('loopClip').addEventListener('change', () => { player.loop = $('loopClip').checked; });
  $('hideTranscript').addEventListener('change', () => {
    document.querySelectorAll('.sentence-transcript').forEach(item => item.hidden = $('hideTranscript').checked);
    document.querySelectorAll('.transcript-placeholder').forEach(item => item.hidden = !$('hideTranscript').checked);
  });
  $('miniPause').addEventListener('click', async () => {
    if (player.paused) { try { await player.play(); } catch { toast('请在听音模块的播放器中重试。'); } }
    else player.pause();
  });
  $('miniStop').addEventListener('click', () => { player.pause(); player.currentTime = 0; $('miniAudio').hidden = true; audioStatus('已停止播放。'); });
  window.addEventListener('pagehide', () => player.pause());
  $('printBtn').addEventListener('click', () => window.print());
  let activeNote = null;
  function closeNote() {
    $('docNoteDetail').hidden = true;
    $('docNoteIntro').hidden = false;
    if (activeNote) activeNote.focus();
  }
  document.querySelectorAll('[data-note]').forEach(mark => mark.addEventListener('click', () => {
    const index = Number(mark.dataset.note);
    const note = data.notes[index];
    activeNote = mark;
    $('sourceSheet').classList.add('annotated-mode');
    $('annotateReadBtn').setAttribute('aria-pressed', 'true');
    $('plainReadBtn').setAttribute('aria-pressed', 'false');
    $('docNoteNumber').textContent = '表达批注 ' + String(index + 1).padStart(2, '0');
    $('docNoteQuote').textContent = mark.textContent;
    $('docNoteMeaning').textContent = note.meaning;
    $('docNoteExplain').textContent = note.explain;
    $('docNoteExample').textContent = note.example;
    $('docNoteIntro').hidden = true;
    $('docNoteDetail').hidden = false;
  }));
  $('docNoteClose').addEventListener('click', closeNote);
  $('plainReadBtn').addEventListener('click', () => {
    $('sourceSheet').classList.remove('annotated-mode');
    $('plainReadBtn').setAttribute('aria-pressed', 'true');
    $('annotateReadBtn').setAttribute('aria-pressed', 'false');
    $('docNoteDetail').hidden = true;
    $('docNoteIntro').hidden = false;
  });
  $('annotateReadBtn').addEventListener('click', () => {
    $('sourceSheet').classList.add('annotated-mode');
    $('plainReadBtn').setAttribute('aria-pressed', 'false');
    $('annotateReadBtn').setAttribute('aria-pressed', 'true');
  });
  $('translationBtn').addEventListener('click', () => {
    const open = $('translation').hidden;
    $('translation').hidden = !open;
    $('translationBtn').textContent = open ? '收起重点段落中文' : '重点段落中文';
    $('translationBtn').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('docNoteDetail').hidden) closeNote(); });
  const savedFields = ['warmupInput', 'practiceInput', 'c1', 'c2', 'c3', 'd1Input', 'd2Input', 'self1', 'self2', 'self3', ...data.dictation.filter(item => item.apply).map(item => item.id + 'Apply')];
  for (const id of savedFields) {
    const field = $(id);
    if (!field) continue;
    if (field.type === 'checkbox') field.checked = !!state[id];
    else field.value = state[id] || '';
    field.addEventListener(field.type === 'checkbox' ? 'change' : 'input', () => {
      state[id] = field.type === 'checkbox' ? field.checked : field.value;
      save();
    });
  }
  state.words ??= {};
  state.results ??= {};
  state.review ??= {};
  const exerciseLabels = Object.fromEntries([
    ...data.cloze.map((item, index) => [item.id, '词汇填空 ' + (index + 1)]),
    ...data.dictation.map((item, index) => [item.id, item.label || '听写 ' + (index + 1)]),
    ['quiz', '情境选择']
  ]);
  const exerciseCount = data.cloze.length + data.dictation.length + 1;
  const nextDay = () => {
    const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    return Date.parse(day + 'T16:00:00Z');
  };
  function renderWords() {
    let count = 0;
    document.querySelectorAll('.save-word').forEach(button => {
      const saved = !!state.words[button.dataset.word];
      if (saved) count++;
      button.textContent = saved ? '已加入词本' : '加入词本';
      button.setAttribute('aria-pressed', String(saved));
    });
    $('wordCount').textContent = count + ' 个表达已加入复习';
    renderReview();
  }
  function renderReview() {
    const entries = Object.entries(state.results).filter(([id]) => Object.hasOwn(exerciseLabels, id));
    const checked = entries.length;
    const correct = entries.filter(([, item]) => item.correct).length;
    $('exerciseSummary').textContent = '客观题已检查 ' + checked + ' / ' + exerciseCount + ' 道；最近一次正确 ' + correct + ' 道。';
    const wrong = entries.filter(([, item]) => !item.correct);
    const selected = data.words.filter(word => state.words[word.id]);
    const due = selected.filter(word => (state.review[word.id]?.due || 0) <= Date.now()).length;
    $('reviewStats').textContent = '词本 ' + selected.length + ' 个表达 · 到期复习 ' + due + ' 个 · 待纠正 ' + wrong.length + ' 题';
    const queue = $('reviewQueue');
    queue.replaceChildren();
    for (const [id] of wrong) {
      const li = document.createElement('li');
      const label = document.createElement('span');
      const link = document.createElement('a');
      label.textContent = '待重做 · ' + exerciseLabels[id];
      link.textContent = '返回练习';
      link.href = id === 'quiz' ? '#quizFeedback' : id.startsWith('d') ? '#' + id + 'Input' : '#' + id;
      li.append(label, link);
      queue.append(li);
    }
    for (const word of selected) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = (state.review[word.id]?.due || 0) <= Date.now() ? '到期复习 · ' + word.word : '已加入词本 · ' + word.word;
      link.href = '#word-' + encodeURIComponent(word.id);
      li.append(link);
      queue.append(li);
    }
    if (!queue.children.length) {
      const li = document.createElement('li');
      li.textContent = checked ? '当前已作答题目没有待纠正项。' : '还没有作答记录；错题和词本内容会显示在这里。';
      queue.append(li);
    }
  }
  document.querySelectorAll('.save-word').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.word;
    state.words[id] = !state.words[id];
    if (state.words[id]) state.review[id] = {due:nextDay(),last:'added'};
    else delete state.review[id];
    renderWords();
    save();
  }));
  $('vocabRecall').addEventListener('change', () => {
    const recalling = $('vocabRecall').checked;
    document.querySelectorAll('#wordCards .word-entry').forEach(entry => {
      const details = entry.querySelector('details');
      if (details) details.open = !recalling;
      entry.classList.toggle('recall-hidden', recalling && !details);
    });
  });
  const result = (id, correct) => {
    const prior = state.results[id];
    state.results[id] = {correct,attempts:(prior?.attempts || 0) + 1};
    save();
    renderWords();
  };
  $('checkCloze').addEventListener('click', () => {
    for (const item of data.cloze) {
      const value = $(item.id).value.trim().toLowerCase();
      const box = $(item.id + 'Feedback');
      box.hidden = false;
      if (!value) { box.textContent = '请先填写。'; continue; }
      const correct = value === item.answer.toLowerCase();
      box.textContent = (correct ? '答对了。' : '参考答案：' + item.answer + '。') + item.why;
      box.dataset.result = correct ? 'correct' : 'retry';
      result(item.id, correct);
    }
  });
  const normalized = text => text.toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}'\s]/gu,' ').replace(/\s+/g,' ').trim();
  function matchedWords(actual, expected) {
    const a = normalized(actual).split(' ').filter(Boolean);
    const b = normalized(expected).split(' ').filter(Boolean);
    const dp = Array.from({length:a.length + 1}, () => Array(b.length + 1).fill(0));
    for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++) dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
    const found = new Set(); let i=a.length, j=b.length;
    while (i>0 && j>0) { if (a[i-1] === b[j-1]) { found.add(j-1); i--; j--; } else if (dp[i-1][j] >= dp[i][j-1]) i--; else j--; }
    return found;
  }
  document.querySelectorAll('[data-check-dictation]').forEach(button => button.addEventListener('click', () => {
    const item = data.dictation.find(row => row.id === button.dataset.checkDictation);
    const value = $(item.id + 'Input').value.trim();
    const box = $(item.id + 'Feedback');
    box.hidden = false;
    if (!value) { box.textContent = '请先写下听到的句子。'; return; }
    const correct = normalized(value) === normalized(item.text);
    box.replaceChildren();
    const message = document.createElement('p');
    message.textContent = correct ? '与音频文本一致。' : '逐词对照参考句，找出漏写或听错的词。';
    box.append(message);
    if (!correct) {
      const found = matchedWords(value, item.text);
      const line = document.createElement('p');
      line.className = 'dictation-word-check';
      normalized(item.text).split(' ').filter(Boolean).forEach((word, index) => {
        const token = document.createElement('span');
        token.className = found.has(index) ? 'match' : 'missing';
        token.textContent = word + ' ';
        line.append(token);
      });
      box.append(line);
      const legend = document.createElement('p');
      legend.className = 'hint';
      legend.textContent = '绿色：听写中出现；橙色：需要再听或核对。';
      box.append(legend);
    }
    if (item.why) { const why = document.createElement('p'); why.className = 'hint'; why.textContent = item.why; box.append(why); }
    box.dataset.result = correct ? 'correct' : 'retry';
    result(item.id, correct);
  }));
  $('checkQuiz').addEventListener('click', () => {
    const selected = document.querySelector('input[name="quiz"]:checked');
    const box = $('quizFeedback');
    box.hidden = false;
    if (!selected) { box.textContent = '请先选择一句。'; return; }
    state.quizSelection = selected.value;
    const correct = Number(selected.value) === data.choice.correct;
    box.textContent = (correct ? '答对了。' : '再看第 ' + (data.choice.correct + 1) + ' 句。') + data.choice.why;
    result('quiz', correct);
  });
  if (state.quizSelection) {
    const saved = document.querySelector('input[name="quiz"][value="' + CSS.escape(state.quizSelection) + '"]');
    if (saved) saved.checked = true;
  }
  $('copyPattern').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(data.rewrite.good); toast('已复制参考句。'); }
    catch { toast('复制失败，请手动选中句子。'); }
  });
  $('compareWriting').addEventListener('click', () => {
    const before = $('warmupInput').value.trim();
    const after = $('practiceInput').value.trim();
    if (!before) { $('outputCheck').textContent = '先完成前面的第一次试写，再来对照。'; $('warmupInput').focus(); $('warmupInput').scrollIntoView({behavior:'smooth',block:'center'}); return; }
    if (!after) { $('outputCheck').textContent = '先完成这次的工作表达，再来对照两版。'; $('practiceInput').focus(); $('practiceInput').scrollIntoView({behavior:'smooth',block:'center'}); return; }
    $('beforeWriting').textContent = before;
    $('afterWriting').textContent = after;
    $('writingComparison').hidden = false;
    $('outputCheck').textContent = '比较两版：这次是否更清楚地回应情境、提出可执行的做法？';
  });
  let reviewWords = [], reviewIndex = 0;
  $('reviewStart').addEventListener('click', () => {
    reviewWords = data.words.filter(word => state.words[word.id]);
    if (!reviewWords.length) reviewWords = data.words;
    reviewIndex = 0;
    showReview();
  });
  function showReview() {
    const word = reviewWords[reviewIndex];
    if (!word) { $('reviewCard').hidden = true; toast('本轮复习已完成。'); renderReview(); return; }
    $('reviewCard').hidden = false;
    $('reviewPosition').textContent = '词汇自测 ' + (reviewIndex + 1) + ' / ' + reviewWords.length;
    $('reviewMeaning').textContent = word.meaning;
    $('reviewWord').textContent = word.word;
    $('reviewExample').textContent = word.example;
    $('reviewAnswer').hidden = true;
    $('reviewRating').hidden = true;
    $('reviewReveal').hidden = false;
  }
  $('reviewReveal').addEventListener('click', () => { $('reviewAnswer').hidden = false; $('reviewRating').hidden = false; $('reviewReveal').hidden = true; });
  for (const [id,remembered] of [['reviewRemember',true],['reviewAgain',false]]) {
    $(id).addEventListener('click', () => {
      const word = reviewWords[reviewIndex];
      state.words[word.id] = true;
      state.review[word.id] = {due:remembered ? nextDay() : Date.now(),last:remembered ? 'remembered' : 'again'};
      save();
      renderWords();
      reviewIndex++;
      showReview();
    });
  }
  $('exportNotes').addEventListener('click', () => {
    const lines = ['第 ' + data.id + ' 期学习记录',data.source.url,'','第一次试写：',state.warmupInput || '尚未填写','','学后表达：',state.practiceInput || '尚未填写','','词本：',...data.words.filter(word=>state.words[word.id]).map(word=>word.word+' — '+word.meaning+'\n'+word.example),'','练习结果：',...Object.entries(state.results).filter(([id])=>Object.hasOwn(exerciseLabels,id)).map(([id,item])=>exerciseLabels[id]+'：'+(item.correct?'正确':'待重做')+'，尝试 '+item.attempts+' 次')];
    const url = URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = '第'+data.id+'期_学习记录.txt'; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  });
  function renderComplete() {
    $('completeBtn').textContent = state.complete ? '本期已完成 · 撤销' : '标记本期学完';
    $('completeBtn').setAttribute('aria-pressed',String(!!state.complete));
    $('completionStatus').textContent = state.complete ? '可以随时回来复习。' : '完成练习后可记录学习进度。';
  }
  $('completeBtn').addEventListener('click', () => {state.complete = !state.complete; renderComplete(); save();});
  const navLinks = [...document.querySelectorAll('.rail nav a')];
  navLinks.forEach(anchor => anchor.addEventListener('click', () => {
    state.lastSection = anchor.getAttribute('href').slice(1);
    save();
  }));
  const sections = [...document.querySelectorAll('.section')];
  let navFrame = 0;
  function refreshNav() {
    navFrame = 0;
    const current = sections.filter(section => section.getBoundingClientRect().top <= innerHeight * .25).at(-1) || sections[0];
    navLinks.forEach(anchor => {
      const active = anchor.hash === '#' + current.id;
      anchor.classList.toggle('active', active);
      if (active) anchor.setAttribute('aria-current', 'location');
      else anchor.removeAttribute('aria-current');
    });
  }
  document.addEventListener('scroll', () => { if (!navFrame) navFrame = requestAnimationFrame(refreshNav); }, {passive:true});
  window.addEventListener('pageshow', refreshNav);
  window.addEventListener('resize', refreshNav);
  refreshNav();
  renderWords();
  renderComplete();
})();
