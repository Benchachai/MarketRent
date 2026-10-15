// MarketRent - Admin Back-Office Logic
// GURU IT Solution Co., Ltd.

document.addEventListener('DOMContentLoaded', async () => {
  const API = window.MarketRentAPI || window.MarketPayAPI;

  // Strict Admin Auth Guard
  const adminUser = (API && API.Admin)
    ? API.Admin.getStoredAdmin()
    : JSON.parse(localStorage.getItem('marketrent_admin_user') || 'null');
  const adminToken = localStorage.getItem('marketrent_admin_token');

  if (!adminUser || !adminToken) {
    window.location.href = 'admin-login.html';
    return;
  }

  // Populate Officer Name
  const officerNameDisplay = document.getElementById('officerNameDisplay');
  if (officerNameDisplay && adminUser) {
    officerNameDisplay.textContent = adminUser.fullName || adminUser.username || 'เจ้าหน้าที่หลังบ้าน';
  }

  // Sticky Navbar Scroll Elevation Effect
  const adminNavbar = document.querySelector('.admin-navbar');
  if (adminNavbar) {
    const handleScroll = () => {
      if (window.scrollY > 8) {
        adminNavbar.classList.add('scrolled');
      } else {
        adminNavbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // Professional UI Vector Icons (SVG)
  const ICON_EYE = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const ICON_EYE_OFF = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  const ICON_COPY = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const ICON_CHECK = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const ICON_EDIT = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  const ICON_TRASH = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const ICON_PHONE = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
  const ICON_RECEIPT = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
  const ICON_CLOCK = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
  const ICON_SHIELD = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  const ICON_PLUS = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const ICON_BELL = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
  const ICON_BELL_OFF = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M18 8A6 6 0 0 0 6 8c0 1 0 2-.3 3m1.3 5H3s3-2 3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
  const ICON_EMPTY_CHAT = `<svg class="svg-icon" style="width:48px; height:48px; opacity:0.35; stroke-width:1.5;" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  const ICON_EMPTY_STORE = `<svg class="svg-icon" style="width:48px; height:48px; opacity:0.35; stroke-width:1.5;" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;

  // Global State
  let allPayments = [];
  let allComplaints = [];
  let allTenants = [];
  let activeTab = 'payments';
  let activePaymentForSlip = null;
  let pendingDeleteCallback = null;

  // Live Notification & Sound State
  let soundEnabled = localStorage.getItem('marketrent_sound_enabled') !== 'false';
  let lastKnownPendingCount = 0;
  let knownPaymentIds = new Set();
  let isInitialLoad = true;
  let latestPendingSlipId = null;

  // DOM Elements - Stats Cards
  const statRevenueEl = document.getElementById('statTotalRevenue');
  const statSlipsEl = document.getElementById('statPendingSlips');
  const statComplaintsEl = document.getElementById('statPendingComplaints');
  const statTenantsEl = document.getElementById('statTotalTenants');
  const serverStatusBadge = document.getElementById('serverStatusBadge');

  const cardStatRevenue = document.getElementById('cardStatRevenue');
  const cardStatSlips = document.getElementById('cardStatSlips');
  const cardStatComplaints = document.getElementById('cardStatComplaints');
  const cardStatTenants = document.getElementById('cardStatTenants');

  // DOM Elements - Tabs
  const tabBtnPayments = document.getElementById('tabBtnPayments');
  const tabBtnComplaints = document.getElementById('tabBtnComplaints');
  const tabBtnTenants = document.getElementById('tabBtnTenants');
  const tabSectionPayments = document.getElementById('tabSectionPayments');
  const tabSectionComplaints = document.getElementById('tabSectionComplaints');
  const tabSectionTenants = document.getElementById('tabSectionTenants');

  const countBadgePayments = document.getElementById('countBadgePayments');
  const countBadgeComplaints = document.getElementById('countBadgeComplaints');
  const countBadgeTenants = document.getElementById('countBadgeTenants');

  // Search & Filters
  const searchPaymentsInput = document.getElementById('searchPayments');
  const filterPaymentStatus = document.getElementById('filterPaymentStatus');
  const searchComplaintsInput = document.getElementById('searchComplaints');
  const filterComplaintStatus = document.getElementById('filterComplaintStatus');
  const searchTenantsInput = document.getElementById('searchTenants');

  // Action Buttons (Add & Export Excel)
  const btnOpenAddPaymentModal = document.getElementById('btnOpenAddPaymentModal');
  const btnExportPaymentsExcel = document.getElementById('btnExportPaymentsExcel');
  const btnOpenAddComplaintModal = document.getElementById('btnOpenAddComplaintModal');
  const btnExportComplaintsExcel = document.getElementById('btnExportComplaintsExcel');
  const btnOpenAddTenantModal = document.getElementById('btnOpenAddTenantModal');
  const btnExportTenantsExcel = document.getElementById('btnExportTenantsExcel');

  // Sound Toggle Button
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundText = document.getElementById('soundText');

  // Live Notification Toast Banner
  const liveNotifyBanner = document.getElementById('liveNotifyBanner');
  const liveNotifyTitle = document.getElementById('liveNotifyTitle');
  const liveNotifyDesc = document.getElementById('liveNotifyDesc');
  const btnLiveNotifyInspect = document.getElementById('btnLiveNotifyInspect');
  const btnCloseLiveNotify = document.getElementById('btnCloseLiveNotify');

  // Tables
  const tbodyPayments = document.getElementById('tbodyPayments');
  const tbodyComplaints = document.getElementById('tbodyComplaints');
  const tbodyTenants = document.getElementById('tbodyTenants');

  // Modals - Inspect Slip
  const slipModal = document.getElementById('slipInspectionModal');
  const btnCloseSlipModal = document.getElementById('btnCloseSlipModal');
  const btnApproveSlip = document.getElementById('btnApproveSlip');
  const btnRejectSlip = document.getElementById('btnRejectSlip');

  // Modals - Officer Quick Complaint Update
  const complaintModal = document.getElementById('adminComplaintModal');
  const btnCloseComplaintModal = document.getElementById('btnCloseComplaintModal');
  const formUpdateComplaint = document.getElementById('formUpdateComplaint');

  // Modals - Official Receipt
  const receiptModal = document.getElementById('officialReceiptModal');
  const btnCloseReceipt = document.getElementById('btnCloseReceipt');
  const btnPrintReceipt = document.getElementById('btnPrintReceipt');

  // Modals - Tenant CRUD
  const adminTenantModal = document.getElementById('adminTenantModal');
  const tenantModalTitle = document.getElementById('tenantModalTitle');
  const btnCloseTenantModal = document.getElementById('btnCloseTenantModal');
  const btnCancelTenantModal = document.getElementById('btnCancelTenantModal');
  const formTenantCRUD = document.getElementById('formTenantCRUD');
  const tenantModalId = document.getElementById('tenantModalId');
  const tenantModalFullName = document.getElementById('tenantModalFullName');
  const tenantModalPhone = document.getElementById('tenantModalPhone');
  const tenantModalStallNo = document.getElementById('tenantModalStallNo');
  const tenantModalStallSelect = document.getElementById('tenantModalStallSelect');
  const tenantModalUserType = document.getElementById('tenantModalUserType');
  const tenantModalAddress = document.getElementById('tenantModalAddress');
  const tenantModalPassword = document.getElementById('tenantModalPassword');
  const btnGenTenantPwd = document.getElementById('btnGenTenantPwd');
  const tenantModalStatus = document.getElementById('tenantModalStatus');

  // Modals - Payment CRUD
  const adminPaymentModal = document.getElementById('adminPaymentModal');
  const paymentModalTitle = document.getElementById('paymentModalTitle');
  const btnClosePaymentModal = document.getElementById('btnClosePaymentModal');
  const btnCancelPaymentModal = document.getElementById('btnCancelPaymentModal');
  const formPaymentCRUD = document.getElementById('formPaymentCRUD');
  const paymentModalId = document.getElementById('paymentModalId');
  const paymentModalReceiptNo = document.getElementById('paymentModalReceiptNo');
  const paymentModalDate = document.getElementById('paymentModalDate');
  const paymentModalPayerName = document.getElementById('paymentModalPayerName');
  const paymentModalPhone = document.getElementById('paymentModalPhone');
  const paymentModalStallNo = document.getElementById('paymentModalStallNo');
  const paymentModalStallSelect = document.getElementById('paymentModalStallSelect');
  const paymentModalZone = document.getElementById('paymentModalZone');
  const paymentModalAmount = document.getElementById('paymentModalAmount');
  const paymentModalStatus = document.getElementById('paymentModalStatus');
  const paymentModalMonths = document.getElementById('paymentModalMonths');
  const paymentModalRemark = document.getElementById('paymentModalRemark');

  // Modals - Complaint CRUD
  const adminComplaintFormModal = document.getElementById('adminComplaintFormModal');
  const complaintFormModalTitle = document.getElementById('complaintFormModalTitle');
  const btnCloseComplaintFormModal = document.getElementById('btnCloseComplaintFormModal');
  const btnCancelComplaintFormModal = document.getElementById('btnCancelComplaintFormModal');
  const formComplaintCRUD = document.getElementById('formComplaintCRUD');
  const complaintModalId = document.getElementById('complaintModalId');
  const complaintModalUserName = document.getElementById('complaintModalUserName');
  const complaintModalTopic = document.getElementById('complaintModalTopic');
  const complaintModalService = document.getElementById('complaintModalService');
  const complaintModalPhone = document.getElementById('complaintModalPhone');
  const complaintModalDetail = document.getElementById('complaintModalDetail');
  const complaintModalStatus = document.getElementById('complaintModalStatus');
  const complaintModalAdminReply = document.getElementById('complaintModalAdminReply');

  // Modals - Delete Confirmation
  const adminDeleteConfirmModal = document.getElementById('adminDeleteConfirmModal');
  const deleteConfirmTargetInfo = document.getElementById('deleteConfirmTargetInfo');
  const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
  const btnCancelDelete = document.getElementById('btnCancelDelete');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');

  // Toast
  const toast = document.getElementById('toastMessage');
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ==========================================
  // Web Audio Chime Notification
  // ==========================================
  function playNotificationSound() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Note 2: A5 (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  }

  function updateSoundUI() {
    if (soundIcon) soundIcon.innerHTML = soundEnabled ? ICON_BELL : ICON_BELL_OFF;
    if (soundText) soundText.textContent = soundEnabled ? 'เสียงเตือน: เปิด' : 'เสียงเตือน: ปิด';
  }
  updateSoundUI();

  btnSoundToggle?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('marketrent_sound_enabled', String(soundEnabled));
    updateSoundUI();
    if (soundEnabled) {
      playNotificationSound();
      showToast('เปิดเสียงแจ้งเตือนสลิปใหม่แล้ว');
    } else {
      showToast('ปิดเสียงแจ้งเตือนแล้ว');
    }
  });

  // ==========================================
  // Live Notification Popup Banner
  // ==========================================
  function showLiveNotification(title, message, slipId) {
    if (!liveNotifyBanner) return;
    if (liveNotifyTitle) liveNotifyTitle.textContent = title;
    if (liveNotifyDesc) liveNotifyDesc.textContent = message;
    latestPendingSlipId = slipId;
    liveNotifyBanner.classList.add('show');
    playNotificationSound();

    setTimeout(() => {
      liveNotifyBanner.classList.remove('show');
    }, 9000);
  }

  btnCloseLiveNotify?.addEventListener('click', () => {
    liveNotifyBanner?.classList.remove('show');
  });

  btnLiveNotifyInspect?.addEventListener('click', () => {
    liveNotifyBanner?.classList.remove('show');
    switchTab('payments');
    if (filterPaymentStatus) {
      filterPaymentStatus.value = 'pending';
      renderPayments();
    }
    if (latestPendingSlipId) {
      openSlipInspection(latestPendingSlipId);
    }
  });

  // ==========================================
  // Helper: Export to Excel (.xlsx / UTF-8 CSV Fallback)
  // ==========================================
  function exportDataToExcel(rows, fileName, sheetName) {
    if (!rows || rows.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    try {
      if (window.XLSX && XLSX.utils && XLSX.writeFile) {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Data');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        showToast(`✓ ส่งออก Excel สำเร็จ (${rows.length} รายการ)`);
      } else {
        const headers = Object.keys(rows[0]);
        const csvLines = [];
        csvLines.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
        for (const row of rows) {
          const values = headers.map(header => {
            const val = row[header] !== undefined && row[header] !== null ? row[header] : '';
            return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvLines.push(values.join(','));
        }
        const csvString = '\uFEFF' + csvLines.join('\r\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`✓ ส่งออกไฟล์สำเร็จ (${rows.length} รายการ)`);
      }
    } catch (err) {
      console.error('Export Excel Error:', err);
      showToast('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    }
  }

  // ==========================================
  // 1. Dashboard Stats & Real-Time Polling
  // ==========================================
  async function refreshDashboard() {
    const isOnline = API ? await API.checkServer() : false;
    if (serverStatusBadge) {
      if (isOnline) {
        serverStatusBadge.innerHTML = '<span class="admin-status-dot"></span> ระบบออนไลน์ (API เชื่อมต่อแล้ว)';
        serverStatusBadge.style.background = '#f0fdf4';
        serverStatusBadge.style.color = '#166534';
      } else {
        serverStatusBadge.innerHTML = '<span class="admin-status-dot" style="background:#f59e0b;"></span> โหมดออฟไลน์ (LocalStorage)';
        serverStatusBadge.style.background = '#fffbeb';
        serverStatusBadge.style.color = '#b45309';
      }
    }

    if (API && API.Admin) {
      const stats = await API.Admin.getStats();
      const pendingCount = stats.pendingPayments || 0;

      if (statRevenueEl) statRevenueEl.textContent = `${(stats.totalRevenue || 0).toLocaleString('th-TH')}.00 ฿`;
      if (statSlipsEl) statSlipsEl.textContent = pendingCount;
      if (statComplaintsEl) statComplaintsEl.textContent = stats.pendingComplaints || 0;
      if (statTenantsEl) statTenantsEl.textContent = stats.totalTenants || 0;

      // Glow effect if pending slips exist
      if (cardStatSlips) {
        if (pendingCount > 0) {
          cardStatSlips.classList.add('has-pending');
        } else {
          cardStatSlips.classList.remove('has-pending');
        }
      }

      lastKnownPendingCount = pendingCount;
    }

    await loadPayments();
    await loadComplaints();
    await loadTenants();
    isInitialLoad = false;
  }

  // Background Auto-Polling (checks every 5 seconds)
  async function pollLiveUpdates() {
    try {
      if (!API || !API.Admin) return;
      const stats = await API.Admin.getStats();
      const currentPending = stats.pendingPayments || 0;

      if (statRevenueEl) statRevenueEl.textContent = `${(stats.totalRevenue || 0).toLocaleString('th-TH')}.00 ฿`;
      if (statSlipsEl) statSlipsEl.textContent = currentPending;
      if (statComplaintsEl) statComplaintsEl.textContent = stats.pendingComplaints || 0;
      if (statTenantsEl) statTenantsEl.textContent = stats.totalTenants || 0;

      // Pulse glow on slips card
      if (cardStatSlips) {
        if (currentPending > 0) {
          cardStatSlips.classList.add('has-pending');
        } else {
          cardStatSlips.classList.remove('has-pending');
        }
      }

      // Check payments for newly arrived slip
      const latestPayments = await API.Payments.getAll();
      const pendingList = latestPayments.filter(p => (p.status || '').includes('รอ'));

      // If pending count increased or new slip found
      if (!isInitialLoad && currentPending > lastKnownPendingCount) {
        const newest = pendingList.find(p => !knownPaymentIds.has(String(p.id || p.receiptNo))) || pendingList[0];
        if (newest) {
          const payer = newest.payerName || 'ผู้ประกอบการแผงค้า';
          const stall = newest.stallNo || '';
          const amt = (parseFloat(newest.totalAmount) || 0).toLocaleString('th-TH');
          showLiveNotification(
            'มีสลิปใหม่รอตรวจสอบ!',
            `คุณ ${payer} (${stall}) แนบสลิปชำระเงิน ${amt} บาท`,
            newest.id || newest.receiptNo
          );
        }
      }

      allPayments = latestPayments;
      latestPayments.forEach(p => knownPaymentIds.add(String(p.id || p.receiptNo)));
      lastKnownPendingCount = currentPending;

      if (countBadgePayments) countBadgePayments.textContent = allPayments.length;
      renderPayments();

    } catch (err) {
      console.error('Polling error:', err);
    }
  }

  // Start background polling every 5 seconds
  setInterval(pollLiveUpdates, 5000);

  // ==========================================
  // Clickable Stat Cards Navigation
  // ==========================================
  cardStatRevenue?.addEventListener('click', async () => {
    if (filterPaymentStatus) {
      filterPaymentStatus.value = 'approved';
    }
    switchTab('payments');
    await loadPayments();
  });

  cardStatSlips?.addEventListener('click', async () => {
    if (filterPaymentStatus) {
      filterPaymentStatus.value = 'pending';
    }
    switchTab('payments');
    await loadPayments();
  });

  cardStatComplaints?.addEventListener('click', async () => {
    switchTab('complaints');
    if (filterComplaintStatus) {
      filterComplaintStatus.value = 'pending';
    }
    await loadComplaints();
  });

  cardStatTenants?.addEventListener('click', async () => {
    switchTab('tenants');
    await loadTenants();
  });

  // ==========================================
  // 2. Payments: Load & Render
  // ==========================================
  async function loadPayments() {
    if (!API) return;
    allPayments = (API.Admin && API.Admin.getPayments)
      ? await API.Admin.getPayments()
      : await API.Payments.getAll();
    allPayments.forEach(p => knownPaymentIds.add(String(p.id || p.receiptNo)));
    if (countBadgePayments) countBadgePayments.textContent = allPayments.length;
    renderPayments();
  }

  function renderPayments() {
    if (!tbodyPayments) return;
    const search = (searchPaymentsInput?.value || '').trim().toLowerCase();
    const filter = filterPaymentStatus?.value || 'all';

    const filtered = allPayments.filter(p => {
      const matchSearch = !search ||
        (p.receiptNo || '').toLowerCase().includes(search) ||
        (p.payerName || '').toLowerCase().includes(search) ||
        (p.stallNo || '').toLowerCase().includes(search) ||
        (p.phone || '').toLowerCase().includes(search);

      let matchFilter = true;
      if (filter === 'pending') matchFilter = (p.status || '').includes('รอ');
      else if (filter === 'approved') matchFilter = (p.status || '').includes('เรียบร้อย') || (p.status || '').includes('อนุมัติ');
      else if (filter === 'rejected') matchFilter = (p.status || '').includes('ปฏิเสธ');

      return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
      const isFiltered = (filter && filter !== 'all') || !!search;
      tbodyPayments.innerHTML = `
        <tr>
          <td colspan="9" class="admin-empty-state">
            <div class="admin-empty-icon">📂</div>
            <div style="font-weight:600; margin-bottom:6px;">ไม่พบรายการชำระเงินที่ตรงตามเงื่อนไข${filter !== 'all' ? ` (สถานะ: ${filterPaymentStatus?.options[filterPaymentStatus.selectedIndex]?.text || filter})` : ''}</div>
            ${isFiltered ? `
              <button type="button" class="btn-table-action" id="btnClearPaymentFilter" style="margin-top:8px; padding:6px 14px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer; font-weight:600; color:#0f172a;">
                ↻ แสดงรายการทั้งหมด (ล้างตัวกรอง)
              </button>
            ` : ''}
          </td>
        </tr>
      `;
      document.getElementById('btnClearPaymentFilter')?.addEventListener('click', () => {
        if (filterPaymentStatus) filterPaymentStatus.value = 'all';
        if (searchPaymentsInput) searchPaymentsInput.value = '';
        renderPayments();
      });
      return;
    }

    tbodyPayments.innerHTML = filtered.map(p => {
      const statusText = p.status || 'รอตรวจสอบ';
      const isApproved = statusText.includes('เรียบร้อย') || statusText.includes('อนุมัติ');
      let badgeClass = 'badge-status-pending';
      if (isApproved) badgeClass = 'badge-status-approved';
      else if (statusText.includes('ปฏิเสธ')) badgeClass = 'badge-status-rejected';

      const monthsBadge = (p.months || []).map(m => `
        <span style="background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; font-size:11.5px; font-weight:600; padding:1px 6px; border-radius:4px; margin-right:3px; display:inline-block; margin-top:2px;">
          ${m}
        </span>
      `).join('') || (p.remark || '-');

      const slipThumb = p.slipImg ? `
        <div class="slip-thumb-wrap" title="คลิกเพื่อดูสลิปหลักฐาน" data-id="${p.id || p.receiptNo}">
          <img src="${p.slipImg}" alt="สลิป" class="slip-thumb-img">
        </div>
      ` : '<span style="color:#94a3b8; font-size:12px;">ไม่มีสลิป</span>';

      return `
        <tr>
          <td style="font-weight:600; color:#475569; font-size:12.5px;">${p.date || '-'}</td>
          <td style="font-weight:700; color:#ea580c; font-family:monospace;">${p.receiptNo || p.id}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${p.payerName || '-'}</div>
            <div style="font-size:12px; color:#64748b;">${p.phone || '-'}</div>
          </td>
          <td>
            <div style="font-weight:600; color:#1e40af;">${p.stallNo || '-'}</div>
            <div style="font-size:11.5px; color:#64748b;">${p.zone || ''}</div>
          </td>
          <td>${monthsBadge}</td>
          <td style="font-weight:800; font-size:14.5px; color:#0f172a;">${(parseFloat(p.totalAmount) || 0).toLocaleString('th-TH')}.00 ฿</td>
          <td>${slipThumb}</td>
          <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${p.slipImg ? `
                <button type="button" class="btn-table-action btn-verify btn-open-slip-inspect" data-id="${p.id || p.receiptNo}" title="ตรวจสอบภาพสลิป">
                  ${ICON_EYE} <span>ตรวจสลิป</span>
                </button>
              ` : ''}
              <button type="button" class="btn-table-action btn-receipt btn-open-receipt-view" data-id="${p.id || p.receiptNo}" title="${isApproved ? 'ดู/พิมพ์ใบเสร็จรับเงิน' : 'ยังไม่อนุมัติ - คลิกเพื่ออนุมัติและออกใบเสร็จ'}">
                ${isApproved ? `${ICON_RECEIPT} <span>ออกใบเสร็จ</span>` : `${ICON_CLOCK} <span>อนุมัติ & ใบเสร็จ</span>`}
              </button>
              <button type="button" class="btn-table-action btn-edit btn-edit-payment" data-id="${p.id || p.receiptNo}" title="แก้ไขข้อมูลการชำระเงิน">
                ${ICON_EDIT} <span>แก้ไข</span>
              </button>
              <button type="button" class="btn-table-action btn-delete btn-delete-payment" data-id="${p.id || p.receiptNo}" title="ลบรายการชำระเงิน">
                ${ICON_TRASH} <span>ลบ</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Wire table buttons
    tbodyPayments.querySelectorAll('.btn-open-slip-inspect, .slip-thumb-wrap').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        openSlipInspection(id);
      });
    });

    tbodyPayments.querySelectorAll('.btn-open-receipt-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openOfficialReceipt(id);
      });
    });

    tbodyPayments.querySelectorAll('.btn-edit-payment').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditPaymentModal(id);
      });
    });

    tbodyPayments.querySelectorAll('.btn-delete-payment').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        triggerDeletePayment(id);
      });
    });
  }

  // Export Payments to Excel
  function exportPayments() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = allPayments.map((p, idx) => ({
      'ลำดับ': idx + 1,
      'วันที่ทำรายการ': p.date || '-',
      'เลขที่ใบเสร็จ': p.receiptNo || p.id,
      'ชื่อผู้ชำระเงิน': p.payerName || '-',
      'เบอร์โทรศัพท์': p.phone || '-',
      'หมายเลขแผงค้า': p.stallNo || '-',
      'โซนตลาด / ที่ตั้ง': p.zone || '-',
      'รอบเดือนที่ชำระ': (p.months || []).join(', ') || p.remark || '-',
      'ยอดชำระ (บาท)': parseFloat(p.totalAmount) || 0,
      'สถานะการชำระ': p.status || 'รอตรวจสอบ',
      'หมายเหตุ': p.remark || ''
    }));
    exportDataToExcel(rows, `รายงานการชำระเงิน_MarketRent_${todayStr}`, 'การชำระเงิน');
  }

  btnExportPaymentsExcel?.addEventListener('click', exportPayments);

  // ==========================================
  // 3. Complaints: Load & Render
  // ==========================================
  async function loadComplaints() {
    if (!API) return;
    allComplaints = (API.Admin && API.Admin.getComplaints)
      ? await API.Admin.getComplaints()
      : await API.Complaints.getAll();
    if (countBadgeComplaints) countBadgeComplaints.textContent = allComplaints.length;
    renderComplaints();
  }

  function renderComplaints() {
    if (!tbodyComplaints) return;
    const search = (searchComplaintsInput?.value || '').trim().toLowerCase();
    const filter = filterComplaintStatus?.value || 'all';

    const filtered = allComplaints.filter(c => {
      const matchSearch = !search ||
        (c.reqId || c.id || '').toLowerCase().includes(search) ||
        (c.userName || c.fullName || '').toLowerCase().includes(search) ||
        (c.stallNo || '').toLowerCase().includes(search) ||
        (c.topic || '').toLowerCase().includes(search) ||
        (c.detail || '').toLowerCase().includes(search) ||
        (c.phone || '').toLowerCase().includes(search);

      let matchFilter = true;
      if (filter === 'pending') matchFilter = c.status === 'รอดำเนินการ' || (c.status || '').includes('รอ');
      else if (filter === 'processing') matchFilter = c.status === 'กำลังดำเนินการ' || (c.status || '').includes('กำลัง');
      else if (filter === 'resolved') matchFilter = c.status === 'ดำเนินการแก้ไขแล้ว' || c.status === 'เสร็จสิ้น' || (c.status || '').includes('แก้ไขแล้ว');

      return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
      tbodyComplaints.innerHTML = `
        <tr>
          <td colspan="8" class="admin-empty-state">
            <div class="admin-empty-icon">${ICON_EMPTY_CHAT}</div>
            <div>ไม่พบรายการคำร้อง/เรื่องร้องเรียน</div>
          </td>
        </tr>
      `;
      return;
    }

    tbodyComplaints.innerHTML = filtered.map(c => {
      let badgeClass = 'badge-status-pending';
      if (c.status === 'กำลังดำเนินการ') badgeClass = 'badge-status-processing';
      else if (c.status === 'ดำเนินการแก้ไขแล้ว' || c.status === 'เสร็จสิ้น') badgeClass = 'badge-status-approved';

      return `
        <tr>
          <td style="font-weight:600; color:#475569; font-size:12.5px;">${c.date || '-'}</td>
          <td style="font-weight:700; color:#ea580c; font-family:monospace;">${c.reqId || c.id}</td>
          <td>
            <div style="font-weight:700; color:#0f172a; font-size:13px;">${c.userName || c.fullName || 'ผู้ใช้งานทั่วไป'}</div>
            ${c.stallNo && c.stallNo !== '-' ? `<div style="font-size:11.5px; color:#ea580c; font-weight:600;">แผงค้า ${c.stallNo}</div>` : ''}
          </td>
          <td style="font-weight:700; color:#0f172a;">${c.topic || '-'}</td>
          <td style="max-width:260px; font-size:12.5px; color:#334155; line-height:1.4;">
            <div>${c.detail || '-'}</div>
            ${c.adminReply ? `<div style="margin-top:6px; font-size:11.5px; color:#047857; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:3px 8px; line-height:1.35; display:inline-block;">💬 <strong>ตอบกลับ:</strong> ${c.adminReply}</div>` : ''}
          </td>
          <td style="font-size:12.5px; color:#475569;">${c.phone || '-'}</td>
          <td><span class="badge-status ${badgeClass}">${c.status || 'รอดำเนินการ'}</span></td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn-table-action btn-verify btn-manage-complaint" data-id="${c.reqId || c.id}" title="บันทึกการดำเนินการตอบกลับ">
                ${ICON_SHIELD} <span>ตอบรับ</span>
              </button>
              <button type="button" class="btn-table-action btn-edit btn-edit-complaint" data-id="${c.reqId || c.id}" title="แก้ไขข้อมูลคำร้อง">
                ${ICON_EDIT} <span>แก้ไข</span>
              </button>
              <button type="button" class="btn-table-action btn-delete btn-delete-complaint" data-id="${c.reqId || c.id}" title="ลบเรื่องร้องเรียน">
                ${ICON_TRASH} <span>ลบ</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbodyComplaints.querySelectorAll('.btn-manage-complaint').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openComplaintModal(id);
      });
    });

    tbodyComplaints.querySelectorAll('.btn-edit-complaint').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditComplaintModal(id);
      });
    });

    tbodyComplaints.querySelectorAll('.btn-delete-complaint').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        triggerDeleteComplaint(id);
      });
    });
  }

  // Export Complaints to Excel
  function exportComplaints() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = allComplaints.map((c, idx) => ({
      'ลำดับ': idx + 1,
      'วันที่แจ้ง': c.date || '-',
      'เลขที่คำร้อง': c.reqId || c.id,
      'ชื่อผู้ใช้ / ผู้ส่งคำร้อง': c.userName || c.fullName || 'ผู้ใช้งานทั่วไป',
      'หมายเลขแผงค้า': c.stallNo || '-',
      'หัวข้อเรื่องร้องเรียน': c.topic || '-',
      'รายละเอียด': c.detail || '-',
      'ประเภทบริการ': c.service || '-',
      'เบอร์โทรติดต่อ': c.phone || '-',
      'สถานะการดำเนินงาน': c.status || 'รอดำเนินการ',
      'การดำเนินการของเจ้าหน้าที่': c.adminReply || ''
    }));
    exportDataToExcel(rows, `รายงานเรื่องร้องเรียน_MarketRent_${todayStr}`, 'เรื่องร้องเรียน');
  }

  btnExportComplaintsExcel?.addEventListener('click', exportComplaints);

  // Helper: ดึงเลขแผงค้าและที่ตั้งร้านตามรายการที่เลือกชำระเงิน หรือที่บันทึกไว้ในระบบ
  function getEffectiveTenantStall(u) {
    let stallNo = u.stall_no || u.stallNo || '';
    let address = u.address || '';
    const isUnsetStall = !stallNo || stallNo === '-' || stallNo === 'ระบุที่หน้าชำระเงิน' || stallNo === 'ยังไม่ได้ระบุ';
    const isUnsetAddress = !address || address === '-' || address === 'ระบุที่หน้าชำระเงิน' || address === 'ยังไม่ได้ระบุ';

    if (isUnsetStall || isUnsetAddress) {
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
      const uName = (u.full_name || u.fullName || '').trim().toLowerCase();

      // 1. ดึงจากประวัติการชำระเงินที่มีการเลือกหมายเลขแผงค้า
      const matchedPay = (allPayments || []).find(p => {
        const pPhone = (p.phone || '').replace(/[^0-9]/g, '');
        const pName = (p.payer_name || p.payerName || '').trim().toLowerCase();
        const pStall = p.stall_no || p.stallNo;
        const hasValidStall = pStall && pStall !== '-' && pStall !== 'ระบุที่หน้าชำระเงิน';
        return hasValidStall && ((uPhone && pPhone === uPhone) || (uName && pName === uName));
      });

      if (matchedPay) {
        const pStall = matchedPay.stall_no || matchedPay.stallNo;
        const pZone = matchedPay.zone || matchedPay.address || '';
        if (isUnsetStall && pStall) {
          stallNo = pStall;
        }
        if (isUnsetAddress) {
          address = pZone ? (pZone.includes('ล็อค') || pZone.includes('โซน') ? pZone : `โซนตลาดสด ${pZone}`) : `แผงค้า ${stallNo || pStall}`;
        }
      } else {
        // 2. ตรวจสอบใน smartpay_user ของเครื่อง
        try {
          const activeUser = JSON.parse(localStorage.getItem('smartpay_user') || 'null');
          if (activeUser) {
            const aPhone = (activeUser.phone || '').replace(/[^0-9]/g, '');
            const aName = (activeUser.fullName || activeUser.full_name || '').trim().toLowerCase();
            if ((uPhone && aPhone === uPhone) || (uName && aName === uName)) {
              if (isUnsetStall && activeUser.stallNo && activeUser.stallNo !== '-' && activeUser.stallNo !== 'ระบุที่หน้าชำระเงิน') {
                stallNo = activeUser.stallNo;
              }
              if (isUnsetAddress && activeUser.address && activeUser.address !== '-' && activeUser.address !== 'ระบุที่หน้าชำระเงิน') {
                address = activeUser.address;
              }
            }
          }
        } catch (e) {}
      }
    }

    return {
      stallNo: stallNo || '-',
      address: address || '-'
    };
  }

  // ==========================================
  // 4. Tenants: Load & Render
  // ==========================================
  async function loadTenants() {
    if (!API || !API.Admin) return;
    allTenants = await API.Admin.getTenants();

    // ซิงค์ดึงหมายเลขแผงค้าและที่ตั้งตามที่เลือกไว้ในระบบหรือรายการชำระเงิน
    let hasUpdates = false;
    allTenants.forEach(u => {
      const eff = getEffectiveTenantStall(u);
      if (eff.stallNo !== '-' && (!u.stall_no || u.stall_no === '-' || u.stall_no === 'ระบุที่หน้าชำระเงิน')) {
        u.stall_no = eff.stallNo;
        u.stallNo = eff.stallNo;
        hasUpdates = true;
      }
      if (eff.address !== '-' && (!u.address || u.address === '-' || u.address === 'ระบุที่หน้าชำระเงิน')) {
        u.address = eff.address;
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      try {
        localStorage.setItem('smartpay_users', JSON.stringify(allTenants));
      } catch (e) {}
    }

    if (countBadgeTenants) countBadgeTenants.textContent = allTenants.length;
    renderTenants();
  }

  function renderTenants() {
    if (!tbodyTenants) return;
    const search = (searchTenantsInput?.value || '').trim().toLowerCase();

    const filtered = allTenants.filter(u => {
      if (!search) return true;
      const fullName = (u.full_name || u.fullName || '').toLowerCase();
      const eff = getEffectiveTenantStall(u);
      const stallNo = (eff.stallNo || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const address = (eff.address || '').toLowerCase();
      return fullName.includes(search) || stallNo.includes(search) || phone.includes(search) || address.includes(search);
    });

    if (filtered.length === 0) {
      tbodyTenants.innerHTML = `
        <tr>
          <td colspan="8" class="admin-empty-state">
            <div class="admin-empty-icon">${ICON_EMPTY_STORE}</div>
            <div>${allTenants.length === 0 ? 'ยังไม่มีข้อมูลผู้เช่าแผงค้าในระบบ' : 'ไม่พบข้อมูลผู้เช่าที่ตรงกับการค้นหา'}</div>
          </td>
        </tr>
      `;
      return;
    }

    tbodyTenants.innerHTML = filtered.map((u, idx) => {
      const tenantId = u.id || u.phone;
      const statusText = u.status || 'ปกติ';
      const pwd = u.raw_password || u.password || '123456';
      let badgeClass = 'badge-status-approved';
      if (statusText === 'พักการใช้งาน') badgeClass = 'badge-status-rejected';
      else if (statusText === 'รอต่อสัญญา') badgeClass = 'badge-status-pending';

      const eff = getEffectiveTenantStall(u);
      const displayStall = eff.stallNo;
      const displayAddress = eff.address;

      return `
        <tr>
          <td style="font-weight:600; color:#64748b;">#${idx + 1}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${u.full_name || u.fullName || '-'}</div>
            <div style="font-size:12px; color:#64748b;">${u.user_type || u.userType || 'บุคคลธรรมดา'}</div>
          </td>
          <td style="font-weight:700; color:#1e40af;">${displayStall}</td>
          <td style="color:#475569; font-size:13px;">${displayAddress}</td>
          <td style="font-family:monospace; font-weight:600;">${u.phone || '-'}</td>
          <td>
            <div style="display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; padding:4px 8px; border-radius:6px; font-family:monospace; font-weight:600; border:1px solid #e2e8f0;">
              <span class="tenant-pwd-text" data-pwd="${pwd}" style="letter-spacing:1px; min-width:55px;">••••••</span>
              <button type="button" class="btn-toggle-pwd" style="background:none; border:none; cursor:pointer; padding:2px; display:inline-flex; align-items:center;" title="แสดง/ซ่อนรหัสผ่าน">
                ${ICON_EYE}
              </button>
              <button type="button" class="btn-copy-pwd" data-pwd="${pwd}" style="background:none; border:none; cursor:pointer; padding:2px; display:inline-flex; align-items:center;" title="คัดลอกรหัสผ่าน">
                ${ICON_COPY}
              </button>
            </div>
          </td>
          <td><span class="badge-status ${badgeClass}"><svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg> ${statusText}</span></td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn-table-action btn-edit btn-edit-tenant" data-id="${tenantId}" title="แก้ไขข้อมูลผู้เช่าแผงค้า">
                ${ICON_EDIT} <span>แก้ไข</span>
              </button>
              <button type="button" class="btn-table-action btn-delete btn-delete-tenant" data-id="${tenantId}" title="ลบข้อมูลผู้เช่าแผงค้า">
                ${ICON_TRASH} <span>ลบ</span>
              </button>
              <button type="button" class="btn-table-action" onclick="window.location.href='tel:${u.phone}'" title="โทรติดต่อ">
                ${ICON_PHONE} <span>โทร</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbodyTenants.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      btn.addEventListener('click', () => {
        const span = btn.parentElement.querySelector('.tenant-pwd-text');
        const realPwd = span.getAttribute('data-pwd');
        if (span.textContent === '••••••') {
          span.textContent = realPwd;
          btn.innerHTML = ICON_EYE_OFF;
        } else {
          span.textContent = '••••••';
          btn.innerHTML = ICON_EYE;
        }
      });
    });

    tbodyTenants.querySelectorAll('.btn-copy-pwd').forEach(btn => {
      btn.addEventListener('click', () => {
        const pwd = btn.getAttribute('data-pwd');
        const origHtml = btn.innerHTML;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(pwd).then(() => {
            btn.innerHTML = ICON_CHECK;
            showToast(`คัดลอกรหัสผ่าน ${pwd} แล้ว`);
            setTimeout(() => { btn.innerHTML = origHtml; }, 1500);
          }).catch(() => {
            prompt('รหัสผ่านผู้เช่า:', pwd);
          });
        } else {
          prompt('รหัสผ่านผู้เช่า:', pwd);
        }
      });
    });

    tbodyTenants.querySelectorAll('.btn-edit-tenant').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditTenantModal(id);
      });
    });

    tbodyTenants.querySelectorAll('.btn-delete-tenant').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        triggerDeleteTenant(id);
      });
    });
  }

  // Export Tenants to Excel
  function exportTenants() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = allTenants.map((u, idx) => {
      const eff = getEffectiveTenantStall(u);
      return {
        'ลำดับ': idx + 1,
        'ชื่อ-นามสกุล / ร้านค้า': u.full_name || u.fullName || '-',
        'ประเภทผู้เช่า': u.user_type || u.userType || 'บุคคลธรรมดา',
        'หมายเลขแผงค้า': eff.stallNo,
        'โซนตลาด / ที่ตั้ง': eff.address,
        'เบอร์โทรศัพท์ (Username)': u.phone || '-',
        'รหัสผ่าน (Password)': u.raw_password || u.password || '123456',
        'สถานะบัญชี': u.status || 'ปกติ',
        'วันที่ลงทะเบียน': u.registeredAt || u.registered_at || '-'
      };
    });
    exportDataToExcel(rows, `ทะเบียนผู้เช่าและแผงค้า_MarketRent_${todayStr}`, 'ผู้เช่าแผงค้า');
  }

  btnExportTenantsExcel?.addEventListener('click', exportTenants);
  searchTenantsInput?.addEventListener('input', renderTenants);

  // ==========================================
  // 5. Slip Inspection Modal
  // ==========================================
  function openSlipInspection(id) {
    const payment = allPayments.find(p => String(p.id) === String(id) || p.receiptNo === id || p.receipt_no === id);
    if (!payment) return;

    activePaymentForSlip = payment;
    const slipImgEl = document.getElementById('inspectSlipImg');
    const payerNameEl = document.getElementById('inspectPayerName');
    const stallInfoEl = document.getElementById('inspectStallInfo');
    const amountEl = document.getElementById('inspectAmount');
    const receiptNoEl = document.getElementById('inspectReceiptNo');
    const dateEl = document.getElementById('inspectDate');
    const statusEl = document.getElementById('inspectStatus');

    if (slipImgEl) slipImgEl.src = payment.slipImg || 'images/logo.png';
    if (payerNameEl) payerNameEl.textContent = payment.payerName || '-';
    if (stallInfoEl) stallInfoEl.textContent = `${payment.stallNo || '-'} (${payment.zone || ''})`;
    if (amountEl) amountEl.textContent = `${(parseFloat(payment.totalAmount) || 0).toLocaleString('th-TH')}.00 บาท`;
    if (receiptNoEl) receiptNoEl.textContent = payment.receiptNo || payment.id;
    if (dateEl) dateEl.textContent = payment.date || '-';
    if (statusEl) statusEl.textContent = payment.status || 'รอตรวจสอบ';

    if (slipModal) slipModal.classList.add('active');
  }

  if (btnCloseSlipModal && slipModal) {
    btnCloseSlipModal.addEventListener('click', () => slipModal.classList.remove('active'));
    slipModal.addEventListener('click', (e) => {
      if (e.target === slipModal) slipModal.classList.remove('active');
    });
  }

  if (btnApproveSlip) {
    btnApproveSlip.addEventListener('click', async () => {
      if (!activePaymentForSlip || !API) return;
      const id = activePaymentForSlip.id || activePaymentForSlip.receiptNo;
      await API.Payments.updateStatus(id, 'ชำระเงินเรียบร้อย (อนุมัติแล้ว)');
      showToast('✓ อนุมัติการชำระเงินและตรวจสอบสลิปเรียบร้อย');
      slipModal.classList.remove('active');
      await refreshDashboard();
    });
  }

  if (btnRejectSlip) {
    btnRejectSlip.addEventListener('click', async () => {
      if (!activePaymentForSlip || !API) return;
      const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธสลิป (เช่น สลิปไม่ชัดเจน / ยอดเงินไม่ตรง):', 'สลิปไม่ถูกต้อง หรือยอดเงินไม่ตรงตามที่ระบุ');
      if (reason === null) return;
      const id = activePaymentForSlip.id || activePaymentForSlip.receiptNo;
      await API.Payments.updateStatus(id, 'ปฏิเสธ (สลิปไม่ถูกต้อง)', reason);
      showToast('✕ ปฏิเสธรายการชำระเงินเรียบร้อย');
      slipModal.classList.remove('active');
      await refreshDashboard();
    });
  }

  // ==========================================
  // 6. Officer Quick Complaint Modal
  // ==========================================
  let activeComplaintId = null;
  function openComplaintModal(id) {
    const c = allComplaints.find(item => item.reqId === id || item.id === id);
    if (!c) return;

    activeComplaintId = id;
    const reqIdEl = document.getElementById('compModalReqId');
    const userNameEl = document.getElementById('compModalUserName');
    const topicEl = document.getElementById('compModalTopic');
    const detailEl = document.getElementById('compModalDetail');
    const phoneEl = document.getElementById('compModalPhone');
    const statusSelect = document.getElementById('compModalStatusSelect');
    const replyInput = document.getElementById('compModalReplyInput');

    if (reqIdEl) reqIdEl.textContent = c.reqId || c.id;
    if (userNameEl) {
      const stallInfo = c.stallNo && c.stallNo !== '-' ? ` (แผงค้า ${c.stallNo})` : '';
      userNameEl.textContent = (c.userName || c.fullName || 'ผู้ใช้งานทั่วไป') + stallInfo;
    }
    if (topicEl) topicEl.textContent = c.topic;
    if (detailEl) detailEl.textContent = c.detail;
    if (phoneEl) phoneEl.textContent = c.phone || '-';
    if (statusSelect) statusSelect.value = c.status || 'รอดำเนินการ';
    if (replyInput) replyInput.value = c.adminReply || '';

    if (complaintModal) complaintModal.classList.add('active');
  }

  if (btnCloseComplaintModal && complaintModal) {
    btnCloseComplaintModal.addEventListener('click', () => complaintModal.classList.remove('active'));
    complaintModal.addEventListener('click', (e) => {
      if (e.target === complaintModal) complaintModal.classList.remove('active');
    });
  }

  if (formUpdateComplaint) {
    formUpdateComplaint.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeComplaintId || !API) return;
      const newStatus = document.getElementById('compModalStatusSelect')?.value || 'รอดำเนินการ';
      const reply = document.getElementById('compModalReplyInput')?.value.trim() || '';

      await API.Complaints.updateStatus(activeComplaintId, newStatus, reply);
      showToast('✓ บันทึกการดำเนินการคำร้องเรียบร้อย');
      complaintModal.classList.remove('active');
      await refreshDashboard();
    });
  }

  // ==========================================
  // 7. Official Municipal Receipt Modal
  // ==========================================
  async function openOfficialReceipt(paymentId) {
    const payment = allPayments.find(p => String(p.id) === String(paymentId) || p.receiptNo === paymentId || p.receipt_no === paymentId);
    if (!payment) {
      showToast('ไม่พบข้อมูลรายการชำระเงิน');
      return;
    }

    const status = payment.status || '';
    const isApproved = status.includes('ชำระเงินเรียบร้อย') || status.includes('อนุมัติ') || status === 'approved' || status === 'ชำระแล้ว';
    if (!isApproved) {
      const wantApprove = confirm(`รายการชำระเงินนี้ (${payment.receiptNo || payment.id}) ยังไม่ได้กดอนุมัติสลิป\n\nต้องการ "อนุมัติรายการชำระเงิน" และออกใบเสร็จรับเงินทันทีหรือไม่?`);
      if (wantApprove && API) {
        await API.Payments.updateStatus(payment.id || payment.receiptNo, 'ชำระเงินเรียบร้อย (อนุมัติแล้ว)');
        payment.status = 'ชำระเงินเรียบร้อย (อนุมัติแล้ว)';
        showToast('อนุมัติการชำระเงินเรียบร้อย ออกใบเสร็จแล้ว');
        await refreshDashboard();
      } else {
        return;
      }
    }

    const total = parseFloat(payment.totalAmount) || 2000;
    const mCount = (payment.months && payment.months.length) || Math.max(1, Math.round(total / 2000));
    let rentFee = 1950 * mCount;
    let trashFee = 50 * mCount;
    let maintFee = 0;
    if (total > 0 && Math.abs(total - (rentFee + trashFee)) > 0.01) {
      rentFee = Math.round(total * (1950 / 2000));
      trashFee = total - rentFee;
    }

    const receiptNo = payment.receiptNo || payment.id || 'REC-11835801';
    const stallNo = payment.stallNo || 'A-10';
    const payerName = payment.payerName || 'นายสมชาย สุขสมบูรณ์';
    const zone = payment.zone || 'โซนตลาดสด ล็อค 10';
    const dateStr = payment.date || new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    const monthsStr = (payment.months && payment.months.length > 0) ? payment.months.join(', ') : (payment.remark || 'รอบประจำงวด');

    const rcptNoEl = document.getElementById('rcptReceiptNo');
    const rcptStallNoEl = document.getElementById('rcptStallNo');
    const rcptOrgCodeEl = document.getElementById('rcptOrgCode');
    const rcptDateEl = document.getElementById('rcptIssueDate');
    const rcptPeriodEl = document.getElementById('rcptBillingPeriod');
    const rcptZoneEl = document.getElementById('rcptZoneRoute');
    const rcptPayerNameEl = document.getElementById('rcptPayerName');
    const rcptPayerAddrEl = document.getElementById('rcptPayerAddress');

    const rcptRentFeeEl = document.getElementById('rcptRentFee');
    const rcptMaintFeeEl = document.getElementById('rcptMaintFee');
    const rcptTrashFeeEl = document.getElementById('rcptTrashFee');
    const rcptSubtotalEl = document.getElementById('rcptSubtotal');
    const rcptGrandTotalEl = document.getElementById('rcptGrandTotal');
    const rcptBarcodeTextEl = document.getElementById('rcptBarcodeText');
    const rcptStampDateEl = document.getElementById('rcptStampDate');

    if (rcptNoEl) rcptNoEl.textContent = receiptNo;
    if (rcptStallNoEl) rcptStallNoEl.textContent = stallNo;
    if (rcptOrgCodeEl) rcptOrgCodeEl.textContent = '1183-64';
    if (rcptDateEl) rcptDateEl.textContent = dateStr;
    if (rcptPeriodEl) rcptPeriodEl.textContent = monthsStr;
    if (rcptZoneEl) rcptZoneEl.textContent = zone;
    if (rcptPayerNameEl) rcptPayerNameEl.textContent = payerName;
    if (rcptPayerAddrEl) rcptPayerAddrEl.textContent = `แผงค้า ${stallNo} ${zone} ตลาดสดเทศบาล`;

    if (rcptRentFeeEl) rcptRentFeeEl.textContent = `${rentFee.toFixed(2)}`;
    if (rcptMaintFeeEl) rcptMaintFeeEl.textContent = `${maintFee.toFixed(2)}`;
    if (rcptTrashFeeEl) rcptTrashFeeEl.textContent = `${trashFee.toFixed(2)}`;
    if (rcptSubtotalEl) rcptSubtotalEl.textContent = `${total.toFixed(2)}`;
    if (rcptGrandTotalEl) rcptGrandTotalEl.textContent = `${total.toFixed(2)}`;
    if (rcptBarcodeTextEl) rcptBarcodeTextEl.textContent = `${receiptNo.replace(/[^0-9]/g, '') || '1183580159730'}`;
    if (rcptStampDateEl) rcptStampDateEl.textContent = dateStr;

    if (receiptModal) receiptModal.classList.add('active');
  }

  if (btnCloseReceipt && receiptModal) {
    btnCloseReceipt.addEventListener('click', () => receiptModal.classList.remove('active'));
    receiptModal.addEventListener('click', (e) => {
      if (e.target === receiptModal) receiptModal.classList.remove('active');
    });
  }

  if (btnPrintReceipt) {
    btnPrintReceipt.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================
  // 8. Reusable Delete Confirmation Modal
  // ==========================================
  function confirmDeletion(titleText, targetInfoText, callback) {
    if (!adminDeleteConfirmModal) {
      if (confirm(`ยืนยันการลบ: ${targetInfoText}?`)) callback();
      return;
    }

    if (deleteConfirmTargetInfo) deleteConfirmTargetInfo.textContent = targetInfoText;
    pendingDeleteCallback = callback;
    adminDeleteConfirmModal.classList.add('active');
  }

  function closeDeleteModal() {
    if (adminDeleteConfirmModal) adminDeleteConfirmModal.classList.remove('active');
    pendingDeleteCallback = null;
  }

  btnCloseDeleteModal?.addEventListener('click', closeDeleteModal);
  btnCancelDelete?.addEventListener('click', closeDeleteModal);
  adminDeleteConfirmModal?.addEventListener('click', (e) => {
    if (e.target === adminDeleteConfirmModal) closeDeleteModal();
  });

  btnConfirmDelete?.addEventListener('click', async () => {
    if (typeof pendingDeleteCallback === 'function') {
      const cb = pendingDeleteCallback;
      closeDeleteModal();
      await cb();
    }
  });

  // Helper: รีเฟรชตัวเลือกแผงค้าในดรอปดาวน์ พร้อมแสดงสถานะ ว่าง / มีผู้เช่าแล้ว
  function refreshStallSelectOptions(selectEl, currentStall, excludeTenantId) {
    if (!selectEl) return;
    const occupiedMap = {};
    allTenants.forEach(t => {
      if (excludeTenantId && (String(t.id) === String(excludeTenantId) || t.phone === excludeTenantId)) return;
      const eff = getEffectiveTenantStall(t);
      const s = (eff.stallNo || '').replace('แผงค้า ', '').trim().toUpperCase();
      if (s && s !== '-' && s !== 'ระบุที่หน้าชำระเงิน' && (t.status === 'ปกติ' || t.status === 'รอต่อสัญญา')) {
        occupiedMap[s] = t.full_name || t.fullName || 'มีผู้เช่าแล้ว';
      }
    });

    let html = '<option value="">-- เลือกแผงค้า (A-1 ถึง A-15) --</option>';
    for (let i = 1; i <= 15; i++) {
      const key = `A-${i}`;
      const occName = occupiedMap[key];
      if (occName) {
        html += `<option value="${key}" style="color:#ef4444; background:#fef2f2;">${key} (ล็อค ${i}) - มีผู้เช่าแล้ว</option>`;
      } else {
        html += `<option value="${key}">${key} (ล็อค ${i}) - ว่าง</option>`;
      }
    }
    html += '<option value="custom">ระบุเอง...</option>';
    selectEl.innerHTML = html;
    if (currentStall) {
      const clean = currentStall.replace('แผงค้า ', '').trim().toUpperCase();
      const matchOpt = Array.from(selectEl.options).find(o => o.value === clean);
      selectEl.value = matchOpt ? clean : 'custom';
    }
  }

  // ==========================================
  // 9. Tenants CRUD: Add / Edit / Delete
  // ==========================================
  function openAddTenantModal() {
    if (!adminTenantModal) return;
    if (tenantModalTitle) tenantModalTitle.innerHTML = `${ICON_PLUS} <span>เพิ่มผู้เช่าแผงค้าใหม่</span>`;
    if (tenantModalId) tenantModalId.value = '';
    if (tenantModalFullName) tenantModalFullName.value = '';
    if (tenantModalPhone) tenantModalPhone.value = '';
    if (tenantModalPassword) tenantModalPassword.value = '123456';
    if (tenantModalStallNo) tenantModalStallNo.value = '';
    refreshStallSelectOptions(tenantModalStallSelect, '', null);
    if (tenantModalUserType) tenantModalUserType.value = 'บุคคลธรรมดา';
    if (tenantModalAddress) tenantModalAddress.value = '';
    if (tenantModalStatus) tenantModalStatus.value = 'ปกติ';
    adminTenantModal.classList.add('active');
  }

  function openEditTenantModal(id) {
    if (!adminTenantModal) return;
    const u = allTenants.find(item => String(item.id) === String(id) || item.phone === id);
    if (!u) {
      showToast('ไม่พบข้อมูลผู้เช่า');
      return;
    }

    const eff = getEffectiveTenantStall(u);
    const effStall = (u.stall_no && u.stall_no !== '-' && u.stall_no !== 'ระบุที่หน้าชำระเงิน') ? u.stall_no : (eff.stallNo !== '-' ? eff.stallNo : '');
    const effAddress = (u.address && u.address !== '-' && u.address !== 'ระบุที่หน้าชำระเงิน') ? u.address : (eff.address !== '-' ? eff.address : '');

    if (tenantModalTitle) tenantModalTitle.innerHTML = `${ICON_EDIT} <span>แก้ไขข้อมูลผู้เช่าแผงค้า</span>`;
    if (tenantModalId) tenantModalId.value = u.id || u.phone;
    if (tenantModalFullName) tenantModalFullName.value = u.full_name || u.fullName || '';
    if (tenantModalPhone) tenantModalPhone.value = u.phone || '';
    if (tenantModalPassword) tenantModalPassword.value = u.raw_password || u.password || '123456';
    if (tenantModalStallNo) tenantModalStallNo.value = effStall;
    refreshStallSelectOptions(tenantModalStallSelect, effStall, u.id || u.phone);
    if (tenantModalUserType) tenantModalUserType.value = u.user_type || u.userType || 'บุคคลธรรมดา';
    if (tenantModalAddress) tenantModalAddress.value = effAddress;
    if (tenantModalStatus) tenantModalStatus.value = u.status || 'ปกติ';

    adminTenantModal.classList.add('active');
  }

  function closeTenantModal() {
    if (adminTenantModal) adminTenantModal.classList.remove('active');
  }

  btnGenTenantPwd?.addEventListener('click', () => {
    const randomPwd = Math.floor(100000 + Math.random() * 900000).toString();
    if (tenantModalPassword) tenantModalPassword.value = randomPwd;
    showToast(`สุ่มรหัสผ่านใหม่: ${randomPwd}`);
  });

  // Connect Tenant Stall Select Dropdown
  tenantModalStallSelect?.addEventListener('change', () => {
    const val = tenantModalStallSelect.value;
    if (!val) return;
    if (val === 'custom') {
      if (tenantModalStallNo) {
        tenantModalStallNo.focus();
        tenantModalStallNo.select();
      }
    } else {
      if (tenantModalStallNo) tenantModalStallNo.value = val;
      const num = val.replace('A-', '');
      if (tenantModalAddress && (!tenantModalAddress.value || tenantModalAddress.value.includes('ล็อค') || tenantModalAddress.value.includes('ระบุที่หน้าชำระเงิน'))) {
        tenantModalAddress.value = `โซนตลาดสด ล็อค ${num}`;
      }
    }
  });

  tenantModalStallNo?.addEventListener('input', () => {
    const val = tenantModalStallNo.value.trim().toUpperCase();
    if (tenantModalStallSelect) {
      const opt = Array.from(tenantModalStallSelect.options).find(o => o.value === val);
      tenantModalStallSelect.value = opt ? val : (val ? 'custom' : '');
    }
  });

  btnOpenAddTenantModal?.addEventListener('click', openAddTenantModal);
  btnCloseTenantModal?.addEventListener('click', closeTenantModal);
  btnCancelTenantModal?.addEventListener('click', closeTenantModal);
  adminTenantModal?.addEventListener('click', (e) => {
    if (e.target === adminTenantModal) closeTenantModal();
  });

  formTenantCRUD?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!API || !API.Admin) return;

    const id = tenantModalId?.value.trim();
    const stallVal = tenantModalStallNo?.value.trim();

    // ป้องกันการเลือกแผงค้าซ้ำกับผู้เช่ารายอื่น
    const normStall = (stallVal || '').replace('แผงค้า ', '').trim().toUpperCase();
    if (normStall && normStall !== '-' && normStall !== 'ระบุที่หน้าชำระเงิน') {
      const conflict = allTenants.find(t => {
        if (id && (String(t.id) === String(id) || t.phone === id)) return false;
        const eff = getEffectiveTenantStall(t);
        const s = (eff.stallNo || '').replace('แผงค้า ', '').trim().toUpperCase();
        return s === normStall && (t.status === 'ปกติ' || t.status === 'รอต่อสัญญา');
      });
      if (conflict) {
        showToast(`⚠️ แผงค้า ${normStall} มีผู้เช่าแล้ว (${conflict.full_name || conflict.fullName}) ไม่สามารถเลือกล็อคซ้ำได้`);
        return;
      }
    }

    const addrVal = tenantModalAddress?.value.trim() || `แผงค้า ${stallVal} ตลาดเทศบาล`;
    const payload = {
      fullName: tenantModalFullName?.value.trim(),
      phone: tenantModalPhone?.value.trim(),
      password: tenantModalPassword?.value.trim() || '123456',
      stallNo: stallVal,
      userType: tenantModalUserType?.value,
      address: addrVal,
      status: tenantModalStatus?.value
    };

    if (id) {
      await API.Admin.updateTenant(id, payload);
      showToast('✓ แก้ไขข้อมูลผู้เช่าแผงค้าเรียบร้อย');
    } else {
      await API.Admin.createTenant(payload);
      showToast('✓ เพิ่มผู้เช่าแผงค้าใหม่เรียบร้อย');
    }

    closeTenantModal();
    await refreshDashboard();
  });

  function triggerDeleteTenant(id) {
    const u = allTenants.find(item => String(item.id) === String(id) || item.phone === id);
    const name = u ? (u.full_name || u.fullName || u.stallNo) : id;
    confirmDeletion('ผู้เช่าแผงค้า', `ผู้เช่า: ${name} (รหัส/เบอร์: ${id})`, async () => {
      await API.Admin.deleteTenant(id);
      showToast('✓ ลบข้อมูลผู้เช่าแผงค้าเรียบร้อย');
      await refreshDashboard();
    });
  }

  // ==========================================
  // 10. Payments CRUD: Add / Edit / Delete
  // ==========================================
  function openAddPaymentModal() {
    if (!adminPaymentModal) return;
    if (paymentModalTitle) paymentModalTitle.innerHTML = `${ICON_PLUS} <span>บันทึกการชำระเงินใหม่</span>`;
    if (paymentModalId) paymentModalId.value = '';
    if (paymentModalReceiptNo) paymentModalReceiptNo.value = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
    if (paymentModalDate) paymentModalDate.value = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (paymentModalPayerName) paymentModalPayerName.value = '';
    if (paymentModalPhone) paymentModalPhone.value = '';
    if (paymentModalStallNo) paymentModalStallNo.value = '';
    refreshStallSelectOptions(paymentModalStallSelect, '', null);
    if (paymentModalZone) paymentModalZone.value = 'โซนตลาดสด ล็อค 10';
    if (paymentModalAmount) paymentModalAmount.value = '50';
    if (paymentModalStatus) paymentModalStatus.value = 'ชำระเงินเรียบร้อย (อนุมัติแล้ว)';
    if (paymentModalMonths) paymentModalMonths.value = 'ตุลาคม';
    if (paymentModalRemark) paymentModalRemark.value = '';

    adminPaymentModal.classList.add('active');
  }

  function openEditPaymentModal(id) {
    if (!adminPaymentModal) return;
    const p = allPayments.find(item => String(item.id) === String(id) || item.receiptNo === id || item.receipt_no === id);
    if (!p) {
      showToast('ไม่พบข้อมูลรายการชำระเงิน');
      return;
    }

    if (paymentModalTitle) paymentModalTitle.innerHTML = `${ICON_EDIT} <span>แก้ไขข้อมูลการชำระเงิน</span>`;
    if (paymentModalId) paymentModalId.value = p.id || p.receiptNo;
    if (paymentModalReceiptNo) paymentModalReceiptNo.value = p.receiptNo || p.id;
    if (paymentModalDate) paymentModalDate.value = p.date || '';
    if (paymentModalPayerName) paymentModalPayerName.value = p.payerName || '';
    if (paymentModalPhone) paymentModalPhone.value = p.phone || '';
    if (paymentModalStallNo) paymentModalStallNo.value = p.stallNo || '';
    refreshStallSelectOptions(paymentModalStallSelect, p.stallNo, null);
    if (paymentModalZone) paymentModalZone.value = p.zone || '';
    if (paymentModalAmount) paymentModalAmount.value = parseFloat(p.totalAmount) || 0;
    if (paymentModalStatus) paymentModalStatus.value = p.status || 'ชำระเงินเรียบร้อย';
    if (paymentModalMonths) paymentModalMonths.value = Array.isArray(p.months) ? p.months.join(', ') : (p.remark || '');
    if (paymentModalRemark) paymentModalRemark.value = p.remark || '';

    adminPaymentModal.classList.add('active');
  }

  // Connect Payment Stall Select Dropdown
  paymentModalStallSelect?.addEventListener('change', () => {
    const val = paymentModalStallSelect.value;
    if (!val) return;
    if (val === 'custom') {
      if (paymentModalStallNo) {
        paymentModalStallNo.focus();
        paymentModalStallNo.select();
      }
    } else {
      if (paymentModalStallNo) paymentModalStallNo.value = val;
      const num = val.replace('A-', '');
      if (paymentModalZone) {
        paymentModalZone.value = `โซนตลาดสด ล็อค ${num}`;
      }
    }
  });

  paymentModalStallNo?.addEventListener('input', () => {
    const val = paymentModalStallNo.value.trim().toUpperCase();
    if (paymentModalStallSelect) {
      const opt = Array.from(paymentModalStallSelect.options).find(o => o.value === val);
      paymentModalStallSelect.value = opt ? val : (val ? 'custom' : '');
    }
  });

  function closePaymentModal() {
    if (adminPaymentModal) adminPaymentModal.classList.remove('active');
  }

  btnOpenAddPaymentModal?.addEventListener('click', openAddPaymentModal);
  btnClosePaymentModal?.addEventListener('click', closePaymentModal);
  btnCancelPaymentModal?.addEventListener('click', closePaymentModal);
  adminPaymentModal?.addEventListener('click', (e) => {
    if (e.target === adminPaymentModal) closePaymentModal();
  });

  formPaymentCRUD?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!API || !API.Admin) return;

    const id = paymentModalId?.value.trim();
    const monthsRaw = paymentModalMonths?.value.trim();
    const monthsArr = monthsRaw ? monthsRaw.split(',').map(m => m.trim()).filter(Boolean) : ['งวดปัจจุบัน'];

    const payload = {
      receiptNo: paymentModalReceiptNo?.value.trim() || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      payerName: paymentModalPayerName?.value.trim(),
      phone: paymentModalPhone?.value.trim(),
      stallNo: paymentModalStallNo?.value.trim(),
      zone: paymentModalZone?.value.trim() || 'ตลาดเทศบาล',
      totalAmount: parseFloat(paymentModalAmount?.value) || 50,
      status: paymentModalStatus?.value,
      months: monthsArr,
      remark: paymentModalRemark?.value.trim() || ''
    };

    if (paymentModalDate?.value.trim()) {
      payload.date = paymentModalDate.value.trim();
    }

    if (id) {
      await API.Admin.updatePayment(id, payload);
      showToast('✓ แก้ไขรายการชำระเงินเรียบร้อย');
    } else {
      await API.Admin.createPayment(payload);
      showToast('✓ เพิ่มรายการชำระเงินใหม่เรียบร้อย');
    }

    closePaymentModal();
    await refreshDashboard();
  });

  function triggerDeletePayment(id) {
    const p = allPayments.find(item => String(item.id) === String(id) || item.receiptNo === id);
    const targetLabel = p ? `เลขที่ใบเสร็จ: ${p.receiptNo || p.id} (${p.payerName || ''})` : `รหัสรายการ: ${id}`;
    confirmDeletion('รายการชำระเงิน', targetLabel, async () => {
      await API.Admin.deletePayment(id);
      showToast('✓ ลบรายการชำระเงินเรียบร้อย');
      await refreshDashboard();
    });
  }

  // ==========================================
  // 11. Complaints CRUD: Add / Edit / Delete
  // ==========================================
  function openAddComplaintModal() {
    if (!adminComplaintFormModal) return;
    if (complaintFormModalTitle) complaintFormModalTitle.innerHTML = `${ICON_PLUS} <span>เพิ่มเรื่องร้องเรียน / คำร้อง</span>`;
    if (complaintModalId) complaintModalId.value = '';
    if (complaintModalUserName) complaintModalUserName.value = '';
    if (complaintModalTopic) complaintModalTopic.value = '';
    if (complaintModalService) complaintModalService.value = 'ค่าเช่าแผง / การเช่าแผงค้า';
    if (complaintModalPhone) complaintModalPhone.value = '';
    if (complaintModalDetail) complaintModalDetail.value = '';
    if (complaintModalStatus) complaintModalStatus.value = 'รอดำเนินการ';
    if (complaintModalAdminReply) complaintModalAdminReply.value = '';

    adminComplaintFormModal.classList.add('active');
  }

  function openEditComplaintModal(id) {
    if (!adminComplaintFormModal) return;
    const c = allComplaints.find(item => String(item.id) === String(id) || item.reqId === id);
    if (!c) {
      showToast('ไม่พบข้อมูลเรื่องร้องเรียน');
      return;
    }

    if (complaintFormModalTitle) complaintFormModalTitle.innerHTML = `${ICON_EDIT} <span>แก้ไขข้อมูลเรื่องร้องเรียน</span>`;
    if (complaintModalId) complaintModalId.value = c.reqId || c.id;
    if (complaintModalUserName) complaintModalUserName.value = c.userName || c.fullName || '';
    if (complaintModalTopic) complaintModalTopic.value = c.topic || '';
    if (complaintModalService) complaintModalService.value = c.service || 'ค่าเช่าแผง / การเช่าแผงค้า';
    if (complaintModalPhone) complaintModalPhone.value = c.phone || '';
    if (complaintModalDetail) complaintModalDetail.value = c.detail || '';
    if (complaintModalStatus) complaintModalStatus.value = c.status || 'รอดำเนินการ';
    if (complaintModalAdminReply) complaintModalAdminReply.value = c.adminReply || '';

    adminComplaintFormModal.classList.add('active');
  }

  function closeComplaintFormModal() {
    if (adminComplaintFormModal) adminComplaintFormModal.classList.remove('active');
  }

  btnOpenAddComplaintModal?.addEventListener('click', openAddComplaintModal);
  btnCloseComplaintFormModal?.addEventListener('click', closeComplaintFormModal);
  btnCancelComplaintFormModal?.addEventListener('click', closeComplaintFormModal);
  adminComplaintFormModal?.addEventListener('click', (e) => {
    if (e.target === adminComplaintFormModal) closeComplaintFormModal();
  });

  formComplaintCRUD?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!API || !API.Admin) return;

    const id = complaintModalId?.value.trim();
    const payload = {
      userName: complaintModalUserName?.value.trim() || '',
      topic: complaintModalTopic?.value.trim(),
      service: complaintModalService?.value,
      phone: complaintModalPhone?.value.trim(),
      detail: complaintModalDetail?.value.trim(),
      status: complaintModalStatus?.value,
      adminReply: complaintModalAdminReply?.value.trim() || ''
    };

    if (id) {
      await API.Admin.updateComplaint(id, payload);
      showToast('✓ แก้ไขเรื่องร้องเรียนเรียบร้อย');
    } else {
      await API.Admin.createComplaint(payload);
      showToast('✓ เพิ่มเรื่องร้องเรียนเรียบร้อย');
    }

    closeComplaintFormModal();
    await refreshDashboard();
  });

  function triggerDeleteComplaint(id) {
    const c = allComplaints.find(item => String(item.id) === String(id) || item.reqId === id);
    const label = c ? `คำร้อง: ${c.reqId || c.id} - ${c.topic}` : `รหัสคำร้อง: ${id}`;
    confirmDeletion('เรื่องร้องเรียน', label, async () => {
      await API.Admin.deleteComplaint(id);
      showToast('✓ ลบเรื่องร้องเรียนเรียบร้อย');
      await refreshDashboard();
    });
  }

  // ==========================================
  // 12. Tab Navigation
  // ==========================================
  function switchTab(tabName) {
    activeTab = tabName;
    [tabBtnPayments, tabBtnComplaints, tabBtnTenants].forEach(btn => btn?.classList.remove('active'));
    [tabSectionPayments, tabSectionComplaints, tabSectionTenants].forEach(sec => sec ? sec.style.display = 'none' : null);

    if (tabName === 'payments') {
      tabBtnPayments?.classList.add('active');
      if (tabSectionPayments) tabSectionPayments.style.display = 'block';
      renderPayments();
    } else if (tabName === 'complaints') {
      tabBtnComplaints?.classList.add('active');
      if (tabSectionComplaints) tabSectionComplaints.style.display = 'block';
      renderComplaints();
    } else if (tabName === 'tenants') {
      tabBtnTenants?.classList.add('active');
      if (tabSectionTenants) tabSectionTenants.style.display = 'block';
      renderTenants();
    }
  }

  tabBtnPayments?.addEventListener('click', () => {
    if (filterPaymentStatus) {
      filterPaymentStatus.value = 'all';
    }
    switchTab('payments');
    loadPayments();
  });
  tabBtnComplaints?.addEventListener('click', () => {
    switchTab('complaints');
    loadComplaints();
  });
  tabBtnTenants?.addEventListener('click', () => {
    switchTab('tenants');
    loadTenants();
  });

  // Search & Filter event bindings
  searchPaymentsInput?.addEventListener('input', renderPayments);
  filterPaymentStatus?.addEventListener('change', renderPayments);
  searchComplaintsInput?.addEventListener('input', renderComplaints);
  filterComplaintStatus?.addEventListener('change', renderComplaints);

  // Admin Logout Handler
  const btnAdminLogout = document.getElementById('btnAdminLogout');
  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.showLogoutConfirm === 'function') {
        window.showLogoutConfirm(() => {
          if (API && API.Admin) {
            API.Admin.logout();
          } else {
            localStorage.removeItem('marketrent_admin_token');
            localStorage.removeItem('marketrent_admin_user');
          }
          window.location.href = 'admin-login.html';
        });
      } else {
        if (confirm('คุณต้องการออกจากระบบเจ้าหน้าที่หลังบ้านใช่หรือไม่?')) {
          if (API && API.Admin) {
            API.Admin.logout();
          } else {
            localStorage.removeItem('marketrent_admin_token');
            localStorage.removeItem('marketrent_admin_user');
          }
          window.location.href = 'admin-login.html';
        }
      }
    });
  }

  // Initial Load
  await refreshDashboard();
});
