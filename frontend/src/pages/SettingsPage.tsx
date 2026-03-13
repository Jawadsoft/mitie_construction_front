import { useState } from 'react';
import { getAuthHeaders } from '../api/client';

type ResetMode = 'transactions' | 'full';

interface ResetOption {
  mode: ResetMode;
  title: string;
  description: string;
  keeps: string[];
  clears: string[];
  color: 'orange' | 'red';
}

const RESET_OPTIONS: ResetOption[] = [
  {
    mode: 'transactions',
    title: 'Reset Transaction Data',
    description: 'Clears all financial & operational records. Keeps your projects, suppliers, customers, material catalog and user accounts intact.',
    keeps: [
      'Users & roles',
      'Projects & stages structure',
      'Suppliers & labour contractors',
      'Customers & property units',
      'Material catalog',
      'Fund sources & chart of accounts',
    ],
    clears: [
      'Expenses',
      'Labour attendance, payments & advances',
      'Purchase orders & receipts',
      'Stock ledger & material issues',
      'Cash transactions',
      'Fund transactions',
      'Sales & installments',
      'Journal entries',
      'Stage budgets & progress logs',
      'Activity logs',
    ],
    color: 'orange',
  },
  {
    mode: 'full',
    title: 'Full System Reset',
    description: 'Wipes everything except user accounts and the material catalog. Use this for a completely fresh start.',
    keeps: [
      'Users & roles',
      'Material catalog (predefined items)',
    ],
    clears: [
      'All transaction data (see above)',
      'Projects, stages & budgets',
      'Suppliers',
      'Labour contractors',
      'Customers & property units',
      'Fund sources',
      'Chart of accounts',
    ],
    color: 'red',
  },
];

async function callReset(mode: ResetMode): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/settings/reset', {
    method: 'POST',
    headers: getAuthHeaders() as Record<string, string>,
    body: JSON.stringify({ mode, confirm: 'RESET' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Reset failed');
  return data;
}

export default function SettingsPage() {
  const [selected, setSelected] = useState<ResetMode | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expanded, setExpanded] = useState<ResetMode | null>(null);

  const selectedOption = RESET_OPTIONS.find(o => o.mode === selected) ?? null;
  const canConfirm = confirmText === 'RESET' && selected !== null;

  const handleReset = async () => {
    if (!selected || !canConfirm) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await callReset(selected);
      setResult(res);
      setSelected(null);
      setConfirmText('');
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setSelected(null);
    setConfirmText('');
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage system configuration and data.</p>
      </div>

      {result && (
        <div
          className={`rounded-xl px-5 py-4 border text-sm font-medium ${
            result.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {result.success ? '✓ ' : '✗ '}{result.message}
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-red-100">
        <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h2 className="text-sm font-bold text-red-900">Danger Zone</h2>
            <p className="text-xs text-red-600 mt-0.5">These actions are irreversible. Make sure you have a backup before proceeding.</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {RESET_OPTIONS.map(opt => (
            <div key={opt.mode} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${opt.color === 'red' ? 'text-red-700' : 'text-orange-700'}`}>
                    {opt.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{opt.description}</p>
                  <button
                    onClick={() => setExpanded(expanded === opt.mode ? null : opt.mode)}
                    className="text-xs text-blue-600 hover:underline mt-2"
                  >
                    {expanded === opt.mode ? 'Hide details ▲' : 'Show details ▼'}
                  </button>
                  {expanded === opt.mode && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-1">✓ Keeps</p>
                        <ul className="space-y-0.5">
                          {opt.keeps.map(k => (
                            <li key={k} className="text-xs text-slate-600">• {k}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-600 mb-1">✗ Clears</p>
                        <ul className="space-y-0.5">
                          {opt.clears.map(c => (
                            <li key={c} className="text-xs text-slate-600">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setSelected(opt.mode); setConfirmText(''); setResult(null); }}
                  className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-lg border transition-colors ${
                    opt.color === 'red'
                      ? 'border-red-300 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600'
                      : 'border-orange-300 text-orange-700 hover:bg-orange-500 hover:text-white hover:border-orange-500'
                  }`}
                >
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation dialog */}
      {selected && selectedOption && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`px-6 py-4 ${selectedOption.color === 'red' ? 'bg-red-600' : 'bg-orange-500'}`}>
              <h2 className="text-white font-bold text-base">Confirm: {selectedOption.title}</h2>
              <p className="text-white/80 text-xs mt-1">This cannot be undone.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-700">
                You are about to permanently delete data. Type{' '}
                <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">RESET</span>{' '}
                in the box below to confirm.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Type RESET to confirm"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={cancel}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={!canConfirm || loading}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-colors ${
                    selectedOption.color === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {loading ? 'Resetting…' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
