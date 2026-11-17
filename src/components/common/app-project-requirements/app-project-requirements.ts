import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
  iconCpu,
  iconEdit,
  iconFileText,
  iconLayers,
  iconPlus,
  iconSearch,
  iconTrash,
  iconX,
  iconZap,
} from '../icons';
import {
  mapDocumentOptions,
  mapKnowledgeOptions,
  mapUserOptions,
} from '../entity-selector-options';
import { eventValue } from '../event-value';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-checkbox/app-checkbox';
import '../app-confirm-dialog/app-confirm-dialog';
import '../app-empty-state/app-empty-state';
import '../app-entity-selector/app-entity-selector';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-kpi-strip/app-kpi-strip';
import '../app-modal/app-modal';
import '../app-number-input/app-number-input';
import '../app-section-card/app-section-card';
import '../app-segmented-switch/app-segmented-switch';
import '../app-select/app-select';
import '../app-status-chip/app-status-chip';
import '../app-textarea/app-textarea';
import '../../dashboard/app-metric-card/app-metric-card';
import styles from './app-project-requirements.css';

@customElement('app-project-requirements')
export class AppProjectRequirements extends LitElement {
  @property({ type: String }) projectId = '';

  @state() private currentLang = store.customization.language;
  @state() private requirements: ProjectRequirement[] = store.requirements;
  @state() private typeFilter: 'all' | RequirementType = 'all';
  @state() private searchQuery = '';
  @state() private selectedReqIds: string[] = [];

  // Requirement Create / Edit Modal
  @state() private reqModalOpen = false;
  @state() private editingReqId: string | null = null;
  @state() private formCode = '';
  @state() private formType: RequirementType = 'functional';
  @state() private formCategory = '';
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
    this.currentLang = store.customization.language;
    this.requirements = store.requirements;
    if (!store.users.some((u) => u.id === this.decomposeAssigneeId)) {
      this.decomposeAssigneeId = store.currentUserId || store.users[0]?.id || '';
    }
  }

  private getProjectRequirements(): ProjectRequirement[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.requirements.filter((r) => {
      if (this.projectId && r.projectId !== this.projectId) return false;
      if (this.typeFilter !== 'all' && r.type !== this.typeFilter) return false;
      if (!query) return true;
      return (
        r.code.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.acceptanceCriteria.some((c) => c.toLowerCase().includes(query))
      );
    });
  }

  private getLinkedTasksForReq(req: ProjectRequirement) {
    const idSet = new Set(req.linkedTaskIds || []);
    return store.tasks.filter(
      (tk) =>
        idSet.has(tk.id) || (tk.requirementIds || []).includes(req.id)
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const projectReqsAll = this.requirements.filter(
      (r) => !this.projectId || r.projectId === this.projectId
    );
    const filtered = this.getProjectRequirements();

    const frCount = projectReqsAll.filter((r) => r.type === 'functional').length;
    const nfrCount = projectReqsAll.filter((r) => r.type === 'non_functional').length;
    const coveredCount = projectReqsAll.filter(
      (r) => this.getLinkedTasksForReq(r).length > 0
    ).length;

    const allFilteredSelected =
      filtered.length > 0 && filtered.every((r) => this.selectedReqIds.includes(r.id));

    return html`
      <app-section-card
        title="${t.requirements.title}"
        subtitle="${t.requirements.subtitle}"
      >
        <span slot="icon">${iconLayers(18)}</span>

        <div slot="actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <app-button
            size="sm"
            variant="ghost"
            @click="${() => store.openRequirements(this.projectId || 'all')}"
          >
            <span>${t.viewTexts.requirements.allRequirementsBtn}</span>
          </app-button>

          <app-button
            size="sm"
            variant="secondary"
            @click="${this.openSpecModal}"
          >
            <span slot="icon-start">${iconFileText(14)}</span>
            <span>${t.viewTexts.requirements.generateFromSpecBtn}</span>
          </app-button>

          <app-button
            size="sm"
            variant="primary"
            @click="${this.openCreateReqModal}"
          >
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${t.viewTexts.requirements.addReqBtn}</span>
          </app-button>
        </div>

        <div class="req-workspace">
          <app-kpi-strip columns="4">
            <app-metric-card
              size="compact"
              label="${t.viewTexts.requirements.kpiTotal}"
              value="${projectReqsAll.length}"
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
              value="${coveredCount} / ${projectReqsAll.length}"
              valueColor="var(--color-success, #10b981)"
            ></app-metric-card>
          </app-kpi-strip>

          <div class="req-toolbar">
            <div class="req-filters-left">
              <app-segmented-switch
                size="sm"
                .value="${this.typeFilter}"
                .options="${[
                  { value: 'all', label: t.requirements.allTypes },
                  { value: 'functional', label: t.requirements.functional },
                  { value: 'non_functional', label: t.requirements.nonFunctional },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  this.typeFilter = eventValue(e) as 'all' | RequirementType;
                }}"
              ></app-segmented-switch>

              <div class="req-search-wrap">
                <app-input
                  size="sm"
                  placeholder="${t.viewTexts.requirements.searchPlaceholder}"
                  .value="${this.searchQuery}"
                  @input="${(e: CustomEvent<{ value: string }>) => {
                    this.searchQuery = eventValue(e);
                  }}"
                >
                  <span slot="prefix">${iconSearch(14)}</span>
                </app-input>
              </div>
            </div>

            <div class="req-selection-actions">
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
                    <span class="req-selected-badge">
                      ${t.viewTexts.requirements.selectedCount(this.selectedReqIds.length)}
                    </span>
                  `
                : ''}
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
                <div class="req-error-banner">
                  <span style="flex-shrink: 0;">${iconAlertTriangle(15)}</span>
                  <span>${this.decomposeError}</span>
                </div>
              `
            : ''}

          ${filtered.length === 0
            ? html`
                <app-empty-state
                  compact
                  title="${t.viewTexts.requirements.emptyNoReqs}"
                  description="${t.viewTexts.requirements.emptyHint}"
                ></app-empty-state>
              `
            : html`
                <div class="req-list">
                  ${filtered.map((req) => this.renderReqCard(req, t))}
                </div>
              `}
        </div>
      </app-section-card>

      ${this.renderReqModal(t)}
      ${this.renderSpecModal(t)}
      ${this.renderDecomposeModal(t)}
      ${this.renderDeleteDialog(t)}
    `;
  }

  private renderReqCard(
    req: ProjectRequirement,
    t: ReturnType<typeof getTranslation>
  ) {
    const isSelected = this.selectedReqIds.includes(req.id);
    const linkedKbs = store.knowledgeArticles.filter((k) =>
      (req.linkedKnowledgeIds || []).includes(k.id)
    );
    const linkedTasks = this.getLinkedTasksForReq(req);

    return html`
      <article class="req-card ${isSelected ? 'is-selected' : ''}">
        <div class="req-card-head">
          <div class="req-card-left">
            <app-checkbox
              .checked="${isSelected}"
              @change="${() => this.toggleSelectOne(req.id)}"
            ></app-checkbox>

            <span class="req-code-badge ${req.type === 'non_functional' ? 'is-nfr' : ''}">
              ${req.code}
            </span>
            <span class="req-type-tag">
              ${req.type === 'functional' ? t.requirements.frShort : t.requirements.nfrShort}
            </span>
            <span class="req-category-pill">${req.category}</span>
            <app-status-chip
              domain="requirement"
              status="${req.status}"
              appearance="soft"
              size="sm"
            ></app-status-chip>
            <app-status-chip
              domain="requirementPriority"
              status="${req.priority}"
              appearance="outline"
              size="sm"
            ></app-status-chip>
          </div>

          <div class="req-card-actions">
            <app-button
              size="sm"
              variant="ghost"
              @click="${() => store.openRequirementDetail(req.id)}"
            >
              <span>${t.common.details}</span>
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
        </div>

        <h4
          class="req-title"
          style="cursor: pointer;"
          @click="${() => store.openRequirementDetail(req.id)}"
        >
          ${req.title}
        </h4>
        ${req.description ? html`<p class="req-desc">${req.description}</p>` : ''}

        ${req.acceptanceCriteria.length > 0
          ? html`
              <ul class="req-criteria-list">
                ${req.acceptanceCriteria.map((criterion) => html`<li>${criterion}</li>`)}
              </ul>
            `
          : ''}

        ${linkedKbs.length > 0 || linkedTasks.length > 0
          ? html`
              <div class="req-trace-row">
                ${linkedKbs.length > 0
                  ? html`
                      <div class="req-trace-group">
                        <span class="req-trace-label">${t.requirements.linkedKbLabel}:</span>
                        ${linkedKbs.map(
                          (kb) => html`
                            <button
                              type="button"
                              class="trace-link-chip"
                              @click="${() => {
                                store.selectKnowledgeArticle(kb.id);
                                store.openKnowledgeBase({
                                  scope: kb.scope,
                                  projectId: kb.projectId,
                                });
                              }}"
                            >
                              ${iconBookOpen(11)}
                              <span>${kb.title}</span>
                            </button>
                          `
                        )}
                      </div>
                    `
                  : ''}

                ${linkedTasks.length > 0
                  ? html`
                      <div class="req-trace-group">
                        <span class="req-trace-label">${t.requirements.linkedTasksLabel}:</span>
                        ${linkedTasks.map(
                          (tk) => html`
                            <button
                              type="button"
                              class="trace-link-chip is-task"
                              @click="${() => store.openTaskDetail(tk.id)}"
                            >
                              <span class="mono">${tk.id}</span>
                              <span>· ${tk.title}</span>
                            </button>
                          `
                        )}
                      </div>
                    `
                  : ''}
              </div>
            `
          : ''}
      </article>
    `;
  }

  private renderReqModal(t: ReturnType<typeof getTranslation>) {
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
                  <div class="req-trace-group" style="margin-top: 0.45rem;">
                    ${selectedKbs.map(
                      (kb) => html`
                        <span class="trace-link-chip" style="cursor: default;">
                          ${iconBookOpen(11)}
                          <span>${kb.title}</span>
                          <button
                            type="button"
                            class="mini-chip-x"
                            style="background:transparent;border:none;color:inherit;cursor:pointer;display:inline-flex;padding:0;margin-left:2px;"
                            title="${t.common.delete}"
                            @click="${() => {
                              this.formKnowledgeIds = this.formKnowledgeIds.filter((id) => id !== kb.id);
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
                <div class="col-span-2 req-error-banner">
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

                      <div class="req-trace-row">
                        ${reqs.map(
                          (r) => html`
                            <span class="req-code-badge ${r.type === 'non_functional' ? 'is-nfr' : ''}">
                              ${r.code}
                            </span>
                          `
                        )}
                        ${kbs.map(
                          (kb) => html`
                            <span class="trace-link-chip" style="cursor: default;">
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
    const projectReqs = this.requirements.filter((r) => r.projectId === this.projectId);
    const nextIdx = projectReqs.length + 1;
    this.editingReqId = null;
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

    const project = store.projects.find((p) => p.id === this.projectId);

    if (this.editingReqId) {
      const existing = this.requirements.find((r) => r.id === this.editingReqId);
      if (existing) {
        store.updateRequirement({
          ...existing,
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
        projectId: this.projectId,
        sourceDocumentId: project?.specDocumentId,
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
    const proj = store.projects.find((p) => p.id === this.projectId);
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

    const project = store.projects.find((p) => p.id === this.projectId);
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
    const project = store.projects.find((p) => p.id === (this.projectId || targetReqs[0].projectId));
    if (!project) return;

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
      const created = store.addTask({
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: 'todo',
        priority: draft.priority,
        assigneeId,
        projectId: this.projectId,
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
