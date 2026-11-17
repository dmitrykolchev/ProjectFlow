import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  ProjectRequirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
  TaskPriority,
} from '../../../types';
import {
  DecomposedTaskDraft,
  decomposeRequirementsToTasks,
  extractDocumentTextContext,
  formatAiError,
  generateProjectBlueprintFromSpec,
} from '../../../services/openai-client';
import {
  iconAlertTriangle,
  iconBookOpen,
  iconCheck,
  iconChevronRight,
  iconCpu,
  iconEdit,
  iconFileText,
  iconLayers,
  iconPlus,
  iconTrash,
  iconX,
  iconZap,
} from '../../common/icons';
import {
  mapDocumentOptions,
  mapKnowledgeOptions,
  mapProjectOptions,
  mapUserOptions,
} from '../../common/entity-selector-options';
import { eventValue } from '../../common/event-value';
import { paginateItems } from '../../common/paginate';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/card-footer/card-footer';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-input/app-input';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../common/app-modal/app-modal';
import '../../common/app-number-input/app-number-input';
import '../../common/app-page-header/app-page-header';
import '../../common/app-pagination/app-pagination';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-textarea/app-textarea';
import '../../dashboard/app-metric-card/app-metric-card';
import styles from './app-requirements.css';

@customElement('app-requirements')
export class AppRequirements extends LitElement {
  @state() private requirements: ProjectRequirement[] = store.requirements;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private projectFilter = store.requirementFilterProjectId || 'all';
  @state() private typeFilter: 'all' | RequirementType = 'all';
  @state() private priorityFilter: 'all' | RequirementPriority = 'all';
  @state() private statusFilter: 'all' | RequirementStatus = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;
  @state() private selectedReqIds: string[] = [];

  // Create / Edit Modal
  @state() private reqModalOpen = false;
  @state() private editingReqId: string | null = null;
  @state() private formProjectId = store.projects[0]?.id || '';
  @state() private formSourceDocId = '';
  @state() private formCode = '';
  @state() private formType: RequirementType = 'functional';
  @state() private formCategory = 'Core';
  @state() private formPriority: RequirementPriority = 'high';
  @state() private formStatus: RequirementStatus = 'approved';
  @state() private formTitle = '';
  @state() private formDescription = '';
  @state() private formAcceptance = '';
  @state() private formKnowledgeIds: string[] = [];
  @state() private formError = '';

  // Delete confirm
  @state() private deletingReq: ProjectRequirement | null = null;

  // Generate from Spec Modal
  @state() private specModalOpen = false;
  @state() private specProjectId = store.projects[0]?.id || '';
  @state() private specDocId = '';
  @state() private specText = '';
  @state() private specLoading = false;
  @state() private specError = '';

  // Decompose into Tasks State & Modal
  @state() private decomposing = false;
  @state() private decomposeError = '';
  @state() private decomposeModalOpen = false;
  @state() private draftTasks: Array<DecomposedTaskDraft & { selected: boolean }> = [];
  @state() private decomposeAssigneeId = store.currentUserId || store.users[0]?.id || '';
  @state() private decomposeProjectId = store.projects[0]?.id || '';
  @state() private decomposeModel = '';

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
    this.currentPage = store.activeView === 'requirements' ? store.activePage : 1;
    this.requirements = store.requirements;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
    if (store.requirementFilterProjectId && store.requirementFilterProjectId !== this.projectFilter) {
      this.projectFilter = store.requirementFilterProjectId;
    }
    if (!store.users.some((u) => u.id === this.decomposeAssigneeId)) {
      this.decomposeAssigneeId = store.currentUserId || store.users[0]?.id || '';
    }
    if (!store.projects.some((p) => p.id === this.formProjectId)) {
      this.formProjectId = store.projects[0]?.id || '';
    }
    if (!store.projects.some((p) => p.id === this.specProjectId)) {
      this.specProjectId = store.projects[0]?.id || '';
    }
  }

  private getLinkedTasksForReq(req: ProjectRequirement) {
    const idSet = new Set(req.linkedTaskIds || []);
    return store.tasks.filter(
      (tk) => idSet.has(tk.id) || (tk.requirementIds || []).includes(req.id)
    );
  }

  private getFilteredRequirements(): ProjectRequirement[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.requirements.filter((req) => {
      if (this.projectFilter !== 'all' && req.projectId !== this.projectFilter) return false;
      if (this.typeFilter !== 'all' && req.type !== this.typeFilter) return false;
      if (this.priorityFilter !== 'all' && req.priority !== this.priorityFilter) return false;
      if (this.statusFilter !== 'all' && req.status !== this.statusFilter) return false;
      if (!query) return true;
      const proj = store.projects.find((p) => p.id === req.projectId);
      return (
        req.code.toLowerCase().includes(query) ||
        req.title.toLowerCase().includes(query) ||
        req.category.toLowerCase().includes(query) ||
        req.description.toLowerCase().includes(query) ||
        (proj?.name.toLowerCase().includes(query) ?? false) ||
        (proj?.key.toLowerCase().includes(query) ?? false) ||
        req.acceptanceCriteria.some((c) => c.toLowerCase().includes(query))
      );
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFilteredRequirements();

    const scopeList =
      this.projectFilter === 'all'
        ? this.requirements
        : this.requirements.filter((r) => r.projectId === this.projectFilter);

    const frCount = scopeList.filter((r) => r.type === 'functional').length;
    const nfrCount = scopeList.filter((r) => r.type === 'non_functional').length;
    const coveredCount = scopeList.filter((r) => this.getLinkedTasksForReq(r).length > 0).length;

    const projectOptions = [
      { value: 'all', label: t.viewTexts.requirements.filterAllProjects },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}` })),
    ];

    const typeOptions = [
      { value: 'all', label: t.viewTexts.requirements.filterAllTypes },
      { value: 'functional', label: t.requirements.functional },
      { value: 'non_functional', label: t.requirements.nonFunctional },
    ];

    const priorityOptions = [
      { value: 'all', label: t.viewTexts.requirements.filterAllPriorities },
      { value: 'critical', label: t.requirements.priorities.critical },
      { value: 'high', label: t.requirements.priorities.high },
      { value: 'medium', label: t.requirements.priorities.medium },
      { value: 'low', label: t.requirements.priorities.low },
    ];

    const statusOptions = [
      { value: 'all', label: t.viewTexts.requirements.filterAllStatuses },
      { value: 'draft', label: t.requirements.statuses.draft },
      { value: 'approved', label: t.requirements.statuses.approved },
      { value: 'in_progress', label: t.requirements.statuses.in_progress },
      { value: 'implemented', label: t.requirements.statuses.implemented },
      { value: 'verified', label: t.requirements.statuses.verified },
    ];

    const allFilteredSelected =
      filtered.length > 0 && filtered.every((r) => this.selectedReqIds.includes(r.id));

    return html`
      <app-page-header
        title="${t.navigation.requirements}"
        subtitle="${t.viewTexts.pageSubtitles.requirements}"
      >
        <span slot="icon">${iconLayers(28)}</span>
        <div slot="actions" class="header-actions">
          <app-button variant="secondary" size="md" @click="${this.openSpecModal}">
            <span slot="icon-start">${iconFileText(16)}</span>
            <span>${t.viewTexts.requirements.generateFromSpecBtn}</span>
          </app-button>
          <app-button variant="primary" size="md" @click="${this.openCreateReqModal}">
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${t.viewTexts.requirements.addReqBtn}</span>
          </app-button>
        </div>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${t.viewTexts.requirements.kpiTotal}"
          value="${scopeList.length}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.requirements.kpiFunctional}"
          value="${frCount}"
          valueColor="var(--color-info, #38bdf8)"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.requirements.kpiNonFunctional}"
          value="${nfrCount}"
          valueColor="#c084fc"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.requirements.kpiCovered}"
          value="${coveredCount} / ${scopeList.length}"
          valueColor="var(--color-success, #10b981)"
        ></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${t.viewTexts.requirements.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'project', options: projectOptions },
          { key: 'type', options: typeOptions },
          { key: 'priority', options: priorityOptions },
          { key: 'status', options: statusOptions },
        ]}"
        .values="${{
          project: this.projectFilter,
          type: this.typeFilter,
          priority: this.priorityFilter,
          status: this.statusFilter,
        }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          const val = eventValue(e);
          if (e.detail.key === 'project') {
            this.projectFilter = val;
            store.requirementFilterProjectId = val;
          }
          if (e.detail.key === 'type') this.typeFilter = val as 'all' | RequirementType;
          if (e.detail.key === 'priority') this.priorityFilter = val as 'all' | RequirementPriority;
          if (e.detail.key === 'status') this.statusFilter = val as 'all' | RequirementStatus;
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.requirements.viewCards },
            { value: 'table', label: t.viewTexts.requirements.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.displayMode = eventValue(e) as 'cards' | 'table';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      <div class="bulk-toolbar">
        <div class="bulk-left">
          ${filtered.length > 0
            ? html`
                <app-button
                  size="sm"
                  variant="ghost"
                  @click="${() => this.toggleSelectAll(filtered)}"
                >
                  ${allFilteredSelected
                    ? t.viewTexts.requirements.deselectAllLabel
                    : t.viewTexts.requirements.selectAllLabel}
                </app-button>
              `
            : ''}
          ${this.selectedReqIds.length > 0
            ? html`
                <span class="selected-pill">
                  ${t.viewTexts.requirements.selectedCount(this.selectedReqIds.length)}
                </span>
              `
            : ''}
        </div>
        <div class="bulk-right">
          <app-button
            size="sm"
            variant="primary"
            ?disabled="${this.selectedReqIds.length === 0 || this.decomposing}"
            @click="${() => this.handleDecompose(this.selectedReqIds)}"
          >
            <span slot="icon-start">${iconCpu(14)}</span>
            <span>
              ${this.decomposing
                ? t.viewTexts.requirements.decomposingBtn
                : t.viewTexts.requirements.decomposeSelectedBtn}
            </span>
          </app-button>
        </div>
      </div>

      ${this.decomposeError
        ? html`
            <div class="error-banner">
              <span style="flex-shrink: 0;">${iconAlertTriangle(15)}</span>
              <span>${this.decomposeError}</span>
            </div>
          `
        : ''}

      ${filtered.length === 0
        ? html`
            <app-empty-state
              title="${t.viewTexts.requirements.emptyNoReqs}"
              description="${t.viewTexts.requirements.emptyHint}"
            >
              <app-button slot="action" variant="primary" @click="${this.openCreateReqModal}">
                <span slot="icon-start">${iconPlus(15)}</span>
                <span>${t.viewTexts.requirements.addReqBtn}</span>
              </app-button>
            </app-empty-state>
          `
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      ${this.renderReqModal(t)}
      ${this.renderSpecModal(t)}
      ${this.renderDecomposeModal(t)}
      ${this.renderDeleteDialog(t)}
    `;
  }

  private renderCards(list: ProjectRequirement[], t: ReturnType<typeof getTranslation>) {
    const paged = paginateItems(list, this.currentPage, this.cardPageSize);

    return html`
      <div class="cards-grid">
        ${paged.items.map((req) => {
          const isSelected = this.selectedReqIds.includes(req.id);
          const proj = store.projects.find((p) => p.id === req.projectId);
          const linkedTasks = this.getLinkedTasksForReq(req);
          const kbCount = (req.linkedKnowledgeIds || []).length;

          return html`
            <article
              class="req-card ${isSelected ? 'is-selected' : ''}"
              @click="${() => store.openRequirementDetail(req.id)}"
            >
              <div class="req-card-head">
                <div class="req-card-badges">
                  <div @click="${(e: Event) => e.stopPropagation()}">
                    <app-checkbox
                      .checked="${isSelected}"
                      @change="${() => this.toggleSelectOne(req.id)}"
                    ></app-checkbox>
                  </div>
                  <span class="req-code-badge ${req.type === 'non_functional' ? 'is-nfr' : ''}">
                    ${req.code}
                  </span>
                  <span class="req-type-tag">
                    ${req.type === 'functional' ? t.requirements.frShort : t.requirements.nfrShort}
                  </span>
                  <span class="req-category-pill">${req.category}</span>
                </div>
                <app-status-chip
                  domain="requirement"
                  status="${req.status}"
                  appearance="soft"
                  size="sm"
                ></app-status-chip>
              </div>

              <h3 class="req-title">${req.title}</h3>
              ${req.description ? html`<p class="req-desc">${req.description}</p>` : ''}

              <div class="req-meta-row">
                ${proj
                  ? html`
                      <span class="req-project-pill">
                        <span class="proj-dot" style="background: ${proj.color};"></span>
                        <span class="mono">${proj.key}</span>
                        <span>${proj.name}</span>
                      </span>
                    `
                  : ''}
                <app-status-chip
                  domain="requirementPriority"
                  status="${req.priority}"
                  appearance="outline"
                  size="sm"
                ></app-status-chip>
              </div>

              <div class="req-meta-row">
                <span class="trace-pill">
                  ${t.viewTexts.requirements.criteriaCount(req.acceptanceCriteria.length)}
                </span>
                <span class="trace-pill">
                  ${iconBookOpen(11)}
                  <span>${t.viewTexts.requirements.kbCount(kbCount)}</span>
                </span>
                <span class="trace-pill">
                  ${t.viewTexts.requirements.tasksCount(linkedTasks.length)}
                </span>
              </div>

              <card-footer @click="${(e: Event) => e.stopPropagation()}">
                <div slot="start" class="footer-left">
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => store.openRequirementDetail(req.id)}"
                  >
                    <span>${t.viewTexts.requirements.openDetailBtn}</span>
                    <span slot="icon-end">${iconChevronRight(14)}</span>
                  </app-button>
                  <app-button
                    size="sm"
                    variant="outline"
                    ?disabled="${this.decomposing}"
                    @click="${() => this.handleDecompose([req.id])}"
                  >
                    <span slot="icon-start">${iconZap(13)}</span>
                    <span>${t.viewTexts.requirements.decomposeSingleBtn}</span>
                  </app-button>
                </div>

                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  title="${t.common.edit}"
                  @click="${() => this.openEditReqModal(req)}"
                >
                  <span slot="start">${iconEdit(14)}</span>
                </app-button>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  class="danger-action"
                  title="${t.common.delete}"
                  @click="${() => (this.deletingReq = req)}"
                >
                  <span slot="start">${iconTrash(14)}</span>
                </app-button>
              </card-footer>
            </article>
          `;
        })}
      </div>

      <app-pagination
        layout-mode="cards"
        .totalItems="${paged.totalItems}"
        .page="${paged.page}"
        .pageSize="${paged.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderTable(list: ProjectRequirement[], t: ReturnType<typeof getTranslation>) {
    const paged = paginateItems(list, this.currentPage, this.tablePageSize);

    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 38px;"></th>
              <th>${t.viewTexts.requirements.thCode}</th>
              <th>${t.viewTexts.requirements.thRequirement}</th>
              <th>${t.viewTexts.requirements.thProject}</th>
              <th>${t.viewTexts.requirements.thType}</th>
              <th>${t.viewTexts.requirements.thPriority}</th>
              <th>${t.viewTexts.requirements.thStatus}</th>
              <th>${t.viewTexts.requirements.thTraceability}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.map((req) => {
              const isSelected = this.selectedReqIds.includes(req.id);
              const proj = store.projects.find((p) => p.id === req.projectId);
              const linkedTasks = this.getLinkedTasksForReq(req);

              return html`
                <tr @click="${() => store.openRequirementDetail(req.id)}">
                  <td @click="${(e: Event) => e.stopPropagation()}">
                    <app-checkbox
                      .checked="${isSelected}"
                      @change="${() => this.toggleSelectOne(req.id)}"
                    ></app-checkbox>
                  </td>
                  <td>
                    <span class="req-code-badge ${req.type === 'non_functional' ? 'is-nfr' : ''}">
                      ${req.code}
                    </span>
                  </td>
                  <td>
                    <div class="td-title-main">${req.title}</div>
                    <div class="td-title-sub">
                      ${req.category} · ${t.viewTexts.requirements.criteriaCount(req.acceptanceCriteria.length)}
                    </div>
                  </td>
                  <td>
                    ${proj
                      ? html`
                          <span class="req-project-pill">
                            <span class="proj-dot" style="background: ${proj.color};"></span>
                            <span class="mono">${proj.key}</span>
                          </span>
                        `
                      : '—'}
                  </td>
                  <td>
                    <span class="req-type-tag">
                      ${req.type === 'functional' ? t.requirements.frShort : t.requirements.nfrShort}
                    </span>
                  </td>
                  <td>
                    <app-status-chip
                      domain="requirementPriority"
                      status="${req.priority}"
                      appearance="outline"
                      size="sm"
                    ></app-status-chip>
                  </td>
                  <td>
                    <app-status-chip
                      domain="requirement"
                      status="${req.status}"
                      appearance="soft"
                      size="sm"
                    ></app-status-chip>
                  </td>
                  <td class="mono">
                    ${(req.linkedKnowledgeIds || []).length} / ${linkedTasks.length}
                  </td>
                  <td @click="${(e: Event) => e.stopPropagation()}">
                    <div class="footer-right">
                      <app-button
                        size="sm"
                        variant="icon"
                        title="${t.viewTexts.requirements.decomposeSingleBtn}"
                        .disabled="${this.decomposing}"
                        @click="${() => this.handleDecompose([req.id])}"
                      >
                        <span slot="start">${iconZap(13)}</span>
                      </app-button>
                      <app-button
                        size="sm"
                        variant="icon"
                        title="${t.common.edit}"
                        @click="${() => this.openEditReqModal(req)}"
                      >
                        <span slot="start">${iconEdit(14)}</span>
                      </app-button>
                      <app-button
                        class="danger-action"
                        size="sm"
                        variant="icon"
                        title="${t.common.delete}"
                        @click="${() => (this.deletingReq = req)}"
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

  private renderReqModal(t: ReturnType<typeof getTranslation>) {
    const projectOptions = mapProjectOptions(store.projects, t);
    const docOptions = mapDocumentOptions(store.documents, t);
    const typeOptions = [
      { value: 'functional', label: t.requirements.functional },
      { value: 'non_functional', label: t.requirements.nonFunctional },
    ];
    const priorityOptions: Array<{ value: RequirementPriority; label: string }> = [
      { value: 'critical', label: t.requirements.priorities.critical },
      { value: 'high', label: t.requirements.priorities.high },
      { value: 'medium', label: t.requirements.priorities.medium },
      { value: 'low', label: t.requirements.priorities.low },
    ];
    const statusOptions: Array<{ value: RequirementStatus; label: string }> = [
      { value: 'draft', label: t.requirements.statuses.draft },
      { value: 'approved', label: t.requirements.statuses.approved },
      { value: 'in_progress', label: t.requirements.statuses.in_progress },
      { value: 'implemented', label: t.requirements.statuses.implemented },
      { value: 'verified', label: t.requirements.statuses.verified },
    ];
    const kbOptions = mapKnowledgeOptions(
      store.knowledgeArticles.filter((k) => !this.formKnowledgeIds.includes(k.id)),
      t
    );
    const selectedKbs = store.knowledgeArticles.filter((k) =>
      this.formKnowledgeIds.includes(k.id)
    );

    return html`
      <app-modal
        ?open="${this.reqModalOpen}"
        size="lg"
        title="${this.editingReqId
          ? t.viewTexts.requirements.modalEditTitle
          : t.viewTexts.requirements.modalCreateTitle}"
        @close="${() => (this.reqModalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-entity-selector
              label="${t.requirements.projectLabel}"
              .options="${projectOptions}"
              .value="${this.formProjectId}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formProjectId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div>
            <app-input
              label="${t.requirements.codeLabel}"
              placeholder="FR-01"
              .value="${this.formCode}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.formCode = eventValue(e).toUpperCase())}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.requirements.typeLabel}"
              .value="${this.formType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formType = eventValue(e) as RequirementType)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${t.requirements.categoryLabel}"
              placeholder="Auth / API / Security"
              .value="${this.formCategory}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formCategory = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.requirements.priorityLabel}"
              .value="${this.formPriority}"
              .options="${priorityOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formPriority = eventValue(e) as RequirementPriority)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${t.requirements.statusLabel}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as RequirementStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-entity-selector
              clearable
              label="${t.requirements.sourceSpecLabel}"
              placeholder="${t.viewTexts.projects.selectSpecPlaceholder}"
              .options="${docOptions}"
              .value="${this.formSourceDocId}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formSourceDocId = eventValue(e) || '')}"
            ></app-entity-selector>
          </div>
          <div class="col-span-2">
            <app-entity-selector
              label="${t.requirements.linkedKbLabel}"
              placeholder="${t.viewTexts.taskDetail.attachKnowledgePlaceholder}"
              .options="${kbOptions}"
              value=""
              @change="${(e: CustomEvent<{ value: string }>) => {
                const kbId = eventValue(e);
                if (kbId && !this.formKnowledgeIds.includes(kbId)) {
                  this.formKnowledgeIds = [...this.formKnowledgeIds, kbId];
                }
              }}"
            ></app-entity-selector>
            ${selectedKbs.length > 0
              ? html`
                  <div class="chip-list">
                    ${selectedKbs.map(
                      (kb) => html`
                        <span class="trace-link-chip">
                          ${iconBookOpen(11)}
                          <span>${kb.title}</span>
                          <button
                            type="button"
                            class="chip-remove-btn"
                            title="${t.common.delete}"
                            @click="${() => {
                              this.formKnowledgeIds = this.formKnowledgeIds.filter(
                                (id) => id !== kb.id
                              );
                            }}"
                          >
                            ${iconX(11)}
                          </button>
                        </span>
                      `
                    )}
                  </div>
                `
              : ''}
          </div>
          <div class="col-span-2">
            <app-input
              label="${t.requirements.titleLabel}"
              required
              error="${this.formError}"
              .value="${this.formTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formTitle = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.requirements.descriptionLabel}"
              .value="${this.formDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = eventValue(e))}"
            ></app-textarea>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.requirements.acceptanceLabel}"
              placeholder="${t.requirements.acceptancePlaceholder}"
              .value="${this.formAcceptance}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formAcceptance = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.reqModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveReq}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderSpecModal(t: ReturnType<typeof getTranslation>) {
    const projectOptions = mapProjectOptions(store.projects, t);
    const docOptions = mapDocumentOptions(store.documents, t);

    return html`
      <app-modal
        ?open="${this.specModalOpen}"
        size="lg"
        title="${t.viewTexts.requirements.specModalTitle}"
        @close="${() => (this.specModalOpen = false)}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-entity-selector
              label="${t.requirements.projectLabel}"
              .options="${projectOptions}"
              .value="${this.specProjectId}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.specProjectId = eventValue(e);
                const proj = store.projects.find((p) => p.id === this.specProjectId);
                if (proj?.specDocumentId && !this.specDocId) {
                  this.specDocId = proj.specDocumentId;
                }
              }}"
            ></app-entity-selector>
          </div>
          <div class="col-span-2">
            <app-entity-selector
              clearable
              label="${t.viewTexts.requirements.specDocSelectLabel}"
              placeholder="${t.viewTexts.projects.selectSpecPlaceholder}"
              .options="${docOptions}"
              .value="${this.specDocId}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.specDocId = eventValue(e) || '';
                this.specError = '';
              }}"
            ></app-entity-selector>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.requirements.specTextLabel}"
              placeholder="${t.viewTexts.projects.pasteSpecPlaceholder}"
              .value="${this.specText}"
              rows="6"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.specText = eventValue(e);
                this.specError = '';
              }}"
            ></app-textarea>
          </div>
          ${this.specError
            ? html`
                <div class="col-span-2 error-banner">
                  <span style="flex-shrink: 0;">${iconAlertTriangle(14)}</span>
                  <span>${this.specError}</span>
                </div>
              `
            : ''}
        </app-form-grid>

        <div slot="footer">
          <app-button
            variant="ghost"
            ?disabled="${this.specLoading}"
            @click="${() => (this.specModalOpen = false)}"
          >
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="primary"
            ?disabled="${this.specLoading}"
            @click="${this.handleGenerateFromSpec}"
          >
            <span slot="icon-start">${iconCpu(14)}</span>
            <span>
              ${this.specLoading
                ? t.viewTexts.requirements.specGeneratingBtn
                : t.viewTexts.requirements.specGenerateBtn}
            </span>
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDecomposeModal(t: ReturnType<typeof getTranslation>) {
    const userOptions = mapUserOptions(store.users, t);
    const priorityOptions = [
      { value: 'low', label: t.priority.low },
      { value: 'medium', label: t.priority.medium },
      { value: 'high', label: t.priority.high },
      { value: 'urgent', label: t.priority.urgent },
    ];
    const selectedCount = this.draftTasks.filter((d) => d.selected).length;

    return html`
      <app-modal
        ?open="${this.decomposeModalOpen}"
        size="xl"
        title="${t.viewTexts.requirements.decomposeModalTitle}"
        @close="${() => (this.decomposeModalOpen = false)}"
      >
        <div class="draft-header-bar">
          <div style="min-width: 260px; flex: 1;">
            <app-entity-selector
              size="sm"
              label="${t.viewTexts.requirements.decomposeAssigneeLabel}"
              .options="${userOptions}"
              .value="${this.decomposeAssigneeId}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.decomposeAssigneeId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <app-badge variant="info" appearance="soft">
              ${t.viewTexts.requirements.decomposeTasksCount(this.draftTasks.length)}
            </app-badge>
            ${this.decomposeModel
              ? html`<span class="mono" style="font-size: 0.72rem; color: var(--text-muted);">${this.decomposeModel}</span>`
              : ''}
          </div>
        </div>

        ${this.draftTasks.length === 0
          ? html`<app-empty-state compact title="${t.viewTexts.requirements.noDraftTasks}"></app-empty-state>`
          : html`
              <div class="draft-list">
                ${this.draftTasks.map((draft, idx) => {
                  const reqs = this.requirements.filter((r) =>
                    draft.requirementIds.includes(r.id)
                  );
                  const kbs = store.knowledgeArticles.filter((k) =>
                    draft.knowledgeArticleIds.includes(k.id)
                  );
                  return html`
                    <div class="draft-card ${draft.selected ? 'is-selected' : ''}">
                      <div class="draft-top">
                        <app-checkbox
                          .checked="${draft.selected}"
                          @change="${() => {
                            this.draftTasks = this.draftTasks.map((item, i) =>
                              i === idx ? { ...item, selected: !item.selected } : item
                            );
                          }}"
                        ></app-checkbox>

                        <app-input
                          size="sm"
                          .value="${draft.title}"
                          @input="${(e: CustomEvent<{ value: string }>) => {
                            const val = eventValue(e);
                            this.draftTasks = this.draftTasks.map((item, i) =>
                              i === idx ? { ...item, title: val } : item
                            );
                          }}"
                        ></app-input>

                        <app-number-input
                          size="sm"
                          min="1"
                          max="240"
                          unit="${t.common.hours}"
                          .value="${draft.estimatedHours}"
                          @change="${(e: CustomEvent<{ value: number }>) => {
                            const val = Number(eventValue(e)) || 8;
                            this.draftTasks = this.draftTasks.map((item, i) =>
                              i === idx ? { ...item, estimatedHours: val } : item
                            );
                          }}"
                        ></app-number-input>

                        <app-select
                          size="sm"
                          .value="${draft.priority}"
                          .options="${priorityOptions}"
                          @change="${(e: CustomEvent<{ value: string }>) => {
                            const val = eventValue(e) as TaskPriority;
                            this.draftTasks = this.draftTasks.map((item, i) =>
                              i === idx ? { ...item, priority: val } : item
                            );
                          }}"
                        ></app-select>
                      </div>

                      <app-textarea
                        rows="2"
                        .value="${draft.description}"
                        @input="${(e: CustomEvent<{ value: string }>) => {
                          const val = eventValue(e);
                          this.draftTasks = this.draftTasks.map((item, i) =>
                            i === idx ? { ...item, description: val } : item
                          );
                        }}"
                      ></app-textarea>

                      ${draft.subtasks.length > 0
                        ? html`
                            <div class="draft-subtasks">
                              ${draft.subtasks.map(
                                (st) => html`<span class="draft-subtask-chip">• ${st}</span>`
                              )}
                            </div>
                          `
                        : ''}

                      <div class="req-meta-row">
                        ${reqs.map(
                          (r) => html`
                            <span class="req-code-badge ${r.type === 'non_functional' ? 'is-nfr' : ''}">
                              ${r.code}
                            </span>
                          `
                        )}
                        ${kbs.map(
                          (kb) => html`
                            <span class="trace-link-chip">
                              ${iconBookOpen(11)}
                              <span>${kb.title}</span>
                            </span>
                          `
                        )}
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.decomposeModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="primary"
            ?disabled="${selectedCount === 0}"
            @click="${this.handleCreateSelectedTasks}"
          >
            <span slot="icon-start">${iconCheck(14)}</span>
            <span>${t.viewTexts.requirements.createSelectedTasksBtn} (${selectedCount})</span>
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteDialog(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingReq)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.requirementDelete.title}"
        action="${t.viewTexts.confirmDialogs.requirementDelete.action(
          this.deletingReq?.code || '',
          this.deletingReq?.title || ''
        )}"
        result="${t.viewTexts.confirmDialogs.requirementDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingReq = null)}"
        @confirm="${() => {
          if (this.deletingReq) {
            store.deleteRequirement(this.deletingReq.id);
            this.selectedReqIds = this.selectedReqIds.filter((id) => id !== this.deletingReq!.id);
            this.deletingReq = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private toggleSelectOne(id: string) {
    if (this.selectedReqIds.includes(id)) {
      this.selectedReqIds = this.selectedReqIds.filter((x) => x !== id);
    } else {
      this.selectedReqIds = [...this.selectedReqIds, id];
    }
  }

  private toggleSelectAll(list: ProjectRequirement[]) {
    const allIds = list.map((r) => r.id);
    const allSelected = allIds.every((id) => this.selectedReqIds.includes(id));
    if (allSelected) {
      this.selectedReqIds = this.selectedReqIds.filter((id) => !allIds.includes(id));
    } else {
      this.selectedReqIds = Array.from(new Set([...this.selectedReqIds, ...allIds]));
    }
  }

  private openCreateReqModal() {
    const targetProjectId =
      this.projectFilter !== 'all' ? this.projectFilter : store.projects[0]?.id || '';
    const projectReqs = this.requirements.filter((r) => r.projectId === targetProjectId);
    const nextIdx = projectReqs.length + 1;
    const proj = store.projects.find((p) => p.id === targetProjectId);

    this.editingReqId = null;
    this.formProjectId = targetProjectId;
    this.formSourceDocId = proj?.specDocumentId || '';
    this.formCode = `FR-${String(nextIdx).padStart(2, '0')}`;
    this.formType = 'functional';
    this.formCategory = 'Core';
    this.formPriority = 'high';
    this.formStatus = 'approved';
    this.formTitle = '';
    this.formDescription = '';
    this.formAcceptance = '';
    this.formKnowledgeIds = [];
    this.formError = '';
    this.reqModalOpen = true;
  }

  private openEditReqModal(req: ProjectRequirement) {
    this.editingReqId = req.id;
    this.formProjectId = req.projectId;
    this.formSourceDocId = req.sourceDocumentId || '';
    this.formCode = req.code;
    this.formType = req.type;
    this.formCategory = req.category;
    this.formPriority = req.priority;
    this.formStatus = req.status;
    this.formTitle = req.title;
    this.formDescription = req.description;
    this.formAcceptance = req.acceptanceCriteria.join('\n');
    this.formKnowledgeIds = [...(req.linkedKnowledgeIds || [])];
    this.formError = '';
    this.reqModalOpen = true;
  }

  private handleSaveReq() {
    const t = getTranslation(this.currentLang);
    if (!this.formTitle.trim()) {
      this.formError = t.common.required;
      return;
    }

    const criteria = this.formAcceptance
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const projectId = this.formProjectId || store.projects[0]?.id || '';
    const project = store.projects.find((p) => p.id === projectId);

    if (this.editingReqId) {
      const existing = this.requirements.find((r) => r.id === this.editingReqId);
      if (existing) {
        store.updateRequirement({
          ...existing,
          projectId,
          sourceDocumentId: this.formSourceDocId || undefined,
          code: this.formCode.trim().toUpperCase() || existing.code,
          type: this.formType,
          category: this.formCategory.trim() || 'Core',
          priority: this.formPriority,
          status: this.formStatus,
          title: this.formTitle.trim(),
          description: this.formDescription.trim(),
          acceptanceCriteria: criteria,
          linkedKnowledgeIds: [...this.formKnowledgeIds],
        });
      }
    } else {
      store.addRequirement({
        projectId,
        sourceDocumentId: this.formSourceDocId || project?.specDocumentId,
        code:
          this.formCode.trim().toUpperCase() ||
          (this.formType === 'functional' ? 'FR-NEW' : 'NFR-NEW'),
        type: this.formType,
        category: this.formCategory.trim() || 'Core',
        priority: this.formPriority,
        status: this.formStatus,
        title: this.formTitle.trim(),
        description: this.formDescription.trim(),
        acceptanceCriteria: criteria,
        linkedKnowledgeIds: [...this.formKnowledgeIds],
        linkedTaskIds: [],
      });
    }

    this.reqModalOpen = false;
  }

  private openSpecModal() {
    const targetProjectId =
      this.projectFilter !== 'all' ? this.projectFilter : store.projects[0]?.id || '';
    const proj = store.projects.find((p) => p.id === targetProjectId);
    this.specProjectId = targetProjectId;
    this.specDocId = proj?.specDocumentId || '';
    this.specText = '';
    this.specError = '';
    this.specModalOpen = true;
  }

  private async handleGenerateFromSpec() {
    const t = getTranslation(this.currentLang);
    const selectedDoc = store.documents.find((d) => d.id === this.specDocId);
    const effectiveText = [
      this.specText.trim(),
      selectedDoc ? extractDocumentTextContext(selectedDoc) : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!effectiveText.trim()) {
      this.specError = t.viewTexts.ai.errors.missingSpecText;
      return;
    }

    const project = store.projects.find((p) => p.id === this.specProjectId) || store.projects[0];
    if (!project) return;

    const endpoint = store.customization.aiEndpoint;
    this.specLoading = true;
    this.specError = '';
    try {
      const blueprint = await generateProjectBlueprintFromSpec({
        projectName: project.name,
        projectKey: project.key,
        specText: effectiveText,
        docMeta: selectedDoc,
        lang: this.currentLang,
        baseUrl: endpoint,
        model: store.customization.aiModel,
      });

      const authorId = store.currentUserId || store.users[0]?.id || 'user-1';
      const createdArticles = store.addKnowledgeArticlesBulk(
        blueprint.knowledgeArticles.map((kb) => ({
          title: kb.title,
          summary: kb.summary,
          content: kb.content,
          category: kb.category,
          status: 'published',
          scope: 'project',
          projectId: project.id,
          companyId: project.companyId,
          authorId,
          tags: Array.from(new Set([...kb.tags, project.key.toLowerCase()])),
          linkedTaskIds: [],
          pinned: false,
        }))
      );

      const keyToId = new Map<string, string>();
      blueprint.knowledgeArticles.forEach((draft, idx) => {
        if (createdArticles[idx]) keyToId.set(draft.tempKey, createdArticles[idx].id);
      });
      const fallbackKbs = createdArticles.slice(0, 2).map((a) => a.id);

      store.addRequirementsBulk(
        blueprint.requirements.map((req) => {
          const kbIds = req.knowledgeKeys
            .map((k) => keyToId.get(k))
            .filter((id): id is string => Boolean(id));
          return {
            projectId: project.id,
            sourceDocumentId: selectedDoc?.id || project.specDocumentId,
            code: req.code,
            type: req.type,
            title: req.title,
            description: req.description,
            category: req.category,
            priority: req.priority,
            status: 'approved',
            acceptanceCriteria: req.acceptanceCriteria,
            linkedKnowledgeIds: kbIds.length > 0 ? kbIds : fallbackKbs,
            linkedTaskIds: [],
          };
        })
      );

      if (selectedDoc && !project.specDocumentId) {
        store.updateProject({ ...project, specDocumentId: selectedDoc.id });
      }
      this.specModalOpen = false;
    } catch (err) {
      this.specError = formatAiError(err, endpoint, t);
    } finally {
      this.specLoading = false;
    }
  }

  private async handleDecompose(reqIds: string[]) {
    const t = getTranslation(this.currentLang);
    const targetReqs = this.requirements.filter((r) => reqIds.includes(r.id));
    if (targetReqs.length === 0) {
      this.decomposeError = t.viewTexts.ai.errors.missingSelectedReqs;
      return;
    }
    const projectId = targetReqs[0].projectId;
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return;

    this.decomposeProjectId = project.id;
    const endpoint = store.customization.aiEndpoint;
    this.decomposing = true;
    this.decomposeError = '';
    try {
      const res = await decomposeRequirementsToTasks({
        project,
        requirements: targetReqs,
        knowledgeArticles: store.knowledgeArticles,
        documents: store.documents,
        lang: this.currentLang,
        baseUrl: endpoint,
        model: store.customization.aiModel,
      });

      this.draftTasks = res.tasks.map((task) => ({ ...task, selected: true }));
      this.decomposeModel = res.model;
      this.decomposeModalOpen = true;
    } catch (err) {
      this.decomposeError = formatAiError(err, endpoint, t);
    } finally {
      this.decomposing = false;
    }
  }

  private handleCreateSelectedTasks() {
    const selectedDrafts = this.draftTasks.filter((d) => d.selected && d.title.trim());
    if (selectedDrafts.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);
    const assigneeId = this.decomposeAssigneeId || store.users[0]?.id || 'user-1';

    for (const draft of selectedDrafts) {
      const targetProjId =
        this.requirements.find((r) => draft.requirementIds.includes(r.id))?.projectId ||
        this.decomposeProjectId;
      const created = store.addTask({
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: 'todo',
        priority: draft.priority,
        assigneeId,
        projectId: targetProjId,
        tags: draft.tags,
        startDate: today,
        dueDate: due,
        estimatedHours: draft.estimatedHours,
        loggedHours: 0,
        subtasks: draft.subtasks.map((title, idx) => ({
          id: `st-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          title,
          completed: false,
        })),
        requirementIds: [...draft.requirementIds],
        knowledgeArticleIds: [...draft.knowledgeArticleIds],
      });

      for (const reqId of draft.requirementIds) {
        const req = store.requirements.find((r) => r.id === reqId);
        if (req) {
          const nextLinkedTasks = Array.from(new Set([...(req.linkedTaskIds || []), created.id]));
          store.updateRequirement({
            ...req,
            status: req.status === 'draft' || req.status === 'approved' ? 'in_progress' : req.status,
            linkedTaskIds: nextLinkedTasks,
          });
        }
      }
    }

    this.selectedReqIds = [];
    this.decomposeModalOpen = false;
  }
}
