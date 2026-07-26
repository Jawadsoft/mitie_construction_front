import { useEffect, useState } from 'react';
import {
  getAccounts,
  createAccount,
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  deleteJournalEntry,
  purgeOrphanJournals,
  getTrialBalance,
  getGeneralLedger,
  getBalanceSheet,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
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
  GeneralLedgerReport,
  BalanceSheetReport,
  BankAccount,
  BankStatementLine,
  BankReconciliation,
} from '../api/accounting';
import Modal from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { notify, notifyError } from '../utils/toast';
import { formatDate } from '../utils/date';

type Tab = 'journal' | 'accounts' | 'trial-balance' | 'general-ledger' | 'balance-sheet' | 'bank-recon';

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  INCOME: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-yellow-100 text-yellow-700',
};

export default function AccountingPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('journal');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [glReport, setGlReport] = useState<GeneralLedgerReport | null>(null);
  const [glAccountId, setGlAccountId] = useState('');
  const [glAccountScope, setGlAccountScope] = useState<'all' | 'heads' | 'specific'>('all');
  const [glFrom, setGlFrom] = useState('');
  const [glTo, setGlTo] = useState('');
  const [glIncludeChildren, setGlIncludeChildren] = useState(true);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [statements, setStatements] = useState<BankStatementLine[]>([]);
  const [recons, setRecons] = useState<BankReconciliation[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showEditBankModal, setShowEditBankModal] = useState(false);
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
  const [editBankForm, setEditBankForm] = useState({
    name: '',
    bank_name: '',
    account_number: '',
    opening_balance: '0',
    opening_date: new Date().toISOString().split('T')[0],
  });
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
      getGeneralLedger(
        glAccountId,
        glFrom || undefined,
        glTo || undefined,
        glIncludeChildren,
      )
        .then(setGlReport)
        .catch((e) => setError(e.message));
    }
    if (tab === 'balance-sheet') getBalanceSheet().then(setBalanceSheet).catch((e) => setError(e.message));
    if (tab === 'bank-recon' && selectedBankId) {
      Promise.all([getStatementLines(selectedBankId), getReconciliations(selectedBankId)])
        .then(([s, r]) => { setStatements(s); setRecons(r); })
        .catch((e) => setError(e.message));
    }
  }, [tab, glAccountId, glFrom, glTo, glIncludeChildren, selectedBankId]);

  const viewEntry = async (id: string) => {
    try {
      setSelectedEntry(await getJournalEntry(id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openEditEntry = async (id: string) => {
    try {
      setError('');
      const je = await getJournalEntry(id);
      setEditingEntryId(je.id);
      setEntryForm({
        entry_date: String(je.entry_date).slice(0, 10),
        reference_no: je.reference_no || '',
        description: je.description || '',
        status: je.status || 'Draft',
      });
      const jeLines = (je.lines ?? []).map((l) => ({
        account_id: l.account_id,
        dr_cr: l.dr_cr,
        amount: String(l.amount),
        narration: l.narration || '',
      }));
      setLines(
        jeLines.length >= 2
          ? jeLines
          : [
              { account_id: '', dr_cr: 'DEBIT', amount: '', narration: '' },
              { account_id: '', dr_cr: 'CREDIT', amount: '', narration: '' },
            ],
      );
      setSelectedEntry(null);
      setShowModal(true);
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to load journal'));
    }
  };

  const openNewEntry = () => {
    setEditingEntryId(null);
    setEntryForm({
      entry_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      description: '',
      status: 'Draft',
    });
    setLines([
      { account_id: '', dr_cr: 'DEBIT', amount: '', narration: '' },
      { account_id: '', dr_cr: 'CREDIT', amount: '', narration: '' },
    ]);
    setError('');
    setShowModal(true);
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

  const handleSaveEntry = async () => {
    if (!isBalanced) { setError('Debits must equal credits'); return; }
    if (lines.some((l) => !l.account_id || !l.amount)) { setError('All lines must have an account and amount'); return; }
    setError('');
    try {
      if (editingEntryId) {
        await updateJournalEntry(editingEntryId, {
          entry: entryForm,
          lines: lines as JournalEntryLine[],
        });
        notify.success('Journal updated');
      } else {
        await createJournalEntry({ entry: entryForm, lines: lines as JournalEntryLine[] });
        notify.success('Journal draft saved');
      }
      setShowModal(false);
      setEditingEntryId(null);
      await load();
      if (tab === 'general-ledger' && glAccountId) {
        setGlReport(
          await getGeneralLedger(
            glAccountId,
            glFrom || undefined,
            glTo || undefined,
            glIncludeChildren,
          ),
        );
      }
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to save journal'));
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
          <button
            onClick={() => openEditEntry(selectedEntry.id)}
            className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Edit
          </button>
          {selectedEntry.status === 'Draft' && (
            <button onClick={() => handlePost(selectedEntry.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">Post Entry</button>
          )}
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="bg-white rounded-xl border p-4 text-sm grid grid-cols-2 gap-3">
          <div><span className="text-gray-500">Date:</span> <span className="font-medium ml-1">{formatDate(selectedEntry.entry_date)}</span></div>
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
                  const ok = await confirm({
                    title: 'Clean orphan journals',
                    message: 'Remove auto-posted journals whose expense/sale/payment/fund row was already deleted?',
                    confirmLabel: 'Clean',
                    danger: true,
                  });
                  if (!ok) return;
                  try {
                    const result = await purgeOrphanJournals();
                    if (result.deleted) notify.success(`Removed ${result.deleted} orphan journal(s).`);
                    else notify.info('No orphan journals found.');
                    await load();
                  } catch (e: unknown) {
                    setError(notifyError(e, 'Purge failed'));
                  }
                }}
                className="border border-amber-500 text-amber-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-50"
              >
                Clean orphan JEs
              </button>
              <button onClick={openNewEntry} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Journal Entry</button>
            </div>
          )}
          {tab === 'accounts' && (
            <button onClick={() => { setError(''); setShowAccountModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Account</button>
          )}
          {tab === 'bank-recon' && (
            <>
              <button onClick={() => setShowBankModal(true)} className="border border-blue-600 text-blue-700 px-3 py-2 rounded-lg text-sm">+ Bank Account</button>
              <button
                disabled={!selectedBankId}
                onClick={() => {
                  const b = bankAccounts.find((x) => x.id === selectedBankId);
                  if (!b) return;
                  setEditBankForm({
                    name: b.name || '',
                    bank_name: b.bank_name || '',
                    account_number: b.account_number || '',
                    opening_balance: String(b.opening_balance ?? '0'),
                    opening_date: new Date().toISOString().split('T')[0],
                  });
                  setError('');
                  setShowEditBankModal(true);
                }}
                className="border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Edit bank / opening
              </button>
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
                  <td className="px-4 py-3 cursor-pointer" onClick={() => viewEntry(e.id)}>{formatDate(e.entry_date)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500 cursor-pointer" onClick={() => viewEntry(e.id)}>{e.reference_no ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => viewEntry(e.id)}>{e.description ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'Posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                    <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => viewEntry(e.id)}>
                      View
                    </button>
                    <button type="button" className="text-xs text-slate-700 hover:underline" onClick={() => openEditEntry(e.id)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={async (ev) => {
                        ev.stopPropagation();
                        const ok = await confirm({
                          title: 'Delete journal',
                          message: `Delete journal JE-${e.id}${e.reference_no ? ` (${e.reference_no})` : ''}?`,
                          confirmLabel: 'Delete',
                        });
                        if (!ok) return;
                        try {
                          await deleteJournalEntry(e.id);
                          await load();
                          notify.success('Journal deleted');
                        } catch (err: unknown) {
                          setError(notifyError(err, 'Delete failed'));
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
              {accounts.map((a) => {
                const isChild = Boolean(a.parent_account_id);
                return (
                  <tr key={a.id} className="border-t">
                    <td className={`px-4 py-3 font-mono font-medium ${isChild ? 'pl-8 text-gray-700' : ''}`}>
                      {isChild ? `↳ ${a.code}` : a.code}
                    </td>
                    <td className={`px-4 py-3 ${isChild ? 'pl-6 text-gray-700' : 'font-medium text-gray-900'}`}>
                      {a.name}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_COLORS[a.type]}`}>{a.type}</span></td>
                    <td className="px-4 py-3">{a.is_active ? 'Yes' : 'No'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-gray-500 border-t">
            Partner banks are COA children under <span className="font-mono">1000 Cash &amp; Bank</span>. Fund receipts and bank payments post to those sub-accounts (journal + trial balance).
          </p>
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
              ) : trialBalance.map((r) => {
                const acc = accounts.find((a) => a.id === r.account_id);
                const isChild = Boolean(acc?.parent_account_id);
                return (
                <tr key={r.account_id} className="border-t">
                  <td className={`px-4 py-3 font-mono ${isChild ? 'pl-8' : ''}`}>{isChild ? `↳ ${r.code}` : r.code}</td>
                  <td className={`px-4 py-3 ${isChild ? 'pl-6' : ''}`}>{r.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.total_debit).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.total_credit).toLocaleString()}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : tab === 'general-ledger' ? (
        (() => {
          const headIds = new Set(
            accounts.filter((a) => accounts.some((c) => c.parent_account_id === a.id)).map((a) => a.id),
          );
          const sortedAccounts = [...accounts].sort((a, b) => a.code.localeCompare(b.code));
          const filteredAccounts = sortedAccounts.filter((a) => {
            if (glAccountScope === 'heads') return headIds.has(a.id) || !a.parent_account_id;
            if (glAccountScope === 'specific') return Boolean(a.parent_account_id) || !headIds.has(a.id);
            return true;
          });
          const selected = accounts.find((a) => a.id === glAccountId);
          const selectedIsHead = selected ? headIds.has(selected.id) : false;
          const showAccountCol = Boolean(glReport?.include_children);
          const money = (n: number | string) => {
            const v = Number(n);
            return v ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
          };
          const bal = (amount: number, side: string) =>
            side ? `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${side}` : '—';
          const colSpan = showAccountCol ? 8 : 7;

          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 items-end bg-white border rounded-xl p-3">
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  Account type
                  <select
                    value={glAccountScope}
                    onChange={(e) => {
                      const scope = e.target.value as 'all' | 'heads' | 'specific';
                      setGlAccountScope(scope);
                      const next = sortedAccounts.filter((a) => {
                        if (scope === 'heads') return headIds.has(a.id) || !a.parent_account_id;
                        if (scope === 'specific') return Boolean(a.parent_account_id) || !headIds.has(a.id);
                        return true;
                      });
                      if (next.length && !next.some((a) => a.id === glAccountId)) {
                        setGlAccountId(next[0].id);
                      }
                    }}
                    className="border rounded-lg px-3 py-2 text-sm min-w-[160px]"
                  >
                    <option value="all">All accounts</option>
                    <option value="heads">Head accounts</option>
                    <option value="specific">Specific / sub accounts</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  Account
                  <select
                    value={glAccountId}
                    onChange={(e) => setGlAccountId(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm min-w-[260px]"
                  >
                    {filteredAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.parent_account_id ? `  ${a.code} – ${a.name}` : `${a.code} – ${a.name}`}
                        {headIds.has(a.id) ? ' (Head)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  From
                  <input
                    type="date"
                    value={glFrom}
                    onChange={(e) => setGlFrom(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  To
                  <input
                    type="date"
                    value={glTo}
                    onChange={(e) => setGlTo(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                {selectedIsHead && (
                  <label className="flex items-center gap-2 text-sm text-slate-600 pb-2">
                    <input
                      type="checkbox"
                      checked={glIncludeChildren}
                      onChange={(e) => setGlIncludeChildren(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Include sub-accounts
                  </label>
                )}
                {(glFrom || glTo) && (
                  <button
                    type="button"
                    onClick={() => { setGlFrom(''); setGlTo(''); }}
                    className="text-xs text-slate-500 underline pb-2"
                  >
                    Clear dates
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <div className="flex flex-wrap justify-between gap-2 items-baseline">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">General Ledger</p>
                      <h3 className="font-semibold text-slate-900">
                        {glReport
                          ? `${glReport.account.code} — ${glReport.account.name}`
                          : selected
                            ? `${selected.code} — ${selected.name}`
                            : 'Select an account'}
                      </h3>
                      {glReport?.account.is_head && glReport.include_children && (
                        <p className="text-xs text-slate-500 mt-0.5">Head account (includes sub-account postings)</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Period:{' '}
                      {glReport?.period.from || glReport?.period.to
                        ? `${glReport?.period.from ? formatDate(glReport.period.from) : '…'} to ${glReport?.period.to ? formatDate(glReport.period.to) : '…'}`
                        : 'All time'}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-gray-600 font-medium w-28">Date</th>
                        <th className="px-3 py-2.5 text-left text-gray-600 font-medium w-32">Voucher No.</th>
                        <th className="px-3 py-2.5 text-left text-gray-600 font-medium">Particulars</th>
                        {showAccountCol && (
                          <th className="px-3 py-2.5 text-left text-gray-600 font-medium w-40">Account</th>
                        )}
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium w-28">Debit</th>
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium w-28">Credit</th>
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium w-36">Balance</th>
                        <th className="px-3 py-2.5 text-center text-gray-600 font-medium w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!glReport || glReport.rows.length === 0 ? (
                        <tr>
                          <td colSpan={colSpan} className="text-center text-gray-400 py-10">
                            No posted ledger lines for this account / period.
                          </td>
                        </tr>
                      ) : (
                        glReport.rows.map((r, i) => (
                          <tr
                            key={i}
                            className={`border-t ${r.is_opening ? 'bg-amber-50/60 font-medium' : 'hover:bg-slate-50/80'}`}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.entry_date)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{r.voucher_no || '—'}</td>
                            <td className="px-3 py-2">{r.particular || '—'}</td>
                            {showAccountCol && (
                              <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                                {r.account_code} {r.account_name}
                              </td>
                            )}
                            <td className="px-3 py-2 text-right font-mono">{money(r.debit)}</td>
                            <td className="px-3 py-2 text-right font-mono">{money(r.credit)}</td>
                            <td className="px-3 py-2 text-right font-mono font-medium whitespace-nowrap">
                              {bal(r.running_balance, r.balance_side)}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {r.is_opening || !r.journal_entry_id ? (
                                <span className="text-xs text-slate-300">—</span>
                              ) : (
                                <span className="inline-flex gap-2">
                                  <button
                                    type="button"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={() => viewEntry(r.journal_entry_id!)}
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-slate-700 hover:underline"
                                    onClick={() => openEditEntry(r.journal_entry_id!)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-red-600 hover:underline"
                                    onClick={async () => {
                                      const ok = await confirm({
                                        title: 'Delete journal',
                                        message: `Delete journal ${r.voucher_no || `JE-${r.journal_entry_id}`}? This removes the full entry from the ledger.`,
                                        confirmLabel: 'Delete',
                                        danger: true,
                                      });
                                      if (!ok) return;
                                      try {
                                        await deleteJournalEntry(r.journal_entry_id!);
                                        notify.success('Journal deleted');
                                        await load();
                                        if (glAccountId) {
                                          setGlReport(
                                            await getGeneralLedger(
                                              glAccountId,
                                              glFrom || undefined,
                                              glTo || undefined,
                                              glIncludeChildren,
                                            ),
                                          );
                                        }
                                      } catch (err: unknown) {
                                        setError(notifyError(err, 'Delete failed'));
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {glReport && glReport.rows.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={showAccountCol ? 4 : 3} className="px-3 py-2.5 font-semibold text-slate-700">
                            Period totals / Closing balance
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold">
                            {glReport.totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold">
                            {glReport.totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap">
                            {bal(glReport.totals.closing_balance, glReport.totals.closing_balance_side)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          );
        })()
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
          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Select bank account</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.bank_name || 'Bank'}) — open {Number(b.opening_balance || 0).toLocaleString()}
                </option>
              ))}
            </select>
            {selectedBankId && (
              <p className="text-xs text-slate-500">
                Opening posts as journal <span className="font-mono">BANK-OPEN-{selectedBankId}</span> (Dr bank / Cr equity). Use Edit to change or clear it.
              </p>
            )}
          </div>
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
                    <td className="px-4 py-2">{formatDate(s.statement_date)}</td>
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
                  <span>{formatDate(r.period_start)} → {formatDate(r.period_end)} ({r.status})</span>
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
        <Modal
          title={editingEntryId ? `Edit Journal JE-${editingEntryId}` : 'New Journal Entry'}
          onClose={() => {
            setShowModal(false);
            setEditingEntryId(null);
          }}
        >
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
            <button onClick={handleSaveEntry} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">
              {editingEntryId ? 'Save changes' : 'Save Draft'}
            </button>
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
              <option value="">Auto: new sub-account under 1000 Cash &amp; Bank</option>
              {accounts.filter((a) => a.type === 'ASSET' && a.code !== '1000').map((a) => (
                <option key={a.id} value={a.id}>{a.code} {a.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Leave blank to create e.g. HBL / BAHL under Cash &amp; Bank. Opening balance posts JE (Dr bank / Cr Owner Equity) into the journal and trial balance.
            </p>
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

      {showEditBankModal && selectedBankId && (
        <Modal title="Edit Bank / Opening Balance" onClose={() => setShowEditBankModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <input
              placeholder="Display name"
              value={editBankForm.name}
              onChange={(e) => setEditBankForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Bank name"
              value={editBankForm.bank_name}
              onChange={(e) => setEditBankForm((f) => ({ ...f, bank_name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Account number"
              value={editBankForm.account_number}
              onChange={(e) => setEditBankForm((f) => ({ ...f, account_number: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Opening balance</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editBankForm.opening_balance}
                  onChange={(e) => setEditBankForm((f) => ({ ...f, opening_balance: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Opening date</label>
                <input
                  type="date"
                  value={editBankForm.opening_date}
                  onChange={(e) => setEditBankForm((f) => ({ ...f, opening_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Saving rebuilds journal <span className="font-mono">BANK-OPEN-{selectedBankId}</span>. Set amount to 0 or use Clear to remove the opening JE.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Clear opening balance?',
                    message: 'This deletes the BANK-OPEN journal and sets opening to 0. Collections/expenses are not affected.',
                    confirmLabel: 'Clear opening',
                    danger: true,
                  });
                  if (!ok) return;
                  try {
                    await updateBankAccount(selectedBankId, { clear_opening: true });
                    notify.success('Opening balance cleared');
                    setShowEditBankModal(false);
                    await load();
                  } catch (e: unknown) {
                    setError(notifyError(e, 'Failed to clear opening'));
                  }
                }}
                className="flex-1 border border-red-300 text-red-700 py-2 rounded-lg text-sm hover:bg-red-50"
              >
                Clear opening
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editBankForm.name.trim()) {
                    setError('Display name is required');
                    return;
                  }
                  try {
                    await updateBankAccount(selectedBankId, {
                      name: editBankForm.name.trim(),
                      bank_name: editBankForm.bank_name || null,
                      account_number: editBankForm.account_number || null,
                      opening_balance: editBankForm.opening_balance || '0',
                      opening_date: editBankForm.opening_date,
                    });
                    notify.success('Bank updated');
                    setShowEditBankModal(false);
                    await load();
                  } catch (e: unknown) {
                    setError(notifyError(e, 'Failed to update bank'));
                  }
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm"
              >
                Save
              </button>
            </div>
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
