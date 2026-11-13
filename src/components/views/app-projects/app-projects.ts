import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { Project, ProjectRole, ProjectStatus } from '../../../types';
import { iconEdit, iconKanban, iconPlus, iconSearch, iconTrash, iconUsers } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import styles from './app-projects.css';

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

@customElement('app-projects')
export class AppProjects extends LitElement {
  @state() private projects: Project[] = store.projects;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | ProjectStatus = 'all';
  @state() private companyFilter = 'all';

  @state() private selectedProjectId: string = store.projects[0]?.id || '';
  @state() private roleFilterMode: 'assigned' | 'all' = 'all';

  // Add member inline state
  @state() private addMemberUserId: string = store.users[0]?.id || '';
  @state() private addMemberRole: ProjectRole = 'developer';
  @state() private addMemberAllocation: number = 50;

  // Create / edit modal
  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
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

  @state() private deletingProject: Project | null = null;

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
    this.globalSearch = store.searchQuery;
    if (!this.projects.some((p) => p.id === this.selectedProjectId)) {
      this.selectedProjectId = this.projects[0]?.id || '';
    }
    if (!store.users.some((u) => u.id === this.addMemberUserId)) {
      this.addMemberUserId = store.users[0]?.id || '';
    }
  }

  private getStatusVariant(status: ProjectStatus | undefined): 'info' | 'success' | 'warning' | 'primary' {
    switch (status || 'active') {
      case 'planning':
        return 'info';
      case 'on_hold':
        return 'warning';
      case 'completed':
        return 'primary';
      default:
        return 'success';
    }
  }

  private getFilteredProjects(): Project[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.projects.filter((p) => {
      if (this.statusFilter !== 'all' && (p.status || 'active') !== this.statusFilter) return false;
      if (this.companyFilter !== 'all' && p.companyId !== this.companyFilter) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.key.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const isRu = this.currentLang === 'ru';
    const filtered = this.getFilteredProjects();

    const activeProject =
      filtered.find((p) => p.id === this.selectedProjectId) ||
      filtered[0] ||
      this.projects.find((p) => p.id === this.selectedProjectId) ||
      null;

    const activeCount = this.projects.filter((p) => (p.status || 'active') === 'active').length;
    const totalAssignments = this.projects.reduce((sum, p) => sum + (p.members?.length || 0), 0);
    const avgProgress = this.projects.length
      ? Math.round(this.projects.reduce((sum, p) => sum + p.progress, 0) / this.projects.length)
      : 0;

    const statusOptions = [
      { value: 'all', label: isRu ? 'Все статусы' : 'All statuses' },
      { value: 'planning', label: t.projectStatuses.planning, color: '#0284c7' },
      { value: 'active', label: t.projectStatuses.active, color: '#10b981' },
      { value: 'on_hold', label: t.projectStatuses.on_hold, color: '#f59e0b' },
      { value: 'completed', label: t.projectStatuses.completed, color: '#6366f1' },
    ];

    const companyFilterOptions = [
      { value: 'all', label: isRu ? 'Все компании' : 'All companies' },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    return html`
      <div class="view-header">
        <div class="header-titles">
          <h1 class="view-title">${t.navigation.projects}</h1>
          <p class="view-subtitle">
            ${isRu
              ? 'Портфель проектов, бюджеты, сроки и управление командой с распределением по проектным ролям'
              : 'Project portfolio, budgets, timelines, and team staffing grouped by project roles'}
          </p>
        </div>
        <app-button variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${isRu ? 'Создать проект' : 'New Project'}</span>
        </app-button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Всего проектов' : 'Total Projects'}</span>
          <span class="kpi-value">${this.projects.length}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Активных' : 'Active'}</span>
          <span class="kpi-value" style="color: var(--color-success, #10b981);">${activeCount}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Назначений в ролях' : 'Role Assignments'}</span>
          <span class="kpi-value">${totalAssignments}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Средний прогресс' : 'Avg Progress'}</span>
          <span class="kpi-value">${avgProgress}%</span>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-filters">
          <div class="filter-search">
            <app-input
              placeholder="${isRu ? 'Поиск по коду или названию...' : 'Search by key or name...'}"
              .value="${this.localSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
            >
              <span slot="icon">${iconSearch(15)}</span>
            </app-input>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.statusFilter}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.statusFilter = e.detail.value as 'all' | ProjectStatus)}"
            ></app-select>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.companyFilter}"
              .options="${companyFilterOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.companyFilter = e.detail.value)}"
            ></app-select>
          </div>
        </div>
      </div>

      ${filtered.length === 0
        ? html`<div class="empty-state">${isRu ? 'Проекты не найдены' : 'No projects found'}</div>`
        : html`
            <div class="projects-workspace">
              <div class="projects-list">
                ${filtered.map((proj) => this.renderProjectCard(proj, activeProject?.id === proj.id, t, isRu))}
              </div>
              ${activeProject
                ? this.renderDetailPanel(activeProject, t, isRu)
                : ''}
            </div>
          `}

      ${this.renderProjectModal(t, isRu, statusOptions)}
      ${this.renderDeleteModal(isRu)}
    `;
  }

  private renderProjectCard(
    proj: Project,
    isSelected: boolean,
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const company = store.companies.find((c) => c.id === proj.companyId);
    const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
    const tasksCount = store.tasks.filter((task) => task.projectId === proj.id).length;
    const members = proj.members || [];
    const statusKey = (proj.status || 'active') as ProjectStatus;

    const roleCounts = ALL_PROJECT_ROLES.map((role) => ({
      role,
      count: members.filter((m) => m.role === role).length,
    })).filter((item) => item.count > 0);

    return html`
      <article
        class="project-card ${isSelected ? 'is-selected' : ''}"
        style="--proj-color: ${proj.color};"
        @click="${() => (this.selectedProjectId = proj.id)}"
      >
        <div class="proj-card-head">
          <div class="proj-title-row">
            <span class="proj-key">${proj.key}</span>
            <h3 class="proj-name">${proj.name}</h3>
          </div>
          <app-badge variant="${this.getStatusVariant(proj.status)}" appearance="soft" size="sm">
            ${t.projectStatuses[statusKey]}
          </app-badge>
        </div>

        <p class="proj-desc">${proj.description}</p>

        <div class="progress-row">
          <div class="progress-track">
            <div class="progress-fill" style="width: ${proj.progress}%; background: ${proj.color};"></div>
          </div>
          <span class="progress-pct">${proj.progress}%</span>
        </div>

        <div class="proj-meta-inline">
          <span>${isRu ? 'Компания' : 'Company'}: <strong>${company?.name || '—'}</strong></span>
          <span>${isRu ? 'Заказчик' : 'Client'}: <strong>${counterparty?.name || '—'}</strong></span>
          <span>${isRu ? 'Задач' : 'Tasks'}: <strong>${tasksCount}</strong></span>
          ${proj.budget
            ? html`<span>${isRu ? 'Бюджет' : 'Budget'}: <strong>${(proj.budget / 1_000_000).toFixed(1)}M ₽</strong></span>`
            : ''}
        </div>

        <div class="role-pills">
          ${roleCounts.length === 0
            ? html`<span class="role-pill">${isRu ? 'Команда не назначена' : 'No team assigned'}</span>`
            : roleCounts.map(
                (rc) => html`
                  <span class="role-pill">
                    <span>${t.projectRoles[rc.role]}</span>
                    <strong>${rc.count}</strong>
                  </span>
                `
              )}
        </div>

        <div class="proj-card-footer" @click="${(e: Event) => e.stopPropagation()}">
          <app-button
            size="sm"
            variant="outline"
            @click="${() => {
              store.selectProject(proj.id);
              store.setActiveView('kanban');
            }}"
          >
            <span slot="icon-start">${iconKanban()}</span>
            <span>${isRu ? 'Задачи проекта' : 'Project Tasks'}</span>
          </app-button>

          <div class="actions-row">
            <button
              type="button"
              class="icon-btn"
              title="${isRu ? 'Редактировать' : 'Edit'}"
              @click="${() => this.openEditModal(proj)}"
            >
              ${iconEdit(14)}
            </button>
            <button
              type="button"
              class="icon-btn danger"
              title="${isRu ? 'Удалить' : 'Delete'}"
              @click="${() => (this.deletingProject = proj)}"
            >
              ${iconTrash(14)}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  private renderDetailPanel(
    proj: Project,
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const company = store.companies.find((c) => c.id === proj.companyId);
    const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
    const linkedContracts = store.contracts.filter((c) => c.projectId === proj.id);
    const members = proj.members || [];
    const uniqueUsersCount = new Set(members.map((m) => m.userId)).size;

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

    return html`
      <section class="detail-panel">
        <div class="detail-header">
          <div class="detail-title-wrap">
            <h2 class="detail-title">
              <span class="color-dot-lg" style="background: ${proj.color};"></span>
              <span class="proj-key">${proj.key}</span>
              <span>${proj.name}</span>
            </h2>
            <p class="proj-desc">${proj.description}</p>
          </div>
          <div class="actions-row">
            <app-button
              size="sm"
              variant="outline"
              @click="${() => {
                store.selectProject(proj.id);
                store.setActiveView('kanban');
              }}"
            >
              <span>${isRu ? 'В Канбан' : 'Open Kanban'}</span>
            </app-button>
            <app-button size="sm" variant="secondary" @click="${() => this.openEditModal(proj)}">
              <span>${isRu ? 'Изменить' : 'Edit'}</span>
            </app-button>
          </div>
        </div>

        <div class="detail-meta-grid">
          <div class="detail-meta-box">
            <span class="meta-label">${isRu ? 'Компания' : 'Company'}</span>
            <span class="meta-val">${company?.name || '—'}</span>
          </div>
          <div class="detail-meta-box">
            <span class="meta-label">${isRu ? 'Контрагент' : 'Counterparty'}</span>
            <span class="meta-val">${counterparty?.name || '—'}</span>
          </div>
          <div class="detail-meta-box">
            <span class="meta-label">${isRu ? 'Бюджет' : 'Budget'}</span>
            <span class="meta-val mono">
              ${proj.budget ? `${proj.budget.toLocaleString('ru-RU')} ₽` : '—'}
            </span>
          </div>
          <div class="detail-meta-box">
            <span class="meta-label">${isRu ? 'Срок сдачи' : 'Due Date'}</span>
            <span class="meta-val mono">${proj.dueDate}</span>
          </div>
          <div class="detail-meta-box">
            <span class="meta-label">${isRu ? 'Договоры' : 'Contracts'}</span>
            <span class="meta-val mono">${linkedContracts.length}</span>
          </div>
          <div class="detail-meta-box">
            <span class="meta-label">${isRu ? 'Участников' : 'Members'}</span>
            <span class="meta-val mono">${uniqueUsersCount} (${members.length} ${isRu ? 'ролей' : 'roles'})</span>
          </div>
        </div>

        <div class="team-header">
          <h3 class="team-heading">
            ${iconUsers(18)}
            <span>${isRu ? 'Участники проекта по ролям' : 'Project Team by Roles'}</span>
          </h3>
          <app-segmented-switch
            size="sm"
            .value="${this.roleFilterMode}"
            .options="${[
              { value: 'all', label: isRu ? 'Все роли' : 'All Roles' },
              { value: 'assigned', label: isRu ? 'Заполненные' : 'Assigned' },
            ]}"
            @change="${(e: CustomEvent<{ value: string }>) =>
              (this.roleFilterMode = e.detail.value as 'assigned' | 'all')}"
          ></app-segmented-switch>
        </div>

        <div class="add-member-bar">
          <div>
            <app-select
              label="${isRu ? 'Сотрудник' : 'Employee'}"
              size="sm"
              .value="${this.addMemberUserId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.addMemberUserId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Роль в проекте' : 'Project Role'}"
              size="sm"
              .value="${this.addMemberRole}"
              .options="${roleOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.addMemberRole = e.detail.value as ProjectRole)}"
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
              @change="${(e: CustomEvent<{ value: number }>) => (this.addMemberAllocation = e.detail.value)}"
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
            ? html`<div class="empty-state">${isRu ? 'В этом проекте ещё нет участников' : 'No team members assigned yet'}</div>`
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
                                    <div class="avatar">${user.avatar}</div>
                                    <div class="member-info">
                                      <div class="member-name">${user.name}</div>
                                      <div class="member-sub">
                                        ${user.role} · ${isRu ? 'с' : 'since'} ${member.joinedAt}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <app-select
                                      size="sm"
                                      .value="${member.role}"
                                      .options="${roleOptions}"
                                      @change="${(e: CustomEvent<{ value: string }>) => {
                                        const nextRole = e.detail.value as ProjectRole;
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
                                          e.detail.value
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
      </section>
    `;
  }

  private renderProjectModal(
    t: ReturnType<typeof getTranslation>,
    isRu: boolean,
    statusOptions: { value: string; label: string; color?: string }[]
  ) {
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
        title="${this.editingId
          ? isRu
            ? 'Редактирование проекта'
            : 'Edit Project'
          : isRu
          ? 'Новый проект'
          : 'New Project'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'Название проекта' : 'Project Name'}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = e.detail.value;
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Код (ключ)' : 'Project Key'}"
              placeholder="CORE"
              .value="${this.formKey}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.formKey = e.detail.value.toUpperCase())}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = e.detail.value as ProjectStatus)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Плановый срок' : 'Due Date'}"
              .value="${this.formDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDueDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Компания-исполнитель' : 'Company'}"
              .value="${this.formCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Контрагент (заказчик)' : 'Counterparty'}"
              .value="${this.formCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCounterpartyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Бюджет (₽)' : 'Budget (₽)'}"
              .value="${this.formBudget}"
              min="0"
              step="100000"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formBudget = e.detail.value)}"
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
              @change="${(e: CustomEvent<{ value: number }>) => (this.formProgress = e.detail.value)}"
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
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>

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

  private renderDeleteModal(isRu: boolean) {
    return html`
      <app-modal
        ?open="${Boolean(this.deletingProject)}"
        size="sm"
        title="${isRu ? 'Удалить проект?' : 'Delete project?'}"
        @close="${() => (this.deletingProject = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Вы уверены, что хотите удалить проект «${this.deletingProject?.name || ''}»?`
            : `Are you sure you want to delete "${this.deletingProject?.name || ''}"?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingProject = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingProject) {
                store.deleteProject(this.deletingProject.id);
                this.deletingProject = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
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

  private openCreateModal() {
    this.editingId = null;
    this.formName = '';
    this.formKey = '';
    this.formDescription = '';
    this.formColor = '#6366f1';
    this.formStatus = 'planning';
    this.formDueDate = `${new Date().getFullYear()}-12-31`;
    this.formCompanyId = store.companies[0]?.id || '';
    this.formCounterpartyId = store.counterparties[0]?.id || '';
    this.formBudget = 5000000;
    this.formProgress = 0;
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(proj: Project) {
    this.editingId = proj.id;
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
      'PROJ';

    if (this.editingId) {
      const existing = this.projects.find((p) => p.id === this.editingId);
      store.updateProject({
        id: this.editingId,
        name: this.formName.trim(),
        key: derivedKey,
        description: this.formDescription.trim(),
        color: this.formColor,
        status: this.formStatus,
        dueDate: this.formDueDate || new Date().toISOString().slice(0, 10),
        companyId: this.formCompanyId || undefined,
        counterpartyId: this.formCounterpartyId || undefined,
        budget: Math.max(0, Number(this.formBudget) || 0),
        progress: Math.max(0, Math.min(100, Number(this.formProgress) || 0)),
        members: existing?.members || [],
      });
    } else {
      const created = store.addProject({
        name: this.formName.trim(),
        key: derivedKey,
        description: this.formDescription.trim(),
        color: this.formColor,
        status: this.formStatus,
        dueDate: this.formDueDate || new Date().toISOString().slice(0, 10),
        companyId: this.formCompanyId || undefined,
        counterpartyId: this.formCounterpartyId || undefined,
        budget: Math.max(0, Number(this.formBudget) || 0),
        progress: Math.max(0, Math.min(100, Number(this.formProgress) || 0)),
        members: [],
      });
      this.selectedProjectId = created.id;
    }

    this.modalOpen = false;
  }
}
