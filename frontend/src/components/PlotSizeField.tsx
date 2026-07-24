import { useMemo, useState } from 'react';
import FieldLabel from './FieldLabel';
import {
  formatAreaNumber,
  fromSqft,
  PLOT_SIZE_UNITS,
  toSqft,
  valueInUnit,
  type PlotSizeUnit,
} from '../utils/plotSize';

type Props = {
  valueSqft: number | null;
  onChange: (sqft: number | null) => void;
  marlaSqft: number;
  disabled?: boolean;
  idPrefix?: string;
};

export default function PlotSizeField({
  valueSqft,
  onChange,
  marlaSqft,
  disabled = false,
  idPrefix = 'plot',
}: Props) {
  const [unit, setUnit] = useState<PlotSizeUnit>('marla');
  const [inputText, setInputText] = useState(() => {
    if (valueSqft == null || !Number.isFinite(valueSqft)) return '';
    const v = valueInUnit(valueSqft, 'marla', marlaSqft);
    return String(Math.round(v * 10000) / 10000);
  });

  const equivalents = useMemo(() => {
    if (valueSqft == null || !Number.isFinite(valueSqft) || valueSqft < 0) return null;
    return fromSqft(valueSqft, marlaSqft);
  }, [valueSqft, marlaSqft]);

  const applyInput = (raw: string, nextUnit: PlotSizeUnit) => {
    setInputText(raw);
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      onChange(null);
      return;
    }
    onChange(toSqft(n, nextUnit, marlaSqft));
  };

  const onUnitChange = (nextUnit: PlotSizeUnit) => {
    setUnit(nextUnit);
    if (valueSqft != null && Number.isFinite(valueSqft)) {
      const v = valueInUnit(valueSqft, nextUnit, marlaSqft);
      setInputText(String(Math.round(v * 10000) / 10000));
    } else {
      applyInput(inputText, nextUnit);
    }
  };

  return (
    <div className="space-y-2">
      <FieldLabel
        htmlFor={`${idPrefix}-size`}
        info="Enter size once and pick a unit. Stored as square feet; Gazz and Marla are calculated live."
      >
        Plot Size
      </FieldLabel>
      <div className="flex gap-2">
        <input
          id={`${idPrefix}-size`}
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 10"
          disabled={disabled}
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          value={inputText}
          onChange={(e) => applyInput(e.target.value, unit)}
        />
        <select
          id={`${idPrefix}-unit`}
          disabled={disabled}
          aria-label="Plot size unit"
          className="w-28 rounded border border-slate-300 px-2 py-2 text-sm disabled:opacity-50"
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as PlotSizeUnit)}
        >
          {PLOT_SIZE_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      {equivalents && (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
          <p className="font-medium text-slate-600">Equivalent Sizes</p>
          <p>✓ {formatAreaNumber(equivalents.gazz)} Gazz</p>
          <p>✓ {formatAreaNumber(equivalents.sqft)} Sq. Ft</p>
          <p>✓ {formatAreaNumber(equivalents.marla)} Marla</p>
        </div>
      )}
    </div>
  );
}
