(() => {
  const DEV_KEY = 'joeDevelopment_v4';
  const STATUS_KEY = 'joeDevelopmentStatus_v1';
  let editingSessionId = null;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const currentDate = () => new Date().toISOString().slice(0, 10);
  const longDate = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const numberValue = id => Number(document.getElementById(id)?.value || 0);
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? 0;
  };

  function sessionSummary(session) {
    const rope = (session.ropeDry || 0) + (session.ropeBottom || 0) + (session.ropeTop || 0) + (session.ropeTwoTee || 0);
    const hitting = (session.gameTee || 0) + (session.maxSwings || 0);
    const command = `${session.holeHits || 0}/${session.pitchTotal || 0}`;
    const parts = [`${session.minutes || 0} min`];
    if (rope) parts.push(`Rope Bat ${rope}`);
    if (hitting) parts.push(`Game-bat swings ${hitting}`);
    if (session.pitchTotal) parts.push(`9-hole ${command}`);
    return parts.join(' · ');
  }

  function addTodayDateAndControls() {
    const title = document.getElementById('planTitle');
    if (!title) return;

    let dateLine = document.getElementById('todayPlanDate');
    if (!dateLine) {
      dateLine = document.createElement('div');
      dateLine.id = 'todayPlanDate';
      dateLine.style.cssText = 'margin:8px 0 12px;padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:900';
      title.insertAdjacentElement('afterend', dateLine);
    }
    dateLine.textContent = `📅 ${longDate(currentDate())}`;

    const actions = title.closest('.card')?.querySelector('.actions');
    if (!actions) return;

    const markComplete = [...actions.querySelectorAll('button')].find(button => /Mark Complete/i.test(button.textContent));
    if (markComplete) markComplete.style.display = 'none';

    const logButton = [...actions.querySelectorAll('button')].find(button => /Log Session|Log Details/i.test(button.textContent));
    if (logButton) logButton.textContent = 'Log Session';

    const status = read(STATUS_KEY, {})[currentDate()];
    let undo = document.getElementById('undoTodayStatus');
    if (status) {
      if (!undo) {
        undo = document.createElement('button');
        undo.id = 'undoTodayStatus';
        undo.type = 'button';
        undo.className = 'btn gray';
        undo.textContent = '↩ Undo Today’s Status';
        undo.onclick = undoTodayStatus;
        actions.appendChild(undo);
      }
      undo.style.display = '';
    } else if (undo) {
      undo.style.display = 'none';
    }
  }

  window.undoTodayStatus = function undoTodayStatus() {
    const date = currentDate();
    const statuses = read(STATUS_KEY, {});
    if (!statuses[date]) return;
    if (!confirm(`Return ${longDate(date)} to Not Started?\n\nThis removes only the day status. Saved session data remains in Development History.`)) return;
    delete statuses[date];
    write(STATUS_KEY, statuses);
    if (typeof window.renderAll === 'function') window.renderAll();
  };

  const originalSkip = window.skipDev;
  window.skipDev = function confirmedSkip() {
    const date = currentDate();
    if (!confirm(`Skip development for ${longDate(date)}?`)) return;
    const reason = prompt('Reason: Game Day, Rest Day, Vacation, Sick, Weather, Family, or Other', 'Rest Day');
    if (reason === null) return;
    const statuses = read(STATUS_KEY, {});
    statuses[date] = { status: 'Skipped', note: reason.trim() || 'Skipped' };
    write(STATUS_KEY, statuses);
    if (typeof window.renderAll === 'function') window.renderAll();
  };

  window.deleteDevelopmentEntry = function deleteDevelopmentEntry(date, id) {
    const label = longDate(date);
    if (!confirm(`Delete the development history entry for ${label}?\n\nGame statistics and schedule events will not be changed.`)) return;

    if (id) {
      const sessions = read(DEV_KEY, []).filter(session => String(session.id) !== String(id));
      write(DEV_KEY, sessions);
      const remainingForDate = sessions.some(session => session.date === date);
      if (!remainingForDate) {
        const statuses = read(STATUS_KEY, {});
        delete statuses[date];
        write(STATUS_KEY, statuses);
      }
    } else {
      const statuses = read(STATUS_KEY, {});
      delete statuses[date];
      write(STATUS_KEY, statuses);
    }
    if (typeof window.renderAll === 'function') window.renderAll();
  };

  window.editDevelopmentSession = function editDevelopmentSession(id) {
    const sessions = read(DEV_KEY, []);
    const session = sessions.find(item => String(item.id) === String(id));
    if (!session) return;
    editingSessionId = session.id;

    setValue('dDate', session.date);
    setValue('mins', session.minutes);
    setValue('ropeDry', session.ropeDry);
    setValue('ropeBottom', session.ropeBottom);
    setValue('ropeTop', session.ropeTop);
    setValue('ropeTwoTee', session.ropeTwoTee);
    setValue('gameTee', session.gameTee);
    setValue('gameTeeSolid', session.gameTeeSolid);
    setValue('maxPitches', session.maxPitches);
    setValue('maxSwings', session.maxSwings);
    setValue('maxSolid', session.maxSolid);
    setValue('exitVelo', session.exitVelo);
    setValue('radarPitches', session.radarPitches);
    setValue('avgPitchVelo', session.avgPitchVelo);
    setValue('maxPitchVelo', session.maxPitchVelo);
    setValue('armFeel', session.armFeel || 'Normal');
    setValue('devNotes', session.notes || '');

    if (typeof window.resetZone === 'function') {
      const originalConfirm = window.confirm;
      window.confirm = () => true;
      window.resetZone();
      window.confirm = originalConfirm;
      (session.holePockets || []).forEach(pocket => {
        const index = Number(pocket.pocket) - 1;
        for (let i = 0; i < Number(pocket.attempts || 0); i++) window.zoneAttempt(index);
        for (let i = 0; i < Number(pocket.hits || 0); i++) window.zoneHit(index);
      });
    }

    if (typeof window.show === 'function') window.show('log');
    const heading = document.querySelector('#log h2');
    if (heading) heading.textContent = `Edit Development Session — ${longDate(session.date)}`;
    document.getElementById('log')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const originalSave = window.saveDev;
  if (typeof originalSave === 'function') {
    window.saveDev = function saveOrUpdateDevelopment() {
      if (editingSessionId !== null) {
        const sessions = read(DEV_KEY, []).filter(session => String(session.id) !== String(editingSessionId));
        write(DEV_KEY, sessions);
      }
      originalSave();
      editingSessionId = null;
      const heading = document.querySelector('#log h2');
      if (heading) heading.textContent = 'Development Session Log';
    };
  }

  function renderEditableHistory() {
    const container = document.getElementById('devHistory');
    if (!container) return;
    const sessions = read(DEV_KEY, []);
    const statuses = read(STATUS_KEY, {});
    const dates = [...new Set([...Object.keys(statuses), ...sessions.map(session => session.date)])].sort().reverse();

    if (!dates.length) {
      container.innerHTML = '<p class="small">No development history yet.</p>';
      return;
    }

    container.innerHTML = dates.map(date => {
      const daySessions = sessions.filter(session => session.date === date);
      const status = statuses[date];
      if (daySessions.length) {
        return daySessions.map(session => `
          <div class="row" style="align-items:flex-start">
            <div style="flex:1">
              <b>${longDate(date)}</b>
              <div class="small">Completed · ${sessionSummary(session)}</div>
              <div class="actions">
                <button class="btn gray" type="button" onclick="editDevelopmentSession('${session.id}')">✏ Edit</button>
                <button class="btn red" type="button" onclick="deleteDevelopmentEntry('${date}','${session.id}')">🗑 Delete</button>
              </div>
            </div>
            <b>Completed</b>
          </div>`;
      }).join('');
      return `
        <div class="row" style="align-items:flex-start">
          <div style="flex:1">
            <b>${longDate(date)}</b>
            <div class="small">${status?.note || 'Skipped'}</div>
            <div class="actions">
              <button class="btn red" type="button" onclick="deleteDevelopmentEntry('${date}','')">🗑 Delete</button>
            </div>
          </div>
          <b>${status?.status || 'Not Started'}</b>
        </div>`;
    }).join('');
  }

  const originalRenderPlan = window.renderPlan;
  if (typeof originalRenderPlan === 'function') {
    window.renderPlan = function enhancedRenderPlan() {
      originalRenderPlan();
      addTodayDateAndControls();
    };
  }

  const originalRenderHistory = window.renderHistory;
  if (typeof originalRenderHistory === 'function') {
    window.renderHistory = function enhancedRenderHistory() {
      originalRenderHistory();
      renderEditableHistory();
    };
  }

  const originalRenderAll = window.renderAll;
  if (typeof originalRenderAll === 'function') {
    window.renderAll = function enhancedRenderAll() {
      originalRenderAll();
      addTodayDateAndControls();
      renderEditableHistory();
    };
  }

  addTodayDateAndControls();
  renderEditableHistory();
})();
