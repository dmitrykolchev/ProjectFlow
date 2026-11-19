import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { DocumentItem, TimeEntry, TimeEntryCategory, TimeEntryStatus } from '../../../types';
import {
  iconCheck,
  iconClock,
  iconEdit,
  iconEye,
  iconPaperclip,
  iconPlus,
  iconTrash,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-entity-selector/app-entity-selector';
import { mapProjectOptions, mapTaskOptions, mapUserOptions } from '../../common/entity-selector-options';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-time-entry-form/app-time-entry-form';
import '../../common/app-project-attachments/app-project-attachments';
import {
  AttachmentsChangeDetail,
  commitPendingAttachments,
  PendingAttachmentFile,
} from '../../common/app-project-attachments/app-project-attachments';
import '../../common/app-document-previewer/app-document-previewer';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-pagination/app-pagination';
import '../app-data-grid/app-data-grid';
import '../../common/app-data-grid-column/app-data-grid-column';
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
  @state() private viewMode: 'journal' | 'grid' | 'by-task' = 'journal';
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
  @state() private quickAttachOpen = false;
  @state() private quickDocumentIds: string[] = [];
  @state() private quickPendingFiles: PendingAttachmentFile[] = [];

  // Create / Edit modal
  @state() private modalOpen = false;
  @state() private editingEntry: TimeEntry | null = null;
  @state() private presetTimeProjectId: string | null = null;
  @state() private presetTimeTaskId: string | null = null;

  @state() private previewDoc: DocumentItem | null = null;
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
    if (this.previewDoc) {
      this.previewDoc = store.documents.find((d) => d.id === this.previewDoc!.id) || null;
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

    const quickProjectOptions = mapProjectOptions(store.projects, t);
    const userSelectOptions = mapUserOptions(store.users, t);

    // filter bar entity selectors reuse the same rich option lists as the quick report
    const projectFilterOptions = [
      { value: 'all', label: t.viewTexts.timeTracking.filterAllProjects },
      ...quickProjectOptions,
    ];

    const userFilterOptions = [
      { value: 'all', label: t.viewTexts.timeTracking.filterAllEmployees },
      ...userSelectOptions,
    ];

    const quickTaskOptions = mapTaskOptions(
      store.tasks.filter((tk) => tk.projectId === this.quickProjectId),
      t
    );

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
          <app-checkbox
            label="${t.viewTexts.timeTracking.billableSwitch}"
            .checked="${this.quickBillable}"
            @change="${(e: CustomEvent<{ checked: boolean }>) => (this.quickBillable = e.detail.checked)}"
          ></app-checkbox>
          <app-button
            variant="${this.quickAttachOpen || this.quickDocumentIds.length + this.quickPendingFiles.length > 0 ? 'secondary' : 'outline'}"
            size="sm"
            title="${t.viewTexts.timeTracking.attachFilesTitle}"
            @click="${() => (this.quickAttachOpen = !this.quickAttachOpen)}"
          >
            <span slot="icon-start">${iconPaperclip(14)}</span>
            <span>
              ${t.viewTexts.attachments.attachQuickButton}${this.quickDocumentIds.length + this.quickPendingFiles.length > 0
                ? ` (${this.quickDocumentIds.length + this.quickPendingFiles.length})`
                : ''}
            </span>
          </app-button>
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

        ${this.quickAttachOpen
          ? html`
              <div class="quick-log-attachments">
                <app-project-attachments
                  compact
                  project-id="${this.quickProjectId}"
                  .documentIds="${this.quickDocumentIds}"
                  .pendingFiles="${this.quickPendingFiles}"
                  @attachments-change="${(e: CustomEvent<AttachmentsChangeDetail>) => {
                    this.quickDocumentIds = e.detail.documentIds;
                    this.quickPendingFiles = e.detail.pendingFiles;
                  }}"
                ></app-project-attachments>
              </div>
            `
          : ''}
      </section>

      <!-- Filters Toolbar -->
      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 185px;"
        placeholder="${t.viewTexts.timeTracking.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'project', type: 'entity', options: projectFilterOptions },
          { key: 'user', type: 'entity', options: userFilterOptions },
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
            { value: 'grid', label: t.timeTracking.viewGrid },
            { value: 'by-task', label: t.timeTracking.viewByTask },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.viewMode = eventValue(e) as 'journal' | 'grid' | 'by-task';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.timeTracking.emptyNoEntries}"></app-empty-state>`
        : this.viewMode === 'journal'
        ? this.renderJournalTable(filtered, t)
        : this.viewMode === 'grid'
        ? this.renderGridView(filtered, t)
        : this.renderByTaskView(filtered, t)}

      ${this.renderFormModal(t)}
      ${this.renderPreviewModal(t)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderGridView(
    filtered: TimeEntry[],
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <div class="data-grid-frame">
        <app-data-grid
          .rows="${filtered as unknown as Record<string, unknown>[]}"
          .selectable="${false}"
          export-filename="projectflow_time_entries"
          empty-text="${t.viewTexts.timeTracking.emptyNoEntries}"
        >
          <app-data-grid-column
            field="date"
            caption="${t.viewTexts.timeTracking.labelDate}"
            width="115"
            min-width="95"
            sortable
            groupable
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return html`
                <app-link
                  class="dg-link"
                  size="sm"
                  variant="primary"
                  title="${t.viewTexts.timeTracking.openDetailsTitle}"
                  @click="${() => store.openTimeEntryDetail(entry.id)}"
                >
                  <span class="dg-mono">${entry.date}</span>
                </app-link>
              `;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="taskId"
            caption="${t.viewTexts.timeTracking.thTaskProject}"
            width="280"
            min-width="180"
            sortable
            groupable
            .sortValue="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return store.tasks.find((tk) => tk.id === entry.taskId)?.title || entry.taskId;
            }}"
            .groupFormatter="${(val: unknown) => {
              const taskId = String(val || '');
              const task = store.tasks.find((tk) => tk.id === taskId);
              return task ? `${taskId} · ${task.title}` : taskId;
            }}"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              const task = store.tasks.find((tk) => tk.id === entry.taskId);
              const proj = store.projects.find((p) => p.id === entry.projectId);
              return html`
                <div class="dg-stack">
                  <app-link
                    class="dg-link"
                    size="md"
                    variant="primary"
                    @click="${() => {
                      if (task) store.openTaskDetail(task.id);
                    }}"
                  >
                    <span class="dg-task-key" slot="start">${entry.taskId}</span>
                    <span>${task?.title || t.viewTexts.timeTracking.removedTask}</span>
                  </app-link>
                  ${proj
                    ? html`
                        <span class="dg-dot-row dg-sub">
                          <span class="dg-dot" style="background: ${proj.color};"></span>
                          <span>${proj.name}</span>
                        </span>
                      `
                    : ''}
                </div>
              `;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="projectId"
            caption="${t.viewTexts.timeTracking.labelProject}"
            width="175"
            sortable
            groupable
            hidden
            .sortValue="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return store.projects.find((p) => p.id === entry.projectId)?.name || entry.projectId;
            }}"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              const proj = store.projects.find((p) => p.id === entry.projectId);
              return proj
                ? html`
                    <span class="dg-dot-row">
                      <span class="dg-dot" style="background: ${proj.color};"></span>
                      <span>${proj.name}</span>
                    </span>
                  `
                : html`<span>—</span>`;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="userId"
            caption="${t.viewTexts.timeTracking.labelEmployee}"
            width="180"
            sortable
            groupable
            .sortValue="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return store.users.find((u) => u.id === entry.userId)?.name || entry.userId;
            }}"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              const user = store.users.find((u) => u.id === entry.userId);
              return html`
                <div class="dg-user">
                  <span class="dg-avatar-sm">${user?.avatar || '??'}</span>
                  <span>${user?.name || entry.userId}</span>
                </div>
              `;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="category"
            caption="${t.viewTexts.timeTracking.thCategory}"
            width="150"
            sortable
            groupable
            .groupFormatter="${(val: unknown) =>
              t.timeTracking.categories[String(val) as TimeEntryCategory] || String(val)}"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return html`
                <app-badge variant="default" appearance="soft" size="sm">
                  ${t.timeTracking.categories[entry.category]}
                </app-badge>
              `;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="description"
            caption="${t.viewTexts.timeTracking.thDescription}"
            width="240"
            sortable
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return html`<span class="dg-sub" style="font-size: 0.78rem; color: var(--text-secondary);">${entry.description || '—'}</span>`;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="hours"
            caption="${t.viewTexts.timeTracking.labelHours}"
            width="95"
            sortable
            align="right"
            resizable="false"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return html`<span class="dg-hours">${entry.hours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}</span>`;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="billable"
            caption="${t.viewTexts.timeTracking.thBilling}"
            width="125"
            sortable
            groupable
            .groupFormatter="${(val: unknown) =>
              String(val) === 'true'
                ? t.viewTexts.timeTracking.badgeBillableShort
                : t.viewTexts.timeTracking.badgeInternalShort}"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return html`
                <app-badge
                  variant="${entry.billable ? 'info' : 'default'}"
                  appearance="soft"
                  size="sm"
                >
                  ${entry.billable
                    ? t.viewTexts.timeTracking.badgeBillableShort
                    : t.viewTexts.timeTracking.badgeInternalShort}
                </app-badge>
              `;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="documentIds"
            caption="${t.viewTexts.timeTracking.thAttachments}"
            width="175"
            sortable
            .sortValue="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return entry.documentIds?.length || 0;
            }}"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              const docs = this.getAttachedDocs(entry);
              if (docs.length === 0) return html`<span class="dg-sub">—</span>`;
              return html`
                <div class="dg-stack">
                  ${docs.slice(0, 2).map(
                    (doc) => html`
                      <app-link
                        class="dg-link"
                        size="sm"
                        variant="primary"
                        @click="${() => (this.previewDoc = doc)}"
                      >
                        <span slot="start">${iconPaperclip(12)}</span>
                        <span>${doc.fileName}</span>
                      </app-link>
                    `
                  )}
                  ${docs.length > 2
                    ? html`<span class="dg-sub">+${docs.length - 2}</span>`
                    : ''}
                </div>
              `;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="status"
            caption="${t.viewTexts.timeTracking.statusLabel}"
            width="140"
            sortable
            groupable
            cell-type="status"
            .groupFormatter="${(val: unknown) =>
              t.timeTracking.statuses[String(val) as TimeEntryStatus] || String(val)}"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return html`
                <app-status-chip
                  domain="timeEntry"
                  status="${entry.status}"
                  appearance="soft"
                  size="sm"
                ></app-status-chip>
              `;
            }}"
          ></app-data-grid-column>

          <app-data-grid-column
            field="_actions"
            caption=""
            width="142"
            min-width="120"
            align="right"
            resizable="false"
            reorderable="false"
            hideable="false"
            exportable="false"
            .template="${(row: Record<string, unknown>) => {
              const entry = row as unknown as TimeEntry;
              return html`
                <div class="dg-actions">
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.viewTexts.timeTracking.openDetailsTitle}"
                    @click="${() => store.openTimeEntryDetail(entry.id)}"
                  >
                    <span slot="start">${iconEye(14)}</span>
                  </app-button>
                  ${entry.status !== 'approved'
                    ? html`
                        <app-button
                          action="accept"
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
                    action="delete"
                    size="sm"
                    variant="icon"
                    title="${t.common.delete}"
                    @click="${() => (this.deletingEntry = entry)}"
                  >
                    <span slot="start">${iconTrash(14)}</span>
                  </app-button>
                </div>
              `;
            }}"
          ></app-data-grid-column>
        </app-data-grid>
      </div>
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
              <th>${t.viewTexts.timeTracking.thAttachments}</th>
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
              const docs = this.getAttachedDocs(entry);

              return html`
                <tr>
                  <td class="mono" style="white-space: nowrap;">
                    <app-link
                      size="sm"
                      variant="primary"
                      title="${t.viewTexts.timeTracking.openDetailsTitle}"
                      @click="${() => store.openTimeEntryDetail(entry.id)}"
                    >
                      <span class="mono">${entry.date}</span>
                    </app-link>
                  </td>
                  <td>
                    <app-link
                      class="task-link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => {
                        if (task) store.openTaskDetail(task.id);
                      }}"
                    >
                      <span class="task-key-chip" slot="start">${entry.taskId}</span>
                      <span>${task?.title || (t.viewTexts.timeTracking.removedTask)}</span>
                    </app-link>
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
                  <td>
                    ${this.renderEntryAttachmentsCell(docs, t)}
                  </td>
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
                      <app-button
                        size="sm"
                        variant="icon"
                        title="${t.viewTexts.timeTracking.openDetailsTitle}"
                        @click="${() => store.openTimeEntryDetail(entry.id)}"
                      >
                        <span slot="start">${iconEye(14)}</span>
                      </app-button>
                      ${entry.status !== 'approved'
                        ? html`
                            <app-button
                              action="accept"
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
                        action="delete"
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
                  <app-link
                    class="task-link-btn"
                    size="md"
                    variant="primary"
                    @click="${() => {
                      if (task) store.openTaskDetail(task.id);
                    }}"
                  >
                    <span class="task-key-chip" slot="start">${taskId}</span>
                    <span>${task?.title || taskId}</span>
                  </app-link>
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
                  const docs = this.getAttachedDocs(entry);
                  return html`
                    <div class="task-entry-row">
                      <app-link
                        size="sm"
                        variant="primary"
                        title="${t.viewTexts.timeTracking.openDetailsTitle}"
                        @click="${() => store.openTimeEntryDetail(entry.id)}"
                      >
                        <span class="mono">${entry.date}</span>
                      </app-link>
                      <div class="user-cell">
                        <span class="avatar-sm">${user?.avatar || '??'}</span>
                        <span>${user?.name || entry.userId}</span>
                      </div>
                      <span>
                        <app-badge variant="default" appearance="soft" size="sm">
                          ${t.timeTracking.categories[entry.category]}
                        </app-badge>
                      </span>
                      <div class="desc-cell" style="max-width: none;">
                        <div>${entry.description || '—'}</div>
                        ${docs.length > 0
                          ? html`<div style="margin-top: 0.28rem;">${this.renderEntryAttachmentsCell(docs, t)}</div>`
                          : ''}
                      </div>
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
                            title="${t.viewTexts.timeTracking.openDetailsTitle}"
                            @click="${() => store.openTimeEntryDetail(entry.id)}"
                          >
                            <span slot="start">${iconEye(14)}</span>
                          </app-button>
                          <app-button
                            size="sm"
                            variant="icon"
                            title="${t.common.edit}"
                            @click="${() => this.openEditModal(entry)}"
                          >
                            <span slot="start">${iconEdit(14)}</span>
                          </app-button>
                          <app-button
                            action="delete"
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

  private renderFormModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-time-entry-form
        .open="${this.modalOpen}"
        .entry="${this.editingEntry}"
        .presetProjectId="${this.presetTimeProjectId}"
        .presetTaskId="${this.presetTimeTaskId}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-time-entry-form>
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

  private getAttachedDocs(entry: TimeEntry): DocumentItem[] {
    if (!entry.documentIds?.length) return [];
    return entry.documentIds
      .map((id) => store.documents.find((d) => d.id === id))
      .filter((d): d is DocumentItem => Boolean(d));
  }

  private renderEntryAttachmentsCell(
    docs: DocumentItem[],
    t: ReturnType<typeof getTranslation>
  ) {
    if (docs.length === 0) {
      return html`<span style="color: var(--text-muted);">—</span>`;
    }
    return html`
      <div class="attach-chips-list">
        ${docs.slice(0, 2).map(
          (doc) => html`
            <button
              type="button"
              class="attach-chip-btn"
              title="${doc.title} (${t.viewTexts.attachments.previewButton})"
              @click="${() => (this.previewDoc = doc)}"
            >
              ${iconPaperclip(12)}
              <span class="attach-chip-name">${doc.fileName}</span>
            </button>
          `
        )}
        ${docs.length > 2
          ? html`<app-badge variant="default" appearance="soft" size="sm">+${docs.length - 2}</app-badge>`
          : ''}
      </div>
    `;
  }

  private renderPreviewModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-modal
        ?open="${Boolean(this.previewDoc)}"
        size="xl"
        title="${this.previewDoc?.title || ''}"
        @close="${() => (this.previewDoc = null)}"
      >
        ${this.previewDoc
          ? html`
              <app-document-previewer
                .document="${this.previewDoc}"
                .showHeader="${false}"
                height="480px"
              ></app-document-previewer>
            `
          : ''}
      </app-modal>
    `;
  }

  private handleQuickSubmit() {
    if (!this.quickTaskId || this.quickHours <= 0) return;
    const t = getTranslation(this.currentLang);
    const documentIds = commitPendingAttachments({
      projectId: this.quickProjectId,
      taskId: this.quickTaskId,
      uploadedById: this.quickUserId || store.users[0]?.id || 'user-1',
      category: 'report',
      tags: [t.viewTexts.attachments.tagTimeEntry, this.quickTaskId],
      existingDocumentIds: this.quickDocumentIds,
      pendingFiles: this.quickPendingFiles,
      description:
        this.quickDescription.trim() ||
        t.viewTexts.attachments.defaultTimeDescription(this.quickTaskId),
      versionNote: t.viewTexts.attachments.defaultTimeDescription(this.quickTaskId),
    });

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
      documentIds,
    });
    this.quickDescription = '';
    this.quickDocumentIds = [];
    this.quickPendingFiles = [];
    this.quickAttachOpen = false;
  }

  private openCreateModal(presetProjectId?: string, presetTaskId?: string) {
    this.editingEntry = null;
    this.presetTimeProjectId =
      presetProjectId ?? (this.projectFilter !== 'all' ? this.projectFilter : null);
    this.presetTimeTaskId = presetTaskId ?? null;
    this.modalOpen = true;
  }

  private openEditModal(entry: TimeEntry) {
    this.editingEntry = entry;
    this.modalOpen = true;
  }
}