(() => {
  const GAME_KEY = 'joeGames_v4';
  const byId = id => document.getElementById(id);
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const number = id => Number(byId(id)?.value || 0);
  const value = id => (byId(id)?.value || '').trim();
  const field = (label, id, type = 'number', attrs = '') =>
    `<div><label for="${id}">${label}</label><input id="${id}" type="${type}" ${attrs}></div>`;
  let editingGameId = null;

  function buildPage() {
    if (byId('game-entry')) return;
    const main = document.querySelector('main');
    const section = document.createElement('section');
    section.id = 'game-entry';
    section.className = 'page';
    section.innerHTML = `
      <div class="card">
        <h2 id="gameEntryTitle">Add Game Stats</h2>
        <p class="small">Enter one complete game at a time. Singles and extra-base hits automatically calculate total hits.</p>
        <div class="grid">
          ${field('Date', 'geDate', 'date', 'required')}
          ${field('Opponent', 'geOpponent', 'text')}
          <div><label for="geResult">Result</label><select id="geResult"><option>Win</option><option>Loss</option><option>Tie</option></select></div>
          ${field('Final Score', 'geScore', 'text', 'placeholder="11-6"')}
        </div>
        <h3 class="sub">Batting</h3>
        <div class="grid">
          ${field('PA', 'gePA')}${field('AB', 'geAB')}${field('1B', 'ge1B')}${field('2B', 'ge2B')}
          ${field('3B', 'ge3B')}${field('HR', 'geHR')}${field('BB', 'geBB')}${field('SO', 'geSO')}
          ${field('RBI', 'geRBI')}${field('Runs', 'geRuns')}${field('SB', 'geSB')}
        </div>
        <h3 class="sub">Pitching</h3>
        <div class="grid">
          ${field('Innings Pitched', 'geIP', 'number', 'step="0.1"')}${field('Pitch Count', 'gePC')}
          ${field('Hits Allowed', 'gePH')}${field('Strikeouts', 'geK')}
          ${field('Walks Allowed', 'gePBB')}${field('Earned Runs', 'geER')}
        </div>
        <h3 class="sub">Fielding</h3>
        <div class="grid">
          ${field('Total Chances', 'geTC')}${field('Putouts', 'gePO')}
          ${field('Assists', 'geA')}${field('Errors', 'geE')}
        </div>
        <label for="geNotes">Game Notes</label><textarea id="geNotes"></textarea>
        <div class="actions">
          <button class="btn green" type="button" id="geSave">Save Game Stats</button>
          <button class="btn gray" type="button" id="geCancel" style="display:none">Cancel Edit</button>
        </div>
      </div>
      <div class="card"><h2>Saved Games</h2><div id="gameEntryList"></div></div>`;
    main.appendChild(section);

    const statsButton = document.querySelector('.drawer button[data-p="stats"]');
    const button = document.createElement('button');
    button.dataset.p = 'game-entry';
    button.textContent = '➕ Add / Edit Game Stats';
    button.onclick = () => window.show('game-entry');
    statsButton?.parentNode.insertBefore(button, statsButton);

    byId('geSave').onclick = saveGame;
    byId('geCancel').onclick = clearForm;
    clearForm();
  }

  function clearForm() {
    editingGameId = null;
    byId('gameEntryTitle').textContent = 'Add Game Stats';
    byId('geCancel').style.display = 'none';
    byId('geDate').value = new Date().toISOString().slice(0, 10);
    ['geOpponent','geScore','geNotes'].forEach(id => { byId(id).value = ''; });
    byId('geResult').value = 'Win';
    ['gePA','geAB','ge1B','ge2B','ge3B','geHR','geBB','geSO','geRBI','geRuns','geSB','geIP','gePC','gePH','geK','gePBB','geER','geTC','gePO','geA','geE']
      .forEach(id => { byId(id).value = 0; });
  }

  function saveGame() {
    if (!value('geDate') || !value('geOpponent')) {
      alert('Add the game date and opponent.');
      return;
    }
    const wasEditing = editingGameId !== null;
    const singles = number('ge1B');
    const doubles = number('ge2B');
    const triples = number('ge3B');
    const homers = number('geHR');
    const game = {
      id: editingGameId || `g${Date.now()}`,
      date: value('geDate'), opponent: value('geOpponent'), result: value('geResult'), score: value('geScore'),
      pa: number('gePA'), ab: number('geAB'), h: singles + doubles + triples + homers,
      b2: doubles, b3: triples, hr: homers, bb: number('geBB'), so: number('geSO'),
      rbi: number('geRBI'), runs: number('geRuns'), sb: number('geSB'),
      ip: number('geIP'), pc: number('gePC'), ph: number('gePH'), k: number('geK'), pbb: number('gePBB'), er: number('geER'),
      tc: number('geTC'), po: number('gePO'), a: number('geA'), e: number('geE'), notes: value('geNotes')
    };
    const current = typeof window.games === 'function' ? window.games() : read(GAME_KEY, []);
    const updated = current.filter(item => String(item.id) !== String(editingGameId));
    updated.push(game);
    updated.sort((a, b) => a.date.localeCompare(b.date));
    write(GAME_KEY, updated);
    clearForm();
    window.renderAll();
    renderList();
    alert(wasEditing ? 'Game updated.' : 'Game stats saved.');
  }

  function editGame(id) {
    const game = window.games().find(item => String(item.id) === String(id));
    if (!game) return;
    editingGameId = game.id;
    byId('gameEntryTitle').textContent = 'Edit Game Stats';
    byId('geCancel').style.display = '';
    const singles = Math.max(0, Number(game.h || 0) - Number(game.b2 || 0) - Number(game.b3 || 0) - Number(game.hr || 0));
    const values = {
      geDate: game.date, geOpponent: game.opponent, geResult: game.result, geScore: game.score,
      gePA: game.pa, geAB: game.ab, ge1B: singles, ge2B: game.b2, ge3B: game.b3, geHR: game.hr,
      geBB: game.bb, geSO: game.so, geRBI: game.rbi, geRuns: game.runs, geSB: game.sb,
      geIP: game.ip, gePC: game.pc, gePH: game.ph, geK: game.k, gePBB: game.pbb, geER: game.er,
      geTC: game.tc, gePO: game.po, geA: game.a, geE: game.e, geNotes: game.notes
    };
    Object.entries(values).forEach(([id, val]) => { byId(id).value = val ?? 0; });
    window.show('game-entry');
    scrollTo(0, 0);
  }

  function deleteGame(id) {
    const game = window.games().find(item => String(item.id) === String(id));
    if (!game || !confirm(`Delete ${game.date} vs. ${game.opponent}?`)) return;
    write(GAME_KEY, window.games().filter(item => String(item.id) !== String(id)));
    window.renderAll();
    renderList();
  }

  function renderList() {
    const list = byId('gameEntryList');
    if (!list) return;
    const games = window.games().slice().sort((a, b) => b.date.localeCompare(a.date));
    list.innerHTML = games.map(game => `
      <div class="row" style="align-items:flex-start">
        <div><b>${game.date} vs. ${game.opponent}</b><div class="small">${game.result} ${game.score || ''} · PA ${game.pa || 0} · H ${game.h || 0} · BB ${game.bb || 0} · SB ${game.sb || 0}${Number(game.ip || 0) > 0 ? ` · IP ${game.ip}` : ''}</div></div>
        <div class="actions"><button class="btn gray" type="button" data-edit="${game.id}">Edit</button><button class="btn red" type="button" data-delete="${game.id}">Delete</button></div>
      </div>`).join('');
    list.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => editGame(button.dataset.edit));
    list.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => deleteGame(button.dataset.delete));
  }

  function ensureSinglesTile() {
    const metrics = byId('battingMetrics');
    if (!metrics || [...metrics.querySelectorAll('.small')].some(label => label.textContent.trim() === '1B')) return;
    const total = window.totals().t;
    const singles = Math.max(0, Number(total.h || 0) - Number(total.b2 || 0) - Number(total.b3 || 0) - Number(total.hr || 0));
    const tile = document.createElement('div');
    tile.className = 'metric';
    tile.innerHTML = `<b>${singles}</b><span class="small">1B</span>`;
    const hitTile = [...metrics.children].find(node => node.querySelector('.small')?.textContent.trim() === 'Hits');
    hitTile?.insertAdjacentElement('afterend', tile);
  }

  buildPage();
  const originalRenderAll = window.renderAll;
  window.renderAll = function modularRenderAll() {
    originalRenderAll();
    renderList();
    ensureSinglesTile();
  };
  window.renderAll();
})();