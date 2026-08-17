import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getBudgetVsActual, getStageBudget, getProfitability, getProfitLoss,
  getSupplierPayables, getReceivables, getLabourCost, getCashflowReport, getExpenseBreakdown,
  getPartnersEquity,
} from '../api/reports';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import type {
  BudgetVsActual, StageBudget, ProjectProfitability, ProfitLoss,
  SupplierPayable, ReceivableRow, LabourCost, CashflowReport, ExpenseBreakdown,
  PartnersEquityReport,
} from '../api/reports';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import type { NavIntent } from '../types/navIntent';
import { formatPkrThousands, formatPkrFull } from '../utils/money';

type ReportTab = 'profitability' | 'budget' | 'pl' | 'partners-equity' | 'cashflow' | 'payables' | 'receivables' | 'labour' | 'expenses';

const VALID_TABS: ReportTab[] = [
  'profitability', 'budget', 'pl', 'partners-equity', 'cashflow',
  'payables', 'receivables', 'labour', 'expenses',
];

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

export default function ReportsPage({
  initialIntent,
  onIntentConsumed,
}: {
  initialIntent?: NavIntent;
  onIntentConsumed?: () => void;
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = (VALID_TABS.includes(tabParam as ReportTab) ? tabParam : 'profitability') as ReportTab;
  const [tab, setTab] = useState<ReportTab>(initialTab);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') ?? '');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeUnsoldCosts, setIncludeUnsoldCosts] = useState(
    searchParams.get('include_unsold') !== 'false',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profitData, setProfitData] = useState<ProjectProfitability[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetVsActual[]>([]);
  const [stageData, setStageData] = useState<StageBudget[]>([]);
  const [plData, setPlData] = useState<ProfitLoss | null>(null);
  const [cashflowData, setCashflowData] = useState<CashflowReport | null>(null);
  const [payablesData, setPayablesData] = useState<SupplierPayable[]>([]);
  const [receivablesData, setReceivablesData] = useState<ReceivableRow[]>([]);
  const [labourData, setLabourData] = useState<LabourCost | null>(null);
  const [expenseData, setExpenseData] = useState<ExpenseBreakdown | null>(null);
  const [partnersEquity, setPartnersEquity] = useState<PartnersEquityReport | null>(null);

  useEffect(() => { getProjects().then(setProjects).catch(() => {}); }, []);

  useEffect(() => {
    if (!initialIntent?.action || initialIntent.action !== 'view-profit') return;
    setTab('profitability');
    if (initialIntent.projectId) setSelectedProject(initialIntent.projectId);
    onIntentConsumed?.();
  }, [initialIntent]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== 'profitability') next.set('tab', tab);
    if (selectedProject) next.set('project', selectedProject);
    if (tab === 'pl' && !includeUnsoldCosts) next.set('include_unsold', 'false');
    const want = next.toString();
    const curr = searchParams.toString();
    if (want !== curr) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL from tab/project only
  }, [tab, selectedProject, includeUnsoldCosts]);

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
        case 'pl':
          setPlData(await getProfitLoss(
            dateFrom || undefined,
            dateTo || undefined,
            selectedProject || undefined,
            includeUnsoldCosts,
          ));
          break;
        case 'partners-equity': setPartnersEquity(await getPartnersEquity(dateTo || undefined)); break;
        case 'cashflow':
          setCashflowData(await getCashflowReport(
            period,
            dateFrom || undefined,
            dateTo || undefined,
            selectedProject || undefined,
          ));
          break;
        case 'payables': setPayablesData(await getSupplierPayables(selectedProject || undefined)); break;
        case 'receivables': setReceivablesData(await getReceivables(selectedProject || undefined)); break;
        case 'labour': setLabourData(await getLabourCost(selectedProject || undefined)); break;
        case 'expenses': setExpenseData(await getExpenseBreakdown(selectedProject || undefined)); break;
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadReport();
  }, [tab, selectedProject, period, dateFrom, dateTo, includeUnsoldCosts]);

  const TABS: { id: ReportTab; label: string }[] = [
    { id: 'profitability', label: '📈 Profitability' },
    { id: 'budget', label: '📊 Budget vs Actual' },
    { id: 'pl', label: '💹 P&L Statement' },
    { id: 'partners-equity', label: '🤝 Partners Equity' },
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
            else if (tab === 'pl' && plData?.sold_units?.length) {
              exportCSV(
                `report-pl-sold-units`,
                plData.sold_units.map((u) => ({
                  Date: String(u.sale_date).slice(0, 10),
                  Project: u.project_name,
                  Unit: u.unit_number,
                  Type: u.unit_type || '',
                  Customer: u.customer_name,
                  SalePrice: u.sale_price,
                  Collected: u.collected,
                  CostShare: u.allocated_cost,
                  Profit: u.profit,
                  MarginPct: u.margin_pct,
                })) as any,
              );
            }
            else if (tab === 'partners-equity' && partnersEquity?.partners?.length) {
              exportCSV(
                `report-partners-equity`,
                partnersEquity.partners.map((p) => ({
                  Partner: p.partner_name,
                  Bank: p.bank_name || '',
                  SharePct: p.share_pct,
                  Opening: p.capital_opening,
                  EquityReceipts: p.capital_contributed,
                  CapitalIn: p.capital_in,
                  ProfitShare: p.profit_share,
                  TrailingEquity: p.trailing_equity,
                })) as any,
              );
            }
            else if (tab === 'receivables' && receivablesData.length) exportCSV(`report-receivables`, receivablesData as any);
            else if (tab === 'payables' && payablesData.length) {
              exportCSV(
                `report-payables`,
                payablesData.map((r) => ({
                  Project: r.project_name,
                  Party: r.party_name || r.supplier_name,
                  Type: r.vendor_type,
                  Category: r.category,
                  DueDate: r.due_date || r.expense_date || '',
                  Status: r.status,
                  Amount: r.amount ?? r.total_ordered,
                  Paid: r.paid_amount ?? r.total_paid,
                  BalanceDue: r.balance_due,
                })) as any,
              );
            }
          }} className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">↓ CSV</button>
          <button onClick={() => {
            if (tab === 'profitability') exportPDF('Profitability Report', ['Project','Revenue','Cost','Profit','Margin%'], profitData.map((r: any) => [r.project_name, Number(r.total_revenue).toLocaleString(), Number(r.total_cost).toLocaleString(), Number(r.profit).toLocaleString(), r.profit_margin + '%']));
            else if (tab === 'budget') exportPDF('Budget vs Actual', ['Project','Budget','Actual','Variance','Var%'], budgetData.map((r: any) => [r.project_name ?? r.stage_name, Number(r.total_budget).toLocaleString(), Number(r.actual_cost).toLocaleString(), Number(r.variance).toLocaleString(), r.variance_percent + '%']));
            else if (tab === 'pl' && plData?.sold_units) {
              exportPDF(
                'Sold Unit Profitability',
                ['Date', 'Project', 'Unit', 'Customer', 'Sale', 'Cost', 'Profit', 'Margin%'],
                plData.sold_units.map((u) => [
                  String(u.sale_date).slice(0, 10),
                  u.project_name,
                  u.unit_number,
                  u.customer_name,
                  u.sale_price.toLocaleString(),
                  u.allocated_cost.toLocaleString(),
                  u.profit.toLocaleString(),
                  `${u.margin_pct}%`,
                ]),
              );
            }
            else if (tab === 'partners-equity' && partnersEquity?.partners) {
              exportPDF(
                'Partners Equity (50:50)',
                ['Partner', 'Share%', 'Capital In', 'Profit Share', 'Trailing Equity'],
                partnersEquity.partners.map((p) => [
                  p.partner_name,
                  `${p.share_pct}%`,
                  p.capital_in.toLocaleString(),
                  p.profit_share.toLocaleString(),
                  p.trailing_equity.toLocaleString(),
                ]),
              );
            }
            else if (tab === 'receivables') exportPDF('Receivables Aging', ['Customer','Unit','Sale Price','Paid','Balance','Status'], receivablesData.map((r: any) => [r.customer_name, r.unit_number, Number(r.total_sale_price).toLocaleString(), Number(r.total_paid).toLocaleString(), Number(r.balance).toLocaleString(), r.status]));
            else if (tab === 'payables') exportPDF(
              'Project Payables',
              ['Project', 'Party', 'Category', 'Due', 'Amount', 'Paid', 'Balance'],
              payablesData.map((r: any) => [
                r.project_name,
                r.party_name || r.supplier_name,
                r.category,
                r.due_date || r.expense_date || '',
                Number(r.amount ?? r.total_ordered).toLocaleString(),
                Number(r.paid_amount ?? r.total_paid).toLocaleString(),
                Number(r.balance_due).toLocaleString(),
              ]),
            );
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
        {['profitability', 'budget', 'pl', 'cashflow', 'labour', 'expenses', 'payables', 'receivables'].includes(tab) && (
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
        {tab === 'pl' && (
          <label className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <input
              type="checkbox"
              checked={includeUnsoldCosts}
              onChange={(e) => setIncludeUnsoldCosts(e.target.checked)}
              className="rounded border-slate-300"
            />
            Include costs from projects with no sales
          </label>
        )}
        {tab === 'partners-equity' && (
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            As of
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
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
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg">Profit & Loss Statement</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedProject
                        ? projects.find((p) => p.id === selectedProject)?.name ?? 'Selected project'
                        : 'All projects'}
                      {' · '}
                      {includeUnsoldCosts
                        ? 'Including projects with no sales'
                        : 'Excluding projects with no sales'}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">{plData.period.from} – {plData.period.to}</span>
                </div>

                <div className="space-y-4">
                  {/* Revenue */}
                  <div>
                    <h3 className="font-semibold text-green-700 text-sm uppercase tracking-wide mb-2">Revenue</h3>
                    <div className="flex justify-between py-2 border-b text-sm">
                      <span className="text-gray-700">Sales Passed</span>
                      <span className="font-mono font-medium text-green-700">PKR {fmt(plData.revenue.sales_passed)}</span>
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

              {/* Sold unit profitability */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap justify-between gap-2 items-baseline">
                  <div>
                    <h3 className="font-bold text-gray-800">Sold Unit Profitability</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sale price − share of project cost (expenses + labour + materials). Cost shared by area when all units have sqft; otherwise equal per unit.
                    </p>
                  </div>
                  {plData.sold_units_summary && (
                    <p className={`text-sm font-semibold ${plData.sold_units_summary.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {plData.sold_units_summary.count} unit(s) · Profit PKR {fmt(plData.sold_units_summary.profit)} ({plData.sold_units_summary.margin_pct}%)
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-gray-600 font-medium">Date</th>
                        <th className="px-3 py-2.5 text-left text-gray-600 font-medium">Project</th>
                        <th className="px-3 py-2.5 text-left text-gray-600 font-medium">Unit</th>
                        <th className="px-3 py-2.5 text-left text-gray-600 font-medium">Customer</th>
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium">Sale Price</th>
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium">Collected</th>
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium">Cost Share</th>
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium">Profit</th>
                        <th className="px-3 py-2.5 text-right text-gray-600 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!plData.sold_units?.length ? (
                        <tr>
                          <td colSpan={9} className="text-center text-gray-400 py-10">No sold units in this period.</td>
                        </tr>
                      ) : (
                        plData.sold_units.map((u) => (
                          <tr key={u.sale_id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">{String(u.sale_date).slice(0, 10)}</td>
                            <td className="px-3 py-2">{u.project_name}</td>
                            <td className="px-3 py-2 font-medium">
                              {u.unit_number}
                              {u.unit_type ? <span className="text-xs text-gray-400 ml-1">{u.unit_type}</span> : null}
                            </td>
                            <td className="px-3 py-2">{u.customer_name}</td>
                            <td className="px-3 py-2 text-right font-mono">{fmt(u.sale_price)}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">{fmt(u.collected)}</td>
                            <td className="px-3 py-2 text-right font-mono text-red-600">{fmt(u.allocated_cost)}</td>
                            <td className={`px-3 py-2 text-right font-mono font-semibold ${u.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {u.profit >= 0 ? '+' : ''}{fmt(u.profit)}
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${u.margin_pct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {u.margin_pct}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {plData.sold_units_summary && plData.sold_units?.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={4} className="px-3 py-2.5 font-semibold text-slate-700">
                            Totals ({plData.sold_units_summary.count} sold)
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold">{fmt(plData.sold_units_summary.sale_price)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold">{fmt(plData.sold_units_summary.collected)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-red-700">{fmt(plData.sold_units_summary.allocated_cost)}</td>
                          <td className={`px-3 py-2.5 text-right font-mono font-semibold ${plData.sold_units_summary.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {plData.sold_units_summary.profit >= 0 ? '+' : ''}{fmt(plData.sold_units_summary.profit)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold">{plData.sold_units_summary.margin_pct}%</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Partners Equity (50:50) ─── */}
          {tab === 'partners-equity' && partnersEquity && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-5">
                <div className="flex flex-wrap justify-between gap-2 items-start mb-4">
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg">Trailing Partners Equity</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Only partners with remaining capital (bank opening JE + equity receipts still on file).
                      Deleted equity sources/receipts are excluded. Sharing:{' '}
                      <span className="font-semibold text-slate-700">
                        {partnersEquity.sharing.mode === '50:50'
                          ? '50:50 (two partners)'
                          : partnersEquity.sharing.mode === 'equal'
                            ? `Equal (${partnersEquity.sharing.share_pct}% each)`
                            : 'Add equity against two partner banks'}
                      </span>
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    As of: {partnersEquity.as_of || 'All time'}
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Owner Equity (3000)</p>
                    <p className="font-bold text-slate-800">{fmtFull(partnersEquity.owner_equity)}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${partnersEquity.net_income >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-slate-500">Net Profit / Loss</p>
                    <p className={`font-bold ${partnersEquity.net_income >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {partnersEquity.net_income >= 0 ? '+' : ''}{fmtFull(partnersEquity.net_income)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600">Total Trailing Equity</p>
                    <p className="font-bold text-blue-800">{fmtFull(partnersEquity.total_trailing_equity)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-600">Partner</th>
                        <th className="px-4 py-3 text-right text-gray-600">Share</th>
                        <th className="px-4 py-3 text-right text-gray-600">Opening</th>
                        <th className="px-4 py-3 text-right text-gray-600">Equity Receipts</th>
                        <th className="px-4 py-3 text-right text-gray-600">Capital In</th>
                        <th className="px-4 py-3 text-right text-gray-600">Profit Share</th>
                        <th className="px-4 py-3 text-right text-gray-600">Trailing Equity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnersEquity.partners.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-gray-400 py-10">
                            No partners with capital. Record equity receipts (or bank openings) for two partner banks — deleted equity no longer appears.
                          </td>
                        </tr>
                      ) : (
                        partnersEquity.partners.map((p) => (
                          <tr key={p.bank_account_id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800">{p.partner_name}</p>
                              {p.bank_name && <p className="text-xs text-gray-400">{p.bank_name}</p>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{p.share_pct}%</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(p.capital_opening)}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(p.capital_contributed)}</td>
                            <td className="px-4 py-3 text-right font-mono font-medium">{fmt(p.capital_in)}</td>
                            <td className={`px-4 py-3 text-right font-mono ${p.profit_share >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {p.profit_share >= 0 ? '+' : ''}{fmt(p.profit_share)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-800">
                              {fmt(p.trailing_equity)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {partnersEquity.partners.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2">
                        <tr>
                          <td className="px-4 py-3 font-semibold" colSpan={2}>Totals</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            {fmt(partnersEquity.partners.reduce((s, p) => s + p.capital_opening, 0))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            {fmt(partnersEquity.partners.reduce((s, p) => s + p.capital_contributed, 0))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(partnersEquity.total_capital)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-semibold ${partnersEquity.net_income >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {partnersEquity.net_income >= 0 ? '+' : ''}{fmt(partnersEquity.net_income)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-800">
                            {fmt(partnersEquity.total_trailing_equity)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Cashflow Report ─── */}
          {tab === 'cashflow' && cashflowData && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-bold text-gray-800 text-lg">Project Cash Position</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedProject
                      ? projects.find((p) => p.id === selectedProject)?.name ?? 'Selected project'
                      : 'All projects'}
                    {' · '}
                    Actual cash plus outstanding items due within the selected dates.
                  </p>
                </div>
                {!dateFrom && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Select a From date to calculate an opening cash balance.
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  {
                    label: 'Opening Cash',
                    value: cashflowData.summary.opening_cash,
                    color: 'text-blue-700',
                  },
                  {
                    label: 'Actual Closing',
                    value: cashflowData.summary.actual_closing_cash,
                    color: cashflowData.summary.actual_closing_cash >= 0 ? 'text-blue-700' : 'text-red-700',
                  },
                  {
                    label: 'Due Receivables',
                    value: cashflowData.summary.due_receivables,
                    color: 'text-green-700',
                  },
                  {
                    label: 'Due Payables',
                    value: cashflowData.summary.due_payables,
                    color: 'text-red-700',
                  },
                  {
                    label: 'Expected Closing',
                    value: cashflowData.summary.expected_closing_cash,
                    color: cashflowData.summary.expected_closing_cash >= 0 ? 'text-green-700' : 'text-red-700',
                  },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-slate-500">{card.label}</p>
                    <p
                      className={`font-mono font-bold text-lg mt-1 ${card.color}`}
                      title={formatPkrFull(card.value)}
                    >
                      {formatPkrThousands(card.value)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border rounded-xl px-4 py-3 text-sm text-slate-600">
                Expected Closing = Actual Closing + Due Receivables − Due Payables
                <span className={`ml-2 font-mono font-bold ${
                  cashflowData.summary.expected_net >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  (expected movement {cashflowData.summary.expected_net >= 0 ? '+' : ''}
                  {formatPkrThousands(cashflowData.summary.expected_net)})
                </span>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <p className="font-semibold text-sm text-slate-800">Actual Cash — Direct Method</p>
                  <p className="text-xs text-slate-500">Posted cash and bank receipts/payments.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      <th className="px-4 py-3 text-left text-gray-600">Period</th>
                      <th className="px-4 py-3 text-right text-gray-600">Cash Received</th>
                      <th className="px-4 py-3 text-right text-gray-600">Cash Paid</th>
                      <th className="px-4 py-3 text-right text-gray-600">Net</th>
                      <th className="px-4 py-3 text-right text-gray-600">Closing Cash</th>
                    </tr></thead>
                    <tbody>
                      {cashflowData.rows.length === 0 ? (
                        <tr><td colSpan={5} className="text-center text-gray-400 py-10">No cash transactions in this period.</td></tr>
                      ) : cashflowData.rows.map((r, i) => (
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
                    <tfoot className="bg-slate-50 border-t-2 font-semibold">
                      <tr>
                        <td className="px-4 py-3">Period totals</td>
                        <td className="px-4 py-3 text-right font-mono text-green-700">
                          {fmt(cashflowData.summary.actual_cash_in)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-red-700">
                          {fmt(cashflowData.summary.actual_cash_out)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${
                          cashflowData.summary.actual_net >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {cashflowData.summary.actual_net >= 0 ? '+' : ''}
                          {fmt(cashflowData.summary.actual_net)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-blue-800">
                          {fmt(cashflowData.summary.actual_closing_cash)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-4 py-3 border-b bg-green-50">
                    <p className="font-semibold text-sm text-green-800">Receivables Due</p>
                    <p className="text-xs text-green-700">Outstanding installment balances by due date.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr>
                        <th className="px-3 py-2 text-left text-gray-600">Due</th>
                        <th className="px-3 py-2 text-left text-gray-600">Customer / Unit</th>
                        <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                      </tr></thead>
                      <tbody>
                        {cashflowData.due_receivables.length === 0 ? (
                          <tr><td colSpan={3} className="text-center text-gray-400 py-8">No receivables due in this period.</td></tr>
                        ) : cashflowData.due_receivables.map((r) => (
                          <tr key={r.installment_id} className="border-t">
                            <td className="px-3 py-2">{r.due_date}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{r.party_name}</p>
                              <p className="text-xs text-slate-400">
                                {r.project_name} · Unit {r.unit_number}
                              </p>
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
                  <div className="px-4 py-3 border-b bg-red-50">
                    <p className="font-semibold text-sm text-red-800">Payables Due</p>
                    <p className="text-xs text-red-700">Outstanding project bills by due date.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr>
                        <th className="px-3 py-2 text-left text-gray-600">Due</th>
                        <th className="px-3 py-2 text-left text-gray-600">Party / Category</th>
                        <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                      </tr></thead>
                      <tbody>
                        {cashflowData.due_payables.length === 0 ? (
                          <tr><td colSpan={3} className="text-center text-gray-400 py-8">No payables due in this period.</td></tr>
                        ) : cashflowData.due_payables.map((r) => (
                          <tr key={r.expense_id} className="border-t">
                            <td className="px-3 py-2">{r.due_date}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{r.party_name}</p>
                              <p className="text-xs text-slate-400">
                                {r.project_name} · {r.category}
                              </p>
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
            </div>
          )}

          {/* ─── Project Payables (unpaid bills) ─── */}
          {tab === 'payables' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Outstanding project bills (Unpaid / Partial). Amounts in thousands (K). Hover a figure for the full PKR amount.
              </p>
              <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left text-gray-600">Project</th>
                    <th className="px-4 py-3 text-left text-gray-600">Party</th>
                    <th className="px-4 py-3 text-left text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-gray-600">Due Date</th>
                    <th className="px-4 py-3 text-left text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-gray-600">Bill Amount</th>
                    <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                    <th className="px-4 py-3 text-right text-gray-600">Balance Due</th>
                  </tr></thead>
                  <tbody>
                    {payablesData.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-gray-400 py-10">No outstanding project bills.</td></tr>
                    ) : payablesData.map(r => {
                      const overdue = !!(r.due_date && r.due_date < new Date().toISOString().slice(0, 10));
                      return (
                      <tr key={r.expense_id || `${r.project_id}-${r.party_name}-${r.category}`} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.project_name}</td>
                        <td className="px-4 py-3">
                          <div>{r.party_name || r.supplier_name}</div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">
                            {r.vendor_type || 'OTHER'}
                            {r.phone ? ` · ${r.phone}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.category || '—'}</td>
                        <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                          {r.due_date || r.expense_date || '—'}
                          {overdue && <span className="block text-[10px] uppercase tracking-wide">Overdue</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            r.status === 'Partial' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono" title={formatPkrFull(r.amount ?? r.total_ordered)}>
                          {formatPkrThousands(r.amount ?? r.total_ordered)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-600" title={formatPkrFull(r.paid_amount ?? r.total_paid)}>
                          {formatPkrThousands(r.paid_amount ?? r.total_paid)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-bold ${r.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}
                          title={formatPkrFull(r.balance_due)}
                        >
                          {formatPkrThousands(r.balance_due)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                  {payablesData.length > 0 && (() => {
                    const totAmount = payablesData.reduce((s, r) => s + (r.amount ?? r.total_ordered), 0);
                    const totPaid = payablesData.reduce((s, r) => s + (r.paid_amount ?? r.total_paid), 0);
                    const totDue = payablesData.reduce((s, r) => s + r.balance_due, 0);
                    return (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-slate-700">
                            Total ({payablesData.length} bill{payablesData.length !== 1 ? 's' : ''})
                          </td>
                          <td className="px-4 py-3 text-right font-mono" title={formatPkrFull(totAmount)}>
                            {formatPkrThousands(totAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-green-700" title={formatPkrFull(totPaid)}>
                            {formatPkrThousands(totPaid)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-red-700" title={formatPkrFull(totDue)}>
                            {formatPkrThousands(totDue)}
                          </td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
              </div>
            </div>
          )}

          {/* ─── Customer Receivables ─── */}
          {tab === 'receivables' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Amounts in thousands (K). Hover a figure for the full PKR amount.</p>
              {receivablesData.some(r => r.overdue > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  ⚠️ {receivablesData.filter(r => r.overdue > 0).length} customer(s) have overdue payments totalling{' '}
                  <span title={formatPkrFull(receivablesData.reduce((s, r) => s + r.overdue, 0))}>
                    {formatPkrThousands(receivablesData.reduce((s, r) => s + r.overdue, 0))}
                  </span>
                </div>
              )}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      <th className="px-4 py-3 text-left text-gray-600">Customer</th>
                      <th className="px-4 py-3 text-left text-gray-600">Project</th>
                      <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                      <th className="px-4 py-3 text-right text-gray-600">Total Due</th>
                      <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                      <th className="px-4 py-3 text-right text-gray-600">Balance</th>
                      <th className="px-4 py-3 text-right text-gray-600">Overdue</th>
                    </tr></thead>
                    <tbody>
                      {receivablesData.length === 0 ? (
                        <tr><td colSpan={7} className="text-center text-gray-400 py-10">No outstanding receivables.</td></tr>
                      ) : receivablesData.map(r => (
                        <tr key={`${r.customer_id}-${r.sale_id}`} className={`border-t hover:bg-gray-50 ${r.overdue > 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 font-medium">{r.customer_name}<br/><span className="text-xs text-gray-400">{r.phone}</span></td>
                          <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={r.project_name}>
                            {r.project_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">Unit {r.unit_number}</td>
                          <td className="px-4 py-3 text-right font-mono" title={formatPkrFull(r.total_due)}>
                            {formatPkrThousands(r.total_due)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-green-600" title={formatPkrFull(r.total_paid)}>
                            {formatPkrThousands(r.total_paid)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-700" title={formatPkrFull(r.balance)}>
                            {formatPkrThousands(r.balance)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-bold ${r.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}
                            title={r.overdue > 0 ? formatPkrFull(r.overdue) : undefined}
                          >
                            {r.overdue > 0 ? formatPkrThousands(r.overdue) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {receivablesData.length > 0 && (() => {
                      const totDue = receivablesData.reduce((s, r) => s + r.total_due, 0);
                      const totPaid = receivablesData.reduce((s, r) => s + r.total_paid, 0);
                      const totBal = receivablesData.reduce((s, r) => s + r.balance, 0);
                      const totOver = receivablesData.reduce((s, r) => s + r.overdue, 0);
                      return (
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-slate-700">
                              Total ({receivablesData.length} sale{receivablesData.length !== 1 ? 's' : ''})
                            </td>
                            <td className="px-4 py-3 text-right font-mono" title={formatPkrFull(totDue)}>
                              {formatPkrThousands(totDue)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-green-700" title={formatPkrFull(totPaid)}>
                              {formatPkrThousands(totPaid)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-blue-800" title={formatPkrFull(totBal)}>
                              {formatPkrThousands(totBal)}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono ${totOver > 0 ? 'text-red-700' : 'text-gray-400'}`} title={formatPkrFull(totOver)}>
                              {totOver > 0 ? formatPkrThousands(totOver) : '-'}
                            </td>
                          </tr>
                        </tfoot>
                      );
                    })()}
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
