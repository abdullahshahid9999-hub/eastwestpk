/* EASTWESTPK Global JS v5 */

// Page fade
(function(){
  const ov=document.createElement('div');
  ov.id='page-fade';
  ov.style.cssText='position:fixed;inset:0;background:#FAFAF8;z-index:99999;pointer-events:none;opacity:0;transition:opacity 0.3s ease';
  document.documentElement.appendChild(ov);
  window.addEventListener('DOMContentLoaded',()=>{
    ov.style.opacity='1';ov.style.transition='none';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ov.style.transition='opacity 0.4s ease';ov.style.opacity='0';}));
  });
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a)return;
    const h=a.getAttribute('href');
    if(!h||a.target==='_blank'||h.startsWith('http')||h.startsWith('//')||h.startsWith('#')||h.startsWith('mailto')||h.startsWith('tel')||e.ctrlKey||e.metaKey||e.shiftKey)return;
    e.preventDefault();ov.style.opacity='1';
    setTimeout(()=>{window.location.href=h;},300);
  });
})();

// Navbar scroll
window.addEventListener('scroll',()=>{
  const n=document.getElementById('navbar');
  if(n)n.classList.toggle('scrolled',window.scrollY>50);
},{passive:true});

// Open mobile menu
window.openMenu=function(){
  const links=document.getElementById('navLinks');
  const overlay=document.getElementById('navOverlay');
  if(!links)return;
  // Show mobile-only items
  ['nav-home','nav-contact'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='flex';});
  const sm=document.getElementById('nav-svc-mobile');if(sm)sm.style.display='block';
  const sd=document.getElementById('nav-svc-desktop');if(sd)sd.style.display='none';
  links.classList.add('open');
  if(overlay){overlay.style.display='block';overlay.style.pointerEvents='all';requestAnimationFrame(()=>{overlay.style.opacity='1';});}
  document.body.style.overflow='hidden';
};

// Close mobile menu
window.closeMenu=function(){
  const links=document.getElementById('navLinks');
  const overlay=document.getElementById('navOverlay');
  if(!links)return;
  links.classList.remove('open');
  if(overlay){overlay.style.opacity='0';overlay.style.pointerEvents='none';setTimeout(()=>{overlay.style.display='none';},310);}
  document.body.style.overflow='';
};

// Mobile services expand
window.toggleMobSvc=function(parent){
  parent.classList.toggle('open');
  const sub=parent.nextElementSibling;
  if(sub)sub.classList.toggle('open');
};

// ESC
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.closeMenu();});

// FAQ
window.toggleFaq=function(el){
  const item=el.closest('.faq-item');
  const ans=item.querySelector('.faq-a');
  const isOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(f=>{f.classList.remove('open');f.querySelector('.faq-a')?.classList.remove('open');});
  if(!isOpen){item.classList.add('open');ans?.classList.add('open');}
};

// Scroll reveal + counters
window.addEventListener('DOMContentLoaded',()=>{
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';obs.unobserve(e.target);}
    });
  },{threshold:0.08,rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll('.pkg-card,.why-card,.testi-card,.stat-item,.faq-item,.svc-card,.what-card,.team-card,.cert-card,.award-card').forEach((el,i)=>{
    el.style.opacity='0';el.style.transform='translateY(22px)';
    el.style.transition=`opacity 0.5s ease ${(i%9)*0.06}s, transform 0.5s ease ${(i%9)*0.06}s`;
    obs.observe(el);
  });
  const cObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      const span=e.target;const text=span.textContent.trim();
      const num=parseFloat(text.replace(/[^0-9.]/g,''));if(!num)return;
      const sfx=text.replace(/[0-9.]/g,'').trim();let cur=0;const step=num/55;
      const timer=setInterval(()=>{cur+=step;if(cur>=num){cur=num;clearInterval(timer);}span.textContent=(Number.isInteger(num)?Math.floor(cur):cur.toFixed(1))+sfx;},22);
      cObs.unobserve(span);
    });
  },{threshold:0.5});
  document.querySelectorAll('.stat-item span').forEach(s=>cObs.observe(s));
});
