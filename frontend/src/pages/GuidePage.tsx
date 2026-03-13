const PHASES = [
  {
    phase: '01',
    title: 'Create the Project',
    color: 'blue',
    icon: '🏗️',
    page: 'projects',
    pageLabel: 'Projects',
    steps: [
      { label: 'Go to Projects → + New Project' },
      { label: 'Enter name, location, plot size, project type' },
      { label: 'Set total estimated budget & start date' },
      { label: 'Status: Planning' },
    ],
    tip: 'One project = one plot. For multiple plots, create separate projects.',
  },
  {
    phase: '02',
    title: 'Set Up Fund Sources',
    color: 'indigo',
    icon: '💼',
    page: 'funds',
    pageLabel: 'Fund Management',
    steps: [
      { label: 'Go to Fund Management → + Add Source' },
      { label: 'Add each investor/source (Equity, Loan, Partner, etc.)' },
      { label: 'Set total committed amount per source' },
      { label: 'Record Receipt each time money is actually received' },
    ],
    tip: 'Fund receipts update "Total Received" which you can compare against expenses.',
  },
  {
    phase: '03',
    title: 'Record Plot Purchase',
    color: 'amber',
    icon: '📜',
    page: 'expenses',
    pageLabel: 'Expenses',
    steps: [
      { label: 'Go to Expenses → + Add Expense' },
      { label: 'Category: Land Purchase' },
      { label: 'Select your project & "Land Purchase" stage' },
      { label: 'Enter the plot cost, date, and description' },
      { label: 'Also log stamp duty & registry fees separately' },
    ],
    tip: 'If you bought through a broker, add them as a Supplier first and raise a Purchase Order instead.',
  },
  {
    phase: '04',
    title: 'Add Construction Stages',
    color: 'violet',
    icon: '🪜',
    page: 'projects',
    pageLabel: 'Project Detail',
    steps: [
      { label: 'Open the project → Stages tab' },
      { label: 'Add each stage with its budget' },
      { label: 'Example: Foundation, Structure, Masonry, Plumbing, Electrical, Plaster, Flooring, Finishing' },
      { label: 'Update % complete as work progresses' },
    ],
    tip: 'Budgets per stage let you track where money is being spent vs planned.',
    stageList: [
      'Design & Approvals', 'Excavation', 'Foundation', 'Structure / Grey Work',
      'Masonry', 'Plumbing', 'Electrical', 'Plaster', 'Flooring',
      'Fixtures & Finishing', 'External Works', 'Ready for Sale',
    ],
  },
  {
    phase: '05',
    title: 'Add Suppliers & Buy Materials',
    color: 'cyan',
    icon: '🧱',
    page: 'suppliers',
    pageLabel: 'Suppliers',
    steps: [
      { label: 'Suppliers → + Add Supplier (cement, steel, tiles vendors)' },
      { label: 'Procurement → + New PO (Purchase Order for each material order)' },
      { label: 'When materials arrive → Mark Received in the PO' },
      { label: 'Inventory is updated automatically' },
    ],
    tip: 'Every Purchase Order is linked to a project and tracks payment status to the supplier.',
  },
  {
    phase: '06',
    title: 'Manage Labour & Contractors',
    color: 'orange',
    icon: '👷',
    page: 'labour',
    pageLabel: 'Labour',
    steps: [
      { label: 'Labour → + Add Contractor (mason, electrician, plumber)' },
      { label: 'Record daily attendance per contractor' },
      { label: 'Process weekly/monthly wage payments' },
      { label: 'Track advance payments given' },
    ],
    tip: 'Labour costs are linked to stages so you see total cost per construction stage.',
  },
  {
    phase: '07',
    title: 'Track All Other Expenses',
    color: 'rose',
    icon: '💸',
    page: 'expenses',
    pageLabel: 'Expenses',
    steps: [
      { label: 'Fuel, transport, equipment rent → Expenses' },
      { label: 'Government fees, approvals → Expenses' },
      { label: 'Always link expense to a Project & Stage' },
      { label: 'Cashflow page shows running balance automatically' },
    ],
    tip: 'Every expense reduces your cash balance. Cashflow page shows daily inflow/outflow.',
  },
  {
    phase: '08',
    title: 'Add Property Units for Sale',
    color: 'teal',
    icon: '🏠',
    page: 'sales',
    pageLabel: 'Sales',
    steps: [
      { label: 'Sales → Property Units tab → + Add Unit' },
      { label: 'Select the project, set unit type (house/apartment/plot)' },
      { label: 'Enter area (marla/sqft) and asking sale price' },
      { label: 'Status: Available — until a buyer is found' },
    ],
    tip: 'You can add units during construction — no need to wait until it is complete.',
  },
  {
    phase: '09',
    title: 'Record Sales & Installments',
    color: 'green',
    icon: '🤝',
    page: 'sales',
    pageLabel: 'Sales',
    steps: [
      { label: 'Sales → Customers tab → + Add Customer' },
      { label: 'Sales → + New Sale → select unit and customer' },
      { label: 'Enter token amount and full sale price' },
      { label: 'Add installment schedule (monthly / quarterly)' },
      { label: 'Record each payment received — tracks receivables' },
    ],
    tip: 'Unit status changes to Sold automatically once a sale is recorded.',
  },
  {
    phase: '10',
    title: 'View Profit & Reports',
    color: 'emerald',
    icon: '📊',
    page: 'reports',
    pageLabel: 'Reports',
    steps: [
      { label: 'Dashboard shows real-time budget vs actual' },
      { label: 'Reports → Project Profitability' },
      { label: 'Profit = Revenue − Land − Construction − Labour − Expenses' },
      { label: 'Cashflow shows total money in vs out' },
    ],
    tip: 'Profit is calculated automatically once sales and costs are recorded.',
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; icon: string; connector: string; tip: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-600',    icon: 'bg-blue-100 text-blue-700',    connector: 'bg-blue-300',   tip: 'bg-blue-50 text-blue-700 border-blue-200' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200', badge: 'bg-indigo-600',  icon: 'bg-indigo-100 text-indigo-700',connector: 'bg-indigo-300', tip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-500',   icon: 'bg-amber-100 text-amber-700',  connector: 'bg-amber-300',  tip: 'bg-amber-50 text-amber-700 border-amber-200' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200', badge: 'bg-violet-600',  icon: 'bg-violet-100 text-violet-700',connector: 'bg-violet-300', tip: 'bg-violet-50 text-violet-700 border-violet-200' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',   badge: 'bg-cyan-600',    icon: 'bg-cyan-100 text-cyan-700',    connector: 'bg-cyan-300',   tip: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200', badge: 'bg-orange-500',  icon: 'bg-orange-100 text-orange-700',connector: 'bg-orange-300', tip: 'bg-orange-50 text-orange-700 border-orange-200' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',   badge: 'bg-rose-600',    icon: 'bg-rose-100 text-rose-700',    connector: 'bg-rose-300',   tip: 'bg-rose-50 text-rose-700 border-rose-200' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',   badge: 'bg-teal-600',    icon: 'bg-teal-100 text-teal-700',    connector: 'bg-teal-300',   tip: 'bg-teal-50 text-teal-700 border-teal-200' },
  green:   { bg: 'bg-green-50',   border: 'border-green-200',  badge: 'bg-green-600',   icon: 'bg-green-100 text-green-700',  connector: 'bg-green-300',  tip: 'bg-green-50 text-green-700 border-green-200' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200',badge: 'bg-emerald-600', icon: 'bg-emerald-100 text-emerald-700',connector:'bg-emerald-300',tip:'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function navigate(page: string) {
  window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
}

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-2">

      {/* Header */}
      <div className="text-center py-8 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-3xl mb-4">🏗️</div>
        <h1 className="text-3xl font-bold text-gray-900">How to Use This System</h1>
        <p className="text-gray-500 mt-2 text-base max-w-xl mx-auto">
          Complete workflow — from buying a plot to selling the finished property and calculating profit.
        </p>
        {/* Mini flow overview */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium">
          {PHASES.map((p, i) => (
            <span key={p.phase} className="flex items-center gap-1">
              <span className={`px-2 py-1 rounded-full text-white ${COLOR_MAP[p.color].badge}`}>{p.icon} {p.title}</span>
              {i < PHASES.length - 1 && <span className="text-gray-400">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Phase cards */}
      {PHASES.map((phase, idx) => {
        const c = COLOR_MAP[phase.color];
        return (
          <div key={phase.phase} className="relative">
            {/* Connector line */}
            {idx < PHASES.length - 1 && (
              <div className={`absolute left-8 bottom-0 w-0.5 h-3 ${c.connector} z-10`} style={{ top: '100%' }} />
            )}

            <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
              <div className="flex items-start gap-4 p-5">
                {/* Phase number + icon */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.icon}`}>
                    {phase.icon}
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${c.badge}`}>
                    {phase.phase}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="text-base font-bold text-gray-900">{phase.title}</h2>
                    <button
                      onClick={() => navigate(phase.page)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg text-white ${c.badge} hover:opacity-90 transition-opacity shrink-0`}
                    >
                      Open {phase.pageLabel} →
                    </button>
                  </div>

                  {/* Steps */}
                  <ol className="space-y-1.5 mb-3">
                    {phase.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${c.badge}`}>
                          {i + 1}
                        </span>
                        {step.label}
                      </li>
                    ))}
                  </ol>

                  {/* Stage list (for phase 04) */}
                  {phase.stageList && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {phase.stageList.map(s => (
                        <span key={s} className="text-xs bg-white border border-violet-200 text-violet-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}

                  {/* Tip */}
                  <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${c.tip}`}>
                    <span className="shrink-0">💡</span>
                    <span>{phase.tip}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Profit formula card */}
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-900 text-white overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📊 Profit Formula</h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between border-b border-emerald-700 pb-2">
              <span className="text-emerald-300">Revenue from Sales</span>
              <span className="text-white font-bold">+ PKR X</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300">− Land / Plot Cost</span>
              <span className="text-red-300">− PKR X</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300">− Material / Procurement Cost</span>
              <span className="text-red-300">− PKR X</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300">− Labour Cost</span>
              <span className="text-red-300">− PKR X</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300">− Overhead Expenses</span>
              <span className="text-red-300">− PKR X</span>
            </div>
            <div className="flex justify-between border-t border-emerald-500 pt-2 text-base">
              <span className="font-bold text-yellow-300">= Net Profit</span>
              <span className="font-bold text-yellow-300">PKR X</span>
            </div>
          </div>
          <p className="text-emerald-400 text-xs mt-4">
            Calculated automatically in Reports → Project Profitability once all costs and sales are recorded.
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Quick Links — Jump to Any Module</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { page: 'projects',    label: '🏗️ Projects' },
            { page: 'funds',       label: '💼 Fund Management' },
            { page: 'expenses',    label: '💸 Expenses' },
            { page: 'suppliers',   label: '🏢 Suppliers' },
            { page: 'procurement', label: '📋 Procurement' },
            { page: 'inventory',   label: '🏭 Inventory' },
            { page: 'labour',      label: '👷 Labour' },
            { page: 'sales',       label: '🏠 Sales' },
            { page: 'cashflow',    label: '💰 Cash Flow' },
            { page: 'accounting',  label: '📒 Accounting' },
            { page: 'reports',     label: '📊 Reports' },
            { page: 'dashboard',   label: '🏠 Dashboard' },
          ].map(link => (
            <button
              key={link.page}
              onClick={() => navigate(link.page)}
              className="text-left text-sm px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors text-gray-700"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
