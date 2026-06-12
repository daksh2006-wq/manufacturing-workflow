import { useMemo, useState } from 'react';
import { Entry, WorkflowType, Company } from '../types';

interface Props {
  entries: Entry[];
  companies: Company[];
}

const workflowLabels: Record<WorkflowType, string> = {
  jobwork_in: 'Job Work (Customer)',
  jobwork_out: 'Job Work (Vendor)',
  stock_sale: 'Stock / Sale',
};

export default function SummaryPage({ entries, companies }: Props) {
  const [groupBy, setGroupBy] = useState<'company' | 'part' | 'subPart'>('company');

  const data = useMemo(() => {
    const map = new Map<string, { label: string; inward: number; outward: number; mf: number; cf: number; count: number }>();
    entries.forEach(e => {
      let label = '';
      if (groupBy === 'company') label = companies.find(c => c.id === e.companyId)?.name || 'Unknown';
      else if (groupBy === 'subPart') label = e.subPart || '(No Sub-Part)';
      else label = e.part || '(No Part)';
      
      const key = `${e.workflow}||${label}`;
      const row = map.get(key) || { label, inward: 0, outward: 0, mf: 0, cf: 0, count: 0 };
      const qty = Number(e.quantity || 0);
      const mf = Number(e.mfFault || 0);
      const cf = Number(e.cfFault || 0);
      row.count++;
      if (e.direction === 'inward') row.inward += qty;
      else row.outward += qty;
      row.mf += mf;
      row.cf += cf;
      map.set(key, row);
    });
    return Array.from(map.entries()).map(([key, r]) => {
  const workflow = key.split('||')[0] as WorkflowType;

  const balance =
    workflow === 'jobwork_out'
      ? r.outward - r.inward - r.mf - r.cf
      : r.inward - r.outward - r.mf - r.cf;

  return {
    ...r,
    workflow,
    balance,
  };
}).sort((a, b) => b.balance - a.balance);
  }, [entries, companies, groupBy]);

  const exportCSV = () => {
    const rows = [['Workflow','Group','Entries','Inward','Outward','M/F Qty','C/F Qty','Balance']];
    data.forEach(d => rows.push([workflowLabels[d.workflow], d.label, String(d.count), String(d.inward), String(d.outward), String(d.mf), String(d.cf), String(d.balance)]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `summary_by_${groupBy}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Total Summary</h1>
          <p className="text-slate-500 text-sm mt-1">Consolidated view across all three workflows</p>
        </div>
        <div className="flex gap-2">
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
            className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="company">Group by Company</option>
            <option value="part">Group by Part</option>
            <option value="subPart">Group by Sub-Part</option>
          </select>
          <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">⬇ Export</button>
        </div>
      </div>

      {(['jobwork_in','jobwork_out','stock_sale'] as WorkflowType[]).map(wf => {
        const rows = data.filter(d => d.workflow === wf);
        const totals = rows.reduce((a, r) => ({ inward: a.inward + r.inward, outward: a.outward + r.outward, mf: a.mf + r.mf, cf: a.cf + r.cf, balance: a.balance + r.balance, count: a.count + r.count }), { inward: 0, outward: 0, mf: 0, cf: 0, balance: 0, count: 0 });
        return (
          <div key={wf} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{workflowLabels[wf]}</h3>
              <div className="text-xs text-slate-500">{rows.length} groups · {totals.count} entries</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Group</th>
                    <th className="text-right px-4 py-3 font-medium">Entries</th>
                    <th className="text-right px-4 py-3 font-medium">Inward</th>
                    <th className="text-right px-4 py-3 font-medium">Outward</th>
                    <th className="text-right px-4 py-3 font-medium">M/F</th>
                    <th className="text-right px-4 py-3 font-medium">C/F</th>
                    <th className="text-right px-4 py-3 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8">No data</td></tr>}
                  {rows.map(r => (
                    <tr key={`${wf}-${r.label}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.label}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.count}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{r.inward}</td>
                      <td className="px-4 py-3 text-right text-amber-600 font-medium">{r.outward}</td>
                      <td className="px-4 py-3 text-right text-rose-600 font-medium">{r.mf}</td>
                      <td className="px-4 py-3 text-right text-fuchsia-600 font-medium">{r.cf}</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-700">{r.balance}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot className="bg-slate-50 text-sm font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-slate-700">Total</td>
                      <td className="px-4 py-3 text-right text-slate-700">{totals.count}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{totals.inward}</td>
                      <td className="px-4 py-3 text-right text-amber-700">{totals.outward}</td>
                      <td className="px-4 py-3 text-right text-rose-700">{totals.mf}</td>
                      <td className="px-4 py-3 text-right text-fuchsia-700">{totals.cf}</td>
                      <td className="px-4 py-3 text-right text-indigo-700">{totals.balance}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
