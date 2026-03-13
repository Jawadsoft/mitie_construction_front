import { useEffect, useState } from 'react';
import { getCashTransactions, createCashTransaction, getCashflowSummary } from '../api/cashflow';
import type { CashTransaction } from '../api/cashflow';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

export default function CashflowPage() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState({ in: 0, out: 0, balance: 0 });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');

  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'IN' as 'IN' | 'OUT',
    amount: '', method: 'Cash', reference_no: '', description: '', project_id: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [t, s, p] = await Promise.all([
        getCashTransactions(filterType ? { type: filterType } : undefined),
        getCashflowSummary(), getProjects()
      ]);
      setTransactions(t); setSummary(s); setProjects(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType]);

  const handleSave = async () => {
    if (!form.amount || !form.transaction_date) { setError('Date and amount are required'); return; }
    setError('');
    try {
      await createCashTransaction({
        ...form,
        project_id: form.project_id || undefined,
      } as any);
      setShowModal(false);
      load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cash Flow</h1>
          <p className="text-sm text-gray-500">Track all cash inflows and outflows</p>
        </div>
        <button onClick={() => { setError(''); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total In" value={`PKR ${fmt(summary.in)}`} icon="📥" color="green" />
        <StatCard title="Total Out" value={`PKR ${fmt(summary.out)}`} icon="📤" color="red" />
        <StatCard title="Balance" value={`PKR ${fmt(summary.balance)}`} icon="💰" color={summary.balance >= 0 ? 'blue' : 'red'} />
      </div>

      <div className="flex gap-3">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">All Transactions</option>
          <option value="IN">Cash In</option>
          <option value="OUT">Cash Out</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left text-gray-600">Method</th>
                  <th className="px-4 py-3 text-left text-gray-600">Ref</th>
                  <th className="px-4 py-3 text-right text-gray-600">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">No transactions yet.</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{t.transaction_date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type === 'IN' ? '↑ IN' : '↓ OUT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.description ?? '-'}</td>
                    <td className="px-4 py-3">{t.method}</td>
                    <td className="px-4 py-3 text-gray-400">{t.reference_no ?? '-'}</td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'IN' ? '+' : '-'}{fmt(Number(t.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title="Add Transaction" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'IN' | 'OUT' }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="IN">Cash In</option>
                  <option value="OUT">Cash Out</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {['Cash', 'Bank Transfer', 'Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
              <input value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project (optional)</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">-- None --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">Add Transaction</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
