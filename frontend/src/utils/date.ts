/** Extract YYYY-MM-DD from API date / ISO string without timezone day-shift. */
export function toDateOnly(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return s;
  return toDateOnly(parsed);
}

/** Display date as DD/MM/YYYY (Pakistan / UK style). */
export function formatDate(value: string | Date | null | undefined): string {
  const iso = toDateOnly(value);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}
