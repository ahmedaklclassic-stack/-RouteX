export type Role = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface School {
  id: number;
  name: string;
  stage: string;
  type: string;
  admin_area: string;
  address: string;
}

export interface Inspector {
  id: number;
  name: string;
  job_title: string;
  specialization: string;
  status: 'active' | 'disabled';
  disable_reason?: string;
  leave_start?: string;
  leave_end?: string;
}

export interface Route {
  id: number;
  inspector_id: number;
  school_id: number;
  date: string;
  inspector_name?: string;
  school_name?: string;
}
