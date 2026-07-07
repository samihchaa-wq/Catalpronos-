/* Catalpronos — horaires officiels calendrier */
(() => {
  'use strict';

  function applyTimes() {
    if (typeof CAL_R8 !== 'undefined') {
      const suisseColombie = CAL_R8.find(match => match.bracket8 === 7);
      if (suisseColombie) {
        suisseColombie.date = '07.07';
        suisseColombie.time = '22h';
      }
    }

    if (typeof CAL_QF !== 'undefined') {
      const qf0 = CAL_QF.find(match => match.bracketQ === 0);
      const qf1 = CAL_QF.find(match => match.bracketQ === 1);
      const qf2 = CAL_QF.find(match => match.bracketQ === 2);
      if (qf0) { qf0.date = '09.07'; qf0.time = '22h'; }
      if (qf1) { qf1.date = '10.07'; qf1.time = '21h'; }
      if (qf2) { qf2.date = '11.07'; qf2.time = '23h'; }
    }

    if (typeof renderCalendrier === 'function') renderCalendrier();
  }

  window.addEventListener('load', applyTimes);
  document.addEventListener('DOMContentLoaded', applyTimes);
  setTimeout(applyTimes, 300);
})();
