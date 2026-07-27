import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch, type GlobalSearchResult, type SearchHit } from '../api/search';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

type GroupKey = keyof GlobalSearchResult;

const GROUPS: { key: GroupKey; label: string; path: (id: string) => string }[] = [
  { key: 'projects', label: 'Projects', path: (id) => `/projects/${id}` },
  { key: 'land', label: 'Land', path: () => '/land' },
  { key: 'customers', label: 'Customers', path: () => '/sales?tab=customers' },
  { key: 'sales', label: 'Sales', path: () => '/sales?tab=sales' },
  { key: 'expenses', label: 'Expenses', path: () => '/expenses' },
  { key: 'suppliers', label: 'Suppliers', path: () => '/suppliers' },
];

const EMPTY: GlobalSearchResult = {
  projects: [],
  land: [],
  customers: [],
  sales: [],
  expenses: [],
  suppliers: [],
};

interface FlatItem {
  group: GroupKey;
  hit: SearchHit;
  path: string;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult>(EMPTY);
  const [error, setError] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useBodyScrollLock(open);

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setResults(EMPTY);
    setError('');
    setActiveIdx(0);
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('erp:open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('erp:open-search', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        setError('');
        const data = await globalSearch(trimmed);
        setResults(data);
        setActiveIdx(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, open]);

  const flat: FlatItem[] = [];
  for (const g of GROUPS) {
    for (const hit of results[g.key]) {
      flat.push({ group: g.key, hit, path: g.path(hit.id) });
    }
  }

  const go = (item: FlatItem) => {
    navigate(item.path);
    close();
  };

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flat[activeIdx]) {
      e.preventDefault();
      go(flat[activeIdx]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        title="Search (Ctrl+K)"
      >
        <span aria-hidden>🔍</span>
        <span className="text-slate-400">Search…</span>
        <kbd className="text-[10px] bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-slate-400">
          Ctrl+K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-700"
        title="Search"
        aria-label="Search"
      >
        🔍
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <span className="text-slate-400">🔍</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search projects, land, customers…"
                className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400"
              />
              {loading && <span className="text-xs text-slate-400">…</span>}
              <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                Esc
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
              {!error && q.trim().length < 2 && (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">
                  Type at least 2 characters
                </p>
              )}
              {!error && q.trim().length >= 2 && !loading && flat.length === 0 && (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">No results</p>
              )}
              {GROUPS.map((g) => {
                const hits = results[g.key];
                if (!hits.length) return null;
                return (
                  <div key={g.key} className="mb-1">
                    <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {g.label}
                    </p>
                    {hits.map((hit) => {
                      const idx = flat.findIndex(
                        (f) => f.group === g.key && f.hit.id === hit.id,
                      );
                      const active = idx === activeIdx;
                      return (
                        <button
                          key={`${g.key}-${hit.id}`}
                          type="button"
                          onClick={() => go({ group: g.key, hit, path: g.path(hit.id) })}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            active ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-medium block truncate">{hit.label}</span>
                          {hit.sub && (
                            <span className="text-xs text-slate-500 truncate block">{hit.sub}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
