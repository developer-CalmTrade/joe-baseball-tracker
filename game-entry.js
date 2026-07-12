(() => {
  const GAME_KEY = 'joeGames_v4';
  const ATTENDANCE_KEY = 'joeAttendance_v4';
  const byId = id => document.getElementById(id);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const number = id => Number(byId(id)?.value || 0);
  const value = id => (byId(id)?.value || '').trim();
  const field = (label, id, type = 'number', attrs = '') => `<div><label for="${id}">${label}</label><input id="${id}" type="${type}" ${attrs}></div>`;
  let editingGameId = null;
  let selectedScheduleId = null;

  const cleanOpponent = title => String(title || '').replace(/^\s*(vs\.?|@)\s*/i, '').trim();
  const normalized = text => cleanOpponent(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function gameForEvent(event) {
    const list = window.games();
    return list.find(game => String(game.scheduleId || '') === String(event.id)) ||
      list.find(game => game.date === event.date && normalized(game.opponent) ===