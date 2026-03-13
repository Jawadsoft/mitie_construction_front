import { useRef } from 'react';

type TemplateId =
  | 'attendance' | 'material-issue' | 'grn' | 'expense-voucher'
  | 'payment-voucher' | 'purchase-order' | 'site-progress'
  | 'material-requisition' | 'cash-receipt' | 'stock-register';

const TEMPLATES: { id: TemplateId; title: string; icon: string; desc: string }[] = [
  { id: 'attendance',           title: 'Labour Attendance Sheet',     icon: '👷', desc: 'Daily worker attendance with present/absent/half-day' },
  { id: 'material-issue',       title: 'Material Issue Slip',          icon: '📤', desc: 'Issue materials from store to project/stage' },
  { id: 'material-requisition', title: 'Material Requisition Form',    icon: '📋', desc: 'Site request for materials from store/management' },
  { id: 'grn',                  title: 'Goods Received Note (GRN)',    icon: '📥', desc: 'Record materials received from supplier against PO' },
  { id: 'expense-voucher',      title: 'Expense Voucher',              icon: '💸', desc: 'Daily petty cash / site expense payment record' },
  { id: 'payment-voucher',      title: 'Labour Payment Voucher',       icon: '💵', desc: 'Contractor/labour wage payment record with signature' },
  { id: 'purchase-order',       title: 'Purchase Order Form',          icon: '🏢', desc: 'Formal PO to supplier with item list and terms' },
  { id: 'cash-receipt',         title: 'Cash Receipt Voucher',         icon: '🧾', desc: 'Acknowledge receipt of cash payment from customer' },
  { id: 'site-progress',        title: 'Site Daily Progress Report',   icon: '🏗️', desc: 'Daily work done, workforce, issues and remarks' },
  { id: 'stock-register',       title: 'Store Daily Stock Register',   icon: '🏭', desc: 'Daily store-keeper log of all IN/OUT stock movements' },
];

/* ─────────────── Print helper ─────────────────────────────────── */
function printContent(html: string, title: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html><head>
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 16px; }
  h1 { font-size: 15pt; margin: 0 0 2px; }
  h2 { font-size: 12pt; margin: 14px 0 6px; color: #1a56db; border-bottom: 1px solid #1a56db; padding-bottom: 2px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border: 2px solid #1a56db; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; background: #eff6ff; }
  .company { }
  .company .name { font-size: 16pt; font-weight: bold; color: #1a3a8f; }
  .company .sub { font-size: 9pt; color: #555; }
  .doc-info { text-align: right; }
  .doc-info .doc-no { font-size: 14pt; font-weight: bold; color: #dc2626; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: #dbeafe; color: #1e3a8a; font-size: 10pt; padding: 5px 7px; text-align: left; border: 1px solid #93c5fd; }
  td { padding: 4px 7px; border: 1px solid #bbb; font-size: 10pt; min-height: 22px; }
  td.blank { height: 24px; }
  td.label { background: #f8fafc; font-weight: 600; width: 22%; white-space: nowrap; }
  .field-row { display: flex; gap: 16px; margin: 5px 0; }
  .field { flex: 1; }
  .field label { font-size: 9pt; color: #555; display: block; margin-bottom: 1px; }
  .field .line { border-bottom: 1px solid #333; min-height: 20px; }
  .sig-row { display: flex; gap: 24px; margin-top: 22px; }
  .sig { flex: 1; text-align: center; }
  .sig .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 3px; font-size: 9pt; color: #555; }
  .note { background: #fef9c3; border: 1px solid #fbbf24; border-radius: 4px; padding: 6px 10px; font-size: 9pt; margin: 10px 0; }
  .badge { display: inline-block; border: 1px solid #333; border-radius: 3px; padding: 0 5px; font-size: 9pt; margin-right: 4px; }
  .text-right { text-align: right !important; }
  .text-center { text-align: center !important; }
  .bold { font-weight: bold; }
  .total-row td { background: #e0f2fe; font-weight: bold; }
  @media print {
    body { padding: 0; }
    @page { margin: 12mm; size: A4; }
  }
</style>
</head><body>
${html}
<script>window.onload = () => { window.print(); }</script>
</body></html>`);
  win.document.close();
}

/* ─────────────── Template builders ────────────────────────────── */
function headerHtml(docTitle: string, docLabel: string) {
  return `<div class="header">
  <div class="company">
    <div class="name">Mitie Constructions</div>
    <div class="sub">Construction ERP — Site Document</div>
  </div>
  <div class="doc-info">
    <div class="doc-no">${docTitle}</div>
    <div style="font-size:9pt;color:#555;margin-top:4px;">${docLabel} No: ____________________</div>
    <div style="font-size:9pt;color:#555;">Date: ____________________</div>
  </div>
</div>`;
}

function infoRowsHtml(fields: string[][]) {
  return `<table>
  ${fields.map(row => `<tr>${row.map(f => `<td class="label">${f}</td><td class="blank"></td>`).join('')}</tr>`).join('')}
</table>`;
}

/* ── 1. Labour Attendance Sheet ─────────────────────────────────── */
function attendanceTemplate() {
  const rows = Array.from({ length: 20 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="blank"></td>
    </tr>`).join('');

  return `
${headerHtml('Labour Attendance Sheet', 'Attendance')}
${infoRowsHtml([['Project', 'Stage / Area'], ['Contractor / Supervisor', 'Day & Date']])}
<table>
  <thead><tr>
    <th class="text-center" style="width:40px">#</th>
    <th>Worker Name</th>
    <th>Father's Name / CNIC</th>
    <th class="text-center" style="width:50px">P</th>
    <th class="text-center" style="width:50px">A</th>
    <th class="text-center" style="width:50px">½</th>
    <th class="text-center" style="width:50px">OT Hrs</th>
    <th>Remarks</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="3" class="text-right bold">TOTALS →</td>
      <td class="text-center bold"></td>
      <td class="text-center bold"></td>
      <td class="text-center bold"></td>
      <td class="text-center bold"></td>
      <td></td>
    </tr>
  </tfoot>
</table>
<div class="note">Legend: P = Present &nbsp;|&nbsp; A = Absent &nbsp;|&nbsp; ½ = Half Day &nbsp;|&nbsp; OT = Overtime Hours</div>
<div class="sig-row">
  <div class="sig"><div class="line">Site Engineer / Supervisor</div></div>
  <div class="sig"><div class="line">Store Keeper</div></div>
  <div class="sig"><div class="line">Project Manager</div></div>
</div>`;
}

/* ── 2. Material Issue Slip ─────────────────────────────────────── */
function materialIssueTemplate() {
  const rows = Array.from({ length: 10 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="blank"></td>
    </tr>`).join('');

  return `
${headerHtml('Material Issue Slip', 'MIS')}
${infoRowsHtml([['Project', 'Stage / Work Area'], ['Issued By (Store)', 'Received By (Site)'], ['Date of Issue', 'Purpose of Use']])}
<table>
  <thead><tr>
    <th class="text-center" style="width:35px">#</th>
    <th>Material Description</th>
    <th>Unit</th>
    <th class="text-center" style="width:70px">Qty Req.</th>
    <th class="text-center" style="width:70px">Qty Issued</th>
    <th>Remarks</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="note">⚠ Issued quantities to be entered in the system immediately after issue. Retain store copy.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Requested By (Site Engineer)</div></div>
  <div class="sig"><div class="line">Issued By (Store Keeper)</div></div>
  <div class="sig"><div class="line">Approved By (PM / Director)</div></div>
</div>`;
}

/* ── 3. Material Requisition Form ───────────────────────────────── */
function materialRequisitionTemplate() {
  const rows = Array.from({ length: 12 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="blank"></td>
    </tr>`).join('');

  return `
${headerHtml('Material Requisition Form', 'MRF')}
${infoRowsHtml([['Project', 'Stage / Location'], ['Requested By', 'Date Required By'], ['Priority', 'Approved By']])}
<h2>Requested Items</h2>
<table>
  <thead><tr>
    <th class="text-center" style="width:35px">#</th>
    <th>Material Name / Spec</th>
    <th>Unit</th>
    <th class="text-center" style="width:70px">Qty</th>
    <th class="text-center" style="width:80px">Est. Cost</th>
    <th class="text-center" style="width:70px">In Stock?</th>
    <th>Remarks</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="field-row" style="margin-top:10px">
  <div class="field"><label>Justification / Purpose:</label><div class="line"></div><div class="line"></div></div>
</div>
<div class="note">Store keeper: check current stock before processing. If available in store, issue via Material Issue Slip instead of purchasing.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Requested By</div></div>
  <div class="sig"><div class="line">Checked By (Store Keeper)</div></div>
  <div class="sig"><div class="line">Approved By (PM)</div></div>
</div>`;
}

/* ── 4. GRN ─────────────────────────────────────────────────────── */
function grnTemplate() {
  const rows = Array.from({ length: 10 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="blank"></td>
    </tr>`).join('');

  return `
${headerHtml('Goods Received Note (GRN)', 'GRN')}
${infoRowsHtml([['Supplier Name', 'Supplier Invoice No'], ['Purchase Order No', 'Vehicle / Delivery No'], ['Delivery Date', 'Received At (Store / Project)'], ['Inspected By', 'Project']])}
<h2>Items Received</h2>
<table>
  <thead><tr>
    <th class="text-center" style="width:35px">#</th>
    <th>Material Description</th>
    <th>Unit</th>
    <th class="text-center" style="width:65px">PO Qty</th>
    <th class="text-center" style="width:75px">Received Qty</th>
    <th class="text-center" style="width:70px">Rejected Qty</th>
    <th class="text-center" style="width:80px">Unit Cost (PKR)</th>
    <th>Condition / Remarks</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="field-row" style="margin-top:8px">
  <div class="field"><label>Rejection Reason (if any):</label><div class="line"></div></div>
  <div class="field"><label>Quality Observations:</label><div class="line"></div></div>
</div>
<div class="note">📌 Update system stock immediately after GRN. Attach supplier invoice copy to this form.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Received By (Store Keeper)</div></div>
  <div class="sig"><div class="line">Inspected By (Site Engineer)</div></div>
  <div class="sig"><div class="line">Supplier Representative</div></div>
</div>`;
}

/* ── 5. Expense Voucher ─────────────────────────────────────────── */
function expenseVoucherTemplate() {
  const rows = Array.from({ length: 8 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-right blank"></td>
    </tr>`).join('');

  return `
${headerHtml('Expense Voucher', 'EXP')}
${infoRowsHtml([['Project', 'Stage / Cost Center'], ['Date', 'Payment Mode'], ['Paid By', 'Vendor / Payee Name']])}
<h2>Expense Details</h2>
<table>
  <thead><tr>
    <th class="text-center" style="width:35px">#</th>
    <th>Description of Expense</th>
    <th>Category</th>
    <th>Reference / Invoice No</th>
    <th class="text-right" style="width:100px">Amount (PKR)</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="total-row"><td colspan="4" class="text-right bold">TOTAL</td><td class="text-right bold"></td></tr>
  </tfoot>
</table>
<div class="field-row" style="margin-top:8px">
  <div class="field"><label>Amount in Words:</label><div class="line"></div></div>
</div>
<div class="field-row">
  <div class="field"><label>Remarks / Justification:</label><div class="line"></div><div class="line"></div></div>
</div>
<div class="note">📌 Attach all bills, receipts and invoices to this voucher before submission for approval.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Prepared By</div></div>
  <div class="sig"><div class="line">Approved By (PM / Director)</div></div>
  <div class="sig"><div class="line">Received By (Payee)</div></div>
</div>`;
}

/* ── 6. Labour Payment Voucher ──────────────────────────────────── */
function paymentVoucherTemplate() {
  const rows = Array.from({ length: 12 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-right"></td>
      <td class="text-right"></td>
      <td class="text-right bold"></td>
      <td></td>
    </tr>`).join('');

  return `
${headerHtml('Labour Payment Voucher', 'LPV')}
${infoRowsHtml([['Project', 'Stage'], ['Payment Period (From – To)', 'Payment Date'], ['Payment Method', 'Bank / Account No (if transfer)']])}
<h2>Worker Payment Details</h2>
<table>
  <thead><tr>
    <th class="text-center" style="width:35px">#</th>
    <th>Worker Name</th>
    <th>CNIC / ID</th>
    <th class="text-center" style="width:55px">Days</th>
    <th class="text-center" style="width:65px">Rate/Day</th>
    <th class="text-right" style="width:80px">Gross (PKR)</th>
    <th class="text-right" style="width:80px">Advance Ded.</th>
    <th class="text-right" style="width:80px">Net Pay</th>
    <th style="width:80px">Signature / Thumb</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="5" class="text-right bold">TOTALS</td>
      <td class="text-right bold"></td>
      <td class="text-right bold"></td>
      <td class="text-right bold"></td>
      <td></td>
    </tr>
  </tfoot>
</table>
<div class="field-row" style="margin-top:8px">
  <div class="field"><label>Total Amount in Words:</label><div class="line"></div></div>
</div>
<div class="note">📌 Workers must sign / thumbprint in the last column upon receiving payment.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Prepared By (HR / Supervisor)</div></div>
  <div class="sig"><div class="line">Verified By (Accountant)</div></div>
  <div class="sig"><div class="line">Approved By (Director)</div></div>
</div>`;
}

/* ── 7. Purchase Order ──────────────────────────────────────────── */
function purchaseOrderTemplate() {
  const rows = Array.from({ length: 10 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="text-right"></td>
      <td class="text-right"></td>
    </tr>`).join('');

  return `
${headerHtml('Purchase Order', 'PO')}
<table style="margin-bottom:10px">
  <tr>
    <td style="width:50%;vertical-align:top;padding-right:20px;border:none">
      <strong style="color:#1a3a8f">Supplier / Vendor:</strong><br>
      Name: ______________________________<br><br>
      Address: ______________________________<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;______________________________<br><br>
      Phone: ______________________________<br>
      NTN: ______________________________
    </td>
    <td style="width:50%;vertical-align:top;border:none">
      <strong style="color:#1a3a8f">Delivery Details:</strong><br>
      Deliver To: ______________________________<br><br>
      Project: ______________________________<br><br>
      Delivery Date: ______________________________<br>
      Payment Terms: ______________________________
    </td>
  </tr>
</table>
<h2>Items Ordered</h2>
<table>
  <thead><tr>
    <th class="text-center" style="width:35px">#</th>
    <th>Material Description / Specification</th>
    <th>Unit</th>
    <th class="text-center" style="width:65px">Qty</th>
    <th class="text-right" style="width:90px">Unit Price (PKR)</th>
    <th class="text-right" style="width:90px">Total (PKR)</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr><td colspan="5" class="text-right">Sub Total</td><td class="text-right"></td></tr>
    <tr><td colspan="5" class="text-right">Discount</td><td class="text-right"></td></tr>
    <tr><td colspan="5" class="text-right">GST (if applicable)</td><td class="text-right"></td></tr>
    <tr class="total-row"><td colspan="5" class="text-right bold">GRAND TOTAL</td><td class="text-right bold"></td></tr>
  </tfoot>
</table>
<div class="field-row" style="margin-top:8px">
  <div class="field"><label>Special Instructions / Terms:</label><div class="line"></div><div class="line"></div></div>
</div>
<div class="note">📌 This PO is not valid without authorized signature. Supplier must produce this copy upon delivery.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Procurement Officer</div></div>
  <div class="sig"><div class="line">Accounts / Finance</div></div>
  <div class="sig"><div class="line">Authorized Signatory (Director)</div></div>
</div>`;
}

/* ── 8. Cash Receipt Voucher ────────────────────────────────────── */
function cashReceiptTemplate() {
  return `
${headerHtml('Cash Receipt Voucher', 'CRV')}
<div style="border:2px solid #16a34a;border-radius:8px;padding:16px;margin:12px 0;background:#f0fdf4">
  <div class="field-row">
    <div class="field"><label>Received From (Customer Name):</label><div class="line" style="font-size:13pt"></div></div>
    <div class="field" style="max-width:160px"><label>Receipt Date:</label><div class="line"></div></div>
  </div>
  <div class="field-row" style="margin-top:12px">
    <div class="field"><label>Property / Unit No:</label><div class="line"></div></div>
    <div class="field"><label>Project:</label><div class="line"></div></div>
    <div class="field" style="max-width:140px"><label>Installment No:</label><div class="line"></div></div>
  </div>
  <div style="margin-top:16px;border-top:1px dashed #16a34a;padding-top:12px">
    <div class="field-row">
      <div class="field"><label>Amount Received (Figures):</label>
        <div style="font-size:20pt;font-weight:bold;border-bottom:2px solid #333;min-height:32px;color:#15803d">PKR ___________________________</div>
      </div>
    </div>
    <div class="field-row" style="margin-top:8px">
      <div class="field"><label>Amount in Words:</label><div class="line"></div></div>
    </div>
    <div class="field-row" style="margin-top:8px">
      <div class="field" style="max-width:200px"><label>Payment Mode:</label>
        <div>
          <span class="badge">Cash</span>
          <span class="badge">Cheque</span>
          <span class="badge">Bank Transfer</span>
        </div>
      </div>
      <div class="field"><label>Cheque / Transaction No:</label><div class="line"></div></div>
      <div class="field"><label>Bank Name:</label><div class="line"></div></div>
    </div>
  </div>
  <div class="field-row" style="margin-top:8px">
    <div class="field"><label>Remarks / Balance Due:</label><div class="line"></div></div>
  </div>
</div>
<div class="note">📌 Post this receipt in the system under Sales → Installment Payments immediately.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Received By (Cashier / Accounts)</div></div>
  <div class="sig"><div class="line">Customer Signature</div></div>
  <div class="sig"><div class="line">Authorized By (Director)</div></div>
</div>
<div style="margin-top:20px;border-top:2px dashed #aaa;padding-top:12px;font-size:9pt;color:#555;text-align:center">
  [ Customer Copy ]
</div>`;
}

/* ── 9. Site Daily Progress Report ─────────────────────────────── */
function siteProgressTemplate() {
  const activities = Array.from({ length: 8 }, (_, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="blank"></td>
    </tr>`).join('');

  return `
${headerHtml('Site Daily Progress Report', 'DPR')}
${infoRowsHtml([['Project', 'Report Date'], ['Site Engineer / Supervisor', 'Weather'], ['Stage Under Construction', 'Report No']])}

<h2>Workforce Summary</h2>
<table>
  <thead><tr>
    <th>Labour Category</th>
    <th class="text-center" style="width:80px">Present</th>
    <th class="text-center" style="width:80px">Absent</th>
    <th class="text-center" style="width:80px">OT Hours</th>
    <th>Contractor Name</th>
  </tr></thead>
  <tbody>
    ${['Mason / Bhatti', 'Carpenter', 'Steel Fixer', 'General Labour', 'Electrician', 'Plumber', 'Painter', 'Supervisor'].map(cat => `
    <tr><td>${cat}</td><td></td><td></td><td></td><td class="blank"></td></tr>`).join('')}
    <tr class="total-row"><td class="bold">TOTAL</td><td class="text-center bold"></td><td class="text-center bold"></td><td class="text-center bold"></td><td></td></tr>
  </tbody>
</table>

<h2>Work Completed Today</h2>
<table>
  <thead><tr>
    <th class="text-center" style="width:35px">#</th>
    <th>Activity / Task</th>
    <th>Location / Area</th>
    <th class="text-center" style="width:80px">Qty / Progress</th>
    <th>Remarks</th>
  </tr></thead>
  <tbody>${activities}</tbody>
</table>

<h2>Materials Consumed Today</h2>
<table>
  <thead><tr>
    <th>Material</th>
    <th class="text-center" style="width:80px">Unit</th>
    <th class="text-center" style="width:100px">Opening Bal.</th>
    <th class="text-center" style="width:100px">Received</th>
    <th class="text-center" style="width:100px">Consumed</th>
    <th class="text-center" style="width:100px">Closing Bal.</th>
  </tr></thead>
  <tbody>
    ${Array.from({ length: 6 }, () => `<tr><td class="blank"></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
  </tbody>
</table>

<div class="field-row">
  <div class="field"><label>Issues / Problems Encountered:</label><div class="line"></div><div class="line"></div></div>
</div>
<div class="field-row">
  <div class="field"><label>Plan for Tomorrow:</label><div class="line"></div><div class="line"></div></div>
</div>
<div class="sig-row">
  <div class="sig"><div class="line">Site Engineer</div></div>
  <div class="sig"><div class="line">Project Manager</div></div>
  <div class="sig"><div class="line">Client Representative (if any)</div></div>
</div>`;
}

/* ── 10. Store Daily Stock Register ─────────────────────────────── */
function stockRegisterTemplate() {
  const rows = Array.from({ length: 12 }, () => `
    <tr>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="blank"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-center"></td>
      <td class="text-center bold"></td>
      <td class="blank"></td>
    </tr>`).join('');

  return `
${headerHtml('Store Daily Stock Register', 'SSR')}
${infoRowsHtml([['Date', 'Store Location / Project'], ['Store Keeper Name', 'Shift']])}
<h2>Stock Movements</h2>
<table>
  <thead><tr>
    <th>Material Name</th>
    <th>Unit</th>
    <th>Category</th>
    <th class="text-center" style="width:80px">Opening Stock</th>
    <th class="text-center" style="width:80px">Received (IN)</th>
    <th class="text-center" style="width:80px">Issued (OUT)</th>
    <th class="text-center" style="width:80px">Closing Stock</th>
    <th>Reference (MIS/GRN No)</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="field-row" style="margin-top:8px">
  <div class="field"><label>Low Stock / Reorder Alerts (materials running low):</label><div class="line"></div><div class="line"></div></div>
</div>
<div class="field-row">
  <div class="field"><label>Discrepancies / Issues Noted:</label><div class="line"></div></div>
</div>
<div class="note">📌 Post all IN/OUT movements in the Inventory module at end of day. Closing stock here must match system balance.</div>
<div class="sig-row">
  <div class="sig"><div class="line">Store Keeper</div></div>
  <div class="sig"><div class="line">Site Engineer (Verification)</div></div>
  <div class="sig"><div class="line">Project Manager</div></div>
</div>`;
}

/* ─────────────── Main Component ────────────────────────────────── */
export default function TemplatesPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const GENERATORS: Record<TemplateId, () => string> = {
    'attendance':           attendanceTemplate,
    'material-issue':       materialIssueTemplate,
    'material-requisition': materialRequisitionTemplate,
    'grn':                  grnTemplate,
    'expense-voucher':      expenseVoucherTemplate,
    'payment-voucher':      paymentVoucherTemplate,
    'purchase-order':       purchaseOrderTemplate,
    'cash-receipt':         cashReceiptTemplate,
    'site-progress':        siteProgressTemplate,
    'stock-register':       stockRegisterTemplate,
  };

  const handlePrint = (id: TemplateId, title: string) => {
    const html = GENERATORS[id]();
    printContent(html, title);
  };

  const PROCESS_GUIDE: { form: string; posts: string }[] = [
    { form: 'Labour Attendance Sheet',    posts: 'Labour → Record Attendance (daily)' },
    { form: 'Labour Payment Voucher',     posts: 'Labour → Record Payment + Wage Summary' },
    { form: 'Material Requisition Form',  posts: 'Inventory → Issue Material (if in stock) or Procurement → New PO' },
    { form: 'Material Issue Slip (MIS)',  posts: 'Inventory → Issue Material to Project/Stage' },
    { form: 'Goods Received Note (GRN)', posts: 'Inventory → Receive Stock + Procurement → Update PO Status' },
    { form: 'Purchase Order',             posts: 'Procurement → Create Purchase Order' },
    { form: 'Expense Voucher',            posts: 'Expenses → Add Expense + Cashflow → OUT transaction' },
    { form: 'Cash Receipt Voucher',       posts: 'Sales → Record Installment Payment + Cashflow → IN' },
    { form: 'Site Daily Progress Report', posts: 'Projects → Update Stage Completion %' },
    { form: 'Store Stock Register',       posts: 'Inventory → Receive Stock / Issue Material (reconciliation)' },
  ];

  return (
    <div className="space-y-6" ref={containerRef}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Site Physical Templates</h1>
        <p className="text-sm text-gray-500">Printable forms for site staff — fill manually, then post data into the system</p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map(t => (
          <div key={t.id} className="bg-white rounded-xl border hover:border-blue-400 hover:shadow-md transition-all p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{t.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 text-sm">{t.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto pt-2 border-t">
              <button
                onClick={() => handlePrint(t.id, t.title)}
                className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                🖨️ Print / Download
              </button>
              <button
                onClick={() => {
                  const html = GENERATORS[t.id]();
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(`<!DOCTYPE html><html><head><title>Preview - ${t.title}</title>
                    <style>body{font-family:Arial;font-size:11pt;padding:20px;color:#111}
                    h1{font-size:15pt}h2{font-size:12pt;color:#1a56db;border-bottom:1px solid #1a56db;padding-bottom:2px}
                    .header{display:flex;justify-content:space-between;border:2px solid #1a56db;padding:10px;border-radius:6px;margin-bottom:14px;background:#eff6ff}
                    .company .name{font-size:16pt;font-weight:bold;color:#1a3a8f}.company .sub{font-size:9pt;color:#555}
                    .doc-info{text-align:right}.doc-info .doc-no{font-size:14pt;font-weight:bold;color:#dc2626}
                    table{width:100%;border-collapse:collapse;margin:8px 0}
                    th{background:#dbeafe;color:#1e3a8a;font-size:10pt;padding:5px 7px;text-align:left;border:1px solid #93c5fd}
                    td{padding:4px 7px;border:1px solid #bbb;font-size:10pt;min-height:22px}
                    td.blank{height:24px}td.label{background:#f8fafc;font-weight:600;width:22%;white-space:nowrap}
                    .field-row{display:flex;gap:16px;margin:5px 0}.field{flex:1}.field label{font-size:9pt;color:#555;display:block;margin-bottom:1px}
                    .field .line{border-bottom:1px solid #333;min-height:20px}
                    .sig-row{display:flex;gap:24px;margin-top:22px}.sig{flex:1;text-align:center}
                    .sig .line{border-top:1px solid #333;margin-top:40px;padding-top:3px;font-size:9pt;color:#555}
                    .note{background:#fef9c3;border:1px solid #fbbf24;border-radius:4px;padding:6px 10px;font-size:9pt;margin:10px 0}
                    .badge{display:inline-block;border:1px solid #333;border-radius:3px;padding:0 5px;font-size:9pt;margin-right:4px}
                    .text-right{text-align:right!important}.text-center{text-align:center!important}.bold{font-weight:bold}
                    .total-row td{background:#e0f2fe;font-weight:bold}
                    </style></head><body>${html}</body></html>`);
                    win.document.close();
                  }
                }}
                className="border border-gray-300 text-gray-600 text-xs py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                👁️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* System Entry Guide */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-gray-800 mb-1">📋 Form → System Entry Guide</h2>
        <p className="text-xs text-gray-500 mb-4">After filling each physical form on-site, use this guide to know which module to post the data into.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="px-4 py-2 text-left text-blue-800 border border-blue-200 font-semibold">Physical Form</th>
                <th className="px-4 py-2 text-left text-blue-800 border border-blue-200 font-semibold">Post in System →</th>
              </tr>
            </thead>
            <tbody>
              {PROCESS_GUIDE.map((g, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 border border-gray-200 font-medium text-gray-700">{g.form}</td>
                  <td className="px-4 py-2.5 border border-gray-200 text-blue-700">{g.posts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">📌 Best Practices</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Print forms daily before site work begins</li>
            <li>• All forms must carry a serial number for traceability</li>
            <li>• Data must be entered in the system the same day</li>
            <li>• Signed physical copies must be filed by month</li>
            <li>• GRN must be raised before stock is entered in system</li>
            <li>• Labour attendance sheet must match payment voucher</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">🖨️ Printing Tips</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use A4 paper for all forms</li>
            <li>• Print 2 copies — one for site, one for office/store</li>
            <li>• Labour Attendance: print for each contractor separately</li>
            <li>• Keep blank copies at site for emergency use</li>
            <li>• PO and Cash Receipt: keep 3 copies (supplier/customer, store, accounts)</li>
            <li>• Click 👁️ to preview before printing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
