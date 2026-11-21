import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { DocumentCategory, DocumentItem, DocumentScope, SupportedLang } from '../../../types';
import {
  downloadDocumentFile,
  formatFileSize,
  isImageMimeOrExt,
  isTextMimeOrExt,
  readBrowserFile,
  ReadFilePayload,
} from '../document-utils';
import { iconDownload, iconEye, iconPaperclip, iconX } from '../icons';
import { eventValue } from '../event-value';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-file-dropzone/app-file-dropzone';
import '../app-select/app-select';
import '../app-modal/app-modal';
import '../app-confirm-dialog/app-confirm-dialog';
import '../app-document-previewer/app-document-previewer';
import styles from './app-project-attachments.css';

export interface PendingAttachmentFile {
  tempId: string;
  payload: ReadFilePayload;
  title: string;
}

export interface AttachmentsChangeDetail {
  documentIds: string[];
  pendingFiles: PendingAttachmentFile[];
}

export function commitPendingAttachments(options: {
  projectId?: string;
  companyId?: string;
  contractId?: string;
  counterpartyId?: string;
  taskId?: string;
  scope?: DocumentScope;
  uploadedById?: string;
  category: DocumentCategory;
  tags: string[];
  existingDocumentIds: string[];
  pendingFiles: PendingAttachmentFile[];
  description?: string;
  versionNote?: string;
}): string[] {
  const proj = options.projectId
    ? store.projects.find((p) => p.id === options.projectId)
    : undefined;
  const createdIds: string[] = [];
  const scope: DocumentScope =
    options.scope ||
    (options.projectId
      ? 'project'
      : options.contractId
      ? 'contract'
      : options.companyId
      ? 'company'
      : options.counterpartyId
      ? 'counterparty'
      : 'general');

  for (const item of options.pendingFiles) {
    const doc = store.addDocument({
      title: item.title.trim() || item.payload.fileName,
      fileName: item.payload.fileName,
      extension: item.payload.extension,
      mimeType: item.payload.mimeType,
      sizeBytes: item.payload.sizeBytes,
      category: options.category,
      status: 'approved',
      scope,
      projectId: options.projectId || undefined,
      companyId: options.companyId || proj?.companyId,
      contractId: options.contractId || undefined,
      counterpartyId: options.counterpartyId || undefined,
      taskId: options.taskId || undefined,
      tags: Array.from(new Set(options.tags.filter(Boolean))),
      description: options.description || '',
      uploadedById: options.uploadedById || store.currentUserId || store.users[0]?.id || 'user-1',
      dataUrl: item.payload.dataUrl,
      textContent: item.payload.textContent,
      versionNote: options.versionNote,
    });
    createdIds.push(doc.id);
  }

  return Array.from(new Set([...options.existingDocumentIds, ...createdIds]));
}

/**
 * Reusable attachment manager for Time Entries & Expenses.
 * Allows uploading new files (staged and automatically saved into the selected
 * project's Document Library on save) or linking existing files already stored
 * in the project's library. Supports inline preview, download, and detach.
 */
@customElement('app-project-attachments')
export class AppProjectAttachments extends LitElement {
  @property({ type: String, attribute: 'project-id' }) projectId: string = '';
  @property({ attribute: false }) documentIds: string[] = [];
  @property({ attribute: false }) pendingFiles: PendingAttachmentFile[] = [];
  @property({ type: String }) label: string = '';
  @property({ type: Boolean }) compact: boolean = false;
  @property({ type: Boolean }) readonly: boolean = false;

  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private documents: DocumentItem[] = store.documents;
  @state() private pickerValue: string = '';
  @state() private truncatedNote: string = '';
  @state() private previewingDoc: DocumentItem | null = null;
  @state() private detachingDoc: DocumentItem | null = null;

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
    this.documents = store.documents;
  }

  private emitChange(nextDocumentIds: string[], nextPendingFiles: PendingAttachmentFile[]) {
    this.documentIds = nextDocumentIds;
    this.pendingFiles = nextPendingFiles;
    this.dispatchEvent(
      new CustomEvent<AttachmentsChangeDetail>('attachments-change', {
        detail: {
          documentIds: nextDocumentIds,
          pendingFiles: nextPendingFiles,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleFilesSelected(files: File[]) {
    if (this.readonly || files.length === 0) return;
    const t = getTranslation(this.currentLang);
    const added: PendingAttachmentFile[] = [];
    let lastNote = '';

    for (const file of files) {
      const payload = await readBrowserFile(file, t.viewTexts.documents.fileTooLargeNote);
      if (payload.truncatedNote) {
        lastNote = payload.truncatedNote;
      }
      const cleanTitle = payload.fileName.replace(/\.[^.]+$/, '') || payload.fileName;
      added.push({
        tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        payload,
        title: cleanTitle,
      });
    }

    this.truncatedNote = lastNote;
    this.emitChange([...this.documentIds], [...this.pendingFiles, ...added]);
  }

  private handlePickExisting(docId: string) {
    if (!docId || this.readonly) return;
    if (!this.documentIds.includes(docId)) {
      this.emitChange([...this.documentIds, docId], [...this.pendingFiles]);
    }
    this.pickerValue = '';
  }

  private handleDetachExisting(docId: string) {
    if (this.readonly) return;
    this.emitChange(
      this.documentIds.filter((id) => id !== docId),
      [...this.pendingFiles]
    );
  }

  private handleRemovePending(tempId: string) {
    if (this.readonly) return;
    this.emitChange(
      [...this.documentIds],
      this.pendingFiles.filter((p) => p.tempId !== tempId)
    );
  }

  private buildSyntheticDoc(pending: PendingAttachmentFile): DocumentItem {
    const now = new Date().toISOString();
    return {
      id: pending.tempId,
      title: pending.title || pending.payload.fileName,
      fileName: pending.payload.fileName,
      extension: pending.payload.extension,
      mimeType: pending.payload.mimeType,
      sizeBytes: pending.payload.sizeBytes,
      category: 'other',
      status: 'draft',
      scope: 'project',
      projectId: this.projectId || undefined,
      description: '',
      tags: [],
      version: 1,
      uploadedById: store.currentUserId || store.users[0]?.id || 'user-1',
      dataUrl: pending.payload.dataUrl,
      textContent: pending.payload.textContent,
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private getExtClass(mimeType: string, ext: string): string {
    if (isImageMimeOrExt(mimeType, ext)) return 'is-image';
    if (isTextMimeOrExt(mimeType, ext)) return 'is-code';
    return '';
  }

  render() {
    const t = getTranslation(this.currentLang);
    const attachedSet = new Set(this.documentIds);
    const attachedDocs = this.documentIds
      .map((id) => this.documents.find((d) => d.id === id))
      .filter((d): d is DocumentItem => Boolean(d));

    const availableProjectDocs = this.documents.filter(
      (d) =>
        !attachedSet.has(d.id) &&
        (!this.projectId || d.projectId === this.projectId)
    );

    const existingOptions = [
      { value: '', label: t.viewTexts.attachments.pickExistingPlaceholder },
      ...availableProjectDocs.map((d) => ({
        value: d.id,
        label: `${d.title} (${d.fileName})`,
      })),
    ];

    const totalCount = attachedDocs.length + this.pendingFiles.length;

    return html`
      <div class="attachments-header">
        <span class="attachments-label">
          ${iconPaperclip(14)}
          <span>${this.label || t.viewTexts.attachments.sectionLabel}</span>
          ${totalCount > 0
            ? html`<app-badge variant="primary" appearance="soft" size="sm">${totalCount}</app-badge>`
            : ''}
        </span>
        ${!this.compact && !this.readonly
          ? html`<span class="attachments-hint">${t.viewTexts.attachments.hint}</span>`
          : ''}
      </div>

      ${!this.readonly
        ? html`
            <div class="attachments-controls">
              <app-file-dropzone
                compact
                multiple
                title="${t.viewTexts.attachments.dropzoneTitle}"
                @files-selected="${(e: CustomEvent<{ files: File[] }>) =>
                  this.handleFilesSelected(e.detail.files)}"
              ></app-file-dropzone>

              ${availableProjectDocs.length > 0
                ? html`
                    <div class="existing-picker-row">
                      <app-select
                        size="sm"
                        searchable
                        .value="${this.pickerValue}"
                        .options="${existingOptions}"
                        @change="${(e: CustomEvent<{ value: string }>) => {
                          const val = eventValue(e);
                          if (val) this.handlePickExisting(val);
                        }}"
                      ></app-select>
                    </div>
                  `
                : ''}
            </div>
          `
        : ''}

      ${this.truncatedNote
        ? html`<div class="truncate-note">${this.truncatedNote}</div>`
        : ''}

      ${totalCount === 0
        ? html`<div class="empty-note">${t.viewTexts.attachments.empty}</div>`
        : html`
            <div class="files-list">
              ${attachedDocs.map((doc) => {
                const ext = (doc.extension || 'doc').toUpperCase().slice(0, 4);
                return html`
                  <div class="file-row">
                    <div class="file-main">
                      <span class="ext-badge ${this.getExtClass(doc.mimeType, doc.extension)}">
                        ${ext}
                      </span>
                      <div class="file-info">
                        <span class="file-title" title="${doc.title}">${doc.title}</span>
                        <div class="file-meta">
                          <span class="mono">${doc.fileName}</span>
                          <span>·</span>
                          <span class="mono">${formatFileSize(doc.sizeBytes, t)}</span>
                          <app-badge variant="info" appearance="soft" size="sm">
                            ${t.viewTexts.attachments.projectLibraryBadge}
                          </app-badge>
                        </div>
                      </div>
                    </div>
                    <div class="file-actions">
                      <app-button
                        size="xs"
                        variant="icon"
                        title="${t.viewTexts.attachments.previewButton}"
                        @click="${() => (this.previewingDoc = doc)}"
                      >
                        <span slot="start">${iconEye(13)}</span>
                      </app-button>
                      <app-button
                        size="xs"
                        variant="icon"
                        title="${t.viewTexts.attachments.downloadButton}"
                        @click="${() => downloadDocumentFile(doc)}"
                      >
                        <span slot="start">${iconDownload(13)}</span>
                      </app-button>
                      ${!this.readonly
                        ? html`
                            <app-button
                              size="xs"
                              variant="icon"
                              action="delete"
                              title="${t.viewTexts.attachments.removeButton}"
                              @click="${() => (this.detachingDoc = doc)}"
                            >
                              <span slot="start">${iconX(13)}</span>
                            </app-button>
                          `
                        : ''}
                    </div>
                  </div>
                `;
              })}

              ${this.pendingFiles.map((pending) => {
                const p = pending.payload;
                const ext = (p.extension || 'doc').toUpperCase().slice(0, 4);
                return html`
                  <div class="file-row is-pending">
                    <div class="file-main">
                      <span class="ext-badge ${this.getExtClass(p.mimeType, p.extension)}">
                        ${ext}
                      </span>
                      <div class="file-info">
                        <span class="file-title" title="${pending.title}">${pending.title}</span>
                        <div class="file-meta">
                          <span class="mono">${p.fileName}</span>
                          <span>·</span>
                          <span class="mono">${formatFileSize(p.sizeBytes, t)}</span>
                          <app-badge variant="success" appearance="soft" size="sm">
                            ${t.viewTexts.attachments.pendingLibraryBadge}
                          </app-badge>
                        </div>
                      </div>
                    </div>
                    <div class="file-actions">
                      <app-button
                        size="xs"
                        variant="icon"
                        title="${t.viewTexts.attachments.previewButton}"
                        @click="${() => (this.previewingDoc = this.buildSyntheticDoc(pending))}"
                      >
                        <span slot="start">${iconEye(13)}</span>
                      </app-button>
                      ${!this.readonly
                        ? html`
                            <app-button
                              size="xs"
                              variant="icon"
                              action="delete"
                              title="${t.viewTexts.attachments.removeButton}"
                              @click="${() => this.handleRemovePending(pending.tempId)}"
                            >
                              <span slot="start">${iconX(13)}</span>
                            </app-button>
                          `
                        : ''}
                    </div>
                  </div>
                `;
              })}
            </div>
          `}

      <app-modal
        ?open="${Boolean(this.previewingDoc)}"
        size="xl"
        title="${this.previewingDoc?.title || ''}"
        @close="${() => (this.previewingDoc = null)}"
      >
        ${this.previewingDoc
          ? html`
              <app-document-previewer
                .document="${this.previewingDoc}"
                .showHeader="${false}"
                height="480px"
              ></app-document-previewer>
            `
          : ''}
      </app-modal>

      <app-confirm-dialog
        .open="${Boolean(this.detachingDoc)}"
        size="sm"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.attachmentDetach.title}"
        action="${t.viewTexts.confirmDialogs.attachmentDetach.action(
          this.detachingDoc?.title || ''
        )}"
        result="${t.viewTexts.confirmDialogs.attachmentDetach.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.viewTexts.attachments.removeButton}"
        @cancel="${() => (this.detachingDoc = null)}"
        @confirm="${() => {
          if (this.detachingDoc) {
            const id = this.detachingDoc.id;
            this.detachingDoc = null;
            this.handleDetachExisting(id);
          }
        }}"
      ></app-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-project-attachments': AppProjectAttachments;
  }
}
