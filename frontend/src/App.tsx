import { useState, useEffect } from 'react'
import { login as apiLogin } from './api/client'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import DashboardPage from './pages/DashboardPage'
import SuppliersPage from './pages/SuppliersPage'
import LabourPage from './pages/LabourPage'
import ExpensesPage from './pages/ExpensesPage'
import CashflowPage from './pages/CashflowPage'
import ProcurementPage from './pages/ProcurementPage'
import FundsPage from './pages/FundsPage'
import SalesPage from './pages/SalesPage'
import AccountingPage from './pages/AccountingPage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import InventoryPage from './pages/InventoryPage'
import TemplatesPage from './pages/TemplatesPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import GuidePage from './pages/GuidePage'

type Page =
  | 'login' | 'dashboard' | 'projects' | 'project-detail'
  | 'suppliers' | 'labour' | 'expenses' | 'cashflow'
  | 'procurement' | 'funds' | 'sales' | 'accounting'
  | 'users' | 'reports' | 'inventory' | 'templates' | 'profile' | 'settings' | 'guide'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: '🏠 Dashboard' },
      { id: 'reports', label: '📊 Reports' },
      { id: 'cashflow', label: '💰 Cash Flow' },
    ]
  },
  {
    label: 'Projects',
    items: [
      { id: 'projects', label: '🏗️ Projects' },
      { id: 'expenses', label: '💸 Expenses' },
      { id: 'labour', label: '👷 Labour' },
      { id: 'procurement', label: '📋 Procurement' },
      { id: 'inventory', label: '🏭 Inventory' },
    ]
  },
  {
    label: 'Business',
    items: [
      { id: 'suppliers', label: '🏢 Suppliers' },
      { id: 'funds', label: '💼 Funds' },
      { id: 'sales', label: '🏠 Sales' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'accounting', label: '📒 Accounting' },
    ]
  },
  {
    label: 'Admin',
    items: [
      { id: 'users', label: '👥 Users' },
      { id: 'templates', label: '🖨️ Site Templates' },
      { id: 'settings', label: '⚙️ Settings' },
    ]
  },
  {
    label: 'Help',
    items: [
      { id: 'guide', label: '📖 How to Use' },
    ]
  },
]

function App() {
  const [page, setPage] = useState<Page>('login')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    const hasToken = !!localStorage.getItem('token')
    setIsAuthenticated(hasToken)
    setPage(hasToken ? 'dashboard' : 'login')
  }, [])

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      handleNav(e.detail as Page)
    }
    window.addEventListener('navigate', handler as EventListener)
    return () => window.removeEventListener('navigate', handler as EventListener)
  }, [])

  const handleNav = (target: Page) => {
    setPage(target)
    setDrawerOpen(false)
    setError('')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setPage('login')
    setEmail('')
    setPassword('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiLogin(email, password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setIsAuthenticated(true)
      setPage('dashboard')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    setPage('project-detail')
  }

  const user = isAuthenticated ? (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })() : null

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white z-30 sticky top-0">
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded hover:bg-slate-800"
              onClick={() => setDrawerOpen(v => !v)}
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
            <button
              onClick={() => handleNav('profile')}
              className="flex items-center gap-2 hover:bg-slate-700 px-2 py-1.5 rounded-lg transition-colors"
              title="My Profile"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
                {user?.name ? user.name.split(' ').map((p: string) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('') : '?'}
              </div>
              {user?.name && <span className="text-sm text-slate-300 hidden sm:block max-w-[120px] truncate">{user.name}</span>}
            </button>
            <button onClick={handleLogout} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        {isAuthenticated && (
          <>
            <aside
              className={`fixed inset-y-0 left-0 z-20 w-60 transform bg-white border-r border-slate-200 overflow-y-auto transition-transform duration-200 md:static md:translate-x-0 pt-16 md:pt-0 ${
                drawerOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0'
              }`}
            >
              <nav className="p-3 space-y-4">
                {NAV_SECTIONS.map(section => (
                  <div key={section.label}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">{section.label}</p>
                    <div className="space-y-0.5">
                      {section.items.map(item => (
                        <button
                          key={item.id}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            page === item.id
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                          onClick={() => handleNav(item.id as Page)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>

            {/* Mobile overlay */}
            {drawerOpen && (
              <div
                className="fixed inset-0 bg-black/40 z-10 md:hidden"
                onClick={() => setDrawerOpen(false)}
              />
            )}
          </>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 overflow-auto max-w-full">
          {page === 'login' && (
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
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@example.com" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••" required
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full rounded-lg bg-blue-600 text-white py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              <p className="text-xs text-center text-gray-400">Default: admin@example.com / Admin@123</p>
            </section>
          )}

          {page === 'dashboard' && <DashboardPage />}
          {page === 'projects' && <ProjectsPage onSelectProject={handleSelectProject} />}
          {page === 'project-detail' && selectedProjectId && (
            <ProjectDetailPage projectId={selectedProjectId} onBack={() => setPage('projects')} />
          )}
          {page === 'suppliers' && <SuppliersPage />}
          {page === 'labour' && <LabourPage />}
          {page === 'expenses' && <ExpensesPage />}
          {page === 'cashflow' && <CashflowPage />}
          {page === 'procurement' && <ProcurementPage />}
          {page === 'funds' && <FundsPage />}
          {page === 'sales' && <SalesPage />}
          {page === 'accounting' && <AccountingPage />}
          {page === 'users' && <UsersPage />}
          {page === 'reports' && <ReportsPage />}
          {page === 'inventory' && <InventoryPage />}
          {page === 'templates' && <TemplatesPage />}
          {page === 'profile' && <ProfilePage />}
          {page === 'settings' && <SettingsPage />}
          {page === 'guide' && <GuidePage />}
        </main>
      </div>
    </div>
  )
}

export default App
