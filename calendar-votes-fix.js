/* Correctif robuste : associe chaque carte calendrier à son vrai match via les équipes affichées */
(() => {
  'use strict';

  function teamsFor(round, index) {
    if (round === 'r16') return MATCHES_16[index];
    if (round === 'r8') {
      const p = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]][index];
      return [REAL.r16[p[0]], REAL.r16[p[1]]];
    }
    if (round === 'qf') {
      const p = [[0,1],[2,3],[4,5],[6,7]][index];
      return [REAL.r8[p[0]], REAL.r8[p[1]]];
    }
    if (round === 'sf') {
      const p = [[0,1],[2,3]][index];
      return [REAL.qf[p[0]], REAL.qf[p[1]]];
    }
    return [REAL.sf[0], REAL.sf[1]];
  }

  function allFixtures() {
    const list = [];
    for (let i = 0; i < 16; i++) list.push({ round:'r16', index:i, teams:teamsFor('r16', i) });
    for (let i = 0; i < 8; i++) list.push({ round:'r8', index:i, teams:teamsFor('r8', i) });
    for (let i = 0; i < 4; i++) list.push({ round:'qf', index:i, teams:teamsFor('qf', i) });
    for (let i = 0; i < 2; i++) list.push({ round:'sf', index:i, teams:teamsFor('sf', i) });
    list.push({ round:'final', index:0, teams:teamsFor('final', 0) });
    return list.filter(f => f.teams[0] && f.teams[1]);
  }

  function pickFor(player, round, index) {
    const fp = FINALS_PRONOS[player];
    if (!fp) return null;
    return round === 'final' ? fp.champion : fp[round]?.[index] || null;
  }

  function actualFor(round, index) {
    return round === 'final' ? REAL.champion : REAL[round]?.[index] || null;
  }

  function resolveFixture(card) {
    const text = card.textContent || '';
    return allFixtures().find(f => text.includes(f.teams[0]) && text.includes(f.teams[1])) || null;
  }

  function voteState(pick, actual) {
    if (!pick) return { cls:'ux-ko', label:'✗ aucun pronostic' };
    if (actual) return pick === actual
      ? { cls:'ux-ok', label:'✓ correct' }
      : { cls:'ux-ko', label:'✗ faux' };
    if (typeof ELIMINATED !== 'undefined' && ELIMINATED.has(pick)) {
      return { cls:'ux-ko', label:'✗ faux · équipe éliminée' };
    }
    return { cls:'ux-wait', label:'⏳ en attente' };
  }

  function showVotes(fixture) {
    const [teamA, teamB] = fixture.teams;
    const actual = actualFor(fixture.round, fixture.index);
    const voters = PARTICIPANTS.filter(name => FINALS_PRONOS[name]).map(name => ({
      name,
      pick: pickFor(name, fixture.round, fixture.index)
    }));
    const countA = voters.filter(v => v.pick === teamA).length;
    const countB = voters.filter(v => v.pick === teamB).length;

    const modal = document.createElement('div');
    modal.className = 'ux-modal';
    modal.innerHTML = `<div class="ux-sheet">
      <div class="ux-sheet-head"><strong>${withFlag(teamA)} — ${withFlag(teamB)}</strong><button class="ux-close">×</button></div>
      <div class="ux-counts">
        <div class="ux-count"><b>${withFlag(teamA)}</b><small>${countA} vote${countA > 1 ? 's' : ''}</small></div>
        <div class="ux-count"><b>${withFlag(teamB)}</b><small>${countB} vote${countB > 1 ? 's' : ''}</small></div>
      </div>
      ${voters.map(v => {
        const state = voteState(v.pick, actual);
        return `<div class="ux-row"><span>${v.name}</span><span class="${state.cls}">${v.pick ? withFlag(v.pick) : '—'} · ${state.label}</span></div>`;
      }).join('')}
    </div>`;

    modal.querySelector('.ux-close').onclick = () => modal.remove();
    modal.onclick = event => { if (event.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }

  function fixCalendarButtons() {
    const container = document.getElementById('calendrier-content');
    if (!container) return;

    container.querySelectorAll('.cal-match').forEach(card => {
      const fixture = resolveFixture(card);
      if (!fixture) return;

      let button = card.querySelector('.ux-vote-btn');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'ux-vote-btn';
        button.textContent = '👥 Voir les pronostics de ce match';
        const stack = card.querySelector('.cal-teams-stack');
        if (stack) stack.appendChild(button);
      }

      button.onclick = event => {
        event.stopPropagation();
        showVotes(fixture);
      };
    });
  }

  const previousRenderCalendrier = renderCalendrier;
  renderCalendrier = function renderCalendrierWithCorrectVotes() {
    previousRenderCalendrier();
    fixCalendarButtons();
  };

  document.addEventListener('DOMContentLoaded', fixCalendarButtons);
})();
