/* Catalpronos V5 — bracket individuel simple et compteur fiable */
(() => {
  'use strict';

  const ROUNDS = [
    { key: 'r16', label: 'Vainqueurs des 16es', points: 2, max: 16 },
    { key: 'r8', label: 'Qualifiés en quarts', points: 4, max: 8 },
    { key: 'qf', label: 'Qualifiés en demi-finales', points: 6, max: 4 },
    { key: 'sf', label: 'Qualifiés en finale', points: 10, max: 2 }
  ];

  const style = document.createElement('style');
  style.id = 'simple-player-bracket-v5-styles';
  style.textContent = `
    .spb-wrap{display:grid;gap:12px}
    .spb-head{padding:16px;background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid var(--border);border-radius:14px}
    .spb-head-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .spb-name{font-size:19px;font-weight:900}
    .spb-score{font-size:24px;font-weight:900;color:var(--gold);white-space:nowrap}
    .spb-score small{display:block;font-size:10px;color:var(--muted);font-weight:600;text-align:right}
    .spb-alive{margin-top:13px;padding:12px;border-radius:11px;background:rgba(45,155,90,.10);border:1px solid rgba(45,155,90,.42)}
    .spb-alive-title{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:800}
    .spb-alive-title b{font-size:22px;color:var(--correct)}
    .spb-alive-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
    .spb-alive-team{padding:6px 9px;border-radius:999px;background:var(--surface);border:1px solid var(--border);font-size:11px;font-weight:750}
    .spb-round{background:var(--surface);border:1px solid var(--border);border-radius:13px;overflow:hidden}
    .spb-round-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 13px;background:var(--surface2);border-bottom:1px solid var(--border)}
    .spb-round-title{font-size:13px;font-weight:900}
    .spb-round-score{font-size:11px;color:var(--muted);text-align:right}
    .spb-round-score b{color:var(--gold);font-size:14px}
    .spb-teams{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--border)}
    .spb-team{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px;background:var(--surface);min-width:0}
    .spb-team-name{font-size:12px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .spb-status{flex:0 0 auto;font-size:10px;font-weight:900;padding:4px 7px;border-radius:999px}
    .spb-team.good .spb-status{color:var(--correct);background:var(--correct-bg);border:1px solid var(--correct)}
    .spb-team.out{opacity:.58;text-decoration:line-through}
    .spb-team.out .spb-status{color:#e57373;background:var(--wrong-bg);border:1px solid var(--wrong)}
    .spb-team.pending .spb-status{color:var(--partial);background:var(--partial-bg);border:1px solid var(--partial)}
    .spb-team.excluded .spb-status{color:var(--muted);background:var(--surface2);border:1px solid var(--border)}
    .spb-help{font-size:10px;line-height:1.55;color:var(--muted);padding:2px 3px}
    @media(max-width:560px){.spb-teams{grid-template-columns:1fr}.spb-head-top{align-items:flex-start}}
  `;
  document.head.appendChild(style);

  function realSet(roundKey) {
    return new Set((REAL[roundKey] || []).filter(Boolean));
  }

  function remainingTeams(player) {
    const prediction = FINALS_PRONOS[player];
    if (!prediction) return [];

    // Une "équipe restante" est obligatoirement l'un des quatre demi-finalistes
    // pronostiqués par le joueur et ne doit pas encore être éliminée.
    return [...new Set((prediction.qf || []).filter(Boolean))]
      .filter(team => !ELIMINATED.has(team));
  }

  function teamState(team, roundKey, isExcluded) {
    if (isExcluded) return { cls: 'excluded', label: 'Non compté' };
    if (realSet(roundKey).has(team)) return { cls: 'good', label: 'Correct' };
    if (ELIMINATED.has(team)) return { cls: 'out', label: 'Éliminée' };
    return { cls: 'pending', label: 'En course' };
  }

  function renderSimpleBracket(player) {
    const container = document.getElementById('finals-bracket-content');
    if (!container) return;
    if (!player) {
      container.innerHTML = '';
      return;
    }

    const prediction = FINALS_PRONOS[player];
    if (!prediction) {
      container.innerHTML = '<p class="no-prono">Fiche non reçue</p>';
      return;
    }

    const exclusions = LATE_EXCLUSIONS[player] || {};
    const total = typeof computeFinalsScore === 'function' ? computeFinalsScore(player) : 0;
    const remaining = remainingTeams(player);

    let html = `<div class="spb-wrap">
      <section class="spb-head">
        <div class="spb-head-top">
          <div>
            <div class="spb-name">Pronostic de ${player}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:3px">Une équipe rapporte les points dès qu’elle atteint le tour, quel que soit son adversaire.</div>
          </div>
          <div class="spb-score">${total}<small>points bracket</small></div>
        </div>
        <div class="spb-alive">
          <div class="spb-alive-title"><span>Équipes encore en course parmi ses 4 demi-finalistes</span><b>${remaining.length}</b></div>
          <div class="spb-alive-list">
            ${remaining.length
              ? remaining.map(team => `<span class="spb-alive-team">${withFlag(team)}</span>`).join('')
              : '<span style="font-size:11px;color:var(--muted)">Aucune équipe restante</span>'}
          </div>
        </div>
      </section>`;

    ROUNDS.forEach(round => {
      const picks = prediction[round.key] || [];
      const excluded = exclusions[round.key] || [];
      const correct = picks.filter((team, index) => !excluded.includes(index) && realSet(round.key).has(team)).length;
      const earned = correct * round.points;

      html += `<section class="spb-round">
        <div class="spb-round-head">
          <div class="spb-round-title">${round.label}</div>
          <div class="spb-round-score">${correct}/${round.max} corrects · <b>${earned} pts</b></div>
        </div>
        <div class="spb-teams">`;

      picks.forEach((team, index) => {
        const state = teamState(team, round.key, excluded.includes(index));
        html += `<div class="spb-team ${state.cls}">
          <span class="spb-team-name">${withFlag(team)}</span>
          <span class="spb-status">${state.label}</span>
        </div>`;
      });

      html += '</div></section>';
    });

    html += '<div class="spb-help">Vert = équipe ayant atteint le tour · Orange = équipe toujours en course · Rouge = équipe éliminée · Gris = pronostic non comptabilisé.</div></div>';
    container.innerHTML = html;
  }

  window.showParticipantBracket = renderSimpleBracket;
  window.refreshParticipantBracket = function refreshParticipantBracketV5() {
    const select = document.getElementById('finals-part-select');
    if (select?.value) renderSimpleBracket(select.value);
  };

  window.addEventListener('catalpronos:results-updated', () => {
    const select = document.getElementById('finals-part-select');
    if (select?.value) renderSimpleBracket(select.value);
  });

  window.CatalpronosRemainingTeams = remainingTeams;
})();