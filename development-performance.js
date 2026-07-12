(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const STORAGE_KEY = 'joeDevelopment_v4';
  const number = value => Number(value || 0);
  const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const pct = (part, total) => number(total) > 0 ? number(part) / number(total) * 100 : null;
  const formatDate = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const fmt = (value, digits = 1) => value === null || !Number.isFinite(value) ? '—' : Number(value).toFixed(digits);

  const metricDefinitions = [
    { key: 'lineDrive', label: 'Line Drive %', unit: '%', weight: 25, scale: 15, value: s => pct(s.gameTeeSolid, s.gameTee) },
    { key: 'solidContact', label: 'Solid Contact %', unit: '%', weight: 25, scale: 15, value: s => pct(s.maxSolid, s.maxSwings) },
    { key: 'command', label: 'Pitching Command', unit: '%', weight: 25, scale: 15, value: s => pct(s.holeHits, s.pitchTotal) },
    { key: 'exitVelo', label: 'Best Exit Velocity', unit: ' mph', weight: 10, scale: 5, value: s => number(s.exitVelo) > 0 ? number(s.exitVelo) : null },
    { key: 'avgPitchVelo', label: 'Average Pitch Velocity', unit: ' mph', weight: 10, scale: 4, value: s => number(s.avgPitchVelo) > 0 ? number(s.avgPitchVelo) : null },
    { key: 'maxPitchVelo', label: 'Maximum Pitch Velocity', unit: ' mph', weight: 5, scale: 4, value: s => number(s.maxPitchVelo) > 0 ? number(s.maxPitchVelo) : null }
  ];

  function install() {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc || doc.documentElement.dataset.developmentPerformanceInstalled === '1') return;
    doc.documentElement.dataset.developmentPerformanceInstalled = '1';

    const readSessions = () => {
      try {
        const list = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(list) ? list.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))) : [];
      } catch {
        return [];
      }
    };

    function addStyles() {
      if (doc.getElementById('developmentPerformanceStyles')) return;
      const style = doc.createElement('style');
      style.id = 'developmentPerformanceStyles';
      style.textContent = `
        .development-score-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .development-score-card{padding:16px;border-radius:16px;background:#eff6ff}
        .development-score-card b{display:block;font-size:2rem}
        .development-score-card span{font-size:.8rem;color:#64748b;font-weight:800}
        .development-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .development-trend-card{border:1px solid #dbe3ee;border-radius:16px;padding:14px;background:#fff}
        .development-trend-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .development-trend-value{font-size:1.7rem;font-weight:900}
        .development-up{color:#15803d;font-weight:900}.development-down{color:#b91c1c;font-weight:900}.development-flat{color:#64748b;font-weight:900}
        .development-mini-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
        .development-mini-grid div{background:#f8fafc;border-radius:10px;padding:9px}
        .development-mini-grid b{display:block;font-size:1rem}.development-mini-grid span{font-size:.72rem;color:#64748b}
        .development-spark{width:100%;height:52px;margin-top:10px}
        .development-session{padding:13px 0;border-bottom:1px solid #e2e8f0}
        .development-session-top{display:flex;justify-content:space-between;gap:12px}
        .development-session-metrics{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
        .development-chip{padding:6px 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:.75rem;font-weight:800}
        @media(max-width:760px){.development-score-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.development-metric-grid{grid-template-columns:1fr}}
      `;
      doc.head.appendChild(style);
    }

    function metricSeries(definition, sessions) {
      return sessions.map(session => ({ date: session.date, value: definition.value(session) })).filter(point => point.value !== null && Number.isFinite(point.value));
    }

    function metricSummary(definition, sessions) {
      const series = metricSeries(definition, sessions);
      const values = series.map(point => point.value);
      const latest = values.length ? values[values.length - 1] : null;
      const recent = average(values.slice(-3));
      const earlier = values.slice(0, Math.max(0, values.length - 3)).slice(-5);
      const comparison = earlier.length ? average(earlier) : (values.length > 1 ? average(values.slice(0, -1).slice(-3)) : null);
      const best = values.length ? Math.max(...values) : null;
      const change = recent !== null && comparison !== null ? recent - comparison : null;
      return { series, latest, recent, comparison, best, change };
    }

    function improvementRating(sessions) {
      let weighted = 0;
      let totalWeight = 0;
      metricDefinitions.forEach(definition => {
        const summary = metricSummary(definition, sessions);
        if (summary.change === null) return;
        const score = Math.max(0, Math.min(100, 50 + (summary.change / definition.scale) * 50));
        weighted += score * definition.weight;
        totalWeight += definition.weight;
      });
      return totalWeight ? clamp(weighted / totalWeight) : 50;
    }

    function sessionQuality(session) {
      if (!session) return 0;
      if (typeof win.sessionScore === 'function') return clamp(win.sessionScore(session));
      const ratios = [pct(session.gameTeeSolid, session.gameTee), pct(session.maxSolid, session.maxSwings), pct(session.holeHits, session.pitchTotal)].filter(value => value !== null);
      const skill = average(ratios) ?? 0;
      const work = Math.min(100, number(session.minutes) / 40 * 100);
      const arm = session.armFeel === 'Great' ? 100 : session.armFeel === 'Normal' ? 80 : session.armFeel === 'Tired' ? 45 : 15;
      return clamp(skill * .6 + work * .25 + arm * .15);
    }

    function trendClass(change) {
      if (change === null || Math.abs(change) < .5) return 'development-flat';
      return change > 0 ? 'development-up' : 'development-down';
    }

    function trendText(change, unit) {
      if (change === null) return 'Building baseline';
      const arrow = change > .5 ? '▲' : change < -.5 ? '▼' : '●';
      const sign = change > 0 ? '+' : '';
      const suffix = unit === '%' ? ' pts' : unit;
      return `${arrow} ${sign}${fmt(change)}${suffix}`;
    }

    function sparkline(series) {
      const values = series.slice(-10).map(point => point.value);
      if (values.length < 2) return '<div class="small" style="margin-top:10px">More sessions are needed for a trend line.</div>';
      const min = Math.min(...values), max = Math.max(...values), range = Math.max(.001, max - min);
      const points = values.map((value, index) => {
        const x = index / (values.length - 1) * 100;
        const y = 45 - ((value - min) / range) * 38;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return `<svg class="development-spark" viewBox="0 0 100 50" preserveAspectRatio="none" aria-label="Recent trend"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
    }

    function metricCard(definition, sessions) {
      const summary = metricSummary(definition, sessions);
      const display = value => value === null ? '—' : `${fmt(value)}${definition.unit}`;
      return `<div class="development-trend-card">
        <div class="development-trend-head"><div><b>${definition.label}</b><div class="small">Recent 3 sessions vs previous sessions</div></div><div style="text-align:right"><div class="development-trend-value">${display(summary.latest)}</div><div class="${trendClass(summary.change)}">${trendText(summary.change, definition.unit)}</div></div></div>
        ${sparkline(summary.series)}
        <div class="development-mini-grid"><div><b>${display(summary.recent)}</b><span>Recent 3 Avg</span></div><div><b>${display(summary.comparison)}</b><span>Previous Avg</span></div><div><b>${display(summary.best)}</b><span>Personal Best</span></div></div>
      </div>`;
    }

    function renderPerformance() {
      const sessions = readSessions();
      const latest = sessions[sessions.length - 1] || null;
      const quality = sessionQuality(latest);
      const improvement = improvementRating(sessions);
      const progress = sessions.length ? clamp(quality * .7 + improvement * .3) : 0;
      const baselineReady = sessions.length >= 3;

      const score = doc.getElementById('developmentProgressScore');
      const qualityNode = doc.getElementById('developmentSessionQuality');
      const improvementNode = doc.getElementById('developmentImprovementScore');
      const baselineNode = doc.getElementById('developmentBaselineCount');
      const note = doc.getElementById('developmentProgressNote');
      const metrics = doc.getElementById('developmentMetricGrid');
      const history = doc.getElementById('developmentSessionPerformanceList');
      if (!score || !qualityNode || !improvementNode || !baselineNode || !note || !metrics || !history) return;

      score.textContent = progress;
      qualityNode.textContent = sessions.length ? quality : '—';
      improvementNode.textContent = baselineReady ? improvement : '—';
      baselineNode.textContent = `${Math.min(3, sessions.length)}/3`;
      note.innerHTML = !sessions.length
        ? '<b>No development sessions logged yet.</b> Complete a session to begin the baseline.'
        : !baselineReady
          ? `<b>Baseline building.</b> ${3 - sessions.length} more complete session${3 - sessions.length === 1 ? '' : 's'} needed before improvement is scored.`
          : `<b>Progress Score:</b> 70% latest session quality and 30% improvement versus Joe's previous sessions. Missing measurements are ignored rather than counted as zero.`;
      metrics.innerHTML = metricDefinitions.map(definition => metricCard(definition, sessions)).join('');

      const latestSessions = sessions.slice(-10).reverse();
      history.innerHTML = latestSessions.length ? latestSessions.map(session => {
        const line = pct(session.gameTeeSolid, session.gameTee);
        const solid = pct(session.maxSolid, session.maxSwings);
        const command = pct(session.holeHits, session.pitchTotal);
        const chips = [
          line !== null ? `Line Drives ${fmt(line, 0)}%` : null,
          solid !== null ? `Solid Contact ${fmt(solid, 0)}%` : null,
          command !== null ? `Command ${fmt(command, 0)}%` : null,
          number(session.exitVelo) > 0 ? `Exit ${fmt(number(session.exitVelo))} mph` : null,
          number(session.avgPitchVelo) > 0 ? `Pitch Avg ${fmt(number(session.avgPitchVelo))} mph` : null,
          number(session.maxPitchVelo) > 0 ? `Pitch Max ${fmt(number(session.maxPitchVelo))} mph` : null,
          session.armFeel ? `Arm ${session.armFeel}` : null
        ].filter(Boolean);
        return `<div class="development-session"><div class="development-session-top"><div><b>${formatDate(session.date)}</b><div class="small">${number(session.minutes)} minutes</div></div><div style="text-align:right"><b>Quality ${sessionQuality(session)}</b></div></div><div class="development-session-metrics">${chips.map(chip => `<span class="development-chip">${chip}</span>`).join('') || '<span class="small">No measurable performance values entered.</span>'}</div></div>`;
      }).join('') : '<p class="small">No development sessions logged yet.</p>';
    }

    function buildPage() {
      if (doc.getElementById('development-performance')) return;
      const page = doc.createElement('section');
      page.id = 'development-performance';
      page.className = 'page';
      page.innerHTML = `<div class="card hero"><div class="small">DEVELOPMENT PERFORMANCE</div><h2>Track Improvement, Not Just Completion</h2><div class="small">Joe is compared against his own previous sessions and personal bests.</div></div>
        <div class="card"><h2>Development Progress</h2><div class="development-score-grid"><div class="development-score-card"><b id="developmentProgressScore">0</b><span>Progress Score</span></div><div class="development-score-card"><b id="developmentSessionQuality">—</b><span>Latest Session Quality</span></div><div class="development-score-card"><b id="developmentImprovementScore">—</b><span>Improvement Trend</span></div><div class="development-score-card"><b id="developmentBaselineCount">0/3</b><span>Baseline Sessions</span></div></div><div id="developmentProgressNote" class="notice" style="margin-top:14px"></div><div class="actions"><button id="developmentOpenLog" class="btn green" type="button">Log Development Session</button><button id="developmentBackDashboard" class="btn gray" type="button">Back to Dashboard</button></div></div>
        <div class="card"><h2>Performance Trends</h2><p class="small">Recent three-session averages are compared with up to five previous measured sessions. Missing data does not count as zero.</p><div id="developmentMetricGrid" class="development-metric-grid"></div></div>
        <div class="card"><h2>Session-by-Session Performance</h2><div id="developmentSessionPerformanceList"></div></div>
        <div class="card"><h2>How Improvement Is Measured</h2><div class="component"><b>Hitting quality</b><span>Line-drive % and solid-contact %</span></div><div class="component"><b>Pitching command</b><span>9-hole hits divided by attempts</span></div><div class="component"><b>Velocity</b><span>Exit velocity and average/max pitch velocity</span></div><div class="component"><b>Personal baseline</b><span>First three complete sessions</span></div><div class="component"><b>Trend protection</b><span>One poor day does not erase the rolling trend</span></div></div>`;
      doc.querySelector('main').appendChild(page);
      doc.getElementById('developmentOpenLog').onclick = () => win.show('log');
      doc.getElementById('developmentBackDashboard').onclick = () => win.show('dash');
    }

    function addDrawerButton() {
      const drawer = doc.getElementById('drawer');
      if (!drawer || doc.getElementById('developmentPerformanceDrawerButton')) return;
      const button = doc.createElement('button');
      button.id = 'developmentPerformanceDrawerButton';
      button.type = 'button';
      button.textContent = '📈 Development Performance';
      button.onclick = () => {
        win.show('development-performance');
        renderPerformance();
        if (typeof win.menu === 'function') win.menu(false);
      };
      const historyButton = drawer.querySelector('[data-p="history"]');
      if (historyButton) drawer.insertBefore(button, historyButton);
      else drawer.appendChild(button);
    }

    addStyles();
    buildPage();
    addDrawerButton();
    renderPerformance();

    const originalSaveDev = win.saveDev;
    if (typeof originalSaveDev === 'function' && !win.__developmentPerformanceSaveWrapped) {
      win.__developmentPerformanceSaveWrapped = true;
      win.saveDev = function saveDevelopmentAndRefreshPerformance() {
        const result = originalSaveDev();
        setTimeout(renderPerformance, 0);
        return result;
      };
    }

    const originalRenderAll = win.renderAll;
    if (typeof originalRenderAll === 'function' && !win.__developmentPerformanceRenderWrapped) {
      win.__developmentPerformanceRenderWrapped = true;
      win.renderAll = function renderAllWithDevelopmentPerformance() {
        const result = originalRenderAll();
        addDrawerButton();
        renderPerformance();
        return result;
      };
    }
  }

  frame.addEventListener('load', install);
  if (frame.contentDocument?.readyState === 'complete') install();
})();