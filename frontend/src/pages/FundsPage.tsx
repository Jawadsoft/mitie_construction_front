import { useEffect, useState } from 'react';
import {
  getFundSources, createFundSource, updateFundSource, deleteFundSource,
  getFundTransactions, createFundTransaction, updateFundTransaction, deleteFundTransaction,
} from '../api/funds';
import type { FundSource, FundTransaction } from '../api/funds';
import { getBankAccounts, createBankAccount } from '../api/accounting';
import type { BankAccount } from '../api/accounting';
import { getProjects, createProject } from '../api/projects';
import type { Project } from '../api/projects';
import Modal from '../components/Modal';
import FundSourceNameInput from '../components/FundSourceNameInput';
import PakistanBankNameInput from '../components/PakistanBankNameInput';
import PakistanLocationInput from '../components/PakistanLocationInput';
import StatCard from '../components/StatCard';
import { amountToWordsPk, formatMoneyDisplay, parseMoneyInput } from '../utils/money';

const SOURCE_TYPES = ['EQUITY', 'LOAN', 'INVESTOR', 'ADVANCE_SALES', 'OTHER'];
const TYPE_LABELS: Record<string, string> = {
  EQUITY: 'Equity',
  LOAN: 'Bank Loan',
  INVESTOR: 'Investor',
  ADVANCE_SALES: 'Advance Sales',
  OTHER: 'Other',
};
const STATUS_LABELS: Record<string, string> = {
  Committed: 'Committed',
  Partially_Received: 'Partially Received',
  Fully_Received: 'Fully Received',
  Cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  Committed: 'bg-slate-100 text-slate-700',
  Partially_Received: 'bg-amber-100 text-amber-800',
  Fully_Received: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};
const STATUS_FILTERS = ['', 'Committed', 'Partially_Received', 'Fully_Received', 'Cancelled'];

const emptySourceForm = {
  bank_account_id: '',
  project_id: '',
  source_name: '',
  source_type: 'LOAN',
  total_committed: '',
  expected_date: '',
  notes: '',
};
const emptyTxForm = {
  fund_source_id: '',
  transaction_date: new Date().toISOString().split('T')[0],
  amount: '',
  reference_no: '',
  notes: '',
};
const emptyBankForm = {
  name: '',
  bank_name: '',
  account_number: '',
};
const emptyProjectForm = {
  name: '',
  location: '',
  project_type: 'Residential' as 'Residential' | 'Commercial',
  total_estimated_budget: '',
  status: 'Planning',
};

function bankLabel(b: BankAccount) {
  const parts = [b.name];
  if (b.bank_name) parts.push(b.bank_name);
  if (b.account_number) parts.push(`…${b.account_number.slice(-4)}`);
  return parts.join(' · ');
}

function sourceBankLabel(s: FundSource) {
  if (s.bank_account_name || s.bank_name) {
    return [s.bank_account_name, s.bank_name].filter(Boolean).join(' · ');
  }
  return s.bank_account_id ? `Bank #${s.bank_account_id}` : 'No bank linked';
}

export default function FundsPage() {
  const [sources, setSources] = useState<FundSource[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingSource, setEditingSource] = useState<FundSource | null>(null);
  const [editingTx, setEditingTx] = useState<FundTransaction | null>(null);

  const [sourceForm, setSourceForm] = useState(emptySourceForm);
  const [txForm, setTxForm] = useState(emptyTxForm);
  const [bankForm, setBankForm] = useState(emptyBankForm);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t, b, p] = await Promise.all([
        getFundSources(filterStatus ? { status: filterStatus } : undefined),
        getFundTransactions(selectedSource || undefined),
        getBankAccounts(),
        getProjects(),
      ]);
      setSources(s);
      setTransactions(t);
      setBanks(b);
      setProjects(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load funds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedSource, filterStatus]);

  const activeSources = sources.filter((f) => f.status !== 'Cancelled');
  const totalCommitted = activeSources.reduce((s, f) => s + Number(f.total_committed), 0);
  const totalReceived = activeSources.reduce((s, f) => s + Number(f.received_so_far), 0);
  const pendingFunds = Math.max(0, totalCommitted - totalReceived);
  const investorCount = activeSources.filter((f) => f.source_type === 'INVESTOR').length;
  const loanAmount = activeSources
    .filter((f) => f.source_type === 'LOAN')
    .reduce((s, f) => s + Number(f.total_committed), 0);
  const ownerCapital = activeSources
    .filter((f) => f.source_type === 'EQUITY')
    .reduce((s, f) => s + Number(f.total_committed), 0);

  const openAddSource = () => {
    setEditingSource(null);
    setSourceForm(emptySourceForm);
    setError('');
    setShowSourceModal(true);
  };

  const openEditSource = (s: FundSource) => {
    setEditingSource(s);
    setSourceForm({
      bank_account_id: s.bank_account_id ?? '',
      project_id: s.project_id ?? '',
      source_name: s.source_name,
      source_type: s.source_type,
      total_committed: parseMoneyInput(String(Math.floor(Number(s.total_committed)) || '')),
      expected_date: s.expected_date ?? '',
      notes: s.notes ?? '',
    });
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
    setTxForm({
      fund_source_id: t.fund_source_id,
      transaction_date: t.transaction_date,
      amount: t.amount,
      reference_no: t.reference_no ?? '',
      notes: t.notes ?? '',
    });
    setError('');
    setShowTxModal(true);
  };

  const handleSaveSource = async () => {
    if (!sourceForm.bank_account_id || !sourceForm.source_name || !sourceForm.total_committed) {
      setError('Partner bank, name, and amount are required');
      return;
    }
    const amount = Number(sourceForm.total_committed);
    if (!Number.isFinite(amount) || amount < 1000) {
      setError('Total committed must be at least PKR 1,000');
      return;
    }
    setError('');
    const payload: Partial<FundSource> = {
      bank_account_id: sourceForm.bank_account_id,
      project_id: sourceForm.project_id || null,
      source_name: sourceForm.source_name,
      source_type: sourceForm.source_type,
      total_committed: sourceForm.total_committed,
      expected_date: sourceForm.expected_date || null,
      notes: sourceForm.notes || null,
    };
    try {
      if (editingSource) await updateFundSource(editingSource.id, payload);
      else await createFundSource(payload);
      setShowSourceModal(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save fund source');
    }
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (!confirm(`Delete fund source "${name}"?\n\nThis will also delete all its receipts.`)) return;
    try {
      await deleteFundSource(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleCancelSource = async (s: FundSource) => {
    if (!confirm(`Cancel commitment "${s.source_name}"? It will be excluded from KPI totals.`)) return;
    try {
      await updateFundSource(s.id, { status: 'Cancelled' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to cancel');
    }
  };

  const handleReactivateSource = async (s: FundSource) => {
    try {
      await updateFundSource(s.id, { status: 'Committed' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reactivate');
    }
  };

  const handleSaveTx = async () => {
    if (!txForm.fund_source_id || !txForm.amount) {
      setError('Fund source and amount are required');
      return;
    }
    setError('');
    try {
      if (editingTx) await updateFundTransaction(editingTx.id, txForm);
      else await createFundTransaction(txForm);
      setShowTxModal(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save receipt');
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Delete this receipt record?')) return;
    try {
      await deleteFundTransaction(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const openAddBank = () => {
    setBankForm(emptyBankForm);
    setError('');
    setShowBankModal(true);
  };

  const openAddProject = () => {
    setProjectForm(emptyProjectForm);
    setError('');
    setShowProjectModal(true);
  };

  const handleSaveBank = async () => {
    if (!bankForm.name.trim()) {
      setError('Display name is required');
      return;
    }
    setError('');
    try {
      const bankName = bankForm.bank_name.trim();
      const created = await createBankAccount({
        name: bankForm.name.trim(),
        bank_name: !bankName || bankName === 'Other' ? null : bankName,
        account_number: bankForm.account_number.trim() || null,
        opening_balance: '0',
      });
      const refreshed = await getBankAccounts();
      setBanks(refreshed);
      setSourceForm((f) => ({ ...f, bank_account_id: created.id }));
      setShowBankModal(false);
      if (!showSourceModal) setShowSourceModal(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create bank account');
    }
  };

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      setError('Project name is required');
      return;
    }
    setError('');
    try {
      const created = await createProject({
        name: projectForm.name.trim(),
        location: projectForm.location.trim() || null,
        project_type: projectForm.project_type,
        total_estimated_budget: projectForm.total_estimated_budget || null,
        status: projectForm.status,
      });
      const refreshed = await getProjects();
      setProjects(refreshed);
      setSourceForm((f) => ({ ...f, project_id: created.id }));
      setShowProjectModal(false);
      if (!showSourceModal) setShowSourceModal(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create project');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Funds</h1>
          <p className="text-sm text-gray-500">
            First step: commit capital, receive into partner banks, then fund land and projects
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openAddBank} className="border border-blue-600 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-50">+ Add Bank</button>
          <button onClick={openAddTx} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700">+ Record Receipt</button>
          <button onClick={openAddSource} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Commitment</button>
        </div>
      </div>

      {error && !showSourceModal && !showTxModal && !showBankModal && !showProjectModal && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Committed" value={`PKR ${totalCommitted.toLocaleString()}`} icon="💼" color="blue" />
        <StatCard title="Total Received" value={`PKR ${totalReceived.toLocaleString()}`} icon="✅" color="green" />
        <StatCard title="Pending Funds" value={`PKR ${pendingFunds.toLocaleString()}`} icon="⏳" color="yellow" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Investor Count" value={String(investorCount)} icon="👥" color="blue" />
        <StatCard title="Loan Amount" value={`PKR ${loanAmount.toLocaleString()}`} icon="🏦" color="yellow" />
        <StatCard title="Owner Capital" value={`PKR ${ownerCapital.toLocaleString()}`} icon="🏠" color="green" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-gray-800 mr-2">Fund Commitments</h2>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_FILTERS.filter(Boolean).map((st) => (
            <option key={st} value={st}>{STATUS_LABELS[st] ?? st}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : sources.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No fund commitments yet. Use <button type="button" onClick={openAddBank} className="text-blue-600 hover:underline">+ Add Bank</button> then + Add Commitment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((s) => {
            const committed = Number(s.total_committed);
            const received = Number(s.received_so_far);
            const remaining = Math.max(0, committed - received);
            const pct = committed > 0 ? Math.round((received / committed) * 100) : 0;
            const status = s.status || 'Committed';
            return (
              <div key={s.id} className={`bg-white rounded-xl border p-4 ${status === 'Cancelled' ? 'opacity-70' : ''}`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.source_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{sourceBankLabel(s)}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[s.source_type] ?? s.source_type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[status] ?? status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <button
                      onClick={() => { setSelectedSource((prev) => (prev === s.id ? '' : s.id)); }}
                      className={`text-xs px-2 py-1 rounded ${selectedSource === s.id ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    >
                      {selectedSource === s.id ? '● Filtered' : 'Filter'}
                    </button>
                    <button onClick={() => openEditSource(s)} className="text-gray-400 hover:text-blue-600 text-xs px-1.5 py-1 rounded hover:bg-blue-50">Edit</button>
                    {status === 'Cancelled' ? (
                      <button onClick={() => handleReactivateSource(s)} className="text-green-700 hover:bg-green-50 text-xs px-1.5 py-1 rounded">Reactivate</button>
                    ) : (
                      <button onClick={() => handleCancelSource(s)} className="text-amber-700 hover:bg-amber-50 text-xs px-1.5 py-1 rounded">Cancel</button>
                    )}
                    <button onClick={() => handleDeleteSource(s.id, s.source_name)} className="text-gray-400 hover:text-red-600 text-xs px-1.5 py-1 rounded hover:bg-red-50">Del</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-gray-500 text-xs block">Committed</span> <span className="font-medium">PKR {committed.toLocaleString()}</span></div>
                  <div><span className="text-gray-500 text-xs block">Received</span> <span className="font-medium text-green-600">PKR {received.toLocaleString()}</span></div>
                  <div><span className="text-gray-500 text-xs block">Remaining</span> <span className="font-medium text-amber-700">PKR {remaining.toLocaleString()}</span></div>
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
        <button onClick={() => setSelectedSource('')} className="text-sm text-blue-600 hover:underline">Clear Filter</button>
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
              ) : transactions.map((t) => (
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Partner Bank *</label>
                <button type="button" onClick={openAddBank} className="text-xs text-blue-600 hover:underline">+ New bank</button>
              </div>
              <select
                value={sourceForm.bank_account_id}
                onChange={(e) => setSourceForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">-- Select bank account --</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{bankLabel(b)}</option>
                ))}
              </select>
              {banks.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No banks yet — click + New bank above.</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Project (optional)</label>
                <button type="button" onClick={openAddProject} className="text-xs text-blue-600 hover:underline">+ New project</button>
              </div>
              <select
                value={sourceForm.project_id}
                onChange={(e) => setSourceForm((f) => ({ ...f, project_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">-- Not linked to a project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Link so fund receipts appear on the project card.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={sourceForm.source_type}
                onChange={(e) => setSourceForm((f) => ({ ...f, source_type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {SOURCE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Name *</label>
              <FundSourceNameInput
                value={sourceForm.source_name}
                onChange={(source_name) => setSourceForm((f) => ({ ...f, source_name }))}
                sourceType={sourceForm.source_type}
                existingNames={sources.map((s) => s.source_name)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Committed *</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1,000"
                value={formatMoneyDisplay(sourceForm.total_committed)}
                onChange={(e) => setSourceForm((f) => ({
                  ...f,
                  total_committed: parseMoneyInput(e.target.value),
                }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {Number(sourceForm.total_committed) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {amountToWordsPk(Number(sourceForm.total_committed))}
                </p>
              )}
              {Number(sourceForm.total_committed) > 0 && Number(sourceForm.total_committed) < 1000 && (
                <p className="text-xs text-amber-600 mt-1">Minimum commitment is PKR 1,000</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={sourceForm.notes}
                onChange={(e) => setSourceForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button onClick={handleSaveSource} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              {editingSource ? 'Update Fund Source' : 'Add Fund Source'}
            </button>
          </div>
        </Modal>
      )}

      {showBankModal && (
        <Modal title="Add Partner Bank" onClose={() => setShowBankModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display name *</label>
              <input
                placeholder="e.g. HBL Project A/C"
                value={bankForm.name}
                onChange={(e) => setBankForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank name</label>
              <PakistanBankNameInput
                value={bankForm.bank_name}
                onChange={(bank_name) => setBankForm((f) => ({ ...f, bank_name }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account number</label>
              <input
                placeholder="e.g. 0123456789"
                value={bankForm.account_number}
                onChange={(e) => setBankForm((f) => ({ ...f, account_number: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button onClick={handleSaveBank} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              Save Bank
            </button>
          </div>
        </Modal>
      )}

      {showProjectModal && (
        <Modal title="Add Project" onClose={() => setShowProjectModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
              <input
                placeholder="e.g. Gulberg Residencia Block A"
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <PakistanLocationInput
                value={projectForm.location}
                onChange={(location) => setProjectForm((f) => ({ ...f, location }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project type</label>
              <div className="flex gap-4 pt-1">
                {(['Residential', 'Commercial'] as const).map((t) => (
                  <label key={t} className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="fund_project_type"
                      value={t}
                      checked={projectForm.project_type === t}
                      onChange={() => setProjectForm((f) => ({ ...f, project_type: t }))}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated budget (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 50000000"
                value={projectForm.total_estimated_budget}
                onChange={(e) => setProjectForm((f) => ({ ...f, total_estimated_budget: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button onClick={handleSaveProject} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              Save Project
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
              <select
                value={txForm.fund_source_id}
                onChange={(e) => setTxForm((f) => ({ ...f, fund_source_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">-- Select --</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.source_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={txForm.transaction_date}
                  onChange={(e) => setTxForm((f) => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={txForm.amount}
                  onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
              <input
                value={txForm.reference_no}
                onChange={(e) => setTxForm((f) => ({ ...f, reference_no: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={txForm.notes}
                onChange={(e) => setTxForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
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
