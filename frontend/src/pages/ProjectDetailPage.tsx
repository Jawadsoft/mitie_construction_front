import { useEffect, useState } from 'react';
import { getProject, createStage, updateStage } from '../api/projects';
import type { Project, Stage } from '../api/projects';

const STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-slate-100 text-slate-700',
  Active: 'bg-green-100 text-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-blue-100 text-blue-700',
  Sold: 'bg-purple-100 text-purple-700',
  Planned: 'bg-slate-100 text-slate-700',
};

const STAGE_STATUSES = ['Planned', 'Active', 'On Hold', 'Completed'];

const DEFAULT_STAGES = [
  { name: 'Land Purchase',         icon: '📜', description: 'Plot purchase, registration & stamp duty' },
  { name: 'Design & Approvals',    icon: '📐', description: 'Architectural drawings, NOC & approvals' },
  { name: 'Excavation',            icon: '🚜', description: 'Site clearing and excavation work' },
  { name: 'Foundation',            icon: '🧱', description: 'Footing, footings and foundation slab' },
  { name: 'Structure / Grey Work', icon: '🏗️', description: 'Columns, beams, slabs and brickwork' },
  { name: 'Masonry',               icon: '🧱', description: 'Brick walls, block work and filling' },
  { name: 'Plumbing',              icon: '🔧', description: 'Underground and above-ground plumbing' },
  { name: 'Electrical',            icon: '⚡', description: 'Wiring, conduit and DB installation' },
  { name: 'Plaster',               icon: '🪣', description: 'Internal and external plastering' },
  { name: 'Flooring',              icon: '🏠', description: 'Tiles, marble or hardwood flooring' },
  { name: 'Fixtures & Finishing',  icon: '🪟', description: 'Doors, windows, sanitaryware, kitchen' },
  { name: 'External Works',        icon: '🌳', description: 'Boundary wall, driveway, landscaping' },
  { name: 'Final Inspection',      icon: '✅', description: 'Snag list, punch items and sign-off' },
  { name: 'Ready for Sale',        icon: '🔑', description: 'Handover-ready, listing and marketing' },
];

interface Props {
  projectId: string;
  onBack: () => void;
}

const emptyStageForm = {
  name: '', description: '', sequence_order: '', start_date: '', end_date: '',
  completion_percent: '0', status: 'Planned',
  labour_budget: '', material_budget: '', equipment_budget: '', other_budget: '',
};

export default function ProjectDetailPage({ projectId, onBack }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStageForm, setShowStageForm] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState({ ...emptyStageForm });

  // Default stages modal
  const [showDefaultModal, setShowDefaultModal] = useState(false);
  const [selectedDefaults, setSelectedDefaults] = useState<Set<number>>(new Set(DEFAULT_STAGES.map((_, i) => i)));
  const [addingDefaults, setAddingDefaults] = useState(false);
  const [defaultSuccess, setDefaultSuccess] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setProject(await getProject(projectId));
    } catch { setError('Failed to load project'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

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
      labour_budget: stage.budget?.labour_budget || '',
      material_budget: stage.budget?.material_budget || '',
      equipment_budget: stage.budget?.equipment_budget || '',
      other_budget: stage.budget?.other_budget || '',
    });
    setShowStageForm(true);
  };

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
    } catch { setError('Failed to save stage'); }
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
      for (let i = 0; i < toAdd.length; i++) {
        await createStage(projectId, {
          name: toAdd[i].name,
          description: toAdd[i].description,
          sequence_order: i + 1,
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
    } catch { setError('Failed to add default stages'); }
    finally { setAddingDefaults(false); }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!project) return <p className="text-sm text-red-500">{error}</p>;

  const stages = project.stages || [];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
        ← Back to Projects
      </button>

      {/* Project header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{project.name}</h1>
              {project.location && <p className="text-sm text-slate-400 mt-0.5">📍 {project.location}</p>}
            </div>
            <span className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold border ${
              project.status === 'Active'    ? 'bg-green-500/20 text-green-300 border-green-500/40' :
              project.status === 'Completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
              project.status === 'On Hold'   ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
              project.status === 'Sold'      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
              'bg-slate-500/20 text-slate-300 border-slate-500/40'
            }`}>
              {project.status}
            </span>
          </div>

          {/* Overall progress */}
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

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
          <div className="p-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Budget</p>
            <p className="text-base font-bold text-slate-800 mt-1">
              {project.total_estimated_budget
                ? `PKR ${Number(project.total_estimated_budget).toLocaleString()}`
                : '—'}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Stage Budget</p>
            <p className="text-base font-bold text-slate-800 mt-1">
              PKR {(project.computed?.total_stage_budget || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Completion</p>
            <p className="text-base font-bold text-green-600 mt-1">{project.computed?.avg_completion_percent ?? 0}%</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Stages</p>
            <p className="text-base font-bold text-slate-800 mt-1">{project.computed?.stage_count ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Stages section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-medium text-slate-800">Construction Stages</h2>
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
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        {showStageForm && (
          <form onSubmit={handleStageSubmit} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <h3 className="font-medium text-sm">{editingStage ? 'Edit Stage' : 'New Stage'}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stage Name *</label>
                <input required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.name} onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.status} onChange={e => setStageForm(f => ({ ...f, status: e.target.value }))}>
                  {STAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.start_date} onChange={e => setStageForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.end_date} onChange={e => setStageForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Completion % (0–100)</label>
                <input type="number" min="0" max="100" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.completion_percent} onChange={e => setStageForm(f => ({ ...f, completion_percent: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
                <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={stageForm.sequence_order} onChange={e => setStageForm(f => ({ ...f, sequence_order: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-600">Budget breakdown (optional)</p>
            <div className="grid gap-3 md:grid-cols-4">
              {(['labour_budget', 'material_budget', 'equipment_budget', 'other_budget'] as const).map(key => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1 capitalize">{key.replace('_budget', '')}</label>
                  <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={(stageForm as any)[key]} onChange={e => setStageForm(f => ({ ...f, [key]: e.target.value }))} />
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

        {/* Default stages modal */}
        {showDefaultModal && (
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
                {/* Select all / none */}
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
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
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

        {stages.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <div className="text-4xl mb-3">🪜</div>
            <p className="font-medium text-slate-600">No stages yet</p>
            <p className="text-sm text-slate-400 mt-1">Click <strong>⚡ Default Stages</strong> to add all standard stages at once, or use <strong>+ Add Stage</strong> to add manually.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-slate-200 z-0" />

            <div className="space-y-3">
              {stages.sort((a, b) => a.sequence_order - b.sequence_order).map((stage, idx) => {
                const pct = Number(stage.completion_percent);
                const isCompleted = stage.status === 'Completed' || pct === 100;
                const isActive   = stage.status === 'Active';
                const isOnHold   = stage.status === 'On Hold';
                const totalBudget = stage.budget ? Number(stage.budget.total_budget) : 0;

                const dotColor = isCompleted ? 'bg-green-500 border-green-500'
                               : isActive    ? 'bg-blue-500 border-blue-500'
                               : isOnHold    ? 'bg-yellow-400 border-yellow-400'
                               : 'bg-white border-slate-300';

                const dotIcon = isCompleted ? '✓'
                              : isActive    ? '▶'
                              : isOnHold    ? '⏸'
                              : String(idx + 1);

                const borderColor = isCompleted ? 'border-l-green-400'
                                  : isActive    ? 'border-l-blue-400'
                                  : isOnHold    ? 'border-l-yellow-400'
                                  : 'border-l-slate-200';

                const barColor = isCompleted ? 'bg-green-500'
                               : isActive    ? 'bg-blue-500'
                               : isOnHold    ? 'bg-yellow-400'
                               : 'bg-slate-300';

                const stageBudgets = stage.budget ? [
                  { label: '👷 Labour',    val: Number((stage.budget as any).labour_budget),    color: 'text-blue-600 bg-blue-50' },
                  { label: '🧱 Material',  val: Number((stage.budget as any).material_budget),  color: 'text-orange-600 bg-orange-50' },
                  { label: '⚙️ Equipment', val: Number((stage.budget as any).equipment_budget), color: 'text-purple-600 bg-purple-50' },
                  { label: '📦 Other',     val: Number((stage.budget as any).other_budget),     color: 'text-gray-600 bg-gray-100' },
                ] : [];

                return (
                  <div key={stage.id} className="relative flex gap-4 z-10">
                    {/* Timeline dot */}
                    <div className={`shrink-0 w-[30px] h-[30px] mt-4 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10
                      ${isCompleted || isActive ? 'text-white' : isOnHold ? 'text-white' : 'text-slate-500'}
                      ${dotColor}`}>
                      {dotIcon}
                    </div>

                    {/* Stage card */}
                    <div className={`flex-1 bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
                      {/* Header row */}
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
                            {stage.end_date   && <span>→ {stage.end_date}</span>}
                            {totalBudget > 0  && <span className="font-medium text-slate-600">PKR {totalBudget.toLocaleString()}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[stage.status] || 'bg-slate-100 text-slate-600'}`}>
                            {stage.status}
                          </span>
                          <button
                            onClick={() => openEditStage(stage)}
                            className="text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors font-medium"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
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

                      {/* Budget breakdown */}
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
    </div>
  );
}
