import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { TimeEntry, TimeEntryCategory, TimeEntryStatus } from '../../../types';
import {
  iconCheck,
  iconClock,
  iconEdit,
  iconPlus,
  iconTrash,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-switch/app-switch';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import styles from './app-time-tracking.css';

const HOURLY_RATE_RUB = 3200;

@customElement('app-time-tracking')
export class AppTimeTracking extends LitElement {
  @state() private entries: TimeEntry[] = store.timeEntries;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private projectFilter = 'all';
  @state() private userFilter = 'all';
  @state() private categoryFilter: 'all' | TimeEntryCategory = 'all';
  @state() private viewMode: 'journal' | 'by-task' = 'journal';

  // Quick inline report form
  @state() private quickProjectId = store.projects[0]?.id || '';
  @state() private quickTaskId = '';
  @state() private quickUserId = store.users[0]?.id || '';
  @state() private quickDate = new Date().toISOString().slice(0, 10);
  @state() private quickHours = 2;
  @state() private quickCategory: TimeEntryCategory = 'development';
  @state() private quickDescription = '';
  @state() private quickBillable = true;

  // Create / Edit modal
  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
  @state() private formProjectId = '';
  @state() private formTaskId = '';
  @state() private formUserId = '';
  @state() private formDate = '';
  @state() private formHours = 4;
  @state() private formCategory: TimeEntryCategory = 'development';
  @state() private formStatus: TimeEntryStatus = 'logged';
  @state() private formBillable = true;
  @state() private formDescription = '';
  @state() private formError = '';

  @state() private deletingEntry: TimeEntry | null = null;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.ensureQuickTaskValid();
    this.unsubscribe = store.subscribe(() => this.syncState());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.entries = store.timeEntries;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    if (!store.projects.some((p) => p.id === this.quickProjectId)) {
      this.quickProjectId = store.projects[0]?.id || '';
    }
    this.ensureQuickTaskValid();
  }

  private ensureQuickTaskValid() {
    const projectTasks = store.tasks.filter((t) => t.projectId === this.quickProjectId);
    if (projectTasks.length === 0) {
      this.quickTaskId = '';
      return;
    }
    if (!projectTasks.some((t) => t.id === this.quickTaskId)) {
      this.quickTaskId = projectTasks[0].id;
    }
  }

  private getFiltered(): TimeEntry[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return [...this.entries]
      .filter((entry) => {
        if (this.projectFilter !== 'all' && entry.projectId !== this.projectFilter) return false;
        if (this.userFilter !== 'all' && entry.userId !== this.userFilter) return false;
        if (this.categoryFilter !== 'all' && entry.category !== this.categoryFilter) return false;
        if (!query) return true;
        const task = store.tasks.find((t) => t.id === entry.taskId);
        const user = store.users.find((u) => u.id === entry.userId);
        const proj = store.projects.find((p) => p.id === entry.projectId);
        return (
          entry.taskId.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query) ||
          (task?.title.toLowerCase().includes(query) ?? false) ||
          (user?.name.toLowerCase().includes(query) ?? false) ||
          (proj?.name.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }

  render() {
    const t = getTranslation(this.currentLang);
    const isRu = this.currentLang === 'ru';
    const filtered = this.getFiltered();

    const totalHours = filtered.reduce((acc, e) => acc + e.hours, 0);
    const billableHours = filtered.filter((e) => e.billable).reduce((acc, e) => acc + e.hours, 0);
    const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
    const estCostRub = Math.round(billableHours * HOURLY_RATE_RUB);

    const projectOptions = [
      { value: 'all', label: isRu ? 'Все проекты' : 'All projects' },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];

    const quickProjectOptions = store.projects.map((p) => ({
      value: p.id,
      label: `[${p.key}] ${p.name}`,
      color: p.color,
    }));

    const quickTaskOptions = store.tasks
      .filter((tk) => tk.projectId === this.quickProjectId)
      .slice(0, 60)
      .map((tk) => ({
        value: tk.id,
        label: `${tk.id} · ${tk.title}`,
      }));

    const userFilterOptions = [
      { value: 'all', label: isRu ? 'Все сотрудники' : 'All employees' },
      ...store.users.map((u) => ({ value: u.id, label: u.name })),
    ];

    const userSelectOptions = store.users.map((u) => ({ value: u.id, label: u.name }));

    const categoryOptions: { value: TimeEntryCategory; label: string }[] = [
      { value: 'development', label: t.timeTracking.categories.development },
      { value: 'design', label: t.timeTracking.categories.design },
      { value: 'testing', label: t.timeTracking.categories.testing },
      { value: 'research', label: t.timeTracking.categories.research },
      { value: 'devops', label: t.timeTracking.categories.devops },
      { value: 'meeting', label: t.timeTracking.categories.meeting },
      { value: 'management', label: t.timeTracking.categories.management },
    ];

    const categoryFilterOptions = [
      { value: 'all', label: isRu ? 'Все категории' : 'All categories' },
      ...categoryOptions,
    ];

    const statusOptions: { value: TimeEntryStatus; label: string; color: string }[] = [
      { value: 'logged', label: t.timeTracking.statuses.logged, color: '#64748b' },
      { value: 'submitted', label: t.timeTracking.statuses.submitted, color: '#f59e0b' },
      { value: 'approved', label: t.timeTracking.statuses.approved, color: '#10b981' },
    ];

    return html`
      <app-page-header title="${t.timeTracking.title}" subtitle="${t.timeTracking.subtitle}">
        <span slot="icon">${iconClock(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.timeTracking.addEntry}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.timeTracking.totalHours}" value="${totalHours.toFixed(1)} ч" subtitle="${isRu ? 'По текущей выборке' : 'Current filter scope'}"></app-metric-card>
        <app-metric-card size="compact" label="${t.timeTracking.billableHours}" value="${billableHours.toFixed(1)} ч" valueColor="#10b981" subtitle="${billablePct}% ${isRu ? 'от общих часов' : 'of total hours'}"></app-metric-card>
        <app-metric-card size="compact" label="${t.timeTracking.estimatedCost}" value="${estCostRub.toLocaleString('ru-RU')} ₽" subtitle="${isRu ? `Базовая ставка ${HOURLY_RATE_RUB.toLocaleString('ru-RU')} ₽/ч` : `Rate ${HOURLY_RATE_RUB} ₽/h`}"></app-metric-card>
        <app-metric-card size="compact" label="${t.timeTracking.entriesCount}" value="${filtered.length}" subtitle="${filtered.filter((e) => e.status === 'approved').length} ${isRu ? 'утверждено' : 'approved'}"></app-metric-card>
      </app-kpi-strip>

      <!-- Quick Inline Task Report -->
      <section class="quick-log-card">
        <div class="quick-log-head">
          <span class="quick-log-title">
            ${iconClock(16)}
            <span>${t.timeTracking.quickLogTitle}</span>
          </span>
        </div>

        <div class="quick-log-grid">
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              size="sm"
              .value="${this.quickProjectId}"
              .options="${quickProjectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.quickProjectId = e.detail.value;
                this.ensureQuickTaskValid();
              }}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Задача' : 'Task'}"
              size="sm"
              .value="${this.quickTaskId}"
              .options="${quickTaskOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.quickTaskId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Исполнитель' : 'Employee'}"
              size="sm"
              .value="${this.quickUserId}"
              .options="${userSelectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.quickUserId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата' : 'Date'}"
              size="sm"
              .value="${this.quickDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.quickDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Часы' : 'Hours'}"
              size="sm"
              .value="${this.quickHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="ч"
              @change="${(e: CustomEvent<{ value: number }>) => (this.quickHours = e.detail.value)}"
            ></app-number-input>
          </div>
        </div>

        <div class="quick-log-row2">
          <div>
            <app-select
              label="${isRu ? 'Категория работ' : 'Category'}"
              size="sm"
              .value="${this.quickCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.quickCategory = e.detail.value as TimeEntryCategory)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Комментарий к отчёту' : 'Work description'}"
              size="sm"
              placeholder="${isRu ? 'Что было сделано по задаче...' : 'Describe completed work...'}"
              .value="${this.quickDescription}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.quickDescription = e.detail.value)}"
            ></app-input>
          </div>
          <div class="billable-toggle-wrap">
            <span>${isRu ? 'Оплачиваемое' : 'Billable'}</span>
            <app-switch
              size="sm"
              ?checked="${this.quickBillable}"
              @change="${(e: CustomEvent<{ checked: boolean }>) => (this.quickBillable = e.detail.checked)}"
            ></app-switch>
          </div>
          <app-button
            variant="primary"
            size="sm"
            ?disabled="${!this.quickTaskId || this.quickHours <= 0}"
            @click="${this.handleQuickSubmit}"
          >
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${isRu ? 'Списать время' : 'Log Time'}</span>
          </app-button>
        </div>
      </section>

      <!-- Filters Toolbar -->
      <app-filter-bar
        style="--filter-select-width: 185px;"
        placeholder="${isRu ? 'Поиск по задаче, комментарию, сотруднику...' : 'Search task, notes, employee...'}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'project', options: projectOptions },
          { key: 'user', options: userFilterOptions },
          { key: 'category', options: categoryFilterOptions },
        ]}"
        .values="${{ project: this.projectFilter, user: this.userFilter, category: this.categoryFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'project') this.projectFilter = e.detail.value;
          if (e.detail.key === 'user') this.userFilter = e.detail.value;
          if (e.detail.key === 'category') this.categoryFilter = e.detail.value as 'all' | TimeEntryCategory;
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.viewMode}"
          .options="${[
            { value: 'journal', label: t.timeTracking.viewJournal },
            { value: 'by-task', label: t.timeTracking.viewByTask },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.viewMode = e.detail.value as 'journal' | 'by-task')}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${isRu ? 'Записи о времени не найдены' : 'No time entries found'}"></app-empty-state>`
        : this.viewMode === 'journal'
        ? this.renderJournalTable(filtered, t, isRu)
        : this.renderByTaskView(filtered, t, isRu)}

      ${this.renderFormModal(t, isRu, categoryOptions, statusOptions)}
      ${this.renderDeleteModal(isRu)}
    `;
  }

  private renderJournalTable(
    filtered: TimeEntry[],
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${isRu ? 'Дата' : 'Date'}</th>
              <th>${isRu ? 'Задача / Проект' : 'Task / Project'}</th>
              <th>${isRu ? 'Сотрудник' : 'Employee'}</th>
              <th>${isRu ? 'Категория' : 'Category'}</th>
              <th>${isRu ? 'Отчёт о работе' : 'Description'}</th>
              <th>${isRu ? 'Часы' : 'Hours'}</th>
              <th>${isRu ? 'Оплата' : 'Billing'}</th>
              <th>${isRu ? 'Статус' : 'Status'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((entry) => {
              const task = store.tasks.find((tk) => tk.id === entry.taskId);
              const proj = store.projects.find((p) => p.id === entry.projectId);
              const user = store.users.find((u) => u.id === entry.userId);

              return html`
                <tr>
                  <td class="mono" style="white-space: nowrap;">${entry.date}</td>
                  <td>
                    <button
                      type="button"
                      class="task-link-btn"
                      @click="${() => {
                        if (task) store.openTaskDetail(task.id);
                      }}"
                    >
                      <span class="task-key-chip">${entry.taskId}</span>
                      <span>${task?.title || (isRu ? 'Удалённая задача' : 'Removed task')}</span>
                    </button>
                    <div class="project-sub">
                      ${proj
                        ? html`<span class="dot" style="background: ${proj.color};"></span><span>${proj.name}</span>`
                        : ''}
                    </div>
                  </td>
                  <td>
                    <div class="user-cell">
                      <span class="avatar-sm">${user?.avatar || '??'}</span>
                      <span>${user?.name || entry.userId}</span>
                    </div>
                  </td>
                  <td>
                    <app-badge variant="default" appearance="soft" size="sm">
                      ${t.timeTracking.categories[entry.category]}
                    </app-badge>
                  </td>
                  <td class="desc-cell">${entry.description || '—'}</td>
                  <td class="hours-cell">${entry.hours.toFixed(1)} ч</td>
                  <td>
                    <app-badge
                      variant="${entry.billable ? 'info' : 'default'}"
                      appearance="soft"
                      size="sm"
                    >
                      ${entry.billable ? (isRu ? 'Оплачив.' : 'Billable') : isRu ? 'Внутр.' : 'Internal'}
                    </app-badge>
                  </td>
                  <td>
                    <app-status-chip
                      domain="timeEntry"
                      status="${entry.status}"
                      appearance="soft"
                      size="sm"
                    ></app-status-chip>
                  </td>
                  <td>
                    <div class="actions-row">
                      ${entry.status !== 'approved'
                        ? html`
                            <button
                              type="button"
                              class="icon-btn approve"
                              title="${isRu ? 'Утвердить запись' : 'Approve entry'}"
                              @click="${() => store.updateTimeEntry({ ...entry, status: 'approved' })}"
                            >
                              ${iconCheck(14)}
                            </button>
                          `
                        : ''}
                      <button
                        type="button"
                        class="icon-btn"
                        title="${t.common.edit}"
                        @click="${() => this.openEditModal(entry)}"
                      >
                        ${iconEdit(14)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        title="${t.common.delete}"
                        @click="${() => (this.deletingEntry = entry)}"
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

  private renderByTaskView(
    filtered: TimeEntry[],
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const groupsMap = new Map<string, TimeEntry[]>();
    for (const entry of filtered) {
      const list = groupsMap.get(entry.taskId) || [];
      list.push(entry);
      groupsMap.set(entry.taskId, list);
    }

    return html`
      <div class="task-groups-list">
        ${Array.from(groupsMap.entries()).map(([taskId, list]) => {
          const task = store.tasks.find((tk) => tk.id === taskId);
          const proj = store.projects.find((p) => p.id === (task?.projectId || list[0]?.projectId));
          const groupHours = list.reduce((s, e) => s + e.hours, 0);
          const estHours = task?.estimatedHours || 0;
          const loggedTotal = task?.loggedHours ?? groupHours;
          const pct = estHours > 0 ? Math.min(100, Math.round((loggedTotal / estHours) * 100)) : 0;
          const isOver = estHours > 0 && loggedTotal > estHours;

          return html`
            <div class="task-group-card">
              <div class="task-group-head">
                <div class="task-group-left">
                  <button
                    type="button"
                    class="task-link-btn"
                    @click="${() => {
                      if (task) store.openTaskDetail(task.id);
                    }}"
                  >
                    <span class="task-key-chip">${taskId}</span>
                    <span>${task?.title || taskId}</span>
                  </button>
                  <div class="project-sub">
                    ${proj
                      ? html`<span class="dot" style="background: ${proj.color};"></span><span>${proj.name}</span>`
                      : ''}
                    <span>· ${list.length} ${isRu ? 'отчёт(ов)' : 'entries'}</span>
                  </div>
                </div>

                <div class="task-group-right">
                  <div class="plan-fact">
                    <span class="mono" style="font-size: 0.8rem; color: var(--text-secondary);">
                      ${loggedTotal.toFixed(1)} / ${estHours || '—'} ч
                    </span>
                    <div class="mini-track">
                      <div class="mini-fill ${isOver ? 'is-over' : ''}" style="width: ${pct}%;"></div>
                    </div>
                  </div>

                  <span class="hours-cell">${groupHours.toFixed(1)} ч</span>

                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.openCreateModal(proj?.id, taskId)}"
                  >
                    <span slot="icon-start">${iconPlus(13)}</span>
                    <span>${isRu ? 'Списать' : 'Log'}</span>
                  </app-button>
                </div>
              </div>

              <div class="task-entries-list">
                ${list.map((entry) => {
                  const user = store.users.find((u) => u.id === entry.userId);
                  return html`
                    <div class="task-entry-row">
                      <span class="mono">${entry.date}</span>
                      <div class="user-cell">
                        <span class="avatar-sm">${user?.avatar || '??'}</span>
                        <span>${user?.name || entry.userId}</span>
                      </div>
                      <span>
                        <app-badge variant="default" appearance="soft" size="sm">
                          ${t.timeTracking.categories[entry.category]}
                        </app-badge>
                      </span>
                      <span class="desc-cell" style="max-width: none;">${entry.description || '—'}</span>
                      <span class="hours-cell">${entry.hours.toFixed(1)} ч</span>
                      <span>
                        <app-status-chip
                          domain="timeEntry"
                          status="${entry.status}"
                          appearance="soft"
                          size="sm"
                        ></app-status-chip>
                      </span>
                      <div class="actions-row">
                        <button
                          type="button"
                          class="icon-btn"
                          title="${t.common.edit}"
                          @click="${() => this.openEditModal(entry)}"
                        >
                          ${iconEdit(14)}
                        </button>
                        <button
                          type="button"
                          class="icon-btn danger"
                          title="${t.common.delete}"
                          @click="${() => (this.deletingEntry = entry)}"
                        >
                          ${iconTrash(14)}
                        </button>
                      </div>
                    </div>
                  `;
                })}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderFormModal(
    t: ReturnType<typeof getTranslation>,
    isRu: boolean,
    categoryOptions: { value: TimeEntryCategory; label: string }[],
    statusOptions: { value: TimeEntryStatus; label: string; color: string }[]
  ) {
    const projectOptions = store.projects.map((p) => ({
      value: p.id,
      label: `[${p.key}] ${p.name}`,
      color: p.color,
    }));

    const taskOptions = store.tasks
      .filter((tk) => tk.projectId === this.formProjectId)
      .slice(0, 80)
      .map((tk) => ({
        value: tk.id,
        label: `${tk.id} · ${tk.title}`,
      }));

    const userOptions = store.users.map((u) => ({ value: u.id, label: u.name }));

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId
          ? isRu
            ? 'Редактирование отчёта о времени'
            : 'Edit Time Entry'
          : isRu
          ? 'Новая запись о времени'
          : 'New Time Entry'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              .value="${this.formProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.formProjectId = e.detail.value;
                const firstTask = store.tasks.find((tk) => tk.projectId === this.formProjectId);
                this.formTaskId = firstTask?.id || '';
                this.formError = '';
              }}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Задача' : 'Task'}"
              .value="${this.formTaskId}"
              .options="${taskOptions}"
              error="${this.formError}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.formTaskId = e.detail.value;
                this.formError = '';
              }}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Исполнитель' : 'Employee'}"
              .value="${this.formUserId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formUserId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата выполнения' : 'Date'}"
              .value="${this.formDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Затрачено часов' : 'Hours'}"
              .value="${this.formHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="ч"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formHours = e.detail.value)}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Категория работ' : 'Category'}"
              .value="${this.formCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formCategory = e.detail.value as TimeEntryCategory)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = e.detail.value as TimeEntryStatus)}"
            ></app-select>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <div class="switch-field" style="width: 100%;">
              <span>${isRu ? 'Оплачиваемые часы (Billable)' : 'Billable hours'}</span>
              <app-switch
                size="sm"
                ?checked="${this.formBillable}"
                @change="${(e: CustomEvent<{ checked: boolean }>) => (this.formBillable = e.detail.checked)}"
              ></app-switch>
            </div>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Описание выполненных работ' : 'Work description'}"
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
          <app-button variant="primary" @click="${this.handleSaveModal}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal(isRu: boolean) {
    return html`
      <app-modal
        ?open="${Boolean(this.deletingEntry)}"
        size="sm"
        title="${isRu ? 'Удалить запись о времени?' : 'Delete time entry?'}"
        @close="${() => (this.deletingEntry = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Удалить отчёт (${this.deletingEntry?.hours || 0} ч по задаче ${this.deletingEntry?.taskId || ''})? Часы будут вычтены из задачи.`
            : `Delete time entry (${this.deletingEntry?.hours || 0}h for ${this.deletingEntry?.taskId || ''})?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingEntry = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingEntry) {
                store.deleteTimeEntry(this.deletingEntry.id);
                this.deletingEntry = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private handleQuickSubmit() {
    if (!this.quickTaskId || this.quickHours <= 0) return;
    store.addTimeEntry({
      projectId: this.quickProjectId,
      taskId: this.quickTaskId,
      userId: this.quickUserId || store.users[0]?.id || 'user-1',
      date: this.quickDate || new Date().toISOString().slice(0, 10),
      hours: this.quickHours,
      billable: this.quickBillable,
      category: this.quickCategory,
      status: 'logged',
      description: this.quickDescription.trim(),
    });
    this.quickDescription = '';
  }

  private openCreateModal(presetProjectId?: string, presetTaskId?: string) {
    const projectId = presetProjectId || (this.projectFilter !== 'all' ? this.projectFilter : store.projects[0]?.id || '');
    const taskId = presetTaskId || store.tasks.find((tk) => tk.projectId === projectId)?.id || '';
    this.editingId = null;
    this.formProjectId = projectId;
    this.formTaskId = taskId;
    this.formUserId = store.users[0]?.id || '';
    this.formDate = new Date().toISOString().slice(0, 10);
    this.formHours = 2;
    this.formCategory = 'development';
    this.formStatus = 'logged';
    this.formBillable = true;
    this.formDescription = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(entry: TimeEntry) {
    this.editingId = entry.id;
    this.formProjectId = entry.projectId;
    this.formTaskId = entry.taskId;
    this.formUserId = entry.userId;
    this.formDate = entry.date;
    this.formHours = entry.hours;
    this.formCategory = entry.category;
    this.formStatus = entry.status;
    this.formBillable = entry.billable;
    this.formDescription = entry.description;
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSaveModal() {
    if (!this.formTaskId) {
      this.formError = this.currentLang === 'ru' ? 'Выберите задачу' : 'Select a task';
      return;
    }

    const payload = {
      projectId: this.formProjectId || store.projects[0]?.id || '',
      taskId: this.formTaskId,
      userId: this.formUserId || store.users[0]?.id || '',
      date: this.formDate || new Date().toISOString().slice(0, 10),
      hours: Math.max(0.25, Number(this.formHours) || 1),
      category: this.formCategory,
      status: this.formStatus,
      billable: this.formBillable,
      description: this.formDescription.trim(),
    };

    if (this.editingId) {
      const existing = this.entries.find((e) => e.id === this.editingId);
      store.updateTimeEntry({
        id: this.editingId,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      });
    } else {
      store.addTimeEntry(payload);
    }

    this.modalOpen = false;
  }
}
