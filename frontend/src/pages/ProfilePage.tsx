import { useEffect, useState } from 'react';
import { updateUser } from '../api/users';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

function getStoredUser(): UserInfo | null {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(getStoredUser());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) {
      setName(u.name);
      setEmail(u.email);
    }
  }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccess('');
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    setSaving(true);
    try {
      const updated = await updateUser(user.id, { name: name.trim(), email: email.trim() });
      const newUser = { ...user, name: updated.name, email: updated.email };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      setSuccess('Profile updated successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccess('');
    if (!newPassword) { setError('New password is required.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await updateUser(user.id, { password: newPassword });
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto mt-10 text-center text-slate-500">
        <p>No user session found. Please log in again.</p>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map(p => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none">
          {initials || '?'}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{user.name}</h1>
          <p className="text-sm text-slate-500 truncate">{user.email}</p>
          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            {user.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('info'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Personal Info
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'password'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Change Password
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              {success}
            </div>
          )}

          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <input
                  type="text"
                  value={user.role}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-400">Role can only be changed by an Admin.</p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 6 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repeat new password"
                  required
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                You will remain logged in after changing your password.
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Session info card */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Session Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">User ID</span>
            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{user.id}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Assigned Role</span>
            <span className="font-medium text-slate-700">{user.role}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Token stored in</span>
            <span className="text-slate-600">localStorage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
