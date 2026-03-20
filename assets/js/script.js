/* ============================================================
   EASTWESTPK — Global JavaScript
   Fixed: Mobile drawer, scroll, FAQ, counters
   ============================================================ */

// ── PAGE FADE TRANSITION ──
(function () {
  const overlay = document.createElement('div');
  overlay.id = 'page-fade';
  overlay.style.cssText = 'position:fixed;inset:0;background:#FAFAF8;z-index:99999;pointer-events:none;opacity:0;transition:opacity 0.32s ease';
  document.documentElement.appendChild(overlay);

  window.addEventListener('DOMContentLoaded', () => {
    overlay.style.opacity = '1';
    overlay.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.4s ease';
      overlay.style.opacity = '0';
    }));
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || a.target === '_blank' || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel') || href.startsWith('whatsapp') || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    overlay.style.opacity = '1';
    setTimeout(() => { window.location.href = href; }, 340);
  });
})();

// ── NAVBAR SCROLL ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ── MOBILE DRAWER MENU ──
// openMenu / closeMenu are called from onclick attributes in HTML
window.openMenu = function () {
  const nav     = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  if (nav)     nav.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeMenu = function () {
  const nav     = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  if (nav)     nav.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

// Click outside drawer to close
document.addEventListener('click', function (e) {
  const overlay = document.getElementById('navOverlay');
  if (overlay && e.target === overlay) window.closeMenu();
});

// ESC key closes drawer
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') window.closeMenu();
});

// ── FAQ ──
window.toggleFaq = function (el) {
  const item  = el.closest('.faq-item');
  const ans   = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item.open').forEach(f => {
    f.classList.remove('open');
    f.querySelector('.faq-a')?.classList.remove('open');
  });
  // Open clicked if it was closed
  if (!isOpen) {
    item.classList.add('open');
    ans?.classList.add('open');
  }
};

// ── SCROLL REVEAL + COUNTERS ──
window.addEventListener('DOMContentLoaded', () => {

  /* Scroll Reveal */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll(
    '.pkg-card, .why-card, .testi-card, .stat-item, .faq-item, .svc-card, .what-card, .team-card, .flight-card, .visa-card'
  ).forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.5s ease ${(i % 8) * 0.06}s, transform 0.5s ease ${(i % 8) * 0.06}s`;
    observer.observe(el);
  });

  /* Counter Animation for .stat-item span */
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const span = e.target;
      const text = span.textContent.trim();
      const num  = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (!num) return;
      const suffix = text.replace(/[0-9.]/g, '').trim();
      let cur = 0;
      const step = num / 55;
      const timer = setInterval(() => {
        cur += step;
        if (cur >= num) { cur = num; clearInterval(timer); }
        span.textContent = (Number.isInteger(num) ? Math.floor(cur) : cur.toFixed(1)) + suffix;
      }, 22);
      countObs.unobserve(span);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-item span').forEach(s => countObs.observe(s));

  /* Hero BG parallax-like zoom */
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    setTimeout(() => heroBg.classList.add('loaded'), 100);
  }
});
