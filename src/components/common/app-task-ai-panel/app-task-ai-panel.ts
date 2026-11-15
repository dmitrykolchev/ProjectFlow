import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getTranslation } from '../../../i18n';
import {
  analyzeTaskWithContext,
  formatAiError,
  generateTaskDescription,
  retrieveTaskContext,
  TaskAiContextItem,
  TaskContextInput,
  TaskContextMatchReason,
} from '../../../services/openai-client';
import { store } from '../../../state/store';
import { SupportedLang, TaskAiAnalysis } from '../../../types';
import { eventValue } from '../event-value';
import {
  iconAlertTriangle,
  iconArrowUpRight,
  iconBookOpen,
  iconCheck,
  iconCpu,
  iconFileText,
  iconPlus,
  iconX,
} from '../icons';
import type { EntitySelectorOption } from '../app-entity-selector/app-entity-selector';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-entity-selector/app-entity-selector';
import '../app-section-card/app-section-card';
import styles from './app-task-ai-panel.css';

@customElement('app-task-ai-panel')
export class AppTaskAiPanel extends LitElement {
  @property({ type: Object }) task?: TaskContextInput;
  @property({ type: Object }) analysis?: TaskAiAnalysis;
  @property({ type: Boolean }) compact = false;
  @property({ type: String }) timeSummary = '';
  @property({ type: String }) expenseSummary = '';
  @property({ type: String }) discussionsSummary = '';

  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private contextItems: TaskAiContextItem[] = [];
  @state() private selectedKeys = new Set<string>();
  @state() private manualKeys = new Set<string>();
  @state() private lastMatchSignature = '';
  @state() private loadingMode: 'none' | 'description' | 'analysis' = 'none';
  @state() private errorMessage = '';
  @state() private generatedDescription = '';
  @state() private generatedModel = '';
  @state() private localAnalysis?: TaskAiAnalysis;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
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
      const sig = this.buildSignature();
      const resetManual = sig !== this.lastMatchSignature;
      this.recomputeContext(resetManual);
      if (resetManual) {
        this.generatedDescription = '';
        this.errorMessage = '';
        this.localAnalysis = undefined;
      }
    }
    if (changedProps.has('analysis')) {
      this.localAnalysis = this.analysis;
    }
  }

  private buildSignature(): string {
    const t = this.task;
    if (!t) return '';
    return `${t.id || 'new'}|${t.projectId || ''}|${t.title || ''}|${(t.tags || []).join(',')}`;
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
      maxAutoSelected: 6,
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
    return matched.slice(0, 12);
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

  private openContextSource(item: { kind: 'knowledge' | 'document'; id: string }) {
    if (item.kind === 'knowledge') {
      const art = store.knowledgeArticles.find((a) => a.id === item.id);
      store.openKnowledgeBase({
        scope: art?.scope || 'all',
        projectId: art?.projectId || 'all',
        companyId: art?.companyId || 'all',
        articleId: item.id,
      });
    } else {
      const doc = store.documents.find((d) => d.id === item.id);
      store.openDocuments({
        scope: doc?.scope || 'all',
        projectId: doc?.projectId || 'all',
        companyId: doc?.companyId || 'all',
      });
    }
  }

  private reasonLabel(reason: TaskContextMatchReason, t: ReturnType<typeof getTranslation>): string {
    switch (reason) {
      case 'direct':
        return t.viewTexts.ai.contextDirectMatch;
      case 'project':
        return t.viewTexts.ai.contextProjectMatch;
      case 'company':
        return t.viewTexts.ai.contextCompanyMatch;
      case 'manual':
        return t.viewTexts.ai.contextManualMatch;
      default:
        return t.viewTexts.ai.contextKeywordMatch;
    }
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
      this.localAnalysis = result;
      this.dispatchEvent(
        new CustomEvent<{ analysis: TaskAiAnalysis }>('analysis-complete', {
          detail: { analysis: result },
          bubbles: true,
          composed: true,
        })
      );
    } catch (err) {
      this.errorMessage = formatAiError(err, endpoint, t);
    } finally {
      this.loadingMode = 'none';
    }
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

  private emitAddSubtask(title: string) {
    this.dispatchEvent(
      new CustomEvent<{ title: string }>('add-subtask', {
        detail: { title },
        bubbles: true,
        composed: true,
      })
    );
  }

  private isSubtaskAlreadyPresent(title: string): boolean {
    const norm = title.trim().toLowerCase();
    return (this.task?.subtasks || []).some((s) => s.title.trim().toLowerCase() === norm);
  }

  private renderContent(t: ReturnType<typeof getTranslation>) {
    const visibleItems = this.visibleContextItems;
    const selectedCount = this.selectedContextItems.length;
    const activeAnalysis = this.localAnalysis ?? this.analysis;
    const busy = this.loadingMode !== 'none';

    const attachOptions: EntitySelectorOption[] = this.contextItems
      .filter((c) => !c.selected)
      .map((c) => ({
        value: c.key,
        label: c.title,
        subtitle: `${c.kind === 'knowledge' ? t.viewTexts.ai.contextKnowledgeBadge : t.viewTexts.ai.contextDocumentBadge} · ${c.subtitle}`,
        meta: c.tags.slice(0, 2).join(', '),
      }));

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
                <div class="ai-context-chips">
                  ${visibleItems.map(
                    (item) => html`
                      <div class="context-chip ${item.selected ? 'is-selected' : ''}">
                        <button
                          type="button"
                          class="context-toggle-btn"
                          @click="${() => this.toggleContextKey(item.key)}"
                        >
                          <span class="context-kind-tag ${item.kind === 'knowledge' ? 'is-kb' : 'is-doc'}">
                            ${item.kind === 'knowledge' ? 'KB' : 'DOC'}
                          </span>
                          <span class="context-title" title="${item.title}">${item.title}</span>
                          <span class="context-reason">· ${this.reasonLabel(item.reason, t)}</span>
                        </button>
                        <button
                          type="button"
                          class="context-open-btn"
                          title="${item.title}"
                          @click="${() => this.openContextSource(item)}"
                        >
                          ${iconArrowUpRight(12)}
                        </button>
                      </div>
                    `
                  )}
                </div>
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
                    <button
                      type="button"
                      class="context-open-btn"
                      title="${t.common.close}"
                      @click="${() => (this.generatedDescription = '')}"
                    >
                      ${iconX(14)}
                    </button>
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

        ${activeAnalysis
          ? html`
              <div class="ai-analysis-card">
                <div class="ai-card-head">
                  <span class="ai-card-title">${t.viewTexts.ai.analysisOverview}</span>
                  <div class="ai-card-meta">
                    ${activeAnalysis.model
                      ? html`<span>${t.viewTexts.ai.modelUsed}: ${activeAnalysis.model}</span>`
                      : ''}
                    <span>·</span>
                    <span>${activeAnalysis.updatedAt.slice(0, 16).replace('T', ' ')}</span>
                    <button
                      type="button"
                      class="context-open-btn"
                      title="${t.viewTexts.ai.clearAnalysisBtn}"
                      @click="${() => {
                        this.localAnalysis = undefined;
                        this.dispatchEvent(
                          new CustomEvent('analysis-cleared', { bubbles: true, composed: true })
                        );
                      }}"
                    >
                      ${iconX(14)}
                    </button>
                  </div>
                </div>

                <div class="ai-analysis-grid">
                  <div class="ai-analysis-block is-full">
                    <span class="ai-block-title">${t.viewTexts.ai.analysisOverview}</span>
                    <p class="ai-block-text">${activeAnalysis.overview}</p>
                  </div>

                  ${activeAnalysis.effortAssessment
                    ? html`
                        <div class="ai-analysis-block is-full">
                          <span class="ai-block-title">${t.viewTexts.ai.analysisEffort}</span>
                          <p class="ai-block-text">${activeAnalysis.effortAssessment}</p>
                        </div>
                      `
                    : ''}

                  ${activeAnalysis.risks.length > 0
                    ? html`
                        <div class="ai-analysis-block is-risk">
                          <span class="ai-block-title">${t.viewTexts.ai.analysisRisks}</span>
                          <ul class="ai-bullet-list">
                            ${activeAnalysis.risks.map((r) => html`<li>${r}</li>`)}
                          </ul>
                        </div>
                      `
                    : ''}

                  ${activeAnalysis.recommendations.length > 0
                    ? html`
                        <div class="ai-analysis-block is-rec">
                          <span class="ai-block-title">${t.viewTexts.ai.analysisRecommendations}</span>
                          <ul class="ai-bullet-list">
                            ${activeAnalysis.recommendations.map((rec) => html`<li>${rec}</li>`)}
                          </ul>
                        </div>
                      `
                    : ''}

                  ${activeAnalysis.suggestedSubtasks.length > 0
                    ? html`
                        <div class="ai-analysis-block is-full">
                          <span class="ai-block-title">${t.viewTexts.ai.analysisSuggestedSubtasks}</span>
                          <div class="ai-subtasks-suggest">
                            ${activeAnalysis.suggestedSubtasks.map((subTitle) => {
                              const already = this.isSubtaskAlreadyPresent(subTitle);
                              return html`
                                <div class="ai-subtask-row">
                                  <span class="ai-subtask-name">${subTitle}</span>
                                  ${already
                                    ? html`
                                        <span class="ai-subtask-added">
                                          ${iconCheck(13)}
                                          <span>${t.viewTexts.ai.subtaskAddedBadge}</span>
                                        </span>
                                      `
                                    : html`
                                        <app-button
                                          size="sm"
                                          variant="secondary"
                                          @click="${() => this.emitAddSubtask(subTitle)}"
                                        >
                                          ${t.viewTexts.ai.addSubtaskBtn}
                                        </app-button>
                                      `}
                                </div>
                              `;
                            })}
                          </div>
                        </div>
                      `
                    : ''}
                </div>

                ${activeAnalysis.contextSources.length > 0
                  ? html`
                      <div class="ai-context-chips">
                        ${activeAnalysis.contextSources.map(
                          (src) => html`
                            <button
                              type="button"
                              class="context-chip is-selected"
                              style="cursor: pointer;"
                              @click="${() => this.openContextSource(src)}"
                            >
                              <span class="context-kind-tag ${src.kind === 'knowledge' ? 'is-kb' : 'is-doc'}">
                                ${src.kind === 'knowledge' ? iconBookOpen(11) : iconFileText(11)}
                              </span>
                              <span class="context-title">${src.title}</span>
                              ${iconArrowUpRight(12)}
                            </button>
                          `
                        )}
                      </div>
                    `
                  : ''}
              </div>
            `
          : ''}
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const busy = this.loadingMode !== 'none';

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
