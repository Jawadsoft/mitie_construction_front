import { useEffect, useState } from 'react';
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getPropertyUnits, createPropertyUnit, updatePropertyUnit, deletePropertyUnit,
  getSales, getSale, createSale, deleteSale, collectSalePayment, adjustSaleCollection
} from '../api/sales';
import type { Customer, PropertyUnit, Sale } from '../api/sales';
import { exportCSV, exportExcel } from '../utils/exportUtils';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getBankAccounts } from '../api/accounting';
import type { BankAccount } from '../api/accounting';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import DetailDrawer, { DrawerSection, DrawerField, StatusBadge } from '../components/DetailDrawer';
import { useConfirm } from '../components/ConfirmDialog';
import { notify, notifyError } from '../utils/toast';
import { formatDate } from '../utils/date';
import type { NavIntent } from '../types/navIntent';

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
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('inventory');
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

  // Customer detail drawer
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [drawerCustomerSales, setDrawerCustomerSales] = useState<Sale[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const openCustomerDetail = async (c: Customer) => {
    setDrawerCustomer(c);
    setDrawerLoading(true);
    try {
      const customerSales = await getSales(undefined, c.id);
      setDrawerCustomerSales(customerSales);
    } catch { setDrawerCustomerSales([]); }
    finally { setDrawerLoading(false); }
  };
  const [unitForm, setUnitForm] = useState({ project_id: '', unit_number: '', unit_type: '', area_sqft: '', floor: '', list_price: '', notes: '' });
  const [custForm, setCustForm] = useState({ name: '', phone: '', email: '', cnic: '', address: '' });
  const [saleForm, setSaleForm] = useState({ property_unit_id: '', customer_id: '', sale_date: new Date().toISOString().split('T')[0], total_sale_price: '', notes: '' });
  const [saleFilterProjectId, setSaleFilterProjectId] = useState('');
  const [installForms, setInstallForms] = useState([{ due_date: '', due_amount: '' }]);
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
    setSaleForm({
      property_unit_id: '',
      customer_id: '',
      sale_date: new Date().toISOString().split('T')[0],
      total_sale_price: '',
      notes: '',
    });
    setInstallForms([{ due_date: '', due_amount: '' }]);
    setError('');
    setShowModal('sale');
    onIntentConsumed?.();
  }, [initialIntent]);

  const openEditUnit = (u: PropertyUnit) => {
    setEditingUnit(u);
    setUnitForm({ project_id: u.project_id, unit_number: u.unit_number, unit_type: u.unit_type ?? '', area_sqft: u.area_sqft ?? '', floor: u.floor ?? '', list_price: u.list_price, notes: u.notes ?? '' });
    setShowModal('unit');
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', cnic: c.cnic ?? '', address: c.address ?? '' });
    setShowModal('customer');
  };

  const handleSaveUnit = async () => {
    if (!unitForm.project_id || !unitForm.unit_number || !unitForm.list_price) { setError('Project, unit number, and price are required'); return; }
    setError('');
    try {
      if (editingUnit) { await updatePropertyUnit(editingUnit.id, unitForm as any); } else { await createPropertyUnit(unitForm as any); }
      setEditingUnit(null); setShowModal(''); load();
    } catch (e: any) { setError(e.message); }
  };

  const handleSaveCustomer = async () => {
    if (!custForm.name) { setError('Name is required'); return; }
    setError('');
    try {
      if (editingCustomer) { await updateCustomer(editingCustomer.id, custForm); } else { await createCustomer(custForm); }
      setEditingCustomer(null); setShowModal(''); load();
    } catch (e: any) { setError(e.message); }
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

  const handleExportCollections = () => {
    exportCSV(
      'collections',
      outstandingSales.map((s) => ({
        'Sale#': s.id,
        Customer: s.customer?.name ?? '',
        Unit: s.property_unit?.unit_number ?? '',
        Date: s.sale_date,
        'Sale Price': s.total_sale_price,
        Collected: s.total_paid,
        Balance: (Number(s.total_sale_price) - Number(s.total_paid)).toFixed(2),
        Status: s.status,
      })),
    );
  };

  const handleExportSalesCSV = () => {
    exportCSV('sales', sales.map(s => ({
      'Sale#': s.id, Date: s.sale_date, 'Total Price': s.total_sale_price,
      'Paid': s.total_paid, 'Balance': (Number(s.total_sale_price) - Number(s.total_paid)).toString(),
      Status: s.status,
    })));
  };

  const handleSaveSale = async () => {
    if (!saleForm.property_unit_id || !saleForm.customer_id || !saleForm.total_sale_price) { setError('Unit, customer, and price are required'); return; }
    setError('');
    try {
      await createSale({ sale: saleForm as any, installments: installForms.filter(i => i.due_date && i.due_amount) as any });
      setShowModal(''); load();
      notify.success('Sale created');
    } catch (e: any) { setError(e.message); }
  };

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
        <h2 className="font-semibold text-gray-800">Installment schedule (auto-applied on collect)</h2>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Due Date</th>
                <th className="px-4 py-3 text-right text-gray-600">Due Amount</th>
                <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                <th className="px-4 py-3 text-left text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {(selectedSale.installments ?? []).map(i => (
                <tr key={i.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(i.due_date)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(i.due_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-600">{Number(i.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status]}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal === 'payment' && (
          <Modal title="Collect against Sale" onClose={() => { if (!collecting) setShowModal(''); }}>
            <div className="space-y-3">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <p className="text-sm text-slate-600">
                Sale S-{selectedSale.id.slice(-6).toUpperCase()} · Balance PKR {saleBalance.toLocaleString()}
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
          {tab === 'inventory' && <button onClick={() => { setEditingUnit(null); setUnitForm({ project_id: '', unit_number: '', unit_type: '', area_sqft: '', floor: '', list_price: '', notes: '' }); setError(''); setShowModal('unit'); }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium">+ Add Unit</button>}
          {tab === 'customers' && <button onClick={() => { setEditingCustomer(null); setCustForm({ name: '', phone: '', email: '', cnic: '', address: '' }); setError(''); setShowModal('customer'); }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium">+ Add Customer</button>}
          {tab === 'sales' && <button onClick={() => { setError(''); setShowModal('sale'); }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium">+ New Sale</button>}
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
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Sale ID</th>
                  <th className="px-4 py-3 text-left text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-right text-gray-600">Price</th>
                  <th className="px-4 py-3 text-right text-gray-600">Paid</th>
                  <th className="px-4 py-3 text-left text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-8">No sales yet.</td></tr>
                ) : sales.map(s => (
                  <tr key={s.id} className="border-t hover:bg-blue-50 cursor-pointer" onClick={() => viewSale(s.id)}>
                    <td className="px-4 py-3 font-medium text-blue-600">S-{s.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3">{s.customer?.name ?? '-'}</td>
                    <td className="px-4 py-3">{s.property_unit?.unit_number ?? '-'}</td>
                    <td className="px-4 py-3">{formatDate(s.sale_date)}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(s.total_sale_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">{Number(s.total_paid).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDeleteSale(s.id)} className="text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-sm font-medium text-slate-800">Due for collection</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales with no payment received yet — use Collect for the first receipt.
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
                    <th className="px-4 py-3 text-right text-gray-600">Sale Price</th>
                    <th className="px-4 py-3 text-right text-gray-600">Balance Due</th>
                    <th className="px-4 py-3 text-center text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dueForFirstCollection.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-400 py-8">
                        No unpaid sales waiting for first collection.
                      </td>
                    </tr>
                  ) : (
                    dueForFirstCollection.map((s) => {
                      const balance = Number(s.total_sale_price) - Number(s.total_paid);
                      return (
                        <tr key={s.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-blue-600">S-{s.id.slice(-6).toUpperCase()}</td>
                          <td className="px-4 py-3">{s.customer?.name ?? '—'}</td>
                          <td className="px-4 py-3">{s.property_unit?.unit_number ?? '—'}</td>
                          <td className="px-4 py-3">{formatDate(s.sale_date)}</td>
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
                Collections already recorded — Edit total, or Collect more if a balance remains.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">Sale</th>
                    <th className="px-4 py-3 text-left text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                    <th className="px-4 py-3 text-right text-gray-600">Sale Price</th>
                    <th className="px-4 py-3 text-right text-gray-600">Collected</th>
                    <th className="px-4 py-3 text-right text-gray-600">Balance</th>
                    <th className="px-4 py-3 text-center text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {collectedSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-400 py-8">
                        No collections recorded yet.
                      </td>
                    </tr>
                  ) : (
                    collectedSales.map((s) => {
                      const balance = Number(s.total_sale_price) - Number(s.total_paid);
                      return (
                        <tr key={s.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-blue-600">S-{s.id.slice(-6).toUpperCase()}</td>
                          <td className="px-4 py-3">{s.customer?.name ?? '—'}</td>
                          <td className="px-4 py-3">{s.property_unit?.unit_number ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono">{Number(s.total_sale_price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-green-600">{Number(s.total_paid).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">{balance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex gap-1.5 justify-center">
                              <button
                                type="button"
                                onClick={() => openEditCollection(s)}
                                className="text-xs rounded border border-blue-200 text-blue-700 px-2.5 py-1.5 hover:bg-blue-50"
                              >
                                Edit
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

      {showModal === 'unit' && (
        <Modal title={editingUnit ? 'Edit Property Unit' : 'Add Property Unit'} onClose={() => { setShowModal(''); setEditingUnit(null); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
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
            <button onClick={handleSaveUnit} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">Add Unit</button>
          </div>
        </Modal>
      )}

      {showModal === 'customer' && (
        <Modal title={editingCustomer ? 'Edit Customer' : 'Add Customer'} onClose={() => { setShowModal(''); setEditingCustomer(null); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {[{ label: 'Name *', key: 'name', type: 'text' }, { label: 'Phone', key: 'phone', type: 'text' }, { label: 'Email', key: 'email', type: 'email' }, { label: 'CNIC', key: 'cnic', type: 'text' }].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} value={(custForm as any)[f.key]} onChange={e => setCustForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            ))}
            <button onClick={handleSaveCustomer} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">Add Customer</button>
          </div>
        </Modal>
      )}

      {showModal === 'sale' && (
        <Modal title="New Sale" onClose={() => { setShowModal(''); setSaleFilterProjectId(''); }}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Unit *</label>
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
              {saleFilterProjectId && (
                <p className="text-xs text-slate-500 mt-1">
                  Filtered to project units
                  {projects.find((p) => p.id === saleFilterProjectId)
                    ? `: ${projects.find((p) => p.id === saleFilterProjectId)!.name}`
                    : ''}
                </p>
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
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Installments (optional)</label>
                <button onClick={() => setInstallForms(prev => [...prev, { due_date: '', due_amount: '' }])} className="text-blue-600 text-xs hover:underline">+ Add</button>
              </div>
              <div className="space-y-2">
                {installForms.map((inst, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input type="date" placeholder="Due Date" value={inst.due_date} onChange={e => setInstallForms(prev => { const n = [...prev]; n[idx].due_date = e.target.value; return n; })}
                      className="border rounded px-2 py-1 text-xs" />
                    <input type="number" placeholder="Amount" value={inst.due_amount} onChange={e => setInstallForms(prev => { const n = [...prev]; n[idx].due_amount = e.target.value; return n; })}
                      className="border rounded px-2 py-1 text-xs" />
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">Create Sale</button>
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
                  return (
                    <option key={s.id} value={s.id}>
                      S-{s.id.slice(-6).toUpperCase()} · {s.customer?.name ?? 'Customer'} · Unit{' '}
                      {s.property_unit?.unit_number ?? '—'} · Due PKR {balance.toLocaleString()}
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
