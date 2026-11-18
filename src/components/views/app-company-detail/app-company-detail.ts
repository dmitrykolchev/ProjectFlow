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
} from '../../common/document-utils';
import {
  BankRequisite,
  Company,
  Contract,
  DocumentItem,
  InvoicePayment,
  KnowledgeArticle,
  Project,
  User,
} from '../../../types';
import {
  iconAlertTriangle,
  iconArrowDownLeft,
  iconArrowUpRight,
  iconBookOpen,
  iconCheck,
  iconChevronLeft,
  iconChevronRight,
  iconCpu,
  iconCreditCard,
  iconDownload,
  iconEdit,
  iconEye,
  iconFileText,
  iconFolder,
  iconFolderOpen,
  iconGlobe,
  iconLandmark,
  iconMessageSquare,
  iconPlus,
  iconSearch,
  iconTag,
  iconTrash,
  iconUpload,
  iconUsers,
  iconWallet,
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
import '../../common/app-document-previewer/app-document-previewer';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-input/app-input';
import '../../common/app-meta-grid/app-meta-grid';
import '../../common/app-modal/app-modal';
import '../../common/app-document-form/app-document-form';
import '../../common/app-tags-row/app-tags-row';
import '../../common/app-project-form/app-project-form';
import '../../common/app-company-form/app-company-form';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-textarea/app-textarea';
import '../../common/app-bank-requisites/app-bank-requisites';
import '../../common/app-payment-form/app-payment-form';
import '../../common/app-entity-reminders/app-entity-reminders';
import type { AppBankRequisites } from '../../common/app-bank-requisites/app-bank-requisites';
import { eventValue } from '../../common/event-value';
import styles from './app-company-detail.css';

type CompanyDetailTab =
  | 'overview'
  | 'projects'
  | 'employees'
  | 'contracts'
  | 'payments'
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

  // Quick Payment modal state
  @state() private paymentModalOpen = false;

  // Quick Upload Document modal state
  @state() private uploadDocModalOpen = false;

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

  private handleBankAccountsChange(company: Company, bankAccounts: BankRequisite[]) {
    store.updateCompany({ ...company, bankAccounts });
  }

  private openAddBankAccount() {
    const el = this.shadowRoot?.querySelector('app-bank-requisites') as AppBankRequisites | null;
    el?.openAddEditor();
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
    const companyPayments = store.payments
      .filter((p) => p.companyId === company.id)
      .sort((a, b) => (b.paymentDate + b.createdAt).localeCompare(a.paymentDate + a.createdAt));
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
              action="delete"
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
              { value: 'payments', label: `${t.companyDetail.paymentsTab} (${companyPayments.length})` },
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
          companyPayments,
          companyDocs,
          companyArticles,
          t
        )}
      </div>

      ${this.renderEditModal(t)}
      ${this.renderDeleteModal(company, t)}
      ${this.renderQuickProjectModal(company, t)}
      ${this.renderPaymentModal(company, companyContracts)}
      ${this.renderUploadDocModal(company, companyProjects, t)}
      ${this.renderPreviewModal(t)}
    `;
  }

  private renderTabContent(
    company: Company,
    companyProjects: Project[],
    companyEmployees: User[],
    companyContracts: Contract[],
    companyPayments: InvoicePayment[],
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
      case 'payments':
        return this.renderPaymentsSection(company, companyPayments, t);
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
    const bankAccounts = company.bankAccounts || [];
    return html`
      <app-section-card title="${t.bankAccounts.title}" subtitle="(${bankAccounts.length})">
        <span slot="icon">${iconLandmark(18)}</span>
        <app-button
          slot="actions"
          size="sm"
          variant="secondary"
          @click="${() => this.openAddBankAccount()}"
        >
          <span slot="icon-start">${iconPlus(14)}</span>
          <span>${t.bankAccounts.addButton}</span>
        </app-button>

        <app-bank-requisites
          editable
          hide-header
          confirm-delete
          .accounts="${bankAccounts}"
          @accounts-change="${(e: CustomEvent<{ accounts: BankRequisite[] }>) =>
            this.handleBankAccountsChange(company, e.detail.accounts)}"
        ></app-bank-requisites>
      </app-section-card>

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

      <app-entity-reminders entity-type="company" .entityId="${company.id}"></app-entity-reminders>
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

  private renderPaymentsSection(
    _company: Company,
    companyPayments: InvoicePayment[],
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-section-card title="${t.companyDetail.paymentsTab}" subtitle="(${companyPayments.length})">
        <span slot="icon">${iconWallet(18)}</span>
        <app-button
          slot="actions"
          size="sm"
          variant="primary"
          @click="${() => (this.paymentModalOpen = true)}"
        >
          <span slot="icon-start">${iconCreditCard(14)}</span>
          <span>${t.companyDetail.recordCompanyPayment}</span>
        </app-button>

        ${companyPayments.length === 0
          ? html`<app-empty-state compact title="${t.companyDetail.noPayments}"></app-empty-state>`
          : html`
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${t.payments.paymentDate}</th>
                      <th>${t.viewTexts.payments.thDirection}</th>
                      <th>${t.payments.documentNumber}</th>
                      <th>${t.viewTexts.payments.labelCompanyBankAccount}</th>
                      <th>${t.viewTexts.payments.thCounterparty}</th>
                      <th>${t.viewTexts.payments.thContract}</th>
                      <th>${t.payments.paymentMethod}</th>
                      <th>${t.viewTexts.payments.thAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${companyPayments.map((pay) => {
                      const cp = pay.counterpartyId
                        ? store.counterparties.find((c) => c.id === pay.counterpartyId)
                        : undefined;
                      const ctr = pay.contractId
                        ? store.contracts.find((c) => c.id === pay.contractId)
                        : undefined;
                      const inv = pay.invoiceId
                        ? store.invoices.find((i) => i.id === pay.invoiceId)
                        : undefined;
                      const compReq = store.getPaymentCompanyRequisitesLabel(pay);
                      const cpReq = store.getPaymentCounterpartyRequisitesLabel(pay);
                      const isOutgoing = pay.direction === 'outgoing';
                      return html`
                        <tr>
                          <td class="mono" style="white-space: nowrap;">${pay.paymentDate}</td>
                          <td>
                            <app-status-chip
                              domain="paymentDirection"
                              status="${pay.direction}"
                              appearance="soft"
                              size="sm"
                            ></app-status-chip>
                          </td>
                          <td class="mono" style="font-weight: 700; white-space: nowrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.3rem;">
                              <span style="color: ${isOutgoing ? '#f59e0b' : '#10b981'}; display: inline-flex;">
                                ${isOutgoing ? iconArrowUpRight(13) : iconArrowDownLeft(13)}
                              </span>
                              <span>${pay.documentNumber || '—'}</span>
                            </span>
                          </td>
                          <td class="mono" style="font-size: 0.78rem; color: var(--text-secondary);">
                            ${compReq
                              ? html`<span style="display: inline-flex; align-items: center; gap: 0.28rem;">${iconLandmark(12)}<span>${compReq}</span></span>`
                              : t.viewTexts.payments.noBankAccountOption}
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
                            ${cpReq ? html`<div class="emp-role mono">${cpReq}</div>` : ''}
                          </td>
                          <td>
                            ${ctr
                              ? html`
                                  <app-link
                                    class="link-btn"
                                    size="md"
                                    variant="primary"
                                    @click="${() => store.openContractDetail(ctr.id)}"
                                  >
                                    <span class="link-wrap"><span class="link-inner">${inv ? inv.number : ctr.number}</span></span>
                                  </app-link>
                                  <div class="emp-role">${ctr.number}</div>
                                `
                              : html`<span class="emp-role">${t.viewTexts.payments.standalonePayment}</span>`}
                          </td>
                          <td>
                            <app-badge variant="default" appearance="soft" size="sm">
                              ${t.payments.methods[pay.method]}
                            </app-badge>
                          </td>
                          <td class="mono" style="font-weight: 700; white-space: nowrap; color: ${isOutgoing ? '#f59e0b' : '#10b981'};">
                            ${isOutgoing ? '−' : '+'}${formatMoney(pay.amount, pay.currency)}
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

  private renderPaymentModal(company: Company, companyContracts: Contract[]) {
    if (!this.paymentModalOpen) return '';
    const companyContractIds = new Set(companyContracts.map((c) => c.id));
    const payableInvoices = store.invoices.filter(
      (i) =>
        (i.companyId === company.id || companyContractIds.has(i.contractId)) &&
        i.status !== 'draft' &&
        i.status !== 'cancelled' &&
        store.getInvoiceRemainingAmount(i) > 0
    );
    return html`
      <app-payment-form
        .open="${this.paymentModalOpen}"
        .invoice="${null}"
        .payableInvoices="${payableInvoices}"
        .defaultCompanyId="${company.id}"
        @close="${() => (this.paymentModalOpen = false)}"
        @saved="${() => (this.paymentModalOpen = false)}"
      ></app-payment-form>
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
                  ${activeDoc ? this.renderEditableTagsBar(activeDoc, t) : ''}
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
    return html`
      <app-project-form
        .open="${this.projectModalOpen}"
        .presetCompanyId="${company.id}"
        .presetCounterpartyId="${''}"
        .presetStatus="${'active'}"
        .presetKey="${`PRJ${store.projects.length + 1}`}"
        .presetBudget="${2000000}"
        saveLabel="${t.common.create}"
        @close="${() => (this.projectModalOpen = false)}"
        @saved="${(e: CustomEvent<{ project: Project }>) => {
          this.projectModalOpen = false;
          store.openProjectDetail(e.detail.project.id);
        }}"
      ></app-project-form>
    `;
  }

  private renderUploadDocModal(
    company: Company,
    companyProjects: Project[],
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-document-form
        .open="${this.uploadDocModalOpen}"
        .presetCompanyId="${company.id}"
        .presetCategory="${'legal'}"
        .presetStatus="${'approved'}"
        .presetTags="${company.name.toLowerCase()}"
        .contextTitle="${t.companyDetail.uploadDocument}"
        @close="${() => (this.uploadDocModalOpen = false)}"
        @saved="${(e: CustomEvent<{ document: DocumentItem }>) => {
          this.selectedDocId = e.detail.document.id;
          this.docTypeFilter = 'all';
          this.docSearchQuery = '';
          this.activeTab = 'documents';
          this.uploadDocModalOpen = false;
        }}"
      ></app-document-form>
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

          ${this.renderEditableTagsBar(doc, t)}

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
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <div class="preview-tags-bar">
        <span class="preview-tags-label">
          ${iconTag(13)}
          <span>${t.documents.tagsLabel}:</span>
        </span>
        <app-tags-row
          style="flex: 1;"
          mode="add-form"
          showEmptyLabel
          .tags="${doc.tags}"
          @tag-remove="${(e: CustomEvent<{ tag: string }>) =>
            this.removeTagFromDoc(doc, e.detail.tag)}"
          @tag-add="${(e: CustomEvent<{ tag: string }>) =>
            this.commitTagToDoc(doc, e.detail.tag)}"
        ></app-tags-row>
      </div>
    `;
  }

  private openEditModal(company: Company) {
    this.editModalOpen = true;
  }

  private openQuickProjectModal() {
    this.projectModalOpen = true;
  }

  private openUploadDocModal(company: Company) {
    this.uploadDocModalOpen = true;
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


}
