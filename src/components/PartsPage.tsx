import { supabase } from '../utils/supabase';
import { useState } from 'react';
import { PartDef } from '../types';
import { uid } from '../store';

interface Props {
  parts: PartDef[];
  setParts: (p: PartDef[]) => void;
}

export default function PartsPage({ parts, setParts }: Props) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<PartDef | null>(null);

  const onDelete = async (id: string) => {
  if (!confirm('Delete this part?')) return;

  const { error } = await supabase
    .from('parts')
    .delete()
    .eq('id', id);

  console.log('DELETE PART ERROR:', error);

  if (!error) {
    setParts(parts.filter(p => p.id !== id));
  }
};

  const onSubmit = async (data: Omit<PartDef, 'id'> & { id?: string }) => {
  if (!data.name) return;

  if (data.id) {
    const updatedPart: PartDef = {
      ...data,
      id: data.id,
    };

    const { error } = await supabase
      .from('parts')
      .update({
        name: updatedPart.name,
        model_no: updatedPart.modelNo,
        sub_parts: updatedPart.subParts,
      })
      .eq('id', data.id);

    console.log('UPDATE PART ERROR:', error);

    if (!error) {
      setParts(
        parts.map(p =>
          p.id === data.id ? updatedPart : p
        )
      );
    }
  } else {
    const newPart: PartDef = {
      ...data,
      id: uid(),
    };

    const { error } = await supabase
      .from('parts')
      .insert([
        {
          id: newPart.id,
          name: newPart.name,
          model_no: newPart.modelNo,
          sub_parts: newPart.subParts,
        },
      ]);

    console.log('INSERT PART ERROR:', error);

    if (!error) {
      setParts([newPart, ...parts]);
    }
  }

  setShow(false);
  setEditing(null);
};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parts & Sub-Parts</h1>
          <p className="text-slate-500 text-sm mt-1">Define part name, model number, and linked sub-parts for entry dropdowns</p>
        </div>
        <button onClick={() => { setEditing(null); setShow(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">+ New Part</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parts.length === 0 && <div className="col-span-full text-center text-slate-400 py-10 bg-white rounded-xl border border-slate-200">No parts defined.</div>}
        {parts.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-800">{p.name}</div>
                <div className="text-sm text-slate-500 mt-1">Model No: <span className="font-medium text-slate-700">{p.modelNo || '—'}</span></div>
                <div className="text-xs text-slate-500 mt-2 font-medium">SUB-PARTS:</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {p.subParts.length === 0 ? <span className="text-xs text-slate-400 italic">None</span> : 
                    p.subParts.map(sp => <span key={sp} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">{sp}</span>)
                  }
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button onClick={() => { setEditing(p); setShow(true); }} className="flex-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 py-1.5 rounded-lg">Edit</button>
              <button onClick={() => onDelete(p.id)} className="flex-1 text-sm font-medium text-rose-600 hover:bg-rose-50 py-1.5 rounded-lg">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {show && <PartForm onClose={() => { setShow(false); setEditing(null); }} onSubmit={onSubmit} editing={editing} />}
    </div>
  );
}

function PartForm({ onClose, onSubmit, editing }: { onClose: () => void; onSubmit: (d: any) => void; editing: PartDef | null }) {
  const [f, setF] = useState({ 
    name: editing?.name || '', 
    modelNo: editing?.modelNo || '',
    subPartsStr: editing?.subParts.join(', ') || '' 
  });
  
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subParts = f.subPartsStr.split(',').map(s => s.trim()).filter(Boolean);
    onSubmit({ name: f.name, modelNo: f.modelNo, subParts, id: editing?.id });
  };
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{editing ? 'Edit Part' : 'New Part'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Part Name *</span>
            <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required placeholder="e.g., Casting, Outer Shell" />
          </label>
          <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Model No</span>
            <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={f.modelNo} onChange={e => setF({ ...f, modelNo: e.target.value })} placeholder="e.g., MITA-1001" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1.5">Sub-Parts (comma separated)</span>
            <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]" 
              value={f.subPartsStr} onChange={e => setF({ ...f, subPartsStr: e.target.value })} placeholder="e.g., Left Cover, Right Cover, Bottom Base..." />
            <p className="text-xs text-slate-500 mt-1.5">Separate each sub-part with a comma to add multiple at once.</p>
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
