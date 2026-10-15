/**
 * SmartPay - Logout Confirmation Modal Dialog
 * แสดงกล่องยืนยันการออกจากระบบตามดีไซน์มาตรฐาน SmartPay
 */
(function () {
  'use strict';

  function showLogoutConfirm(onConfirm) {
    let modal = document.getElementById('logoutConfirmModal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'logoutConfirmModal';
      modal.className = 'logout-modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'logoutModalTitle');
      modal.innerHTML = `
        <div class="logout-modal-card">
          <div class="logout-icon-wrap" aria-hidden="true">
            <svg class="logout-icon-svg" viewBox="0 0 40 40" width="38" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="20" y1="10" x2="20" y2="23" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round"/>
              <circle cx="20" cy="30" r="2.2" fill="#ea580c"/>
            </svg>
          </div>
          <h3 class="logout-modal-title" id="logoutModalTitle">ต้องการออกจากระบบ?</h3>
          <p class="logout-modal-desc">คุณต้องการออกจากระบบใช่หรือไม่</p>
          <div class="logout-modal-actions">
            <button type="button" class="btn-logout-cancel" id="btnCancelLogout">ยกเลิก</button>
            <button type="button" class="btn-logout-confirm" id="btnConfirmLogout">ออกจากระบบ</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => {
        modal.classList.remove('show');
      };

      // Close when clicking outside card (on overlay backdrop)
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      // Close when clicking cancel button
      const btnCancel = modal.querySelector('#btnCancelLogout');
      if (btnCancel) {
        btnCancel.addEventListener('click', closeModal);
      }

      // Close when pressing Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
          closeModal();
        }
      });
    }

    // Bind action to confirm button
    const btnConfirm = modal.querySelector('#btnConfirmLogout');
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    newBtnConfirm.addEventListener('click', () => {
      modal.classList.remove('show');
      if (typeof onConfirm === 'function') {
        onConfirm();
      } else {
        localStorage.removeItem('smartpay_user');
        window.location.href = 'index.html#account';
      }
    });

    // Trigger opening animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
      const btnCancel = modal.querySelector('#btnCancelLogout');
      if (btnCancel) btnCancel.focus();
    });
  }

  // Expose to window scope
  window.showLogoutConfirm = showLogoutConfirm;

  // Auto-bind fallback for any logout link or button found in DOM
  function bindLogoutTriggers() {
    const candidates = document.querySelectorAll(
      '#btnNavLogout, #btnPortalLogout, #btnPageLogout, .nav-btn-outline'
    );
    candidates.forEach((btn) => {
      const text = (btn.textContent || '').trim();
      if (text.includes('ออกจากระบบ') && !btn.dataset.logoutBound) {
        btn.dataset.logoutBound = 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showLogoutConfirm(() => {
            localStorage.removeItem('smartpay_user');
            const path = window.location.pathname;
            if (path.endsWith('login.html') || path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
              window.location.reload();
            } else {
              window.location.href = 'index.html#account';
            }
          });
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLogoutTriggers);
  } else {
    bindLogoutTriggers();
  }

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => bindLogoutTriggers());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
