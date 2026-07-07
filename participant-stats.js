/* Catalpronos — statistiques légères par participant */
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .ps-summary{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
    .ps-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border:1px solid var(--border);border-radius:999px;background:var(--surface2);color:var(--muted);font-size:11px;font-weight:800}
    .ps-chip strong{color:var(--text);font-size:12px}
  `;
  document.head.appendChild(style);

  function computeStats(player) {
    const fp = FINALS_PRONOS[player];
    if (!fp) return null;
    const exclusions = LATE_EXCLUSIONS[player] || {};
    const rounds = ['r16','r8','qf','sf'];
    let played = 0;
    let correct = 0;

    rounds.forEach(round => {
      const real = REAL[round] || [];
      const picks = fp[round] || [];
      const excluded = new Set(exclusions[round] || []);
      real.forEach((winner, index) => {
        if (!winner || excluded.has(index) || !picks[index]) return;
        played += 1;
        if (picks[index] === winner) correct += 1;
      });
    });

    if (REAL.champion && fp.champion) {
      played += 1;
      if (fp.champion === REAL.champion) correct += 1;
    }

    return {
      played,
      correct,
      rate: played ? Math.round((correct / played) * 100) : 0
    };
  }

  function inject(player) {
    const stats = computeStats(player);
    const head = document.querySelector('#finals-bracket-content .ux-bracket-head');
    if (!stats || !head || head.querySelector('.ps-summary')) return;

    const block = document.createElement('div');
    block.className = 'ps-summary';
    block.innerHTML = `
      <span class="ps-chip">🎯 <strong>${stats.correct}/${stats.played}</strong> bons pronostics joués</span>
      <span class="ps-chip">📈 <strong>${stats.rate}%</strong> de réussite</span>
    `;

    const left = head.firstElementChild || head;
    left.appendChild(block);
  }

  const previous = window.showParticipantBracket;
  window.showParticipantBracket = function(player) {
    if (typeof previous === 'function') previous(player);
    if (player) requestAnimationFrame(() => inject(player));
  };

  window.addEventListener('catalpronos:results-updated', () => {
    const select = document.getElementById('finals-part-select');
    if (select && select.value) requestAnimationFrame(() => inject(select.value));
  });
})();
