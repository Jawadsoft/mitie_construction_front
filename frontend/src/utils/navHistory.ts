/** In-app navigation stack for HashRouter-safe smart Back. */

const KEY = 'erp.navHistory';
const MAX = 40;

function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-MAX)));
  } catch {
    /* ignore */
  }
}

export function locationKey(pathname: string, search = ''): string {
  return pathname + (search || '');
}

/** Push current location; skip consecutive duplicates. */
export function pushNavHistory(key: string) {
  const stack = readStack();
  if (stack[stack.length - 1] === key) return;
  stack.push(key);
  writeStack(stack);
}

/** Peek previous entry without popping current. */
export function peekPreviousNav(fallback = '/projects'): string {
  const stack = readStack();
  if (stack.length < 2) return fallback;
  return stack[stack.length - 2] || fallback;
}

/**
 * Pop current and return previous path for navigate().
 * If empty, return fallback.
 */
export function popSmartBack(fallback = '/projects'): string {
  const stack = readStack();
  if (stack.length === 0) return fallback;
  stack.pop();
  writeStack(stack);
  if (stack.length === 0) return fallback;
  return stack[stack.length - 1];
}

export function backLabel(fallbackName = 'Projects'): string {
  const prev = peekPreviousNav('');
  if (!prev) return `Back to ${fallbackName}`;
  if (prev.startsWith('/projects/') && prev !== '/projects') return 'Back';
  if (prev.startsWith('/projects')) return 'Back to Projects';
  if (prev.startsWith('/expenses')) return 'Back to Expenses';
  if (prev.startsWith('/dashboard')) return 'Back to Dashboard';
  if (prev.startsWith('/funds')) return 'Back to Funds';
  if (prev.startsWith('/sales')) return 'Back to Sales';
  if (prev.startsWith('/inventory')) return 'Back to Inventory';
  if (prev.startsWith('/labour')) return 'Back to Labour';
  return 'Back';
}
