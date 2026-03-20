/* ============================================================
   EASTWESTPK — Global JavaScript v4
   Mobile nav 100% fixed
   ============================================================ */

// ── PAGE FADE ──
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
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || a.target === '_blank' || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel') || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    overlay.style.opacity = '1';
    setTimeout(() => { window.location.href = href; }, 320);
  });
})();

// ── NAVBAR SCROLL ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ── MOBILE MENU — COMPLETELY FIXED ──
window.openMenu = function() {
  const nav     = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  if (!nav) return;

  // Show drawer
  nav.classList.add('open');

  // Show overlay manually (works even if CSS not loaded)
  if (overlay) {
    overlay.style.display       = 'block';
    overlay.style.position      = 'fixed';
    overlay.style.inset         = '0';
    overlay.style.background    = 'rgba(0,0,0,0.55)';
    overlay.style.zIndex        = '1998';
    overlay.style.pointerEvents = 'all';
    overlay.style.transition    = 'opacity 0.3s';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  }

  document.body.style.overflow = 'hidden';
};

window.closeMenu = function() {
  const nav     = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  if (!nav) return;

  nav.classList.remove('open');

  if (overlay) {
    overlay.style.opacity       = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }

  document.body.style.overflow = '';
};

// Click overlay to close
window.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('navOverlay');
  if (overlay) overlay.addEventListener('click', () => window.closeMenu());
});

// ESC closes menu
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') window.closeMenu();
});

// ── FAQ ──
window.toggleFaq = function(el) {
  const item   = el.closest('.faq-item');
  const ans    = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(f => {
    f.classList.remove('open');
    f.querySelector('.faq-a')?.classList.remove('open');
  });
  if (!isOpen) { item.classList.add('open'); ans?.classList.add('open'); }
};

// ── SCROLL REVEAL + COUNTERS ──
window.addEventListener('DOMContentLoaded', () => {

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity    = '1';
        e.target.style.transform  = 'translateY(0)';
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll(
    '.pkg-card,.why-card,.testi-card,.stat-item,.faq-item,.svc-card,.what-card,.team-card,.cert-card,.award-card'
  ).forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(22px)';
    el.style.transition = `opacity 0.5s ease ${(i % 9) * 0.06}s, transform 0.5s ease ${(i % 9) * 0.06}s`;
    revealObs.observe(el);
  });

  // Counter
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
});
