/* Catalpronos V3 — couche de compatibilité et persistance */
(() => {
  'use strict';

  const VERSION = '3.0.0';
  const STORAGE_KEY = 'catalpronos-results-v3';

  function cloneResults(source) {
    return {
      r16: Array.isArray(source?.r16) ? [...source.r16] : Array(16).fill(null),
      r8: Array.isArray(source?.r8) ? [...source.r8] : Array(8).fill(null),
      qf: Array.isArray(source?.qf) ? [...source.qf] : Array(4).fill(null),
      sf: Array.isArray(source?.sf) ? [...source.sf] : Array(2).fill(null),
      champion: source?.champion || null
    };
  }

  function savePersistentResults() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: VERSION,
        updatedAt: new Date().toISOString(),
        results: cloneResults(REAL)
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
      REAL.r16.splice(0, REAL.r16.length, ...saved.r16);
      REAL.r8.splice(0, REAL.r8.length, ...saved.r8);
      REAL.qf.splice(0, REAL.qf.length, ...saved.qf);
      REAL.sf.splice(0, REAL.sf.length, ...saved.sf);
      REAL.champion = saved.champion;
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

  function downloadBackup() {
    const payload = {
      app: 'Les Catalpronos',
      version: VERSION,
      exportedAt: new Date().toISOString(),
      results: cloneResults(REAL)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalpronos-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetPersistentResults() {
    if (!confirm('Effacer la sauvegarde locale des résultats et revenir aux données publiées ?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function addV3AdminTools() {
    const screen = document.getElementById('adminScreen');
    if (!screen || document.getElementById('v3AdminTools')) return;

    const tools = document.createElement('div');
    tools.id = 'v3AdminTools';
    tools.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px';
    tools.innerHTML = `
      <button type="button" class="team-btn" id="v3BackupBtn">⬇️ Sauvegarder</button>
      <button type="button" class="team-btn reset-btn" id="v3ResetBtn" style="width:auto;flex:auto">↺ Réinitialiser</button>
    `;
    screen.appendChild(tools);
    document.getElementById('v3BackupBtn').addEventListener('click', downloadBackup);
    document.getElementById('v3ResetBtn').addEventListener('click', resetPersistentResults);
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

  if (typeof saveResults === 'function') {
    const originalSaveResults = saveResults;
    saveResults = function saveResultsV3() {
      originalSaveResults();
      savePersistentResults();
      refreshAll();
    };
  }

  window.CatalpronosV3 = Object.freeze({
    version: VERSION,
    save: savePersistentResults,
    backup: downloadBackup,
    reset: resetPersistentResults,
    refresh: refreshAll
  });

  document.addEventListener('DOMContentLoaded', () => {
    addVersionBadge();
    addV3AdminTools();
    if (restored) refreshAll();
  });
})();
