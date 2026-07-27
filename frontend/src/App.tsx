import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  Outlet,
} from 'react-router-dom';
import { login as apiLogin } from './api/client';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import DashboardPage from './pages/DashboardPage';
import SuppliersPage from './pages/SuppliersPage';
import LabourPage from './pages/LabourPage';
import ExpensesPage from './pages/ExpensesPage';
import CashflowPage from './pages/CashflowPage';
import ProcurementPage from './pages/ProcurementPage';
import FundsPage from './pages/FundsPage';
import SalesPage from './pages/SalesPage';
import AccountingPage from './pages/AccountingPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import InventoryPage from './pages/InventoryPage';
import TemplatesPage from './pages/TemplatesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import GuidePage from './pages/GuidePage';
import LandPage from './pages/LandPage';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import type { NavIntent } from './types/navIntent';
import { pageFromPathname, pathForPage, getLastRoute, setLastRoute } from './utils/navState';
import { useUnsavedGuard } from './components/ConfirmDialog';
import { useTrackNavHistory } from './hooks/useTrackNavHistory';
import { backLabel, popSmartBack } from './utils/navHistory';
import GlobalSearch from './components/GlobalSearch';
import { ShortcutsProvider } from './components/ShortcutsProvider';
import NotificationCenter from './components/NotificationCenter';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: '🏠 Dashboard' },
      { id: 'reports', label: '📊 Reports' },
      { id: 'cashflow', label: '💰 Cash Flow' },
    ],
  },
  {
    label: 'Capital',
    items: [{ id: 'funds', label: '💼 Funds' }],
  },
  {
    label: 'Projects',
    items: [
      { id: 'land', label: '📜 Land Registry' },
      { id: 'projects', label: '🏗️ Projects' },
      { id: 'expenses', label: '💸 Expenses' },
      { id: 'labour', label: '👷 Labour' },
      { id: 'procurement', label: '📋 Procurement' },
      { id: 'inventory', label: '🏭 Inventory' },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'suppliers', label: '🏢 Suppliers' },
      { id: 'sales', label: '🏠 Sales' },
    ],
  },
  {
    label: 'Finance',
    items: [{ id: 'accounting', label: '📒 Accounting' }],
  },
  {
    label: 'Admin',
    items: [
      { id: 'users', label: '👥 Users' },
      { id: 'templates', label: '🖨️ Site Templates' },
      { id: 'settings', label: '⚙️ Settings' },
    ],
  },
  {
    label: 'Help',
    items: [{ id: 'guide', label: '📖 How to Use' }],
  },
];

function LoginPage({
  onAuthed,
}: {
  onAuthed: () => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuthed();
      const returnTo = sessionStorage.getItem('erp.returnTo');
      sessionStorage.removeItem('erp.returnTo');
      const lastRoute = getLastRoute();
      const dest =
        (lastRoute && lastRoute !== '/login' ? lastRoute : null) ||
        (returnTo && returnTo !== '/login' ? returnTo : null) ||
        '/dashboard';
      navigate(dest, { replace: true });
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8 space-y-6 mt-12">
      <div className="text-center">
        <div className="text-4xl mb-3">🏗️</div>
        <h1 className="text-2xl font-bold text-gray-900">Construction ERP</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to manage your projects</p>
      </div>
      <form className="space-y-4" onSubmit={handleLogin}>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="admin@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 text-white py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-xs text-center text-gray-400">Default: admin@example.com / Admin@123</p>
    </section>
  );
}

function RequireAuth({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  if (!isAuthenticated) {
    const full = location.pathname + location.search;
    if (full && full !== '/login') sessionStorage.setItem('erp.returnTo', full);
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppShell({
  isAuthenticated,
  onLogout,
  onClearIntent,
}: {
  isAuthenticated: boolean;
  onLogout: () => void;
  onClearIntent: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tryLeave } = useUnsavedGuard();
  useTrackNavHistory();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useBodyScrollLock(drawerOpen);

  const activePage = pageFromPathname(location.pathname);

  // Persist last authenticated route for crash / re-login recovery
  useEffect(() => {
    if (!isAuthenticated) return;
    const full = location.pathname + location.search;
    if (full && full !== '/login' && !full.startsWith('/login')) {
      setLastRoute(full);
    }
  }, [isAuthenticated, location.pathname, location.search]);

  // Once per session: restore deep lastRoute when landing on empty / dashboard
  useEffect(() => {
    if (!isAuthenticated) return;
    const path = location.pathname.replace(/\/$/, '') || '/';
    const isDefault = path === '/' || path === '/dashboard';
    if (!isDefault) return;
    const last = getLastRoute();
    if (!last || last === '/login' || last === '/dashboard' || last === '/') return;
    const flag = sessionStorage.getItem('erp.lastRouteRestored');
    if (flag === '1') return;
    sessionStorage.setItem('erp.lastRouteRestored', '1');
    navigate(last, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, [isAuthenticated]);

  const handleNav = useCallback(
    async (target: string) => {
      if (!(await tryLeave())) return;
      onClearIntent();
      setDrawerOpen(false);
      navigate(pathForPage(target));
    },
    [navigate, onClearIntent, tryLeave],
  );

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      handleNav(e.detail as string);
    };
    window.addEventListener('navigate', handler as EventListener);
    return () => window.removeEventListener('navigate', handler as EventListener);
  }, [handleNav]);

  const user = isAuthenticated
    ? (() => {
        try {
          return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
          return {};
        }
      })()
    : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white z-30 sticky top-0">
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded hover:bg-slate-800"
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <div className="space-y-1">
                <span className="block h-0.5 w-5 bg-white" />
                <span className="block h-0.5 w-5 bg-white" />
                <span className="block h-0.5 w-5 bg-white" />
              </div>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-lg">🏗️</span>
            <span className="font-bold tracking-wide text-sm sm:text-base">Construction ERP</span>
          </div>
        </div>
        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <GlobalSearch />
            <NotificationCenter />
            <button
              onClick={() => handleNav('profile')}
              className="flex items-center gap-2 hover:bg-slate-700 px-2 py-1.5 rounded-lg transition-colors"
              title="My Profile"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((p: string) => p[0]?.toUpperCase() ?? '')
                      .slice(0, 2)
                      .join('')
                  : '?'}
              </div>
              {user?.name && (
                <span className="text-sm text-slate-300 hidden sm:block max-w-[120px] truncate">
                  {user.name}
                </span>
              )}
            </button>
            <button
              onClick={onLogout}
              className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {isAuthenticated && (
          <>
            <aside
              className={`fixed inset-y-0 left-0 z-20 w-60 transform bg-white border-r border-slate-200 overflow-y-auto transition-transform duration-200 md:static md:translate-x-0 pt-16 md:pt-0 ${
                drawerOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0'
              }`}
            >
              <nav className="p-3 space-y-4">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.label}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            activePage === item.id
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                          onClick={() => handleNav(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>

            {drawerOpen && (
              <div
                className="fixed inset-0 bg-black/40 z-10 md:hidden"
                onClick={() => setDrawerOpen(false)}
              />
            )}
          </>
        )}

        <main className="flex-1 p-4 overflow-auto max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProjectsRoute({
  setNavIntent,
}: {
  setNavIntent: (v: NavIntent) => void;
}) {
  const navigate = useNavigate();
  const { tryLeave } = useUnsavedGuard();

  return (
    <ProjectsPage
      onSelectProject={async (id) => {
        if (!(await tryLeave())) return;
        setNavIntent(null);
        navigate(`/projects/${id}`);
      }}
      onQuickAction={async (projectId, action) => {
        if (!(await tryLeave())) return;
        setNavIntent({ projectId, action });
        if (action === 'update-stage' || action === 'sell-project') {
          navigate(`/projects/${projectId}?tab=construction`);
          return;
        }
        if (action === 'view-activity') {
          navigate(`/projects/${projectId}?tab=activity`);
          return;
        }
        if (action === 'issue-material' || action === 'purchase-material') {
          navigate('/inventory');
          return;
        }
        if (action === 'add-labour') {
          navigate('/labour');
          return;
        }
        if (action === 'record-sale') {
          navigate('/sales');
          return;
        }
        if (action === 'view-profit') navigate('/reports');
      }}
    />
  );
}

function ProjectDetailRoute({
  navIntent,
  clearNavIntent,
}: {
  navIntent: NavIntent;
  clearNavIntent: () => void;
}) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { tryLeave } = useUnsavedGuard();
  if (!projectId) return <Navigate to="/projects" replace />;
  return (
    <ProjectDetailPage
      projectId={projectId}
      backLabel={backLabel('Projects')}
      onBack={async () => {
        if (!(await tryLeave())) return;
        clearNavIntent();
        navigate(popSmartBack('/projects'));
      }}
      initialIntent={navIntent}
      onIntentConsumed={clearNavIntent}
    />
  );
}

function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [navIntent, setNavIntent] = useState<NavIntent>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      const full = location.pathname + location.search;
      if (full && full !== '/login') sessionStorage.setItem('erp.returnTo', full);
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [navigate, location.pathname, location.search]);

  const clearNavIntent = () => setNavIntent(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setNavIntent(null);
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onAuthed={() => setIsAuthenticated(true)} />
          )
        }
      />
      <Route
        element={
          <RequireAuth isAuthenticated={isAuthenticated}>
            <AppShell
              isAuthenticated={isAuthenticated}
              onLogout={handleLogout}
              onClearIntent={clearNavIntent}
            />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsRoute setNavIntent={setNavIntent} />} />
        <Route
          path="/projects/:projectId"
          element={
            <ProjectDetailRoute navIntent={navIntent} clearNavIntent={clearNavIntent} />
          }
        />
        <Route path="/land" element={<LandPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route
          path="/labour"
          element={<LabourPage initialIntent={navIntent} onIntentConsumed={clearNavIntent} />}
        />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/cashflow" element={<CashflowPage />} />
        <Route path="/procurement" element={<ProcurementPage />} />
        <Route path="/funds" element={<FundsPage />} />
        <Route
          path="/sales"
          element={<SalesPage initialIntent={navIntent} onIntentConsumed={clearNavIntent} />}
        />
        <Route path="/accounting" element={<AccountingPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route
          path="/reports"
          element={<ReportsPage initialIntent={navIntent} onIntentConsumed={clearNavIntent} />}
        />
        <Route
          path="/inventory"
          element={<InventoryPage initialIntent={navIntent} onIntentConsumed={clearNavIntent} />}
        />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ShortcutsProvider>
        <AppRoutes />
      </ShortcutsProvider>
    </HashRouter>
  );
}
