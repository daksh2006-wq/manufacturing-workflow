import { User, Company, PartDef, Entry } from './types';

const KEYS = {
  users: 'jwp_users',
  companies: 'jwp_companies',
  parts: 'jwp_parts',
  entries: 'jwp_entries',
  session: 'jwp_session',
};

const defaultUsers: User[] = [];

const defaultCompanies: Company[] = [];

const defaultParts: PartDef[] = [];

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
