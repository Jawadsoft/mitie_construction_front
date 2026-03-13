import { useEffect, useState } from 'react';
import {
  getBudgetVsActual, getStageBudget, getProfitability, getProfitLoss,
  getSupplierPayables, getReceivables, getLabourCost, getCashflowReport, getExpenseBreakdown
} from '../api/reports';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import type {
  BudgetVsActual, StageBudget, ProjectProfitability, ProfitLoss,
  SupplierPayable, ReceivableRow, LabourCost, CashflowRow, ExpenseBreakdown
} from '../api/reports';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';

type ReportTab = 'profitability' | 'budget' | 'pl' | 'cashflow' | 'payables' | 'receivables' | 'labour' | 'expenses';

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtFull(n: number) {
  return `PKR ${n.toLocaleString()}`;
}

function ProgressBar({ pct, color = 'blue' }: { pct: number; color?: string }) {
  const c = color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${c}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('profitability');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profitData, setProfitData] = useState<ProjectProfitability[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetVsActual[]>([]);
  const [stageData, setStageData] = useState<StageBudget[]>([]);
  const [plData, setPlData] = useState<ProfitLoss | null>(null);
  const [cashflowData, setCashflowData] = useState<CashflowRow[]>([]);
  const [payablesData, setPayablesData] = useState<SupplierPayable[]>([]);
  const [receivablesData, setReceivablesData] = useState<ReceivableRow[]>([]);
  const [labourData, setLabourData] = useState<LabourCost | null>(null);
  const [expenseData, setExpenseData] = useState<ExpenseBreakdown | null>(null);

  useEffect(() => { getProjects().then(setProjects).catch(() => {}); }, []);

  const loadReport = async () => {
    setLoading(true); setError('');
    try {
      switch (tab) {
        case 'profitability': setProfitData(await getProfitability(selectedProject || undefined)); break;
        case 'budget':
          setBudgetData(await getBudgetVsActual(selectedProject || undefined));
          if (selectedProject) setStageData(await getStageBudget(selectedProject));
          else setStageData([]);
          break;
        case 'pl': setPlData(await getProfitLoss(dateFrom || undefined, dateTo || undefined)); break;
        case 'cashflow': setCashflowData(await getCashflowReport(period, dateFrom || undefined, dateTo || undefined)); break;
        case 'payables': setPayablesData(await getSupplierPayables()); break;
        case 'receivables': setReceivablesData(await getReceivables()); break;
        case 'labour': setLabourData(await getLabourCost(selectedProject || undefined)); break;
        case 'expenses': setExpenseData(await getExpenseBreakdown(selectedProject || undefined)); break;
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReport(); }, [tab, selectedProject, period, dateFrom, dateTo]);

  const TABS: { id: ReportTab; label: string }[] = [
    { id: 'profitability', label: '📈 Profitability' },
    { id: 'budget', label: '📊 Budget vs Actual' },
    { id: 'pl', label: '💹 P&L Statement' },
    { id: 'cashflow', label: '💰 Cash Flow' },
    { id: 'payables', label: '🏢 Payables' },
    { id: 'receivables', label: '⏳ Receivables' },
    { id: 'labour', label: '👷 Labour Cost' },
    { id: 'expenses', label: '💸 Expenses' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Financial and operational insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            if (tab === 'profitability' && profitData.length) exportCSV(`report-profitability`, profitData as any);
            else if (tab === 'budget' && budgetData.length) exportCSV(`report-budget`, budgetData as any);
            else if (tab === 'receivables' && receivablesData.length) exportCSV(`report-receivables`, receivablesData as any);
            else if (tab === 'payables' && payablesData.length) exportCSV(`report-payables`, payablesData as any);
          }} className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">↓ CSV</button>
          <button onClick={() => {
            if (tab === 'profitability') exportPDF('Profitability Report', ['Project','Revenue','Cost','Profit','Margin%'], profitData.map((r: any) => [r.project_name, Number(r.total_revenue).toLocaleString(), Number(r.total_cost).toLocaleString(), Number(r.profit).toLocaleString(), r.profit_margin + '%']));
            else if (tab === 'budget') exportPDF('Budget vs Actual', ['Project','Budget','Actual','Variance','Var%'], budgetData.map((r: any) => [r.project_name ?? r.stage_name, Number(r.total_budget).toLocaleString(), Number(r.actual_cost).toLocaleString(), Number(r.variance).toLocaleString(), r.variance_percent + '%']));
            else if (tab === 'receivables') exportPDF('Receivables Aging', ['Customer','Unit','Sale Price','Paid','Balance','Status'], receivablesData.map((r: any) => [r.customer_name, r.unit_number, Number(r.total_sale_price).toLocaleString(), Number(r.total_paid).toLocaleString(), Number(r.balance).toLocaleString(), r.status]));
            else if (tab === 'payables') exportPDF('Supplier Payables', ['Supplier','Total Orders','Amount (PKR)'], payablesData.map((r: any) => [r.supplier_name, r.total_orders, Number(r.total_amount).toLocaleString()]));
          }} className="border border-red-500 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50">↓ PDF</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto pb-px">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {['profitability', 'budget', 'labour', 'expenses'].includes(tab) && (
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {['pl', 'cashflow'].includes(tab) && (
          <>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </>
        )}
        {tab === 'cashflow' && (
          <select value={period} onChange={e => setPeriod(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <>
          {/* ─── Profitability ─── */}
          {tab === 'profitability' && (
            <div className="space-y-4">
              {profitData.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No project data yet.</p>
              ) : profitData.map(p => (
                <div key={p.project_id} className="bg-white rounded-xl border p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{p.project_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                    </div>
                    <div className={`text-right ${p.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      <p className="text-xl font-bold">{p.profit >= 0 ? '+' : ''}{fmtFull(p.profit)}</p>
                      <p className="text-xs">{p.profit_margin}% margin</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600">Revenue</p>
                      <p className="font-bold text-blue-800">PKR {fmt(p.total_revenue)}</p>
                      <p className="text-xs text-blue-500">Collected: PKR {fmt(p.collected_revenue)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-red-600">Total Cost</p>
                      <p className="font-bold text-red-800">PKR {fmt(p.total_cost)}</p>
                      <p className="text-xs text-red-500">Labour: PKR {fmt(p.total_labour)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-yellow-600">Budget</p>
                      <p className="font-bold text-yellow-800">PKR {fmt(p.total_budget)}</p>
                      <p className="text-xs text-yellow-500">{p.total_budget > 0 ? Math.round((p.total_cost / p.total_budget) * 100) : 0}% used</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600">Units</p>
                      <p className="font-bold text-green-800">{p.sold_units} / {p.total_units}</p>
                      <p className="text-xs text-green-500">Sold</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Profit Margin</span><span>{p.profit_margin}%</span></div>
                    <ProgressBar pct={p.profit_margin} color={p.profit_margin > 20 ? 'green' : p.profit_margin > 0 ? 'yellow' : 'red'} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Budget vs Actual ─── */}
          {tab === 'budget' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left text-gray-600">Project</th>
                    <th className="px-4 py-3 text-right text-gray-600">Budget</th>
                    <th className="px-4 py-3 text-right text-gray-600">Spent</th>
                    <th className="px-4 py-3 text-right text-gray-600">Variance</th>
                    <th className="px-4 py-3 text-left text-gray-600 w-32">Usage</th>
                  </tr></thead>
                  <tbody>
                    {budgetData.map(r => (
                      <tr key={r.project_id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.project_name}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(r.total_budget)}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-600">{fmt(r.total_spent)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${r.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {r.variance >= 0 ? '+' : ''}{fmt(r.variance)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><ProgressBar pct={r.utilization_pct} color={r.utilization_pct > 90 ? 'red' : r.utilization_pct > 70 ? 'yellow' : 'green'} /></div>
                            <span className="text-xs w-8 text-right">{r.utilization_pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stageData.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 text-sm">Stage Breakdown</h3>
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr>
                        <th className="px-4 py-3 text-left text-gray-600">Stage</th>
                        <th className="px-4 py-3 text-right text-gray-600">Budget</th>
                        <th className="px-4 py-3 text-right text-gray-600">Actual</th>
                        <th className="px-4 py-3 text-right text-gray-600">Variance</th>
                        <th className="px-4 py-3 text-right text-gray-600">Complete</th>
                      </tr></thead>
                      <tbody>
                        {stageData.map(s => (
                          <tr key={s.stage_id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{s.stage_name}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(s.stage_budget)}</td>
                            <td className="px-4 py-3 text-right font-mono text-red-600">{fmt(s.actual_cost)}</td>
                            <td className={`px-4 py-3 text-right font-mono ${s.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {s.variance >= 0 ? '+' : ''}{fmt(s.variance)}
                            </td>
                            <td className="px-4 py-3 text-right">{s.completion_percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── P&L Statement ─── */}
          {tab === 'pl' && plData && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-800 text-lg">Profit & Loss Statement</h2>
                  <span className="text-sm text-gray-500">{plData.period.from} – {plData.period.to}</span>
                </div>

                <div className="space-y-4">
                  {/* Revenue */}
                  <div>
                    <h3 className="font-semibold text-green-700 text-sm uppercase tracking-wide mb-2">Revenue</h3>
                    <div className="flex justify-between py-2 border-b text-sm">
                      <span className="text-gray-700">Sales Collections</span>
                      <span className="font-mono font-medium text-green-700">PKR {fmt(plData.revenue.sales_collections)}</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold text-sm bg-green-50 px-2 rounded">
                      <span>Total Revenue</span>
                      <span className="text-green-700">PKR {fmt(plData.revenue.total)}</span>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h3 className="font-semibold text-red-700 text-sm uppercase tracking-wide mb-2">Expenses</h3>
                    {plData.expenses.by_category.map(cat => (
                      <div key={cat.category} className="flex justify-between py-1.5 border-b text-sm">
                        <span className="text-gray-600 pl-4">{cat.category}</span>
                        <span className="font-mono text-red-600">PKR {fmt(cat.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 border-b text-sm">
                      <span className="text-gray-600 pl-4">Labour Payments</span>
                      <span className="font-mono text-red-600">PKR {fmt(plData.expenses.labour)}</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold text-sm bg-red-50 px-2 rounded">
                      <span>Total Expenses</span>
                      <span className="text-red-700">PKR {fmt(plData.expenses.total)}</span>
                    </div>
                  </div>

                  {/* Net */}
                  <div className={`rounded-xl p-4 ${plData.gross_profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Net Profit / Loss</span>
                      <span className={`font-bold text-2xl ${plData.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {plData.gross_profit >= 0 ? '+' : ''}PKR {fmt(plData.gross_profit)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-gray-500">Margin: {plData.gross_margin_pct}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Cashflow Report ─── */}
          {tab === 'cashflow' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left text-gray-600">Period</th>
                    <th className="px-4 py-3 text-right text-gray-600">Cash In</th>
                    <th className="px-4 py-3 text-right text-gray-600">Cash Out</th>
                    <th className="px-4 py-3 text-right text-gray-600">Net</th>
                    <th className="px-4 py-3 text-right text-gray-600">Running Balance</th>
                  </tr></thead>
                  <tbody>
                    {cashflowData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-gray-400 py-10">No transactions in this period.</td></tr>
                    ) : cashflowData.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.period}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-600">+{fmt(r.cash_in)}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-600">-{fmt(r.cash_out)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${r.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {r.net >= 0 ? '+' : ''}{fmt(r.net)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${r.running_balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                          {fmt(r.running_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Supplier Payables ─── */}
          {tab === 'payables' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left text-gray-600">Supplier</th>
                    <th className="px-4 py-3 text-left text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-right text-gray-600">Total Ordered</th>
                    <th className="px-4 py-3 text-right text-gray-600">Total Paid</th>
                    <th className="px-4 py-3 text-right text-gray-600">Balance Due</th>
                  </tr></thead>
                  <tbody>
                    {payablesData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-gray-400 py-10">No payables data.</td></tr>
                    ) : payablesData.map(r => (
                      <tr key={r.supplier_id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.supplier_name}</td>
                        <td className="px-4 py-3 text-gray-500">{r.phone ?? '-'}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(r.total_ordered)}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-600">{fmt(r.total_paid)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${r.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {fmt(r.balance_due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {payablesData.length > 0 && (
                    <tfoot className="bg-gray-50 border-t font-bold">
                      <tr>
                        <td colSpan={4} className="px-4 py-3">Total Balance Due</td>
                        <td className="px-4 py-3 text-right font-mono text-red-700">
                          PKR {fmt(payablesData.reduce((s, r) => s + r.balance_due, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ─── Customer Receivables ─── */}
          {tab === 'receivables' && (
            <div className="space-y-3">
              {receivablesData.some(r => r.overdue > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  ⚠️ {receivablesData.filter(r => r.overdue > 0).length} customer(s) have overdue payments totalling PKR {fmt(receivablesData.reduce((s, r) => s + r.overdue, 0))}
                </div>
              )}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      <th className="px-4 py-3 text-left text-gray-600">Customer</th>
                      <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                      <th className="px-4 py-3 text-right text-gray-600">Total Due</th>
                      <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                      <th className="px-4 py-3 text-right text-gray-600">Balance</th>
                      <th className="px-4 py-3 text-right text-gray-600">Overdue</th>
                    </tr></thead>
                    <tbody>
                      {receivablesData.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-gray-400 py-10">No outstanding receivables.</td></tr>
                      ) : receivablesData.map(r => (
                        <tr key={`${r.customer_id}-${r.sale_id}`} className={`border-t hover:bg-gray-50 ${r.overdue > 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 font-medium">{r.customer_name}<br/><span className="text-xs text-gray-400">{r.phone}</span></td>
                          <td className="px-4 py-3 text-gray-600">Unit {r.unit_number}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmt(r.total_due)}</td>
                          <td className="px-4 py-3 text-right font-mono text-green-600">{fmt(r.total_paid)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{fmt(r.balance)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${r.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {r.overdue > 0 ? fmt(r.overdue) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Labour Cost ─── */}
          {tab === 'labour' && labourData && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">By Contractor</h3>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      <th className="px-4 py-3 text-left text-gray-600">Contractor</th>
                      <th className="px-4 py-3 text-left text-gray-600">Type</th>
                      <th className="px-4 py-3 text-right text-gray-600">Days</th>
                      <th className="px-4 py-3 text-right text-gray-600">Total Paid</th>
                    </tr></thead>
                    <tbody>
                      {labourData.by_contractor.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-gray-400 py-8">No labour data.</td></tr>
                      ) : labourData.by_contractor.map(c => (
                        <tr key={c.contractor_id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{c.contractor_name}</td>
                          <td className="px-4 py-3 text-gray-500">{c.contractor_type ?? '-'}</td>
                          <td className="px-4 py-3 text-right">{c.total_days}</td>
                          <td className="px-4 py-3 text-right font-mono font-medium">PKR {fmt(c.total_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {labourData.by_contractor.length > 0 && (
                      <tfoot className="bg-gray-50 border-t font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right font-mono">PKR {fmt(labourData.by_contractor.reduce((s, c) => s + c.total_paid, 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">By Project</h3>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      <th className="px-4 py-3 text-left text-gray-600">Project</th>
                      <th className="px-4 py-3 text-right text-gray-600">Contractors</th>
                      <th className="px-4 py-3 text-right text-gray-600">Total Paid</th>
                    </tr></thead>
                    <tbody>
                      {labourData.by_project.map(p => (
                        <tr key={p.project_id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{p.project_name}</td>
                          <td className="px-4 py-3 text-right">{p.contractor_count}</td>
                          <td className="px-4 py-3 text-right font-mono font-medium">PKR {fmt(p.total_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Expenses Breakdown ─── */}
          {tab === 'expenses' && expenseData && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-sm text-blue-600">Grand Total Expenses</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">PKR {fmt(expenseData.grand_total)}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm">By Category</h3>
                  <div className="space-y-2">
                    {expenseData.by_category.map(c => (
                      <div key={c.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{c.category} <span className="text-gray-400 text-xs">({c.count})</span></span>
                          <span className="font-mono font-medium">PKR {fmt(c.total)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${expenseData.grand_total > 0 ? (c.total / expenseData.grand_total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm">By Month</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {expenseData.by_month.map(m => (
                      <div key={m.month} className="flex justify-between text-sm py-1.5 border-b">
                        <span className="text-gray-700">{m.month}</span>
                        <span className="font-mono font-medium text-red-600">PKR {fmt(m.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
