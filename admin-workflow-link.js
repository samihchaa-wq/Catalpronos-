/* Catalpronos — publication sécurisée via GitHub Actions */
(() => {
  'use strict';

  const WORKFLOW_URL = 'https://github.com/samihchaa-wq/Catalpronos-/actions/workflows/update-result.yml';

  function enhanceAdmin() {
    const button = document.getElementById('fbAdminGithub');
    if (!button || button.dataset.workflowReady === '1') return;

    button.dataset.workflowReady = '1';
    button.textContent = 'Publier avec GitHub Actions';
    button.onclick = () => window.open(WORKFLOW_URL, '_blank', 'noopener');

    const card = button.closest('.fb-admin-card');
    const note = card && card.querySelector('.fb-admin-note');
    if (note) {
      note.textContent = 'Copie les informations préparées, puis ouvre le formulaire sécurisé GitHub Actions. Une fois lancé, le résultat est enregistré et l’application est redéployée automatiquement.';
    }
  }

  const observer = new MutationObserver(enhanceAdmin);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  document.addEventListener('DOMContentLoaded', enhanceAdmin);
  setTimeout(enhanceAdmin, 500);
})();
