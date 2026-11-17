import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { formatMoney } from '../../common/app-money/app-money';
import {
  downloadDocumentFile,
  formatFileSize,
  getSafeExternalUrl,
  isImageMimeOrExt,
  isPdfMimeOrExt,
  isTextMimeOrExt,
  readBrowserFile,
} from '../../common/document-utils';
import {
  Company,
  Contract,
  DocumentCategory,
  DocumentItem,
  DocumentStatus,
  KnowledgeArticle,
  Project,
  ProjectStatus,
  User,
} from '../../../types';
import {
  iconAlertTriangle,
  iconArrowUpRight,
  iconBookOpen,
  iconCheck,
  iconChevronLeft,
  iconChevronRight,
  iconCpu,
  iconDownload,
  iconEdit,
  iconEye,
  iconFileText,
  iconFolder,
  iconFolderOpen,
  iconGlobe,
  iconMessageSquare,
  iconPlus,
  iconSearch,
  iconTag,
  iconTrash,
  iconUpload,
  iconUsers,
  iconX,
} from '../../common/icons';
import {
  formatAiError,
  generateDocumentSummaryAndTags,
} from '../../../services/openai-client';
import '../../common/app-avatar/app-avatar';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-date-input/app-date-input';
import '../../common/app-document-previewer/app-document-previewer';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-file-dropzone/app-file-dropzone';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-input/app-input';
import '../../common/app-meta-grid/app-meta-grid';
import '../../common/app-modal/app-modal';
import '../../common/app-company-form/app-company-form';
import '../../common/app-number-input/app-number-input';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-textarea/app-textarea';
import { eventValue } from '../../common/event-value';
import styles from './app-company-detail.css';

type CompanyDetailTab =
  | 'overview'
  | 'projects'
  | 'employees'
  | 'contracts'
  | 'documents'
  | 'knowledge';

@customElement('app-company-detail')
export class AppCompanyDetail extends LitElement {
  @state() private companies: Company[] = store.companies;
  @state() private detailCompanyId: string =
    store.detailCompanyId || store.companies[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private activeTab: CompanyDetailTab = 'overview';

  // Edit Company modal state
  @state() private editModalOpen = false;

  @state() private confirmDeleteOpen = false;

  // Quick Project create modal state
  @state() private projectModalOpen = false;
  @state() private projName = '';
  @state() private projKey = '';
  @state() private projCounterpartyId = '';
  @state() private projBudget = 2000000;
  @state() private projDueDate = '';
  @state() private projStatus: ProjectStatus = 'active';
  @state() private projDescription = '';
  @state() private projError = '';

  // Quick Upload Document modal state
  @state() private uploadDocModalOpen = false;
  @state() private docTitle = '';
  @state() private docFileName = '';
  @state() private docExtension = '';
  @state() private docMimeType = 'text/plain';
  @state() private docSizeBytes = 0;
  @state() private docDataUrl: string | undefined = undefined;
  @state() private docTextContent = '';
  @state() private docTruncatedNote = '';
  @state() private docCategory: DocumentCategory = 'spec';
  @state() private docStatus: DocumentStatus = 'approved';
  @state() private docProjectId = '';
  @state() private docTags = '';
  @state() private docDescription = '';
  @state() private docError = '';

  // Embedded Company Library & Preview Modal state
  @state() private selectedDocId = '';
  @state() private docSearchQuery = '';
  @state() private docTypeFilter: 'all' | 'pdf' | 'image' | 'text' = 'all';
  @state() private previewDoc: DocumentItem | null = null;
  @state() private aiDocLoading = false;
  @state() private aiDocError = '';
  @state() private aiPreviewLoading = false;
  @state() private aiPreviewError = '';
  @state() private aiPreviewSuggestion: { summary: string; tags: string[]; model?: string } | null = null;
  @state() private previewTagDraft = '';
  @state() private inlineDocTagDraft = '';

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
    this.companies = store.companies;
    this.currentLang = store.customization.language;
    const candidate = store.detailCompanyId || this.detailCompanyId;
    if (candidate && this.companies.some((c) => c.id === candidate)) {
      this.detailCompanyId = candidate;
    } else {
      this.detailCompanyId = this.companies[0]?.id || '';
    }
    if (this.previewDoc) {
      this.previewDoc = store.documents.find((d) => d.id === this.previewDoc!.id) || null;
    }
  }

  private toRub(amount: number, currency: 'RUB' | 'USD' | 'EUR'): number {
    if (currency === 'USD') return amount * 96;
    if (currency === 'EUR') return amount * 104;
    return amount;
  }

  private getScopedDocuments(
    companyId: string,
    companyProjects: Project[],
    companyContracts: Contract[]
  ): DocumentItem[] {
    const projectIds = new Set(companyProjects.map((p) => p.id));
    const contractIds = new Set(companyContracts.map((c) => c.id));
    return store.documents.filter(
      (d) =>
        d.companyId === companyId ||
        (d.projectId ? projectIds.has(d.projectId) : false) ||
        (d.contractId ? contractIds.has(d.contractId) : false)
    );
  }

  private getScopedKnowledge(companyId: string, companyProjects: Project[]): KnowledgeArticle[] {
    const projectIds = new Set(companyProjects.map((p) => p.id));
    return store.knowledgeArticles.filter(
      (a) => a.companyId === companyId || (a.projectId ? projectIds.has(a.projectId) : false)
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const company = this.companies.find((c) => c.id === this.detailCompanyId) || null;

    if (!company) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.companyDetail.emptyNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('companies')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.companyDetail.backToCompanies}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const director = company.directorId
      ? store.users.find((u) => u.id === company.directorId)
      : undefined;
    const companyEmployees = store.users.filter((u) => u.companyId === company.id);
    const companyProjects = store.projects.filter((p) => p.companyId === company.id);
    const companyContracts = store.contracts.filter((c) => c.companyId === company.id);
    const companyContractIds = new Set(companyContracts.map((c) => c.id));
    const companyInvoices = store.invoices.filter((i) => companyContractIds.has(i.contractId));
    const companyDocs = this.getScopedDocuments(company.id, companyProjects, companyContracts);
    const companyArticles = this.getScopedKnowledge(company.id, companyProjects);

    const activeProjectsCount = companyProjects.filter((p) => (p.status || 'active') === 'active').length;
    const activeContractsCount = companyContracts.filter((c) => c.status === 'active').length;
    const totalContractsRub = companyContracts
      .filter((c) => c.status !== 'terminated')
      .reduce((sum, c) => sum + this.toRub(c.amount, c.currency), 0);
    const totalInvoicedRub = companyInvoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + this.toRub(i.totalAmount, i.currency), 0);
    const totalPaidRub = companyInvoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + this.toRub(store.getInvoicePaidAmount(i.id), i.currency), 0);

    const switchOptions = this.companies.map((c) => ({
      value: c.id,
      label: c.name,
    }));
    const safeWebsite = getSafeExternalUrl(company.website);

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('companies')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.companyDetail.backToCompanies}</span>
            </app-button>

            <div class="company-switcher">
              <app-select
                size="sm"
                .value="${company.id}"
                .options="${switchOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.openCompanyDetail(eventValue(e))}"
              ></app-select>
            </div>
          </div>

          <div class="nav-actions">
            <app-button
              size="sm"
              variant="outline"
              @click="${() => store.openDocuments({ scope: 'company', companyId: company.id })}"
            >
              <span slot="icon-start">${iconFolderOpen(15)}</span>
              <span>${t.companyDetail.documentsTab} (${companyDocs.length})</span>
            </app-button>
            <app-button
              size="sm"
              variant="outline"
              @click="${() => store.openKnowledgeBase({ scope: 'company', companyId: company.id })}"
            >
              <span slot="icon-start">${iconBookOpen(15)}</span>
              <span>${t.companyDetail.openKnowledgeBase}</span>
            </app-button>
            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openEditModal(company)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>
            <app-button
              class="danger-action"
              size="sm"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <!-- Hero Card -->
        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <app-entity-emblem entity="company" size="lg"></app-entity-emblem>
              <div class="title-block">
                <div class="title-row">
                  <app-entity-emblem entity="company" variant="pill" size="sm"></app-entity-emblem>
                  <h1 class="company-title">${company.name}</h1>
                  <app-status-chip domain="company" status="${company.status}" appearance="soft" size="sm"></app-status-chip>
                </div>
                <div class="company-sub">
                  <span>${company.legalName}</span>
                  <span aria-hidden="true">·</span>
                  <span class="mono">
                    ${t.viewTexts.calculations.innLabel} ${company.inn}${company.kpp ? ` / ${company.kpp}` : ''}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>${company.city}</span>
                  ${company.industry
                    ? html`<span aria-hidden="true">·</span><span>${company.industry}</span>`
                    : ''}
                  ${safeWebsite
                    ? html`
                        <span aria-hidden="true">·</span>
                        <a
                          class="external-link"
                          href="${safeWebsite}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          ${iconGlobe(13)}
                          <span>${company.website}</span>
                          ${iconArrowUpRight(12)}
                        </a>
                      `
                    : ''}
                </div>
              </div>
            </div>

            ${director
              ? html`
                  <button
                    type="button"
                    class="director-pill"
                    @click="${() => store.openEmployeeDetail(director.id)}"
                  >
                    <app-avatar size="sm" initials="${director.avatar}" title="${director.name}"></app-avatar>
                    <div class="director-meta">
                      <span class="director-label">${t.viewTexts.companies.metaDirector}</span>
                      <span class="director-name">${director.name}</span>
                    </div>
                  </button>
                `
              : html`
                  <div class="director-pill is-static">
                    <div class="director-meta">
                      <span class="director-label">${t.viewTexts.companies.metaDirector}</span>
                      <span class="director-name">${t.companyDetail.unassignedDirector}</span>
                    </div>
                  </div>
                `}
          </div>

          <p class="company-desc">${company.description || '—'}</p>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.companyDetail.kpiEmployees}</span>
              <span class="kpi-val">${companyEmployees.length}</span>
              <span class="kpi-hint">${director ? director.role : '—'}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.companyDetail.kpiProjects}</span>
              <span class="kpi-val accent">${companyProjects.length}</span>
              <span class="kpi-hint">${activeProjectsCount} ${t.companyDetail.activeProjectsHint}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.companyDetail.kpiContractsVolume}</span>
              <span class="kpi-val">${formatMoney(totalContractsRub)}</span>
              <span class="kpi-hint">${activeContractsCount} ${t.companyDetail.activeContractsHint}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.companyDetail.kpiInvoicedPaid}</span>
              <span class="kpi-val success">${formatMoney(totalPaidRub)}</span>
              <span class="kpi-hint mono">/ ${formatMoney(totalInvoicedRub)}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.companyDetail.kpiDocuments}</span>
              <span class="kpi-val">${companyDocs.length}</span>
              <span class="kpi-hint">${t.companyDetail.totalFilesHint}</span>
            </div>
          </div>

          <app-meta-grid
            columns="3"
            .items="${[
              { label: t.viewTexts.companyDetail.taxIdLabel, value: `${company.inn}${company.kpp ? ` / ${company.kpp}` : ''}`, mono: true },
              { label: t.viewTexts.companies.metaPhone, value: company.phone || '—', mono: true },
              { label: 'Email', value: company.email || '—' },
              { label: t.viewTexts.companies.metaCity, value: company.city || '—' },
              { label: t.viewTexts.companies.metaIndustry, value: company.industry || '—' },
              { label: t.companyDetail.websiteLabel, value: company.website || '—' },
            ]}"
          ></app-meta-grid>
        </section>

        <!-- Section Navigation Tabs -->
        <div class="tabs-toolbar">
          <app-segmented-switch
            size="sm"
            .value="${this.activeTab}"
            .options="${[
              { value: 'overview', label: t.companyDetail.overviewTab },
              { value: 'projects', label: `${t.companyDetail.projectsTab} (${companyProjects.length})` },
              { value: 'employees', label: `${t.companyDetail.employeesTab} (${companyEmployees.length})` },
              { value: 'contracts', label: `${t.companyDetail.contractsTab} (${companyContracts.length})` },
              { value: 'documents', label: `${t.companyDetail.documentsTab} (${companyDocs.length})` },
              { value: 'knowledge', label: `${t.companyDetail.knowledgeTab} (${companyArticles.length})` },
            ]}"
            @change="${(e: CustomEvent<{ value: string }>) =>
              (this.activeTab = eventValue(e) as CompanyDetailTab)}"
          ></app-segmented-switch>
        </div>

        ${this.renderTabContent(
          company,
          companyProjects,
          companyEmployees,
          companyContracts,
          companyDocs,
          companyArticles,
          t
        )}
      </div>

      ${this.renderEditModal(t)}
      ${this.renderDeleteModal(company, t)}
      ${this.renderQuickProjectModal(company, t)}
      ${this.renderUploadDocModal(company, companyProjects, t)}
      ${this.renderPreviewModal(t)}
    `;
  }

  private renderTabContent(
    company: Company,
    companyProjects: Project[],
    companyEmployees: User[],
    companyContracts: Contract[],
    companyDocs: DocumentItem[],
    companyArticles: KnowledgeArticle[],
    t: ReturnType<typeof getTranslation>
  ) {
    switch (this.activeTab) {
      case 'overview':
        return this.renderOverviewTab(
          company,
          companyProjects,
          companyEmployees,
          companyContracts,
          companyDocs,
          companyArticles,
          t
        );
      case 'projects':
        return this.renderProjectsSection(company, companyProjects, t);
      case 'employees':
        return this.renderEmployeesSection(companyEmployees, t);
      case 'contracts':
        return this.renderContractsSection(companyContracts, t);
      case 'documents':
        return this.renderDocumentsSection(company, companyDocs, t);
      case 'knowledge':
        return this.renderKnowledgeSection(company, companyArticles, t);
    }
  }

  private renderOverviewTab(
    company: Company,
    companyProjects: Project[],
    companyEmployees: User[],
    companyContracts: Contract[],
    companyDocs: DocumentItem[],
    companyArticles: KnowledgeArticle[],
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <div class="two-col-grid">
        <app-section-card title="${t.companyDetail.projectsTab}" subtitle="(${companyProjects.length})">
          <span slot="icon">${iconFolder(18)}</span>
          <app-button
            slot="actions"
            size="sm"
            variant="secondary"
            @click="${() => this.openQuickProjectModal()}"
          >
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${t.viewTexts.companyDetail.createProjectButton}</span>
          </app-button>

          ${companyProjects.length === 0
            ? html`<app-empty-state compact title="${t.companyDetail.noProjects}"></app-empty-state>`
            : html`
                <div class="rows-list">
                  ${companyProjects.map((proj) => {
                    const cp = proj.counterpartyId
                      ? store.counterparties.find((c) => c.id === proj.counterpartyId)
                      : undefined;
                    return html`
                      <div class="list-row clickable" @click="${() => store.openProjectDetail(proj.id)}">
                        <div class="row-main">
                          <div class="row-title">
                            <span class="color-dot" style="background: ${proj.color};"></span>
                            <span class="row-key">${proj.key}</span>
                            <span>${proj.name}</span>
                          </div>
                          <div class="row-sub">
                            <span>${cp ? cp.name : t.viewTexts.projectDetail.internalProject}</span>
                            ${proj.budget
                              ? html`<span class="mono">· ${proj.budget.toLocaleString(t.common.locale)} ₽</span>`
                              : ''}
                          </div>
                        </div>
                        <div class="row-right" @click="${(e: Event) => e.stopPropagation()}">
                          <div class="mini-progress" title="${proj.progress}%">
                            <div
                              class="mini-progress-fill"
                              style="width: ${proj.progress}%; background: ${proj.color};"
                            ></div>
                          </div>
                          <span class="mono" style="font-size: 0.78rem; width: 34px; text-align: right;">
                            ${proj.progress}%
                          </span>
                          <app-button
                            size="sm"
                            variant="icon"
                            title="${t.projectChat.title}"
                            @click="${() => store.openProjectChat(proj.id)}"
                          >
                            <span slot="start">${iconMessageSquare(14)}</span>
                          </app-button>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              `}
        </app-section-card>

        <app-section-card title="${t.companyDetail.employeesTab}" subtitle="(${companyEmployees.length})">
          <span slot="icon">${iconUsers(18)}</span>
          ${companyEmployees.length === 0
            ? html`<app-empty-state compact title="${t.companyDetail.noEmployees}"></app-empty-state>`
            : html`
                <div class="rows-list">
                  ${companyEmployees.map((emp) => html`
                    <div class="list-row clickable" @click="${() => store.openEmployeeDetail(emp.id)}">
                      <div class="row-main">
                        <div class="emp-cell">
                          <app-avatar size="sm" initials="${emp.avatar}" title="${emp.name}"></app-avatar>
                          <div class="emp-info">
                            <div class="row-title">${emp.name}</div>
                            <div class="row-sub">
                              <span>${emp.role}</span>
                              ${emp.department ? html`<span>· ${emp.department}</span>` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="row-right">
                        <app-status-chip domain="employee" status="${emp.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
                        ${iconChevronRight(15)}
                      </div>
                    </div>
                  `)}
                </div>
              `}
        </app-section-card>
      </div>

      <div class="two-col-grid">
        <app-section-card title="${t.companyDetail.contractsTab}" subtitle="(${companyContracts.length})">
          <span slot="icon">${iconFileText(18)}</span>
          ${companyContracts.length === 0
            ? html`<app-empty-state compact title="${t.companyDetail.noContracts}"></app-empty-state>`
            : html`
                <div class="rows-list">
                  ${companyContracts.map((ctr) => {
                    const cp = store.counterparties.find((c) => c.id === ctr.counterpartyId);
                    return html`
                      <div class="list-row clickable" @click="${() => store.openContractDetail(ctr.id)}">
                        <div class="row-main">
                          <div class="row-title">
                            <span class="row-key">${ctr.number}</span>
                            <span>${ctr.title}</span>
                          </div>
                          <div class="row-sub">
                            <span>${cp?.name || '—'}</span>
                            <span class="mono">· ${ctr.startDate} → ${ctr.endDate}</span>
                          </div>
                        </div>
                        <div class="row-right">
                          <span class="mono" style="font-weight: 700;">
                            ${formatMoney(ctr.amount, ctr.currency)}
                          </span>
                          <app-status-chip domain="contract" status="${ctr.status}" appearance="soft" size="sm"></app-status-chip>
                          ${iconChevronRight(15)}
                        </div>
                      </div>
                    `;
                  })}
                </div>
              `}
        </app-section-card>

        <app-section-card title="${t.companyDetail.documentsTab}" subtitle="(${companyDocs.length})">
          <span slot="icon">${iconFolderOpen(18)}</span>
          <div slot="actions" style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openUploadDocModal(company)}"
            >
              <span slot="icon-start">${iconUpload(14)}</span>
              <span>${t.companyDetail.uploadDocument}</span>
            </app-button>
            <app-button
              size="sm"
              variant="outline"
              @click="${() => store.openDocuments({ scope: 'company', companyId: company.id })}"
            >
              <span>${t.companyDetail.openDocumentsLibrary}</span>
            </app-button>
          </div>

          ${companyDocs.length === 0
            ? html`<app-empty-state compact title="${t.companyDetail.noDocuments}"></app-empty-state>`
            : html`
                <div class="rows-list">
                  ${companyDocs.slice(0, 6).map((doc) => this.renderDocumentRow(doc, t))}
                </div>
              `}
        </app-section-card>
      </div>

      ${this.renderKnowledgeSection(company, companyArticles, t)}
    `;
  }

  private renderProjectsSection(
    _company: Company,
    companyProjects: Project[],
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-section-card title="${t.companyDetail.projectsTab}" subtitle="(${companyProjects.length})">
        <span slot="icon">${iconFolder(18)}</span>
        <app-button
          slot="actions"
          size="sm"
          variant="primary"
          @click="${() => this.openQuickProjectModal()}"
        >
          <span slot="icon-start">${iconPlus(14)}</span>
          <span>${t.viewTexts.companyDetail.createProjectButton}</span>
        </app-button>

        ${companyProjects.length === 0
          ? html`<app-empty-state compact title="${t.companyDetail.noProjects}"></app-empty-state>`
          : html`
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${t.viewTexts.companyDetail.thProject}</th>
                      <th>${t.viewTexts.companyDetail.thCounterparty}</th>
                      <th>${t.viewTexts.companyDetail.thBudget}</th>
                      <th>${t.viewTexts.companyDetail.thProgress}</th>
                      <th>${t.viewTexts.companyDetail.thStatus}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companyProjects.map((proj) => {
                      const cp = proj.counterpartyId
                        ? store.counterparties.find((c) => c.id === proj.counterpartyId)
                        : undefined;
                      return html`
                        <tr>
                          <td>
                            <app-link
                              class="link-btn"
                              size="md"
                              variant="primary"
                              @click="${() => store.openProjectDetail(proj.id)}"
                            >
                              <span class="link-wrap"
                                ><span class="link-inner"
                                  ><span class="row-key">[${proj.key}]</span> ${proj.name}</span
                                ></span
                              >
                            </app-link>
                          </td>
                          <td>
                            ${cp
                              ? html`
                                  <app-link
                                    class="link-btn"
                                    size="md"
                                    variant="primary"
                                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                                  >
                                    <span class="link-wrap"><span class="link-inner">${cp.name}</span></span>
                                  </app-link>
                                `
                              : t.viewTexts.projectDetail.internalProject}
                          </td>
                          <td class="mono">${proj.budget ? `${proj.budget.toLocaleString(t.common.locale)} ₽` : '—'}</td>
                          <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                              <div class="mini-progress">
                                <div
                                  class="mini-progress-fill"
                                  style="width: ${proj.progress}%; background: ${proj.color};"
                                ></div>
                              </div>
                              <span class="mono">${proj.progress}%</span>
                            </div>
                          </td>
                          <td>
                            <app-status-chip domain="project" status="${proj.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
                          </td>
                          <td style="text-align: right;">
                            <app-button
                              size="sm"
                              variant="icon"
                              title="${t.projectChat.title}"
                              @click="${() => store.openProjectChat(proj.id)}"
                            >
                              <span slot="start">${iconMessageSquare(14)}</span>
                            </app-button>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            `}
      </app-section-card>
    `;
  }

  private renderEmployeesSection(companyEmployees: User[], t: ReturnType<typeof getTranslation>) {
    return html`
      <app-section-card title="${t.companyDetail.employeesTab}" subtitle="(${companyEmployees.length})">
        <span slot="icon">${iconUsers(18)}</span>
        ${companyEmployees.length === 0
          ? html`<app-empty-state compact title="${t.companyDetail.noEmployees}"></app-empty-state>`
          : html`
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${t.viewTexts.companyDetail.thEmployee}</th>
                      <th>${t.viewTexts.companyDetail.thDepartment}</th>
                      <th>Email</th>
                      <th>${t.viewTexts.companyDetail.thRate}</th>
                      <th>${t.viewTexts.companyDetail.thStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companyEmployees.map((emp) => html`
                      <tr>
                        <td>
                          <div class="emp-cell">
                            <app-avatar size="sm" initials="${emp.avatar}" title="${emp.name}"></app-avatar>
                            <div class="emp-info">
                              <app-link
                                class="link-btn"
                                size="md"
                                variant="primary"
                                @click="${() => store.openEmployeeDetail(emp.id)}"
                              >
                                <span class="link-wrap"><span class="link-inner">${emp.name}</span></span>
                              </app-link>
                              <span class="emp-role">${emp.role}</span>
                            </div>
                          </div>
                        </td>
                        <td>${emp.department || '—'}</td>
                        <td class="mono">${emp.email || '—'}</td>
                        <td class="mono">
                          ${(emp.hourlyRate || 2800).toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}
                        </td>
                        <td>
                          <app-status-chip domain="employee" status="${emp.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
                        </td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>
            `}
      </app-section-card>
    `;
  }

  private renderContractsSection(companyContracts: Contract[], t: ReturnType<typeof getTranslation>) {
    return html`
      <app-section-card title="${t.companyDetail.contractsTab}" subtitle="(${companyContracts.length})">
        <span slot="icon">${iconFileText(18)}</span>
        ${companyContracts.length === 0
          ? html`<app-empty-state compact title="${t.companyDetail.noContracts}"></app-empty-state>`
          : html`
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${t.viewTexts.companyDetail.thContract}</th>
                      <th>${t.viewTexts.companyDetail.thCounterparty}</th>
                      <th>${t.viewTexts.companyDetail.thAmount}</th>
                      <th>${t.viewTexts.companyDetail.thTerm}</th>
                      <th>${t.viewTexts.companyDetail.thStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companyContracts.map((ctr) => {
                      const cp = store.counterparties.find((c) => c.id === ctr.counterpartyId);
                      const proj = ctr.projectId
                        ? store.projects.find((p) => p.id === ctr.projectId)
                        : undefined;
                      return html`
                        <tr>
                          <td>
                            <app-link
                              class="link-btn"
                              size="md"
                              variant="primary"
                              @click="${() => store.openContractDetail(ctr.id)}"
                            >
                              <span class="link-wrap"
                                ><span class="link-inner"
                                  ><span class="row-key">${ctr.number}</span> · ${ctr.title}</span
                                ></span
                              >
                            </app-link>
                            ${proj ? html`<div class="emp-role">[${proj.key}] ${proj.name}</div>` : ''}
                          </td>
                          <td>
                            ${cp
                              ? html`
                                  <app-link
                                    class="link-btn"
                                    size="md"
                                    variant="primary"
                                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                                  >
                                    <span class="link-wrap"><span class="link-inner">${cp.name}</span></span>
                                  </app-link>
                                `
                              : '—'}
                          </td>
                          <td class="mono" style="font-weight: 700;">
                            ${formatMoney(ctr.amount, ctr.currency)}
                          </td>
                          <td class="mono">${ctr.startDate} → ${ctr.endDate}</td>
                          <td>
                            <app-status-chip domain="contract" status="${ctr.status}" appearance="soft" size="sm"></app-status-chip>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            `}
      </app-section-card>
    `;
  }

  private filterCompanyDocuments(docs: DocumentItem[]): DocumentItem[] {
    const q = this.docSearchQuery.trim().toLowerCase();
    return docs.filter((doc) => {
      if (this.docTypeFilter === 'pdf' && !isPdfMimeOrExt(doc.mimeType, doc.extension)) {
        return false;
      }
      if (this.docTypeFilter === 'image' && !isImageMimeOrExt(doc.mimeType, doc.extension)) {
        return false;
      }
      if (
        this.docTypeFilter === 'text' &&
        (isPdfMimeOrExt(doc.mimeType, doc.extension) ||
          isImageMimeOrExt(doc.mimeType, doc.extension) ||
          !isTextMimeOrExt(doc.mimeType, doc.extension))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }

  private getExtBadgeVariant(doc: DocumentItem): string {
    if (isPdfMimeOrExt(doc.mimeType, doc.extension)) return 'is-pdf';
    if (isImageMimeOrExt(doc.mimeType, doc.extension)) return 'is-image';
    if (isTextMimeOrExt(doc.mimeType, doc.extension)) return 'is-code';
    return '';
  }

  private renderDocumentsSection(
    company: Company,
    companyDocs: DocumentItem[],
    t: ReturnType<typeof getTranslation>
  ) {
    const pdfCount = companyDocs.filter((d) => isPdfMimeOrExt(d.mimeType, d.extension)).length;
    const imageCount = companyDocs.filter((d) => isImageMimeOrExt(d.mimeType, d.extension)).length;
    const textCount = companyDocs.filter(
      (d) =>
        !isPdfMimeOrExt(d.mimeType, d.extension) &&
        !isImageMimeOrExt(d.mimeType, d.extension) &&
        isTextMimeOrExt(d.mimeType, d.extension)
    ).length;

    const filteredDocs = this.filterCompanyDocuments(companyDocs);
    const activeDoc =
      filteredDocs.find((d) => d.id === this.selectedDocId) || filteredDocs[0] || null;

    return html`
      <app-section-card title="${t.companyDetail.documentsTab}" subtitle="(${companyDocs.length})">
        <span slot="icon">${iconFolderOpen(18)}</span>
        <div slot="actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <app-button
            size="sm"
            variant="primary"
            @click="${() => this.openUploadDocModal(company)}"
          >
            <span slot="icon-start">${iconUpload(14)}</span>
            <span>${t.companyDetail.uploadDocument}</span>
          </app-button>
          <app-button
            size="sm"
            variant="outline"
            @click="${() => store.openDocuments({ scope: 'company', companyId: company.id })}"
          >
            <span>${t.companyDetail.openDocumentsLibrary}</span>
          </app-button>
        </div>

        ${companyDocs.length === 0
          ? html`<app-empty-state compact title="${t.companyDetail.noDocuments}"></app-empty-state>`
          : html`
              <div class="company-docs-workspace">
                <div class="docs-list-pane">
                  <app-input
                    size="sm"
                    placeholder="${t.documents.searchInLibrary}"
                    .value="${this.docSearchQuery}"
                    @input="${(e: CustomEvent<{ value: string }>) =>
                      (this.docSearchQuery = eventValue(e))}"
                  >
                    <span slot="prefix">${iconSearch(14)}</span>
                  </app-input>

                  <div class="docs-filter-pills">
                    <button
                      type="button"
                      class="doc-filter-pill ${this.docTypeFilter === 'all' ? 'is-active' : ''}"
                      @click="${() => (this.docTypeFilter = 'all')}"
                    >
                      ${t.documents.filterAllTypes} (${companyDocs.length})
                    </button>
                    <button
                      type="button"
                      class="doc-filter-pill ${this.docTypeFilter === 'pdf' ? 'is-active' : ''}"
                      @click="${() => (this.docTypeFilter = 'pdf')}"
                    >
                      ${t.documents.filterPdf} (${pdfCount})
                    </button>
                    <button
                      type="button"
                      class="doc-filter-pill ${this.docTypeFilter === 'image' ? 'is-active' : ''}"
                      @click="${() => (this.docTypeFilter = 'image')}"
                    >
                      ${t.documents.filterImages} (${imageCount})
                    </button>
                    <button
                      type="button"
                      class="doc-filter-pill ${this.docTypeFilter === 'text' ? 'is-active' : ''}"
                      @click="${() => (this.docTypeFilter = 'text')}"
                    >
                      ${t.documents.filterText} (${textCount})
                    </button>
                  </div>

                  ${filteredDocs.length === 0
                    ? html`<app-empty-state compact title="${t.documents.noCompanyDocsMatch}"></app-empty-state>`
                    : html`
                        <div class="docs-pane-items">
                          ${filteredDocs.map((doc) => {
                            const isActive = activeDoc?.id === doc.id;
                            const extLabel = (doc.extension || 'file').toUpperCase();
                            return html`
                              <button
                                type="button"
                                class="doc-select-card ${isActive ? 'is-active' : ''}"
                                @click="${() => (this.selectedDocId = doc.id)}"
                              >
                                <span class="ext-badge ${this.getExtBadgeVariant(doc)}">${extLabel}</span>
                                <div class="doc-select-main">
                                  <span class="doc-select-title">${doc.title}</span>
                                  <div class="doc-select-sub">
                                    <span class="mono">${doc.fileName}</span>
                                    <span>·</span>
                                    <span class="mono">${formatFileSize(doc.sizeBytes, t)}</span>
                                  </div>
                                </div>
                                <app-status-chip
                                  domain="document"
                                  status="${doc.status}"
                                  appearance="soft"
                                  size="sm"
                                ></app-status-chip>
                              </button>
                            `;
                          })}
                        </div>
                      `}
                </div>

                <div class="docs-preview-pane">
                  <app-document-previewer
                    .document="${activeDoc}"
                    .documents="${filteredDocs}"
                    show-expand
                    height="560px"
                    @select-document="${(e: CustomEvent<{ document: DocumentItem }>) =>
                      (this.selectedDocId = e.detail.document.id)}"
                    @expand="${(e: CustomEvent<{ document: DocumentItem }>) =>
                      this.openDocPreviewModal(e.detail.document)}"
                  ></app-document-previewer>
                  ${activeDoc ? this.renderEditableTagsBar(activeDoc, t, 'workspace') : ''}
                </div>
              </div>
            `}
      </app-section-card>
    `;
  }

  private renderDocumentRow(doc: DocumentItem, t: ReturnType<typeof getTranslation>) {
    const extLabel = (doc.extension || 'file').toUpperCase();
    return html`
      <div
        class="list-row clickable"
        @click="${() => {
          this.selectedDocId = doc.id;
          this.openDocPreviewModal(doc);
        }}"
      >
        <div class="row-main">
          <div class="row-title">
            <span class="ext-badge ${this.getExtBadgeVariant(doc)}">${extLabel}</span>
            <span>${doc.title}</span>
            <app-status-chip domain="document" status="${doc.status}" appearance="soft" size="sm"></app-status-chip>
          </div>
          <div class="row-sub">
            <span class="mono">${doc.fileName}</span>
            <span>· ${t.documents.categories[doc.category]}</span>
            <span class="mono">· v${doc.version}</span>
            <span class="mono">· ${formatFileSize(doc.sizeBytes, t)}</span>
          </div>
        </div>
        <div class="row-right" @click="${(e: Event) => e.stopPropagation()}">
          <app-button
            size="sm"
            variant="icon"
            title="${t.documents.previewTitle}"
            @click="${() => {
              this.selectedDocId = doc.id;
              this.openDocPreviewModal(doc);
            }}"
          >
            <span slot="start">${iconEye(14)}</span>
          </app-button>
          <app-button
            size="sm"
            variant="icon"
            title="${t.documents.downloadFile}"
            @click="${() => downloadDocumentFile(doc)}"
          >
            <span slot="start">${iconDownload(14)}</span>
          </app-button>
        </div>
      </div>
    `;
  }

  private renderKnowledgeSection(
    company: Company,
    companyArticles: KnowledgeArticle[],
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-section-card title="${t.companyDetail.knowledgeTab}" subtitle="(${companyArticles.length})">
        <span slot="icon">${iconBookOpen(18)}</span>
        <app-button
          slot="actions"
          size="sm"
          variant="outline"
          @click="${() => store.openKnowledgeBase({ scope: 'company', companyId: company.id })}"
        >
          <span>${t.companyDetail.openKnowledgeBase}</span>
        </app-button>

        ${companyArticles.length === 0
          ? html`<app-empty-state compact title="${t.companyDetail.noKnowledge}"></app-empty-state>`
          : html`
              <div class="rows-list">
                ${companyArticles.map((art) => html`
                  <div
                    class="list-row clickable"
                    @click="${() => {
                      store.selectKnowledgeArticle(art.id);
                      store.openKnowledgeBase({ scope: art.scope, companyId: company.id });
                    }}"
                  >
                    <div class="row-main">
                      <div class="row-title">
                        <span>${art.title}</span>
                        <app-status-chip domain="knowledge" status="${art.status}" appearance="soft" size="sm"></app-status-chip>
                      </div>
                      <div class="row-sub">
                        <span>${t.knowledgeBase.categories[art.category]}</span>
                        <span class="mono">· ${art.updatedAt.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div class="row-right">
                      ${iconChevronRight(15)}
                    </div>
                  </div>
                `)}
              </div>
            `}
      </app-section-card>
    `;
  }

  private renderEditModal(t: ReturnType<typeof getTranslation>) {
    const company = store.companies.find((c) => c.id === this.detailCompanyId) || null;

    return html`
      <app-company-form
        .open="${this.editModalOpen}"
        .company="${company}"
        @close="${() => (this.editModalOpen = false)}"
        @saved="${() => (this.editModalOpen = false)}"
      ></app-company-form>
    `;
  }

  private renderDeleteModal(company: Company, t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.companyDelete.title}"
        action="${t.viewTexts.confirmDialogs.companyDelete.action(company.name)}"
        result="${t.viewTexts.confirmDialogs.companyDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteCompany(company.id);
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderQuickProjectModal(company: Company, t: ReturnType<typeof getTranslation>) {
    const counterpartyOpts = [
      { value: '', label: t.viewTexts.projects.optionInternalProject },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];
    const statusOpts = [
      { value: 'active', label: t.projectStatuses.active, color: '#10b981' },
      { value: 'on_hold', label: t.projectStatuses.on_hold, color: '#f59e0b' },
      { value: 'completed', label: t.projectStatuses.completed, color: '#6366f1' },
    ];

    return html`
      <app-modal
        ?open="${this.projectModalOpen}"
        size="lg"
        title="${t.viewTexts.projects.modalTitleCreate}"
        @close="${() => (this.projectModalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${t.viewTexts.projects.labelProjectName}"
              .value="${this.projName}"
              required
              error="${this.projError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.projName = eventValue(e);
                this.projError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.projects.labelProjectKey}"
              .value="${this.projKey}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.projKey = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.projects.labelCounterparty}"
              .value="${this.projCounterpartyId}"
              .options="${counterpartyOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.projCounterpartyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.projects.labelStatus}"
              .value="${this.projStatus}"
              .options="${statusOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.projStatus = eventValue(e) as ProjectStatus)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.projects.labelBudgetRub}"
              .value="${this.projBudget}"
              min="0"
              step="100000"
              @change="${(e: CustomEvent<{ value: number }>) => (this.projBudget = eventValue(e))}"
            ></app-number-input>
          </div>
          <div>
            <app-date-input
              label="${t.viewTexts.projects.labelDueDate}"
              .value="${this.projDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.projDueDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.projects.labelDescription}"
              .value="${this.projDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.projDescription = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.projectModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleCreateProject(company)}">
            ${t.common.create}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderUploadDocModal(
    company: Company,
    companyProjects: Project[],
    t: ReturnType<typeof getTranslation>
  ) {
    const categoryOpts = (
      Object.keys(t.documents.categories) as DocumentCategory[]
    ).map((key) => ({ value: key, label: t.documents.categories[key] }));

    const statusOpts = (['draft', 'review', 'approved', 'archived'] as DocumentStatus[]).map((key) => ({
      value: key,
      label: t.documents.statuses[key],
    }));

    const projectOpts = [
      { value: '', label: t.documents.scopeNone },
      ...companyProjects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}` })),
    ];

    return html`
      <app-modal
        ?open="${this.uploadDocModalOpen}"
        size="lg"
        title="${t.companyDetail.uploadDocument}"
        @close="${() => (this.uploadDocModalOpen = false)}"
      >
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <app-file-dropzone
            selected-file-name="${this.docFileName}"
            selected-file-size="${this.docSizeBytes}"
            @file-selected="${this.handleDropzoneFileSelected}"
            @file-cleared="${() => {
              this.docFileName = '';
              this.docSizeBytes = 0;
              this.docDataUrl = undefined;
              this.docTruncatedNote = '';
            }}"
          ></app-file-dropzone>

          ${this.docTruncatedNote
            ? html`<div class="note-banner">${this.docTruncatedNote}</div>`
            : ''}

          <app-form-grid>
            <div>
              <app-input
                label="${t.documents.fieldTitle}"
                .value="${this.docTitle}"
                required
                error="${this.docError}"
                @input="${(e: CustomEvent<{ value: string }>) => {
                  this.docTitle = eventValue(e);
                  this.docError = '';
                }}"
              ></app-input>
            </div>
            <div>
              <app-input
                label="${t.documents.fieldFileName}"
                .value="${this.docFileName}"
                @input="${(e: CustomEvent<{ value: string }>) => (this.docFileName = eventValue(e))}"
              ></app-input>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldCategory}"
                .value="${this.docCategory}"
                .options="${categoryOpts}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.docCategory = eventValue(e) as DocumentCategory)}"
              ></app-select>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldStatus}"
                .value="${this.docStatus}"
                .options="${statusOpts}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.docStatus = eventValue(e) as DocumentStatus)}"
              ></app-select>
            </div>
            <div>
              <app-select
                label="${t.documents.fieldProject}"
                .value="${this.docProjectId}"
                .options="${projectOpts}"
                @change="${(e: CustomEvent<{ value: string }>) => (this.docProjectId = eventValue(e))}"
              ></app-select>
            </div>
            <div class="col-span-2">
              <div class="ai-doc-bar">
                <div class="ai-doc-bar-row">
                  <span class="ai-doc-hint">${t.viewTexts.ai.docFormHint}</span>
                  <app-button
                    size="sm"
                    variant="secondary"
                    ?disabled="${this.aiDocLoading}"
                    @click="${() => this.handleGenerateUploadDocAi(company)}"
                  >
                    <span slot="icon-start">${iconCpu(14)}</span>
                    <span>
                      ${this.aiDocLoading
                        ? t.viewTexts.ai.docGenerating
                        : t.viewTexts.ai.docGenerateBtn}
                    </span>
                  </app-button>
                </div>
                ${this.aiDocError
                  ? html`
                      <div class="ai-doc-error">
                        <span style="flex-shrink: 0;">${iconAlertTriangle(14)}</span>
                        <span>${this.aiDocError}</span>
                      </div>
                    `
                  : ''}
              </div>
            </div>
            <div>
              <app-input
                label="${t.documents.fieldTags}"
                .value="${this.docTags}"
                @input="${(e: CustomEvent<{ value: string }>) => (this.docTags = eventValue(e))}"
              ></app-input>
            </div>
            <div class="col-span-2">
              <app-textarea
                label="${t.documents.fieldDescription}"
                .value="${this.docDescription}"
                rows="3"
                @input="${(e: CustomEvent<{ value: string }>) => (this.docDescription = eventValue(e))}"
              ></app-textarea>
            </div>
          </app-form-grid>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.uploadDocModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSaveDocument(company)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderPreviewModal(t: ReturnType<typeof getTranslation>) {
    const doc = this.previewDoc;
    if (!doc) return '';
    const company = this.companies.find((c) => c.id === (doc.companyId || this.detailCompanyId));

    return html`
      <app-modal
        open
        size="xl"
        title="${doc.title}"
        @close="${() => (this.previewDoc = null)}"
      >
        <div class="preview-box">
          <div class="preview-meta-row">
            <span class="mono">${doc.fileName} · v${doc.version} · ${formatFileSize(doc.sizeBytes, t)}</span>
            <app-status-chip domain="document" status="${doc.status}" appearance="soft" size="sm"></app-status-chip>
          </div>

          ${doc.description ? html`<p class="company-desc">${doc.description}</p>` : ''}

          ${this.renderEditableTagsBar(doc, t, 'modal')}

          <div class="ai-doc-bar">
            <div class="ai-doc-bar-row">
              <span class="ai-doc-hint">
                <span style="display: inline-flex; vertical-align: middle; margin-right: 0.3rem;">${iconTag(13)}</span>
                ${t.viewTexts.ai.docSectionTitle}
              </span>
              <app-button
                size="sm"
                variant="secondary"
                ?disabled="${this.aiPreviewLoading}"
                @click="${() => this.handleGeneratePreviewAi(doc, company)}"
              >
                <span slot="icon-start">${iconCpu(14)}</span>
                <span>
                  ${this.aiPreviewLoading
                    ? t.viewTexts.ai.docGenerating
                    : t.viewTexts.ai.docGenerateBtn}
                </span>
              </app-button>
            </div>

            ${this.aiPreviewError
              ? html`
                  <div class="ai-doc-error">
                    <span style="flex-shrink: 0;">${iconAlertTriangle(14)}</span>
                    <span>${this.aiPreviewError}</span>
                  </div>
                `
              : ''}

            ${this.aiPreviewSuggestion
              ? html`
                  <div class="ai-doc-suggestion">
                    <div class="ai-doc-suggestion-head">
                      <span>${t.viewTexts.ai.docGeneratedPreview}</span>
                      ${this.aiPreviewSuggestion.model
                        ? html`<span class="mono">${this.aiPreviewSuggestion.model}</span>`
                        : ''}
                    </div>
                    <p class="ai-doc-suggestion-summary">${this.aiPreviewSuggestion.summary}</p>
                    ${this.aiPreviewSuggestion.tags.length > 0
                      ? html`
                          <div class="ai-doc-suggestion-tags">
                            ${this.aiPreviewSuggestion.tags.map(
                              (tag) => html`<app-badge variant="info" appearance="soft" size="sm">#${tag}</app-badge>`
                            )}
                          </div>
                        `
                      : ''}
                    <div class="ai-doc-suggestion-actions">
                      <app-button
                        size="sm"
                        variant="primary"
                        @click="${() => this.handleApplyPreviewAi(doc)}"
                      >
                        <span slot="icon-start">${iconCheck(14)}</span>
                        <span>${t.viewTexts.ai.docApplyBtn}</span>
                      </app-button>
                      <app-button
                        size="sm"
                        variant="ghost"
                        @click="${() => (this.aiPreviewSuggestion = null)}"
                      >
                        ${t.viewTexts.ai.docDismissBtn}
                      </app-button>
                    </div>
                  </div>
                `
              : ''}
          </div>

          <app-document-previewer
            .document="${doc}"
            .showHeader="${false}"
            height="540px"
          ></app-document-previewer>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.previewDoc = null)}">
            ${t.common.close}
          </app-button>
          <app-button variant="primary" @click="${() => downloadDocumentFile(doc)}">
            <span slot="icon-start">${iconDownload(15)}</span>
            <span>${t.documents.downloadFile}</span>
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private commitTagToDoc(doc: DocumentItem, rawInput: string) {
    const incoming = rawInput
      .split(/[,;]+/)
      .map((s) => s.replace(/^#/, '').trim().toLowerCase())
      .filter(Boolean);
    if (incoming.length === 0) return;

    const merged = Array.from(new Set([...(doc.tags || []), ...incoming]));
    const updated: DocumentItem = {
      ...doc,
      tags: merged,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    store.updateDocument(updated);
    if (this.previewDoc?.id === doc.id) {
      this.previewDoc = updated;
    }
  }

  private removeTagFromDoc(doc: DocumentItem, tagToRemove: string) {
    const nextTags = (doc.tags || []).filter((t) => t !== tagToRemove);
    const updated: DocumentItem = {
      ...doc,
      tags: nextTags,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    store.updateDocument(updated);
    if (this.previewDoc?.id === doc.id) {
      this.previewDoc = updated;
    }
  }

  private renderEditableTagsBar(
    doc: DocumentItem,
    t: ReturnType<typeof getTranslation>,
    mode: 'workspace' | 'modal'
  ) {
    const draft = mode === 'modal' ? this.previewTagDraft : this.inlineDocTagDraft;
    const setDraft = (val: string) => {
      if (mode === 'modal') this.previewTagDraft = val;
      else this.inlineDocTagDraft = val;
    };

    return html`
      <div class="preview-tags-bar">
        <span class="preview-tags-label">
          ${iconTag(13)}
          <span>${t.documents.tagsLabel}:</span>
        </span>
        <div class="tags-row">
          ${doc.tags.length === 0
            ? html`<span class="meta-label">${t.documents.noTags}</span>`
            : doc.tags.map(
                (tag) => html`
                  <span class="tag-chip is-editable">
                    <span>#${tag}</span>
                    <button
                      type="button"
                      class="tag-remove-btn"
                      title="${t.documents.removeTagTitle}"
                      @click="${() => this.removeTagFromDoc(doc, tag)}"
                    >
                      ${iconX(10)}
                    </button>
                  </span>
                `
              )}
          <span class="inline-tag-form">
            <input
              type="text"
              class="inline-tag-input"
              placeholder="${t.documents.addTagPlaceholder}"
              .value="${draft}"
              @input="${(e: Event) => setDraft((e.target as HTMLInputElement).value)}"
              @keydown="${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  this.commitTagToDoc(doc, draft);
                  setDraft('');
                }
              }}"
            />
            <button
              type="button"
              class="inline-tag-action is-confirm"
              title="${t.common.add}"
              @click="${() => {
                this.commitTagToDoc(doc, draft);
                setDraft('');
              }}"
            >
              ${iconCheck(11)}
            </button>
          </span>
        </div>
      </div>
    `;
  }

  private openEditModal(company: Company) {
    this.editModalOpen = true;
  }

  private openQuickProjectModal() {
    this.projName = '';
    this.projKey = `PRJ${store.projects.length + 1}`;
    this.projCounterpartyId = '';
    this.projBudget = 2000000;
    this.projDueDate = `${new Date().getFullYear()}-12-31`;
    this.projStatus = 'active';
    this.projDescription = '';
    this.projError = '';
    this.projectModalOpen = true;
  }

  private handleCreateProject(company: Company) {
    if (!this.projName.trim()) {
      this.projError = getTranslation(this.currentLang).common.required;
      return;
    }
    const created = store.addProject({
      name: this.projName.trim(),
      key: (this.projKey.trim() || 'PRJ').toUpperCase(),
      description: this.projDescription.trim(),
      color: '#6366f1',
      progress: 0,
      dueDate: this.projDueDate || `${new Date().getFullYear()}-12-31`,
      companyId: company.id,
      counterpartyId: this.projCounterpartyId || undefined,
      budget: Math.max(0, Number(this.projBudget) || 0),
      status: this.projStatus,
      members: [],
    });
    this.projectModalOpen = false;
    store.openProjectDetail(created.id);
  }

  private openUploadDocModal(company: Company) {
    this.docTitle = '';
    this.docFileName = '';
    this.docExtension = 'txt';
    this.docMimeType = 'text/plain';
    this.docSizeBytes = 0;
    this.docDataUrl = undefined;
    this.docTextContent = '';
    this.docTruncatedNote = '';
    this.docCategory = 'legal';
    this.docStatus = 'approved';
    this.docProjectId = '';
    this.docTags = company.name.toLowerCase();
    this.docDescription = '';
    this.docError = '';
    this.aiDocLoading = false;
    this.aiDocError = '';
    this.uploadDocModalOpen = true;
  }

  private async handleGenerateUploadDocAi(company: Company) {
    const t = getTranslation(this.currentLang);
    if (!this.docTitle.trim() && !this.docFileName.trim() && !this.docTextContent.trim()) {
      this.aiDocError = t.viewTexts.ai.errors.missingDocInfo;
      return;
    }
    const endpoint = store.customization.aiEndpoint;
    const model = store.customization.aiModel;
    this.aiDocLoading = true;
    this.aiDocError = '';
    try {
      const result = await generateDocumentSummaryAndTags({
        doc: {
          title: this.docTitle.trim(),
          fileName: this.docFileName.trim(),
          mimeType: this.docMimeType,
          category: this.docCategory,
          scope: this.docProjectId ? 'project' : 'company',
          description: this.docDescription,
          tags: this.docTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          textContent: this.docTextContent,
          dataUrl: this.docDataUrl,
        },
        linkedContext: company.name,
        lang: this.currentLang,
        baseUrl: endpoint,
        model,
      });
      if (result.summary) this.docDescription = result.summary;
      if (result.tags.length > 0) this.docTags = result.tags.join(', ');
      store.addNotification('success', t.viewTexts.ai.docSectionTitle, t.viewTexts.ai.docAppliedNote);
    } catch (err) {
      this.aiDocError = formatAiError(err, endpoint, t);
    } finally {
      this.aiDocLoading = false;
    }
  }

  private openDocPreviewModal(doc: DocumentItem) {
    this.aiPreviewLoading = false;
    this.aiPreviewError = '';
    this.aiPreviewSuggestion = null;
    this.previewDoc = doc;
  }

  private async handleGeneratePreviewAi(doc: DocumentItem, company?: Company) {
    const t = getTranslation(this.currentLang);
    const endpoint = store.customization.aiEndpoint;
    const model = store.customization.aiModel;
    this.aiPreviewLoading = true;
    this.aiPreviewError = '';
    try {
      this.aiPreviewSuggestion = await generateDocumentSummaryAndTags({
        doc,
        linkedContext: company?.name,
        lang: this.currentLang,
        baseUrl: endpoint,
        model,
      });
    } catch (err) {
      this.aiPreviewError = formatAiError(err, endpoint, t);
    } finally {
      this.aiPreviewLoading = false;
    }
  }

  private handleApplyPreviewAi(doc: DocumentItem) {
    if (!this.aiPreviewSuggestion) return;
    const t = getTranslation(this.currentLang);
    const mergedTags = Array.from(
      new Set([...(doc.tags || []), ...this.aiPreviewSuggestion.tags])
    ).slice(0, 10);
    const updated: DocumentItem = {
      ...doc,
      description: this.aiPreviewSuggestion.summary || doc.description,
      tags: mergedTags.length > 0 ? mergedTags : doc.tags,
    };
    store.updateDocument(updated);
    this.previewDoc = updated;
    this.aiPreviewSuggestion = null;
    store.addNotification('success', t.viewTexts.ai.docSectionTitle, t.viewTexts.ai.docAppliedNote);
  }

  private async handleDropzoneFileSelected(e: CustomEvent<{ file: File }>) {
    const file = e.detail?.file;
    if (!file) return;
    const t = getTranslation(this.currentLang);
    const payload = await readBrowserFile(file, t.viewTexts.documents.fileTooLargeNote);
    this.docFileName = payload.fileName;
    this.docExtension = payload.extension;
    this.docMimeType = payload.mimeType;
    this.docSizeBytes = payload.sizeBytes;
    this.docDataUrl = payload.dataUrl;
    if (payload.textContent !== undefined) {
      this.docTextContent = payload.textContent;
    }
    this.docTruncatedNote = payload.truncatedNote || '';
    if (!this.docTitle.trim()) {
      this.docTitle = payload.fileName.replace(/\.[^.]+$/, '');
      this.docError = '';
    }
  }

  private handleSaveDocument(company: Company) {
    const t = getTranslation(this.currentLang);
    if (!this.docTitle.trim()) {
      this.docError = t.common.required;
      return;
    }
    const fileName = this.docFileName.trim() || `${this.docTitle.trim().toLowerCase().replace(/\s+/g, '_')}.txt`;
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? (parts.pop() || 'txt').toLowerCase() : this.docExtension || 'txt';
    const textBytes = this.docTextContent ? new Blob([this.docTextContent]).size : 512;

    const created = store.addDocument({
      title: this.docTitle.trim(),
      fileName,
      extension: ext,
      mimeType: this.docMimeType || 'text/plain',
      sizeBytes: this.docSizeBytes || textBytes,
      category: this.docCategory,
      status: this.docStatus,
      scope: this.docProjectId ? 'project' : 'company',
      companyId: company.id,
      projectId: this.docProjectId || undefined,
      tags: this.docTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: this.docDescription.trim(),
      uploadedById: store.currentUserId || store.users[0]?.id || 'user-1',
      dataUrl: this.docDataUrl,
      textContent: this.docTextContent.trim() || undefined,
      versionNote: t.viewTexts.documents.initialVersionNote,
    });
    this.selectedDocId = created.id;
    this.docTypeFilter = 'all';
    this.docSearchQuery = '';
    this.activeTab = 'documents';
    this.uploadDocModalOpen = false;
  }
}
