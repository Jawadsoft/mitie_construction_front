import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  loading?: boolean;
}

export default function DetailDrawer({ open, title, subtitle, onClose, children, loading }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="min-w-0 pr-3">
            <h2 className="text-base font-bold text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              Loading…
            </div>
          ) : children}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in { animation: slideIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}

/** A small section heading inside the drawer */
export function DrawerSection({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-5 first:mt-0">
      {title}
    </h3>
  );
}

/** A simple key-value row */
export function DrawerField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-slate-100 last:border-0 gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-800 text-right">{value ?? '—'}</span>
    </div>
  );
}

/** A status badge */
export function StatusBadge({ status }: { status: string }) {
  const color =
    /active|received|completed|paid|sold/i.test(status) ? 'bg-green-100 text-green-700' :
    /pending|planned|draft/i.test(status) ? 'bg-yellow-100 text-yellow-700' :
    /partial/i.test(status) ? 'bg-blue-100 text-blue-700' :
    /overdue|cancelled|inactive/i.test(status) ? 'bg-red-100 text-red-700' :
    'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {status}
    </span>
  );
}
