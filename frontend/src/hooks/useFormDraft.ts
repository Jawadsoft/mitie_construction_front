import { useEffect, useRef, useState } from 'react';

const PREFIX = 'erp.draft.';

function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearFormDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

interface Options<T> {
  /** Storage key without prefix, e.g. `projects.create` */
  key: string;
  /** When true, watch values and debounce-save */
  enabled: boolean;
  /** Current form values */
  values: T;
  /** True when user has edited vs empty/baseline */
  isDirty: boolean;
  debounceMs?: number;
}

/**
 * Client-only form draft for create modals.
 * Call `consumeRestoredDraft` once on open to hydrate + show toast.
 */
export function useFormDraft<T>({
  key,
  enabled,
  values,
  isDirty,
  debounceMs = 800,
}: Options<T>) {
  const [draftSaved, setDraftSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredOnce = useRef(false);

  useEffect(() => {
    if (!enabled || !isDirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      writeDraft(key, values);
      setDraftSaved(true);
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, isDirty, values, key, debounceMs]);

  useEffect(() => {
    if (!enabled) {
      restoredOnce.current = false;
      setDraftSaved(false);
    }
  }, [enabled]);

  const consumeRestoredDraft = (): T | null => {
    if (restoredOnce.current) return null;
    restoredOnce.current = true;
    const draft = readDraft<T>(key);
    if (draft) setDraftSaved(true);
    return draft;
  };

  const clear = () => {
    clearFormDraft(key);
    setDraftSaved(false);
  };

  return { draftSaved, consumeRestoredDraft, clear };
}

/** Peek without consuming (e.g. before open). */
export function peekFormDraft<T>(key: string): T | null {
  return readDraft<T>(key);
}
