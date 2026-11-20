import { ActiveView } from '../types';

export interface NavLocation {
  view: ActiveView;
  id?: string;
  /** page number for paginated list views (#/<view>?page=<n>) */
  page?: number;
  /** display mode of the view (#/<view>?mode=<mode>) */
  mode?: string;
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
  const [pathPart, queryPart] = hash.replace(/^#\/?/, '').split('?');
  if (!pathPart) return null;
  const [segment, second] = pathPart.split('/');
  const view = (Object.keys(VIEW_SEGMENTS) as ActiveView[]).find(
    (v) => VIEW_SEGMENTS[v] === segment
  );
  if (!view) return null;
  // mode and page live in the query part: #/<view>?mode=<mode>&page=<n>
  const params = new URLSearchParams(queryPart || '');
  const mode = params.get('mode');
  const page = Number(params.get('page'));
  return {
    view,
    id: second ? decodeURIComponent(second) : undefined,
    mode: mode || undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

export function locationToPath(
  view: ActiveView,
  id?: string,
  page?: number,
  mode?: string
): string {
  const seg = VIEW_SEGMENTS[view];
  const base = id ? `#/${seg}/${encodeURIComponent(id)}` : `#/${seg}`;
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (page !== undefined && page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
