// ─────────────────────────────────────────
//  EASTWESTPK — Global JS
// ─────────────────────────────────────────

// PAGE TRANSITIONS
(function () {
  const overlay = document.createElement('div');
  overlay.id = 'page-fade';
  overlay.style.cssText = `position:fixed;inset:0;background:linear-gradient(135deg,#0A1628,#0F2040);z-index:99999;pointer-events:none;opacity:0;transition:opacity 0.38s ease`;
  document.documentElement.appendChild(overlay);

  window.addEventListener('DOMContentLoaded', () => {
    overlay.style.opacity = '1';
    overlay.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.45s ease';
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
    setTimeout(() => { window.location.href = href; }, 360);
  });
})();

// NAVBAR SCROLL
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

// MOBILE MENU
function openMenu() {
  document.getElementById('navLinks')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  document.getElementById('navLinks')?.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('click', e => {
  const nav = document.getElementById('navLinks');
  const btn = document.getElementById('menuBtn');
  if (nav?.classList.contains('open') && !nav.contains(e.target) && e.target !== btn) closeMenu();
});

// FAQ
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const ans  = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(f => {
    f.classList.remove('open');
    f.querySelector('.faq-a')?.classList.remove('open');
  });
  if (!isOpen) { item.classList.add('open'); ans?.classList.add('open'); }
}

// SCROLL REVEAL
window.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.pkg-card, .why-card, .testi-card, .stat-item, .faq-item').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity 0.55s ease ${i * 0.06}s, transform 0.55s ease ${i * 0.06}s`;
    observer.observe(el);
  });

  // COUNTER ANIMATION
  document.querySelectorAll('.stat-item span').forEach(span => {
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
  });
});
