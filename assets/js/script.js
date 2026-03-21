/* EASTWESTPK Global JS — Final Clean Version */

// Page fade
(function(){
  const ov=document.createElement('div');
  ov.id='page-fade';
  ov.style.cssText='position:fixed;inset:0;background:#FAFAF8;z-index:99999;pointer-events:none;opacity:0;transition:opacity 0.3s';
  document.documentElement.appendChild(ov);
  window.addEventListener('DOMContentLoaded',()=>{
    ov.style.opacity='1';ov.style.transition='none';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ov.style.transition='opacity 0.4s';ov.style.opacity='0';}));
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

// Open drawer
window.openMenu=function(){
  const links=document.getElementById('navLinks');
  const ov=document.getElementById('navOverlay');
  if(!links)return;

  // Show mobile-only items
  const home=document.getElementById('mlink-home');
  const contact=document.getElementById('mlink-contact');
  const svcDesk=document.getElementById('mlink-svc-desk');
  const svcMob=document.getElementById('mlink-svc-mob');
  if(home){home.style.display='flex';}
  if(contact){contact.style.display='flex';}
  if(svcDesk){svcDesk.style.display='none';}
  if(svcMob){svcMob.style.display='block';}

  links.classList.add('open');

  if(ov){
    ov.style.display='block';
    requestAnimationFrame(()=>{ov.style.opacity='1';ov.style.pointerEvents='all';});
  }
  document.body.style.overflow='hidden';
};

// Close drawer
window.closeMenu=function(){
  const links=document.getElementById('navLinks');
  const ov=document.getElementById('navOverlay');
  if(!links)return;
  links.classList.remove('open');
  if(ov){
    ov.style.opacity='0';ov.style.pointerEvents='none';
    setTimeout(()=>{ov.style.display='none';},310);
  }
  document.body.style.overflow='';
};

// Mobile services sub-menu
window.toggleMobSvc=function(parent){
  const sub=document.getElementById('mobSvcSub');
  const arrow=document.getElementById('mobSvcArrow');
  const label=document.getElementById('mobSvcLabel');
  if(!sub)return;
  const open=sub.style.display!=='none';
  sub.style.display=open?'none':'block';
  if(arrow)arrow.style.transform=open?'':'rotate(180deg)';
  if(label)label.style.color=open?'#4A4A6A':'#C9A84C';
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
  document.querySelectorAll('.pkg-card,.why-card,.testi-card,.stat-item,.faq-item,.svc-card,.what-card,.team-card,.cert-card,.award-card,.svc-item-card').forEach((el,i)=>{
    el.style.opacity='0';el.style.transform='translateY(22px)';
    el.style.transition=`opacity 0.5s ease ${(i%9)*0.06}s,transform 0.5s ease ${(i%9)*0.06}s`;
    obs.observe(el);
  });
  const cObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      const span=e.target;const text=span.textContent.trim();
      const num=parseFloat(text.replace(/[^0-9.]/g,''));if(!num)return;
      const sfx=text.replace(/[0-9.]/g,'').trim();let cur=0;const step=num/55;
      const t=setInterval(()=>{cur+=step;if(cur>=num){cur=num;clearInterval(t);}span.textContent=(Number.isInteger(num)?Math.floor(cur):cur.toFixed(1))+sfx;},22);
      cObs.unobserve(span);
    });
  },{threshold:0.5});
  document.querySelectorAll('.stat-item span').forEach(s=>cObs.observe(s));
});
