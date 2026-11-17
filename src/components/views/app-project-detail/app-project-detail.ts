import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { ExpenseCategory, Project, ProjectRole, ProjectStatus, TaskStatus, TimeEntryCategory } from '../../../types';
import {
  iconBookOpen,
  iconChevronLeft,
  iconClock,
  iconEdit,
  iconFileText,
  iconKanban,
  iconMessageSquare,
  iconPlus,
  iconTrash,
  iconUsers,
  iconWallet,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-input/app-input';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-number-input/app-number-input';
import '../../common/app-select/app-select';
import '../../common/app-entity-selector/app-entity-selector';
import { mapTaskOptions, mapUserOptions } from '../../common/entity-selector-options';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-project-form/app-project-form';
import '../../dashboard/app-project-overview/app-project-overview';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-project-requirements/app-project-requirements';
import '../../common/app-entity-emblem/app-entity-emblem';
import styles from './app-project-detail.css';
import { eventValue } from '../../common/event-value';

const ALL_PROJECT_ROLES: ProjectRole[] = [
  'pm',
  'tech_lead',
  'architect',
  'developer',
  'designer',
  'qa',
  'analyst',
  'devops',
];

const ROLE_COLORS: Record<ProjectRole, string> = {
  pm: '#f59e0b',
  tech_lead: '#8b5cf6',
  architect: '#ec4899',
  developer: '#6366f1',
  designer: '#06b6d4',
  qa: '#10b981',
  analyst: '#3b82f6',
  devops: '#f97316',
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#64748b',
  todo: '#3b82f6',
  in_progress: '#6366f1',
  review: '#f59e0b',
  done: '#10b981',
};

@customElement('app-project-detail')
export class AppProjectDetail extends LitElement {
  @state() private projects: Project[] = store.projects;
  @state() private detailProjectId: string = store.detailProjectId || store.projects[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private roleFilterMode: 'assigned' | 'all' = 'all';

  @state() private addMemberUserId: string = store.users[0]?.id || '';
  @state() private addMemberRole: ProjectRole = 'developer';
  @state() private addMemberAllocation: number = 50;

  // Edit modal
  @state() private modalOpen = false;

  @state() private confirmDeleteOpen = false;
  @state() private pendingRemoveMember: { userId: string; role: ProjectRole } | null = null;

  // Quick Project Expense Modal
  @state() private expenseModalOpen = false;
  @state() private expTitle = '';
  @state() private expTaskId = '';
  @state() private expCategory: ExpenseCategory = 'infrastructure';
  @state() private expAmount = 25000;
  @state() private expVendor = '';
  @state() private expError = '';

  // Quick Project Time Modal
  @state() private timeModalOpen = false;
  @state() private timeTaskId = '';
  @state() private timeUserId = '';
  @state() private timeHours = 2;
  @state() private timeCategory: TimeEntryCategory = 'development';
  @state() private timeDesc = '';

  @state() private timeEntriesVersion = store.timeEntries.length;
  @state() private expensesVersion = store.expenses.length;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => this.syncState());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.projects = store.projects;
    this.currentLang = store.customization.language;
    const candidateId = store.detailProjectId || this.detailProjectId;
    if (candidateId && this.projects.some((p) => p.id === candidateId)) {
      this.detailProjectId = candidateId;
    } else {
      this.detailProjectId = this.projects[0]?.id || '';
    }
    if (!store.users.some((u) => u.id === this.addMemberUserId)) {
      this.addMemberUserId = store.users[0]?.id || '';
    }
    this.timeEntriesVersion = store.timeEntries.length;
    this.expensesVersion = store.expenses.length;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const proj = this.projects.find((p) => p.id === this.detailProjectId) || null;

    if (!proj) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.projectDetail.emptyProjectNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('projects')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.projectDetail.backToProjects}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const company = store.companies.find((c) => c.id === proj.companyId);
    const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
    const linkedContracts = store.contracts.filter((c) => c.projectId === proj.id);
    const projectTasks = store.tasks.filter((task) => task.projectId === proj.id);
    const projectTimeEntries = store.timeEntries.filter((te) => te.projectId === proj.id);
    const projectExpenses = store.expenses.filter((ex) => ex.projectId === proj.id);
    const projectHoursTotal = projectTimeEntries.reduce((s, e) => s + e.hours, 0);
    const projectDirectExpensesRub = Math.round(
      projectExpenses
        .filter((e) => e.status !== 'rejected')
        .reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 96 : e.currency === 'EUR' ? e.amount * 104 : e.amount), 0)
    );
    const members = proj.members || [];
    const uniqueUsersCount = new Set(members.map((m) => m.userId)).size;
    const statusKey = (proj.status || 'active') as ProjectStatus;
    void this.timeEntriesVersion;
    void this.expensesVersion;

    const projectSwitchOptions = this.projects.map((p) => ({
      value: p.id,
      label: `[${p.key}] ${p.name}`,
      color: p.color,
    }));

    const userOptions = mapUserOptions(store.users, t);

    const roleOptions = ALL_PROJECT_ROLES.map((role) => ({
      value: role,
      label: t.projectRoles[role],
      color: ROLE_COLORS[role],
    }));

    const visibleRoles =
      this.roleFilterMode === 'assigned'
        ? ALL_PROJECT_ROLES.filter((role) => members.some((m) => m.role === role))
        : ALL_PROJECT_ROLES;

    const taskStatuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

    return html`
      <div class="page-shell">
        <!-- Top Navigation & Project Switcher -->
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('projects')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.projectDetail.backToProjects}</span>
            </app-button>

            <div class="project-switcher">
              <app-select
                size="sm"
                .value="${proj.id}"
                .options="${projectSwitchOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.openProjectDetail(eventValue(e))}"
              ></app-select>
            </div>
          </div>

          <div class="nav-actions">
            <app-button
              size="sm"
              variant="outline"
              @click="${() => store.openProjectChat(proj.id)}"
            >
              <span slot="icon-start">${iconMessageSquare(15)}</span>
              <span>${t.viewTexts.projectDetail.chatButton}</span>
            </app-button>

            <app-button
              size="sm"
              variant="outline"
              @click="${() => store.openKnowledgeBase({ scope: 'project', projectId: proj.id })}"
            >
              <span slot="icon-start">${iconBookOpen(15)}</span>
              <span>
                ${t.navigation.knowledgeBase} (${store.knowledgeArticles.filter((a) => a.projectId === proj.id).length})
              </span>
            </app-button>

            <app-button
              size="sm"
              variant="outline"
              @click="${() => {
                store.selectProject(proj.id);
                store.setActiveView('kanban');
              }}"
            >
              <span slot="icon-start">${iconKanban()}</span>
              <span>${t.viewTexts.projectDetail.kanbanButton}</span>
            </app-button>

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openEditModal(proj)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <app-button
              class="danger-action"
              size="xs"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <!-- Project Hero Overview -->
        <section class="overview-card">
          <div class="overview-head">
            <div class="hero-identity">
              <app-entity-emblem entity="project" size="lg" .color="${proj.color}"></app-entity-emblem>
              <div class="title-block">
                <div class="title-row">
                  <app-entity-emblem entity="project" variant="pill" size="sm" .color="${proj.color}"></app-entity-emblem>
                  <span class="color-dot-lg" style="background: ${proj.color};"></span>
                  <span class="proj-key">${proj.key}</span>
                  <h1 class="proj-title">${proj.name}</h1>
                  <app-status-chip domain="project" status="${proj.status || 'active'}" appearance="soft"></app-status-chip>
                </div>
                <p class="proj-desc">${proj.description || '—'}</p>
              </div>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>${t.viewTexts.projectDetail.progressLabel}</span>
              <span>${projectTasks.filter((tk) => tk.status === 'done').length} / ${projectTasks.length} ${t.viewTexts.projectDetail.tasksDoneSuffix}</span>
            </div>
            <app-progress-bar show-label color="${proj.color}" value="${proj.progress}"></app-progress-bar>
          </div>

          <div class="meta-strip">
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaCompany}</span>
              ${company
                ? html`
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCompanyDetail(company.id)}"
                    >
                      ${company.name}
                    </app-link>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaCounterparty}</span>
              ${counterparty
                ? html`
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCounterpartyDetail(counterparty.id)}"
                    >
                      ${counterparty.name}
                    </app-link>
                  `
                : html`<span class="meta-val">${t.viewTexts.projectDetail.internalProject}</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaBudget}</span>
              <span class="meta-val mono">
                ${proj.budget ? `${proj.budget.toLocaleString(t.common.locale)} ₽` : '—'}
              </span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaDueDate}</span>
              <span class="meta-val mono">${proj.dueDate}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaContracts}</span>
              <span class="meta-val mono">${linkedContracts.length}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaTeam}</span>
              <span class="meta-val mono">
                ${uniqueUsersCount} ${t.viewTexts.projectDetail.peopleSuffix} · ${members.length} ${t.viewTexts.projectDetail.rolesSuffix}
              </span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaLoggedTime}</span>
              <span class="meta-val mono">${projectHoursTotal.toFixed(1)}${t.viewTexts.projectDetail.timeUnit}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.projectDetail.metaDirectExpenses}</span>
              <span class="meta-val mono">${projectDirectExpensesRub.toLocaleString(t.common.locale)} ₽</span>
            </div>
            ${proj.specDocumentId
              ? (() => {
                  const specDoc = store.documents.find((d) => d.id === proj.specDocumentId);
                  if (!specDoc) return '';
                  return html`
                    <div class="meta-box">
                      <span class="meta-label">${t.viewTexts.projectDetail.specDocumentLabel}</span>
                      <app-link
                        class="link-btn"
                        size="md"
                        variant="primary"
                        @click="${() =>
                          store.openDocuments({ scope: specDoc.scope, projectId: proj.id })}"
                      >
                        ${specDoc.title}
                      </app-link>
                    </div>
                  `;
                })()
              : ''}
          </div>
        </section>

        <!-- D3 Project Overview Charts (Progress, Hours Logged, Budget Utilization) -->
        <app-project-overview
          projectId="${proj.id}"
          ?hideProjectSelector="${true}"
        ></app-project-overview>

        <!-- Functional & Non-Functional Requirements + AI Task Decomposition -->
        <app-project-requirements .projectId="${proj.id}"></app-project-requirements>

        <!-- Full-Width Spacious Team by Roles Section -->
        <app-section-card title="${t.projectDetail.teamByRoles}" subtitle="(${members.length})">
          <span slot="icon">${iconUsers(19)}</span>
          <div slot="actions">
            <app-segmented-switch
              size="sm"
              .value="${this.roleFilterMode}"
              .options="${[
                { value: 'all', label: t.viewTexts.projectDetail.filterAllRoles },
                { value: 'assigned', label: t.viewTexts.projectDetail.filterAssigned },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.roleFilterMode = eventValue(e) as 'assigned' | 'all')}"
            ></app-segmented-switch>
          </div>

          <div class="add-member-bar">
            <div>
              <app-entity-selector
                label="${t.viewTexts.projectDetail.labelEmployee}"
                size="sm"
                .value="${this.addMemberUserId}"
                .options="${userOptions}"
                @change="${(e: CustomEvent<{ value: string }>) => (this.addMemberUserId = eventValue(e))}"
              ></app-entity-selector>
            </div>
            <div>
              <app-select
                label="${t.viewTexts.projectDetail.labelProjectRole}"
                size="sm"
                .value="${this.addMemberRole}"
                .options="${roleOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.addMemberRole = eventValue(e) as ProjectRole)}"
              ></app-select>
            </div>
            <div>
              <app-number-input
                label="${t.viewTexts.projectDetail.labelAllocation}"
                size="sm"
                .value="${this.addMemberAllocation}"
                min="5"
                max="100"
                step="5"
                unit="%"
                @change="${(e: CustomEvent<{ value: number }>) => (this.addMemberAllocation = eventValue(e))}"
              ></app-number-input>
            </div>
            <app-button
              variant="primary"
              size="sm"
              @click="${() => this.handleAddMember(proj.id)}"
            >
              <span slot="icon-start">${iconPlus(14)}</span>
              <span>${t.viewTexts.projectDetail.assignButton}</span>
            </app-button>
          </div>

          <div class="roles-groups">
            ${visibleRoles.length === 0
              ? html`<app-empty-state compact title="${t.viewTexts.projectDetail.emptyNoMembers}"></app-empty-state>`
              : visibleRoles.map((role) => {
                  const roleMembers = members.filter((m) => m.role === role);
                  const totalRoleAlloc = roleMembers.reduce((s, m) => s + m.allocation, 0);

                  return html`
                    <div class="role-group ${roleMembers.length === 0 ? 'is-empty' : ''}">
                      <div class="role-group-head">
                        <div class="role-group-title">
                          <span class="role-dot" style="background: ${ROLE_COLORS[role]};"></span>
                          <span>${t.projectRoles[role]}</span>
                          <app-badge
                            variant="${roleMembers.length > 0 ? 'primary' : 'default'}"
                            appearance="soft"
                            size="sm"
                          >
                            ${roleMembers.length}
                          </app-badge>
                        </div>
                        <div class="role-group-meta">
                          ${roleMembers.length > 0
                            ? html`<span class="mono">${t.viewTexts.projectDetail.totalLabel}: ${totalRoleAlloc}%</span>`
                            : html`
                                <app-button
                                  size="sm"
                                  variant="ghost"
                                  @click="${() => (this.addMemberRole = role)}"
                                >
                                  ${t.viewTexts.projectDetail.selectRoleButton}
                                </app-button>
                              `}
                        </div>
                      </div>

                      ${roleMembers.length > 0
                        ? html`
                            <div class="members-list">
                              ${roleMembers.map((member) => {
                                const user = store.users.find((u) => u.id === member.userId);
                                if (!user) return '';
                                return html`
                                  <div class="member-row">
                                    <div class="member-person">
                                      <div
                                        class="avatar"
                                        style="cursor: pointer;"
                                        @click="${() => store.openEmployeeDetail(user.id)}"
                                      >
                                        ${user.avatar}
                                      </div>
                                      <div class="member-info">
                                        <div class="member-name">
                                          <app-link
                                            class="link-btn member-link"
                                            size="md"
                                            variant="primary"
                                            @click="${() => store.openEmployeeDetail(user.id)}"
                                          >
                                            ${user.name}
                                          </app-link>
                                        </div>
                                        <div class="member-sub">
                                          ${user.role}${user.department ? ` · ${user.department}` : ''} · ${t.viewTexts.projectDetail.sinceWord} ${member.joinedAt}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <app-select
                                        size="sm"
                                        .value="${member.role}"
                                        .options="${roleOptions}"
                                        @change="${(e: CustomEvent<{ value: string }>) => {
                                          const nextRole = eventValue(e) as ProjectRole;
                                          if (nextRole !== member.role) {
                                            store.updateProjectMemberRole(
                                              proj.id,
                                              member.userId,
                                              member.role,
                                              nextRole,
                                              member.allocation
                                            );
                                          }
                                        }}"
                                      ></app-select>
                                    </div>

                                    <div>
                                      <app-number-input
                                        size="sm"
                                        .value="${member.allocation}"
                                        min="5"
                                        max="100"
                                        step="5"
                                        unit="%"
                                        @change="${(e: CustomEvent<{ value: number }>) => {
                                          store.updateProjectMemberRole(
                                            proj.id,
                                            member.userId,
                                            member.role,
                                            member.role,
                                            eventValue(e)
                                          );
                                        }}"
                                      ></app-number-input>
                                    </div>

                                    <app-button
                                      class="danger-action"
                                      size="xs"
                                      variant="icon"
                                      title="${t.viewTexts.projectDetail.removeFromRoleTitle}"
                                      @click="${() =>
                                        (this.pendingRemoveMember = { userId: member.userId, role: member.role })}"
                                    >
                                      <span slot="start">${iconTrash(14)}</span>
                                    </app-button>
                                  </div>
                                `;
                              })}
                            </div>
                          `
                        : ''}
                    </div>
                  `;
                })}
          </div>
        </app-section-card>

        <!-- Secondary Context: Tasks Overview & Linked Contracts -->
        <div class="secondary-grid">
          <app-section-card title="${t.projectDetail.tasksSummary}" subtitle="(${projectTasks.length})">
            <span slot="icon">${iconKanban()}</span>
            <div slot="actions">
              <app-button
                size="sm"
                variant="ghost"
                @click="${() => {
                  store.selectProject(proj.id);
                  store.setActiveView('grid');
                }}"
              >
                ${t.viewTexts.projectDetail.taskGridButton}
              </app-button>
            </div>

            <div class="status-bars">
              ${taskStatuses.map((st) => {
                const count = projectTasks.filter((tk) => tk.status === st).length;
                const pct = projectTasks.length ? Math.round((count / projectTasks.length) * 100) : 0;
                return html`
                  <div class="status-bar-row">
                    <span class="status-name">${t.status[st]}</span>
                    <div class="status-track">
                      <div
                        class="status-fill"
                        style="width: ${pct}%; background: ${TASK_STATUS_COLORS[st]};"
                      ></div>
                    </div>
                    <span class="status-count">${count}</span>
                  </div>
                `;
              })}
            </div>
          </app-section-card>

          <app-section-card title="${t.projectDetail.linkedContracts}" subtitle="(${linkedContracts.length})">
            <span slot="icon">${iconFileText(18)}</span>
            <div slot="actions">
              <app-button
                size="sm"
                variant="ghost"
                @click="${() => store.setActiveView('contracts')}"
              >
                ${t.viewTexts.projectDetail.allContractsLabel}
              </app-button>
            </div>

            ${linkedContracts.length === 0
              ? html`<app-empty-state compact title="${t.projectDetail.noContracts}"></app-empty-state>`
              : html`
                  <div class="contracts-list">
                    ${linkedContracts.map((ctr) => {
                      const cp = store.counterparties.find((c) => c.id === ctr.counterpartyId);
                      const symbol = ctr.currency === 'USD' ? '$' : ctr.currency === 'EUR' ? '€' : '₽';
                      return html`
                        <div
                          class="contract-row"
                          style="cursor: pointer;"
                          @click="${() => store.openContractDetail(ctr.id)}"
                        >
                          <div class="contract-main">
                            <div class="contract-num-title">${ctr.number} — ${ctr.title}</div>
                            <div class="contract-sub">
                              ${cp?.name || '—'} · ${ctr.startDate} → ${ctr.endDate}
                            </div>
                          </div>
                          <div class="contract-right">
                            <span class="mono" style="font-weight: 700; font-size: 0.85rem;">
                              ${ctr.amount.toLocaleString(t.common.locale)} ${symbol}
                            </span>
                            <app-badge
                              variant="${ctr.status === 'active' ? 'success' : ctr.status === 'on_approval' ? 'warning' : 'default'}"
                              appearance="soft"
                              size="sm"
                            >
                              ${ctr.status}
                            </app-badge>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </app-section-card>
        </div>

        <!-- Time Tracking & Expenses Panels for Project -->
        <div class="secondary-grid">
          <app-section-card title="${t.viewTexts.projectDetail.timeSectionTitle}" subtitle="(${projectHoursTotal.toFixed(1)}${t.viewTexts.projectDetail.timeUnit})">
            <span slot="icon">${iconClock(18)}</span>
            <div slot="actions" class="section-actions-inline">
              <app-button
                size="sm"
                variant="secondary"
                @click="${() => this.openQuickTimeModal(proj.id)}"
              >
                <span slot="icon-start">${iconPlus(13)}</span>
                <span>${t.viewTexts.projectDetail.logButton}</span>
              </app-button>
              <app-button
                size="sm"
                variant="ghost"
                @click="${() => store.setActiveView('time-tracking')}"
              >
                ${t.viewTexts.projectDetail.journalButton}
              </app-button>
            </div>

            ${projectTimeEntries.length === 0
              ? html`<app-empty-state compact title="${t.viewTexts.projectDetail.emptyNoTimeEntries}"></app-empty-state>`
              : html`
                  <div class="contracts-list">
                    ${projectTimeEntries.slice(0, 5).map((te) => {
                      const user = store.users.find((u) => u.id === te.userId);
                      return html`
                        <div class="contract-row">
                          <div class="contract-main">
                            <div class="contract-num-title">
                              <span class="mono" style="color: var(--accent-primary);">${te.taskId}</span>
                              · ${te.description || t.timeTracking.categories[te.category]}
                            </div>
                            <div class="contract-sub">${te.date} · ${user?.name || te.userId}</div>
                          </div>
                          <div class="contract-right">
                            <span class="mono" style="font-weight: 700; font-size: 0.85rem;">${te.hours.toFixed(1)}${t.viewTexts.projectDetail.timeUnit}</span>
                            <app-status-chip
                              domain="timeEntry"
                              status="${te.status}"
                              appearance="soft"
                              size="sm"
                            ></app-status-chip>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </app-section-card>

          <app-section-card title="${t.viewTexts.projectDetail.expensesSectionTitle}" subtitle="(${projectDirectExpensesRub.toLocaleString(t.common.locale)} ₽)">
            <span slot="icon">${iconWallet(18)}</span>
            <div slot="actions" class="section-actions-inline">
              <app-button
                size="sm"
                variant="secondary"
                @click="${() => this.openQuickExpenseModal()}"
              >
                <span slot="icon-start">${iconPlus(13)}</span>
                <span>${t.viewTexts.projectDetail.expenseButton}</span>
              </app-button>
              <app-button
                size="sm"
                variant="ghost"
                @click="${() => store.setActiveView('expenses')}"
              >
                ${t.viewTexts.projectDetail.registryButton}
              </app-button>
            </div>

            ${projectExpenses.length === 0
              ? html`<app-empty-state compact title="${t.viewTexts.projectDetail.emptyNoExpenses}"></app-empty-state>`
              : html`
                  <div class="contracts-list">
                    ${projectExpenses.slice(0, 5).map((exp) => {
                      const sym = exp.currency === 'USD' ? '$' : exp.currency === 'EUR' ? '€' : '₽';
                      return html`
                        <div class="contract-row">
                          <div class="contract-main">
                            <div class="contract-num-title">${exp.title}</div>
                            <div class="contract-sub">
                              ${exp.date}${exp.taskId ? ` · ${exp.taskId}` : ''}${exp.vendor ? ` · ${exp.vendor}` : ''}
                            </div>
                          </div>
                          <div class="contract-right">
                            <span class="mono" style="font-weight: 700; font-size: 0.85rem;">
                              ${exp.amount.toLocaleString(t.common.locale)} ${sym}
                            </span>
                            <app-status-chip
                              domain="expense"
                              status="${exp.status}"
                              appearance="soft"
                              size="sm"
                            ></app-status-chip>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </app-section-card>
        </div>
      </div>

      ${this.renderEditModal(t)}
      ${this.renderDeleteModal(proj, t)}
      ${this.renderMemberRemoveDialog(proj, t)}
      ${this.renderQuickTimeModal(proj, projectTasks, t)}
      ${this.renderQuickExpenseModal(proj, projectTasks, t)}
    `;
  }

  private renderEditModal(t: ReturnType<typeof getTranslation>) {
    const proj = store.projects.find((p) => p.id === this.detailProjectId) || null;

    return html`
      <app-project-form
        .open="${this.modalOpen}"
        .project="${proj}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-project-form>
    `;
  }

  private renderDeleteModal(proj: Project, t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.projectDelete.title}"
        action="${t.viewTexts.confirmDialogs.projectDelete.action(proj.name)}"
        result="${t.viewTexts.confirmDialogs.projectDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteProject(proj.id);
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderMemberRemoveDialog(proj: Project, t: ReturnType<typeof getTranslation>) {
    const pending = this.pendingRemoveMember;
    const user = pending ? store.users.find((u) => u.id === pending.userId) : undefined;
    return html`
      <app-confirm-dialog
        .open="${pending !== null}"
        size="sm"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.memberRemove.title}"
        action="${pending && user ? t.viewTexts.confirmDialogs.memberRemove.action(user.name, t.projectRoles[pending.role]) : ''}"
        result="${t.viewTexts.confirmDialogs.memberRemove.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.pendingRemoveMember = null)}"
        @confirm="${() => {
          if (pending) store.removeProjectMember(proj.id, pending.userId, pending.role);
          this.pendingRemoveMember = null;
        }}"
      ></app-confirm-dialog>
    `;
  }

  private handleAddMember(projectId: string) {
    if (!this.addMemberUserId) return;
    store.addProjectMember(projectId, {
      userId: this.addMemberUserId,
      role: this.addMemberRole,
      allocation: Math.max(5, Math.min(100, Number(this.addMemberAllocation) || 50)),
      joinedAt: new Date().toISOString().slice(0, 10),
    });
  }

  private openEditModal(proj: Project) {
    this.modalOpen = true;
  }

  private openQuickTimeModal(projectId: string) {
    const firstTask = store.tasks.find((tk) => tk.projectId === projectId);
    this.timeTaskId = firstTask?.id || '';
    this.timeUserId = store.users[0]?.id || '';
    this.timeHours = 2;
    this.timeCategory = 'development';
    this.timeDesc = '';
    this.timeModalOpen = true;
  }

  private openQuickExpenseModal() {
    this.expTitle = '';
    this.expTaskId = '';
    this.expCategory = 'infrastructure';
    this.expAmount = 25000;
    this.expVendor = '';
    this.expError = '';
    this.expenseModalOpen = true;
  }

  private renderQuickTimeModal(
    proj: Project,
    projectTasks: typeof store.tasks,
    t: ReturnType<typeof getTranslation>
  ) {
    const taskOpts = mapTaskOptions(projectTasks, t);
    const userOpts = mapUserOptions(store.users, t);
    const catOpts = [
      { value: 'development', label: t.timeTracking.categories.development },
      { value: 'design', label: t.timeTracking.categories.design },
      { value: 'testing', label: t.timeTracking.categories.testing },
      { value: 'research', label: t.timeTracking.categories.research },
      { value: 'devops', label: t.timeTracking.categories.devops },
      { value: 'meeting', label: t.timeTracking.categories.meeting },
      { value: 'management', label: t.timeTracking.categories.management },
    ];

    return html`
      <app-modal
        ?open="${this.timeModalOpen}"
        size="md"
        title="${t.viewTexts.projectDetail.quickTimeTitle(proj.key)}"
        @close="${() => (this.timeModalOpen = false)}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-entity-selector
              label="${t.viewTexts.projectDetail.labelProjectTask}"
              .value="${this.timeTaskId}"
              .options="${taskOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.timeTaskId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelEmployee}"
              .value="${this.timeUserId}"
              .options="${userOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.timeUserId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.timeTracking.labelHours}"
              .value="${this.timeHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="${t.viewTexts.timeTracking.hoursUnit}"
              @change="${(e: CustomEvent<{ value: number }>) => (this.timeHours = eventValue(e))}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <app-select
              label="${t.viewTexts.timeTracking.labelCategory}"
              .value="${this.timeCategory}"
              .options="${catOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.timeCategory = eventValue(e) as TimeEntryCategory)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.projectDetail.quickNotesLabel}"
              .value="${this.timeDesc}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.timeDesc = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.timeModalOpen = false)}">${t.common.cancel}</app-button>
          <app-button
            variant="primary"
            ?disabled="${!this.timeTaskId || this.timeHours <= 0}"
            @click="${() => {
              if (!this.timeTaskId) return;
              store.addTimeEntry({
                projectId: proj.id,
                taskId: this.timeTaskId,
                userId: this.timeUserId || store.users[0]?.id || '',
                date: new Date().toISOString().slice(0, 10),
                hours: this.timeHours,
                billable: true,
                category: this.timeCategory,
                status: 'logged',
                description: this.timeDesc.trim(),
              });
              this.timeModalOpen = false;
            }}"
          >
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderQuickExpenseModal(
    proj: Project,
    projectTasks: typeof store.tasks,
    t: ReturnType<typeof getTranslation>
  ) {
    const taskOpts = mapTaskOptions(projectTasks, t);
    const catOpts = [
      { value: 'infrastructure', label: t.expenses.categories.infrastructure },
      { value: 'software', label: t.expenses.categories.software },
      { value: 'contractors', label: t.expenses.categories.contractors },
      { value: 'equipment', label: t.expenses.categories.equipment },
      { value: 'travel', label: t.expenses.categories.travel },
      { value: 'marketing', label: t.expenses.categories.marketing },
      { value: 'other', label: t.expenses.categories.other },
    ];

    return html`
      <app-modal
        ?open="${this.expenseModalOpen}"
        size="md"
        title="${t.viewTexts.projectDetail.quickExpenseTitle(proj.key)}"
        @close="${() => (this.expenseModalOpen = false)}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-input
              label="${t.viewTexts.projectDetail.quickExpenseTitleLabel}"
              .value="${this.expTitle}"
              required
              error="${this.expError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.expTitle = eventValue(e);
                this.expError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.expenses.thCategory}"
              .value="${this.expCategory}"
              .options="${catOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.expCategory = eventValue(e) as ExpenseCategory)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.projectDetail.labelAmountRub}"
              .value="${this.expAmount}"
              min="0"
              step="1000"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.expAmount = eventValue(e))}"
            ></app-number-input>
          </div>
          <div>
            <app-entity-selector
              label="${t.viewTexts.expenses.labelLinkedTask}"
              placeholder="${t.viewTexts.projectDetail.optionProjectWide}"
              clearable
              .value="${this.expTaskId}"
              .options="${taskOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.expTaskId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.typeVendor}"
              .value="${this.expVendor}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.expVendor = eventValue(e))}"
            ></app-input>
          </div>
        </app-form-grid>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.expenseModalOpen = false)}">${t.common.cancel}</app-button>
          <app-button
            variant="primary"
            @click="${() => {
              if (!this.expTitle.trim()) {
                this.expError = t.common.required;
                return;
              }
              store.addExpense({
                projectId: proj.id,
                taskId: this.expTaskId || undefined,
                userId: store.users[0]?.id || '',
                date: new Date().toISOString().slice(0, 10),
                title: this.expTitle.trim(),
                category: this.expCategory,
                amount: Math.max(0, Number(this.expAmount) || 0),
                currency: 'RUB',
                billable: true,
                status: 'pending',
                vendor: this.expVendor.trim() || undefined,
                notes: '',
              });
              this.expenseModalOpen = false;
            }}"
          >
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}