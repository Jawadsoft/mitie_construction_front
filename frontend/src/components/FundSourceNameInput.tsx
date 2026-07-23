import { useEffect, useId, useMemo, useRef, useState } from 'react';

const PRESETS_BY_TYPE: Record<string, string[]> = {
  EQUITY: ['Owner capital', 'Shareholder equity', 'Partner equity'],
  LOAN: ['Bank loan facility', 'Construction loan', 'Working capital loan', 'HBL construction facility'],
  INVESTOR: ['Investor contribution', 'Private investor', 'Joint venture capital'],
  ADVANCE_SALES: ['Advance sales collection', 'Booking advances'],
  OTHER: ['Other capital', 'Bridge funding'],
};

const ALL_PRESETS = Array.from(new Set(Object.values(PRESETS_BY_TYPE).flat()));

interface Props {
  value: string;
  onChange: (value: string) => void;
  sourceType?: string;
  existingNames?: string[];
  className?: string;
  placeholder?: string;
}

function buildSuggestions(query: string, sourceType: string | undefined, existingNames: string[]): string[] {
  const presets = sourceType && PRESETS_BY_TYPE[sourceType]
    ? PRESETS_BY_TYPE[sourceType]
    : ALL_PRESETS;
  const pool = Array.from(new Set([...presets, ...existingNames.filter(Boolean)]));
  const q = query.trim().toLowerCase();
  if (!q) return pool.slice(0, 12);
  return pool.filter((n) => n.toLowerCase().includes(q)).slice(0, 12);
}

export default function FundSourceNameInput({
  value,
  onChange,
  sourceType,
  existingNames = [],
  className = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300',
  placeholder = 'Select or type a name',
}: Props) {
  const autoId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(
    () => buildSuggestions(value, sourceType, existingNames),
    [value, sourceType, existingNames],
  );
  const showList = open && suggestions.length > 0;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [value, sourceType]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = suggestions[highlight];
      if (chosen) pick(chosen);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={autoId}
        type="text"
        autoComplete="off"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${autoId}-listbox`}
        aria-autocomplete="list"
      />
      {showList && (
        <ul
          id={`${autoId}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((name, i) => (
            <li key={name} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm ${
                  i === highlight ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(name);
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400 mt-1">Pick a suggestion or type your own label.</p>
    </div>
  );
}
