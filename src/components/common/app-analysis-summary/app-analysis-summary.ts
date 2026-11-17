import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { AnalysisSummary } from '../../../types';
import {
  iconArrowUpRight,
  iconBookOpen,
  iconFileText,
  iconLayers,
  iconX,
} from '../icons';
import '../app-button/app-button';
import styles from './app-analysis-summary.css';

/**
 * One saved AI analysis summary (task or requirement): author, model and
 * date/time header, overview, effort assessment, risks, recommendations;
 * task summaries add suggested subtasks, requirement summaries add the
 * refined requirement text and a decomposition into tasks. Context sources
 * render as chips. Action buttons fire events; the parent owns store writes.
 */
@customElement('app-analysis-summary')
export class AppAnalysisSummary extends LitElement {
  @property({ attribute: false }) summary?: AnalysisSummary;
  @property({ type: Boolean }) expanded = true;
  // task summaries: subtask titles already present on the owning task
  @property({ attribute: false }) addedTitles: string[] = [];

  @state() private currentLang = store.customization.language;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  render() {
    const t = getTranslation(this.currentLang);
    const s = this.summary;
    if (!s) return html``;

    const author =
      store.users.find((u) => u.id === s.authorId)?.name || t.viewTexts.ai.humanAuthorLabel;
    const addedSet = new Set(this.addedTitles.map((x) => x.trim()));

    return html`
      <div class="ai-analysis-card">
        <div class="ai-card-head">
          <span class="ai-card-title">${t.viewTexts.ai.analysisOverview}</span>
          <div class="ai-card-meta">
            <span>${t.viewTexts.ai.analysisAuthor}: ${author}</span>
            <span>·</span>
            ${s.model
              ? html`
                  <span>${t.viewTexts.ai.modelUsed}: ${s.model}</span>
                  <span>·</span>
                `
              : ''}
            <span>${s.createdAt.slice(0, 16).replace('T', ' ')}</span>
            <app-button
              size="xs"
              variant="icon"
              title="${t.viewTexts.ai.deleteSummaryBtn}"
              @click="${() => this.emit('delete-summary', { id: s.id })}"
            >
              <span slot="start">${iconX(14)}</span>
            </app-button>
          </div>
        </div>

        ${this.expanded
          ? html`
              <div class="ai-analysis-grid">
                <div class="ai-analysis-block is-full">
                  <span class="ai-block-title">${t.viewTexts.ai.analysisOverview}</span>
                  <p class="ai-block-text">${s.overview}</p>
                </div>

                ${s.effortAssessment
                  ? html`
                      <div class="ai-analysis-block is-full">
                        <span class="ai-block-title">${t.viewTexts.ai.analysisEffort}</span>
                        <p class="ai-block-text">${s.effortAssessment}</p>
                      </div>
                    `
                  : ''}

                ${s.risks.length > 0
                  ? html`
                      <div class="ai-analysis-block is-risk">
                        <span class="ai-block-title">${t.viewTexts.ai.analysisRisks}</span>
                        <ul class="ai-bullet-list">
                          ${s.risks.map((r) => html`<li>${r}</li>`)}
                        </ul>
                      </div>
                    `
                  : ''}

                ${s.recommendations.length > 0
                  ? html`
                      <div class="ai-analysis-block is-rec">
                        <span class="ai-block-title">${t.viewTexts.ai.analysisRecommendations}</span>
                        <ul class="ai-bullet-list">
                          ${s.recommendations.map((rec) => html`<li>${rec}</li>`)}
                        </ul>
                      </div>
                    `
                  : ''}

                ${s.kind === 'task' && (s.suggestedSubtasks || []).length > 0
                  ? html`
                      <div class="ai-analysis-block is-full">
                        <span class="ai-block-title">${t.viewTexts.ai.analysisSuggestedSubtasks}</span>
                        <div class="ai-subtasks-suggest">
                          ${s.suggestedSubtasks!.map((subTitle) => {
                            const already = addedSet.has(subTitle.trim());
                            return html`
                              <div class="ai-subtask-row">
                                <span class="ai-subtask-name">${subTitle}</span>
                                ${already
                                  ? html`<span class="ai-subtask-added">${t.viewTexts.ai.subtaskAddedBadge}</span>`
                                  : html`
                                      <app-button
                                        size="sm"
                                        variant="secondary"
                                        @click="${() => this.emit('add-subtask', { title: subTitle })}"
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

                ${s.kind === 'requirement' && s.clarification
                  ? html`
                      <div class="ai-analysis-block is-full">
                        <span class="ai-block-title">${t.viewTexts.ai.clarificationTitle}</span>
                        <p class="ai-block-text">${s.clarification}</p>
                        <div class="ai-clarify-actions">
                          <app-button
                            size="sm"
                            variant="secondary"
                            @click="${() => this.emit('apply-clarification', { mode: 'replace', text: s.clarification })}"
                          >
                            ${t.viewTexts.ai.replaceClarificationBtn}
                          </app-button>
                          <app-button
                            size="sm"
                            variant="ghost"
                            @click="${() => this.emit('apply-clarification', { mode: 'append', text: s.clarification })}"
                          >
                            ${t.viewTexts.ai.appendClarificationBtn}
                          </app-button>
                        </div>
                      </div>
                    `
                  : ''}

                ${s.kind === 'requirement' && (s.decomposition || []).length > 0
                  ? html`
                      <div class="ai-analysis-block is-full">
                        <span class="ai-block-title">${t.viewTexts.ai.decompositionTitle}</span>
                        <div class="ai-subtasks-suggest">
                          ${s.decomposition!.map((item) => html`
                            <div class="ai-subtask-row">
                              <span class="ai-subtask-name">${item.title}</span>
                              ${item.estimatedHours
                                ? html`<span class="ai-estimate-chip">${item.estimatedHours} ч</span>`
                                : ''}
                              <app-button
                                size="sm"
                                variant="secondary"
                                @click="${() =>
                                  this.emit('create-task', { title: item.title, estimatedHours: item.estimatedHours })}"
                              >
                                ${t.viewTexts.ai.createTaskBtn}
                              </app-button>
                            </div>
                          `)}
                        </div>
                      </div>
                    `
                  : ''}
              </div>

              ${s.contextSources.length > 0
                ? html`
                    <div class="ai-context-chips">
                      ${s.contextSources.map((src) => {
                        const srcCls =
                          src.kind === 'requirement'
                            ? 'is-req'
                            : src.kind === 'knowledge'
                            ? 'is-kb'
                            : 'is-doc';
                        const srcIcon =
                          src.kind === 'requirement'
                            ? iconLayers(11)
                            : src.kind === 'knowledge'
                            ? iconBookOpen(11)
                            : iconFileText(11);
                        return html`
                          <span class="context-chip">
                            <span class="context-kind-tag ${srcCls}">${srcIcon}</span>
                            <span class="context-title">${src.title}</span>
                            ${iconArrowUpRight(12)}
                          </span>
                        `;
                      })}
                    </div>
                  `
                : ''}
            `
          : html`
              <p class="ai-block-text ai-summary-collapsed">${s.overview.slice(0, 160)}${s.overview.length > 160 ? '…' : ''}</p>
            `}
      </div>
    `;
  }
}
