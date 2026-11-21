import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { DocumentCategory, DocumentItem, DocumentScope, DocumentStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import { readBrowserFile } from '../document-utils';
import { formatAiError, generateDocumentSummaryAndTags } from '../../../services/openai-client';
import { iconAlertTriangle, iconCpu } from '../icons';
import styles from './app-document-form.css';

// detail of the `saved` event (named event-detail interface, AGENTS.md §6)
export interface DocumentFormSavedDetail {
  document: DocumentItem;
}
import { eventValue } from '../event-value';
import {
  mapCompanyOptions,
  mapContractOptions,
  mapCounterpartyOptions,
  mapProjectOptions,
  mapTaskOptions,
  mapUserOptions,
} from '../entity-selector-options';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-file-dropzone/app-file-dropzone';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-entity-selector/app-entity-selector';
import '../app-textarea/app-textarea';
import '../app-button/app-button';

/**
 * Canonical document create/edit form. The component owns the whole field set (file
 * dropzone for uploads, title, file name, category, status, scope and its
 * conditional entity selector, uploading employee, AI summary bar, tags, description,
 * text content and version note) and writes to the store itself; views open it by
 * setting `open` plus the edit target (`document`) or create presets (presetCompanyId,
 * presetProjectId, presetContractId for context-bound openings such as a company card
 * quick upload, presetCategory, presetStatus and presetTags carry the quick-upload
 * flavor prefills). A `saved` event carries the written document. The title is
 * required and copies the historical validation error; picking a file fills the file
 * name, size, text content and a truncated note banner, and titles an untitled form
 * from the file name. Create prefills draft status, spec category, the target company
 * or project, the current employee and the initial version note. `contextTitle`
 * overrides the modal title for context-bound openings.
 */
@customElement('app-document-form')
export class AppDocumentForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ type: Object, attribute: false }) document: DocumentItem | null = null;
  @property({ type: Object, attribute: false }) presetCompanyId: string | null = null;
  @property({ type: Object, attribute: false }) presetProjectId: string | null = null;
  @property({ type: Object, attribute: false }) presetContractId: string | null = null;
  @property({ type: Object, attribute: false }) presetCategory: DocumentCategory | null = null;
  @property({ type: Object, attribute: false }) presetStatus: DocumentStatus | null = null;
  @property({ type: String }) presetTags: string = '';
  @property({ type: String }) contextTitle: string = '';

  @state() private currentLang = store.customization.language;
  @state() private fTitle = '';
  @state() private fFileName = '';
  @state() private fExtension = 'txt';
  @state() private fMimeType = 'text/plain';
  @state() private fSizeBytes = 0;
  @state() private fDataUrl: string | undefined = undefined;
  @state() private fTextContent = '';
  @state() private fTruncatedNote = '';
  @state() private fCategory: DocumentCategory = 'spec';
  @state() private fStatus: DocumentStatus = 'draft';
  @state() private fScope: DocumentScope = 'company';
  @state() private fCompanyId = '';
  @state() private fProjectId = '';
  @state() private fContractId = '';
  @state() private fCounterpartyId = '';
  @state() private fTaskId = '';
  @state() private fUploadedById = '';
  @state() private fTags = '';
  @state() private fDescription = '';
  @state() private fVersionNote = '';
  @state() private formError = '';
  @state() private aiLoading = false;
  @state() private aiError = '';

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
    const t = getTranslation(this.currentLang);

    if (this.document) {
      const doc = this.document;
      this.fTitle = doc.title;
      this.fFileName = doc.fileName;
      this.fExtension = doc.extension;
      this.fMimeType = doc.mimeType;
      this.fSizeBytes = doc.sizeBytes;
      this.fDataUrl = doc.dataUrl;
      this.fTextContent = doc.textContent || '';
      this.fTruncatedNote = '';
      this.fCategory = doc.category;
      this.fStatus = doc.status;
      this.fScope = doc.scope;
      this.fCompanyId = doc.companyId || '';
      this.fProjectId = doc.projectId || '';
      this.fContractId = doc.contractId || '';
      this.fCounterpartyId = doc.counterpartyId || '';
      this.fTaskId = doc.taskId || '';
      this.fUploadedById = doc.uploadedById;
      this.fTags = (doc.tags || []).join(', ');
      this.fDescription = doc.description || '';
      this.fVersionNote = '';
    } else {
      this.fTitle = '';
      this.fFileName = '';
      this.fExtension = 'txt';
      this.fMimeType = 'text/plain';
      this.fSizeBytes = 0;
      this.fDataUrl = undefined;
      this.fTextContent = '';
      this.fTruncatedNote = '';
      this.fCategory = this.presetCategory ?? 'spec';
      this.fStatus = this.presetStatus ?? 'draft';
      this.fScope = this.presetProjectId ? 'project' : 'company';
      this.fCompanyId = this.presetCompanyId ?? (store.companies[0]?.id || '');
      this.fProjectId = this.presetProjectId ?? '';
      this.fContractId = this.presetContractId ?? '';
      this.fCounterpartyId = '';
      this.fTaskId = '';
      this.fUploadedById = store.currentUserId || store.users[0]?.id || '';
      this.fTags = this.presetTags;
      this.fDescription = '';
      this.fVersionNote = t.viewTexts.documents.initialVersionNote;
    }

    this.formError = '';
    this.aiLoading = false;
    this.aiError = '';
  }

  // views with an inline quick upload dropzone open the form and hand the picked file
  // over through this method, so the file prefills run through the same canonical path
  public async selectFile(file: File) {
    await this.applyFileToForm(file);
  }

  private async handleDropzoneSelect(e: CustomEvent<{ file: File }>) {
    const file = e.detail?.file;
    if (!file) return;
    await this.applyFileToForm(file);
  }

  private async applyFileToForm(file: File) {
    const t = getTranslation(this.currentLang);
    const payload = await readBrowserFile(file, t.viewTexts.documents.fileTooLargeNote);
    this.fFileName = payload.fileName;
    this.fExtension = payload.extension;
    this.fMimeType = payload.mimeType;
    this.fSizeBytes = payload.sizeBytes;
    this.fDataUrl = payload.dataUrl;
    if (payload.textContent !== undefined) {
      this.fTextContent = payload.textContent;
    }
    this.fTruncatedNote = payload.truncatedNote || '';
    if (!this.fTitle.trim()) {
      this.fTitle = payload.fileName.replace(/\.[^.]+$/, '');
      this.formError = '';
    }
  }

  private async handleGenerateSummary() {
    const t = getTranslation(this.currentLang);
    if (!this.fTitle.trim() && !this.fFileName.trim() && !this.fTextContent.trim()) {
      this.aiError = t.viewTexts.ai.errors.missingDocInfo;
      return;
    }

    const endpoint = store.customization.aiEndpoint;
    const model = store.customization.aiModel;
    this.aiLoading = true;
    this.aiError = '';

    const linkedCompany = this.fCompanyId
      ? store.companies.find((c) => c.id === this.fCompanyId)?.name
      : undefined;
    const linkedProject = this.fProjectId
      ? store.projects.find((p) => p.id === this.fProjectId)?.name
      : undefined;

    try {
      const result = await generateDocumentSummaryAndTags({
        doc: {
          title: this.fTitle.trim(),
          fileName: this.fFileName.trim(),
          mimeType: this.fMimeType,
          category: this.fCategory,
          scope: this.fScope,
          description: this.fDescription,
          tags: this.fTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          textContent: this.fTextContent,
          dataUrl: this.fDataUrl,
        },
        linkedContext: [linkedCompany, linkedProject].filter(Boolean).join(' · ') || undefined,
        lang: this.currentLang,
        baseUrl: endpoint,
        model,
      });

      if (result.summary) {
        this.fDescription = result.summary;
      }
      if (result.tags.length > 0) {
        this.fTags = result.tags.join(', ');
      }
      store.addNotification('success', t.viewTexts.ai.docSectionTitle, t.viewTexts.ai.docAppliedNote);
    } catch (err) {
      this.aiError = formatAiError(err, endpoint, t);
    } finally {
      this.aiLoading = false;
    }
  }

  private handleSave() {
    const t = getTranslation(this.currentLang);
    if (!this.fTitle.trim()) {
      this.formError = t.common.required;
      return;
    }

    const fileName =
      this.fFileName.trim() || `${this.fTitle.trim().toLowerCase().replace(/\s+/g, '_')}.txt`;
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? (parts.pop() || 'txt').toLowerCase() : this.fExtension || 'txt';
    const textBytes = this.fTextContent ? new Blob([this.fTextContent]).size : 512;

    const tags = this.fTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const linkedProject =
      this.fScope === 'project' && this.fProjectId
        ? store.projects.find((p) => p.id === this.fProjectId)
        : undefined;
    const linkedContract =
      this.fScope === 'contract' && this.fContractId
        ? store.contracts.find((c) => c.id === this.fContractId)
        : undefined;

    const resolvedCompanyId =
      this.fScope === 'company' || this.fScope === 'general'
        ? this.fCompanyId || undefined
        : linkedProject?.companyId || linkedContract?.companyId || undefined;

    const commonPayload = {
      title: this.fTitle.trim(),
      fileName,
      extension: ext,
      mimeType: this.fMimeType || 'text/plain',
      sizeBytes: this.fSizeBytes || textBytes,
      category: this.fCategory,
      status: this.fStatus,
      scope: this.fScope,
      companyId: resolvedCompanyId,
      projectId: this.fScope === 'project' ? this.fProjectId || undefined : undefined,
      contractId: this.fScope === 'contract' ? this.fContractId || undefined : undefined,
      counterpartyId: this.fScope === 'counterparty' ? this.fCounterpartyId || undefined : undefined,
      taskId: this.fScope === 'task' ? this.fTaskId || undefined : undefined,
      tags,
      description: this.fDescription.trim(),
      uploadedById: this.fUploadedById || store.currentUserId || store.users[0]?.id || 'user-1',
      dataUrl: this.fDataUrl,
      textContent: this.fTextContent.trim() || undefined,
    };

    let saved: DocumentItem;
    if (this.document) {
      const existing = store.documents.find((d) => d.id === this.document!.id);
      saved = { ...(existing || this.document), ...commonPayload };
      store.updateDocument(saved);
    } else {
      saved = store.addDocument({
        ...commonPayload,
        versionNote: this.fVersionNote.trim() || t.viewTexts.documents.initialVersionNote,
      });
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent<DocumentFormSavedDetail>('saved', {
        detail: { document: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);

    const title = this.document
      ? this.contextTitle || t.documents.editDocument
      : this.contextTitle || t.documents.uploadDocument;

    const categoryOptions = (Object.keys(t.documents.categories) as DocumentCategory[]).map((k) => ({
      value: k,
      label: t.documents.categories[k],
    }));
    const statusOptions = (Object.keys(t.documents.statuses) as DocumentStatus[]).map((k) => ({
      value: k,
      label: t.documents.statuses[k],
    }));
    const scopeOptions = (Object.keys(t.documents.scopes) as DocumentScope[]).map((k) => ({
      value: k,
      label: t.documents.scopes[k],
    }));
    const companyOptions = mapCompanyOptions(store.companies, t);
    const projectOptions = mapProjectOptions(store.projects, t);
    const contractOptions = mapContractOptions(store.contracts, t);
    const counterpartyOptions = mapCounterpartyOptions(store.counterparties, t);
    const taskOptions = mapTaskOptions(store.tasks, t);
    const userOptions = mapUserOptions(store.users, t);

    return html`
      <app-modal
        ?open="${this.open}"
        size="lg"
        title="${title}"
        @close="${() => this.closeModal()}"
      >
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${!this.document
            ? html`
                <app-file-dropzone
                  selected-file-name="${this.fFileName}"
                  selected-file-size="${this.fSizeBytes}"
                  @file-selected="${this.handleDropzoneSelect}"
                  @file-cleared="${() => {
                    this.fFileName = '';
                    this.fSizeBytes = 0;
                    this.fDataUrl = undefined;
                    this.fTruncatedNote = '';
                  }}"
                ></app-file-dropzone>
              `
            : ''}

          ${this.fTruncatedNote
            ? html`<div class="note-banner">${this.fTruncatedNote}</div>`
            : ''}

          <app-form-grid>
            <div>
              <app-input
                label="${t.documents.fieldTitle}"
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
              <app-input
                label="${t.documents.fieldFileName}"
                .value="${this.fFileName}"
                @input="${(e: CustomEvent<{ value: string }>) => (this.fFileName = eventValue(e))}"
              ></app-input>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldCategory}"
                .value="${this.fCategory}"
                .options="${categoryOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.fCategory = eventValue(e) as DocumentCategory)}"
              ></app-select>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldStatus}"
                .value="${this.fStatus}"
                .options="${statusOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.fStatus = eventValue(e) as DocumentStatus)}"
              ></app-select>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldScope}"
                .value="${this.fScope}"
                .options="${scopeOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.fScope = eventValue(e) as DocumentScope)}"
              ></app-select>
            </div>
            <div>
              ${this.fScope === 'company'
                ? html`
                    <app-entity-selector
                      label="${t.documents.fieldCompany}"
                      placeholder="${t.documents.scopeNone}"
                      clearable
                      .value="${this.fCompanyId}"
                      .options="${companyOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.fCompanyId = eventValue(e))}"
                    ></app-entity-selector>
                  `
                : this.fScope === 'project'
                ? html`
                    <app-entity-selector
                      label="${t.documents.fieldProject}"
                      placeholder="${t.documents.scopeNone}"
                      clearable
                      .value="${this.fProjectId}"
                      .options="${projectOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.fProjectId = eventValue(e))}"
                    ></app-entity-selector>
                  `
                : this.fScope === 'contract'
                ? html`
                    <app-entity-selector
                      label="${t.documents.fieldContract}"
                      placeholder="${t.documents.scopeNone}"
                      clearable
                      .value="${this.fContractId}"
                      .options="${contractOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.fContractId = eventValue(e))}"
                    ></app-entity-selector>
                  `
                : this.fScope === 'counterparty'
                ? html`
                    <app-entity-selector
                      label="${t.documents.fieldCounterparty}"
                      placeholder="${t.documents.scopeNone}"
                      clearable
                      .value="${this.fCounterpartyId}"
                      .options="${counterpartyOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.fCounterpartyId = eventValue(e))}"
                    ></app-entity-selector>
                  `
                : this.fScope === 'task'
                ? html`
                    <app-entity-selector
                      label="${t.documents.fieldTask}"
                      placeholder="${t.documents.scopeNone}"
                      clearable
                      .value="${this.fTaskId}"
                      .options="${taskOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.fTaskId = eventValue(e))}"
                    ></app-entity-selector>
                  `
                : html`
                    <app-entity-selector
                      label="${t.documents.fieldCompany}"
                      placeholder="${t.documents.scopeNone}"
                      clearable
                      .value="${this.fCompanyId}"
                      .options="${companyOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.fCompanyId = eventValue(e))}"
                    ></app-entity-selector>
                  `}
            </div>
            <div>
              <app-entity-selector
                label="${t.documents.fieldUploadedBy}"
                .value="${this.fUploadedById}"
                .options="${userOptions}"
                @change="${(e: CustomEvent<{ value: string }>) => (this.fUploadedById = eventValue(e))}"
              ></app-entity-selector>
            </div>
            <div class="col-span-2">
              <div class="ai-doc-bar">
                <div class="ai-doc-bar-row">
                  <span class="ai-doc-hint">${t.viewTexts.ai.docFormHint}</span>
                  <app-button
                    size="sm"
                    variant="secondary"
                    ?disabled="${this.aiLoading}"
                    @click="${() => this.handleGenerateSummary()}"
                  >
                    <span slot="icon-start">${iconCpu(14)}</span>
                    <span>
                      ${this.aiLoading ? t.viewTexts.ai.docGenerating : t.viewTexts.ai.docGenerateBtn}
                    </span>
                  </app-button>
                </div>
                ${this.aiError
                  ? html`
                      <div class="ai-doc-error">
                        <span style="flex-shrink: 0;">${iconAlertTriangle(14)}</span>
                        <span>${this.aiError}</span>
                      </div>
                    `
                  : ''}
              </div>
            </div>
            <div>
              <app-input
                label="${t.documents.fieldTags}"
                .value="${this.fTags}"
                @input="${(e: CustomEvent<{ value: string }>) => (this.fTags = eventValue(e))}"
              ></app-input>
            </div>
            <div class="col-span-2">
              <app-textarea
                label="${t.documents.fieldDescription}"
                .value="${this.fDescription}"
                rows="3"
                @input="${(e: CustomEvent<{ value: string }>) => (this.fDescription = eventValue(e))}"
              ></app-textarea>
            </div>
            <div class="col-span-2">
              <app-textarea
                label="${t.documents.fieldTextContent}"
                hint="${t.viewTexts.documents.charsLimitHint}"
                .value="${this.fTextContent}"
                rows="4"
                @input="${(e: CustomEvent<{ value: string }>) => (this.fTextContent = eventValue(e))}"
              ></app-textarea>
            </div>
            ${!this.document
              ? html`
                  <div class="col-span-2">
                    <app-input
                      label="${t.documents.fieldVersionNote}"
                      .value="${this.fVersionNote}"
                      @input="${(e: CustomEvent<{ value: string }>) => (this.fVersionNote = eventValue(e))}"
                    ></app-input>
                  </div>
                `
              : ''}
          </app-form-grid>
        </div>

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
    'app-document-form': AppDocumentForm;
  }
}
