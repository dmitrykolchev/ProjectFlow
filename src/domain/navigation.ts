import { ActiveView } from '../types';

export interface NavLocation {
  view: ActiveView;
  id?: string;
  /** page number for paginated list views (#/<view>/p/<n>) */
  page?: number;
}

const VIEW_SEGMENTS: Record<ActiveView, string> = {
  dashboard: 'dashboard',
  kanban: 'kanban',
  gantt: 'gantt',
  grid: 'grid',
  calendar: 'calendar',
  analytics: 'analytics',
  companies: 'companies',
  'company-detail': 'company-detail',
  employees: 'employees',
  'employee-detail': 'employee-detail',
  counterparties: 'counterparties',
  'counterparty-detail': 'counterparty-detail',
  contracts: 'contracts',
  'contract-detail': 'contract-detail',
  calculations: 'calculations',
  'calculation-detail': 'calculation-detail',
  payments: 'payments',
  'payment-detail': 'payment-detail',
  directories: 'directories',
  reminders: 'reminders',
  'reminder-detail': 'reminder-detail',
  projects: 'projects',
  'project-detail': 'project-detail',
  requirements: 'requirements',
  'requirement-detail': 'requirement-detail',
  'project-chat': 'project-chat',
  'knowledge-base': 'knowledge-base',
  documents: 'documents',
  'task-detail': 'task-detail',
  'time-tracking': 'time-tracking',
  'timeentry-detail': 'timeentry-detail',
  expenses: 'expenses',
  'expense-detail': 'expense-detail',
  settings: 'settings',
  'profile-settings': 'profile-settings',
  'design-tokens': 'design-tokens',
  storybook: 'storybook',
  'material-icons': 'material-icons',
};

export function pathToLocation(hash: string): NavLocation | null {
  const clean = hash.replace(/^#\/?/, '');
  if (!clean) return null;
  const [segment, second, third] = clean.split('/');
  const view = (Object.keys(VIEW_SEGMENTS) as ActiveView[]).find(
    (v) => VIEW_SEGMENTS[v] === segment
  );
  if (!view) return null;
  // page segment "p/<n>" is used by paginated list views
  if (second === 'p') {
    const page = Number(third);
    return { view, page: Number.isInteger(page) && page > 1 ? page : undefined };
  }
  return { view, id: second ? decodeURIComponent(second) : undefined };
}

export function locationToPath(view: ActiveView, id?: string, page?: number): string {
  const seg = VIEW_SEGMENTS[view];
  if (id) return `#/${seg}/${encodeURIComponent(id)}`;
  if (page !== undefined && page > 1) return `#/${seg}/p/${page}`;
  return `#/${seg}`;
}
