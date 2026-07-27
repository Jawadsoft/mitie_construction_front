/** Persist list filters when URL query is empty (refresh / deep-link fallback). */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PREFIX = 'erp.filters.';

export function getStoredFilter(key: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? '';
  } catch {
    return '';
  }
}

export function setStoredFilter(key: string, value: string) {
  try {
    if (!value) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getStoredFilters(page: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(PREFIX + page);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function setStoredFilters(page: string, filters: Record<string, string>) {
  try {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v) cleaned[k] = v;
    }
    if (Object.keys(cleaned).length === 0) localStorage.removeItem(PREFIX + page);
    else localStorage.setItem(PREFIX + page, JSON.stringify(cleaned));
  } catch {
    /* ignore */
  }
}

/**
 * Hydrate filter state from URL query (primary) or localStorage (fallback).
 * Writes both on change; empty query on refresh restores last filters into URL.
 */
export function useListFilters(page: string, keys: string[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const k of keys) init[k] = '';
    return init;
  });
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const fromUrl: Record<string, string> = {};
    let urlHasAny = false;
    for (const k of keys) {
      const v = searchParams.get(k) ?? '';
      fromUrl[k] = v;
      if (v) urlHasAny = true;
    }

    if (urlHasAny) {
      setFiltersState(fromUrl);
      setStoredFilters(page, fromUrl);
      return;
    }

    // Migrate legacy single-key storage (projects status was `erp.filters.projects` string)
    let stored = getStoredFilters(page);
    if (Object.keys(stored).length === 0 && keys.length === 1) {
      const legacy = getStoredFilter(page);
      if (legacy) stored = { [keys[0]]: legacy };
    }

    const next: Record<string, string> = {};
    for (const k of keys) next[k] = stored[k] ?? '';
    setFiltersState(next);

    const hasStored = keys.some((k) => next[k]);
    if (hasStored) {
      const params = new URLSearchParams(searchParams);
      for (const k of keys) {
        if (next[k]) params.set(k, next[k]);
        else params.delete(k);
      }
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, []);

  const setFilter = useCallback(
    (key: string, value: string) => {
      setFiltersState((prev) => {
        const next = { ...prev, [key]: value };
        setStoredFilters(page, next);
        setSearchParams(
          (sp) => {
            const params = new URLSearchParams(sp);
            for (const k of keys) {
              if (next[k]) params.set(k, next[k]);
              else params.delete(k);
            }
            return params;
          },
          { replace: true },
        );
        return next;
      });
    },
    [keys, page, setSearchParams],
  );

  const setFilters = useCallback(
    (patch: Record<string, string>) => {
      setFiltersState((prev) => {
        const next = { ...prev, ...patch };
        setStoredFilters(page, next);
        setSearchParams(
          (sp) => {
            const params = new URLSearchParams(sp);
            for (const k of keys) {
              if (next[k]) params.set(k, next[k]);
              else params.delete(k);
            }
            return params;
          },
          { replace: true },
        );
        return next;
      });
    },
    [keys, page, setSearchParams],
  );

  return { filters, setFilter, setFilters };
}

/** Page id used by sidebar / CustomEvent navigate → hash path */
export const PAGE_PATHS: Record<string, string> = {
  login: '/login',
  dashboard: '/dashboard',
  projects: '/projects',
  land: '/land',
  suppliers: '/suppliers',
  labour: '/labour',
  expenses: '/expenses',
  cashflow: '/cashflow',
  procurement: '/procurement',
  funds: '/funds',
  sales: '/sales',
  accounting: '/accounting',
  users: '/users',
  reports: '/reports',
  inventory: '/inventory',
  templates: '/templates',
  profile: '/profile',
  settings: '/settings',
  guide: '/guide',
};

export function pathForPage(page: string): string {
  return PAGE_PATHS[page] || '/dashboard';
}

export function pageFromPathname(pathname: string): string {
  if (pathname.startsWith('/projects/') && pathname !== '/projects') return 'projects';
  const clean = pathname.replace(/\/$/, '') || '/';
  const entry = Object.entries(PAGE_PATHS).find(([, p]) => p === clean);
  return entry?.[0] || 'dashboard';
}

export const WORKSPACE_TABS = [
  'construction',
  'funding',
  'inventory',
  'procurement',
  'labour',
  'expenses',
  'sales',
  'profitability',
  'activity',
  'documents',
] as const;

export type WorkspaceTabParam = (typeof WORKSPACE_TABS)[number];

export const WORKSPACE_TAB_LABELS: Record<WorkspaceTabParam, string> = {
  construction: 'Construction',
  funding: 'Funding',
  inventory: 'Inventory',
  procurement: 'Procurement',
  labour: 'Labour',
  expenses: 'Expenses',
  sales: 'Sales',
  profitability: 'Profitability',
  activity: 'Activity',
  documents: 'Documents',
};

export function parseWorkspaceTab(raw: string | null): WorkspaceTabParam | null {
  if (!raw) return null;
  return (WORKSPACE_TABS as readonly string[]).includes(raw)
    ? (raw as WorkspaceTabParam)
    : null;
}

const LAST_ROUTE_KEY = 'erp.lastRoute';

export function getLastRoute(): string {
  try {
    return localStorage.getItem(LAST_ROUTE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setLastRoute(pathWithSearch: string) {
  try {
    if (!pathWithSearch || pathWithSearch === '/login' || pathWithSearch.startsWith('/login')) {
      return;
    }
    localStorage.setItem(LAST_ROUTE_KEY, pathWithSearch);
  } catch {
    /* ignore */
  }
}

export function clearLastRoute() {
  try {
    localStorage.removeItem(LAST_ROUTE_KEY);
  } catch {
    /* ignore */
  }
}
