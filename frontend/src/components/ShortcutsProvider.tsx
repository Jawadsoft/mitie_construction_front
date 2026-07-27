import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import Modal from './Modal';

type SaveFn = () => void | Promise<void>;

const ModalSaveContext = createContext<{
  registerSave: (fn: SaveFn | null) => void;
}>({ registerSave: () => {} });

export function useRegisterModalSave(fn: SaveFn | null, active: boolean) {
  const { registerSave } = useContext(ModalSaveContext);
  useEffect(() => {
    if (!active) {
      registerSave(null);
      return;
    }
    registerSave(fn);
    return () => registerSave(null);
  }, [active, fn, registerSave]);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return !!target.closest('[contenteditable="true"]');
}

const SHORTCUTS = [
  { keys: 'N', desc: 'New Project (on Projects list)' },
  { keys: 'Ctrl/Cmd+S', desc: 'Save open form modal' },
  { keys: '/', desc: 'Open global search' },
  { keys: 'Ctrl/Cmd+K', desc: 'Open global search' },
  { keys: 'Esc', desc: 'Close modal / drawer / search' },
  { keys: '?', desc: 'Show this shortcuts help' },
];

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const saveRef = useRef<SaveFn | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const registerSave = useCallback((fn: SaveFn | null) => {
    saveRef.current = fn;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) && e.key !== 'Escape') {
        // Allow Ctrl+S even in inputs
        if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's')) return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (saveRef.current) {
          e.preventDefault();
          void saveRef.current();
        }
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('erp:open-search'));
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (
        e.key.toLowerCase() === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isEditableTarget(e.target)
      ) {
        const path = location.pathname.replace(/\/$/, '') || '/';
        if (path === '/projects') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('erp:new-project'));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [location.pathname]);

  return (
    <ModalSaveContext.Provider value={{ registerSave }}>
      {children}
      {helpOpen && (
        <Modal title="Keyboard shortcuts" mode="view" onClose={() => setHelpOpen(false)} size="md">
          <ul className="space-y-2 text-sm">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
                <kbd className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 shrink-0">
                  {s.keys}
                </kbd>
                <span className="text-slate-600 text-right">{s.desc}</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </ModalSaveContext.Provider>
  );
}
