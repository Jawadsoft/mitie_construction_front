import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getPropertyUnits, createPropertyUnit, updatePropertyUnit, deletePropertyUnit,
  getSales, getSale, createSale, updateSale, deleteSale, collectSalePayment, adjustSaleCollection, updateInstallmentCollection
} from '../api/sales';
import type { Customer, PropertyUnit, Sale, SaleInstallment } from '../api/sales';
import { exportCSV, exportExcel } from '../utils/exportUtils';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getBankAccounts } from '../api/accounting';
import type { BankAccount } from '../api/accounting';
import Modal from '../components/Modal';
import ModalFormFooter from '../components/ModalFormFooter';
import StatCard from '../components/StatCard';
import DetailDrawer, { DrawerSection, DrawerField, StatusBadge } from '../components/DetailDrawer';
import { useConfirm, useRegisterUnsaved } from '../components/ConfirmDialog';
import { notify, notifyError } from '../utils/toast';
import { formatDate } from '../utils/date';
import type { NavIntent } from '../types/navIntent';
import { isFormDirty } from '../hooks/useDirtyForm';
import { useListFilters } from '../utils/navState';
import { useColumnPrefs } from '../utils/columnPrefs';
import ColumnPicker from '../components/ColumnPicker';

const SALES_TABLE_COLUMNS = [
  { id: 'id', label: 'Sale ID' },
  { id: 'customer', label: 'Customer' },
  { id: 'unit', label: 'Unit' },
  { id: 'date', label: 'Date' },
  { id: 'due', label: 'Next Due' },
  { id: 'price', label: 'Price' },
  { id: 'paid', label: 'Paid' },
  { id: 'balance', label: 'Balance' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions' },
];
const SALES_COL_IDS = SALES_TABLE_COLUMNS.map((c) => c.id);

const emptyUnitForm = {
  project_id: '',
  unit_number: '',
  unit_type: '',
  area_sqft: '',
  floor: '',
  list_price: '',
  notes: '',
};
const emptySaleForm = () => ({
  property_unit_id: '',
  customer_id: '',
  sale_date: new Date().toISOString().split('T')[0],
  total_sale_price: '',
  notes: '',
  status: 'Active',
});
const emptyInstallRow = () => ({
  id: '',
  due_date: '',
  due_amount: '',
  paid_amount: '0',
  locked: false,
});
const emptyCustForm = { name: '', phone: '', email: '', cnic: '', address: '' };

function bankLabel(b: BankAccount) {
  if (b.bank_name && b.name && b.bank_name.toLowerCase() !== b.name.toLowerCase()) {
    return `${b.bank_name} — ${b.name}`;
  }
  return b.name || b.bank_name || `Bank #${b.id}`;
}

type Tab = 'inventory' | 'sales' | 'customers' | 'collections';

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-green-100 text-green-700',
  Reserved: 'bg-yellow-100 text-yellow-700',
  Sold: 'bg-red-100 text-red-700',
  Blocked: 'bg-gray-100 text-gray-700',
  Active: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Partial: 'bg-orange-100 text-orange-700',
  Paid: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
};

export default function SalesPage({
  initialIntent,
  onIntentConsumed,
}: {
  initialIntent?: NavIntent;
  onIntentConsumed?: () => void;
} = {}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { filters, setFilter } = useListFilters('sales', ['tab', 'project']);
  const tab = (['inventory', 'sales', 'customers', 'collections'].includes(filters.tab)
    ? filters.tab
    : 'inventory') as Tab;
  const setTab = (t: Tab) => setFilter('tab', t === 'inventory' ? '' : t);
  const saleFilterProjectId = filters.project ?? '';
  const setSaleFilterProjectId = (v: string) => setFilter('project', v);
  const { visible: salesCols, isVisible: salesVis, toggle: toggleSalesCol } = useColumnPrefs(
    'sales.list.v2',
    SALES_COL_IDS,
  );
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);

  const [editingUnit, setEditingUnit] = useState<PropertyUnit | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Customer detail drawer
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [drawerCustomerSales, setDrawerCustomerSales] = useState<Sale[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Collection details modal (linked from Payment received summary)
  const [breakdownSale, setBreakdownSale] = useState<Sale | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const openCollectionDetails = async (s: Sale) => {
    setBreakdownSale(s);
    setBreakdownLoading(true);
    try {
      setBreakdownSale(await getSale(s.id));
    } catch {
      /* keep list-row summary if detail fetch fails */
    } finally {
      setBreakdownLoading(false);
    }
  };

  const openCustomerDetail = async (c: Customer) => {
    setDrawerCustomer(c);
    setDrawerLoading(true);
    try {
      const customerSales = await getSales(undefined, c.id);
      setDrawerCustomerSales(customerSales);
    } catch { setDrawerCustomerSales([]); }
    finally { setDrawerLoading(false); }
  };
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [unitBaseline, setUnitBaseline] = useState(emptyUnitForm);
  const [custForm, setCustForm] = useState(emptyCustForm);
  const [custBaseline, setCustBaseline] = useState(emptyCustForm);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [saleBaseline, setSaleBaseline] = useState(emptySaleForm());
  const [installForms, setInstallForms] = useState([emptyInstallRow()]);
  const [installBaseline, setInstallBaseline] = useState([emptyInstallRow()]);
  const [payForm, setPayForm] = useState({
    sale_id: '',
    paid_amount: '',
    paid_date: new Date().toISOString().split('T')[0],
    bank_account_id: '',
  });
  const [editForm, setEditForm] = useState({
    sale_id: '',
    total_collected: '',
    paid_date: new Date().toISOString().split('T')[0],
    bank_account_id: '',
    max: 0,
  });
  const [editInstForm, setEditInstForm] = useState<{
    installment_id: string;
    sale_id: string;
    paid_amount: string;
    paid_date: string;
    bank_account_id: string;
    max: number;
    label: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, s, c, p, b] = await Promise.all([
        getPropertyUnits(),
        getSales(),
        getCustomers(),
        getProjects(),
        getBankAccounts(),
      ]);
      setUnits(u);
      setSales(s);
      setCustomers(c);
      setProjects(p);
      setBanks(b);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!initialIntent?.action || initialIntent.action !== 'record-sale' || !initialIntent.projectId) return;
    setTab('sales');
    setSaleFilterProjectId(initialIntent.projectId);
    const nextSale = emptySaleForm();
    const nextInstall = [emptyInstallRow()];
    setSaleForm(nextSale);
    setSaleBaseline(nextSale);
    setInstallForms(nextInstall);
    setInstallBaseline(nextInstall);
    setError('');
    setEditingSale(null);
    setShowModal('sale');
    onIntentConsumed?.();
  }, [initialIntent]);

  const openEditUnit = (u: PropertyUnit) => {
    setEditingUnit(u);
    const next = {
      project_id: u.project_id,
      unit_number: u.unit_number,
      unit_type: u.unit_type ?? '',
      area_sqft: u.area_sqft ?? '',
      floor: u.floor ?? '',
      list_price: u.list_price,
      notes: u.notes ?? '',
    };
    setUnitForm(next);
    setUnitBaseline(next);
    setShowModal('unit');
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    const next = {
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      cnic: c.cnic ?? '',
      address: c.address ?? '',
    };
    setCustForm(next);
    setCustBaseline(next);
    setShowModal('customer');
  };

  const handleSaveUnit = async () => {
    if (!unitForm.project_id || !unitForm.unit_number || !unitForm.list_price) {
      setError('Project, unit number, and price are required');
      throw new Error('validation');
    }
    setError('');
    try {
      if (editingUnit) { await updatePropertyUnit(editingUnit.id, unitForm as any); } else { await createPropertyUnit(unitForm as any); }
      setEditingUnit(null); setShowModal(''); load();
    } catch (e: any) { setError(e.message); throw e; }
  };

  const handleSaveCustomer = async () => {
    if (!custForm.name) { setError('Name is required'); throw new Error('validation'); }
    setError('');
    try {
      if (editingCustomer) { await updateCustomer(editingCustomer.id, custForm); } else { await createCustomer(custForm); }
      setEditingCustomer(null); setShowModal(''); load();
    } catch (e: any) { setError(e.message); throw e; }
  };

  const handleDeleteUnit = async (id: string) => {
    const ok = await confirm({ title: 'Delete unit', message: 'Delete this property unit?', confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deletePropertyUnit(id);
      load();
      notify.success('Unit deleted');
    } catch (e: any) {
      setError(notifyError(e));
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const ok = await confirm({ title: 'Delete customer', message: 'Delete this customer?', confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteCustomer(id);
      load();
      notify.success('Customer deleted');
    } catch (e: any) {
      setError(notifyError(e));
    }
  };

  const handleDeleteSale = async (id: string) => {
    const ok = await confirm({
      title: 'Delete sale',
      message: 'Cancel/delete this sale? This will also remove all installments.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteSale(id);
      load();
      notify.success('Sale deleted');
    } catch (e: any) {
      setError(notifyError(e));
    }
  };

  /** Sales with balance still due and no payment received yet */
  const dueForFirstCollection = sales.filter(
    (s) =>
      s.status !== 'Cancelled' &&
      Number(s.total_paid) <= 0.009 &&
      Number(s.total_sale_price) - Number(s.total_paid) > 0.009,
  );
  /** Payment already received (shown under Recorded / payment rcvd) */
  const collectedSales = sales.filter(
    (s) => s.status !== 'Cancelled' && Number(s.total_paid) > 0.009,
  );
  const outstandingSales = sales.filter(
    (s) =>
      s.status !== 'Cancelled' &&
      Number(s.total_sale_price) - Number(s.total_paid) > 0.009,
  );

  const nextDueInstallment = (s: Sale): SaleInstallment | null => {
    const open = (s.installments ?? [])
      .filter((i) => Number(i.due_amount) - Number(i.paid_amount) > 0.009 && i.status !== 'Paid')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return open[0] ?? null;
  };
  const todayStr = new Date().toISOString().split('T')[0];
  const isInstallmentOverdue = (due: string) => due < todayStr;

  const handleExportCollections = () => {
    exportCSV(
      'collections',
      outstandingSales.map((s) => {
        const next = nextDueInstallment(s);
        return {
          'Sale#': s.id,
          Customer: s.customer?.name ?? '',
          Unit: s.property_unit?.unit_number ?? '',
          Date: s.sale_date,
          'Next Due': next?.due_date ?? '',
          'Sale Price': s.total_sale_price,
          Collected: s.total_paid,
          Balance: (Number(s.total_sale_price) - Number(s.total_paid)).toFixed(2),
          Status: s.status,
        };
      }),
    );
  };

  const handleExportSalesCSV = () => {
    exportCSV('sales', sales.map(s => {
      const next = nextDueInstallment(s);
      return {
        'Sale#': s.id,
        Date: s.sale_date,
        'Next Due': next?.due_date ?? '',
        'Total Price': s.total_sale_price,
        Paid: s.total_paid,
        Balance: (Number(s.total_sale_price) - Number(s.total_paid)).toString(),
        Status: s.status,
      };
    }));
  };

  const handleSaveSale = async () => {
    if (!editingSale && (!saleForm.property_unit_id || !saleForm.customer_id || !saleForm.total_sale_price)) {
      setError('Unit, customer, and price are required');
      throw new Error('validation');
    }
    if (editingSale && (!saleForm.customer_id || !saleForm.total_sale_price)) {
      setError('Customer and price are required');
      throw new Error('validation');
    }
    if (Number(saleForm.total_sale_price) + 0.009 < Number(editingSale?.total_paid ?? 0)) {
      setError(
        `Sale price cannot be less than already collected (PKR ${Number(editingSale?.total_paid ?? 0).toLocaleString()})`,
      );
      throw new Error('validation');
    }
    setError('');
    try {
      if (editingSale) {
        const installments = installForms
          .filter((i) => i.due_date && i.due_amount)
          .map((i) => ({
            ...(i.id ? { id: i.id } : {}),
            due_date: i.due_date,
            due_amount: i.due_amount,
          }));
        const updated = await updateSale(editingSale.id, {
          customer_id: saleForm.customer_id,
          sale_date: saleForm.sale_date,
          total_sale_price: saleForm.total_sale_price,
          notes: saleForm.notes || null,
          status: saleForm.status as Sale['status'],
          installments,
        });
        setShowModal('');
        setEditingSale(null);
        setSelectedSale(updated);
        load();
        notify.success('Sale updated');
      } else {
        await createSale({
          sale: saleForm as any,
          installments: installForms.filter((i) => i.due_date && i.due_amount) as any,
        });
        setShowModal('');
        load();
        notify.success('Sale created');
      }
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const openEditSale = async (s: Sale) => {
    setError('');
    // Detail view early-returns without the sale modal — return to list first
    setSelectedSale(null);
    try {
      const full = s.installments ? s : await getSale(s.id);
      setEditingSale(full);
      const next = {
        property_unit_id: full.property_unit_id,
        customer_id: full.customer_id,
        sale_date: full.sale_date,
        total_sale_price: String(full.total_sale_price),
        notes: full.notes ?? '',
        status: full.status,
      };
      const installs =
        (full.installments ?? []).length > 0
          ? (full.installments ?? []).map((i) => ({
              id: i.id,
              due_date: i.due_date,
              due_amount: String(i.due_amount),
              paid_amount: String(i.paid_amount),
              locked: Number(i.paid_amount) > 0.009,
            }))
          : [emptyInstallRow()];
      setSaleForm(next as any);
      setSaleBaseline(next as any);
      setInstallForms(installs as any);
      setInstallBaseline(installs as any);
      setShowModal('sale');
    } catch (e: any) {
      setError(notifyError(e));
    }
  };

  useRegisterUnsaved({
    active: showModal === 'unit',
    isDirty: isFormDirty(unitForm, unitBaseline),
    onSave: handleSaveUnit,
    onDiscard: () => { setShowModal(''); setEditingUnit(null); },
  });
  useRegisterUnsaved({
    active: showModal === 'customer',
    isDirty: isFormDirty(custForm, custBaseline),
    onSave: handleSaveCustomer,
    onDiscard: () => { setShowModal(''); setEditingCustomer(null); },
  });
  useRegisterUnsaved({
    active: showModal === 'sale',
    isDirty: isFormDirty(saleForm, saleBaseline) || isFormDirty(installForms, installBaseline),
    onSave: handleSaveSale,
    onDiscard: () => { setShowModal(''); setEditingSale(null); setSaleFilterProjectId(''); },
  });

  const openCollect = (sale?: Sale) => {
    const target = sale ?? outstandingSales[0];
    const balance = target
      ? Math.max(0, Number(target.total_sale_price) - Number(target.total_paid))
      : 0;
    setPayForm({
      sale_id: target?.id ?? '',
      paid_amount: balance ? String(balance) : '',
      paid_date: new Date().toISOString().split('T')[0],
      bank_account_id: banks[0]?.id ?? '',
    });
    setError('');
    setShowModal('payment');
  };

  const openEditCollection = (sale: Sale) => {
    setEditForm({
      sale_id: sale.id,
      total_collected: String(Number(sale.total_paid)),
      paid_date: new Date().toISOString().split('T')[0],
      bank_account_id: banks[0]?.id ?? '',
      max: Number(sale.total_sale_price),
    });
    setError('');
    setShowModal('edit-collection');
  };

  const openEditIndividualCollection = (
    sale: Sale,
    inst: SaleInstallment,
    index: number,
  ) => {
    const otherPaid = (sale.installments ?? [])
      .filter((i) => i.id !== inst.id)
      .reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
    const saleCap = Math.max(0, Number(sale.total_sale_price) - otherPaid);
    const dueCap = Number(inst.due_amount);
    const isCatchUp = !!(inst.notes && /catch-up/i.test(inst.notes));
    const max = isCatchUp ? saleCap : Math.min(dueCap, saleCap);
    setEditInstForm({
      installment_id: inst.id,
      sale_id: sale.id,
      paid_amount: String(Number(inst.paid_amount)),
      paid_date: inst.paid_date || new Date().toISOString().split('T')[0],
      bank_account_id: inst.bank_account_id || banks[0]?.id || '',
      max,
      label: `Payment #${index + 1} · Due ${formatDate(inst.due_date)}`,
    });
    setError('');
  };

  const handlePayment = async () => {
    if (!payForm.sale_id || !payForm.paid_amount) {
      setError('Select a sale and enter amount');
      return;
    }
    setError('');
    setCollecting(true);
    try {
      const updated = await collectSalePayment(
        payForm.sale_id,
        payForm.paid_amount,
        payForm.paid_date,
        payForm.bank_account_id || null,
      );
      setShowModal('');
      notify.success('Collection recorded');
      if (selectedSale?.id === payForm.sale_id) {
        setSelectedSale(updated);
      }
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCollecting(false);
    }
  };

  const handleEditCollection = async () => {
    if (!editForm.sale_id || editForm.total_collected === '') {
      setError('Enter the new collected amount');
      return;
    }
    const amount = Number(editForm.total_collected);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Collected amount must be zero or more');
      return;
    }
    if (amount > editForm.max + 0.009) {
      setError(`Cannot exceed sale price (PKR ${editForm.max.toLocaleString()})`);
      return;
    }
    setError('');
    setCollecting(true);
    try {
      const updated = await adjustSaleCollection(
        editForm.sale_id,
        String(amount),
        editForm.paid_date,
        editForm.bank_account_id || null,
      );
      setShowModal('');
      notify.success('Collection updated');
      if (selectedSale?.id === editForm.sale_id) {
        setSelectedSale(updated);
      }
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCollecting(false);
    }
  };

  const handleEditIndividualCollection = async () => {
    if (!editInstForm) return;
    if (editInstForm.paid_amount === '') {
      setError('Enter the payment amount');
      return;
    }
    const amount = Number(editInstForm.paid_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Amount must be zero or more');
      return;
    }
    if (amount > editInstForm.max + 0.009) {
      setError(`Cannot exceed PKR ${editInstForm.max.toLocaleString()}`);
      return;
    }
    if (amount > 0.009 && !editInstForm.paid_date) {
      setError('Payment date is required');
      return;
    }
    setError('');
    setCollecting(true);
    try {
      const updated = await updateInstallmentCollection(
        editInstForm.installment_id,
        String(amount),
        editInstForm.paid_date,
        editInstForm.bank_account_id || null,
      );
      setEditInstForm(null);
      notify.success('Payment updated');
      setBreakdownSale(updated);
      if (selectedSale?.id === editInstForm.sale_id) {
        setSelectedSale(updated);
      }
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCollecting(false);
    }
  };

  const viewSale = async (id: string) => {
    try { setSelectedSale(await getSale(id)); } catch (e: any) { setError(e.message); }
  };

  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total_paid), 0);
  const pendingReceivables = outstandingSales.reduce(
    (s, sale) => s + (Number(sale.total_sale_price) - Number(sale.total_paid)),
    0,
  );

  if (selectedSale) {
    const saleBalance =
      Number(selectedSale.total_sale_price) - Number(selectedSale.total_paid);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setSelectedSale(null)} className="text-blue-600 hover:underline text-sm">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Sale #{selectedSale.id}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[selectedSale.status]}`}>{selectedSale.status}</span>
          <div className="ml-auto flex gap-2">
            {selectedSale.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => openEditSale(selectedSale)}
                className="text-xs rounded border border-slate-200 text-slate-700 px-3 py-1.5 hover:bg-slate-50"
              >
                Edit Sale
              </button>
            )}
            {Number(selectedSale.total_paid) > 0.009 && selectedSale.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => openEditCollection(selectedSale)}
                className="text-xs rounded border border-blue-200 text-blue-700 px-3 py-1.5 hover:bg-blue-50"
              >
                Edit Collection
              </button>
            )}
            {saleBalance > 0.009 && selectedSale.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => openCollect(selectedSale)}
                className="text-xs rounded bg-green-600 text-white px-3 py-1.5 hover:bg-green-700"
              >
                Collect
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Customer:</span> <span className="font-medium ml-1">{selectedSale.customer?.name}</span></div>
          <div><span className="text-gray-500">Unit:</span> <span className="font-medium ml-1">{selectedSale.property_unit?.unit_number}</span></div>
          <div><span className="text-gray-500">Sale Price:</span> <span className="font-medium ml-1">PKR {Number(selectedSale.total_sale_price).toLocaleString()}</span></div>
          <div><span className="text-gray-500">Collected:</span> <span className="font-medium ml-1 text-green-600">PKR {Number(selectedSale.total_paid).toLocaleString()}</span></div>
          <div><span className="text-gray-500">Balance Due:</span> <span className="font-medium ml-1 text-red-600">PKR {saleBalance.toLocaleString()}</span></div>
          <div><span className="text-gray-500">Date:</span> <span className="font-medium ml-1">{formatDate(selectedSale.sale_date)}</span></div>
        </div>
        <h2 className="font-semibold text-gray-800">Installment schedule</h2>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">#</th>
                <th className="px-4 py-3 text-left text-gray-600">Due Date</th>
                <th className="px-4 py-3 text-right text-gray-600">Due Amount</th>
                <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                <th className="px-4 py-3 text-left text-gray-600">Paid Date</th>
                <th className="px-4 py-3 text-left text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {(selectedSale.installments ?? []).length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">No installments on this sale.</td></tr>
              ) : (selectedSale.installments ?? []).map((i, idx) => (
                <tr key={i.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">{formatDate(i.due_date)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(i.due_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-600">
                    {Number(i.paid_amount) > 0 ? Number(i.paid_amount).toLocaleString() : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.paid_date ? formatDate(i.paid_date) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-700'}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
            {(selectedSale.installments ?? []).length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-slate-600">Total</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-slate-700">
                    {(selectedSale.installments ?? []).reduce((s, i) => s + Number(i.due_amount), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-green-700">
                    {(selectedSale.installments ?? []).reduce((s, i) => s + Number(i.paid_amount), 0).toLocaleString()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Collection history grouped by paid date */}
        {(() => {
          const paid = (selectedSale.installments ?? []).filter(i => Number(i.paid_amount) > 0 && i.paid_date);
          if (paid.length === 0) return null;

          // Group by paid_date
          const byDate = paid.reduce<Record<string, typeof paid>>((acc, i) => {
            const key = i.paid_date!;
            if (!acc[key]) acc[key] = [];
            acc[key].push(i);
            return acc;
          }, {});
          const sortedDates = Object.keys(byDate).sort();

          return (
            <div className="space-y-2">
              <h2 className="font-semibold text-gray-800">Collection history by date</h2>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-600">Collection Date</th>
                      <th className="px-4 py-3 text-left text-gray-600">Installments Covered</th>
                      <th className="px-4 py-3 text-right text-gray-600">Amount Collected</th>
                      <th className="px-4 py-3 text-right text-gray-600">Running Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.reduce<{ rows: React.ReactNode[]; running: number }>(
                      ({ rows, running }, date) => {
                        const items = byDate[date];
                        const dayTotal = items.reduce((s, i) => s + Number(i.paid_amount), 0);
                        const newRunning = running + dayTotal;
                        rows.push(
                          <tr key={date} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{formatDate(date)}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {items.map((i, idx) => (
                                <span key={i.id}>
                                  {idx > 0 && ', '}
                                  Inst #{(selectedSale.installments ?? []).indexOf(i) + 1} (Due {formatDate(i.due_date)})
                                </span>
                              ))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-green-600">
                              PKR {dayTotal.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">
                              PKR {newRunning.toLocaleString()}
                            </td>
                          </tr>,
                        );
                        return { rows, running: newRunning };
                      },
                      { rows: [], running: 0 },
                    ).rows}
                  </tbody>
                  <tfoot className="bg-green-50 border-t-2 border-green-200">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-green-700">
                        Total collected across {sortedDates.length} date{sortedDates.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-green-700">
                        PKR {paid.reduce((s, i) => s + Number(i.paid_amount), 0).toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })()}

        {showModal === 'payment' && (
          <Modal title="Collect against Sale" onClose={() => { if (!collecting) setShowModal(''); }}>
            <div className="space-y-3">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <p className="text-sm text-slate-600">
                Sale S-{selectedSale.id.slice(-6).toUpperCase()} · Balance PKR {saleBalance.toLocaleString()}
                {(() => {
                  const next = nextDueInstallment(selectedSale);
                  if (!next) return null;
                  const overdue = isInstallmentOverdue(next.due_date);
                  return (
                    <span className={overdue ? ' text-red-600' : ''}>
                      {' '}· Next due {formatDate(next.due_date)}
                      {overdue ? ' (overdue)' : ''}
                      {' '}· PKR {(Number(next.due_amount) - Number(next.paid_amount)).toLocaleString()}
                    </span>
                  );
                })()}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Collection Date</label>
                  <input type="date" value={payForm.paid_date} onChange={e => setPayForm(f => ({ ...f, paid_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input type="number" value={payForm.paid_amount} onChange={e => setPayForm(f => ({ ...f, paid_amount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit to (Cash & Bank) *</label>
                <select
                  value={payForm.bank_account_id}
                  onChange={(e) => setPayForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Cash on hand (1000)</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{bankLabel(b)}</option>
                  ))}
                </select>
              </div>
              <button onClick={handlePayment} disabled={collecting}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {collecting ? 'Saving…' : 'Record Collection'}
              </button>
            </div>
          </Modal>
        )}

        {showModal === 'edit-collection' && (
          <Modal title="Edit Collection" onClose={() => { if (!collecting) setShowModal(''); }}>
            <div className="space-y-3">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <p className="text-xs text-slate-500">
                Change the total collected for this sale. Old payment journals are removed and rebuilt.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total collected (PKR) *</label>
                <input type="number" min={0} max={editForm.max} value={editForm.total_collected}
                  onChange={(e) => setEditForm((f) => ({ ...f, total_collected: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective date</label>
                <input type="date" value={editForm.paid_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, paid_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit to (Cash & Bank)</label>
                <select
                  value={editForm.bank_account_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Cash on hand (1000)</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{bankLabel(b)}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleEditCollection} disabled={collecting}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {collecting ? 'Updating…' : 'Save Collection Changes'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales & Collections</h1>
          <p className="text-sm text-gray-500">Property inventory, sales, and installment collections</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tab === 'collections' && (
            <button
              type="button"
              onClick={() => navigate('/reports?tab=receivables')}
              className="border border-blue-600 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-50"
            >
              All Receivables →
            </button>
          )}
          {(tab === 'sales' || tab === 'collections') && <>
            <button
              type="button"
              onClick={tab === 'sales' ? handleExportSalesCSV : handleExportCollections}
              className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50"
            >
              ↓ CSV
            </button>
            <button
              type="button"
              onClick={() => {
                if (tab === 'sales') {
                  const rows = sales.map((s) => ({
                    'Sale#': s.id,
                    Customer: s.customer?.name ?? '',
                    Unit: s.property_unit?.unit_number ?? '',
                    Date: formatDate(s.sale_date),
                    Price: s.total_sale_price,
                    Paid: s.total_paid,
                    Balance: (Number(s.total_sale_price) - Number(s.total_paid)).toFixed(2),
                    Status: s.status,
                  }));
                  if (!rows.length) { notify.info('Nothing to export'); return; }
                  exportExcel('sales', rows);
                } else {
                  const rows = outstandingSales.map((s) => ({
                    'Sale#': s.id,
                    Customer: s.customer?.name ?? '',
                    Unit: s.property_unit?.unit_number ?? '',
                    'Sale Date': formatDate(s.sale_date),
                    Price: s.total_sale_price,
                    Collected: s.total_paid,
                    Balance: (Number(s.total_sale_price) - Number(s.total_paid)).toFixed(2),
                    Status: s.status,
                  }));
                  if (!rows.length) { notify.info('Nothing to export'); return; }
                  exportExcel('collections', rows);
                }
                notify.success('Exported Excel');
              }}
              className="border border-emerald-700 text-emerald-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50"
            >
              ↓ Excel
            </button>
          </>}
          {tab === 'inventory' && (
            <button
              onClick={() => {
                setEditingUnit(null);
                setUnitForm(emptyUnitForm);
                setUnitBaseline(emptyUnitForm);
                setError('');
                setShowModal('unit');
              }}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              + Add Unit
            </button>
          )}
          {tab === 'customers' && (
            <button
              onClick={() => {
                setEditingCustomer(null);
                setCustForm(emptyCustForm);
                setCustBaseline(emptyCustForm);
                setError('');
                setShowModal('customer');
              }}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              + Add Customer
            </button>
          )}
          {tab === 'sales' && (
            <button
              onClick={() => {
                const nextSale = emptySaleForm();
                const nextInstall = [emptyInstallRow()];
                setEditingSale(null);
                setSaleForm(nextSale);
                setSaleBaseline(nextSale);
                setInstallForms(nextInstall);
                setInstallBaseline(nextInstall);
                setError('');
                setShowModal('sale');
              }}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              + New Sale
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Collected" value={`PKR ${totalRevenue.toLocaleString()}`} icon="💰" color="green" />
        <StatCard title="Pending against Sales" value={`PKR ${pendingReceivables.toLocaleString()}`} icon="⏳" color="yellow" />
        <StatCard title="Total Units" value={units.length} icon="🏠" color="blue" />
        <StatCard title="Sold Units" value={units.filter(u => u.status === 'Sold').length} icon="✅" color="purple" />
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {([['inventory', '🏘️ Inventory'], ['sales', '📄 Sales'], ['customers', '👥 Customers'], ['collections', '💵 Collections']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : tab === 'inventory' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.length === 0 ? (
            <p className="text-gray-400 col-span-3 text-center py-8">No units yet.</p>
          ) : units.map(u => (
            <div key={u.id} className="bg-white rounded-xl border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">Unit {u.unit_number}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[u.status]}`}>{u.status}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditUnit(u)} className="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                  <button onClick={() => handleDeleteUnit(u.id)} className="text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                </div>
              </div>
              {u.unit_type && <p className="text-sm text-gray-600 mt-1">{u.unit_type}</p>}
              {u.floor && <p className="text-sm text-gray-500">Floor: {u.floor}</p>}
              {u.area_sqft && <p className="text-sm text-gray-500">Area: {u.area_sqft} sqft</p>}
              <p className="text-sm font-semibold text-blue-700 mt-2">PKR {Number(u.list_price).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : tab === 'customers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.length === 0 ? (
            <p className="text-gray-400 col-span-3 text-center py-8">No customers yet.</p>
          ) : customers.map(c => (
            <div key={c.id} className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all" onClick={() => openCustomerDetail(c)}>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-800">{c.name}</h3>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEditCustomer(c)} className="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                  <button onClick={() => handleDeleteCustomer(c.id)} className="text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                </div>
              </div>
              {c.phone && <p className="text-sm text-gray-600 mt-1">📞 {c.phone}</p>}
              {c.email && <p className="text-sm text-gray-600">✉️ {c.email}</p>}
              {c.cnic && <p className="text-sm text-gray-500">CNIC: {c.cnic}</p>}
              <p className="text-xs text-purple-500 mt-2">Tap to view sales →</p>
            </div>
          ))}
        </div>
      ) : tab === 'sales' ? (
        <div className="space-y-2">
          <div className="flex justify-end">
            <ColumnPicker columns={SALES_TABLE_COLUMNS} visible={salesCols} onToggle={toggleSalesCol} />
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {salesVis('id') && <th className="px-4 py-3 text-left text-gray-600">Sale ID</th>}
                  {salesVis('customer') && <th className="px-4 py-3 text-left text-gray-600">Customer</th>}
                  {salesVis('unit') && <th className="px-4 py-3 text-left text-gray-600">Unit</th>}
                  {salesVis('date') && <th className="px-4 py-3 text-left text-gray-600">Date</th>}
                  {salesVis('due') && <th className="px-4 py-3 text-left text-gray-600">Next Due</th>}
                  {salesVis('price') && <th className="px-4 py-3 text-right text-gray-600">Price</th>}
                  {salesVis('paid') && <th className="px-4 py-3 text-right text-gray-600">Paid</th>}
                  {salesVis('balance') && <th className="px-4 py-3 text-right text-gray-600">Balance</th>}
                  {salesVis('status') && <th className="px-4 py-3 text-left text-gray-600">Status</th>}
                  {salesVis('actions') && <th className="px-4 py-3 text-center text-gray-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={salesCols.length} className="text-center text-gray-400 py-8">No sales yet.</td></tr>
                ) : sales.map(s => {
                  const next = nextDueInstallment(s);
                  const balance = Number(s.total_sale_price) - Number(s.total_paid);
                  const overdue = next ? isInstallmentOverdue(next.due_date) : false;
                  return (
                  <tr key={s.id} className="border-t hover:bg-blue-50 cursor-pointer" onClick={() => viewSale(s.id)}>
                    {salesVis('id') && <td className="px-4 py-3 font-medium text-blue-600">S-{s.id.slice(-6).toUpperCase()}</td>}
                    {salesVis('customer') && <td className="px-4 py-3">{s.customer?.name ?? '-'}</td>}
                    {salesVis('unit') && <td className="px-4 py-3">{s.property_unit?.unit_number ?? '-'}</td>}
                    {salesVis('date') && <td className="px-4 py-3">{formatDate(s.sale_date)}</td>}
                    {salesVis('due') && (
                      <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : balance > 0.009 ? 'text-gray-700' : 'text-slate-400'}`}>
                        {next ? formatDate(next.due_date) : balance > 0.009 ? '—' : 'Paid up'}
                        {overdue && <span className="block text-[10px] uppercase tracking-wide">Overdue</span>}
                      </td>
                    )}
                    {salesVis('price') && <td className="px-4 py-3 text-right font-mono">{Number(s.total_sale_price).toLocaleString()}</td>}
                    {salesVis('paid') && <td className="px-4 py-3 text-right font-mono text-green-600">{Number(s.total_paid).toLocaleString()}</td>}
                    {salesVis('balance') && (
                      <td className={`px-4 py-3 text-right font-mono font-medium ${
                        balance > 0.009 ? 'text-red-600' : balance < -0.009 ? 'text-amber-700' : 'text-slate-400'
                      }`}>
                        {balance.toLocaleString()}
                      </td>
                    )}
                    {salesVis('status') && <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>}
                    {salesVis('actions') && (
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex gap-1 justify-center">
                          {s.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => openEditSale(s)}
                              className="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50"
                            >
                              Edit
                            </button>
                          )}
                          <button onClick={() => handleDeleteSale(s.id)} className="text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-sm font-medium text-slate-800">Due for collection</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales with no payment received yet — use Collect for the first receipt. Next due shows the earliest unpaid installment date.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">Sale</th>
                    <th className="px-4 py-3 text-left text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                    <th className="px-4 py-3 text-left text-gray-600">Sale Date</th>
                    <th className="px-4 py-3 text-left text-gray-600">Next Due</th>
                    <th className="px-4 py-3 text-right text-gray-600">Sale Price</th>
                    <th className="px-4 py-3 text-right text-gray-600">Balance Due</th>
                    <th className="px-4 py-3 text-center text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dueForFirstCollection.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-400 py-8">
                        No unpaid sales waiting for first collection.
                      </td>
                    </tr>
                  ) : (
                    dueForFirstCollection.map((s) => {
                      const balance = Number(s.total_sale_price) - Number(s.total_paid);
                      const next = nextDueInstallment(s);
                      const overdue = next ? isInstallmentOverdue(next.due_date) : false;
                      return (
                        <tr key={s.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-blue-600">S-{s.id.slice(-6).toUpperCase()}</td>
                          <td className="px-4 py-3">{s.customer?.name ?? '—'}</td>
                          <td className="px-4 py-3">{s.property_unit?.unit_number ?? '—'}</td>
                          <td className="px-4 py-3">{formatDate(s.sale_date)}</td>
                          <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                            {next ? formatDate(next.due_date) : '—'}
                            {overdue && <span className="block text-[10px] uppercase tracking-wide">Overdue</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{Number(s.total_sale_price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600 font-medium">{balance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => openCollect(s)}
                              className="text-xs rounded bg-green-600 text-white px-2.5 py-1.5 hover:bg-green-700"
                            >
                              Collect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-sm font-medium text-slate-800">Payment received</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Open Details to view and edit each payment separately. Collect more if a balance remains.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">Sale</th>
                    <th className="px-4 py-3 text-left text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                    <th className="px-4 py-3 text-left text-gray-600">Next Due</th>
                    <th className="px-4 py-3 text-right text-gray-600">Sale Price</th>
                    <th className="px-4 py-3 text-right text-gray-600">Collected</th>
                    <th className="px-4 py-3 text-right text-gray-600">Balance</th>
                    <th className="px-4 py-3 text-center text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {collectedSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-400 py-8">
                        No collections recorded yet.
                      </td>
                    </tr>
                  ) : (
                    collectedSales.map((s) => {
                      const balance = Number(s.total_sale_price) - Number(s.total_paid);
                      const next = nextDueInstallment(s);
                      const overdue = next ? isInstallmentOverdue(next.due_date) : false;
                      return (
                        <tr key={s.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="font-medium text-blue-600 hover:underline"
                              onClick={() => openCollectionDetails(s)}
                            >
                              S-{s.id.slice(-6).toUpperCase()}
                            </button>
                          </td>
                          <td className="px-4 py-3">{s.customer?.name ?? '—'}</td>
                          <td className="px-4 py-3">{s.property_unit?.unit_number ?? '—'}</td>
                          <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : balance > 0.009 ? 'text-gray-700' : 'text-slate-400'}`}>
                            {next ? formatDate(next.due_date) : balance > 0.009 ? '—' : 'Paid up'}
                            {overdue && <span className="block text-[10px] uppercase tracking-wide">Overdue</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{Number(s.total_sale_price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="font-mono text-green-600 hover:underline font-medium"
                              title="View collection details"
                              onClick={() => openCollectionDetails(s)}
                            >
                              {Number(s.total_paid).toLocaleString()}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">{balance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex gap-1.5 justify-center">
                              <button
                                type="button"
                                onClick={() => openCollectionDetails(s)}
                                className="text-xs rounded border border-slate-200 text-slate-700 px-2.5 py-1.5 hover:bg-slate-50"
                              >
                                Details
                              </button>
                              {balance > 0.009 && (
                                <button
                                  type="button"
                                  onClick={() => openCollect(s)}
                                  className="text-xs rounded bg-green-600 text-white px-2.5 py-1.5 hover:bg-green-700"
                                >
                                  Collect more
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collection details modal — individual payments (not grouped) */}
      {breakdownSale && !editInstForm && (
        <Modal
          title={`Collection details — S-${breakdownSale.id.slice(-6).toUpperCase()}`}
          onClose={() => setBreakdownSale(null)}
          size="xl"
          mode="view"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Customer</p>
                <p className="font-medium truncate">{breakdownSale.customer?.name ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Unit</p>
                <p className="font-medium">{breakdownSale.property_unit?.unit_number ?? '—'}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Collected</p>
                <p className="font-semibold text-green-700">
                  PKR {Number(breakdownSale.total_paid).toLocaleString()}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Balance</p>
                <p className="font-semibold text-red-600">
                  PKR {(Number(breakdownSale.total_sale_price) - Number(breakdownSale.total_paid)).toLocaleString()}
                </p>
              </div>
            </div>

            {breakdownLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              </div>
            ) : (() => {
              const installments = breakdownSale.installments ?? [];
              const paid = installments
                .map((i, index) => ({ inst: i, index }))
                .filter(({ inst }) => Number(inst.paid_amount) > 0.009);

              if (paid.length === 0) {
                return (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No individual payments recorded for this sale.
                  </p>
                );
              }

              return (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Individual payments
                  </p>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-gray-600">#</th>
                          <th className="px-3 py-2.5 text-left text-gray-600">Paid Date</th>
                          <th className="px-3 py-2.5 text-left text-gray-600">Due Date</th>
                          <th className="px-3 py-2.5 text-right text-gray-600">Amount</th>
                          <th className="px-3 py-2.5 text-left text-gray-600">Bank</th>
                          <th className="px-3 py-2.5 text-center text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paid.map(({ inst, index }) => {
                          const bank = banks.find((b) => b.id === inst.bank_account_id);
                          return (
                            <tr key={inst.id} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2.5 text-slate-400">{index + 1}</td>
                              <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                                {inst.paid_date ? formatDate(inst.paid_date) : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                                {formatDate(inst.due_date)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-green-600">
                                {Number(inst.paid_amount).toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[140px] truncate">
                                {bank ? bankLabel(bank) : 'Cash on hand'}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => openEditIndividualCollection(breakdownSale, inst, index)}
                                  className="text-xs rounded border border-blue-200 text-blue-700 px-2.5 py-1 hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-green-50 border-t-2 border-green-200">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-green-700">
                            {paid.length} payment{paid.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-green-700">
                            {paid.reduce((sum, { inst }) => sum + Number(inst.paid_amount), 0).toLocaleString()}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Edit one individual collection payment */}
      {editInstForm && (
        <Modal
          title="Edit payment"
          onClose={() => { if (!collecting) { setEditInstForm(null); setError(''); } }}
        >
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <p className="text-sm text-slate-600">{editInstForm.label}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR) *</label>
              <input
                type="number"
                min={0}
                max={editInstForm.max}
                value={editInstForm.paid_amount}
                onChange={(e) => setEditInstForm((f) => f ? { ...f, paid_amount: e.target.value } : f)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <p className="text-xs text-slate-400 mt-1">
                Max PKR {editInstForm.max.toLocaleString()}. Use 0 to clear this payment only.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid date *</label>
              <input
                type="date"
                value={editInstForm.paid_date}
                onChange={(e) => setEditInstForm((f) => f ? { ...f, paid_date: e.target.value } : f)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit to (Cash & Bank)</label>
              <select
                value={editInstForm.bank_account_id}
                onChange={(e) => setEditInstForm((f) => f ? { ...f, bank_account_id: e.target.value } : f)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Cash on hand (1000)</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{bankLabel(b)}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleEditIndividualCollection}
              disabled={collecting}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {collecting ? 'Saving…' : 'Save payment'}
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'unit' && (
        <Modal
          title={editingUnit ? 'Edit Property Unit' : 'Add Property Unit'}
          mode="form"
          isDirty={isFormDirty(unitForm, unitBaseline)}
          onClose={() => { setShowModal(''); setEditingUnit(null); }}
          footer={
            <ModalFormFooter
              onSave={() => void handleSaveUnit()}
              saveLabel={editingUnit ? 'Save Unit' : 'Add Unit'}
              error={error ? <p className="text-red-600 text-sm">{error}</p> : null}
            />
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
              <select value={unitForm.project_id} onChange={e => setUnitForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">-- Select --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'Unit Number *', key: 'unit_number' }, { label: 'Unit Type', key: 'unit_type' }, { label: 'Floor', key: 'floor' }, { label: 'Area (sqft)', key: 'area_sqft' }].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={(unitForm as any)[f.key]} onChange={e => setUnitForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">List Price *</label>
              <input type="number" value={unitForm.list_price} onChange={e => setUnitForm(f => ({ ...f, list_price: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'customer' && (
        <Modal
          title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
          mode="form"
          isDirty={isFormDirty(custForm, custBaseline)}
          onClose={() => { setShowModal(''); setEditingCustomer(null); }}
          footer={
            <ModalFormFooter
              onSave={() => void handleSaveCustomer()}
              saveLabel={editingCustomer ? 'Save Customer' : 'Add Customer'}
              error={error ? <p className="text-red-600 text-sm">{error}</p> : null}
            />
          }
        >
          <div className="space-y-3">
            {[{ label: 'Name *', key: 'name', type: 'text' }, { label: 'Phone', key: 'phone', type: 'text' }, { label: 'Email', key: 'email', type: 'email' }, { label: 'CNIC', key: 'cnic', type: 'text' }].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} value={(custForm as any)[f.key]} onChange={e => setCustForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showModal === 'sale' && (
        <Modal
          title={editingSale ? `Edit Sale S-${editingSale.id.slice(-6).toUpperCase()}` : 'New Sale'}
          mode="form"
          isDirty={
            isFormDirty(saleForm, saleBaseline) || isFormDirty(installForms, installBaseline)
          }
          onClose={() => { setShowModal(''); setEditingSale(null); setSaleFilterProjectId(''); }}
          footer={
            <ModalFormFooter
              onSave={() => void handleSaveSale()}
              saveLabel={editingSale ? 'Save Changes' : 'Create Sale'}
              error={error ? <p className="text-red-600 text-sm">{error}</p> : null}
            />
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Unit *</label>
              {editingSale ? (
                <input
                  disabled
                  value={`Unit ${editingSale.property_unit?.unit_number ?? editingSale.property_unit_id}${
                    editingSale.property_unit?.list_price
                      ? ` – PKR ${Number(editingSale.property_unit.list_price).toLocaleString()}`
                      : ''
                  }`}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
                />
              ) : (
                <select value={saleForm.property_unit_id} onChange={e => setSaleForm(f => ({ ...f, property_unit_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Available Unit --</option>
                  {units
                    .filter((u) => u.status === 'Available')
                    .filter((u) => !saleFilterProjectId || u.project_id === saleFilterProjectId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unit_number} – PKR {Number(u.list_price).toLocaleString()}
                      </option>
                    ))}
                </select>
              )}
              {!editingSale && saleFilterProjectId && (
                <p className="text-xs text-slate-500 mt-1">
                  Filtered to project units
                  {projects.find((p) => p.id === saleFilterProjectId)
                    ? `: ${projects.find((p) => p.id === saleFilterProjectId)!.name}`
                    : ''}
                </p>
              )}
              {editingSale && (
                <p className="text-xs text-slate-500 mt-1">Unit cannot be changed after the sale is created.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select value={saleForm.customer_id} onChange={e => setSaleForm(f => ({ ...f, customer_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">-- Select Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                <input type="date" value={saleForm.sale_date} onChange={e => setSaleForm(f => ({ ...f, sale_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
                <input type="number" value={saleForm.total_sale_price} onChange={e => setSaleForm(f => ({ ...f, total_sale_price: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                {editingSale && Number(editingSale.total_paid) > 0.009 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Already collected: PKR {Number(editingSale.total_paid).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {editingSale && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={saleForm.status}
                  onChange={(e) => setSaleForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={saleForm.notes}
                onChange={(e) => setSaleForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Optional"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  {editingSale ? 'Installment schedule' : 'Installments (optional)'}
                </label>
                <button
                  type="button"
                  onClick={() => setInstallForms((prev) => [...prev, emptyInstallRow()])}
                  className="text-blue-600 text-xs hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {installForms.map((inst, idx) => (
                  <div key={inst.id || idx} className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      placeholder="Due Date"
                      value={inst.due_date}
                      onChange={(e) => setInstallForms((prev) => {
                        const n = [...prev];
                        n[idx] = { ...n[idx], due_date: e.target.value };
                        return n;
                      })}
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={inst.due_amount}
                      disabled={!!inst.locked}
                      title={inst.locked ? 'Amount locked — payment already recorded' : undefined}
                      onChange={(e) => setInstallForms((prev) => {
                        const n = [...prev];
                        n[idx] = { ...n[idx], due_amount: e.target.value };
                        return n;
                      })}
                      className={`border rounded px-2 py-1 text-xs ${inst.locked ? 'bg-gray-50 text-gray-500' : ''}`}
                    />
                    {inst.locked && (
                      <p className="col-span-2 text-[10px] text-slate-500">
                        Paid PKR {Number(inst.paid_amount || 0).toLocaleString()} — due date can still be adjusted
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button type="button" onClick={handleSaveSale} className="hidden" />
          </div>
        </Modal>
      )}

      {showModal === 'payment' && (
        <Modal title="Collect against Sale" onClose={() => { if (!collecting) setShowModal(''); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sale *</label>
              <select
                value={payForm.sale_id}
                onChange={(e) => {
                  const sale = outstandingSales.find((s) => s.id === e.target.value);
                  const balance = sale
                    ? Math.max(0, Number(sale.total_sale_price) - Number(sale.total_paid))
                    : 0;
                  setPayForm((f) => ({
                    ...f,
                    sale_id: e.target.value,
                    paid_amount: balance ? String(balance) : '',
                  }));
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">-- Select sale --</option>
                {outstandingSales.map((s) => {
                  const balance = Number(s.total_sale_price) - Number(s.total_paid);
                  const next = nextDueInstallment(s);
                  return (
                    <option key={s.id} value={s.id}>
                      S-{s.id.slice(-6).toUpperCase()} · {s.customer?.name ?? 'Customer'} · Unit{' '}
                      {s.property_unit?.unit_number ?? '—'} · Due PKR {balance.toLocaleString()}
                      {next ? ` · Next ${formatDate(next.due_date)}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Collection Date</label>
                <input type="date" value={payForm.paid_date} onChange={e => setPayForm(f => ({ ...f, paid_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" value={payForm.paid_amount} onChange={e => setPayForm(f => ({ ...f, paid_amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit to (Cash & Bank) *</label>
              <select
                value={payForm.bank_account_id}
                onChange={(e) => setPayForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Cash on hand (1000)</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{bankLabel(b)}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Posts debit to the selected sub-account under Cash & Bank.</p>
            </div>
            <button
              onClick={handlePayment}
              disabled={collecting}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {collecting ? 'Saving…' : 'Record Collection'}
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'edit-collection' && (
        <Modal title="Edit Collection" onClose={() => { if (!collecting) setShowModal(''); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <p className="text-xs text-slate-500">
              Set the new <strong>total collected</strong> for this sale. Payment journals are rebuilt
              (old PMT entries removed, new ones posted for the updated amount).
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total collected (PKR) *</label>
              <input
                type="number"
                min={0}
                max={editForm.max}
                value={editForm.total_collected}
                onChange={(e) => setEditForm((f) => ({ ...f, total_collected: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <p className="text-xs text-slate-400 mt-1">
                Max sale price: PKR {editForm.max.toLocaleString()}. Use 0 to clear all collections.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective date</label>
              <input
                type="date"
                value={editForm.paid_date}
                onChange={(e) => setEditForm((f) => ({ ...f, paid_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit to (Cash & Bank)</label>
              <select
                value={editForm.bank_account_id}
                onChange={(e) => setEditForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Cash on hand (1000)</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{bankLabel(b)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleEditCollection}
              disabled={collecting}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {collecting ? 'Updating…' : 'Save Collection Changes'}
            </button>
          </div>
        </Modal>
      )}

      <DetailDrawer
        open={!!drawerCustomer}
        title={drawerCustomer?.name ?? ''}
        subtitle="Customer Profile"
        onClose={() => setDrawerCustomer(null)}
        loading={drawerLoading}
      >
        {drawerCustomer && (
          <>
            <DrawerSection title="Contact Info" />
            <DrawerField label="Phone" value={drawerCustomer.phone} />
            <DrawerField label="Email" value={drawerCustomer.email} />
            <DrawerField label="CNIC" value={drawerCustomer.cnic} />
            <DrawerField label="Address" value={drawerCustomer.address} />

            <DrawerSection title={`Sales (${drawerCustomerSales.length})`} />
            {drawerCustomerSales.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No sales found for this customer.</p>
            ) : (
              <div className="space-y-2">
                {drawerCustomerSales.map(s => (
                  <div key={s.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-semibold text-slate-700">Unit: {s.property_unit?.unit_number ?? s.property_unit_id}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{s.sale_date}</span>
                      <span className="font-bold text-slate-800">PKR {Number(s.total_sale_price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-500">Paid</span>
                      <span className="font-semibold text-green-700">PKR {Number(s.total_paid).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="text-slate-500">Balance</span>
                      <span className={`font-semibold ${Number(s.total_sale_price) - Number(s.total_paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        PKR {(Number(s.total_sale_price) - Number(s.total_paid)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-purple-700">Total Sale Value</span>
                    <span className="font-bold text-purple-900">PKR {drawerCustomerSales.reduce((s, x) => s + Number(x.total_sale_price), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-600">Total Paid</span>
                    <span className="font-bold text-green-700">PKR {drawerCustomerSales.reduce((s, x) => s + Number(x.total_paid), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-600">Outstanding</span>
                    <span className="font-bold text-red-600">
                      PKR {drawerCustomerSales.reduce((s, x) => s + (Number(x.total_sale_price) - Number(x.total_paid)), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
