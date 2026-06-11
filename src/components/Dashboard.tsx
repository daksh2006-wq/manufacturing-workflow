import { useMemo } from 'react';
import { Entry, WorkflowType, PartDef } from '../types';

interface Props {
  entries: Entry[];
  companies: { id: string; name: string; type: string }[];
  parts: PartDef[];
}

const workflowLabels: Record<WorkflowType, string> = {
  jobwork_in: 'Job Work (Customer)',
  jobwork_out: 'Job Work (Vendor)',
  stock_sale: 'Stock / Sale',
};

export default function Dashboard({ entries, companies, parts }: Props) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = entries.filter(e => e.date === today);
    const byWorkflow: Record<WorkflowType, { inward: number; outward: number; mf: number; cf: number; count: number }> = {
      jobwork_in: { inward: 0, outward: 0, mf: 0, cf: 0, count: 0 },
      jobwork_out: { inward: 0, outward: 0, mf: 0, cf: 0, count: 0 },
      stock_sale: { inward: 0, outward: 0, mf: 0, cf: 0, count: 0 },
    };
    let totalIn = 0, totalOut = 0, totalMf = 0, totalCf = 0;
    entries.forEach(e => {
      const w = byWorkflow[e.workflow];
      const qty = Number(e.quantity || 0);
      const mf = Number(e.mfFault || 0);
      const cf = Number(e.cfFault || 0);
      w.count++;
      if (e.direction === 'inward') { w.inward += qty; totalIn += qty; }
      else { w.outward += qty; totalOut += qty; }
      w.mf += mf; totalMf += mf;
      w.cf += cf; totalCf += cf;
    });
    return { byWorkflow, totalIn, totalOut, totalMf, totalCf, todayCount: todayEntries.length, totalEntries: entries.length };
  }, [entries]);

  const cards = [
    { label: 'Total Entries', value: stats.totalEntries, icon: '📋', color: 'from-indigo-500 to-indigo-600' },
    { label: "Today's Entries", value: stats.todayCount, icon: '📅', color: 'from-sky-500 to-sky-600' },
    { label: 'Total Inward Qty', value: stats.totalIn, icon: '⬇️', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Outward Qty', value: stats.totalOut, icon: '⬆️', color: 'from-amber-500 to-amber-600' },
    { label: 'Total M/F Faults', value: stats.totalMf, icon: '⚠️', color: 'from-rose-500 to-rose-600' },
    { label: 'Total C/F Faults', value: stats.totalCf, icon: '🛠️', color: 'from-fuchsia-500 to-fuchsia-600' },
  ];

  const recent = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const companyName = (id: string) => companies.find(c => c.id === id)?.name || '—';
  const modelNo = (partName: string) => parts.find(p => p.name === partName)?.modelNo || '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your industrial workflow operations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-lg mb-3 shadow-sm`}>
              <span>{c.icon}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{c.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['jobwork_in', 'jobwork_out', 'stock_sale'] as WorkflowType[]).map(w => {
          const s = stats.byWorkflow[w];
          const balance = s.inward - s.outward - s.mf - s.cf;
          return (
            <div key={w} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">{workflowLabels[w]}</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{s.count} entries</span>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Inward</span><span className="font-medium text-emerald-600">{s.inward.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Outward</span><span className="font-medium text-amber-600">{s.outward.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">M/F Fault Qty</span><span className="font-medium text-rose-600">{s.mf.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">C/F Fault Qty</span><span className="font-medium text-fuchsia-600">{s.cf.toLocaleString()}</span></div>
                <div className="border-t pt-2.5 flex justify-between"><span className="text-slate-700 font-medium">Balance</span><span className="font-bold text-indigo-600">{balance.toLocaleString()}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Recent Entries</h3>
          <span className="text-xs text-slate-500">Latest 8 transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Challan</th>
                <th className="text-left px-5 py-3 font-medium">Company</th>
                <th className="text-left px-5 py-3 font-medium">Part</th>
                <th className="text-left px-5 py-3 font-medium">Model No</th>
                <th className="text-left px-5 py-3 font-medium">Dir</th>
                <th className="text-right px-5 py-3 font-medium">Qty</th>
                <th className="text-right px-5 py-3 font-medium">M/F</th>
                <th className="text-right px-5 py-3 font-medium">C/F</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 && (
                <tr><td colSpan={9} className="text-center text-slate-400 py-8">No entries yet. Create your first entry.</td></tr>
              )}
              {recent.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">{e.date}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{e.challanNo}</td>
                  <td className="px-5 py-3 text-slate-700">{companyName(e.companyId)}</td>
                  <td className="px-5 py-3 text-slate-700">{e.part}{e.subPart ? ` / ${e.subPart}` : ''}</td>
                  <td className="px-5 py-3 text-slate-700">{modelNo(e.part)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${e.direction === 'inward' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {e.direction}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">{e.quantity}</td>
                  <td className="px-5 py-3 text-right">{e.direction === 'inward' ? <span className="text-slate-300">-</span> : (e.mfFault > 0 ? <span className="text-rose-600 font-medium">{e.mfFault}</span> : <span className="text-slate-300">0</span>)}</td>
                  <td className="px-5 py-3 text-right">{e.direction === 'inward' ? <span className="text-slate-300">-</span> : (e.cfFault > 0 ? <span className="text-fuchsia-600 font-medium">{e.cfFault}</span> : <span className="text-slate-300">0</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
