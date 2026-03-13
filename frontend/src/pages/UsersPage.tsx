import { useEffect, useState } from 'react';
import { getUsers, getRoles, createUser, updateUser, deactivateUser } from '../api/users';
import type { User, Role } from '../api/users';
import Modal from '../components/Modal';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '', is_active: true });

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([getUsers(), getRoles()]);
      setUsers(u); setRoles(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role_id: roles[0]?.id ?? '', is_active: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role_id: u.role_id, is_active: u.is_active });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role_id) { setError('Name, email, and role are required'); return; }
    if (!editing && !form.password) { setError('Password is required for new users'); return; }
    setError('');
    try {
      if (editing) {
        const dto: any = { name: form.name, email: form.email, role_id: form.role_id, is_active: form.is_active };
        if (form.password) dto.password = form.password;
        await updateUser(editing.id, dto);
      } else {
        await createUser({ name: form.name, email: form.email, password: form.password, role_id: form.role_id });
      }
      setShowModal(false);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeactivate = async (u: User) => {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    await deactivateUser(u.id);
    load();
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.role?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_COLORS: Record<string, string> = {
    'Admin': 'bg-red-100 text-red-700',
    'Owner / Director': 'bg-purple-100 text-purple-700',
    'Project Manager': 'bg-blue-100 text-blue-700',
    'Site Engineer': 'bg-green-100 text-green-700',
    'Accountant': 'bg-yellow-100 text-yellow-700',
    'Sales Manager': 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500">{users.length} total users · {users.filter(u => u.is_active).length} active</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add User
        </button>
      </div>

      <input type="text" placeholder="Search users by name, email or role..." value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No users found.</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className={`border-t hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role?.name ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
                        {u.role?.name ?? 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      {u.is_active && u.email !== 'admin@example.com' && (
                        <button onClick={() => handleDeactivate(u)} className="text-red-500 hover:underline text-xs">Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles reference */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">Available Roles ({roles.length})</h2>
        <div className="flex flex-wrap gap-2">
          {roles.map(r => (
            <div key={r.id} className="border rounded-lg px-3 py-1.5 text-xs">
              <span className="font-medium">{r.name}</span>
              {r.description && <span className="text-gray-500 ml-1">— {r.description}</span>}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Add New User'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editing ? 'New Password (leave blank to keep)' : 'Password *'}
              </label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editing ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">-- Select Role --</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <label htmlFor="is_active" className="text-sm text-gray-700">Account Active</label>
              </div>
            )}
            <button onClick={handleSave}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              {editing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
