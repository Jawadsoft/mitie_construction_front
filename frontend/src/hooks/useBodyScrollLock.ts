import { useEffect } from 'react';

/** Nested-safe body scroll lock (ref-counted). */
let lockCount = 0;

export function lockBodyScroll(): () => void {
  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = '';
    }
  };
}

/** Lock document body scroll while `active` is true (e.g. modal open). */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    return lockBodyScroll();
  }, [active]);
}
