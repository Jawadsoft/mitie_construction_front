import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  TYPE_LABELS,
  SUBTYPE_LABELS,
  STRATEGY_LABELS,
  subtypesForType,
  normalizeProjectFields,
} from '../api/projects';
import type { Project, ProjectTypeCode, ProjectStrategy, ProjectSubtype } from '../api/projects';
import Modal from '../components/Modal';
import ModalFormFooter from '../components/ModalFormFooter';
import FieldLabel from '../components/FieldLabel';
import MoneyInput from '../components/MoneyInput';
import PakistanLocationInput from '../components/PakistanLocationInput';
import PlotSizeField from '../components/PlotSizeField';
import ProjectQuickEntry from '../components/ProjectQuickEntry';
import type { QuickEntryKind } from '../components/ProjectQuickEntry';
import ProjectActivityLog from '../components/ProjectActivityLog';
import ColumnPicker from '../components/ColumnPicker';
import { useConfirm, useRegisterUnsaved } from '../components/ConfirmDialog';
import { notify, notifyError } from '../utils/toast';
import { formatPlotEquivalents, PAKISTAN_MARLA_SQFT } from '../utils/plotSize';
import { getMeasurementSettings } from '../api/settings';
import { parseMoneyInput } from '../utils/money';
import type { NavQuickAction } from '../types/navIntent';
import { useListFilters } from '../utils/navState';
import { useColumnPrefs } from '../utils/columnPrefs';
import { useFormDraft, peekFormDraft, clearFormDraft } from '../hooks/useFormDraft';
import { isFormDirty } from '../hooks/useDirtyForm';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import { useEditLock } from '../hooks/useEditLock';

const PROJECT_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'location', label: 'Location' },
  { id: 'status', label: 'Status' },
  { id: 'owner', label: 'Owner' },
  { id: 'manager', label: 'Manager' },
  { id: 'budget', label: 'Budget' },
  { id: 'actual', label: 'Actual' },
  { id: 'completion', label: 'Completion' },
  { id: 'created', label: 'Created' },
];
const PROJECT_COL_IDS = PROJECT_COLUMNS.map((c) => c.id);
const VIEW_PREF_KEY = 'erp.projects.view';

function getProjectsView(): 'cards' | 'table' {
  try {
    return localStorage.getItem(VIEW_PREF_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

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
  onSelectProject: (id: string) => void | Promise<void>;
  onQuickAction: (projectId: string, action: NavQuickAction) => void | Promise<void>;
}

export default function ProjectsPage({ onSelectProject, onQuickAction }: Props) {
  const confirm = useConfirm();
  const { filters, setFilter } = useListFilters('projects', ['status', 'location']);
  const filterStatus = filters.status ?? '';
  const filterLocation = filters.location ?? '';
  const { visible: colVisible, isVisible, toggle: toggleCol } = useColumnPrefs(
    'projects',
    PROJECT_COL_IDS,
  );
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(getProjectsView);
  const [lifecycle, setLifecycle] = useState<'active' | 'archived' | 'deleted'>('active');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editBaseline, setEditBaseline] = useState(emptyForm());
  const [quickEntry, setQuickEntry] = useState<{ project: Project; kind: QuickEntryKind } | null>(null);
  const [activityProject, setActivityProject] = useState<Project | null>(null);
  const [marlaSqft, setMarlaSqft] = useState(PAKISTAN_MARLA_SQFT);

  const load = async () => {
    try {
      setLoading(true);
      setProjects(await getProjects(lifecycle));
    } catch { setError('Failed to load projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [lifecycle]);

  useEffect(() => {
    const onNew = () => openCreate();
    window.addEventListener('erp:new-project', onNew);
    return () => window.removeEventListener('erp:new-project', onNew);
  }, []);

  useEffect(() => {
    getMeasurementSettings()
      .then((m) => setMarlaSqft(m.marla_sqft))
      .catch(() => setMarlaSqft(PAKISTAN_MARLA_SQFT));
  }, []);

  const setView = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_PREF_KEY, mode);
    } catch { /* ignore */ }
  };

  const openEdit = (p: Project) => {
    const baseline = formFromProject(p);
    setEditing(p);
    setEditForm(baseline);
    setEditBaseline(baseline);
    setShowEditModal(true);
  };

  const openCreate = () => {
    const draft = peekFormDraft<ReturnType<typeof emptyForm>>('projects.create');
    if (draft) {
      setForm(draft);
      notify.info('Draft restored');
    } else {
      setForm(emptyForm());
    }
    setShowForm(true);
    setError('');
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
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
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
      clearFormDraft('projects.create');
      await load();
      notify.success('Project created');
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to create project'));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await handleCreate();
  };

  const createDirty = isFormDirty(form, emptyForm());
  const editDirty = isFormDirty(editForm, editBaseline);
  const { conflict: editConflict } = useEditLock('projects', editing?.id, showEditModal);
  const { draftSaved, clear: clearDraft } = useFormDraft({
    key: 'projects.create',
    enabled: showForm,
    values: form,
    isDirty: createDirty,
  });

  useRegisterUnsaved({
    active: showForm,
    isDirty: createDirty,
    onSave: handleCreate,
    onDiscard: () => {
      clearDraft();
      setShowForm(false);
      setForm(emptyForm());
    },
  });

  useRegisterUnsaved({
    active: showEditModal,
    isDirty: editDirty,
    onSave: handleUpdate,
    onDiscard: () => setShowEditModal(false),
  });

  const handleDelete = async (id: string, name?: string) => {
    if (deletingId) return;
    const ok = await confirm({
      title: 'Delete project',
      confirmLabel: 'Delete',
      message:
        `Move project "${name ?? id}" to Deleted?\n\n` +
        `It will be hidden from the active list. You can restore it later from the Deleted filter.`,
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteProject(id);
      await load();
      notify.success('Project moved to Deleted');
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to delete project'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = async (id: string, name?: string) => {
    const ok = await confirm({
      title: 'Restore project',
      confirmLabel: 'Restore',
      message: `Restore project "${name ?? id}" to the active list?`,
    });
    if (!ok) return;
    try {
      await restoreProject(id);
      await load();
      notify.success('Project restored');
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to restore project'));
    }
  };

  const filtered = projects.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterLocation) {
      const loc = (p.location || '').toLowerCase();
      if (!loc.includes(filterLocation.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value as 'active' | 'archived' | 'deleted')}
          >
            <option value="active">Active</option>
            <option value="archived">Archived (Cancelled)</option>
            <option value="deleted">Deleted</option>
          </select>
          <input
            type="search"
            placeholder="Filter location…"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm w-40"
            value={filterLocation}
            onChange={(e) => setFilter('location', e.target.value)}
          />
          <select
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={filterStatus}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button
              type="button"
              className={`px-3 py-1.5 ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setView('cards')}
            >
              Cards
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
          {viewMode === 'table' && (
            <ColumnPicker columns={PROJECT_COLUMNS} visible={colVisible} onToggle={toggleCol} />
          )}
          <button
            className="rounded bg-slate-900 text-white px-4 py-1.5 text-sm font-medium hover:bg-slate-800"
            onClick={openCreate}
          >
            + New Project
          </button>
        </div>
      </div>

      {error && !showForm && !showEditModal && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {showForm && (
        <Modal
          title="New Project"
          size="lg"
          mode="form"
          isDirty={createDirty}
          onClose={() => {
            if (saving) return;
            clearDraft();
            setShowForm(false);
            setForm(emptyForm());
          }}
          footer={
            <ModalFormFooter
              onSave={() => void handleCreate()}
              saveLabel="Create Project"
              saving={saving}
              error={error ? <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p> : null}
            />
          }
        >
          <form onSubmit={handleSubmit} className="space-y-3" id="create-project-form">
            {draftSaved && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1">
                Draft saved locally
              </p>
            )}
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
          </form>
        </Modal>
      )}

      {loading ? (
        viewMode === 'table' ? <TableSkeleton rows={8} cols={6} /> : <CardSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-sm text-slate-500">
          No projects found. Create your first project above.
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {isVisible('name') && <th className="px-4 py-3 text-left text-slate-600">Name</th>}
                  {isVisible('location') && <th className="px-4 py-3 text-left text-slate-600">Location</th>}
                  {isVisible('status') && <th className="px-4 py-3 text-left text-slate-600">Status</th>}
                  {isVisible('owner') && <th className="px-4 py-3 text-left text-slate-600">Owner</th>}
                  {isVisible('manager') && <th className="px-4 py-3 text-left text-slate-600">Manager</th>}
                  {isVisible('budget') && <th className="px-4 py-3 text-right text-slate-600">Budget</th>}
                  {isVisible('actual') && <th className="px-4 py-3 text-right text-slate-600">Actual</th>}
                  {isVisible('completion') && <th className="px-4 py-3 text-right text-slate-600">Completion</th>}
                  {isVisible('created') && <th className="px-4 py-3 text-left text-slate-600">Created</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t hover:bg-slate-50 cursor-pointer"
                    onClick={() => onSelectProject(p.id)}
                  >
                    {isVisible('name') && (
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    )}
                    {isVisible('location') && (
                      <td className="px-4 py-3 text-slate-600">{p.location || '—'}</td>
                    )}
                    {isVisible('status') && (
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    )}
                    {isVisible('owner') && (
                      <td className="px-4 py-3 text-slate-600">{p.owner_name || '—'}</td>
                    )}
                    {isVisible('manager') && (
                      <td className="px-4 py-3 text-slate-600">{p.manager_name || '—'}</td>
                    )}
                    {isVisible('budget') && (
                      <td className="px-4 py-3 text-right font-mono">
                        {p.total_estimated_budget
                          ? Number(p.total_estimated_budget).toLocaleString()
                          : '—'}
                      </td>
                    )}
                    {isVisible('actual') && (
                      <td className="px-4 py-3 text-right font-mono text-red-700">
                        {Number(p.computed?.total_spent ?? 0).toLocaleString()}
                      </td>
                    )}
                    {isVisible('completion') && (
                      <td className="px-4 py-3 text-right">
                        {Number(p.computed?.avg_completion_percent ?? 0)}%
                      </td>
                    )}
                    {isVisible('created') && (
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                        className="text-xs rounded border border-slate-300 text-slate-700 px-2 py-1 hover:bg-slate-50 font-medium"
                        onClick={() => onSelectProject(p.id)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50"
                        onClick={() => setQuickEntry({ project: p, kind: 'expense' })}
                      >
                        Expense
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-slate-300 text-slate-700 px-2 py-1 hover:bg-slate-50"
                        onClick={() => setQuickEntry({ project: p, kind: 'payment' })}
                      >
                        Payment
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-green-200 text-green-700 px-2 py-1 hover:bg-green-50"
                        onClick={() => setQuickEntry({ project: p, kind: 'collection' })}
                      >
                        Collection
                      </button>
                      {strategy === 'DEVELOPMENT' && (
                        <button
                          type="button"
                          className="text-xs rounded border border-indigo-200 text-indigo-700 px-2 py-1 hover:bg-indigo-50"
                          onClick={() => onQuickAction(p.id, 'update-stage')}
                        >
                          Stage Update
                        </button>
                      )}
                    </div>

                    {strategy === 'DEVELOPMENT' && (
                      <div className="flex flex-wrap gap-1.5">
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
                        className="text-xs rounded border border-violet-200 text-violet-700 px-2 py-1 hover:bg-violet-50"
                        onClick={() => onQuickAction(p.id, 'view-activity')}
                      >
                        Activity
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-sky-200 text-sky-700 px-2 py-1 hover:bg-sky-50"
                        onClick={() => notify.info('Document upload coming soon')}
                      >
                        Upload Document
                      </button>
                      <button
                        type="button"
                        className="text-xs rounded border border-blue-200 text-blue-600 px-2 py-1 hover:bg-blue-50 disabled:opacity-50"
                        disabled={!!deletingId || lifecycle === 'deleted'}
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      {lifecycle === 'deleted' ? (
                        <button
                          type="button"
                          className="text-xs rounded border border-green-200 text-green-700 px-2 py-1 hover:bg-green-50"
                          onClick={() => handleRestore(p.id, p.name)}
                        >
                          Restore
                        </button>
                      ) : (
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
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {showEditModal && editing && (
        <Modal
          title={`Edit: ${editing.name}`}
          size="lg"
          mode="form"
          isDirty={editDirty}
          onClose={() => { if (!saving) setShowEditModal(false); }}
          footer={
            <ModalFormFooter
              onSave={() => void handleUpdate()}
              saveLabel="Save Changes"
              saving={saving}
              saveDisabled={editConflict}
              error={error ? <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p> : null}
            />
          }
        >
          <div className="space-y-3">
            {editConflict && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This record is being edited elsewhere. Saving is disabled to prevent overwrites.
              </p>
            )}
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
