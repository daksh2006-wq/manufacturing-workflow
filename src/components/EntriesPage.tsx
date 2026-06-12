import { supabase } from '../utils/supabase';
import { useState, useMemo } from 'react';
import { Entry, WorkflowType, Direction, Company, PartDef, Role } from '../types';
import { uid } from '../store';

interface Props {
  entries: Entry[];
  setEntries: (e: Entry[]) => void;
  companies: Company[];
  parts: PartDef[];
  workflow: WorkflowType;
  title: string;
  role: Role;
  currentUser: string;
}

const workflowCompanyType: Record<WorkflowType, Company['type'][]> = {
  jobwork_in: ['customer'],
  jobwork_out: ['vendor'],
  stock_sale: ['supplier', 'customer'],
};

export default function EntriesPage({ entries, setEntries, companies, parts, workflow, title, role, currentUser }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState<'all' | Direction>('all');
  const [filterFault, setFilterFault] = useState<'all' | 'mf' | 'cf' | 'none'>('all');

  const filtered = useMemo(() => {
    return entries
      .filter(e => e.workflow === workflow)
      .filter(e => filterDir === 'all' || e.direction === filterDir)
      .filter(e => {
        if (filterFault === 'all') return true;
        if (filterFault === 'none') return e.mfFault === 0 && e.cfFault === 0;
        if (filterFault === 'mf') return e.mfFault > 0;
        if (filterFault === 'cf') return e.cfFault > 0;
        return true;
      })
      .filter(e => {
  const q = search.toLowerCase();
  if (!q) return true;

  const partDef = parts.find(p => p.id === e.partId);

  return (
    e.challanNo.toLowerCase().includes(q) ||
    (partDef?.name || '').toLowerCase().includes(q) ||
    e.subPart.toLowerCase().includes(q)
  );
})
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [entries, workflow, search, filterDir, filterFault, parts]);

  const totals = useMemo(() => {
  const wf = entries.filter(e => e.workflow === workflow);

  const inward = wf
    .filter(e => e.direction === 'inward')
    .reduce((s, e) => s + Number(e.quantity || 0), 0);

  const outward = wf
    .filter(e => e.direction === 'outward')
    .reduce((s, e) => s + Number(e.quantity || 0), 0);

  const mf = wf.reduce((s, e) => s + Number(e.mfFault || 0), 0);
  const cf = wf.reduce((s, e) => s + Number(e.cfFault || 0), 0);

  const balance =
    workflow === 'jobwork_out'
      ? outward - inward - mf - cf
      : inward - outward - mf - cf;

  return {
    inward,
    outward,
    mf,
    cf,
    balance,
    count: wf.length
  };
}, [entries, workflow]);

  const companyName = (id: string) => companies.find(c => c.id === id)?.name || '—';

  // FIX: look up part by partId (not name) for accurate name + modelNo
  const getPartDef = (entry: Entry) => parts.find(p => p.id === entry.partId);

  const onDelete = async (id: string) => {
    if (role !== 'admin') {
      alert('Only admin can delete entries');
      return;
    }
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('entries').delete().eq('id', id);
    console.log('DELETE ENTRY ERROR:', error);
    if (!error) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const onEdit = (e: Entry) => {
    if (role !== 'admin') { alert('Only admin can edit entries'); return; }
    setEditing(e);
    setShowForm(true);
  };

  const onSubmit = async (
    data: Omit<Entry, 'id' | 'createdAt' | 'createdBy' | 'workflow'> & { id?: string }
  ) => {
    if (data.id) {
      const updatedEntry: Entry = {
        ...entries.find(e => e.id === data.id)!,
        ...data,
        id: data.id,
      };
      const { error } = await supabase
        .from('entries')
        .update({
          challan_no: updatedEntry.challanNo,
          date: updatedEntry.date,
          company_id: updatedEntry.companyId,
          part_id: updatedEntry.partId,       // FIX: store part_id
                       // keep name for backwards compat
          sub_part: updatedEntry.subPart,
          quantity: updatedEntry.quantity,
          mf_fault: updatedEntry.mfFault,
          cf_fault: updatedEntry.cfFault,
          direction: updatedEntry.direction,
          workflow: updatedEntry.workflow,
        })
        .eq('id', data.id);
      console.log('UPDATE ENTRY ERROR:', error);
      if (!error) {
        setEntries(entries.map(e => e.id === data.id ? updatedEntry : e));
      }
    } else {
      const newEntry: Entry = {
        ...data,
        id: uid(),
        workflow,
        createdAt: new Date().toISOString(),
        createdBy: currentUser,
      } as Entry;
      const { error } = await supabase
        .from('entries')
        .insert([{
          id: newEntry.id,
          challan_no: newEntry.challanNo,
          date: newEntry.date,
          company_id: newEntry.companyId,
          part_id: newEntry.partId,           // FIX: store part_id
                           // keep name for backwards compat
          sub_part: newEntry.subPart,
          quantity: newEntry.quantity,
          mf_fault: newEntry.mfFault,
          cf_fault: newEntry.cfFault,
          direction: newEntry.direction,
          workflow: newEntry.workflow,
          created_at: newEntry.createdAt,
          created_by: newEntry.createdBy,
        }]);
      console.log('INSERT ENTRY ERROR:', error);
      if (!error) {
        setEntries([newEntry, ...entries]);
      }
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">Manage inward/outward entries with challan tracking</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition inline-flex items-center gap-2"
        >
          <span>+</span> New Entry
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
       <StatCard label="Entries" value={totals.count} color="slate" />

{workflow === 'jobwork_out' ? (
  <>
    <StatCard label="Outward" value={totals.outward} color="amber" />
    <StatCard label="Inward" value={totals.inward} color="emerald" />
  </>
) : (
  <>
    <StatCard label="Inward" value={totals.inward} color="emerald" />
    <StatCard label="Outward" value={totals.outward} color="amber" />
  </>
)}

<StatCard label="M/F Fault" value={totals.mf} color="rose" />
<StatCard label="C/F Fault" value={totals.cf} color="fuchsia" />
<StatCard label="Balance" value={totals.balance} color="indigo" />
</div>
        
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search challan, part, sub-part..."
            className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select value={filterDir} onChange={e => setFilterDir(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Directions</option>
            <option value="inward">Inward only</option>
            <option value="outward">Outward only</option>
          </select>
          <select value={filterFault} onChange={e => setFilterFault(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Faults</option>
            <option value="none">No Faults</option>
            <option value="mf">Has M/F Fault</option>
            <option value="cf">Has C/F Fault</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Challan No</th>
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Part</th>
                <th className="text-left px-4 py-3 font-medium">Model No</th>
                <th className="text-left px-4 py-3 font-medium">Sub Part</th>
                <th className="text-left px-4 py-3 font-medium">Dir</th>
                <th className="text-right px-4 py-3 font-medium">Qty</th>
                <th className="text-right px-4 py-3 font-medium">M/F Qty</th>
                <th className="text-right px-4 py-3 font-medium">C/F Qty</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="text-center text-slate-400 py-10">No entries found. Click "New Entry" to add one.</td></tr>
              )}
              {filtered.map(e => {
                // FIX: look up by partId first, fallback to name for old entries
                const partDef = getPartDef(e);
                const partName = partDef?.name || '';
                const modelNo = partDef?.modelNo || '';
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{e.challanNo}</td>
                    <td className="px-4 py-3 text-slate-700">{companyName(e.companyId)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {partName ? `${partName}` : <span className="text-slate-400 italic">None</span>}
                    </td>
                    {/* FIX: Model No column now shows correct model via partId lookup */}
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {modelNo ? <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{modelNo}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.subPart || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${e.direction === 'inward' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {e.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{e.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      {e.mfFault > 0 ? <span className="text-rose-600 font-bold">{e.mfFault}</span> : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.cfFault > 0 ? <span className="text-fuchsia-600 font-bold">{e.cfFault}</span> : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => onEdit(e)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">Edit</button>
                      <button onClick={() => onDelete(e.id)} className="text-rose-600 hover:text-rose-800 text-xs font-medium">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <EntryForm
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={onSubmit}
          editing={editing}
          companies={companies.filter(c => workflowCompanyType[workflow].includes(c.type))}
          parts={parts}
          workflow={workflow}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const map: Record<string, string> = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    fuchsia: 'text-fuchsia-600',
    indigo: 'text-indigo-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${map[color]}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function EntryForm({ onClose, onSubmit, editing, companies, parts, workflow }: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  editing: Entry | null;
  companies: Company[];
  parts: PartDef[];
  workflow: WorkflowType;
}) {
  const [form, setForm] = useState({
    challanNo: editing?.challanNo || '',
    date: editing?.date || new Date().toISOString().slice(0, 10),
    companyId: editing?.companyId || '',
    // FIX: store partId (not name) — use editing?.partId if editing, otherwise ''
    partId: editing?.partId || '',
    subPart: editing?.subPart || '',
    quantity: editing?.quantity ?? '' as number | '',
    mfFault: editing?.mfFault || 0,
    cfFault: editing?.cfFault || 0,
    direction: editing?.direction || '' as Direction | '',
  });

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  // FIX: look up selected part by ID — so BRACKET (80445) and BRACKET (89445) are always distinct
  const selectedPartDef = parts.find(p => p.id === form.partId);
  const selectedCompany =
  companies.find(c => c.id === form.companyId);

const isKgCompany =
  selectedCompany?.unit === 'kg';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = form.quantity === '' ? 0 : Number(form.quantity);
    if (!form.challanNo || !form.companyId || !form.direction || quantity < 0) {
      alert('Challan, Company, Direction, and Quantity are required.');
      return;
    }
    if (!form.partId) {
      alert('Part is required. Please select a part.');
      return;
    }
    onSubmit({
      ...form,
      // FIX: also pass part name and modelNo for display/search convenience
      part: selectedPartDef?.name || '',
      partId: form.partId,
      quantity,
      direction: form.direction as Direction,
      mfFault: form.direction === 'outward' ? Number(form.mfFault || 0) : 0,
      cfFault: form.direction === 'outward' ? Number(form.cfFault || 0) : 0,
      id: editing?.id,
    });
  };

  const dirLabel = workflow === 'jobwork_in' ? { inward: 'Receive from Customer', outward: 'Return to Customer' }
    : workflow === 'jobwork_out' ? { inward: 'Receive from Vendor', outward: 'Send to Vendor' }
    : { inward: 'Purchase Inward', outward: 'Sale Outward' };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-slate-800">{editing ? 'Edit Entry' : 'New Entry'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Challan No *"><input className="inp" value={form.challanNo} onChange={e => update('challanNo', e.target.value)} required /></Field>
            <Field label="Date *"><input type="date" className="inp" value={form.date} onChange={e => update('date', e.target.value)} required /></Field>
            <Field label="Company *">
              <select className="inp" value={form.companyId} onChange={e => update('companyId', e.target.value)} required>
                <option value="">Select company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Item Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Part *">
                {/* FIX: value is p.id — each part is unique even if same name */}
                <select
                  className="inp"
                  value={form.partId}
                  onChange={e => setForm({ ...form, partId: e.target.value, subPart: '' })}
                  required
                >
                  <option value="">-- Select Part --</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.modelNo ? ` (${p.modelNo})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Model No">
                {/* FIX: always correct because selectedPartDef uses ID lookup */}
                <input
                  className="inp bg-slate-100 text-slate-600"
                  value={selectedPartDef?.modelNo || ''}
                  readOnly
                  placeholder="Auto from selected part"
                />
              </Field>
              <Field label="Sub Part">
  <select
    className="inp"
    value={form.subPart}
    onChange={e => update('subPart', e.target.value)}
    disabled={!selectedPartDef || selectedPartDef.subParts.length === 0}
  >
    <option value="">-- Select Sub-Part --</option>
    {selectedPartDef?.subParts.map(sp => (
      <option key={sp} value={sp}>
        {sp}
      </option>
    ))}
  </select>
</Field>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Direction *">
              <select className="inp" value={form.direction} onChange={e => update('direction', e.target.value)} required>
                <option value="">-- Select Direction --</option>
                <option value="inward">{dirLabel.inward}</option>
                <option value="outward">{dirLabel.outward}</option>
              </select>
            </Field>
            <Field label={`Quantity (${isKgCompany ? 'KG' : 'PCS'})`}>
  <input
    type="number"
    min={0}
    step="0.001"
    className="inp border-indigo-300"
    value={form.quantity}
    onChange={e =>
      update(
        'quantity',
        e.target.value === ''
          ? ''
          : Number(e.target.value)
      )
    }
    onBlur={() => {
      if (form.quantity === '') update('quantity', 0);
    }}
    placeholder={isKgCompany ? "0.000" : "0"}
  />
</Field>
          
                  
            {form.direction === 'outward' && (
              <>
                <Field label="M/F Fault Qty *">
                  <input type="number" min={0} step="0.001" className="inp border-rose-200 focus:ring-rose-500" value={form.mfFault} onChange={e => update('mfFault', e.target.value)} required />
                </Field>
                <Field label="C/F Fault Qty *">
                  <input type="number" min={0} step="0.001" className="inp border-fuchsia-200 focus:ring-fuchsia-500" value={form.cfFault} onChange={e => update('cfFault', e.target.value)} required />
                </Field>
              </>
            )}
          </div>
          

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">{editing ? 'Update' : 'Save'} Entry</button>
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
