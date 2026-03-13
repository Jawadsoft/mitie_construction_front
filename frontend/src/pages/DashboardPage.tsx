import { useEffect, useState } from 'react';
import { getDashboardStats } from '../api/cashflow';
import StatCard from '../components/StatCard';

interface Stats {
  cash_balance: number; cash_in: number; cash_out: number;
  active_projects: number; total_budget: number; total_expenses: number;
  total_labour: number; total_cost: number; total_revenue: number;
  collected_revenue: number; pending_receivables: number; supplier_payables: number;
  total_units: number; sold_units: number; avg_stage_completion: number; expected_profit: number;
}

function fmt(n: number) {
  if (Math.abs(n) >= 10_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 100_000) return `PKR ${(n / 1_000).toFixed(0)}K`;
  return `PKR ${n.toLocaleString()}`;
}

function ProgressBar({ value, max, color = 'blue' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const colorClass = color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const navigate = (page: string) => window.dispatchEvent(new CustomEvent('navigate', { detail: page }));

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (error) return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;

  const budgetPct = stats && stats.total_budget > 0 ? Math.round((stats.total_cost / stats.total_budget) * 100) : 0;
  const revenuePct = stats && stats.total_revenue > 0 ? Math.round((stats.collected_revenue / stats.total_revenue) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm">Live overview of your construction business</p>
      </div>

      {/* Row 1 – Cash & Projects */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Cash Balance" value={fmt(stats?.cash_balance ?? 0)} icon="💰" color="green" subtitle={`In: ${fmt(stats?.cash_in ?? 0)} | Out: ${fmt(stats?.cash_out ?? 0)}`} />
        <StatCard title="Active Projects" value={stats?.active_projects ?? 0} icon="🏗️" color="blue" />
        <StatCard title="Pending Receivables" value={fmt(stats?.pending_receivables ?? 0)} icon="⏳" color="yellow" subtitle="Customer payments due" />
        <StatCard title="Supplier Payables" value={fmt(stats?.supplier_payables ?? 0)} icon="🏢" color="red" subtitle="Amount owed to suppliers" />
      </div>

      {/* Row 2 – Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Revenue" value={fmt(stats?.total_revenue ?? 0)} icon="💵" color="green" subtitle={`Collected: ${fmt(stats?.collected_revenue ?? 0)}`} />
        <StatCard title="Total Cost" value={fmt(stats?.total_cost ?? 0)} icon="💸" color="red" subtitle={`Expenses + Labour`} />
        <StatCard title="Expected Profit" value={fmt(stats?.expected_profit ?? 0)} icon="📈" color={((stats?.expected_profit ?? 0) >= 0) ? 'green' : 'red'} />
        <StatCard title="Avg Stage Progress" value={`${Math.round(stats?.avg_stage_completion ?? 0)}%`} icon="🏛️" color="purple" subtitle="Active stages" />
        <StatCard title="Stock Value" value={fmt((stats as any)?.stock_value ?? 0)} icon="🏭" color="indigo" subtitle="Materials in store" />
      </div>

      {/* Row 3 – Progress bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h2 className="font-semibold text-gray-800">Budget Utilization</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Total Cost vs Budget</span><span className="font-medium">{budgetPct}%</span></div>
            <ProgressBar value={stats?.total_cost ?? 0} max={stats?.total_budget ?? 0} color={budgetPct > 90 ? 'red' : budgetPct > 70 ? 'yellow' : 'green'} />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Spent: {fmt(stats?.total_cost ?? 0)}</span>
              <span>Budget: {fmt(stats?.total_budget ?? 0)}</span>
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Revenue Collected</span><span className="font-medium">{revenuePct}%</span></div>
            <ProgressBar value={stats?.collected_revenue ?? 0} max={stats?.total_revenue ?? 0} color="blue" />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Collected: {fmt(stats?.collected_revenue ?? 0)}</span>
              <span>Expected: {fmt(stats?.total_revenue ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h2 className="font-semibold text-gray-800">Property Inventory</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{(stats?.total_units ?? 0) - (stats?.sold_units ?? 0)}</p>
              <p className="text-xs text-green-600 mt-1">Available</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{stats?.sold_units ?? 0}</p>
              <p className="text-xs text-red-600 mt-1">Sold</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{stats?.total_units ?? 0}</p>
              <p className="text-xs text-blue-600 mt-1">Total</p>
            </div>
          </div>
          {(stats?.total_units ?? 0) > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Units Sold</span><span className="font-medium">{stats?.total_units ? Math.round((stats.sold_units / stats.total_units) * 100) : 0}%</span></div>
              <ProgressBar value={stats?.sold_units ?? 0} max={stats?.total_units ?? 0} color="green" />
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Quick Navigation</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {[
            { label: 'Projects', icon: '🏗️', page: 'projects' },
            { label: 'Expenses', icon: '💸', page: 'expenses' },
            { label: 'Labour', icon: '👷', page: 'labour' },
            { label: 'Suppliers', icon: '🏢', page: 'suppliers' },
            { label: 'Procurement', icon: '📋', page: 'procurement' },
            { label: 'Inventory', icon: '🏭', page: 'inventory' },
            { label: 'Cash Flow', icon: '💰', page: 'cashflow' },
            { label: 'Funds', icon: '💼', page: 'funds' },
            { label: 'Sales', icon: '🏠', page: 'sales' },
            { label: 'Accounting', icon: '📒', page: 'accounting' },
            { label: 'Reports', icon: '📊', page: 'reports' },
            { label: 'Users', icon: '👥', page: 'users' },
            { label: 'Templates', icon: '🖨️', page: 'templates' },
          ].map(link => (
            <button key={link.page} onClick={() => navigate(link.page)}
              className="flex flex-col items-center p-3 rounded-xl border hover:bg-blue-50 hover:border-blue-300 transition-colors text-center">
              <span className="text-xl">{link.icon}</span>
              <span className="text-xs font-medium text-gray-700 mt-1">{link.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
