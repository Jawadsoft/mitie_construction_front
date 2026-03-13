import { useEffect, useState } from 'react';
import { getContractors, createContractor, updateContractor, deleteContractor, getAttendance, createAttendance, updateAttendance, deleteAttendance, getPayments, createPayment, updatePayment, deletePayment, getAttendanceByContractor, getPaymentsByContractor } from '../api/labour';
import type { LabourContractor, LabourAttendance, LabourPayment } from '../api/labour';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import Modal from '../components/Modal';
import DetailDrawer, { DrawerSection, DrawerField, StatusBadge } from '../components/DetailDrawer';
import { getAuthHeaders } from '../api/client';

type Tab = 'contractors' | 'attendance' | 'payments' | 'wages' | 'advances';

interface WageRow { contractor_id: string; contractor_name: string; daily_rate: number; total_days: number; gross_wages: number; total_paid: number; advances_given: number; balance_due: number; }
interface AdvanceRow { id: string; contractor_id: string; project_id: string; advance_date: string; amount: string; recovered_amount: string; notes: string | null; contractor?: LabourContractor; }

export default function LabourPage() {
  const [tab, setTab] = useState<Tab>('contractors');
  const [contractors, setContractors] = useState<LabourContractor[]>([]);
  const [attendance, setAttendance] = useState<LabourAttendance[]>([]);
  const [payments, setPayments] = useState<LabourPayment[]>([]);
  const [wages, setWages] = useState<WageRow[]>([]);
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingContractor, setEditingContractor] = useState<LabourContractor | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<LabourAttendance | null>(null);
  const [editingPayment, setEditingPayment] = useState<LabourPayment | null>(null);

  // Detail drawer
  const [drawerContractor, setDrawerContractor] = useState<LabourContractor | null>(null);
  const [drawerAttendance, setDrawerAttendance] = useState<LabourAttendance[]>([]);
  const [drawerPayments, setDrawerPayments] = useState<LabourPayment[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const openContractorDetail = async (c: LabourContractor) => {
    setDrawerContractor(c);
    setDrawerLoading(true);
    try {
      const [att, pay] = await Promise.all([
        getAttendanceByContractor(c.id),
        getPaymentsByContractor(c.id),
      ]);
      setDrawerAttendance(att);
      setDrawerPayments(pay);
    } catch { setDrawerAttendance([]); setDrawerPayments([]); }
    finally { setDrawerLoading(false); }
  };

  const emptyContractor = { name: '', contractor_type: '', phone: '', email: '', daily_rate: '' };
  const emptyAttendance = { contractor_id: '', project_id: '', attendance_date: '', present_days: '1', notes: '' };
  const emptyPayment = { contractor_id: '', project_id: '', payment_date: '', amount: '', payment_method: 'Cash', reference_no: '', notes: '' };
  const [contractorForm, setContractorForm] = useState(emptyContractor);
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendance);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [advanceForm, setAdvanceForm] = useState({ contractor_id: '', project_id: '', advance_date: '', amount: '', reference_no: '', notes: '' });

  const loadAll = async () => {
    const [c, a, p, pr] = await Promise.all([getContractors(), getAttendance(filterProject || undefined), getPayments(filterProject || undefined), getProjects()]);
    setContractors(c); setAttendance(a); setPayments(p); setProjects(pr);
    // wages
    try {
      const wRes = await fetch(`/api/labour/wages${filterProject ? `?project_id=${filterProject}` : ''}`, { headers: getAuthHeaders() });
      setWages(await wRes.json());
    } catch { setWages([]); }
    // advances
    try {
      const advRes = await fetch(`/api/labour/advances${filterProject ? `?project_id=${filterProject}` : ''}`, { headers: getAuthHeaders() });
      setAdvances(await advRes.json());
    } catch { setAdvances([]); }
  };

  useEffect(() => { loadAll().catch(e => setError(e.message)); }, [filterProject]);

  const save = async (fn: () => Promise<any>) => {
    setSaving(true); setError('');
    try { await fn(); setShowModal(false); loadAll(); } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openEditContractor = (c: LabourContractor) => {
    setEditingContractor(c);
    setContractorForm({ name: c.name, contractor_type: c.contractor_type ?? '', phone: c.phone ?? '', email: c.email ?? '', daily_rate: c.daily_rate ?? '' });
    setShowModal(true);
  };

  const openEditAttendance = (a: LabourAttendance) => {
    setEditingAttendance(a);
    setAttendanceForm({ contractor_id: a.contractor_id, project_id: a.project_id, attendance_date: a.attendance_date, present_days: String(a.present_days), notes: a.notes ?? '' });
    setShowModal(true);
  };

  const openEditPayment = (p: LabourPayment) => {
    setEditingPayment(p);
    setPaymentForm({ contractor_id: p.contractor_id, project_id: p.project_id, payment_date: p.payment_date, amount: p.amount, payment_method: p.payment_method, reference_no: p.reference_no ?? '', notes: p.notes ?? '' });
    setShowModal(true);
  };

  const handleSaveContractor = () => save(async () => {
    if (!contractorForm.name) throw new Error('Name is required');
    if (editingContractor) {
      await updateContractor(editingContractor.id, { ...contractorForm, daily_rate: contractorForm.daily_rate || undefined });
    } else {
      await createContractor({ ...contractorForm, daily_rate: contractorForm.daily_rate || undefined });
    }
    setEditingContractor(null);
  });

  const handleSaveAttendance = () => save(async () => {
    if (!attendanceForm.contractor_id || !attendanceForm.project_id || !attendanceForm.attendance_date) throw new Error('Contractor, project and date required');
    if (editingAttendance) {
      await updateAttendance(editingAttendance.id, attendanceForm);
    } else {
      await createAttendance(attendanceForm);
    }
    setEditingAttendance(null);
  });

  const handleSavePayment = () => save(async () => {
    if (!paymentForm.contractor_id || !paymentForm.project_id || !paymentForm.payment_date || !paymentForm.amount) throw new Error('All required fields must be filled');
    if (editingPayment) {
      await updatePayment(editingPayment.id, paymentForm);
    } else {
      await createPayment(paymentForm);
    }
    setEditingPayment(null);
  });

  const handleDeleteContractor = async (id: string) => {
    if (!confirm('Delete this contractor?')) return;
    await deleteContractor(id); loadAll();
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    await deleteAttendance(id); loadAll();
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Delete this payment record?')) return;
    await deletePayment(id); loadAll();
  };

  const handleExportPaymentsCSV = () => {
    exportCSV('labour-payments', payments.map(p => ({
      Date: p.payment_date, Contractor: p.contractor?.name ?? p.contractor_id,
      Method: p.payment_method, Reference: p.reference_no ?? '', Notes: p.notes ?? '',
      'Amount (PKR)': p.amount,
    })));
  };

  const handleExportPaymentsPDF = () => {
    exportPDF('Labour Payments', ['Date', 'Contractor', 'Method', 'Ref', 'Amount (PKR)'],
      payments.map(p => [p.payment_date, p.contractor?.name ?? p.contractor_id, p.payment_method, p.reference_no ?? '', Number(p.amount).toLocaleString()])
    );
  };

  const handleSaveAdvance = () => save(async () => {
    if (!advanceForm.contractor_id || !advanceForm.project_id || !advanceForm.advance_date || !advanceForm.amount) throw new Error('All required fields must be filled');
    const res = await fetch('/api/labour/advances', { method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(advanceForm) });
    if (!res.ok) throw new Error('Failed to save advance');
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'contractors', label: '👷 Contractors' }, { id: 'wages', label: '💹 Wage Summary' },
    { id: 'attendance', label: '📅 Attendance' }, { id: 'payments', label: '💵 Payments' },
    { id: 'advances', label: '🏦 Advances' },
  ];

  const addBtnLabel = { contractors: 'Contractor', attendance: 'Attendance', payments: 'Payment', wages: '', advances: 'Advance' }[tab];

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold text-gray-800">Labour Management</h1>
          <p className="text-sm text-gray-500">Contractors, attendance, wages & payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tab === 'payments' && <>
            <button onClick={handleExportPaymentsCSV} className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">↓ CSV</button>
            <button onClick={handleExportPaymentsPDF} className="border border-red-500 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50">↓ PDF</button>
          </>}
          {addBtnLabel && (
            <button onClick={() => {
              setEditingContractor(null); setEditingAttendance(null); setEditingPayment(null);
              setContractorForm(emptyContractor); setAttendanceForm(emptyAttendance); setPaymentForm(emptyPayment);
              setError(''); setShowModal(true);
            }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + {addBtnLabel}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contractors */}
      {tab === 'contractors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors.length === 0 ? <p className="text-gray-400 col-span-3 text-center py-8">No contractors yet.</p>
            : contractors.map(c => (
              <div key={c.id} className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md hover:border-green-300 transition-all" onClick={() => openContractorDetail(c)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{c.name}</h3>
                    {c.contractor_type && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c.contractor_type}</span>}
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditContractor(c)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                    <button onClick={() => handleDeleteContractor(c.id)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                  </div>
                </div>
                {c.phone && <p className="text-sm text-gray-600 mt-1">📞 {c.phone}</p>}
                {c.daily_rate && <p className="text-sm text-gray-600">💵 PKR {Number(c.daily_rate).toLocaleString()}/day</p>}
                <p className="text-xs text-green-500 mt-2">Tap to view history →</p>
              </div>
            ))}
        </div>
      )}

      {/* Wage Summary */}
      {tab === 'wages' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-gray-600">Contractor</th>
                <th className="px-4 py-3 text-right text-gray-600">Days</th>
                <th className="px-4 py-3 text-right text-gray-600">Rate/Day</th>
                <th className="px-4 py-3 text-right text-gray-600">Gross Wages</th>
                <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                <th className="px-4 py-3 text-right text-gray-600">Advances</th>
                <th className="px-4 py-3 text-right text-gray-600">Balance Due</th>
              </tr></thead>
              <tbody>
                {wages.length === 0 ? <tr><td colSpan={7} className="text-center text-gray-400 py-8">No attendance records yet.</td></tr>
                  : wages.map(w => (
                    <tr key={w.contractor_id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{w.contractor_name}</td>
                      <td className="px-4 py-3 text-right">{w.total_days}</td>
                      <td className="px-4 py-3 text-right font-mono">{w.daily_rate.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono">{w.gross_wages.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">{w.total_paid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-yellow-600">{w.advances_given.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${w.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {w.balance_due.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance */}
      {tab === 'attendance' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-gray-600">Contractor</th>
              <th className="px-4 py-3 text-left text-gray-600">Date</th>
              <th className="px-4 py-3 text-right text-gray-600">Days</th>
              <th className="px-4 py-3 text-left text-gray-600">Notes</th>
              <th className="px-4 py-3 text-center text-gray-600">Actions</th>
            </tr></thead>
            <tbody>
              {attendance.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-400 py-8">No records.</td></tr>
                : attendance.map(a => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.contractor?.name ?? a.contractor_id}</td>
                    <td className="px-4 py-3">{a.attendance_date}</td>
                    <td className="px-4 py-3 text-right">{a.present_days}</td>
                    <td className="px-4 py-3 text-gray-500">{a.notes ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEditAttendance(a)} className="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                        <button onClick={() => handleDeleteAttendance(a.id)} className="text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-gray-600">Contractor</th>
              <th className="px-4 py-3 text-left text-gray-600">Date</th>
              <th className="px-4 py-3 text-right text-gray-600">Amount</th>
              <th className="px-4 py-3 text-left text-gray-600">Method</th>
              <th className="px-4 py-3 text-left text-gray-600">Reference</th>
              <th className="px-4 py-3 text-center text-gray-600">Actions</th>
            </tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-400 py-8">No payments.</td></tr>
                : payments.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.contractor?.name ?? p.contractor_id}</td>
                    <td className="px-4 py-3">{p.payment_date}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">PKR {Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">{p.payment_method}</td>
                    <td className="px-4 py-3 text-gray-400">{p.reference_no ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEditPayment(p)} className="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                        <button onClick={() => handleDeletePayment(p.id)} className="text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Advances */}
      {tab === 'advances' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-gray-600">Contractor</th>
              <th className="px-4 py-3 text-left text-gray-600">Date</th>
              <th className="px-4 py-3 text-right text-gray-600">Amount</th>
              <th className="px-4 py-3 text-right text-gray-600">Recovered</th>
              <th className="px-4 py-3 text-left text-gray-600">Notes</th>
            </tr></thead>
            <tbody>
              {advances.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-400 py-8">No advances.</td></tr>
                : advances.map((a: AdvanceRow) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{(a.contractor as any)?.name ?? a.contractor_id}</td>
                    <td className="px-4 py-3">{a.advance_date}</td>
                    <td className="px-4 py-3 text-right font-mono text-yellow-600">{Number(a.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">{Number(a.recovered_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400">{a.notes ?? '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {showModal && tab === 'contractors' && (
        <Modal title={editingContractor ? 'Edit Contractor' : 'Add Contractor'} onClose={() => { setShowModal(false); setEditingContractor(null); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {[{ l: 'Name *', k: 'name' }, { l: 'Type', k: 'contractor_type' }, { l: 'Phone', k: 'phone' }, { l: 'Email', k: 'email' }, { l: 'Daily Rate (PKR)', k: 'daily_rate' }].map(f => (
              <div key={f.k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.l}</label>
                <input value={(contractorForm as any)[f.k]} onChange={e => setContractorForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            ))}
            <button onClick={handleSaveContractor} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm">
              {saving ? 'Saving...' : editingContractor ? 'Update Contractor' : 'Add Contractor'}
            </button>
          </div>
        </Modal>
      )}

      {showModal && tab === 'attendance' && (
        <Modal title={editingAttendance ? 'Edit Attendance' : 'Record Attendance'} onClose={() => { setShowModal(false); setEditingAttendance(null); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {[{ l: 'Contractor *', k: 'contractor_id', opts: contractors.map(c => ({ v: c.id, label: c.name })) },
              { l: 'Project *', k: 'project_id', opts: projects.map(p => ({ v: p.id, label: p.name })) }].map(f => (
              <div key={f.k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.l}</label>
                <select value={(attendanceForm as any)[f.k]} onChange={e => setAttendanceForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {f.opts.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={attendanceForm.attendance_date} onChange={e => setAttendanceForm(p => ({ ...p, attendance_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Days Present</label>
                <input type="number" min="0" max="1" step="0.5" value={attendanceForm.present_days} onChange={e => setAttendanceForm(p => ({ ...p, present_days: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <button onClick={handleSaveAttendance} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm">{saving ? 'Saving...' : 'Save Attendance'}</button>
          </div>
        </Modal>
      )}

      {showModal && tab === 'payments' && (
        <Modal title={editingPayment ? 'Edit Payment' : 'Record Payment'} onClose={() => { setShowModal(false); setEditingPayment(null); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {[{ l: 'Contractor *', k: 'contractor_id', opts: contractors }, { l: 'Project *', k: 'project_id', opts: projects.map(p => ({ id: p.id, name: p.name })) }].map(f => (
              <div key={f.k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.l}</label>
                <select value={(paymentForm as any)[f.k]} onChange={e => setPaymentForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">-- Select --</option>
                  {f.opts.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select value={paymentForm.payment_method} onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {['Cash', 'Bank Transfer', 'Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input value={paymentForm.reference_no} onChange={e => setPaymentForm(p => ({ ...p, reference_no: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <button onClick={handleSavePayment} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm">{saving ? 'Saving...' : editingPayment ? 'Update Payment' : 'Record Payment'}</button>
          </div>
        </Modal>
      )}

      {showModal && tab === 'advances' && (
        <Modal title="Record Advance" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {[{ l: 'Contractor *', k: 'contractor_id', opts: contractors }, { l: 'Project *', k: 'project_id', opts: projects.map(p => ({ id: p.id, name: p.name })) }].map(f => (
              <div key={f.k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.l}</label>
                <select value={(advanceForm as any)[f.k]} onChange={e => setAdvanceForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">-- Select --</option>
                  {f.opts.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={advanceForm.advance_date} onChange={e => setAdvanceForm(p => ({ ...p, advance_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm(p => ({ ...p, amount: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input value={advanceForm.notes} onChange={e => setAdvanceForm(p => ({ ...p, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <button onClick={handleSaveAdvance} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm bg-yellow-600 hover:bg-yellow-700">{saving ? 'Saving...' : 'Record Advance'}</button>
          </div>
        </Modal>
      )}

      <DetailDrawer
        open={!!drawerContractor}
        title={drawerContractor?.name ?? ''}
        subtitle={drawerContractor?.contractor_type ?? 'Labour Contractor'}
        onClose={() => setDrawerContractor(null)}
        loading={drawerLoading}
      >
        {drawerContractor && (
          <>
            <DrawerSection title="Contractor Info" />
            <DrawerField label="Type" value={drawerContractor.contractor_type} />
            <DrawerField label="Phone" value={drawerContractor.phone} />
            <DrawerField label="Daily Rate" value={drawerContractor.daily_rate ? `PKR ${Number(drawerContractor.daily_rate).toLocaleString()}/day` : undefined} />
            <DrawerField label="Status" value={drawerContractor.is_active ? 'Active' : 'Inactive'} />

            <DrawerSection title={`Attendance Records (${drawerAttendance.length})`} />
            {drawerAttendance.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No attendance records found.</p>
            ) : (
              <div className="space-y-1">
                {drawerAttendance.slice(0, 10).map(a => (
                  <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <span className="text-slate-600">{a.attendance_date}</span>
                    <span className="font-semibold text-slate-800">{a.present_days} days</span>
                  </div>
                ))}
                {drawerAttendance.length > 10 && (
                  <p className="text-xs text-slate-400 pt-1">+{drawerAttendance.length - 10} more records</p>
                )}
                <div className="bg-green-50 rounded-lg p-2 mt-2 flex justify-between text-xs">
                  <span className="font-semibold text-green-700">Total Days</span>
                  <span className="font-bold text-green-900">
                    {drawerAttendance.reduce((s, a) => s + Number(a.present_days), 0)}
                  </span>
                </div>
              </div>
            )}

            <DrawerSection title={`Payments (${drawerPayments.length})`} />
            {drawerPayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No payment records found.</p>
            ) : (
              <div className="space-y-1">
                {drawerPayments.slice(0, 10).map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <span className="text-slate-600">{p.payment_date}</span>
                    <span className="font-semibold text-slate-800">PKR {Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
                <div className="bg-blue-50 rounded-lg p-2 mt-2 flex justify-between text-xs">
                  <span className="font-semibold text-blue-700">Total Paid</span>
                  <span className="font-bold text-blue-900">
                    PKR {drawerPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
