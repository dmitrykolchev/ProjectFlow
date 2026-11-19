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
  | 'paymentDirection'
  | 'expense'
  | 'timeEntry'
  | 'employee'
  | 'document'
  | 'requirement'
  | 'requirementPriority'
  | 'reminder'
  | 'reminderPriority';

export interface StatusToken {
  /** Badge variant used by app-status-chip / app-badge. */
  variant: StatusBadgeVariant;
  /** Path in the translation tree, e.g. ['status'] or ['calculations','statuses']. */
  i18nPath?: string[];
  /** Hardcoded ru/en label pair (used when the domain has no i18n group). */
  label?: { ru: string; en: string };
}

export const STATUS_TOKENS: Record<StatusDomain, Record<string, StatusToken>> = {
  task: {
    backlog: { variant: 'default', i18nPath: ['status'] },
    todo: { variant: 'info', i18nPath: ['status'] },
    in_progress: { variant: 'warning', i18nPath: ['status'] },
    review: { variant: 'primary', i18nPath: ['status'] },
    done: { variant: 'success', i18nPath: ['status'] },
  },
  priority: {
    low: { variant: 'default', i18nPath: ['priority'] },
    medium: { variant: 'info', i18nPath: ['priority'] },
    high: { variant: 'warning', i18nPath: ['priority'] },
    urgent: { variant: 'danger', i18nPath: ['priority'] },
  },
  project: {
    planning: { variant: 'info', i18nPath: ['projectStatuses'] },
    active: { variant: 'success', i18nPath: ['projectStatuses'] },
    on_hold: { variant: 'warning', i18nPath: ['projectStatuses'] },
    completed: { variant: 'primary', i18nPath: ['projectStatuses'] },
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
    draft: { variant: 'default', i18nPath: ['calculations', 'statuses'] },
    sent: { variant: 'warning', i18nPath: ['calculations', 'statuses'] },
    approved: { variant: 'success', i18nPath: ['calculations', 'statuses'] },
    invoiced: { variant: 'info', i18nPath: ['calculations', 'statuses'] },
    rejected: { variant: 'danger', i18nPath: ['calculations', 'statuses'] },
  },
  invoice: {
    draft: { variant: 'default', i18nPath: ['invoices', 'statuses'] },
    issued: { variant: 'info', i18nPath: ['invoices', 'statuses'] },
    sent: { variant: 'warning', i18nPath: ['invoices', 'statuses'] },
    partially_paid: { variant: 'warning', i18nPath: ['invoices', 'statuses'] },
    paid: { variant: 'success', i18nPath: ['invoices', 'statuses'] },
    overdue: { variant: 'danger', i18nPath: ['invoices', 'statuses'] },
    cancelled: { variant: 'default', i18nPath: ['invoices', 'statuses'] },
  },
  payment: {
    pending: { variant: 'warning' },
    partial: { variant: 'warning' },
    paid: { variant: 'success' },
    overdue: { variant: 'danger' },
  },
  paymentDirection: {
    incoming: { variant: 'success', i18nPath: ['payments', 'directions'] },
    outgoing: { variant: 'warning', i18nPath: ['payments', 'directions'] },
  },
  expense: {
    draft: { variant: 'default', i18nPath: ['expenses', 'statuses'] },
    pending: { variant: 'warning', i18nPath: ['expenses', 'statuses'] },
    approved: { variant: 'success', i18nPath: ['expenses', 'statuses'] },
    reimbursed: { variant: 'info', i18nPath: ['expenses', 'statuses'] },
    rejected: { variant: 'danger', i18nPath: ['expenses', 'statuses'] },
  },
  timeEntry: {
    logged: { variant: 'default', i18nPath: ['timeTracking', 'statuses'] },
    submitted: { variant: 'warning', i18nPath: ['timeTracking', 'statuses'] },
    approved: { variant: 'success', i18nPath: ['timeTracking', 'statuses'] },
  },
  employee: {
    active: { variant: 'success', label: { ru: 'В штате', en: 'Active' } },
    remote: { variant: 'info', label: { ru: 'Удалённо', en: 'Remote' } },
    vacation: { variant: 'warning', label: { ru: 'Отпуск', en: 'Vacation' } },
    onboarding: { variant: 'primary', label: { ru: 'Адаптация', en: 'Onboarding' } },
  },
  document: {
    draft: { variant: 'default', i18nPath: ['documents', 'statuses'] },
    review: { variant: 'warning', i18nPath: ['documents', 'statuses'] },
    approved: { variant: 'success', i18nPath: ['documents', 'statuses'] },
    archived: { variant: 'default', i18nPath: ['documents', 'statuses'] },
  },
  requirement: {
    draft: { variant: 'default', i18nPath: ['requirements', 'statuses'] },
    approved: { variant: 'info', i18nPath: ['requirements', 'statuses'] },
    in_progress: { variant: 'warning', i18nPath: ['requirements', 'statuses'] },
    implemented: { variant: 'primary', i18nPath: ['requirements', 'statuses'] },
    verified: { variant: 'success', i18nPath: ['requirements', 'statuses'] },
  },
  requirementPriority: {
    low: { variant: 'default', i18nPath: ['requirements', 'priorities'] },
    medium: { variant: 'info', i18nPath: ['requirements', 'priorities'] },
    high: { variant: 'warning', i18nPath: ['requirements', 'priorities'] },
    critical: { variant: 'danger', i18nPath: ['requirements', 'priorities'] },
  },
  reminder: {
    active: { variant: 'primary', i18nPath: ['reminders', 'statuses'] },
    snoozed: { variant: 'warning', i18nPath: ['reminders', 'statuses'] },
    completed: { variant: 'success', i18nPath: ['reminders', 'statuses'] },
    paused: { variant: 'default', i18nPath: ['reminders', 'statuses'] },
    cancelled: { variant: 'danger', i18nPath: ['reminders', 'statuses'] },
  },
  reminderPriority: {
    low: { variant: 'default', i18nPath: ['priority'] },
    medium: { variant: 'info', i18nPath: ['priority'] },
    high: { variant: 'warning', i18nPath: ['priority'] },
    urgent: { variant: 'danger', i18nPath: ['priority'] },
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
  if (token.i18nPath) {
    let node: unknown = translation;
    for (const key of token.i18nPath) {
      node = (node as Record<string, unknown>)?.[key];
      if (!node) return status;
    }
    return (node as Record<string, string>)[status] ?? status;
  }
  return token.label ? token.label[lang] : status;
}

/** Resolve the badge variant for a domain+status (defaults to neutral). */
export function statusVariant(domain: StatusDomain, status: string): StatusBadgeVariant {
  return STATUS_TOKENS[domain]?.[status]?.variant ?? 'neutral';
}
