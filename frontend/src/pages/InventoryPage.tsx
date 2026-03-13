import { useEffect, useState } from 'react';
import {
  getMaterials, getStockSummary, getLedger, getIssues, getProjectUtilization,
  createMaterial, updateMaterial, deleteMaterial, receiveStock, issueMaterial, adjustStock, getLowStockAlerts,
} from '../api/inventory';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import type { Material, StockSummary, StockLedgerRow, MaterialIssue, ProjectUtilization } from '../api/inventory';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getSuppliers } from '../api/suppliers';
import type { Supplier } from '../api/suppliers';
import Modal from '../components/Modal';
import DetailDrawer, { DrawerSection, DrawerField } from '../components/DetailDrawer';

type Tab = 'stock' | 'catalog' | 'receive' | 'issues' | 'ledger' | 'utilization';

const MOVEMENT_BADGE: Record<string, string> = {
  RECEIPT: 'bg-green-100 text-green-700',
  ISSUE: 'bg-red-100 text-red-700',
  TRANSFER_IN: 'bg-blue-100 text-blue-700',
  TRANSFER_OUT: 'bg-orange-100 text-orange-700',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-700',
  RETURN: 'bg-purple-100 text-purple-700',
};

const MOVEMENT_SIGN: Record<string, string> = {
  RECEIPT: '+', TRANSFER_IN: '+', ADJUSTMENT: '+', RETURN: '+',
  ISSUE: '-', TRANSFER_OUT: '-',
};

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const UNITS = ['bags', 'kg', 'ton', 'pieces', 'nos', 'ft', 'sft', 'rft', 'liter', 'gallon', 'cubic ft', 'cubic m', 'set', 'rolls', 'sheets', 'bundle'];
const CATEGORIES = ['Cement & Binding', 'Steel & Iron', 'Bricks & Blocks', 'Sand & Aggregate', 'Timber & Wood', 'Electrical', 'Plumbing', 'Finishing', 'Hardware', 'Safety', 'Tools & Equipment', 'Other'];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('stock');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stock, setStock] = useState<StockSummary[]>([]);
  const [ledger, setLedger] = useState<StockLedgerRow[]>([]);
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [utilization, setUtilization] = useState<ProjectUtilization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Direct purchase state
  const [showDirectPurchase, setShowDirectPurchase] = useState(false);
  const [dpHeader, setDpHeader] = useState({ supplier_id: '', project_id: '', purchase_date: new Date().toISOString().split('T')[0], invoice_no: '', notes: '' });
  const [dpLines, setDpLines] = useState<{ material_id: string; quantity: string; unit_cost: string }[]>([{ material_id: '', quantity: '', unit_cost: '' }]);
  const [dpSaving, setDpSaving] = useState(false);
  const [dpError, setDpError] = useState('');

  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [utilProject, setUtilProject] = useState('');

  const [showModal, setShowModal] = useState<'material' | 'receive' | 'issue' | 'adjust' | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Material detail drawer
  const [drawerMaterial, setDrawerMaterial] = useState<Material | null>(null);
  const [drawerMaterialStock, setDrawerMaterialStock] = useState<StockSummary | null>(null);
  const [drawerLedger, setDrawerLedger] = useState<StockLedgerRow[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const openMaterialDetail = async (m: Material) => {
    setDrawerMaterial(m);
    setDrawerLoading(true);
    try {
      const [ledgerRows, stockRows] = await Promise.all([
        getLedger({ material_id: m.id }),
        getStockSummary(),
      ]);
      setDrawerLedger(ledgerRows.slice(0, 20));
      setDrawerMaterialStock(stockRows.find(s => s.material_id === m.id) ?? null);
    } catch { setDrawerLedger([]); setDrawerMaterialStock(null); }
    finally { setDrawerLoading(false); }
  };

  // Forms
  const [matForm, setMatForm] = useState({ name: '', unit: 'bags', category: '', min_stock_level: '', standard_unit_cost: '', description: '' });
  const [receiveForm, setReceiveForm] = useState({ material_id: '', quantity: '', unit_cost: '', movement_date: '', project_id: '', reference_no: '', notes: '' });
  const [issueForm, setIssueForm] = useState({ material_id: '', project_id: '', project_stage_id: '', quantity: '', unit_cost: '', issue_date: '', purpose: '', reference_no: '', notes: '' });
  const [adjustForm, setAdjustForm] = useState({ material_id: '', quantity: '', movement_type: 'ADJUSTMENT' as const, movement_date: '', unit_cost: '', notes: '' });
  const [projectStages, setProjectStages] = useState<{ id: string; name: string }[]>([]);

  const loadData = async () => {
    try {
      const [m, s, p, alerts, sup] = await Promise.all([getMaterials(), getStockSummary(), getProjects(), getLowStockAlerts(), getSuppliers()]);
      setMaterials(m); setStock(s); setProjects(p); setLowStockCount(alerts.length); setSuppliers(sup);
    } catch (e: any) { setError(e.message); }
  };

  const loadLedger = async () => {
    try { setLedger(await getLedger({ project_id: filterProject || undefined })); } catch { setLedger([]); }
  };

  const loadIssues = async () => {
    try { setIssues(await getIssues({ project_id: filterProject || undefined })); } catch { setIssues([]); }
  };

  const loadUtilization = async () => {
    if (!utilProject) return;
    try { setUtilization(await getProjectUtilization(utilProject)); } catch { setUtilization(null); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (tab === 'ledger') loadLedger(); }, [tab, filterProject]);
  useEffect(() => { if (tab === 'issues') loadIssues(); }, [tab, filterProject]);
  useEffect(() => { if (tab === 'utilization') loadUtilization(); }, [utilProject]);

  // Load stages when issue project changes
  useEffect(() => {
    if (issueForm.project_id) {
      fetch(`/api/projects/${issueForm.project_id}/stages`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json()).then(setProjectStages).catch(() => setProjectStages([]));
    }
  }, [issueForm.project_id]);

  const save = async (fn: () => Promise<any>) => {
    setSaving(true); setError('');
    try { await fn(); setShowModal(null); loadData(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleSaveMaterial = () => save(async () => {
    if (!matForm.name || !matForm.unit) throw new Error('Name and unit are required');
    if (editingMaterial) await updateMaterial(editingMaterial.id, matForm);
    else await createMaterial(matForm);
    setEditingMaterial(null);
  });

  const handleReceive = () => save(async () => {
    if (!receiveForm.material_id || !receiveForm.quantity || !receiveForm.unit_cost || !receiveForm.movement_date) throw new Error('Material, quantity, unit cost and date required');
    await receiveStock(receiveForm);
  });

  const handleIssue = () => save(async () => {
    if (!issueForm.material_id || !issueForm.project_id || !issueForm.quantity || !issueForm.issue_date) throw new Error('Material, project, quantity and date required');
    await issueMaterial(issueForm);
  });

  const handleAdjust = () => save(async () => {
    if (!adjustForm.material_id || !adjustForm.quantity || !adjustForm.movement_date) throw new Error('All required fields must be filled');
    await adjustStock(adjustForm);
  });

  const handleDirectPurchase = async () => {
    const validLines = dpLines.filter(l => l.material_id && l.quantity && l.unit_cost);
    if (validLines.length === 0) { setDpError('Add at least one item with material, quantity and unit cost'); return; }
    setDpSaving(true); setDpError('');
    try {
      const supplierName = suppliers.find(s => s.id === dpHeader.supplier_id)?.name;
      for (const line of validLines) {
        await receiveStock({
          material_id: line.material_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          movement_date: dpHeader.purchase_date,
          project_id: dpHeader.project_id || undefined,
          reference_no: dpHeader.invoice_no || undefined,
          notes: [
            dpHeader.notes,
            supplierName ? `Supplier: ${supplierName}` : '',
            'Direct Purchase (no PO)',
          ].filter(Boolean).join(' · ') || undefined,
        });
      }
      setShowDirectPurchase(false);
      setDpLines([{ material_id: '', quantity: '', unit_cost: '' }]);
      setDpHeader({ supplier_id: '', project_id: '', purchase_date: new Date().toISOString().split('T')[0], invoice_no: '', notes: '' });
      await loadData();
    } catch (e: any) { setDpError(e.message); }
    finally { setDpSaving(false); }
  };

  const dpTotal = dpLines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);

  const filteredStock = stock.filter(s =>
    (!filterCategory || s.category === filterCategory) &&
    (!search || s.material_name?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'stock', label: '📦 Stock' },
    { id: 'catalog', label: '📋 Catalog' },
    { id: 'receive', label: '📥 Receive' },
    { id: 'issues', label: '📤 Issues' },
    { id: 'ledger', label: '📒 Ledger' },
    { id: 'utilization', label: '📊 Utilization' },
  ];

  const totalStockValue = stock.reduce((s, r) => s + r.stock_value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Material & Inventory</h1>
          <p className="text-sm text-gray-500">
            {materials.length} materials · Stock value: <strong>PKR {fmt(totalStockValue)}</strong>
            {lowStockCount > 0 && <span className="ml-2 text-red-600 font-medium">⚠️ {lowStockCount} low stock alert{lowStockCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportCSV('stock-summary', stock.map(s => ({ Material: s.material_name || s.name, Unit: s.unit, Category: s.category ?? '', 'Current Stock': s.current_stock, 'Stock Value': s.stock_value ?? '' })))} className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">↓ CSV</button>
          <button onClick={() => exportPDF('Stock Summary', ['Material','Unit','Category','Stock','Value (PKR)'], stock.map(s => [s.material_name || s.name, s.unit, s.category ?? '', s.current_stock, Number(s.stock_value ?? 0).toLocaleString()]))} className="border border-red-500 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50">↓ PDF</button>
          <button onClick={() => { setEditingMaterial(null); setMatForm({ name: '', unit: 'bags', category: '', min_stock_level: '', standard_unit_cost: '', description: '' }); setError(''); setShowModal('material'); }}
            className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">+ Material</button>
          <button
            onClick={() => { setDpError(''); setShowDirectPurchase(true); }}
            className="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 font-medium">
            🛒 Direct Purchase
          </button>
          <button onClick={() => { setReceiveForm({ material_id: '', quantity: '', unit_cost: '', movement_date: '', project_id: '', reference_no: '', notes: '' }); setError(''); setShowModal('receive'); }}
            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">📥 Receive Stock</button>
          <button onClick={() => { setIssueForm({ material_id: '', project_id: '', project_stage_id: '', quantity: '', unit_cost: '', issue_date: '', purpose: '', reference_no: '', notes: '' }); setError(''); setShowModal('issue'); }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">📤 Issue Material</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto pb-px">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        {['stock', 'catalog'].includes(tab) && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-48" />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
        {['ledger', 'issues'].includes(tab) && (
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {tab === 'utilization' && (
          <select value={utilProject} onChange={e => { setUtilProject(e.target.value); setUtilization(null); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">-- Select Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {/* ─── STOCK OVERVIEW ─── */}
      {tab === 'stock' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Material</th>
                  <th className="px-4 py-3 text-left text-gray-600">Category</th>
                  <th className="px-4 py-3 text-right text-gray-600">In</th>
                  <th className="px-4 py-3 text-right text-gray-600">Out</th>
                  <th className="px-4 py-3 text-right text-gray-600">Balance</th>
                  <th className="px-4 py-3 text-right text-gray-600">Unit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Stock Value</th>
                  <th className="px-4 py-3 text-center text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-10">No materials yet. Add materials to get started.</td></tr>
                ) : filteredStock.map(s => (
                  <tr key={s.material_id} className={`border-t hover:bg-gray-50 ${s.is_low_stock ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {s.material_name || s.name}
                      {s.is_low_stock && <span className="ml-2 text-xs text-red-500">⚠️ Low</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.category ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">+{s.total_in.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">-{s.total_out.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold text-lg ${s.current_stock <= 0 ? 'text-red-700' : s.is_low_stock ? 'text-yellow-700' : 'text-gray-800'}`}>
                      {s.current_stock.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{s.unit}</td>
                    <td className="px-4 py-3 text-right font-mono">PKR {fmt(s.stock_value)}</td>
                    <td className="px-4 py-3 text-center">
                      {s.current_stock <= 0
                        ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Out of Stock</span>
                        : s.is_low_stock
                        ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Low Stock</span>
                        : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredStock.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-bold">
                  <tr>
                    <td colSpan={6} className="px-4 py-3">Total Stock Value</td>
                    <td className="px-4 py-3 text-right font-mono">PKR {fmt(filteredStock.reduce((s, r) => s + r.stock_value, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ─── MATERIAL CATALOG ─── */}
      {tab === 'catalog' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Min Stock</th>
                  <th className="px-4 py-3 text-right text-gray-600">Std Cost</th>
                  <th className="px-4 py-3 text-left text-gray-600">Description</th>
                  <th className="px-4 py-3 text-center text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.filter(m => (!search || m.name.toLowerCase().includes(search.toLowerCase())) && (!filterCategory || m.category === filterCategory)).length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-10">No materials in catalog. Click "+ Material" to add.</td></tr>
                ) : materials.filter(m => (!search || m.name.toLowerCase().includes(search.toLowerCase())) && (!filterCategory || m.category === filterCategory)).map(m => (
                  <tr key={m.id} className="border-t hover:bg-blue-50 cursor-pointer" onClick={() => openMaterialDetail(m)}>
                    <td className="px-4 py-3 font-medium text-blue-700">{m.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{m.category ?? '-'}</td>
                    <td className="px-4 py-3">{m.unit}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(m.min_stock_level).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">PKR {Number(m.standard_unit_cost).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{m.description ?? '-'}</td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => {
                        setEditingMaterial(m);
                        setMatForm({ name: m.name, unit: m.unit, category: m.category ?? '', min_stock_level: m.min_stock_level, standard_unit_cost: m.standard_unit_cost, description: m.description ?? '' });
                        setError(''); setShowModal('material');
                      }} className="text-blue-600 text-xs hover:underline mr-2">Edit</button>
                      <button onClick={async () => {
                        if (!confirm('Delete this material? This cannot be undone.')) return;
                        try { await deleteMaterial(m.id); loadData(); } catch (e: any) { alert(e.message); }
                      }} className="text-red-600 text-xs hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── RECEIVE TAB (Quick form inline) ─── */}
      {tab === 'receive' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Receive Stock / Purchase</h2>
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                <select value={receiveForm.material_id} onChange={e => setReceiveForm(f => ({ ...f, material_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select Material --</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input type="number" value={receiveForm.quantity} onChange={e => setReceiveForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (PKR) *</label>
                <input type="number" value={receiveForm.unit_cost} onChange={e => setReceiveForm(f => ({ ...f, unit_cost: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={receiveForm.movement_date} onChange={e => setReceiveForm(f => ({ ...f, movement_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project (Optional)</label>
                <select value={receiveForm.project_id} onChange={e => setReceiveForm(f => ({ ...f, project_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- No Project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Invoice No</label>
                <input value={receiveForm.reference_no} onChange={e => setReceiveForm(f => ({ ...f, reference_no: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input value={receiveForm.notes} onChange={e => setReceiveForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            {receiveForm.quantity && receiveForm.unit_cost && (
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <strong>Total Value:</strong> PKR {(Number(receiveForm.quantity) * Number(receiveForm.unit_cost)).toLocaleString()}
              </div>
            )}
            <button onClick={handleReceive} disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : '📥 Receive Stock'}
            </button>
          </div>
        </div>
      )}

      {/* ─── ISSUES HISTORY ─── */}
      {tab === 'issues' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Material</th>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-right text-gray-600">Qty</th>
                  <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Cost</th>
                  <th className="px-4 py-3 text-left text-gray-600">Purpose</th>
                  <th className="px-4 py-3 text-left text-gray-600">Reference</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-10">No issues recorded yet.</td></tr>
                ) : issues.map(i => (
                  <tr key={i.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{i.material?.name ?? i.material_id}</td>
                    <td className="px-4 py-3">{i.issue_date}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">-{Number(i.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{i.material?.unit ?? ''}</td>
                    <td className="px-4 py-3 text-right font-mono">PKR {fmt(Number(i.total_cost))}</td>
                    <td className="px-4 py-3 text-gray-600">{i.purpose ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{i.reference_no ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
              {issues.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-bold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3">Total Issued Value</td>
                    <td className="px-4 py-3 text-right font-mono text-red-700">PKR {fmt(issues.reduce((s, i) => s + Number(i.total_cost), 0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ─── LEDGER ─── */}
      {tab === 'ledger' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600">Material</th>
                  <th className="px-4 py-3 text-center text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right text-gray-600">Quantity</th>
                  <th className="px-4 py-3 text-right text-gray-600">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-gray-600">Total Cost</th>
                  <th className="px-4 py-3 text-left text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-10">No ledger entries yet.</td></tr>
                ) : ledger.map(l => (
                  <tr key={l.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{l.movement_date}</td>
                    <td className="px-4 py-3 font-medium">{l.material?.name ?? l.material_id}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOVEMENT_BADGE[l.movement_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {l.movement_type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${['ISSUE', 'TRANSFER_OUT'].includes(l.movement_type) ? 'text-red-600' : 'text-green-600'}`}>
                      {MOVEMENT_SIGN[l.movement_type]}{Number(l.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">PKR {Number(l.unit_cost).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">PKR {fmt(Number(l.total_cost))}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{l.notes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── UTILIZATION REPORT ─── */}
      {tab === 'utilization' && (
        <div className="space-y-4">
          {!utilProject && <p className="text-gray-400 text-center py-10">Select a project to view material utilization.</p>}
          {utilProject && !utilization && <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}
          {utilization && (
            <>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-sm text-blue-600">Total Material Cost for Project</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">PKR {fmt(utilization.total_material_cost)}</p>
              </div>
              {utilization.by_material.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No materials issued to this project yet.</p>
              ) : (
                <div className="space-y-3">
                  {utilization.by_material.map(m => (
                    <div key={m.material_id} className="bg-white rounded-xl border p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{m.material_name}</h3>
                          <p className="text-xs text-gray-500">{m.category ?? 'Uncategorized'} · {m.total_qty.toLocaleString()} {m.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-800">PKR {fmt(m.total_cost)}</p>
                          <p className="text-xs text-gray-400">
                            {utilization.total_material_cost > 0 ? Math.round((m.total_cost / utilization.total_material_cost) * 100) : 0}% of total
                          </p>
                        </div>
                      </div>
                      {/* Progress bar showing proportion */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${utilization.total_material_cost > 0 ? (m.total_cost / utilization.total_material_cost) * 100 : 0}%` }} />
                      </div>
                      {/* Stage breakdown */}
                      {m.stages.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {m.stages.map(s => (
                            <div key={s.stage_id} className="flex justify-between text-xs text-gray-600 pl-4 border-l-2 border-blue-200">
                              <span>{s.stage_name}: {s.qty.toLocaleString()} {m.unit}</span>
                              <span className="font-mono">PKR {fmt(s.cost)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}

      {/* Material form */}
      {showModal === 'material' && (
        <Modal title={editingMaterial ? 'Edit Material' : 'Add Material'} onClose={() => setShowModal(null)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={matForm.name} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <select value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={matForm.category} onChange={e => setMatForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                <input type="number" value={matForm.min_stock_level} onChange={e => setMatForm(f => ({ ...f, min_stock_level: e.target.value }))}
                  placeholder="Reorder alert threshold"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Std Unit Cost (PKR)</label>
                <input type="number" value={matForm.standard_unit_cost} onChange={e => setMatForm(f => ({ ...f, standard_unit_cost: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={matForm.description} onChange={e => setMatForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <button onClick={handleSaveMaterial} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editingMaterial ? 'Update Material' : 'Add Material'}
            </button>
          </div>
        </Modal>
      )}

      {/* Issue material modal */}
      {showModal === 'issue' && (
        <Modal title="Issue Material to Project" onClose={() => setShowModal(null)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
              <select value={issueForm.material_id} onChange={e => {
                const m = materials.find(x => x.id === e.target.value);
                setIssueForm(f => ({ ...f, material_id: e.target.value, unit_cost: m?.standard_unit_cost ?? '' }));
              }} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select Material --</option>
                {stock.map(s => (
                  <option key={s.material_id} value={s.material_id}>
                    {s.material_name || s.name} (Available: {s.current_stock.toLocaleString()} {s.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select value={issueForm.project_id} onChange={e => setIssueForm(f => ({ ...f, project_id: e.target.value, project_stage_id: '' }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">-- Select Project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage (Optional)</label>
                <select value={issueForm.project_stage_id} onChange={e => setIssueForm(f => ({ ...f, project_stage_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">-- Select Stage --</option>
                  {projectStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input type="number" value={issueForm.quantity} onChange={e => setIssueForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                <input type="number" value={issueForm.unit_cost} onChange={e => setIssueForm(f => ({ ...f, unit_cost: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={issueForm.issue_date} onChange={e => setIssueForm(f => ({ ...f, issue_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input value={issueForm.reference_no} onChange={e => setIssueForm(f => ({ ...f, reference_no: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <input value={issueForm.purpose} onChange={e => setIssueForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="e.g. Foundation work, Plastering..."
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            {issueForm.quantity && issueForm.unit_cost && (
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <strong>Total Cost:</strong> PKR {(Number(issueForm.quantity) * Number(issueForm.unit_cost)).toLocaleString()}
              </div>
            )}
            <button onClick={handleIssue} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : '📤 Issue Material'}
            </button>
          </div>
        </Modal>
      )}

      {/* Adjust / Return stock modal */}
      {showModal === 'adjust' && (
        <Modal title="Stock Adjustment / Return" onClose={() => setShowModal(null)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
              <select value={adjustForm.material_id} onChange={e => setAdjustForm(f => ({ ...f, material_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select Material --</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select value={adjustForm.movement_type} onChange={e => setAdjustForm(f => ({ ...f, movement_type: e.target.value as any }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="ADJUSTMENT">Adjustment (+)</option>
                  <option value="RETURN">Return from Site (+)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input type="number" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={adjustForm.movement_date} onChange={e => setAdjustForm(f => ({ ...f, movement_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                <input type="number" value={adjustForm.unit_cost} onChange={e => setAdjustForm(f => ({ ...f, unit_cost: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reason</label>
              <input value={adjustForm.notes} onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={handleAdjust} disabled={saving} className="w-full bg-yellow-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-yellow-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Adjustment'}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── DIRECT PURCHASE MODAL ─── */}
      {showDirectPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">🛒 Direct Purchase (No PO)</h3>
                <p className="text-sm text-gray-500 mt-0.5">Record materials bought directly — no Purchase Order needed. All items go straight into inventory stock.</p>
              </div>
              <button onClick={() => setShowDirectPurchase(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Supplier (Optional)</label>
                  <select value={dpHeader.supplier_id} onChange={e => setDpHeader(h => ({ ...h, supplier_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="">-- Cash / Unknown Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Project (Optional)</label>
                  <select value={dpHeader.project_id} onChange={e => setDpHeader(h => ({ ...h, project_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="">-- No Project --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date *</label>
                  <input type="date" value={dpHeader.purchase_date} onChange={e => setDpHeader(h => ({ ...h, purchase_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice / Bill No</label>
                  <input value={dpHeader.invoice_no} onChange={e => setDpHeader(h => ({ ...h, invoice_no: e.target.value }))}
                    placeholder="e.g. INV-1234"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input value={dpHeader.notes} onChange={e => setDpHeader(h => ({ ...h, notes: e.target.value }))}
                    placeholder="e.g. Emergency purchase from market"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Items Purchased</h4>
                  <button
                    onClick={() => setDpLines(l => [...l, { material_id: '', quantity: '', unit_cost: '' }])}
                    className="text-xs text-orange-600 hover:text-orange-800 font-medium border border-orange-300 px-2 py-1 rounded-lg hover:bg-orange-50"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {dpLines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-xl p-3">
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-xs text-gray-500 mb-1">Material *</label>
                        <select value={line.material_id}
                          onChange={e => {
                            const mat = materials.find(m => m.id === e.target.value);
                            setDpLines(prev => prev.map((l, i) => i === idx ? { ...l, material_id: e.target.value, unit_cost: mat?.standard_unit_cost ?? l.unit_cost } : l));
                          }}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                          <option value="">-- Select --</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">Qty *</label>
                        <input type="number" value={line.quantity} placeholder="0"
                          onChange={e => setDpLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">Unit Cost (PKR) *</label>
                        <input type="number" value={line.unit_cost} placeholder="0"
                          onChange={e => setDpLines(prev => prev.map((l, i) => i === idx ? { ...l, unit_cost: e.target.value } : l))}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-end pb-0.5">
                        {dpLines.length > 1 && (
                          <button onClick={() => setDpLines(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 text-lg w-full flex justify-center">×</button>
                        )}
                      </div>
                      {line.quantity && line.unit_cost && (
                        <div className="col-span-12 text-xs text-orange-700 font-medium -mt-1 pl-1">
                          = PKR {(Number(line.quantity) * Number(line.unit_cost)).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand total */}
              {dpTotal > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-orange-800">Total Purchase Value</span>
                  <span className="text-lg font-bold text-orange-900">PKR {dpTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t space-y-3">
              {dpError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{dpError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowDirectPurchase(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleDirectPurchase} disabled={dpSaving}
                  className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                  {dpSaving ? 'Saving…' : `✓ Save ${dpLines.filter(l => l.material_id && l.quantity && l.unit_cost).length} Item(s) to Inventory`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Float button for Adjust */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <button onClick={() => { setAdjustForm({ material_id: '', quantity: '', movement_type: 'ADJUSTMENT', movement_date: '', unit_cost: '', notes: '' }); setError(''); setShowModal('adjust'); }}
          className="bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg text-sm hover:bg-yellow-600">
          ⚖️ Adjust
        </button>
      </div>

      <DetailDrawer
        open={!!drawerMaterial}
        title={drawerMaterial?.name ?? ''}
        subtitle={`${drawerMaterial?.category ?? 'Material'} · ${drawerMaterial?.unit ?? ''}`}
        onClose={() => setDrawerMaterial(null)}
        loading={drawerLoading}
      >
        {drawerMaterial && (
          <>
            <DrawerSection title="Material Info" />
            <DrawerField label="Category" value={drawerMaterial.category} />
            <DrawerField label="Unit" value={drawerMaterial.unit} />
            <DrawerField label="Standard Cost" value={`PKR ${Number(drawerMaterial.standard_unit_cost).toLocaleString()}`} />
            <DrawerField label="Min Stock Level" value={`${Number(drawerMaterial.min_stock_level).toLocaleString()} ${drawerMaterial.unit}`} />
            <DrawerField label="Description" value={drawerMaterial.description} />

            {drawerMaterialStock && (
              <>
                <DrawerSection title="Current Stock" />
                <DrawerField label="In Stock" value={`${drawerMaterialStock.current_stock.toLocaleString()} ${drawerMaterial.unit}`} />
                <DrawerField label="Total Received" value={`${drawerMaterialStock.total_in.toLocaleString()} ${drawerMaterial.unit}`} />
                <DrawerField label="Total Issued" value={`${drawerMaterialStock.total_out.toLocaleString()} ${drawerMaterial.unit}`} />
                <DrawerField label="Stock Value" value={`PKR ${drawerMaterialStock.stock_value.toLocaleString()}`} />
                {drawerMaterialStock.is_low_stock && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
                    ⚠️ Low stock — below minimum level
                  </div>
                )}
              </>
            )}

            <DrawerSection title={`Recent Movements (${drawerLedger.length})`} />
            {drawerLedger.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No ledger entries yet.</p>
            ) : (
              <div className="space-y-1">
                {drawerLedger.map(row => (
                  <div key={row.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold mr-2 ${
                        ['RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN'].includes(row.movement_type)
                          ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{row.movement_type}</span>
                      <span className="text-slate-500">{row.movement_date}</span>
                    </div>
                    <span className="font-semibold text-slate-800">
                      {['RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN'].includes(row.movement_type) ? '+' : '-'}
                      {Number(row.quantity).toLocaleString()} {drawerMaterial.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
