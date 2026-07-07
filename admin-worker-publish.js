/* Catalpronos — admin direct via Cloudflare Worker */
(() => {
  'use strict';

  const WORKER_URL = 'https://catalpronos-admin.samihchaa.workers.dev';
  const PIN_KEY = 'catalpronos_admin_pin';

  const style = document.createElement('style');
  style.textContent = `
    .cw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:20000;display:flex;align-items:flex-end;justify-content:center}
    .cw-panel{width:min(100%,620px);max-height:92vh;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:18px 18px 0 0;padding:16px}
    .cw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.cw-head h2{margin:0;color:var(--gold);font-size:20px}.cw-close{width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:20px}
    .cw-card{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px}.cw-card label{display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:10px 0 5px}.cw-card select,.cw-card input{width:100%;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:11px;font-size:15px}.cw-action{width:100%;margin-top:10px;padding:12px;border-radius:9px;border:0;background:var(--green-light);color:white;font-weight:900}.cw-status{margin-top:10px;font-size:12px;line-height:1.45;color:var(--muted)}.cw-ok{color:var(--correct);font-weight:800}.cw-error{color:#ef7777;font-weight:800}
  `;
  document.head.appendChild(style);

  const R8 = [
    ['Paraguay','France'],['Canada','Maroc'],['Portugal','Espagne'],['États-Unis','Belgique'],
    ['Brésil','Norvège'],['Mexique','Angleterre'],['Argentine','Égypte'],['Suisse','Colombie']
  ];

  function currentWinner(data, round, index) {
    return data[round] && data[round][String(index)] ? data[round][String(index)].winner : null;
  }

  function available(data) {
    const out = [];
    data.r8 = data.r8 || {}; data.qf = data.qf || {}; data.sf = data.sf || {}; data.final = data.final || {};
    R8.forEach((teams, index) => {
      if (!data.r8[String(index)]) out.push({ round:'r8', index, label:'8e', teamA:teams[0], teamB:teams[1] });
    });
    [[0,1],[2,3],[4,5],[6,7]].forEach(([a,b], index) => {
      const teamA = currentWinner(data, 'r8', a), teamB = currentWinner(data, 'r8', b);
      if (teamA && teamB && !data.qf[String(index)]) out.push({ round:'qf', index, label:'Quart', teamA, teamB });
    });
    [[0,1],[2,3]].forEach(([a,b], index) => {
      const teamA = currentWinner(data, 'qf', a), teamB = currentWinner(data, 'qf', b);
      if (teamA && teamB && !data.sf[String(index)]) out.push({ round:'sf', index, label:'Demi', teamA, teamB });
    });
    const teamA = currentWinner(data, 'sf', 0), teamB = currentWinner(data, 'sf', 1);
    if (teamA && teamB && !data.final.winner) out.push({ round:'final', index:0, label:'Finale', teamA, teamB });
    return out;
  }

  async function openDirectAdmin() {
    let data = { r8:{}, qf:{}, sf:{}, final:{} };
    try {
      const response = await fetch('./results.json?t=' + Date.now(), { cache:'no-store' });
      if (response.ok) data = await response.json();
    } catch {}
    const matches = available(data);
    const overlay = document.createElement('div');
    overlay.className = 'cw-overlay';
    overlay.innerHTML = `<div class="cw-panel">
      <div class="cw-head"><h2>⚙️ Admin Catalpronos</h2><button class="cw-close">×</button></div>
      <div class="cw-card">
        <label>Code admin</label>
        <input id="cwPin" type="password" inputmode="numeric" placeholder="Ton code" value="${localStorage.getItem(PIN_KEY) || ''}">
        <label>Match</label>
        <select id="cwMatch" ${matches.length ? '' : 'disabled'}>${matches.length ? matches.map((m,i)=>`<option value="${i}">${m.label} · ${m.teamA} — ${m.teamB}</option>`).join('') : '<option>Aucun match disponible</option>'}</select>
        <label>Score affiché</label>
        <input id="cwScore" placeholder="Exemple : 1-1 (4-3 tab)" ${matches.length ? '' : 'disabled'}>
        <label>Vainqueur</label>
        <select id="cwWinner" ${matches.length ? '' : 'disabled'}></select>
        <button id="cwPublish" class="cw-action" ${matches.length ? '' : 'disabled'}>Publier pour tout le monde</button>
        <div id="cwStatus" class="cw-status">Publication directe via Cloudflare Worker.</div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.cw-close').onclick = close;
    overlay.onclick = e => { if (e.target === overlay) close(); };

    const matchSelect = overlay.querySelector('#cwMatch');
    const winnerSelect = overlay.querySelector('#cwWinner');
    const refresh = () => {
      const m = matches[Number(matchSelect.value)];
      winnerSelect.innerHTML = m ? `<option value="${m.teamA}">${m.teamA}</option><option value="${m.teamB}">${m.teamB}</option>` : '';
    };
    matchSelect?.addEventListener('change', refresh);
    refresh();

    overlay.querySelector('#cwPublish')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const m = matches[Number(matchSelect.value)];
      const score = overlay.querySelector('#cwScore').value.trim();
      const pin = overlay.querySelector('#cwPin').value.trim();
      const winner = winnerSelect.value;
      const status = overlay.querySelector('#cwStatus');
      if (!m || !score || !winner) return alert('Complète le match, le score et le vainqueur.');
      if (pin) localStorage.setItem(PIN_KEY, pin);
      button.disabled = true;
      button.textContent = 'Publication…';
      status.className = 'cw-status';
      status.textContent = 'Envoi vers GitHub…';
      try {
        const response = await fetch(WORKER_URL, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'X-Admin-Pin':pin },
          body:JSON.stringify({ round:m.round, index:m.index, teamA:m.teamA, teamB:m.teamB, score, winner })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'Publication refusée');
        status.className = 'cw-status cw-ok';
        status.textContent = '✓ Publié. Le site GitHub Pages va se redéployer automatiquement.';
        button.textContent = '✓ Publié';
        setTimeout(() => location.reload(), 5000);
      } catch (error) {
        status.className = 'cw-status cw-error';
        status.textContent = 'Erreur : ' + error.message;
        button.disabled = false;
        button.textContent = 'Publier pour tout le monde';
      }
    });
  }

  function installButton() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const old = nav.querySelector('.fb-admin-btn');
    if (old) old.remove();
    if (nav.querySelector('.cw-admin-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn cw-admin-btn';
    btn.textContent = '⚙️ Admin';
    btn.onclick = openDirectAdmin;
    nav.appendChild(btn);
  }

  document.addEventListener('DOMContentLoaded', installButton);
  setTimeout(installButton, 500);
  new MutationObserver(installButton).observe(document.documentElement, { childList:true, subtree:true });
})();
