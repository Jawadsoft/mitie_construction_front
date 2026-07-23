import { useEffect, useState } from 'react';
import Modal from './Modal';
import { createExpense } from '../api/expenses';
import { createCashTransaction } from '../api/cashflow';
import { getSale, getSales, recordPayment } from '../api/sales';
import type { SaleInstallment } from '../api/sales';
import type { Project, Stage } from '../api/projects';
import { getProject } from '../api/projects';
import { getBankAccounts } from '../api/accounting';
import type { BankAccount } from '../api/accounting';

export type QuickEntryKind = 'expense' | 'collection' | 'payment';

interface Props {
  project: Project;
  kind: QuickEntryKind;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  'Land Purchase',
  'Materials',
  'Labour',
  'Equipment Rental',
  'Transport',
  'Utilities',
  'Administration',
  'Other',
];
const PAYMENT_TYPES = ['Cash', 'Bank Transfer', 'Cheque'];
const CASH_METHODS = ['Cash', 'Bank Transfer', 'Cheque'];

const today = () => new Date().toISOString().split('T')[0];

function needsBank(method: string) {
  return method === 'Bank Transfer' || method === 'Cheque' || method === 'Bank';
}

function bankLabel(b: BankAccount) {
  const parts = [b.name];
  if (b.bank_name) parts.push(b.bank_name);
  if (b.account_number) parts.push(`…${b.account_number.slice(-4)}`);
  return parts.join(' · ');
}

type PendingInstallment = SaleInstallment & {
  sale_label: string;
  balance: number;
};

export default function ProjectQuickEntry({ project, kind, onClose, onSaved }: Props) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [pending, setPending] = useState<PendingInstallment[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [expenseForm, setExpenseForm] = useState({
    project_stage_id: '',
    category: 'Materials',
    entry_mode: 'DIRECT' as 'DIRECT' | 'BILL',
    payment_type: 'Cash',
    bank_account_id: '',
    expense_date: today(),
    amount: '',
    description: '',
  });

  const [collectionForm, setCollectionForm] = useState({
    installment_id: '',
    paid_amount: '',
    paid_date: today(),
  });

  const [paymentForm, setPaymentForm] = useState({
    transaction_date: today(),
    amount: '',
    method: 'Cash',
    description: '',
    reference_no: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      setError('');
      try {
        if (kind === 'expense') {
          const [full, bankList] = await Promise.all([getProject(project.id), getBankAccounts()]);
          if (cancelled) return;
          const list = full.stages ?? [];
          setStages(list);
          setBanks(bankList);
          setExpenseForm((f) => ({
            ...f,
            project_stage_id: list[0]?.id ?? '',
            bank_account_id: bankList[0]?.id ?? '',
          }));
        } else if (kind === 'collection') {
          const sales = await getSales(project.id);
          const details = await Promise.all(sales.map((s) => getSale(s.id)));
          if (cancelled) return;
          const rows: PendingInstallment[] = [];
          for (const sale of details) {
            const label = [
              sale.customer?.name,
              sale.property_unit?.unit_number ? `Unit ${sale.property_unit.unit_number}` : null,
              `Sale #${sale.id}`,
            ]
              .filter(Boolean)
              .join(' · ');
            for (const inst of sale.installments ?? []) {
              const balance = Number(inst.due_amount) - Number(inst.paid_amount);
              if (balance > 0.009 && inst.status !== 'Paid') {
                rows.push({ ...inst, sale_label: label, balance });
              }
            }
          }
          setPending(rows);
          if (rows[0]) {
            setCollectionForm((f) => ({
              ...f,
              installment_id: rows[0].id,
              paid_amount: String(rows[0].balance),
            }));
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, project.id]);

  const title =
    kind === 'expense'
      ? `Quick expense — ${project.name}`
      : kind === 'collection'
        ? `Quick collection — ${project.name}`
        : `Quick payment — ${project.name}`;

  const handleSaveExpense = async () => {
    if (!expenseForm.project_stage_id) {
      setError('Add a stage to this project first, then record expenses.');
      return;
    }
    if (!expenseForm.amount || !expenseForm.category) {
      setError('Category and amount are required');
      return;
    }
    if (
      expenseForm.entry_mode === 'DIRECT' &&
      needsBank(expenseForm.payment_type) &&
      !expenseForm.bank_account_id
    ) {
      setError('Select a partner bank for Bank Transfer / Cheque');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createExpense({
        project_id: project.id,
        project_stage_id: expenseForm.project_stage_id,
        category: expenseForm.category,
        vendor_type: 'OTHER',
        entry_mode: expenseForm.entry_mode,
        payment_type: expenseForm.entry_mode === 'BILL' ? 'Credit' : expenseForm.payment_type,
        bank_account_id:
          expenseForm.entry_mode === 'DIRECT' && needsBank(expenseForm.payment_type)
            ? expenseForm.bank_account_id
            : null,
        expense_date: expenseForm.expense_date,
        amount: expenseForm.amount,
        description: expenseForm.description || null,
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCollection = async () => {
    if (!collectionForm.installment_id || !collectionForm.paid_amount) {
      setError('Select an installment and enter amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await recordPayment(
        collectionForm.installment_id,
        collectionForm.paid_amount,
        collectionForm.paid_date,
      );
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to record collection');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    if (!paymentForm.amount) {
      setError('Amount is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createCashTransaction({
        type: 'OUT',
        project_id: project.id,
        transaction_date: paymentForm.transaction_date,
        amount: paymentForm.amount,
        method: paymentForm.method,
        description: paymentForm.description || `Payment — ${project.name}`,
        reference_no: paymentForm.reference_no || null,
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const onInstallmentChange = (id: string) => {
    const row = pending.find((p) => p.id === id);
    setCollectionForm((f) => ({
      ...f,
      installment_id: id,
      paid_amount: row ? String(row.balance) : f.paid_amount,
    }));
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {loadingMeta && kind !== 'payment' ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading…</p>
        ) : kind === 'expense' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
              <select
                value={expenseForm.project_stage_id}
                onChange={(e) => setExpenseForm((f) => ({ ...f, project_stage_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- Select stage --</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {stages.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No stages yet — open project details and add a stage first.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry type *</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={expenseForm.entry_mode === 'DIRECT'}
                    onChange={() => setExpenseForm((f) => ({ ...f, entry_mode: 'DIRECT', payment_type: 'Cash' }))}
                  />
                  Pay now
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={expenseForm.entry_mode === 'BILL'}
                    onChange={() => setExpenseForm((f) => ({ ...f, entry_mode: 'BILL', payment_type: 'Credit' }))}
                  />
                  Record bill
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {expenseForm.entry_mode === 'BILL' ? 'Bill type' : 'Payment type'}
                </label>
                {expenseForm.entry_mode === 'BILL' ? (
                  <input value="Credit (AP)" disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
                ) : (
                  <select
                    value={expenseForm.payment_type}
                    onChange={(e) => setExpenseForm((f) => ({
                      ...f,
                      payment_type: e.target.value,
                      bank_account_id: needsBank(e.target.value) ? (f.bank_account_id || banks[0]?.id || '') : '',
                    }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
            </div>
            {expenseForm.entry_mode === 'DIRECT' && needsBank(expenseForm.payment_type) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay from bank *</label>
                <select
                  value={expenseForm.bank_account_id}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Select bank account --</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{bankLabel(b)}</option>)}
                </select>
                {banks.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Add a bank under Funds first.</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, expense_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveExpense}
              className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : expenseForm.entry_mode === 'BILL' ? 'Record Bill' : 'Save Expense'}
            </button>
          </>
        ) : kind === 'collection' ? (
          <>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">
                No pending installments for this project. Create a sale with installments under Sales first.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installment *</label>
                  <select
                    value={collectionForm.installment_id}
                    onChange={(e) => onInstallmentChange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {pending.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.sale_label} — due {i.due_date} — bal. {i.balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={collectionForm.paid_date}
                      onChange={(e) => setCollectionForm((f) => ({ ...f, paid_date: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR) *</label>
                    <input
                      type="number"
                      value={collectionForm.paid_amount}
                      onChange={(e) => setCollectionForm((f) => ({ ...f, paid_amount: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveCollection}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Record Collection'}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">Cash / bank payment out against this project (cashbook).</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={paymentForm.transaction_date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {CASH_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={paymentForm.description}
                onChange={(e) => setPaymentForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Vendor advance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input
                value={paymentForm.reference_no}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reference_no: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSavePayment}
              className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
