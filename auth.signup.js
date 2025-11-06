(() => {
  // ===== Config =====
  const API = 'http://localhost:8080';
  const LOGIN_URL = 'D_cine_login.html';
  const $ = (s) => document.querySelector(s);

  // ===== DOM =====
  const segEmail = $('#segEmail'), segPhone = $('#segPhone');

  const fullname = $('#fullname'), fullnameBox = $('#fullnameBox'), errFullname = $('#err-fullname');
  const username = $('#username'), usernameBox = $('#usernameBox'), errUsername = $('#err-username'), userStatus = $('#userStatus');

  const ident = $('#ident'), identBox = $('#identBox'), identLabel = $('#ident-label'), hintIdent = $('#hint-ident'), errIdent = $('#err-ident'), identPrefix = $('#identPrefix');

  const password = $('#password'), passwordBox = $('#passwordBox'), errPassword = $('#err-password');
  const confirmPw = $('#confirm'), confirmBox = $('#confirmBox'), errConfirm = $('#err-confirm');
  const pwBar = $('#pwBar');

  const agree = $('#agree');
  const form = $('#signupForm'), formWrap = $('#formWrap');
  const formError = $('#formError'), formSuccess = $('#formSuccess');
  const signUpBtn = $('#signUpBtn');

  // ===== State =====
  let mode = 'email';
  let touchedFullname = false, touchedUsername = false, touchedIdent = false, touchedPassword = false, touchedConfirm = false;

  // ===== Icons =====
  const iconMail  = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm0 0l8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const iconPhone = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v2a2 2 0 01-2.18 2A19.8 19.8 0 013 5.18 2 2 0 015 3h2a2 2 0 012 1.72c.12.9.36 1.77.7 2.58a2 2 0 01-.45 2.11L8.1 10.9a16 16 0 006 6l1.5-1.15a2 2 0 012.11-.45c.81.34 1.68.58 2.58.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  // ===== UI helpers =====
  function showFieldError(box, errEl, msg){
    box?.classList.add('error');
    if (errEl) errEl.textContent = msg || '';
    const inputEl = box?.querySelector('input');
    if (inputEl) inputEl.setAttribute('aria-invalid','true');
  }
  function clearFieldError(box, errEl){
    box?.classList.remove('error');
    if (errEl) errEl.textContent = '';
    const inputEl = box?.querySelector('input');
    if (inputEl) inputEl.removeAttribute('aria-invalid');
  }

  // ===== Validate =====
  const isValidEmail    = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const isValidPhone    = (v) => /^0\d{9,10}$/.test(v.replace(/\s|-/g,'').replace(/^\+84/,'0'));
  const isValidUsername = (v) => /^[a-zA-Z0-9_.]{4,20}$/.test(v);

  function validateFullname(show=true){
    const v = (fullname?.value || '').trim();
    const ok = v.length >= 2;
    if (show) ok ? clearFieldError(fullnameBox, errFullname)
                 : showFieldError(fullnameBox, errFullname, 'Vui lòng nhập họ tên.');
    return ok;
  }
  function validateUsername(show=true){
    const v = (username?.value || '').trim();
    const ok = !!v && isValidUsername(v);
    if (show) ok ? (clearFieldError(usernameBox, errUsername), (userStatus && (userStatus.textContent = '')))
                 : showFieldError(usernameBox, errUsername, v ? 'Tên đăng nhập không hợp lệ.' : 'Không được để trống.');
    return ok;
  }
  function validateIdent(show=true){
    const v = (ident?.value || '').trim();
    if (!v){
      if (show) showFieldError(identBox, errIdent, (mode==='email'?'Email':'Số điện thoại')+' không được để trống.');
      else clearFieldError(identBox, errIdent);
      return false;
    }
    const ok = (mode==='email') ? isValidEmail(v) : isValidPhone(v);
    if (!ok){
      if (show) showFieldError(identBox, errIdent, (mode==='email'?'Email':'Số điện thoại')+' không hợp lệ.');
      else clearFieldError(identBox, errIdent);
      return false;
    }
    clearFieldError(identBox, errIdent); return true;
  }
  function scorePassword(v){
    let s=0; if(v.length>=8) s++; if(/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if(/\d/.test(v)) s++; if(/[^\w\s]/.test(v)) s++; return s;
  }
  function validatePassword(show=true){
    const v = (password?.value || '');
    const ok = (v.length>=8 && /[A-Za-z]/.test(v) && /\d/.test(v));
    // meter
    const sc = scorePassword(v), pct = [0,25,50,75,100][sc]; if (pwBar) pwBar.style.width = pct + '%';
    if (show) ok ? clearFieldError(passwordBox, errPassword)
                 : showFieldError(passwordBox, errPassword, 'Tối thiểu 8 ký tự, gồm chữ và số.');
    return ok;
  }
  function validateConfirm(show=true){
    const ok = (confirmPw?.value || '') === (password?.value || '');
    if (show) ok ? clearFieldError(confirmBox, errConfirm)
                 : showFieldError(confirmBox, errConfirm, 'Mật khẩu nhập lại chưa khớp.');
    return ok;
  }
  function checkFormValid(){
    const ok = (touchedFullname ? validateFullname(true)  : validateFullname(false))
            && (touchedUsername ? validateUsername(true)  : validateUsername(false))
            && (touchedIdent    ? validateIdent(true)     : validateIdent(false))
            && (touchedPassword ? validatePassword(true)  : validatePassword(false))
            && (touchedConfirm  ? validateConfirm(true)   : validateConfirm(false))
            && !!agree?.checked;
    if (signUpBtn) signUpBtn.disabled = !ok;
    return ok;
  }

  // ===== Mode switch (Email / Phone) =====
  function setMode(next){
    mode = next;
    segEmail?.classList.toggle('active', mode==='email'); segEmail?.setAttribute('aria-selected', String(mode==='email'));
    segPhone?.classList.toggle('active', mode==='phone'); segPhone?.setAttribute('aria-selected', String(mode==='phone'));

    const pref = $('#identPrefix');
    if (mode==='email'){
      ident.type = 'email'; ident.placeholder = 'yourname@example.com';
      identLabel.textContent = 'Email'; hintIdent.style.display='none';
      if (pref) pref.innerHTML = iconMail;
      ident.setAttribute('autocomplete','email');
    } else {
      ident.type = 'tel'; ident.placeholder = '0xxxxxxxxx hoặc +84xxxxxxxxx';
      identLabel.textContent = 'Số điện thoại';
      hintIdent.textContent = 'Bắt đầu bằng 0 hoặc +84, tổng 10–11 chữ số.'; hintIdent.style.display='block';
      if (pref) pref.innerHTML = iconPhone;
      ident.setAttribute('autocomplete','tel-national');
    }

    touchedIdent = false;
    clearFieldError(identBox, errIdent);
    checkFormValid();
    ident?.focus();
  }
  segEmail?.addEventListener('click', ()=> setMode('email'));
  segPhone?.addEventListener('click', ()=> setMode('phone'));

  // ===== Field events =====
  fullname?.addEventListener('blur',  ()=>{ touchedFullname = true; validateFullname(true); checkFormValid(); });
  username?.addEventListener('blur',  ()=>{ touchedUsername = true; validateUsername(true); checkFormValid(); });
  ident   ?.addEventListener('blur',  ()=>{ touchedIdent    = true; validateIdent(true); checkFormValid(); });
  password?.addEventListener('blur',  ()=>{ touchedPassword = true; validatePassword(true); validateConfirm(true); checkFormValid(); });
  confirmPw?.addEventListener('blur', ()=>{ touchedConfirm  = true; validateConfirm(true); checkFormValid(); });

  fullname?.addEventListener('input', ()=>{ if (touchedFullname || errFullname.textContent) validateFullname(true); checkFormValid(); });
  username?.addEventListener('input', ()=>{ touchedUsername = true; validateUsername(true); checkFormValid(); });
  ident   ?.addEventListener('input', ()=>{ if (touchedIdent || errIdent.textContent) validateIdent(true); checkFormValid(); });
  password?.addEventListener('input', ()=>{ touchedPassword = true; validatePassword(true); validateConfirm(true); checkFormValid(); });
  confirmPw?.addEventListener('input', ()=>{ touchedConfirm  = true; validateConfirm(true); checkFormValid(); });
  agree   ?.addEventListener('change', ()=> checkFormValid());

  // ===== Ripple =====
  signUpBtn?.addEventListener('click', (e)=>{
    const r = signUpBtn.getBoundingClientRect(); const sp=document.createElement('span');
    sp.className='ripple'; sp.style.left=(e.clientX-r.left)+'px'; sp.style.top=(e.clientY-r.top)+'px';
    signUpBtn.appendChild(sp); sp.addEventListener('animationend', ()=>sp.remove());
  });

  // ===== Submit =====
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (formError)  { formError.textContent='';  formError.style.display='none'; }
    if (formSuccess){ formSuccess.textContent=''; formSuccess.style.display='none'; }

    touchedFullname = touchedUsername = touchedIdent = touchedPassword = touchedConfirm = true;
    if (!checkFormValid()){
      formWrap?.classList.remove('shake'); void formWrap?.offsetWidth; formWrap?.classList.add('shake');
      return;
    }

    // Chuẩn hoá ident
    const idRaw = (ident?.value || '').trim();
    const email = (mode==='email') ? idRaw : null;
    const phone = (mode==='phone') ? idRaw.replace(/\s|-/g,'').replace(/^\+84/,'0') : null;

    const body = {
      fullName: (fullname?.value || '').trim(),
      username: (username?.value || '').trim(),
      email, phone,
      password: (password?.value || '')
    };

    signUpBtn?.classList.add('loading');
    if (signUpBtn) signUpBtn.disabled = true;

    try{
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      let json = null; try { json = JSON.parse(text); } catch {}

      if (!res.ok || (json && json.ok === false)){
        const msg = (json && (json.message || json.error || json.detail)) || text || `HTTP ${res.status}`;
        if (formError){ formError.textContent = msg; formError.style.display = 'block'; }

        // highlight cơ bản theo từ khoá
        const m = (msg || '').toLowerCase();
        clearFieldError(usernameBox, errUsername);
        clearFieldError(identBox, errIdent);
        if (m.includes('username')) showFieldError(usernameBox, errUsername, msg);
        if (m.includes('email'))   { showFieldError(identBox, errIdent, msg); setMode('email'); }
        if (m.includes('phone') || m.includes('số') || m.includes('sdt') || m.includes('so dien thoai')){
          showFieldError(identBox, errIdent, msg); setMode('phone');
        }

        formWrap?.classList.remove('shake'); void formWrap?.offsetWidth; formWrap?.classList.add('shake');
        return;
      }

      if (formSuccess){ formSuccess.textContent = 'Tạo tài khoản thành công. Đang chuyển đến đăng nhập…'; formSuccess.style.display = 'block'; }
      window.location.href = LOGIN_URL;

    } catch (err){
      if (formError){ formError.textContent = err?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.'; formError.style.display = 'block'; }
      formWrap?.classList.remove('shake'); void formWrap?.offsetWidth; formWrap?.classList.add('shake');
    } finally {
      signUpBtn?.classList.remove('loading');
      if (signUpBtn) signUpBtn.disabled = false;
    }
  });

  // ===== Init =====
  setMode('email');
})();
