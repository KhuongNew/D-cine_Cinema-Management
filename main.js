(() => {
  'use strict';

  // ====== Helpers ======
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const API = window.API_BASE || '/api';
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const throttle=(fn,ms=16)=>{ let t=0; return (...a)=>{ const n=Date.now(); if(n-t>ms){ t=n; fn(...a);} } };

  // ====== Header / Footer includes ======
  async function mountHeader(){
    const mount = document.querySelector('#hdr-include');
    if (!mount) return;
    try {
      const res = await fetch('header.html', { cache: 'no-store' });
      mount.innerHTML = await res.text();
    } catch (e) {
      console.warn('[header] load fail', e);
    }
    const s = document.createElement('script');
    s.src = '../assets/js/header.js';             
    s.onload = s.onerror = () => {};
    document.body.appendChild(s);
  }


  // ====== Reveal on scroll ======
  const io = new IntersectionObserver((es)=>{
    es.forEach(en => { if(en.isIntersecting){ en.target.classList.add('is-visible'); io.unobserve(en.target); } });
  }, { threshold: .15 });
  document.addEventListener('DOMContentLoaded', () => $$('.reveal').forEach(el => io.observe(el)));

  // ====== Parallax (hero) ======
  function parallax(){
    const hero = $('.hero'), bg = $('#heroBackdrop'), vid = $('#heroVideo');
    if (!hero || !bg) return;
    const rect = hero.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
    const ty = (p * 18)|0;
    bg.style.transform = `translateY(${ty}px)`;
    if (vid) vid.style.transform = `translateY(${ty}px)`;
  }
  window.addEventListener('scroll', parallax, { passive:true });

  // ====== UI helpers ======
  const fmtStars = (r=0) => `⭐ ${Number(r||0).toFixed(1)}`;

  /**
   * posterItem(movie, opts)
   * opts: { showRating, showBook, showTrailer, showRelease }
   */
  function posterItem(m, {
    showRating = false,
    showBook   = false,
    showTrailer= false,
    showRelease= false
  } = {}){
    const el = document.createElement('article');
    el.className = 'poster';
    el.innerHTML = `
      <img alt="${m.title||''}" src="${m.posterUrl||''}" loading="lazy">
      ${showRating ? `<span class="rate">${fmtStars(m.rating)}</span>` : ''}
      ${showRelease && m.releaseDate ? `<span class="meta-chip">Release: ${m.releaseDate}</span>` : ''}
      ${(showBook || showTrailer) ? `
        <div class="ov">
          ${showTrailer ? `<button class="btn outline" data-trailer="${m.trailerUrl||''}">Trailer</button>` : ''}
          ${showBook ? `<a class="btn" data-book href="${m.href || `showtime.html?movie=${m.id||''}`}">Book</a>` : ''}
        </div>` : ''
      }
    `;

    // Nút trong overlay: không dẫn tới trang chi tiết
    el.querySelector('[data-trailer]')?.addEventListener('click', e=>{
      e.stopPropagation();
      const u = e.currentTarget.dataset.trailer; u ? window.open(u,'_blank') : alert('No trailer yet.');
    });
    el.querySelector('[data-book]')?.addEventListener('click', e=> e.stopPropagation());

    // CLICK VS DRAG: chỉ click thật mới vào chi tiết (theo yêu cầu)
    el.addEventListener('click', (e)=>{
      const rail = e.currentTarget.closest('.rail');
      // Nếu là một cú drag: không điều hướng
      if (rail && rail.dataset.isDragging === '1') {
        rail.dataset.isDragging = '0'; // Reset cờ tại đây
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Click thật -> đi chi tiết
      const id = m.id ?? '';
      location.href = `movie-detail.html?movie=${encodeURIComponent(id)}`;
    });

    return el;
  }

  // ====== Coverflow engine ======
// ===== Coverflow engine (BIG SCREEN) — 5 items + auto-snap =====
function initCoverflow(rail, dotsEl, baseLen){
  let cards = [...rail.querySelectorAll('.poster')];

  // Dots
  dotsEl.innerHTML = '';
  const dots = Array.from({length: baseLen}, (_,i)=>{
    const d = document.createElement('button');
    d.className = 'dot';
    d.setAttribute('aria-label', `Slide ${i+1}`);
    d.onclick = ()=>scrollToIndex(midStart + i);
    dotsEl.appendChild(d);
    return d;
  });

  const midStart = baseLen;
  let active = midStart;

  const getX = (i)=> cards[i].offsetLeft + cards[i].offsetWidth/2 - rail.clientWidth/2;

  let isProgrammatic = false;
  let programmaticTimer = null;
  const jump = (i)=>{ rail.scrollLeft = getX(i); };
  const snap = (i)=>{
    isProgrammatic = true;
    rail.scrollTo({ left: getX(i), behavior:'smooth' });
    clearTimeout(programmaticTimer);
    programmaticTimer = setTimeout(()=>{ isProgrammatic = false; }, 420);
  };

  // UPDATE: phong cách “main cũ” + spacing khít (phù hợp 5 poster)
  function update(){
    const rr = rail.getBoundingClientRect();
    const center = rr.left + rr.width/2;
    let bestI = 0, bestDist = 1e9;

    cards.forEach((c,i)=>{
      const r  = c.getBoundingClientRect();
      const cc = r.left + r.width/2;

      const dist = (cc - center) / r.width;    // 0 = giữa
      const d    = clamp(dist, -1.2, 1.2);
      const ad   = Math.abs(d);

      const rotY    = -d * 20;                 // nghiêng nhẹ
      const scale   = 1 - Math.min(0.16, ad * 0.12);
      const shiftX  = -d * 22;                 // nhỏ hơn để khít hơn
      const opacity = 1 - Math.min(0.30, ad * 0.26);
      const z       = 1000 - Math.floor(ad * 400);

      c.style.transform = `translateX(${shiftX}px) rotateY(${rotY}deg) scale(${scale})`;
      c.style.opacity   = String(opacity);
      c.style.zIndex    = String(z);
      c.classList.toggle('is-center', Math.abs(dist) < 0.33);

      if (Math.abs(dist) < bestDist){ bestDist = Math.abs(dist); bestI = i; }
    });

    if (active !== bestI){
      active = bestI;
      const baseIndex = Number(cards[active].dataset.baseIndex ?? (active % baseLen));
      dots.forEach((d,i)=>d.classList.toggle('active', i===baseIndex));
    }
  }

  function normalize(){
    if (active < baseLen)         { active += baseLen; jump(active); }
    else if (active >= 2*baseLen) { active -= baseLen; jump(active); }
  }

  function scrollToIndex(i){ snap(i); }
  function next(){ snap(active+1); setTimeout(normalize, 420); }
  function prev(){ snap(active-1); setTimeout(normalize, 420); }

  // --- Scroll handlers: update + auto-snap khi dừng cuộn ---
  let scrollEndTimer = null;
  rail.addEventListener('scroll', ()=>{
    update();
    if (isProgrammatic) return;
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(()=>{ normalize(); snap(active); }, 140); // tự vào nấc
  }, {passive:true});
  window.addEventListener('resize', update);

  // Drag / touch + cờ isDragging (đã dùng ở posterItem để chặn click)
  let down=false, sx=0, sl=0;
  const start=e=>{
    down=true;
    rail.classList.add('dragging');
    rail.dataset.isDragging = '0';
    sx=('touches'in e?e.touches[0].clientX:e.clientX);
    sl=rail.scrollLeft;
  };
  const move =e=>{
    if(!down) return;
    rail.dataset.isDragging = '1';
    const x=('touches'in e?e.touches[0].clientX:e.clientX);
    rail.scrollLeft = sl - (x - sx);
  };
  const stop =()=>{
    if(!down) return;
    down=false;
    rail.classList.remove('dragging');
    normalize(); snap(active);  // thả tay cũng snap
  };
  rail.addEventListener('pointerdown', start);
  rail.addEventListener('pointermove',  move);
  window.addEventListener('pointerup',  stop);
  rail.addEventListener('touchstart', start, {passive:true});
  rail.addEventListener('touchmove',  move,  {passive:true});
  rail.addEventListener('touchend',   stop);

  // Scroll bằng wheel: đổi cuộn dọc -> ngang
  rail.addEventListener('wheel', (e)=>{
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      rail.scrollBy({ left: e.deltaY, behavior:'smooth' });
    }
  }, { passive:false });

  requestAnimationFrame(update);
  return { next, prev, scrollToIndex:(i)=>snap(i), normalize };
}

  // ====== Data loaders ======
  async function loadHero(){
    const t = $('#heroTitle'), de = $('#heroDesc'), lb = $('#heroEyebrow');
    const bg = $('#heroBackdrop'), cta = $('#heroCta'), btn = $('#heroTrailerBtn'), vid = $('#heroVideo');
    try{
      const res = await fetch(`${API}/home/hero`, { cache:'no-store' });
      const d = await res.json();
      t.textContent = d.title || 'Experience the Magic of Cinema with D-cine';
      de.textContent = d.description || 'Watch the latest blockbusters and book your favorite seats in seconds.';
      lb.textContent = d.label || 'Now streaming';
      if (d.imageUrl) bg.style.backgroundImage = `url('${d.imageUrl}')`;
      if (d.ctaHref) cta.href = d.ctaHref;
      if (d.trailerUrl) btn.addEventListener('click', ()=> window.open(d.trailerUrl,'_blank'), { once:true });
      if (d.videoUrl){ vid.src = d.videoUrl; vid.addEventListener('loadeddata', ()=> vid.style.opacity = 1, { once:true }); }
    }catch{/* silent */}
  }

  // Coverflow: ON THE BIG SCREEN
  async function loadOnTheBigScreen(){
    const wrap = $('#bigscreen .carousel');
    const rail = $('#railBigScreen');
    const dots = $('#dotsBigScreen');
    if(!wrap || !rail || !dots) return;

    let base = [];
    try{
      const res = await fetch(`${API}/movies/now`, { cache:'no-store' });
      if(res.ok) base = await res.json();
    }catch{}

    if(!base.length){
      base = Array.from({length:8}, (_,i)=>({
        id:`n${i+1}`,
        title:`Now ${i+1}`,
        posterUrl:`https://picsum.photos/seed/now${i}/520/720`,
        rating:(7.2+Math.random()*2).toFixed(1),
        trailerUrl:''
      }));
    }
    while(base.length < 8) base = base.concat(base);
    const baseLen = base.length;
    const view = base.concat(base, base);

    rail.innerHTML = '';
    view.forEach((m,idx)=>{
      const a = posterItem(m, { showRating:true, showBook:true, showTrailer:true });
      a.dataset.baseIndex = String(idx % baseLen);
      rail.appendChild(a);
    });

    const api = initCoverflow(rail, dots, baseLen);
    const left  = wrap.querySelector('.arrow.left');
    const right = wrap.querySelector('.arrow.right');
    if(left)  left.onclick  = ()=>{ api.prev();  setTimeout(api.normalize, 420); };
    if(right) right.onclick = ()=>{ api.next();  setTimeout(api.normalize, 420); };
    api.scrollToIndex(baseLen + Math.floor(baseLen/2));
  }

  // Coverflow: COMING SOON
  async function loadComingSoon(){
    const wrap = $('#coming .carousel');
    const rail = $('#railComingSoon');
    const dots = $('#dotsComingSoon');
    if(!wrap || !rail || !dots) return;

    let base = [];
    try{
      const res = await fetch(`${API}/movies/soon`, { cache:'no-store' });
      if(res.ok) base = await res.json();
    }catch{}

    if(!base.length){
      base = Array.from({length:8}, (_,i)=>({
        id:`s${i+1}`,
        title:`Soon ${i+1}`,
        posterUrl:`https://picsum.photos/seed/soon${i}/520/720`,
        trailerUrl:'',
        releaseDate:`2025-12-${(i%9)+1}`
      }));
    }
    while(base.length < 8) base = base.concat(base);
    const baseLen = base.length;
    const view = base.concat(base, base);

    rail.innerHTML = '';
    view.forEach((m,idx)=>{
      const a = posterItem(m, { showRating:false, showBook:false, showTrailer:true, showRelease:true });
      a.dataset.baseIndex = String(idx % baseLen);
      rail.appendChild(a);
    });

    const api = initCoverflow(rail, dots, baseLen);
    const left  = wrap.querySelector('.arrow.left');
    const right = wrap.querySelector('.arrow.right');
    if(left)  left.onclick  = ()=>{ api.prev();  setTimeout(api.normalize, 420); };
    if(right) right.onclick = ()=>{ api.next();  setTimeout(api.normalize, 420); };
    api.scrollToIndex(baseLen + Math.floor(baseLen/2));
  }
  // === Membership interactions (tier switch + card tilt) ===
  function enhanceMember(){
    const wrap = document.querySelector('#member .member-v2');
    if (!wrap) return;

    // Tier switch
    const map = { gold:'79.000đ', platinum:'129.000đ', diamond:'199.000đ' };
    const price = document.getElementById('tierPrice');
    wrap.querySelectorAll('.tier').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        wrap.querySelectorAll('.tier').forEach(b=>{
          b.classList.toggle('active', b===btn);
          b.setAttribute('aria-selected', String(b===btn));
        });
        const t = btn.dataset.tier; if (map[t]) price.textContent = map[t];
      });
    });

    // Subtle tilt on the glass card
    const card = wrap.querySelector('.glass-card');
    if (card){
      const rect = ()=> card.getBoundingClientRect();
      const onMove = (e)=>{
        const r = rect();
        const cx = r.left + r.width/2;
        const cy = r.top + r.height/2;
        const dx = (e.clientX - cx)/r.width;
        const dy = (e.clientY - cy)/r.height;
        card.style.transform = `rotateX(${(-dy*6).toFixed(2)}deg) rotateY(${(dx*8).toFixed(2)}deg)`;
      };
      const reset = ()=> card.style.transform = 'rotateX(0) rotateY(0)';
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', reset);
    }
  }

  // ====== Boot ======
  document.addEventListener('DOMContentLoaded', async () => {
    await mountHeader();
    document.body.classList.add('ready');
    loadHero();
    loadOnTheBigScreen();
    loadComingSoon();
    enhanceMember();
    parallax();
  });
})();
