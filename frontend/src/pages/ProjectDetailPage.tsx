import { useEffect, useMemo, useState } from 'react';
import {
  getProject,
  createStage,
  updateStage,
  sellProjectDuringConstruction,
  normalizeProjectFields,
  STRATEGY_LABELS,
  TYPE_LABELS,
  SUBTYPE_LABELS,
} from '../api/projects';
import type { Project, Stage, ProjectSubtype } from '../api/projects';
import FieldLabel from '../components/FieldLabel';
import MoneyInput from '../components/MoneyInput';
import ProjectActivityLog from '../components/ProjectActivityLog';
import {
  ProjectWorkspacePanels,
  type WorkspaceTab,
} from '../components/project-detail/ProjectWorkspacePanels';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { notify, notifyError } from '../utils/toast';
import { parseMoneyInput } from '../utils/money';
import type { NavIntent } from '../types/navIntent';

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
  Planned: 'bg-slate-100 text-slate-700',
};

const STAGE_STATUSES = ['Planned', 'Active', 'On Hold', 'Completed'];

const STAGE_LOCKED_STATUSES = new Set([
  'Sold',
  'Sold During Construction',
  'Cancelled',
  'Completed',
]);

const DEFAULT_STAGES = [
  { name: 'Land Purchase', icon: '📜', description: 'Plot purchase, registration and stamp duty' },
  { name: 'Design', icon: '📐', description: 'Architectural drawings and design packages' },
  { name: 'Approval', icon: '📋', description: 'NOC, permits and regulatory approvals' },
  { name: 'Excavation', icon: '🚜', description: 'Site clearing and excavation work' },
  { name: 'Foundation', icon: '🧱', description: 'Footings and foundation slab' },
  { name: 'Structure', icon: '🏗️', description: 'Columns, beams, slabs and grey structure' },
  { name: 'Masonry', icon: '🧱', description: 'Brick walls, block work and filling' },
  { name: 'Electrical', icon: '⚡', description: 'Wiring, conduit and DB installation' },
  { name: 'Plumbing', icon: '🔧', description: 'Underground and above-ground plumbing' },
  { name: 'Finishing', icon: '🪟', description: 'Plaster, flooring, fixtures and finishes' },
  { name: 'Ready For Sale', icon: '🔑', description: 'Handover-ready, listing and marketing' },
];

interface Props {
  projectId: string;
  onBack: () => void;
  initialIntent?: NavIntent;
  onIntentConsumed?: () => void;
}

const emptyStageForm = {
  name: '', description: '', sequence_order: '', start_date: '', end_date: '',
  completion_percent: '0', status: 'Planned',
  labour_budget: '', material_budget: '', equipment_budget: '', other_budget: '',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProjectDetailPage({
  projectId,
  onBack,
  initialIntent,
  onIntentConsumed,
}: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStageForm, setShowStageForm] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState({ ...emptyStageForm });

  const [showDefaultModal, setShowDefaultModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  useBodyScrollLock(showDefaultModal || showSellModal);
  const [selectedDefaults, setSelectedDefaults] = useState<Set<number>>(new Set(DEFAULT_STAGES.map((_, i) => i)));
  const [addingDefaults, setAddingDefaults] = useState(false);
  const [defaultSuccess, setDefaultSuccess] = useState('');
  const [selling, setSelling] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('construction');
  const [sellForm, setSellForm] = useState({
    buyer_name: '',
    sale_price: '',
    sale_date: todayIso(),
    notes: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      setProject(await getProject(projectId));
    } catch { setError('Failed to load project'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  useEffect(() => {
    if (!project) return;
    const strategy = normalizeProjectFields(project).project_strategy;
    if (strategy === 'DIRECT_SALE') {
      setWorkspaceTab((t) => (t === 'construction' ? 'sales' : t));
    }
  }, [project?.id, project?.project_strategy]);

  const stages = useMemo(
    () => [...(project?.stages || [])].sort((a, b) => a.sequence_order - b.sequence_order),
    [project?.stages],
  );

  const currentStage = useMemo(() => {
    return (
      stages.find((s) => s.status !== 'Completed' && Number(s.completion_percent) < 100) ||
      stages[stages.length - 1] ||
      null
    );
  }, [stages]);

  const openEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setStageForm({
      name: stage.name,
      description: stage.description || '',
      sequence_order: stage.sequence_order.toString(),
      start_date: stage.start_date || '',
      end_date: stage.end_date || '',
      completion_percent: stage.completion_percent.toString(),
      status: stage.status,
      labour_budget: moneyDigits(stage.budget?.labour_budget),
      material_budget: moneyDigits(stage.budget?.material_budget),
      equipment_budget: moneyDigits(stage.budget?.equipment_budget),
      other_budget: moneyDigits(stage.budget?.other_budget),
    });
    setShowStageForm(true);
  };

  useEffect(() => {
    if (!initialIntent?.action || !project || loading) return;
    if (initialIntent.projectId && initialIntent.projectId !== projectId) {
      onIntentConsumed?.();
      return;
    }
    if (initialIntent.action === 'update-stage') {
      setWorkspaceTab('construction');
      if (currentStage) openEditStage(currentStage);
      else setShowStageForm(true);
      onIntentConsumed?.();
      return;
    }
    if (initialIntent.action === 'sell-project') {
      setWorkspaceTab('construction');
      setShowSellModal(true);
      onIntentConsumed?.();
    }
  }, [initialIntent, project, loading, projectId, currentStage]);

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: stageForm.name,
      description: stageForm.description || undefined,
      sequence_order: stageForm.sequence_order ? Number(stageForm.sequence_order) : undefined,
      start_date: stageForm.start_date || undefined,
      end_date: stageForm.end_date || undefined,
      completion_percent: stageForm.completion_percent,
      status: stageForm.status,
      labour_budget: stageForm.labour_budget ? Number(stageForm.labour_budget) : 0,
      material_budget: stageForm.material_budget ? Number(stageForm.material_budget) : 0,
      equipment_budget: stageForm.equipment_budget ? Number(stageForm.equipment_budget) : 0,
      other_budget: stageForm.other_budget ? Number(stageForm.other_budget) : 0,
    };
    try {
      if (editingStage) {
        await updateStage(editingStage.id, data);
      } else {
        await createStage(projectId, data);
      }
      setShowStageForm(false);
      setEditingStage(null);
      setStageForm({ ...emptyStageForm });
      await load();
      notify.success(editingStage ? 'Stage updated' : 'Stage added');
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to save stage'));
    }
  };

  const handleAddDefaultStages = async () => {
    const existingNames = new Set((project?.stages || []).map(s => s.name.toLowerCase()));
    const toAdd = DEFAULT_STAGES.filter((_, i) => selectedDefaults.has(i) && !existingNames.has(DEFAULT_STAGES[i].name.toLowerCase()));
    if (toAdd.length === 0) {
      setDefaultSuccess('All selected stages already exist in this project.');
      return;
    }
    setAddingDefaults(true);
    setError('');
    try {
      const baseOrder = (project?.stages || []).reduce((m, s) => Math.max(m, s.sequence_order || 0), 0);
      for (let i = 0; i < toAdd.length; i++) {
        await createStage(projectId, {
          name: toAdd[i].name,
          description: toAdd[i].description,
          sequence_order: baseOrder + i + 1,
          completion_percent: '0',
          status: 'Planned',
          labour_budget: 0,
          material_budget: 0,
          equipment_budget: 0,
          other_budget: 0,
        });
      }
      setDefaultSuccess(`${toAdd.length} stage${toAdd.length > 1 ? 's' : ''} added successfully!`);
      await load();
      setTimeout(() => { setShowDefaultModal(false); setDefaultSuccess(''); }, 1500);
    } catch (e: unknown) {
      setError(notifyError(e, 'Failed to add default stages'));
    }
    finally { setAddingDefaults(false); }
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selling) return;
    setSelling(true);
    try {
      const updated = await sellProjectDuringConstruction(projectId, {
        buyer_name: sellForm.buyer_name.trim(),
        sale_price: sellForm.sale_price ? Number(sellForm.sale_price) : null,
        sale_date: sellForm.sale_date || todayIso(),
        notes: sellForm.notes.trim() || null,
      });
      setProject(updated);
      setShowSellModal(false);
      notify.success('Project sold as-is during construction');
    } catch (err: unknown) {
      setError(notifyError(err, 'Failed to sell project'));
    } finally {
      setSelling(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!project) return <p className="text-sm text-red-500">{error}</p>;

  const tax = normalizeProjectFields(project);
  const allowStages = tax.project_strategy !== 'DIRECT_SALE';
  const stagesLocked = STAGE_LOCKED_STATUSES.has(project.status);
  const canEditStages = allowStages && !stagesLocked;
  const canSell =
    allowStages &&
    !stagesLocked &&
    project.status !== 'Sold' &&
    project.status !== 'Sold During Construction';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
        ← Back to Projects
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{project.name}</h1>
              {project.location && <p className="text-sm text-slate-400 mt-0.5">📍 {project.location}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tax.project_type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
                    {TYPE_LABELS[tax.project_type]}
                  </span>
                )}
                {tax.project_strategy && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
                    {STRATEGY_LABELS[tax.project_strategy]}
                  </span>
                )}
                {project.sold_as_is && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-400/30 text-indigo-100 font-semibold">
                    Sold As-Is
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                project.status === 'Active' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                project.status === 'Completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                project.status === 'On Hold' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                project.status === 'Sold' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                project.status === 'Sold During Construction' ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40' :
                project.status === 'Cancelled' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                'bg-slate-500/20 text-slate-300 border-slate-500/40'
              }`}>
                {project.status}
              </span>
              <button
                type="button"
                onClick={() => setShowActivityLog(true)}
                className="text-xs rounded-lg border border-white/25 bg-white/10 text-white px-3 py-1.5 hover:bg-white/20"
              >
                Activity Log
              </button>
            </div>
          </div>

          {(project.computed?.stage_count || 0) > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Overall Completion</span>
                <span className="font-semibold text-white">{project.computed?.avg_completion_percent ?? 0}%</span>
              </div>
              <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all duration-700"
                  style={{ width: `${project.computed?.avg_completion_percent ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Overview</h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Project Name</dt>
                <dd className="font-medium text-slate-900">{project.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Type</dt>
                <dd className="font-medium text-slate-900">
                  {tax.project_type ? TYPE_LABELS[tax.project_type] : '—'}
                  {project.project_subtype
                    ? ` · ${SUBTYPE_LABELS[project.project_subtype as ProjectSubtype] || project.project_subtype}`
                    : ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Strategy</dt>
                <dd className="font-medium text-slate-900">
                  {tax.project_strategy ? STRATEGY_LABELS[tax.project_strategy] : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Status</dt>
                <dd className="font-medium text-slate-900">{project.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Location</dt>
                <dd className="font-medium text-slate-900">{project.location || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Owner</dt>
                <dd className="font-medium text-slate-900">{project.owner_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Manager</dt>
                <dd className="font-medium text-slate-900">{project.manager_name || '—'}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Financial Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(() => {
                const budget = Number(project.total_estimated_budget || 0);
                const actual = Number(project.computed?.total_spent ?? 0);
                const revenue = Number(project.computed?.sold_value ?? 0);
                const target = Number(project.target_sale_price || 0);
                const expected =
                  target > 0 && budget > 0 ? target - budget : null;
                const actualProfit = Number(project.computed?.profit ?? 0);
                const profitPending = revenue <= 0;
                return (
                  <>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400 font-medium">Budget</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {budget > 0 ? `PKR ${budget.toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400 font-medium">Actual Cost</p>
                      <p className="text-sm font-bold text-red-700 mt-0.5">PKR {actual.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400 font-medium">Revenue</p>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">PKR {revenue.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400 font-medium">Expected Profit</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {expected != null ? `PKR ${expected.toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400 font-medium">Actual Profit</p>
                      <p className={`text-sm font-bold mt-0.5 ${profitPending ? 'text-amber-700' : actualProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {profitPending ? 'Pending' : `PKR ${actualProfit.toLocaleString()}`}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {project.sold_as_is && (
          <div className="px-5 py-3 border-t border-slate-100 bg-indigo-50 text-sm text-indigo-900">
            Sold As-Is to <strong>{project.sold_buyer_name || '—'}</strong>
            {project.sold_at ? ` on ${project.sold_at}` : ''}
            {project.sold_price != null && project.sold_price !== ''
              ? ` · PKR ${Number(project.sold_price).toLocaleString()}`
              : ''}
            {project.sold_notes ? ` — ${project.sold_notes}` : ''}
          </div>
        )}
      </div>

      {(() => {
        const tabs: { id: WorkspaceTab; label: string; hide?: boolean }[] = [
          { id: 'construction', label: 'Construction', hide: !allowStages },
          { id: 'funding', label: 'Funding' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'procurement', label: 'Procurement' },
          { id: 'labour', label: 'Labour' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'sales', label: 'Sales' },
          { id: 'profitability', label: 'Profitability' },
        ];
        return (
          <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
            {tabs.filter((t) => !t.hide).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setWorkspaceTab(t.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  workspaceTab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        );
      })()}

      {workspaceTab !== 'construction' && (
        <ProjectWorkspacePanels tab={workspaceTab} projectId={projectId} project={project} />
      )}

      {workspaceTab === 'construction' && allowStages && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Stage</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              {currentStage?.name || '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Completion: {currentStage ? `${Number(currentStage.completion_percent)}%` : '—'}
              {' · '}
              Overall: {project.computed?.avg_completion_percent ?? 0}%
            </p>
          </div>
          {canSell && (
            <button
              type="button"
              onClick={() => {
                setSellForm({ buyer_name: '', sale_price: '', sale_date: todayIso(), notes: '' });
                setShowSellModal(true);
                setError('');
              }}
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700"
            >
              Sell Project
            </button>
          )}
          {stagesLocked && (
            <p className="text-xs text-slate-500">Stages are locked for this project status.</p>
          )}
        </div>
      )}

      {workspaceTab === 'construction' && (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-medium text-slate-800">Construction Stages</h2>
          {canEditStages && (
            <div className="flex gap-2">
              <button
                className="rounded border border-slate-300 bg-white text-slate-700 px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-1"
                onClick={() => { setShowDefaultModal(true); setDefaultSuccess(''); setError(''); }}
              >
                ⚡ Default Stages
              </button>
              <button
                className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-800"
                onClick={() => { setEditingStage(null); setStageForm({ ...emptyStageForm }); setShowStageForm(v => !v); }}
              >
                {showStageForm && !editingStage ? 'Cancel' : '+ Add Stage'}
              </button>
            </div>
          )}
        </div>

        {!allowStages && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">
            <strong>Direct Sale</strong> — Purchase → Hold → Sell. No construction stages for this strategy.
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        {canEditStages && showStageForm && (
          <form onSubmit={handleStageSubmit} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <h3 className="font-medium text-sm">{editingStage ? 'Edit Stage' : 'New Stage'}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel info="Name of this construction stage on the project timeline." required>
                  Stage Name
                </FieldLabel>
                <input required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.name} onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <FieldLabel info="Planned, Active, On Hold, or Completed for this stage.">
                  Status
                </FieldLabel>
                <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.status} onChange={e => setStageForm(f => ({ ...f, status: e.target.value }))}>
                  {STAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel info="When work on this stage is planned to begin.">
                  Start Date
                </FieldLabel>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.start_date} onChange={e => setStageForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <FieldLabel info="When work on this stage is planned to finish.">
                  End Date
                </FieldLabel>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.end_date} onChange={e => setStageForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div>
                <FieldLabel info="How far this stage has progressed (0–100%).">
                  Completion % (0–100)
                </FieldLabel>
                <input type="number" min="0" max="100" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.completion_percent} onChange={e => setStageForm(f => ({ ...f, completion_percent: e.target.value }))} />
              </div>
              <div>
                <FieldLabel info="Display order on the timeline (lower numbers appear first).">
                  Order
                </FieldLabel>
                <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.sequence_order} onChange={e => setStageForm(f => ({ ...f, sequence_order: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-600">Budget breakdown (optional)</p>
            <div className="grid gap-3 md:grid-cols-4">
              {([
                { key: 'labour_budget' as const, label: 'Labour', info: 'Planned labour cost for this stage.' },
                { key: 'material_budget' as const, label: 'Material', info: 'Planned material cost for this stage.' },
                { key: 'equipment_budget' as const, label: 'Equipment', info: 'Planned equipment cost for this stage.' },
                { key: 'other_budget' as const, label: 'Other', info: 'Other planned costs for this stage.' },
              ]).map(({ key, label, info }) => (
                <div key={key}>
                  <FieldLabel info={info}>{label}</FieldLabel>
                  <MoneyInput
                    value={stageForm[key]}
                    onChange={(digits) => setStageForm((f) => ({ ...f, [key]: digits }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-800">
                {editingStage ? 'Update Stage' : 'Add Stage'}
              </button>
              <button type="button" className="px-4 rounded border border-slate-300 text-sm hover:bg-slate-50"
                onClick={() => { setShowStageForm(false); setEditingStage(null); }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {canEditStages && showDefaultModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="font-semibold text-gray-900">Add Default Construction Stages</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Select stages to add — existing stages will be skipped</p>
                </div>
                <button onClick={() => setShowDefaultModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
                <div className="flex gap-3 pb-2 border-b mb-3">
                  <button onClick={() => setSelectedDefaults(new Set(DEFAULT_STAGES.map((_, i) => i)))}
                    className="text-xs text-blue-600 hover:underline font-medium">Select All</button>
                  <button onClick={() => setSelectedDefaults(new Set())}
                    className="text-xs text-gray-500 hover:underline">Clear All</button>
                  <span className="ml-auto text-xs text-gray-400">{selectedDefaults.size} selected</span>
                </div>

                {DEFAULT_STAGES.map((stage, idx) => {
                  const alreadyExists = (project?.stages || []).some(s => s.name.toLowerCase() === stage.name.toLowerCase());
                  const checked = selectedDefaults.has(idx);
                  return (
                    <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      alreadyExists ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' :
                      checked ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        disabled={alreadyExists}
                        checked={alreadyExists ? false : checked}
                        onChange={() => {
                          if (alreadyExists) return;
                          setSelectedDefaults(prev => {
                            const next = new Set(prev);
                            next.has(idx) ? next.delete(idx) : next.add(idx);
                            return next;
                          });
                        }}
                        className="mt-0.5 accent-blue-600 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{stage.icon}</span>
                          <span className="text-sm font-medium text-gray-800">{stage.name}</span>
                          {alreadyExists && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Already added</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="px-5 py-4 border-t space-y-3">
                {defaultSuccess && (
                  <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg text-center font-medium">{defaultSuccess}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setShowDefaultModal(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleAddDefaultStages}
                    disabled={addingDefaults || selectedDefaults.size === 0}
                    className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                  >
                    {addingDefaults ? 'Adding…' : `Add ${selectedDefaults.size} Stage${selectedDefaults.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSellModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleSell} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-5 py-4 border-b bg-indigo-600">
                <h3 className="font-semibold text-white">Sell Project (As-Is)</h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Records Sold During Construction and locks further stage edits.
                </p>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <FieldLabel info="Name of the buyer for this as-is mid-construction sale." required>
                    Buyer Name
                  </FieldLabel>
                  <input
                    required
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={sellForm.buyer_name}
                    onChange={(e) => setSellForm((f) => ({ ...f, buyer_name: e.target.value }))}
                    disabled={selling}
                  />
                </div>
                <div>
                  <FieldLabel info="Agreed sale price in PKR for selling the project as-is.">
                    Sale Price (PKR)
                  </FieldLabel>
                  <MoneyInput
                    value={sellForm.sale_price}
                    onChange={(digits) => setSellForm((f) => ({ ...f, sale_price: digits }))}
                    disabled={selling}
                  />
                </div>
                <div>
                  <FieldLabel info="Date the mid-construction sale is recorded.">
                    Sale Date
                  </FieldLabel>
                  <input
                    type="date"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={sellForm.sale_date}
                    onChange={(e) => setSellForm((f) => ({ ...f, sale_date: e.target.value }))}
                    disabled={selling}
                  />
                </div>
                <div>
                  <FieldLabel info="Optional remarks about the as-is sale.">
                    Notes
                  </FieldLabel>
                  <textarea
                    rows={2}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={sellForm.notes}
                    onChange={(e) => setSellForm((f) => ({ ...f, notes: e.target.value }))}
                    disabled={selling}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSellModal(false)}
                    disabled={selling}
                    className="flex-1 border border-slate-300 rounded-lg py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selling}
                    className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {selling && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    {selling ? 'Saving…' : 'Confirm Sale'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {!allowStages ? null : stages.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <div className="text-4xl mb-3">🪜</div>
            <p className="font-medium text-slate-600">No stages yet</p>
            <p className="text-sm text-slate-400 mt-1">
              New Development projects auto-create the standard 11 stages. Use <strong>⚡ Default Stages</strong> to fill gaps.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-slate-200 z-0" />

            <div className="space-y-3">
              {stages.map((stage, idx) => {
                const pct = Number(stage.completion_percent);
                const isCompleted = stage.status === 'Completed' || pct === 100;
                const isActive = stage.status === 'Active';
                const isOnHold = stage.status === 'On Hold';
                const totalBudget = stage.budget ? Number(stage.budget.total_budget) : 0;
                const actualCost = Number(stage.actual_cost || 0);

                const dotColor = isCompleted ? 'bg-green-500 border-green-500'
                               : isActive ? 'bg-blue-500 border-blue-500'
                               : isOnHold ? 'bg-yellow-400 border-yellow-400'
                               : 'bg-white border-slate-300';

                const dotIcon = isCompleted ? '✓'
                              : isActive ? '▶'
                              : isOnHold ? '⏸'
                              : String(idx + 1);

                const borderColor = isCompleted ? 'border-l-green-400'
                                  : isActive ? 'border-l-blue-400'
                                  : isOnHold ? 'border-l-yellow-400'
                                  : 'border-l-slate-200';

                const barColor = isCompleted ? 'bg-green-500'
                               : isActive ? 'bg-blue-500'
                               : isOnHold ? 'bg-yellow-400'
                               : 'bg-slate-300';

                const stageBudgets = stage.budget ? [
                  { label: '👷 Labour', val: Number((stage.budget as any).labour_budget), color: 'text-blue-600 bg-blue-50' },
                  { label: '🧱 Material', val: Number((stage.budget as any).material_budget), color: 'text-orange-600 bg-orange-50' },
                  { label: '⚙️ Equipment', val: Number((stage.budget as any).equipment_budget), color: 'text-purple-600 bg-purple-50' },
                  { label: '📦 Other', val: Number((stage.budget as any).other_budget), color: 'text-gray-600 bg-gray-100' },
                ] : [];

                return (
                  <div key={stage.id} className="relative flex gap-4 z-10">
                    <div className={`shrink-0 w-[30px] h-[30px] mt-4 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10
                      ${isCompleted || isActive ? 'text-white' : isOnHold ? 'text-white' : 'text-slate-500'}
                      ${dotColor}`}>
                      {dotIcon}
                    </div>

                    <div className={`flex-1 bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
                      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-800 text-sm">{stage.name}</h3>
                            {stage.description && (
                              <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[200px]">{stage.description}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                            {stage.start_date && <span>📅 {stage.start_date}</span>}
                            {stage.end_date && <span>→ {stage.end_date}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                            <span className="font-medium text-slate-600">Budget: PKR {totalBudget.toLocaleString()}</span>
                            <span className="font-medium text-rose-700">Actual: PKR {actualCost.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[stage.status] || 'bg-slate-100 text-slate-600'}`}>
                            {stage.status}
                          </span>
                          {canEditStages && (
                            <button
                              onClick={() => openEditStage(stage)}
                              className="text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors font-medium"
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="px-4 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold w-10 text-right shrink-0 ${
                            isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-slate-500'
                          }`}>
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {stageBudgets.some(b => b.val > 0) && (
                        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {stageBudgets.map(b => b.val > 0 && (
                            <div key={b.label} className={`rounded-lg px-3 py-2 ${b.color}`}>
                              <p className="text-xs opacity-70">{b.label}</p>
                              <p className="text-xs font-bold mt-0.5">PKR {b.val.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {showActivityLog && (
        <ProjectActivityLog
          projectId={projectId}
          projectName={project.name}
          onClose={() => setShowActivityLog(false)}
        />
      )}
    </div>
  );
}
