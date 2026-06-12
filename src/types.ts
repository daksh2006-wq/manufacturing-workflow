export type Role = 'admin' | 'operator';

export interface User {
  username: string;
  password: string;
  role: Role;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  type: 'customer' | 'vendor' | 'supplier';
  contact?: string;
  email?: string;
  address?: string;
  unit?: 'pcs' | 'kg';
}

export interface PartDef {
  id: string;
  name: string;
  modelNo: string;
  subParts: string[]; // List of sub-parts for this specific part
}

export type WorkflowType = 'jobwork_in' | 'jobwork_out' | 'stock_sale';

export type Direction = 'inward' | 'outward';

export interface Entry {
  id: string;
  challanNo: string;
  date: string; // YYYY-MM-DD
  companyId: string;
  part: string;
  subPart: string;
  
  quantity: number;
  mfFault: number; // Mandatory, defaults to 0
  cfFault: number; // Mandatory, defaults to 0
  
  direction: Direction;
  workflow: WorkflowType;
  createdAt: string;
  createdBy: string;
}
