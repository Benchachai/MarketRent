// MarketPay - Centralized API Service with Seamless Offline/LocalStorage Fallback
// GURU IT Solution Co., Ltd.

(function (window) {
  'use strict';

  // Determine API Base URL
  const isLocalFile = window.location.protocol === 'file:';
  const isPort5000 = window.location.port === '5000';
  const API_BASE = (isLocalFile || !isPort5000) 
    ? 'http://localhost:5000/api' 
    : '/api';

  let backendAvailable = null; // null = unchecked, true = online, false = offline

  // Check backend server status
  async function checkServer() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`${API_BASE}/health`, { credentials: 'omit', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        backendAvailable = true;
        return true;
      }
    } catch (e) {
      // Server down or offline
    }
    backendAvailable = false;
    return false;
  }

  // Get Auth Token
  // Get Tenant Auth Token
  function getToken() {
    return localStorage.getItem('smartpay_token') || '';
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('smartpay_token', token);
    } else {
      localStorage.removeItem('smartpay_token');
    }
  }

  // Get Admin Auth Token
  function getAdminToken() {
    return localStorage.getItem('marketrent_admin_token') || '';
  }

  function setAdminToken(token) {
    if (token) {
      localStorage.setItem('marketrent_admin_token', token);
    } else {
      localStorage.removeItem('marketrent_admin_token');
    }
  }

  // Generic HTTP fetch with automatic offline fallback
  async function request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    let token = getToken();
    const adminToken = getAdminToken();
    if (endpoint.startsWith('/admin') || window.location.pathname.includes('admin') || !token) {
      if (adminToken) {
        token = adminToken;
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      backendAvailable = true;
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeoutId);
      backendAvailable = false;
      return { ok: false, status: 0, error: err.message, isOffline: true };
    }
  }

  // ==========================================
  // Auth Services
  // ==========================================
  const Auth = {
    // Login
    async login(phone, password) {
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

      // Try Backend API First
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone, password })
      });

      if (res.ok && res.data.success) {
        // Save session & token
        const user = res.data.user;
        setToken(res.data.token);
        localStorage.setItem('smartpay_user', JSON.stringify(user));
        return { success: true, user, source: 'backend' };
      }

      // If backend returned explicit authentication error (e.g. 401 wrong password or 404 not found)
      if (!res.isOffline && res.data) {
        return { success: false, message: res.data.message || 'เข้าสู่ระบบไม่สำเร็จ', source: 'backend' };
      }

      // Offline / LocalStorage Fallback
      console.warn('[MarketPay API] Backend unreachable, falling back to LocalStorage auth');
      let users = [];
      try {
        users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
      } catch (e) {
        users = [];
      }

      // Default demo account
      if (!users.some(u => (u.phone || '').replace(/[^0-9]/g, '') === '0812345678')) {
        users.unshift({
          userType: 'บุคคลธรรมดา',
          fullName: 'นายสมชาย สุขสมบูรณ์',
          phone: '0812345678',
          password: '123456',
          stallNo: 'A-10',
          address: 'โซนตลาดสด ล็อค 10',
          service: 'บริการเช่าแผงค้า',
          status: 'ปกติ'
        });
        localStorage.setItem('smartpay_users', JSON.stringify(users));
      }

      const foundUser = users.find(u => (u.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
      if (!foundUser) {
        return { success: false, message: 'ไม่พบบัญชีผู้ใช้งานที่ลงทะเบียนด้วยเบอร์นี้', source: 'offline' };
      }

      if (foundUser.password !== password) {
        return { success: false, message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', source: 'offline' };
      }

      localStorage.setItem('smartpay_user', JSON.stringify(foundUser));
      return { success: true, user: foundUser, source: 'offline' };
    },

    // Register
    async register(userData) {
      const cleanPhone = (userData.phone || '').replace(/[^0-9]/g, '');
      const payload = { ...userData, phone: cleanPhone };

      // Try Backend API First
      const res = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data.success) {
        const user = res.data.user;
        setToken(res.data.token);
        localStorage.setItem('smartpay_user', JSON.stringify(user));
        // Keep offline list in sync
        this.saveLocalUser(user, userData.password);
        return { success: true, user, source: 'backend' };
      }

      if (!res.isOffline && res.data) {
        return { success: false, message: res.data.message || 'ลงทะเบียนไม่สำเร็จ', source: 'backend' };
      }

      // Offline / LocalStorage Fallback
      console.warn('[MarketPay API] Backend unreachable, saving user to LocalStorage');
      const newUser = {
        userType: userData.userType || 'บุคคลธรรมดา',
        fullName: userData.fullName,
        phone: cleanPhone,
        password: userData.password,
        stallNo: userData.stallNo,
        address: userData.address,
        service: 'บริการเช่าแผงค้า',
        status: 'ปกติ',
        registeredAt: new Date().toISOString()
      };

      this.saveLocalUser(newUser, userData.password);
      localStorage.setItem('smartpay_user', JSON.stringify(newUser));
      return { success: true, user: newUser, source: 'offline' };
    },

    saveLocalUser(user, password) {
      try {
        let users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');
        const idx = users.findIndex(u => (u.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
        const record = { ...user, password: password || user.password };
        if (idx >= 0) {
          users[idx] = record;
        } else {
          users.push(record);
        }
        localStorage.setItem('smartpay_users', JSON.stringify(users));
        localStorage.setItem('smartpay_registered_list', JSON.stringify(users));
      } catch (e) {
        console.error('Error saving local user:', e);
      }
    },

    // Get current logged-in user
    getCurrentUser() {
      try {
        const data = localStorage.getItem('smartpay_user');
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    },

    // Fetch latest user profile and status from backend or local database
    async getProfile() {
      // 1. Try backend API
      const res = await request('/auth/me');
      if (res.ok && res.data && res.data.success && res.data.user) {
        const u = res.data.user;
        const cur = this.getCurrentUser() || {};
        const merged = { ...cur, ...u };
        localStorage.setItem('smartpay_user', JSON.stringify(merged));
        return { success: true, user: merged, source: 'backend' };
      }

      // 2. Fallback to smartpay_users list (updated by Admin panel)
      try {
        const cur = this.getCurrentUser();
        if (cur) {
          const users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
          const cleanP = (cur.phone || '').replace(/[^0-9]/g, '');
          const match = users.find(u => (cur.id && String(u.id) === String(cur.id)) || (cleanP && (u.phone || '').replace(/[^0-9]/g, '') === cleanP));
          if (match) {
            const merged = { ...cur, ...match, status: match.status || cur.status || 'ปกติ' };
            localStorage.setItem('smartpay_user', JSON.stringify(merged));
            return { success: true, user: merged, source: 'offline' };
          }
          return { success: true, user: cur, source: 'offline' };
        }
      } catch (e) {
        console.error(e);
      }
      return { success: false, user: this.getCurrentUser() };
    },

    // Logout
    logout() {
      setToken(null);
      localStorage.removeItem('smartpay_user');
    }
  };

  // ==========================================
  // Payments Services
  // ==========================================
  const Payments = {
    // Create new payment
    async create(paymentData) {
      const res = await request('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (res.ok && res.data.success) {
        const saved = res.data.payment;
        // Sync local cache
        this.saveLocalPayment(saved);
        return { success: true, payment: saved, source: 'backend' };
      }

      // Offline Fallback
      console.warn('[MarketPay API] Backend unreachable, saving payment to LocalStorage');
      const fallbackRecord = {
        ...paymentData,
        id: 'REC-' + Date.now().toString().slice(-6),
        receiptNo: paymentData.receiptNo || 'REC-' + Date.now().toString().slice(-6),
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        rawDate: new Date().toISOString(),
        status: paymentData.status || 'รอตรวจสอบ'
      };
      this.saveLocalPayment(fallbackRecord);
      return { success: true, payment: fallbackRecord, source: 'offline' };
    },

    // Save payment record to LocalStorage
    saveLocalPayment(payment) {
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        payments.unshift(payment);
        localStorage.setItem('smartpay_payments', JSON.stringify(payments));

        // Update paid months
        if (payment.monthKeys && payment.monthKeys.length > 0) {
          const paidMonths = JSON.parse(localStorage.getItem('smartpay_paid_months') || '[]');
          payment.monthKeys.forEach(k => {
            if (!paidMonths.includes(k)) paidMonths.push(k);
          });
          localStorage.setItem('smartpay_paid_months', JSON.stringify(paidMonths));
        }
      } catch (e) {
        console.error('Error saving local payment:', e);
      }
    },

    // List payments
    async getAll(phone) {
      const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await request(`/payments${query}`, { method: 'GET' });

      if (res.ok && res.data.success && Array.isArray(res.data.payments)) {
        // Sync to localStorage
        localStorage.setItem('smartpay_payments', JSON.stringify(res.data.payments));
        return res.data.payments;
      }

      // Fallback to localStorage
      try {
        return JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
      } catch (e) {
        return [];
      }
    },

    // Check stall occupancy status (A-1 to A-15)
    async getStallsStatus(phone) {
      const q = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await request(`/payments/stalls/status${q}`, { method: 'GET' });
      if (res.ok && res.data.success && Array.isArray(res.data.stalls)) {
        return res.data.stalls;
      }

      // Offline / LocalStorage fallback
      try {
        const users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
        const occupiedMap = {};

        users.forEach(u => {
          const raw = u.stall_no || u.stallNo || '';
          const match = raw.match(/A-\d+/i) || raw.match(/\d+/);
          const stallKey = match ? (match[0].startsWith('A-') ? match[0].toUpperCase() : `A-${match[0]}`) : raw;
          if (stallKey && stallKey !== '-' && stallKey !== 'ระบุที่หน้าชำระเงิน' && (u.status === 'ปกติ' || !u.status)) {
            const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
            occupiedMap[stallKey] = {
              tenantName: u.full_name || u.fullName,
              phone: u.phone,
              isSelf: cleanPhone ? (uPhone === cleanPhone) : false
            };
          }
        });

        const stalls = [];
        for (let i = 1; i <= 15; i++) {
          const key = `A-${i}`;
          const occ = occupiedMap[key];
          stalls.push({
            stallNo: key,
            zone: `ล็อค ${i}`,
            isOccupied: !!occ && !occ.isSelf,
            isSelf: occ ? occ.isSelf : false,
            occupantName: occ ? (occ.isSelf ? occ.tenantName : null) : null,
            occupantPhone: null
          });
        }
        return stalls;
      } catch (e) {
        return [];
      }
    },

    // Get list of paid month keys (e.g. ['jan', 'feb'])
    async getPaidMonths(phone) {
      const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await request(`/payments/paid-months${query}`, { method: 'GET' });

      if (res.ok && res.data.success && Array.isArray(res.data.paidMonths)) {
        localStorage.setItem('smartpay_paid_months', JSON.stringify(res.data.paidMonths));
        return res.data.paidMonths;
      }

      try {
        return JSON.parse(localStorage.getItem('smartpay_paid_months') || '[]');
      } catch (e) {
        return [];
      }
    },

    // Get single payment by id
    async getById(id) {
      const res = await request(`/payments/${encodeURIComponent(id)}`, { method: 'GET' });
      if (res.ok && res.data.success && res.data.payment) {
        return res.data.payment;
      }
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        return payments.find(p => String(p.id) === String(id) || p.receiptNo === id || p.receipt_no === id) || null;
      } catch (e) {
        return null;
      }
    },

    // Update payment status (e.g. 'ชำระเงินเรียบร้อย', 'รอตรวจสอบ', 'ปฏิเสธ (สลิปไม่ถูกต้อง)')
    async updateStatus(id, status, adminRemark) {
      const res = await request(`/payments/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminRemark })
      });

      // Always update local cache
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        const idx = payments.findIndex(p => String(p.id) === String(id) || p.receiptNo === id || p.receipt_no === id);
        if (idx >= 0) {
          payments[idx].status = status;
          if (adminRemark) payments[idx].adminRemark = adminRemark;
          localStorage.setItem('smartpay_payments', JSON.stringify(payments));

          // Recompute smartpay_paid_months
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
      } catch (e) {
        console.error('Error updating local payment status:', e);
      }

      if (res.ok && res.data.success) {
        return { success: true, payment: res.data.payment };
      }
      return { success: true, message: 'อัปเดตสถานะในระบบเรียบร้อย (ออฟไลน์)' };
    }
  };

  // ==========================================
  // Complaints Services
  // ==========================================
  const Complaints = {
    async create(complaintData) {
      const res = await request('/complaints', {
        method: 'POST',
        body: JSON.stringify(complaintData)
      });

      if (res.ok && res.data.success) {
        const c = res.data.complaint;
        this.saveLocalComplaint(c);
        return { success: true, complaint: c, source: 'backend' };
      }

      // Offline Fallback
      const fallbackRecord = {
        id: 'REQ-' + Date.now().toString().slice(-6),
        reqId: 'REQ-' + Date.now().toString().slice(-6),
        service: complaintData.service || 'ค่าเช่าแผง / การเช่าแผงค้า',
        topic: complaintData.topic,
        detail: complaintData.detail,
        status: 'รอดำเนินการ',
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
      };
      this.saveLocalComplaint(fallbackRecord);
      return { success: true, complaint: fallbackRecord, source: 'offline' };
    },

    saveLocalComplaint(c) {
      try {
        const complaints = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        complaints.unshift(c);
        localStorage.setItem('smartpay_complaints', JSON.stringify(complaints));
      } catch (e) {
        console.error('Error saving local complaint:', e);
      }
    },

    async getAll(phone) {
      const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await request(`/complaints${query}`, { method: 'GET' });

      if (res.ok && res.data.success && Array.isArray(res.data.complaints)) {
        const mapped = res.data.complaints.map(c => ({
          ...c,
          adminReply: c.adminReply || c.admin_reply || ''
        }));
        localStorage.setItem('smartpay_complaints', JSON.stringify(mapped));
        return mapped;
      }

      try {
        const local = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        if (local.length > 0) {
          return local.map(c => ({
            ...c,
            adminReply: c.adminReply || c.admin_reply || ''
          }));
        }
      } catch (e) {
        // continue to initialSeed
      }

      const initialSeed = [
        {
          id: 'REQ-648291',
          reqId: 'REQ-648291',
          phone: phone || '0812345678',
          service: 'ค่าเช่าแผง / การเช่าแผงค้า',
          topic: 'ร้องเรียนการให้บริการแผงค้า',
          detail: 'สอบถามรอบเวลาเจ้าหน้าที่เข้าจัดเก็บขยะและทำความสะอาดบริเวณทางเดินล็อค A-10 ตลาดสดครับ',
          status: 'ดำเนินการแก้ไขแล้ว',
          adminReply: 'เจ้าหน้าที่เข้าจัดเก็บรอบ 09:30 น. ทุกวันจันทร์และพฤหัสบดีครับ',
          date: '15 ต.ค. 2569'
        }
      ];
      try {
        localStorage.setItem('smartpay_complaints', JSON.stringify(initialSeed));
      } catch (e) {}
      return initialSeed;
    },

    // Update complaint status (e.g. 'รอดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการแก้ไขแล้ว')
    async updateStatus(id, status, adminReply) {
      const res = await request(`/complaints/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminReply })
      });

      // Update local storage
      try {
        const complaints = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        const idx = complaints.findIndex(c => c.reqId === id || c.id === id || String(c.id) === String(id));
        if (idx >= 0) {
          complaints[idx].status = status;
          if (adminReply) complaints[idx].adminReply = adminReply;
          localStorage.setItem('smartpay_complaints', JSON.stringify(complaints));
        }
      } catch (e) {
        console.error('Error updating local complaint status:', e);
      }

      if (res.ok && res.data.success) {
        return { success: true, complaint: res.data.complaint };
      }
      return { success: true, message: 'อัปเดตสถานะคำร้องเรียบร้อย (ออฟไลน์)' };
    }
  };

  // ==========================================
  // Admin Back-Office Services
  // ==========================================
  const Admin = {
    // Admin Login (Dedicated credentials)
    async login(username, password) {
      const res = await request('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.ok && res.data.success) {
        setAdminToken(res.data.token);
        localStorage.setItem('marketrent_admin_user', JSON.stringify(res.data.admin));
        return { success: true, admin: res.data.admin, token: res.data.token };
      }

      // Offline Fallback for Admin
      if (username === 'admin' && (password === 'admin1234' || password === 'admin')) {
        const fallbackAdmin = {
          id: 1,
          username: 'admin',
          fullName: 'นายตรวจตลาด กองคลังเทศบาล',
          role: 'admin',
          department: 'กองคลัง ฝ่ายจัดเก็บรายได้ เทศบาลตำบล / อบต.'
        };
        const mockToken = 'mock_admin_token_' + Date.now();
        setAdminToken(mockToken);
        localStorage.setItem('marketrent_admin_user', JSON.stringify(fallbackAdmin));
        return { success: true, admin: fallbackAdmin, token: mockToken };
      }

      return {
        success: false,
        message: (res.data && res.data.message) || 'ชื่อผู้ใช้หรือรหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง'
      };
    },

    getStoredAdmin() {
      try {
        const str = localStorage.getItem('marketrent_admin_user');
        return str ? JSON.parse(str) : null;
      } catch (e) {
        return null;
      }
    },

    logout() {
      setAdminToken(null);
      localStorage.removeItem('marketrent_admin_user');
    },

    async getMe() {
      const res = await request('/admin/me', { method: 'GET' });
      if (res.ok && res.data.success) {
        return res.data.admin;
      }
      return this.getStoredAdmin();
    },

    async getStats() {
      const res = await request('/admin/stats', { method: 'GET' });
      if (res.ok && res.data.success) {
        return res.data.stats;
      }
      // Offline fallback calculation
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        const complaints = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        const users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        const totalRev = payments.reduce((acc, p) => {
          const s = (p.status || '').toLowerCase();
          const isExcluded = s.includes('ปฏิเสธ') || s.includes('reject') || s.includes('รอ') || s.includes('pending');
          return isExcluded ? acc : acc + (parseFloat(p.totalAmount) || 0);
        }, 0);
        const pendingPays = payments.filter(p => (p.status || '').includes('รอ')).length;
        const pendingComps = complaints.filter(c => c.status === 'รอดำเนินการ').length;

        return {
          totalRevenue: totalRev,
          totalPayments: payments.length,
          pendingPayments: pendingPays,
          pendingComplaints: pendingComps,
          totalTenants: users.length || 1
        };
      } catch (e) {
        return { totalRevenue: 0, totalPayments: 0, pendingPayments: 0, pendingComplaints: 0, totalTenants: 1 };
      }
    },

    async getTenants() {
      const res = await request('/admin/tenants', { method: 'GET' });
      let list = [];
      if (res.ok && res.data.success && Array.isArray(res.data.tenants)) {
        list = res.data.tenants;
      } else {
        try {
          list = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        } catch (e) {
          list = [];
        }
      }

      // Sync stall and zone from payments if unset
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        let updatedLocal = false;
        list.forEach(u => {
          const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
          const uName = (u.full_name || u.fullName || '').trim().toLowerCase();
          const isUnset = !u.stall_no || u.stall_no === '-' || u.stall_no === 'ระบุที่หน้าชำระเงิน' || !u.stallNo || u.stallNo === '-';
          if (isUnset) {
            const p = payments.find(pay => {
              const pPhone = (pay.phone || '').replace(/[^0-9]/g, '');
              const pName = (pay.payerName || pay.payer_name || '').trim().toLowerCase();
              const hasStall = (pay.stallNo && pay.stallNo !== '-') || (pay.stall_no && pay.stall_no !== '-');
              return hasStall && ((uPhone && pPhone === uPhone) || (uName && pName === uName));
            });
            if (p) {
              const sNo = p.stallNo || p.stall_no;
              const sZone = p.zone || p.address;
              u.stallNo = sNo;
              u.stall_no = sNo;
              if (!u.address || u.address === '-' || u.address === 'ระบุที่หน้าชำระเงิน') {
                u.address = sZone ? (sZone.includes('ล็อค') || sZone.includes('โซน') ? sZone : `โซนตลาดสด ${sZone}`) : `แผงค้า ${sNo}`;
              }
              updatedLocal = true;
            }
          }
        });
        if (updatedLocal && (!res.ok || !res.data.success)) {
          localStorage.setItem('smartpay_users', JSON.stringify(list));
        }
      } catch (e) {}

      return list;
    },

    // 1. Tenants CRUD
    async createTenant(data) {
      const res = await request('/admin/tenants', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      // Sync local storage
      try {
        const users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        const newU = {
          id: (res.ok && res.data.tenant && res.data.tenant.id) || Date.now(),
          user_type: data.userType || 'บุคคลธรรมดา',
          fullName: data.fullName,
          full_name: data.fullName,
          phone: data.phone,
          stallNo: data.stallNo,
          stall_no: data.stallNo,
          address: data.address || `แผงค้า ${data.stallNo} ตลาดเทศบาล`,
          service: data.service || 'บริการเช่าแผงค้า',
          status: data.status || 'ปกติ',
          raw_password: data.password || '123456',
          password: data.password || '123456',
          registeredAt: new Date().toLocaleDateString('th-TH')
        };
        users.unshift(newU);
        localStorage.setItem('smartpay_users', JSON.stringify(users));
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'บันทึกข้อมูลผู้เช่าสำเร็จ (โหมดสำรอง)' };
    },

    async updateTenant(id, data) {
      const res = await request(`/admin/tenants/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      try {
        const users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        const cleanP = (data.phone || '').replace(/[^0-9]/g, '');
        const idx = users.findIndex(u => String(u.id) === String(id) || (cleanP && (u.phone || '').replace(/[^0-9]/g, '') === cleanP));
        if (idx !== -1) {
          if (data.fullName) { users[idx].fullName = data.fullName; users[idx].full_name = data.fullName; }
          if (data.phone) users[idx].phone = data.phone;
          if (data.stallNo) { users[idx].stallNo = data.stallNo; users[idx].stall_no = data.stallNo; }
          if (data.address) users[idx].address = data.address;
          if (data.userType) users[idx].user_type = data.userType;
          if (data.service) users[idx].service = data.service;
          if (data.status) users[idx].status = data.status;
          if (data.password) { users[idx].raw_password = data.password; users[idx].password = data.password; }
          localStorage.setItem('smartpay_users', JSON.stringify(users));
        }

        // Also sync currently logged-in user in localStorage ('smartpay_user') if it's this tenant
        const curUser = JSON.parse(localStorage.getItem('smartpay_user') || 'null');
        if (curUser) {
          const curCleanP = (curUser.phone || '').replace(/[^0-9]/g, '');
          if (String(curUser.id) === String(id) || (cleanP && curCleanP === cleanP)) {
            if (data.fullName) curUser.fullName = data.fullName;
            if (data.phone) curUser.phone = data.phone;
            if (data.stallNo) curUser.stallNo = data.stallNo;
            if (data.address) curUser.address = data.address;
            if (data.userType) curUser.userType = data.userType;
            if (data.status) curUser.status = data.status;
            localStorage.setItem('smartpay_user', JSON.stringify(curUser));
          }
        }
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'แก้ไขข้อมูลผู้เช่าสำเร็จ' };
    },

    async deleteTenant(id) {
      const res = await request(`/admin/tenants/${encodeURIComponent(id)}`, { method: 'DELETE' });
      try {
        const users = JSON.parse(localStorage.getItem('smartpay_users') || '[]');
        const filtered = users.filter(u => String(u.id) !== String(id));
        localStorage.setItem('smartpay_users', JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'ลบข้อมูลผู้เช่าสำเร็จ' };
    },

    // 2. Payments CRUD
    async getPayments() {
      const res = await request('/admin/payments', { method: 'GET' });
      if (res.ok && res.data.success && Array.isArray(res.data.payments)) {
        try {
          localStorage.setItem('smartpay_payments', JSON.stringify(res.data.payments));
        } catch (e) {}
        return res.data.payments;
      }
      try {
        return JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
      } catch (e) {
        return [];
      }
    },

    async createPayment(data) {
      const res = await request('/admin/payments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        const newP = {
          id: (res.ok && res.data.payment && res.data.payment.id) || Date.now(),
          receiptNo: data.receiptNo || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
          payerName: data.payerName,
          phone: data.phone,
          stallNo: data.stallNo,
          zone: data.zone || 'ตลาดเทศบาล',
          totalAmount: parseFloat(data.totalAmount) || 50,
          service: data.service || 'บริการเช่าแผงค้า',
          status: data.status || 'ชำระเงินเรียบร้อย',
          remark: data.remark || 'บันทึกโดยเจ้าหน้าที่',
          months: Array.isArray(data.months) ? data.months : ['งวดปัจจุบัน'],
          date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
        payments.unshift(newP);
        localStorage.setItem('smartpay_payments', JSON.stringify(payments));
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'บันทึกรายการชำระเงินสำเร็จ' };
    },

    async updatePayment(id, data) {
      const res = await request(`/admin/payments/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        const idx = payments.findIndex(p => String(p.id) === String(id) || p.receiptNo === id);
        if (idx !== -1) {
          if (data.payerName) payments[idx].payerName = data.payerName;
          if (data.phone) payments[idx].phone = data.phone;
          if (data.stallNo) payments[idx].stallNo = data.stallNo;
          if (data.zone !== undefined) payments[idx].zone = data.zone;
          if (data.totalAmount) payments[idx].totalAmount = parseFloat(data.totalAmount);
          if (data.status) payments[idx].status = data.status;
          if (data.remark !== undefined) payments[idx].remark = data.remark;
          if (Array.isArray(data.months)) payments[idx].months = data.months;
          localStorage.setItem('smartpay_payments', JSON.stringify(payments));
        }
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'แก้ไขข้อมูลการชำระเงินสำเร็จ' };
    },

    async deletePayment(id) {
      const res = await request(`/admin/payments/${encodeURIComponent(id)}`, { method: 'DELETE' });
      try {
        const payments = JSON.parse(localStorage.getItem('smartpay_payments') || '[]');
        const filtered = payments.filter(p => String(p.id) !== String(id) && p.receiptNo !== id && p.receipt_no !== id);
        localStorage.setItem('smartpay_payments', JSON.stringify(filtered));

        // Recompute smartpay_paid_months from remaining valid payments
        const remainingMonths = [];
        filtered.forEach(p => {
          if (!(p.status || '').includes('ปฏิเสธ')) {
            const keys = p.monthKeys || p.months || [];
            keys.forEach(k => {
              if (!remainingMonths.includes(k)) remainingMonths.push(k);
            });
          }
        });
        localStorage.setItem('smartpay_paid_months', JSON.stringify(remainingMonths));
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'ลบรายการชำระเงินสำเร็จ' };
    },

    // 3. Complaints CRUD
    async getComplaints() {
      const res = await request('/admin/complaints', { method: 'GET' });
      if (res.ok && res.data.success && Array.isArray(res.data.complaints)) {
        try {
          localStorage.setItem('smartpay_complaints', JSON.stringify(res.data.complaints));
        } catch (e) {}
        return res.data.complaints;
      }
      try {
        return JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
      } catch (e) {
        return [];
      }
    },

    async createComplaint(data) {
      const res = await request('/admin/complaints', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      try {
        const complaints = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        const newC = {
          id: (res.ok && res.data.complaint && (res.data.complaint.req_id || res.data.complaint.id)) || `REQ-${Date.now().toString().slice(-6)}`,
          userName: data.userName || (res.ok && res.data.complaint && res.data.complaint.userName) || 'ผู้ใช้งานทั่วไป',
          stallNo: (res.ok && res.data.complaint && res.data.complaint.stallNo) || '-',
          topic: data.topic,
          detail: data.detail,
          service: data.service || 'ค่าเช่าแผง / การเช่าแผงค้า',
          phone: data.phone || '-',
          status: data.status || 'รอดำเนินการ',
          adminReply: data.adminReply || '',
          date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
        };
        complaints.unshift(newC);
        localStorage.setItem('smartpay_complaints', JSON.stringify(complaints));
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'บันทึกคำร้องสำเร็จ' };
    },

    async updateComplaint(id, data) {
      const res = await request(`/admin/complaints/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      try {
        const complaints = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        const idx = complaints.findIndex(c => String(c.id) === String(id) || c.reqId === id);
        if (idx !== -1) {
          if (data.topic) complaints[idx].topic = data.topic;
          if (data.detail) complaints[idx].detail = data.detail;
          if (data.service) complaints[idx].service = data.service;
          if (data.phone !== undefined) complaints[idx].phone = data.phone;
          if (data.status) complaints[idx].status = data.status;
          if (data.adminReply !== undefined) complaints[idx].adminReply = data.adminReply;
          if (data.userName !== undefined) complaints[idx].userName = data.userName;
          localStorage.setItem('smartpay_complaints', JSON.stringify(complaints));
        }
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'แก้ไขคำร้องสำเร็จ' };
    },

    async deleteComplaint(id) {
      const res = await request(`/admin/complaints/${encodeURIComponent(id)}`, { method: 'DELETE' });
      try {
        const complaints = JSON.parse(localStorage.getItem('smartpay_complaints') || '[]');
        const filtered = complaints.filter(c => String(c.id) !== String(id) && c.reqId !== id);
        localStorage.setItem('smartpay_complaints', JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      if (res.ok && res.data.success) return res.data;
      return { success: true, message: 'ลบคำร้องสำเร็จ' };
    }
  };

  // Expose API module globally (both MarketRentAPI and MarketPayAPI alias)
  const apiObj = {
    API_BASE,
    checkServer,
    Auth,
    Payments,
    Complaints,
    Admin,
    isBackendOnline: () => backendAvailable
  };

  window.MarketRentAPI = apiObj;
  window.MarketPayAPI = apiObj;

  // Run initial server check in the background
  checkServer().then(online => {
    if (online) {
      console.log('🟢 [MarketRent] เชื่อมต่อกับ Backend Server สำเร็จ:', API_BASE);
    } else {
      console.log('🟡 [MarketRent] Backend Server ออฟไลน์ - ใช้งานโหมด Offline LocalStorage อัตโนมัติ');
    }
  });

})(window);

