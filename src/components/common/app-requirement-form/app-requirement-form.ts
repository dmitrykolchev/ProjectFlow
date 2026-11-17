import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  ProjectRequirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
} from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-requirement-form.css';
import { eventValue } from '../event-value';
import { iconBookOpen, iconX } from '../icons';
import {
  mapDocumentOptions,
  mapKnowledgeOptions,
  mapProjectOptions,
} from '../entity-selector-options';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-entity-selector/app-entity-selector';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-textarea/app-textarea';
import '../app-button/app-button';

/**
 * Canonical requirement create/edit form. The component owns the whole field set
 * (project, code, type, category, priority, status, source spec document, linked
 * knowledge articles, title, description, acceptance criteria) and writes to the
 * store itself; views open it by setting `open` plus the edit target (`requirement`)
 * or a create preset project. A `saved` event carries the written requirement. The
 * title is required and copies the historical validation error; the code upper-cases
 * while typing, prefills as FR-nn of the target project on create and falls back to
 * FR-NEW / NFR-NEW on save. Acceptance criteria textarea lines become the criteria
 * array. Knowledge chips are added through the entity selector and removed with the
 * per-chip delete button.
 */
@customElement('app-requirement-form')
export class AppRequirementForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) requirement: ProjectRequirement | null = null;
  @property({ attribute: false }) presetProjectId: string | null = null;

  @state() private currentLang = store.customization.language;
  @state() private fProjectId = '';
  @state() private fSourceDocId = '';
  @state() private fCode = '';
  @state() private fType: RequirementType = 'functional';
  @state() private fCategory = 'Core';
  @state() private fPriority: RequirementPriority = 'high';
  @state() private fStatus: RequirementStatus = 'approved';
  @state() private fTitle = '';
  @state() private fDescription = '';
  @state() private fAcceptance = '';
  @state() private fKnowledgeIds: string[] = [];
  @state() private formError = '';

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
    if (changed.has('open') && this.open) this.initFields();
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

  private initFields() {
    if (this.requirement) {
      const req = this.requirement;
      this.fProjectId = req.projectId;
      this.fSourceDocId = req.sourceDocumentId || '';
      this.fCode = req.code;
      this.fType = req.type;
      this.fCategory = req.category;
      this.fPriority = req.priority;
      this.fStatus = req.status;
      this.fTitle = req.title;
      this.fDescription = req.description;
      this.fAcceptance = req.acceptanceCriteria.join('\n');
      this.fKnowledgeIds = [...(req.linkedKnowledgeIds || [])];
    } else {
      const targetProjectId = this.presetProjectId ?? (store.projects[0]?.id || '');
      const projectReqs = store.requirements.filter((r) => r.projectId === targetProjectId);
      const nextIdx = projectReqs.length + 1;
      const proj = store.projects.find((p) => p.id === targetProjectId);

      this.fProjectId = targetProjectId;
      this.fSourceDocId = proj?.specDocumentId || '';
      this.fCode = `FR-${String(nextIdx).padStart(2, '0')}`;
      this.fType = 'functional';
      this.fCategory = 'Core';
      this.fPriority = 'high';
      this.fStatus = 'approved';
      this.fTitle = '';
      this.fDescription = '';
      this.fAcceptance = '';
      this.fKnowledgeIds = [];
    }
    this.formError = '';
  }

  private handleSave() {
    const t = getTranslation(this.currentLang);
    if (!this.fTitle.trim()) {
      this.formError = t.common.required;
      return;
    }

    const criteria = this.fAcceptance
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const projectId = this.fProjectId || store.projects[0]?.id || '';
    const project = store.projects.find((p) => p.id === projectId);

    let saved: ProjectRequirement;
    if (this.requirement) {
      const existing = store.requirements.find((r) => r.id === this.requirement!.id);
      const updated: ProjectRequirement = {
        ...(existing || this.requirement),
        projectId,
        sourceDocumentId: this.fSourceDocId || undefined,
        code: this.fCode.trim().toUpperCase() || (existing ? existing.code : 'FR-NEW'),
        type: this.fType,
        category: this.fCategory.trim() || (existing ? existing.category : 'Core'),
        priority: this.fPriority,
        status: this.fStatus,
        title: this.fTitle.trim(),
        description: this.fDescription.trim(),
        acceptanceCriteria: criteria,
        linkedKnowledgeIds: [...this.fKnowledgeIds],
      };
      store.updateRequirement(updated);
      saved = updated;
    } else {
      saved = store.addRequirement({
        projectId,
        sourceDocumentId: this.fSourceDocId || project?.specDocumentId,
        code:
          this.fCode.trim().toUpperCase() ||
          (this.fType === 'functional' ? 'FR-NEW' : 'NFR-NEW'),
        type: this.fType,
        category: this.fCategory.trim() || 'Core',
        priority: this.fPriority,
        status: this.fStatus,
        title: this.fTitle.trim(),
        description: this.fDescription.trim(),
        acceptanceCriteria: criteria,
        linkedKnowledgeIds: [...this.fKnowledgeIds],
        linkedTaskIds: [],
      });
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { requirement: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const title = this.requirement
      ? t.viewTexts.requirements.modalEditTitle
      : t.viewTexts.requirements.modalCreateTitle;

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
      store.knowledgeArticles.filter((k) => !this.fKnowledgeIds.includes(k.id)),
      t
    );
    const selectedKbs = store.knowledgeArticles.filter((k) => this.fKnowledgeIds.includes(k.id));

    return html`
      <app-modal
        ?open="${this.open}"
        size="lg"
        title="${title}"
        @close="${() => this.closeModal()}"
      >
        <app-form-grid>
          <div>
            <app-entity-selector
              label="${t.requirements.projectLabel}"
              .options="${projectOptions}"
              .value="${this.fProjectId}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fProjectId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-input
              label="${t.requirements.codeLabel}"
              placeholder="FR-01"
              .value="${this.fCode}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.fCode = eventValue(e).toUpperCase())}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.requirements.typeLabel}"
              .value="${this.fType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fType = eventValue(e) as RequirementType)}"
            ></app-select>
          </div>

          <div>
            <app-input
              label="${t.requirements.categoryLabel}"
              placeholder="Auth / API / Security"
              .value="${this.fCategory}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fCategory = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.requirements.priorityLabel}"
              .value="${this.fPriority}"
              .options="${priorityOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fPriority = eventValue(e) as RequirementPriority)}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.requirements.statusLabel}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as RequirementStatus)}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-entity-selector
              clearable
              label="${t.requirements.sourceSpecLabel}"
              placeholder="${t.viewTexts.projects.selectSpecPlaceholder}"
              .options="${docOptions}"
              .value="${this.fSourceDocId}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fSourceDocId = eventValue(e) || '')}"
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
                if (kbId && !this.fKnowledgeIds.includes(kbId)) {
                  this.fKnowledgeIds = [...this.fKnowledgeIds, kbId];
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
                              this.fKnowledgeIds = this.fKnowledgeIds.filter(
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
              .value="${this.fTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fTitle = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.requirements.descriptionLabel}"
              .value="${this.fDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fDescription = eventValue(e))}"
            ></app-textarea>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.requirements.acceptanceLabel}"
              placeholder="${t.requirements.acceptancePlaceholder}"
              .value="${this.fAcceptance}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fAcceptance = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => this.closeModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSave()}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-requirement-form': AppRequirementForm;
  }
}
