import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Modal from './Modal';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type UnsavedChoice = 'discard' | 'save' | 'cancel';

export type UnsavedOptions = {
  title?: string;
  message?: string;
};

type ConfirmState = ConfirmOptions & {
  kind: 'binary';
  resolve: (value: boolean) => void;
};

type UnsavedState = UnsavedOptions & {
  kind: 'unsaved';
  resolve: (value: UnsavedChoice) => void;
};

type DialogState = ConfirmState | UnsavedState;

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type ConfirmUnsavedFn = (options?: UnsavedOptions) => Promise<UnsavedChoice>;

const ConfirmContext = createContext<ConfirmFn | null>(null);
const ConfirmUnsavedContext = createContext<ConfirmUnsavedFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, kind: 'binary', resolve });
    });
  }, []);

  const confirmUnsaved = useCallback((options: UnsavedOptions = {}) => {
    return new Promise<UnsavedChoice>((resolve) => {
      setState({ ...options, kind: 'unsaved', resolve });
    });
  }, []);

  const closeBinary = (value: boolean) => {
    if (state?.kind === 'binary') state.resolve(value);
    setState(null);
  };

  const closeUnsaved = (value: UnsavedChoice) => {
    if (state?.kind === 'unsaved') state.resolve(value);
    setState(null);
  };

  const confirmValue = useMemo(() => confirm, [confirm]);
  const unsavedValue = useMemo(() => confirmUnsaved, [confirmUnsaved]);

  return (
    <ConfirmContext.Provider value={confirmValue}>
      <ConfirmUnsavedContext.Provider value={unsavedValue}>
        {children}
        {state?.kind === 'binary' && (
          <Modal title={state.title || 'Confirm'} onClose={() => closeBinary(false)} mode="view">
            <div className="space-y-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">{state.message}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeBinary(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {state.cancelLabel || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => closeBinary(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    state.danger !== false
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {state.confirmLabel || 'Confirm'}
                </button>
              </div>
            </div>
          </Modal>
        )}
        {state?.kind === 'unsaved' && (
          <Modal
            title={state.title || 'Unsaved changes'}
            onClose={() => closeUnsaved('cancel')}
            mode="view"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {state.message || 'You have unsaved changes.'}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeUnsaved('cancel')}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => closeUnsaved('discard')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => closeUnsaved('save')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </Modal>
        )}
      </ConfirmUnsavedContext.Provider>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}

export function useConfirmUnsaved(): ConfirmUnsavedFn {
  const ctx = useContext(ConfirmUnsavedContext);
  if (!ctx) {
    throw new Error('useConfirmUnsaved must be used within ConfirmProvider');
  }
  return ctx;
}

export type UnsavedRegistration = {
  isDirty: boolean;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
};

type GuardApi = {
  register: (entry: UnsavedRegistration) => () => void;
  tryLeave: () => Promise<boolean>;
};

const UnsavedGuardContext = createContext<GuardApi | null>(null);

export function UnsavedGuardProvider({ children }: { children: ReactNode }) {
  const confirmUnsaved = useConfirmUnsaved();
  const entryRef = useRef<UnsavedRegistration | null>(null);
  const [, bump] = useState(0);

  const register = useCallback((entry: UnsavedRegistration) => {
    entryRef.current = entry;
    bump((n) => n + 1);
    return () => {
      if (entryRef.current === entry) entryRef.current = null;
      bump((n) => n + 1);
    };
  }, []);

  const tryLeave = useCallback(async () => {
    const entry = entryRef.current;
    if (!entry?.isDirty) return true;
    const choice = await confirmUnsaved({
      message: 'You have unsaved changes.',
    });
    if (choice === 'cancel') return false;
    if (choice === 'discard') {
      entry.onDiscard();
      return true;
    }
    try {
      await entry.onSave();
      return true;
    } catch {
      return false;
    }
  }, [confirmUnsaved]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (entryRef.current?.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  });

  const api = useMemo(() => ({ register, tryLeave }), [register, tryLeave]);

  return (
    <UnsavedGuardContext.Provider value={api}>{children}</UnsavedGuardContext.Provider>
  );
}

export function useUnsavedGuard(): GuardApi {
  const ctx = useContext(UnsavedGuardContext);
  if (!ctx) {
    throw new Error('useUnsavedGuard must be used within UnsavedGuardProvider');
  }
  return ctx;
}

/** Register an open dirty form with the global leave guard. */
export function useRegisterUnsaved(opts: {
  active: boolean;
  isDirty: boolean;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
}) {
  const { register } = useUnsavedGuard();
  const saveRef = useRef(opts.onSave);
  const discardRef = useRef(opts.onDiscard);
  saveRef.current = opts.onSave;
  discardRef.current = opts.onDiscard;

  useEffect(() => {
    if (!opts.active) return;
    return register({
      isDirty: opts.isDirty,
      onSave: () => saveRef.current(),
      onDiscard: () => discardRef.current(),
    });
  }, [opts.active, opts.isDirty, register]);
}
