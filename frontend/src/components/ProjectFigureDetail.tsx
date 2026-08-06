import { useEffect, useState } from 'react';
import Modal from './Modal';
import { formatDate } from '../utils/date';
import type { Project } from '../api/projects';
import { getExpenses } from '../api/expenses';
import type { Expense } from '../api/expenses';
import { getPayments } from '../api/labour';
import type { LabourPayment } from '../api/labour';
import { getIssues } from '../api/inventory';
import type { MaterialIssue } from '../api/inventory';
import { getSales, getSale } from '../api/sales';
import type { Sale, SaleInstallment } from '../api/sales';

export type FigureKind =
  | 'budget'
  | 'target_sale'
  | 'accrued'
  | 'paid'
  | 'sales'
  | 'collected'
  | 'profit';

const TITLES: Record<FigureKind, string> = {
  budget: 'Budget',
  target_sale: 'Target Sale',
  accrued: 'Accrued Cost',
  paid: 'Actual Paid',
  sales: 'Sales',
  collected: 'Actual Collected',
  profit: 'Profit',
};

interface Props {
  project: Project;
  kind: FigureKind;
  onClose: () => void;
}

function money(n: number) {
  return `PKR ${n.toLocaleString()}`;
}

export default function ProjectFigureDetail({ project, kind, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labour, setLabour] = useState<LabourPayment[]>([]);
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [collections, setCollections] = useState<
    Array<SaleInstallment & { sale_label: string; customer?: string }>
  >([]);

  const title =
    kind === 'profit'
      ? Number(project.computed?.sold_value ?? 0) > 0
        ? 'Profit'
        : 'Expected Profit'
      : TITLES[kind];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (kind === 'accrued' || kind === 'paid' || kind === 'profit') {
          const [ex, lp, mi] = await Promise.all([
            getExpenses({ project_id: project.id }),
            getPayments(project.id),
            getIssues({ project_id: project.id }),
          ]);
          if (cancelled) return;
          setExpenses(ex);
          setLabour(lp);
          setIssues(mi);
        }
        if (kind === 'sales' || kind === 'collected' || kind === 'profit') {
          const list = await getSales(project.id);
          if (cancelled) return;
          setSales(list.filter((s) => s.status !== 'Cancelled'));
        }
        if (kind === 'collected') {
          const list = await getSales(project.id);
          const active = list.filter((s) => s.status !== 'Cancelled');
          const full = await Promise.all(active.map((s) => getSale(s.id)));
          if (cancelled) return;
          const rows: Array<SaleInstallment & { sale_label: string; customer?: string }> = [];
          for (const s of full) {
            for (const i of s.installments ?? []) {
              if (Number(i.paid_amount) > 0.009) {
                rows.push({
                  ...i,
                  sale_label: `S-${s.id.slice(-6).toUpperCase()}`,
                  customer: s.customer?.name,
                });
              }
            }
          }
          rows.sort((a, b) => String(a.paid_date || '').localeCompare(String(b.paid_date || '')));
          setCollections(rows);
          setSales(active);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, kind]);

  const accruedExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const paidExpense = expenses.reduce((s, e) => s + Number(e.paid_amount || 0), 0);
  const labourTotal = labour.reduce((s, p) => s + Number(p.amount || 0), 0);
  const materialTotal = issues.reduce((s, i) => s + Number(i.total_cost || 0), 0);
  const soldTotal = Number(project.computed?.sold_value ?? 0);
  const accruedTotal = Number(project.computed?.total_spent ?? 0);
  const target = Number(project.target_sale_price ?? 0);
  const profit =
    soldTotal > 0 ? soldTotal - accruedTotal : target > 0 ? target - accruedTotal : null;

  return (
    <Modal
      title={`${title} — ${project.name}`}
      onClose={onClose}
      size="xl"
      mode="view"
    >
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {(kind === 'budget' || kind === 'target_sale') && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Budget</p>
                    <p className="font-semibold">
                      {project.total_estimated_budget
                        ? money(Number(project.total_estimated_budget))
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Target Sale</p>
                    <p className="font-semibold">
                      {project.target_sale_price
                        ? money(Number(project.target_sale_price))
                        : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {kind === 'budget'
                    ? 'Planned total cost to deliver this project (not cash paid).'
                    : 'Expected selling / exit price for this project.'}
                </p>
              </div>
            )}

            {(kind === 'accrued' || kind === 'paid') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">
                      {kind === 'accrued' ? 'Expenses (full)' : 'Expenses paid'}
                    </p>
                    <p className="font-semibold text-red-600">
                      {money(kind === 'accrued' ? accruedExpense : paidExpense)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Labour</p>
                    <p className="font-semibold text-red-600">{money(labourTotal)}</p>
                  </div>
                  {kind === 'accrued' && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Material issues</p>
                      <p className="font-semibold text-slate-700">{money(materialTotal)}</p>
                    </div>
                  )}
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="font-semibold text-red-700">
                      {money(
                        kind === 'accrued'
                          ? accruedExpense + labourTotal + materialTotal
                          : paidExpense + labourTotal,
                      )}
                    </p>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Expenses
                </p>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">Date</th>
                        <th className="px-3 py-2 text-left text-gray-600">Mode</th>
                        <th className="px-3 py-2 text-left text-gray-600">Category</th>
                        <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                        <th className="px-3 py-2 text-right text-gray-600">Paid</th>
                        <th className="px-3 py-2 text-left text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                            No expenses
                          </td>
                        </tr>
                      ) : (
                        expenses.map((e) => (
                          <tr key={e.id} className="border-t">
                            <td className="px-3 py-2">{formatDate(e.expense_date)}</td>
                            <td className="px-3 py-2 text-xs">{e.entry_mode}</td>
                            <td className="px-3 py-2">{e.category}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {Number(e.amount).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-red-600">
                              {Number(e.paid_amount).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs">{e.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {labour.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Labour payments
                    </p>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-sm min-w-[480px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Date</th>
                            <th className="px-3 py-2 text-left text-gray-600">Contractor</th>
                            <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {labour.map((p) => (
                            <tr key={p.id} className="border-t">
                              <td className="px-3 py-2">{formatDate(p.payment_date)}</td>
                              <td className="px-3 py-2">{p.contractor?.name ?? '—'}</td>
                              <td className="px-3 py-2 text-right font-mono text-red-600">
                                {Number(p.amount).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {kind === 'accrued' && issues.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Material issues
                    </p>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-sm min-w-[480px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Date</th>
                            <th className="px-3 py-2 text-left text-gray-600">Ref</th>
                            <th className="px-3 py-2 text-right text-gray-600">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {issues.map((i) => (
                            <tr key={i.id} className="border-t">
                              <td className="px-3 py-2">{formatDate(i.issue_date)}</td>
                              <td className="px-3 py-2 text-xs">{i.reference_no || i.id}</td>
                              <td className="px-3 py-2 text-right font-mono">
                                {Number(i.total_cost).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {kind === 'paid' && (
                  <p className="text-xs text-slate-500">
                    Actual Paid excludes unpaid bill balances (uses expense paid amounts only).
                  </p>
                )}
              </div>
            )}

            {kind === 'sales' && (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-slate-400">Total sales value</p>
                  <p className="font-semibold text-green-700">{money(soldTotal)}</p>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">Sale</th>
                        <th className="px-3 py-2 text-left text-gray-600">Customer</th>
                        <th className="px-3 py-2 text-left text-gray-600">Unit</th>
                        <th className="px-3 py-2 text-left text-gray-600">Date</th>
                        <th className="px-3 py-2 text-right text-gray-600">Price</th>
                        <th className="px-3 py-2 text-right text-gray-600">Collected</th>
                        <th className="px-3 py-2 text-left text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                            No sales
                          </td>
                        </tr>
                      ) : (
                        sales.map((s) => (
                          <tr key={s.id} className="border-t">
                            <td className="px-3 py-2 font-medium text-blue-600">
                              S-{s.id.slice(-6).toUpperCase()}
                            </td>
                            <td className="px-3 py-2">{s.customer?.name ?? '—'}</td>
                            <td className="px-3 py-2">{s.property_unit?.unit_number ?? '—'}</td>
                            <td className="px-3 py-2">{formatDate(s.sale_date)}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {Number(s.total_sale_price).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-green-600">
                              {Number(s.total_paid).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs">{s.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {kind === 'collected' && (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-slate-400">Total collected</p>
                  <p className="font-semibold text-green-700">
                    {money(Number(project.computed?.total_collected ?? 0))}
                  </p>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">Paid Date</th>
                        <th className="px-3 py-2 text-left text-gray-600">Sale</th>
                        <th className="px-3 py-2 text-left text-gray-600">Customer</th>
                        <th className="px-3 py-2 text-left text-gray-600">Due Date</th>
                        <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                            No collections recorded
                          </td>
                        </tr>
                      ) : (
                        collections.map((c) => (
                          <tr key={c.id} className="border-t">
                            <td className="px-3 py-2 font-medium">
                              {c.paid_date ? formatDate(c.paid_date) : '—'}
                            </td>
                            <td className="px-3 py-2 text-blue-600">{c.sale_label}</td>
                            <td className="px-3 py-2">{c.customer ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{formatDate(c.due_date)}</td>
                            <td className="px-3 py-2 text-right font-mono text-green-600">
                              {Number(c.paid_amount).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {kind === 'profit' && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">
                      {soldTotal > 0 ? 'Sales' : 'Target Sale'}
                    </p>
                    <p className="font-semibold text-green-700">
                      {money(soldTotal > 0 ? soldTotal : target)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Accrued Cost</p>
                    <p className="font-semibold text-slate-700">{money(accruedTotal)}</p>
                  </div>
                  <div className="col-span-2 bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">
                      {soldTotal > 0 ? 'Profit' : 'Expected Profit'}
                    </p>
                    <p
                      className={`font-semibold text-lg ${
                        profit != null && profit >= 0 ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {profit == null ? '—' : money(profit)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {soldTotal > 0
                        ? 'Sales − Accrued Cost'
                        : 'Target Sale − Accrued Cost (expected)'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
