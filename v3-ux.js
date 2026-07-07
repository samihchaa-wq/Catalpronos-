/* Catalpronos V3.4 — navigation, votes et brackets pronostiqués */
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .ux-vote-btn{display:block;margin-top:7px;border:0;background:transparent;color:var(--gold);font-size:11px;font-weight:700;padding:0;text-align:left}
    .ux-modal{position:fixed;inset:0;background:rgba(0,0,0,.74);z-index:9999;display:grid;align-items:end}
    .ux-sheet{background:var(--surface);border-radius:18px 18px 0 0;padding:16px;max-height:84vh;overflow:auto;border-top:1px solid var(--border)}
    .ux-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .ux-sheet-head strong{font-size:16px}.ux-close{width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:19px}
    .ux-counts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .ux-count{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px}.ux-count b{display:block;font-size:13px}.ux-count small{color:var(--muted)}
    .ux-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px}.ux-row:last-child{border-bottom:0}
    .ux-ok{color:var(--correct)}.ux-ko{color:#e57373}.ux-wait{color:var(--gold)}

    .ux-bracket-head{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;margin:10px 0}
    .ux-bracket-name{font-size:16px;font-weight:800;color:var(--text)}
    .ux-bracket-legend{display:grid;grid-template-columns:1fr;gap:6px;margin-top:10px;font-size:11px;color:var(--muted)}
    .ux-legend-line{display:flex;align-items:center;gap:7px}
    .ux-swatch{width:12px;height:12px;border-radius:3px;display:inline-block;flex:0 0 auto}
    .ux-swatch.good{background:var(--correct)}.ux-swatch.missed{background:var(--gold)}.ux-swatch.out{background:#66706a}

    .ux-tree-scroll{overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch}
    .ux-tree{display:flex;gap:12px;min-width:900px;align-items:stretch}
    .ux-col{width:150px;flex:0 0 150px;display:flex;flex-direction:column}
    .ux-col-title{text-align:center;color:var(--gold);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
    .ux-col-body{display:flex;flex-direction:column;justify-content:space-around;gap:8px;flex:1}
    .ux-match{border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--surface)}
    .ux-team{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 8px;font-size:11px;border-bottom:1px solid var(--border);min-height:31px}
    .ux-team:last-child{border-bottom:0}
    .ux-team.good{background:var(--correct-bg);color:var(--correct);font-weight:800}
    .ux-team.missed{background:rgba(201,168,76,.14);color:var(--gold);font-weight:800}
    .ux-team.out{color:var(--muted);text-decoration:line-through;opacity:.8}
    .ux-team.pending{color:var(--text)}
    .ux-mark{font-weight:900;flex:0 0 auto}
    .ux-champion{border:1px solid var(--gold);border-radius:10px;padding:14px 8px;text-align:center;background:linear-gradient(160deg,rgba(201,168,76,.12),var(--surface))}
    .ux-champion.good{border-color:var(--correct);background:var(--correct-bg);color:var(--correct)}
    .ux-champion.missed{border-color:var(--gold);color:var(--gold)}
    .ux-champion.out{border-color:var(--border);color:var(--muted);text-decoration:line-through}
  `;
  document.head.appendChild(style);

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

  function actualFor(round, index) {
    return round === 'final' ? REAL.champion : REAL[round]?.[index] || null;
  }

  function pickFor(player, round, index) {
    const fp = FINALS_PRONOS[player];
    if (!fp) return null;
    return round === 'final' ? fp.champion : fp[round]?.[index] || null;
  }

  function calendarRefs() {
    const refs = [];
    CAL_R16.forEach((m, i) => refs.push({round:'r16', index:i}));
    CAL_R8.forEach(m => refs.push({round:'r8', index:m.bracket8}));
    CAL_QF.forEach(m => refs.push({round:'qf', index:m.bracketQ}));
    CAL_SF.forEach(m => refs.push({round:'sf', index:m.bracketS}));
    refs.push({round:'final', index:0});
    return refs;
  }

  function showVotes(round, index) {
    const teams = teamsFor(round, index);
    if (!teams[0] || !teams[1]) return;
    const actual = actualFor(round, index);
    const voters = PARTICIPANTS.filter(p => FINALS_PRONOS[p]).map(name => ({name, pick:pickFor(name, round, index)}));
    const a = voters.filter(v => v.pick === teams[0]).length;
    const b = voters.filter(v => v.pick === teams[1]).length;

    const modal = document.createElement('div');
    modal.className = 'ux-modal';
    modal.innerHTML = `<div class="ux-sheet">
      <div class="ux-sheet-head"><strong>${withFlag(teams[0])} — ${withFlag(teams[1])}</strong><button class="ux-close">×</button></div>
      <div class="ux-counts">
        <div class="ux-count"><b>${withFlag(teams[0])}</b><small>${a} vote${a>1?'s':''}</small></div>
        <div class="ux-count"><b>${withFlag(teams[1])}</b><small>${b} vote${b>1?'s':''}</small></div>
      </div>
      ${voters.map(v => {
        const cls = actual ? (v.pick === actual ? 'ux-ok' : 'ux-ko') : 'ux-wait';
        const state = actual ? (v.pick === actual ? '✓ correct' : '✗ faux') : '⏳ en attente';
        return `<div class="ux-row"><span>${v.name}</span><span class="${cls}">${v.pick ? withFlag(v.pick) : '—'} · ${state}</span></div>`;
      }).join('')}
    </div>`;
    modal.querySelector('.ux-close').onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }

  function decorateCalendar() {
    const container = document.getElementById('calendrier-content');
    if (!container) return;
    const refs = calendarRefs();
    [...container.querySelectorAll('.cal-match')].forEach((card, i) => {
      const ref = refs[i];
      if (!ref || card.querySelector('.ux-vote-btn')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ux-vote-btn';
      button.textContent = '👥 Voir les pronostics de ce match';
      button.onclick = e => { e.stopPropagation(); showVotes(ref.round, ref.index); };
      const stack = card.querySelector('.cal-teams-stack');
      if (stack) stack.appendChild(button);
    });
  }

  function teamState(team, pick, actual) {
    if (!team || team === '?') return {cls:'pending', mark:''};
    if (actual) {
      if (team === actual && team === pick) return {cls:'good', mark:'✅'};
      if (team === actual && team !== pick) return {cls:'missed', mark:'❎'};
      return {cls:'out', mark:''};
    }
    if (ELIMINATED.has(team)) return {cls:'out', mark:''};
    return {cls:'pending', mark:team === pick ? '•' : ''};
  }

  function matchHtml(teamA, teamB, pick, actual) {
    function row(team) {
      const state = teamState(team, pick, actual);
      return `<div class="ux-team ${state.cls}"><span>${team ? withFlag(team) : 'À venir'}</span><span class="ux-mark">${state.mark}</span></div>`;
    }
    return `<div class="ux-match">${row(teamA)}${row(teamB)}</div>`;
  }

  function renderPredictionTree(player) {
    const target = document.getElementById('finals-bracket-content');
    const fp = FINALS_PRONOS[player];
    if (!target || !fp) return;

    const m16 = MATCHES_16.map(m => [m[0], m[1]]);
    const m8 = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]].map(([a,b]) => [fp.r16[a], fp.r16[b]]);
    const mQ = [[0,1],[2,3],[4,5],[6,7]].map(([a,b]) => [fp.r8[a], fp.r8[b]]);
    const mS = [[0,1],[2,3]].map(([a,b]) => [fp.qf[a], fp.qf[b]]);
    const mF = [fp.sf[0], fp.sf[1]];

    const cols = [
      {label:'16es', n:16, teams:m16, picks:fp.r16, actual:REAL.r16},
      {label:'8es', n:8, teams:m8, picks:fp.r8, actual:REAL.r8},
      {label:'Quarts', n:4, teams:mQ, picks:fp.qf, actual:REAL.qf},
      {label:'Demis', n:2, teams:mS, picks:fp.sf, actual:REAL.sf},
      {label:'Finale', n:1, teams:[mF], picks:[fp.champion], actual:[REAL.champion]}
    ];

    const champState = teamState(fp.champion, fp.champion, REAL.champion);

    target.innerHTML = `<div class="ux-bracket-head">
      <div class="ux-bracket-name">Pronostic de ${player}</div>
      <div class="ux-bracket-legend">
        <div class="ux-legend-line"><span class="ux-swatch good"></span> Vert ✅ : équipe pariée et qualifiée</div>
        <div class="ux-legend-line"><span class="ux-swatch missed"></span> Jaune ❎ : équipe qualifiée mais non pariée</div>
        <div class="ux-legend-line"><span class="ux-swatch out"></span> Gris rayé : équipe éliminée</div>
      </div>
    </div>
    <div class="ux-tree-scroll"><div class="ux-tree">
      ${cols.map(col => `<div class="ux-col"><div class="ux-col-title">${col.label}</div><div class="ux-col-body">${Array.from({length:col.n},(_,i) => matchHtml(col.teams[i][0], col.teams[i][1], col.picks[i], col.actual[i])).join('')}</div></div>`).join('')}
      <div class="ux-col"><div class="ux-col-title">Champion</div><div class="ux-col-body"><div class="ux-champion ${champState.cls}">🏆<br>${withFlag(fp.champion)} ${champState.mark}</div></div></div>
    </div></div>`;
  }

  const oldShowParticipantBracket = showParticipantBracket;
  showParticipantBracket = function(player) {
    if (!player) return oldShowParticipantBracket(player);
    renderPredictionTree(player);
  };

  goToParticipant = function(player) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('pronos-finales').classList.add('active');
    const nav = [...document.querySelectorAll('.nav-btn')].find(b => b.dataset.section === 'pronos-finales');
    if (nav) nav.classList.add('active');
    const select = document.getElementById('finals-part-select');
    if (select) select.value = player;
    showParticipantBracket(player);
    window.scrollTo(0,0);
  };

  function reorderNav() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const order = ['classement','bracket','calendrier','pronos-finales','pronos-groupes'];
    order.forEach(id => {
      const btn = nav.querySelector(`[data-section="${id}"]`);
      if (btn) nav.appendChild(btn);
    });
  }

  const previousRenderCalendrier = renderCalendrier;
  renderCalendrier = function() {
    previousRenderCalendrier();
    decorateCalendar();
  };

  document.addEventListener('DOMContentLoaded', () => {
    reorderNav();
    renderCalendrier();
  });
})();
