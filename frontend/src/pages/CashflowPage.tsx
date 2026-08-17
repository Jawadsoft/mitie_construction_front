import { useEffect, useState } from 'react';
import { getCashTransactions, createCashTransaction } from '../api/cashflow';
import type { CashTransaction } from '../api/cashflow';
import { getCashflowReport } from '../api/reports';
import type { CashflowActivitySection, CashflowReport } from '../api/reports';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { formatDate } from '../utils/date';
import { formatPkrFull, formatPkrThousands } from '../utils/money';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

function signed(n: number) {
  const text = formatPkrThousands(Math.abs(n));
  return n < 0 ? `(${text})` : text;
}

function activityLabel(line: CashflowActivitySection['lines'][number]) {
  const inflow = line.net >= 0;
  const name = line.account_name;
  if (line.account_code === '1100') {
    return inflow ? 'Cash collected from customers' : 'Cash refunded to customers';
  }
  if (line.account_code.startsWith('15')) {
    return inflow ? `Proceeds from disposal of ${name}` : `Purchase of ${name}`;
  }
  switch (line.account_type) {
    case 'EXPENSE':
      return inflow ? `Refunds of ${name}` : `Cash paid for ${name}`;
    case 'INCOME':
      return inflow ? `Cash received from ${name}` : `Cash refunded on ${name}`;
    case 'LIABILITY':
      return inflow ? `Proceeds from ${name}` : `Settlement of ${name}`;
    case 'EQUITY':
      return inflow ? `Capital introduced (${name})` : `Owner drawings (${name})`;
    default:
      return inflow ? `Cash collected against ${name}` : `Cash paid against ${name}`;
  }
}

function ActivitySection({
  title,
  subtitle,
  section,
  totalLabel,
}: {
  title: string;
  subtitle: string;
  section: CashflowActivitySection;
  totalLabel: string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      {section.lines.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">No activity in this period.</p>
      ) : (
        section.lines.map((line) => (
          <div
            key={line.account_code}
            className="flex justify-between border-b border-dashed py-1.5 text-sm"
          >
            <span className="text-slate-600">
              {activityLabel(line)}
              <span className="ml-1 text-xs text-slate-400">({line.account_code})</span>
            </span>
            <span
              className={`font-mono ${line.net >= 0 ? 'text-green-700' : 'text-red-700'}`}
              title={formatPkrFull(line.net)}
            >
              {signed(line.net)}
            </span>
          </div>
        ))
      )}
      <div className="mt-1 flex justify-between border-t-2 border-slate-300 py-2 text-sm font-semibold">
        <span>{totalLabel}</span>
        <span className={`font-mono ${section.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {signed(section.net)}
        </span>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'statement' as const, label: 'Statement' },
  { id: 'transactions' as const, label: 'Transactions' },
];

export default function CashflowPage() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = `${today.slice(0, 7)}-01`;
  const [tab, setTab] = useState<'statement' | 'transactions'>('statement');
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statement, setStatement] = useState<CashflowReport | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);

  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'IN' as 'IN' | 'OUT',
    amount: '', method: 'Cash', reference_no: '', description: '', project_id: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [t, report, p] = await Promise.all([
        getCashTransactions({
          ...(filterType ? { type: filterType } : {}),
          ...(filterProject ? { project_id: filterProject } : {}),
          ...(dateFrom ? { from: dateFrom } : {}),
          ...(dateTo ? { to: dateTo } : {}),
        }),
        getCashflowReport(
          'monthly',
          dateFrom || undefined,
          dateTo || undefined,
          filterProject || undefined,
        ),
        getProjects(),
      ]);
      setTransactions(t);
      setStatement(report);
      setProjects(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType, filterProject, dateFrom, dateTo]);

  const handleSave = async () => {
    if (!form.amount || !form.transaction_date) { setError('Date and amount are required'); return; }
    setError('');
    try {
      await createCashTransaction({
        ...form,
        project_id: form.project_id || undefined,
      } as any);
      setShowModal(false);
      setTab('transactions');
      load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cash Flow</h1>
          <p className="text-sm text-gray-500">
            Direct-method statement and cash transaction ledger
          </p>
        </div>
        {tab === 'transactions' && (
          <button onClick={() => { setError(''); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Transaction
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b overflow-x-auto pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="text-xs text-slate-500 flex flex-col gap-1">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>
        {tab === 'transactions' && (
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">All ledger transactions</option>
            <option value="IN">Receipts only</option>
            <option value="OUT">Payments only</option>
          </select>
        )}
      </div>

      {error && !showModal && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
          {error}
        </p>
      )}

      {loading && !statement && tab === 'statement' ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : null}

      {tab === 'statement' && statement && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Opening Cash"
              value={formatPkrThousands(statement.summary.opening_cash)}
              icon="🏦"
              color="blue"
            />
            <StatCard
              title="Actual Closing"
              value={formatPkrThousands(statement.summary.actual_closing_cash)}
              icon="💰"
              color={statement.summary.actual_closing_cash >= 0 ? 'blue' : 'red'}
            />
            <StatCard
              title="Due Receivables"
              value={formatPkrThousands(statement.summary.due_receivables)}
              icon="📥"
              color="green"
            />
            <StatCard
              title="Due Payables"
              value={formatPkrThousands(statement.summary.due_payables)}
              icon="📤"
              color="red"
            />
            <StatCard
              title="Expected Closing"
              value={formatPkrThousands(statement.summary.expected_closing_cash)}
              icon="📊"
              color={statement.summary.expected_closing_cash >= 0 ? 'green' : 'red'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 items-start">
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold text-slate-800">Statement of Cash Flows (Direct Method)</h2>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                Actual posted receipts and payments
                {statement.scope.from ? ` from ${formatDate(statement.scope.from)}` : ''}
                {statement.scope.to ? ` to ${formatDate(statement.scope.to)}` : ''}.
              </p>

              <ActivitySection
                title="Cash Flows from Operating Activities"
                subtitle="Sales collections, project costs, expenses and working capital"
                section={statement.activities.operating}
                totalLabel="Net cash from operating activities"
              />
              <ActivitySection
                title="Cash Flows from Investing Activities"
                subtitle="Land, plant and other fixed asset purchases or disposals"
                section={statement.activities.investing}
                totalLabel="Net cash from investing activities"
              />
              <ActivitySection
                title="Cash Flows from Financing Activities"
                subtitle="Owner capital, drawings and loan movements"
                section={statement.activities.financing}
                totalLabel="Net cash from financing activities"
              />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b py-2 font-semibold">
                  <span>Net increase / (decrease) in cash</span>
                  <span className={`font-mono ${statement.summary.actual_net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {signed(statement.summary.actual_net)}
                  </span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span>Cash and bank at beginning of period</span>
                  <span className="font-mono" title={formatPkrFull(statement.summary.opening_cash)}>
                    {signed(statement.summary.opening_cash)}
                  </span>
                </div>
                <div className="flex justify-between rounded-lg bg-blue-50 px-3 py-3 font-bold text-blue-800">
                  <span>Cash and bank at end of period</span>
                  <span className="font-mono" title={formatPkrFull(statement.summary.actual_closing_cash)}>
                    {signed(statement.summary.actual_closing_cash)}
                  </span>
                </div>
                <p className="pt-1 text-xs text-slate-400">
                  Total receipts {formatPkrThousands(statement.summary.actual_cash_in)} · total payments{' '}
                  {formatPkrThousands(statement.summary.actual_cash_out)}. Transfers between own cash and bank
                  accounts are excluded.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold text-slate-800">Expected Cash Position</h2>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                Outstanding receivables and payables whose due dates fall in the selected period.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b py-2">
                  <span>Actual closing cash</span>
                  <span className="font-mono">{formatPkrThousands(statement.summary.actual_closing_cash)}</span>
                </div>
                <div className="flex justify-between border-b py-2 text-green-700">
                  <span>Receivables due</span>
                  <span className="font-mono">+{formatPkrThousands(statement.summary.due_receivables)}</span>
                </div>
                <div className="flex justify-between border-b py-2 text-red-700">
                  <span>Payables due</span>
                  <span className="font-mono">−{formatPkrThousands(statement.summary.due_payables)}</span>
                </div>
                <div className="flex justify-between border-b py-2 font-semibold">
                  <span>Expected net movement</span>
                  <span className={`font-mono ${statement.summary.expected_net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {statement.summary.expected_net >= 0 ? '+' : ''}
                    {formatPkrThousands(statement.summary.expected_net)}
                  </span>
                </div>
                <div className={`flex justify-between rounded-lg px-3 py-3 font-bold ${
                  statement.summary.expected_closing_cash >= 0
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}>
                  <span>Expected closing cash</span>
                  <span className="font-mono">{formatPkrThousands(statement.summary.expected_closing_cash)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b">
                <h2 className="font-semibold text-green-800">Receivables Due</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-3 py-2 text-left text-gray-600">Due Date</th>
                    <th className="px-3 py-2 text-left text-gray-600">Customer / Unit</th>
                    <th className="px-3 py-2 text-right text-gray-600">Balance</th>
                  </tr></thead>
                  <tbody>
                    {statement.due_receivables.length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-gray-400 py-8">No receivables due.</td></tr>
                    ) : statement.due_receivables.map((r) => (
                      <tr key={r.installment_id} className="border-t">
                        <td className="px-3 py-2">{formatDate(r.due_date)}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{r.party_name}</p>
                          <p className="text-xs text-slate-400">{r.project_name} · Unit {r.unit_number}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-green-700">
                          {formatPkrThousands(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b">
                <h2 className="font-semibold text-red-800">Payables Due</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-3 py-2 text-left text-gray-600">Due Date</th>
                    <th className="px-3 py-2 text-left text-gray-600">Party / Category</th>
                    <th className="px-3 py-2 text-right text-gray-600">Balance</th>
                  </tr></thead>
                  <tbody>
                    {statement.due_payables.length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-gray-400 py-8">No payables due.</td></tr>
                    ) : statement.due_payables.map((r) => (
                      <tr key={r.expense_id} className="border-t">
                        <td className="px-3 py-2">{formatDate(r.due_date)}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{r.party_name}</p>
                          <p className="text-xs text-slate-400">{r.project_name} · {r.category}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-red-700">
                          {formatPkrThousands(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'transactions' && (
        loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <h2 className="font-semibold text-slate-800">Cash Transaction Ledger</h2>
              <p className="text-xs text-slate-500">Supporting detail for actual cash receipts and payments.</p>
            </div>
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
                      <td className="px-4 py-3">{formatDate(t.transaction_date)}</td>
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
        )
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
