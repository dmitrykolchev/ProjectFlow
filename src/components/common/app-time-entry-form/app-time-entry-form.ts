import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { TimeEntry, TimeEntryCategory, TimeEntryStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-time-entry-form.css';

// detail of the `saved` event (named event-detail interface, AGENTS.md §6)
export interface TimeEntryFormSavedDetail {
  entry: TimeEntry;
}
import { eventValue } from '../event-value';
import { mapProjectOptions, mapTaskOptions, mapUserOptions } from '../entity-selector-options';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-entity-selector/app-entity-selector';
import '../app-date-input/app-date-input';
import '../app-number-input/app-number-input';
import '../app-select/app-select';
import '../app-checkbox/app-checkbox';
import '../app-textarea/app-textarea';
import '../app-button/app-button';
import '../app-project-attachments/app-project-attachments';
import {
  AttachmentsChangeDetail,
  commitPendingAttachments,
  PendingAttachmentFile,
} from '../app-project-attachments/app-project-attachments';

/**
 * Canonical time entry create/edit form. The component owns the whole field set
 * (project, task, employee, date done, hours spent, category, status, billable and
 * work description) and writes to the store itself; views open it by setting `open`
 * plus the edit target (`entry`) or create presets (presetProjectId, presetTaskId,
 * presetUserId for context-bound openings such as an employee card or a project
 * detail). A `saved` event carries the written entry. The task is required and
 * copies the historical select-task error; changing the project moves the task to
 * the first task of the new project. Create prefills today, two hours, development
 * category, logged status and billable on. `contextTitle` overrides the modal title
 * for context-bound openings.
 */
@customElement('app-time-entry-form')
export class AppTimeEntryForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ type: Object, attribute: false }) entry: TimeEntry | null = null;
  @property({ type: Object, attribute: false }) presetProjectId: string | null = null;
  @property({ type: Object, attribute: false }) presetTaskId: string | null = null;
  @property({ type: Object, attribute: false }) presetUserId: string | null = null;
  @property({ type: String }) contextTitle: string = '';

  @state() private currentLang = store.customization.language;
  @state() private fProjectId = '';
  @state() private fTaskId = '';
  @state() private fUserId = '';
  @state() private fDate = '';
  @state() private fHours = 2;
  @state() private fCategory: TimeEntryCategory = 'development';
  @state() private fStatus: TimeEntryStatus = 'logged';
  @state() private fBillable = true;
  @state() private fDescription = '';
  @state() private fDocumentIds: string[] = [];
  @state() private fPendingFiles: PendingAttachmentFile[] = [];
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
    if (this.entry) {
      const e = this.entry;
      this.fProjectId = e.projectId;
      this.fTaskId = e.taskId;
      this.fUserId = e.userId;
      this.fDate = e.date;
      this.fHours = e.hours;
      this.fCategory = e.category;
      this.fStatus = e.status;
      this.fBillable = e.billable;
      this.fDescription = e.description;
      this.fDocumentIds = [...(e.documentIds || [])];
      this.fPendingFiles = [];
    } else {
      const projectId = this.presetProjectId ?? (store.projects[0]?.id || '');
      const taskId =
        this.presetTaskId ?? (store.tasks.find((tk) => tk.projectId === projectId)?.id || '');

      this.fProjectId = projectId;
      this.fTaskId = taskId;
      this.fUserId = this.presetUserId ?? (store.users[0]?.id || '');
      this.fDate = new Date().toISOString().slice(0, 10);
      this.fHours = 2;
      this.fCategory = 'development';
      this.fStatus = 'logged';
      this.fBillable = true;
      this.fDescription = '';
      this.fDocumentIds = [];
      this.fPendingFiles = [];
    }
    this.formError = '';
  }

  private handleSave() {
    const t = getTranslation(this.currentLang);
    if (!this.fTaskId) {
      this.formError = t.viewTexts.timeTracking.selectTaskError;
      return;
    }

    const targetProjectId = this.fProjectId || store.projects[0]?.id || '';
    const documentIds = commitPendingAttachments({
      projectId: targetProjectId,
      taskId: this.fTaskId,
      uploadedById: this.fUserId || store.users[0]?.id || '',
      category: 'report',
      tags: [t.viewTexts.attachments.tagTimeEntry, this.fTaskId],
      existingDocumentIds: this.fDocumentIds,
      pendingFiles: this.fPendingFiles,
      description:
        this.fDescription.trim() || t.viewTexts.attachments.defaultTimeDescription(this.fTaskId),
      versionNote: t.viewTexts.attachments.defaultTimeDescription(this.fTaskId),
    });

    const payload = {
      projectId: targetProjectId,
      taskId: this.fTaskId,
      userId: this.fUserId || store.users[0]?.id || '',
      date: this.fDate || new Date().toISOString().slice(0, 10),
      hours: Math.max(0.25, Number(this.fHours) || 1),
      category: this.fCategory,
      status: this.fStatus,
      billable: this.fBillable,
      description: this.fDescription.trim(),
      documentIds,
    };

    let saved: TimeEntry;
    if (this.entry) {
      const existing = store.timeEntries.find((e) => e.id === this.entry!.id);
      saved = {
        id: this.entry.id,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      };
      store.updateTimeEntry(saved);
    } else {
      saved = store.addTimeEntry(payload);
    }

    this.fPendingFiles = [];
    this.open = false;
    this.dispatchEvent(
      new CustomEvent<TimeEntryFormSavedDetail>('saved', {
        detail: { entry: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);

    const title = this.entry
      ? this.contextTitle || t.viewTexts.timeTracking.modalTitleEdit
      : this.contextTitle || t.viewTexts.timeTracking.modalTitleCreate;

    const projectOptions = mapProjectOptions(store.projects, t);
    const taskOptions = mapTaskOptions(
      store.tasks.filter((tk) => tk.projectId === this.fProjectId),
      t
    );
    const userOptions = mapUserOptions(store.users, t);

    const categoryOptions: { value: TimeEntryCategory; label: string }[] = [
      { value: 'development', label: t.timeTracking.categories.development },
      { value: 'design', label: t.timeTracking.categories.design },
      { value: 'testing', label: t.timeTracking.categories.testing },
      { value: 'research', label: t.timeTracking.categories.research },
      { value: 'devops', label: t.timeTracking.categories.devops },
      { value: 'meeting', label: t.timeTracking.categories.meeting },
      { value: 'management', label: t.timeTracking.categories.management },
    ];

    const statusOptions: { value: TimeEntryStatus; label: string }[] = [
      { value: 'logged', label: t.timeTracking.statuses.logged },
      { value: 'submitted', label: t.timeTracking.statuses.submitted },
      { value: 'approved', label: t.timeTracking.statuses.approved },
    ];

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
              label="${t.viewTexts.timeTracking.labelProject}"
              .value="${this.fProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.fProjectId = eventValue(e);
                const firstTask = store.tasks.find((tk) => tk.projectId === this.fProjectId);
                this.fTaskId = firstTask?.id || '';
                this.fDocumentIds = this.fDocumentIds.filter((id) =>
                  store.documents.some((d) => d.id === id && d.projectId === this.fProjectId)
                );
                this.formError = '';
              }}"
            ></app-entity-selector>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelTask}"
              .value="${this.fTaskId}"
              .options="${taskOptions}"
              error="${this.formError}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.fTaskId = eventValue(e);
                this.formError = '';
              }}"
            ></app-entity-selector>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelEmployee}"
              .value="${this.fUserId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fUserId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.timeTracking.labelDateDone}"
              .value="${this.fDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.timeTracking.labelHoursSpent}"
              .value="${this.fHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="${t.viewTexts.timeTracking.hoursUnit}"
              @change="${(e: CustomEvent<{ value: number }>) => (this.fHours = eventValue(e))}"
            ></app-number-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.timeTracking.labelCategory}"
              .value="${this.fCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCategory = eventValue(e) as TimeEntryCategory)}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.timeTracking.statusLabel}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as TimeEntryStatus)}"
            ></app-select>
          </div>

          <div class="checkbox-cell">
            <app-checkbox
              label="${t.viewTexts.timeTracking.billableHoursLabel}"
              ?checked="${this.fBillable}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                (this.fBillable = e.detail.checked)}"
            ></app-checkbox>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.timeTracking.labelWorkDescription}"
              .value="${this.fDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fDescription = eventValue(e))}"
            ></app-textarea>
          </div>

          <div class="col-span-2">
            <app-project-attachments
              project-id="${this.fProjectId}"
              .documentIds="${this.fDocumentIds}"
              .pendingFiles="${this.fPendingFiles}"
              @attachments-change="${(e: CustomEvent<AttachmentsChangeDetail>) => {
                this.fDocumentIds = e.detail.documentIds;
                this.fPendingFiles = e.detail.pendingFiles;
              }}"
            ></app-project-attachments>
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
    'app-time-entry-form': AppTimeEntryForm;
  }
}
