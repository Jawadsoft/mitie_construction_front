import { useEffect, useState } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses';
import type { Expense } from '../api/expenses';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getSuppliers } from '../api/suppliers';
import type { Supplier } from '../api/suppliers';
import { getContractors } from '../api/labour';
import type { LabourContractor } from '../api/labour';
import Modal from '../components/Modal';
import DetailDrawer, { DrawerSection, DrawerField } from '../components/DetailDrawer';
import { exportCSV, exportPDF } from '../utils/exportUtils';

const CATEGORIES = ['Materials', 'Labour', 'Equipment Rental', 'Transport', 'Utilities', 'Administration', 'Other'];
const PAYMENT_TYPES = ['Cash', 'Bank Transfer', 'Cheque', 'Credit'];

const emptyForm = {
  project_id: '', project_stage_id: '', category: '', vendor_type: 'OTHER',
  supplier_id: '', contractor_id: '', payment_type: 'Cash',
  expense_date: new Date().toISOString().split('T')[0], amount: '', description: '',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contractors, setContractors] = useState<LabourContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [drawerExpense, setDrawerExpense] = useState<Expense | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [e, p, s, c] = await Promise.all([
        getExpenses(filterProject ? { project_id: filterProject } : undefined),
        getProjects(), getSuppliers(), getContractors()
      ]);
      setExpenses(e); setProjects(p); setSuppliers(s); setContractors(c);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterProject]);

  useEffect(() => {
    if (form.project_id) {
      fetch(`/api/projects/${form.project_id}/stages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json()).then(data => setStages(Array.isArray(data) ? data : [])).catch(() => setStages([]));
    } else { setStages([]); }
  }, [form.project_id]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true); };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      project_id: e.project_id, project_stage_id: e.project_stage_id,
      category: e.category, vendor_type: e.vendor_type,
      supplier_id: e.supplier_id ?? '', contractor_id: e.contractor_id ?? '',
      payment_type: e.payment_type, expense_date: e.expense_date,
      amount: e.amount, description: e.description ?? '',
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        supplier_id: form.vendor_type === 'SUPPLIER' ? form.supplier_id || undefined : undefined,
        contractor_id: form.vendor_type === 'LABOUR' ? form.contractor_id || undefined : undefined,
      } as any;
      if (editing) {
        await updateExpense(editing.id, payload);
      } else {
        await createExpense(payload);
      }
      setShowModal(false); load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense record?')) return;
    try { await deleteExpense(id); load(); } catch (e: any) { setError(e.message); }
  };

  const handleExportCSV = () => {
    exportCSV('expenses', expenses.map(e => ({
      Date: e.expense_date, Category: e.category, Description: e.description ?? '',
      'Vendor Type': e.vendor_type, 'Payment Method': e.payment_type,
      'Amount (PKR)': e.amount,
    })));
  };

  const handleExportPDF = () => {
    exportPDF('Expenses Report', ['Date', 'Category', 'Description', 'Payment', 'Amount (PKR)'],
      expenses.map(e => [e.expense_date, e.category, e.description ?? '-', e.payment_type, Number(e.amount).toLocaleString()])
    );
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
          <p className="text-sm text-gray-500">Total: PKR {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">
            ↓ CSV
          </button>
          <button onClick={handleExportPDF} className="border border-red-500 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50">
            ↓ PDF
          </button>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Expense
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left text-gray-600">Payment</th>
                  <th className="px-4 py-3 text-right text-gray-600">Amount (PKR)</th>
                  <th className="px-4 py-3 text-center text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">No expenses yet.</td></tr>
                ) : expenses.map(e => (
                  <tr key={e.id} className="border-t hover:bg-yellow-50 cursor-pointer" onClick={() => setDrawerExpense(e)}>
                    <td className="px-4 py-3">{e.expense_date}</td>
                    <td className="px-4 py-3">
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{e.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{e.description ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.payment_type}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-red-600">{Number(e.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center" onClick={ev => ev.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                        <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {expenses.length > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-semibold">Total</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-700">{totalExpenses.toLocaleString()}</td>
                    <td />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value, project_stage_id: '' }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
                <select value={form.project_stage_id} onChange={e => setForm(f => ({ ...f, project_stage_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Stage --</option>
                  {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Type *</label>
                <select value={form.vendor_type} onChange={e => setForm(f => ({ ...f, vendor_type: e.target.value }))}
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
                <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {form.vendor_type === 'LABOUR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
                <select value={form.contractor_id} onChange={e => setForm(f => ({ ...f, contractor_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Contractor --</option>
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
              <select value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              {editing ? 'Update Expense' : 'Add Expense'}
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
            <DrawerField label="Amount" value={`PKR ${Number(drawerExpense.amount).toLocaleString()}`} />
            <DrawerField label="Payment Type" value={drawerExpense.payment_type} />
            <DrawerField label="Description" value={drawerExpense.description} />
            <DrawerField label="Vendor Type" value={(drawerExpense as any).vendor_type} />
            {(drawerExpense as any).supplier_id && (
              <DrawerField label="Supplier ID" value={(drawerExpense as any).supplier_id} />
            )}
            {(drawerExpense as any).contractor_id && (
              <DrawerField label="Contractor ID" value={(drawerExpense as any).contractor_id} />
            )}
            <DrawerSection title="Project Allocation" />
            <DrawerField label="Project ID" value={(drawerExpense as any).project_id} />
            <DrawerField label="Stage ID" value={(drawerExpense as any).project_stage_id} />
            <DrawerField label="Reference No" value={(drawerExpense as any).reference_no} />
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
