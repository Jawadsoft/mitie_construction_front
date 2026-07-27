import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import ModalFormFooter from './ModalFormFooter';
import { createExpense } from '../api/expenses';
import { createCashTransaction } from '../api/cashflow';
import { collectSalePayment, getSale, getSales, recordPayment } from '../api/sales';
import type { Sale, SaleInstallment } from '../api/sales';
import type { Project, Stage } from '../api/projects';
import { getProject } from '../api/projects';
import { getBankAccounts } from '../api/accounting';
import type { BankAccount } from '../api/accounting';
import { notify, notifyError } from '../utils/toast';
import { isFormDirty } from '../hooks/useDirtyForm';
import { useRegisterUnsaved } from './ConfirmDialog';

export type QuickEntryKind = 'expense' | 'collection' | 'payment';
type CollectionMode = 'installment' | 'full';

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

type OpenSale = Sale & {
  sale_label: string;
  balance: number;
};

export default function ProjectQuickEntry({ project, kind, onClose, onSaved }: Props) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [pending, setPending] = useState<PendingInstallment[]>([]);
  const [openSales, setOpenSales] = useState<OpenSale[]>([]);
  const [collectionMode, setCollectionMode] = useState<CollectionMode>('installment');
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
    sale_id: '',
    paid_amount: '',
    paid_date: today(),
    bank_account_id: '',
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
          const [sales, bankList] = await Promise.all([getSales(project.id), getBankAccounts()]);
          const details = await Promise.all(sales.map((s) => getSale(s.id)));
          if (cancelled) return;
          setBanks(bankList);
          setCollectionForm((f) => ({
            ...f,
            bank_account_id: bankList[0]?.id ?? '',
          }));
          const rows: PendingInstallment[] = [];
          const salesOpen: OpenSale[] = [];
          for (const sale of details) {
            if (sale.status === 'Cancelled') continue;
            const label = [
              sale.customer?.name,
              sale.property_unit?.unit_number ? `Unit ${sale.property_unit.unit_number}` : null,
              `Sale #${sale.id}`,
            ]
              .filter(Boolean)
              .join(' · ');
            const saleBal =
              Math.round((Number(sale.total_sale_price) - Number(sale.total_paid)) * 100) / 100;
            if (saleBal > 0.009) {
              salesOpen.push({ ...sale, sale_label: label, balance: saleBal });
            }
            for (const inst of sale.installments ?? []) {
              const balance = Number(inst.due_amount) - Number(inst.paid_amount);
              if (balance > 0.009 && inst.status !== 'Paid') {
                rows.push({ ...inst, sale_label: label, balance });
              }
            }
          }
          setPending(rows);
          setOpenSales(salesOpen);
          setCollectionMode(rows.length > 0 ? 'installment' : 'full');
          if (rows[0]) {
            setCollectionForm((f) => ({
              ...f,
              installment_id: rows[0].id,
              sale_id: salesOpen[0]?.id ?? '',
              paid_amount: String(rows[0].balance),
            }));
          } else if (salesOpen[0]) {
            setCollectionForm((f) => ({
              ...f,
              installment_id: '',
              sale_id: salesOpen[0].id,
              paid_amount: String(salesOpen[0].balance),
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
    const amount = Number(collectionForm.paid_amount);
    if (!(amount > 0)) {
      setError('Enter a payment amount greater than 0');
      return;
    }
    if (!collectionForm.paid_date) {
      setError('Date is required');
      return;
    }

    if (collectionMode === 'installment') {
      if (!collectionForm.installment_id) {
        setError('Select an installment');
        return;
      }
      const row = pending.find((p) => p.id === collectionForm.installment_id);
      if (row && amount > row.balance + 0.009) {
        setError(`Amount exceeds installment balance (${row.balance.toLocaleString()})`);
        return;
      }
      setSaving(true);
      setError('');
      try {
        await recordPayment(
          collectionForm.installment_id,
          collectionForm.paid_amount,
          collectionForm.paid_date,
          collectionForm.bank_account_id || null,
        );
        notify.success('Collection recorded');
        onSaved();
        onClose();
      } catch (e: unknown) {
        setError(notifyError(e, 'Failed to record collection'));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!collectionForm.sale_id) {
      setError('Select a sale');
      return;
    }
    const sale = openSales.find((s) => s.id === collectionForm.sale_id);
    if (sale && amount > sale.balance + 0.009) {
      setError(`Amount exceeds sale balance due (${sale.balance.toLocaleString()})`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await collectSalePayment(
        collectionForm.sale_id,
        collectionForm.paid_amount,
        collectionForm.paid_date,
        collectionForm.bank_account_id || null,
      );
      notify.success('Full collection recorded');
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to record collection'));
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
      notify.success('Payment saved');
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to save payment'));
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

  const onSaleChange = (id: string) => {
    const sale = openSales.find((s) => s.id === id);
    setCollectionForm((f) => ({
      ...f,
      sale_id: id,
      paid_amount: sale ? String(sale.balance) : f.paid_amount,
    }));
  };

  const setMode = (mode: CollectionMode) => {
    setCollectionMode(mode);
    setError('');
    if (mode === 'installment' && pending[0]) {
      setCollectionForm((f) => ({
        ...f,
        installment_id: pending[0].id,
        paid_amount: String(pending[0].balance),
      }));
    } else if (mode === 'full' && openSales[0]) {
      setCollectionForm((f) => ({
        ...f,
        sale_id: openSales[0].id,
        paid_amount: String(openSales[0].balance),
      }));
    }
  };

  const snapshot = { expenseForm, collectionForm, paymentForm, collectionMode };
  const baselineRef = useRef<typeof snapshot | null>(null);
  if (!loadingMeta && baselineRef.current === null) {
    baselineRef.current = snapshot;
  }
  const isDirty =
    baselineRef.current != null && isFormDirty(snapshot, baselineRef.current);

  const runSave = async () => {
    if (kind === 'expense') await handleSaveExpense();
    else if (kind === 'collection') await handleSaveCollection();
    else await handleSavePayment();
  };

  useRegisterUnsaved({
    active: true,
    isDirty,
    onSave: runSave,
    onDiscard: onClose,
  });

  const saveLabel =
    kind === 'expense'
      ? expenseForm.entry_mode === 'BILL'
        ? 'Record Bill'
        : 'Save Expense'
      : kind === 'collection'
        ? 'Save Collection'
        : 'Save Payment';

  return (
    <Modal
      title={title}
      onClose={onClose}
      mode="form"
      isDirty={isDirty}
      footer={
        <ModalFormFooter
          onSave={() => void runSave()}
          saveLabel={saveLabel}
          saving={saving}
          error={error ? <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p> : null}
        />
      }
    >
      <div className="space-y-3">
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
            {openSales.length === 0 && pending.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">
                No open sales for this project. Create a sale under Sales first, then collect here.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">Collection type</p>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      disabled={pending.length === 0}
                      onClick={() => setMode('installment')}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                        collectionMode === 'installment'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Installment
                    </button>
                    <button
                      type="button"
                      disabled={openSales.length === 0}
                      onClick={() => setMode('full')}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                        collectionMode === 'full'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Full / Direct
                    </button>
                  </div>
                </div>

                {collectionMode === 'installment' ? (
                  pending.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">
                      No pending installments. Switch to Full / Direct, or add installments under Sales.
                    </p>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-between mb-2">
                        <label className="text-sm font-medium text-slate-800">Select installment</label>
                        <span className="text-xs text-slate-400">{pending.length} open</span>
                      </div>
                      <div className="max-h-52 overflow-y-auto overscroll-contain space-y-2 pr-0.5">
                        {pending.map((i) => {
                          const selected = collectionForm.installment_id === i.id;
                          return (
                            <button
                              key={i.id}
                              type="button"
                              onClick={() => onInstallmentChange(i.id)}
                              className={`w-full text-left rounded-xl border px-3.5 py-3 transition-all ${
                                selected
                                  ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-500'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium truncate ${selected ? 'text-blue-900' : 'text-slate-800'}`}>
                                    {i.sale_label}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Due {i.due_date}
                                    {i.status ? ` · ${i.status}` : ''}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`text-sm font-semibold font-mono ${selected ? 'text-blue-700' : 'text-slate-900'}`}>
                                    {i.balance.toLocaleString()}
                                  </p>
                                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Balance PKR</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <label className="text-sm font-medium text-slate-800">Select sale</label>
                      <span className="text-xs text-slate-400">{openSales.length} open</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto overscroll-contain space-y-2 pr-0.5">
                      {openSales.map((s) => {
                        const selected = collectionForm.sale_id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onSaleChange(s.id)}
                            className={`w-full text-left rounded-xl border px-3.5 py-3 transition-all ${
                              selected
                                ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`text-sm font-medium truncate ${selected ? 'text-emerald-900' : 'text-slate-800'}`}>
                                  {s.sale_label}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Sale {Number(s.total_sale_price).toLocaleString()} · Paid {Number(s.total_paid).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`text-sm font-semibold font-mono ${selected ? 'text-emerald-700' : 'text-slate-900'}`}>
                                  {s.balance.toLocaleString()}
                                </p>
                                <p className="text-[10px] uppercase tracking-wide text-slate-400">Due PKR</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Applies across open installments (earliest first). Remaining balance creates a catch-up installment if needed.
                    </p>
                  </div>
                )}

                {(collectionMode === 'installment' ? pending.length > 0 : openSales.length > 0) && (
                  <>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Date</label>
                        <input
                          type="date"
                          value={collectionForm.paid_date}
                          onChange={(e) => setCollectionForm((f) => ({ ...f, paid_date: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Amount (PKR)</label>
                        <input
                          type="number"
                          value={collectionForm.paid_amount}
                          onChange={(e) => setCollectionForm((f) => ({ ...f, paid_amount: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                        Deposit to (Cash & Bank)
                      </label>
                      <select
                        value={collectionForm.bank_account_id}
                        onChange={(e) => setCollectionForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      >
                        <option value="">Cash on hand (1000)</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {[b.bank_name, b.name].filter(Boolean).join(' — ') || `Bank #${b.id}`}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Journal debit posts to this sub-account under Cash & Bank (e.g. Jawad, Faysal).
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveCollection}
                      className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Record Collection'}
                    </button>
                  </>
                )}
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
