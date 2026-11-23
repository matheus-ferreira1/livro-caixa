// Applies the saved theme before the app renders, so a dark device never flashes the light page.
// A classic script from 'self', because the CSP blocks inline scripts. Keep the key and values in
// sync with src/shared/theme/theme.ts.
/* global localStorage, window, document */
(function () {
  var preference = 'system';
  try {
    var stored = localStorage.getItem('lc-theme');
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch {
    // Storage blocked: follow the system.
  }
  var dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();
