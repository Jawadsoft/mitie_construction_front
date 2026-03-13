import { useEffect, useState } from 'react';
import {
  getFundSources, createFundSource, updateFundSource, deleteFundSource,
  getFundTransactions, createFundTransaction, updateFundTransaction, deleteFundTransaction,
} from '../api/funds';
import type { FundSource, FundTransaction } from '../api/funds';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const SOURCE_TYPES = ['EQUITY', 'LOAN', 'INVESTOR', 'ADVANCE_SALES', 'OTHER'];
const TYPE_LABELS: Record<string, string> = { EQUITY: 'Equity', LOAN: 'Bank Loan', INVESTOR: 'Investor', ADVANCE_SALES: 'Advance Sales', OTHER: 'Other' };
const emptySourceForm = { project_id: '', source_name: '', source_type: 'EQUITY', total_committed: '', expected_date: '', notes: '' };
const emptyTxForm = { fund_source_id: '', transaction_date: new Date().toISOString().split('T')[0], amount: '', reference_no: '', notes: '' };

export default function FundsPage() {
  const [sources, setSources] = useState<FundSource[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [editingSource, setEditingSource] = useState<FundSource | null>(null);
  const [editingTx, setEditingTx] = useState<FundTransaction | null>(null);

  const [sourceForm, setSourceForm] = useState(emptySourceForm);
  const [txForm, setTxForm] = useState(emptyTxForm);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t, p] = await Promise.all([getFundSources(), getFundTransactions(selectedSource || undefined), getProjects()]);
      setSources(s); setTransactions(t); setProjects(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedSource]);

  const totalCommitted = sources.reduce((s, f) => s + Number(f.total_committed), 0);
  const totalReceived = sources.reduce((s, f) => s + Number(f.received_so_far), 0);

  const openAddSource = () => {
    setEditingSource(null);
    setSourceForm(emptySourceForm);
    setError('');
    setShowSourceModal(true);
  };

  const openEditSource = (s: FundSource) => {
    setEditingSource(s);
    setSourceForm({ project_id: s.project_id, source_name: s.source_name, source_type: s.source_type, total_committed: s.total_committed, expected_date: s.expected_date ?? '', notes: s.notes ?? '' });
    setError('');
    setShowSourceModal(true);
  };

  const openAddTx = () => {
    setEditingTx(null);
    setTxForm(emptyTxForm);
    setError('');
    setShowTxModal(true);
  };

  const openEditTx = (t: FundTransaction) => {
    setEditingTx(t);
    setTxForm({ fund_source_id: t.fund_source_id, transaction_date: t.transaction_date, amount: t.amount, reference_no: t.reference_no ?? '', notes: t.notes ?? '' });
    setError('');
    setShowTxModal(true);
  };

  const handleSaveSource = async () => {
    if (!sourceForm.project_id || !sourceForm.source_name || !sourceForm.total_committed) { setError('Project, name, and amount are required'); return; }
    setError('');
    try {
      if (editingSource) {
        await updateFundSource(editingSource.id, sourceForm as any);
      } else {
        await createFundSource(sourceForm as any);
      }
      setShowSourceModal(false);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (!confirm(`Delete fund source "${name}"?\n\nThis will also delete all its receipts.`)) return;
    try { await deleteFundSource(id); load(); } catch (e: any) { setError(e.message); }
  };

  const handleSaveTx = async () => {
    if (!txForm.fund_source_id || !txForm.amount) { setError('Fund source and amount are required'); return; }
    setError('');
    try {
      if (editingTx) {
        await updateFundTransaction(editingTx.id, txForm as any);
      } else {
        await createFundTransaction(txForm as any);
      }
      setShowTxModal(false);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Delete this receipt record?')) return;
    try { await deleteFundTransaction(id); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fund Management</h1>
          <p className="text-sm text-gray-500">Track project funding sources and receipts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openAddTx} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700">+ Record Receipt</button>
          <button onClick={openAddSource} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Source</button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Committed" value={`PKR ${totalCommitted.toLocaleString()}`} icon="💼" color="blue" />
        <StatCard title="Total Received" value={`PKR ${totalReceived.toLocaleString()}`} icon="✅" color="green" />
        <StatCard title="Still Pending" value={`PKR ${Math.max(0, totalCommitted - totalReceived).toLocaleString()}`} icon="⏳" color="yellow" />
      </div>

      <h2 className="font-semibold text-gray-800">Fund Sources</h2>
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : sources.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No fund sources yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map(s => {
            const pct = Number(s.total_committed) > 0 ? Math.round((Number(s.received_so_far) / Number(s.total_committed)) * 100) : 0;
            return (
              <div key={s.id} className="bg-white rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.source_name}</h3>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{TYPE_LABELS[s.source_type] ?? s.source_type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelectedSource(prev => prev === s.id ? '' : s.id); }}
                      className={`text-xs px-2 py-1 rounded ${selectedSource === s.id ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                      {selectedSource === s.id ? '● Filtered' : 'Filter'}
                    </button>
                    <button onClick={() => openEditSource(s)} className="text-gray-400 hover:text-blue-600 text-sm px-1.5 py-1 rounded hover:bg-blue-50" title="Edit">✏️</button>
                    <button onClick={() => handleDeleteSource(s.id, s.source_name)} className="text-gray-400 hover:text-red-600 text-sm px-1.5 py-1 rounded hover:bg-red-50" title="Delete">🗑️</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Committed:</span> <span className="font-medium">PKR {Number(s.total_committed).toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Received:</span> <span className="font-medium text-green-600">PKR {Number(s.received_so_far).toLocaleString()}</span></div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Receipt Progress</span><span>{pct}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSource && (
        <button onClick={() => setSelectedSource('')} className="text-sm text-blue-600 hover:underline">✕ Clear Filter</button>
      )}

      <h2 className="font-semibold text-gray-800">Fund Receipts</h2>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Source</th>
                <th className="px-4 py-3 text-left text-gray-600">Date</th>
                <th className="px-4 py-3 text-right text-gray-600">Amount (PKR)</th>
                <th className="px-4 py-3 text-left text-gray-600">Reference</th>
                <th className="px-4 py-3 text-center text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">No receipts yet.</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.fund_source?.source_name ?? t.fund_source_id}</td>
                  <td className="px-4 py-3">{t.transaction_date}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-600 font-medium">{Number(t.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{t.reference_no ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEditTx(t)} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                      <button onClick={() => handleDeleteTx(t.id)} className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSourceModal && (
        <Modal title={editingSource ? 'Edit Fund Source' : 'Add Fund Source'} onClose={() => setShowSourceModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
              <select value={sourceForm.project_id} onChange={e => setSourceForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">-- Select --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Name *</label>
              <input value={sourceForm.source_name} onChange={e => setSourceForm(f => ({ ...f, source_name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select value={sourceForm.source_type} onChange={e => setSourceForm(f => ({ ...f, source_type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {SOURCE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Committed *</label>
                <input type="number" value={sourceForm.total_committed} onChange={e => setSourceForm(f => ({ ...f, total_committed: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={sourceForm.notes} onChange={e => setSourceForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={handleSaveSource} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              {editingSource ? 'Update Fund Source' : 'Add Fund Source'}
            </button>
          </div>
        </Modal>
      )}

      {showTxModal && (
        <Modal title={editingTx ? 'Edit Receipt' : 'Record Fund Receipt'} onClose={() => setShowTxModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fund Source *</label>
              <select value={txForm.fund_source_id} onChange={e => setTxForm(f => ({ ...f, fund_source_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">-- Select --</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={txForm.transaction_date} onChange={e => setTxForm(f => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
              <input value={txForm.reference_no} onChange={e => setTxForm(f => ({ ...f, reference_no: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={handleSaveTx} className="w-full bg-green-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-green-700">
              {editingTx ? 'Update Receipt' : 'Record Receipt'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
