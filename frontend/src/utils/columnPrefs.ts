import { useState } from 'react';

const PREFIX = 'erp.columns.';

export function getColumnPrefs(tableId: string, allIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(PREFIX + tableId);
    if (!raw) return [...allIds];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...allIds];
    const ids = parsed.filter((x): x is string => typeof x === 'string' && allIds.includes(x));
    return ids.length > 0 ? ids : [...allIds];
  } catch {
    return [...allIds];
  }
}

export function setColumnPrefs(tableId: string, visibleIds: string[]) {
  try {
    localStorage.setItem(PREFIX + tableId, JSON.stringify(visibleIds));
  } catch {
    /* ignore */
  }
}

export function useColumnPrefs(tableId: string, allIds: string[]) {
  const [visible, setVisible] = useState(() => getColumnPrefs(tableId, allIds));

  const setVisibleIds = (ids: string[]) => {
    const next = ids.filter((id) => allIds.includes(id));
    const safe = next.length > 0 ? next : [...allIds];
    setVisible(safe);
    setColumnPrefs(tableId, safe);
  };

  const isVisible = (id: string) => visible.includes(id);

  const toggle = (id: string) => {
    if (visible.includes(id)) {
      if (visible.length <= 1) return;
      setVisibleIds(visible.filter((x) => x !== id));
    } else {
      // Preserve allIds order
      setVisibleIds(allIds.filter((id2) => visible.includes(id2) || id2 === id));
    }
  };

  return { visible, isVisible, toggle, setVisibleIds };
}
