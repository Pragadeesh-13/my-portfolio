(() => {
  'use strict';

  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'theme';
  let preference = null;
  let button;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'dark' || saved === 'light') preference = saved;
  } catch {
    // Theme selection still works when browser storage is unavailable.
  }

  function applyTheme() {
    const theme = preference || (systemTheme.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    if (button) {
      const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = label;
    }
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === 'dark' ? '#10141c' : '#f4f2eb';
  }

  // Run synchronously in the head so the first paint uses the chosen palette.
  applyTheme();
  systemTheme.addEventListener('change', () => {
    if (!preference) applyTheme();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : null;
    applyTheme();
  });

  function createToggle() {
    const header = document.querySelector('.site-header');
    const nav = header && header.querySelector('nav');
    if (!nav) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.innerHTML = '<svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14A8.7 8.7 0 0 1 10 3.5 8.8 8.8 0 1 0 20.5 14Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(storageKey, preference);
      } catch {
        // Retain the explicit choice for this page even if it cannot be saved.
      }
      applyTheme();
    });
    header.insertBefore(button, nav);
    applyTheme();
    showThemeHint();
  }

  function showThemeHint() {
    try {
      if (sessionStorage.getItem('theme-hint-seen')) return;
      sessionStorage.setItem('theme-hint-seen', 'true');
    } catch {
      // A blocked storage API should not prevent the hint from appearing.
    }

    const hint = document.createElement('aside');
    hint.className = 'theme-hint';
    hint.setAttribute('aria-label', 'Appearance tip');
    hint.innerHTML = '<svg class="theme-hint-arrow" viewBox="0 0 48 40" fill="none" aria-hidden="true"><path d="M6 36C30 38 35 22 24 4M17 13l7-9 10 5"/></svg><button class="theme-hint-dismiss" type="button" aria-label="Dismiss appearance tip">&times;</button><p id="theme-hint-text" role="status"></p><button class="theme-hint-action" type="button"></button>';
    const text = hint.querySelector('p');
    const action = hint.querySelector('.theme-hint-action');

    function updateHint() {
      const dark = root.dataset.theme === 'dark';
      text.textContent = dark ? 'Too dim for you?' : 'Too bright for you?';
      action.textContent = `Try ${dark ? 'light' : 'dark'} mode`;
    }

    function positionHint() {
      const rect = button.getBoundingClientRect();
      const width = Math.min(240, window.innerWidth - 32);
      const center = rect.left + rect.width / 2;
      const left = Math.max(16, Math.min(center - width / 2, window.innerWidth - width - 16));
      hint.style.width = `${width}px`;
      hint.style.left = `${left}px`;
      hint.style.top = `${rect.bottom + 38}px`;
      hint.style.setProperty('--arrow-x', `${center - left}px`);
    }

    const dismissTimer = window.setTimeout(dismissHint, 8000);
    function dismissHint() {
      const hadFocus = hint.contains(document.activeElement);
      hint.remove();
      button.removeAttribute('aria-describedby');
      window.clearTimeout(dismissTimer);
      layoutObserver?.disconnect();
      window.removeEventListener('resize', positionHint);
      window.removeEventListener('scroll', dismissHint);
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
      button.removeEventListener('click', dismissHint);
      systemTheme.removeEventListener('change', updateHint);
      if (hadFocus) button.focus();
    }
    function dismissOutside(event) {
      if (!hint.contains(event.target)) dismissHint();
    }
    function dismissOnEscape(event) {
      if (event.key === 'Escape') dismissHint();
    }

    updateHint();
    document.body.appendChild(hint);
    positionHint();
    const layoutObserver = 'ResizeObserver' in window ? new ResizeObserver(positionHint) : null;
    layoutObserver?.observe(document.querySelector('.site-header'));
    layoutObserver?.observe(document.querySelector('.site-header nav'));
    document.fonts?.ready.then(() => { if (hint.isConnected) positionHint(); });
    button.setAttribute('aria-describedby', 'theme-hint-text');
    hint.querySelector('.theme-hint-dismiss').addEventListener('click', dismissHint);
    action.addEventListener('click', () => button.click());
    button.addEventListener('click', dismissHint);
    systemTheme.addEventListener('change', updateHint);
    window.addEventListener('resize', positionHint);
    window.addEventListener('scroll', dismissHint, { passive: true });
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToggle, { once: true });
  } else {
    createToggle();
  }
})();
