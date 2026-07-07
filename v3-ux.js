/* Catalpronos V3.2 — lisibilité du bracket et détail des votes */
(() => {
  'use strict';

  const css = document.createElement('style');
  css.textContent = `
    .ux-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:12px}
    .ux-legend{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;color:var(--muted)}
    .ux-legend span{display:flex;align-items:center;gap:6px}
    .ux-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:0 0 auto}
    .ux-dot.real{background:var(--correct)}.ux-dot.pick{background:var(--gold)}.ux-dot.lost{background:#e57373}.ux-dot.wait{background:var(--muted)}
    .ux-select{width:100%;margin-top:10px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:10px;font-size:13px}
    .ux-title{font-size:12px;font-weight:800;color:var(--gold);margin-bottom:8px;text-transform:uppercase;letter-spacing:.07em}
    .ux-vote-hint{font-size:10px;color:var(--muted);margin-top:5px}
    .ux-modal{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;display:grid;align-items:end}
    .ux-sheet{background:var(--surface);border-radius:18px 18px 0 0;padding:16px;max-height:82vh;overflow:auto;border-top:1px solid var(--border)}
    .ux-sheet-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
    .ux-sheet-head strong{font-size:16px;color:var(--text)}
    .ux-close{border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:999px;width:34px;height:34px;font-size:18px}
    .ux-vote-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .ux-vote-box{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--surface2)}
    .ux-vote-box b{display:block;font-size:13px;margin-bottom:5px}.ux-vote-box small{color:var(--muted)}
    .ux-voter{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px}
    .ux-voter:last-child{border-bottom:0}.ux-voter .ok{color:var(--correct)}.ux-voter .ko{color:#e57373}.ux-voter .wait{color:var(--gold)}
    .ux-pred-grid{display:grid;grid-template-columns:repeat(5,minmax(135px,1fr));gap:10px;overflow:auto;padding-bottom:6px}
    .ux-pred-col{min-width:135px}.ux-pred-head{font-size:10px;color:var(--gold);font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
    .ux-pred-card{border:1px solid var(--border);border-radius:9px;padding:8px;background:var(--surface);margin-bottom:7px}
    .ux-pred-pick{font-size:12px;font-weight:700;color:var(--gold)}
    .ux-pred-real{font-size:10px;color:var(--muted);margin-top:4px}
    .ux-pred-card.ok{border-color:var(--correct);background:var(--correct-bg)}
    .ux-pred-card.ok .ux-pred-pick{color:var(--correct)}
    .ux-pred-card.ko{border-color:var(--wrong);background:var(--wrong-bg)}
    .ux-pred-card.ko .ux-pred-pick{color:#e57373;text-decoration:line-through}
    .ux-pred-card.wait{border-color:var(--gold)}
  `;
  document.head.appendChild(css);

  function roundPick(player, round, index) {
    const sheet = FINALS_PRONOS[player];
    if (!sheet) return null;
    if (round === 'final') return sheet.champion || null;
    return Array.isArray(sheet[round]) ? sheet[round][index] : null;
  }

  function getTeams(round, index) {
    if (round === 'r16') return MATCHES_16[index];
    if (round === 'r8') {
      const p=[[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]][index];
      return [REAL.r16[p[0]], REAL.r16[p[1]]];
    }
    if (round === 'qf') {
      const p=[[0,1],[2,3],[4,5],[6,7]][index];
      return [REAL.r8[p[0]], REAL.r8[p[1]]];
    }
    if (round === 'sf') {
      const p=[[0,1],[2,3]][index];
      return [REAL.qf[p[0]], REAL.qf[p[1]]];
    }
    return [REAL.sf[0], REAL.sf[1]];
  }

  function realWinner(round, index) {
    if (round === 'final') return REAL.champion;
    return REAL[round]?.[index] || null;
  }

  function scoreMap() {
    const out=[];
    CAL_R16.forEach((m,i)=>out.push({round:'r16',index:i}));
    CAL_R8.forEach(m=>out.push({round:'r8',index:m.bracket8}));
    CAL_QF.forEach(m=>out.push({round:'qf',index:m.bracketQ}));
    CAL_SF.forEach(m=>out.push({round:'sf',index:m.bracketS}));
    out.push({round:'final',index:0});
    return out;
  }

  function showVotes(round, index) {
    const teams = getTeams(round,index);
    if (!teams[0] || !teams[1]) return;
    const winner = realWinner(round,index);
    const voters = PARTICIPANTS.filter(p => FINALS_PRONOS[p]).map(p => ({
      name:p,
      pick:roundPick(p,round,index),
      excluded:((LATE_EXCLUSIONS[p]||{})[round]||[]).includes(index)
    }));
    const a=voters.filter(v=>v.pick===teams[0]);
    const b=voters.filter(v=>v.pick===teams[1]);
    const other=voters.filter(v=>v.pick!==teams[0]&&v.pick!==teams[1]);

    const modal=document.createElement('div');
    modal.className='ux-modal';
    modal.innerHTML=`<div class="ux-sheet">
      <div class="ux-sheet-head"><strong>${withFlag(teams[0])} — ${withFlag(teams[1])}</strong><button class="ux-close">×</button></div>
      <div class="ux-vote-summary">
        <div class="ux-vote-box"><b>${withFlag(teams[0])}</b><small>${a.length} vote${a.length>1?'s':''}</small></div>
        <div class="ux-vote-box"><b>${withFlag(teams[1])}</b><small>${b.length} vote${b.length>1?'s':''}</small></div>
      </div>
      <div class="ux-title">Qui a pronostiqué quoi</div>
      ${voters.map(v=>{
        const state=v.excluded?'🕐 non compté':winner?(v.pick===winner?'✓ correct':'✗ faux'):'⏳ en attente';
        const cls=v.excluded?'wait':winner?(v.pick===winner?'ok':'ko'):'wait';
        return `<div class="ux-voter"><span>${v.name}</span><span class="${cls}">${v.pick?withFlag(v.pick):'—'} · ${state}</span></div>`;
      }).join('')}
      ${other.length?`<div class="ux-vote-hint">${other.length} fiche(s) ne correspondent pas directement aux deux équipes réellement arrivées à ce tour.</div>`:''}
    </div>`;
    modal.querySelector('.ux-close').onclick=()=>modal.remove();
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    document.body.appendChild(modal);
  }

  function decorateCalendarVotes() {
    const container=document.getElementById('calendrier-content');
    if(!container) return;
    const refs=scoreMap();
    const cards=[...container.querySelectorAll('.cal-match')];
    cards.forEach((card,pos)=>{
      const ref=refs[pos]; if(!ref) return;
      card.style.cursor='pointer';
      card.title='Voir les pronostics de ce match';
      const old=card.onclick;
      card.onclick=e=>{
        if(e.target.closest('button')) return;
        e.stopPropagation();
        showVotes(ref.round,ref.index);
      };
      const hint=document.createElement('div');
      hint.className='ux-vote-hint';
      hint.textContent='👥 Voir les pronostics';
      const stack=card.querySelector('.cal-teams-stack');
      if(stack) stack.appendChild(hint);
    });
  }

  function predictionStatus(pick, actual) {
    if (!pick) return 'wait';
    if (actual) return pick===actual?'ok':'ko';
    return ELIMINATED.has(pick)?'ko':'wait';
  }

  function renderPredictionComparison(player) {
    const target=document.getElementById('bracket-content');
    const fp=FINALS_PRONOS[player];
    if(!fp){target.innerHTML='<div class="ux-panel">Fiche non reçue.</div>';return;}
    const cols=[
      ['16es','r16',16],['8es','r8',8],['Quarts','qf',4],['Demis','sf',2],['Champion','final',1]
    ];
    target.innerHTML=`<div class="ux-panel"><div class="ux-title">Pronostic de ${player}</div>
      <div class="ux-legend"><span><i class="ux-dot real"></i>Correct</span><span><i class="ux-dot lost"></i>Éliminé / faux</span><span><i class="ux-dot pick"></i>Encore possible</span><span><i class="ux-dot wait"></i>Résultat à venir</span></div></div>
      <div class="ux-pred-grid">${cols.map(([label,key,n])=>`<div class="ux-pred-col"><div class="ux-pred-head">${label}</div>${Array.from({length:n},(_,i)=>{
        const pick=key==='final'?fp.champion:fp[key]?.[i];
        const actual=key==='final'?REAL.champion:REAL[key]?.[i];
        const st=predictionStatus(pick,actual);
        return `<div class="ux-pred-card ${st}"><div class="ux-pred-pick">${pick?withFlag(pick):'—'}</div><div class="ux-pred-real">${actual?'Réel : '+withFlag(actual):st==='ko'?'Équipe déjà éliminée':'Résultat à venir'}</div></div>`;
      }).join('')}</div>`).join('')}</div>`;
  }

  const originalRenderBracket=renderBracket;
  renderBracket=function renderBracketUX(){
    originalRenderBracket();
    const target=document.getElementById('bracket-content');
    if(!target) return;
    const panel=document.createElement('div');
    panel.className='ux-panel';
    panel.innerHTML=`<div class="ux-title">Lecture du bracket</div>
      <div class="ux-legend"><span><i class="ux-dot real"></i>Qualifié officiellement</span><span><i class="ux-dot lost"></i>Éliminé</span><span><i class="ux-dot pick"></i>Pronostic encore possible</span><span><i class="ux-dot wait"></i>Match à venir</span></div>
      <select class="ux-select"><option value="">Résultats réels</option>${PARTICIPANTS.filter(p=>FINALS_PRONOS[p]).map(p=>`<option value="${p}">Comparer avec ${p}</option>`).join('')}</select>`;
    target.prepend(panel);
    panel.querySelector('select').onchange=e=>{
      if(e.target.value) renderPredictionComparison(e.target.value);
      else renderBracketUX();
    };
  };

  const previousRenderCalendrier=renderCalendrier;
  renderCalendrier=function renderCalendrierUX(){
    previousRenderCalendrier();
    decorateCalendarVotes();
  };

  document.addEventListener('DOMContentLoaded',()=>{
    renderBracket();
    renderCalendrier();
  });
})();
