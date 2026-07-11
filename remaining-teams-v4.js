/* Catalpronos V4 — équipes encore en course, sans compteur ambigu */
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .rt-card{margin:0 0 16px;padding:13px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px}
    .rt-title{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
    .rt-list{display:flex;flex-wrap:wrap;gap:7px}
    .rt-team{display:inline-flex;align-items:center;padding:7px 10px;border:1px solid rgba(45,155,90,.45);border-radius:999px;background:rgba(45,155,90,.1);color:var(--text);font-size:12px;font-weight:750}
    .rt-empty{font-size:12px;color:var(--muted)}
  `;
  document.head.appendChild(style);

  function remainingTeams(player) {
    const prediction = FINALS_PRONOS[player];
    if (!prediction) return [];

    // Les quatre équipes choisies comme demi-finalistes constituent la base claire
    // de cette statistique. Une équipe disparaît dès qu'elle est réellement éliminée.
    return [...new Set((prediction.qf || []).filter(Boolean))]
      .filter(team => !ELIMINATED.has(team));
  }

  function inject(player) {
    const container = document.getElementById('finals-bracket-content');
    if (!container) return;

    container.querySelector('.rt-card')?.remove();
    const teams = remainingTeams(player);
    const card = document.createElement('div');
    card.className = 'rt-card';
    card.innerHTML = `
      <div class="rt-title">Équipes encore en course</div>
      <div class="rt-list">
        ${teams.length
          ? teams.map(team => `<span class="rt-team">${withFlag(team)}</span>`).join('')
          : '<span class="rt-empty">Aucune équipe encore en course</span>'}
      </div>`;

    const progress = container.querySelector('.v4-progress');
    if (progress) progress.after(card);
    else container.prepend(card);
  }

  const previous = window.showParticipantBracket;
  window.showParticipantBracket = function showParticipantBracketWithRemainingTeams(player) {
    if (typeof previous === 'function') previous(player);
    if (player) requestAnimationFrame(() => inject(player));
  };

  window.addEventListener('catalpronos:results-updated', () => {
    const select = document.getElementById('finals-part-select');
    if (select?.value) requestAnimationFrame(() => inject(select.value));
  });
})();
