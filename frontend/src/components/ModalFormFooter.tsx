import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useModalRequestClose } from './Modal';
import { useRegisterModalSave } from './ShortcutsProvider';

/** Sticky Cancel + Save for form modals. Cancel uses dirty-aware close. */
export default function ModalFormFooter({
  onSave,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  saving = false,
  saveDisabled = false,
  error,
}: {
  onSave: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  error?: ReactNode;
}) {
  const requestClose = useModalRequestClose();
  const save = useCallback(() => {
    if (!saving && !saveDisabled) onSave();
  }, [onSave, saving, saveDisabled]);
  useRegisterModalSave(save, true);

  return (
    <div className="space-y-3">
      {error}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={requestClose}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || saveDisabled}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
}
