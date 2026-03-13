import { useEffect, useState } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../api/projects';
import type { Project } from '../api/projects';
import Modal from '../components/Modal';

const STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-slate-100 text-slate-700',
  Active: 'bg-green-100 text-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-blue-100 text-blue-700',
  Sold: 'bg-purple-100 text-purple-700',
};

const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Sold'];

interface Props {
  onSelectProject: (id: string) => void;
}

export default function ProjectsPage({ onSelectProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const emptyForm = { name: '', location: '', project_type: '', total_estimated_budget: '', start_date: '', expected_completion_date: '', status: 'Planning', plot_size: '' };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      setProjects(await getProjects());
    } catch { setError('Failed to load projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (p: Project) => {
    setEditing(p);
    setEditForm({
      name: p.name, location: p.location ?? '', project_type: p.project_type ?? '',
      total_estimated_budget: p.total_estimated_budget ?? '', start_date: p.start_date ?? '',
      expected_completion_date: p.expected_completion_date ?? '', status: p.status, plot_size: p.plot_size ?? '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await updateProject(editing.id, { ...editForm, total_estimated_budget: editForm.total_estimated_budget || null } as any);
      setShowEditModal(false);
      await load();
    } catch { setError('Failed to update project'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject({ ...form, total_estimated_budget: form.total_estimated_budget || null } as any);
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch { setError('Failed to create project'); }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (!confirm(
      `Delete project "${name ?? id}"?\n\n` +
      `This will permanently remove:\n` +
      `• All stages & budgets\n` +
      `• All expenses & labour records\n` +
      `• All purchase orders & inventory movements\n` +
      `• All sales & installments\n\n` +
      `This cannot be undone.`
    )) return;
    try { await deleteProject(id); await load(); }
    catch (e: any) { setError(e.message || 'Failed to delete project'); }
  };

  const filtered = filterStatus ? projects.filter(p => p.status === filterStatus) : projects;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="flex gap-2 flex-wrap">
          <select
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            className="rounded bg-slate-900 text-white px-4 py-1.5 text-sm font-medium hover:bg-slate-800"
            onClick={() => setShowForm(v => !v)}
          >
            {showForm ? 'Cancel' : '+ New Project'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
          <h2 className="font-medium text-slate-800">New Project</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Project Name *</label>
              <input required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Project Type</label>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Residential / Commercial…" value={form.project_type} onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plot Size</label>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 10 Marla" value={form.plot_size} onChange={e => setForm(f => ({ ...f, plot_size: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Budget (PKR)</label>
              <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.total_estimated_budget} onChange={e => setForm(f => ({ ...f, total_estimated_budget: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expected Completion</label>
              <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.expected_completion_date} onChange={e => setForm(f => ({ ...f, expected_completion_date: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="w-full rounded bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-800">
            Create Project
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-sm text-slate-500">
          No projects found. Create your first project above.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <button
                  className="text-left font-medium text-slate-900 hover:text-slate-600 leading-tight"
                  onClick={() => onSelectProject(p.id)}
                >
                  {p.name}
                </button>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-700'}`}>
                  {p.status}
                </span>
              </div>
              {p.location && <p className="text-xs text-slate-500">{p.location}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">Budget</p>
                  <p className="font-medium">
                    {p.total_estimated_budget
                      ? `PKR ${Number(p.total_estimated_budget).toLocaleString()}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Stages</p>
                  <p className="font-medium">{p.computed?.stage_count ?? 0}</p>
                </div>
              </div>
              {p.computed && p.computed.stage_count > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Completion</span>
                    <span className="font-medium">{p.computed.avg_completion_percent}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full transition-all"
                      style={{ width: `${p.computed.avg_completion_percent}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button className="flex-1 text-xs rounded border border-slate-300 py-1.5 hover:bg-slate-50" onClick={() => onSelectProject(p.id)}>View Details</button>
                <button className="text-xs rounded border border-blue-200 text-blue-600 px-3 py-1.5 hover:bg-blue-50" onClick={() => openEdit(p)}>Edit</button>
                <button className="text-xs rounded border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditModal && editing && (
        <Modal title={`Edit: ${editing.name}`} onClose={() => setShowEditModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: 'Project Name *', key: 'name' }, { label: 'Location', key: 'location' },
                { label: 'Project Type', key: 'project_type' }, { label: 'Plot Size', key: 'plot_size' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                  <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={(editForm as any)[f.key]} onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Budget (PKR)</label>
                <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.total_estimated_budget} onChange={e => setEditForm(f => ({ ...f, total_estimated_budget: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Expected Completion</label>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.expected_completion_date} onChange={e => setEditForm(f => ({ ...f, expected_completion_date: e.target.value }))} />
              </div>
            </div>
            <button onClick={handleUpdate} className="w-full rounded bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-800">
              Save Changes
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
