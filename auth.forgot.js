(() => {
  // ===== Config =====
  const API = 'http://localhost:8080';
  const ENDPOINTS = {
    sendOtp  : '/api/auth/forgot/send-otp',
    verifyOtp: '/api/auth/forgot/verify-otp',
    reset    : '/api/auth/forgot/reset',
  };
  const $ = (s)=>document.querySelector(s);

  // ===== Views & Elements =====
  const viewForgot = $('#view-forgot');
  const viewReset  = $('#view-reset');

  const ident = $('#ident'), identBox = $('#identBox'), errIdent = $('#err-ident'), identIcon = $('#identIcon');
  const forgotMsg = $('#forgotMsg'), forgotErr = $('#forgotErr');
  const sendOtpBtn = $('#sendOtpBtn'), swapIdent = $('#swapIdent');
  const otpInputs = [...document.querySelectorAll('.otp')];
  const errOtp = $('#err-otp'), resendHint = $('#resendHint'), verifyBtn = $('#verifyBtn');

  const newpass = $('#newpass'), conf = $('#conf');
  const newBox = $('#newBox'), errNew = $('#err-new'), confBox = $('#confBox'), errConf = $('#err-conf');
  const pwBar = $('#pwBar');
  const resetMsg = $('#resetMsg'), resetErr = $('#resetErr');
  const resetForm = $('#resetForm'), resetBtn = $('#resetBtn');

  // ===== State =====
  let mode='email';      // auto-detect: email | phone
  let otpSent=false, otpVerified=false;
  let touchedIdent=false;
  let cooldown=0, timer=null;
  let requestId = null;  // recovery id từ BE

  // ===== Helpers =====
  const mailIcon  = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm0 0l8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const phoneIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v2a2 2 0 01-2.18 2A19.8 19.8 0 013 5.18 2 2 0 015 3h2a2 2 0 012 1.72c.12.9.36 1.77.7 2.58a2 2 0 01-.45 2.11L8.1 10.9a16 16 0 006 6l1.5-1.15a2 2 0 012.11-.45c.81.34 1.68.58 2.58.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function showFieldError(box, errEl, msg){ box?.classList.add('error'); if(errEl){ errEl.textContent=msg||''; errEl.style.display='block'; } box?.querySelector('input')?.setAttribute('aria-invalid','true'); }
  function clearFieldError(box, errEl){ box?.classList.remove('error'); if(errEl){ errEl.textContent=''; errEl.style.display=''; } box?.querySelector('input')?.removeAttribute('aria-invalid'); }

  const isValidEmail = (v)=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const isValidPhone = (v)=>/^0\d{9,10}$/.test(v.replace(/\s|-/g,'').replace(/^\+84/,'0'));

  function normalizeIdent(raw){
    return (mode==='phone') ? raw.replace(/\s|-/g,'').replace(/^\+84/,'0') : raw;
  }
  function getIdentPayload(){
    const raw = ident.value.trim();
    return { channelType: mode.toUpperCase(), identifier: normalizeIdent(raw) };
  }

  // ===== Detect email/phone & swap =====
  ident.addEventListener('input', ()=>{
    const v=ident.value.trim();
    if(/^\+?\d/.test(v)){ mode='phone'; identIcon.innerHTML=phoneIcon; ident.setAttribute('autocomplete','tel-national'); }
    else { mode='email'; identIcon.innerHTML=mailIcon; ident.setAttribute('autocomplete','email'); }
    if(touchedIdent || errIdent.textContent) validateIdent(true);
    updateSendState();
  });
  ident.addEventListener('blur', ()=>{ touchedIdent=true; validateIdent(true); });

  function validateIdent(show=true){
    const v=ident.value.trim();
    if(!v){ if(show) showFieldError(identBox, errIdent, 'Không được để trống.'); else clearFieldError(identBox, errIdent); return false; }
    const ok = (mode==='email') ? isValidEmail(v) : isValidPhone(v);
    if(!ok){ if(show) showFieldError(identBox, errIdent, (mode==='email'?'Email':'Số điện thoại')+' không hợp lệ.'); else clearFieldError(identBox, errIdent); return false; }
    clearFieldError(identBox, errIdent); return true;
  }

  swapIdent.addEventListener('click', ()=>{
    if(mode==='email'){ mode='phone'; identIcon.innerHTML=phoneIcon; ident.placeholder='0xxxxxxxxx hoặc +84xxxxxxxxx'; }
    else { mode='email'; identIcon.innerHTML=mailIcon; ident.placeholder='yourname@example.com'; }
    validateIdent(false); updateSendState(); ident.focus();
  });

  // ===== Cooldown & send button state =====
  function startCooldown(sec=60){
    cooldown=sec; resendHint.textContent=`Có thể gửi lại sau ${cooldown}s.`; sendOtpBtn.disabled=true;
    if(timer) clearInterval(timer);
    timer=setInterval(()=>{
      cooldown--;
      resendHint.textContent = cooldown>0 ? `Có thể gửi lại sau ${cooldown}s.` : 'Bạn có thể gửi lại OTP.';
      if(cooldown<=0){ clearInterval(timer); sendOtpBtn.disabled=false; }
    },1000);
  }
  function updateSendState(){ sendOtpBtn.disabled = !validateIdent(false) || cooldown>0; }

  // ===== Send OTP =====
  sendOtpBtn.addEventListener('click', async ()=>{
    forgotErr.style.display='none'; forgotMsg.style.display='none';
    touchedIdent=true;
    if(!validateIdent(true)){ ident.focus(); return; }

    sendOtpBtn.classList.add('loading'); sendOtpBtn.setAttribute('disabled','true');
    try{
      const res = await fetch(`${API}${ENDPOINTS.sendOtp}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        // credentials:'include',
        body: JSON.stringify(getIdentPayload())
      });
      const text = await res.text(); let json=null; try{ json=JSON.parse(text) }catch{}
      if(!res.ok || (json && json.ok===false)) throw new Error((json && (json.message||json.error||json.detail)) || text || `HTTP ${res.status}`);

      // lấy requestId/recoveryToken/token (tùy BE)
      requestId = json?.data?.requestId || json?.data?.recoveryToken || json?.data?.token || requestId;

      otpSent=true; otpVerified=false;
      forgotMsg.textContent='Đã gửi OTP. Vui lòng kiểm tra tin nhắn/email.';
      forgotMsg.style.display='block';
      startCooldown(60);
      otpInputs.forEach(i=>i.value=''); document.getElementById('otp1')?.focus();
    }catch(err){
      forgotErr.textContent = err?.message || 'Không thể gửi OTP lúc này.';
      forgotErr.style.display='block';
      showFieldError(identBox, errIdent, forgotErr.textContent);
    }finally{
      sendOtpBtn.classList.remove('loading');
      updateSendState();
    }
  });

  // ===== OTP inputs =====
  otpInputs.forEach((input,idx)=>{
    input.addEventListener('input', (e)=>{
      e.target.value=e.target.value.replace(/\D/g,'').slice(0,1);
      if(e.target.value && idx<otpInputs.length-1) otpInputs[idx+1].focus();
      errOtp.textContent='';
    });
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Backspace' && !e.target.value && idx>0) otpInputs[idx-1].focus();
      if(e.key==='ArrowLeft' && idx>0) otpInputs[idx-1].focus();
      if(e.key==='ArrowRight' && idx<otpInputs.length-1) otpInputs[idx+1].focus();
      if(e.key==='Enter'){ verifyBtn.click(); }
    });
  });

  // ===== Verify OTP =====
  verifyBtn.addEventListener('click', async ()=>{
    errOtp.textContent='';
    if(!otpSent){ errOtp.textContent='Bạn cần gửi OTP trước.'; return; }
    const code = otpInputs.map(i=>i.value).join('');
    if(code.length<6){ errOtp.textContent='Mã OTP chưa đủ 6 số.'; return; }

    verifyBtn.classList.add('loading'); verifyBtn.setAttribute('disabled','true');
    try{
      // tối giản: chỉ cần requestId + code (không lặp lại identifier)
      const payload = { requestId, code };
      const res = await fetch(`${API}${ENDPOINTS.verifyOtp}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        // credentials:'include',
        body: JSON.stringify(payload)
      });
      const text = await res.text(); let json=null; try{ json=JSON.parse(text) }catch{}
      if(!res.ok || (json && json.ok===false)) throw new Error((json && (json.message||json.error||json.detail)) || text || 'OTP không hợp lệ hoặc đã hết hạn');

      // cập nhật requestId nếu BE cấp token mới
      requestId = json?.data?.requestId || json?.data?.recoveryToken || requestId;

      otpVerified = true;
      forgotMsg.textContent='OTP hợp lệ. Hãy đặt mật khẩu mới.'; forgotMsg.style.display='block';
      viewForgot.classList.add('hide'); viewReset.classList.remove('hide'); viewReset.setAttribute('aria-hidden','false');
      setTimeout(()=> newpass?.focus(), 60);
    }catch(err){
      errOtp.textContent = err?.message || 'OTP không đúng hoặc đã hết hạn.';
    }finally{
      verifyBtn.classList.remove('loading'); verifyBtn.removeAttribute('disabled');
    }
  });

  // ===== Reset password =====
  function scorePassword(v){ let s=0; if(v.length>=8)s++; if(/[A-Z]/.test(v)&&/[a-z]/.test(v))s++; if(/\d/.test(v))s++; if(/[^\w\s]/.test(v))s++; return s; }
  function validateNew(show=true){
    const v=newpass.value;
    if(!v){ if(show) showFieldError(newBox, errNew, 'Không được để trống.'); else clearFieldError(newBox, errNew); pwBar.style.width='0%'; return false; }
    const ok = v.length>=8 && /[A-Za-z]/.test(v) && /\d/.test(v);
    const sc=scorePassword(v), pct=[0,25,50,75,100][sc]; pwBar.style.width=pct+'%';
    if(show) ok ? clearFieldError(newBox, errNew) : showFieldError(newBox, errNew, 'Tối thiểu 8 ký tự, gồm chữ và số.');
    return ok;
  }
  function validateConf(show=true){
    const ok = conf.value === newpass.value;
    if(show) ok ? clearFieldError(confBox, errConf) : showFieldError(confBox, errConf, 'Chưa khớp mật khẩu.');
    return ok;
  }
  function updateResetState(){ resetBtn.disabled = !(validateNew(false) && validateConf(false)); }
  newpass?.addEventListener('input', ()=>{ validateNew(true); validateConf(true); updateResetState(); });
  conf?.addEventListener('input',    ()=>{ validateConf(true); updateResetState(); });

  resetForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    resetErr.style.display='none'; resetMsg.style.display='none';
    if(!(validateNew(true) && validateConf(true))) return;

    resetBtn.classList.add('loading'); resetBtn.setAttribute('disabled','true');
    try{
      // tối giản: chỉ cần requestId + newPassword + confirmPassword
      const payload = { requestId, newPassword:newpass.value, confirmPassword:conf.value };
      const res = await fetch(`${API}${ENDPOINTS.reset}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        // credentials:'include',
        body: JSON.stringify(payload)
      });
      const text = await res.text(); let json=null; try{ json=JSON.parse(text) }catch{}
      if(!res.ok || (json && json.ok===false)) throw new Error((json && (json.message||json.error||json.detail)) || text || 'Đặt lại mật khẩu thất bại');

      resetMsg.textContent='Đặt lại mật khẩu thành công. Đang chuyển về đăng nhập…';
      resetMsg.style.display='block';
      setTimeout(()=>{ window.location.href='D_cine_login.html'; }, 900);
    }catch(err){
      resetErr.textContent = err?.message || 'Không thể kết nối máy chủ.';
      resetErr.style.display='block';
    }finally{
      resetBtn.classList.remove('loading'); resetBtn.removeAttribute('disabled');
    }
  });

  // ===== Init =====
  (function init(){
    resendHint.textContent='Chưa nhận được mã? Bấm Gửi OTP.';
    sendOtpBtn.disabled = true;
  })();
})();
