import { useEffect, useRef, useState } from 'react';

interface ColumnDef {
  id: string;
  label: string;
}

interface Props {
  columns: ColumnDef[];
  visible: string[];
  onToggle: (id: string) => void;
}

export default function ColumnPicker({ columns, visible, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700"
        title="Show or hide columns"
      >
        <span aria-hidden>⚙</span>
        Columns
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-20 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-2">
          <p className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Visible columns
          </p>
          {columns.map((c) => {
            const checked = visible.includes(c.id);
            const onlyOne = checked && visible.length <= 1;
            return (
              <label
                key={c.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50 ${
                  onlyOne ? 'opacity-60' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={checked}
                  disabled={onlyOne}
                  onChange={() => onToggle(c.id)}
                />
                {c.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
