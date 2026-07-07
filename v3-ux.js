/* Catalpronos V3.3 — navigation et lisibilité */
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
    .ux-simple{display:grid;gap:12px}
    .ux-round{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px}
    .ux-round h3{margin:0 0 9px;color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
    .ux-pick{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px;border-radius:9px;margin-bottom:6px;background:var(--surface2);border:1px solid var(--border)}
    .ux-pick:last-child{margin-bottom:0}.ux-pick b{font-size:12px}.ux-pick small{font-size:10px;color:var(--muted)}
    .ux-pick.ok{border-color:var(--correct);background:var(--correct-bg)}.ux-pick.ko{border-color:var(--wrong);background:var(--wrong-bg)}.ux-pick.wait{border-color:var(--gold)}
    .ux-pick.ok b{color:var(--correct)}.ux-pick.ko b{color:#e57373;text-decoration:line-through}.ux-pick.wait b{color:var(--gold)}
    .ux-back{width:100%;margin-bottom:10px;padding:10px;border-radius:9px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-weight:700}
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
    CAL_R16.forEach((m, i) => refs.push({round:'r16', index:i, date:m.date, time:m.time}));
    CAL_R8.forEach(m => refs.push({round:'r8', index:m.bracket8, date:m.date, time:m.time}));
    CAL_QF.forEach(m => refs.push({round:'qf', index:m.bracketQ, date:m.date, time:m.time}));
    CAL_SF.forEach(m => refs.push({round:'sf', index:m.bracketS, date:m.date, time:m.time}));
    refs.push({round:'final', index:0, date:CAL_FINAL.date, time:CAL_FINAL.time});
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

  function statusFor(pick, actual) {
    if (!pick) return 'wait';
    if (actual) return pick === actual ? 'ok' : 'ko';
    return ELIMINATED.has(pick) ? 'ko' : 'wait';
  }

  function showSimpleBracket(player) {
    const target = document.getElementById('finals-bracket-content');
    const fp = FINALS_PRONOS[player];
    if (!target || !fp) return;
    const rounds = [['16es','r16',16],['8es','r8',8],['Quarts','qf',4],['Demis','sf',2],['Champion','final',1]];
    target.innerHTML = `<button class="ux-back" onclick="document.getElementById('finals-part-select').value='';document.getElementById('finals-bracket-content').innerHTML=''">← Revenir au choix</button>
      <div class="ux-simple">${rounds.map(([label,key,n]) => `<div class="ux-round"><h3>${label}</h3>${Array.from({length:n},(_,i) => {
        const pick = key === 'final' ? fp.champion : fp[key]?.[i];
        const actual = key === 'final' ? REAL.champion : REAL[key]?.[i];
        const state = statusFor(pick, actual);
        const note = actual ? `Réel : ${withFlag(actual)}` : state === 'ko' ? 'Équipe déjà éliminée' : 'Encore possible';
        return `<div class="ux-pick ${state}"><div><b>${pick ? withFlag(pick) : '—'}</b><small>${note}</small></div><span>${state==='ok'?'✓':state==='ko'?'✗':'⏳'}</span></div>`;
      }).join('')}</div>`).join('')}</div>`;
  }

  const oldShowParticipantBracket = showParticipantBracket;
  showParticipantBracket = function(player) {
    if (!player) return oldShowParticipantBracket(player);
    showSimpleBracket(player);
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
