import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  TYPE_LABELS,
  SUBTYPE_LABELS,
  STRATEGY_LABELS,
  subtypesForType,
  normalizeProjectFields,
} from '../api/projects';
import type { Project, ProjectTypeCode, ProjectStrategy, ProjectSubtype } from '../api/projects';
import Modal from '../components/Modal';
import FieldLabel from '../components/FieldLabel';
import MoneyInput from '../components/MoneyInput';
import PakistanLocationInput from '../components/PakistanLocationInput';
import PlotSizeField from '../components/PlotSizeField';
import ProjectQuickEntry from '../components/ProjectQuickEntry';
import type { QuickEntryKind } from '../components/ProjectQuickEntry';
import ProjectActivityLog from '../components/ProjectActivityLog';
import { useConfirm } from '../components/ConfirmDialog';
import { notify, notifyError } from '../utils/toast';
import { formatPlotEquivalents, PAKISTAN_MARLA_SQFT } from '../utils/plotSize';
import { getMeasurementSettings } from '../api/settings';
import { parseMoneyInput } from '../utils/money';
import type { NavQuickAction } from '../types/navIntent';

function moneyDigits(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return parseMoneyInput(String(raw));
  return String(Math.floor(Math.abs(n)));
}

const STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-slate-100 text-slate-700',
  Active: 'bg-green-100 text-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-blue-100 text-blue-700',
  Sold: 'bg-purple-100 text-purple-700',
  'Sold During Construction': 'bg-indigo-100 text-indigo-800',
  Cancelled: 'bg-red-100 text-red-700',
};

const STATUSES = [
  'Planning',
  'Active',
  'On Hold',
  'Completed',
  'Sold',
  'Sold During Construction',
  'Cancelled',
];

type ProjectFormState = {
  name: string;
  location: string;
  owner_name: string;
  manager_name: string;
  project_type: ProjectTypeCode;
  project_subtype: ProjectSubtype;
  project_strategy: ProjectStrategy;
  total_estimated_budget: string;
  target_sale_price: string;
  start_date: string;
  expected_completion_date: string;
  status: string;
  plot_size_sqft: number | null;
};

const emptyForm = (): ProjectFormState => ({
  name: '',
  location: '',
  owner_name: '',
  manager_name: '',
  project_type: 'READY_PROPERTY',
  project_subtype: 'ALREADY_CONSTRUCTED_HOUSE',
  project_strategy: 'DIRECT_SALE',
  total_estimated_budget: '',
  target_sale_price: '',
  start_date: '',
  expected_completion_date: '',
  status: 'Planning',
  plot_size_sqft: null,
});

function formFromProject(p: Project): ProjectFormState {
  const n = normalizeProjectFields(p);
  const type: ProjectTypeCode = n.project_type === 'LAND' ? 'LAND' : 'READY_PROPERTY';
  const allowed = subtypesForType(type);
  const subtype = (allowed.includes(p.project_subtype as ProjectSubtype)
    ? p.project_subtype
    : allowed[0]) as ProjectSubtype;
  let strategy: ProjectStrategy = n.project_strategy === 'DEVELOPMENT' ? 'DEVELOPMENT' : 'DIRECT_SALE';
  if (type === 'READY_PROPERTY') strategy = 'DIRECT_SALE';
  const sqftRaw = p.plot_size_sqft;
  const plot_size_sqft =
    sqftRaw != null && sqftRaw !== '' && Number.isFinite(Number(sqftRaw))
      ? Number(sqftRaw)
      : null;
  return {
    name: p.name,
    location: p.location ?? '',
    owner_name: p.owner_name ?? '',
    manager_name: p.manager_name ?? '',
    project_type: type,
    project_subtype: subtype,
    project_strategy: strategy,
    total_estimated_budget: moneyDigits(p.total_estimated_budget),
    target_sale_price: moneyDigits(p.target_sale_price),
    start_date: p.start_date ?? '',
    expected_completion_date: p.expected_completion_date ?? '',
    status: p.status,
    plot_size_sqft,
  };
}

function TaxonomyFields({
  form,
  setForm,
  namePrefix,
}: {
  form: ProjectFormState;
  setForm: Dispatch<SetStateAction<ProjectFormState>>;
  namePrefix: string;
}) {
  const subtypes = subtypesForType(form.project_type);
  return (
    <>
      <div className="md:col-span-2">
        <FieldLabel info="Ready Property is already built; Land is a plot or parcel you may develop or sell as-is." required>
          Project Type
        </FieldLabel>
        <div className="flex flex-wrap gap-4 pt-1">
          {(['READY_PROPERTY', 'LAND'] as ProjectTypeCode[]).map((t) => (
            <label key={t} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={`${namePrefix}_type`}
                checked={form.project_type === t}
                onChange={() => {
                  const nextSubs = subtypesForType(t);
                  setForm((f) => ({
                    ...f,
                    project_type: t,
                    project_subtype: nextSubs[0],
                    project_strategy: t === 'READY_PROPERTY' ? 'DIRECT_SALE' : f.project_strategy,
                  }));
                }}
              />
              {TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel info="Specific kind of asset under the selected project type." required>
          Subtype
        </FieldLabel>
        <select
          required
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={form.project_subtype}
          onChange={(e) => setForm((f) => ({ ...f, project_subtype: e.target.value as ProjectSubtype }))}
        >
          {subtypes.map((s) => (
            <option key={s} value={s}>{SUBTYPE_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel info="Direct Sale skips construction. Development uses construction stages then sale." required>
          Project Strategy
        </FieldLabel>
        {form.project_type === 'READY_PROPERTY' ? (
          <p className="text-sm text-slate-700 pt-2">
            {STRATEGY_LABELS.DIRECT_SALE}{' '}
            <span className="text-slate-400">(Buy → Hold → Sell — no construction)</span>
          </p>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            {(['DIRECT_SALE', 'DEVELOPMENT'] as ProjectStrategy[]).map((s) => (
              <label key={s} className="inline-flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`${namePrefix}_strategy`}
                  className="mt-1"
                  checked={form.project_strategy === s}
                  onChange={() => setForm((f) => ({ ...f, project_strategy: s }))}
                />
                <span>
                  <span className="font-medium">{STRATEGY_LABELS[s]}</span>
                  <span className="block text-xs text-slate-400">
                    {s === 'DIRECT_SALE'
                      ? 'Purchase → Hold → Sell (no construction stages)'
                      : 'Purchase → Planning → Construction → Sale'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

interface Props {
  onSelectProject: (id: string) => void;
  onQuickAction: (projectId: string, action: NavQuickAction) => void;
}

export default function ProjectsPage({ onSelectProject, onQuickAction }: Props) {
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [quickEntry, setQuickEntry] = useState<{ project: Project; kind: QuickEntryKind } | null>(null);
  const [activityProject, setActivityProject] = useState<Project | null>(null);
  const [marlaSqft, setMarlaSqft] = useState(PAKISTAN_MARLA_SQFT);

  const load = async () => {
    try {
      setLoading(true);
      setProjects(await getProjects());
    } catch { setError('Failed to load projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    getMeasurementSettings()
      .then((m) => setMarlaSqft(m.marla_sqft))
      .catch(() => setMarlaSqft(PAKISTAN_MARLA_SQFT));
  }, []);

  const openEdit = (p: Project) => {
    setEditing(p);
    setEditForm(formFromProject(p));
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      setError('');
      const payload: Partial<Project> = {
        name: editForm.name,
        location: editForm.location,
        owner_name: editForm.owner_name || null,
        manager_name: editForm.manager_name || null,
        project_type: editForm.project_type,
        project_subtype: editForm.project_subtype,
        project_strategy: editForm.project_type === 'READY_PROPERTY' ? 'DIRECT_SALE' : editForm.project_strategy,
        total_estimated_budget: editForm.total_estimated_budget || null,
        target_sale_price: editForm.target_sale_price || null,
        start_date: editForm.start_date || null,
        expected_completion_date: editForm.expected_completion_date || null,
        status: editForm.status,
        plot_size_sqft: editForm.plot_size_sqft,
      };
      await updateProject(editing.id, payload);
      setShowEditModal(false);
      await load();
      notify.success('Project updated');
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to update project'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      setError('');
      const payload: Partial<Project> = {
        name: form.name,
        location: form.location,
        owner_name: form.owner_name || null,
        manager_name: form.manager_name || null,
        project_type: form.project_type,
        project_subtype: form.project_subtype,
        project_strategy: form.project_type === 'READY_PROPERTY' ? 'DIRECT_SALE' : form.project_strategy,
        total_estimated_budget: form.total_estimated_budget || null,
        target_sale_price: form.target_sale_price || null,
        start_date: form.start_date || null,
        expected_completion_date: form.expected_completion_date || null,
        status: form.status,
        plot_size_sqft: form.plot_size_sqft,
      };
      await createProject(payload);
      setShowForm(false);
      setForm(emptyForm());
      await load();
      notify.success('Project created');
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to create project'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (deletingId) return;
    const ok = await confirm({
      title: 'Delete project',
      confirmLabel: 'Delete',
      message:
        `Delete project "${name ?? id}"?\n\n` +
        `This will permanently remove:\n` +
        `• All stages & budgets\n` +
        `• All expenses & labour records\n` +
        `• All purchase orders & inventory movements\n` +
        `• All sales & installments\n\n` +
        `This cannot be undone.`,
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteProject(id);
      await load();
      notify.success('Project deleted');
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to delete project'));
    } finally {
      setDeletingId(null);
    }
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
              <FieldLabel info="Display name used across the app for this project." required>
                Project Name
              </FieldLabel>
              <input
                required
                placeholder="e.g. Gulberg Residencia Block A"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel info="City or area in Pakistan. Type to search suggestions.">
                Location
              </FieldLabel>
              <PakistanLocationInput
                value={form.location}
                onChange={(location) => setForm((f) => ({ ...f, location }))}
              />
            </div>
            <div>
              <FieldLabel info="Project owner or investor contact name (optional).">
                Owner
              </FieldLabel>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.owner_name}
                onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                placeholder="e.g. Ahmed Khan"
                disabled={saving}
              />
            </div>
            <div>
              <FieldLabel info="Site or project manager name (optional).">
                Manager
              </FieldLabel>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.manager_name}
                onChange={(e) => setForm((f) => ({ ...f, manager_name: e.target.value }))}
                placeholder="e.g. Site Engineer"
                disabled={saving}
              />
            </div>
            <TaxonomyFields form={form} setForm={setForm} namePrefix="create" />
            <div className="md:col-span-2">
              <PlotSizeField
                key="create-plot"
                idPrefix="create-plot"
                valueSqft={form.plot_size_sqft}
                onChange={(sqft) => setForm((f) => ({ ...f, plot_size_sqft: sqft }))}
                marlaSqft={marlaSqft}
                disabled={saving}
              />
            </div>
            <div>
              <FieldLabel info="Planned total cost to deliver the project (not the sale price).">
                Estimated Budget (PKR)
              </FieldLabel>
              <MoneyInput
                value={form.total_estimated_budget}
                onChange={(digits) => setForm((f) => ({ ...f, total_estimated_budget: digits }))}
              />
            </div>
            <div>
              <FieldLabel info="Expected selling or exit price for this project.">
                Target Sale Price (PKR)
              </FieldLabel>
              <MoneyInput
                value={form.target_sale_price}
                onChange={(digits) => setForm((f) => ({ ...f, target_sale_price: digits }))}
              />
            </div>
            <div>
              <FieldLabel info="Lifecycle state: Planning, Active, On Hold, Completed, Sold, Sold During Construction, or Cancelled.">
                Status
              </FieldLabel>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel info="Planned start date for the project.">
                Start Date
              </FieldLabel>
              <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <FieldLabel info="Target completion or handover date.">
                Expected Completion
              </FieldLabel>
              <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.expected_completion_date} onChange={e => setForm(f => ({ ...f, expected_completion_date: e.target.value }))} />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Saving…' : 'Create Project'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
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
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const n = normalizeProjectFields(p);
                  return (
                    <>
                      {n.project_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                          {TYPE_LABELS[n.project_type]}
                        </span>
                      )}
                      {p.project_subtype && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {SUBTYPE_LABELS[p.project_subtype as ProjectSubtype] || p.project_subtype}
                        </span>
                      )}
                      {n.project_strategy && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                          {STRATEGY_LABELS[n.project_strategy]}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              {p.location && <p className="text-xs text-slate-500">{p.location}</p>}
              {(() => {
                const eq = formatPlotEquivalents(
                  p.plot_size_sqft != null ? Number(p.plot_size_sqft) : null,
                  marlaSqft,
                );
                if (eq) return <p className="text-xs text-slate-600">Plot: {eq}</p>;
                if (p.plot_size) return <p className="text-xs text-slate-600">Plot: {p.plot_size}</p>;
                return null;
              })()}
              {(() => {
                const completion = Number(p.computed?.avg_completion_percent ?? 0);
                const soldValue = Number(p.computed?.sold_value ?? 0);
                const profitPending = soldValue <= 0;
                const strategy = normalizeProjectFields(p).project_strategy;
                const canSell =
                  strategy === 'DEVELOPMENT' &&
                  !['Sold', 'Sold During Construction', 'Cancelled', 'Completed'].includes(p.status);
                return (
                  <>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Completion</span>
                        <span className="font-medium">{completion}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                        />
                      </div>
                    </div>
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
                        <p className="text-slate-400">Actual</p>
                        <p className="font-medium text-red-700">
                          PKR {Number(p.computed?.total_spent ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Target Sale</p>
                        <p className="font-medium">
                          {p.target_sale_price
                            ? `PKR ${Number(p.target_sale_price).toLocaleString()}`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Sales</p>
                        <p className="font-medium text-green-700">
                          PKR {soldValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs rounded bg-slate-50 px-2 py-1.5">
                      <span className="text-slate-500">Profit</span>
                      {profitPending ? (
                        <span className="font-semibold text-amber-700">Pending</span>
                      ) : (
                        <span
                          className={`font-semibold font-mono ${
                            Number(p.computed?.profit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          PKR {Number(p.computed?.profit ?? 0).toLocaleString()}
                          <span className="text-slate-400 font-normal ml-1">
                            ({p.computed?.profit_margin_pct ?? 0}%)
                          </span>
                        </span>
                      )}
                    </div>
                    {Number(p.computed?.total_collected ?? 0) > 0 && (
                      <p className="text-xs text-slate-500">
                        Collected: PKR {Number(p.computed?.total_collected).toLocaleString()}
                      </p>
                    )}
                    {(Number(p.total_estimated_budget) > 0 || Number(p.computed?.total_spent) > 0) && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Budget used</span>
                          <span className="font-medium">{p.computed?.budget_used_pct ?? 0}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${p.computed?.budget_used_pct ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {(Number(p.target_sale_price) > 0 || Number(p.computed?.total_collected) > 0) && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Sale collections</span>
                          <span className="font-medium">{p.computed?.collection_pct ?? 0}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full transition-all"
                            style={{ width: `${p.computed?.collection_pct ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {Number(p.computed?.fund_receipts) > 0 && (
                      <p className="text-xs text-slate-500">
                        Fund receipts: PKR {Number(p.computed?.fund_receipts).toLocaleString()}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        className="text-xs rounded border border-slate-300 text-slate-700 px-2 py-1 hover:bg-slate-50"
                        onClick={() => onSelectProject(p.id)}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50"
                        onClick={() => setQuickEntry({ project: p, kind: 'expense' })}
                      >
                        Add Expense
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-slate-300 text-slate-700 px-2 py-1 hover:bg-slate-50"
                        onClick={() => setQuickEntry({ project: p, kind: 'payment' })}
                      >
                        Add Payment
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-sky-200 text-sky-700 px-2 py-1 hover:bg-sky-50"
                        onClick={() => notify.info('Document upload coming soon')}
                      >
                        Upload Document
                      </button>
                    </div>

                    {strategy === 'DEVELOPMENT' && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="text-xs rounded border border-indigo-200 text-indigo-700 px-2 py-1 hover:bg-indigo-50"
                          onClick={() => onQuickAction(p.id, 'update-stage')}
                        >
                          Update Stage
                        </button>
                        <button
                          type="button"
                          className="text-xs rounded border border-orange-200 text-orange-700 px-2 py-1 hover:bg-orange-50"
                          onClick={() => onQuickAction(p.id, 'issue-material')}
                        >
                          Issue Material
                        </button>
                        <button
                          type="button"
                          className="text-xs rounded border border-teal-200 text-teal-700 px-2 py-1 hover:bg-teal-50"
                          onClick={() => onQuickAction(p.id, 'add-labour')}
                        >
                          Add Labour
                        </button>
                        <button
                          type="button"
                          className="text-xs rounded border border-amber-200 text-amber-800 px-2 py-1 hover:bg-amber-50"
                          onClick={() => onQuickAction(p.id, 'purchase-material')}
                        >
                          Purchase Material
                        </button>
                        {canSell && (
                          <button
                            type="button"
                            className="text-xs rounded border border-purple-200 text-purple-700 px-2 py-1 hover:bg-purple-50"
                            onClick={() => onQuickAction(p.id, 'sell-project')}
                          >
                            Sell Project
                          </button>
                        )}
                      </div>
                    )}

                    {strategy === 'DIRECT_SALE' && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="text-xs rounded border border-emerald-200 text-emerald-700 px-2 py-1 hover:bg-emerald-50"
                          onClick={() => onQuickAction(p.id, 'record-sale')}
                        >
                          Record Sale
                        </button>
                        <button
                          type="button"
                          className="text-xs rounded border border-blue-200 text-blue-700 px-2 py-1 hover:bg-blue-50"
                          onClick={() => onQuickAction(p.id, 'view-profit')}
                        >
                          View Profit
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        className="text-xs rounded border border-green-200 text-green-700 px-2 py-1 hover:bg-green-50"
                        onClick={() => setQuickEntry({ project: p, kind: 'collection' })}
                      >
                        + Collection
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-violet-200 text-violet-700 px-2 py-1 hover:bg-violet-50"
                        onClick={() => setActivityProject(p)}
                      >
                        Activity Log
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-blue-200 text-blue-600 px-2 py-1 hover:bg-blue-50 disabled:opacity-50"
                        disabled={!!deletingId}
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-red-200 text-red-600 px-2 py-1 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                        disabled={!!deletingId}
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        {deletingId === p.id && (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                        )}
                        {deletingId === p.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {showEditModal && editing && (
        <Modal title={`Edit: ${editing.name}`} onClose={() => { if (!saving) setShowEditModal(false); }}>
          <div className="space-y-3">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel info="Display name used across the app for this project." required>
                  Project Name
                </FieldLabel>
                <input
                  placeholder="e.g. Gulberg Residencia Block A"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel info="City or area in Pakistan. Type to search suggestions.">
                  Location
                </FieldLabel>
                <PakistanLocationInput
                  value={editForm.location}
                  onChange={(location) => setEditForm((prev) => ({ ...prev, location }))}
                />
              </div>
              <div>
                <FieldLabel info="Project owner or investor contact name (optional).">
                  Owner
                </FieldLabel>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.owner_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, owner_name: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel info="Site or project manager name (optional).">
                  Manager
                </FieldLabel>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.manager_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, manager_name: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <TaxonomyFields form={editForm} setForm={setEditForm} namePrefix="edit" />
              <div className="md:col-span-2">
                <PlotSizeField
                  key={`edit-plot-${editing.id}`}
                  idPrefix="edit-plot"
                  valueSqft={editForm.plot_size_sqft}
                  onChange={(sqft) => setEditForm((prev) => ({ ...prev, plot_size_sqft: sqft }))}
                  marlaSqft={marlaSqft}
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel info="Planned total cost to deliver the project (not the sale price).">
                  Estimated Budget (PKR)
                </FieldLabel>
                <MoneyInput
                  value={editForm.total_estimated_budget}
                  onChange={(digits) => setEditForm((f) => ({ ...f, total_estimated_budget: digits }))}
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel info="Expected selling or exit price for this project.">
                  Target Sale Price (PKR)
                </FieldLabel>
                <MoneyInput
                  value={editForm.target_sale_price}
                  onChange={(digits) => setEditForm((f) => ({ ...f, target_sale_price: digits }))}
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel info="Lifecycle state: Planning, Active, On Hold, Completed, Sold, Sold During Construction, or Cancelled.">
                  Status
                </FieldLabel>
                <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  disabled={saving}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel info="Planned start date for the project.">
                  Start Date
                </FieldLabel>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel info="Target completion or handover date.">
                  Expected Completion
                </FieldLabel>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editForm.expected_completion_date} onChange={e => setEditForm(f => ({ ...f, expected_completion_date: e.target.value }))}
                  disabled={saving}
                />
              </div>
            </div>
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="w-full rounded bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {quickEntry && (
        <ProjectQuickEntry
          project={quickEntry.project}
          kind={quickEntry.kind}
          onClose={() => setQuickEntry(null)}
          onSaved={() => { setQuickEntry(null); load(); }}
        />
      )}

      {activityProject && (
        <ProjectActivityLog
          projectId={activityProject.id}
          projectName={activityProject.name}
          onClose={() => setActivityProject(null)}
        />
      )}
    </div>
  );
}
