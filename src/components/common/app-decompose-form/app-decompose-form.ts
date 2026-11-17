import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { TaskPriority } from '../../../types';
import { getTranslation } from '../../../i18n';
import {
  DecomposedTaskDraft,
  decomposeRequirementsToTasks,
  formatAiError,
} from '../../../services/openai-client';
import { iconBookOpen, iconCheck } from '../icons';
import styles from './app-decompose-form.css';
import { eventValue } from '../event-value';
import { mapUserOptions } from '../entity-selector-options';
import '../app-modal/app-modal';
import '../app-entity-selector/app-entity-selector';
import '../app-badge/app-badge';
import '../app-empty-state/app-empty-state';
import '../app-checkbox/app-checkbox';
import '../app-input/app-input';
import '../app-number-input/app-number-input';
import '../app-select/app-select';
import '../app-textarea/app-textarea';
import '../app-button/app-button';

type DraftWithSelection = DecomposedTaskDraft & { selected: boolean };

/**
 * Canonical AI decompose form. The component owns the assignee picker, the draft task
 * cards (selection checkbox, title, estimated hours, priority, description, subtask
 * chips, requirement code badges and knowledge article chips) and the create-selected
 * action; it runs the AI decomposition itself through the public `decompose()` call for
 * the current `requirementIds`, opens the modal on success, and dispatches a
 * `decompose-failed` event with the formatted AI error when the call fails so the
 * opening view keeps its inline error banner. Saving creates one task per selected
 * draft (todo status, today start, fourteen day due date, the picked assignee), links
 * every created task to the requirements of its draft and moves draft and approved
 * requirements to in_progress; a `saved` event carries the created task ids.
 * `openWithDrafts` opens the editor with a prepared draft list for openings that do
 * not go through the AI call. Any close dispatches a close event so the opening view
 * resets its flag.
 */
@customElement('app-decompose-form')
export class AppDecomposeForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) requirementIds: string[] = [];

  @state() private currentLang = store.customization.language;
  @state() private draftTasks: DraftWithSelection[] = [];
  @state() private assigneeId = store.currentUserId || store.users[0]?.id || '';
  @state() private model = '';
  @state() private projectId = store.projects[0]?.id || '';

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

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && this.open) {
      // the assignee list can shrink while the form is closed, keep the picker valid
      if (!store.users.some((u) => u.id === this.assigneeId)) {
        this.assigneeId = store.currentUserId || store.users[0]?.id || '';
      }
    }
  }

  // the view owns the open flag, so every close of the form must report back to it:
  // closing from inside the component (cancel, save, backdrop) has no view-side reset
  // without this event, and the next open request would be a no-op on an unchanged flag
  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && !this.open) {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  }

  private closeModal() {
    this.open = false;
  }

  // views run the AI decomposition through this canonical entry point and open the
  // editor with the returned drafts; failures surface as decompose-failed so the view
  // keeps its inline error banner above the header
  public async decompose() {
    const t = getTranslation(this.currentLang);
    const targetReqs = store.requirements.filter((r) => this.requirementIds.includes(r.id));
    if (targetReqs.length === 0) {
      this.dispatchEvent(
        new CustomEvent('decompose-failed', {
          detail: { message: t.viewTexts.ai.errors.missingSelectedReqs },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    const project = store.projects.find((p) => p.id === targetReqs[0].projectId);
    if (!project) return;

    const endpoint = store.customization.aiEndpoint;
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
      this.model = res.model;
      this.projectId = project.id;
      this.open = true;
    } catch (err) {
      this.dispatchEvent(
        new CustomEvent('decompose-failed', {
          detail: { message: formatAiError(err, endpoint, t) },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  public openWithDrafts(drafts: DecomposedTaskDraft[], model = '', projectId = '') {
    this.draftTasks = drafts.map((draft) => ({ ...draft, selected: true }));
    this.model = model;
    this.projectId = projectId || store.projects[0]?.id || '';
    this.open = true;
  }

  private updateDraft(idx: number, patch: Partial<DraftWithSelection>) {
    this.draftTasks = this.draftTasks.map((item, i) => (i === idx ? { ...item, ...patch } : item));
  }

  private handleCreateSelected() {
    const selectedDrafts = this.draftTasks.filter((d) => d.selected && d.title.trim());
    if (selectedDrafts.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);
    const assigneeId = this.assigneeId || store.users[0]?.id || 'user-1';
    const createdIds: string[] = [];

    for (const draft of selectedDrafts) {
      const linkedReqIds =
        draft.requirementIds.length > 0 ? [...draft.requirementIds] : [...this.requirementIds];
      const targetProjId =
        store.requirements.find((r) => linkedReqIds.includes(r.id))?.projectId || this.projectId;

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
        requirementIds: linkedReqIds,
        knowledgeArticleIds: [...draft.knowledgeArticleIds],
      });
      createdIds.push(created.id);

      for (const reqId of linkedReqIds) {
        const req = store.requirements.find((r) => r.id === reqId);
        if (req) {
          store.updateRequirement({
            ...req,
            status: req.status === 'draft' || req.status === 'approved' ? 'in_progress' : req.status,
            linkedTaskIds: Array.from(new Set([...(req.linkedTaskIds || []), created.id])),
          });
        }
      }
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { taskIds: createdIds },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);

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
        ?open="${this.open}"
        size="xl"
        title="${t.viewTexts.requirements.decomposeModalTitle}"
        @close="${() => this.closeModal()}"
      >
        <div class="draft-header-bar">
          <div style="min-width: 260px; flex: 1;">
            <app-entity-selector
              size="sm"
              label="${t.viewTexts.requirements.decomposeAssigneeLabel}"
              .options="${userOptions}"
              .value="${this.assigneeId}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.assigneeId = eventValue(e))}"
            ></app-entity-selector>
          </div>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <app-badge variant="info" appearance="soft">
              ${t.viewTexts.requirements.decomposeTasksCount(this.draftTasks.length)}
            </app-badge>
            ${this.model
              ? html`<span class="mono" style="font-size: 0.72rem; color: var(--text-muted);">${this.model}</span>`
              : ''}
          </div>
        </div>

        ${this.draftTasks.length === 0
          ? html`<app-empty-state compact title="${t.viewTexts.requirements.noDraftTasks}"></app-empty-state>`
          : html`
              <div class="draft-list">
                ${this.draftTasks.map((draft, idx) => {
                  const reqs = store.requirements.filter((r) =>
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
                          @change="${() => this.updateDraft(idx, { selected: !draft.selected })}"
                        ></app-checkbox>

                        <app-input
                          size="sm"
                          .value="${draft.title}"
                          @input="${(e: CustomEvent<{ value: string }>) =>
                            this.updateDraft(idx, { title: eventValue(e) })}"
                        ></app-input>

                        <app-number-input
                          size="sm"
                          min="1"
                          max="240"
                          unit="${t.common.hours}"
                          .value="${draft.estimatedHours}"
                          @change="${(e: CustomEvent<{ value: number }>) =>
                            this.updateDraft(idx, { estimatedHours: Number(eventValue(e)) || 8 })}"
                        ></app-number-input>

                        <app-select
                          size="sm"
                          .value="${draft.priority}"
                          .options="${priorityOptions}"
                          @change="${(e: CustomEvent<{ value: string }>) =>
                            this.updateDraft(idx, { priority: eventValue(e) as TaskPriority })}"
                        ></app-select>
                      </div>

                      <app-textarea
                        rows="2"
                        .value="${draft.description}"
                        @input="${(e: CustomEvent<{ value: string }>) =>
                          this.updateDraft(idx, { description: eventValue(e) })}"
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
          <app-button variant="ghost" @click="${() => this.closeModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="primary"
            ?disabled="${selectedCount === 0}"
            @click="${() => this.handleCreateSelected()}"
          >
            <span slot="icon-start">${iconCheck(14)}</span>
            <span>${t.viewTexts.requirements.createSelectedTasksBtn} (${selectedCount})</span>
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-decompose-form': AppDecomposeForm;
  }
}
