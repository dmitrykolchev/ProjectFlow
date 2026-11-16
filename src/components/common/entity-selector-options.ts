import { getTranslation } from '../../i18n';
import { store } from '../../state/store';
import {
  Company,
  Contract,
  Counterparty,
  DocumentItem,
  KnowledgeArticle,
  Project,
  ProjectRequirement,
  Task,
  User,
} from '../../types';
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

const DOC_STATUS_COLORS: Record<DocumentItem['status'], string> = {
  draft: '#64748b',
  review: '#f59e0b',
  approved: '#10b981',
  archived: '#475569',
};

export function mapDocumentOptions(
  documents: DocumentItem[],
  t: TranslationDict
): EntitySelectorOption[] {
  return documents.map((doc) => {
    const proj = doc.projectId ? store.projects.find((p) => p.id === doc.projectId) : undefined;
    const comp = doc.companyId ? store.companies.find((c) => c.id === doc.companyId) : undefined;
    const subtitleParts = [
      doc.fileName,
      proj ? `[${proj.key}] ${proj.name}` : comp?.name,
    ].filter(Boolean);
    return {
      value: doc.id,
      code: doc.extension.toUpperCase(),
      label: doc.title,
      subtitle: subtitleParts.join(' · '),
      meta: `v${doc.version}`,
      badge: t.documents.categories[doc.category],
      badgeColor: DOC_STATUS_COLORS[doc.status],
      keywords: [doc.fileName, doc.description, ...doc.tags, proj?.name || '', comp?.name || ''].filter(Boolean),
    };
  });
}

const REQ_STATUS_COLORS: Record<ProjectRequirement['status'], string> = {
  draft: '#64748b',
  approved: '#0284c7',
  in_progress: '#f59e0b',
  implemented: '#8b5cf6',
  verified: '#10b981',
};

export function mapRequirementOptions(
  requirements: ProjectRequirement[],
  t: TranslationDict
): EntitySelectorOption[] {
  return requirements.map((req) => {
    const proj = store.projects.find((p) => p.id === req.projectId);
    const typeLabel =
      req.type === 'functional' ? t.requirements.frShort : t.requirements.nfrShort;
    return {
      value: req.id,
      code: req.code,
      label: req.title,
      subtitle: [typeLabel, req.category, proj ? `[${proj.key}]` : undefined].filter(Boolean).join(' · '),
      badge: t.requirements.statuses[req.status],
      badgeColor: REQ_STATUS_COLORS[req.status],
      color: req.type === 'functional' ? '#0284c7' : '#8b5cf6',
      keywords: [req.code, req.category, req.description, ...req.acceptanceCriteria].filter(Boolean),
    };
  });
}

export function mapKnowledgeOptions(
  articles: KnowledgeArticle[],
  t: TranslationDict
): EntitySelectorOption[] {
  return articles.map((art) => {
    const proj = art.projectId ? store.projects.find((p) => p.id === art.projectId) : undefined;
    const comp = art.companyId ? store.companies.find((c) => c.id === art.companyId) : undefined;
    return {
      value: art.id,
      code: t.knowledgeBase.categories[art.category],
      label: art.title,
      subtitle: [proj ? `[${proj.key}] ${proj.name}` : comp?.name, art.summary].filter(Boolean).join(' · '),
      badge: t.knowledgeBase.statuses[art.status],
      badgeColor: art.status === 'verified' ? '#10b981' : '#6366f1',
      keywords: [...art.tags, art.summary, proj?.name || '', comp?.name || ''].filter(Boolean),
    };
  });
}

