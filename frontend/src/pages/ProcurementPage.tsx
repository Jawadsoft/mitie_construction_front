import { useEffect, useState } from 'react';
import { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, createReceipt } from '../api/procurement';
import type { PurchaseOrder, PoItem } from '../api/procurement';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getSuppliers } from '../api/suppliers';
import type { Supplier } from '../api/suppliers';
import { getMaterials, receiveStock } from '../api/inventory';
import type { Material } from '../api/inventory';
import Modal from '../components/Modal';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Approved: 'bg-blue-100 text-blue-700',
  Received: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function ProcurementPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [orderForm, setOrderForm] = useState({ project_id: '', supplier_id: '', order_date: new Date().toISOString().split('T')[0], expected_delivery: '', notes: '' });
  const [items, setItems] = useState<Partial<PoItem>[]>([{ material_name: '', unit: 'pcs', quantity: '1', unit_price: '0', total_price: '0' }]);

  // Receive-to-inventory modal
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveLines, setReceiveLines] = useState<{ material_id: string; material_name: string; quantity: string; unit_cost: string; skip: boolean }[]>([]);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiving, setReceiving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getPurchaseOrders(), getProjects(), getSuppliers(), getMaterials()])
      .then(([o, p, s, m]) => { setOrders(o); setProjects(p); setSuppliers(s); setMaterials(m); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const viewPO = async (id: string) => {
    try { setSelectedPO(await getPurchaseOrder(id)); } catch (e: any) { setError(e.message); }
  };

  const updateItem = (idx: number, field: keyof PoItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = Number(field === 'quantity' ? value : updated[idx].quantity);
        const price = Number(field === 'unit_price' ? value : updated[idx].unit_price);
        updated[idx].total_price = (qty * price).toString();
      }
      return updated;
    });
  };

  const handleCreate = async () => {
    if (!orderForm.project_id || !orderForm.supplier_id) { setError('Project and supplier are required'); return; }
    if (items.some(i => !i.material_name)) { setError('All items must have a material name'); return; }
    setError('');
    try {
      await createPurchaseOrder({ order: orderForm, items: items as PoItem[] });
      setShowCreate(false);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await updatePurchaseOrder(id, { status }); load(); } catch (e: any) { setError(e.message); }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    const lines = (po.items ?? []).map(item => {
      // Try to find matching material by name (case-insensitive)
      const match = materials.find(m => m.name.toLowerCase() === item.material_name.toLowerCase());
      return {
        material_id: match?.id ?? '',
        material_name: item.material_name,
        quantity: item.quantity,
        unit_cost: item.unit_price,
        skip: false,
      };
    });
    setReceiveLines(lines);
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = async () => {
    if (!selectedPO) return;
    const toReceive = receiveLines.filter(l => !l.skip && l.material_id);
    if (toReceive.length === 0 && receiveLines.some(l => !l.skip)) {
      setError('Please select a material from the catalog for each item, or mark it as skip.');
      return;
    }
    setReceiving(true);
    setError('');
    try {
      // Create stock ledger entries for each item
      for (const line of toReceive) {
        await receiveStock({
          material_id: line.material_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          movement_date: receiveDate,
          project_id: selectedPO.project_id,
          purchase_order_id: selectedPO.id,
          reference_no: `PO-${selectedPO.id.slice(-6).toUpperCase()}`,
          notes: `Received from PO #${selectedPO.id.slice(-6).toUpperCase()}`,
        });
      }
      // Mark PO as received
      await createReceipt(selectedPO.id, { receipt_date: receiveDate, notes: `Received ${toReceive.length} item(s) into inventory` });
      setShowReceiveModal(false);
      // Refresh the PO detail
      const updated = await getPurchaseOrder(selectedPO.id);
      setSelectedPO(updated);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setReceiving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase order? This will also remove all items and receipts.')) return;
    try { await deletePurchaseOrder(id); load(); } catch (e: any) { setError(e.message); }
  };

  const handleExportCSV = () => {
    exportCSV('purchase-orders', orders.map(o => ({
      'PO#': o.id, Date: o.order_date, Status: o.status,
      'Supplier ID': o.supplier_id, 'Project ID': o.project_id,
      'Total (PKR)': o.total_amount, Notes: o.notes ?? '',
    })));
  };

  const handleExportPDF = () => {
    exportPDF('Purchase Orders', ['PO#', 'Date', 'Status', 'Amount (PKR)', 'Notes'],
      orders.map(o => [`#${o.id}`, o.order_date, o.status, Number(o.total_amount).toLocaleString(), o.notes ?? ''])
    );
  };

  if (selectedPO) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedPO(null)} className="text-blue-600 hover:underline text-sm">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Purchase Order #{selectedPO.id}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[selectedPO.status]}`}>{selectedPO.status}</span>
        </div>
        <div className="bg-white rounded-xl border p-4 grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Order Date:</span> <span className="font-medium ml-1">{selectedPO.order_date}</span></div>
          <div><span className="text-gray-500">Expected Delivery:</span> <span className="font-medium ml-1">{selectedPO.expected_delivery ?? '-'}</span></div>
          <div><span className="text-gray-500">Total Amount:</span> <span className="font-medium ml-1">PKR {Number(selectedPO.total_amount).toLocaleString()}</span></div>
        </div>
        {selectedPO.status === 'Draft' && (
          <div className="flex gap-3">
            <button onClick={() => handleStatusChange(selectedPO.id, 'Approved')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">✓ Approve PO</button>
            <button onClick={() => handleStatusChange(selectedPO.id, 'Cancelled')} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">✕ Cancel</button>
          </div>
        )}
        {selectedPO.status === 'Approved' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">📦 Materials Delivered?</p>
            <p className="text-xs text-amber-600 mb-3">
              Clicking <strong>Receive into Inventory</strong> will record all items from this PO into the inventory stock ledger with the purchase price as unit cost.
            </p>
            <button
              onClick={() => openReceiveModal(selectedPO)}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
            >
              📥 Receive into Inventory
            </button>
          </div>
        )}
        {selectedPO.status === 'Received' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <span className="text-green-600 text-lg">✅</span>
            <p className="text-sm text-green-700 font-medium">This PO has been received — all items are recorded in inventory stock.</p>
          </div>
        )}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Material</th>
                <th className="px-4 py-3 text-left text-gray-600">Unit</th>
                <th className="px-4 py-3 text-right text-gray-600">Qty</th>
                <th className="px-4 py-3 text-right text-gray-600">Unit Price (PKR)</th>
                <th className="px-4 py-3 text-right text-gray-600">Total (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {(selectedPO.items ?? []).map(item => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{item.material_name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.unit ?? '-'}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(item.unit_price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{Number(item.total_price).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50">
                <td colSpan={4} className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Grand Total</td>
                <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">
                  PKR {Number(selectedPO.total_amount).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Receive to Inventory Modal */}
        {showReceiveModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b">
                <h3 className="font-bold text-gray-900 text-lg">📥 Receive into Inventory</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Match each PO item to a material in the inventory catalog. Unit cost is pre-filled from the PO price.
                </p>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm font-medium text-gray-700 shrink-0">Receipt Date</label>
                  <input type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                </div>

                {receiveLines.map((line, idx) => (
                  <div key={idx} className={`rounded-xl border p-4 space-y-3 ${line.skip ? 'opacity-50 bg-gray-50' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800 text-sm">{line.material_name}</p>
                      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={line.skip}
                          onChange={e => setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, skip: e.target.checked } : l))}
                          className="accent-gray-500" />
                        Skip (no inventory update)
                      </label>
                    </div>
                    {!line.skip && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Match to Catalog Material *</label>
                          <select
                            value={line.material_id}
                            onChange={e => setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, material_id: e.target.value } : l))}
                            className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 ${!line.material_id ? 'border-amber-400' : 'border-gray-300'}`}
                          >
                            <option value="">-- Select Material --</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                            ))}
                          </select>
                          {!line.material_id && <p className="text-xs text-amber-600 mt-1">Required — select from catalog</p>}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                          <input type="number" value={line.quantity}
                            onChange={e => setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Unit Cost (PKR)</label>
                          <input type="number" value={line.unit_cost}
                            onChange={e => setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, unit_cost: e.target.value } : l))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                        </div>
                      </div>
                    )}
                    {!line.skip && line.quantity && line.unit_cost && (
                      <p className="text-xs text-green-700 font-medium">
                        Total stock value: PKR {(Number(line.quantity) * Number(line.unit_cost)).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t space-y-3">
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setShowReceiveModal(false); setError(''); }}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handleConfirmReceive} disabled={receiving}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                    {receiving ? 'Saving…' : `✓ Confirm & Receive ${receiveLines.filter(l => !l.skip).length} Items`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Procurement</h1>
          <p className="text-sm text-gray-500">Manage purchase orders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="border border-green-600 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50">↓ CSV</button>
          <button onClick={handleExportPDF} className="border border-red-500 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50">↓ PDF</button>
          <button onClick={() => { setError(''); setShowCreate(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ New PO</button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : orders.length === 0 ? (
        <div className="text-center text-gray-400 py-10">No purchase orders yet.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">#</th>
                  <th className="px-4 py-3 text-left text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-gray-600">Amount (PKR)</th>
                  <th className="px-4 py-3 text-left text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t hover:bg-blue-50 cursor-pointer" onClick={() => viewPO(o.id)}>
                    <td className="px-4 py-3 font-medium text-blue-700">PO-{o.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3">{o.order_date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{Number(o.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2 items-center">
                        <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}
                          className="text-xs border rounded px-1 py-0.5">
                          {['Draft','Approved','Received','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => handleDelete(o.id)} className="text-red-600 hover:text-red-800 text-xs px-1 py-0.5 rounded hover:bg-red-50">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <Modal title="New Purchase Order" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select value={orderForm.project_id} onChange={e => setOrderForm(f => ({ ...f, project_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select value={orderForm.supplier_id} onChange={e => setOrderForm(f => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Select --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                <input type="date" value={orderForm.order_date} onChange={e => setOrderForm(f => ({ ...f, order_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                <input type="date" value={orderForm.expected_delivery} onChange={e => setOrderForm(f => ({ ...f, expected_delivery: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Items *</label>
                <button onClick={() => setItems(prev => [...prev, { material_name: '', unit: 'pcs', quantity: '1', unit_price: '0', total_price: '0' }])}
                  className="text-blue-600 text-xs hover:underline">+ Add Item</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 bg-gray-50 p-2 rounded">
                    <input placeholder="Material" value={item.material_name ?? ''} onChange={e => updateItem(idx, 'material_name', e.target.value)}
                      className="col-span-2 border rounded px-2 py-1 text-xs" />
                    <input type="number" placeholder="Qty" value={item.quantity ?? ''} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      className="border rounded px-2 py-1 text-xs" />
                    <input type="number" placeholder="Unit Price" value={item.unit_price ?? ''} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                      className="border rounded px-2 py-1 text-xs" />
                    <div className="col-span-2 text-xs text-gray-500 pl-1">
                      Total: PKR {Number(item.total_price ?? 0).toLocaleString()}
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        className="col-span-2 text-red-500 text-xs hover:underline text-right">Remove</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={handleCreate} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">Create Purchase Order</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
