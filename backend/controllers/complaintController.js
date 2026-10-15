const { getPool, isConnected, fallbackStore, getDbType } = require('../config/db');

// POST /api/complaints
async function createComplaint(req, res) {
  try {
    const { reqId, service, topic, detail, phone } = req.body;
    if (!topic || !detail) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกหัวข้อและรายละเอียดเรื่องร้องเรียน'
      });
    }

    const finalReqId = reqId || `REQ-${Date.now().toString().slice(-6)}`;
    const finalService = service || 'ค่าเช่าแผง / การเช่าแผงค้า';
    const cleanPhone = (phone || (req.user && req.user.phone) || '').replace(/[^0-9]/g, '');
    const userId = req.user ? req.user.id : null;

    const finalUserName = req.body.userName || req.body.name || (req.user ? (req.user.fullName || req.user.full_name) : null);

    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query(`
          INSERT INTO complaints (req_id, user_id, phone, service, topic, detail, status, admin_reply)
          VALUES ($1, $2, $3, $4, $5, $6, 'รอดำเนินการ', NULL)
          RETURNING *
        `, [finalReqId, userId, cleanPhone, finalService, topic, detail]);

        const c = result.rows[0];
        return res.status(201).json({
          success: true,
          message: 'ส่งข้อมูลเรื่องร้องเรียนเรียบร้อยแล้ว',
          complaint: {
            id: c.req_id,
            reqId: c.req_id,
            userName: finalUserName || 'ผู้ใช้งานทั่วไป',
            service: c.service,
            topic: c.topic,
            detail: c.detail,
            status: c.status,
            adminReply: '',
            date: new Date(c.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
          }
        });
      } else {
        // MySQL
        await pool.query(`
          INSERT INTO complaints (req_id, user_id, phone, service, topic, detail, status, admin_reply)
          VALUES (?, ?, ?, ?, ?, ?, 'รอดำเนินการ', NULL)
        `, [finalReqId, userId, cleanPhone, finalService, topic, detail]);

        return res.status(201).json({
          success: true,
          message: 'ส่งข้อมูลเรื่องร้องเรียนเรียบร้อยแล้ว',
          complaint: {
            id: finalReqId,
            reqId: finalReqId,
            userName: finalUserName || 'ผู้ใช้งานทั่วไป',
            service: finalService,
            topic,
            detail,
            status: 'รอดำเนินการ',
            adminReply: '',
            date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
          }
        });
      }
    } else {
      // Fallback
      const u = fallbackStore.users.find(usr => (userId && usr.id === userId) || (cleanPhone && usr.phone === cleanPhone));
      const resolvedUserName = finalUserName || (u ? (u.full_name || u.fullName) : '') || 'ผู้ใช้งานทั่วไป';
      const resolvedStallNo = (u ? (u.stall_no || u.stallNo) : '') || '-';

      const complaintRecord = {
        id: finalReqId,
        reqId: finalReqId,
        userId,
        userName: resolvedUserName,
        stallNo: resolvedStallNo,
        phone: cleanPhone,
        service: finalService,
        topic,
        detail,
        status: 'รอดำเนินการ',
        adminReply: '',
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        created_at: new Date()
      };

      fallbackStore.complaints.unshift(complaintRecord);

      return res.status(201).json({
        success: true,
        message: 'ส่งข้อมูลเรื่องร้องเรียนเรียบร้อยแล้ว (โหมดสำรอง)',
        complaint: complaintRecord
      });
    }
  } catch (err) {
    console.error('Create complaint error:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกคำร้อง: ' + err.message
    });
  }
}

// GET /api/complaints
async function getComplaints(req, res) {
  try {
    const pool = getPool();
    const dbType = getDbType();
    const isAdmin = req.user && (req.user.isAdmin || req.user.role === 'admin' || req.user.role === 'superadmin');
    const phoneFilter = isAdmin ? null : (req.query.phone || (req.user ? req.user.phone : null));

    if (isConnected() && pool) {
      let complaints = [];
      const joinQuery = `
        SELECT c.*, u.full_name as user_full_name, u.stall_no as user_stall_no
        FROM complaints c
        LEFT JOIN users u ON (c.user_id = u.id OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone != '-' AND c.phone = u.phone))
        ${phoneFilter ? 'WHERE c.phone = $1' : ''}
        ORDER BY c.id DESC
      `;
      const joinQueryMySQL = `
        SELECT c.*, u.full_name as user_full_name, u.stall_no as user_stall_no
        FROM complaints c
        LEFT JOIN users u ON (c.user_id = u.id OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone != '-' AND c.phone = u.phone))
        ${phoneFilter ? 'WHERE c.phone = ?' : ''}
        ORDER BY c.id DESC
      `;

      if (dbType === 'postgres') {
        const params = phoneFilter ? [phoneFilter] : [];
        const result = await pool.query(joinQuery, params);
        complaints = result.rows.map(c => ({
          id: c.req_id,
          reqId: c.req_id,
          userName: c.user_name || c.user_full_name || 'ผู้ใช้งานทั่วไป',
          stallNo: c.user_stall_no || '-',
          service: c.service,
          topic: c.topic,
          detail: c.detail,
          phone: c.phone,
          status: c.status,
          adminReply: c.admin_reply || c.adminReply || '',
          date: new Date(c.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
        }));
      } else {
        const params = phoneFilter ? [phoneFilter] : [];
        const [rows] = await pool.query(joinQueryMySQL, params);
        complaints = rows.map(c => ({
          id: c.req_id,
          reqId: c.req_id,
          userName: c.user_name || c.user_full_name || 'ผู้ใช้งานทั่วไป',
          stallNo: c.user_stall_no || '-',
          service: c.service,
          topic: c.topic,
          detail: c.detail,
          phone: c.phone,
          status: c.status,
          adminReply: c.admin_reply || c.adminReply || '',
          date: new Date(c.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
        }));
      }

      return res.json({
        success: true,
        count: complaints.length,
        complaints
      });
    } else {
      let list = fallbackStore.complaints.map(c => {
        const cleanP = (c.phone || '').replace(/[^0-9]/g, '');
        const u = fallbackStore.users.find(user => (c.userId && user.id === c.userId) || (cleanP && user.phone === cleanP));
        return {
          ...c,
          userName: c.userName || (u ? (u.full_name || u.fullName) : '') || 'ผู้ใช้งานทั่วไป',
          stallNo: c.stallNo || (u ? (u.stall_no || u.stallNo) : '') || '-'
        };
      });
      if (phoneFilter) {
        list = list.filter(c => c.phone === phoneFilter);
      }
      return res.json({
        success: true,
        count: list.length,
        complaints: list
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

// PATCH /api/complaints/:id/status
async function updateComplaintStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะคำร้อง' });
    }

    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query(`
          UPDATE complaints 
          SET status = $1, admin_reply = COALESCE($2, admin_reply)
          WHERE req_id = $3 OR CAST(id AS TEXT) = $3
          RETURNING *
        `, [status, adminReply !== undefined ? adminReply : null, id]);
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'ไม่พบรายการคำร้อง' });
        }
        const row = result.rows[0];
        return res.json({
          success: true,
          message: 'อัปเดตสถานะคำร้องสำเร็จ',
          complaint: {
            ...row,
            adminReply: row.admin_reply
          }
        });
      } else {
        await pool.query(`
          UPDATE complaints 
          SET status = ?, admin_reply = COALESCE(?, admin_reply)
          WHERE req_id = ? OR id = ?
        `, [status, adminReply !== undefined ? adminReply : null, id, id]);
        const [rows] = await pool.query('SELECT * FROM complaints WHERE req_id = ? OR id = ?', [id, id]);
        if (rows.length === 0) {
          return res.status(404).json({ success: false, message: 'ไม่พบรายการคำร้อง' });
        }
        const row = rows[0];
        return res.json({
          success: true,
          message: 'อัปเดตสถานะคำร้องสำเร็จ',
          complaint: {
            ...row,
            adminReply: row.admin_reply
          }
        });
      }
    } else {
      // Fallback
      const complaint = fallbackStore.complaints.find(c => c.reqId === id || c.id === id || String(c.id) === String(id));
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการคำร้อง' });
      }
      complaint.status = status;
      if (adminReply !== undefined) complaint.adminReply = adminReply;
      return res.json({ success: true, message: 'อัปเดตสถานะคำร้องสำเร็จ (โหมดสำรอง)', complaint });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createComplaint,
  getComplaints,
  updateComplaintStatus
};
