import { formatMoneyDisplay, parseMoneyInput } from '../utils/money';

type Props = {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  name?: string;
};

/** PKR amount input with en-PK comma grouping; stores digits-only in form state. */
export default function MoneyInput({
  value,
  onChange,
  placeholder = 'e.g. 5,00,00,000',
  disabled = false,
  id,
  className = '',
  name,
}: Props) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 ${className}`}
      value={formatMoneyDisplay(value)}
      onChange={(e) => onChange(parseMoneyInput(e.target.value))}
    />
  );
}
