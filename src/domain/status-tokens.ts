import type { BadgeVariant } from '../components/common/app-badge/app-badge';

/** Views historically pass `default` to app-badge (renders unstyled); keep it as-is. */
export type StatusBadgeVariant = BadgeVariant | 'default';

export type StatusDomain =
  | 'task'
  | 'priority'
  | 'project'
  | 'company'
  | 'counterparty'
  | 'counterpartyType'
  | 'contract'
  | 'calculation'
  | 'invoice'
  | 'payment'
  | 'expense'
  | 'timeEntry'
  | 'employee';

export interface StatusToken {
  /** Badge variant used by app-status-chip / app-badge. */
  variant: StatusBadgeVariant;
  /** i18n group key (e.g. 'status', 'priority', 'projectStatuses') when labels live in i18n. */
  i18nGroup?: string;
  /** Hardcoded ru/en label pair (used when the domain has no i18n group). */
  label?: { ru: string; en: string };
}

export const STATUS_TOKENS: Record<StatusDomain, Record<string, StatusToken>> = {
  task: {
    backlog: { variant: 'neutral', i18nGroup: 'status' },
    todo: { variant: 'info', i18nGroup: 'status' },
    in_progress: { variant: 'warning', i18nGroup: 'status' },
    review: { variant: 'primary', i18nGroup: 'status' },
    done: { variant: 'success', i18nGroup: 'status' },
  },
  priority: {
    low: { variant: 'neutral', i18nGroup: 'priority' },
    medium: { variant: 'info', i18nGroup: 'priority' },
    high: { variant: 'warning', i18nGroup: 'priority' },
    urgent: { variant: 'danger', i18nGroup: 'priority' },
  },
  project: {
    planning: { variant: 'info', i18nGroup: 'projectStatuses' },
    active: { variant: 'success', i18nGroup: 'projectStatuses' },
    on_hold: { variant: 'warning', i18nGroup: 'projectStatuses' },
    completed: { variant: 'primary', i18nGroup: 'projectStatuses' },
  },
  company: {
    active: { variant: 'success', label: { ru: 'Активна', en: 'Active' } },
    inactive: { variant: 'default', label: { ru: 'Архив', en: 'Inactive' } },
  },
  counterparty: {
    active: { variant: 'success', label: { ru: 'Активный', en: 'Active' } },
    pending: { variant: 'warning', label: { ru: 'На проверке', en: 'Pending' } },
    blocked: { variant: 'danger', label: { ru: 'Заблокирован', en: 'Blocked' } },
  },
  counterpartyType: {
    client: { variant: 'primary', label: { ru: 'Заказчик', en: 'Client' } },
    vendor: { variant: 'info', label: { ru: 'Поставщик', en: 'Vendor' } },
    partner: { variant: 'warning', label: { ru: 'Партнёр', en: 'Partner' } },
    contractor: { variant: 'default', label: { ru: 'Подрядчик', en: 'Contractor' } },
  },
  contract: {
    draft: { variant: 'default', label: { ru: 'Черновик', en: 'Draft' } },
    on_approval: { variant: 'warning', label: { ru: 'Согласование', en: 'Approval' } },
    active: { variant: 'success', label: { ru: 'Действует', en: 'Active' } },
    completed: { variant: 'info', label: { ru: 'Исполнен', en: 'Completed' } },
    terminated: { variant: 'danger', label: { ru: 'Расторгнут', en: 'Terminated' } },
  },
  calculation: {
    draft: { variant: 'default' },
    sent: { variant: 'warning' },
    approved: { variant: 'success' },
    invoiced: { variant: 'info' },
    rejected: { variant: 'danger' },
  },
  invoice: {
    draft: { variant: 'default' },
    issued: { variant: 'info' },
    sent: { variant: 'warning' },
    partially_paid: { variant: 'warning' },
    paid: { variant: 'success' },
    overdue: { variant: 'danger' },
    cancelled: { variant: 'default' },
  },
  payment: {
    pending: { variant: 'warning' },
    partial: { variant: 'warning' },
    paid: { variant: 'success' },
    overdue: { variant: 'danger' },
  },
  expense: {
    pending: { variant: 'warning' },
    approved: { variant: 'success' },
    reimbursed: { variant: 'info' },
    rejected: { variant: 'danger' },
  },
  timeEntry: {
    logged: { variant: 'default' },
    submitted: { variant: 'warning' },
    approved: { variant: 'success' },
  },
  employee: {
    active: { variant: 'success', label: { ru: 'В штате', en: 'Active' } },
    remote: { variant: 'info', label: { ru: 'Удалённо', en: 'Remote' } },
    vacation: { variant: 'warning', label: { ru: 'Отпуск', en: 'Vacation' } },
    onboarding: { variant: 'primary', label: { ru: 'Адаптация', en: 'Onboarding' } },
  },
};

/** Resolve the display label for a domain+status in the given language. */
export function statusLabel(
  domain: StatusDomain,
  status: string,
  lang: 'ru' | 'en',
  translation: Record<string, unknown>
): string {
  const token = STATUS_TOKENS[domain]?.[status];
  if (!token) return status;
  if (token.i18nGroup) {
    const group = translation[token.i18nGroup] as Record<string, string> | undefined;
    return group?.[status] ?? status;
  }
  return token.label ? token.label[lang] : status;
}

/** Resolve the badge variant for a domain+status (defaults to neutral). */
export function statusVariant(domain: StatusDomain, status: string): StatusBadgeVariant {
  return STATUS_TOKENS[domain]?.[status]?.variant ?? 'neutral';
}
