import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Counterparty, CounterpartyStatus, CounterpartyType } from '../../../types';
import { iconChevronRight, iconEdit, iconHandshake, iconPlus, iconSearch, iconTrash } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import styles from './app-counterparties.css';

@customElement('app-counterparties')
export class AppCounterparties extends LitElement {
  @state() private counterparties: Counterparty[] = store.counterparties;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private typeFilter: 'all' | CounterpartyType = 'all';
  @state() private statusFilter: 'all' | CounterpartyStatus = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';

  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
  @state() private formName = '';
  @state() private formLegalName = '';
  @state() private formType: CounterpartyType = 'client';
  @state() private formInn = '';
  @state() private formKpp = '';
  @state() private formCity = '';
  @state() private formContactPerson = '';
  @state() private formPhone = '';
  @state() private formEmail = '';
  @state() private formStatus: CounterpartyStatus = 'active';
  @state() private formRating = 5;
  @state() private formNotes = '';
  @state() private formError = '';

  @state() private deletingItem: Counterparty | null = null;

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
    this.counterparties = store.counterparties;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
  }

  private getFiltered(): Counterparty[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.counterparties.filter((cp) => {
      if (this.typeFilter !== 'all' && cp.type !== this.typeFilter) return false;
      if (this.statusFilter !== 'all' && cp.status !== this.statusFilter) return false;
      if (!query) return true;
      return (
        cp.name.toLowerCase().includes(query) ||
        cp.legalName.toLowerCase().includes(query) ||
        cp.inn.toLowerCase().includes(query) ||
        cp.city.toLowerCase().includes(query) ||
        cp.contactPerson.toLowerCase().includes(query)
      );
    });
  }

  private renderStars(rating: number) {
    const clamped = Math.max(1, Math.min(5, Math.round(rating || 5)));
    return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
  }

  render() {
    const isRu = this.currentLang === 'ru';
    const filtered = this.getFiltered();

    const clientsCount = this.counterparties.filter((c) => c.type === 'client').length;
    const contractorsVendorsCount = this.counterparties.filter(
      (c) => c.type === 'vendor' || c.type === 'contractor' || c.type === 'partner'
    ).length;
    const activePortfolioRub = store.contracts
      .filter((c) => c.status === 'active' && c.currency === 'RUB')
      .reduce((acc, c) => acc + c.amount, 0);

    const typeOptions = [
      { value: 'all', label: isRu ? 'Все типы' : 'All types' },
      { value: 'client', label: isRu ? 'Заказчик' : 'Client', color: '#6366f1' },
      { value: 'vendor', label: isRu ? 'Поставщик' : 'Vendor', color: '#0284c7' },
      { value: 'partner', label: isRu ? 'Партнёр' : 'Partner', color: '#f59e0b' },
      { value: 'contractor', label: isRu ? 'Подрядчик' : 'Contractor', color: '#64748b' },
    ];

    const statusOptions = [
      { value: 'all', label: isRu ? 'Все статусы' : 'All statuses' },
      { value: 'active', label: isRu ? 'Активный' : 'Active', color: '#10b981' },
      { value: 'pending', label: isRu ? 'На проверке' : 'Pending', color: '#f59e0b' },
      { value: 'blocked', label: isRu ? 'Заблокирован' : 'Blocked', color: '#ef4444' },
    ];

    return html`
      <app-page-header
        title="${isRu ? 'Контрагенты' : 'Counterparties'}"
        subtitle="${isRu
          ? 'Заказчики, поставщики, подрядчики, рейтинг надёжности и связанные договоры'
          : 'Clients, vendors, contractors, reliability ratings, and linked contracts'}"
      >
        <span slot="icon">${iconHandshake(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${isRu ? 'Добавить контрагента' : 'Add Counterparty'}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${isRu ? 'Всего контрагентов' : 'Total Counterparties'}" value="${this.counterparties.length}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Заказчики' : 'Clients'}" value="${clientsCount}" valueColor="var(--accent-primary, #6366f1)"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Поставщики и подрядчики' : 'Vendors & Partners'}" value="${contractorsVendorsCount}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Портфель активных договоров' : 'Active Contract Portfolio'}" value="${(activePortfolioRub / 1_000_000).toFixed(1)}M ₽"></app-metric-card>
      </app-kpi-strip>

      <div class="toolbar">
        <div class="toolbar-filters">
          <div class="filter-search">
            <app-input
              placeholder="${isRu ? 'Поиск по названию, ИНН, контакту...' : 'Search name, INN, contact...'}"
              .value="${this.localSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
            >
              <span slot="icon">${iconSearch(15)}</span>
            </app-input>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.typeFilter}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.typeFilter = e.detail.value as 'all' | CounterpartyType)}"
            ></app-select>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.statusFilter}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.statusFilter = e.detail.value as 'all' | CounterpartyStatus)}"
            ></app-select>
          </div>
        </div>

        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: isRu ? 'Карточки' : 'Cards' },
            { value: 'table', label: isRu ? 'Таблица' : 'Table' },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.displayMode = e.detail.value as 'cards' | 'table')}"
        ></app-segmented-switch>
      </div>

      ${filtered.length === 0
        ? html`<app-empty-state title="${isRu ? 'Контрагенты не найдены' : 'No counterparties found'}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, isRu)
        : this.renderTable(filtered, isRu)}

      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId
          ? isRu
            ? 'Редактирование контрагента'
            : 'Edit Counterparty'
          : isRu
          ? 'Новый контрагент'
          : 'New Counterparty'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'Краткое наименование' : 'Short Name'}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = e.detail.value;
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Юридическое лицо' : 'Legal Name'}"
              .value="${this.formLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLegalName = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Тип контрагента' : 'Type'}"
              .value="${this.formType}"
              .options="${typeOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formType = e.detail.value as CounterpartyType)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус проверки' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = e.detail.value as CounterpartyStatus)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${isRu ? 'ИНН' : 'Tax ID (INN)'}"
              .value="${this.formInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formInn = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'КПП' : 'KPP'}"
              .value="${this.formKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formKpp = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Контактное лицо' : 'Contact Person'}"
              .value="${this.formContactPerson}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formContactPerson = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Город' : 'City'}"
              .value="${this.formCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formCity = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Телефон' : 'Phone'}"
              .value="${this.formPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formPhone = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.formEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formEmail = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Рейтинг надёжности (1-5)' : 'Reliability Rating (1-5)'}"
              .value="${this.formRating}"
              min="1"
              max="5"
              step="1"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formRating = e.detail.value)}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Комментарии и условия работы' : 'Notes'}"
              .value="${this.formNotes}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formNotes = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button variant="primary" @click="${this.handleSave}">
            ${isRu ? 'Сохранить' : 'Save'}
          </app-button>
        </div>
      </app-modal>

      <app-modal
        ?open="${Boolean(this.deletingItem)}"
        size="sm"
        title="${isRu ? 'Удалить контрагента?' : 'Delete counterparty?'}"
        @close="${() => (this.deletingItem = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Вы уверены, что хотите удалить контрагента «${this.deletingItem?.name || ''}»?`
            : `Are you sure you want to delete "${this.deletingItem?.name || ''}"?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingItem = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingItem) {
                store.deleteCounterparty(this.deletingItem.id);
                this.deletingItem = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderCards(list: Counterparty[], isRu: boolean) {
    return html`
      <div class="cards-grid">
        ${list.map((cp) => {
          const cpContracts = store.contracts.filter((c) => c.counterpartyId === cp.id);
          const cpSum = cpContracts.reduce((acc, c) => acc + c.amount, 0);
          const cpProjects = store.projects.filter((p) => p.counterpartyId === cp.id).length;

          return html`
            <article class="cp-card">
              <div class="card-top">
                <div class="cp-identity">
                  <div class="cp-icon">${iconHandshake(20)}</div>
                  <div class="cp-names">
                    <div class="cp-name">
                      <button
                        type="button"
                        class="cp-link-btn"
                        @click="${() => store.openCounterpartyDetail(cp.id)}"
                      >
                        ${cp.name}
                      </button>
                    </div>
                    <div class="cp-legal" title="${cp.legalName}">${cp.legalName}</div>
                  </div>
                </div>
                <div class="badges-col">
                  <app-status-chip domain="counterpartyType" status="${cp.type}" appearance="soft" size="sm"></app-status-chip>
                  <app-status-chip domain="counterparty" status="${cp.status}" appearance="outline" size="sm"></app-status-chip>
                </div>
              </div>

              <p class="cp-notes">${cp.notes || '—'}</p>

              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'ИНН / КПП' : 'INN / KPP'}</span>
                  <span class="meta-value mono">${cp.inn}${cp.kpp ? ` / ${cp.kpp}` : ''}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Город' : 'City'}</span>
                  <span class="meta-value">${cp.city}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Контакт' : 'Contact'}</span>
                  <span class="meta-value">${cp.contactPerson}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Рейтинг' : 'Rating'}</span>
                  <span class="meta-value rating-stars">${this.renderStars(cp.rating)}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRu ? 'Телефон' : 'Phone'}</span>
                  <span class="meta-value mono">${cp.phone}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Email</span>
                  <span class="meta-value">${cp.email}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="stats-row">
                  <span class="stat-pill">
                    ${isRu ? 'Договоров' : 'Contracts'}: <strong>${cpContracts.length}</strong>
                  </span>
                  <span class="stat-pill">
                    ${isRu ? 'Проектов' : 'Projects'}: <strong>${cpProjects}</strong>
                  </span>
                  <span class="stat-pill">
                    ${isRu ? 'Сумма' : 'Sum'}: <strong>${(cpSum / 1_000_000).toFixed(1)}M ₽</strong>
                  </span>
                </div>
                <div class="card-actions">
                  <button
                    type="button"
                    class="icon-btn"
                    title="${isRu ? 'Открыть карточку' : 'Open Detail'}"
                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                  >
                    ${iconChevronRight(15)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    title="${isRu ? 'Редактировать' : 'Edit'}"
                    @click="${() => this.openEditModal(cp)}"
                  >
                    ${iconEdit(14)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn danger"
                    title="${isRu ? 'Удалить' : 'Delete'}"
                    @click="${() => (this.deletingItem = cp)}"
                  >
                    ${iconTrash(14)}
                  </button>
                </div>
              </div>
            </article>
          `;
        })}
      </div>
    `;
  }

  private renderTable(list: Counterparty[], isRu: boolean) {
    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${isRu ? 'Контрагент' : 'Counterparty'}</th>
              <th>${isRu ? 'Тип' : 'Type'}</th>
              <th>${isRu ? 'ИНН' : 'INN'}</th>
              <th>${isRu ? 'Контактное лицо' : 'Contact'}</th>
              <th>${isRu ? 'Рейтинг' : 'Rating'}</th>
              <th>${isRu ? 'Договоры' : 'Contracts'}</th>
              <th>${isRu ? 'Статус' : 'Status'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map((cp) => {
              const cpContracts = store.contracts.filter((c) => c.counterpartyId === cp.id);
              const cpSum = cpContracts.reduce((acc, c) => acc + c.amount, 0);

              return html`
                <tr>
                  <td>
                    <div style="font-weight: 600;">
                      <button
                        type="button"
                        class="cp-link-btn"
                        @click="${() => store.openCounterpartyDetail(cp.id)}"
                      >
                        ${cp.name}
                      </button>
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${cp.legalName} · ${cp.city}</div>
                  </td>
                  <td>
                    <app-status-chip domain="counterpartyType" status="${cp.type}" appearance="soft" size="sm"></app-status-chip>
                  </td>
                  <td class="mono">${cp.inn}</td>
                  <td>
                    <div>${cp.contactPerson}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${cp.email}</div>
                  </td>
                  <td><span class="rating-stars">${this.renderStars(cp.rating)}</span></td>
                  <td class="mono">${cpContracts.length} (${(cpSum / 1_000_000).toFixed(1)}M ₽)</td>
                  <td>
                    <app-status-chip domain="counterparty" status="${cp.status}" appearance="outline" size="sm"></app-status-chip>
                  </td>
                  <td>
                    <div class="card-actions">
                      <button
                        type="button"
                        class="icon-btn"
                        title="${isRu ? 'Открыть карточку' : 'Open Detail'}"
                        @click="${() => store.openCounterpartyDetail(cp.id)}"
                      >
                        ${iconChevronRight(15)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn"
                        @click="${() => this.openEditModal(cp)}"
                      >
                        ${iconEdit(14)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        @click="${() => (this.deletingItem = cp)}"
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
    `;
  }

  private openCreateModal() {
    this.editingId = null;
    this.formName = '';
    this.formLegalName = '';
    this.formType = 'client';
    this.formInn = '';
    this.formKpp = '';
    this.formCity = 'Москва';
    this.formContactPerson = '';
    this.formPhone = '';
    this.formEmail = '';
    this.formStatus = 'active';
    this.formRating = 5;
    this.formNotes = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(cp: Counterparty) {
    this.editingId = cp.id;
    this.formName = cp.name;
    this.formLegalName = cp.legalName;
    this.formType = cp.type;
    this.formInn = cp.inn;
    this.formKpp = cp.kpp || '';
    this.formCity = cp.city;
    this.formContactPerson = cp.contactPerson;
    this.formPhone = cp.phone;
    this.formEmail = cp.email;
    this.formStatus = cp.status;
    this.formRating = cp.rating;
    this.formNotes = cp.notes;
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
      type: this.formType,
      inn: this.formInn.trim() || '7700000000',
      kpp: this.formKpp.trim(),
      city: this.formCity.trim() || 'Москва',
      contactPerson: this.formContactPerson.trim() || '—',
      phone: this.formPhone.trim() || '—',
      email: this.formEmail.trim() || '—',
      status: this.formStatus,
      rating: Math.max(1, Math.min(5, Number(this.formRating) || 5)),
      notes: this.formNotes.trim(),
    };

    if (this.editingId) {
      store.updateCounterparty({ id: this.editingId, ...payload });
    } else {
      store.addCounterparty(payload);
    }

    this.modalOpen = false;
  }
}
