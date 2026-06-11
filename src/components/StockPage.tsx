import { useMemo, useState } from 'react';
import { Entry, WorkflowType, PartDef } from '../types';

interface Props {
  entries: Entry[];
  parts: PartDef[];
}

const workflowLabels: Record<WorkflowType, string> = {
  jobwork_in: 'Job Work (Customer)',
  jobwork_out: 'Job Work (Vendor)',
  stock_sale: 'Stock / Sale',
};

export default function StockPage({ entries, parts }: Props) {
  const [workflow, setWorkflow] = useState<'all' | WorkflowType>('all');
  const [search, setSearch] = useState('');

  interface StockRow { key: string; workflow: WorkflowType; part: string; subPart: string; inward: number; outward: number; mf: number; cf: number; balance: number; }
  const items: StockRow[] = useMemo(() => {
    const map = new Map<string, Omit<StockRow, 'balance'>>();
    entries.forEach(e => {
      const key = `${e.workflow}|${e.part.trim()}|${e.subPart.trim()}`;
      const it: { key: string; workflow: WorkflowType; part: string; subPart: string; inward: number; outward: number; mf: number; cf: number } = map.get(key) || {
        key, workflow: e.workflow, part: e.part, subPart: e.subPart,
        inward: 0, outward: 0, mf: 0, cf: 0,
      };
      const qty = Number(e.quantity || 0);
      const mf = Number(e.mfFault || 0);
      const cf = Number(e.cfFault || 0);
      if (e.direction === 'inward') it.inward += qty;
      else it.outward += qty;
      it.mf += mf;
      it.cf += cf;
      map.set(key, it);
    });
    return Array.from(map.values()).map(it => ({ ...it, balance: it.inward - it.outward - it.mf - it.cf })) as (typeof map) extends Map<any, infer V> ? (V & { balance: number })[] : never;
  }, [entries]);

  const filtered = items.filter(it => (workflow === 'all' || it.workflow === workflow))
    .filter(it => {
      const q = search.toLowerCase();
      if (!q) return true;
      const modelNo = parts.find(p => p.name === it.part)?.modelNo || '';
      return it.part.toLowerCase().includes(q) || it.subPart.toLowerCase().includes(q) || modelNo.toLowerCase().includes(q);
    })
    .sort((a, b) => b.balance - a.balance);

  const grand = {
    inward: items.reduce((s, i) => s + i.inward, 0),
    outward: items.reduce((s, i) => s + i.outward, 0),
    balance: items.reduce((s, i) => s + i.balance, 0),
    mf: items.reduce((s, i) => s + i.mf, 0),
    cf: items.reduce((s, i) => s + i.cf, 0),
  };

  const exportCSV = () => {
    const rows = [['Workflow','Part','ModelNo','SubPart','Inward','Outward','M/F Fault Qty','C/F Fault Qty','Balance']];
    filtered.forEach(i => rows.push([workflowLabels[i.workflow], i.part, parts.find(p => p.name === i.part)?.modelNo || '', i.subPart, String(i.inward), String(i.outward), String(i.mf), String(i.cf), String(i.balance)]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'stock_balances.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stock Balances</h1>
          <p className="text-slate-500 text-sm mt-1">Remaining balance for each part and sub-part, grouped by workflow</p>
        </div>
        <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">⬇ Export CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Unique Items" value={items.length} color="slate" />
        <SummaryCard label="Total Inward" value={grand.inward} color="emerald" />
        <SummaryCard label="Total Outward" value={grand.outward} color="amber" />
        <SummaryCard label="Total M/F Faults" value={grand.mf} color="rose" />
        <SummaryCard label="Total C/F Faults" value={grand.cf} color="fuchsia" />
        <SummaryCard label="Net Balance" value={grand.balance} color="indigo" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search part, model no, or sub-part..."
            className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={workflow} onChange={e => setWorkflow(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Workflows</option>
            <option value="jobwork_in">Job Work (Customer)</option>
            <option value="jobwork_out">Job Work (Vendor)</option>
            <option value="stock_sale">Stock / Sale</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Workflow</th>
                <th className="text-left px-4 py-3 font-medium">Part</th>
                <th className="text-left px-4 py-3 font-medium">Model No</th>
                <th className="text-left px-4 py-3 font-medium">Sub Part</th>
                <th className="text-right px-4 py-3 font-medium">Inward</th>
                <th className="text-right px-4 py-3 font-medium">Outward</th>
                <th className="text-right px-4 py-3 font-medium">M/F Fault</th>
                <th className="text-right px-4 py-3 font-medium">C/F Fault</th>
                <th className="text-right px-4 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center text-slate-400 py-10">No stock items yet.</td></tr>}
              {filtered.map(i => (
                <tr key={i.key} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded bg-indigo-50 text-indigo-700">{workflowLabels[i.workflow]}</span></td>
                  <td className="px-4 py-3 font-medium text-slate-800">{i.part || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{parts.find(p => p.name === i.part)?.modelNo || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{i.subPart || '—'}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{i.inward}</td>
                  <td className="px-4 py-3 text-right text-amber-600 font-medium">{i.outward}</td>
                  <td className="px-4 py-3 text-right text-rose-600 font-medium">{i.mf}</td>
                  <td className="px-4 py-3 text-right text-fuchsia-600 font-medium">{i.cf}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-700">{i.balance}</td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 text-sm font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-slate-700">Totals ({filtered.length} items)</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{filtered.reduce((s, i) => s + i.inward, 0)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{filtered.reduce((s, i) => s + i.outward, 0)}</td>
                  <td className="px-4 py-3 text-right text-rose-700">{filtered.reduce((s, i) => s + i.mf, 0)}</td>
                  <td className="px-4 py-3 text-right text-fuchsia-700">{filtered.reduce((s, i) => s + i.cf, 0)}</td>
                  <td className="px-4 py-3 text-right text-indigo-700">{filtered.reduce((s, i) => s + i.balance, 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const map: Record<string, string> = {
    slate: 'text-slate-800', emerald: 'text-emerald-600', amber: 'text-amber-600',
    rose: 'text-rose-600', fuchsia: 'text-fuchsia-600', indigo: 'text-indigo-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${map[color]}`}>{value.toLocaleString()}</div>
    </div>
  );
}
