import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Company, CompanyStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import {
  iconBookOpen,
  iconBuilding,
  iconChevronRight,
  iconEdit,
  iconFolderOpen,
  iconLandmark,
  iconPlus,
  iconTrash,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/card-footer/card-footer';
import '../../common/app-company-form/app-company-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-pagination/app-pagination';
import { paginateItems } from '../../common/paginate';
import styles from './app-companies.css';
import { eventValue } from '../../common/event-value';

@customElement('app-companies')
export class AppCompanies extends LitElement {
  @state() private companies: Company[] = store.companies;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | CompanyStatus = 'all';
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;

  @state() private modalOpen = false;
  @state() private editingCompany: Company | null = null;

  @state() private deletingCompany: Company | null = null;

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
    this.currentPage = store.activeView === 'companies' ? store.activePage : 1;
    this.companies = store.companies;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.cardPageSize = store.customization.cardGridPageSize;
  }

  private getFilteredCompanies(): Company[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.companies.filter((c) => {
      if (this.statusFilter !== 'all' && c.status !== this.statusFilter) return false;
      if (!query) return true;
      return (
        c.name.toLowerCase().includes(query) ||
        c.legalName.toLowerCase().includes(query) ||
        c.inn.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query) ||
        c.industry.toLowerCase().includes(query) ||
        (c.bankAccounts || []).some(
          (b) =>
            b.bankName.toLowerCase().includes(query) ||
            b.accountNumber.toLowerCase().includes(query) ||
            b.currency.toLowerCase().includes(query)
        )
      );
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFilteredCompanies();
    const activeCount = this.companies.filter((c) => c.status === 'active').length;
    const totalEmployees = store.users.filter((u) => Boolean(u.companyId)).length;
    const activeContracts = store.contracts.filter((c) => c.status === 'active').length;

    const statusOptions = [
      { value: 'all', label: t.viewTexts.companies.filterAllStatuses },
      { value: 'active', label: t.viewTexts.companies.filterActive, color: '#10b981' },
      { value: 'inactive', label: t.viewTexts.companies.filterInactive, color: '#64748b' },
    ];

    return html`
      <app-page-header
        title="${t.viewTexts.companies.pageTitle}"
        subtitle="${t.viewTexts.pageSubtitles.companies}"
      >
        <span slot="icon">${iconBuilding(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.viewTexts.companies.addCompanyButton}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.viewTexts.companies.kpiTotalCompanies}" value="${this.companies.length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.companies.kpiActive}" value="${activeCount}" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.companies.kpiGroupEmployees}" value="${totalEmployees}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.companies.kpiActiveContracts}" value="${activeContracts}"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${t.viewTexts.companies.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[{ key: 'status', options: statusOptions }]}"
        .values="${{ status: this.statusFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | CompanyStatus;
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      ></app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.companies.emptyNoCompanies}"></app-empty-state>`
        : this.renderCardsGrid(filtered, t)}

      <app-company-form
        .open="${this.modalOpen}"
        .company="${this.editingCompany}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-company-form>

      <app-confirm-dialog
        .open="${Boolean(this.deletingCompany)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.companyDelete.title}"
        action="${t.viewTexts.confirmDialogs.companyDelete.action(this.deletingCompany?.name || '')}"
        result="${t.viewTexts.confirmDialogs.companyDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingCompany = null)}"
        @confirm="${() => {
          if (this.deletingCompany) {
            store.deleteCompany(this.deletingCompany.id);
            this.deletingCompany = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderCardsGrid(filtered: Company[], t: ReturnType<typeof getTranslation>) {
    const paged = paginateItems(filtered, this.currentPage, this.cardPageSize);

    return html`
      <div class="cards-grid">
        ${paged.items.map((company) => {
          const director = store.users.find((u) => u.id === company.directorId);
          const empCount = store.users.filter((u) => u.companyId === company.id).length;
          const projCount = store.projects.filter((p) => p.companyId === company.id).length;
          const ctrCount = store.contracts.filter((c) => c.companyId === company.id).length;

          return html`
            <article class="company-card">
              <div class="card-top">
                <div class="company-identity">
                  <div class="company-icon">${iconBuilding(20)}</div>
                  <div class="company-names">
                    <button
                      type="button"
                      class="company-name-btn"
                      @click="${() => store.openCompanyDetail(company.id)}"
                    >
                      ${company.name}
                    </button>
                    <div class="company-legal" title="${company.legalName}">${company.legalName}</div>
                  </div>
                </div>
                <app-status-chip domain="company" status="${company.status}"></app-status-chip>
              </div>

              <p class="company-desc">${company.description}</p>

              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.companies.metaTaxId}</span>
                  <span class="meta-value mono">
                    ${company.inn}${company.kpp ? ` / ${company.kpp}` : ''}
                  </span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.companies.metaCity}</span>
                  <span class="meta-value">${company.city}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.companies.metaDirector}</span>
                  <span class="meta-value">${director?.name || '—'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.companies.metaIndustry}</span>
                  <span class="meta-value" title="${company.industry}">${company.industry}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.companies.metaPhone}</span>
                  <span class="meta-value mono">${company.phone}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Email</span>
                  <span class="meta-value">${company.email}</span>
                </div>
              </div>

              ${this.renderBankSummary(company, t)}

              <card-footer>
                <div slot="start" class="stats-row">
                  <span class="stat-pill">
                    ${t.viewTexts.companies.staffCountLabel}: <strong>${empCount}</strong>
                  </span>
                  <span class="stat-pill">
                    ${t.viewTexts.companies.projectsCountLabel}: <strong>${projCount}</strong>
                  </span>
                  <span class="stat-pill">
                    ${t.viewTexts.companies.contractsCountLabel}: <strong>${ctrCount}</strong>
                  </span>
                </div>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  title="${t.viewTexts.companies.documentsTitle}"
                  @click="${() => store.openDocuments({ scope: 'company', companyId: company.id })}"
                >
                  <span slot="start">${iconFolderOpen(14)}</span>
                </app-button>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  title="${t.viewTexts.companies.knowledgeBaseTitle}"
                  @click="${() => store.openKnowledgeBase({ scope: 'company', companyId: company.id })}"
                >
                  <span slot="start">${iconBookOpen(14)}</span>
                </app-button>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  title="${t.common.edit}"
                  @click="${() => this.openEditModal(company)}"
                >
                  <span slot="start">${iconEdit(14)}</span>
                </app-button>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  action="delete"
                  title="${t.common.delete}"
                  @click="${() => (this.deletingCompany = company)}"
                >
                  <span slot="start">${iconTrash(14)}</span>
                </app-button>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  title="${t.viewTexts.companies.openCardButton}"
                  @click="${() => store.openCompanyDetail(company.id)}"
                >
                  <span slot="start">${iconChevronRight(15)}</span>
                </app-button>
              </card-footer>
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
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderBankSummary(company: Company, t: ReturnType<typeof getTranslation>) {
    const accounts = company.bankAccounts || [];
    const currencies = Array.from(new Set(accounts.map((a) => a.currency)));
    const primary = accounts.find((a) => a.isDefault) || accounts[0];

    return html`
      <div class="bank-summary-row">
        <div class="bank-summary-left">
          <span class="bank-summary-icon">${iconLandmark(14)}</span>
          ${accounts.length === 0
            ? html`<span>${t.bankAccounts.noAccountsShort}</span>`
            : html`
                <span class="bank-summary-name" title="${primary?.bankName || ''}">
                  ${primary?.bankName}${accounts.length > 1 ? ` (+${accounts.length - 1})` : ''}
                </span>
              `}
        </div>
        ${currencies.length > 0
          ? html`
              <div class="bank-currencies">
                ${currencies.map((cur) => html`<span class="currency-chip">${cur}</span>`)}
              </div>
            `
          : ''}
      </div>
    `;
  }

  private openCreateModal() {
    this.editingCompany = null;
    this.modalOpen = true;
  }

  private openEditModal(company: Company) {
    this.editingCompany = company;
    this.modalOpen = true;
  }
}