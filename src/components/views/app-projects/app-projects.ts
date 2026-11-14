import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { Project, ProjectRole, ProjectStatus } from '../../../types';
import { iconChevronRight, iconEdit, iconFolder, iconKanban, iconPlus, iconTrash } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-progress-bar/app-progress-bar';
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
  @state() private displayMode: 'cards' | 'table' = 'cards';

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
      <app-page-header
        title="${t.navigation.projects}"
        subtitle="${isRu
          ? 'Список проектов портфеля. Выберите проект, чтобы открыть его страницу с командой по ролям, задачами и договорами'
          : 'Portfolio projects list. Select any project to open its dedicated page with team roles, tasks, and contracts'}"
      >
        <span slot="icon">${iconFolder(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${isRu ? 'Создать проект' : 'New Project'}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${isRu ? 'Всего проектов' : 'Total Projects'}" value="${this.projects.length}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Активных' : 'Active'}" value="${activeCount}" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Назначений в ролях' : 'Role Assignments'}" value="${totalAssignments}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Средний прогресс' : 'Avg Progress'}" value="${avgProgress}%"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        placeholder="${isRu ? 'Поиск по коду или названию...' : 'Search by key or name...'}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'status', options: statusOptions },
          { key: 'company', options: companyFilterOptions },
        ]}"
        .values="${{ status: this.statusFilter, company: this.companyFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = e.detail.value as 'all' | ProjectStatus;
          if (e.detail.key === 'company') this.companyFilter = e.detail.value;
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: isRu ? 'Карточки' : 'Cards' },
            { value: 'table', label: isRu ? 'Таблица' : 'Table' },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.displayMode = e.detail.value as 'cards' | 'table')}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${isRu ? 'Проекты не найдены' : 'No projects found'}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t, isRu)
        : this.renderTable(filtered, t, isRu)}

      ${this.renderProjectModal(t, isRu, statusOptions)}
      ${this.renderDeleteModal(isRu)}
    `;
  }

  private renderCards(list: Project[], t: ReturnType<typeof getTranslation>, isRu: boolean) {
    return html`
      <div class="cards-grid">
        ${list.map((proj) => {
          const company = store.companies.find((c) => c.id === proj.companyId);
          const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
          const tasksCount = store.tasks.filter((task) => task.projectId === proj.id).length;
          const members = proj.members || [];
          const uniqueMembers = new Set(members.map((m) => m.userId)).size;
          const statusKey = (proj.status || 'active') as ProjectStatus;

          const roleCounts = ALL_PROJECT_ROLES.map((role) => ({
            role,
            count: members.filter((m) => m.role === role).length,
          })).filter((item) => item.count > 0);

          return html`
            <article class="project-card" @click="${() => store.openProjectDetail(proj.id)}">
              <div class="proj-card-head">
                <div class="proj-title-row">
                  <span class="color-dot" style="background: ${proj.color};"></span>
                  <span class="proj-key">${proj.key}</span>
                  <h3 class="proj-name">${proj.name}</h3>
                </div>
                <app-status-chip domain="project" status="${proj.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
              </div>

              <p class="proj-desc">${proj.description}</p>

              <app-progress-bar show-label color="${proj.color}" value="${proj.progress}"></app-progress-bar>

              <div class="proj-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Компания' : 'Company'}</span>
                  <span class="meta-val">${company?.name || '—'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Контрагент' : 'Client'}</span>
                  <span class="meta-val">${counterparty?.name || '—'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Бюджет' : 'Budget'}</span>
                  <span class="meta-val mono">
                    ${proj.budget ? `${(proj.budget / 1_000_000).toFixed(1)}M ₽` : '—'}
                  </span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Срок / Задач' : 'Due / Tasks'}</span>
                  <span class="meta-val mono">${proj.dueDate} · ${tasksCount}</span>
                </div>
              </div>

              <div class="team-summary-line">
                ${roleCounts.length === 0
                  ? html`<span>${isRu ? 'Команда по ролям не назначена' : 'No team roles assigned'}</span>`
                  : html`
                      <span>${isRu ? 'Участников' : 'Team'}: <strong>${uniqueMembers}</strong></span>
                      ${roleCounts.map(
                        (rc) => html`
                          <span class="sep">·</span>
                          <span>${t.projectRoles[rc.role]}: <strong>${rc.count}</strong></span>
                        `
                      )}
                    `}
              </div>

              <div class="proj-card-footer" @click="${(e: Event) => e.stopPropagation()}">
                <div class="footer-left-actions">
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => store.openProjectDetail(proj.id)}"
                  >
                    <span>${t.projectDetail.openProject}</span>
                    <span slot="icon-end">${iconChevronRight(14)}</span>
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
                    <span>${isRu ? 'Задачи' : 'Tasks'}</span>
                  </app-button>
                </div>

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
        })}
      </div>
    `;
  }

  private renderTable(list: Project[], t: ReturnType<typeof getTranslation>, isRu: boolean) {
    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${isRu ? 'Проект' : 'Project'}</th>
              <th>${isRu ? 'Компания / Заказчик' : 'Company / Client'}</th>
              <th>${isRu ? 'Команда' : 'Team'}</th>
              <th>${isRu ? 'Задачи' : 'Tasks'}</th>
              <th>${isRu ? 'Прогресс' : 'Progress'}</th>
              <th>${isRu ? 'Бюджет' : 'Budget'}</th>
              <th>${isRu ? 'Срок' : 'Due Date'}</th>
              <th>${isRu ? 'Статус' : 'Status'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map((proj) => {
              const company = store.companies.find((c) => c.id === proj.companyId);
              const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
              const tasksCount = store.tasks.filter((tk) => tk.projectId === proj.id).length;
              const members = proj.members || [];
              const uniqueMembers = new Set(members.map((m) => m.userId)).size;
              const statusKey = (proj.status || 'active') as ProjectStatus;

              return html`
                <tr @click="${() => store.openProjectDetail(proj.id)}">
                  <td>
                    <div class="proj-title-row">
                      <span class="color-dot" style="background: ${proj.color};"></span>
                      <span class="proj-key">${proj.key}</span>
                      <span style="font-weight: 600;">${proj.name}</span>
                    </div>
                  </td>
                  <td>
                    <div>${company?.name || '—'}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${counterparty?.name || '—'}</div>
                  </td>
                  <td class="mono">${uniqueMembers} (${members.length})</td>
                  <td class="mono">${tasksCount}</td>
                  <td class="mono">${proj.progress}%</td>
                  <td class="mono">${proj.budget ? `${(proj.budget / 1_000_000).toFixed(1)}M ₽` : '—'}</td>
                  <td class="mono">${proj.dueDate}</td>
                  <td>
                    <app-status-chip domain="project" status="${proj.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
                  </td>
                  <td @click="${(e: Event) => e.stopPropagation()}">
                    <div class="actions-row">
                      <button
                        type="button"
                        class="icon-btn"
                        title="${t.projectDetail.openProject}"
                        @click="${() => store.openProjectDetail(proj.id)}"
                      >
                        ${iconChevronRight(14)}
                      </button>
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
                  </td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
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
      store.addProject({
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
    }

    this.modalOpen = false;
  }
}
