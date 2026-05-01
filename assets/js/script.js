/* ================================================================
   EASTWESTPK — Global JS v7
   Fixes: Auth header state, FAQ toggle, Guest booking bypass,
          Supabase session persistence (localStorage), mobile nav
   ================================================================ */

/* ── PAGE FADE ── */
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

/* ── SUPABASE CONFIG ── */
const EW_SUPA_URL  = 'https://bciqlmvheqlsmogpnmal.supabase.co';
const EW_SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXFsbXZoZXFsc21vZ3BubWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NjYsImV4cCI6MjA4ODkwMjY2Nn0.NpwnG7NSx4YCcm--fT3-tcP_fSyoaXVgSxzHLRP9P3o';

/* ── SESSION: localStorage so it survives refresh ── */
function ewGetUser(){try{const r=localStorage.getItem('ew_user');return r?JSON.parse(r):null;}catch(e){return null;}}
function ewSetUser(d){try{localStorage.setItem('ew_user',JSON.stringify(d));}catch(e){}}
function ewClearUser(){try{localStorage.removeItem('ew_user');sessionStorage.removeItem('ew_user');}catch(e){}}

/* ── HEADER AUTH: swap Login ↔ Avatar immediately ── */
function updateNavAuth(){
  const user=ewGetUser();
  const loginEls=document.querySelectorAll('.nav-login,#mlink-account');
  if(!user){
    loginEls.forEach(el=>{
      el.innerHTML='<i class="fa fa-user"></i> My Account';
      el.href='auth/login.html';
    });
    return;
  }
  const init=(user.name||user.email||'U').charAt(0).toUpperCase();
  const shortName=(user.name||user.email||'').split(' ')[0];
  loginEls.forEach(el=>{
    el.innerHTML=`<span style="width:26px;height:26px;border-radius:50%;background:var(--gold);color:#0A1628;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0">${init}</span> ${shortName}`;
    el.href='auth/my-bookings.html';
    el.title='My Bookings';
  });
}

/* ── NAVBAR SCROLL ── */
window.addEventListener('scroll',()=>{const n=document.getElementById('navbar');if(n)n.classList.toggle('scrolled',window.scrollY>50);},{passive:true});

/* ── OPEN MOBILE MENU ── */
window.openMenu=function(){
  const links=document.getElementById('navLinks');
  const ov=document.getElementById('navOverlay');
  if(!links)return;
  const home=document.getElementById('mlink-home');
  const contact=document.getElementById('mlink-contact');
  const desk=document.getElementById('mlink-svc-desk');
  const mob=document.getElementById('mlink-svc-mob');
  if(home){home.style.display='flex';home.style.width='100%';}
  if(contact){contact.style.display='flex';contact.style.width='100%';}
  if(desk)desk.style.display='none';
  if(mob)mob.style.display='block';
  links.classList.add('open');
  if(ov){ov.style.display='block';ov.style.position='fixed';ov.style.inset='0';ov.style.zIndex='8998';ov.style.background='rgba(0,0,0,0.52)';ov.style.pointerEvents='all';requestAnimationFrame(()=>{ov.style.opacity='1';});}
  document.body.style.overflow='hidden';
};

/* ── CLOSE MOBILE MENU ── */
window.closeMenu=function(){
  const links=document.getElementById('navLinks');
  const ov=document.getElementById('navOverlay');
  if(!links)return;
  links.classList.remove('open');
  if(ov){ov.style.opacity='0';ov.style.pointerEvents='none';setTimeout(()=>{ov.style.display='none';},320);}
  document.body.style.overflow='';
};

window.addEventListener('DOMContentLoaded',()=>{
  const ov=document.getElementById('navOverlay');
  if(ov)ov.addEventListener('click',()=>window.closeMenu());
});

/* ── MOBILE SERVICES EXPAND ── */
window.toggleMobSvc=function(parent){
  parent.classList.toggle('open');
  const sub=document.getElementById('mobSvcSub');
  const arrow=document.getElementById('mobSvcArrow');
  const label=document.getElementById('mobSvcLabel');
  if(sub){sub.style.display=sub.style.display==='none'?'block':'none';}
  if(arrow){arrow.style.transform=sub&&sub.style.display==='block'?'rotate(180deg)':'';}
  if(label){label.style.color=sub&&sub.style.display==='block'?'#C9A84C':'#4A4A6A';}
};

/* ── ESC KEY ── */
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.closeMenu();});

/* ── FAQ ACCORDION — fixed ── */
window.toggleFaq=function(el){
  const item=el.closest('.faq-item');if(!item)return;
  const ans=item.querySelector('.faq-a');
  const isOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(f=>{
    f.classList.remove('open');
    const a=f.querySelector('.faq-a');if(a)a.classList.remove('open');
  });
  if(!isOpen){item.classList.add('open');if(ans)ans.classList.add('open');}
};

/* ── GUEST BOOKING — no redirect loop ── */
window.continueAsGuest=function(){
  try{sessionStorage.setItem('ew_guest','true');}catch(e){}
  /* Hide any auth-required gate */
  const authBlock=document.getElementById('authRequired');
  if(authBlock)authBlock.style.display='none';
  /* Reveal booking form */
  const form=document.getElementById('bookingFormWrap');
  if(form){form.style.display='block';form.scrollIntoView({behavior:'smooth',block:'start'});}
  /* Open booking modal if present */
  const modal=document.getElementById('bookingModal');
  if(modal){modal.style.display='flex';document.body.style.overflow='hidden';}
};

/* ── LOGOUT ── */
window.ewLogout=function(){
  ewClearUser();
  if(window.supabase){try{window.supabase.createClient(EW_SUPA_URL,EW_SUPA_ANON).auth.signOut();}catch(e){}}
  window.location.href='index.html';
};

/* ── DOMContentLoaded: init all ── */
window.addEventListener('DOMContentLoaded',()=>{
  /* Update nav auth state every page load */
  updateNavAuth();

  /* Migrate old sessionStorage → localStorage so session persists */
  try{
    const old=sessionStorage.getItem('ew_user');
    if(old&&!localStorage.getItem('ew_user')){localStorage.setItem('ew_user',old);}
  }catch(e){}

  /* Scroll reveal */
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';obs.unobserve(e.target);}
    });
  },{threshold:0.08,rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll(
    '.pkg-card,.why-card,.testi-card,.stat-item,.faq-item,.svc-card,.what-card,.team-card,.cert-card,.award-card,.svc-item-card,.visa-card,.flight-card,.fp-card'
  ).forEach((el,i)=>{
    el.style.opacity='0';el.style.transform='translateY(22px)';
    el.style.transition=`opacity 0.5s ease ${(i%9)*0.06}s,transform 0.5s ease ${(i%9)*0.06}s`;
    obs.observe(el);
  });

  /* Stat counters */
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

/* Export */
window.ewGetUser=ewGetUser;
window.ewSetUser=ewSetUser;
window.ewClearUser=ewClearUser;
window.updateNavAuth=updateNavAuth;
