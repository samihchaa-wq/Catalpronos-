/* Catalpronos — synchronisation publique des résultats */
(() => {
  'use strict';

  async function syncResults() {
    try {
      const response = await fetch('./results.json?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();

      const readWinner = (round, index) => data[round] && data[round][String(index)]
        ? data[round][String(index)].winner
        : null;
      const readScore = (round, index) => data[round] && data[round][String(index)]
        ? data[round][String(index)].score
        : null;

      for (let i = 0; i < 8; i++) {
        const winner = readWinner('r8', i);
        if (winner) REAL.r8[i] = winner;
      }
      for (let i = 0; i < 4; i++) {
        const winner = readWinner('qf', i);
        if (winner) REAL.qf[i] = winner;
      }
      for (let i = 0; i < 2; i++) {
        const winner = readWinner('sf', i);
        if (winner) REAL.sf[i] = winner;
      }
      if (data.final && data.final.winner) REAL.champion = data.final.winner;

      if (typeof CAL_R8 !== 'undefined') {
        CAL_R8.forEach(match => {
          const score = readScore('r8', match.bracket8);
          if (score) match.score = score;
        });
      }
      if (typeof CAL_QF !== 'undefined') {
        CAL_QF.forEach(match => {
          const score = readScore('qf', match.bracketQ);
          if (score) match.score = score;
        });
      }
      if (typeof CAL_SF !== 'undefined') {
        CAL_SF.forEach(match => {
          const score = readScore('sf', match.bracketS);
          if (score) match.score = score;
        });
      }
      if (typeof CAL_FINAL !== 'undefined' && data.final && data.final.score) {
        CAL_FINAL.score = data.final.score;
      }

      if (typeof getEliminated === 'function') ELIMINATED = getEliminated();
      if (typeof renderClassement === 'function') renderClassement();
      if (typeof renderCalendrier === 'function') renderCalendrier();
      if (typeof renderFinales === 'function') renderFinales();
      if (typeof renderBracket === 'function') renderBracket();

      const updated = document.getElementById('last-update');
      if (updated && data.updatedAt) {
        updated.textContent = new Date(data.updatedAt).toLocaleString('fr-FR');
      }
    } catch (error) {
      console.warn('[Catalpronos] Synchronisation impossible', error);
    }
  }

  window.addEventListener('load', syncResults);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncResults();
  });
  setInterval(syncResults, 60000);
})();
