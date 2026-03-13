import { useEffect, useState } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/suppliers';
import type { Supplier } from '../api/suppliers';
import { getPurchaseOrders } from '../api/procurement';
import type { PurchaseOrder } from '../api/procurement';
import Modal from '../components/Modal';
import DetailDrawer, { DrawerSection, DrawerField, StatusBadge } from '../components/DetailDrawer';

const CATEGORIES = ['Materials', 'Equipment', 'Services', 'Electrical', 'Plumbing', 'Other'];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', contact_name: '', phone: '', email: '', category: '', payment_terms: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Detail drawer
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierOrders, setSupplierOrders] = useState<PurchaseOrder[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const openDetail = async (s: Supplier) => {
    setSelectedSupplier(s);
    setDrawerLoading(true);
    try {
      const orders = await getPurchaseOrders(undefined);
      setSupplierOrders(orders.filter(o => o.supplier_id === s.id));
    } catch { setSupplierOrders([]); }
    finally { setDrawerLoading(false); }
  };

  const load = () => getSuppliers().then(setSuppliers).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', contact_name: '', phone: '', email: '', category: '', payment_terms: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, contact_name: s.contact_name ?? '', phone: s.phone ?? '', email: s.email ?? '', category: s.category ?? '', payment_terms: s.payment_terms ?? '', address: s.address ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Supplier name is required'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        await updateSupplier(editing.id, form);
      } else {
        await createSupplier(form);
      }
      setShowModal(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (!confirm(`Delete supplier "${name ?? id}"?\n\nThis cannot be undone.`)) return;
    try {
      await deleteSupplier(id);
      setSelectedSupplier(null);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-sm text-gray-500">{suppliers.length} total suppliers</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Supplier
        </button>
      </div>

      <input
        type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-10">No suppliers found. Add your first supplier.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div
              key={s.id}
              className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all ${!s.is_active ? 'opacity-50' : ''}`}
              onClick={() => openDetail(s)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{s.name}</h3>
                  {s.category && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s.category}</span>}
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-600 text-sm px-1.5 py-1 rounded hover:bg-blue-50" title="Edit">✏️</button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-gray-400 hover:text-red-600 text-sm px-1.5 py-1 rounded hover:bg-red-50" title="Delete">🗑️</button>
                </div>
              </div>
              {s.contact_name && <p className="text-sm text-gray-600 mt-2">👤 {s.contact_name}</p>}
              {s.phone && <p className="text-sm text-gray-600">📞 {s.phone}</p>}
              {s.email && <p className="text-sm text-gray-600">✉️ {s.email}</p>}
              {s.payment_terms && <p className="text-xs text-gray-400 mt-1">Terms: {s.payment_terms}</p>}
              <p className="text-xs text-blue-500 mt-2">Tap to view details →</p>
            </div>
          ))}
        </div>
      )}

      <DetailDrawer
        open={!!selectedSupplier}
        title={selectedSupplier?.name ?? ''}
        subtitle={selectedSupplier?.category ?? 'Supplier'}
        onClose={() => setSelectedSupplier(null)}
        loading={drawerLoading}
      >
        {selectedSupplier && (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => openEdit(selectedSupplier)}
                className="flex-1 text-sm font-medium border border-blue-300 text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(selectedSupplier.id, selectedSupplier.name)}
                className="flex-1 text-sm font-medium border border-red-300 text-red-700 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                🗑️ Delete
              </button>
            </div>
            <DrawerSection title="Contact Information" />
            <DrawerField label="Contact Person" value={selectedSupplier.contact_name} />
            <DrawerField label="Phone" value={selectedSupplier.phone} />
            <DrawerField label="Email" value={selectedSupplier.email} />
            <DrawerField label="Category" value={selectedSupplier.category} />
            <DrawerField label="Payment Terms" value={selectedSupplier.payment_terms} />
            <DrawerField label="Address" value={selectedSupplier.address} />
            <DrawerField label="Status" value={selectedSupplier.is_active ? 'Active' : 'Inactive'} />

            <DrawerSection title={`Purchase Orders (${supplierOrders.length})`} />
            {supplierOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No purchase orders found for this supplier.</p>
            ) : (
              <div className="space-y-2">
                {supplierOrders.map(o => (
                  <div key={o.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">PO #{o.id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-slate-500">{o.order_date}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-xs text-slate-500">Total</span>
                      <span className="text-xs font-bold text-slate-800">PKR {Number(o.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-blue-700">Total PO Value</span>
                    <span className="text-xs font-bold text-blue-900">
                      PKR {supplierOrders.reduce((s, o) => s + Number(o.total_amount), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DetailDrawer>

      {showModal && (
        <Modal title={editing ? 'Edit Supplier' : 'Add Supplier'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">-- Select --</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} placeholder="e.g. Net 30"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
