import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Company, CompanyStatus } from '../../../types';
import { iconBookOpen, iconBuilding, iconEdit, iconPlus, iconTrash } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import styles from './app-companies.css';
import { eventValue } from '../../common/event-value';

@customElement('app-companies')
export class AppCompanies extends LitElement {
  @state() private companies: Company[] = store.companies;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | CompanyStatus = 'all';

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
    this.companies = store.companies;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
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
    const isRu = this.currentLang === 'ru';
    const filtered = this.getFilteredCompanies();
    const activeCount = this.companies.filter((c) => c.status === 'active').length;
    const totalEmployees = store.users.filter((u) => Boolean(u.companyId)).length;
    const activeContracts = store.contracts.filter((c) => c.status === 'active').length;

    const statusOptions = [
      { value: 'all', label: isRu ? 'Все статусы' : 'All statuses' },
      { value: 'active', label: isRu ? 'Активная' : 'Active', color: '#10b981' },
      { value: 'inactive', label: isRu ? 'Архив' : 'Inactive', color: '#64748b' },
    ];

    const directorOptions = [
      { value: '', label: isRu ? 'Не указан' : 'Unassigned' },
      ...store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
    ];

    return html`
      <app-page-header
        title="${isRu ? 'Компании' : 'Companies'}"
        subtitle="${isRu
          ? 'Юридические лица, подразделения группы и привязка к проектам и договорам'
          : 'Legal entities, group divisions, and links to projects and contracts'}"
      >
        <span slot="icon">${iconBuilding(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${isRu ? 'Добавить компанию' : 'Add Company'}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${isRu ? 'Всего компаний' : 'Total Companies'}" value="${this.companies.length}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Действующих' : 'Active'}" value="${activeCount}" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Сотрудников в группе' : 'Group Employees'}" value="${totalEmployees}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Действующих договоров' : 'Active Contracts'}" value="${activeContracts}"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${isRu ? 'Поиск по названию, ИНН, городу...' : 'Search by name, INN, city...'}"
        .searchValue="${this.localSearch}"
        .filters="${[{ key: 'status', options: statusOptions }]}"
        .values="${{ status: this.statusFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => (this.localSearch = eventValue(e))}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | CompanyStatus;
        }}"
      ></app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${isRu ? 'Компании не найдены' : 'No companies found'}"></app-empty-state>`
        : html`
            <div class="cards-grid">
              ${filtered.map((company) => {
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
                          <div class="company-name">${company.name}</div>
                          <div class="company-legal" title="${company.legalName}">${company.legalName}</div>
                        </div>
                      </div>
                      <app-status-chip domain="company" status="${company.status}"></app-status-chip>
                    </div>

                    <p class="company-desc">${company.description}</p>

                    <div class="meta-grid">
                      <div class="meta-item">
                        <span class="meta-label">${isRu ? 'ИНН / КПП' : 'Tax ID'}</span>
                        <span class="meta-value mono">
                          ${company.inn}${company.kpp ? ` / ${company.kpp}` : ''}
                        </span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">${isRu ? 'Город' : 'City'}</span>
                        <span class="meta-value">${company.city}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">${isRu ? 'Руководитель' : 'Director'}</span>
                        <span class="meta-value">${director?.name || '—'}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">${isRu ? 'Отрасль' : 'Industry'}</span>
                        <span class="meta-value" title="${company.industry}">${company.industry}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">${isRu ? 'Телефон' : 'Phone'}</span>
                        <span class="meta-value mono">${company.phone}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">Email</span>
                        <span class="meta-value">${company.email}</span>
                      </div>
                    </div>

                    <div class="card-footer">
                      <div class="stats-row">
                        <span class="stat-pill">
                          ${isRu ? 'Сотр.' : 'Staff'}: <strong>${empCount}</strong>
                        </span>
                        <span class="stat-pill">
                          ${isRu ? 'Проектов' : 'Projects'}: <strong>${projCount}</strong>
                        </span>
                        <span class="stat-pill">
                          ${isRu ? 'Договоров' : 'Contracts'}: <strong>${ctrCount}</strong>
                        </span>
                      </div>
                      <div class="card-actions">
                        <button
                          type="button"
                          class="icon-btn"
                          title="${isRu ? 'База знаний компании' : 'Company Knowledge Base'}"
                          @click="${() => store.openKnowledgeBase({ scope: 'company', companyId: company.id })}"
                        >
                          ${iconBookOpen(14)}
                        </button>
                        <button
                          type="button"
                          class="icon-btn"
                          title="${isRu ? 'Редактировать' : 'Edit'}"
                          @click="${() => this.openEditModal(company)}"
                        >
                          ${iconEdit(14)}
                        </button>
                        <button
                          type="button"
                          class="icon-btn danger"
                          title="${isRu ? 'Удалить' : 'Delete'}"
                          @click="${() => (this.deletingCompany = company)}"
                        >
                          ${iconTrash(14)}
                        </button>
                      </div>
                    </div>
                  </article>
                `;
              })}
            </div>
          `}

      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId
          ? isRu
            ? 'Редактирование компании'
            : 'Edit Company'
          : isRu
          ? 'Новая компания'
          : 'New Company'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${isRu ? 'Краткое название' : 'Short Name'}"
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
              label="${isRu ? 'Юридическое наименование' : 'Legal Name'}"
              .value="${this.formLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLegalName = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'ИНН' : 'Tax ID (INN)'}"
              .value="${this.formInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formInn = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'КПП' : 'KPP'}"
              .value="${this.formKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formKpp = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Отрасль' : 'Industry'}"
              .value="${this.formIndustry}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formIndustry = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Город' : 'City'}"
              .value="${this.formCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formCity = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Телефон' : 'Phone'}"
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
              label="${isRu ? 'Руководитель' : 'Director'}"
              .value="${this.formDirectorId}"
              .options="${directorOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDirectorId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as CompanyStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Описание деятельности' : 'Description'}"
              .value="${this.formDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button variant="primary" @click="${this.handleSave}">
            ${isRu ? 'Сохранить' : 'Save'}
          </app-button>
        </div>
      </app-modal>

      <app-confirm-dialog
        .open="${Boolean(this.deletingCompany)}"
        size="sm"
        title="${isRu ? 'Удалить компанию?' : 'Delete company?'}"
        action="${isRu
          ? `Компания «${this.deletingCompany?.name || ''}» будет удалена из справочника.`
          : `Company "${this.deletingCompany?.name || ''}" will be removed from the directory.`}"
        result="${isRu
          ? 'Договоры и проекты компании останутся без привязки к компании.'
          : 'Contracts and projects of the company will lose their company link.'}"
        .actionLabel="${isRu ? 'Выполняемое действие:' : 'Action performed:'}"
        .resultLabel="${isRu ? 'Ожидаемый результат:' : 'Expected result:'}"
        .cancelLabel="${isRu ? 'Отмена' : 'Cancel'}"
        .confirmLabel="${isRu ? 'Удалить' : 'Delete'}"
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

  private openCreateModal() {
    this.editingId = null;
    this.formName = '';
    this.formLegalName = '';
    this.formInn = '';
    this.formKpp = '';
    this.formIndustry = '';
    this.formCity = 'Москва';
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
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const payload = {
      name: this.formName.trim(),
      legalName: this.formLegalName.trim() || this.formName.trim(),
      inn: this.formInn.trim() || '7700000000',
      kpp: this.formKpp.trim(),
      industry: this.formIndustry.trim() || 'IT / Software',
      city: this.formCity.trim() || 'Москва',
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