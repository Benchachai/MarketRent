// SmartPay - Payment Selection Page Logic
document.addEventListener('DOMContentLoaded', () => {
  // Auth Check: Require login before accessing payment page
  const sessionUser = localStorage.getItem('smartpay_user');
  if (!sessionUser) {
    window.location.href = 'index.html#account';
    return;
  }

  // Populate dynamic profile from authenticated user
  try {
    const currentUser = JSON.parse(sessionUser);
    if (currentUser) {
      // 1. Profile Name
      const profileNameEl = document.querySelector('.profile-name');
      if (profileNameEl && currentUser.fullName) {
        profileNameEl.textContent = currentUser.fullName;
      }

      // 2. Profile Tags (Stall No / Zone / User Type)
      const profileTagsContainer = document.querySelector('.profile-tags');
      if (profileTagsContainer) {
        const rawStall = currentUser.stallNo || currentUser.houseNo || '';
        const isStallSet = rawStall && rawStall !== '-';
        const stallLabel = isStallSet ? (rawStall.startsWith('แผง') ? rawStall : `แผงค้า ${rawStall}`) : '';
        const addrVal = (currentUser.address && currentUser.address !== 'ระบุที่หน้าชำระเงิน') ? currentUser.address : (currentUser.moo ? `โซน ${currentUser.moo}` : '');
        const userTypeVal = currentUser.userType || 'บุคคลธรรมดา';

        let tagsHtml = '';
        if (stallLabel) tagsHtml += `<span class="profile-pill">${stallLabel}</span>`;
        if (addrVal) tagsHtml += `<span class="profile-pill">${addrVal}</span>`;
        if (userTypeVal) tagsHtml += `<span class="profile-pill">${userTypeVal}</span>`;
        profileTagsContainer.innerHTML = tagsHtml;
      }

      // 3. Service Rate Breakdown description
      const rateBreakdown = document.querySelector('.rate-breakdown');
      if (rateBreakdown) {
        rateBreakdown.textContent = `${currentUser.userType || 'บุคคลธรรมดา'} · ค่าเช่าแผง 1,950.00 + ค่าเก็บขยะ 50.00 บาท (เดือนละ 2,000 บาท)`;
      }
    }
  } catch (err) {
    console.error('Error loading current user data:', err);
  }

  // Logout handler with confirmation modal
  const btnNavLogout = document.getElementById('btnNavLogout');
  if (btnNavLogout) {
    btnNavLogout.dataset.logoutBound = 'true';
    btnNavLogout.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.showLogoutConfirm === 'function') {
        window.showLogoutConfirm(() => {
          localStorage.removeItem('smartpay_user');
          window.location.href = 'index.html#account';
        });
      } else {
        localStorage.removeItem('smartpay_user');
        window.location.href = 'index.html#account';
      }
    });
  }

  // Modal elements
  const paymentModal = document.getElementById('paymentModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const modalAmount = document.getElementById('modalAmount');
  const modalItemsList = document.getElementById('modalItemsList');
  const btnConfirmPay = document.getElementById('btnConfirmPay');
  const toastMessage = document.getElementById('toastMessage');

  // Quick Action Buttons
  const btnGarbage = document.getElementById('btnGarbage');
  const btnComplaint = document.getElementById('btnComplaint');
  const btnSubHistory = document.getElementById('btnSubHistory');
  const linkNoticeReport = document.getElementById('linkNoticeReport');

  let currentSlipData = null;

  // Active transaction data
  let activePaymentData = {
    stallNo: 'แผงค้า A-10',
    zone: 'โซนตลาดสด ล็อค 10',
    payerName: 'นายสมชาย สุขสมบูรณ์',
    phone: '0812345678',
    totalAmount: 50,
    remark: 'ค่าเช่าแผงค้า'
  };

  let cachedStallsStatus = [];
  const manualStallNo = document.getElementById('manualStallNo');
  const manualZone = document.getElementById('manualZone');
  const manualPayerName = document.getElementById('manualPayerName');
  const manualPhone = document.getElementById('manualPhone');
  const stallOccupancyHint = document.getElementById('stallOccupancyHint');

  function updateZoneAndHint(selectedStall) {
    if (!selectedStall) return;
    const match = selectedStall.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 1;
    if (manualZone) {
      manualZone.value = `ล็อค ${num}`;
    }

    if (stallOccupancyHint) {
      const st = cachedStallsStatus.find(s => s.stallNo === selectedStall);
      if (st && st.isSelf) {
        stallOccupancyHint.innerHTML = `<span style="color:#0284c7;">✓ แผงค้าประจำของคุณ (เปิดใช้งานอยู่)</span>`;
      } else if (st && st.isOccupied) {
        stallOccupancyHint.innerHTML = `<span style="color:#ef4444;">⚠️ แผงค้านี้มีผู้เช่าแล้ว ไม่สามารถเลือกได้</span>`;
      } else {
        stallOccupancyHint.innerHTML = `<span style="color:#10b981;">✓ แผงค้านี้ว่าง สามารถเลือกใช้งานและชำระเงินได้</span>`;
      }
    }
  }

  // Populate manual inputs from currentUser & load dynamic stall occupancy
  (async function initPaymentForm() {
    let userObj = null;
    try {
      userObj = JSON.parse(sessionUser);
    } catch (e) {}

    const pName = userObj?.fullName || '';
    const pPhone = userObj?.phone || '';
    if (manualPayerName && pName) manualPayerName.value = pName;
    if (manualPhone && pPhone) manualPhone.value = pPhone;

    // Load dynamic stall occupancy status from API / fallback
    if (window.MarketPayAPI && window.MarketPayAPI.Payments && window.MarketPayAPI.Payments.getStallsStatus) {
      cachedStallsStatus = await window.MarketPayAPI.Payments.getStallsStatus(pPhone);
    }

    const rawStall = userObj?.stallNo || '';
    const hasValidExistingStall = rawStall && rawStall !== '-' && rawStall !== 'ระบุที่หน้าชำระเงิน';
    const existingStallMatch = hasValidExistingStall ? rawStall.match(/A-\d+/i) : null;
    const userExistingStall = existingStallMatch ? existingStallMatch[0].toUpperCase() : (hasValidExistingStall ? rawStall : null);

    if (manualStallNo && cachedStallsStatus.length > 0) {
      let optionsHtml = '';
      let firstAvailableStall = null;

      cachedStallsStatus.forEach(s => {
        const isSelf = s.isSelf || (userExistingStall && s.stallNo === userExistingStall);
        if (s.isOccupied && !isSelf) {
          optionsHtml += `<option value="${s.stallNo}" disabled style="color:#94a3b8; background:#f8fafc;">${s.stallNo} (${s.zone}) - ✕ มีผู้เช่าแล้ว</option>`;
        } else if (isSelf) {
          optionsHtml += `<option value="${s.stallNo}" style="color:#1e40af; font-weight:700;">${s.stallNo} (${s.zone}) - ✓ แผงค้าของคุณ</option>`;
          if (!firstAvailableStall) firstAvailableStall = s.stallNo;
        } else {
          optionsHtml += `<option value="${s.stallNo}">${s.stallNo} (${s.zone}) - ว่าง (เลือกได้)</option>`;
          if (!firstAvailableStall) firstAvailableStall = s.stallNo;
        }
      });

      manualStallNo.innerHTML = optionsHtml;

      // Select user's stall if assigned, otherwise first available (never force A-10 on new users!)
      let targetStall = userExistingStall;
      const isTargetAvailable = targetStall && cachedStallsStatus.some(s => s.stallNo === targetStall && (!s.isOccupied || s.isSelf));
      if (!isTargetAvailable) {
        targetStall = firstAvailableStall || 'A-1';
      }

      manualStallNo.value = targetStall;
      updateZoneAndHint(targetStall);
    } else if (manualStallNo) {
      updateZoneAndHint(manualStallNo.value);
    }

    const currentStallVal = manualStallNo?.value || 'A-1';
    const currentZoneVal = manualZone?.value || 'ล็อค 1';
    activePaymentData.stallNo = currentStallVal.startsWith('แผง') ? currentStallVal : `แผงค้า ${currentStallVal}`;
    activePaymentData.zone = currentZoneVal.includes('โซน') ? currentZoneVal : `โซนตลาดสด ${currentZoneVal}`;
    activePaymentData.payerName = pName || 'ผู้เช่าแผงค้า';
    activePaymentData.phone = pPhone;
  })();

  if (manualStallNo) {
    manualStallNo.addEventListener('change', () => {
      updateZoneAndHint(manualStallNo.value);
    });
  }

  if (manualZone) {
    manualZone.addEventListener('change', () => {
      const match = (manualZone.value || '').match(/\d+/);
      if (match && manualStallNo) {
        const num = parseInt(match[0], 10);
        const target = `A-${num}`;
        const opt = Array.from(manualStallNo.options).find(o => o.value === target);
        if (opt && !opt.disabled) {
          manualStallNo.value = target;
          updateZoneAndHint(target);
        } else if (opt && opt.disabled) {
          showToast(`⚠️ แผงค้า ${target} มีผู้เช่าแล้ว ไม่สามารถเลือกล็อคซ้ำได้`);
          const curMatch = (manualStallNo.value || '').match(/\d+/);
          manualZone.value = `ล็อค ${curMatch ? curMatch[0] : 1}`;
        }
      }
    });
  }

  function showToast(msg) {
    if (!toastMessage) return;
    toastMessage.textContent = msg;
    toastMessage.classList.add('show');
    setTimeout(() => {
      toastMessage.classList.remove('show');
    }, 2800);
  }

  // 12 Months (ม.ค. - ธ.ค. เรียงลำดับ ไม่มี พ.ศ.)
  const MONTHS_LIST = [
    { key: 'ม.ค.', shortName: 'ม.ค.', fullName: 'มกราคม' },
    { key: 'ก.พ.', shortName: 'ก.พ.', fullName: 'กุมภาพันธ์' },
    { key: 'มี.ค.', shortName: 'มี.ค.', fullName: 'มีนาคม' },
    { key: 'เม.ย.', shortName: 'เม.ย.', fullName: 'เมษายน' },
    { key: 'พ.ค.', shortName: 'พ.ค.', fullName: 'พฤษภาคม' },
    { key: 'มิ.ย.', shortName: 'มิ.ย.', fullName: 'มิถุนายน' },
    { key: 'ก.ค.', shortName: 'ก.ค.', fullName: 'กรกฎาคม' },
    { key: 'ส.ค.', shortName: 'ส.ค.', fullName: 'สิงหาคม' },
    { key: 'ก.ย.', shortName: 'ก.ย.', fullName: 'กันยายน' },
    { key: 'ต.ค.', shortName: 'ต.ค.', fullName: 'ตุลาคม' },
    { key: 'พ.ย.', shortName: 'พ.ย.', fullName: 'พฤศจิกายน' },
    { key: 'ธ.ค.', shortName: 'ธ.ค.', fullName: 'ธันวาคม' }
  ];

  const RATE_PER_MONTH = 2000;
  const RENT_PORTION = 1950;
  const TRASH_PORTION = 50;
  let selectedMonthKeys = [];

  function getPaidMonths() {
    try {
      return JSON.parse(localStorage.getItem('smartpay_paid_months') || '[]');
    } catch (e) {
      return [];
    }
  }

  // Manual Form Elements & Interactions
  const formManualPay = document.getElementById('formManualPay');
  const manualAmountInput = document.getElementById('manualAmountInput');
  const manualRemark = document.getElementById('manualRemark');
  const manualSummaryPeriodText = document.getElementById('manualSummaryPeriodText');
  const manualSummaryTotalText = document.getElementById('manualSummaryTotalText');
  const btnAmountText = document.getElementById('btnAmountText');
  const monthSelectionGrid = document.getElementById('monthSelectionGrid');
  const selectedMonthsCountText = document.getElementById('selectedMonthsCountText');
  const btnSelectAllMonths = document.getElementById('btnSelectAllMonths');

  function updateSummaryTotals() {
    const rawVal = manualAmountInput?.value?.trim();
    const amt = parseFloat(rawVal) || 0;
    const remark = manualRemark?.value?.trim() || 'ค่าเช่าแผง 1950 + ค่าเก็บขยะ 50';
    if (manualSummaryPeriodText) manualSummaryPeriodText.textContent = remark;
    if (manualSummaryTotalText) {
      manualSummaryTotalText.textContent = rawVal && amt > 0 ? `${amt.toLocaleString('th-TH')}.00 บาท` : '0.00 บาท';
    }
    if (btnAmountText) {
      btnAmountText.textContent = rawVal && amt > 0 ? `${amt.toLocaleString('th-TH')}.00` : '0.00';
    }
  }

  function renderMonthGrid() {
    if (!monthSelectionGrid) return;
    const paidList = getPaidMonths();

    monthSelectionGrid.innerHTML = '';
    MONTHS_LIST.forEach(m => {
      const isPaid = paidList.includes(m.key) || paidList.some(k => k.includes(m.shortName) || k.includes(m.fullName));
      const isSelected = selectedMonthKeys.includes(m.key);

      const card = document.createElement('div');
      card.className = `month-card ${isSelected ? 'selected' : ''} ${isPaid ? 'month-card-disabled' : ''}`;
      card.dataset.key = m.key;

      card.innerHTML = `
        <div class="month-card-header">
          <span class="month-card-name">${m.shortName}</span>
          <span class="month-card-check">${isSelected ? '✓' : ''}</span>
        </div>
        ${isPaid ? '<div class="month-card-paid">✓ ชำระแล้ว</div>' : ''}
      `;

      card.addEventListener('click', () => {
        if (isPaid) {
          showToast(`ค่าเช่าแผงค้ารอบเดือน ${m.fullName} มีประวัติชำระเงินแล้ว`);
          return;
        }
        toggleMonth(m.key);
      });

      monthSelectionGrid.appendChild(card);
    });

    updateCalculation();
  }

  async function syncAndRenderMonthGrid() {
    try {
      if (window.MarketPayAPI && window.MarketPayAPI.Payments) {
        const currentUser = (window.MarketPayAPI.Auth && window.MarketPayAPI.Auth.getCurrentUser()) || null;
        const phone = currentUser ? currentUser.phone : null;
        const paidList = await window.MarketPayAPI.Payments.getPaidMonths(phone);
        if (Array.isArray(paidList)) {
          localStorage.setItem('smartpay_paid_months', JSON.stringify(paidList));
        }
      } else {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        const activeMonths = [];
        payments.forEach(p => {
          if (!(p.status || '').includes('ปฏิเสธ')) {
            const keys = p.monthKeys || p.months || [];
            keys.forEach(k => {
              if (!activeMonths.includes(k)) activeMonths.push(k);
            });
          }
        });
        localStorage.setItem('smartpay_paid_months', JSON.stringify(activeMonths));
      }
    } catch (err) {
      console.warn('Sync paid months error:', err);
    }
    renderMonthGrid();
  }

  function toggleMonth(key) {
    if (selectedMonthKeys.includes(key)) {
      selectedMonthKeys = selectedMonthKeys.filter(k => k !== key);
    } else {
      selectedMonthKeys.push(key);
    }
    if (monthSelectionGrid) {
      monthSelectionGrid.classList.remove('error-shake');
    }
    renderMonthGrid();
  }

  function updateCalculation() {
    const count = selectedMonthKeys.length;

    // Selected month full names
    const selectedNames = MONTHS_LIST
      .filter(m => selectedMonthKeys.includes(m.key))
      .map(m => m.fullName);

    if (selectedMonthsCountText) {
      if (count === 0) {
        selectedMonthsCountText.innerHTML = '<span style="color:#ef4444; font-weight:600;">ยังไม่ได้เลือกรอบเดือน (กรุณาเลือกอย่างน้อย 1 เดือน)</span>';
      } else if (count === 1) {
        selectedMonthsCountText.innerHTML = `<span style="color:#ea580c; font-weight:600;">เลือกรอบเดือน: ${selectedNames[0]}</span> <span style="color:#10b981; font-weight:700;">(2,000 บาท)</span>`;
      } else {
        selectedMonthsCountText.innerHTML = `<span style="color:#ea580c; font-weight:600;">เลือกแล้ว ${count} เดือน: ${selectedNames.join(', ')}</span> <span style="color:#10b981; font-weight:700;">(${(count * RATE_PER_MONTH).toLocaleString('th-TH')} บาท)</span>`;
      }
    }

    if (btnSelectAllMonths) {
      btnSelectAllMonths.textContent = (count === MONTHS_LIST.length && count > 0)
        ? 'ยกเลิกการเลือกทั้งหมด'
        : 'เลือกเดือนทั้งหมด';
    }

    // Auto-calculate amount and populate into input (2,000 baht / month)
    if (manualAmountInput) {
      if (count > 0) {
        manualAmountInput.value = count * RATE_PER_MONTH;
      } else {
        manualAmountInput.value = '';
      }
    }

    let remarkText = 'ค่าเช่าแผง 1950 + ค่าเก็บขยะ 50';
    if (count > 1) {
      remarkText = `ค่าเช่าแผง ${RENT_PORTION * count} + ค่าเก็บขยะ ${TRASH_PORTION * count} (ค่าเช่าแผง 1950 + ค่าเก็บขยะ 50 x ${count} เดือน)`;
    }

    if (manualRemark) {
      manualRemark.value = remarkText;
    }

    updateSummaryTotals();
  }

  if (manualAmountInput) {
    manualAmountInput.addEventListener('input', () => {
      updateSummaryTotals();
    });
  }

  if (btnSelectAllMonths) {
    btnSelectAllMonths.addEventListener('click', () => {
      if (selectedMonthKeys.length === MONTHS_LIST.length) {
        selectedMonthKeys = [];
      } else {
        selectedMonthKeys = MONTHS_LIST.map(m => m.key);
      }
      if (monthSelectionGrid) {
        monthSelectionGrid.classList.remove('error-shake');
      }
      renderMonthGrid();
    });
  }

  if (manualRemark) {
    manualRemark.addEventListener('input', () => {
      manualRemark.dataset.userEdited = 'true';
      if (manualSummaryPeriodText) manualSummaryPeriodText.textContent = manualRemark.value.trim() || 'ค่าเช่าแผง 1950 + ค่าเก็บขยะ 50';
    });
  }

  // Initialize month selection grid
  renderMonthGrid();
  syncAndRenderMonthGrid();

  // Re-sync when tab gains focus or localStorage is updated by admin
  window.addEventListener('storage', (e) => {
    if (e.key === 'smartpay_payments' || e.key === 'smartpay_paid_months') {
      syncAndRenderMonthGrid();
    }
  });

  window.addEventListener('focus', () => {
    syncAndRenderMonthGrid();
  });

  // Handle Manual Payment Form Submit
  if (formManualPay) {
    formManualPay.addEventListener('submit', (e) => {
      e.preventDefault();

      // บังคับให้เลือกเดือนก่อนชำระเงิน
      if (selectedMonthKeys.length === 0) {
        showToast('กรุณาเลือกรอบเดือนที่ต้องการชำระอย่างน้อย 1 เดือน');
        if (monthSelectionGrid) {
          monthSelectionGrid.classList.remove('error-shake');
          void monthSelectionGrid.offsetWidth; // trigger reflow
          monthSelectionGrid.classList.add('error-shake');
          monthSelectionGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const amount = parseFloat(manualAmountInput?.value) || 0;
      if (amount <= 0) {
        showToast('กรุณาระบุจำนวนเงินที่ต้องการชำระ');
        manualAmountInput?.focus();
        return;
      }

      const rawStall = document.getElementById('manualStallNo')?.value.trim() || 'A-1';

      // Validate stall occupancy conflict
      const stStatus = cachedStallsStatus.find(s => s.stallNo === rawStall);
      if (stStatus && stStatus.isOccupied && !stStatus.isSelf) {
        showToast(`⚠️ แผงค้า ${rawStall} มีผู้เช่าแล้ว ไม่สามารถเลือกได้ กรุณาเลือกล็อคที่ยังว่าง`);
        return;
      }

      const stallNo = rawStall.startsWith('แผง') ? rawStall : `แผงค้า ${rawStall}`;
      const zone = document.getElementById('manualZone')?.value.trim() || 'ล็อค 1';
      const payerName = document.getElementById('manualPayerName')?.value.trim() || 'ผู้เช่าแผงค้า';
      const phone = document.getElementById('manualPhone')?.value.trim() || '';
      
      const selectedFullNames = MONTHS_LIST
        .filter(m => selectedMonthKeys.includes(m.key))
        .map(m => m.fullName);

      const remark = manualRemark?.value.trim() || 'ค่าเช่าแผง 1950 + ค่าเก็บขยะ 50';

      activePaymentData = {
        stallNo,
        zone,
        payerName,
        phone,
        totalAmount: amount,
        remark,
        months: selectedFullNames.length > 0 ? selectedFullNames : [remark],
        monthKeys: [...selectedMonthKeys]
      };

      if (modalAmount) modalAmount.textContent = `${amount.toLocaleString('th-TH')}.00 บาท`;
      const displayItems = selectedFullNames.length > 0 ? selectedFullNames.join(', ') : remark;
      if (modalItemsList) modalItemsList.textContent = `${stallNo} (${zone}) · ${displayItems}`;

      currentSlipData = null;
      const slipFileInput = document.getElementById('slipFileInput');
      const slipPreviewBox = document.getElementById('slipPreviewBox');
      if (slipFileInput) slipFileInput.value = '';
      if (slipPreviewBox) slipPreviewBox.style.display = 'none';

      paymentModal.classList.add('open');
    });
  }

  // Close modal
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      paymentModal.classList.remove('open');
    });
  }

  if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
      if (e.target === paymentModal) {
        paymentModal.classList.remove('open');
      }
    });
  }

  if (btnConfirmPay) {
    btnConfirmPay.addEventListener('click', () => {
      showToast('บันทึกรูปภาพ QR Code สำเร็จ กรุณาเปิดแอปธนาคารเพื่อสแกนจ่าย');
    });
  }

  // Slip Upload Functionality
  const slipFileInput = document.getElementById('slipFileInput');
  const btnPickSlip = document.getElementById('btnPickSlip');
  const slipPreviewBox = document.getElementById('slipPreviewBox');
  const slipPreviewImg = document.getElementById('slipPreviewImg');
  const slipFileName = document.getElementById('slipFileName');
  const btnRemoveSlip = document.getElementById('btnRemoveSlip');
  const btnConfirmPayWithSlip = document.getElementById('btnConfirmPayWithSlip');

  if (btnPickSlip && slipFileInput) {
    btnPickSlip.addEventListener('click', () => {
      slipFileInput.click();
    });
  }

  if (slipFileInput) {
    slipFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const img = new Image();
        img.onload = () => {
          // Resize if wider/taller than 1000px to ensure safe storage in localStorage
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          currentSlipData = {
            dataUrl,
            name: file.name
          };
          if (slipPreviewImg) slipPreviewImg.src = dataUrl;
          if (slipFileName) slipFileName.textContent = file.name;
          if (slipPreviewBox) slipPreviewBox.style.display = 'flex';
          showToast('แนบสลิปเรียบร้อยแล้ว');
        };
        img.src = loadEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle Remove Slip
  if (btnRemoveSlip) {
    btnRemoveSlip.addEventListener('click', () => {
      currentSlipData = null;
      if (slipFileInput) slipFileInput.value = '';
      if (slipPreviewBox) slipPreviewBox.style.display = 'none';
      if (slipPreviewImg) slipPreviewImg.src = '';
    });
  }

  // Handle Confirm Payment with Slip
  if (btnConfirmPayWithSlip) {
    btnConfirmPayWithSlip.addEventListener('click', async () => {
      const total = activePaymentData.totalAmount || 50;

      // Require slip attachment
      if (!currentSlipData || !currentSlipData.dataUrl) {
        showToast('กรุณาแนบสลิปหลักฐานการโอนเงินก่อนยืนยัน');
        return;
      }

      const receiptNo = 'REC-' + Math.floor(100000 + Math.random() * 900000);

      const paymentRecord = {
        id: receiptNo,
        receiptNo: receiptNo,
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        rawDate: new Date().toISOString(),
        months: (activePaymentData.months && activePaymentData.months.length > 0) ? activePaymentData.months : [activePaymentData.remark || 'ค่าเช่าแผงค้า'],
        monthKeys: activePaymentData.monthKeys || [],
        totalAmount: total,
        stallNo: activePaymentData.stallNo,
        zone: activePaymentData.zone,
        payerName: activePaymentData.payerName,
        phone: activePaymentData.phone,
        service: 'บริการเช่าแผงค้า',
        status: 'รอตรวจสอบ',
        slipImg: currentSlipData.dataUrl,
        remark: activePaymentData.remark || 'ค่าเช่าแผงค้า'
      };

      // Save to MarketPayAPI (Backend + LocalStorage sync)
      if (window.MarketPayAPI && window.MarketPayAPI.Payments) {
        await window.MarketPayAPI.Payments.create(paymentRecord);
      } else {
        // Fallback
        try {
          const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
          payments.unshift(paymentRecord);
          localStorage.setItem('smartpay_payments', JSON.stringify(payments));
        } catch (err) {
          console.error('Save payment error:', err);
        }

        if (activePaymentData.monthKeys && activePaymentData.monthKeys.length > 0) {
          try {
            const paidMonths = JSON.parse(localStorage.getItem('smartpay_paid_months') || '[]');
            activePaymentData.monthKeys.forEach(k => {
              if (!paidMonths.includes(k)) paidMonths.push(k);
            });
            localStorage.setItem('smartpay_paid_months', JSON.stringify(paidMonths));
          } catch (e) {
            console.error('Error updating paid months:', e);
          }
        }
      }

      // Sync selected stall & zone to current user profile and smartpay_users list
      try {
        const selectedStall = activePaymentData.stallNo;
        const selectedZone = activePaymentData.zone;
        const formattedAddress = selectedZone
          ? (selectedZone.includes('ล็อค') || selectedZone.includes('โซน') ? selectedZone : `โซนตลาดสด ${selectedZone}`)
          : `แผงค้า ${selectedStall}`;

        const storedUser = JSON.parse(localStorage.getItem('smartpay_user') || 'null');
        if (storedUser) {
          storedUser.stallNo = selectedStall;
          storedUser.stall_no = selectedStall;
          storedUser.address = formattedAddress;
          localStorage.setItem('smartpay_user', JSON.stringify(storedUser));
        }

        const users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        const cleanPhone = (activePaymentData.phone || (storedUser && storedUser.phone) || '').replace(/[^0-9]/g, '');
        const pName = (activePaymentData.payerName || (storedUser && (storedUser.fullName || storedUser.full_name)) || '').trim().toLowerCase();

        let updated = false;
        users.forEach(u => {
          const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
          const uName = (u.full_name || u.fullName || '').trim().toLowerCase();
          if ((cleanPhone && uPhone === cleanPhone) || (pName && uName === pName)) {
            u.stallNo = selectedStall;
            u.stall_no = selectedStall;
            u.address = formattedAddress;
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem('smartpay_users', JSON.stringify(users));
        }
      } catch (err) {
        console.error('Error syncing stall selection:', err);
      }

      // Reset slip modal state & re-render month selection grid
      currentSlipData = null;
      if (slipFileInput) slipFileInput.value = '';
      if (slipPreviewBox) slipPreviewBox.style.display = 'none';
      if (slipPreviewImg) slipPreviewImg.src = '';
      selectedMonthKeys = [];
      renderMonthGrid();

      paymentModal.classList.remove('open');
      showToast(`✓ แนบสลิปชำระเงิน ${total.toLocaleString('th-TH')}.00 บาท สำเร็จ (เลขที่ ${receiptNo}) ระบบส่งสลิปให้เจ้าหน้าที่ตรวจสอบแล้ว`);
    });
  }

  // Sidebar Buttons


  // Complaint Modal Logic
  const complaintModal = document.getElementById('complaintModal');
  const btnCloseComplaint = document.getElementById('btnCloseComplaint');
  const complaintForm = document.getElementById('complaintForm');

  if (btnComplaint && complaintModal) {
    btnComplaint.addEventListener('click', () => {
      complaintModal.classList.add('active');
    });
  }

  if (btnCloseComplaint && complaintModal) {
    btnCloseComplaint.addEventListener('click', () => {
      complaintModal.classList.remove('active');
    });
  }

  if (complaintModal) {
    complaintModal.addEventListener('click', (e) => {
      if (e.target === complaintModal) {
        complaintModal.classList.remove('active');
      }
    });
  }

  if (complaintForm) {
    complaintForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const service = document.getElementById('complaintService')?.value || 'ค่าเช่าแผง / การเช่าแผงค้า';
      const topic = document.getElementById('complaintTopic')?.value || 'ร้องเรียนการให้บริการ';
      const detail = document.getElementById('complaintDetail')?.value || '';

      const newComplaint = {
        id: 'REQ-' + Date.now().toString().slice(-6),
        service,
        topic,
        detail,
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        status: 'รอดำเนินการ',
        adminReply: ''
      };

      if (window.MarketPayAPI && window.MarketPayAPI.Complaints) {
        await window.MarketPayAPI.Complaints.create(newComplaint);
      } else {
        const complaints = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        complaints.unshift(newComplaint);
        localStorage.setItem('smartpay_complaints', JSON.stringify(complaints));
      }

      showToast('ส่งข้อมูลคำร้องเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบ');
      complaintForm.reset();
      setTimeout(() => {
        if (complaintModal) complaintModal.classList.remove('active');
      }, 1000);
    });
  }

  // Notice Detail Card Logic (โอนแล้วไม่ต้องโอนซ้ำ)
  const noticeDetailCard = document.getElementById('noticeDetailCard');
  const btnCloseNoticeDetail = document.getElementById('btnCloseNoticeDetail');
  const linkNoticeGuide = document.getElementById('linkNoticeGuide');
  const noticeGuideExpanded = document.getElementById('noticeGuideExpanded');

  function openNoticeDetail() {
    if (!noticeDetailCard) return;
    noticeDetailCard.style.display = 'block';
    noticeDetailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeNoticeDetail() {
    if (!noticeDetailCard) return;
    noticeDetailCard.style.display = 'none';
  }

  if (linkNoticeReport) {
    linkNoticeReport.addEventListener('click', (e) => {
      e.preventDefault();
      if (!noticeDetailCard) return;
      if (noticeDetailCard.style.display === 'none' || !noticeDetailCard.style.display) {
        openNoticeDetail();
      } else {
        closeNoticeDetail();
      }
    });
  }

  if (btnCloseNoticeDetail) {
    btnCloseNoticeDetail.addEventListener('click', () => {
      closeNoticeDetail();
    });
  }

  if (linkNoticeGuide && noticeGuideExpanded) {
    linkNoticeGuide.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = noticeGuideExpanded.style.display === 'none';
      noticeGuideExpanded.style.display = isHidden ? 'block' : 'none';
    });
  }

  // Auto-open if redirected with hash #notice-report
  if (window.location.hash === '#notice-report') {
    setTimeout(openNoticeDetail, 200);
  }
});

