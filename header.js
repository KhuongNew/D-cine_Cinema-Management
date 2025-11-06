// FINAL desktop header: sticky, search expand, 2 auth states, avatar menu, nav active.
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // Sticky
  const hdr = $('#site-header');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', window.scrollY > 8);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  // Search open/close (+ "/" to open, Esc to close)
  const searchBtn = $('#searchBtn');
  const searchForm = $('#searchForm');
  const searchInput = $('#searchInput');
  function openSearch(v){
    if (!searchForm) return;
    searchForm.classList.toggle('open', v);
    searchBtn?.setAttribute('aria-expanded', String(v));
    if (v) setTimeout(() => searchInput?.focus(), 0);
  }
  searchBtn?.addEventListener('click', () => openSearch(!searchForm.classList.contains('open')));
  document.addEventListener('click', (e) => {
    if (!searchForm?.classList.contains('open')) return;
    if (!searchForm.contains(e.target) && e.target !== searchBtn) openSearch(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') openSearch(false);
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault(); openSearch(true);
    }
  });

  // Auth states
  function refreshAuthUI(){
    const token = localStorage.getItem('accessToken');
    const isAuth = !!token;
    $$('.guest-only').forEach(el => el.style.display = isAuth ? 'none' : '');
    $$('.auth-only').forEach(el => el.hidden = !isAuth);

    if (isAuth) {
      const name = (localStorage.getItem('fullName') || localStorage.getItem('username') || 'U').trim();
      const imgUrl = localStorage.getItem('avatarUrl') || '';
      const img = $('#avatarImg'), fb = $('#avatarFallback');
      if (imgUrl) { img.src = imgUrl; img.hidden = false; fb.hidden = true; }
      else { fb.textContent = (name[0] || 'U').toUpperCase(); img.hidden = true; fb.hidden = false; }
    }
  }
  refreshAuthUI();

  // Dev helper (test nhanh)
  window.dcineAuth = (cmd, payload={}) => {
    if (cmd === 'login') {
      localStorage.setItem('accessToken', 'dev-token');
      if (payload.name)   localStorage.setItem('fullName', payload.name);
      if (payload.avatar) localStorage.setItem('avatarUrl', payload.avatar);
    } else {
      ['accessToken','fullName','username','avatarUrl'].forEach(k => localStorage.removeItem(k));
    }
    location.reload();
  };

  // Avatar menu
  const userBtn = $('#userBtn'), userMenu = $('#userMenu');
  function toggleMenu(v){ if (!userMenu || !userBtn) return;
    userMenu.hidden = !v; userBtn.setAttribute('aria-expanded', String(v)); }
  userBtn?.addEventListener('click', () => toggleMenu(userMenu.hidden));
  document.addEventListener('click', (e) => {
    if (!userMenu || userMenu.hidden) return;
    if (!userMenu.contains(e.target) && e.target !== userBtn) toggleMenu(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });
  $('#logoutBtn')?.addEventListener('click', () => { localStorage.removeItem('accessToken'); location.reload(); });

  // Active nav
  const path = location.pathname.toLowerCase();
  $$('.main-nav .nav-link').forEach(link => {
    const key = (link.getAttribute('data-match') || '').toLowerCase();
    if (key && path.includes(key)) link.classList.add('active');
  });
})();
