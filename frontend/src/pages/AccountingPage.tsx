import { useEffect, useState } from 'react';
import {
  getAccounts,
  createAccount,
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  postJournalEntry,
  deleteJournalEntry,
  purgeOrphanJournals,
  getTrialBalance,
  getGeneralLedger,
  getBalanceSheet,
  getBankAccounts,
  createBankAccount,
  getStatementLines,
  createStatementLines,
  matchStatementLine,
  getReconciliations,
  createReconciliation,
  completeReconciliation,
} from '../api/accounting';
import type {
  Account,
  JournalEntry,
  JournalEntryLine,
  TrialBalanceRow,
  GeneralLedgerRow,
  BalanceSheetReport,
  BankAccount,
  BankStatementLine,
  BankReconciliation,
} from '../api/accounting';
import Modal from '../components/Modal';

type Tab = 'journal' | 'accounts' | 'trial-balance' | 'general-ledger' | 'balance-sheet' | 'bank-recon';

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
  const [glRows, setGlRows] = useState<GeneralLedgerRow[]>([]);
  const [glAccountId, setGlAccountId] = useState('');
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [statements, setStatements] = useState<BankStatementLine[]>([]);
  const [recons, setRecons] = useState<BankReconciliation[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showStmtModal, setShowStmtModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    description: '',
    status: 'Draft',
  });
  const [lines, setLines] = useState<Partial<JournalEntryLine>[]>([
    { account_id: '', dr_cr: 'DEBIT', amount: '', narration: '' },
    { account_id: '', dr_cr: 'CREDIT', amount: '', narration: '' },
  ]);
  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'ASSET' });
  const [bankForm, setBankForm] = useState({ name: '', bank_name: '', account_number: '', opening_balance: '0', account_id: '' });
  const [stmtForm, setStmtForm] = useState({ statement_date: new Date().toISOString().split('T')[0], description: '', amount: '', reference: '' });
  const [reconForm, setReconForm] = useState({
    period_start: new Date().toISOString().slice(0, 8) + '01',
    period_end: new Date().toISOString().split('T')[0],
    statement_ending_balance: '',
    book_ending_balance: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [a, e, banks] = await Promise.all([getAccounts(), getJournalEntries(), getBankAccounts()]);
      setAccounts(a);
      setEntries(e);
      setBankAccounts(banks);
      if (!glAccountId && a[0]) setGlAccountId(a[0].id);
      if (!selectedBankId && banks[0]) setSelectedBankId(banks[0].id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab === 'trial-balance') getTrialBalance().then(setTrialBalance).catch((e) => setError(e.message));
    if (tab === 'general-ledger' && glAccountId) {
      getGeneralLedger(glAccountId).then(setGlRows).catch((e) => setError(e.message));
    }
    if (tab === 'balance-sheet') getBalanceSheet().then(setBalanceSheet).catch((e) => setError(e.message));
    if (tab === 'bank-recon' && selectedBankId) {
      Promise.all([getStatementLines(selectedBankId), getReconciliations(selectedBankId)])
        .then(([s, r]) => { setStatements(s); setRecons(r); })
        .catch((e) => setError(e.message));
    }
  }, [tab, glAccountId, selectedBankId]);

  const viewEntry = async (id: string) => {
    try {
      setSelectedEntry(await getJournalEntry(id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updateLine = (idx: number, field: keyof JournalEntryLine, value: string) => {
    setLines((prev) => {
      const u = [...prev];
      u[idx] = { ...u[idx], [field]: value };
      return u;
    });
  };

  const totalDebit = lines.filter((l) => l.dr_cr === 'DEBIT').reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalCredit = lines.filter((l) => l.dr_cr === 'CREDIT').reduce((s, l) => s + Number(l.amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleCreate = async () => {
    if (!isBalanced) { setError('Debits must equal credits'); return; }
    if (lines.some((l) => !l.account_id || !l.amount)) { setError('All lines must have an account and amount'); return; }
    setError('');
    try {
      await createJournalEntry({ entry: entryForm, lines: lines as JournalEntryLine[] });
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePost = async (id: string) => {
    try {
      await postJournalEntry(id);
      setSelectedEntry(await getJournalEntry(id));
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (selectedEntry) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setSelectedEntry(null)} className="text-blue-600 hover:underline text-sm">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Journal Entry #{selectedEntry.id}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${selectedEntry.status === 'Posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{selectedEntry.status}</span>
          {selectedEntry.status === 'Draft' && (
            <button onClick={() => handlePost(selectedEntry.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">Post Entry</button>
          )}
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
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
              {(selectedEntry.lines ?? []).map((l) => (
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

  const tabs: [Tab, string][] = [
    ['journal', 'Journal'],
    ['accounts', 'Accounts'],
    ['trial-balance', 'Trial Balance'],
    ['general-ledger', 'General Ledger'],
    ['balance-sheet', 'Balance Sheet'],
    ['bank-recon', 'Bank Recon'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Accounting</h1>
          <p className="text-sm text-gray-500">COA, journals, GL, balance sheet, bank reconciliation</p>
        </div>
        <div className="flex gap-2">
          {tab === 'journal' && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!confirm('Remove auto-posted journals whose expense/sale/payment/fund row was already deleted?')) return;
                  try {
                    const result = await purgeOrphanJournals();
                    alert(result.deleted ? `Removed ${result.deleted} orphan journal(s).` : 'No orphan journals found.');
                    await load();
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : 'Purge failed');
                  }
                }}
                className="border border-amber-500 text-amber-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-50"
              >
                Clean orphan JEs
              </button>
              <button onClick={() => { setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Journal Entry</button>
            </div>
          )}
          {tab === 'accounts' && (
            <button onClick={() => { setError(''); setShowAccountModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Account</button>
          )}
          {tab === 'bank-recon' && (
            <>
              <button onClick={() => setShowBankModal(true)} className="border border-blue-600 text-blue-700 px-3 py-2 rounded-lg text-sm">+ Bank Account</button>
              <button onClick={() => setShowStmtModal(true)} disabled={!selectedBankId} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50">+ Statement Line</button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : tab === 'journal' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">#</th>
                <th className="px-4 py-3 text-left text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-gray-600">Ref</th>
                <th className="px-4 py-3 text-left text-gray-600">Description</th>
                <th className="px-4 py-3 text-left text-gray-600">Status</th>
                <th className="px-4 py-3 text-center text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">No journal entries yet.</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => viewEntry(e.id)}>JE-{e.id}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => viewEntry(e.id)}>{e.entry_date}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500 cursor-pointer" onClick={() => viewEntry(e.id)}>{e.reference_no ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => viewEntry(e.id)}>{e.description ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'Posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={async (ev) => {
                        ev.stopPropagation();
                        if (!confirm(`Delete journal JE-${e.id}${e.reference_no ? ` (${e.reference_no})` : ''}?`)) return;
                        try {
                          await deleteJournalEntry(e.id);
                          await load();
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'Delete failed');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'accounts' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Code</th>
                <th className="px-4 py-3 text-left text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-gray-600">Active</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3 font-mono font-medium">{a.code}</td>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_COLORS[a.type]}`}>{a.type}</span></td>
                  <td className="px-4 py-3">{a.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'trial-balance' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Code</th>
                <th className="px-4 py-3 text-left text-gray-600">Account</th>
                <th className="px-4 py-3 text-right text-gray-600">Debit</th>
                <th className="px-4 py-3 text-right text-gray-600">Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-gray-400 py-8">No posted entries yet.</td></tr>
              ) : trialBalance.map((r) => (
                <tr key={r.account_id} className="border-t">
                  <td className="px-4 py-3 font-mono">{r.code}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.total_debit).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.total_credit).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'general-ledger' ? (
        <div className="space-y-3">
          <select value={glAccountId} onChange={(e) => setGlAccountId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
          </select>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600">Ref</th>
                  <th className="px-4 py-3 text-left text-gray-600">Description</th>
                  <th className="px-4 py-3 text-right text-gray-600">Debit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Credit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Balance</th>
                </tr>
              </thead>
              <tbody>
                {glRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">No posted lines for this account.</td></tr>
                ) : glRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3">{r.entry_date}</td>
                    <td className="px-4 py-3">{r.reference_no ?? '-'}</td>
                    <td className="px-4 py-3">{r.description ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.debit) ? Number(r.debit).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.credit) ? Number(r.credit).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{Number(r.running_balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'balance-sheet' && balanceSheet ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Assets', rows: balanceSheet.assets, total: balanceSheet.total_assets },
            { title: 'Liabilities', rows: balanceSheet.liabilities, total: balanceSheet.total_liabilities },
            { title: 'Equity', rows: [...balanceSheet.equity, { code: 'NI', name: 'Net Income (plug)', balance: balanceSheet.net_income }], total: balanceSheet.total_equity },
          ].map((col) => (
            <div key={col.title} className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-gray-800 mb-3">{col.title}</h3>
              <ul className="space-y-1 text-sm">
                {col.rows.map((r) => (
                  <li key={r.code} className="flex justify-between"><span>{r.code} {r.name}</span><span className="font-mono">{Number(r.balance).toLocaleString()}</span></li>
                ))}
              </ul>
              <div className="border-t mt-3 pt-2 flex justify-between font-semibold text-sm">
                <span>Total</span><span className="font-mono">{Number(col.total).toLocaleString()}</span>
              </div>
            </div>
          ))}
          <p className={`md:col-span-3 text-sm ${balanceSheet.balanced ? 'text-green-700' : 'text-amber-700'}`}>
            {balanceSheet.balanced ? 'Balance sheet balances (Assets = Liabilities + Equity).' : 'Assets do not equal Liabilities + Equity — post more entries or check signs.'}
          </p>
        </div>
      ) : tab === 'bank-recon' ? (
        <div className="space-y-4">
          <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Select bank account</option>
            {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.bank_name || 'Bank'})</option>)}
          </select>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Statement Lines</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Reconciled</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {statements.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-6">No statement lines.</td></tr>
                ) : statements.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-2">{s.statement_date}</td>
                    <td className="px-4 py-2">{s.description ?? '-'}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(s.amount).toLocaleString()}</td>
                    <td className="px-4 py-2">{s.reconciled ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">
                      {!s.reconciled && (
                        <button
                          onClick={async () => {
                            await matchStatementLine(s.id, { reconciled: true });
                            setStatements(await getStatementLines(selectedBankId));
                          }}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Mark matched
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="font-semibold text-sm">Start reconciliation period</h3>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={reconForm.period_start} onChange={(e) => setReconForm((f) => ({ ...f, period_start: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
              <input type="date" value={reconForm.period_end} onChange={(e) => setReconForm((f) => ({ ...f, period_end: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
              <input placeholder="Statement ending bal" value={reconForm.statement_ending_balance} onChange={(e) => setReconForm((f) => ({ ...f, statement_ending_balance: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
              <input placeholder="Book ending bal" value={reconForm.book_ending_balance} onChange={(e) => setReconForm((f) => ({ ...f, book_ending_balance: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
            </div>
            <button
              disabled={!selectedBankId}
              onClick={async () => {
                await createReconciliation({ ...reconForm, bank_account_id: selectedBankId });
                setRecons(await getReconciliations(selectedBankId));
              }}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Create period
            </button>
            <ul className="text-sm space-y-1">
              {recons.map((r) => (
                <li key={r.id} className="flex justify-between items-center border-t py-2">
                  <span>{r.period_start} → {r.period_end} ({r.status})</span>
                  {r.status === 'Open' && (
                    <button onClick={async () => { await completeReconciliation(r.id); setRecons(await getReconciliations(selectedBankId)); }} className="text-green-700 text-xs hover:underline">Complete</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {showModal && (
        <Modal title="New Journal Entry" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm((f) => ({ ...f, entry_date: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Reference" value={entryForm.reference_no} onChange={(e) => setEntryForm((f) => ({ ...f, reference_no: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <input placeholder="Description" value={entryForm.description} onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <select value={line.account_id} onChange={(e) => updateLine(idx, 'account_id', e.target.value)} className="border rounded px-2 py-1 text-xs">
                    <option value="">Account</option>
                    {accounts.filter((a) => a.is_active !== false).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                  </select>
                  <select value={line.dr_cr} onChange={(e) => updateLine(idx, 'dr_cr', e.target.value)} className="border rounded px-2 py-1 text-xs">
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                  <input type="number" placeholder="Amount" value={line.amount} onChange={(e) => updateLine(idx, 'amount', e.target.value)} className="border rounded px-2 py-1 text-xs" />
                </div>
              ))}
              <button type="button" onClick={() => setLines((p) => [...p, { account_id: '', dr_cr: 'DEBIT', amount: '', narration: '' }])} className="text-blue-600 text-xs">+ Line</button>
            </div>
            <p className={`text-xs ${isBalanced ? 'text-green-700' : 'text-red-600'}`}>Debit {totalDebit.toLocaleString()} / Credit {totalCredit.toLocaleString()}</p>
            <button onClick={handleCreate} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Save Draft</button>
          </div>
        </Modal>
      )}

      {showAccountModal && (
        <Modal title="New Account" onClose={() => setShowAccountModal(false)}>
          <div className="space-y-3">
            <input placeholder="Code" value={accountForm.code} onChange={(e) => setAccountForm((f) => ({ ...f, code: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Name" value={accountForm.name} onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select value={accountForm.type} onChange={(e) => setAccountForm((f) => ({ ...f, type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
              {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={async () => {
                await createAccount({ ...accountForm, is_active: true });
                setShowAccountModal(false);
                load();
              }}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm"
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {showBankModal && (
        <Modal title="New Bank Account" onClose={() => setShowBankModal(false)}>
          <div className="space-y-3">
            <input placeholder="Display name" value={bankForm.name} onChange={(e) => setBankForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Bank name" value={bankForm.bank_name} onChange={(e) => setBankForm((f) => ({ ...f, bank_name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Account number" value={bankForm.account_number} onChange={(e) => setBankForm((f) => ({ ...f, account_number: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Opening balance" value={bankForm.opening_balance} onChange={(e) => setBankForm((f) => ({ ...f, opening_balance: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select value={bankForm.account_id} onChange={(e) => setBankForm((f) => ({ ...f, account_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Link COA account (optional)</option>
              {accounts.filter((a) => a.type === 'ASSET').map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
            <button
              onClick={async () => {
                const created = await createBankAccount({
                  name: bankForm.name,
                  bank_name: bankForm.bank_name || null,
                  account_number: bankForm.account_number || null,
                  opening_balance: bankForm.opening_balance || '0',
                  account_id: bankForm.account_id || null,
                });
                setShowBankModal(false);
                await load();
                setSelectedBankId(created.id);
              }}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm"
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {showStmtModal && selectedBankId && (
        <Modal title="Add Statement Line" onClose={() => setShowStmtModal(false)}>
          <div className="space-y-3">
            <input type="date" value={stmtForm.statement_date} onChange={(e) => setStmtForm((f) => ({ ...f, statement_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Description" value={stmtForm.description} onChange={(e) => setStmtForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Amount (+ credit / − debit)" value={stmtForm.amount} onChange={(e) => setStmtForm((f) => ({ ...f, amount: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Reference" value={stmtForm.reference} onChange={(e) => setStmtForm((f) => ({ ...f, reference: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button
              onClick={async () => {
                await createStatementLines(selectedBankId, [stmtForm]);
                setShowStmtModal(false);
                setStatements(await getStatementLines(selectedBankId));
              }}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm"
            >
              Add
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
