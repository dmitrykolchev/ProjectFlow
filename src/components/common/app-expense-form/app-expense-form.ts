import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Expense, ExpenseCategory, ExpenseStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-expense-form.css';
import { eventValue } from '../event-value';
import { mapProjectOptions, mapTaskOptions, mapUserOptions } from '../entity-selector-options';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-entity-selector/app-entity-selector';
import '../app-select/app-select';
import '../app-number-input/app-number-input';
import '../app-date-input/app-date-input';
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
 * Canonical expense create/edit form. The component owns the whole field set (title,
 * project, linked task, category, submitted by, amount, currency, date, status,
 * vendor, billable and notes) and writes to the store itself; views open it by
 * setting `open` plus the edit target (`expense`) or create presets (presetProjectId,
 * presetTaskId, presetUserId for context-bound openings such as a project detail
 * quick expense card). A `saved` event carries the written expense. The title is
 * required and copies the historical validation error; changing the project clears
 * the linked task. Create prefills today, infrastructure category, 15000 amount,
 * RUB currency, pending status and billable on. `contextTitle` overrides the modal
 * title for context-bound openings.
 */
@customElement('app-expense-form')
export class AppExpenseForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ type: Object, attribute: false }) expense: Expense | null = null;
  @property({ type: Object, attribute: false }) presetProjectId: string | null = null;
  @property({ type: Object, attribute: false }) presetTaskId: string | null = null;
  @property({ type: Object, attribute: false }) presetUserId: string | null = null;
  @property({ type: String }) contextTitle: string = '';

  @state() private currentLang = store.customization.language;
  @state() private fTitle = '';
  @state() private fProjectId = '';
  @state() private fTaskId = '';
  @state() private fUserId = '';
  @state() private fDate = '';
  @state() private fCategory: ExpenseCategory = 'infrastructure';
  @state() private fAmount = 15000;
  @state() private fCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private fBillable = true;
  @state() private fStatus: ExpenseStatus = 'pending';
  @state() private fVendor = '';
  @state() private fNotes = '';
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
    if (this.expense) {
      const exp = this.expense;
      this.fTitle = exp.title;
      this.fProjectId = exp.projectId;
      this.fTaskId = exp.taskId || '';
      this.fUserId = exp.userId;
      this.fDate = exp.date;
      this.fCategory = exp.category;
      this.fAmount = exp.amount;
      this.fCurrency = exp.currency;
      this.fBillable = exp.billable;
      this.fStatus = exp.status;
      this.fVendor = exp.vendor || '';
      this.fNotes = exp.notes;
      this.fDocumentIds = [...(exp.documentIds || [])];
      this.fPendingFiles = [];
    } else {
      this.fTitle = '';
      this.fProjectId = this.presetProjectId ?? (store.projects[0]?.id || '');
      this.fTaskId = this.presetTaskId ?? '';
      this.fUserId = this.presetUserId ?? (store.users[0]?.id || '');
      this.fDate = new Date().toISOString().slice(0, 10);
      this.fCategory = 'infrastructure';
      this.fAmount = 15000;
      this.fCurrency = 'RUB';
      this.fBillable = true;
      this.fStatus = 'pending';
      this.fVendor = '';
      this.fNotes = '';
      this.fDocumentIds = [];
      this.fPendingFiles = [];
    }
    this.formError = '';
  }

  private handleSave() {
    const t = getTranslation(this.currentLang);
    if (!this.fTitle.trim()) {
      this.formError = t.common.required;
      return;
    }

    const targetProjectId = this.fProjectId || store.projects[0]?.id || '';
    const documentIds = commitPendingAttachments({
      projectId: targetProjectId,
      taskId: this.fTaskId || undefined,
      uploadedById: this.fUserId || store.users[0]?.id || '',
      category: 'act_invoice',
      tags: [
        t.viewTexts.attachments.tagExpense,
        ...(this.fTaskId ? [this.fTaskId] : []),
      ],
      existingDocumentIds: this.fDocumentIds,
      pendingFiles: this.fPendingFiles,
      description:
        this.fNotes.trim() ||
        t.viewTexts.attachments.defaultExpenseDescription(this.fTitle.trim()),
      versionNote: t.viewTexts.attachments.defaultExpenseDescription(this.fTitle.trim()),
    });

    const payload = {
      title: this.fTitle.trim(),
      projectId: targetProjectId,
      taskId: this.fTaskId || undefined,
      userId: this.fUserId || store.users[0]?.id || '',
      date: this.fDate || new Date().toISOString().slice(0, 10),
      category: this.fCategory,
      amount: Math.max(0, Number(this.fAmount) || 0),
      currency: this.fCurrency,
      billable: this.fBillable,
      status: this.fStatus,
      vendor: this.fVendor.trim() || undefined,
      notes: this.fNotes.trim(),
      documentIds,
    };

    let saved: Expense;
    if (this.expense) {
      const existing = store.expenses.find((e) => e.id === this.expense!.id);
      saved = {
        id: this.expense.id,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      };
      store.updateExpense(saved);
    } else {
      saved = store.addExpense(payload);
    }

    this.fPendingFiles = [];
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { expense: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);

    const title = this.expense
      ? this.contextTitle || t.viewTexts.expenses.modalTitleEdit
      : this.contextTitle || t.viewTexts.expenses.modalTitleCreate;

    const projectOptions = mapProjectOptions(store.projects, t);
    const taskOptions = mapTaskOptions(
      store.tasks.filter((tk) => tk.projectId === this.fProjectId),
      t
    );
    const userOptions = mapUserOptions(store.users, t);

    const currencyOptions = [
      { value: 'RUB', label: 'RUB (₽)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ];

    const categoryOptions: { value: ExpenseCategory; label: string }[] = [
      { value: 'infrastructure', label: t.expenses.categories.infrastructure },
      { value: 'software', label: t.expenses.categories.software },
      { value: 'contractors', label: t.expenses.categories.contractors },
      { value: 'equipment', label: t.expenses.categories.equipment },
      { value: 'travel', label: t.expenses.categories.travel },
      { value: 'marketing', label: t.expenses.categories.marketing },
      { value: 'other', label: t.expenses.categories.other },
    ];

    const statusOptions: { value: ExpenseStatus; label: string }[] = [
      { value: 'draft', label: t.expenses.statuses.draft },
      { value: 'pending', label: t.expenses.statuses.pending },
      { value: 'approved', label: t.expenses.statuses.approved },
      { value: 'reimbursed', label: t.expenses.statuses.reimbursed },
      { value: 'rejected', label: t.expenses.statuses.rejected },
    ];

    return html`
      <app-modal
        ?open="${this.open}"
        size="lg"
        title="${title}"
        @close="${() => this.closeModal()}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-input
              label="${t.viewTexts.expenses.labelExpenseTitle}"
              placeholder="${t.viewTexts.expenses.placeholderExpenseTitle}"
              .value="${this.fTitle}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fTitle = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.expenses.labelProject}"
              .value="${this.fProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.fProjectId = eventValue(e);
                this.fTaskId = '';
                this.fDocumentIds = this.fDocumentIds.filter((id) =>
                  store.documents.some((d) => d.id === id && d.projectId === this.fProjectId)
                );
              }}"
            ></app-entity-selector>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.expenses.labelLinkedTask}"
              placeholder="${t.viewTexts.expenses.optionNoTask}"
              clearable
              .value="${this.fTaskId}"
              .options="${taskOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fTaskId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.expenses.thCategory}"
              .value="${this.fCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCategory = eventValue(e) as ExpenseCategory)}"
            ></app-select>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.expenses.labelSubmittedBy}"
              .value="${this.fUserId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fUserId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.expenses.thAmount}"
              .value="${this.fAmount}"
              min="0"
              step="500"
              @change="${(e: CustomEvent<{ value: number }>) => (this.fAmount = eventValue(e))}"
            ></app-number-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.expenses.labelCurrency}"
              .value="${this.fCurrency}"
              .options="${currencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCurrency = eventValue(e) as 'RUB' | 'USD' | 'EUR')}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.expenses.labelDate}"
              .value="${this.fDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.expenses.thStatus}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as ExpenseStatus)}"
            ></app-select>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.expenses.labelVendor}"
              placeholder="Yandex Cloud, JetBrains..."
              .value="${this.fVendor}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fVendor = eventValue(e))}"
            ></app-input>
          </div>

          <div class="checkbox-cell">
            <app-checkbox
              label="${t.viewTexts.expenses.billableSwitch}"
              ?checked="${this.fBillable}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                (this.fBillable = e.detail.checked)}"
            ></app-checkbox>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.expenses.labelNotes}"
              .value="${this.fNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fNotes = eventValue(e))}"
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
    'app-expense-form': AppExpenseForm;
  }
}
