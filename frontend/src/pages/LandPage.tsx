import { useEffect, useState } from 'react';
import { getLandParcels, createLandParcel, updateLandParcel, deleteLandParcel } from '../api/land';
import type { LandParcel } from '../api/land';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import Modal from '../components/Modal';
import PakistanLocationInput from '../components/PakistanLocationInput';

const STATUSES = ['Owned', 'UnderTransfer', 'Disputed', 'SoldOnward'];

const emptyForm: Partial<LandParcel> = {
  project_id: '',
  plot_number: '',
  owner_name: '',
  owner_cnic: '',
  owner_phone: '',
  location: '',
  area: '',
  area_sqft: '',
  purchase_agreement_no: '',
  purchase_agreement_date: '',
  purchase_agreement_file: '',
  sale_deed_no: '',
  sale_deed_date: '',
  sale_deed_registrar: '',
  sale_deed_file: '',
  purchase_price: '',
  purchase_date: '',
  status: 'Owned',
  notes: '',
};

export default function LandPage() {
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LandParcel | null>(null);
  const [form, setForm] = useState<Partial<LandParcel>>(emptyForm);

  const load = () => {
    setLoading(true);
    Promise.all([getLandParcels(), getProjects()])
      .then(([p, proj]) => { setParcels(p); setProjects(proj); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (p: LandParcel) => {
    setEditing(p);
    setForm({ ...p, project_id: p.project_id ?? '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.plot_number || !form.owner_name || !form.location) {
      setError('Plot number, owner, and location are required');
      return;
    }
    setError('');
    const payload = {
      ...form,
      project_id: form.project_id || null,
      area_sqft: form.area_sqft || null,
      purchase_price: form.purchase_price || null,
      purchase_agreement_date: form.purchase_agreement_date || null,
      sale_deed_date: form.sale_deed_date || null,
      purchase_date: form.purchase_date || null,
    };
    try {
      if (editing) await updateLandParcel(editing.id, payload);
      else await createLandParcel(payload);
      setShowModal(false);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this land parcel record?')) return;
    try { await deleteLandParcel(id); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Land Registry</h1>
          <p className="text-sm text-gray-500">Plot title, deeds, and purchase agreements</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Parcel</button>
      </div>

      {error && !showModal && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : parcels.length === 0 ? (
        <div className="text-center text-gray-400 py-10">No land parcels registered yet.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Plot #</th>
                  <th className="px-4 py-3 text-left text-gray-600">Owner</th>
                  <th className="px-4 py-3 text-left text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left text-gray-600">Area</th>
                  <th className="px-4 py-3 text-left text-gray-600">Deed #</th>
                  <th className="px-4 py-3 text-left text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{p.plot_number}</td>
                    <td className="px-4 py-3">{p.owner_name}</td>
                    <td className="px-4 py-3">{p.location}</td>
                    <td className="px-4 py-3">{p.area || (p.area_sqft ? `${p.area_sqft} sqft` : '-')}</td>
                    <td className="px-4 py-3">{p.sale_deed_no ?? '-'}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{p.status}</span></td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 text-xs hover:underline">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 text-xs hover:underline">Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Land Parcel' : 'Register Land Parcel'} onClose={() => setShowModal(false)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Linked Project</label>
                <select value={form.project_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">— None —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plot Number *</label>
                <input value={form.plot_number ?? ''} onChange={(e) => setForm((f) => ({ ...f, plot_number: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={form.status ?? 'Owned'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Owner *</label>
                <input value={form.owner_name ?? ''} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Owner CNIC</label>
                <input value={form.owner_cnic ?? ''} onChange={(e) => setForm((f) => ({ ...f, owner_cnic: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Location *</label>
                <PakistanLocationInput
                  required
                  value={form.location ?? ''}
                  onChange={(location) => setForm((f) => ({ ...f, location }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Area (text)</label>
                <input value={form.area ?? ''} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} placeholder="e.g. 10 Marla" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Area (sqft)</label>
                <input type="number" value={form.area_sqft ?? ''} onChange={(e) => setForm((f) => ({ ...f, area_sqft: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Agreement #</label>
                <input value={form.purchase_agreement_no ?? ''} onChange={(e) => setForm((f) => ({ ...f, purchase_agreement_no: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Agreement Date</label>
                <input type="date" value={form.purchase_agreement_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, purchase_agreement_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Agreement File URL</label>
                <input value={form.purchase_agreement_file ?? ''} onChange={(e) => setForm((f) => ({ ...f, purchase_agreement_file: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sale Deed #</label>
                <input value={form.sale_deed_no ?? ''} onChange={(e) => setForm((f) => ({ ...f, sale_deed_no: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deed Date</label>
                <input type="date" value={form.sale_deed_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, sale_deed_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Registrar</label>
                <input value={form.sale_deed_registrar ?? ''} onChange={(e) => setForm((f) => ({ ...f, sale_deed_registrar: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deed File URL</label>
                <input value={form.sale_deed_file ?? ''} onChange={(e) => setForm((f) => ({ ...f, sale_deed_file: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Price</label>
                <input type="number" value={form.purchase_price ?? ''} onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Date</label>
                <input type="date" value={form.purchase_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
