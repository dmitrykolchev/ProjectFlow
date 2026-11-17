import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  ProjectRequirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
  Task,
  TaskAiClarificationMessage,
} from '../../../types';
import {
  clarifyRequirementWithContext,
  formatAiError,
} from '../../../services/openai-client';
import {
  iconAlertTriangle,
  iconBookOpen,
  iconCheck,
  iconChevronLeft,
  iconCpu,
  iconEdit,
  iconFileText,
  iconFolder,
  iconLayers,
  iconPlus,
  iconSend,
  iconTrash,
  iconX,
  iconZap,
} from '../../common/icons';
import {
  mapDocumentOptions,
  mapKnowledgeOptions,
  mapProjectOptions,
  mapRequirementOptions,
  mapTaskOptions,
} from '../../common/entity-selector-options';
import { eventValue } from '../../common/event-value';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-input/app-input';
import '../../common/app-modal/app-modal';
import '../../common/app-decompose-form/app-decompose-form';
import '../../common/app-requirement-form/app-requirement-form';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-textarea/app-textarea';
import '../../common/app-entity-emblem/app-entity-emblem';
import styles from './app-requirement-detail.css';

@customElement('app-requirement-detail')
export class AppRequirementDetail extends LitElement {
  @state() private requirements: ProjectRequirement[] = store.requirements;
  @state() private detailRequirementId =
    store.detailRequirementId || store.requirements[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private storeVersion = 0;

  // Inline description edit
  @state() private editingDesc = false;
  @state() private draftDesc = '';

  // Inline category edit
  @state() private editingCategory = false;
  @state() private draftCategory = '';

  // Acceptance criteria inline editor
  @state() private newCriterionText = '';
  @state() private editingCriterionIdx: number | null = null;
  @state() private editingCriterionText = '';

  // Quick manual task creator
  @state() private manualTaskOpen = false;
  @state() private manualTaskTitle = '';

  // AI collaborative clarification state
  @state() private aiInput = '';
  @state() private aiLoading = false;
  @state() private aiError = '';

  // AI decompose into tasks modal
  @state() private decomposing = false;
  @state() private decomposeError = '';

  // Edit requirement modal
  @state() private editModalOpen = false;

  // Delete confirm
  @state() private confirmDeleteOpen = false;

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
    this.requirements = store.requirements;
    this.currentLang = store.customization.language;
    this.storeVersion += 1;

    const candidate = store.detailRequirementId || this.detailRequirementId;
    if (candidate && this.requirements.some((r) => r.id === candidate)) {
      if (this.detailRequirementId !== candidate) {
        this.editingDesc = false;
        this.editingCategory = false;
        this.editingCriterionIdx = null;
        this.aiError = '';
        this.decomposeError = '';
      }
      this.detailRequirementId = candidate;
    } else {
      this.detailRequirementId = this.requirements[0]?.id || '';
    }

  }

  private getCurrentRequirement(): ProjectRequirement | null {
    return this.requirements.find((r) => r.id === this.detailRequirementId) || null;
  }

  private getLinkedTasks(req: ProjectRequirement): Task[] {
    const idSet = new Set(req.linkedTaskIds || []);
    return store.tasks.filter(
      (tk) => idSet.has(tk.id) || (tk.requirementIds || []).includes(req.id)
    );
  }

  private formatDateTime(iso: string): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    return new Date(ms).toLocaleString(getTranslation(this.currentLang).common.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const req = this.getCurrentRequirement();

    if (!req) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.requirementDetail.emptyNotFound}">
            <app-button
              slot="action"
              variant="primary"
              @click="${() => store.setActiveView('requirements')}"
            >
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.viewTexts.requirementDetail.backToRequirements}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const project = store.projects.find((p) => p.id === req.projectId);
    const sourceDoc = req.sourceDocumentId
      ? store.documents.find((d) => d.id === req.sourceDocumentId)
      : undefined;
    const linkedTasks = this.getLinkedTasks(req);
    const linkedKbs = store.knowledgeArticles.filter((k) =>
      (req.linkedKnowledgeIds || []).includes(k.id)
    );

    const doneTasks = linkedTasks.filter((tk) => tk.status === 'done').length;
    const totalEst = linkedTasks.reduce((sum, tk) => sum + (tk.estimatedHours || 0), 0);
    const totalLogged = linkedTasks.reduce((sum, tk) => sum + (tk.loggedHours || 0), 0);
    const completionPct = linkedTasks.length
      ? Math.round((doneTasks / linkedTasks.length) * 100)
      : 0;

    const switcherOptions = mapRequirementOptions(this.requirements, t);

    const statusOptions: Array<{ value: RequirementStatus; label: string }> = [
      { value: 'draft', label: t.requirements.statuses.draft },
      { value: 'approved', label: t.requirements.statuses.approved },
      { value: 'in_progress', label: t.requirements.statuses.in_progress },
      { value: 'implemented', label: t.requirements.statuses.implemented },
      { value: 'verified', label: t.requirements.statuses.verified },
    ];
    const priorityOptions: Array<{ value: RequirementPriority; label: string }> = [
      { value: 'critical', label: t.requirements.priorities.critical },
      { value: 'high', label: t.requirements.priorities.high },
      { value: 'medium', label: t.requirements.priorities.medium },
      { value: 'low', label: t.requirements.priorities.low },
    ];
    const typeOptions: Array<{ value: RequirementType; label: string }> = [
      { value: 'functional', label: t.requirements.functional },
      { value: 'non_functional', label: t.requirements.nonFunctional },
    ];

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="secondary"
              size="sm"
              @click="${() => store.setActiveView('requirements')}"
            >
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.viewTexts.requirementDetail.backToRequirements}</span>
            </app-button>

            <div class="req-switcher">
              <app-entity-selector
                size="sm"
                placeholder="${t.viewTexts.requirementDetail.switcherPlaceholder}"
                .options="${switcherOptions}"
                .value="${req.id}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  const nextId = eventValue(e);
                  if (nextId && nextId !== req.id) {
                    store.openRequirementDetail(nextId);
                  }
                }}"
              ></app-entity-selector>
            </div>
          </div>

          <div class="nav-actions">
            ${project
              ? html`
                  <app-button
                    variant="outline"
                    size="sm"
                    @click="${() => store.openProjectDetail(project.id)}"
                  >
                    <span slot="icon-start">${iconFolder(14)}</span>
                    <span>${t.viewTexts.requirementDetail.openProjectBtn}</span>
                  </app-button>
                `
              : ''}
            <app-button
              variant="primary"
              size="sm"
              ?disabled="${this.decomposing}"
              @click="${() => this.handleDecomposeRequirement(req)}"
            >
              <span slot="icon-start">${iconZap(14)}</span>
              <span>
                ${this.decomposing
                  ? t.viewTexts.requirements.decomposingBtn
                  : t.viewTexts.requirements.decomposeSingleBtn}
              </span>
            </app-button>
            <app-button
              size="xs"
              variant="icon"
              title="${t.common.edit}"
              @click="${() => this.openEditModal(req)}"
            >
              <span slot="start">${iconEdit(15)}</span>
            </app-button>
            <app-button
              action="delete"
              size="xs"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
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

        <!-- Hero Card -->
        <section class="hero-card">
          <div class="hero-main">
            <div class="hero-identity">
              <app-entity-emblem entity="requirement" size="lg"></app-entity-emblem>
              <div class="hero-title-group">
                <div class="hero-top-meta">
                  <app-entity-emblem entity="requirement" variant="pill" size="sm"></app-entity-emblem>
                  <span class="req-code-badge ${req.type === 'non_functional' ? 'is-nfr' : ''}">
                    ${req.code}
                  </span>
                  <span class="req-pill">
                    ${req.type === 'functional' ? t.requirements.frShort : t.requirements.nfrShort}
                  </span>
                  ${project
                    ? html`
                        <app-link
                          class="link-btn"
                          size="md"
                          variant="primary"
                          @click="${() => store.openProjectDetail(project.id)}"
                        >
                          <span slot="start" class="mono">[${project.key}]</span>
                          <span>${project.name}</span>
                        </app-link>
                      `
                    : ''}
                  <span>·</span>
                  <span>${t.viewTexts.requirementDetail.metaUpdated}: ${this.formatDateTime(req.updatedAt)}</span>
                </div>

                <div class="hero-title-row">
                  <h1 class="req-title">${req.title}</h1>
                  <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                    <app-status-chip
                      domain="requirement"
                      status="${req.status}"
                      appearance="soft"
                      size="md"
                    ></app-status-chip>
                    <app-status-chip
                      domain="requirementPriority"
                      status="${req.priority}"
                      appearance="outline"
                      size="md"
                    ></app-status-chip>
                  </div>
                </div>
              </div>
            </div>

            <div class="req-desc-box">
              ${this.editingDesc
                ? html`
                    <app-textarea
                      rows="4"
                      label="${t.viewTexts.requirementDetail.descriptionTitle}"
                      .value="${this.draftDesc}"
                      @input="${(e: CustomEvent<{ value: string }>) =>
                        (this.draftDesc = eventValue(e))}"
                    ></app-textarea>
                    <div class="desc-actions">
                      <app-button
                        size="sm"
                        variant="primary"
                        @click="${() => {
                          store.updateRequirement({ ...req, description: this.draftDesc.trim() });
                          this.editingDesc = false;
                        }}"
                      >
                        ${t.viewTexts.requirementDetail.saveDescBtn}
                      </app-button>
                      <app-button
                        size="sm"
                        variant="ghost"
                        @click="${() => (this.editingDesc = false)}"
                      >
                        ${t.viewTexts.requirementDetail.cancelEditBtn}
                      </app-button>
                    </div>
                  `
                : html`
                    <p class="req-desc">${req.description || '—'}</p>
                    <div class="desc-actions">
                      <app-button
                        size="sm"
                        variant="ghost"
                        @click="${() => {
                          this.draftDesc = req.description || '';
                          this.editingDesc = true;
                        }}"
                      >
                        <span slot="icon-start">${iconEdit(13)}</span>
                        <span>${t.viewTexts.requirementDetail.editDescBtn}</span>
                      </app-button>
                    </div>
                  `}
            </div>

            <div class="inline-controls-strip">
              <div class="control-cell">
                <span class="control-label">${t.requirements.statusLabel}</span>
                <app-select
                  size="sm"
                  .value="${req.status}"
                  .options="${statusOptions}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    store.updateRequirement({
                      ...req,
                      status: eventValue(e) as RequirementStatus,
                    });
                  }}"
                ></app-select>
              </div>

              <div class="control-cell">
                <span class="control-label">${t.requirements.priorityLabel}</span>
                <app-select
                  size="sm"
                  .value="${req.priority}"
                  .options="${priorityOptions}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    store.updateRequirement({
                      ...req,
                      priority: eventValue(e) as RequirementPriority,
                    });
                  }}"
                ></app-select>
              </div>

              <div class="control-cell">
                <span class="control-label">${t.requirements.typeLabel}</span>
                <app-select
                  size="sm"
                  .value="${req.type}"
                  .options="${typeOptions}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    store.updateRequirement({
                      ...req,
                      type: eventValue(e) as RequirementType,
                    });
                  }}"
                ></app-select>
              </div>

              <div class="control-cell">
                <span class="control-label">${t.requirements.categoryLabel}</span>
                ${this.editingCategory
                  ? html`
                      <app-input
                        size="sm"
                        .value="${this.draftCategory}"
                        @input="${(e: CustomEvent<{ value: string }>) =>
                          (this.draftCategory = eventValue(e))}"
                        @keydown="${(e: KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            store.updateRequirement({
                              ...req,
                              category: this.draftCategory.trim() || req.category,
                            });
                            this.editingCategory = false;
                          } else if (e.key === 'Escape') {
                            this.editingCategory = false;
                          }
                        }}"
                        @blur="${() => {
                          if (this.editingCategory) {
                            store.updateRequirement({
                              ...req,
                              category: this.draftCategory.trim() || req.category,
                            });
                            this.editingCategory = false;
                          }
                        }}"
                      ></app-input>
                    `
                  : html`
                      <div class="dates-display">
                        <app-link
                          class="link-btn mono-link"
                          size="md"
                          variant="primary"
                          @click="${() => {
                            this.draftCategory = req.category;
                            this.editingCategory = true;
                          }}"
                        >
                          <span>${req.category}</span>
                          <span slot="end">${iconEdit(12)}</span>
                        </app-link>
                      </div>
                    `}
              </div>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.requirementDetail.kpiCriteria}</span>
              <span class="kpi-val">${req.acceptanceCriteria.length}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.requirementDetail.kpiTasksDone}</span>
              <span class="kpi-val">${doneTasks} / ${linkedTasks.length}</span>
              <span class="kpi-sub">${completionPct}%</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.requirementDetail.kpiKbLinks}</span>
              <span class="kpi-val">${linkedKbs.length}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.requirementDetail.kpiEstimatedLogged}</span>
              <span class="kpi-val">${totalLogged.toFixed(1)} / ${totalEst}</span>
            </div>
          </div>
        </section>

        <!-- 2-Column Workspace -->
        <div class="detail-grid">
          <div class="main-column">
            ${this.renderCriteriaCard(req, t)}
            ${this.renderLinkedTasksCard(req, linkedTasks, t)}
            ${this.renderAiCollaborationCard(req, project, sourceDoc, linkedKbs, linkedTasks, t)}
          </div>

          <aside class="side-column">
            ${this.renderTraceabilitySidebarCard(req, sourceDoc, linkedKbs, t)}
            ${this.renderCoverageSidebarCard(req, linkedTasks, doneTasks, completionPct, totalEst, totalLogged, t)}
          </aside>
        </div>
      </div>

      ${this.renderEditModal(t)}
      ${this.renderDecomposeModal(t)}
      ${this.renderDeleteDialog(req, t)}
    `;
  }

  private renderCriteriaCard(
    req: ProjectRequirement,
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-section-card
        title="${t.viewTexts.requirementDetail.criteriaTitle}"
        subtitle="${t.viewTexts.requirementDetail.criteriaSubtitle}"
      >
        <span slot="icon">${iconCheck(17)}</span>
        <app-badge slot="actions" variant="info" appearance="soft">
          ${req.acceptanceCriteria.length}
        </app-badge>

        ${req.acceptanceCriteria.length === 0
          ? html`
              <app-empty-state
                compact
                title="${t.viewTexts.requirementDetail.criteriaEmpty}"
              ></app-empty-state>
            `
          : html`
              <div class="criteria-list">
                ${req.acceptanceCriteria.map((criterion, idx) => html`
                  <div class="criterion-row">
                    <span class="criterion-num">AC-${String(idx + 1).padStart(2, '0')}</span>
                    ${this.editingCriterionIdx === idx
                      ? html`
                          <app-input
                            size="sm"
                            style="flex: 1;"
                            .value="${this.editingCriterionText}"
                            @input="${(e: CustomEvent<{ value: string }>) =>
                              (this.editingCriterionText = eventValue(e))}"
                            @keydown="${(e: KeyboardEvent) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                this.saveEditedCriterion(req, idx);
                              } else if (e.key === 'Escape') {
                                this.editingCriterionIdx = null;
                              }
                            }}"
                          ></app-input>
                          <app-button
                            size="sm"
                            variant="primary"
                            @click="${() => this.saveEditedCriterion(req, idx)}"
                          >
                            ${iconCheck(13)}
                          </app-button>
                        `
                      : html`
                          <span class="criterion-text">${criterion}</span>
                          <app-button
                            class="sm-action"
                            size="xs"
                            variant="icon"
                            title="${t.common.edit}"
                            @click="${() => {
                              this.editingCriterionIdx = idx;
                              this.editingCriterionText = criterion;
                            }}"
                          >
                            <span slot="start">${iconEdit(12)}</span>
                          </app-button>
                          <app-button
                            class="sm-action"
                            action="delete"
                            size="xs"
                            variant="icon"
                            title="${t.common.delete}"
                            @click="${() => this.removeCriterion(req, idx)}"
                          >
                            <span slot="start">${iconX(12)}</span>
                          </app-button>
                        `}
                  </div>
                `)}
              </div>
            `}

        <div class="criterion-add-row">
          <app-input
            size="sm"
            placeholder="${t.viewTexts.requirementDetail.addCriterionPlaceholder}"
            .value="${this.newCriterionText}"
            @input="${(e: CustomEvent<{ value: string }>) =>
              (this.newCriterionText = eventValue(e))}"
            @keydown="${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                this.addCriterion(req);
              }
            }}"
          ></app-input>
          <app-button
            size="sm"
            variant="secondary"
            ?disabled="${!this.newCriterionText.trim()}"
            @click="${() => this.addCriterion(req)}"
          >
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${t.viewTexts.requirementDetail.addCriterionBtn}</span>
          </app-button>
        </div>
      </app-section-card>
    `;
  }

  private renderLinkedTasksCard(
    req: ProjectRequirement,
    linkedTasks: Task[],
    t: ReturnType<typeof getTranslation>
  ) {
    const attachableTasks = store.tasks.filter(
      (tk) => tk.projectId === req.projectId && !linkedTasks.some((lt) => lt.id === tk.id)
    );
    const taskOptions = mapTaskOptions(attachableTasks, t);
    const usersMap = new Map(store.users.map((u) => [u.id, u]));

    return html`
      <app-section-card
        title="${t.viewTexts.requirementDetail.linkedTasksTitle}"
        subtitle="${t.viewTexts.requirementDetail.linkedTasksSubtitle}"
      >
        <span slot="icon">${iconLayers(17)}</span>
        <div slot="actions" style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
          <app-button
            size="sm"
            variant="secondary"
            @click="${() => (this.manualTaskOpen = !this.manualTaskOpen)}"
          >
            ${t.viewTexts.requirementDetail.newManualTaskBtn}
          </app-button>
          <app-button
            size="sm"
            variant="primary"
            ?disabled="${this.decomposing}"
            @click="${() => this.handleDecomposeRequirement(req)}"
          >
            <span slot="icon-start">${iconCpu(14)}</span>
            <span>${t.viewTexts.requirements.decomposeSingleBtn}</span>
          </app-button>
        </div>

        ${this.manualTaskOpen
          ? html`
              <div class="manual-task-box">
                <app-input
                  size="sm"
                  placeholder="${t.viewTexts.requirementDetail.newManualTaskPlaceholder}"
                  .value="${this.manualTaskTitle}"
                  @input="${(e: CustomEvent<{ value: string }>) =>
                    (this.manualTaskTitle = eventValue(e))}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      this.handleCreateManualTask(req);
                    }
                  }}"
                ></app-input>
                <app-button
                  size="sm"
                  variant="primary"
                  ?disabled="${!this.manualTaskTitle.trim()}"
                  @click="${() => this.handleCreateManualTask(req)}"
                >
                  ${t.viewTexts.requirementDetail.createTaskBtn}
                </app-button>
              </div>
            `
          : ''}

        ${taskOptions.length > 0
          ? html`
              <div class="task-attach-bar">
                <app-entity-selector
                  size="sm"
                  placeholder="${t.viewTexts.requirementDetail.attachTaskPlaceholder}"
                  .options="${taskOptions}"
                  value=""
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    const tid = eventValue(e);
                    if (tid) this.linkExistingTask(req, tid);
                  }}"
                ></app-entity-selector>
              </div>
            `
          : ''}

        ${linkedTasks.length === 0
          ? html`
              <app-empty-state
                compact
                title="${t.viewTexts.requirementDetail.noLinkedTasks}"
              ></app-empty-state>
            `
          : html`
              <div class="linked-tasks-list">
                ${linkedTasks.map((tk) => {
                  const assignee = usersMap.get(tk.assigneeId);
                  return html`
                    <div class="linked-task-row">
                      <button
                        type="button"
                        class="linked-task-main"
                        @click="${() => store.openTaskDetail(tk.id)}"
                      >
                        <div class="linked-task-top">
                          <span class="linked-task-id">${tk.id}</span>
                          <span class="linked-task-title">${tk.title}</span>
                        </div>
                        <div class="linked-task-sub">
                          <span>${assignee?.name || tk.assigneeId}</span>
                          <span>·</span>
                          <span class="mono">${tk.loggedHours}/${tk.estimatedHours}${t.common.hours}</span>
                          <span>·</span>
                          <span class="mono">${tk.dueDate}</span>
                        </div>
                      </button>

                      <div class="linked-task-right">
                        <app-status-chip
                          domain="task"
                          status="${tk.status}"
                          appearance="soft"
                          size="sm"
                        ></app-status-chip>
                        <app-status-chip
                          domain="priority"
                          status="${tk.priority}"
                          appearance="outline"
                          size="sm"
                        ></app-status-chip>
                        <app-button
                          class="sm-action"
                          action="delete"
                          size="xs"
                          variant="icon"
                          title="${t.common.delete}"
                          @click="${() => this.unlinkTask(req, tk.id)}"
                        >
                          <span slot="start">${iconX(12)}</span>
                        </app-button>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}
      </app-section-card>
    `;
  }

  private renderAiCollaborationCard(
    req: ProjectRequirement,
    project: ReturnType<typeof store.projects.find>,
    sourceDoc: ReturnType<typeof store.documents.find>,
    linkedKbs: typeof store.knowledgeArticles,
    linkedTasks: Task[],
    t: ReturnType<typeof getTranslation>
  ) {
    const messages = req.clarifications || [];
    const usersMap = new Map(store.users.map((u) => [u.id, u]));

    return html`
      <app-section-card
        title="${t.viewTexts.requirementDetail.aiTitle}"
        subtitle="${t.viewTexts.requirementDetail.aiSubtitle}"
      >
        <span slot="icon">${iconCpu(17)}</span>
        ${messages.length > 0
          ? html`
              <app-button
                slot="actions"
                size="sm"
                variant="ghost"
                @click="${() => store.updateRequirement({ ...req, clarifications: [] })}"
              >
                ${t.viewTexts.ai.clarifyClearBtn}
              </app-button>
            `
          : ''}

        <div class="ai-quick-row">
          <button
            type="button"
            class="ai-quick-chip"
            ?disabled="${this.aiLoading}"
            @click="${() =>
              this.sendAiQuestion(
                req,
                project,
                sourceDoc,
                linkedKbs,
                linkedTasks,
                t.viewTexts.requirementDetail.aiQuickCompleteness
              )}"
          >
            ${t.viewTexts.requirementDetail.aiQuickCompleteness}
          </button>
          <button
            type="button"
            class="ai-quick-chip"
            ?disabled="${this.aiLoading}"
            @click="${() =>
              this.sendAiQuestion(
                req,
                project,
                sourceDoc,
                linkedKbs,
                linkedTasks,
                t.viewTexts.requirementDetail.aiQuickCriteria
              )}"
          >
            ${t.viewTexts.requirementDetail.aiQuickCriteria}
          </button>
          <button
            type="button"
            class="ai-quick-chip"
            ?disabled="${this.aiLoading}"
            @click="${() =>
              this.sendAiQuestion(
                req,
                project,
                sourceDoc,
                linkedKbs,
                linkedTasks,
                t.viewTexts.requirementDetail.aiQuickRisks
              )}"
          >
            ${t.viewTexts.requirementDetail.aiQuickRisks}
          </button>
          <button
            type="button"
            class="ai-quick-chip"
            ?disabled="${this.aiLoading}"
            @click="${() =>
              this.sendAiQuestion(
                req,
                project,
                sourceDoc,
                linkedKbs,
                linkedTasks,
                t.viewTexts.requirementDetail.aiQuickNfr
              )}"
          >
            ${t.viewTexts.requirementDetail.aiQuickNfr}
          </button>
        </div>

        ${this.aiError
          ? html`
              <div class="error-banner">
                <span style="flex-shrink: 0;">${iconAlertTriangle(14)}</span>
                <span>${this.aiError}</span>
              </div>
            `
          : ''}

        ${messages.length === 0
          ? html`
              <div class="ai-empty-note">${t.viewTexts.requirementDetail.aiEmpty}</div>
            `
          : html`
              <div class="ai-thread">
                ${messages.map((msg) => {
                  const isAssistant = msg.role === 'assistant';
                  const author = isAssistant
                    ? t.viewTexts.ai.aiAuthorLabel
                    : (msg.authorId && usersMap.get(msg.authorId)?.name) ||
                      t.viewTexts.ai.humanAuthorLabel;
                  return html`
                    <div class="ai-msg ${isAssistant ? 'is-assistant' : 'is-user'}">
                      <div class="ai-msg-head">
                        <span class="ai-msg-author">${author}</span>
                        <span>
                          ${msg.model ? `${msg.model} · ` : ''}${this.formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                      <div class="ai-msg-body">${msg.content}</div>
                      ${isAssistant
                        ? html`
                            <div class="ai-msg-actions">
                              <app-button
                                size="sm"
                                variant="secondary"
                                @click="${() => {
                                  store.updateRequirement({ ...req, description: msg.content.trim() });
                                  store.addNotification(
                                    'success',
                                    req.code,
                                    t.viewTexts.requirementDetail.aiDescUpdatedToast
                                  );
                                }}"
                              >
                                ${t.viewTexts.requirementDetail.aiReplaceDescBtn}
                              </app-button>
                              <app-button
                                size="sm"
                                variant="ghost"
                                @click="${() => {
                                  const nextDesc = req.description?.trim()
                                    ? `${req.description.trim()}\n\n${msg.content.trim()}`
                                    : msg.content.trim();
                                  store.updateRequirement({ ...req, description: nextDesc });
                                  store.addNotification(
                                    'success',
                                    req.code,
                                    t.viewTexts.requirementDetail.aiDescUpdatedToast
                                  );
                                }}"
                              >
                                ${t.viewTexts.requirementDetail.aiAppendDescBtn}
                              </app-button>
                              <app-button
                                size="sm"
                                variant="outline"
                                @click="${() => this.extractAndAddCriteria(req, msg.content, t)}"
                              >
                                ${t.viewTexts.requirementDetail.aiAddCriteriaBtn}
                              </app-button>
                            </div>
                          `
                        : ''}
                    </div>
                  `;
                })}
              </div>
            `}

        <div class="ai-composer">
          <textarea
            class="ai-input ai-scroll"
            placeholder="${t.viewTexts.requirementDetail.aiPlaceholder}"
            .value="${this.aiInput}"
            ?disabled="${this.aiLoading}"
            @input="${(e: InputEvent) => {
              this.aiInput = (e.target as HTMLTextAreaElement).value;
            }}"
            @keydown="${(e: KeyboardEvent) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendAiQuestion(req, project, sourceDoc, linkedKbs, linkedTasks);
              }
            }}"
          ></textarea>
          <div class="ai-composer-footer">
            <app-button
              size="sm"
              variant="primary"
              ?disabled="${this.aiLoading || !this.aiInput.trim()}"
              @click="${() =>
                this.sendAiQuestion(req, project, sourceDoc, linkedKbs, linkedTasks)}"
            >
              <span slot="icon-start">${iconSend(13)}</span>
              <span>
                ${this.aiLoading
                  ? t.viewTexts.requirementDetail.aiThinking
                  : t.viewTexts.requirementDetail.aiSendBtn}
              </span>
            </app-button>
          </div>
        </div>
      </app-section-card>
    `;
  }

  private renderTraceabilitySidebarCard(
    req: ProjectRequirement,
    sourceDoc: ReturnType<typeof store.documents.find>,
    linkedKbs: typeof store.knowledgeArticles,
    t: ReturnType<typeof getTranslation>
  ) {
    const docOptions = mapDocumentOptions(store.documents, t);
    const availableKbOptions = mapKnowledgeOptions(
      store.knowledgeArticles.filter((k) => !(req.linkedKnowledgeIds || []).includes(k.id)),
      t
    );

    return html`
      <app-section-card title="${t.viewTexts.requirementDetail.traceabilityTitle}">
        <span slot="icon">${iconBookOpen(16)}</span>

        <div class="trace-block">
          <div class="trace-subhead">${t.viewTexts.requirementDetail.sourceSpecTitle}</div>
          ${sourceDoc
            ? html`
                <div class="trace-item">
                  <button
                    type="button"
                    class="trace-item-btn"
                    @click="${() =>
                      store.openDocuments({
                        scope: sourceDoc.scope,
                        projectId: sourceDoc.projectId || 'all',
                        companyId: sourceDoc.companyId || 'all',
                      })}"
                  >
                    ${iconFileText(14)}
                    <span class="trace-item-name" title="${sourceDoc.title}">${sourceDoc.title}</span>
                  </button>
                  <app-button
                    class="sm-action"
                    action="delete"
                    size="xs"
                    variant="icon"
                    title="${t.common.delete}"
                    @click="${() =>
                      store.updateRequirement({ ...req, sourceDocumentId: undefined })}"
                  >
                    <span slot="start">${iconX(12)}</span>
                  </app-button>
                </div>
              `
            : html`<div class="trace-empty">${t.viewTexts.requirementDetail.noSourceSpec}</div>`}

          <app-entity-selector
            clearable
            size="sm"
            placeholder="${t.viewTexts.requirementDetail.attachSpecPlaceholder}"
            .options="${docOptions}"
            .value="${req.sourceDocumentId || ''}"
            @change="${(e: CustomEvent<{ value: string }>) => {
              const docId = eventValue(e) || undefined;
              if (docId !== req.sourceDocumentId) {
                store.updateRequirement({ ...req, sourceDocumentId: docId });
              }
            }}"
          ></app-entity-selector>
        </div>

        <div class="trace-block">
          <div class="trace-subhead">
            ${t.viewTexts.requirementDetail.linkedKbTitle} (${linkedKbs.length})
          </div>
          ${linkedKbs.length === 0
            ? html`<div class="trace-empty">${t.viewTexts.requirementDetail.noLinkedKb}</div>`
            : html`
                <div class="trace-list">
                  ${linkedKbs.map(
                    (kb) => html`
                      <div class="trace-item">
                        <button
                          type="button"
                          class="trace-item-btn"
                          @click="${() =>
                            store.openKnowledgeBase({
                              scope: kb.scope,
                              projectId: kb.projectId || 'all',
                              companyId: kb.companyId || 'all',
                              articleId: kb.id,
                            })}"
                        >
                          ${iconBookOpen(13)}
                          <span class="trace-item-name" title="${kb.title}">${kb.title}</span>
                        </button>
                        <app-button
                          class="sm-action"
                          action="delete"
                          size="xs"
                          variant="icon"
                          title="${t.common.delete}"
                          @click="${() =>
                            store.updateRequirement({
                              ...req,
                              linkedKnowledgeIds: (req.linkedKnowledgeIds || []).filter(
                                (id) => id !== kb.id
                              ),
                            })}"
                        >
                          <span slot="start">${iconX(12)}</span>
                        </app-button>
                      </div>
                    `
                  )}
                </div>
              `}

          ${availableKbOptions.length > 0
            ? html`
                <app-entity-selector
                  size="sm"
                  placeholder="${t.viewTexts.requirementDetail.attachKbPlaceholder}"
                  .options="${availableKbOptions}"
                  value=""
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    const kbId = eventValue(e);
                    if (kbId && !(req.linkedKnowledgeIds || []).includes(kbId)) {
                      store.updateRequirement({
                        ...req,
                        linkedKnowledgeIds: [...(req.linkedKnowledgeIds || []), kbId],
                      });
                    }
                  }}"
                ></app-entity-selector>
              `
            : ''}
        </div>
      </app-section-card>
    `;
  }

  private renderCoverageSidebarCard(
    req: ProjectRequirement,
    linkedTasks: Task[],
    doneTasks: number,
    completionPct: number,
    totalEst: number,
    totalLogged: number,
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-section-card title="${t.viewTexts.requirementDetail.coverageTitle}">
        <span slot="icon">${iconLayers(16)}</span>

        <app-progress-bar
          show-label
          value="${completionPct}"
          color="var(--color-success, #10b981)"
        ></app-progress-bar>

        <div class="summary-kv">
          <div class="kv-row">
            <span class="kv-label">${t.viewTexts.requirementDetail.kpiTasksDone}</span>
            <span class="kv-val mono">${doneTasks} / ${linkedTasks.length}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">${t.viewTexts.requirementDetail.kpiEstimatedLogged}</span>
            <span class="kv-val mono">${totalLogged.toFixed(1)} / ${totalEst} ${t.common.hours}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">${t.viewTexts.requirementDetail.metaCreated}</span>
            <span class="kv-val mono">${this.formatDateTime(req.createdAt)}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">${t.viewTexts.requirementDetail.metaUpdated}</span>
            <span class="kv-val mono">${this.formatDateTime(req.updatedAt)}</span>
          </div>
        </div>
      </app-section-card>
    `;
  }

  private renderEditModal(t: ReturnType<typeof getTranslation>) {
    const req = store.requirements.find((r) => r.id === this.detailRequirementId) || null;

    return html`
      <app-requirement-form
        .open="${this.editModalOpen}"
        .requirement="${req}"
        @close="${() => (this.editModalOpen = false)}"
        @saved="${() => (this.editModalOpen = false)}"
      ></app-requirement-form>
    `;
  }

  private renderDecomposeModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-decompose-form
        @decompose-failed="${(e: CustomEvent<{ message: string }>) => (this.decomposeError = e.detail.message)}"
      ></app-decompose-form>
    `;
  }

  private renderDeleteDialog(
    req: ProjectRequirement,
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.requirementDelete.title}"
        action="${t.viewTexts.confirmDialogs.requirementDelete.action(req.code, req.title)}"
        result="${t.viewTexts.confirmDialogs.requirementDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteRequirement(req.id);
          store.setActiveView('requirements');
        }}"
      ></app-confirm-dialog>
    `;
  }

  private addCriterion(req: ProjectRequirement) {
    const val = this.newCriterionText.trim();
    if (!val) return;
    store.updateRequirement({
      ...req,
      acceptanceCriteria: [...req.acceptanceCriteria, val],
    });
    this.newCriterionText = '';
  }

  private saveEditedCriterion(req: ProjectRequirement, idx: number) {
    const val = this.editingCriterionText.trim();
    if (!val) return;
    const next = req.acceptanceCriteria.map((c, i) => (i === idx ? val : c));
    store.updateRequirement({ ...req, acceptanceCriteria: next });
    this.editingCriterionIdx = null;
  }

  private removeCriterion(req: ProjectRequirement, idx: number) {
    const next = req.acceptanceCriteria.filter((_, i) => i !== idx);
    store.updateRequirement({ ...req, acceptanceCriteria: next });
  }

  private handleCreateManualTask(req: ProjectRequirement) {
    const title = this.manualTaskTitle.trim();
    if (!title) return;
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);
    const created = store.addTask({
      title,
      description: `${req.code}: ${req.title}\n\n${req.description || ''}`.trim(),
      status: 'todo',
      priority: req.priority === 'critical' ? 'urgent' : req.priority,
      assigneeId: store.currentUserId || store.users[0]?.id || 'user-1',
      projectId: req.projectId,
      tags: [req.code.toLowerCase(), req.category.toLowerCase()].filter(Boolean),
      startDate: today,
      dueDate: due,
      estimatedHours: 8,
      loggedHours: 0,
      subtasks: req.acceptanceCriteria.slice(0, 4).map((c, idx) => ({
        id: `st-${Date.now()}-${idx}`,
        title: c,
        completed: false,
      })),
      requirementIds: [req.id],
      knowledgeArticleIds: [...(req.linkedKnowledgeIds || [])],
    });

    store.updateRequirement({
      ...req,
      status: req.status === 'draft' || req.status === 'approved' ? 'in_progress' : req.status,
      linkedTaskIds: Array.from(new Set([...(req.linkedTaskIds || []), created.id])),
    });
    this.manualTaskTitle = '';
    this.manualTaskOpen = false;
  }

  private linkExistingTask(req: ProjectRequirement, taskId: string) {
    const task = store.tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    if (!(task.requirementIds || []).includes(req.id)) {
      store.updateTask({
        ...task,
        requirementIds: [...(task.requirementIds || []), req.id],
      });
    }
    if (!(req.linkedTaskIds || []).includes(taskId)) {
      store.updateRequirement({
        ...req,
        linkedTaskIds: [...(req.linkedTaskIds || []), taskId],
      });
    }
  }

  private unlinkTask(req: ProjectRequirement, taskId: string) {
    const task = store.tasks.find((tk) => tk.id === taskId);
    if (task && (task.requirementIds || []).includes(req.id)) {
      store.updateTask({
        ...task,
        requirementIds: (task.requirementIds || []).filter((id) => id !== req.id),
      });
    }
    store.updateRequirement({
      ...req,
      linkedTaskIds: (req.linkedTaskIds || []).filter((id) => id !== taskId),
    });
  }

  private async sendAiQuestion(
    req: ProjectRequirement,
    project: ReturnType<typeof store.projects.find>,
    sourceDoc: ReturnType<typeof store.documents.find>,
    linkedKbs: typeof store.knowledgeArticles,
    linkedTasks: Task[],
    preset?: string
  ) {
    const t = getTranslation(this.currentLang);
    const question = (preset ?? this.aiInput).trim();
    if (!question || this.aiLoading) return;

    const currentUser = store.users.find((u) => u.id === store.currentUserId);
    const userMsg: TaskAiClarificationMessage = {
      id: `req-clar-${Date.now()}-u`,
      role: 'user',
      authorId: currentUser?.id,
      content: question,
      createdAt: new Date().toISOString(),
    };

    const previousHistory = [...(req.clarifications || [])];
    const withUser = [...previousHistory, userMsg];
    store.updateRequirement({ ...req, clarifications: withUser });
    if (!preset) this.aiInput = '';
    this.aiLoading = true;
    this.aiError = '';

    const endpoint = store.customization.aiEndpoint;
    try {
      const res = await clarifyRequirementWithContext({
        requirement: req,
        project,
        sourceDoc,
        linkedKnowledge: linkedKbs,
        linkedTasks,
        history: previousHistory,
        question,
        lang: this.currentLang,
        baseUrl: endpoint,
        model: store.customization.aiModel,
      });

      const assistantMsg: TaskAiClarificationMessage = {
        id: `req-clar-${Date.now()}-a`,
        role: 'assistant',
        content: res.reply,
        createdAt: new Date().toISOString(),
        model: res.model,
      };
      const freshReq = this.requirements.find((r) => r.id === req.id) || req;
      store.updateRequirement({
        ...freshReq,
        clarifications: [...(freshReq.clarifications || withUser), assistantMsg],
      });
    } catch (err) {
      this.aiError = formatAiError(err, endpoint, t);
    } finally {
      this.aiLoading = false;
    }
  }

  private extractAndAddCriteria(
    req: ProjectRequirement,
    text: string,
    t: ReturnType<typeof getTranslation>
  ) {
    const lines = text
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((line) => line.length >= 6 && line.length <= 220);

    const bulletLines = text
      .split('\n')
      .filter((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))
      .map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s+/, '').trim())
      .filter((l) => l.length >= 4);

    const candidates = (bulletLines.length > 0 ? bulletLines : lines).slice(0, 5);
    const existingSet = new Set(req.acceptanceCriteria.map((c) => c.toLowerCase()));
    const toAdd = candidates.filter((c) => !existingSet.has(c.toLowerCase()));
    if (toAdd.length === 0) return;

    store.updateRequirement({
      ...req,
      acceptanceCriteria: [...req.acceptanceCriteria, ...toAdd],
    });
    store.addNotification(
      'success',
      req.code,
      t.viewTexts.requirementDetail.aiCriteriaAddedToast(toAdd.length)
    );
  }

  private async handleDecomposeRequirement(req: ProjectRequirement) {
    const form = this.shadowRoot!.querySelector('app-decompose-form');
    if (!form) return;
    form.requirementIds = [req.id];
    this.decomposing = true;
    this.decomposeError = '';
    await form.decompose();
    this.decomposing = false;
  }


  private openEditModal(req: ProjectRequirement) {
    this.editModalOpen = true;
  }
}
