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
    }
    document.querySelectorAll('[data-play]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    player.playbackRate = Number($('speedSelect').value);
    $('audioNow').textContent = button.textContent.replace(/^▶\s*/, '').trim();
    try { await player.play(); } catch { toast('音频暂时无法播放，请重试。'); }
  }));
  player.addEventListener('ended', () => { if ($('loopClip').checked) { player.currentTime = 0; void player.play(); } });
  $('speedSelect').addEventListener('change', () => { player.playbackRate = Number($('speedSelect').value); });
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
  const savedFields = ['warmupInput', 'practiceInput', 'c1', 'c2', 'c3', 'd1Input', 'd2Input', 'self1', 'self2', 'self3'];
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
  const nextDay = () => {
    const date = new Date();
    const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
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
    $('reviewQueue').innerHTML = '';
    for (const word of data.words.filter(item => state.words[item.id])) {
      const li = document.createElement('li');
      li.textContent = word.word + ' · ' + word.meaning;
      $('reviewQueue').append(li);
    }
    for (const item of data.cloze.concat(data.dictation, [{id:'quiz'}])) {
      if (state.results[item.id] && !state.results[item.id].correct) {
        const li = document.createElement('li');
        li.textContent = '待重做：' + item.id;
        $('reviewQueue').append(li);
      }
    }
    if (!$('reviewQueue').children.length) {
      const li = document.createElement('li');
      li.textContent = '还没有待复习内容。';
      $('reviewQueue').append(li);
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
  const normalized = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'').replace(/\s+/g,' ').trim();
  document.querySelectorAll('[data-check-dictation]').forEach(button => button.addEventListener('click', () => {
    const item = data.dictation.find(row => row.id === button.dataset.checkDictation);
    const value = $(item.id + 'Input').value.trim();
    const box = $(item.id + 'Feedback');
    box.hidden = false;
    if (!value) { box.textContent = '请先写下听到的句子。'; return; }
    const correct = normalized(value) === normalized(item.text);
    box.textContent = (correct ? '与音频文本一致。' : '参考文本：' + item.text + ' ') + item.why;
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
    $('beforeWriting').textContent = state.warmupInput || '还没有第一次试写。';
    $('afterWriting').textContent = state.practiceInput || '还没有学后表达。';
    $('writingComparison').hidden = false;
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
    if (!word) { $('reviewCard').hidden = true; toast('本轮复习已完成。'); return; }
    $('reviewCard').hidden = false;
    $('reviewMeaning').textContent = word.meaning;
    $('reviewWord').textContent = word.word;
    $('reviewExample').textContent = word.example;
    $('reviewAnswer').hidden = true;
  }
  $('reviewReveal').addEventListener('click', () => $('reviewAnswer').hidden = false);
  for (const [id,remembered] of [['reviewRemember',true],['reviewAgain',false]]) {
    $(id).addEventListener('click', () => {
      const word = reviewWords[reviewIndex];
      state.review[word.id] = {due:remembered ? nextDay() : Date.now(),last:remembered ? 'remembered' : 'again'};
      save();
      reviewIndex++;
      showReview();
    });
  }
  $('exportNotes').addEventListener('click', () => {
    const lines = ['第 ' + data.id + ' 期学习记录',data.source.url,'','第一次试写：',state.warmupInput || '','', '学后表达：',state.practiceInput || '', '', '词本：',...data.words.filter(word=>state.words[word.id]).map(word=>word.word+' — '+word.meaning)];
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
  document.querySelectorAll('.rail nav a').forEach(anchor => anchor.addEventListener('click', () => {
    state.lastSection = anchor.getAttribute('href').slice(1);
    save();
  }));
  renderWords();
  renderComplete();
})();
