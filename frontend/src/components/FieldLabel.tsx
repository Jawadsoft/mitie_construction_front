import type { ReactNode } from 'react';

type Props = {
  htmlFor?: string;
  children: ReactNode;
  info: string;
  required?: boolean;
  className?: string;
};

/** Label with a small (i) tip shown on hover/focus. */
export default function FieldLabel({ htmlFor, children, info, required, className = '' }: Props) {
  return (
    <label
      htmlFor={htmlFor}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1 ${className}`}
    >
      <span>
        {children}
        {required ? ' *' : ''}
      </span>
      <span className="relative inline-flex group/info">
        <button
          type="button"
          tabIndex={0}
          aria-label={info}
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[9px] font-bold leading-none text-slate-500 hover:border-slate-600 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          i
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-52 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100 group-focus-within/info:opacity-100"
        >
          {info}
        </span>
      </span>
    </label>
  );
}
