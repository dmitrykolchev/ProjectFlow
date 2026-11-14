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
import '../../common/app-input/app-input';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../dashboard/app-project-overview/app-project-overview';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
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

const PROJECT_COLOR_SWATCHES = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#ef4444',
];

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
  @state() private formName = '';
  @state() private formKey = '';
  @state() private formDescription = '';
  @state() private formColor = '#6366f1';
  @state() private formStatus: ProjectStatus = 'active';
  @state() private formDueDate = '';
  @state() private formCompanyId = '';
  @state() private formCounterpartyId = '';
  @state() private formBudget = 5000000;
  @state() private formProgress = 0;
  @state() private formError = '';

  @state() private confirmDeleteOpen = false;

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
    const isRu = this.currentLang === 'ru';
    const proj = this.projects.find((p) => p.id === this.detailProjectId) || null;

    if (!proj) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${isRu ? 'Проект не найден или список проектов пуст' : 'Project not found'}">
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

    const userOptions = store.users.map((u) => ({
      value: u.id,
      label: `${u.name} (${u.role})`,
    }));

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
              <span>${isRu ? 'Чат проекта' : 'Project Chat'}</span>
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
              <span>${isRu ? 'Задачи в Канбане' : 'Open Kanban'}</span>
            </app-button>

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openEditModal(proj)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <button
              type="button"
              class="icon-btn danger"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              ${iconTrash(15)}
            </button>
          </div>
        </div>

        <!-- Project Hero Overview -->
        <section class="overview-card">
          <div class="overview-head">
            <div class="title-block">
              <div class="title-row">
                <span class="color-dot-lg" style="background: ${proj.color};"></span>
                <span class="proj-key">${proj.key}</span>
                <h1 class="proj-title">${proj.name}</h1>
                <app-status-chip domain="project" status="${proj.status || 'active'}" appearance="soft"></app-status-chip>
              </div>
              <p class="proj-desc">${proj.description || '—'}</p>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>${isRu ? 'Общий прогресс выполнения проекта' : 'Overall Project Progress'}</span>
              <span>${projectTasks.filter((tk) => tk.status === 'done').length} / ${projectTasks.length} ${isRu ? 'задач готово' : 'tasks done'}</span>
            </div>
            <app-progress-bar show-label color="${proj.color}" value="${proj.progress}"></app-progress-bar>
          </div>

          <div class="meta-strip">
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Компания-исполнитель' : 'Company'}</span>
              <span class="meta-val">${company?.name || '—'}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Контрагент / Заказчик' : 'Counterparty'}</span>
              ${counterparty
                ? html`
                    <button
                      type="button"
                      class="link-btn"
                      @click="${() => store.openCounterpartyDetail(counterparty.id)}"
                    >
                      ${counterparty.name}
                    </button>
                  `
                : html`<span class="meta-val">${isRu ? 'Внутренний проект' : 'Internal'}</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Бюджет проекта' : 'Budget'}</span>
              <span class="meta-val mono">
                ${proj.budget ? `${proj.budget.toLocaleString('ru-RU')} ₽` : '—'}
              </span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Плановый срок' : 'Due Date'}</span>
              <span class="meta-val mono">${proj.dueDate}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Договоров' : 'Contracts'}</span>
              <span class="meta-val mono">${linkedContracts.length}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Команда и роли' : 'Team & Roles'}</span>
              <span class="meta-val mono">
                ${uniqueUsersCount} ${isRu ? 'чел.' : 'ppl'} · ${members.length} ${isRu ? 'назнач.' : 'roles'}
              </span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Трудозатраты' : 'Logged Time'}</span>
              <span class="meta-val mono">${projectHoursTotal.toFixed(1)} ч</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Прямые расходы' : 'Direct Expenses'}</span>
              <span class="meta-val mono">${projectDirectExpensesRub.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </section>

        <!-- D3 Project Overview Charts (Progress, Hours Logged, Budget Utilization) -->
        <app-project-overview
          projectId="${proj.id}"
          ?hideProjectSelector="${true}"
        ></app-project-overview>

        <!-- Full-Width Spacious Team by Roles Section -->
        <app-section-card title="${t.projectDetail.teamByRoles}" subtitle="(${members.length})">
          <span slot="icon">${iconUsers(19)}</span>
          <div slot="actions">
            <app-segmented-switch
              size="sm"
              .value="${this.roleFilterMode}"
              .options="${[
                { value: 'all', label: isRu ? 'Все роли' : 'All Roles' },
                { value: 'assigned', label: isRu ? 'Заполненные' : 'Assigned' },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.roleFilterMode = eventValue(e) as 'assigned' | 'all')}"
            ></app-segmented-switch>
          </div>

          <div class="add-member-bar">
            <div>
              <app-select
                label="${isRu ? 'Сотрудник' : 'Employee'}"
                size="sm"
                .value="${this.addMemberUserId}"
                .options="${userOptions}"
                @change="${(e: CustomEvent<{ value: string }>) => (this.addMemberUserId = eventValue(e))}"
              ></app-select>
            </div>
            <div>
              <app-select
                label="${isRu ? 'Роль в проекте' : 'Project Role'}"
                size="sm"
                .value="${this.addMemberRole}"
                .options="${roleOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.addMemberRole = eventValue(e) as ProjectRole)}"
              ></app-select>
            </div>
            <div>
              <app-number-input
                label="${isRu ? 'Загрузка %' : 'Allocation %'}"
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
              <span>${isRu ? 'Назначить' : 'Assign'}</span>
            </app-button>
          </div>

          <div class="roles-groups">
            ${visibleRoles.length === 0
              ? html`<app-empty-state compact title="${isRu ? 'В этом проекте ещё нет участников' : 'No team members assigned yet'}"></app-empty-state>`
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
                            ? html`<span class="mono">${isRu ? 'Суммарно' : 'Total'}: ${totalRoleAlloc}%</span>`
                            : html`
                                <app-button
                                  size="sm"
                                  variant="ghost"
                                  @click="${() => (this.addMemberRole = role)}"
                                >
                                  ${isRu ? '+ Выбрать роль' : '+ Select role'}
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
                                          <button
                                            type="button"
                                            class="link-btn"
                                            style="color: inherit;"
                                            @click="${() => store.openEmployeeDetail(user.id)}"
                                          >
                                            ${user.name}
                                          </button>
                                        </div>
                                        <div class="member-sub">
                                          ${user.role}${user.department ? ` · ${user.department}` : ''} · ${isRu ? 'с' : 'since'} ${member.joinedAt}
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

                                    <button
                                      type="button"
                                      class="icon-btn danger"
                                      title="${isRu ? 'Удалить из роли' : 'Remove from role'}"
                                      @click="${() =>
                                        store.removeProjectMember(proj.id, member.userId, member.role)}"
                                    >
                                      ${iconTrash(14)}
                                    </button>
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
                ${isRu ? 'Таблица задач' : 'Task Grid'}
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
                ${isRu ? 'Все договоры' : 'All Contracts'}
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
                              ${ctr.amount.toLocaleString('ru-RU')} ${symbol}
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
          <app-section-card title="${isRu ? 'Учёт времени по проекту' : 'Project Time Tracking'}" subtitle="(${projectHoursTotal.toFixed(1)} ч)">
            <span slot="icon">${iconClock(18)}</span>
            <div slot="actions" class="section-actions-inline">
              <app-button
                size="sm"
                variant="secondary"
                @click="${() => this.openQuickTimeModal(proj.id)}"
              >
                <span slot="icon-start">${iconPlus(13)}</span>
                <span>${isRu ? 'Списать' : 'Log'}</span>
              </app-button>
              <app-button
                size="sm"
                variant="ghost"
                @click="${() => store.setActiveView('time-tracking')}"
              >
                ${isRu ? 'Журнал' : 'All'}
              </app-button>
            </div>

            ${projectTimeEntries.length === 0
              ? html`<app-empty-state compact title="${isRu ? 'Записи о времени по проекту ещё не добавлены' : 'No time entries yet'}"></app-empty-state>`
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
                            <span class="mono" style="font-weight: 700; font-size: 0.85rem;">${te.hours.toFixed(1)} ч</span>
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

          <app-section-card title="${isRu ? 'Расходы по проекту' : 'Project Expenses'}" subtitle="(${projectDirectExpensesRub.toLocaleString('ru-RU')} ₽)">
            <span slot="icon">${iconWallet(18)}</span>
            <div slot="actions" class="section-actions-inline">
              <app-button
                size="sm"
                variant="secondary"
                @click="${() => this.openQuickExpenseModal()}"
              >
                <span slot="icon-start">${iconPlus(13)}</span>
                <span>${isRu ? 'Расход' : 'Expense'}</span>
              </app-button>
              <app-button
                size="sm"
                variant="ghost"
                @click="${() => store.setActiveView('expenses')}"
              >
                ${isRu ? 'Реестр' : 'All'}
              </app-button>
            </div>

            ${projectExpenses.length === 0
              ? html`<app-empty-state compact title="${isRu ? 'Прямые расходы по проекту отсутствуют' : 'No project expenses yet'}"></app-empty-state>`
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
                              ${exp.amount.toLocaleString('ru-RU')} ${sym}
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

      ${this.renderEditModal(t, isRu)}
      ${this.renderDeleteModal(proj, t)}
      ${this.renderQuickTimeModal(proj, projectTasks, t, isRu)}
      ${this.renderQuickExpenseModal(proj, projectTasks, t, isRu)}
    `;
  }

  private renderEditModal(t: ReturnType<typeof getTranslation>, isRu: boolean) {
    const statusOptions = [
      { value: 'planning', label: t.projectStatuses.planning, color: '#0284c7' },
      { value: 'active', label: t.projectStatuses.active, color: '#10b981' },
      { value: 'on_hold', label: t.projectStatuses.on_hold, color: '#f59e0b' },
      { value: 'completed', label: t.projectStatuses.completed, color: '#6366f1' },
    ];
    const companyOptions = [
      { value: '', label: isRu ? 'Не указана' : 'None' },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];
    const counterpartyOptions = [
      { value: '', label: isRu ? 'Внутренний проект' : 'Internal' },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${isRu ? 'Редактирование проекта' : 'Edit Project'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${isRu ? 'Название проекта' : 'Project Name'}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Код (ключ)' : 'Project Key'}"
              .value="${this.formKey}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.formKey = eventValue(e).toUpperCase())}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as ProjectStatus)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Плановый срок' : 'Due Date'}"
              .value="${this.formDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDueDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Компания-исполнитель' : 'Company'}"
              .value="${this.formCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Контрагент (заказчик)' : 'Counterparty'}"
              .value="${this.formCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCounterpartyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Бюджет (₽)' : 'Budget (₽)'}"
              .value="${this.formBudget}"
              min="0"
              step="100000"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formBudget = eventValue(e))}"
            ></app-number-input>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Прогресс (%)' : 'Progress (%)'}"
              .value="${this.formProgress}"
              min="0"
              max="100"
              step="5"
              unit="%"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formProgress = eventValue(e))}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <span class="meta-label">${isRu ? 'Цвет проекта' : 'Project Color'}</span>
            <div class="color-swatches">
              ${PROJECT_COLOR_SWATCHES.map(
                (hex) => html`
                  <button
                    type="button"
                    class="color-swatch ${this.formColor === hex ? 'is-active' : ''}"
                    style="background: ${hex};"
                    @click="${() => (this.formColor = hex)}"
                  ></button>
                `
              )}
            </div>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Описание и цели проекта' : 'Description'}"
              .value="${this.formDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveProject}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
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
    this.formName = proj.name;
    this.formKey = proj.key;
    this.formDescription = proj.description;
    this.formColor = proj.color;
    this.formStatus = proj.status || 'active';
    this.formDueDate = proj.dueDate;
    this.formCompanyId = proj.companyId || '';
    this.formCounterpartyId = proj.counterpartyId || '';
    this.formBudget = proj.budget || 0;
    this.formProgress = proj.progress;
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSaveProject() {
    const existing = this.projects.find((p) => p.id === this.detailProjectId);
    if (!existing) return;
    if (!this.formName.trim()) {
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const derivedKey =
      this.formKey.trim().toUpperCase() ||
      this.formName
        .trim()
        .replace(/[^A-Za-zА-Яа-я0-9]/g, '')
        .slice(0, 4)
        .toUpperCase() ||
      existing.key;

    store.updateProject({
      id: existing.id,
      name: this.formName.trim(),
      key: derivedKey,
      description: this.formDescription.trim(),
      color: this.formColor,
      status: this.formStatus,
      dueDate: this.formDueDate || existing.dueDate,
      companyId: this.formCompanyId || undefined,
      counterpartyId: this.formCounterpartyId || undefined,
      budget: Math.max(0, Number(this.formBudget) || 0),
      progress: Math.max(0, Math.min(100, Number(this.formProgress) || 0)),
      members: existing.members || [],
    });

    this.modalOpen = false;
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
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const taskOpts = projectTasks.slice(0, 60).map((tk) => ({
      value: tk.id,
      label: `${tk.id} · ${tk.title}`,
    }));
    const userOpts = store.users.map((u) => ({ value: u.id, label: u.name }));
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
        title="${isRu ? `Списание времени · ${proj.key}` : `Log Time · ${proj.key}`}"
        @close="${() => (this.timeModalOpen = false)}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Задача проекта' : 'Task'}"
              .value="${this.timeTaskId}"
              .options="${taskOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.timeTaskId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Исполнитель' : 'Employee'}"
              .value="${this.timeUserId}"
              .options="${userOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.timeUserId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Часы' : 'Hours'}"
              .value="${this.timeHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="ч"
              @change="${(e: CustomEvent<{ value: number }>) => (this.timeHours = eventValue(e))}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Категория работ' : 'Category'}"
              .value="${this.timeCategory}"
              .options="${catOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.timeCategory = eventValue(e) as TimeEntryCategory)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Комментарий к отчёту' : 'Notes'}"
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
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const taskOpts = [
      { value: '', label: isRu ? 'На весь проект' : 'Project-wide' },
      ...projectTasks.slice(0, 60).map((tk) => ({ value: tk.id, label: `${tk.id} · ${tk.title}` })),
    ];
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
        title="${isRu ? `Новый расход · ${proj.key}` : `New Expense · ${proj.key}`}"
        @close="${() => (this.expenseModalOpen = false)}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-input
              label="${isRu ? 'Наименование расхода' : 'Title'}"
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
              label="${isRu ? 'Категория' : 'Category'}"
              .value="${this.expCategory}"
              .options="${catOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.expCategory = eventValue(e) as ExpenseCategory)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Сумма (₽)' : 'Amount (₽)'}"
              .value="${this.expAmount}"
              min="0"
              step="1000"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.expAmount = eventValue(e))}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Задача (опционально)' : 'Task (optional)'}"
              .value="${this.expTaskId}"
              .options="${taskOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.expTaskId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Поставщик' : 'Vendor'}"
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
                this.expError = isRu ? 'Обязательное поле' : 'Required';
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