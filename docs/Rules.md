# Development Rules

Standards for the Construction ERP repo (`frontend/` + `backend/server/`). Also see [Architecture.md](Architecture.md), [Design.md](Design.md), and [Decisions.md](Decisions.md).

## Use

- **TypeScript** on frontend and Nest backend
- **NestJS** modules: `controller` → `service` → TypeORM `entity`
- **React** function components and page modules under `frontend/src/pages/`
- **Tailwind** utility classes for layout and styling
- **`async/await`** with try/catch (or equivalent) for API calls; surface user-visible errors
- **JWT** via existing auth helpers (`getAuthHeaders`, Nest JWT)
- **PostgreSQL** + TypeORM entities for schema (active path)
- **Conventional commits** when committing (`feat:`, `fix:`, `docs:`, …)
- Smallest change that solves the task; match existing file style

## Avoid

- Introducing `any` in new code (prefer typed DTOs/interfaces)
- Inline styles when Tailwind classes suffice
- Duplicating page/API logic—extend shared `api/` helpers and components
- Inventing endpoints, env vars, or columns that are not in the codebase
- Committing `.env`, secrets, or `node_modules`
- Relying on legacy Express (`backend/src`) or MySQL SQL for new features
- Hardcoding production URLs or credentials

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| React pages / components | PascalCase | `ProjectsPage.tsx`, `Modal.tsx` |
| Functions / variables | camelCase | `getPurchaseOrders`, `orderForm` |
| Nest modules / folders | kebab or short noun | `material-requests`, `land` |
| API paths | `/api/...` plural resources | `/api/projects`, `/api/land/parcels` |
| DB tables / columns | snake_case | `project_stages`, `request_no` |
| Entity class names | PascalCase | `MaterialRequest`, `LandParcel` |

## Frontend patterns

- Keep API calls in `frontend/src/api/`
- Pages own UI state; reuse `Modal`, drawers, export utils
- Prefer Bootstrap-like spacing via Tailwind (`space-y-4`, `rounded-xl`, `border`)
- Do not add heavy UI libraries without approval

## Backend patterns

- Thin controllers; business logic in services
- Validate inputs (class-validator / explicit checks)—do not trust the client
- Use transactions when writing linked rows (e.g. receipt + stock ledger)
- Do not log passwords, tokens, or PII
- New tables = TypeORM entities registered in a module (sync creates columns in current setup)

## Documentation

- Feature priority follows commercial **P1–P5** in [Tasks.md](Tasks.md) (Accounting deepen → MR approvals → BOQ → Equipment → Documents). Do not invent a different order from older `scope.md` lists.
- End of every development session: update [Memory.md](Memory.md); tick [Tasks.md](Tasks.md) / [Phases.md](Phases.md) when work is verified.
- When entities or Nest controllers change, update [Database.md](Database.md) and/or [API.md](API.md) in the same session.
- Do not leave docs stale after shipping a P1–P5 checkbox.

## Git

- Commit only when asked
- No force-push to main, no `--no-verify` unless explicitly requested
- Do not amend pushed commits

## Local Nest tip

If watch mode reports missing `dist/main`, run `npm run build` under `backend/server` (or `backend`) before `npm run dev`. Prefer `deleteOutDir: false` in Nest CLI config to avoid empty-`dist` races.
