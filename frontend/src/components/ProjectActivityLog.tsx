import { useEffect, useMemo, useState } from 'react';
import { getProjectActivity } from '../api/projects';
import type { ProjectActivityItem, ProjectActivityLog } from '../api/projects';
import Modal from './Modal';
import { formatDate } from '../utils/date';

const CATEGORY_COLORS: Record<string, string> = {
  Expense: 'bg-red-100 text-red-700',
  Cash: 'bg-slate-100 text-slate-700',
  Accounting: 'bg-violet-100 text-violet-700',
  Sale: 'bg-green-100 text-green-700',
  Collection: 'bg-emerald-100 text-emerald-700',
  Labour: 'bg-amber-100 text-amber-800',
  Stage: 'bg-blue-100 text-blue-700',
  Inventory: 'bg-cyan-100 text-cyan-800',
  Procurement: 'bg-orange-100 text-orange-800',
  Project: 'bg-indigo-100 text-indigo-800',
};

interface Props {
  projectId: string;
  projectName?: string;
  onClose: () => void;
}

export default function ProjectActivityLog({ projectId, projectName, onClose }: Props) {
  const [data, setData] = useState<ProjectActivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getProjectActivity(projectId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Failed to load activity log');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const categories = useMemo(() => {
    const set = new Set((data?.activities ?? []).map((a) => a.category));
    return ['All', ...Array.from(set).sort()];
  }, [data]);

  const rows: ProjectActivityItem[] = useMemo(() => {
    const list = data?.activities ?? [];
    if (category === 'All') return list;
    return list.filter((a) => a.category === category);
  }, [data, category]);

  return (
    <Modal
      title={`Activity Log${projectName || data?.project_name ? ` — ${projectName || data?.project_name}` : ''}`}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {loading ? 'Loading…' : `${rows.length} event${rows.length === 1 ? '' : 's'}`}
            {data && category !== 'All' ? ` (filtered from ${data.total})` : ''}
          </p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
            disabled={loading || !data}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All categories' : c}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-400 py-10 text-center">Loading activity…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">No activity recorded for this project yet.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium w-28">Date</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium w-28">Category</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium w-36">Action</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">Details</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium w-28">Ref</th>
                    <th className="px-3 py-2 text-right text-slate-600 font-medium w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr key={`${a.entity_type}-${a.entity_id}-${i}`} className="border-t hover:bg-slate-50/80">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(a.occurred_at)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            CATEGORY_COLORS[a.category] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {a.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{a.action}</td>
                      <td className="px-3 py-2 text-slate-600">{a.description}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{a.reference || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                        {a.amount != null && Number.isFinite(a.amount)
                          ? `PKR ${Number(a.amount).toLocaleString()}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
