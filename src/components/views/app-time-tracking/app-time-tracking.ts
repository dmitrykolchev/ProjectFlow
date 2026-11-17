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
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-entity-selector/app-entity-selector';
import { mapProjectOptions, mapTaskOptions, mapUserOptions } from '../../common/entity-selector-options';
import '../../common/app-switch/app-switch';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-pagination/app-pagination';
import { paginateItems } from '../../common/paginate';
import styles from './app-time-tracking.css';
import { eventValue } from '../../common/event-value';

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
  @state() private currentPage = 1;
  @state() private tablePageSize = store.customization.tablePageSize;

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
    this.currentPage = store.activeView === 'time-tracking' ? store.activePage : 1;
    this.entries = store.timeEntries;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.tablePageSize = store.customization.tablePageSize;
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
    const filtered = this.getFiltered();

    const totalHours = filtered.reduce((acc, e) => acc + e.hours, 0);
    const billableHours = filtered.filter((e) => e.billable).reduce((acc, e) => acc + e.hours, 0);
    const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
    const estCostRub = Math.round(billableHours * HOURLY_RATE_RUB);

    const projectOptions = [
      { value: 'all', label: t.viewTexts.timeTracking.filterAllProjects },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];

    const quickProjectOptions = mapProjectOptions(store.projects, t);

    const quickTaskOptions = mapTaskOptions(
      store.tasks.filter((tk) => tk.projectId === this.quickProjectId),
      t
    );

    const userFilterOptions = [
      { value: 'all', label: t.viewTexts.timeTracking.filterAllEmployees },
      ...store.users.map((u) => ({ value: u.id, label: u.name })),
    ];

    const userSelectOptions = mapUserOptions(store.users, t);

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
      { value: 'all', label: t.viewTexts.timeTracking.filterAllCategories },
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
        <app-metric-card size="compact" label="${t.timeTracking.totalHours}" value="${totalHours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}" subtitle="${t.viewTexts.timeTracking.kpiScopeSubtitle}"></app-metric-card>
        <app-metric-card size="compact" label="${t.timeTracking.billableHours}" value="${billableHours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}" valueColor="#10b981" subtitle="${billablePct}% ${t.viewTexts.timeTracking.kpiOfTotal}"></app-metric-card>
        <app-metric-card size="compact" label="${t.timeTracking.estimatedCost}" value="${estCostRub.toLocaleString(t.common.locale)} ₽" subtitle="${t.viewTexts.timeTracking.kpiRateBase(HOURLY_RATE_RUB.toLocaleString(t.common.locale))}"></app-metric-card>
        <app-metric-card size="compact" label="${t.timeTracking.entriesCount}" value="${filtered.length}" subtitle="${filtered.filter((e) => e.status === 'approved').length} ${t.viewTexts.timeTracking.kpiApproved}"></app-metric-card>
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
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelProject}"
              size="sm"
              .value="${this.quickProjectId}"
              .options="${quickProjectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.quickProjectId = eventValue(e);
                this.ensureQuickTaskValid();
              }}"
            ></app-entity-selector>
          </div>
          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelTask}"
              size="sm"
              .value="${this.quickTaskId}"
              .options="${quickTaskOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.quickTaskId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelEmployee}"
              size="sm"
              .value="${this.quickUserId}"
              .options="${userSelectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.quickUserId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div>
            <app-date-input
              label="${t.viewTexts.timeTracking.labelDate}"
              size="sm"
              .value="${this.quickDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.quickDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.timeTracking.labelHours}"
              size="sm"
              .value="${this.quickHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="${t.viewTexts.timeTracking.hoursUnit}"
              @change="${(e: CustomEvent<{ value: number }>) => (this.quickHours = eventValue(e))}"
            ></app-number-input>
          </div>
        </div>

        <div class="quick-log-row2">
          <div>
            <app-select
              label="${t.viewTexts.timeTracking.labelCategory}"
              size="sm"
              .value="${this.quickCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.quickCategory = eventValue(e) as TimeEntryCategory)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.timeTracking.labelComment}"
              size="sm"
              placeholder="${t.viewTexts.timeTracking.placeholderComment}"
              .value="${this.quickDescription}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.quickDescription = eventValue(e))}"
            ></app-input>
          </div>
          <div class="billable-toggle-wrap">
            <span>${t.viewTexts.timeTracking.billableSwitch}</span>
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
            <span>${t.viewTexts.timeTracking.logTimeButton}</span>
          </app-button>
        </div>
      </section>

      <!-- Filters Toolbar -->
      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 185px;"
        placeholder="${t.viewTexts.timeTracking.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'project', options: projectOptions },
          { key: 'user', options: userFilterOptions },
          { key: 'category', options: categoryFilterOptions },
        ]}"
        .values="${{ project: this.projectFilter, user: this.userFilter, category: this.categoryFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'project') this.projectFilter = eventValue(e);
          if (e.detail.key === 'user') this.userFilter = eventValue(e);
          if (e.detail.key === 'category') this.categoryFilter = eventValue(e) as 'all' | TimeEntryCategory;
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.viewMode}"
          .options="${[
            { value: 'journal', label: t.timeTracking.viewJournal },
            { value: 'by-task', label: t.timeTracking.viewByTask },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.viewMode = eventValue(e) as 'journal' | 'by-task';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.timeTracking.emptyNoEntries}"></app-empty-state>`
        : this.viewMode === 'journal'
        ? this.renderJournalTable(filtered, t)
        : this.renderByTaskView(filtered, t)}

      ${this.renderFormModal(t, categoryOptions, statusOptions)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderJournalTable(
    filtered: TimeEntry[],
    t: ReturnType<typeof getTranslation>
  ) {
    const paged = paginateItems(filtered, this.currentPage, this.tablePageSize);

    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t.viewTexts.timeTracking.labelDate}</th>
              <th>${t.viewTexts.timeTracking.thTaskProject}</th>
              <th>${t.viewTexts.timeTracking.labelEmployee}</th>
              <th>${t.viewTexts.timeTracking.thCategory}</th>
              <th>${t.viewTexts.timeTracking.thDescription}</th>
              <th>${t.viewTexts.timeTracking.labelHours}</th>
              <th>${t.viewTexts.timeTracking.thBilling}</th>
              <th>${t.viewTexts.timeTracking.statusLabel}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.map((entry) => {
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
                      <span>${task?.title || (t.viewTexts.timeTracking.removedTask)}</span>
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
                  <td class="hours-cell">${entry.hours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}</td>
                  <td>
                    <app-badge
                      variant="${entry.billable ? 'info' : 'default'}"
                      appearance="soft"
                      size="sm"
                    >
                      ${entry.billable ? (t.viewTexts.timeTracking.badgeBillableShort) : t.viewTexts.timeTracking.badgeInternalShort}
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
                            <app-button
                              class="approve-action"
                              size="sm"
                              variant="icon"
                              title="${t.viewTexts.timeTracking.approveEntryTitle}"
                              @click="${() => store.updateTimeEntry({ ...entry, status: 'approved' })}"
                            >
                              <span slot="start">${iconCheck(14)}</span>
                            </app-button>
                          `
                        : ''}
                      <app-button
                        size="sm"
                        variant="icon"
                        title="${t.common.edit}"
                        @click="${() => this.openEditModal(entry)}"
                      >
                        <span slot="start">${iconEdit(14)}</span>
                      </app-button>
                      <app-button
                        class="danger-action"
                        size="sm"
                        variant="icon"
                        title="${t.common.delete}"
                        @click="${() => (this.deletingEntry = entry)}"
                      >
                        <span slot="start">${iconTrash(14)}</span>
                      </app-button>
                    </div>
                  </td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
      <app-pagination
        layout-mode="table"
        .totalItems="${paged.totalItems}"
        .page="${paged.page}"
        .pageSize="${paged.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setTablePageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderByTaskView(
    filtered: TimeEntry[],
    t: ReturnType<typeof getTranslation>
  ) {
    const groupsMap = new Map<string, TimeEntry[]>();
    for (const entry of filtered) {
      const list = groupsMap.get(entry.taskId) || [];
      list.push(entry);
      groupsMap.set(entry.taskId, list);
    }

    const pagedGroups = paginateItems(
      Array.from(groupsMap.entries()),
      this.currentPage,
      this.tablePageSize
    );

    return html`
      <div class="task-groups-list">
        ${pagedGroups.items.map(([taskId, list]) => {
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
                    <span>· ${list.length} ${t.viewTexts.timeTracking.entriesCountSuffix}</span>
                  </div>
                </div>

                <div class="task-group-right">
                  <div class="plan-fact">
                    <span class="mono" style="font-size: 0.8rem; color: var(--text-secondary);">
                      ${loggedTotal.toFixed(1)} / ${estHours || '—'}${t.viewTexts.timeTracking.hoursSuffix}
                    </span>
                    <div class="mini-track">
                      <div class="mini-fill ${isOver ? 'is-over' : ''}" style="width: ${pct}%;"></div>
                    </div>
                  </div>

                  <span class="hours-cell">${groupHours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}</span>

                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.openCreateModal(proj?.id, taskId)}"
                  >
                    <span slot="icon-start">${iconPlus(13)}</span>
                    <span>${t.viewTexts.timeTracking.logButton}</span>
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
                      <span class="hours-cell">${entry.hours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}</span>
                      <span>
                        <app-status-chip
                          domain="timeEntry"
                          status="${entry.status}"
                          appearance="soft"
                          size="sm"
                        ></app-status-chip>
                      </span>
                      <div class="actions-row">
                          <app-button
                            size="sm"
                            variant="icon"
                            title="${t.common.edit}"
                            @click="${() => this.openEditModal(entry)}"
                          >
                            <span slot="start">${iconEdit(14)}</span>
                          </app-button>
                          <app-button
                            class="danger-action"
                            size="sm"
                            variant="icon"
                            title="${t.common.delete}"
                            @click="${() => (this.deletingEntry = entry)}"
                          >
                            <span slot="start">${iconTrash(14)}</span>
                          </app-button>
                      </div>
                    </div>
                  `;
                })}
              </div>
            </div>
          `;
        })}
      </div>
      <app-pagination
        layout-mode="table"
        .totalItems="${pagedGroups.totalItems}"
        .page="${pagedGroups.page}"
        .pageSize="${pagedGroups.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setTablePageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderFormModal(
    t: ReturnType<typeof getTranslation>,
    categoryOptions: { value: TimeEntryCategory; label: string }[],
    statusOptions: { value: TimeEntryStatus; label: string; color: string }[]
  ) {
    const projectOptions = mapProjectOptions(store.projects, t);

    const taskOptions = mapTaskOptions(
      store.tasks.filter((tk) => tk.projectId === this.formProjectId),
      t
    );

    const userOptions = mapUserOptions(store.users, t);

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId ? t.viewTexts.timeTracking.modalTitleEdit : t.viewTexts.timeTracking.modalTitleCreate}"
        @close="${() => (this.modalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelProject}"
              .value="${this.formProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.formProjectId = eventValue(e);
                const firstTask = store.tasks.find((tk) => tk.projectId === this.formProjectId);
                this.formTaskId = firstTask?.id || '';
                this.formError = '';
              }}"
            ></app-entity-selector>
          </div>
          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelTask}"
              .value="${this.formTaskId}"
              .options="${taskOptions}"
              error="${this.formError}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.formTaskId = eventValue(e);
                this.formError = '';
              }}"
            ></app-entity-selector>
          </div>
          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelEmployee}"
              .value="${this.formUserId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formUserId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div>
            <app-date-input
              label="${t.viewTexts.timeTracking.labelDateDone}"
              .value="${this.formDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.timeTracking.labelHoursSpent}"
              .value="${this.formHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="${t.viewTexts.timeTracking.hoursUnit}"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formHours = eventValue(e))}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.timeTracking.labelCategory}"
              .value="${this.formCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formCategory = eventValue(e) as TimeEntryCategory)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.timeTracking.statusLabel}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as TimeEntryStatus)}"
            ></app-select>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <div class="switch-field" style="width: 100%;">
              <span>${t.viewTexts.timeTracking.billableHoursLabel}</span>
              <app-switch
                size="sm"
                ?checked="${this.formBillable}"
                @change="${(e: CustomEvent<{ checked: boolean }>) => (this.formBillable = e.detail.checked)}"
              ></app-switch>
            </div>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.timeTracking.labelWorkDescription}"
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
          <app-button variant="primary" @click="${this.handleSaveModal}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingEntry)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.timeEntryDelete.title}"
        action="${t.viewTexts.confirmDialogs.timeEntryDelete.action(
          this.deletingEntry?.hours || 0,
          this.deletingEntry?.taskId || ''
        )}"
        result="${t.viewTexts.confirmDialogs.timeEntryDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingEntry = null)}"
        @confirm="${() => {
          if (this.deletingEntry) {
            store.deleteTimeEntry(this.deletingEntry.id);
            this.deletingEntry = null;
          }
        }}"
      ></app-confirm-dialog>
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
      this.formError = getTranslation(this.currentLang).viewTexts.timeTracking.selectTaskError;
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