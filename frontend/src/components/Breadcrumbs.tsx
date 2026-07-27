import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-3">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className="text-slate-300 select-none" aria-hidden>&gt;</span>}
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="hover:text-slate-800 truncate max-w-[10rem] sm:max-w-[16rem]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`truncate max-w-[12rem] sm:max-w-[20rem] ${
                    last ? 'text-slate-800 font-medium' : ''
                  }`}
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
