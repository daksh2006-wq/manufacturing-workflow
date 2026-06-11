import { useState } from 'react';
import { User, Role } from '../types';

interface Props {
  users: User[];
  setUsers: (u: User[]) => void;
  currentUser: string;
}

export default function UsersPage({ users, setUsers, currentUser }: Props) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const onDelete = (username: string) => {
    if (username === currentUser) return alert("You can't delete yourself.");
    if (users.filter(u => u.role === 'admin').length === 1 && users.find(u => u.username === username)?.role === 'admin')
      return alert('At least one admin must remain.');
    if (!confirm('Delete this user?')) return;
    setUsers(users.filter(u => u.username !== username));
  };

  const onSubmit = (data: User & { isNew?: boolean }) => {
    if (!data.username || !data.password || !data.name) return alert('All fields required');
    if (data.isNew) {
      if (users.find(u => u.username === data.username)) return alert('Username already exists');
      setUsers([...users, { username: data.username, password: data.password, role: data.role, name: data.name }]);
    } else {
      setUsers(users.map(u => u.username === data.username ? data : u));
    }
    setShow(false); setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage admin and operator accounts</p>
        </div>
        <button onClick={() => { setEditing(null); setShow(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">+ New User</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Username</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-left px-5 py-3 font-medium">Password</th>
              <th className="text-right px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.username} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">{u.name}{u.username === currentUser && <span className="ml-2 text-xs text-indigo-600">(you)</span>}</td>
                <td className="px-5 py-3 text-slate-700">{u.username}</td>
                <td className="px-5 py-3"><span className={`text-xs font-medium px-2 py-1 rounded ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span></td>
                <td className="px-5 py-3 text-slate-500 font-mono">{'•'.repeat(Math.min(u.password.length, 8))}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => { setEditing(u); setShow(true); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">Edit</button>
                  <button onClick={() => onDelete(u.username)} className="text-rose-600 hover:text-rose-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && <UserForm onClose={() => { setShow(false); setEditing(null); }} onSubmit={onSubmit} editing={editing} />}
    </div>
  );
}

function UserForm({ onClose, onSubmit, editing }: { onClose: () => void; onSubmit: (d: any) => void; editing: User | null }) {
  const [f, setF] = useState<User & { isNew?: boolean }>({
    username: editing?.username || '', password: editing?.password || '', role: editing?.role || 'operator', name: editing?.name || '', isNew: !editing,
  });
  const update = (k: string, v: any) => setF({ ...f, [k]: v });
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(f); };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{editing ? 'Edit User' : 'New User'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Full Name *</span>
            <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.name} onChange={e => update('name', e.target.value)} required />
          </label>
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Username *</span>
            <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.username} onChange={e => update('username', e.target.value)} disabled={!f.isNew} required />
          </label>
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Password *</span>
            <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.password} onChange={e => update('password', e.target.value)} required />
          </label>
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Role</span>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.role} onChange={e => update('role', e.target.value as Role)}>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
            </select>
          </label>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">{editing ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
