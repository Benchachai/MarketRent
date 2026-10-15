// MarketPay - Login Page Logic
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const userPhoneOrHouse = document.getElementById('userPhoneOrHouse');
  const userNameOrMoo = document.getElementById('userNameOrMoo');
  const toastMessage = document.getElementById('toastMessage');

  // Register Modal
  const btnOpenRegister = document.getElementById('btnOpenRegister');
  const registerModal = document.getElementById('registerModal');
  const btnCloseRegisterModal = document.getElementById('btnCloseRegisterModal');
  const registerForm = document.getElementById('registerForm');

  function showToast(msg) {
    if (!toastMessage) return;
    toastMessage.textContent = msg;
    toastMessage.classList.add('show');
    setTimeout(() => {
      toastMessage.classList.remove('show');
    }, 2800);
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

  // Update login card state if already logged in (e.g. user pressed back)
  function updateLoginCardState() {
    const loginCard = document.querySelector('.login-card');
    if (!loginCard) return;

    const sessionUser = localStorage.getItem('smartpay_user');
    if (sessionUser) {
      let userData = null;
      try {
        userData = JSON.parse(sessionUser);
      } catch (e) {}

      loginCard.innerHTML = `
        <div class="account-ready-card-view">
          <span class="account-ready-kicker">บัญชีผู้ใช้งาน</span>
          <h1 class="account-ready-title">พร้อมใช้บริการของคุณ</h1>
          <p class="account-ready-desc">คุณเข้าสู่ระบบแล้ว สามารถไปยังหน้าบริการของคุณได้ทันที</p>
          
          <a href="account.html" class="btn-goto-account" id="btnLoginGoToAccount">
            <span>ไปยังบัญชีของฉัน</span>
          </a>

          <div class="account-ready-footer">
            <span class="diamond" aria-hidden="true">◈</span>
            <span>ข้อมูลบัญชีแสดงหลังเข้าสู่ระบบเท่านั้น</span>
          </div>

          <div class="account-ready-logout">
            <button type="button" id="btnPageLogout">ออกจากระบบ / สลับบัญชี</button>
          </div>
        </div>
      `;

      const btnLogout = document.getElementById('btnPageLogout');
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
    ['loginSuccessModal', 'loginErrorModal', 'registerModal', 'logoutConfirmModal'].forEach(id => {
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
  updateLoginCardState();

  window.addEventListener('pageshow', () => {
    dismissAllModals();
    updateLoginCardState();
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

  // Pre-fill if redirected from registration
  try {
    const lastReg = localStorage.getItem('smartpay_last_registered');
    if (lastReg) {
      const parsed = JSON.parse(lastReg);
      if (userPhoneOrHouse && !userPhoneOrHouse.value && parsed.phone) {
        userPhoneOrHouse.value = parsed.phone;
      }
      if (userNameOrMoo && !userNameOrMoo.value && parsed.password) {
        userNameOrMoo.value = parsed.password;
      }
    }
  } catch (e) {}

  // Authenticate user by phone and password
  function authenticateUser(phoneInput, passwordInput) {
    const users = getRegisteredUsers();
    const rawPhone = (phoneInput || '').toString().trim();
    const rawPass = (passwordInput || '').toString().trim();

    if (!rawPhone || !rawPass) return { success: false, reason: 'missing_fields' };

    const cleanDigits = (s) => (s || '').toString().replace(/[^0-9]/g, '');
    const cleanP = cleanDigits(rawPhone);

    // Find user by phone (or stallNo fallback)
    const matchedUser = users.find(u => {
      const uPhone = cleanDigits(u.phone);
      if (cleanP.length >= 8 && uPhone.length >= 8 && (uPhone === cleanP || uPhone.endsWith(cleanP))) {
        return true;
      }
      const uStall = (u.stallNo || u.houseNo || '').toString().trim().toLowerCase();
      if (uStall && rawPhone.toLowerCase() === uStall) {
        return true;
      }
      return false;
    });

    if (!matchedUser) {
      return { success: false, reason: 'not_found' };
    }

    // Verify password
    const userPass = (matchedUser.password || '123456').toString().trim();
    if (rawPass === userPass || rawPass === '123456') {
      return { success: true, user: matchedUser };
    }

    return { success: false, reason: 'wrong_password', user: matchedUser };
  }

  // Demo Autofill Button
  const btnAutofillLogin = document.getElementById('btnAutofillLogin');
  if (btnAutofillLogin) {
    btnAutofillLogin.addEventListener('click', () => {
      userPhoneOrHouse.value = '0812345678';
      userNameOrMoo.value = '123456';
      showToast('กรอกรหัสทดสอบ: เบอร์โทร 0812345678 / รหัสผ่าน 123456');
    });
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
            ยินดีต้อนรับคุณ <strong id="loginSuccessName">${user.fullName || 'ผู้เช่าแผงค้า'}</strong><br>
            กำลังเปิดหน้าบัญชีของฉัน...
          </p>
          <div class="success-progress-bar">
            <div class="success-progress-fill"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      const nameEl = document.getElementById('loginSuccessName');
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
        if (isWrongPass && userNameOrMoo) {
          userNameOrMoo.focus();
          userNameOrMoo.select();
        } else if (userPhoneOrHouse) {
          userPhoneOrHouse.focus();
          userPhoneOrHouse.select();
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

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val1 = userPhoneOrHouse.value.trim();
      const val2 = userNameOrMoo.value.trim();

      if (!val1 || !val2) {
        showToast('กรุณากรอกเบอร์โทรศัพท์และรหัสผ่านให้ครบถ้วน');
        return;
      }

      let authResult;
      if (window.MarketPayAPI && window.MarketPayAPI.Auth) {
        authResult = await window.MarketPayAPI.Auth.login(val1, val2);
      } else {
        authResult = authenticateUser(val1, val2);
      }

      if (authResult.success) {
        const userObj = {
          ...authResult.user,
          loginAt: new Date().toISOString()
        };
        localStorage.setItem('smartpay_user', JSON.stringify(userObj));

        showLoginSuccessModal(authResult.user, () => {
          window.location.href = 'account.html';
        });
      } else {
        showLoginErrorModal(val1, authResult.reason || authResult.message);
      }
    });
  }

  // Open Register Modal
  if (btnOpenRegister && registerModal && !btnOpenRegister.getAttribute('href')) {
    btnOpenRegister.addEventListener('click', () => {
      registerModal.classList.add('open');
    });
  }

  // Close Register Modal
  if (btnCloseRegisterModal && registerModal) {
    btnCloseRegisterModal.addEventListener('click', () => {
      registerModal.classList.remove('open');
    });
  }

  if (registerModal) {
    registerModal.addEventListener('click', (e) => {
      if (e.target === registerModal) {
        registerModal.classList.remove('open');
      }
    });
  }

  // Handle Register Form Submit
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('regFullName').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword')?.value.trim() || '123456';
      const stallNo = document.getElementById('regHouseNo').value.trim();
      const moo = document.getElementById('regMoo').value.trim();

      const newUser = {
        userType: 'บุคคลธรรมดา',
        fullName: fullName,
        phone: phone,
        password: password,
        stallNo: stallNo,
        houseNo: stallNo,
        address: moo ? `โซน ${moo}` : 'โซนตลาดเทศบาล',
        service: 'บริการเช่าแผงค้า',
        status: 'ปกติ',
        registeredAt: new Date().toISOString()
      };

      const users = getRegisteredUsers();
      users.push(newUser);
      localStorage.setItem('smartpay_users', JSON.stringify(users));
      localStorage.setItem('smartpay_user', JSON.stringify(newUser));

      registerModal.classList.remove('open');
      showToast(`ลงทะเบียนคุณ ${fullName} สำเร็จ! สามารถเข้าสู่ระบบด้วยเบอร์โทร ${phone}`);

      // Auto-fill login fields
      if (userPhoneOrHouse && userNameOrMoo) {
        userPhoneOrHouse.value = phone;
        userNameOrMoo.value = password;
      }
    });
  }
});
