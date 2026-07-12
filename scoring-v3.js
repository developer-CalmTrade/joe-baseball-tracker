(() => {
  const clampScore = value => Math.max(0, Math.min(100, Math.round(value)));

  function strictPitchScore(game) {
    const ip = Number(game.ip || 0);
    if (ip <= 0) return null;
    const earnedRuns = Number(game.er || 0);
    const walks = Number(game.pbb || 0);
    const strikeouts = Number(game.k || 0);
    const pitches = Number(game.pc || 0);
    const era = earnedRuns * 6 / ip;
    const walksPerInning = walks / ip;
    const strikeoutWalkRatio = walks > 0 ? strikeouts / walks : strikeouts;
    const pitchesPerInning = pitches / ip;
    const runPrevention = Math.max(0, 40 - era * 4);
    const control = Math.max(0, 25 - walksPerInning * 20);
    const strikeoutsScore = Math.min(15, strikeoutWalkRatio * 15);
    const efficiency = Math.max(0, 20 - Math.max(0, pitchesPerInning - 15) * 3);
    return clampScore(runPrevention + control + strikeoutsScore + efficiency);
  }

  const originalGameParts = window.gameParts;
  window.gameParts = function patchedGameParts(game) {
    const parts = originalGameParts(game);
    const pitch = strictPitchScore(game);
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
    const totals = pitchingGames.reduce((sum, game) => {
      sum.ip += Number(game.ip || 0);
      sum.er += Number(game.er || 0);
      sum.pbb += Number(game.pbb || 0);
      sum.k += Number(game.k || 0);
      sum.pc += Number(game.pc || 0);
      return sum;
    }, { ip: 0, er: 0, pbb: 0, k: 0, pc: 0 });
    return strictPitchScore(totals);
  };

  window.gameScore = function patchedGameScore() {
    const parts = window.games().map(window.gameParts);
    const seasonRun = window.seasonBaserunningScore();
    if (!parts.length) return 0;
    return clampScore(parts.reduce((sum, part) => {
      if (part.pitch === null) {
        return sum + part.hit * 0.57 + (part.field === null ? 70 : part.field) * 0.29 + seasonRun * 0.14;
      }
      return sum + part.hit * 0.4 + (part.field === null ? 70 : part.field) * 0.2 + seasonRun * 0.1 + part.pitch * 0.3;
    }, 0) / parts.length);
  };

  const originalRenderStats = window.renderStats;
  window.renderStats = function patchedRenderStats() {
    originalRenderStats();
    const score = window.pitchingSeasonScore();
    const components = [...document.querySelectorAll('#gameComponentSummary .component')];
    const pitching = components.find(node => node.querySelector('b')?.textContent.trim() === 'Pitching');
    if (pitching && score !== null) {
      const value = pitching.querySelector(':scope > span');
      const bar = pitching.querySelector('.bar span');
      if (value) value.textContent = score;
      if (bar) bar.style.width = `${score}%`;
    }
  };

  window.renderAll();
})();