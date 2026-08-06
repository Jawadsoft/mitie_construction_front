import { useState } from 'react';

const PREFIX = 'erp.columns.';

export function getColumnPrefs(tableId: string, allIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(PREFIX + tableId);
    const allKey = `${PREFIX}${tableId}.all`;
    const prevAllRaw = localStorage.getItem(allKey);
    const prevAll: string[] = (() => {
      try {
        const p = prevAllRaw ? JSON.parse(prevAllRaw) : null;
        return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
      } catch {
        return [];
      }
    })();

    let visible: string[];
    if (!raw) {
      visible = [...allIds];
    } else {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        visible = [...allIds];
      } else {
        const ids = parsed.filter((x): x is string => typeof x === 'string' && allIds.includes(x));
        visible = ids.length > 0 ? ids : [...allIds];
      }
    }

    // Newly introduced columns (not in last-known schema) show by default
    const newlyAdded =
      prevAll.length > 0
        ? allIds.filter((id) => !prevAll.includes(id) && !visible.includes(id))
        : [];
    if (newlyAdded.length) {
      visible = allIds.filter((id) => visible.includes(id) || newlyAdded.includes(id));
    }

    try {
      localStorage.setItem(allKey, JSON.stringify(allIds));
    } catch {
      /* ignore */
    }

    return visible;
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
