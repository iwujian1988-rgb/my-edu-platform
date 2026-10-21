(() => {
  'use strict';
  const context = JSON.parse(document.getElementById('workEnglishContext').textContent);
  const state = context.state;
  let revision = context.revision, timer, saving = false, blocked = false, dirty = false;
  const SAVE_DELAY_MS = 650;
  const status = document.getElementById('savedStatus');
  const retry = document.getElementById('retrySave');
  const endpoint = `/api/work-english/progress/${context.lessonId}`;
  let committed = JSON.stringify(state);

  function display(message) { status.textContent = message; }
  async function flush(keepalive = false) {
    if (saving || blocked || !dirty) return;
    clearTimeout(timer);
    saving = true;
    const snapshot = JSON.stringify(state);
    display('正在保存到账号…');
    try {
      const response = await fetch(endpoint, {
        method: 'PUT', credentials: 'same-origin', keepalive,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({version: context.version, revision, state: JSON.parse(snapshot)}),
      });
      if (response.status === 409) {
        blocked = true;
        display('另一页面已更新。请先导出本页记录，再刷新同步。');
        retry.hidden = false; retry.textContent = '刷新同步';
        return;
      }
      if (response.status === 401 || response.status === 403) {
        blocked = true;
        display('登录或套餐已失效。请先导出未保存的记录，再重新登录。');
        retry.hidden = false; retry.textContent = '重新登录';
        return;
      }
      if (!response.ok) throw new Error(`SAVE_${response.status}`);
      const result = await response.json();
      revision = result.revision; committed = snapshot;
      dirty = committed !== JSON.stringify(state);
      display(dirty ? '还有修改待保存…' : '已保存到账号 · 换设备可继续学习');
      retry.hidden = true;
    } catch {
      display('保存失败，当前修改仍在本页。请重试，或先导出学习记录。');
      retry.hidden = false; retry.textContent = '重试保存';
    } finally {
      saving = false;
      if (dirty && !blocked && retry.hidden) timer = setTimeout(flush, SAVE_DELAY_MS);
    }
  }
  function save() {
    dirty = committed !== JSON.stringify(state);
    if (!dirty || blocked) return;
    display('修改待保存…');
    clearTimeout(timer); timer = setTimeout(flush, SAVE_DELAY_MS);
  }
  retry.addEventListener('click', () => {
    if (!blocked) return void flush();
    if (retry.textContent === '重新登录') location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
    else location.reload();
  });
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(true); });
  window.addEventListener('pagehide', () => void flush(true));
  window.addEventListener('online', () => void flush());
  window.addEventListener('pageshow', async event => {
    if (!event.persisted) return;
    try {
      const result = await fetch(endpoint, {cache:'no-store'});
      if (result.status === 401 || result.status === 403) location.replace('/work-english');
    } catch { display('连接已断开，请联网后重试保存。'); }
  });
  window.workEnglishStore = {state, save};
  display('学习记录已连接到当前账号');
})();
