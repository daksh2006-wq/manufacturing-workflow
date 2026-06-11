import { supabase } from '../utils/supabase';
import { useState } from 'react';
import { Company } from '../types';
import { uid } from '../store';

interface Props {
  companies: Company[];
  setCompanies: (c: Company[]) => void;
}

export default function CompaniesPage({ companies, setCompanies }: Props) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Company['type']>('all');

  const filtered = companies.filter(c => filter === 'all' || c.type === filter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.contact || '').includes(search));

  const onDelete = async (id: string) => {
  if (!confirm('Delete this company?')) return;

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  console.log('DELETE ERROR:', error);

  if (!error) {
    setCompanies(companies.filter(c => c.id !== id));
  }
};

const onSubmit = async (data: Omit<Company, 'id'> & { id?: string }) => {
  if (data.id) {
    const updatedCompany: Company = {
      ...data,
      id: data.id,
    };

    const { error } = await supabase
      .from('companies')
      .update({
        name: updatedCompany.name,
        type: updatedCompany.type,
        contact: updatedCompany.contact,
        email: updatedCompany.email,
        address: updatedCompany.address,
      })
      .eq('id', data.id);

    console.log('UPDATE ERROR:', error);

    if (!error) {
      setCompanies(
        companies.map(c =>
          c.id === data.id ? updatedCompany : c
        )
      );
    }
  } else {
    const newCompany: Company = {
      ...data,
      id: uid(),
    };

    const { error } = await supabase
      .from('companies')
      .insert([newCompany]);

    console.log('INSERT ERROR:', error);

    if (!error) {
      setCompanies([newCompany, ...companies]);
    }
  }

  setShow(false);
  setEditing(null);
};

  const typeLabel: Record<Company['type'], string> = { customer: 'Customer', vendor: 'Vendor', supplier: 'Supplier' };
  const typeColor: Record<Company['type'], string> = { customer: 'bg-sky-100 text-sky-700', vendor: 'bg-violet-100 text-violet-700', supplier: 'bg-teal-100 text-teal-700' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
          <p className="text-slate-500 text-sm mt-1">Manage customers, vendors and suppliers</p>
        </div>
        <button onClick={() => { setEditing(null); setShow(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">+ New Company</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name or contact..."
            className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Types</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="supplier">Supplier</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Contact</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Address</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-10">No companies.</td></tr>}
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-medium px-2 py-1 rounded ${typeColor[c.type]}`}>{typeLabel[c.type]}</span></td>
                  <td className="px-5 py-3 text-slate-700">{c.contact || '—'}</td>
                  <td className="px-5 py-3 text-slate-700">{c.email || '—'}</td>
                  <td className="px-5 py-3 text-slate-700">{c.address || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => { setEditing(c); setShow(true); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">Edit</button>
                    <button onClick={() => onDelete(c.id)} className="text-rose-600 hover:text-rose-800 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {show && <CompanyForm onClose={() => { setShow(false); setEditing(null); }} onSubmit={onSubmit} editing={editing} />}
    </div>
  );
}

function CompanyForm({ onClose, onSubmit, editing }: { onClose: () => void; onSubmit: (d: any) => void; editing: Company | null }) {
  const [f, setF] = useState({ name: editing?.name || '', type: editing?.type || 'customer', contact: editing?.contact || '', email: editing?.email || '', address: editing?.address || '' });
  const update = (k: string, v: any) => setF({ ...f, [k]: v });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name) return alert('Name is required');
    onSubmit({ ...f, id: editing?.id });
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{editing ? 'Edit Company' : 'New Company'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Name *</span>
            <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.name} onChange={e => update('name', e.target.value)} required />
          </label>
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Type *</span>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.type} onChange={e => update('type', e.target.value)}>
              <option value="customer">Customer (we do job work for them)</option>
              <option value="vendor">Vendor (does job work for us)</option>
              <option value="supplier">Supplier (supplies raw material)</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Contact</span>
              <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.contact} onChange={e => update('contact', e.target.value)} />
            </label>
            <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Email</span>
              <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={f.email} onChange={e => update('email', e.target.value)} />
            </label>
          </div>
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Address</span>
            <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[70px]" value={f.address} onChange={e => update('address', e.target.value)} />
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
