const { getPool, isConnected, fallbackStore, getDbType } = require('../config/db');

// POST /api/payments
async function createPayment(req, res) {
  try {
    const {
      receiptNo,
      payerName,
      phone,
      stallNo,
      zone,
      totalAmount,
      service,
      slipImg,
      remark,
      months,
      monthKeys
    } = req.body;

    const finalReceiptNo = receiptNo || `REC-${Date.now().toString().slice(-6)}`;
    const finalTotal = parseFloat(totalAmount) || 50.00;
    const cleanPhone = (phone || (req.user && req.user.phone) || '').replace(/[^0-9]/g, '');
    const userId = req.user ? req.user.id : null;

    const finalStatus = req.body.status || 'รอตรวจสอบ';
    const pool = getPool();
    const dbType = getDbType();

    // ป้องกันการเลือกล็อคแผงค้าซ้ำกับผู้เช่ารายอื่น
    const normStall = (stallNo || '').replace('แผงค้า ', '').trim().toUpperCase();
    if (normStall && normStall !== '-' && normStall !== 'ระบุที่หน้าชำระเงิน') {
      let conflictTenant = null;
      if (isConnected() && pool) {
        const query = dbType === 'postgres'
          ? 'SELECT id, full_name, phone FROM users WHERE UPPER(stall_no) = $1 AND phone != $2 AND (status = $3 OR status = $4)'
          : 'SELECT id, full_name, phone FROM users WHERE UPPER(stall_no) = ? AND phone != ? AND (status = ? OR status = ?)';
        const params = [normStall, cleanPhone, 'ปกติ', 'รอต่อสัญญา'];
        if (dbType === 'postgres') {
          const checkRes = await pool.query(query, params);
          if (checkRes.rows.length > 0) conflictTenant = checkRes.rows[0];
        } else {
          const [checkRows] = await pool.query(query, params);
          if (checkRows.length > 0) conflictTenant = checkRows[0];
        }
      } else {
        conflictTenant = fallbackStore.users.find(u => {
          const uStall = (u.stall_no || u.stallNo || '').replace('แผงค้า ', '').trim().toUpperCase();
          const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
          return uStall === normStall && uPhone !== cleanPhone && (u.status === 'ปกติ' || u.status === 'รอต่อสัญญา');
        });
      }

      if (conflictTenant) {
        return res.status(409).json({
          success: false,
          message: `แผงค้า ${normStall} มีผู้เช่าแล้วในระบบ ไม่สามารถเลือกล็อคซ้ำได้ กรุณาเลือกแผงค้าที่ยังว่าง`
        });
      }
    }

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const payRes = await pool.query(`
          INSERT INTO payments (receipt_no, user_id, payer_name, phone, stall_no, zone, total_amount, service, status, slip_url, remark)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          finalReceiptNo,
          userId,
          payerName || 'ผู้ประกอบการแผงค้า',
          cleanPhone,
          stallNo || 'A-10',
          zone || '',
          finalTotal,
          service || 'บริการเช่าแผงค้า',
          finalStatus,
          slipImg || null,
          remark || 'ค่าเช่าแผงค้า'
        ]);

        const payment = payRes.rows[0];

        // Insert months
        const mKeys = Array.isArray(monthKeys) ? monthKeys : [];
        const mNames = Array.isArray(months) ? months : [];
        for (let i = 0; i < mKeys.length; i++) {
          await pool.query(`
            INSERT INTO payment_months (payment_id, month_key, month_name)
            VALUES ($1, $2, $3)
          `, [payment.id, mKeys[i], mNames[i] || mKeys[i]]);
        }

        // Update user stall_no and address if not yet set or from payment selection
        try {
          if (cleanPhone || userId) {
            await pool.query(`
              UPDATE users 
              SET stall_no = CASE WHEN stall_no IS NULL OR stall_no = '' OR stall_no = '-' OR stall_no = 'ระบุที่หน้าชำระเงิน' THEN $1 ELSE stall_no END,
                  address = CASE WHEN address IS NULL OR address = '' OR address = '-' OR address = 'ระบุที่หน้าชำระเงิน' THEN $2 ELSE address END
              WHERE (id = $3 AND $3 IS NOT NULL) OR (phone = $4 AND $4 != '')
            `, [stallNo || 'A-10', zone || `แผงค้า ${stallNo || 'A-10'}`, userId, cleanPhone]);
          }
        } catch (uErr) {
          console.warn('Warning: Could not update user stall from payment:', uErr.message);
        }

        return res.status(201).json({
          success: true,
          message: 'บันทึกการชำระเงินสำเร็จ',
          payment: {
            ...payment,
            receiptNo: payment.receipt_no,
            totalAmount: payment.total_amount,
            payerName: payment.payer_name,
            stallNo: payment.stall_no,
            months: mNames,
            monthKeys: mKeys
          }
        });
      } else {
        // MySQL
        const [payRes] = await pool.query(`
          INSERT INTO payments (receipt_no, user_id, payer_name, phone, stall_no, zone, total_amount, service, status, slip_url, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          finalReceiptNo,
          userId,
          payerName || 'ผู้ประกอบการแผงค้า',
          cleanPhone,
          stallNo || 'A-10',
          zone || '',
          finalTotal,
          service || 'บริการเช่าแผงค้า',
          finalStatus,
          slipImg || null,
          remark || 'ค่าเช่าแผงค้า'
        ]);

        const paymentId = payRes.insertId;

        // Insert months
        const mKeys = Array.isArray(monthKeys) ? monthKeys : [];
        const mNames = Array.isArray(months) ? months : [];
        for (let i = 0; i < mKeys.length; i++) {
          await pool.query(`
            INSERT INTO payment_months (payment_id, month_key, month_name)
            VALUES (?, ?, ?)
          `, [paymentId, mKeys[i], mNames[i] || mKeys[i]]);
        }

        // Update user stall_no and address if not yet set
        try {
          if (cleanPhone || userId) {
            await pool.query(`
              UPDATE users 
              SET stall_no = CASE WHEN stall_no IS NULL OR stall_no = '' OR stall_no = '-' OR stall_no = 'ระบุที่หน้าชำระเงิน' THEN ? ELSE stall_no END,
                  address = CASE WHEN address IS NULL OR address = '' OR address = '-' OR address = 'ระบุที่หน้าชำระเงิน' THEN ? ELSE address END
              WHERE (id = ? AND ? IS NOT NULL) OR (phone = ? AND ? != '')
            `, [stallNo || 'A-10', zone || `แผงค้า ${stallNo || 'A-10'}`, userId, cleanPhone]);
          }
        } catch (uErr) {
          console.warn('Warning: Could not update user stall from payment:', uErr.message);
        }

        return res.status(201).json({
          success: true,
          message: 'บันทึกการชำระเงินสำเร็จ',
          payment: {
            id: paymentId,
            receiptNo: finalReceiptNo,
            totalAmount: finalTotal,
            payerName,
            phone: cleanPhone,
            stallNo,
            zone,
            service: service || 'บริการเช่าแผงค้า',
            status: finalStatus,
            months: mNames,
            monthKeys: mKeys,
            slipImg,
            remark
          }
        });
      }
    } else {
      // Fallback
      const mKeys = Array.isArray(monthKeys) ? monthKeys : [];
      const mNames = Array.isArray(months) ? months : [];
      const paymentRecord = {
        id: fallbackStore.payments.length + 1,
        receiptNo: finalReceiptNo,
        receipt_no: finalReceiptNo,
        userId,
        payerName: payerName || 'ผู้ประกอบการแผงค้า',
        phone: cleanPhone,
        stallNo: stallNo || 'A-10',
        zone: zone || '',
        totalAmount: finalTotal,
        service: service || 'บริการเช่าแผงค้า',
        status: finalStatus,
        slipImg: slipImg || null,
        remark: remark || 'ค่าเช่าแผงค้า',
        months: mNames,
        monthKeys: mKeys,
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        rawDate: new Date().toISOString(),
        created_at: new Date()
      };

      fallbackStore.payments.unshift(paymentRecord);
      mKeys.forEach(k => {
        fallbackStore.payment_months.push({
          payment_id: paymentRecord.id,
          month_key: k
        });
      });

      // Update fallback user profile with stall and zone
      if (cleanPhone || userId) {
        const u = fallbackStore.users.find(x => (userId && x.id === userId) || (cleanPhone && x.phone === cleanPhone));
        if (u) {
          if (!u.stall_no || u.stall_no === '-' || u.stall_no === 'ระบุที่หน้าชำระเงิน') {
            u.stall_no = stallNo || 'A-10';
          }
          if (!u.address || u.address === '-' || u.address === 'ระบุที่หน้าชำระเงิน') {
            u.address = zone || `แผงค้า ${stallNo || 'A-10'}`;
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: 'บันทึกการชำระเงินสำเร็จ (โหมดสำรอง)',
        payment: paymentRecord
      });
    }
  } catch (err) {
    console.error('Create payment error:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน: ' + err.message
    });
  }
}

// GET /api/payments
async function getPayments(req, res) {
  try {
    const pool = getPool();
    const dbType = getDbType();
    const isAdmin = req.user && (req.user.isAdmin || req.user.role === 'admin' || req.user.role === 'superadmin');
    const phoneFilter = isAdmin ? null : (req.query.phone || (req.user ? req.user.phone : null));

    if (isConnected() && pool) {
      let payments = [];
      if (dbType === 'postgres') {
        const query = phoneFilter
          ? 'SELECT * FROM payments WHERE phone = $1 ORDER BY id DESC'
          : 'SELECT * FROM payments ORDER BY id DESC';
        const params = phoneFilter ? [phoneFilter] : [];
        const result = await pool.query(query, params);
        payments = result.rows;

        // Fetch months for each payment
        for (const p of payments) {
          const mRes = await pool.query('SELECT month_key, month_name FROM payment_months WHERE payment_id = $1', [p.id]);
          p.receiptNo = p.receipt_no;
          p.totalAmount = parseFloat(p.total_amount);
          p.payerName = p.payer_name;
          p.stallNo = p.stall_no;
          p.slipImg = p.slip_url;
          p.months = mRes.rows.map(r => r.month_name);
          p.monthKeys = mRes.rows.map(r => r.month_key);
          p.date = new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } else {
        // MySQL
        const query = phoneFilter
          ? 'SELECT * FROM payments WHERE phone = ? ORDER BY id DESC'
          : 'SELECT * FROM payments ORDER BY id DESC';
        const params = phoneFilter ? [phoneFilter] : [];
        const [rows] = await pool.query(query, params);
        payments = rows;

        for (const p of payments) {
          const [mRows] = await pool.query('SELECT month_key, month_name FROM payment_months WHERE payment_id = ?', [p.id]);
          p.receiptNo = p.receipt_no;
          p.totalAmount = parseFloat(p.total_amount);
          p.payerName = p.payer_name;
          p.stallNo = p.stall_no;
          p.slipImg = p.slip_url;
          p.months = mRows.map(r => r.month_name);
          p.monthKeys = mRows.map(r => r.month_key);
          p.date = new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }

      return res.json({
        success: true,
        count: payments.length,
        payments
      });
    } else {
      // Fallback
      let payments = [...fallbackStore.payments];
      if (phoneFilter) {
        payments = payments.filter(p => p.phone === phoneFilter);
      }
      return res.json({
        success: true,
        count: payments.length,
        payments
      });
    }
  } catch (err) {
    console.error('Get payments error:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน: ' + err.message
    });
  }
}

// GET /api/payments/paid-months
async function getPaidMonths(req, res) {
  try {
    const phoneFilter = req.query.phone || (req.user ? req.user.phone : null);
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      let paidMonths = [];
      if (dbType === 'postgres') {
        const query = phoneFilter
          ? `SELECT DISTINCT pm.month_key 
             FROM payment_months pm 
             JOIN payments p ON pm.payment_id = p.id 
             WHERE p.phone = $1 AND p.status NOT LIKE '%ปฏิเสธ%'`
          : `SELECT DISTINCT pm.month_key 
             FROM payment_months pm 
             JOIN payments p ON pm.payment_id = p.id 
             WHERE p.status NOT LIKE '%ปฏิเสธ%'`;
        const params = phoneFilter ? [phoneFilter] : [];
        const result = await pool.query(query, params);
        paidMonths = result.rows.map(r => r.month_key);
      } else {
        const query = phoneFilter
          ? `SELECT DISTINCT pm.month_key 
             FROM payment_months pm 
             JOIN payments p ON pm.payment_id = p.id 
             WHERE p.phone = ? AND p.status NOT LIKE '%ปฏิเสธ%'`
          : `SELECT DISTINCT pm.month_key 
             FROM payment_months pm 
             JOIN payments p ON pm.payment_id = p.id 
             WHERE p.status NOT LIKE '%ปฏิเสธ%'`;
        const params = phoneFilter ? [phoneFilter] : [];
        const [rows] = await pool.query(query, params);
        paidMonths = rows.map(r => r.month_key);
      }

      return res.json({
        success: true,
        paidMonths
      });
    } else {
      const validPayments = fallbackStore.payments.filter(p => {
        if ((p.status || '').includes('ปฏิเสธ')) return false;
        if (phoneFilter) {
          const cleanFilter = String(phoneFilter).replace(/[^0-9]/g, '');
          const pPhone = String(p.phone || '').replace(/[^0-9]/g, '');
          if (cleanFilter && pPhone && pPhone !== cleanFilter) return false;
        }
        return true;
      });

      const validIds = new Set(validPayments.map(p => String(p.id)));
      const validReceiptNos = new Set(validPayments.map(p => String(p.receiptNo || p.receipt_no)));

      const monthKeys = [];
      fallbackStore.payment_months.forEach(pm => {
        const pid = String(pm.payment_id);
        if (validIds.has(pid) || validReceiptNos.has(pid)) {
          if (!monthKeys.includes(pm.month_key)) monthKeys.push(pm.month_key);
        }
      });

      validPayments.forEach(p => {
        const keys = p.monthKeys || p.months || [];
        keys.forEach(k => {
          if (!monthKeys.includes(k)) monthKeys.push(k);
        });
      });

      return res.json({
        success: true,
        paidMonths: monthKeys
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

// PATCH /api/payments/:id/status
async function updatePaymentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะที่ต้องการอัปเดต' });
    }

    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query(`
          UPDATE payments 
          SET status = $1, remark = COALESCE($2, remark)
          WHERE id = $3 OR receipt_no = $3
          RETURNING *
        `, [status, adminRemark || null, id]);
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
        }
        return res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ', payment: result.rows[0] });
      } else {
        await pool.query(`
          UPDATE payments 
          SET status = ?, remark = COALESCE(?, remark)
          WHERE id = ? OR receipt_no = ?
        `, [status, adminRemark || null, id, id]);
        const [rows] = await pool.query('SELECT * FROM payments WHERE id = ? OR receipt_no = ?', [id, id]);
        if (rows.length === 0) {
          return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
        }
        return res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ', payment: rows[0] });
      }
    } else {
      // Fallback
      const payment = fallbackStore.payments.find(p => String(p.id) === String(id) || p.receiptNo === id || p.receipt_no === id);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
      }
      payment.status = status;
      if (adminRemark) payment.adminRemark = adminRemark;
      return res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ (โหมดสำรอง)', payment });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/payments/:id
async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      let payment = null;
      if (dbType === 'postgres') {
        const result = await pool.query('SELECT * FROM payments WHERE id = $1 OR receipt_no = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
        payment = result.rows[0];
        const mRes = await pool.query('SELECT month_key, month_name FROM payment_months WHERE payment_id = $1', [payment.id]);
        payment.receiptNo = payment.receipt_no;
        payment.totalAmount = parseFloat(payment.total_amount);
        payment.payerName = payment.payer_name;
        payment.stallNo = payment.stall_no;
        payment.slipImg = payment.slip_url;
        payment.months = mRes.rows.map(r => r.month_name);
        payment.monthKeys = mRes.rows.map(r => r.month_key);
        payment.date = new Date(payment.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } else {
        const [rows] = await pool.query('SELECT * FROM payments WHERE id = ? OR receipt_no = ?', [id, id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
        payment = rows[0];
        const [mRows] = await pool.query('SELECT month_key, month_name FROM payment_months WHERE payment_id = ?', [payment.id]);
        payment.receiptNo = payment.receipt_no;
        payment.totalAmount = parseFloat(payment.total_amount);
        payment.payerName = payment.payer_name;
        payment.stallNo = payment.stall_no;
        payment.slipImg = payment.slip_url;
        payment.months = mRows.map(r => r.month_name);
        payment.monthKeys = mRows.map(r => r.month_key);
        payment.date = new Date(payment.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      return res.json({ success: true, payment });
    } else {
      const payment = fallbackStore.payments.find(p => String(p.id) === String(id) || p.receiptNo === id || p.receipt_no === id);
      if (!payment) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
      return res.json({ success: true, payment });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/payments/stalls/status - ตรวจสอบสถานะการใช้งานของแผงค้า A-1 ถึง A-15
async function getStallsStatus(req, res) {
  try {
    const pool = getPool();
    const dbType = getDbType();
    const cleanPhone = (req.user && req.user.phone) || (req.query.phone || '').replace(/[^0-9]/g, '');

    let occupiedTenants = [];

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query(`
          SELECT id, full_name, phone, stall_no, address, status 
          FROM users 
          WHERE stall_no IS NOT NULL 
            AND stall_no != '-' 
            AND stall_no != 'ระบุที่หน้าชำระเงิน' 
            AND (status = 'ปกติ' OR status = 'รอต่อสัญญา')
        `);
        occupiedTenants = result.rows;
      } else {
        const [rows] = await pool.query(`
          SELECT id, full_name, phone, stall_no, address, status 
          FROM users 
          WHERE stall_no IS NOT NULL 
            AND stall_no != '-' 
            AND stall_no != 'ระบุที่หน้าชำระเงิน' 
            AND (status = 'ปกติ' OR status = 'รอต่อสัญญา')
        `);
        occupiedTenants = rows;
      }
    } else {
      occupiedTenants = fallbackStore.users.filter(u => {
        const s = (u.stall_no || u.stallNo || '').trim();
        return s && s !== '-' && s !== 'ระบุที่หน้าชำระเงิน' && (u.status === 'ปกติ' || u.status === 'รอต่อสัญญา');
      });
    }

    // Build map of occupied stalls
    const occupiedMap = {};
    occupiedTenants.forEach(t => {
      const rawStall = t.stall_no || t.stallNo || '';
      const match = rawStall.match(/A-\d+/i) || rawStall.match(/\d+/);
      const stallKey = match ? (match[0].startsWith('A-') ? match[0].toUpperCase() : `A-${match[0]}`) : rawStall;
      if (stallKey) {
        occupiedMap[stallKey] = {
          tenantId: t.id,
          fullName: t.full_name || t.fullName,
          phone: t.phone,
          isSelf: cleanPhone ? (t.phone.replace(/[^0-9]/g, '') === cleanPhone) : false
        };
      }
    });

    const stalls = [];
    for (let i = 1; i <= 15; i++) {
      const key = `A-${i}`;
      const occ = occupiedMap[key] || null;
      stalls.push({
        stallNo: key,
        zone: `ล็อค ${i}`,
        isOccupied: !!occ && !occ.isSelf,
        isSelf: occ ? occ.isSelf : false,
        occupantName: occ ? (occ.isSelf ? occ.fullName : null) : null,
        occupantPhone: null
      });
    }

    return res.json({
      success: true,
      stalls,
      totalOccupied: Object.keys(occupiedMap).length,
      totalAvailable: 15 - Object.keys(occupiedMap).length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createPayment,
  getPayments,
  getPaidMonths,
  updatePaymentStatus,
  getPaymentById,
  getStallsStatus
};
