import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotificationSummary, type NotificationItem } from '../api/notifications';

const READ_KEY = 'erp.notifications.readIds';

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [read, setRead] = useState<Set<string>>(loadRead);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotificationSummary();
      setItems(data.items ?? []);
    } catch {
      /* quiet — bell stays empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unread = items.filter((i) => !read.has(i.id)).length;

  const markAllRead = () => {
    const next = new Set(read);
    items.forEach((i) => next.add(i.id));
    setRead(next);
    saveRead(next);
  };

  const openItem = (item: NotificationItem) => {
    const next = new Set(read);
    next.add(item.id);
    setRead(next);
    saveRead(next);
    setOpen(false);
    navigate(item.href);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-700 transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-blue-600 hover:underline"
              disabled={unread === 0}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No alerts right now</p>
            )}
            {items.map((item) => {
              const isRead = read.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 ${
                    isRead ? 'opacity-70' : 'bg-blue-50/40'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.body}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
