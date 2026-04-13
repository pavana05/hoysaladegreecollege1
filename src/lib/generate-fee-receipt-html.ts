/**
 * Generates premium fee receipt HTML for print/download
 */

interface SemesterFeeInfo {
  semester: number;
  fee_amount: number;
  paid: number;
}

interface ReceiptData {
  receiptNumber: string;
  amount: number;
  studentName: string;
  rollNumber: string;
  courseName: string;
  semester?: number | null;
  paymentMethod: string;
  dateTime: string;
  remarks?: string;
  // Fee summary
  totalFee: number;
  totalPaid: number;
  totalBalance: number;
  // Semester breakdown
  semesterFees: SemesterFeeInfo[];
  // Payment history
  recentPayments: { receipt: string; amount: number; date: string; method: string; semester?: number | null }[];
  // Student info
  fatherName?: string;
  phone?: string;
  academicYear?: string;
}

export function generateFeeReceiptHtml(data: ReceiptData): string {
  const {
    receiptNumber, amount, studentName, rollNumber, courseName,
    semester, paymentMethod, dateTime, remarks,
    totalFee, totalPaid, totalBalance, semesterFees, recentPayments,
    fatherName, phone, academicYear,
  } = data;

  const paidPercentage = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 0;
  const progressColor = paidPercentage >= 80 ? "#16a34a" : paidPercentage >= 50 ? "#f59e0b" : "#ef4444";

  const semesterRows = semesterFees.map(sf => {
    const bal = sf.fee_amount - sf.paid;
    const status = bal <= 0 ? "✅ Cleared" : `₹${bal.toLocaleString("en-IN")} due`;
    const statusColor = bal <= 0 ? "#16a34a" : "#ef4444";
    return `<tr>
      <td style="padding:8px 12px;font-size:12px;color:#334155;border-bottom:1px solid #f1f5f9;">Sem ${sf.semester}</td>
      <td style="padding:8px 12px;font-size:12px;color:#334155;text-align:right;border-bottom:1px solid #f1f5f9;">₹${sf.fee_amount.toLocaleString("en-IN")}</td>
      <td style="padding:8px 12px;font-size:12px;color:#334155;text-align:right;border-bottom:1px solid #f1f5f9;">₹${sf.paid.toLocaleString("en-IN")}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;color:${statusColor};text-align:right;border-bottom:1px solid #f1f5f9;">${status}</td>
    </tr>`;
  }).join("");

  const paymentRows = recentPayments.slice(0, 5).map(p =>
    `<tr>
      <td style="padding:6px 10px;font-size:11px;color:#334155;border-bottom:1px solid #f8fafc;font-family:monospace;">${p.receipt}</td>
      <td style="padding:6px 10px;font-size:11px;color:#334155;text-align:right;border-bottom:1px solid #f8fafc;">₹${p.amount.toLocaleString("en-IN")}</td>
      <td style="padding:6px 10px;font-size:11px;color:#64748b;text-align:right;border-bottom:1px solid #f8fafc;">${p.method}</td>
      <td style="padding:6px 10px;font-size:11px;color:#64748b;text-align:right;border-bottom:1px solid #f8fafc;">${p.date}</td>
    </tr>`
  ).join("");

  const semestersCleared = semesterFees.filter(sf => sf.paid >= sf.fee_amount).length;

  return `<html><head><title>Payment Receipt - ${receiptNumber}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Inter',sans-serif;background:#f0f2f5;padding:20px;color:#1a1a2e}
      .receipt{max-width:520px;margin:0 auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.05)}
      .header{background:linear-gradient(135deg,#0a1628 0%,#1a3a6e 60%,#0a1628 100%);padding:28px 24px;text-align:center;position:relative;overflow:hidden}
      .header::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(198,167,94,0.08) 0%,transparent 60%);animation:shimmer 3s ease-in-out infinite}
      @keyframes shimmer{0%,100%{transform:translateX(-30%)}50%{transform:translateX(30%)}}
      .header .emoji{font-size:28px;margin-bottom:4px}
      .header h1{color:white;font-size:17px;font-weight:800;letter-spacing:0.5px}
      .header .sub{color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-top:3px}
      .success-badge{margin:0 24px;margin-top:-18px;position:relative;z-index:2;background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #86efac;border-radius:18px;padding:16px;text-align:center}
      .success-badge .icon{font-size:24px;margin-bottom:2px}
      .success-badge .label{font-size:9px;color:#16a34a;font-weight:700;letter-spacing:1.5px;text-transform:uppercase}
      .success-badge .amount{font-size:32px;font-weight:900;color:#16a34a;letter-spacing:-1px;margin-top:2px}
      .section{padding:16px 24px}
      .section-title{font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
      .detail-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f1f5f9}
      .detail-row:last-child{border-bottom:none}
      .detail-row .label{font-size:12px;color:#64748b;font-weight:500}
      .detail-row .value{font-size:13px;font-weight:700;color:#0f172a;text-align:right;max-width:55%}
      .receipt-id{background:#f8fafc;border-radius:12px;padding:8px 14px;margin:0 24px 12px;display:flex;justify-content:space-between;align-items:center;border:1px solid #e2e8f0}
      .receipt-id .label{font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px}
      .receipt-id .value{font-size:12px;font-weight:800;color:#4f46e5;font-family:monospace;letter-spacing:1px}
      .progress-bar{height:8px;border-radius:4px;background:#e2e8f0;margin-top:6px;overflow:hidden}
      .progress-fill{height:100%;border-radius:4px;transition:width 0.3s}
      .summary-card{background:linear-gradient(135deg,#f8fafc,#eef2f7);border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 24px 12px}
      .summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center}
      .summary-item .num{font-size:16px;font-weight:900;letter-spacing:-0.5px}
      .summary-item .lbl{font-size:9px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
      table.sem-table{width:100%;border-collapse:collapse}
      table.sem-table th{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0}
      table.sem-table th:not(:first-child){text-align:right}
      .footer{text-align:center;padding:16px 24px 22px;background:#f8fafc;border-top:1px solid #e2e8f0}
      .footer p{font-size:10px;color:#94a3b8;line-height:1.6}
      .footer .contact{font-size:9px;color:#cbd5e1;margin-top:6px}
      .seal{width:50px;height:50px;border:2px solid #e2e8f0;border-radius:50%;margin:8px auto;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
      .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:48px;font-weight:900;color:rgba(0,0,0,0.02);letter-spacing:4px;text-transform:uppercase;pointer-events:none}
      @media print{body{padding:0;background:white}button,.no-print{display:none!important}.receipt{box-shadow:none;border:1px solid #e5e7eb}}
    </style></head><body>
    <div class="receipt" style="position:relative">
      <div class="watermark">HOYSALA</div>
      <div class="header">
        <div class="emoji">🎓</div>
        <h1>Hoysala Degree College</h1>
        <div class="sub">Official Payment Receipt</div>
      </div>
      <div class="success-badge">
        <div class="icon">✅</div>
        <div class="label">Payment Successful</div>
        <div class="amount">₹${Number(amount).toLocaleString("en-IN")}</div>
      </div>
      <div class="receipt-id">
        <span class="label">Receipt No</span>
        <span class="value">${receiptNumber}</span>
      </div>

      <!-- Student Details -->
      <div class="section">
        <div class="section-title">👤 Student Details</div>
        <div class="detail-row"><span class="label">Student Name</span><span class="value">${studentName || "—"}</span></div>
        <div class="detail-row"><span class="label">Roll Number</span><span class="value">${rollNumber || "—"}</span></div>
        <div class="detail-row"><span class="label">Course</span><span class="value">${courseName || "—"}</span></div>
        ${fatherName ? `<div class="detail-row"><span class="label">Father's Name</span><span class="value">${fatherName}</span></div>` : ""}
        ${phone ? `<div class="detail-row"><span class="label">Phone</span><span class="value">${phone}</span></div>` : ""}
        ${academicYear ? `<div class="detail-row"><span class="label">Academic Year</span><span class="value">${academicYear}</span></div>` : ""}
      </div>

      <!-- Payment Details -->
      <div class="section" style="border-top:1px solid #f1f5f9">
        <div class="section-title">💳 Payment Details</div>
        <div class="detail-row"><span class="label">Amount Paid</span><span class="value" style="color:#16a34a;font-size:15px;">₹${Number(amount).toLocaleString("en-IN")}</span></div>
        ${semester ? `<div class="detail-row"><span class="label">For Semester</span><span class="value">Semester ${semester}</span></div>` : ""}
        <div class="detail-row"><span class="label">Payment Method</span><span class="value">${paymentMethod}</span></div>
        <div class="detail-row"><span class="label">Date & Time</span><span class="value">${dateTime}</span></div>
        ${remarks ? `<div class="detail-row"><span class="label">Remarks</span><span class="value">${remarks}</span></div>` : ""}
      </div>

      <!-- Fee Summary -->
      <div class="summary-card">
        <div class="section-title" style="margin-bottom:8px">📊 Fee Summary</div>
        <div class="summary-grid">
          <div class="summary-item"><div class="num" style="color:#0f172a">₹${totalFee.toLocaleString("en-IN")}</div><div class="lbl">Total Fee</div></div>
          <div class="summary-item"><div class="num" style="color:#16a34a">₹${totalPaid.toLocaleString("en-IN")}</div><div class="lbl">Total Paid</div></div>
          <div class="summary-item"><div class="num" style="color:${totalBalance <= 0 ? "#16a34a" : "#ef4444"}">₹${totalBalance.toLocaleString("en-IN")}</div><div class="lbl">${totalBalance <= 0 ? "No Dues" : "Balance"}</div></div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${paidPercentage}%;background:${progressColor}"></div></div>
        <div style="text-align:center;margin-top:6px;font-size:10px;color:${progressColor};font-weight:700">${paidPercentage}% Paid • ${semestersCleared}/${semesterFees.length} Semesters Cleared</div>
      </div>

      ${semesterFees.length > 0 ? `
      <!-- Semester Breakdown -->
      <div class="section" style="border-top:1px solid #f1f5f9;padding-top:12px">
        <div class="section-title">📋 Semester-wise Status</div>
        <table class="sem-table">
          <thead><tr><th>Sem</th><th>Fee</th><th>Paid</th><th>Status</th></tr></thead>
          <tbody>${semesterRows}</tbody>
        </table>
      </div>` : ""}

      ${recentPayments.length > 1 ? `
      <!-- Payment History -->
      <div class="section" style="border-top:1px solid #f1f5f9;padding-top:12px">
        <div class="section-title">🕒 Recent Payment History</div>
        <table class="sem-table">
          <thead><tr><th>Receipt</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>
      </div>` : ""}

      <div class="footer">
        <div class="seal">College<br/>Seal</div>
        <p>This is a computer-generated receipt. No signature required.<br/>Please keep this for your records.</p>
        <p class="contact">📞 7676272167 | 📧 principal.hoysaladegreecollege@gmail.com</p>
        <p style="font-size:8px;color:#e2e8f0;margin-top:8px">Generated on ${new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px" class="no-print">
      <button onclick="window.print()" style="padding:12px 40px;cursor:pointer;border:none;border-radius:14px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:white;font-weight:700;font-size:14px;font-family:Inter,sans-serif;box-shadow:0 4px 16px rgba(79,70,229,0.3)">🖨️ Print Receipt</button>
    </div>
    </body></html>`;
}
