(() => {
  'use strict';

  const clampScore = value => Math.max(0, Math.min(100, Math.round(value)));

  function pitchingScoreFromLine(line) {
    const ip = Number(line.ip || 0);
    if (ip <= 0) return null;

    const earnedRuns = Number(line.er || 0);
    const walks = Number(line.pbb || 0);
    const strikeouts = Number(line.k || 0);
    const pitches = Number(line.pc || 0);

    const sixInningEra = (earnedRuns * 6) / ip;
    const walksPerInning = walks / ip;
    const strikeoutWalkRatio = walks > 0 ? strikeouts / walks : strikeouts;
    const pitchesPerInning = pitches / ip;

    const runPrevention = Math.max(0, 40 - sixInningEra * 4);
    const control = Math.max(0, 25 - walksPerInning * 20);
    const strikeoutValue = Math.min(15, strikeoutWalkRatio * 15);
    const efficiency = Math.max(0, 20 - Math.max(0, pitchesPerInning - 15) * 3);

    return clampScore(runPrevention + control + strikeoutValue + efficiency);
  }

  const originalGameParts = window.gameParts;
  if (typeof originalGameParts !== 'function') {
    console.error('V4 scoring: gameParts was not found.');
    return;
  }

  window.gameParts = function v4GameParts(game) {
    const parts = originalGameParts(game);
    const pitch = pitchingScoreFromLine(game);

    if (pitch !== null) {
      parts.pitch = pitch;
      parts.total = clampScore(
        parts.hit * 0.4 +
        (parts.field === null ? 70 : parts.field) * 0.2 +
        parts.run * 0.1 +
        pitch * 0.3
      );
    }

    return parts;
  };

  window.pitchingSeasonScore = function pitchingSeasonScore() {
    const pitchingGames = window.games().filter(game => Number(game.ip || 0) > 0);
    if (!pitchingGames.length) return null;

    const seasonLine = pitchingGames.reduce((line, game) => {
      line.ip += Number(game.ip || 0);
      line.er += Number(game.er || 0);
      line.pbb += Number(game.pbb || 0);
      line.k += Number(game.k || 0);
      line.pc += Number(game.pc || 0);
      return line;
    }, { ip: 0, er: 0, pbb: 0, k: 0, pc: 0 });

    return pitchingScoreFromLine(seasonLine);
  };

  window.gameScore = function v4GameScore() {
    const parts = window.games().map(window.gameParts);
    const seasonRun = window.seasonBaserunningScore();
    if (!parts.length) return 0;

    const total = parts.reduce((sum, part) => {
      if (part.pitch === null) {
        return sum + part.hit * 0.57 + (part.field === null ? 70 : part.field) * 0.29 + seasonRun * 0.14;
      }
      return sum + part.hit * 0.4 + (part.field === null ? 70 : part.field) * 0.2 + seasonRun * 0.1 + part.pitch * 0.3;
    }, 0);

    return clampScore(total / parts.length);
  };

  const originalRenderStats = window.renderStats;
  window.renderStats = function v4RenderStatsWithPitching() {
    originalRenderStats();

    const score = window.pitchingSeasonScore();
    if (score === null) return;

    const components = [...document.querySelectorAll('#gameComponentSummary .component')];
    const pitchingComponent = components.find(component =>
      component.querySelector('b')?.textContent.trim() === 'Pitching'
    );

    if (pitchingComponent) {
      const value = pitchingComponent.querySelector(':scope > span');
      const bar = pitchingComponent.querySelector('.bar span');
      if (value) value.textContent = score;
      if (bar) bar.style.width = `${score}%`;
    }
  };

  window.__joeV4PitchingLoaded = true;
  window.renderAll();
})();
