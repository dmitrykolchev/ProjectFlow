import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  downloadDocumentFile,
  formatFileSize,
  isImageMimeOrExt,
  isTextMimeOrExt,
  readBrowserFile,
  ReadFilePayload,
} from '../../common/document-utils';
import {
  DocumentCategory,
  DocumentItem,
  DocumentScope,
  DocumentStatus,
} from '../../../types';
import {
  iconCopy,
  iconDownload,
  iconEdit,
  iconEye,
  iconFile,
  iconFileCode,
  iconFolderOpen,
  iconImage,
  iconPlus,
  iconTrash,
  iconUpload,
} from '../../common/icons';
import '../../common/app-avatar/app-avatar';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-file-dropzone/app-file-dropzone';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-input/app-input';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-pagination/app-pagination';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-textarea/app-textarea';
import '../../dashboard/app-metric-card/app-metric-card';
import { paginateItems } from '../../common/paginate';
import { eventValue } from '../../common/event-value';
import styles from './app-documents.css';

@customElement('app-documents')
export class AppDocuments extends LitElement {
  @state() private documents: DocumentItem[] = store.documents;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private viewMode: 'cards' | 'table' = 'cards';
  @state() private scopeFilter: 'all' | DocumentScope = store.documentFilterScope;
  @state() private categoryFilter: 'all' | DocumentCategory = 'all';
  @state() private statusFilter: 'all' | DocumentStatus = 'all';
  @state() private companyFilter: string = store.documentFilterCompanyId;
  @state() private projectFilter: string = store.documentFilterProjectId;

  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;

  // Create / Edit Modal
  @state() private modalOpen = false;
  @state() private editingDocId: string | null = null;
  @state() private formTitle = '';
  @state() private formFileName = '';
  @state() private formExtension = 'txt';
  @state() private formMimeType = 'text/plain';
  @state() private formSizeBytes = 0;
  @state() private formDataUrl: string | undefined = undefined;
  @state() private formTextContent = '';
  @state() private formTruncatedNote = '';
  @state() private formCategory: DocumentCategory = 'spec';
  @state() private formStatus: DocumentStatus = 'draft';
  @state() private formScope: DocumentScope = 'company';
  @state() private formCompanyId = '';
  @state() private formProjectId = '';
  @state() private formContractId = '';
  @state() private formCounterpartyId = '';
  @state() private formTaskId = '';
  @state() private formUploadedById = '';
  @state() private formTags = '';
  @state() private formDescription = '';
  @state() private formVersionNote = '';
  @state() private formError = '';

  // Preview & Versioning Modal
  @state() private previewDoc: DocumentItem | null = null;
  @state() private copiedContent = false;
  @state() private newVersionPayload: ReadFilePayload | null = null;
  @state() private newVersionNote = '';
  @state() private versionTruncatedNote = '';

  // Delete Confirm
  @state() private deletingDoc: DocumentItem | null = null;

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
    this.documents = store.documents;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.scopeFilter = store.documentFilterScope;
    this.companyFilter = store.documentFilterCompanyId;
    this.projectFilter = store.documentFilterProjectId;
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
    if (this.previewDoc) {
      this.previewDoc = store.documents.find((d) => d.id === this.previewDoc!.id) || null;
    }
  }

  private getFilteredDocuments(): DocumentItem[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.documents.filter((doc) => {
      if (this.scopeFilter !== 'all' && doc.scope !== this.scopeFilter) return false;
      if (this.categoryFilter !== 'all' && doc.category !== this.categoryFilter) return false;
      if (this.statusFilter !== 'all' && doc.status !== this.statusFilter) return false;
      if (this.companyFilter !== 'all' && doc.companyId !== this.companyFilter) return false;
      if (this.projectFilter !== 'all' && doc.projectId !== this.projectFilter) return false;
      if (!query) return true;
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.fileName.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }

  private countLinkedEntities(): number {
    const keys = new Set<string>();
    for (const d of this.documents) {
      if (d.companyId) keys.add(`c:${d.companyId}`);
      if (d.projectId) keys.add(`p:${d.projectId}`);
      if (d.contractId) keys.add(`ctr:${d.contractId}`);
      if (d.counterpartyId) keys.add(`cp:${d.counterpartyId}`);
      if (d.taskId) keys.add(`t:${d.taskId}`);
    }
    return keys.size;
  }

  private getLinkedEntityLabel(
    doc: DocumentItem,
    t: ReturnType<typeof getTranslation>
  ): { label: string; onClick?: () => void } {
    if (doc.projectId) {
      const proj = store.projects.find((p) => p.id === doc.projectId);
      if (proj) {
        return {
          label: `[${proj.key}] ${proj.name}`,
          onClick: () => store.openProjectDetail(proj.id),
        };
      }
    }
    if (doc.contractId) {
      const ctr = store.contracts.find((c) => c.id === doc.contractId);
      if (ctr) {
        return {
          label: `${ctr.number} · ${ctr.title}`,
          onClick: () => store.openContractDetail(ctr.id),
        };
      }
    }
    if (doc.companyId) {
      const comp = store.companies.find((c) => c.id === doc.companyId);
      if (comp) {
        return {
          label: comp.name,
          onClick: () => store.openCompanyDetail(comp.id),
        };
      }
    }
    if (doc.counterpartyId) {
      const cp = store.counterparties.find((c) => c.id === doc.counterpartyId);
      if (cp) {
        return {
          label: cp.name,
          onClick: () => store.openCounterpartyDetail(cp.id),
        };
      }
    }
    if (doc.taskId) {
      const task = store.tasks.find((tk) => tk.id === doc.taskId);
      return {
        label: task ? `${task.id} · ${task.title}` : doc.taskId,
        onClick: task ? () => store.openTaskDetail(task.id) : undefined,
      };
    }
    return { label: t.documents.scopes[doc.scope] };
  }

  private renderFileTypeTile(doc: DocumentItem) {
    const isImg = isImageMimeOrExt(doc.mimeType, doc.extension);
    const isCode = !isImg && isTextMimeOrExt(doc.mimeType, doc.extension);
    const cls = isImg ? 'is-image' : isCode ? 'is-code' : '';
    const icon = isImg ? iconImage(17) : isCode ? iconFileCode(17) : iconFile(17);

    return html`
      <div class="file-type-tile ${cls}">
        ${icon}
        <span class="ext-text">${(doc.extension || 'doc').slice(0, 4)}</span>
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFilteredDocuments();
    const totalBytes = this.documents.reduce((sum, d) => sum + (Number(d.sizeBytes) || 0), 0);
    const approvedCount = this.documents.filter((d) => d.status === 'approved').length;
    const linkedEntities = this.countLinkedEntities();

    const scopeOptions = [
      { value: 'all', label: t.documents.allScopes },
      ...(Object.keys(t.documents.scopes) as DocumentScope[]).map((k) => ({
        value: k,
        label: t.documents.scopes[k],
      })),
    ];
    const categoryOptions = [
      { value: 'all', label: t.documents.allCategories },
      ...(Object.keys(t.documents.categories) as DocumentCategory[]).map((k) => ({
        value: k,
        label: t.documents.categories[k],
      })),
    ];
    const statusOptions = [
      { value: 'all', label: t.documents.allStatuses },
      ...(Object.keys(t.documents.statuses) as DocumentStatus[]).map((k) => ({
        value: k,
        label: t.documents.statuses[k],
      })),
    ];
    const companyOptions = [
      { value: 'all', label: t.documents.allCompanies },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];
    const projectOptions = [
      { value: 'all', label: t.documents.allProjects },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}` })),
    ];

    return html`
      <app-page-header
        title="${t.documents.title}"
        subtitle="${t.viewTexts.pageSubtitles.documents}"
      >
        <span slot="icon">${iconFolderOpen(28)}</span>
        <app-button
          slot="actions"
          variant="primary"
          size="md"
          @click="${() => this.openCreateModal()}"
        >
          <span slot="icon-start">${iconUpload(16)}</span>
          <span>${t.documents.uploadDocument}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${t.documents.totalFiles}"
          value="${this.documents.length}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.documents.totalSize}"
          value="${formatFileSize(totalBytes, t)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.documents.approvedFiles}"
          value="${approvedCount}"
          valueColor="var(--color-success, #10b981)"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.documents.linkedEntities}"
          value="${linkedEntities}"
        ></app-metric-card>
      </app-kpi-strip>

      <app-file-dropzone
        compact
        @file-selected="${this.handleQuickDropzoneSelect}"
      ></app-file-dropzone>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${t.documents.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        show-reset
        .filters="${[
          { key: 'scope', options: scopeOptions },
          { key: 'category', options: categoryOptions },
          { key: 'status', options: statusOptions },
          { key: 'company', options: companyOptions },
          { key: 'project', options: projectOptions },
        ]}"
        .values="${{
          scope: this.scopeFilter,
          category: this.categoryFilter,
          status: this.statusFilter,
          company: this.companyFilter,
          project: this.projectFilter,
        }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1;
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          const val = eventValue(e);
          if (e.detail.key === 'scope') {
            this.scopeFilter = val as 'all' | DocumentScope;
            store.setDocumentFilters({ scope: this.scopeFilter });
          } else if (e.detail.key === 'category') {
            this.categoryFilter = val as 'all' | DocumentCategory;
          } else if (e.detail.key === 'status') {
            this.statusFilter = val as 'all' | DocumentStatus;
          } else if (e.detail.key === 'company') {
            this.companyFilter = val;
            store.setDocumentFilters({ companyId: val });
          } else if (e.detail.key === 'project') {
            this.projectFilter = val;
            store.setDocumentFilters({ projectId: val });
          }
          this.currentPage = 1;
        }}"
        @reset="${() => {
          this.localSearch = '';
          this.scopeFilter = 'all';
          this.categoryFilter = 'all';
          this.statusFilter = 'all';
          this.companyFilter = 'all';
          this.projectFilter = 'all';
          this.currentPage = 1;
          store.setDocumentFilters({ scope: 'all', companyId: 'all', projectId: 'all' });
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.viewMode}"
          .options="${[
            { value: 'cards', label: t.documents.viewCards },
            { value: 'table', label: t.documents.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.viewMode = eventValue(e) as 'cards' | 'table';
            this.currentPage = 1;
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`
            <app-empty-state
              title="${t.documents.emptyNoDocuments}"
              description="${t.documents.emptyHint}"
            >
              <app-button
                slot="action"
                variant="primary"
                @click="${() => this.openCreateModal()}"
              >
                <span slot="icon-start">${iconPlus(15)}</span>
                <span>${t.documents.uploadDocument}</span>
              </app-button>
            </app-empty-state>
          `
        : this.viewMode === 'cards'
        ? this.renderCardsGrid(filtered, t)
        : this.renderTableView(filtered, t)}

      ${this.renderFormModal(t)}
      ${this.renderPreviewModal(t)}
      ${this.renderDeleteDialog(t)}
    `;
  }

  private renderCardsGrid(filtered: DocumentItem[], t: ReturnType<typeof getTranslation>) {
    const paged = paginateItems(filtered, this.currentPage, this.cardPageSize);

    return html`
      <div class="cards-grid">
        ${paged.items.map((doc) => {
          const uploader = store.users.find((u) => u.id === doc.uploadedById);
          const linked = this.getLinkedEntityLabel(doc, t);

          return html`
            <article class="doc-card">
              <div class="card-top">
                <div class="doc-identity">
                  ${this.renderFileTypeTile(doc)}
                  <div class="doc-titles">
                    <button
                      type="button"
                      class="doc-title-btn"
                      @click="${() => this.openPreviewModal(doc)}"
                    >
                      ${doc.title}
                    </button>
                    <div class="doc-filename" title="${doc.fileName}">${doc.fileName}</div>
                  </div>
                </div>
                <app-status-chip domain="document" status="${doc.status}" appearance="soft" size="sm"></app-status-chip>
              </div>

              <p class="doc-desc">${doc.description || '—'}</p>

              <div class="doc-meta-box">
                <div class="meta-item">
                  <span class="meta-label">${t.documents.fieldCategory}</span>
                  <span class="meta-value" title="${t.documents.categories[doc.category]}">
                    ${t.documents.categories[doc.category]}
                  </span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.documents.versionLabel} / ${t.documents.sizeLabel}</span>
                  <span class="meta-value mono">
                    v${doc.version} · ${formatFileSize(doc.sizeBytes, t)}
                  </span>
                </div>
                <div class="meta-item" style="grid-column: span 2;">
                  <span class="meta-label">${t.documents.linkedToLabel} (${t.documents.scopes[doc.scope]})</span>
                  ${linked.onClick
                    ? html`
                        <button
                          type="button"
                          class="link-btn"
                          @click="${linked.onClick}"
                        >
                          ${linked.label}
                        </button>
                      `
                    : html`<span class="meta-value">${linked.label}</span>`}
                </div>
              </div>

              ${doc.tags.length > 0
                ? html`
                    <div class="tags-row">
                      ${doc.tags.slice(0, 4).map((tag) => html`<span class="tag-chip">#${tag}</span>`)}
                    </div>
                  `
                : ''}

              <div class="card-footer">
                <div class="uploader-info">
                  ${uploader
                    ? html`<app-avatar size="xs" initials="${uploader.avatar}" title="${uploader.name}"></app-avatar>`
                    : ''}
                  <span class="uploader-name">${uploader?.name || doc.uploadedById}</span>
                  <span class="mono">· ${doc.updatedAt.slice(0, 10)}</span>
                </div>

                <div class="card-actions">
                  <button
                    type="button"
                    class="icon-btn"
                    title="${t.documents.previewTitle}"
                    @click="${() => this.openPreviewModal(doc)}"
                  >
                    ${iconEye(14)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    title="${t.documents.downloadFile}"
                    @click="${() => downloadDocumentFile(doc)}"
                  >
                    ${iconDownload(14)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    title="${t.common.edit}"
                    @click="${() => this.openEditModal(doc)}"
                  >
                    ${iconEdit(14)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn danger"
                    title="${t.common.delete}"
                    @click="${() => (this.deletingDoc = doc)}"
                  >
                    ${iconTrash(14)}
                  </button>
                </div>
              </div>
            </article>
          `;
        })}
      </div>

      <app-pagination
        layout-mode="cards"
        .totalItems="${paged.totalItems}"
        .page="${paged.page}"
        .pageSize="${paged.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page;
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1;
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderTableView(filtered: DocumentItem[], t: ReturnType<typeof getTranslation>) {
    const paged = paginateItems(filtered, this.currentPage, this.tablePageSize);

    return html`
      <div class="table-card">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t.viewTexts.documents.thFile}</th>
                <th>${t.viewTexts.documents.thScopeLink}</th>
                <th>${t.viewTexts.documents.thCategory}</th>
                <th>${t.viewTexts.documents.thVersionSize}</th>
                <th>${t.viewTexts.documents.thUpdated}</th>
                <th>${t.viewTexts.documents.thStatus}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${paged.items.map((doc) => {
                const linked = this.getLinkedEntityLabel(doc, t);
                const uploader = store.users.find((u) => u.id === doc.uploadedById);

                return html`
                  <tr>
                    <td>
                      <div class="table-doc-cell">
                        ${this.renderFileTypeTile(doc)}
                        <div class="doc-titles">
                          <button
                            type="button"
                            class="doc-title-btn"
                            @click="${() => this.openPreviewModal(doc)}"
                          >
                            ${doc.title}
                          </button>
                          <span class="doc-filename">${doc.fileName}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column; gap: 0.12rem; max-width: 240px;">
                        <span style="font-size: 0.7rem; color: var(--text-muted);">
                          ${t.documents.scopes[doc.scope]}
                        </span>
                        ${linked.onClick
                          ? html`
                              <button type="button" class="link-btn" @click="${linked.onClick}">
                                ${linked.label}
                              </button>
                            `
                          : html`<span>${linked.label}</span>`}
                      </div>
                    </td>
                    <td>${t.documents.categories[doc.category]}</td>
                    <td class="mono">
                      v${doc.version} · ${formatFileSize(doc.sizeBytes, t)}
                    </td>
                    <td>
                      <div class="mono">${doc.updatedAt.slice(0, 10)}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">
                        ${uploader?.name || doc.uploadedById}
                      </div>
                    </td>
                    <td>
                      <app-status-chip domain="document" status="${doc.status}" appearance="soft" size="sm"></app-status-chip>
                    </td>
                    <td>
                      <div class="card-actions" style="justify-content: flex-end;">
                        <button
                          type="button"
                          class="icon-btn"
                          title="${t.documents.previewTitle}"
                          @click="${() => this.openPreviewModal(doc)}"
                        >
                          ${iconEye(14)}
                        </button>
                        <button
                          type="button"
                          class="icon-btn"
                          title="${t.documents.downloadFile}"
                          @click="${() => downloadDocumentFile(doc)}"
                        >
                          ${iconDownload(14)}
                        </button>
                        <button
                          type="button"
                          class="icon-btn"
                          title="${t.common.edit}"
                          @click="${() => this.openEditModal(doc)}"
                        >
                          ${iconEdit(14)}
                        </button>
                        <button
                          type="button"
                          class="icon-btn danger"
                          title="${t.common.delete}"
                          @click="${() => (this.deletingDoc = doc)}"
                        >
                          ${iconTrash(14)}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>

        <app-pagination
          variant="bare"
          layout-mode="table"
          .totalItems="${paged.totalItems}"
          .page="${paged.page}"
          .pageSize="${paged.pageSize}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page;
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1;
            store.setTablePageSize(e.detail.pageSize);
          }}"
        ></app-pagination>
      </div>
    `;
  }

  private renderFormModal(t: ReturnType<typeof getTranslation>) {
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
    const companyOptions = [
      { value: '', label: t.documents.scopeNone },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];
    const projectOptions = [
      { value: '', label: t.documents.scopeNone },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}` })),
    ];
    const contractOptions = [
      { value: '', label: t.documents.scopeNone },
      ...store.contracts.map((c) => ({ value: c.id, label: `${c.number} · ${c.title}` })),
    ];
    const counterpartyOptions = [
      { value: '', label: t.documents.scopeNone },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];
    const taskOptions = [
      { value: '', label: t.documents.scopeNone },
      ...store.tasks.slice(0, 80).map((tk) => ({ value: tk.id, label: `${tk.id} · ${tk.title}` })),
    ];
    const userOptions = store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }));

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingDocId ? t.documents.editDocument : t.documents.uploadDocument}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${!this.editingDocId
            ? html`
                <app-file-dropzone
                  selected-file-name="${this.formFileName}"
                  selected-file-size="${this.formSizeBytes}"
                  @file-selected="${this.handleModalDropzoneSelect}"
                  @file-cleared="${() => {
                    this.formFileName = '';
                    this.formSizeBytes = 0;
                    this.formDataUrl = undefined;
                    this.formTruncatedNote = '';
                  }}"
                ></app-file-dropzone>
              `
            : ''}

          ${this.formTruncatedNote
            ? html`<div class="note-banner">${this.formTruncatedNote}</div>`
            : ''}

          <app-form-grid>
            <div>
              <app-input
                label="${t.documents.fieldTitle}"
                .value="${this.formTitle}"
                required
                error="${this.formError}"
                @input="${(e: CustomEvent<{ value: string }>) => {
                  this.formTitle = eventValue(e);
                  this.formError = '';
                }}"
              ></app-input>
            </div>
            <div>
              <app-input
                label="${t.documents.fieldFileName}"
                .value="${this.formFileName}"
                @input="${(e: CustomEvent<{ value: string }>) => (this.formFileName = eventValue(e))}"
              ></app-input>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldCategory}"
                .value="${this.formCategory}"
                .options="${categoryOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.formCategory = eventValue(e) as DocumentCategory)}"
              ></app-select>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldStatus}"
                .value="${this.formStatus}"
                .options="${statusOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.formStatus = eventValue(e) as DocumentStatus)}"
              ></app-select>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldScope}"
                .value="${this.formScope}"
                .options="${scopeOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.formScope = eventValue(e) as DocumentScope)}"
              ></app-select>
            </div>
            <div>
              ${this.formScope === 'company'
                ? html`
                    <app-select
                      label="${t.documents.fieldCompany}"
                      .value="${this.formCompanyId}"
                      .options="${companyOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = eventValue(e))}"
                    ></app-select>
                  `
                : this.formScope === 'project'
                ? html`
                    <app-select
                      label="${t.documents.fieldProject}"
                      .value="${this.formProjectId}"
                      .options="${projectOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.formProjectId = eventValue(e))}"
                    ></app-select>
                  `
                : this.formScope === 'contract'
                ? html`
                    <app-select
                      label="${t.documents.fieldContract}"
                      .value="${this.formContractId}"
                      .options="${contractOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.formContractId = eventValue(e))}"
                    ></app-select>
                  `
                : this.formScope === 'counterparty'
                ? html`
                    <app-select
                      label="${t.documents.fieldCounterparty}"
                      .value="${this.formCounterpartyId}"
                      .options="${counterpartyOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.formCounterpartyId = eventValue(e))}"
                    ></app-select>
                  `
                : this.formScope === 'task'
                ? html`
                    <app-select
                      label="${t.documents.fieldTask}"
                      .value="${this.formTaskId}"
                      .options="${taskOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.formTaskId = eventValue(e))}"
                    ></app-select>
                  `
                : html`
                    <app-select
                      label="${t.documents.fieldCompany}"
                      .value="${this.formCompanyId}"
                      .options="${companyOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = eventValue(e))}"
                    ></app-select>
                  `}
            </div>
            <div>
              <app-select
                label="${t.documents.fieldUploadedBy}"
                .value="${this.formUploadedById}"
                .options="${userOptions}"
                @change="${(e: CustomEvent<{ value: string }>) => (this.formUploadedById = eventValue(e))}"
              ></app-select>
            </div>
            <div>
              <app-input
                label="${t.documents.fieldTags}"
                .value="${this.formTags}"
                @input="${(e: CustomEvent<{ value: string }>) => (this.formTags = eventValue(e))}"
              ></app-input>
            </div>
            <div class="col-span-2">
              <app-textarea
                label="${t.documents.fieldDescription}"
                .value="${this.formDescription}"
                rows="2"
                @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = eventValue(e))}"
              ></app-textarea>
            </div>
            <div class="col-span-2">
              <app-textarea
                label="${t.documents.fieldTextContent}"
                hint="${t.viewTexts.documents.charsLimitHint}"
                .value="${this.formTextContent}"
                rows="4"
                @input="${(e: CustomEvent<{ value: string }>) => (this.formTextContent = eventValue(e))}"
              ></app-textarea>
            </div>
            ${!this.editingDocId
              ? html`
                  <div class="col-span-2">
                    <app-input
                      label="${t.documents.fieldVersionNote}"
                      .value="${this.formVersionNote}"
                      @input="${(e: CustomEvent<{ value: string }>) => (this.formVersionNote = eventValue(e))}"
                    ></app-input>
                  </div>
                `
              : ''}
          </app-form-grid>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveModal}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderPreviewModal(t: ReturnType<typeof getTranslation>) {
    const doc = this.previewDoc;
    if (!doc) return '';

    const uploader = store.users.find((u) => u.id === doc.uploadedById);
    const linked = this.getLinkedEntityLabel(doc, t);
    const canShowImage = Boolean(doc.dataUrl) && isImageMimeOrExt(doc.mimeType, doc.extension);
    const canShowText = Boolean(doc.textContent) && isTextMimeOrExt(doc.mimeType, doc.extension);

    return html`
      <app-modal
        open
        size="lg"
        title="${doc.title}"
        @close="${() => (this.previewDoc = null)}"
      >
        <div class="preview-layout">
          <div class="preview-meta-grid">
            <div class="meta-item">
              <span class="meta-label">${t.documents.fieldFileName}</span>
              <span class="meta-value mono" title="${doc.fileName}">${doc.fileName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${t.documents.versionLabel} / ${t.documents.sizeLabel}</span>
              <span class="meta-value mono">v${doc.version} · ${formatFileSize(doc.sizeBytes, t)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${t.documents.fieldStatus}</span>
              <div>
                <app-status-chip domain="document" status="${doc.status}" appearance="soft" size="sm"></app-status-chip>
              </div>
            </div>
            <div class="meta-item">
              <span class="meta-label">${t.documents.fieldCategory}</span>
              <span class="meta-value">${t.documents.categories[doc.category]}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${t.documents.uploadedByLabel}</span>
              <span class="meta-value">${uploader?.name || doc.uploadedById}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${t.documents.linkedToLabel}</span>
              ${linked.onClick
                ? html`
                    <button
                      type="button"
                      class="link-btn"
                      @click="${() => {
                        this.previewDoc = null;
                        linked.onClick?.();
                      }}"
                    >
                      ${linked.label}
                    </button>
                  `
                : html`<span class="meta-value">${linked.label}</span>`}
            </div>
          </div>

          ${doc.description ? html`<p class="doc-desc" style="-webkit-line-clamp: unset;">${doc.description}</p>` : ''}

          ${canShowImage
            ? html`
                <div class="preview-image-frame">
                  <img src="${doc.dataUrl!}" alt="${doc.title}" />
                </div>
              `
            : canShowText
            ? html`
                <div class="preview-code-wrap">
                  <div style="display: flex; justify-content: flex-end;">
                    <app-button
                      size="sm"
                      variant="outline"
                      @click="${() => {
                        navigator.clipboard?.writeText(doc.textContent || '');
                        this.copiedContent = true;
                        window.setTimeout(() => (this.copiedContent = false), 1500);
                      }}"
                    >
                      <span slot="icon-start">${iconCopy(13)}</span>
                      <span>
                        ${this.copiedContent
                          ? t.viewTexts.documents.copiedContent
                          : t.viewTexts.documents.copyContent}
                      </span>
                    </app-button>
                  </div>
                  <pre class="preview-code">${doc.textContent}</pre>
                </div>
              `
            : html`
                <div class="preview-binary-box">
                  ${iconFile(28)}
                  <strong style="color: var(--text-primary);">${t.documents.previewNotAvailable}</strong>
                  <span>${t.documents.binaryPreviewHint}</span>
                </div>
              `}

          <div class="versions-section">
            <div class="versions-header">
              <h4 class="versions-title">
                ${t.documents.versionHistoryTitle} (${doc.versions?.length || 0})
              </h4>
            </div>

            <div class="version-upload-box">
              <app-file-dropzone
                compact
                selected-file-name="${this.newVersionPayload?.fileName || ''}"
                selected-file-size="${this.newVersionPayload?.sizeBytes || 0}"
                @file-selected="${this.handleVersionDropzoneSelect}"
                @file-cleared="${() => {
                  this.newVersionPayload = null;
                  this.versionTruncatedNote = '';
                }}"
              ></app-file-dropzone>

              ${this.versionTruncatedNote
                ? html`<div class="note-banner">${this.versionTruncatedNote}</div>`
                : ''}

              <div class="version-upload-controls">
                <div style="flex: 1; min-width: 200px;">
                  <app-input
                    label="${t.documents.fieldVersionNote}"
                    .value="${this.newVersionNote}"
                    @input="${(e: CustomEvent<{ value: string }>) =>
                      (this.newVersionNote = eventValue(e))}"
                  ></app-input>
                </div>
                <app-button
                  size="sm"
                  variant="primary"
                  ?disabled="${!this.newVersionPayload}"
                  @click="${() => this.handleUploadNewVersion(doc)}"
                >
                  <span slot="icon-start">${iconUpload(14)}</span>
                  <span>${t.documents.uploadNewVersion}</span>
                </app-button>
              </div>
            </div>

            ${!doc.versions || doc.versions.length === 0
              ? html`<div style="font-size: 0.8rem; color: var(--text-muted);">${t.documents.noVersions}</div>`
              : html`
                  <div class="versions-list">
                    ${doc.versions.map((ver) => {
                      const verUser = store.users.find((u) => u.id === ver.uploadedById);
                      return html`
                        <div class="version-row">
                          <div class="version-main">
                            <div class="version-top">
                              <app-badge variant="info" appearance="soft" size="sm">v${ver.version}</app-badge>
                              <span class="mono">${ver.fileName}</span>
                              <span class="mono" style="color: var(--text-muted);">
                                ${formatFileSize(ver.sizeBytes, t)}
                              </span>
                            </div>
                            <div class="version-notes">${ver.notes}</div>
                          </div>
                          <div style="text-align: right; color: var(--text-muted); flex-shrink: 0;">
                            <div>${verUser?.name || ver.uploadedById}</div>
                            <div class="mono">${ver.uploadedAt.slice(0, 10)}</div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </div>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.previewDoc = null)}">
            ${t.common.close}
          </app-button>
          <app-button
            variant="secondary"
            @click="${() => {
              const target = doc;
              this.previewDoc = null;
              this.openEditModal(target);
            }}"
          >
            <span slot="icon-start">${iconEdit(14)}</span>
            <span>${t.common.edit}</span>
          </app-button>
          <app-button variant="primary" @click="${() => downloadDocumentFile(doc)}">
            <span slot="icon-start">${iconDownload(15)}</span>
            <span>${t.documents.downloadFile}</span>
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteDialog(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingDoc)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.documentDelete.title}"
        action="${t.viewTexts.confirmDialogs.documentDelete.action(this.deletingDoc?.title || '')}"
        result="${t.viewTexts.confirmDialogs.documentDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingDoc = null)}"
        @confirm="${() => {
          if (this.deletingDoc) {
            store.deleteDocument(this.deletingDoc.id);
            this.deletingDoc = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private async handleQuickDropzoneSelect(e: CustomEvent<{ file: File }>) {
    const file = e.detail?.file;
    if (!file) return;
    this.openCreateModal();
    await this.applyFileToForm(file);
  }

  private async handleModalDropzoneSelect(e: CustomEvent<{ file: File }>) {
    const file = e.detail?.file;
    if (!file) return;
    await this.applyFileToForm(file);
  }

  private async applyFileToForm(file: File) {
    const t = getTranslation(this.currentLang);
    const payload = await readBrowserFile(file, t.viewTexts.documents.fileTooLargeNote);
    this.formFileName = payload.fileName;
    this.formExtension = payload.extension;
    this.formMimeType = payload.mimeType;
    this.formSizeBytes = payload.sizeBytes;
    this.formDataUrl = payload.dataUrl;
    if (payload.textContent !== undefined) {
      this.formTextContent = payload.textContent;
    }
    this.formTruncatedNote = payload.truncatedNote || '';
    if (!this.formTitle.trim()) {
      this.formTitle = payload.fileName.replace(/\.[^.]+$/, '');
      this.formError = '';
    }
  }

  private async handleVersionDropzoneSelect(e: CustomEvent<{ file: File }>) {
    const file = e.detail?.file;
    if (!file) return;
    const t = getTranslation(this.currentLang);
    const payload = await readBrowserFile(file, t.viewTexts.documents.fileTooLargeNote);
    this.newVersionPayload = payload;
    this.versionTruncatedNote = payload.truncatedNote || '';
  }

  private handleUploadNewVersion(doc: DocumentItem) {
    if (!this.newVersionPayload) return;
    const t = getTranslation(this.currentLang);
    store.uploadDocumentVersion(doc.id, {
      fileName: this.newVersionPayload.fileName,
      extension: this.newVersionPayload.extension,
      mimeType: this.newVersionPayload.mimeType,
      sizeBytes: this.newVersionPayload.sizeBytes,
      dataUrl: this.newVersionPayload.dataUrl,
      textContent: this.newVersionPayload.textContent,
      notes: this.newVersionNote.trim() || t.viewTexts.documents.defaultVersionNote,
      uploadedById: store.currentUserId || store.users[0]?.id || 'user-1',
    });
    this.newVersionPayload = null;
    this.newVersionNote = '';
    this.versionTruncatedNote = '';
  }

  private openPreviewModal(doc: DocumentItem) {
    this.newVersionPayload = null;
    this.newVersionNote = '';
    this.versionTruncatedNote = '';
    this.copiedContent = false;
    this.previewDoc = doc;
  }

  private openCreateModal() {
    const t = getTranslation(this.currentLang);
    this.editingDocId = null;
    this.formTitle = '';
    this.formFileName = '';
    this.formExtension = 'txt';
    this.formMimeType = 'text/plain';
    this.formSizeBytes = 0;
    this.formDataUrl = undefined;
    this.formTextContent = '';
    this.formTruncatedNote = '';
    this.formCategory = 'spec';
    this.formStatus = 'draft';
    this.formScope =
      this.projectFilter !== 'all'
        ? 'project'
        : this.companyFilter !== 'all'
        ? 'company'
        : 'company';
    this.formCompanyId = this.companyFilter !== 'all' ? this.companyFilter : store.companies[0]?.id || '';
    this.formProjectId = this.projectFilter !== 'all' ? this.projectFilter : '';
    this.formContractId = '';
    this.formCounterpartyId = '';
    this.formTaskId = '';
    this.formUploadedById = store.currentUserId || store.users[0]?.id || '';
    this.formTags = '';
    this.formDescription = '';
    this.formVersionNote = t.viewTexts.documents.initialVersionNote;
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(doc: DocumentItem) {
    this.editingDocId = doc.id;
    this.formTitle = doc.title;
    this.formFileName = doc.fileName;
    this.formExtension = doc.extension;
    this.formMimeType = doc.mimeType;
    this.formSizeBytes = doc.sizeBytes;
    this.formDataUrl = doc.dataUrl;
    this.formTextContent = doc.textContent || '';
    this.formTruncatedNote = '';
    this.formCategory = doc.category;
    this.formStatus = doc.status;
    this.formScope = doc.scope;
    this.formCompanyId = doc.companyId || '';
    this.formProjectId = doc.projectId || '';
    this.formContractId = doc.contractId || '';
    this.formCounterpartyId = doc.counterpartyId || '';
    this.formTaskId = doc.taskId || '';
    this.formUploadedById = doc.uploadedById;
    this.formTags = (doc.tags || []).join(', ');
    this.formDescription = doc.description || '';
    this.formVersionNote = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSaveModal() {
    const t = getTranslation(this.currentLang);
    if (!this.formTitle.trim()) {
      this.formError = t.common.required;
      return;
    }

    const fileName =
      this.formFileName.trim() || `${this.formTitle.trim().toLowerCase().replace(/\s+/g, '_')}.txt`;
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? (parts.pop() || 'txt').toLowerCase() : this.formExtension || 'txt';
    const textBytes = this.formTextContent ? new Blob([this.formTextContent]).size : 512;

    const tags = this.formTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const linkedProject =
      this.formScope === 'project' && this.formProjectId
        ? store.projects.find((p) => p.id === this.formProjectId)
        : undefined;
    const linkedContract =
      this.formScope === 'contract' && this.formContractId
        ? store.contracts.find((c) => c.id === this.formContractId)
        : undefined;

    const resolvedCompanyId =
      this.formScope === 'company' || this.formScope === 'general'
        ? this.formCompanyId || undefined
        : linkedProject?.companyId || linkedContract?.companyId || undefined;

    const commonPayload = {
      title: this.formTitle.trim(),
      fileName,
      extension: ext,
      mimeType: this.formMimeType || 'text/plain',
      sizeBytes: this.formSizeBytes || textBytes,
      category: this.formCategory,
      status: this.formStatus,
      scope: this.formScope,
      companyId: resolvedCompanyId,
      projectId: this.formScope === 'project' ? this.formProjectId || undefined : undefined,
      contractId: this.formScope === 'contract' ? this.formContractId || undefined : undefined,
      counterpartyId: this.formScope === 'counterparty' ? this.formCounterpartyId || undefined : undefined,
      taskId: this.formScope === 'task' ? this.formTaskId || undefined : undefined,
      tags,
      description: this.formDescription.trim(),
      uploadedById: this.formUploadedById || store.currentUserId || store.users[0]?.id || 'user-1',
      dataUrl: this.formDataUrl,
      textContent: this.formTextContent.trim() || undefined,
    };

    if (this.editingDocId) {
      const existing = this.documents.find((d) => d.id === this.editingDocId);
      if (existing) {
        store.updateDocument({
          ...existing,
          ...commonPayload,
        });
      }
    } else {
      store.addDocument({
        ...commonPayload,
        versionNote: this.formVersionNote.trim() || t.viewTexts.documents.initialVersionNote,
      });
    }

    this.modalOpen = false;
  }
}
