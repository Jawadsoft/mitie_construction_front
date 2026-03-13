import { useEffect, useState } from 'react';
import { getAccounts, getJournalEntries, getJournalEntry, createJournalEntry, getTrialBalance } from '../api/accounting';
import type { Account, JournalEntry, JournalEntryLine, TrialBalanceRow } from '../api/accounting';
import Modal from '../components/Modal';

type Tab = 'journal' | 'accounts' | 'trial-balance';

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  INCOME: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-yellow-100 text-yellow-700',
};

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('journal');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [entryForm, setEntryForm] = useState({ entry_date: new Date().toISOString().split('T')[0], reference_no: '', description: '', status: 'Draft' });
  const [lines, setLines] = useState<Partial<JournalEntryLine>[]>([
    { account_id: '', dr_cr: 'DEBIT', amount: '', narration: '' },
    { account_id: '', dr_cr: 'CREDIT', amount: '', narration: '' },
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const [a, e] = await Promise.all([getAccounts(), getJournalEntries()]);
      setAccounts(a); setEntries(e);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadTrialBalance = async () => {
    try { setTrialBalance(await getTrialBalance()); } catch (e: any) { setError(e.message); }
  };

  useEffect(() => {
    load();
    loadTrialBalance();
  }, []);

  const viewEntry = async (id: string) => {
    try { setSelectedEntry(await getJournalEntry(id)); } catch (e: any) { setError(e.message); }
  };

  const updateLine = (idx: number, field: keyof JournalEntryLine, value: string) => {
    setLines(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  };

  const totalDebit = lines.filter(l => l.dr_cr === 'DEBIT').reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalCredit = lines.filter(l => l.dr_cr === 'CREDIT').reduce((s, l) => s + Number(l.amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleCreate = async () => {
    if (!isBalanced) { setError('Debits must equal credits'); return; }
    if (lines.some(l => !l.account_id || !l.amount)) { setError('All lines must have an account and amount'); return; }
    setError('');
    try {
      await createJournalEntry({ entry: entryForm, lines: lines as JournalEntryLine[] });
      setShowModal(false);
      load(); loadTrialBalance();
    } catch (e: any) { setError(e.message); }
  };

  if (selectedEntry) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedEntry(null)} className="text-blue-600 hover:underline text-sm">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Journal Entry #{selectedEntry.id}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${selectedEntry.status === 'Posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{selectedEntry.status}</span>
        </div>
        <div className="bg-white rounded-xl border p-4 text-sm grid grid-cols-2 gap-3">
          <div><span className="text-gray-500">Date:</span> <span className="font-medium ml-1">{selectedEntry.entry_date}</span></div>
          <div><span className="text-gray-500">Reference:</span> <span className="font-medium ml-1">{selectedEntry.reference_no ?? '-'}</span></div>
          <div className="col-span-2"><span className="text-gray-500">Description:</span> <span className="font-medium ml-1">{selectedEntry.description ?? '-'}</span></div>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Account</th>
                <th className="px-4 py-3 text-left text-gray-600">Type</th>
                <th className="px-4 py-3 text-right text-gray-600">Debit</th>
                <th className="px-4 py-3 text-right text-gray-600">Credit</th>
              </tr>
            </thead>
            <tbody>
              {(selectedEntry.lines ?? []).map(l => (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{l.account?.code} – {l.account?.name}</td>
                  <td className="px-4 py-3">{l.dr_cr}</td>
                  <td className="px-4 py-3 text-right font-mono">{l.dr_cr === 'DEBIT' ? Number(l.amount).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right font-mono">{l.dr_cr === 'CREDIT' ? Number(l.amount).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Accounting</h1>
          <p className="text-sm text-gray-500">Journal entries, accounts, and financial reports</p>
        </div>
        {tab === 'journal' && (
          <button onClick={() => { setError(''); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Journal Entry
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {([['journal', '📓 Journal'], ['accounts', '📋 Accounts'], ['trial-balance', '📊 Trial Balance']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : tab === 'journal' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">#</th>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left text-gray-600">Reference</th>
                  <th className="px-4 py-3 text-left text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No journal entries yet.</td></tr>
                ) : entries.map(e => (
                  <tr key={e.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => viewEntry(e.id)}>
                    <td className="px-4 py-3 font-medium">JE-{e.id}</td>
                    <td className="px-4 py-3">{e.entry_date}</td>
                    <td className="px-4 py-3 text-gray-600">{e.description ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-400">{e.reference_no ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'Posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'accounts' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Code</th>
                <th className="px-4 py-3 text-left text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-gray-600">Type</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{a.code}</td>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_COLORS[a.type]}`}>{a.type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Code</th>
                  <th className="px-4 py-3 text-left text-gray-600">Account Name</th>
                  <th className="px-4 py-3 text-left text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right text-gray-600">Debit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Credit</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No transactions posted yet.</td></tr>
                ) : trialBalance.map(r => (
                  <tr key={r.account_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{r.code}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_COLORS[r.type]}`}>{r.type}</span></td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.total_debit).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.total_credit).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title="New Journal Entry" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={entryForm.entry_date} onChange={e => setEntryForm(f => ({ ...f, entry_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
                <input value={entryForm.reference_no} onChange={e => setEntryForm(f => ({ ...f, reference_no: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Lines</label>
                <button onClick={() => setLines(prev => [...prev, { account_id: '', dr_cr: 'DEBIT', amount: '', narration: '' }])}
                  className="text-blue-600 text-xs hover:underline">+ Add Line</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded">
                    <div className="col-span-3">
                      <select value={line.account_id} onChange={e => updateLine(idx, 'account_id', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs">
                        <option value="">-- Account --</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                      </select>
                    </div>
                    <select value={line.dr_cr} onChange={e => updateLine(idx, 'dr_cr', e.target.value)}
                      className="border rounded px-2 py-1 text-xs">
                      <option value="DEBIT">Debit</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                    <input type="number" placeholder="Amount" value={line.amount} onChange={e => updateLine(idx, 'amount', e.target.value)}
                      className="border rounded px-2 py-1 text-xs" />
                    {lines.length > 2 && (
                      <button onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-xs">Remove</button>
                    )}
                  </div>
                ))}
              </div>
              <div className={`text-xs mt-2 p-2 rounded ${isBalanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                Debit: {totalDebit.toLocaleString()} | Credit: {totalCredit.toLocaleString()} | {isBalanced ? '✓ Balanced' : '✗ Not balanced'}
              </div>
            </div>
            <button onClick={handleCreate} disabled={!isBalanced}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
              Create Journal Entry
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
