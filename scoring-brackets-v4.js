/* Catalpronos V4 — score par équipe qualifiée, indépendamment de l'adversaire */
(() => {
  'use strict';

  const SCORING = Object.freeze({
    groupsPosition: 2,
    groupsQualified: 1,
    thirdQualified: 2,
    thirdQualifiedElsewhere: 1,
    r16: 2,
    r8: 4,
    qf: 6,
    sf: 10,
    champion: 0
  });

  const ROUND_CONFIG = [
    { key: 'r16', label: 'Vainqueurs des 16es', short: '16es', points: SCORING.r16, max: 16 },
    { key: 'r8', label: 'Qualifiés en quarts', short: 'Quarts', points: SCORING.r8, max: 8 },
    { key: 'qf', label: 'Qualifiés en demi-finales', short: 'Demis', points: SCORING.qf, max: 4 },
    { key: 'sf', label: 'Qualifiés en finale', short: 'Finale', points: SCORING.sf, max: 2 }
  ];

  const MAX_GROUPS = 64;
  const MAX_FINALS = ROUND_CONFIG.reduce((sum, round) => sum + round.points * round.max, 0);
  const MAX_TOTAL = MAX_GROUPS + MAX_FINALS;

  function normalizedTeamSet(teams) {
    return new Set((teams || []).filter(Boolean));
  }

  function isCorrectRoundPick(team, realTeams) {
    return Boolean(team) && normalizedTeamSet(realTeams).has(team);
  }

  function injectStyles() {
    if (document.getElementById('catalpronos-v4-styles')) return;
    const style = document.createElement('style');
    style.id = 'catalpronos-v4-styles';
    style.textContent = `
      .v4-rules-intro{padding:14px 16px;margin:0 0 12px;background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(45,155,90,.08));border:1px solid rgba(201,168,76,.45);border-radius:10px}
      .v4-rules-intro strong{display:block;color:var(--gold);font-size:16px;margin-bottom:3px}.v4-rules-intro span{color:var(--muted);font-size:12px}
      .v4-score-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:16px}
      .v4-score-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px}
      .v4-score-card.highlight{border-color:var(--gold);background:linear-gradient(155deg,rgba(201,168,76,.10),var(--surface))}
      .v4-score-value{font-family:'Arial Narrow',sans-serif;font-size:28px;font-weight:800;color:var(--gold);line-height:1}
      .v4-score-title{font-size:12px;font-weight:700;margin-top:5px}.v4-score-note{font-size:10px;color:var(--muted);margin-top:2px}
      .v4-total-line{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-bottom:18px;border-radius:9px;background:var(--surface2);border:1px solid var(--border)}
      .v4-total-line strong{color:var(--gold);font-size:18px}.v4-total-line span{font-size:12px;color:var(--muted)}
      .v4-person-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px;margin-bottom:10px;background:linear-gradient(135deg,var(--surface2),var(--surface));border:1px solid var(--border);border-radius:10px}
      .v4-person-name{font-size:17px;font-weight:800}.v4-person-score{font-size:25px;font-weight:800;color:var(--gold);white-space:nowrap}.v4-person-score small{font-size:11px;color:var(--muted);font-weight:500}
      .v4-progress{height:7px;background:var(--border);border-radius:99px;overflow:hidden;margin:0 0 16px}.v4-progress>div{height:100%;background:linear-gradient(90deg,var(--green),var(--gold));border-radius:99px}
      .v4-round{margin-bottom:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}
      .v4-round-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;background:var(--surface2);border-bottom:1px solid var(--border)}
      .v4-round-title{font-size:13px;font-weight:800}.v4-round-meta{font-size:11px;color:var(--muted);text-align:right}.v4-round-points{color:var(--gold);font-weight:800}
      .v4-picks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--border)}
      .v4-pick{display:flex;align-items:center;gap:8px;min-width:0;padding:9px 10px;background:var(--surface)}
      .v4-pick-status{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;font-size:11px;font-weight:900;flex:0 0 auto}
      .v4-pick.ok .v4-pick-status{background:var(--correct-bg);color:var(--correct);border:1px solid var(--correct)}
      .v4-pick.ko .v4-pick-status{background:var(--wrong-bg);color:#e57373;border:1px solid var(--wrong)}
      .v4-pick.pending .v4-pick-status{background:var(--partial-bg);color:var(--partial);border:1px solid var(--partial)}
      .v4-pick.excluded .v4-pick-status{background:var(--surface2);color:var(--muted);border:1px solid var(--border)}
      .v4-pick-team{font-size:12px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v4-pick-sub{font-size:9px;color:var(--muted)}
      .v4-legend{font-size:10px;color:var(--muted);line-height:1.6;margin-top:10px}
      @media(max-width:560px){.v4-score-grid,.v4-picks{grid-template-columns:1fr}.v4-person-head{align-items:flex-start}.v4-round-head{align-items:flex-start}}
    `;
    document.head.appendChild(style);
  }

  window.computeFinalsScore = function computeFinalsScoreV4(participant) {
    const prediction = FINALS_PRONOS[participant];
    if (!prediction) return 0;
    const exclusions = LATE_EXCLUSIONS[participant] || {};
    let score = 0;

    ROUND_CONFIG.forEach(round => {
      const realTeams = REAL[round.key] || [];
      const picks = prediction[round.key] || [];
      const excluded = exclusions[round.key] || [];

      picks.forEach((team, index) => {
        if (excluded.includes(index)) return;
        if (isCorrectRoundPick(team, realTeams)) score += round.points;
      });
    });

    return score;
  };

  function renderBaremeV4() {
    const bareme = document.querySelector('.bareme');
    if (!bareme) return;
    const parent = bareme.parentElement;
    if (!parent) return;

    parent.querySelector('.v4-rules-intro')?.remove();
    parent.querySelector('.v4-total-line')?.remove();

    const intro = document.createElement('div');
    intro.className = 'v4-rules-intro';
    intro.innerHTML = '<strong>Le bon qualifié compte, quel que soit son adversaire</strong><span>Le placement exact dans le tableau et l’adversaire pronostiqué ne changent jamais les points.</span>';
    parent.insertBefore(intro, bareme);

    bareme.className = 'v4-score-grid';
    bareme.innerHTML = `
      <div class="v4-score-card"><div class="v4-score-value">2</div><div class="v4-score-title">Bonne position en groupe</div><div class="v4-score-note">1 pt si l’équipe est qualifiée mais mal placée</div></div>
      <div class="v4-score-card"><div class="v4-score-value">2</div><div class="v4-score-title">Bon meilleur 3e</div><div class="v4-score-note">1 pt si l’équipe est qualifiée autrement</div></div>
      <div class="v4-score-card"><div class="v4-score-value">2</div><div class="v4-score-title">Vainqueur en 16es</div><div class="v4-score-note">Adversaire sans importance</div></div>
      <div class="v4-score-card"><div class="v4-score-value">4</div><div class="v4-score-title">Qualifié en quarts</div><div class="v4-score-note">Adversaire sans importance</div></div>
      <div class="v4-score-card"><div class="v4-score-value">6</div><div class="v4-score-title">Qualifié en demi-finales</div><div class="v4-score-note">Adversaire sans importance</div></div>
      <div class="v4-score-card highlight"><div class="v4-score-value">10</div><div class="v4-score-title">Qualifié en finale</div><div class="v4-score-note">Adversaire sans importance</div></div>
    `;

    const total = document.createElement('div');
    total.className = 'v4-total-line';
    total.innerHTML = `<span>Maximum théorique : groupes 64 + phase finale ${MAX_FINALS}</span><strong>${MAX_TOTAL} pts</strong>`;
    bareme.after(total);
  }

  window.renderResultats = function renderResultatsV4() {
    const container = document.getElementById('results-content');
    if (!container) return;
    let html = '';
    ROUND_CONFIG.forEach(round => {
      const real = REAL[round.key] || [];
      html += `<div class="results-section"><div class="round-label">${round.label} — ${round.points} pts par équipe</div><div class="match-grid">`;
      for (let i = 0; i < round.max; i += 1) {
        const winner = real[i];
        html += `<div class="match-card"><div class="match-num">ÉQUIPE ${i + 1}</div>${winner ? `<div class="match-winner">✓ ${withFlag(winner)}</div>` : '<div class="match-pending">En attente…</div>'}</div>`;
      }
      html += '</div></div>';
    });
    container.innerHTML = html;
  };

  function pickState(team, realTeams, isExcluded) {
    if (isExcluded) return { cls: 'excluded', icon: '—', label: 'Non compté' };
    const completed = (realTeams || []).filter(Boolean).length;
    if (isCorrectRoundPick(team, realTeams)) return { cls: 'ok', icon: '✓', label: 'Bon qualifié' };
    if (completed > 0 && typeof ELIMINATED !== 'undefined' && ELIMINATED.has(team)) return { cls: 'ko', icon: '✕', label: 'Éliminé' };
    return { cls: 'pending', icon: '•', label: 'En cours' };
  }

  window.showParticipantBracket = function showParticipantBracketV4(participant) {
    const container = document.getElementById('finals-bracket-content');
    if (!container) return;
    if (!participant) {
      container.innerHTML = '';
      return;
    }
    const prediction = FINALS_PRONOS[participant];
    if (!prediction) {
      container.innerHTML = '<p class="no-prono">Fiche non reçue</p>';
      return;
    }

    const exclusions = LATE_EXCLUSIONS[participant] || {};
    const total = computeFinalsScore(participant);
    const percentage = MAX_FINALS ? Math.round((total / MAX_FINALS) * 100) : 0;
    let html = `
      <div class="v4-person-head"><div><div class="v4-person-name">${participant}</div><div style="font-size:11px;color:var(--muted)">Points par équipe qualifiée, sans tenir compte de l’adversaire</div></div><div class="v4-person-score">${total} <small>/ ${MAX_FINALS} pts</small></div></div>
      <div class="v4-progress"><div style="width:${percentage}%"></div></div>`;

    ROUND_CONFIG.forEach(round => {
      const picks = prediction[round.key] || [];
      const realTeams = REAL[round.key] || [];
      const excluded = exclusions[round.key] || [];
      let correct = 0;

      picks.forEach((team, index) => {
        if (!excluded.includes(index) && isCorrectRoundPick(team, realTeams)) correct += 1;
      });

      const earned = correct * round.points;
      html += `<section class="v4-round"><div class="v4-round-head"><div class="v4-round-title">${round.label}</div><div class="v4-round-meta">${correct}/${round.max} bons · <span class="v4-round-points">${earned} pts</span></div></div><div class="v4-picks">`;
      picks.forEach((team, index) => {
        const state = pickState(team, realTeams, excluded.includes(index));
        html += `<div class="v4-pick ${state.cls}"><div class="v4-pick-status">${state.icon}</div><div style="min-width:0"><div class="v4-pick-team">${withFlag(team)}</div><div class="v4-pick-sub">${state.label}</div></div></div>`;
      });
      html += '</div></section>';
    });

    html += '<div class="v4-legend">✓ Vert : l’équipe a atteint le tour demandé · ✕ Rouge : équipe éliminée · • Orange : encore possible · — Gris : non comptabilisé car fiche reçue trop tard.</div>';
    container.innerHTML = html;
  };

  window.renderFinales = function renderFinalesV4() {
    const container = document.getElementById('finals-content');
    if (!container) return;
    const withSheet = PARTICIPANTS.filter(name => FINALS_PRONOS[name]);
    const withoutSheet = PARTICIPANTS.filter(name => !FINALS_PRONOS[name]);
    let html = '<select class="participant-select" id="finals-part-select" onchange="showParticipantBracket(this.value)"><option value="">— Choisir un participant —</option>';
    withSheet.forEach(name => { html += `<option value="${name}">${name}</option>`; });
    withoutSheet.forEach(name => { html += `<option value="${name}" disabled>${name} (fiche non reçue)</option>`; });
    html += '</select><div id="finals-bracket-content"></div>';
    container.innerHTML = html;
  };

  function refreshV4() {
    injectStyles();
    renderBaremeV4();
    if (typeof renderClassement === 'function') renderClassement();
    if (typeof renderResultats === 'function') renderResultats();
    if (typeof renderFinales === 'function') renderFinales();
  }

  window.CatalpronosScoringV4 = Object.freeze({
    scoring: SCORING,
    maxGroups: MAX_GROUPS,
    maxFinals: MAX_FINALS,
    maxTotal: MAX_TOTAL,
    refresh: refreshV4
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshV4);
  else refreshV4();
})();