/* Catalpronos — remplaçants réels dans les brackets + accès admin */
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .fb-replacement{display:block;margin-top:3px;font-size:10px;color:var(--text);text-decoration:none;font-weight:700;white-space:normal}
    .fb-replacement::before{content:'↳ ';color:var(--gold)}
    .fb-admin-btn{flex:0 0 auto;padding:12px 16px;background:none;border:0;color:var(--gold);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;cursor:pointer;border-bottom:2px solid transparent}
    .fb-admin-btn:hover{border-bottom-color:var(--gold)}
  `;
  document.head.appendChild(style);

  function stateFor(team, predicted, qualified) {
    if (!team) return { cls:'pending', mark:'' };
    if (qualified) {
      if (team === qualified && team === predicted) return { cls:'good', mark:'✅' };
      if (team === qualified) return { cls:'missed', mark:'✅' };
      return { cls:'out', mark:'' };
    }
    if (ELIMINATED.has(team)) return { cls:'out', mark:'' };
    return { cls:'pending', mark:team === predicted ? '•' : '' };
  }

  function matchCard(teamA, teamB, predicted, qualified) {
    const row = team => {
      const st = stateFor(team, predicted, qualified);
      const replacement = qualified && team !== qualified && st.cls === 'out'
        ? `<span class="fb-replacement">${withFlag(qualified)}</span>`
        : '';
      return `<div class="ux-team ${st.cls}"><span>${team ? withFlag(team) : 'À venir'}${replacement}</span><span class="ux-mark">${st.mark}</span></div>`;
    };
    return `<div class="ux-match">${row(teamA)}${row(teamB)}</div>`;
  }

  function renderTree(player) {
    const target = document.getElementById('finals-bracket-content');
    const fp = FINALS_PRONOS[player];
    if (!target || !fp) return;

    const pairs16 = MATCHES_16.map(m => [m[0], m[1]]);
    const pairs8 = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]].map(([a,b]) => [fp.r16[a], fp.r16[b]]);
    const pairsQ = [[0,1],[2,3],[4,5],[6,7]].map(([a,b]) => [fp.r8[a], fp.r8[b]]);
    const pairsS = [[0,1],[2,3]].map(([a,b]) => [fp.qf[a], fp.qf[b]]);
    const pairsF = [[fp.sf[0], fp.sf[1]]];

    const rounds = [
      {label:'16es', teams:pairs16, picks:fp.r16, real:REAL.r16},
      {label:'8es', teams:pairs8, picks:fp.r8, real:REAL.r8},
      {label:'Quarts', teams:pairsQ, picks:fp.qf, real:REAL.qf},
      {label:'Demis', teams:pairsS, picks:fp.sf, real:REAL.sf},
      {label:'Finale', teams:pairsF, picks:[fp.champion], real:[REAL.champion]}
    ];

    const championState = stateFor(fp.champion, fp.champion, REAL.champion);
    const championReplacement = REAL.champion && fp.champion !== REAL.champion
      ? `<span class="fb-replacement">${withFlag(REAL.champion)}</span>` : '';

    target.innerHTML = `<div class="ux-bracket-head">
      <div class="ux-bracket-name">Pronostic de ${player}</div>
      <div class="ux-bracket-legend">
        <div class="ux-legend-line"><span class="ux-swatch good"></span> Vert ✅ : pronostic encore juste</div>
        <div class="ux-legend-line"><span class="ux-swatch out"></span> Gris rayé : équipe éliminée, remplaçant affiché dessous</div>
        <div class="ux-legend-line"><span class="ux-swatch missed"></span> Jaune ✅ : vrai qualifié non pronostiqué</div>
      </div>
    </div>
    <div class="ux-tree-scroll"><div class="ux-tree">
      ${rounds.map(round => `<div class="ux-col"><div class="ux-col-title">${round.label}</div><div class="ux-col-body">${round.teams.map((teams,i) => matchCard(teams[0],teams[1],round.picks[i],round.real[i])).join('')}</div></div>`).join('')}
      <div class="ux-col"><div class="ux-col-title">Champion</div><div class="ux-col-body"><div class="ux-champion ${championState.cls}">🏆<br>${withFlag(fp.champion)} ${championState.mark}${championReplacement}</div></div></div>
    </div></div>`;
  }

  const previous = window.showParticipantBracket;
  window.showParticipantBracket = function(player) {
    if (!player && previous) return previous(player);
    renderTree(player);
  };

  function addAdminAccess() {
    const nav = document.querySelector('nav');
    if (!nav || nav.querySelector('.fb-admin-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fb-admin-btn';
    button.textContent = '⚙️ Admin';
    button.onclick = () => { window.location.href = './admin.html'; };
    nav.appendChild(button);
  }

  document.addEventListener('DOMContentLoaded', addAdminAccess);
  setTimeout(addAdminAccess, 300);
})();
