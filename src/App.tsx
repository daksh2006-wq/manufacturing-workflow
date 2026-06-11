import { supabase } from './utils/supabase'
import { useEffect, useState } from 'react';
import { initStore, store } from './store';
import { Company, Entry, PartDef, User, Role } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EntriesPage from './components/EntriesPage';
import StockPage from './components/StockPage';
import SummaryPage from './components/SummaryPage';
import CompaniesPage from './components/CompaniesPage';
import PartsPage from './components/PartsPage';
import UsersPage from './components/UsersPage';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [page, setPage] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [parts, setParts] = useState<PartDef[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
  async function loadData() {
    initStore();

    const { data: usersData } = await supabase.from('users').select('*');
if (usersData) {
  setUsers(usersData.map((u: any) => ({
    username: u.username,
    password: u.password,
    role: u.role,
    name: u.name,
  })));
}
    setParts(store.getParts());
    setEntries(store.getEntries());

    const s = store.getSession();
    if (s) setCurrentUser(s.username);

    const { data, error } = await supabase
      .from('companies')
      .select('*');

    console.log('LOAD COMPANIES:', data);
    console.log('LOAD ERROR:', error);

    if (data) {
      setCompanies(data as Company[]);
    }
    const { data: partsData, error: partsError } = await supabase
  .from('parts')
  .select('*');

console.log('LOAD PARTS:', partsData);
console.log('LOAD PARTS ERROR:', partsError);

if (partsData) {
  setParts(
    partsData.map((p: any) => ({
      id: p.id,
      name: p.name,
      modelNo: p.model_no || '',
      subParts: p.sub_parts || [],
    }))
  );
}
const { data: entriesData, error: entriesError } = await supabase
  .from('entries')
  .select('*');

console.log('LOAD ENTRIES:', entriesData);
console.log('LOAD ENTRIES ERROR:', entriesError);

if (entriesData) {
  setEntries(
    entriesData.map((e: any) => ({
      id: e.id,
      challanNo: e.challan_no,
      date: e.date,
      companyId: e.company_id,
      part: e.part,
      subPart: e.sub_part,
      quantity: e.quantity,
      mfFault: e.mf_fault,
      cfFault: e.cf_fault,
      direction: e.direction,
      workflow: e.workflow,
      createdAt: e.created_at,
      createdBy: e.created_by,
    }))
  );
}
    setBooted(true);
  }

  loadData();
  

}, []);

  useEffect(() => { if (booted) store.setUsers(users); }, [users, booted]);
  useEffect(() => { if (booted) store.setCompanies(companies); }, [companies, booted]);
  useEffect(() => { if (booted) store.setParts(parts); }, [parts, booted]);
  useEffect(() => { if (booted) store.setEntries(entries); }, [entries, booted]);

  if (!booted) return null;

  if (!currentUser) {
    return <Login onLogin={(u) => { setCurrentUser(u); setUsers(store.getUsers()); }} />;
  }

  const user = users.find(u => u.username === currentUser) || users[0];
  const role: Role = user?.role || 'operator';

  const handleLogout = () => {
    store.setSession(null);
    setCurrentUser(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar current={page} onNavigate={setPage} role={role} username={user?.name || currentUser} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="text-sm text-slate-500">
            <span className="text-slate-400">JobWork Pro</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700 font-medium capitalize">{page.replace(/-/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden md:inline text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{role}</span>
          </div>
        </header>
        <div className="p-6">
          {page === 'dashboard' && <Dashboard entries={entries} companies={companies} parts={parts} />}
          {page === 'entries-jw-in' && <EntriesPage entries={entries} setEntries={setEntries} companies={companies} parts={parts} workflow="jobwork_in" title="Job Work (Customer)" role={role} currentUser={currentUser} />}
          {page === 'entries-jw-out' && <EntriesPage entries={entries} setEntries={setEntries} companies={companies} parts={parts} workflow="jobwork_out" title="Job Work (Vendor)" role={role} currentUser={currentUser} />}
          {page === 'entries-stock' && <EntriesPage entries={entries} setEntries={setEntries} companies={companies} parts={parts} workflow="stock_sale" title="Stock / Sale" role={role} currentUser={currentUser} />}
          {page === 'stock' && <StockPage entries={entries} parts={parts} />}
          {page === 'summary' && <SummaryPage entries={entries} companies={companies} />}
          {page === 'companies' && role === 'admin' && <CompaniesPage companies={companies} setCompanies={setCompanies} />}
          {page === 'parts' && role === 'admin' && <PartsPage parts={parts} setParts={setParts} />}
          {page === 'users' && role === 'admin' && <UsersPage users={users} setUsers={setUsers} currentUser={currentUser} />}
        </div>
      </main>
    </div>
  );
}
