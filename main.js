(() => {
  'use strict';

  document.documentElement.classList.add('js');
  document.getElementById('year').textContent = new Date().getFullYear();

  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('navigation');

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    toggle.querySelector('span').textContent = '+';
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    toggle.querySelector('span').textContent = open ? '-' : '+';
  });

  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(max-width: 720px)').addEventListener('change', closeMenu);

  const links = [...navigation.querySelectorAll('a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const previews = [...document.querySelectorAll('video[data-preview]')].map(video => ({
    video,
    link: video.closest('.preview-watch'),
    visible: false,
    hovered: false,
    focused: false,
    failed: false,
  }));

  function syncPreview(preview) {
    const { video } = preview;
    const limitAutoplay = reducedMotion.matches || navigator.connection?.saveData;
    const shouldPlay = preview.visible && !document.hidden && !preview.hovered
      && !preview.focused && !preview.failed && !limitAutoplay;
    if (!shouldPlay) {
      video.pause();
      return;
    }
    if (!video.hasAttribute('src')) video.src = video.dataset.preview;
    video.muted = true;
    // Keep the static poster if the browser blocks background playback.
    video.play().catch(() => {});
  }

  if ('IntersectionObserver' in window) {
    const previewObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const preview = previews.find(item => item.video === entry.target);
        preview.visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        syncPreview(preview);
      });
    }, { threshold: [0, 0.15] });

    previews.forEach(preview => {
      preview.video.addEventListener('error', () => {
        preview.failed = true;
        preview.video.removeAttribute('src');
        preview.video.load();
      });
      preview.link.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        preview.hovered = true;
        syncPreview(preview);
      });
      preview.link.addEventListener('pointerleave', () => {
        preview.hovered = false;
        syncPreview(preview);
      });
      preview.link.addEventListener('focus', () => {
        preview.focused = true;
        syncPreview(preview);
      });
      preview.link.addEventListener('blur', () => {
        preview.focused = false;
        syncPreview(preview);
      });
      previewObserver.observe(preview.video);
    });
    document.addEventListener('visibilitychange', () => previews.forEach(syncPreview));
    reducedMotion.addEventListener('change', () => previews.forEach(syncPreview));
  }

  document.getElementById('copy-email').addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText('tpragadeeshkumar@gmail.com');
      status.textContent = 'Email address copied.';
    } catch {
      status.textContent = 'Copy unavailable. Email: tpragadeeshkumar@gmail.com';
    }
  });
})();
