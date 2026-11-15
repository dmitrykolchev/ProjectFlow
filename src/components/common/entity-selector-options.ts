import { getTranslation } from '../../i18n';
import { store } from '../../state/store';
import { Company, Contract, Counterparty, Project, Task, User } from '../../types';
import { EntitySelectorOption } from './app-entity-selector/app-entity-selector';
import { formatMoney } from './app-money/app-money';

type TranslationDict = ReturnType<typeof getTranslation>;

const TASK_STATUS_COLORS: Record<Task['status'], string> = {
  backlog: '#64748b',
  todo: '#0284c7',
  in_progress: '#f59e0b',
  review: '#8b5cf6',
  done: '#10b981',
};

const CONTRACT_STATUS_COLORS: Record<Contract['status'], string> = {
  draft: '#64748b',
  on_approval: '#f59e0b',
  active: '#10b981',
  completed: '#0284c7',
  terminated: '#ef4444',
};

const COUNTERPARTY_STATUS_COLORS: Record<Counterparty['status'], string> = {
  active: '#10b981',
  pending: '#f59e0b',
  blocked: '#ef4444',
};

export function mapProjectOptions(
  projects: Project[],
  t: TranslationDict
): EntitySelectorOption[] {
  return projects.map((p) => {
    const company = store.companies.find((c) => c.id === p.companyId);
    const cp = store.counterparties.find((c) => c.id === p.counterpartyId);
    const subtitleParts = [
      company?.name,
      cp?.name || t.viewTexts.projects.optionInternalProject,
    ].filter(Boolean);
    return {
      value: p.id,
      code: p.key,
      label: p.name,
      subtitle: subtitleParts.join(' · '),
      meta: p.budget ? formatMoney(p.budget, 'RUB') : undefined,
      color: p.color,
      keywords: [p.key, company?.name || '', cp?.name || '', p.dueDate].filter(Boolean),
    };
  });
}

export function mapUserOptions(
  users: User[],
  t: TranslationDict
): EntitySelectorOption[] {
  const locale = t.common.locale;
  return users.map((u) => {
    const company = store.companies.find((c) => c.id === u.companyId);
    const subtitleParts = [u.role, u.department, company?.name].filter(Boolean);
    return {
      value: u.id,
      label: u.name,
      avatar: u.avatar,
      subtitle: subtitleParts.join(' · '),
      meta: u.hourlyRate
        ? `${u.hourlyRate.toLocaleString(locale)} ${t.viewTexts.employees.rateUnit}`
        : undefined,
      keywords: [u.email, u.phone || '', u.location || '', u.department || '', u.role].filter(Boolean),
    };
  });
}

export function mapTaskOptions(
  tasks: Task[],
  t: TranslationDict
): EntitySelectorOption[] {
  return tasks.map((tk) => {
    const proj = store.projects.find((p) => p.id === tk.projectId);
    const assignee = store.users.find((u) => u.id === tk.assigneeId);
    const subtitleParts = [
      proj ? `[${proj.key}] ${proj.name}` : undefined,
      assignee?.name,
    ].filter(Boolean);
    return {
      value: tk.id,
      code: tk.id,
      label: tk.title,
      subtitle: subtitleParts.join(' · '),
      meta: `${tk.loggedHours}/${tk.estimatedHours}${t.viewTexts.timeTracking.hoursUnit}`,
      badge: t.status[tk.status],
      badgeColor: TASK_STATUS_COLORS[tk.status],
      color: proj?.color,
      keywords: [...tk.tags, tk.id, proj?.key || '', proj?.name || '', assignee?.name || ''].filter(Boolean),
    };
  });
}

export function mapCounterpartyOptions(
  counterparties: Counterparty[],
  t: TranslationDict
): EntitySelectorOption[] {
  const statusLabels: Record<Counterparty['status'], string> = {
    active: t.viewTexts.counterparties.statusActive,
    pending: t.viewTexts.counterparties.statusPending,
    blocked: t.viewTexts.counterparties.statusBlocked,
  };
  const typeLabels: Record<Counterparty['type'], string> = {
    client: t.viewTexts.counterparties.typeClient,
    vendor: t.viewTexts.counterparties.typeVendor,
    partner: t.viewTexts.counterparties.typePartner,
    contractor: t.viewTexts.counterparties.typeContractor,
  };

  return counterparties.map((cp) => ({
    value: cp.id,
    code: `${t.viewTexts.counterparties.thInn} ${cp.inn}`,
    label: cp.name,
    subtitle: [typeLabels[cp.type], cp.city, cp.contactPerson].filter(Boolean).join(' · '),
    meta: `★ ${cp.rating.toFixed(1)}`,
    badge: statusLabels[cp.status],
    badgeColor: COUNTERPARTY_STATUS_COLORS[cp.status],
    keywords: [cp.legalName, cp.inn, cp.kpp || '', cp.email, cp.phone, cp.city, cp.contactPerson].filter(Boolean),
  }));
}

export function mapCompanyOptions(
  companies: Company[],
  t: TranslationDict
): EntitySelectorOption[] {
  return companies.map((c) => ({
    value: c.id,
    code: `${t.viewTexts.counterparties.thInn} ${c.inn}`,
    label: c.name,
    subtitle: [c.industry, c.city, c.legalName].filter(Boolean).join(' · '),
    badge:
      c.status === 'active'
        ? t.viewTexts.companies.filterActive
        : t.viewTexts.companies.filterInactive,
    badgeColor: c.status === 'active' ? '#10b981' : '#64748b',
    keywords: [c.legalName, c.inn, c.kpp || '', c.city, c.industry, c.email].filter(Boolean),
  }));
}

export function mapContractOptions(
  contracts: Contract[],
  t: TranslationDict
): EntitySelectorOption[] {
  const statusLabels: Record<Contract['status'], string> = {
    draft: t.viewTexts.contracts.statusDraft,
    on_approval: t.viewTexts.contracts.statusOnApproval,
    active: t.viewTexts.contracts.statusActive,
    completed: t.viewTexts.contracts.statusCompleted,
    terminated: t.viewTexts.contracts.statusTerminated,
  };

  return contracts.map((ctr) => {
    const cp = store.counterparties.find((c) => c.id === ctr.counterpartyId);
    const company = store.companies.find((c) => c.id === ctr.companyId);
    return {
      value: ctr.id,
      code: ctr.number,
      label: ctr.title,
      subtitle: [cp?.name, company?.name].filter(Boolean).join(' · '),
      meta: formatMoney(ctr.amount, ctr.currency),
      badge: statusLabels[ctr.status],
      badgeColor: CONTRACT_STATUS_COLORS[ctr.status],
      keywords: [ctr.number, cp?.name || '', company?.name || '', ctr.startDate, ctr.endDate].filter(Boolean),
    };
  });
}
