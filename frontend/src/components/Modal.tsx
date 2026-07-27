import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useConfirm } from './ConfirmDialog';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Sticky bottom bar (Cancel / Save). Body scrolls; footer stays visible. */
  footer?: ReactNode;
  /** Default md (max-w-lg). Use lg/xl for wider reports. */
  size?: 'md' | 'lg' | 'xl';
  /**
   * view = backdrop/Escape/X close immediately.
   * form = confirm discard when isDirty.
   * Default: form (safer for data entry).
   */
  mode?: 'view' | 'form';
  /** When mode=form, true if user edited fields */
  isDirty?: boolean;
}

const SIZE_CLASS = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

/** Only the topmost open Modal handles Escape (avoids nested confirm + form both closing). */
const escapeStack: Array<() => void> = [];

/** True while any Modal is mounted (drawers should not steal Escape). */
export function isModalOpen() {
  return escapeStack.length > 0;
}

const ModalRequestCloseContext = createContext<() => void>(() => {});

/** Call from inside Modal children (e.g. Cancel) to respect dirty confirm. */
export function useModalRequestClose() {
  return useContext(ModalRequestCloseContext);
}

export default function Modal({
  title,
  onClose,
  children,
  footer,
  size = 'md',
  mode = 'form',
  isDirty = false,
}: ModalProps) {
  useBodyScrollLock(true);
  const confirm = useConfirm();
  const closingRef = useRef(false);

  const requestClose = useCallback(async () => {
    if (closingRef.current) return;
    if (mode === 'view' || !isDirty) {
      onClose();
      return;
    }
    closingRef.current = true;
    try {
      const leave = await confirm({
        title: 'Unsaved changes',
        message: 'Unsaved changes. Leave without saving?',
        confirmLabel: 'Leave',
        cancelLabel: 'Stay',
        danger: true,
      });
      if (leave) onClose();
    } finally {
      closingRef.current = false;
    }
  }, [mode, isDirty, onClose, confirm]);

  useEffect(() => {
    const run = () => void requestClose();
    escapeStack.push(run);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (escapeStack[escapeStack.length - 1] === run) run();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = escapeStack.lastIndexOf(run);
      if (i >= 0) escapeStack.splice(i, 1);
    };
  }, [requestClose]);

  return (
    <ModalRequestCloseContext.Provider value={() => void requestClose()}>
      <div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 overflow-hidden"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) void requestClose();
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div
          className={`bg-white rounded-xl shadow-2xl w-full ${SIZE_CLASS[size]} max-h-[90vh] flex flex-col overscroll-contain`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b shrink-0 bg-white rounded-t-xl">
            <h2 className="font-bold text-lg text-gray-800">{title}</h2>
            <button
              type="button"
              onClick={() => void requestClose()}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto min-h-0">{children}</div>
          {footer != null && (
            <div className="p-4 border-t shrink-0 bg-white rounded-b-xl">{footer}</div>
          )}
        </div>
      </div>
    </ModalRequestCloseContext.Provider>
  );
}
