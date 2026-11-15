import { LitElement, PropertyValues, TemplateResult, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getTranslation } from '../../../i18n';
import { store } from '../../../state/store';
import { DocumentItem } from '../../../types';
import {
  dataUrlToBlobUrl,
  downloadDocumentFile,
  formatFileSize,
  formatJsonPretty,
  isImageMimeOrExt,
  isPdfMimeOrExt,
  isTextMimeOrExt,
  parseCsvRows,
} from '../document-utils';
import {
  iconCheck,
  iconChevronLeft,
  iconChevronRight,
  iconCopy,
  iconDownload,
  iconFile,
  iconFileCode,
  iconFileText,
  iconGrid,
  iconImage,
  iconMaximize,
  iconWrapText,
  iconZoomIn,
  iconZoomOut,
} from '../icons';
import '../app-button/app-button';
import '../app-empty-state/app-empty-state';
import '../app-status-chip/app-status-chip';
import styles from './app-document-previewer.css';

type PreviewKind = 'pdf' | 'image' | 'markdown' | 'csv' | 'json' | 'text' | 'binary';

@customElement('app-document-previewer')
export class AppDocumentPreviewer extends LitElement {
  @property({ attribute: false }) document: DocumentItem | null = null;
  @property({ attribute: false }) documents: DocumentItem[] = [];
  @property({ type: Boolean }) compact = false;
  @property({ type: Boolean, attribute: 'show-header' }) showHeader = true;
  @property({ type: Boolean, attribute: 'show-expand' }) showExpand = false;
  @property({ type: String }) height = '540px';

  @state() private currentLang = store.customization.language;
  @state() private zoom = 1;
  @state() private checkerboardBg = false;
  @state() private textViewMode: 'rendered' | 'raw' = 'rendered';
  @state() private showLineNumbers = true;
  @state() private wordWrap = true;
  @state() private copiedContent = false;
  @state() private pdfBlobUrl: string | null = null;

  private lastPdfKey = '';
  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
    this.syncPdfBlobUrl();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    this.revokePdfUrl();
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('document')) {
      const prev = changed.get('document') as DocumentItem | null | undefined;
      if (prev?.id !== this.document?.id) {
        this.zoom = 1;
        this.copiedContent = false;
        this.textViewMode = 'rendered';
      }
      this.syncPdfBlobUrl();
    }
  }

  private revokePdfUrl() {
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
      this.lastPdfKey = '';
    }
  }

  private syncPdfBlobUrl() {
    const doc = this.document;
    if (!doc || !isPdfMimeOrExt(doc.mimeType, doc.extension) || !doc.dataUrl) {
      this.revokePdfUrl();
      return;
    }
    const key = `${doc.id}:${doc.version}:${doc.dataUrl.slice(0, 64)}:${doc.dataUrl.length}`;
    if (key === this.lastPdfKey && this.pdfBlobUrl) return;
    this.revokePdfUrl();
    this.pdfBlobUrl = dataUrlToBlobUrl(doc.dataUrl, 'application/pdf');
    this.lastPdfKey = key;
  }

  private detectKind(doc: DocumentItem): PreviewKind {
    const ext = (doc.extension || '').toLowerCase();
    if (isPdfMimeOrExt(doc.mimeType, ext)) return 'pdf';
    if (isImageMimeOrExt(doc.mimeType, ext)) return 'image';
    if (ext === 'md' || ext === 'markdown' || doc.mimeType === 'text/markdown') return 'markdown';
    if (ext === 'csv' || ext === 'tsv' || doc.mimeType === 'text/csv') return 'csv';
    if (ext === 'json' || doc.mimeType === 'application/json') return 'json';
    if (isTextMimeOrExt(doc.mimeType, ext)) return 'text';
    return 'binary';
  }

  private resolveTextPayload(doc: DocumentItem): string {
    if (typeof doc.textContent === 'string' && doc.textContent.length > 0) {
      return doc.textContent;
    }
    if (!doc.dataUrl || !doc.dataUrl.startsWith('data:')) return '';
    try {
      const commaIdx = doc.dataUrl.indexOf(',');
      if (commaIdx === -1) return '';
      const meta = doc.dataUrl.slice(5, commaIdx);
      const dataPart = doc.dataUrl.slice(commaIdx + 1);
      if (/;base64/i.test(meta)) {
        const binary = atob(dataPart);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
      }
      return decodeURIComponent(dataPart);
    } catch {
      return '';
    }
  }

  private resolveImageSrc(doc: DocumentItem): string | null {
    if (doc.dataUrl) return doc.dataUrl;
    if ((doc.extension || '').toLowerCase() === 'svg' && doc.textContent) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(doc.textContent)}`;
    }
    return null;
  }

  private emitSelectDocument(doc: DocumentItem) {
    this.dispatchEvent(
      new CustomEvent('select-document', {
        detail: { document: doc },
        bubbles: true,
        composed: true,
      })
    );
  }

  private emitExpand(doc: DocumentItem) {
    this.dispatchEvent(
      new CustomEvent('expand', {
        detail: { document: doc },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleCopyText(text: string) {
    navigator.clipboard?.writeText(text);
    this.copiedContent = true;
    window.setTimeout(() => {
      this.copiedContent = false;
    }, 1500);
  }

  private renderInlineMarkdown(text: string): (string | TemplateResult)[] {
    const parts: (string | TemplateResult)[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(html`<strong>${token.slice(2, -2)}</strong>`);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(html`<code class="md-inline-code">${token.slice(1, -1)}</code>`);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  }

  private renderMarkdownContent(raw: string): TemplateResult {
    const lines = (raw || '').replace(/\r\n/g, '\n').split('\n');
    const blocks: TemplateResult[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      if (trimmed.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        blocks.push(html`<pre class="md-code-block">${codeLines.join('\n')}</pre>`);
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        blocks.push(html`<hr />`);
        i++;
        continue;
      }

      if (trimmed.startsWith('### ')) {
        blocks.push(html`<h3>${this.renderInlineMarkdown(trimmed.slice(4))}</h3>`);
        i++;
        continue;
      }
      if (trimmed.startsWith('## ')) {
        blocks.push(html`<h2>${this.renderInlineMarkdown(trimmed.slice(3))}</h2>`);
        i++;
        continue;
      }
      if (trimmed.startsWith('# ')) {
        blocks.push(html`<h1>${this.renderInlineMarkdown(trimmed.slice(2))}</h1>`);
        i++;
        continue;
      }

      if (trimmed.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('> ')) {
          quoteLines.push(lines[i].trim().slice(2));
          i++;
        }
        blocks.push(html`<blockquote>${this.renderInlineMarkdown(quoteLines.join(' '))}</blockquote>`);
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        const items: TemplateResult[] = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
          const itemRaw = lines[i].trim().replace(/^[-*]\s+/, '');
          const checkMatch = itemRaw.match(/^\[( |x|X)\]\s+(.*)$/);
          if (checkMatch) {
            const done = checkMatch[1].toLowerCase() === 'x';
            items.push(html`
              <li class="checklist-item">
                <span class="check-box-pill ${done ? 'is-done' : ''}">${done ? iconCheck(11) : ''}</span>
                <span>${this.renderInlineMarkdown(checkMatch[2])}</span>
              </li>
            `);
          } else {
            items.push(html`<li>${this.renderInlineMarkdown(itemRaw)}</li>`);
          }
          i++;
        }
        blocks.push(html`<ul>${items}</ul>`);
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        const items: TemplateResult[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          const itemRaw = lines[i].trim().replace(/^\d+\.\s+/, '');
          items.push(html`<li>${this.renderInlineMarkdown(itemRaw)}</li>`);
          i++;
        }
        blocks.push(html`<ol>${items}</ol>`);
        continue;
      }

      blocks.push(html`<p>${this.renderInlineMarkdown(trimmed)}</p>`);
      i++;
    }

    return html`<div class="md-preview">${blocks}</div>`;
  }

  private renderCsvTable(raw: string): TemplateResult {
    const rows = parseCsvRows(raw);
    if (rows.length === 0) {
      return this.renderCodeLines(raw);
    }
    const headers = rows[0];
    const body = rows.slice(1);
    return html`
      <div class="csv-wrap">
        <table class="csv-table">
          <thead>
            <tr>
              <th class="csv-row-num">#</th>
              ${headers.map((cell) => html`<th>${cell}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${body.map(
              (row, rowIdx) => html`
                <tr>
                  <td class="csv-row-num">${rowIdx + 1}</td>
                  ${headers.map((_, colIdx) => html`<td>${row[colIdx] ?? ''}</td>`)}
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderCodeLines(raw: string): TemplateResult {
    const lines = (raw || '').replace(/\r\n/g, '\n').split('\n');
    return html`
      <div class="code-viewport ${this.wordWrap ? '' : 'no-wrap'}">
        ${lines.map(
          (line, idx) => html`
            <div class="code-line">
              ${this.showLineNumbers ? html`<span class="line-num">${idx + 1}</span>` : ''}
              <span class="line-code">${line || ' '}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const doc = this.document;

    if (!doc) {
      return html`
        <div class="empty-shell">
          <app-empty-state
            compact
            title="${t.documents.previewTitle}"
            description="${t.documents.previewerSelectPrompt}"
          ></app-empty-state>
        </div>
      `;
    }

    const kind = this.detectKind(doc);
    const extLabel = (doc.extension || 'file').slice(0, 4).toUpperCase();
    const docList = this.documents || [];
    const currentIdx = docList.findIndex((item) => item.id === doc.id);
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx >= 0 && currentIdx < docList.length - 1;

    const tileClass =
      kind === 'pdf'
        ? 'is-pdf'
        : kind === 'image'
        ? 'is-image'
        : kind !== 'binary'
        ? 'is-code'
        : '';
    const tileIcon =
      kind === 'image'
        ? iconImage(14)
        : kind === 'pdf'
        ? iconFileText(14)
        : kind !== 'binary'
        ? iconFileCode(14)
        : iconFile(14);

    const rawText =
      kind === 'markdown' || kind === 'csv' || kind === 'json' || kind === 'text'
        ? this.resolveTextPayload(doc)
        : '';
    const formattedText = kind === 'json' ? formatJsonPretty(rawText) : rawText;
    const lineCount = formattedText ? formattedText.replace(/\r\n/g, '\n').split('\n').length : 0;
    const imageSrc = kind === 'image' ? this.resolveImageSrc(doc) : null;

    return html`
      <div class="previewer-shell ${this.compact ? 'is-compact' : ''}">
        ${this.showHeader
          ? html`
              <header class="previewer-header">
                <div class="header-left">
                  <div class="ext-tile ${tileClass}">
                    ${tileIcon}
                    <span>${extLabel}</span>
                  </div>
                  <div class="header-titles">
                    <h4 class="doc-title" title="${doc.title}">${doc.title}</h4>
                    <div class="doc-meta-line">
                      <span class="mono">${doc.fileName}</span>
                      <span>·</span>
                      <span class="mono">v${doc.version}</span>
                      <span>·</span>
                      <span class="mono">${formatFileSize(doc.sizeBytes, t)}</span>
                      <app-status-chip
                        domain="document"
                        status="${doc.status}"
                        appearance="soft"
                        size="sm"
                      ></app-status-chip>
                    </div>
                  </div>
                </div>

                <div class="header-actions">
                  ${docList.length > 1 && currentIdx >= 0
                    ? html`
                        <div class="nav-pager">
                          <button
                            type="button"
                            class="tool-icon-btn"
                            title="${t.documents.prevDoc}"
                            ?disabled="${!hasPrev}"
                            @click="${() => hasPrev && this.emitSelectDocument(docList[currentIdx - 1])}"
                          >
                            ${iconChevronLeft(14)}
                          </button>
                          <span class="nav-index">${currentIdx + 1}/${docList.length}</span>
                          <button
                            type="button"
                            class="tool-icon-btn"
                            title="${t.documents.nextDoc}"
                            ?disabled="${!hasNext}"
                            @click="${() => hasNext && this.emitSelectDocument(docList[currentIdx + 1])}"
                          >
                            ${iconChevronRight(14)}
                          </button>
                        </div>
                      `
                    : ''}
                  ${this.showExpand
                    ? html`
                        <button
                          type="button"
                          class="tool-icon-btn"
                          title="${t.documents.expandPreview}"
                          @click="${() => this.emitExpand(doc)}"
                        >
                          ${iconMaximize(14)}
                        </button>
                      `
                    : ''}
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => {
                      downloadDocumentFile(doc);
                      this.dispatchEvent(
                        new CustomEvent('download', {
                          detail: { document: doc },
                          bubbles: true,
                          composed: true,
                        })
                      );
                    }}"
                  >
                    <span slot="icon-start">${iconDownload(14)}</span>
                    <span>${t.documents.downloadFile}</span>
                  </app-button>
                </div>
              </header>
            `
          : ''}

        ${this.renderToolbar(kind, doc, formattedText, lineCount, imageSrc, t)}

        <div class="viewport" style="height: ${this.height};">
          ${this.renderViewportBody(kind, doc, formattedText, imageSrc, t)}
        </div>
      </div>
    `;
  }

  private renderToolbar(
    kind: PreviewKind,
    _doc: DocumentItem,
    formattedText: string,
    lineCount: number,
    imageSrc: string | null,
    t: ReturnType<typeof getTranslation>
  ) {
    if (kind === 'pdf') {
      return html`
        <div class="toolbar-bar">
          <div class="toolbar-group">
            <span class="toolbar-pill-info">${t.documents.pdfViewerTitle}</span>
          </div>
          <div class="toolbar-group">
            <span class="toolbar-pill-info">PDF 1.4</span>
          </div>
        </div>
      `;
    }

    if (kind === 'image' && imageSrc) {
      const pct = Math.round(this.zoom * 100);
      return html`
        <div class="toolbar-bar">
          <div class="toolbar-group">
            <button
              type="button"
              class="tool-icon-btn"
              title="${t.documents.zoomOut}"
              ?disabled="${this.zoom <= 0.5}"
              @click="${() => (this.zoom = Math.max(0.5, +(this.zoom - 0.25).toFixed(2)))}"
            >
              ${iconZoomOut(14)}
            </button>
            <button
              type="button"
              class="tool-btn mono"
              title="${t.documents.zoomReset}"
              @click="${() => (this.zoom = 1)}"
            >
              ${pct}%
            </button>
            <button
              type="button"
              class="tool-icon-btn"
              title="${t.documents.zoomIn}"
              ?disabled="${this.zoom >= 2.0}"
              @click="${() => (this.zoom = Math.min(2.0, +(this.zoom + 0.25).toFixed(2)))}"
            >
              ${iconZoomIn(14)}
            </button>
          </div>
          <div class="toolbar-group">
            <button
              type="button"
              class="tool-btn ${this.checkerboardBg ? 'is-active' : ''}"
              title="${t.documents.toggleGridBg}"
              @click="${() => (this.checkerboardBg = !this.checkerboardBg)}"
            >
              ${iconGrid(13)}
              <span>${t.documents.toggleGridBg}</span>
            </button>
          </div>
        </div>
      `;
    }

    if ((kind === 'markdown' || kind === 'csv' || kind === 'json' || kind === 'text') && formattedText) {
      const isRichToggle = kind === 'markdown' || kind === 'csv';
      const showingSource = !isRichToggle || this.textViewMode === 'raw';

      return html`
        <div class="toolbar-bar">
          <div class="toolbar-group">
            ${isRichToggle
              ? html`
                  <div class="mode-pills">
                    <button
                      type="button"
                      class="mode-pill ${this.textViewMode === 'rendered' ? 'is-active' : ''}"
                      @click="${() => (this.textViewMode = 'rendered')}"
                    >
                      ${kind === 'csv' ? t.documents.tableView : t.documents.renderedView}
                    </button>
                    <button
                      type="button"
                      class="mode-pill ${this.textViewMode === 'raw' ? 'is-active' : ''}"
                      @click="${() => (this.textViewMode = 'raw')}"
                    >
                      ${t.documents.rawView}
                    </button>
                  </div>
                `
              : ''}

            ${showingSource
              ? html`
                  <button
                    type="button"
                    class="tool-btn ${this.showLineNumbers ? 'is-active' : ''}"
                    @click="${() => (this.showLineNumbers = !this.showLineNumbers)}"
                  >
                    <span>#</span>
                    <span>${t.documents.lineNumbers}</span>
                  </button>
                  <button
                    type="button"
                    class="tool-btn ${this.wordWrap ? 'is-active' : ''}"
                    @click="${() => (this.wordWrap = !this.wordWrap)}"
                  >
                    ${iconWrapText(13)}
                    <span>${t.documents.wordWrap}</span>
                  </button>
                `
              : ''}
          </div>

          <div class="toolbar-group">
            <span class="toolbar-pill-info">${t.documents.linesCount(lineCount)}</span>
            <button
              type="button"
              class="tool-btn ${this.copiedContent ? 'is-active' : ''}"
              @click="${() => this.handleCopyText(formattedText)}"
            >
              ${this.copiedContent ? iconCheck(13) : iconCopy(13)}
              <span>
                ${this.copiedContent
                  ? t.viewTexts.documents.copiedContent
                  : t.viewTexts.documents.copyContent}
              </span>
            </button>
          </div>
        </div>
      `;
    }

    return '';
  }

  private renderViewportBody(
    kind: PreviewKind,
    doc: DocumentItem,
    formattedText: string,
    imageSrc: string | null,
    t: ReturnType<typeof getTranslation>
  ) {
    if (kind === 'pdf') {
      if (this.pdfBlobUrl) {
        return html`
          <iframe
            class="pdf-frame"
            src="${this.pdfBlobUrl}#toolbar=1&navpanes=0"
            title="${doc.title}"
          ></iframe>
        `;
      }
      return this.renderFallback(doc, t.documents.pdfUnavailableHint, t);
    }

    if (kind === 'image' && imageSrc) {
      return html`
        <div class="image-viewport ${this.checkerboardBg ? 'has-checkerboard' : ''}">
          <div class="image-stage" style="zoom: ${this.zoom};">
            <img src="${imageSrc}" alt="${doc.title}" />
          </div>
        </div>
      `;
    }

    if (kind === 'markdown' && formattedText) {
      return this.textViewMode === 'rendered'
        ? this.renderMarkdownContent(formattedText)
        : this.renderCodeLines(formattedText);
    }

    if (kind === 'csv' && formattedText) {
      return this.textViewMode === 'rendered'
        ? this.renderCsvTable(formattedText)
        : this.renderCodeLines(formattedText);
    }

    if ((kind === 'json' || kind === 'text') && formattedText) {
      return this.renderCodeLines(formattedText);
    }

    return this.renderFallback(doc, t.documents.binaryPreviewHint, t);
  }

  private renderFallback(
    doc: DocumentItem,
    hint: string,
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <div class="fallback-box">
        <div class="fallback-icon">${iconFile(26)}</div>
        <h4 class="fallback-title">${t.documents.previewNotAvailable}</h4>
        <p class="fallback-desc">${hint}</p>
        <div class="doc-meta-line">
          <span class="mono">${doc.fileName}</span>
          <span>·</span>
          <span class="mono">${doc.mimeType}</span>
          <span>·</span>
          <span class="mono">${formatFileSize(doc.sizeBytes, t)}</span>
        </div>
        <app-button variant="secondary" size="sm" @click="${() => downloadDocumentFile(doc)}">
          <span slot="icon-start">${iconDownload(14)}</span>
          <span>${t.documents.downloadFile}</span>
        </app-button>
      </div>
    `;
  }
}
