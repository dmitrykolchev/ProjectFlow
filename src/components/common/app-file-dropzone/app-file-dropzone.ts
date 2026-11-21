import { LitElement, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { SupportedLang } from '../../../types';
import { formatFileSize } from '../document-utils';
import { iconPaperclip, iconUpload, iconX } from '../icons';
import '../app-button/app-button';
import styles from './app-file-dropzone.css';

// details of the `files-selected` and `file-selected` events (AGENTS.md §6)
export interface FileDropzoneFilesDetail {
  files: File[];
}

export interface FileDropzoneFileDetail {
  file: File;
}

@customElement('app-file-dropzone')
export class AppFileDropzone extends LitElement {
  @property({ type: String }) accept: string = '';
  @property({ type: String, attribute: 'selected-file-name' }) selectedFileName: string = '';
  @property({ type: Number, attribute: 'selected-file-size' }) selectedFileSize: number = 0;
  @property({ type: Boolean }) compact: boolean = false;
  @property({ type: Boolean }) multiple: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) title: string = '';
  @property({ type: String }) hint: string = '';
  @property({ type: String, attribute: 'button-label' }) buttonLabel: string = '';
  @property({ type: String, attribute: 'clear-label' }) clearLabel: string = '';
  @property({ type: String, attribute: 'selected-label' }) selectedLabel: string = '';

  @state() private isDragging = false;
  @state() private currentLang: SupportedLang = store.customization.language;

  @query('input.file-input') private fileInput?: HTMLInputElement;

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

  private openFilePicker() {
    if (this.disabled) return;
    this.fileInput?.click();
  }

  private emitFiles(files: File[]) {
    if (!files.length || this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<FileDropzoneFilesDetail>('files-selected', {
        detail: { files },
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new CustomEvent<FileDropzoneFileDetail>('file-selected', {
        detail: { file: files[0] },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length > 0) {
      this.emitFiles(files);
    }
    input.value = '';
  }

  private handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.disabled) {
      this.isDragging = true;
    }
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.disabled) {
      this.isDragging = true;
    }
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const currentTarget = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as Node | null;
    if (!related || !currentTarget.contains(related)) {
      this.isDragging = false;
    }
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (this.disabled) return;
    const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      this.emitFiles(this.multiple ? files : [files[0]]);
    }
  }

  private handleClear(e: Event) {
    e.stopPropagation();
    if (this.fileInput) {
      this.fileInput.value = '';
    }
    this.dispatchEvent(
      new CustomEvent('file-cleared', {
        detail: {},
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const titleText = this.title || t.documents.dropzoneTitle;
    const hintText = this.hint || t.documents.dropzoneHint;
    const btnText = this.buttonLabel || t.documents.selectFileButton;
    const clearText = this.clearLabel || t.documents.clearFile;
    const selectedText = this.selectedLabel || t.documents.dropzoneSelected;

    return html`
      <div
        class="dropzone ${this.compact ? 'is-compact' : ''} ${this.isDragging ? 'is-dragging' : ''} ${this.disabled ? 'is-disabled' : ''}"
        role="button"
        tabindex="${this.disabled ? -1 : 0}"
        aria-disabled="${this.disabled ? 'true' : 'false'}"
        @click="${this.openFilePicker}"
        @keydown="${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openFilePicker();
          }
        }}"
        @dragenter="${this.handleDragEnter}"
        @dragover="${this.handleDragOver}"
        @dragleave="${this.handleDragLeave}"
        @drop="${this.handleDrop}"
      >
        <input
          class="file-input"
          type="file"
          accept="${this.accept}"
          ?multiple="${this.multiple}"
          ?disabled="${this.disabled}"
          @change="${this.handleInputChange}"
        />

        <div class="dz-main">
          <div class="dz-icon">${iconUpload(this.compact ? 16 : 20)}</div>
          <div class="dz-text-wrap">
            <div class="dz-title">${titleText}</div>
            ${!this.compact && hintText ? html`<div class="dz-hint">${hintText}</div>` : ''}
          </div>
        </div>

        ${this.selectedFileName
          ? html`
              <div class="selected-pill" @click="${(e: Event) => e.stopPropagation()}">
                ${iconPaperclip(13)}
                <span class="selected-label">${selectedText}:</span>
                <span class="selected-name" title="${this.selectedFileName}">${this.selectedFileName}</span>
                ${this.selectedFileSize > 0
                  ? html`<span class="selected-size">${formatFileSize(this.selectedFileSize, t)}</span>`
                  : ''}
                <button
                  type="button"
                  class="clear-btn"
                  title="${clearText}"
                  aria-label="${clearText}"
                  @click="${this.handleClear}"
                >
                  ${iconX(12)}
                </button>
              </div>
            `
          : html`
              <div class="dz-actions" @click="${(e: Event) => e.stopPropagation()}">
                <app-button
                  size="sm"
                  variant="secondary"
                  ?disabled="${this.disabled}"
                  @click="${this.openFilePicker}"
                >
                  <span>${btnText}</span>
                </app-button>
              </div>
            `}
      </div>
    `;
  }
}
