import { Role, WorkflowType } from '../types';

interface Props {
  current: string;
  onNavigate: (page: string) => void;
  role: Role;
  username: string;
  onLogout: () => void;
}

const menu: { key: string; label: string; icon: string; adminOnly?: boolean; workflows?: WorkflowType[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'entries-jw-in', label: 'Job Work (Customer)', icon: '🏭', workflows: ['jobwork_in'] },
  { key: 'entries-jw-out', label: 'Job Work (Vendor)', icon: '🔧', workflows: ['jobwork_out'] },
  { key: 'stock', label: 'Stock & Sale', icon: '📦' },
  { key: 'summary', label: 'Total Summary', icon: '🧾' },
  { key: 'companies', label: 'Companies', icon: '🏢', adminOnly: true },
  { key: 'parts', label: 'Parts & Sub-Parts', icon: '🧩', adminOnly: true },
  { key: 'users', label: 'Users', icon: '👥', adminOnly: true },
];

export default function Sidebar({ current, onNavigate, role, username, onLogout }: Props) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center font-bold">JW</div>
          <div>
            <div className="font-semibold text-white">JobWork Pro</div>
            <div className="text-xs text-slate-400">Workflow Management</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menu.filter(m => !m.adminOnly || role === 'admin').map(m => (
          <button
            key={m.key}
            onClick={() => onNavigate(m.key)}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm transition ${
              current === m.key ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="text-base">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-semibold uppercase">
            {username.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{username}</div>
            <div className="text-xs text-slate-400 capitalize">{role}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full text-sm px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-600 transition text-slate-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
