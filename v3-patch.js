/* Catalpronos V3 — saisie des scores dans le calendrier */
(() => {
  'use strict';

  const VERSION = '3.1.0';
  const STORAGE_KEY = 'catalpronos-results-v3';
  const ADMIN_SESSION_KEY = 'catalpronos-admin-session';

  const roundSizes = { r16:16, r8:8, qf:4, sf:2 };

  function cloneResults(source) {
    return {
      r16: Array.isArray(source?.r16) ? [...source.r16] : Array(16).fill(null),
      r8: Array.isArray(source?.r8) ? [...source.r8] : Array(8).fill(null),
      qf: Array.isArray(source?.qf) ? [...source.qf] : Array(4).fill(null),
      sf: Array.isArray(source?.sf) ? [...source.sf] : Array(2).fill(null),
      champion: source?.champion || null
    };
  }

  function cloneScores() {
    return {
      r16: CAL_R16.map(m => m.score ?? null),
      r8: [...SCORES.r8],
      qf: [...SCORES.qf],
      sf: [...SCORES.sf],
      final: SCORES.final ?? null
    };
  }

  function savePersistentResults() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: VERSION,
        updatedAt: new Date().toISOString(),
        results: cloneResults(REAL),
        scores: cloneScores()
      }));
      return true;
    } catch (error) {
      console.error('[Catalpronos V3] Sauvegarde impossible', error);
      return false;
    }
  }

  function loadPersistentResults() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.results) return false;

      const saved = cloneResults(parsed.results);
      for (const key of Object.keys(roundSizes)) {
        REAL[key].splice(0, REAL[key].length, ...saved[key]);
      }
      REAL.champion = saved.champion;

      if (parsed.scores) {
        (parsed.scores.r16 || []).forEach((score, i) => {
          if (CAL_R16[i]) CAL_R16[i].score = score;
        });
        for (const key of ['r8','qf','sf']) {
          if (Array.isArray(parsed.scores[key])) {
            SCORES[key].splice(0, SCORES[key].length, ...parsed.scores[key]);
          }
        }
        SCORES.final = parsed.scores.final ?? null;
      }
      return true;
    } catch (error) {
      console.error('[Catalpronos V3] Chargement impossible', error);
      return false;
    }
  }

  function refreshAll() {
    try {
      ELIMINATED = getEliminated();
      renderClassement();
      renderBracket();
      renderCalendrier();
      renderFinales();
    } catch (error) {
      console.error('[Catalpronos V3] Rafraîchissement impossible', error);
    }
  }

  function isAdmin() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  }

  function setAdmin(value) {
    if (value) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  function parseScore(text) {
    const value = String(text || '').trim();
    const main = value.match(/^(\d+)\s*[-–]\s*(\d+)/);
    if (!main) return null;
    const a = Number(main[1]);
    const b = Number(main[2]);
    let winnerSide = a > b ? 0 : b > a ? 1 : null;

    if (winnerSide === null) {
      const penalties = value.match(/\((\d+)\s*[-–]\s*(\d+)\s*(?:tab|t\.a\.b\.?|pen)?\)/i);
      if (penalties) {
        const pa = Number(penalties[1]);
        const pb = Number(penalties[2]);
        winnerSide = pa > pb ? 0 : pb > pa ? 1 : null;
      }
    }

    return { text:value, a, b, winnerSide };
  }

  function getTeams(round, index) {
    if (round === 'r16') return MATCHES_16[index];
    if (round === 'r8') {
      const pairs = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
      const [a,b] = pairs[index];
      return [REAL.r16[a], REAL.r16[b]];
    }
    if (round === 'qf') {
      const pairs = [[0,1],[2,3],[4,5],[6,7]];
      const [a,b] = pairs[index];
      return [REAL.r8[a], REAL.r8[b]];
    }
    if (round === 'sf') {
      const pairs = [[0,1],[2,3]];
      const [a,b] = pairs[index];
      return [REAL.qf[a], REAL.qf[b]];
    }
    return [REAL.sf[0], REAL.sf[1]];
  }

  function getScore(round, index) {
    if (round === 'r16') return CAL_R16[index]?.score || '';
    if (round === 'final') return SCORES.final || '';
    return SCORES[round]?.[index] || '';
  }

  function applyScore(round, index, value) {
    const teams = getTeams(round, index);
    if (!teams[0] || !teams[1]) {
      alert('Les deux équipes de ce match ne sont pas encore connues.');
      return false;
    }

    const parsed = parseScore(value);
    if (!parsed) {
      alert('Entre un score au format 2-1. Pour un nul après prolongation, ajoute les tirs au but : 1-1 (4-3 tab).');
      return false;
    }
    if (parsed.winnerSide === null) {
      alert('Pour un score nul, précise les tirs au but, par exemple : 1-1 (4-3 tab).');
      return false;
    }

    const winner = teams[parsed.winnerSide];
    if (round === 'r16') {
      REAL.r16[index] = winner;
      CAL_R16[index].score = parsed.text;
    } else if (round === 'final') {
      REAL.champion = winner;
      SCORES.final = parsed.text;
    } else {
      REAL[round][index] = winner;
      SCORES[round][index] = parsed.text;
    }

    savePersistentResults();
    refreshAll();
    return true;
  }

  function clearScore(round, index) {
    if (!confirm('Effacer ce résultat ? Les tours suivants dépendants resteront inchangés tant que tu ne les modifies pas.')) return;
    if (round === 'r16') {
      REAL.r16[index] = null;
      CAL_R16[index].score = null;
    } else if (round === 'final') {
      REAL.champion = null;
      SCORES.final = null;
    } else {
      REAL[round][index] = null;
      SCORES[round][index] = null;
    }
    savePersistentResults();
    refreshAll();
  }

  function scoreMap() {
    const list = [];
    CAL_R16.forEach((m, i) => list.push({ round:'r16', index:i }));
    CAL_R8.forEach(m => list.push({ round:'r8', index:m.bracket8 }));
    CAL_QF.forEach(m => list.push({ round:'qf', index:m.bracketQ }));
    CAL_SF.forEach(m => list.push({ round:'sf', index:m.bracketS }));
    list.push({ round:'final', index:0 });
    return list;
  }

  function decorateCalendar() {
    const container = document.getElementById('calendrier-content');
    if (!container || container.dataset.v3Decorated === String(isAdmin())) return;
    container.dataset.v3Decorated = String(isAdmin());

    let toolbar = document.getElementById('calendarAdminToolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'calendarAdminToolbar';
      toolbar.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin:0 0 12px';
      container.prepend(toolbar);
    }

    if (isAdmin()) {
      toolbar.innerHTML = '<button class="team-btn" id="calendarLogoutBtn" style="flex:0 0 auto;padding:7px 10px">🔒 Quitter le mode admin</button>';
      document.getElementById('calendarLogoutBtn').onclick = () => { setAdmin(false); renderCalendrier(); };
    } else {
      toolbar.innerHTML = '<button class="team-btn" id="calendarLoginBtn" style="flex:0 0 auto;padding:7px 10px">⚙️ Mode admin</button>';
      document.getElementById('calendarLoginBtn').onclick = () => {
        const pw = prompt('Mot de passe administrateur');
        if (pw === ADMIN_PW) {
          setAdmin(true);
          renderCalendrier();
        } else if (pw !== null) {
          alert('Mot de passe incorrect.');
        }
      };
    }

    if (!isAdmin()) return;

    const refs = scoreMap();
    const cards = [...container.querySelectorAll('.cal-match')];
    cards.forEach((card, position) => {
      const ref = refs[position];
      if (!ref) return;
      card.style.cursor = 'pointer';
      card.title = 'Toucher pour modifier le score';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'team-btn';
      edit.textContent = '✏️';
      edit.setAttribute('aria-label', 'Modifier le score');
      edit.style.cssText = 'flex:0 0 38px;padding:7px;margin-left:4px';
      const open = event => {
        event?.stopPropagation();
        const teams = getTeams(ref.round, ref.index);
        const current = getScore(ref.round, ref.index);
        const answer = prompt(`${teams[0] || '?'} — ${teams[1] || '?'}\nEntre le score :`, current);
        if (answer === null) return;
        if (answer.trim() === '') clearScore(ref.round, ref.index);
        else applyScore(ref.round, ref.index, answer);
      };
      edit.onclick = open;
      card.onclick = open;
      card.appendChild(edit);
    });
  }

  function downloadBackup() {
    const payload = {
      app:'Les Catalpronos',
      version:VERSION,
      exportedAt:new Date().toISOString(),
      results:cloneResults(REAL),
      scores:cloneScores()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalpronos-sauvegarde-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetPersistentResults() {
    if (!confirm('Effacer la sauvegarde locale et revenir aux résultats publiés ?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function addVersionBadge() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('v3Badge')) return;
    const badge = document.createElement('div');
    badge.id = 'v3Badge';
    badge.textContent = `V${VERSION}`;
    badge.style.cssText = 'position:absolute;top:10px;right:10px;border:1px solid var(--border);background:rgba(10,15,13,.75);color:var(--muted);border-radius:999px;padding:2px 7px;font-size:9px;letter-spacing:.08em';
    header.appendChild(badge);
  }

  const restored = loadPersistentResults();
  const originalRenderCalendrier = renderCalendrier;
  renderCalendrier = function renderCalendrierV3() {
    originalRenderCalendrier();
    decorateCalendar();
  };

  const legacyAdminButton = document.querySelector('.admin-btn-float');
  if (legacyAdminButton) legacyAdminButton.style.display = 'none';

  window.CatalpronosV3 = Object.freeze({
    version:VERSION,
    save:savePersistentResults,
    backup:downloadBackup,
    reset:resetPersistentResults,
    refresh:refreshAll
  });

  document.addEventListener('DOMContentLoaded', () => {
    addVersionBadge();
    refreshAll();
  });

  if (restored) refreshAll();
})();
