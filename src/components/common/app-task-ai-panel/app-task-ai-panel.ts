import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getTranslation } from '../../../i18n';
import {
  analyzeTaskWithContext,
  clarifyTaskWithContext,
  formatAiError,
  generateTaskDescription,
  retrieveTaskContext,
  TaskAiContextItem,
  TaskContextInput,
  TaskContextMatchReason,
} from '../../../services/openai-client';
import { store } from '../../../state/store';
import { SupportedLang, AnalysisSummary, TaskAiClarificationMessage } from '../../../types';
import { eventValue } from '../event-value';
import {
  iconAlertTriangle,
  iconBookOpen,
  iconCheck,
  iconCpu,
  iconFileText,
  iconLayers,
  iconMessageSquare,
  iconPlus,
  iconSend,
  iconTrash,
  iconX,
} from '../icons';
import { ContextChipKind, openContextSource } from '../context-chip-data';
import type { EntitySelectorOption } from '../app-entity-selector/app-entity-selector';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-entity-selector/app-entity-selector';
import '../app-section-card/app-section-card';
import '../app-analysis-summary/app-analysis-summary';
import '../app-context-chips-list/app-context-chips-list';
import styles from './app-task-ai-panel.css';

@customElement('app-task-ai-panel')
export class AppTaskAiPanel extends LitElement {
  @property({ type: Object }) task?: TaskContextInput;
  @property({ type: Array, attribute: false }) analyses: AnalysisSummary[] = [];
  @property({ type: Array }) clarifications: TaskAiClarificationMessage[] = [];
  @property({ type: Boolean }) compact = false;
  @property({ type: String }) timeSummary = '';
  @property({ type: String }) expenseSummary = '';
  @property({ type: String }) discussionsSummary = '';

  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private contextItems: TaskAiContextItem[] = [];
  @state() private selectedKeys = new Set<string>();
  @state() private manualKeys = new Set<string>();
  @state() private lastMatchSignature = '';
  @state() private lastTaskId = '';
  @state() private loadingMode: 'none' | 'description' | 'analysis' = 'none';
  @state() private errorMessage = '';
  @state() private generatedDescription = '';
  @state() private generatedModel = '';
  @state() private localAnalyses: AnalysisSummary[] = [];
  @state() private localClarifications: TaskAiClarificationMessage[] = [];
  @state() private clarifyInput = '';
  @state() private clarifyLoading = false;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.localClarifications = [...(this.clarifications || [])];
    this.localAnalyses = [...(this.analyses || [])];
    this.lastTaskId = this.task?.id || '';
    this.recomputeContext(true);
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
      this.recomputeContext(false);
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('task')) {
      const nextTaskId = this.task?.id || '';
      const taskSwitched = nextTaskId !== this.lastTaskId;
      const sig = this.buildSignature();
      const resetManual = sig !== this.lastMatchSignature;
      this.recomputeContext(resetManual);
      if (taskSwitched) {
        this.lastTaskId = nextTaskId;
        this.generatedDescription = '';
        this.errorMessage = '';
        this.localAnalyses = [...(this.analyses || [])];
        this.localClarifications = [...(this.clarifications || [])];
        this.clarifyInput = '';
      }
    }
    if (changedProps.has('analyses')) {
      this.localAnalyses = [...(this.analyses || [])];
    }
    if (changedProps.has('clarifications')) {
      this.localClarifications = [...(this.clarifications || [])];
    }
  }

  private buildSignature(): string {
    const t = this.task;
    if (!t) return '';
    return [
      t.id || 'new',
      t.projectId || '',
      t.title || '',
      (t.tags || []).join(','),
      (t.requirementIds || []).join(','),
      (t.knowledgeArticleIds || []).join(','),
    ].join('|');
  }

  private recomputeContext(resetSelections: boolean) {
    if (!this.task) {
      this.contextItems = [];
      return;
    }
    const sig = this.buildSignature();
    const { allCandidates } = retrieveTaskContext({
      task: this.task,
      projects: store.projects,
      companies: store.companies,
      knowledgeArticles: store.knowledgeArticles,
      documents: store.documents,
      requirements: store.requirements,
      maxAutoSelected: 8,
    });

    if (resetSelections || sig !== this.lastMatchSignature) {
      this.lastMatchSignature = sig;
      const nextSelected = new Set<string>();
      for (const item of allCandidates) {
        if (item.selected) nextSelected.add(item.key);
      }
      this.selectedKeys = nextSelected;
      if (resetSelections) {
        this.manualKeys = new Set<string>();
      }
    }

    this.contextItems = allCandidates.map((item) => {
      const isManual = this.manualKeys.has(item.key);
      return {
        ...item,
        reason: isManual && !item.selected && item.score < 16 ? 'manual' : item.reason,
        selected: this.selectedKeys.has(item.key),
      };
    });
  }

  private get visibleContextItems(): TaskAiContextItem[] {
    const matched = this.contextItems.filter(
      (c) => c.selected || c.score >= 16 || this.manualKeys.has(c.key)
    );
    return matched.slice(0, 14);
  }

  private get selectedContextItems(): TaskAiContextItem[] {
    return this.contextItems.filter((c) => c.selected);
  }

  private toggleContextKey(key: string) {
    const next = new Set(this.selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.selectedKeys = next;
    this.recomputeContext(false);
  }

  private attachManualContext(key: string) {
    if (!key) return;
    const nextSelected = new Set(this.selectedKeys);
    nextSelected.add(key);
    const nextManual = new Set(this.manualKeys);
    nextManual.add(key);
    this.selectedKeys = nextSelected;
    this.manualKeys = nextManual;
    this.recomputeContext(false);
  }

  private async handleGenerateDescription() {
    const t = getTranslation(this.currentLang);
    if (!this.task?.title?.trim()) {
      this.errorMessage = t.viewTexts.ai.errors.missingTaskTitle;
      return;
    }

    this.loadingMode = 'description';
    this.errorMessage = '';

    const project = store.projects.find((p) => p.id === this.task?.projectId);
    const endpoint = store.customization.aiEndpoint;
    const model = store.customization.aiModel;

    try {
      const result = await generateTaskDescription({
        task: this.task,
        contextItems: this.selectedContextItems,
        projectName: project ? `[${project.key}] ${project.name}` : undefined,
        lang: this.currentLang,
        baseUrl: endpoint,
        model,
      });
      this.generatedDescription = result.description;
      this.generatedModel = result.model;
    } catch (err) {
      this.errorMessage = formatAiError(err, endpoint, t);
    } finally {
      this.loadingMode = 'none';
    }
  }

  private async handleAnalyzeTask() {
    const t = getTranslation(this.currentLang);
    if (!this.task?.title?.trim()) {
      this.errorMessage = t.viewTexts.ai.errors.missingTaskTitle;
      return;
    }

    this.loadingMode = 'analysis';
    this.errorMessage = '';

    const project = store.projects.find((p) => p.id === this.task?.projectId);
    const endpoint = store.customization.aiEndpoint;
    const model = store.customization.aiModel;

    try {
      const result = await analyzeTaskWithContext({
        task: this.task,
        contextItems: this.selectedContextItems,
        projectName: project ? `[${project.key}] ${project.name}` : undefined,
        timeSummary: this.timeSummary,
        expenseSummary: this.expenseSummary,
        discussionsSummary: this.discussionsSummary,
        lang: this.currentLang,
        baseUrl: endpoint,
        model,
      });
      const record: AnalysisSummary = {
        id: `analysis-${this.task?.id || 'new'}-${Date.now()}`,
        kind: 'task',
        authorId: store.currentUserId || store.users[0]?.id || 'user-1',
        model: result.model || '',
        createdAt: result.updatedAt,
        overview: result.overview,
        effortAssessment: result.effortAssessment,
        risks: result.risks,
        recommendations: result.recommendations,
        suggestedSubtasks: result.suggestedSubtasks,
        contextSources: result.contextSources,
      };
      const next = [record, ...this.localAnalyses];
      this.localAnalyses = next;
      this.emitAnalysesUpdate(next);
    } catch (err) {
      this.errorMessage = formatAiError(err, endpoint, t);
    } finally {
      this.loadingMode = 'none';
    }
  }

  private emitAnalysesUpdate(analyses: AnalysisSummary[]): void {
    this.dispatchEvent(
      new CustomEvent<{ analyses: AnalysisSummary[] }>('analyses-update', {
        detail: { analyses },
        bubbles: true,
        composed: true,
      })
    );
  }

  private emitClarifications(messages: TaskAiClarificationMessage[]) {
    this.dispatchEvent(
      new CustomEvent<{ messages: TaskAiClarificationMessage[] }>('clarification-update', {
        detail: { messages },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleClarifySend(presetQuestion?: string) {
    const t = getTranslation(this.currentLang);
    const question = (presetQuestion ?? this.clarifyInput).trim();
    if (!this.task?.title?.trim()) {
      this.errorMessage = t.viewTexts.ai.errors.missingTaskTitle;
      return;
    }
    if (!question || this.clarifyLoading || this.loadingMode !== 'none') return;

    const currentUser = store.users.find((u) => u.id === store.currentUserId);
    const userMsg: TaskAiClarificationMessage = {
      id: `clar-${Date.now()}-u`,
      role: 'user',
      authorId: currentUser?.id,
      content: question,
      createdAt: new Date().toISOString(),
    };

    const previousHistory = [...this.localClarifications];
    const withUser = [...previousHistory, userMsg];
    this.localClarifications = withUser;
    this.clarifyInput = '';
    this.clarifyLoading = true;
    this.errorMessage = '';
    this.emitClarifications(withUser);

    const project = store.projects.find((p) => p.id === this.task?.projectId);
    const endpoint = store.customization.aiEndpoint;
    const model = store.customization.aiModel;

    try {
      const res = await clarifyTaskWithContext({
        task: this.task,
        projectName: project ? `[${project.key}] ${project.name}` : undefined,
        contextItems: this.selectedContextItems,
        history: previousHistory,
        question,
        lang: this.currentLang,
        baseUrl: endpoint,
        model,
      });

      const assistantMsg: TaskAiClarificationMessage = {
        id: `clar-${Date.now()}-a`,
        role: 'assistant',
        content: res.reply,
        createdAt: new Date().toISOString(),
        model: res.model,
        contextSources: this.selectedContextItems.map((c) => ({
          kind: c.kind,
          id: c.id,
          title: c.title,
          reason: c.reason,
        })),
      };
      const withReply = [...withUser, assistantMsg];
      this.localClarifications = withReply;
      this.emitClarifications(withReply);
    } catch (err) {
      this.errorMessage = formatAiError(err, endpoint, t);
    } finally {
      this.clarifyLoading = false;
    }
  }

  private handleClearClarifications() {
    this.localClarifications = [];
    this.emitClarifications([]);
  }

  private emitApplyDescription(mode: 'replace' | 'append') {
    if (!this.generatedDescription.trim()) return;
    this.dispatchEvent(
      new CustomEvent<{ description: string; mode: 'replace' | 'append' }>('apply-description', {
        detail: { description: this.generatedDescription, mode },
        bubbles: true,
        composed: true,
      })
    );
    this.generatedDescription = '';
  }

  private emitApplyDirectDescription(text: string, mode: 'replace' | 'append') {
    if (!text.trim()) return;
    this.dispatchEvent(
      new CustomEvent<{ description: string; mode: 'replace' | 'append' }>('apply-description', {
        detail: { description: text.trim(), mode },
        bubbles: true,
        composed: true,
      })
    );
  }

  private emitAddSubtask(title: string) {
    this.dispatchEvent(
      new CustomEvent<{ title: string }>('add-subtask', {
        detail: { title },
        bubbles: true,
        composed: true,
      })
    );
  }

  private extractSubtaskSuggestion(reply: string): string {
    const firstLine = reply
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').replace(/^[-*•\d.)\]]+\s*/, '').trim())
      .find((l) => l.length > 4);
    if (!firstLine) return '';
    return firstLine.length > 90 ? `${firstLine.slice(0, 87)}...` : firstLine;
  }

  private isSubtaskAlreadyPresent(title: string): boolean {
    const norm = title.trim().toLowerCase();
    return (this.task?.subtasks || []).some((s) => s.title.trim().toLowerCase() === norm);
  }

  private formatClarifyTime(iso: string, t: ReturnType<typeof getTranslation>): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return '';
    return new Date(ms).toLocaleTimeString(t.common.locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private renderContent(t: ReturnType<typeof getTranslation>) {
    const visibleItems = this.visibleContextItems;
    const selectedCount = this.selectedContextItems.length;
    const busy = this.loadingMode !== 'none' || this.clarifyLoading;

    const attachOptions: EntitySelectorOption[] = this.contextItems
      .filter((c) => !c.selected)
      .map((c) => {
        const kindBadge =
          c.kind === 'requirement'
            ? t.viewTexts.ai.contextRequirementBadge
            : c.kind === 'knowledge'
            ? t.viewTexts.ai.contextKnowledgeBadge
            : t.viewTexts.ai.contextDocumentBadge;
        return {
          value: c.key,
          label: c.title,
          subtitle: `${kindBadge} · ${c.subtitle}`,
          meta: c.tags.slice(0, 2).join(', '),
        };
      });

    return html`
      <div class="ai-body">
        ${this.compact
          ? html`
              <div class="ai-header-inline">
                <div class="ai-title-wrap">
                  <span class="ai-icon-badge">${iconCpu(15)}</span>
                  <span>${t.viewTexts.ai.taskSectionTitle}</span>
                </div>
                <div class="ai-actions-row">
                  <app-button
                    size="sm"
                    variant="secondary"
                    ?disabled="${busy}"
                    @click="${this.handleGenerateDescription}"
                  >
                    <span slot="icon-start">${iconCpu(14)}</span>
                    <span>
                      ${this.loadingMode === 'description'
                        ? t.viewTexts.ai.generatingDesc
                        : t.viewTexts.ai.generateDescBtn}
                    </span>
                  </app-button>
                  <app-button
                    size="sm"
                    variant="primary"
                    ?disabled="${busy}"
                    @click="${this.handleAnalyzeTask}"
                  >
                    <span slot="icon-start">${iconBookOpen(14)}</span>
                    <span>
                      ${this.loadingMode === 'analysis'
                        ? t.viewTexts.ai.analyzingTask
                        : t.viewTexts.ai.analyzeTaskBtn}
                    </span>
                  </app-button>
                </div>
              </div>
            `
          : ''}

        <!-- Context Retrieval Box -->
        <div class="ai-context-box">
          <div class="ai-context-head">
            <span class="ai-context-label">${t.viewTexts.ai.contextSourcesTitle}</span>
            <span class="ai-context-count">${t.viewTexts.ai.contextSelectedCount(selectedCount)}</span>
          </div>

          ${visibleItems.length === 0
            ? html`<div class="context-empty-hint">${t.viewTexts.ai.contextEmpty}</div>`
            : html`
                <app-context-chips-list
                  .items="${visibleItems}"
                  mode="select"
                  @chip-toggle="${(e: CustomEvent<{ key: string }>) => this.toggleContextKey(e.detail.key)}"
                  @chip-open="${(e: CustomEvent<{ kind: ContextChipKind; id: string }>) => openContextSource(e.detail)}"
                ></app-context-chips-list>
              `}

          ${attachOptions.length > 0
            ? html`
                <div class="context-add-row">
                  <app-entity-selector
                    size="sm"
                    placeholder="${t.viewTexts.ai.contextAddPlaceholder}"
                    value=""
                    .options="${attachOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) => {
                      const val = eventValue(e);
                      if (val) this.attachManualContext(val);
                    }}"
                  ></app-entity-selector>
                </div>
              `
            : ''}
        </div>

        ${this.errorMessage
          ? html`
              <div class="ai-error-banner">
                <span style="flex-shrink: 0; margin-top: 1px;">${iconAlertTriangle(15)}</span>
                <span>${this.errorMessage}</span>
              </div>
            `
          : ''}

        ${this.generatedDescription
          ? html`
              <div class="ai-draft-card">
                <div class="ai-card-head">
                  <span class="ai-card-title">${t.viewTexts.ai.descDraftTitle}</span>
                  <div class="ai-card-meta">
                    ${this.generatedModel
                      ? html`<span>${t.viewTexts.ai.modelUsed}: ${this.generatedModel}</span>`
                      : ''}
                    <app-button
                      class="context-open-btn"
                      size="xs"
                      variant="icon"
                      title="${t.common.close}"
                      @click="${() => (this.generatedDescription = '')}"
                    >
                      <span slot="start">${iconX(14)}</span>
                    </app-button>
                  </div>
                </div>
                <pre class="ai-draft-text ai-scroll-region">${this.generatedDescription}</pre>
                <div class="ai-draft-actions">
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => this.emitApplyDescription('replace')}"
                  >
                    <span slot="icon-start">${iconCheck(14)}</span>
                    <span>${t.viewTexts.ai.applyDescBtn}</span>
                  </app-button>
                  ${this.task?.description?.trim()
                    ? html`
                        <app-button
                          size="sm"
                          variant="secondary"
                          @click="${() => this.emitApplyDescription('append')}"
                        >
                          <span slot="icon-start">${iconPlus(14)}</span>
                          <span>${t.viewTexts.ai.appendDescBtn}</span>
                        </app-button>
                      `
                    : ''}
                  <app-button
                    size="sm"
                    variant="ghost"
                    @click="${() => (this.generatedDescription = '')}"
                  >
                    ${t.viewTexts.ai.docDismissBtn}
                  </app-button>
                </div>
              </div>
            `
          : ''}

        ${this.localAnalyses.length > 0
          ? html`
              <div class="ai-summary-list">
                ${this.localAnalyses.map((s, idx) => {
                  const addedTitles = (this.task?.subtasks || []).map((x) => x.title);
                  return html`
                    <app-analysis-summary
                      .summary="${s}"
                      .expanded="${idx === 0}"
                      .addedTitles="${addedTitles}"
                      @delete-summary="${(e: CustomEvent<{ id: string }>) => {
                        const next = this.localAnalyses.filter((a) => a.id !== e.detail.id);
                        this.localAnalyses = next;
                        this.emitAnalysesUpdate(next);
                      }}"
                    ></app-analysis-summary>
                  `;
                })}
              </div>
            `
          : ''}

        <!-- Collaborative Human + AI Task Clarification Thread -->
        <div class="ai-clarify-box">
          <div class="ai-clarify-head">
            <div class="ai-clarify-title-wrap">
              <span class="ai-clarify-icon">${iconMessageSquare(14)}</span>
              <div>
                <div class="ai-clarify-title">${t.viewTexts.ai.clarifyTitle}</div>
                <div class="ai-clarify-subtitle">${t.viewTexts.ai.clarifySubtitle}</div>
              </div>
            </div>
            ${this.localClarifications.length > 0
              ? html`
                  <app-button
                    class="clarify-clear-btn"
                    size="sm"
                    variant="icon"
                    .disabled="${busy}"
                    @click="${this.handleClearClarifications}"
                  >
                    <span slot="start">${iconTrash(12)}</span>
                    <span>${t.viewTexts.ai.clarifyClearBtn}</span>
                  </app-button>
                `
              : ''}
          </div>

          <div class="clarify-quick-row">
            <app-button
              class="clarify-quick-chip"
              size="sm"
              variant="icon"
              .disabled="${busy}"
              @click="${() => this.handleClarifySend(t.viewTexts.ai.clarifyQuickExplain)}"
            >
              <span>${t.viewTexts.ai.clarifyQuickExplain}</span>
            </app-button>
            <app-button
              class="clarify-quick-chip"
              size="sm"
              variant="icon"
              .disabled="${busy}"
              @click="${() => this.handleClarifySend(t.viewTexts.ai.clarifyQuickAcceptance)}"
            >
              <span>${t.viewTexts.ai.clarifyQuickAcceptance}</span>
            </app-button>
            <app-button
              class="clarify-quick-chip"
              size="sm"
              variant="icon"
              .disabled="${busy}"
              @click="${() => this.handleClarifySend(t.viewTexts.ai.clarifyQuickPlan)}"
            >
              <span>${t.viewTexts.ai.clarifyQuickPlan}</span>
            </app-button>
          </div>

          ${this.localClarifications.length === 0
            ? html`<div class="clarify-empty">${t.viewTexts.ai.clarifyEmpty}</div>`
            : html`
                <div class="ai-clarify-thread ai-scroll-region">
                  ${this.localClarifications.map((msg) => {
                    const isUser = msg.role === 'user';
                    const author =
                      isUser && msg.authorId
                        ? store.users.find((u) => u.id === msg.authorId)?.name
                        : undefined;
                    const subtaskCandidate = !isUser ? this.extractSubtaskSuggestion(msg.content) : '';
                    const subtaskAdded =
                      subtaskCandidate ? this.isSubtaskAlreadyPresent(subtaskCandidate) : false;
                    return html`
                      <div class="clarify-msg ${isUser ? 'is-human' : 'is-ai'}">
                        <div class="clarify-msg-head">
                          <span class="clarify-msg-author">
                            ${isUser
                              ? author || t.viewTexts.ai.humanAuthorLabel
                              : t.viewTexts.ai.aiAuthorLabel}
                          </span>
                          <div class="clarify-msg-meta">
                            ${msg.model ? html`<span>${msg.model}</span>` : ''}
                            <span>${this.formatClarifyTime(msg.createdAt, t)}</span>
                          </div>
                        </div>
                        <div class="clarify-msg-body">${msg.content}</div>
                        ${!isUser
                          ? html`
                              <div class="clarify-msg-actions">
                                <app-button
                                  class="clarify-action-btn"
                                  size="sm"
                                  variant="icon"
                                  @click="${() => this.emitApplyDirectDescription(msg.content, 'replace')}"
                                >
                                  <span slot="start">${iconCheck(11)}</span>
                                  <span>${t.viewTexts.ai.clarifyUseAsDescBtn}</span>
                                </app-button>
                                <app-button
                                  class="clarify-action-btn"
                                  size="sm"
                                  variant="icon"
                                  @click="${() => this.emitApplyDirectDescription(msg.content, 'append')}"
                                >
                                  <span slot="start">${iconPlus(11)}</span>
                                  <span>${t.viewTexts.ai.clarifyAppendDescBtn}</span>
                                </app-button>
                                ${subtaskCandidate
                                  ? html`
                                      <app-button
                                        class="clarify-action-btn"
                                        size="sm"
                                        variant="icon"
                                        .disabled="${subtaskAdded}"
                                        @click="${() => this.emitAddSubtask(subtaskCandidate)}"
                                      >
                                        <span slot="start">${iconPlus(11)}</span>
                                        <span>
                                          ${subtaskAdded
                                            ? t.viewTexts.ai.subtaskAddedBadge
                                            : t.viewTexts.ai.clarifyToSubtaskBtn}
                                        </span>
                                      </app-button>
                                    `
                                  : ''}
                              </div>
                            `
                          : ''}
                      </div>
                    `;
                  })}
                </div>
              `}

          <div class="clarify-composer">
            <textarea
              class="ai-clarify-input ai-scroll-region"
              rows="2"
              placeholder="${t.viewTexts.ai.clarifyPlaceholder}"
              .value="${this.clarifyInput}"
              ?disabled="${busy}"
              @input="${(e: InputEvent) => {
                this.clarifyInput = (e.target as HTMLTextAreaElement).value;
              }}"
              @keydown="${(e: KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  this.handleClarifySend();
                }
              }}"
            ></textarea>
            <app-button
              size="sm"
              variant="primary"
              ?disabled="${busy || !this.clarifyInput.trim()}"
              @click="${() => this.handleClarifySend()}"
            >
              <span slot="icon-start">${iconSend(13)}</span>
              <span>
                ${this.clarifyLoading ? t.viewTexts.ai.clarifying : t.viewTexts.ai.clarifySendBtn}
              </span>
            </app-button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const busy = this.loadingMode !== 'none' || this.clarifyLoading;

    if (this.compact) {
      return html`<div class="ai-inline-shell">${this.renderContent(t)}</div>`;
    }

    return html`
      <app-section-card
        variant="tabbed"
        title="${t.viewTexts.ai.taskSectionTitle}"
        subtitle="${t.viewTexts.ai.taskSectionSubtitle}"
      >
        <span slot="icon">${iconCpu(17)}</span>
        <div slot="actions" class="ai-actions-row">
          <app-button
            size="sm"
            variant="secondary"
            ?disabled="${busy}"
            @click="${this.handleGenerateDescription}"
          >
            <span slot="icon-start">${iconCpu(14)}</span>
            <span>
              ${this.loadingMode === 'description'
                ? t.viewTexts.ai.generatingDesc
                : t.viewTexts.ai.generateDescBtn}
            </span>
          </app-button>
          <app-button
            size="sm"
            variant="primary"
            ?disabled="${busy}"
            @click="${this.handleAnalyzeTask}"
          >
            <span slot="icon-start">${iconBookOpen(14)}</span>
            <span>
              ${this.loadingMode === 'analysis'
                ? t.viewTexts.ai.analyzingTask
                : t.viewTexts.ai.analyzeTaskBtn}
            </span>
          </app-button>
        </div>

        ${this.renderContent(t)}
      </app-section-card>
    `;
  }
}
