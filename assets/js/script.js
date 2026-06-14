/* ================================================================
   EASTWESTPK — Global JS v8
   ================================================================ */

/* ── PAGE FADE — safe version ── */
(function(){
  const ov = document.createElement('div');
  ov.id = 'page-fade';
  ov.style.cssText = 'position:fixed;inset:0;background:#FAFAF8;z-index:99999;pointer-events:none;opacity:1;transition:opacity 0.35s ease';
  document.documentElement.appendChild(ov);

  // Always fade out on load — even if DOMContentLoaded already fired
  function fadeOut() {
    setTimeout(() => { ov.style.opacity = '0'; }, 50);
    // Safety: force remove after 1s no matter what
    setTimeout(() => { ov.style.display = 'none'; }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fadeOut);
  } else {
    fadeOut();
  }

  // Page transition on link click
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const h = a.getAttribute('href');
    if (!h || a.target === '_blank' || h.startsWith('http') || h.startsWith('//') ||
        h.startsWith('#') || h.startsWith('mailto') || h.startsWith('tel') ||
        h.startsWith('javascript') || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    ov.style.display = 'block';
    ov.style.opacity = '1';
    setTimeout(() => { window.location.href = h; }, 280);
  });
})();

/* ── SUPABASE CONFIG ── */
const EW_SUPA_URL  = 'https://bciqlmvheqlsmogpnmal.supabase.co';
const EW_SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXFsbXZoZXFsc21vZ3BubWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NjYsImV4cCI6MjA4ODkwMjY2Nn0.NpwnG7NSx4YCcm--fT3-tcP_fSyoaXVgSxzHLRP9P3o';

/* ── NAVBAR SCROLL ── */
window.addEventListener('scroll', () => {
  const n = document.getElementById('navbar');
  if (n) n.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

/* ── OPEN MOBILE MENU ── */
window.openMenu = function() {
  const links = document.getElementById('navLinks');
  const ov    = document.getElementById('navOverlay');
  if (!links) return;
  links.classList.add('open');
  if (ov) {
    ov.style.display  = 'block';
    ov.style.opacity  = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity = '1'; }));
  }
  document.body.style.overflow = 'hidden';
};

/* ── CLOSE MOBILE MENU ── */
window.closeMenu = function() {
  const links = document.getElementById('navLinks');
  const ov    = document.getElementById('navOverlay');
  if (!links) return;
  links.classList.remove('open');
  if (ov) {
    ov.style.opacity = '0';
    setTimeout(() => { ov.style.display = 'none'; }, 300);
  }
  document.body.style.overflow = '';
};

/* ── ESC KEY ── */
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeMenu(); });

/* ── FAQ ACCORDION ── */
window.toggleFaq = function(el) {
  const item = el.closest('.faq-item');
  if (!item) return;
  const ans    = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(f => {
    f.classList.remove('open');
    const a = f.querySelector('.faq-a'); if (a) a.classList.remove('open');
  });
  if (!isOpen) { item.classList.add('open'); if (ans) ans.classList.add('open'); }
};

/* ── DOMContentLoaded ── */
window.addEventListener('DOMContentLoaded', () => {
  // Click outside nav to close
  const ov = document.getElementById('navOverlay');
  if (ov) ov.addEventListener('click', () => window.closeMenu());

  // Scroll reveal for cards
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity  = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

    document.querySelectorAll(
      '.pkg-card,.why-card,.testi-card,.stat-item,.faq-item,.svc-card,.what-card,.team-card,.fp-card,.up-card,.ins-card,.visa-card,.ins-plan-card'
    ).forEach((el, i) => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity 0.45s ease ${(i % 8) * 0.07}s, transform 0.45s ease ${(i % 8) * 0.07}s`;
      obs.observe(el);
    });

    // Stat counters
    const cObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const span = e.target;
        const text = span.textContent.trim();
        const num  = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!num) return;
        const sfx = text.replace(/[0-9.]/g, '').trim();
        let cur = 0; const step = num / 55;
        const t = setInterval(() => {
          cur += step;
          if (cur >= num) { cur = num; clearInterval(t); }
          span.textContent = (Number.isInteger(num) ? Math.floor(cur) : cur.toFixed(1)) + sfx;
        }, 22);
        cObs.unobserve(span);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.stat-item span').forEach(s => cObs.observe(s));
  }
});
