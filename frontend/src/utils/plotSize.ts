export const GAZZ_SQFT = 9;
export const PAKISTAN_MARLA_SQFT = 272.25;

export type PlotSizeUnit = 'gazz' | 'sqft' | 'marla';

export const PLOT_SIZE_UNITS: { value: PlotSizeUnit; label: string }[] = [
  { value: 'gazz', label: 'Gazz' },
  { value: 'sqft', label: 'Sq. Ft' },
  { value: 'marla', label: 'Marla' },
];

export function toSqft(value: number, unit: PlotSizeUnit, marlaSqft: number): number {
  if (!Number.isFinite(value) || value < 0) return NaN;
  const marla = marlaSqft > 0 ? marlaSqft : PAKISTAN_MARLA_SQFT;
  switch (unit) {
    case 'gazz':
      return value * GAZZ_SQFT;
    case 'marla':
      return value * marla;
    case 'sqft':
    default:
      return value;
  }
}

export function fromSqft(sqft: number, marlaSqft: number): { gazz: number; sqft: number; marla: number } {
  const marla = marlaSqft > 0 ? marlaSqft : PAKISTAN_MARLA_SQFT;
  const s = Number.isFinite(sqft) ? sqft : 0;
  return {
    sqft: s,
    gazz: s / GAZZ_SQFT,
    marla: s / marla,
  };
}

/** Format a number for display (up to 4 decimals, trim trailing zeros). */
export function formatAreaNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10000) / 10000;
  return rounded.toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
}

export function formatPlotEquivalents(
  sqft: number | null | undefined,
  marlaSqft: number,
): string | null {
  if (sqft == null || !Number.isFinite(Number(sqft)) || Number(sqft) < 0) return null;
  const eq = fromSqft(Number(sqft), marlaSqft);
  return `${formatAreaNumber(eq.gazz)} Gazz · ${formatAreaNumber(eq.sqft)} Sq. Ft · ${formatAreaNumber(eq.marla)} Marla`;
}

export function valueInUnit(sqft: number, unit: PlotSizeUnit, marlaSqft: number): number {
  const eq = fromSqft(sqft, marlaSqft);
  if (unit === 'gazz') return eq.gazz;
  if (unit === 'marla') return eq.marla;
  return eq.sqft;
}
