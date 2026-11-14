import { ActiveView } from '../types';

export interface NavLocation {
  view: ActiveView;
  id?: string;
}

const VIEW_SEGMENTS: Record<ActiveView, string> = {
  dashboard: 'dashboard',
  kanban: 'kanban',
  gantt: 'gantt',
  grid: 'grid',
  calendar: 'calendar',
  analytics: 'analytics',
  companies: 'companies',
  employees: 'employees',
  'employee-detail': 'employee-detail',
  counterparties: 'counterparties',
  'counterparty-detail': 'counterparty-detail',
  contracts: 'contracts',
  'contract-detail': 'contract-detail',
  calculations: 'calculations',
  payments: 'payments',
  projects: 'projects',
  'project-detail': 'project-detail',
  'project-chat': 'project-chat',
  'knowledge-base': 'knowledge-base',
  'task-detail': 'task-detail',
  'time-tracking': 'time-tracking',
  expenses: 'expenses',
  settings: 'settings',
  'design-tokens': 'design-tokens',
  storybook: 'storybook',
};

export function pathToLocation(hash: string): NavLocation | null {
  const clean = hash.replace(/^#\/?/, '');
  if (!clean) return null;
  const [segment, id] = clean.split('/');
  const view = (Object.keys(VIEW_SEGMENTS) as ActiveView[]).find(
    (v) => VIEW_SEGMENTS[v] === segment
  );
  if (!view) return null;
  return { view, id: id ? decodeURIComponent(id) : undefined };
}

export function locationToPath(view: ActiveView, id?: string): string {
  const seg = VIEW_SEGMENTS[view];
  return id ? `#/${seg}/${encodeURIComponent(id)}` : `#/${seg}`;
}
