import { useEffect, useState } from 'react';
import {
  getExpenses, createExpense, updateExpense, deleteExpense, payExpenseBill,
} from '../api/expenses';
import type { Expense } from '../api/expenses';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getSuppliers } from '../api/suppliers';
import type { Supplier } from '../api/suppliers';
import { getContractors } from '../api/labour';
import type { LabourContractor } from '../api/labour';
import { getBankAccounts } from '../api/accounting';
import type { BankAccount } from '../api/accounting';
import Modal from '../components/Modal';
import DetailDrawer, { DrawerSection, DrawerField } from '../components/DetailDrawer';
import { exportCSV, exportPDF } from '../utils/exportUtils';

const CATEGORIES = ['Land Purchase', 'Materials', 'Labour', 'Equipment Rental', 'Transport', 'Utilities', 'Administration', 'Other'];
const DIRECT_PAYMENT_TYPES = ['Cash', 'Bank Transfer', 'Cheque'];

function needsBank(method: string) {
  return method === 'Bank Transfer' || method === 'Cheque' || method === 'Bank';
}

function bankLabel(b: BankAccount) {
  const parts = [b.name];
  if (b.bank_name) parts.push(b.bank_name);
  if (b.account_number) parts.push(`…${b.account_number.slice(-4)}`);
  return parts.join(' · ');
}

const emptyForm = {
  project_id: '', project_stage_id: '', category: '', vendor_type: 'OTHER',
  supplier_id: '', contractor_id: '', entry_mode: 'DIRECT' as 'DIRECT' | 'BILL',
  payment_type: 'Cash', bank_account_id: '',
  expense_date: new Date().toISOString().split('T')[0], amount: '', description: '',
};

const emptyPayForm = {
  amount: '',
  paid_date: new Date().toISOString().split('T')[0],
  payment_method: 'Cash',
  bank_account_id: '',
  notes: '',
};

const STATUS_COLORS: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700',
  Unpaid: 'bg-amber-100 text-amber-800',
  Partial: 'bg-blue-100 text-blue-700',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contractors, setContractors] = useState<LabourContractor[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState<Expense | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [drawerExpense, setDrawerExpense] = useState<Expense | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [e, p, s, c, b] = await Promise.all([
        getExpenses({
          ...(filterProject ? { project_id: filterProject } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
        }),
        getProjects(), getSuppliers(), getContractors(), getBankAccounts(),
      ]);
      setExpenses(e); setProjects(p); setSuppliers(s); setContractors(c); setBanks(b);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterProject, filterStatus]);

  useEffect(() => {
    if (form.project_id) {
      fetch(`/api/projects/${form.project_id}/stages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then((r) => r.json()).then((data) => setStages(Array.isArray(data) ? data : [])).catch(() => setStages([]));
    } else { setStages([]); }
  }, [form.project_id]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true); };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      project_id: e.project_id, project_stage_id: e.project_stage_id,
      category: e.category, vendor_type: e.vendor_type,
      supplier_id: e.supplier_id ?? '', contractor_id: e.contractor_id ?? '',
      entry_mode: (e.entry_mode === 'BILL' ? 'BILL' : 'DIRECT'),
      payment_type: e.payment_type, bank_account_id: e.bank_account_id ?? '',
      expense_date: e.expense_date,
      amount: e.amount, description: e.description ?? '',
    });
    setError(''); setShowModal(true);
  };

  const openPay = (e: Expense) => {
    const bal = Math.max(0, Number(e.amount) - Number(e.paid_amount || 0));
    setPaying(e);
    setPayForm({ ...emptyPayForm, amount: String(bal) });
    setError('');
    setShowPayModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        payment_type: form.entry_mode === 'BILL' ? 'Credit' : form.payment_type,
        bank_account_id:
          form.entry_mode === 'DIRECT' && needsBank(form.payment_type)
            ? form.bank_account_id || null
            : form.entry_mode === 'DIRECT' && form.bank_account_id
              ? form.bank_account_id
              : null,
        supplier_id: form.vendor_type === 'SUPPLIER' ? form.supplier_id || undefined : undefined,
        contractor_id: form.vendor_type === 'LABOUR' ? form.contractor_id || undefined : undefined,
      } as any;
      if (!editing && form.entry_mode === 'DIRECT' && needsBank(form.payment_type) && !form.bank_account_id) {
        setError('Select a partner bank for Bank Transfer / Cheque');
        return;
      }
      if (editing) {
        await updateExpense(editing.id, payload);
      } else {
        await createExpense(payload);
      }
      setShowModal(false); load();
    } catch (e: any) { setError(e.message); }
  };

  const handlePay = async () => {
    if (!paying) return;
    if (!payForm.amount) { setError('Amount is required'); return; }
    if (needsBank(payForm.payment_method) && !payForm.bank_account_id) {
      setError('Select a partner bank for Bank Transfer / Cheque');
      return;
    }
    setError('');
    try {
      await payExpenseBill(paying.id, {
        amount: payForm.amount,
        paid_date: payForm.paid_date,
        payment_method: payForm.payment_method,
        bank_account_id: payForm.bank_account_id || undefined,
        notes: payForm.notes || undefined,
      });
      setShowPayModal(false);
      setPaying(null);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense record and its journals?')) return;
    try { await deleteExpense(id); load(); } catch (e: any) { setError(e.message); }
  };

  const handleExportCSV = () => {
    exportCSV('expenses', expenses.map((e) => ({
      Date: e.expense_date, Category: e.category, Mode: e.entry_mode ?? 'DIRECT',
      Status: e.status ?? 'Paid', Description: e.description ?? '',
      'Payment Method': e.payment_type,
      'Amount (PKR)': e.amount,
      'Paid (PKR)': e.paid_amount ?? e.amount,
    })));
  };

  const handleExportPDF = () => {
    exportPDF('Expenses Report', ['Date', 'Category', 'Mode', 'Status', 'Payment', 'Amount (PKR)'],
      expenses.map((e) => [
        e.expense_date, e.category, e.entry_mode ?? 'DIRECT', e.status ?? 'Paid',
        e.payment_type, Number(e.amount).toLocaleString(),
      ]));
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const unpaidBalance = expenses
    .filter((e) => e.entry_mode === 'BILL' && e.status !== 'Paid')
    .reduce((s, e) => s + (Number(e.amount) - Number(e.paid_amount || 0)), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
          <p className="text-sm text-gray-500">
            Total: PKR {totalExpenses.toLocaleString()}
            {unpaidBalance > 0 && (
              <span className="text-amber-700"> · Unpaid bills: PKR {unpaidBalance.toLocaleString()}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">↓ CSV</button>
          <button onClick={handleExportPDF} className="border border-red-500 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50">↓ PDF</button>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Expense</button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">All statuses</option>
          <option value="Unpaid">Unpaid bills</option>
          <option value="Partial">Partial</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      {error && !showModal && !showPayModal && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left text-gray-600">Mode</th>
                  <th className="px-4 py-3 text-left text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                  <th className="px-4 py-3 text-center text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-8">No expenses yet.</td></tr>
                ) : expenses.map((e) => {
                  const paid = Number(e.paid_amount ?? (e.entry_mode === 'BILL' ? 0 : e.amount));
                  const canPay = e.entry_mode === 'BILL' && e.status !== 'Paid';
                  return (
                    <tr key={e.id} className="border-t hover:bg-yellow-50 cursor-pointer" onClick={() => setDrawerExpense(e)}>
                      <td className="px-4 py-3">{e.expense_date}</td>
                      <td className="px-4 py-3">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{e.category}</span>
                        {e.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[12rem]">{e.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {e.entry_mode === 'BILL' ? 'Bill' : 'Direct'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-700'}`}>
                          {e.status || 'Paid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-red-600">{Number(e.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">{paid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex justify-center gap-1 flex-wrap">
                          {canPay && (
                            <button onClick={() => openPay(e)} className="text-green-700 hover:text-green-900 text-xs font-medium px-2 py-1 rounded hover:bg-green-50">Pay</button>
                          )}
                          <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {expenses.length > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-semibold">Total</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-700">{totalExpenses.toLocaleString()}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entry type *</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="entry_mode"
                      checked={form.entry_mode === 'DIRECT'}
                      onChange={() => setForm((f) => ({ ...f, entry_mode: 'DIRECT', payment_type: 'Cash' }))}
                    />
                    Pay now (Direct)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="entry_mode"
                      checked={form.entry_mode === 'BILL'}
                      onChange={() => setForm((f) => ({ ...f, entry_mode: 'BILL', payment_type: 'Credit' }))}
                    />
                    Record bill (Accrual)
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {form.entry_mode === 'BILL'
                    ? 'Posts to Accounts Payable. Pay later with the Pay button.'
                    : 'Posts expense and reduces Cash & Bank immediately.'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value, project_stage_id: '' }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
                <select value={form.project_stage_id} onChange={(e) => setForm((f) => ({ ...f, project_stage_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Stage --</option>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Type *</label>
                <select value={form.vendor_type} onChange={(e) => setForm((f) => ({ ...f, vendor_type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="SUPPLIER">Supplier</option>
                  <option value="LABOUR">Labour</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            {form.vendor_type === 'SUPPLIER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {form.vendor_type === 'LABOUR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
                <select value={form.contractor_id} onChange={(e) => setForm((f) => ({ ...f, contractor_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Contractor --</option>
                  {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            {form.entry_mode === 'DIRECT' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment method *</label>
                  <select
                    value={form.payment_type}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      payment_type: e.target.value,
                      bank_account_id: needsBank(e.target.value) ? f.bank_account_id : '',
                    }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {DIRECT_PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {needsBank(form.payment_type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pay from bank *</label>
                    <select
                      value={form.bank_account_id}
                      onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">-- Select bank account --</option>
                      {banks.map((b) => <option key={b.id} value={b.id}>{bankLabel(b)}</option>)}
                    </select>
                    {banks.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No banks yet — add one under Funds or Accounting → Bank Recon.</p>
                    )}
                  </div>
                )}
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              {editing ? 'Update Expense' : form.entry_mode === 'BILL' ? 'Record Bill' : 'Add Expense'}
            </button>
          </div>
        </Modal>
      )}

      {showPayModal && paying && (
        <Modal title={`Pay bill — ${paying.category}`} onClose={() => setShowPayModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            <p className="text-sm text-gray-600">
              Bill PKR {Number(paying.amount).toLocaleString()} · Paid PKR {Number(paying.paid_amount || 0).toLocaleString()} ·
              Balance <span className="font-semibold text-amber-700">PKR {(Number(paying.amount) - Number(paying.paid_amount || 0)).toLocaleString()}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={payForm.paid_date} onChange={(e) => setPayForm((f) => ({ ...f, paid_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
              <select
                value={payForm.payment_method}
                onChange={(e) => setPayForm((f) => ({
                  ...f,
                  payment_method: e.target.value,
                  bank_account_id: needsBank(e.target.value) ? f.bank_account_id : '',
                }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {DIRECT_PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {needsBank(payForm.payment_method) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay from bank *</label>
                <select
                  value={payForm.bank_account_id}
                  onChange={(e) => setPayForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Select bank account --</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{bankLabel(b)}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
            </div>
            <button onClick={handlePay} className="w-full bg-green-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-green-700">
              Record Payment
            </button>
          </div>
        </Modal>
      )}

      <DetailDrawer
        open={!!drawerExpense}
        title={`Expense — ${drawerExpense?.category ?? ''}`}
        subtitle={drawerExpense ? `${drawerExpense.expense_date} · PKR ${Number(drawerExpense.amount).toLocaleString()}` : ''}
        onClose={() => setDrawerExpense(null)}
      >
        {drawerExpense && (
          <>
            <DrawerSection title="Expense Details" />
            <DrawerField label="Date" value={drawerExpense.expense_date} />
            <DrawerField label="Category" value={drawerExpense.category} />
            <DrawerField label="Mode" value={drawerExpense.entry_mode === 'BILL' ? 'Bill (accrual)' : 'Direct'} />
            <DrawerField label="Status" value={drawerExpense.status} />
            <DrawerField label="Amount" value={`PKR ${Number(drawerExpense.amount).toLocaleString()}`} />
            <DrawerField label="Paid" value={`PKR ${Number(drawerExpense.paid_amount || 0).toLocaleString()}`} />
            <DrawerField label="Payment Type" value={drawerExpense.payment_type} />
            <DrawerField label="Description" value={drawerExpense.description} />
            <DrawerField label="Vendor Type" value={drawerExpense.vendor_type} />
            <DrawerSection title="Project Allocation" />
            <DrawerField label="Project ID" value={drawerExpense.project_id} />
            <DrawerField label="Stage ID" value={drawerExpense.project_stage_id} />
            {drawerExpense.entry_mode === 'BILL' && drawerExpense.status !== 'Paid' && (
              <button
                type="button"
                className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
                onClick={() => { setDrawerExpense(null); openPay(drawerExpense); }}
              >
                Pay bill
              </button>
            )}
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
