(() => {
  const byId = id => document.getElementById(id);
  const number = id => Number(byId(id)?.value || 0);
  const value = id => (byId(id)?.value || '').trim();
  let editingGameId = null;

  const field = (label, id, type = 'number', extra = '') =>
    `<div><label for="${id}">${label}</label><input id="${id}" type="${type}" ${extra}></div>`;

  function buildForm() {
    const page = byId('stats');
    if (!page || byId('gameEntryCard')) return;

    const card = document.createElement('div');
    card.id = 'gameEntryCard';
    card.className = 'card';
    card.innerHTML = `
      <h2>➕ Add Game Stats</h2>
      <p class="small">Enter one complete game at a time. Saving updates batting, bas