(() => {
  const mount = document.getElementById('ftr-include');
  if (!mount) return;

  const tryPaths = ['./footer.html','footer.html','../html/footer.html','html/footer.html'];

  async function load() {
    let html = null, used = null;
    for (const p of tryPaths) {
      try {
        const r = await fetch(p + '?v=' + Date.now(), { cache: 'no-store' });
        if (r.ok) { html = await r.text(); used = p; break; }
      } catch {}
    }
    if (!html) { console.warn('[footer] không tìm thấy footer.html'); return; }

    mount.innerHTML = html;
    console.log('[footer] loaded from:', used,
                '| version:', mount.querySelector('.site-footer')?.dataset.version);

    // gắn CSS nếu chưa có
    if (!document.querySelector('link[data-footer-css]')) {
      const ln = document.createElement('link');
      ln.rel = 'stylesheet';
      ln.href = '../assets/css/footer.css?v=3';
      ln.dataset.footerCss = '1';
      document.head.appendChild(ln);
    }

    // set năm
    const y = mount.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();

    // debug: đếm số cột
    const grid = mount.querySelector('.sf-grid');
    console.table([...grid.children].map(n => n.className));
  }

  load();
})();
