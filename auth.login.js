(() => {
	// ===== Config =====
	const API = 'http://localhost:8080';
	const HOME_URL = 'D_cine_home.html';
	const $ = (sel) => document.querySelector(sel);

	// ===== DOM =====
	const segEmail = $('#segEmail');
	const segPhone = $('#segPhone');
	const segUser  = $('#segUser');

	const ident = $('#ident');
	const identBox = $('#identBox');
	const identLabel = $('#ident-label');
	const hintIdent = $('#hint-ident');
	const errIdent = $('#err-ident');

	const password = $('#password');
	const passwordBox = $('#passwordBox');
	const errPassword = $('#err-password');
	const capsHint = $('#caps-hint');

	const form = $('#loginForm');
	const formWrap = $('#formWrap');
	const formError = $('#formError');
	const formSuccess = $('#formSuccess');
	const signInBtn = $('#signInBtn');
	const guestBtn = $('#guestBtn');

	const toggle = document.getElementById('togglePw');
	const eyeOn = document.getElementById('eyeOn');
	const eyeOff = document.getElementById('eyeOff');

	// ===== State =====
	let mode = 'email';
	let touchedIdent = false;
	let touchedPassword = false;

	// ===== Icons =====
	const iconMail = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm0 0l8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	const iconPhone = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v2a2 2 0 01-2.18 2A19.8 19.8 0 013 5.18 2 2 0 015 3h2a2 2 0 012 1.72c.12.9.36 1.77.7 2.58a2 2 0 01-.45 2.11L8.1 10.9a16 16 0 006 6l1.5-1.15a2 2 0 012.11-.45c.81.34 1.68.58 2.58.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	const iconUser = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>`;

	// ===== Helpers =====
	function showFieldError(box, errEl, msg) {
		box?.classList.add('error');
		if (errEl) errEl.textContent = msg || '';
		const inputEl = box?.querySelector('input');
		if (inputEl) inputEl.setAttribute('aria-invalid', 'true');
	}
	function clearFieldError(box, errEl) {
		box?.classList.remove('error');
		if (errEl) errEl.textContent = '';
		const inputEl = box?.querySelector('input');
		if (inputEl) inputEl.removeAttribute('aria-invalid');
	}

	const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
	const isValidPhone = (v) => /^0\d{9,10}$/.test(v.replace(/\s|-/g, '').replace(/^\+84/, '0'));
	const isValidUsername = (v) => /^[a-zA-Z0-9_.]{4,20}$/.test(v);

	function validateIdent(show = true) {
		const v = (ident?.value || '').trim();
		if (!v) {
			if (show) showFieldError(identBox, errIdent, (mode === 'email' ? 'Email' : mode === 'phone' ? 'Số điện thoại' : 'Tên đăng nhập') + ' không được để trống.');
			else clearFieldError(identBox, errIdent);
			return false;
		}
		const ok = mode === 'email' ? isValidEmail(v) : mode === 'phone' ? isValidPhone(v) : isValidUsername(v);
		if (!ok) {
			if (show) showFieldError(identBox, errIdent, (mode === 'email' ? 'Email' : mode === 'phone' ? 'Số điện thoại' : 'Tên đăng nhập') + ' không hợp lệ.');
			else clearFieldError(identBox, errIdent);
			return false;
		}
		clearFieldError(identBox, errIdent);
		return true;
	}

	function validatePassword(show = true) {
		const ok = !!(password?.value || '');
		if (show) ok ? clearFieldError(passwordBox, errPassword)
		              : showFieldError(passwordBox, errPassword, 'Mật khẩu không được để trống.');
		return ok;
	}

	function checkFormValid() {
		const ok = (touchedIdent ? validateIdent(true) : validateIdent(false))
			&& (touchedPassword ? validatePassword(true) : validatePassword(false));
		if (signInBtn) signInBtn.disabled = !ok;
		return ok;
	}

	function setMode(next) {
		mode = next;
		segEmail?.classList.toggle('active', mode === 'email');   segEmail?.setAttribute('aria-selected', String(mode === 'email'));
		segPhone?.classList.toggle('active', mode === 'phone');   segPhone?.setAttribute('aria-selected', String(mode === 'phone'));
		segUser ?.classList.toggle('active', mode === 'username'); segUser ?.setAttribute('aria-selected', String(mode === 'username'));

		const pref = identBox?.querySelector('.prefix');
		if (mode === 'email') {
			ident.type = 'email';
			ident.placeholder = 'yourname@example.com';
			if (identLabel) identLabel.textContent = 'Email';
			if (hintIdent) hintIdent.style.display = 'none';
			if (pref) pref.innerHTML = iconMail;
		} else if (mode === 'phone') {
			ident.type = 'tel';
			ident.placeholder = '0xxxxxxxxx hoặc +84xxxxxxxxx';
			if (identLabel) identLabel.textContent = 'Số điện thoại';
			if (hintIdent) { hintIdent.textContent = 'Bắt đầu bằng 0 hoặc +84, tổng 10–11 chữ số.'; hintIdent.style.display = 'block'; }
			if (pref) pref.innerHTML = iconPhone;
		} else {
			ident.type = 'text';
			ident.placeholder = 'ten_dang_nhap';
			if (identLabel) identLabel.textContent = 'Tên đăng nhập';
			if (hintIdent) { hintIdent.textContent = '4–20 ký tự: chữ, số, _ hoặc .'; hintIdent.style.display = 'block'; }
			if (pref) pref.innerHTML = iconUser;
		}

		touchedIdent = touchedPassword = false;
		clearFieldError(identBox, errIdent);
		clearFieldError(passwordBox, errPassword);
		checkFormValid();
		ident?.focus();
	}

	// CapsLock hint
	['keyup', 'keydown'].forEach(evt => {
		password?.addEventListener(evt, (e) => {
			const on = e.getModifierState && e.getModifierState('CapsLock');
			if (capsHint) capsHint.style.display = on ? 'block' : 'none';
		});
	});

	// Toggle password visibility
	function setPwVisible(v) {
		if (!password) return;
		password.type = v ? 'text' : 'password';
		if (eyeOn)  eyeOn.style.display = v ? 'block' : 'none';
		if (eyeOff) eyeOff.style.display = v ? 'none'  : 'block';
		if (toggle) toggle.setAttribute('aria-pressed', String(v));
	}
	toggle?.addEventListener('click',       () => setPwVisible(password.type === 'password'));
	toggle?.addEventListener('pointerdown', () => setPwVisible(true));
	toggle?.addEventListener('pointerup',   () => setPwVisible(false));
	toggle?.addEventListener('pointerleave',() => setPwVisible(false));

	// Field events
	ident?.addEventListener('blur',  () => { touchedIdent = true;    validateIdent(true);    checkFormValid(); });
	password?.addEventListener('blur', () => { touchedPassword = true; validatePassword(true); checkFormValid(); });
	ident?.addEventListener('input', () => { touchedIdent = true;    validateIdent(true);    checkFormValid(); });
	password?.addEventListener('input', () => { touchedPassword = true; validatePassword(true); checkFormValid(); });

	// Segments
	segEmail?.addEventListener('click', () => setMode('email'));
	segPhone?.addEventListener('click', () => setMode('phone'));
	segUser ?.addEventListener('click', () => setMode('username'));

	// Ripple
	signInBtn?.addEventListener('click', (e) => {
		const rect = signInBtn.getBoundingClientRect();
		const ripple = document.createElement('span'); ripple.className = 'ripple';
		ripple.style.left = (e.clientX - rect.left) + 'px';
		ripple.style.top  = (e.clientY - rect.top)  + 'px';
		signInBtn.appendChild(ripple);
		ripple.addEventListener('animationend', () => ripple.remove());
	});

	// ===== Submit =====
	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (formError)  { formError.textContent = '';  formError.style.display = 'none'; }
		if (formSuccess){ formSuccess.textContent = ''; formSuccess.style.display = 'none'; }

		touchedIdent = true;
		touchedPassword = true;

		if (!checkFormValid()) {
			formWrap?.classList.remove('shake'); void formWrap?.offsetWidth; formWrap?.classList.add('shake');
			(!validateIdent(true) ? ident : password)?.focus();
			return;
		}

		// chuẩn hoá định danh (+84 -> 0 khi ở Phone)
		const raw = (ident?.value || '').trim();
		const emailOrPhone = (mode === 'phone') ? raw.replace(/\s|-/g, '').replace(/^\+84/, '0') : raw;

		signInBtn?.classList.add('loading');
		if (signInBtn) signInBtn.disabled = true;

		try {
			const res = await fetch(`${API}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emailOrPhone, password: password?.value || '' })
			});

			const text = await res.text();
			let json = null; try { json = JSON.parse(text); } catch {}

			if (!res.ok || (json && json.ok === false)) {
				const msg = (json && (json.message || json.error || json.detail)) || text || `HTTP ${res.status}`;
				if (formError) { formError.textContent = msg; formError.style.display = 'block'; }

				// highlight cơ bản theo từ khoá (không cần chi tiết)
				const m = (msg || '').toLowerCase();
				clearFieldError(passwordBox, errPassword);
				clearFieldError(identBox, errIdent);
				if (m.includes('password') || m.includes('mật khẩu')) {
					showFieldError(passwordBox, errPassword, 'Sai mật khẩu.');
					password?.focus();
				} else if (m.includes('email') || m.includes('phone') || m.includes('số') || m.includes('username') || m.includes('không tìm thấy') || m.includes('không khớp')) {
					showFieldError(identBox, errIdent, 'Thông tin định danh không hợp lệ.');
					ident?.focus();
				}

				formWrap?.classList.remove('shake'); void formWrap?.offsetWidth; formWrap?.classList.add('shake');
				return;
			}

			// success
			const token = json?.data?.accessToken || json?.accessToken;
			if (token) localStorage.setItem('accessToken', token);
			if (formSuccess) { formSuccess.textContent = 'Đăng nhập thành công. Đang chuyển hướng…'; formSuccess.style.display = 'block'; }
			window.location.href = HOME_URL;
		} catch (err) {
			if (formError) { formError.textContent = err?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.'; formError.style.display = 'block'; }
			formWrap?.classList.remove('shake'); void formWrap?.offsetWidth; formWrap?.classList.add('shake');
		} finally {
			signInBtn?.classList.remove('loading');
			if (signInBtn) signInBtn.disabled = false;
		}
	});

	guestBtn?.addEventListener('click', () => { window.location.href = `${HOME_URL}?guest=1`; });

	// Init mode
	setMode('email');
})();
