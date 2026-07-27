import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../../api/projects';
import { getFundSources } from '../../api/funds';
import type { FundSource } from '../../api/funds';
import { getProjectUtilization, getIssues, getStockSummary } from '../../api/inventory';
import type { ProjectUtilization, MaterialIssue, StockSummary } from '../../api/inventory';
import { getPurchaseOrders, getProcurementReceipts } from '../../api/procurement';
import type { PurchaseOrder, MaterialReceipt } from '../../api/procurement';
import {
  getAttendance,
  getPayments,
  getContractors,
  getWages,
  getAdvances,
} from '../../api/labour';
import type {
  LabourAttendance,
  LabourPayment,
  LabourContractor,
  LabourWageRow,
  LabourAdvance,
} from '../../api/labour';
import { getExpenses } from '../../api/expenses';
import type { Expense } from '../../api/expenses';
import { getSales, getSale } from '../../api/sales';
import type { Sale } from '../../api/sales';

export type WorkspaceTab =
  | 'construction'
  | 'funding'
  | 'inventory'
  | 'procurement'
  | 'labour'
  | 'expenses'
  | 'sales'
  | 'profitability';

function fmt(n: number) {
  return `PKR ${n.toLocaleString()}`;
}

function PanelLoading() {
  return (
    <div className="flex justify-center py-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-slate-400 py-6 text-center">{children}</p>;
}

function SectionCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetricRow({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
      {items.map((m) => (
        <div key={m.label} className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{m.label}</p>
          <p className={`text-sm font-bold mt-0.5 ${m.tone || 'text-slate-800'}`}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProjectWorkspacePanels({
  tab,
  projectId,
  project,
}: {
  tab: WorkspaceTab;
  projectId: string;
  project: Project;
}) {
  if (tab === 'construction') return null;
  if (tab === 'funding') return <FundingPanel projectId={projectId} />;
  if (tab === 'inventory') return <InventoryPanel projectId={projectId} />;
  if (tab === 'procurement') return <ProcurementPanel projectId={projectId} />;
  if (tab === 'labour') return <LabourPanel projectId={projectId} />;
  if (tab === 'expenses') return <ExpensesPanel projectId={projectId} />;
  if (tab === 'sales') return <SalesPanel projectId={projectId} project={project} />;
  if (tab === 'profitability') return <ProfitabilityPanel projectId={projectId} project={project} />;
  return null;
}

function FundingPanel({ projectId }: { projectId: string }) {
  const [sources, setSources] = useState<FundSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getFundSources({ project_id: projectId })
      .then(setSources)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const active = sources.filter((s) => s.status !== 'Cancelled');
  const committed = active.reduce((s, x) => s + Number(x.total_committed || 0), 0);
  const received = active.reduce((s, x) => s + Number(x.received_so_far || 0), 0);

  if (loading) return <PanelLoading />;
  return (
    <SectionCard title="Funding">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <MetricRow
        items={[
          { label: 'Committed Funds', value: fmt(committed) },
          { label: 'Received Funds', value: fmt(received), tone: 'text-emerald-700' },
          { label: 'Sources', value: String(active.length) },
        ]}
      />
      {active.length === 0 ? (
        <Empty>No fund sources linked to this project.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b">
                <th className="py-2 pr-2">Source</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2 text-right">Committed</th>
                <th className="py-2 pr-2 text-right">Received</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="py-2 pr-2 font-medium">{s.source_name}</td>
                  <td className="py-2 pr-2 text-slate-600">{s.source_type}</td>
                  <td className="py-2 pr-2 text-right font-mono">{fmt(Number(s.total_committed))}</td>
                  <td className="py-2 pr-2 text-right font-mono text-emerald-700">{fmt(Number(s.received_so_far))}</td>
                  <td className="py-2 text-xs">{s.status.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function InventoryPanel({ projectId }: { projectId: string }) {
  const [util, setUtil] = useState<ProjectUtilization | null>(null);
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [stock, setStock] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getProjectUtilization(projectId),
      getIssues({ project_id: projectId }),
      getStockSummary(projectId),
    ])
      .then(([u, i, s]) => {
        setUtil(u);
        setIssues(i);
        setStock(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <PanelLoading />;
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <SectionCard title="Inventory">
        <MetricRow
          items={[
            { label: 'Material Cost', value: fmt(util?.total_material_cost ?? 0), tone: 'text-red-700' },
            { label: 'Materials Used', value: String(util?.by_material?.length ?? 0) },
            { label: 'Issue Lines', value: String(issues.length) },
          ]}
        />
        {!util?.by_material?.length ? (
          <Empty>No materials issued to this project.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 pr-2">Material</th>
                  <th className="py-2 pr-2 text-right">Qty</th>
                  <th className="py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {util.by_material.map((m) => (
                  <tr key={m.material_id} className="border-b border-slate-50">
                    <td className="py-2 pr-2">{m.material_name}</td>
                    <td className="py-2 pr-2 text-right font-mono">{m.total_qty} {m.unit}</td>
                    <td className="py-2 text-right font-mono">{fmt(m.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      <SectionCard title="Current Stock (project-linked)">
        {stock.length === 0 ? (
          <Empty>No stock rows for this project filter.</Empty>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 pr-2">Material</th>
                  <th className="py-2 pr-2 text-right">Stock</th>
                  <th className="py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {stock.slice(0, 40).map((s) => (
                  <tr key={s.material_id || s.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2">{s.material_name || s.name}</td>
                    <td className="py-2 pr-2 text-right font-mono">{s.current_stock}</td>
                    <td className="py-2 text-right font-mono">{fmt(Number(s.stock_value || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function ProcurementPanel({ projectId }: { projectId: string }) {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<MaterialReceipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPurchaseOrders(projectId),
      getProcurementReceipts(),
      getExpenses({ project_id: projectId, entry_mode: 'BILL' }),
    ])
      .then(([p, r, e]) => {
        setPos(p);
        const poIds = new Set(p.map((x) => String(x.id)));
        setReceipts(r.filter((x) => poIds.has(String(x.purchase_order_id))));
        setExpenses(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const balances = useMemo(() => {
    const map = new Map<string, { supplier_id: string; unpaid: number }>();
    for (const e of expenses) {
      if (!e.supplier_id) continue;
      if (e.status === 'Paid') continue;
      const unpaid = Number(e.amount) - Number(e.paid_amount || 0);
      if (unpaid <= 0.009) continue;
      const cur = map.get(e.supplier_id) || { supplier_id: e.supplier_id, unpaid: 0 };
      cur.unpaid += unpaid;
      map.set(e.supplier_id, cur);
    }
    return [...map.values()];
  }, [expenses]);

  if (loading) return <PanelLoading />;
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <SectionCard title="Purchase Orders">
        {pos.length === 0 ? (
          <Empty>No purchase orders for this project.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2">{po.order_date}</td>
                    <td className="py-2 pr-2">{po.status}</td>
                    <td className="py-2 text-right font-mono">{fmt(Number(po.total_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      <SectionCard title="Receipts">
        {receipts.length === 0 ? (
          <Empty>No receipts for this project’s POs.</Empty>
        ) : (
          <ul className="space-y-1 text-sm">
            {receipts.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-slate-50 py-1.5">
                <span>PO #{r.purchase_order_id} · {r.receipt_date}</span>
                <span className="text-xs text-slate-500">{r.notes || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="Supplier Balances (unpaid bills)">
        {balances.length === 0 ? (
          <Empty>No unpaid supplier bills on this project.</Empty>
        ) : (
          <ul className="space-y-1 text-sm">
            {balances.map((b) => (
              <li key={b.supplier_id} className="flex justify-between border-b border-slate-50 py-1.5">
                <span>Supplier #{b.supplier_id}</span>
                <span className="font-mono text-amber-700">{fmt(b.unpaid)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function LabourPanel({ projectId }: { projectId: string }) {
  const [attendance, setAttendance] = useState<LabourAttendance[]>([]);
  const [payments, setPayments] = useState<LabourPayment[]>([]);
  const [contractors, setContractors] = useState<LabourContractor[]>([]);
  const [wages, setWages] = useState<LabourWageRow[]>([]);
  const [advances, setAdvances] = useState<LabourAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAttendance(projectId),
      getPayments(projectId),
      getContractors(),
      getWages(projectId),
      getAdvances(projectId),
    ])
      .then(([a, p, c, w, adv]) => {
        setAttendance(a);
        setPayments(p);
        setContractors(c);
        setWages(w);
        setAdvances(adv);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const contractorIds = useMemo(() => {
    const ids = new Set<string>();
    attendance.forEach((x) => ids.add(x.contractor_id));
    payments.forEach((x) => ids.add(x.contractor_id));
    advances.forEach((x) => ids.add(x.contractor_id));
    return ids;
  }, [attendance, payments, advances]);

  const onProject = contractors.filter((c) => contractorIds.has(c.id));

  if (loading) return <PanelLoading />;
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <SectionCard title="Contractors">
        {onProject.length === 0 ? <Empty>No contractors recorded on this project.</Empty> : (
          <ul className="text-sm space-y-1">
            {onProject.map((c) => (
              <li key={c.id} className="flex justify-between border-b border-slate-50 py-1.5">
                <span>{c.name}</span>
                <span className="text-xs text-slate-500">{c.contractor_type || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="Attendance">
        {attendance.length === 0 ? <Empty>No attendance records.</Empty> : (
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Contractor</th>
                  <th className="py-2 text-right">Days</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 30).map((a) => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2">{a.attendance_date}</td>
                    <td className="py-2 pr-2">{a.contractor?.name || a.contractor_id}</td>
                    <td className="py-2 text-right font-mono">{a.present_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      <SectionCard title="Wages">
        {wages.length === 0 ? <Empty>No wage summary.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 pr-2">Contractor</th>
                  <th className="py-2 pr-2 text-right">Gross</th>
                  <th className="py-2 text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {wages.map((w) => (
                  <tr key={w.contractor_id} className="border-b border-slate-50">
                    <td className="py-2 pr-2">{w.contractor_name}</td>
                    <td className="py-2 pr-2 text-right font-mono">{fmt(w.gross_wages)}</td>
                    <td className="py-2 text-right font-mono">{fmt(w.total_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      <SectionCard title="Advances">
        {advances.length === 0 ? <Empty>No advances.</Empty> : (
          <ul className="text-sm space-y-1">
            {advances.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-slate-50 py-1.5">
                <span>{a.contractor?.name || a.contractor_id} · {a.advance_date}</span>
                <span className="font-mono">{fmt(Number(a.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

const EXPENSE_FOCUS = ['Fuel', 'Transport', 'Utilities', 'Equipment Rental'];

function ExpensesPanel({ projectId }: { projectId: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getExpenses({ project_id: projectId })
      .then(setExpenses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    }
    return map;
  }, [expenses]);

  if (loading) return <PanelLoading />;
  return (
    <SectionCard title="Expenses">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <MetricRow
        items={EXPENSE_FOCUS.map((c) => ({
          label: c === 'Equipment Rental' ? 'Equipment Rent' : c,
          value: fmt(byCat.get(c) || 0),
          tone: 'text-red-700',
        }))}
      />
      {expenses.length === 0 ? (
        <Empty>No expenses for this project.</Empty>
      ) : (
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-50">
                  <td className="py-2 pr-2">{e.expense_date}</td>
                  <td className="py-2 pr-2">{e.category}</td>
                  <td className="py-2 pr-2 text-xs">{e.status}</td>
                  <td className="py-2 text-right font-mono">{fmt(Number(e.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function SalesPanel({ projectId, project }: { projectId: string; project: Project }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [details, setDetails] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getSales(projectId)
      .then(async (list) => {
        setSales(list);
        const full = await Promise.all(list.slice(0, 20).map((s) => getSale(s.id).catch(() => s)));
        setDetails(full);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <PanelLoading />;
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {project.sold_as_is && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-900">
          Sold As-Is to <strong>{project.sold_buyer_name || '—'}</strong>
          {project.sold_at ? ` on ${project.sold_at}` : ''}
          {project.sold_price != null && project.sold_price !== ''
            ? ` · ${fmt(Number(project.sold_price))}`
            : ''}
        </div>
      )}
      <SectionCard title="Sales">
        {sales.length === 0 && !project.sold_as_is ? (
          <Empty>No unit sales for this project.</Empty>
        ) : (
          <div className="space-y-4">
            {details.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-100 p-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">Customer: {s.customer?.name || s.customer_id}</p>
                    <p className="text-xs text-slate-500">
                      Booking / sale date: {s.sale_date} · Unit {s.property_unit?.unit_number || s.property_unit_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Sale Price</p>
                    <p className="font-mono font-semibold">{fmt(Number(s.total_sale_price))}</p>
                    <p className="text-xs text-slate-500">Paid {fmt(Number(s.total_paid))}</p>
                  </div>
                </div>
                {(s.installments?.length || 0) > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b">
                          <th className="py-1 text-left">Due</th>
                          <th className="py-1 text-right">Amount</th>
                          <th className="py-1 text-right">Paid</th>
                          <th className="py-1 text-left pl-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.installments!.map((inst) => (
                          <tr key={inst.id} className="border-b border-slate-50">
                            <td className="py-1">{inst.due_date}</td>
                            <td className="py-1 text-right font-mono">{fmt(Number(inst.due_amount))}</td>
                            <td className="py-1 text-right font-mono">{fmt(Number(inst.paid_amount))}</td>
                            <td className="py-1 pl-2">{inst.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function ProfitabilityPanel({ projectId, project }: { projectId: string; project: Project }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [util, setUtil] = useState<ProjectUtilization | null>(null);
  const [payments, setPayments] = useState<LabourPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getExpenses({ project_id: projectId }),
      getProjectUtilization(projectId).catch(() => null),
      getPayments(projectId),
    ])
      .then(([e, u, p]) => {
        setExpenses(e);
        setUtil(u);
        setPayments(p);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const landCost = expenses
    .filter((e) => e.category === 'Land Purchase')
    .reduce((s, e) => s + Number(e.amount), 0);
  const financeCost = expenses
    .filter((e) => e.category === 'Finance')
    .reduce((s, e) => s + Number(e.amount), 0);
  const materialCost = util?.total_material_cost ?? 0;
  const labourCost = payments.reduce((s, p) => s + Number(p.amount), 0);
  const expenseCost = expenses
    .filter((e) => e.category !== 'Land Purchase' && e.category !== 'Finance' && e.category !== 'Labour')
    .reduce((s, e) => s + Number(e.amount), 0);
  const revenue = Number(project.computed?.sold_value ?? 0);
  const totalCost = landCost + materialCost + labourCost + expenseCost + financeCost;
  const net = revenue - totalCost;

  if (loading) return <PanelLoading />;
  return (
    <SectionCard title="Profitability">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="space-y-2 text-sm">
        {[
          { label: 'Land Cost', value: landCost },
          { label: 'Material Cost', value: materialCost },
          { label: 'Labour Cost', value: labourCost },
          { label: 'Expense Cost', value: expenseCost },
          { label: 'Finance Cost', value: financeCost },
        ].map((row) => (
          <div key={row.label} className="flex justify-between border-b border-slate-50 py-1.5">
            <span className="text-slate-600">{row.label}</span>
            <span className="font-mono text-red-700">{fmt(row.value)}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 border-t border-slate-200 mt-2">
          <span className="font-medium text-slate-800">Revenue</span>
          <span className="font-mono font-semibold text-emerald-700">{fmt(revenue)}</span>
        </div>
        <div className="flex justify-between py-2 bg-slate-50 rounded-lg px-3">
          <span className="font-semibold text-slate-900">Net Profit</span>
          <span className={`font-mono font-bold ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {fmt(net)}
          </span>
        </div>
      </div>
    </SectionCard>
  );
}
