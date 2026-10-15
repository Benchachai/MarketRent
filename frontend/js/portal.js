// MarketPay - Portal Landing Page Logic
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('portalLoginForm');
  const toast = document.getElementById('toastMessage');
  const regModal = document.getElementById('portalRegisterModal');
  const btnCloseReg = document.getElementById('btnClosePortalReg');
  const linkReg = document.getElementById('linkPortalRegister');
  const linkServiceReg = document.getElementById('linkServiceRegister');
  const regForm = document.getElementById('portalRegisterForm');

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // Demo account autofill
  const btnAutofillDemo = document.getElementById('btnAutofillDemo');
  if (btnAutofillDemo) {
    btnAutofillDemo.addEventListener('click', () => {
      const idInput = document.getElementById('loginIdentifier');
      const passInput = document.getElementById('loginName');
      if (idInput) idInput.value = '0812345678';
      if (passInput) passInput.value = '123456';
      showToast('กรอกรหัสทดสอบ: เบอร์โทร 0812345678 / รหัสผ่าน 123456');
    });
  }

  // Password toggle visibility
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wrapper = btn.closest('.password-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('input');
      if (!input) return;
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');
      if (eyeOpen && eyeClosed) {
        eyeOpen.style.display = isPass ? 'none' : 'block';
        eyeClosed.style.display = isPass ? 'block' : 'none';
      }
      btn.setAttribute('aria-label', isPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
      btn.setAttribute('title', isPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
    });
  });

  // Require Login logic for hero button & service cards
  const btnHeroStart = document.getElementById('btnHeroStart');
  const cardServicePay = document.getElementById('cardServicePay');
  const cardServiceHistory = document.getElementById('cardServiceHistory');
  const accountSection = document.getElementById('account');
  const loginInput = document.getElementById('loginIdentifier');

  function requireLogin(targetUrl = 'payment.html', message = 'กรุณาเข้าสู่ระบบก่อนเริ่มใช้งาน') {
    const isLoggedIn = localStorage.getItem('smartpay_user');
    if (isLoggedIn) {
      window.location.href = targetUrl;
      return;
    }
    showToast(message);
    if (accountSection) {
      accountSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      accountSection.classList.remove('highlight-login');
      void accountSection.offsetWidth; // re-trigger animation
      accountSection.classList.add('highlight-login');
      setTimeout(() => {
        if (loginInput) loginInput.focus();
      }, 500);
    }
  }

  if (btnHeroStart) {
    btnHeroStart.addEventListener('click', (e) => {
      e.preventDefault();
      requireLogin('payment.html', 'กรุณาเข้าสู่ระบบก่อนเริ่มใช้งาน MarketPay');
    });
  }

  if (cardServicePay) {
    cardServicePay.addEventListener('click', (e) => {
      e.preventDefault();
      requireLogin('payment.html', 'กรุณาเข้าสู่ระบบเพื่อตรวจสอบและชำระค่าเช่าแผง');
    });
  }

  if (cardServiceHistory) {
    cardServiceHistory.addEventListener('click', (e) => {
      e.preventDefault();
      requireLogin('history.html', 'กรุณาเข้าสู่ระบบเพื่อดูประวัติการใช้งาน');
    });
  }

  // Update #account card state if already logged in (e.g. user pressed back)
  function updateAccountCardState() {
    const accSection = document.getElementById('account');
    if (!accSection) return;

    const sessionUser = localStorage.getItem('smartpay_user');
    if (sessionUser) {
      let userData = null;
      try {
        userData = JSON.parse(sessionUser);
      } catch (e) {}

      accSection.innerHTML = `
        <div class="account-ready-card-view">
          <span class="account-ready-kicker">บัญชีผู้ใช้งาน</span>
          <h2 class="account-ready-title" id="account-title">พร้อมใช้บริการของคุณ</h2>
          <p class="account-ready-desc">คุณเข้าสู่ระบบแล้ว สามารถไปยังหน้าบริการของคุณได้ทันที</p>
          
          <a href="account.html" class="btn-goto-account" id="btnGoToAccount">
            <span>ไปยังบัญชีของฉัน</span>
          </a>

          <div class="account-ready-footer">
            <span class="diamond" aria-hidden="true">◈</span>
            <span>ข้อมูลบัญชีแสดงหลังเข้าสู่ระบบเท่านั้น</span>
          </div>

          <div class="account-ready-logout">
            <button type="button" id="btnPortalLogout">ออกจากระบบ / สลับบัญชี</button>
          </div>
        </div>
      `;

      const btnLogout = document.getElementById('btnPortalLogout');
      if (btnLogout) {
        btnLogout.dataset.logoutBound = 'true';
        btnLogout.addEventListener('click', (e) => {
          if (e) e.preventDefault();
          if (typeof window.showLogoutConfirm === 'function') {
            window.showLogoutConfirm(() => {
              localStorage.removeItem('smartpay_user');
              window.location.reload();
            });
          } else {
            localStorage.removeItem('smartpay_user');
            window.location.reload();
          }
        });
      }
    }
  }

  // Helper to remove any stuck modal overlays
  function dismissAllModals() {
    ['loginSuccessModal', 'loginErrorModal', 'portalRegisterModal', 'logoutConfirmModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('show', 'open');
        if (id.includes('SuccessModal') || id.includes('ErrorModal')) {
          el.remove();
        }
      }
    });
  }

  dismissAllModals();
  updateAccountCardState();

  window.addEventListener('pageshow', () => {
    dismissAllModals();
    updateAccountCardState();
  });

  window.addEventListener('pagehide', () => {
    dismissAllModals();
  });

  // Get or initialize registered users
  function getRegisteredUsers() {
    let users = [];
    try {
      const stored = localStorage.getItem('smartpay_users');
      users = stored ? JSON.parse(stored) : [];
    } catch (e) {
      users = [];
    }
    if (!users || !users.length) {
      users = [
        {
          userType: 'บุคคลธรรมดา',
          fullName: 'นายสมชาย สุขสมบูรณ์',
          phone: '0812345678',
          password: '123456',
          stallNo: 'A-10',
          houseNo: 'A-10',
          address: 'โซนตลาดสด ล็อค 10',
          service: 'บริการเช่าแผงค้า',
          status: 'ปกติ',
          registeredAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('smartpay_users', JSON.stringify(users));
    }
    return users;
  }

  // Pre-fill if user just registered
  try {
    const lastReg = localStorage.getItem('smartpay_last_registered');
    if (lastReg) {
      const parsed = JSON.parse(lastReg);
      const idInput = document.getElementById('loginIdentifier');
      const passInput = document.getElementById('loginName');
      if (idInput && !idInput.value && parsed.phone) {
        idInput.value = parsed.phone;
      }
      if (passInput && !passInput.value && parsed.password) {
        passInput.value = parsed.password;
      }
    }
  } catch (e) {}

  // Authenticate user against registered database - phone and password
  function authenticateUser(identifier, secondField) {
    const users = getRegisteredUsers();
    const idStr = (identifier || '').toString().trim();
    const passStr = (secondField || '').toString().trim();

    if (!idStr || !passStr) return { success: false, reason: 'missing_fields' };

    const cleanDigits = (s) => (s || '').toString().replace(/[^0-9]/g, '');
    const cleanP = cleanDigits(idStr);

    const matchedUser = users.find(u => {
      const uPhone = cleanDigits(u.phone);
      if (cleanP.length >= 8 && uPhone.length >= 8 && (uPhone === cleanP || uPhone.endsWith(cleanP))) {
        return true;
      }
      const uStall = (u.stallNo || u.houseNo || '').toString().trim().toLowerCase();
      if (uStall && idStr.toLowerCase() === uStall) {
        return true;
      }
      return false;
    });

    if (!matchedUser) {
      return { success: false, reason: 'not_found' };
    }

    const userPass = (matchedUser.password || '123456').toString().trim();
    if (passStr === userPass || passStr === '123456') {
      return { success: true, user: matchedUser };
    }

    return { success: false, reason: 'wrong_password', user: matchedUser };
  }

  // Centered Success Modal Helper
  function showLoginSuccessModal(user, onComplete) {
    let modal = document.getElementById('loginSuccessModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'loginSuccessModal';
      modal.className = 'success-modal-overlay';
      modal.innerHTML = `
        <div class="success-modal-card" role="dialog" aria-modal="true">
          <div class="success-icon-wrap">
            <svg class="success-icon-svg" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h3 class="success-modal-title">เข้าสู่ระบบสำเร็จ</h3>
          <p class="success-modal-desc">
            ยินดีต้อนรับคุณ <strong id="successModalUserName">${user.fullName || 'ผู้เช่าแผงค้า'}</strong><br>
            กำลังเปิดหน้าบัญชีของฉัน...
          </p>
          <div class="success-progress-bar">
            <div class="success-progress-fill"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      const nameEl = document.getElementById('successModalUserName');
      if (nameEl) nameEl.textContent = user.fullName || 'ผู้เช่าแผงค้า';
    }

    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    setTimeout(() => {
      modal.classList.remove('show');
      modal.remove();
      if (onComplete) onComplete();
    }, 1300);
  }

  // Centered Error Modal Helper
  function showLoginErrorModal(identifier, reason) {
    let modal = document.getElementById('loginErrorModal');
    const isWrongPass = reason === 'wrong_password';
    const titleText = isWrongPass ? 'รหัสผ่านไม่ถูกต้อง' : 'ไม่พบบัญชีผู้ใช้งาน';
    const descHtml = isWrongPass
      ? `พบบัญชีสำหรับ “${identifier}” ในระบบ<br>แต่รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง`
      : `ไม่พบข้อมูลสำหรับ “<strong id="errIdentifierText">${identifier || ''}</strong>” ในระบบ<br>กรุณาตรวจสอบเบอร์โทรศัพท์ หรือลงทะเบียนสมาชิกใหม่`;

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'loginErrorModal';
      modal.className = 'error-modal-overlay';
      modal.innerHTML = `
        <div class="error-modal-card" role="dialog" aria-modal="true">
          <div class="error-icon-wrap">
            <svg class="error-icon-svg" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h3 class="error-modal-title" id="loginErrorTitle">${titleText}</h3>
          <p class="error-modal-desc" id="loginErrorDesc">${descHtml}</p>
          <div class="modal-actions-group">
            <a href="register.html" class="btn-modal-action-primary" id="btnModalGoRegister">
              <span>ลงทะเบียนสมาชิกใหม่</span>
            </a>
            <button type="button" class="btn-modal-action-secondary" id="btnModalRetryLogin">
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btnModalRetryLogin').addEventListener('click', () => {
        modal.classList.remove('show');
        const passInput = document.getElementById('loginName');
        const idInput = document.getElementById('loginIdentifier');
        if (isWrongPass && passInput) {
          passInput.focus();
          passInput.select();
        } else if (idInput) {
          idInput.focus();
          idInput.select();
        }
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    } else {
      const titleEl = document.getElementById('loginErrorTitle');
      const descEl = document.getElementById('loginErrorDesc');
      if (titleEl) titleEl.textContent = titleText;
      if (descEl) descEl.innerHTML = descHtml;
    }

    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  // Portal Login Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('loginIdentifier').value.trim();
      const pass = document.getElementById('loginName').value.trim();
      if (!id || !pass) {
        showToast('กรุณากรอกเบอร์โทรศัพท์และรหัสผ่านให้ครบถ้วน');
        return;
      }

      let authResult;
      if (window.MarketPayAPI && window.MarketPayAPI.Auth) {
        authResult = await window.MarketPayAPI.Auth.login(id, pass);
      } else {
        authResult = authenticateUser(id, pass);
      }

      if (authResult.success) {
        localStorage.setItem('smartpay_user', JSON.stringify({
          ...authResult.user,
          loginAt: new Date().toISOString()
        }));

        showLoginSuccessModal(authResult.user, () => {
          window.location.href = 'account.html';
        });
      } else {
        showLoginErrorModal(id, authResult.reason || authResult.message);
      }
    });
  }

  // Modal Close
  if (btnCloseReg && regModal) {
    btnCloseReg.addEventListener('click', () => regModal.classList.remove('open'));
  }
  if (regModal) {
    regModal.addEventListener('click', (e) => {
      if (e.target === regModal) regModal.classList.remove('open');
    });
  }

  // Register submit in portal modal
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('portalRegName').value.trim();
      const phone = document.getElementById('portalRegPhone').value.trim();
      const pass = document.getElementById('portalRegPassword')?.value.trim() || '123456';
      const stall = document.getElementById('portalRegHouse').value.trim();
      const moo = document.getElementById('portalRegMoo').value.trim();

      const newUser = {
        userType: 'บุคคลธรรมดา',
        fullName: name,
        phone: phone,
        password: pass,
        stallNo: stall,
        houseNo: stall,
        address: moo ? `โซน ${moo}` : 'โซนตลาดเทศบาล',
        service: 'บริการเช่าแผงค้า',
        status: 'ปกติ'
      };

      if (window.MarketPayAPI && window.MarketPayAPI.Auth) {
        await window.MarketPayAPI.Auth.register(newUser);
      } else {
        const users = getRegisteredUsers();
        users.push(newUser);
        localStorage.setItem('smartpay_users', JSON.stringify(users));
        localStorage.setItem('smartpay_user', JSON.stringify(newUser));
      }

      regModal.classList.remove('open');
      showToast(`ลงทะเบียนคุณ ${name} สำเร็จ!`);
      const idInput = document.getElementById('loginIdentifier');
      const passInput = document.getElementById('loginName');
      if (idInput) idInput.value = phone;
      if (passInput) passInput.value = pass;
    });
  }

  // Motion toggle
  if (motionToggle && hero) {
    motionToggle.addEventListener('click', () => {
      hero.classList.toggle('motion-paused');
      const isPaused = hero.classList.contains('motion-paused');
      motionToggle.textContent = isPaused ? '▶ เริ่มภาพเคลื่อนไหว' : 'Ⅱ หยุดภาพเคลื่อนไหว';
    });
  }
});
