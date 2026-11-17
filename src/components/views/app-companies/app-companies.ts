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
import '../../common/app-input/app-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-modal/app-modal';
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
  @state() private editingId: string | null = null;
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
        c.industry.toLowerCase().includes(query)
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

    const directorOptions = [
      { value: '', label: t.viewTexts.companies.optionUnassignedDirector },
      ...store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
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

      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId ? t.viewTexts.companies.modalTitleEdit : t.viewTexts.companies.modalTitleCreate}"
        @close="${() => (this.modalOpen = false)}"
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
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as CompanyStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-input
              label="${t.viewTexts.companies.labelWebsite}"
              .value="${this.formWebsite}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formWebsite = eventValue(e))}"
            ></app-input>
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
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSave}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>

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
                  class="danger-action"
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

  private openCreateModal() {
    this.editingId = null;
    this.formName = '';
    this.formLegalName = '';
    this.formInn = '';
    this.formKpp = '';
    this.formIndustry = '';
    this.formCity = getTranslation(this.currentLang).viewTexts.companies.defaultCity;
    this.formPhone = '';
    this.formEmail = '';
    this.formWebsite = '';
    this.formDirectorId = store.users[0]?.id || '';
    this.formStatus = 'active';
    this.formDescription = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(company: Company) {
    this.editingId = company.id;
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
    this.modalOpen = true;
  }

  private handleSave() {
    if (!this.formName.trim()) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }

    const payload = {
      name: this.formName.trim(),
      legalName: this.formLegalName.trim() || this.formName.trim(),
      inn: this.formInn.trim() || '7700000000',
      kpp: this.formKpp.trim(),
      industry: this.formIndustry.trim() || 'IT / Software',
      city: this.formCity.trim() || getTranslation(this.currentLang).viewTexts.companies.defaultCity,
      phone: this.formPhone.trim() || '—',
      email: this.formEmail.trim() || '—',
      website: this.formWebsite.trim(),
      directorId: this.formDirectorId || undefined,
      status: this.formStatus,
      description: this.formDescription.trim(),
    };

    if (this.editingId) {
      store.updateCompany({ id: this.editingId, ...payload });
    } else {
      store.addCompany(payload);
    }

    this.modalOpen = false;
  }
}