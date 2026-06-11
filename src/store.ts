import { User, Company, PartDef, Entry } from './types';

const KEYS = {
  users: 'jwp_users',
  companies: 'jwp_companies',
  parts: 'jwp_parts',
  entries: 'jwp_entries',
  session: 'jwp_session',
};

const defaultUsers: User[] = [
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
  { username: 'operator', password: 'operator123', role: 'operator', name: 'Operator' },
];

const defaultCompanies: Company[] = [
  { id: 'c1', name: 'Mita India', type: 'customer', contact: '', email: '', address: '' },
  { id: 'c2', name: 'Mita Sale', type: 'customer', contact: '', email: '', address: '' },
  { id: 'c3', name: 'XYZ Manufacturing', type: 'vendor', contact: '', email: '', address: '' },
  { id: 'c4', name: 'RawMart Suppliers', type: 'supplier', contact: '', email: '', address: '' },
];

const defaultParts: PartDef[] = [
  { id: 'p1', name: 'Casting', modelNo: 'CAST-001', subParts: ['Base', 'Cover', 'Top'] },
  { id: 'p2', name: 'Raw Bar', modelNo: 'RAW-001', subParts: ['10mm', '20mm', '30mm'] },
];

const defaultEntries: Entry[] = [];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function initStore() {
  if (!localStorage.getItem(KEYS.users)) save(KEYS.users, defaultUsers);
  if (!localStorage.getItem(KEYS.companies)) save(KEYS.companies, defaultCompanies);
  if (!localStorage.getItem(KEYS.parts)) save(KEYS.parts, defaultParts);
  if (!localStorage.getItem(KEYS.entries)) save(KEYS.entries, defaultEntries);

  // Keep old browser data compatible with the latest part-based structure.
  const companies = load<Company[]>(KEYS.companies, defaultCompanies);
  const withMita = [...companies];
  defaultCompanies.slice(0, 2).forEach(c => {
    if (!withMita.some(x => x.name.toLowerCase() === c.name.toLowerCase())) withMita.unshift(c);
  });
  save(KEYS.companies, withMita);

  const parts = load<(PartDef & { modelNo?: string })[]>(KEYS.parts, defaultParts);
  save(KEYS.parts, parts.map(p => ({ ...p, modelNo: p.modelNo || '' })));

  const entries = load<any[]>(KEYS.entries, defaultEntries);
  save(KEYS.entries, entries.map(e => ({
    ...e,
    part: e.part || e.modelName || '',
    subPart: e.subPart || '',
    mfFault: Number(e.mfFault || 0),
    cfFault: Number(e.cfFault || 0),
  })));
}

export const store = {
  getUsers: () => load<User[]>(KEYS.users, defaultUsers),
  setUsers: (v: User[]) => save(KEYS.users, v),
  getCompanies: () => load<Company[]>(KEYS.companies, defaultCompanies),
  setCompanies: (v: Company[]) => save(KEYS.companies, v),
  getParts: () => load<PartDef[]>(KEYS.parts, defaultParts),
  setParts: (v: PartDef[]) => save(KEYS.parts, v),
  getEntries: () => load<Entry[]>(KEYS.entries, defaultEntries),
  setEntries: (v: Entry[]) => save(KEYS.entries, v),
  getSession: () => load<{ username: string } | null>(KEYS.session, null),
  setSession: (v: { username: string } | null) => {
    if (v) save(KEYS.session, v);
    else localStorage.removeItem(KEYS.session);
  },
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
