import { useCallback, useState } from 'react';

/** Track form values against a baseline for Modal isDirty. */
export function useDirtyForm<T>(initial: T) {
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);

  const isDirty = JSON.stringify(values) !== JSON.stringify(baseline);

  const reset = useCallback((next?: T) => {
    const v = next !== undefined ? next : baseline;
    setValues(v);
    setBaseline(v);
  }, [baseline]);

  const setBaselineOnly = useCallback((next: T) => {
    setBaseline(next);
    setValues(next);
  }, []);

  return { values, setValues, isDirty, reset, setBaselineOnly };
}

export function isFormDirty<T>(current: T, initial: T): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}
