import { supabase } from '../utils/supabase';
import { useState, useMemo } from 'react';
import { Company, PartDef, Role } from '../types';
import { uid } from '../store';

interface StockEntry {
  id: string;
  billNo: string;
  date: string;
  companyId: string;
  companyName: string;
  partId: string;
  part: string;
  subPart: string;
  quantity: number;
  direction: 'inward' | 'outward';
  scheduleOrdered: number;
  scheduleReceived: number;
  createdAt: string;
  createdBy: string;
}

interface Props {
  companies: Company[];
  parts: PartDef[];
  role: Role;
  currentUser: string;
}

export default function StockSalePage({ companies, parts, role, currentUser }: Props) {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StockEntry | null>(null);
  const [tab, setTab] = useState<'in' | 'out' | 'summary'>('in');
  const [search, setSearch] = useState('');

  if (!loaded) {
    setLoaded(true);
    supabase.from('stock_entries').select('*').then(({ data }) => {
      if (data) {
        setEntries(data.map((e: any) => ({
          id: e.id,
          billNo: e.bill_no || '',
          date: e.date,
          companyId: e.company_id || '',
          companyName: e.company_name || '',
          partId: e.part_id || '',
          part: e.part || '',
          subPart: e.sub_part || '',
          quantity: e.quantity || 0,
          direction: e.direction,
          scheduleOrdered: e.schedule_ordered || 0,
          scheduleReceived: e.schedule_received || 0,
          createdAt: e.created_at || '',
          createdBy: e.created_by || '',
        })));
      }
    });
  }

  const filtered = useMemo(() => {
    return entries
      .filter(e => tab === 'summary' || e.direction === (tab === 'in' ? 'inward' : 'outward'))
      .filter(e => {
        const q = search.toLowerCase();
        if (!q) return true;
        return e.billNo.toLowerCase().includes(q) || e.part.toLowerCase().includes(q) || e.companyName.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, tab, search]);

  const summary = useMemo(() => {
    const map = new Map<string, { part: string; subPart: string; modelNo: string; inward: number; outward: number }>();
    entries.forEach(e => {
      const key = `${e.partId}|${e.subPart}`;
      const partDef = parts.find(p => p.id === e.partId);
      const existing = map.get(key) || { part: e.part, subPart: e.subPart, modelNo: partDef?.modelNo || '', inward: 0, outward: 0 };
      if (e.direction === 'inward') existing.inward += e.quantity;
      else existing.outward += e.quantity;
      map.set(key, existing);
    });
    return Array.from(map.values()).map(r => ({ ...r, balance: r.inward - r.outward }));
  }, [entries, parts]);

  const onDelete = async (id: string) => {
    if (role !== 'admin') return alert('Only admin can delete');
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('stock_entries').delete().eq('id', id);
    if (!error) setEntries(entries.filter(e => e.id !== id));
  };

  const onSubmit = async (data: Omit<StockEntry, 'id' | 'createdAt' | 'createdBy'> & { id?: string }) => {
    if (data.id) {
      const { error } = await supabase.from('stock_entries').update({
        bill_no: data.billNo,
        date: data.date,
        company_id: data.companyId,
        company_name: data.companyName,
        part_id: data.partId,
        part: data.part,
        sub_part: data.subPart,
        quantity: data.quantity,
        direction: data.direction,
        schedule_ordered: data.scheduleOrdered,
        schedule_received: data.scheduleReceived,
      }).eq('id', data.id);
      if (!error) setEntries(entries.map(e => e.id === data.id ? { ...e, ...data, id: data.id } : e));
    } else {
      const newEntry: StockEntry = {
        ...data, id: uid(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser,
      };
      const { error } = await supabase.from('stock_entries').insert([{
        id: newEntry.id,
        bill_no: newEntry.billNo,
        date: newEntry.date,
        company_id: newEntry.companyId,
        company_name: newEntry.companyName,
        part_id: newEntry.partId,
        part: newEntry.part,
        sub_part: newEntry.subPart,
        quantity: newEntry.quantity,
        direction: newEntry.direction,
        schedule_ordered: newEntry.scheduleOrdered,
        schedule_received: newEntry.scheduleReceived,
        created_at: newEntry.createdAt,
        created_by: newEntry.createdBy,
      }]);
      if (!error) setEntries([newEntry, ...entries]);
    }
    setShowForm(false);
    setEditing(null);
  };

  const totalIn = entries.filter(e => e.direction === 'inward').reduce((s, e) => s + e.quantity, 0);
  const totalOut = entries.filter(e => e.direction === 'outward').reduce((s, e) => s + e.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stock & Sale</h1>
          <p className="text-slate-500 text-sm mt-1">Manage stock purchases and sales with schedule tracking</p>
        </div>
        {tab !== 'summary' && (
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">
            + New Entry
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total Stock In</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{totalIn.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total Stock Out</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{totalOut.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Balance</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{(totalIn - totalOut).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['in', 'out', 'summary'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}>
            {t === 'in' ? 'Stock In' : t === 'out' ? 'Stock Out' : 'Summary'}
          </button>
        ))}
      </div>

      {tab !== 'summary' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search bill no, part, company..."
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      )}

      {tab !== 'summary' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Bill No</th>
                  <th className="text-left px-4 py-3 font-medium">{tab === 'in' ? 'Purchased From' : 'Sold To'}</th>
                  <th className="text-left px-4 py-3 font-medium">Part</th>
                  <th className="text-left px-4 py-3 font-medium">Sub Part</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 font-medium">Ordered</th>
                  <th className="text-right px-4 py-3 font-medium">{tab === 'in' ? 'Received' : 'Sold'}</th>
                  <th className="text-right px-4 py-3 font-medium">Pending</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center text-slate-400 py-10">No entries yet. Click "+ New Entry".</td></tr>
                )}
                {filtered.map(e => {
                  const partDef = parts.find(p => p.id === e.partId);
                  const pending = e.scheduleOrdered - e.scheduleReceived;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{e.billNo || <span className="text-slate-400 italic">Old Stock</span>}</td>
                      <td className="px-4 py-3 text-slate-700">{e.companyName || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {partDef?.name || e.part || '—'}
                        {partDef?.modelNo && <span className="ml-1 text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{partDef.modelNo}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{e.subPart || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{e.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{e.scheduleOrdered || '—'}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{e.scheduleReceived || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {e.scheduleOrdered > 0
                          ? <span className={`font-bold ${pending > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{pending}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => { setEditing(e); setShowForm(true); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">Edit</button>
                        <button onClick={() => onDelete(e.id)} className="text-rose-600 hover:text-rose-800 text-xs font-medium">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Part</th>
                  <th className="text-left px-4 py-3 font-medium">Model No</th>
                  <th className="text-left px-4 py-3 font-medium">Sub Part</th>
                  <th className="text-right px-4 py-3 font-medium">Total In</th>
                  <th className="text-right px-4 py-3 font-medium">Total Out</th>
                  <th className="text-right px-4 py-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-slate-400 py-10">No stock data yet.</td></tr>
                )}
                {summary.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.part || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.modelNo || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.subPart || '—'}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{s.inward}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{s.outward}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold text-base ${s.balance > 0 ? 'text-indigo-600' : s.balance < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {s.balance}
                      </span>
                    </td>
                  </tr>
                ))}
                {summary.length > 0 && (
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-slate-700">Total ({summary.length} items)</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{summary.reduce((s, r) => s + r.inward, 0)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{summary.reduce((s, r) => s + r.outward, 0)}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{summary.reduce((s, r) => s + r.balance, 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <StockEntryForm
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={onSubmit}
          editing={editing}
          companies={companies}
          parts={parts}
          direction={tab === 'in' ? 'inward' : 'outward'}
        />
      )}
    </div>
  );
}

function StockEntryForm({ onClose, onSubmit, editing, companies, parts, direction }: {
  onClose: () => void;
  onSubmit: (d: any) => void;
  editing: StockEntry | null;
  companies: Company[];
  parts: PartDef[];
  direction: 'inward' | 'outward';
}) {
  const [useOldStock, setUseOldStock] = useState(editing ? editing.companyName === 'Old Stock' : false);
  const [form, setForm] = useState({
    billNo: editing?.billNo || '',
    date: editing?.date || new Date().toISOString().slice(0, 10),
    companyId: editing?.companyId || '',
    companyName: editing?.companyName || '',
    partId: editing?.partId || '',
    subPart: editing?.subPart || '',
    quantity: editing?.quantity ?? 0,
    scheduleOrdered: editing?.scheduleOrdered ?? 0,
    scheduleReceived: editing?.scheduleReceived ?? 0,
    direction: editing?.direction || direction,
  });

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const selectedPart = parts.find(p => p.id === form.partId);
  const filteredCompanies = companies.filter(c => direction === 'inward' ? ['vendor', 'supplier'].includes(c.type) : c.type === 'customer');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!useOldStock && !form.billNo) return alert('Bill No is required');
    if (!form.partId) return alert('Part is required');
    const companyName = useOldStock ? 'Old Stock' : (companies.find(c => c.id === form.companyId)?.name || '');
    if (!useOldStock && !form.companyId) return alert('Party is required');
    onSubmit({
      ...form,
      billNo: useOldStock ? '' : form.billNo,
      companyId: useOldStock ? '' : form.companyId,
      companyName,
      part: selectedPart?.name || '',
      id: editing?.id,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-slate-800">
            {editing ? 'Edit Entry' : direction === 'inward' ? 'New Stock In' : 'New Stock Out'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">

          {/* Party Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">{direction === 'inward' ? 'Purchased From' : 'Sold To'}</p>
            {direction === 'inward' && (
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={useOldStock} onChange={e => setUseOldStock(e.target.checked)} className="rounded" />
                Old Stock (no party / no bill)
              </label>
            )}
            {!useOldStock && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Bill No *">
                  <input className="inp" value={form.billNo} onChange={e => update('billNo', e.target.value)} placeholder="e.g. BILL-001" />
                </Field>
                <Field label="Date *">
                  <input type="date" className="inp" value={form.date} onChange={e => update('date', e.target.value)} required />
                </Field>
                <Field label="Party *">
                  <select className="inp" value={form.companyId} onChange={e => update('companyId', e.target.value)}>
                    <option value="">Select party</option>
                    {filteredCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
            )}
            {useOldStock && (
              <Field label="Date *">
                <input type="date" className="inp" value={form.date} onChange={e => update('date', e.target.value)} required />
              </Field>
            )}
          </div>

          {/* Part Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Item</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Part *">
                <select className="inp" value={form.partId} onChange={e => setForm(f => ({ ...f, partId: e.target.value, subPart: '' }))} required>
                  <option value="">Select part</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.name}{p.modelNo ? ` (${p.modelNo})` : ''}</option>)}
                </select>
              </Field>
              <Field label="Model No">
                <input className="inp bg-slate-100" value={selectedPart?.modelNo || ''} readOnly placeholder="Auto" />
              </Field>
              {selectedPart && selectedPart.subParts.length > 0 && (
                <Field label="Sub Part">
                  <select className="inp" value={form.subPart} onChange={e => update('subPart', e.target.value)}>
                    <option value="">None</option>
                    {selectedPart.subParts.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Quantity *">
                <input type="number" min={0} className="inp" value={form.quantity} onChange={e => update('quantity', Number(e.target.value))} required />
              </Field>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 space-y-3">
            <p className="text-xs font-semibold text-indigo-600 uppercase">Schedule Tracking (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label={direction === 'inward' ? 'Total Ordered' : 'Total to Sell'}>
                <input type="number" min={0} className="inp" value={form.scheduleOrdered} onChange={e => update('scheduleOrdered', Number(e.target.value))} placeholder="0" />
              </Field>
              <Field label={direction === 'inward' ? 'Received So Far' : 'Sold So Far'}>
                <input type="number" min={0} className="inp" value={form.scheduleReceived} onChange={e => update('scheduleReceived', Number(e.target.value))} placeholder="0" />
              </Field>
            </div>
            {form.scheduleOrdered > 0 && (
              <div className="text-sm text-indigo-700 font-medium">
                Pending: <span className="text-lg font-bold">{form.scheduleOrdered - form.scheduleReceived}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">
              {editing ? 'Update' : 'Save'} Entry
            </button>
          </div>
        </form>
      </div>
      <style>{`.inp{width:100%;padding:.55rem .75rem;border:1px solid #cbd5e1;border-radius:.5rem;font-size:.875rem;outline:none}.inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
