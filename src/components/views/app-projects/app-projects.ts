import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { Project, ProjectRole, ProjectStatus } from '../../../types';
import {
  iconAlertTriangle,
  iconBookOpen,
  iconCheck,
  iconChevronRight,
  iconCpu,
  iconEdit,
  iconFileText,
  iconFolder,
  iconKanban,
  iconLayers,
  iconPlus,
  iconTrash,
} from '../../common/icons';
import { readBrowserFile, ReadFilePayload } from '../../common/document-utils';
import { mapDocumentOptions } from '../../common/entity-selector-options';
import {
  extractDocumentTextContext,
  formatAiError,
  GeneratedProjectBlueprint,
  generateProjectBlueprintFromSpec,
} from '../../../services/openai-client';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/card-footer/card-footer';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-file-dropzone/app-file-dropzone';
import '../../common/app-switch/app-switch';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-project-form/app-project-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-cards-table/app-cards-table';
import styles from './app-projects.css';
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

@customElement('app-projects')
export class AppProjects extends LitElement {
  @state() private projects: Project[] = store.projects;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | ProjectStatus = 'all';
  @state() private companyFilter = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;

  // Create / edit modal
  @state() private modalOpen = false;
  @state() private editingProject: Project | null = null;
  @state() private skipAiNext = false;
  // Spec-driven project creation & AI blueprint state
  @state() private specInputMode: 'existing' | 'upload' | 'paste' = 'existing';
  @state() private selectedSpecDocId = '';
  @state() private uploadedSpecPayload: ReadFilePayload | null = null;
  @state() private uploadedSpecNote = '';
  @state() private pastedSpecText = '';
  @state() private autoGenerateFromSpec = true;
  @state() private specAiLoading = false;
  @state() private specAiError = '';
  @state() private generatedBlueprint: GeneratedProjectBlueprint | null = null;

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
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
    this.currentPage = store.activeView === 'projects' ? store.activePage : 1;
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
    const filtered = this.getFilteredProjects();

    const activeCount = this.projects.filter((p) => (p.status || 'active') === 'active').length;
    const totalAssignments = this.projects.reduce((sum, p) => sum + (p.members?.length || 0), 0);
    const avgProgress = this.projects.length
      ? Math.round(this.projects.reduce((sum, p) => sum + p.progress, 0) / this.projects.length)
      : 0;

    const statusOptions = [
      { value: 'all', label: t.viewTexts.projects.filterAllStatuses },
      { value: 'planning', label: t.projectStatuses.planning, color: '#0284c7' },
      { value: 'active', label: t.projectStatuses.active, color: '#10b981' },
      { value: 'on_hold', label: t.projectStatuses.on_hold, color: '#f59e0b' },
      { value: 'completed', label: t.projectStatuses.completed, color: '#6366f1' },
    ];

    const companyFilterOptions = [
      { value: 'all', label: t.viewTexts.projects.filterAllCompanies },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    return html`
      <app-page-header
        title="${t.navigation.projects}"
        subtitle="${t.viewTexts.pageSubtitles.projects}"
      >
        <span slot="icon">${iconFolder(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.viewTexts.projects.newProjectButton}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiTotalProjects}" value="${this.projects.length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiActive}" value="${activeCount}" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiRoleAssignments}" value="${totalAssignments}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiAvgProgress}" value="${avgProgress}%"></app-metric-card>
      </app-kpi-strip>

      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.projects.viewCards },
            { value: 'table', label: t.viewTexts.projects.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.displayMode = eventValue(e) as 'cards' | 'table';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </div>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${t.viewTexts.projects.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'status', options: statusOptions },
          { key: 'company', options: companyFilterOptions },
        ]}"
        .values="${{ status: this.statusFilter, company: this.companyFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | ProjectStatus;
          if (e.detail.key === 'company') this.companyFilter = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      ></app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.projects.emptyNoProjects}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      ${this.renderProjectModal(t, statusOptions)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderCards(list: Project[], t: ReturnType<typeof getTranslation>) {
    const projectCard = (row: Record<string, unknown>) => {
      const proj = row as unknown as Project;
      const company = store.companies.find((c) => c.id === proj.companyId);
      const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
      const tasksCount = store.tasks.filter((task) => task.projectId === proj.id).length;
      const members = proj.members || [];
      const uniqueMembers = new Set(members.map((m) => m.userId)).size;

      const roleCounts = ALL_PROJECT_ROLES.map((role) => ({
        role,
        count: members.filter((m) => m.role === role).length,
      })).filter((item) => item.count > 0);

      return html`
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
            <span class="meta-label">${t.viewTexts.projects.metaCompany}</span>
            <span class="meta-val">${company?.name || '—'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${t.viewTexts.projects.metaClient}</span>
            <span class="meta-val">${counterparty?.name || '—'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${t.viewTexts.projects.metaBudget}</span>
            <span class="meta-val mono">
              ${proj.budget ? `${(proj.budget / 1_000_000).toFixed(1)}M ₽` : '—'}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${t.viewTexts.projects.metaDueTasks}</span>
            <span class="meta-val mono">${proj.dueDate} · ${tasksCount}</span>
          </div>
        </div>

        <div class="team-summary-line">
          ${roleCounts.length === 0
            ? html`<span>${t.viewTexts.projects.noTeamRoles}</span>`
            : html`
                <span>${t.viewTexts.projects.teamMembersLabel}: <strong>${uniqueMembers}</strong></span>
                ${roleCounts.map(
                  (rc) => html`
                    <span class="sep">·</span>
                    <span>${t.projectRoles[rc.role]}: <strong>${rc.count}</strong></span>
                  `
                )}
              `}
        </div>

        <card-footer>
          <div slot="start" class="footer-left-actions">
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
              <span>${t.viewTexts.projects.tasksButton}</span>
            </app-button>
          </div>

          <app-button
            slot="end"
            size="sm"
            variant="icon"
            title="${t.common.edit}"
            @click="${() => this.openEditModal(proj)}"
          >
            <span slot="start">${iconEdit(14)}</span>
          </app-button>
          <app-button
            slot="end"
            size="sm"
            variant="icon"
            action="delete"
            title="${t.common.delete}"
            @click="${() => (this.deletingProject = proj)}"
          >
            <span slot="start">${iconTrash(14)}</span>
          </app-button>
        </card-footer>
      `;
    };

    return html`
      <app-cards-table
        .rows="${list}"
        .cardRender="${projectCard}"
        page-size="${this.cardPageSize}"
        page="${this.currentPage}"
        locale="${t.common.locale}"
        clickable
        @card-click="${(e: CustomEvent<{ item: Record<string, unknown> }>) => store.openProjectDetail((e.detail.item as unknown as Project).id)}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-cards-table>
    `;
  }

  private renderTable(list: Project[], t: ReturnType<typeof getTranslation>) {
    const titleCell = (row: Record<string, unknown>) => {
      const proj = row as unknown as Project;
      return html`
        <div class="proj-title-row">
          <span class="color-dot" style="background: ${proj.color};"></span>
          <span class="proj-key">${proj.key}</span>
          <span style="font-weight: 600;">${proj.name}</span>
        </div>
      `;
    };
    const companyCell = (row: Record<string, unknown>) => {
      const proj = row as unknown as Project;
      const company = store.companies.find((c) => c.id === proj.companyId);
      const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
      return html`
        <div>${company?.name || '—'}</div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">${counterparty?.name || '—'}</div>
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .rows="${list}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          @row-click="${(e: CustomEvent<{ row: Record<string, unknown> }>) => {
            store.openProjectDetail((e.detail.row as unknown as Project).id);
          }}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1; store.setActivePage(1, false);
            store.setTablePageSize(e.detail.pageSize);
          }}"
        >
          <app-table-column field="key" label="${t.viewTexts.projects.thProject}" .cellRender="${titleCell}"></app-table-column>
          <app-table-column field="companyId" label="${t.viewTexts.projects.thCompanyClient}" .cellRender="${companyCell}"></app-table-column>
          <app-table-column
            field="members"
            label="${t.viewTexts.projects.thTeam}"
            mono
            .cellRender="${(row: Record<string, unknown>) => {
              const proj = row as unknown as Project;
              const members = proj.members || [];
              return html`${new Set(members.map((m) => m.userId)).size} (${members.length})`;
            }}"
          ></app-table-column>
          <app-table-column
            field="id"
            label="${t.viewTexts.projects.thTasks}"
            mono
            .cellRender="${(row: Record<string, unknown>) =>
              html`${store.tasks.filter((tk) => tk.projectId === (row as unknown as Project).id).length}`}"
          ></app-table-column>
          <app-table-column
            field="progress"
            label="${t.viewTexts.projects.thProgress}"
            mono
            .cellRender="${(row: Record<string, unknown>) => html`${(row as unknown as Project).progress}%`}"
          ></app-table-column>
          <app-table-column
            field="budget"
            label="${t.viewTexts.projects.thBudget}"
            mono
            .cellRender="${(row: Record<string, unknown>) => {
              const b = (row as unknown as Project).budget;
              return html`${b ? `${(b / 1_000_000).toFixed(1)}M ₽` : '—'}`;
            }}"
          ></app-table-column>
          <app-table-column field="dueDate" label="${t.viewTexts.projects.thDueDate}" mono></app-table-column>
          <app-table-column
            field="status"
            label="${t.viewTexts.projects.thStatus}"
            .cellRender="${(row: Record<string, unknown>) => html`
              <app-status-chip
                domain="project"
                status="${(row as unknown as Project).status || 'active'}"
                appearance="soft"
                size="sm"
              ></app-status-chip>
            `}"
          ></app-table-column>
          <app-table-column
            field=""
            label=""
            .cellRender="${(row: Record<string, unknown>) => {
              const proj = row as unknown as Project;
              return html`
                <div class="actions-row">
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.projectDetail.openProject}"
                    @click="${() => store.openProjectDetail(proj.id)}"
                  >
                    <span slot="start">${iconChevronRight(14)}</span>
                  </app-button>
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.common.edit}"
                    @click="${() => this.openEditModal(proj)}"
                  >
                    <span slot="start">${iconEdit(14)}</span>
                  </app-button>
                  <app-button
                    action="delete"
                    size="sm"
                    variant="icon"
                    title="${t.common.delete}"
                    @click="${() => (this.deletingProject = proj)}"
                  >
                    <span slot="start">${iconTrash(14)}</span>
                  </app-button>
                </div>
              `;
            }}"
          ></app-table-column>
        </app-data-table>
      </div>
    `;
  }

  private renderProjectModal(
    t: ReturnType<typeof getTranslation>,
    statusOptions: { value: string; label: string; color?: string }[]
  ) {
    const companyOptions = [
      { value: '', label: t.viewTexts.projects.optionNoCompany },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];
    const counterpartyOptions = [
      { value: '', label: t.viewTexts.projects.optionInternalProject },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];

    return html`
      <app-project-form
        .open="${this.modalOpen}"
        .project="${this.editingProject}"
        .saveDisabled="${this.specAiLoading}"
        saveLabel="${this.specAiLoading ? t.viewTexts.projects.generatingBlueprint : t.common.save}"
        .beforeSave="${(data: { name: string; key: string }) => this.runSpecAiBeforeSave(data)}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${(e: CustomEvent<{ project: Project }>) => this.handleProjectSaved(e)}"
        .extraContent="${!this.editingProject ? this.renderSpecBootstrapSection(t) : null}"
        .footerExtra="${!this.editingProject && this.specAiError
          ? html`
              <app-button
                variant="outline"
                ?disabled="${this.specAiLoading}"
                @click="${() => {
                  this.skipAiNext = true;
                  (this.shadowRoot!.querySelector('app-project-form') as any).save();
                }}"
              >
                ${t.viewTexts.projects.createWithoutAiBtn}
              </app-button>`
          : null}"
      ></app-project-form>
    `;
  }

  private renderSpecBootstrapSection(t: ReturnType<typeof getTranslation>) {
    const docOptions = mapDocumentOptions(store.documents, t);
    const hasSpecInput = Boolean(this.getEffectiveSpecText().trim() || this.selectedSpecDocId);

    return html`
      <div class="col-span-2 spec-bootstrap-box">
        <div class="spec-bootstrap-head">
          <div class="spec-bootstrap-title">
            ${iconFileText(16)}
            <span>${t.viewTexts.projects.specSectionTitle}</span>
          </div>
          <app-segmented-switch
            size="sm"
            .value="${this.specInputMode}"
            .options="${[
              { value: 'existing', label: t.viewTexts.projects.specModeExisting },
              { value: 'upload', label: t.viewTexts.projects.specModeUpload },
              { value: 'paste', label: t.viewTexts.projects.specModePaste },
            ]}"
            @change="${(e: CustomEvent<{ value: string }>) => {
              this.specInputMode = eventValue(e) as 'existing' | 'upload' | 'paste';
              this.specAiError = '';
            }}"
          ></app-segmented-switch>
        </div>

        ${this.specInputMode === 'existing'
          ? html`
              <app-entity-selector
                clearable
                placeholder="${t.viewTexts.projects.selectSpecPlaceholder}"
                .options="${docOptions}"
                .value="${this.selectedSpecDocId}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  this.selectedSpecDocId = eventValue(e) || '';
                  this.generatedBlueprint = null;
                  this.specAiError = '';
                  const doc = store.documents.find((d) => d.id === this.selectedSpecDocId);
                  const form = this.shadowRoot!.querySelector('app-project-form') as any;
                  if (doc && form) form.setDescriptionIfEmpty(doc.description || '');
                }}"
              ></app-entity-selector>
            `
          : this.specInputMode === 'upload'
          ? html`
              <app-file-dropzone
                compact
                selected-file-name="${this.uploadedSpecPayload?.fileName || ''}"
                selected-file-size="${this.uploadedSpecPayload?.sizeBytes || 0}"
                @file-selected="${this.handleSpecDropzoneSelect}"
                @file-cleared="${() => {
                  this.uploadedSpecPayload = null;
                  this.uploadedSpecNote = '';
                  this.generatedBlueprint = null;
                }}"
              ></app-file-dropzone>
              ${this.uploadedSpecNote
                ? html`<div class="spec-note">${this.uploadedSpecNote}</div>`
                : ''}
              ${this.uploadedSpecPayload
                ? html`
                    <div class="spec-note">
                      ${t.viewTexts.projects.specFileNote(this.uploadedSpecPayload.fileName)}
                    </div>
                  `
                : ''}
            `
          : html`
              <app-textarea
                label="${t.viewTexts.projects.pasteSpecLabel}"
                placeholder="${t.viewTexts.projects.pasteSpecPlaceholder}"
                .value="${this.pastedSpecText}"
                rows="5"
                @input="${(e: CustomEvent<{ value: string }>) => {
                  this.pastedSpecText = eventValue(e);
                  this.generatedBlueprint = null;
                  this.specAiError = '';
                }}"
              ></app-textarea>
            `}

        <div class="spec-ai-controls">
          <app-switch
            .checked="${this.autoGenerateFromSpec}"
            label="${t.viewTexts.projects.autoGenerateSwitch}"
            @change="${(e: CustomEvent<{ checked: boolean }>) => {
              this.autoGenerateFromSpec = Boolean(e.detail?.checked);
            }}"
          ></app-switch>

          ${this.autoGenerateFromSpec && hasSpecInput
            ? html`
                <app-button
                  size="sm"
                  variant="secondary"
                  ?disabled="${this.specAiLoading}"
                  @click="${this.handlePreviewSpecBlueprint}"
                >
                  <span slot="icon-start">${iconCpu(14)}</span>
                  <span>
                    ${this.specAiLoading
                      ? t.viewTexts.projects.generatingBlueprint
                      : t.viewTexts.projects.generatePreviewBtn}
                  </span>
                </app-button>
              `
            : ''}
        </div>

        ${this.specAiError
          ? html`
              <div class="spec-ai-error">
                <span style="flex-shrink: 0;">${iconAlertTriangle(14)}</span>
                <span>${this.specAiError}</span>
              </div>
            `
          : ''}

        ${this.generatedBlueprint
          ? html`
              <div class="spec-blueprint-preview">
                <div class="spec-blueprint-head">
                  <span class="spec-blueprint-badge">
                    ${iconCheck(13)}
                    <span>${t.viewTexts.projects.blueprintReadyBadge}</span>
                  </span>
                  <span class="mono" style="font-size: 0.72rem; color: var(--text-muted);">
                    ${this.generatedBlueprint.model}
                  </span>
                </div>
                <div class="spec-blueprint-counts">
                  <span class="spec-count-pill">
                    ${iconBookOpen(12)}
                    <span>${t.viewTexts.projects.kbGeneratedCount(this.generatedBlueprint.knowledgeArticles.length)}</span>
                  </span>
                  <span class="spec-count-pill">
                    ${iconLayers(12)}
                    <span>${t.viewTexts.projects.reqsGeneratedCount(this.generatedBlueprint.requirements.length)}</span>
                  </span>
                </div>
                <div class="spec-blueprint-lists">
                  ${this.generatedBlueprint.requirements.slice(0, 6).map(
                    (req) => html`
                      <div class="spec-blueprint-item">
                        <span class="mono spec-req-code ${req.type === 'non_functional' ? 'is-nfr' : ''}">${req.code}</span>
                        <span>${req.title}</span>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private renderDeleteModal(t: ReturnType<typeof getTranslation>) {
    const tx = t.viewTexts;
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingProject)}"
        size="sm"
        title="${tx.confirmDialogs.projectDelete.title}"
        action="${tx.confirmDialogs.projectDelete.action(this.deletingProject?.name || '')}"
        result="${tx.confirmDialogs.projectDelete.result}"
        .actionLabel="${tx.confirmSectionLabels.action}"
        .resultLabel="${tx.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingProject = null)}"
        @confirm="${() => {
          if (this.deletingProject) {
            store.deleteProject(this.deletingProject.id);
            this.deletingProject = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private openCreateModal() {
    this.editingProject = null;
    this.specInputMode = 'existing';
    this.selectedSpecDocId = '';
    this.uploadedSpecPayload = null;
    this.uploadedSpecNote = '';
    this.pastedSpecText = '';
    this.autoGenerateFromSpec = true;
    this.specAiLoading = false;
    this.specAiError = '';
    this.generatedBlueprint = null;
    this.skipAiNext = false;
    this.modalOpen = true;
  }

  private openEditModal(proj: Project) {
    this.editingProject = proj;
    this.modalOpen = true;
  }

  private async handleSpecDropzoneSelect(e: CustomEvent<{ file: File }>) {
    const file = e.detail?.file;
    if (!file) return;
    const t = getTranslation(this.currentLang);
    const payload = await readBrowserFile(file, t.viewTexts.documents.fileTooLargeNote);
    this.uploadedSpecPayload = payload;
    this.uploadedSpecNote = payload.truncatedNote || '';
    this.generatedBlueprint = null;
    this.specAiError = '';
    const fileTitle = payload.fileName.replace(/\.[^.]+$/, '') || payload.fileName;
    const form = this.shadowRoot!.querySelector('app-project-form') as any;
    if (form) form.ensureName(fileTitle);
  }

  private getEffectiveSpecText(): string {
    if (this.specInputMode === 'existing') {
      const doc = store.documents.find((d) => d.id === this.selectedSpecDocId);
      return doc ? extractDocumentTextContext(doc) : '';
    }
    if (this.specInputMode === 'upload' && this.uploadedSpecPayload) {
      const fileTitle = this.uploadedSpecPayload.fileName.replace(/\.[^.]+$/, '') || this.uploadedSpecPayload.fileName;
      return [
        fileTitle,
        this.uploadedSpecPayload.fileName,
        this.uploadedSpecPayload.textContent || '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    return this.pastedSpecText.trim();
  }

  private async handlePreviewSpecBlueprint() {
    const t = getTranslation(this.currentLang);
    const specText = this.getEffectiveSpecText();
    if (!specText.trim()) {
      this.specAiError = t.viewTexts.ai.errors.missingSpecText;
      return;
    }

    const endpoint = store.customization.aiEndpoint;
    this.specAiLoading = true;
    this.specAiError = '';
    try {
      const selectedDoc =
        this.specInputMode === 'existing'
          ? store.documents.find((d) => d.id === this.selectedSpecDocId)
          : undefined;
      this.generatedBlueprint = await generateProjectBlueprintFromSpec({
        projectName: (this.shadowRoot!.querySelector('app-project-form') as any).fieldData().name.trim() || 'New Project',
        projectKey: (this.shadowRoot!.querySelector('app-project-form') as any).fieldData().key.trim().toUpperCase(),
        specText,
        docMeta: selectedDoc,
        lang: this.currentLang,
        baseUrl: endpoint,
        model: store.customization.aiModel,
      });
    } catch (err) {
      this.specAiError = formatAiError(err, endpoint, t);
    } finally {
      this.specAiLoading = false;
    }
  }

  private async runSpecAiBeforeSave(data: { name: string; key: string }): Promise<boolean> {
    const t = getTranslation(this.currentLang);
    if (this.skipAiNext) {
      this.skipAiNext = false;
      return true;
    }
    if (this.editingProject) return true;

    const specText = this.getEffectiveSpecText();
    if (this.generatedBlueprint) return true;
    if (!this.autoGenerateFromSpec || !specText.trim()) return true;

    const endpoint = store.customization.aiEndpoint;
    this.specAiLoading = true;
    this.specAiError = '';
    try {
      const selectedDoc =
        this.specInputMode === 'existing'
          ? store.documents.find((d) => d.id === this.selectedSpecDocId)
          : undefined;
      this.generatedBlueprint = await generateProjectBlueprintFromSpec({
        projectName: data.name,
        projectKey: data.key,
        specText,
        docMeta: selectedDoc,
        lang: this.currentLang,
        baseUrl: endpoint,
        model: store.customization.aiModel,
      });
    } catch (err) {
      this.specAiError = formatAiError(err, endpoint, t);
      return false;
    } finally {
      this.specAiLoading = false;
    }
    return true;
  }

  private handleProjectSaved(e: CustomEvent<{ project: Project }>) {
    const t = getTranslation(this.currentLang);
    this.modalOpen = false;
    if (this.editingProject) return;

    const createdProject = e.detail.project;
    const derivedKey = createdProject.key;
    let resolvedSpecDocId = createdProject.specDocumentId;

    if (this.specInputMode === 'existing' && this.selectedSpecDocId) {
      resolvedSpecDocId = this.selectedSpecDocId;
      store.updateProject({ ...createdProject, specDocumentId: resolvedSpecDocId });
    }

    if (this.specInputMode === 'upload' && this.uploadedSpecPayload) {
      const fileTitle = this.uploadedSpecPayload.fileName.replace(/\.[^.]+$/, '') || this.uploadedSpecPayload.fileName;
      const uploadedDoc = store.addDocument({
        title: `${createdProject.name} — ${fileTitle}`,
        fileName: this.uploadedSpecPayload.fileName,
        extension: this.uploadedSpecPayload.extension,
        mimeType: this.uploadedSpecPayload.mimeType,
        sizeBytes: this.uploadedSpecPayload.sizeBytes,
        dataUrl: this.uploadedSpecPayload.dataUrl,
        textContent: this.uploadedSpecPayload.textContent,
        category: 'spec',
        status: 'approved',
        scope: 'project',
        companyId: createdProject.companyId,
        projectId: createdProject.id,
        uploadedById: store.currentUserId || store.users[0]?.id || 'user-1',
        tags: ['spec', derivedKey.toLowerCase()],
        description: createdProject.description.trim() || fileTitle,
        versionNote: t.viewTexts.documents.initialVersionNote,
      });
      resolvedSpecDocId = uploadedDoc.id;
      store.updateProject({ ...createdProject, specDocumentId: resolvedSpecDocId });
    } else if (this.specInputMode === 'paste' && this.pastedSpecText.trim()) {
      const pastedDoc = store.addDocument({
        title: `${createdProject.name} — Spec`,
        fileName: `${derivedKey.toLowerCase()}-spec.md`,
        extension: 'md',
        mimeType: 'text/markdown',
        sizeBytes: new Blob([this.pastedSpecText]).size,
        textContent: this.pastedSpecText.trim(),
        category: 'spec',
        status: 'approved',
        scope: 'project',
        companyId: createdProject.companyId,
        projectId: createdProject.id,
        uploadedById: store.currentUserId || store.users[0]?.id || 'user-1',
        tags: ['spec', derivedKey.toLowerCase()],
        description: this.pastedSpecText.trim().slice(0, 220),
        versionNote: t.viewTexts.documents.initialVersionNote,
      });
      resolvedSpecDocId = pastedDoc.id;
      store.updateProject({ ...createdProject, specDocumentId: resolvedSpecDocId });
    }

    const blueprint = this.generatedBlueprint;
    if (blueprint) {
      const authorId = store.currentUserId || store.users[0]?.id || 'user-1';
      const createdArticles = store.addKnowledgeArticlesBulk(
        blueprint.knowledgeArticles.map((kb) => ({
          title: kb.title,
          summary: kb.summary,
          content: kb.content,
          category: kb.category,
          status: 'published',
          scope: 'project',
          projectId: createdProject.id,
          companyId: createdProject.companyId,
          authorId,
          tags: Array.from(new Set([...kb.tags, derivedKey.toLowerCase()])),
          linkedTaskIds: [],
          pinned: false,
        }))
      );

      const keyToId = new Map<string, string>();
      blueprint.knowledgeArticles.forEach((draft, idx) => {
        if (createdArticles[idx]) {
          keyToId.set(draft.tempKey, createdArticles[idx].id);
        }
      });

      const defaultKbIds = createdArticles.slice(0, 2).map((a) => a.id);

      store.addRequirementsBulk(
        blueprint.requirements.map((req) => {
          const resolvedKbIds = req.knowledgeKeys
            .map((k) => keyToId.get(k))
            .filter((id): id is string => Boolean(id));
          return {
            projectId: createdProject.id,
            sourceDocumentId: resolvedSpecDocId,
            code: req.code,
            type: req.type,
            title: req.title,
            description: req.description,
            category: req.category,
            priority: req.priority,
            status: 'approved',
            acceptanceCriteria: req.acceptanceCriteria,
            linkedKnowledgeIds: resolvedKbIds.length > 0 ? resolvedKbIds : defaultKbIds,
            linkedTaskIds: [],
          };
        })
      );
    }

    store.openProjectDetail(createdProject.id);
  }
}
