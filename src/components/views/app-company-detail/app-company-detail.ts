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
  isTextMimeOrExt,
  readBrowserFile,
} from '../../common/document-utils';
import {
  Company,
  CompanyStatus,
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
  iconArrowUpRight,
  iconBookOpen,
  iconBuilding,
  iconChevronLeft,
  iconChevronRight,
  iconCopy,
  iconDownload,
  iconEdit,
  iconEye,
  iconFile,
  iconFileText,
  iconFolder,
  iconFolderOpen,
  iconGlobe,
  iconMessageSquare,
  iconPlus,
  iconTrash,
  iconUpload,
  iconUsers,
} from '../../common/icons';
import '../../common/app-avatar/app-avatar';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-date-input/app-date-input';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-file-dropzone/app-file-dropzone';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-input/app-input';
import '../../common/app-meta-grid/app-meta-grid';
import '../../common/app-modal/app-modal';
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
  @state() private formName = '';
  @state() private formLegalName = '';
  @state() private formInn = '';
  @state() private formKpp = '';
  @state() private formIndustry = '';
  @state() private formCity = '';
  @state() private formPhone = '';
  @state() private formEmail = '';
  @state() private formWebsite = '';
  @state() private formDirectorId = '';
  @state() private formStatus: CompanyStatus = 'active';
  @state() private formDescription = '';
  @state() private formError = '';

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

  // Preview Document modal state
  @state() private previewDoc: DocumentItem | null = null;
  @state() private copiedText = false;

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
            <button
              type="button"
              class="icon-btn danger"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              ${iconTrash(15)}
            </button>
          </div>
        </div>

        <!-- Hero Card -->
        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <div class="company-emblem">${iconBuilding(24)}</div>
              <div class="title-block">
                <div class="title-row">
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
                              ? html`<span class="mono">· ${proj.budget.toLocaleString('ru-RU')} ₽</span>`
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
                          <button
                            type="button"
                            class="icon-btn"
                            title="${t.projectChat.title}"
                            @click="${() => store.openProjectChat(proj.id)}"
                          >
                            ${iconMessageSquare(14)}
                          </button>
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
                            <button
                              type="button"
                              class="link-btn"
                              @click="${() => store.openProjectDetail(proj.id)}"
                            >
                              <span class="row-key">[${proj.key}]</span> ${proj.name}
                            </button>
                          </td>
                          <td>
                            ${cp
                              ? html`
                                  <button
                                    type="button"
                                    class="link-btn"
                                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                                  >
                                    ${cp.name}
                                  </button>
                                `
                              : t.viewTexts.projectDetail.internalProject}
                          </td>
                          <td class="mono">${proj.budget ? `${proj.budget.toLocaleString('ru-RU')} ₽` : '—'}</td>
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
                            <button
                              type="button"
                              class="icon-btn"
                              title="${t.projectChat.title}"
                              @click="${() => store.openProjectChat(proj.id)}"
                            >
                              ${iconMessageSquare(14)}
                            </button>
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
                              <button
                                type="button"
                                class="link-btn"
                                @click="${() => store.openEmployeeDetail(emp.id)}"
                              >
                                ${emp.name}
                              </button>
                              <span class="emp-role">${emp.role}</span>
                            </div>
                          </div>
                        </td>
                        <td>${emp.department || '—'}</td>
                        <td class="mono">${emp.email || '—'}</td>
                        <td class="mono">
                          ${(emp.hourlyRate || 2800).toLocaleString('ru-RU')} ${t.viewTexts.employees.rateUnit}
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
                            <button
                              type="button"
                              class="link-btn"
                              @click="${() => store.openContractDetail(ctr.id)}"
                            >
                              <span class="row-key">${ctr.number}</span> · ${ctr.title}
                            </button>
                            ${proj ? html`<div class="emp-role">[${proj.key}] ${proj.name}</div>` : ''}
                          </td>
                          <td>
                            ${cp
                              ? html`
                                  <button
                                    type="button"
                                    class="link-btn"
                                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                                  >
                                    ${cp.name}
                                  </button>
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

  private renderDocumentsSection(
    company: Company,
    companyDocs: DocumentItem[],
    t: ReturnType<typeof getTranslation>
  ) {
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
              <div class="rows-list">
                ${companyDocs.map((doc) => this.renderDocumentRow(doc, t))}
              </div>
            `}
      </app-section-card>
    `;
  }

  private renderDocumentRow(doc: DocumentItem, t: ReturnType<typeof getTranslation>) {
    const extLabel = (doc.extension || 'file').toUpperCase();
    return html`
      <div class="list-row clickable" @click="${() => (this.previewDoc = doc)}">
        <div class="row-main">
          <div class="row-title">
            <span class="ext-badge">${extLabel}</span>
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
          <button
            type="button"
            class="icon-btn"
            title="${t.documents.previewTitle}"
            @click="${() => (this.previewDoc = doc)}"
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
    const statusOptions = [
      { value: 'active', label: t.viewTexts.companies.filterActive, color: '#10b981' },
      { value: 'inactive', label: t.viewTexts.companies.filterInactive, color: '#64748b' },
    ];
    const directorOptions = [
      { value: '', label: t.viewTexts.companies.optionUnassignedDirector },
      ...store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
    ];

    return html`
      <app-modal
        ?open="${this.editModalOpen}"
        size="lg"
        title="${t.viewTexts.companyDetail.editCompanyModalTitle}"
        @close="${() => (this.editModalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${t.viewTexts.companies.labelShortName}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.companies.labelLegalName}"
              .value="${this.formLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLegalName = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.companies.labelInn}"
              .value="${this.formInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formInn = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.companies.labelKpp}"
              .value="${this.formKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formKpp = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.companies.metaIndustry}"
              .value="${this.formIndustry}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formIndustry = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.companies.metaCity}"
              .value="${this.formCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formCity = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.companies.metaPhone}"
              .value="${this.formPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formPhone = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.formEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formEmail = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.companies.labelWebsite}"
              .value="${this.formWebsite}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formWebsite = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.companies.metaDirector}"
              .value="${this.formDirectorId}"
              .options="${directorOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDirectorId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.companies.labelStatus}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as CompanyStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.companies.labelDescription}"
              .value="${this.formDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.editModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveEdit}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
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
                rows="2"
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
    const canShowImage = Boolean(doc.dataUrl) && isImageMimeOrExt(doc.mimeType, doc.extension);
    const canShowText = Boolean(doc.textContent) && isTextMimeOrExt(doc.mimeType, doc.extension);

    return html`
      <app-modal
        open
        size="lg"
        title="${doc.title}"
        @close="${() => (this.previewDoc = null)}"
      >
        <div class="preview-box">
          <div class="preview-meta-row">
            <span class="mono">${doc.fileName} · v${doc.version} · ${formatFileSize(doc.sizeBytes, t)}</span>
            <app-status-chip domain="document" status="${doc.status}" appearance="soft" size="sm"></app-status-chip>
          </div>

          ${doc.description ? html`<p class="company-desc">${doc.description}</p>` : ''}

          ${canShowImage
            ? html`
                <div class="preview-image-frame">
                  <img src="${doc.dataUrl!}" alt="${doc.title}" />
                </div>
              `
            : canShowText
            ? html`
                <div style="display: flex; justify-content: flex-end;">
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => {
                      navigator.clipboard?.writeText(doc.textContent || '');
                      this.copiedText = true;
                      window.setTimeout(() => (this.copiedText = false), 1500);
                    }}"
                  >
                    <span slot="icon-start">${iconCopy(13)}</span>
                    <span>
                      ${this.copiedText ? t.viewTexts.documents.copiedContent : t.viewTexts.documents.copyContent}
                    </span>
                  </app-button>
                </div>
                <pre class="preview-code">${doc.textContent}</pre>
              `
            : html`
                <div class="preview-binary-box">
                  ${iconFile(28)}
                  <strong style="color: var(--text-primary);">${t.documents.previewNotAvailable}</strong>
                  <span>${t.documents.binaryPreviewHint}</span>
                </div>
              `}
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

  private openEditModal(company: Company) {
    this.formName = company.name;
    this.formLegalName = company.legalName;
    this.formInn = company.inn;
    this.formKpp = company.kpp || '';
    this.formIndustry = company.industry;
    this.formCity = company.city;
    this.formPhone = company.phone;
    this.formEmail = company.email;
    this.formWebsite = company.website || '';
    this.formDirectorId = company.directorId || '';
    this.formStatus = company.status;
    this.formDescription = company.description;
    this.formError = '';
    this.editModalOpen = true;
  }

  private handleSaveEdit() {
    if (!this.formName.trim()) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }
    store.updateCompany({
      id: this.detailCompanyId,
      name: this.formName.trim(),
      legalName: this.formLegalName.trim() || this.formName.trim(),
      inn: this.formInn.trim() || '7700000000',
      kpp: this.formKpp.trim(),
      industry: this.formIndustry.trim() || 'IT / Software',
      city: this.formCity.trim() || '—',
      phone: this.formPhone.trim() || '—',
      email: this.formEmail.trim() || '—',
      website: this.formWebsite.trim(),
      directorId: this.formDirectorId || undefined,
      status: this.formStatus,
      description: this.formDescription.trim(),
    });
    this.editModalOpen = false;
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
    this.uploadDocModalOpen = true;
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

    store.addDocument({
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
    this.uploadDocModalOpen = false;
  }
}
