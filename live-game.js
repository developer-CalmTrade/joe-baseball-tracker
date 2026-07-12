(() => {
  const ACTIVE_KEY = 'joeLiveGamePreview_v1';
  const FINISHED_KEY = 'joeLiveGameFinishedPreview_v1';

  const read = (storage, key, fallback) => {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (storage, key, value) => {
    storage.setItem(key, JSON.stringify(value));
  };

  const cleanOpponent = (value) => String(value || '').replace(/^\s*(vs\.?|@)\s*/i, '').trim();

  function install(win, doc) {
    if (!win || !doc || doc.documentElement.dataset.liveGamePreviewInstalled === '1') return;
    doc.documentElement.dataset.liveGamePreviewInstalled = '1';

    const storage = win.localStorage;
    let draft = read(storage, ACTIVE_KEY, null);

    const defaultStats = () => ({
      pa: 0,
      ab: 0,
      b1: 0,
      b2: 0,
      b3: 0,
      hr: 0,
      bb: 0,
      so: 0,
      rbi: 0,
      runs: 0,
      sb: 0,
      pitches: 0,
      pitchingOuts: 0,
      k: 0,
      pbb: 0,
      ph: 0,
      er: 0,
      tc: 0,
      po: 0,
      a: 0,
      e: 0
    });

    function addStyles() {
      if (doc.getElementById('liveGamePreviewStyles')) return;
      const style = doc.createElement('style');
      style.id = 'liveGamePreviewStyles';
      style.textContent = `
        .live-preview-banner{padding:12px;border-radius:12px;background:#fff7ed;border-left:5px solid #f97316;margin-bottom:14px}
        .live-button-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .live-button-grid .btn{min-height:58px;font-size:1rem;padding:10px 8px}
        .live-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .live-summary .metric{padding:12px}
        .live-last{margin-top:12px;padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:800}
        @media(max-width:680px){.live-button-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `;
      doc.head.appendChild(style);
    }

    function buildPage() {
      if (doc.getElementById('live-game-preview')) return;
      const page = doc.createElement('section');
      page.id = 'live-game-preview';
      page.className = 'page';
      page.innerHTML = `
        <div class="card hero">
          <div class="small">LIVE GAME MODE PREVIEW</div>
          <h2 id="livePreviewTitle">No active preview game</h2>
          <div id="livePreviewSubtitle" class="small"></div>
        </div>
        <div class="live-preview-banner"><b>Preview only.</b> These taps autosave, but finishing a preview game will not change the season statistics in the master app.</div>
        <div class="card">
          <h2>Current Game</h2>
          <div id="liveTopSummary" class="live-summary"></div>
          <div id="liveLastAction" class="live-last">No actions recorded.</div>
          <div class="actions">
            <button id="liveUndo" class="btn gray" type="button">Undo Last Entry</button>
            <button id="liveBack" class="btn gray" type="button">Back to Schedule</button>
          </div>
        </div>
        <div class="card">
          <h2>Batting</h2>
          <div class="live-button-grid">
            <button class="btn green" data-live-action="b1">1B</button>
            <button class="btn green" data-live-action="b2">2B</button>
            <button class="btn green" data-live-action="b3">3B</button>
            <button class="btn green" data-live-action="hr">HR + Run</button>
            <button class="btn" data-live-action="bb">BB</button>
            <button class="btn orange" data-live-action="so">SO</button>
            <button class="btn gray" data-live-action="out">Out</button>
            <button class="btn" data-live-action="rbi">RBI +1</button>
            <button class="btn" data-live-action="run">Run +1</button>
            <button class="btn" data-live-action="sb">SB +1</button>
          </div>
          <div id="liveBattingSummary" class="stats" style="margin-top:14px"></div>
        </div>
        <div class="card">
          <h2>Pitching</h2>
          <div class="live-button-grid">
            <button class="btn" data-live-action="pitch1">Pitch +1</button>
            <button class="btn" data-live-action="pitch5">Pitch +5</button>
            <button class="btn gray" data-live-action="pitchOut">Out +1</button>
            <button class="btn green" data-live-action="k">K + Out</button>
            <button class="btn orange" data-live-action="pbb">BB Allowed</button>
            <button class="btn orange" data-live-action="ph">Hit Allowed</button>
            <button class="btn red" data-live-action="er">ER +1</button>
          </div>
          <div id="livePitchingSummary" class="stats" style="margin-top:14px"></div>
        </div>
        <div class="card">
          <h2>Fielding</h2>
          <div class="live-button-grid">
            <button class="btn green" data-live-action="po">Putout +1</button>
            <button class="btn green" data-live-action="assist">Assist +1</button>
            <button class="btn red" data-live-action="error">Error +1</button>
          </div>
          <div id="liveFieldingSummary" class="stats" style="margin-top:14px"></div>
        </div>
        <div class="card">
          <h2>Finish Preview Game</h2>
          <div class="grid">
            <div><label>Final Score</label><input id="liveFinalScore" placeholder="11-6"></div>
            <div><label>Result</label><select id="liveFinalResult"><option>Win</option><option>Loss</option><option>Tie</option></select></div>
          </div>
          <div class="actions">
            <button id="liveFinish" class="btn green" type="button">Finish Preview Game</button>
            <button id="liveDiscard" class="btn red" type="button">Discard Preview</button>
          </div>
        </div>
      `;
      doc.querySelector('main').appendChild(page);

      page.querySelectorAll('[data-live-action]').forEach((button) => {
        button.addEventListener('click', () => applyAction(button.dataset.liveAction));
      });
      doc.getElementById('liveUndo').addEventListener('click', undoLast);
      doc.getElementById('liveBack').addEventListener('click', () => win.show('schedule'));
      doc.getElementById('liveFinish').addEventListener('click', finishPreview);
      doc.getElementById('liveDiscard').addEventListener('click', discardPreview);
    }

    const tile = (label, value) => `<div class="metric"><b>${value}</b><span class="small">${label}</span></div>`;

    function inningsFromOuts(outs) {
      const full = Math.floor(Number(outs || 0) / 3);
      const remainder = Number(outs || 0) % 3;
      return `${full}.${remainder}`;
    }

    function persist() {
      if (draft) write(storage, ACTIVE_KEY, draft);
      else storage.removeItem(ACTIVE_KEY);
    }

    function renderLive() {
      const title = doc.getElementById('livePreviewTitle');
      const subtitle = doc.getElementById('livePreviewSubtitle');
      const top = doc.getElementById('liveTopSummary');
      const batting = doc.getElementById('liveBattingSummary');
      const pitching = doc.getElementById('livePitchingSummary');
      const fielding = doc.getElementById('liveFieldingSummary');
      const last = doc.getElementById('liveLastAction');
      if (!title || !subtitle || !top || !batting || !pitching || !fielding || !last) return;

      if (!draft) {
        title.textContent = 'No active preview game';
        subtitle.textContent = 'Return to Schedule and choose Start Live Game.';
        top.innerHTML = tile('Status', 'Idle');
        batting.innerHTML = '';
        pitching.innerHTML = '';
        fielding.innerHTML = '';
        last.textContent = 'No actions recorded.';
        return;
      }

      const s = draft.stats;
      title.textContent = `${draft.date} vs. ${draft.opponent}`;
      subtitle.textContent = `Started ${new Date(draft.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      top.innerHTML = [
        tile('PA', s.pa),
        tile('Hits', s.b1 + s.b2 + s.b3 + s.hr),
        tile('Pitches', s.pitches)
      ].join('');
      batting.innerHTML = [
        tile('PA', s.pa), tile('AB', s.ab), tile('1B', s.b1), tile('2B', s.b2), tile('3B', s.b3), tile('HR', s.hr),
        tile('BB', s.bb), tile('SO', s.so), tile('RBI', s.rbi), tile('Runs', s.runs), tile('SB', s.sb)
      ].join('');
      pitching.innerHTML = [
        tile('Pitches', s.pitches), tile('Outs', s.pitchingOuts), tile('IP', inningsFromOuts(s.pitchingOuts)), tile('K', s.k),
        tile('BB', s.pbb), tile('Hits', s.ph), tile('ER', s.er)
      ].join('');
      fielding.innerHTML = [tile('Chances', s.tc), tile('Putouts', s.po), tile('Assists', s.a), tile('Errors', s.e)].join('');
      const history = Array.isArray(draft.history) ? draft.history : [];
      last.textContent = history.length ? `Last entry: ${history[history.length - 1].label}` : 'No actions recorded.';
    }

    const actionMap = {
      b1: ['1B', (s) => { s.pa += 1; s.ab += 1; s.b1 += 1; }],
      b2: ['2B', (s) => { s.pa += 1; s.ab += 1; s.b2 += 1; }],
      b3: ['3B', (s) => { s.pa += 1; s.ab += 1; s.b3 += 1; }],
      hr: ['HR + Run', (s) => { s.pa += 1; s.ab += 1; s.hr += 1; s.runs += 1; }],
      bb: ['BB', (s) => { s.pa += 1; s.bb += 1; }],
      so: ['SO', (s) => { s.pa += 1; s.ab += 1; s.so += 1; }],
      out: ['Out', (s) => { s.pa += 1; s.ab += 1; }],
      rbi: ['RBI +1', (s) => { s.rbi += 1; }],
      run: ['Run +1', (s) => { s.runs += 1; }],
      sb: ['SB +1', (s) => { s.sb += 1; }],
      pitch1: ['Pitch +1', (s) => { s.pitches += 1; }],
      pitch5: ['Pitch +5', (s) => { s.pitches += 5; }],
      pitchOut: ['Pitching Out +1', (s) => { s.pitchingOuts += 1; }],
      k: ['K + Out', (s) => { s.k += 1; s.pitchingOuts += 1; }],
      pbb: ['BB Allowed +1', (s) => { s.pbb += 1; }],
      ph: ['Hit Allowed +1', (s) => { s.ph += 1; }],
      er: ['ER +1', (s) => { s.er += 1; }],
      po: ['Putout +1', (s) => { s.po += 1; s.tc += 1; }],
      assist: ['Assist +1', (s) => { s.a += 1; s.tc += 1; }],
      error: ['Error +1', (s) => { s.e += 1; s.tc += 1; }]
    };

    function applyAction(key) {
      if (!draft || !actionMap[key]) return;
      const [label, mutate] = actionMap[key];
      draft.history = Array.isArray(draft.history) ? draft.history : [];
      draft.history.push({ label, stats: { ...draft.stats }, at: new Date().toISOString() });
      if (draft.history.length > 150) draft.history.shift();
      mutate(draft.stats);
      draft.updatedAt = new Date().toISOString();
      persist();
      renderLive();
    }

    function undoLast() {
      if (!draft || !Array.isArray(draft.history) || !draft.history.length) {
        win.alert('There is no live entry to undo.');
        return;
      }
      const previous = draft.history.pop();
      draft.stats = { ...previous.stats };
      draft.updatedAt = new Date().toISOString();
      persist();
      renderLive();
    }

    function startOrResume(event) {
      draft = read(storage, ACTIVE_KEY, null);
      if (draft && draft.status === 'active' && String(draft.scheduleId) !== String(event.id)) {
        win.alert(`A preview game against ${draft.opponent} is already active. Resume or discard that preview first.`);
        return;
      }
      if (!draft || draft.status !== 'active') {
        draft = {
          id: `preview-${event.id}-${Date.now()}`,
          scheduleId: event.id,
          date: event.date,
          opponent: cleanOpponent(event.title),
          status: 'active',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: defaultStats(),
          history: []
        };
        persist();
      }
      win.show('live-game-preview');
      renderLive();
    }

    function finishPreview() {
      if (!draft) return;
      const score = (doc.getElementById('liveFinalScore').value || '').trim();
      const result = doc.getElementById('liveFinalResult').value;
      if (!score) {
        win.alert('Enter the final score before finishing the preview game.');
        return;
      }
      const finished = read(storage, FINISHED_KEY, []);
      finished.push({ ...draft, status: 'finished', score, result, finishedAt: new Date().toISOString() });
      write(storage, FINISHED_KEY, finished);
      draft = null;
      persist();
      win.renderAll();
      win.show('schedule');
      win.alert('Preview game finished. Your production season statistics were not changed.');
    }

    function discardPreview() {
      if (!draft) return;
      if (!win.confirm(`Discard the live preview against ${draft.opponent}?`)) return;
      draft = null;
      persist();
      win.renderAll();
      win.show('schedule');
    }

    function addScheduleButtons() {
      const upcoming = doc.getElementById('upcoming');
      if (!upcoming || typeof win.schedule !== 'function' || typeof win.attendance !== 'function') return;
      draft = read(storage, ACTIVE_KEY, null);
      const attendance = win.attendance();
      const events = win.schedule().filter((event) => !attendance[event.id]?.status || attendance[event.id].status === 'Scheduled');
      const rows = [...upcoming.querySelectorAll(':scope > .event')];
      rows.forEach((row, index) => {
        const event = events[index];
        if (!event || event.type !== 'Game') return;
        row.querySelector('[data-live-preview-wrap]')?.remove();
        const wrap = doc.createElement('div');
        wrap.className = 'actions';
        wrap.dataset.livePreviewWrap = '1';
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'btn green';
        const isActive = draft && draft.status === 'active' && String(draft.scheduleId) === String(event.id);
        button.textContent = isActive ? 'Resume Live Game' : 'Start Live Game';
        button.addEventListener('click', () => startOrResume(event));
        wrap.appendChild(button);
        row.lastElementChild.appendChild(wrap);
      });
    }

    addStyles();
    buildPage();

    const originalRenderSchedule = win.renderSchedule;
    if (typeof originalRenderSchedule === 'function' && !win.__livePreviewScheduleWrapped) {
      win.__livePreviewScheduleWrapped = true;
      win.renderSchedule = function renderScheduleWithLivePreview() {
        originalRenderSchedule();
        addScheduleButtons();
      };
    }

    const upcoming = doc.getElementById('upcoming');
    if (upcoming) new MutationObserver(addScheduleButtons).observe(upcoming, { childList: true });
    addScheduleButtons();
    renderLive();
  }

  function connectToMasterShell() {
    const shell = document.getElementById('shell');
    if (!shell) return;

    const connectToApp = () => {
      let appFrame;
      try {
        appFrame = shell.contentDocument?.getElementById('app');
      } catch {
        return;
      }
      if (!appFrame) return;
      const initialize = () => install(appFrame.contentWindow, appFrame.contentDocument);
      appFrame.addEventListener('load', initialize);
      if (appFrame.contentDocument?.readyState === 'complete') initialize();
    };

    shell.addEventListener('load', connectToApp);
    if (shell.contentDocument?.readyState === 'complete') connectToApp();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connectToMasterShell);
  else connectToMasterShell();
})();
