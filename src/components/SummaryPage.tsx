import React, { useMemo, useState } from 'react';

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
  

  const data = useMemo(() => {
  const map = new Map();

  entries.forEach(e => {
    if (e.workflow === 'stock_sale') return;

    const company =
      companies.find(c => c.id === e.companyId)?.name || 'Unknown';

    const part = e.part || '(No Part)';

    const key = `${e.workflow}||${company}||${part}`;

    if (!map.has(key)) {
      map.set(key, {
        workflow: e.workflow,
        company,
        part,
        inward: 0,
        outward: 0,
        mf: 0,
        cf: 0,
        count: 0,
      });
    }

    const row = map.get(key);

    row.count++;
    row.mf += Number(e.mfFault || 0);
    row.cf += Number(e.cfFault || 0);

    if (e.direction === 'inward') {
      row.inward += Number(e.quantity || 0);
    } else {
      row.outward += Number(e.quantity || 0);
    }
  });

  return Array.from(map.values()).map((r: any) => ({
  ...r,
  workflow: r.workflow as WorkflowType,
  balance:
    r.workflow === 'jobwork_out'
      ? r.outward - r.inward - r.mf - r.cf
      : r.inward - r.outward - r.mf - r.cf,
}));
}, [entries, companies]);

  const exportCSV = () => {
  const rows = [['Workflow','Company','Part','Entries','Inward','Outward','M/F Qty','C/F Qty','Balance']];

  data.forEach((d: any) =>
    rows.push([
      workflowLabels[d.workflow as WorkflowType],
      d.company,
      d.part,
      String(d.count),
      String(d.inward),
      String(d.outward),
      String(d.mf),
      String(d.cf),
      String(d.balance),
    ])
  );

  const csv = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'summary.csv';
  a.click();

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
          
          
          <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">⬇ Export</button>
        </div>
      </div>

      {(['jobwork_in','jobwork_out'] as WorkflowType[]).map(wf => {
        const rows = data.filter(d => d.workflow === wf);
        const groupedRows = rows.reduce((acc: any, r: any) => {
  if (!acc[r.company]) {
    acc[r.company] = [];
  }

  acc[r.company].push(r);

  return acc;
}, {});
        const totals = rows.reduce((a, r) => ({ inward: a.inward + r.inward, outward: a.outward + r.outward, mf: a.mf + r.mf, cf: a.cf + r.cf, balance: a.balance + r.balance, count: a.count + r.count }), { inward: 0, outward: 0, mf: 0, cf: 0, balance: 0, count: 0 });
        return (
          <div key={wf} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
  {workflowLabels[wf as WorkflowType]}
</h3>
              <div className="text-xs text-slate-500">{rows.length} groups · {totals.count} entries</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">
  Company / Part
</th>
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
                  {Object.entries(groupedRows).map(([company, parts]: any) => {
  const companyUnit =
    companies.find(c => c.name === company)?.unit || 'pcs';

  return (
    <React.Fragment key={company}>
      <tr className="bg-slate-100">
        <td colSpan={7} className="px-4 py-3 font-bold text-slate-800">
          {company}
        </td>
      </tr>

      {parts.map((r: any) => (
        <tr key={`${wf}-${company}-${r.part}`} className="hover:bg-slate-50">
          <td className="px-4 py-3 pl-8 text-slate-700">
            ↳ {r.part}
          </td>

          <td className="px-4 py-3 text-right text-slate-600">
            {r.count}
          </td>

          <td className="px-4 py-3 text-right text-emerald-600 font-medium">
            {r.inward}
          </td>

          <td className="px-4 py-3 text-right text-amber-600 font-medium">
            {r.outward}
          </td>

          <td className="px-4 py-3 text-right text-rose-600 font-medium">
            {r.mf}
          </td>

          <td className="px-4 py-3 text-right text-fuchsia-600 font-medium">
            {r.cf}
          </td>

          <td className="px-4 py-3 text-right font-bold text-indigo-700">
            {r.balance} {companyUnit.toUpperCase()}
          </td>
        </tr>
      ))}
    </React.Fragment>
  );
})}
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
