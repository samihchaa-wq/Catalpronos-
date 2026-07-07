/* Catalpronos — brackets joueurs figés + mode admin intégré */
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .fb-replacement{display:block;margin-top:3px;font-size:10px;color:var(--gold);text-decoration:none;font-weight:800;white-space:normal}
    .fb-replacement::before{content:'Qualifié réel : ';color:var(--muted);font-weight:600}
    .fb-admin-btn{flex:0 0 auto;padding:12px 16px;background:none;border:0;color:var(--gold);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;cursor:pointer;border-bottom:2px solid transparent}
    .fb-admin-btn:hover{border-bottom-color:var(--gold)}
    .fb-admin-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10050;display:flex;align-items:flex-end;justify-content:center}
    .fb-admin-panel{width:min(100%,620px);max-height:92vh;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:18px 18px 0 0;padding:16px}
    .fb-admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .fb-admin-head h2{margin:0;color:var(--gold);font-size:20px}
    .fb-admin-close{width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:20px}
    .fb-admin-card{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px}
    .fb-admin-card label{display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:10px 0 5px}
    .fb-admin-card select,.fb-admin-card input,.fb-admin-card textarea{width:100%;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:11px;font-size:15px}
    .fb-admin-card textarea{min-height:190px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}
    .fb-admin-action{width:100%;margin-top:10px;padding:11px;border-radius:9px;border:0;background:var(--green-light);color:white;font-weight:800}
    .fb-admin-action.secondary{background:var(--surface);border:1px solid var(--border);color:var(--text)}
    .fb-admin-note{font-size:12px;color:var(--muted);line-height:1.5}
    .fb-admin-success{color:var(--correct);font-weight:800;margin-bottom:6px}
    .ux-team.fb-neutral{color:var(--text);background:var(--surface)}
    .ux-team.fb-picked{color:var(--gold);background:rgba(201,168,76,.08);font-weight:800}
  `;
  document.head.appendChild(style);

  function teamRow(team, pick, actual) {
    if (!team) return `<div class="ux-team fb-neutral"><span>À venir</span><span></span></div>`;

    const isPick = team === pick;
    const isEliminated = ELIMINATED.has(team);

    if (isPick && actual) {
      if (pick === actual) {
        return `<div class="ux-team good"><span>${withFlag(team)}</span><span class="ux-mark">✅</span></div>`;
      }
      return `<div class="ux-team out"><span>${withFlag(team)}<span class="fb-replacement">${withFlag(actual)}</span></span><span></span></div>`;
    }

    if (isPick && !actual) {
      if (isEliminated) return `<div class="ux-team out"><span>${withFlag(team)}</span><span></span></div>`;
      return `<div class="ux-team fb-picked"><span>${withFlag(team)}</span><span class="ux-mark">•</span></div>`;
    }

    if (isEliminated) return `<div class="ux-team out"><span>${withFlag(team)}</span><span></span></div>`;
    return `<div class="ux-team fb-neutral"><span>${withFlag(team)}</span><span></span></div>`;
  }

  function matchCard(teams, pick, actual) {
    return `<div class="ux-match">${teamRow(teams[0], pick, actual)}${teamRow(teams[1], pick, actual)}</div>`;
  }

  function renderTree(player) {
    const target = document.getElementById('finals-bracket-content');
    const fp = FINALS_PRONOS[player];
    if (!target || !fp) return;

    const rounds = [
      {
        label:'16es',
        teams:MATCHES_16.map(m => [m[0], m[1]]),
        picks:fp.r16,
        actual:REAL.r16
      },
      {
        label:'8es',
        teams:[[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]].map(([a,b]) => [fp.r16[a], fp.r16[b]]),
        picks:fp.r8,
        actual:REAL.r8
      },
      {
        label:'Quarts',
        teams:[[0,1],[2,3],[4,5],[6,7]].map(([a,b]) => [fp.r8[a], fp.r8[b]]),
        picks:fp.qf,
        actual:REAL.qf
      },
      {
        label:'Demis',
        teams:[[0,1],[2,3]].map(([a,b]) => [fp.qf[a], fp.qf[b]]),
        picks:fp.sf,
        actual:REAL.sf
      },
      {
        label:'Finale',
        teams:[[fp.sf[0], fp.sf[1]]],
        picks:[fp.champion],
        actual:[REAL.champion]
      }
    ];

    let championClass = 'fb-picked';
    let championMark = '•';
    let championReplacement = '';
    if (REAL.champion) {
      if (fp.champion === REAL.champion) {
        championClass = 'good';
        championMark = '✅';
      } else {
        championClass = 'out';
        championMark = '';
        championReplacement = `<span class="fb-replacement">${withFlag(REAL.champion)}</span>`;
      }
    } else if (ELIMINATED.has(fp.champion)) {
      championClass = 'out';
      championMark = '';
    }

    target.innerHTML = `<div class="ux-bracket-head">
      <div class="ux-bracket-name">Pronostic de ${player}</div>
      <div class="ux-bracket-legend">
        <div class="ux-legend-line"><span class="ux-swatch good"></span> Vert ✅ : bon pronostic</div>
        <div class="ux-legend-line"><span class="ux-swatch out"></span> Gris rayé : pronostic éliminé</div>
        <div class="ux-legend-line"><span class="ux-swatch missed"></span> Sous le choix rayé : qualifié réel</div>
      </div>
    </div>
    <div class="ux-tree-scroll"><div class="ux-tree">
      ${rounds.map(round => `<div class="ux-col"><div class="ux-col-title">${round.label}</div><div class="ux-col-body">${round.teams.map((teams,i) => matchCard(teams, round.picks[i], round.actual[i])).join('')}</div></div>`).join('')}
      <div class="ux-col"><div class="ux-col-title">Champion</div><div class="ux-col-body"><div class="ux-champion ${championClass}">🏆<br>${withFlag(fp.champion)} ${championMark}${championReplacement}</div></div></div>
    </div></div>`;
  }

  const previous = window.showParticipantBracket;
  window.showParticipantBracket = function(player) {
    if (!player && previous) return previous(player);
    renderTree(player);
  };

  async function openAdmin() {
    let current = {updatedAt:null,r8:{},qf:{},sf:{},final:{}};
    try {
      const response = await fetch('./results.json?t=' + Date.now(), {cache:'no-store'});
      if (response.ok) current = await response.json();
    } catch (error) { console.warn(error); }
    current.r8 = current.r8 || {};
    current.qf = current.qf || {};
    current.sf = current.sf || {};
    current.final = current.final || {};

    const remaining = [
      {index:6, teamA:'Argentine', teamB:'Égypte'},
      {index:7, teamA:'Suisse', teamB:'Colombie'}
    ].filter(m => !current.r8[String(m.index)]);

    const overlay = document.createElement('div');
    overlay.className = 'fb-admin-overlay';
    overlay.innerHTML = `<div class="fb-admin-panel">
      <div class="fb-admin-head"><h2>⚙️ Mode administrateur</h2><button class="fb-admin-close">×</button></div>
      <div class="fb-admin-card">
        <div class="fb-admin-note">Saisis le résultat ici. L'application prépare automatiquement la mise à jour publique.</div>
        <label>Match restant</label>
        <select id="fbAdminMatch">${remaining.length ? remaining.map((m,i) => `<option value="${i}">${m.teamA} — ${m.teamB}</option>`).join('') : '<option>Aucun match restant</option>'}</select>
        <label>Score</label>
        <input id="fbAdminScore" inputmode="numeric" placeholder="Exemple : 2-1" ${remaining.length ? '' : 'disabled'}>
        <button id="fbAdminPrepare" class="fb-admin-action" ${remaining.length ? '' : 'disabled'}>Préparer la mise à jour</button>
      </div>
      <div id="fbAdminResult" class="fb-admin-card" hidden>
        <div class="fb-admin-success">Résultat prêt à publier</div>
        <div class="fb-admin-note">Copie le fichier, puis valide-le dans GitHub.</div>
        <textarea id="fbAdminJson" readonly></textarea>
        <button id="fbAdminCopy" class="fb-admin-action">Copier le fichier</button>
        <button id="fbAdminGithub" class="fb-admin-action secondary">Publier sur GitHub</button>
      </div>
    </div>`;

    overlay.querySelector('.fb-admin-close').onclick = () => overlay.remove();
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);

    overlay.querySelector('#fbAdminPrepare')?.addEventListener('click', () => {
      const match = remaining[Number(overlay.querySelector('#fbAdminMatch').value)];
      const score = overlay.querySelector('#fbAdminScore').value.trim();
      const parsed = score.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (!match || !parsed) return alert('Entre un score comme 2-1.');
      const a = Number(parsed[1]);
      const b = Number(parsed[2]);
      if (a === b) return alert('Indique un score final avec un vainqueur.');
      current.updatedAt = new Date().toISOString();
      current.r8[String(match.index)] = {teamA:match.teamA,teamB:match.teamB,score,winner:a>b?match.teamA:match.teamB};
      overlay.querySelector('#fbAdminJson').value = JSON.stringify(current, null, 2);
      overlay.querySelector('#fbAdminResult').hidden = false;
    });

    overlay.querySelector('#fbAdminCopy')?.addEventListener('click', async e => {
      await navigator.clipboard.writeText(overlay.querySelector('#fbAdminJson').value);
      e.currentTarget.textContent = '✓ Fichier copié';
    });

    overlay.querySelector('#fbAdminGithub')?.addEventListener('click', () => {
      window.open('https://github.com/samihchaa-wq/Catalpronos-/edit/main/results.json', '_blank', 'noopener');
    });
  }

  function addAdminAccess() {
    const nav = document.querySelector('nav');
    if (!nav || nav.querySelector('.fb-admin-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fb-admin-btn';
    button.textContent = '⚙️ Admin';
    button.onclick = openAdmin;
    nav.appendChild(button);
  }

  document.addEventListener('DOMContentLoaded', addAdminAccess);
  setTimeout(addAdminAccess, 300);
})();
