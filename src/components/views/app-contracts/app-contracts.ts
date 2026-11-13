import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Contract, ContractStatus, ContractType } from '../../../types';
import { iconEdit, iconFileText, iconPlus, iconSearch, iconTrash } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-modal/app-modal';
import styles from './app-contracts.css';

@customElement('app-contracts')
export class AppContracts extends LitElement {
  @state() private contracts: Contract[] = store.contracts;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | ContractStatus = 'all';
  @state() private typeFilter: 'all' | ContractType = 'all';

  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
  @state() private formNumber = '';
  @state() private formTitle = '';
  @state() private formType: ContractType = 'service';
  @state() private formCompanyId = '';
  @state() private formCounterpartyId = '';
  @state() private formProjectId = '';
  @state() private formOwnerId = '';
  @state() private formAmount = 1000000;
  @state() private formCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private formStartDate = '';
  @state() private formEndDate = '';
  @state() private formStatus: ContractStatus = 'draft';
  @state() private formDescription = '';
  @state() private formError = '';

  @state() private deletingContract: Contract | null = null;

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
    this.contracts = store.contracts;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
  }

  private getTypeLabel(type: ContractType, isRu: boolean): string {
    switch (type) {
      case 'service':
        return isRu ? 'Услуги / Разработка' : 'Services';
      case 'supply':
        return isRu ? 'Поставка' : 'Supply';
      case 'license':
        return isRu ? 'Лицензия' : 'License';
      case 'nda':
        return 'NDA';
      case 'sla':
        return 'SLA';
    }
  }

  private getStatusMeta(status: ContractStatus, isRu: boolean): { label: string; variant: 'default' | 'warning' | 'success' | 'info' | 'danger' } {
    switch (status) {
      case 'draft':
        return { label: isRu ? 'Черновик' : 'Draft', variant: 'default' };
      case 'on_approval':
        return { label: isRu ? 'Согласование' : 'Approval', variant: 'warning' };
      case 'active':
        return { label: isRu ? 'Действует' : 'Active', variant: 'success' };
      case 'completed':
        return { label: isRu ? 'Исполнен' : 'Completed', variant: 'info' };
      case 'terminated':
        return { label: isRu ? 'Расторгнут' : 'Terminated', variant: 'danger' };
    }
  }

  private formatMoney(amount: number, currency: 'RUB' | 'USD' | 'EUR'): string {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
    return `${amount.toLocaleString('ru-RU')} ${symbol}`;
  }

  private getDaysRemaining(endDate: string): number | null {
    if (!endDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getFiltered(): Contract[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.contracts.filter((ctr) => {
      if (this.statusFilter !== 'all' && ctr.status !== this.statusFilter) return false;
      if (this.typeFilter !== 'all' && ctr.type !== this.typeFilter) return false;
      if (!query) return true;
      const company = store.companies.find((c) => c.id === ctr.companyId)?.name.toLowerCase() || '';
      const counterparty = store.counterparties.find((c) => c.id === ctr.counterpartyId)?.name.toLowerCase() || '';
      const project = store.projects.find((p) => p.id === ctr.projectId)?.name.toLowerCase() || '';
      return (
        ctr.number.toLowerCase().includes(query) ||
        ctr.title.toLowerCase().includes(query) ||
        company.includes(query) ||
        counterparty.includes(query) ||
        project.includes(query)
      );
    });
  }

  render() {
    const isRu = this.currentLang === 'ru';
    const filtered = this.getFiltered();

    const activeList = this.contracts.filter((c) => c.status === 'active');
    const rubTotal = activeList
      .filter((c) => c.currency === 'RUB')
      .reduce((acc, c) => acc + c.amount, 0);
    const expiringSoon = activeList.filter((c) => {
      const days = this.getDaysRemaining(c.endDate);
      return days !== null && days >= 0 && days <= 45;
    }).length;

    const statusOptions = [
      { value: 'all', label: isRu ? 'Все статусы' : 'All statuses' },
      { value: 'draft', label: isRu ? 'Черновик' : 'Draft', color: '#64748b' },
      { value: 'on_approval', label: isRu ? 'На согласовании' : 'On Approval', color: '#f59e0b' },
      { value: 'active', label: isRu ? 'Действует' : 'Active', color: '#10b981' },
      { value: 'completed', label: isRu ? 'Исполнен' : 'Completed', color: '#0284c7' },
      { value: 'terminated', label: isRu ? 'Расторгнут' : 'Terminated', color: '#ef4444' },
    ];

    const typeOptions = [
      { value: 'all', label: isRu ? 'Все типы' : 'All types' },
      { value: 'service', label: isRu ? 'Услуги / Разработка' : 'Services' },
      { value: 'supply', label: isRu ? 'Поставка' : 'Supply' },
      { value: 'license', label: isRu ? 'Лицензия' : 'License' },
      { value: 'sla', label: 'SLA' },
      { value: 'nda', label: 'NDA' },
    ];

    const companyOptions = store.companies.map((c) => ({ value: c.id, label: c.name }));
    const counterpartyOptions = store.counterparties.map((c) => ({ value: c.id, label: c.name }));
    const projectOptions = [
      { value: '', label: isRu ? 'Без привязки к проекту' : 'No linked project' },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];
    const ownerOptions = [
      { value: '', label: isRu ? 'Не назначен' : 'Unassigned' },
      ...store.users.map((u) => ({ value: u.id, label: u.name })),
    ];
    const currencyOptions = [
      { value: 'RUB', label: 'RUB (₽)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ];

    return html`
      <div class="view-header">
        <div class="header-titles">
          <h1 class="view-title">${isRu ? 'Договоры' : 'Contracts'}</h1>
          <p class="view-subtitle">
            ${isRu
              ? 'Реестр контрактов с заказчиками и подрядчиками, суммы, сроки и привязка к проектам'
              : 'Contract registry with clients and vendors, amounts, validity dates, and project links'}
          </p>
        </div>
        <app-button variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${isRu ? 'Новый договор' : 'New Contract'}</span>
        </app-button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Всего договоров' : 'Total Contracts'}</span>
          <span class="kpi-value">${this.contracts.length}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Действующих' : 'Active'}</span>
          <span class="kpi-value" style="color: var(--color-success, #10b981);">${activeList.length}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Активная сумма (RUB)' : 'Active Volume (RUB)'}</span>
          <span class="kpi-value">${(rubTotal / 1_000_000).toFixed(2)}M ₽</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Истекают ≤ 45 дн.' : 'Expiring ≤ 45d'}</span>
          <span class="kpi-value" style="color: ${expiringSoon > 0 ? '#f59e0b' : 'inherit'};">
            ${expiringSoon}
          </span>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-filters">
          <div class="filter-search">
            <app-input
              placeholder="${isRu ? 'Поиск по номеру, предмету, контрагенту...' : 'Search number, title, counterparty...'}"
              .value="${this.localSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
            >
              <span slot="icon">${iconSearch(15)}</span>
            </app-input>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.statusFilter}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.statusFilter = e.detail.value as 'all' | ContractStatus)}"
            ></app-select>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.typeFilter}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.typeFilter = e.detail.value as 'all' | ContractType)}"
            ></app-select>
          </div>
        </div>
      </div>

      ${filtered.length === 0
        ? html`<div class="empty-state">${isRu ? 'Договоры не найдены' : 'No contracts found'}</div>`
        : html`
            <div class="table-card">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${isRu ? 'Номер' : 'Number'}</th>
                    <th>${isRu ? 'Предмет договора' : 'Subject'}</th>
                    <th>${isRu ? 'Стороны' : 'Parties'}</th>
                    <th>${isRu ? 'Проект' : 'Project'}</th>
                    <th>${isRu ? 'Сумма' : 'Amount'}</th>
                    <th>${isRu ? 'Срок действия' : 'Term'}</th>
                    <th>${isRu ? 'Статус' : 'Status'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map((ctr) => {
                    const company = store.companies.find((c) => c.id === ctr.companyId);
                    const cp = store.counterparties.find((c) => c.id === ctr.counterpartyId);
                    const proj = store.projects.find((p) => p.id === ctr.projectId);
                    const owner = store.users.find((u) => u.id === ctr.ownerId);
                    const statusMeta = this.getStatusMeta(ctr.status, isRu);
                    const daysLeft = ctr.status === 'active' ? this.getDaysRemaining(ctr.endDate) : null;

                    return html`
                      <tr>
                        <td>
                          <div class="contract-num">
                            ${iconFileText(15)}
                            <span>${ctr.number}</span>
                          </div>
                          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">
                            ${this.getTypeLabel(ctr.type, isRu)}
                          </div>
                        </td>
                        <td>
                          <div class="contract-title">${ctr.title}</div>
                          <div class="contract-desc" title="${ctr.description}">${ctr.description || '—'}</div>
                        </td>
                        <td>
                          <div style="font-weight: 500;">${cp?.name || '—'}</div>
                          <div style="font-size: 0.74rem; color: var(--text-muted);">
                            ${company?.name || '—'}${owner ? ` · ${owner.name}` : ''}
                          </div>
                        </td>
                        <td>
                          ${proj
                            ? html`
                                <span class="project-pill">
                                  <span class="project-dot" style="background: ${proj.color};"></span>
                                  <span>${proj.key}</span>
                                </span>
                              `
                            : '—'}
                        </td>
                        <td class="amount-cell">${this.formatMoney(ctr.amount, ctr.currency)}</td>
                        <td class="dates-cell">
                          <div>${ctr.startDate} → ${ctr.endDate}</div>
                          ${daysLeft !== null && daysLeft >= 0 && daysLeft <= 45
                            ? html`<span class="expiry-warn">${isRu ? `Осталось ${daysLeft} дн.` : `${daysLeft}d left`}</span>`
                            : ''}
                        </td>
                        <td>
                          <app-badge variant="${statusMeta.variant}" appearance="soft" size="sm">
                            ${statusMeta.label}
                          </app-badge>
                        </td>
                        <td>
                          <div class="actions-row">
                            <button
                              type="button"
                              class="icon-btn"
                              title="${isRu ? 'Редактировать' : 'Edit'}"
                              @click="${() => this.openEditModal(ctr)}"
                            >
                              ${iconEdit(14)}
                            </button>
                            <button
                              type="button"
                              class="icon-btn danger"
                              title="${isRu ? 'Удалить' : 'Delete'}"
                              @click="${() => (this.deletingContract = ctr)}"
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
          `}

      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId
          ? isRu
            ? 'Редактирование договора'
            : 'Edit Contract'
          : isRu
          ? 'Новый договор'
          : 'New Contract'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'Номер договора' : 'Contract Number'}"
              placeholder="ДГ-2026/050"
              .value="${this.formNumber}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formNumber = e.detail.value;
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Тип договора' : 'Type'}"
              .value="${this.formType}"
              .options="${typeOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formType = e.detail.value as ContractType)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-input
              label="${isRu ? 'Предмет договора' : 'Contract Title'}"
              .value="${this.formTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formTitle = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Наша компания' : 'Company'}"
              .value="${this.formCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Контрагент' : 'Counterparty'}"
              .value="${this.formCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCounterpartyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              .value="${this.formProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formProjectId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Ответственный' : 'Owner'}"
              .value="${this.formOwnerId}"
              .options="${ownerOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formOwnerId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Сумма договора' : 'Amount'}"
              .value="${this.formAmount}"
              min="0"
              step="50000"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formAmount = e.detail.value)}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Валюта' : 'Currency'}"
              .value="${this.formCurrency}"
              .options="${currencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formCurrency = e.detail.value as 'RUB' | 'USD' | 'EUR')}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата начала' : 'Start Date'}"
              .value="${this.formStartDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formStartDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата окончания' : 'End Date'}"
              .value="${this.formEndDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formEndDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = e.detail.value as ContractStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Условия и комментарии' : 'Description'}"
              .value="${this.formDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = e.detail.value)}"
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
        ?open="${Boolean(this.deletingContract)}"
        size="sm"
        title="${isRu ? 'Удалить договор?' : 'Delete contract?'}"
        @close="${() => (this.deletingContract = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Вы уверены, что хотите удалить договор ${this.deletingContract?.number || ''}?`
            : `Are you sure you want to delete contract ${this.deletingContract?.number || ''}?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingContract = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingContract) {
                store.deleteContract(this.deletingContract.id);
                this.deletingContract = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private openCreateModal() {
    const today = new Date().toISOString().slice(0, 10);
    const yearEnd = `${new Date().getFullYear()}-12-31`;
    this.editingId = null;
    this.formNumber = `ДГ-${new Date().getFullYear()}/${String(this.contracts.length + 1).padStart(3, '0')}`;
    this.formTitle = '';
    this.formType = 'service';
    this.formCompanyId = store.companies[0]?.id || '';
    this.formCounterpartyId = store.counterparties[0]?.id || '';
    this.formProjectId = store.projects[0]?.id || '';
    this.formOwnerId = store.users[0]?.id || '';
    this.formAmount = 1500000;
    this.formCurrency = 'RUB';
    this.formStartDate = today;
    this.formEndDate = yearEnd;
    this.formStatus = 'draft';
    this.formDescription = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(ctr: Contract) {
    this.editingId = ctr.id;
    this.formNumber = ctr.number;
    this.formTitle = ctr.title;
    this.formType = ctr.type;
    this.formCompanyId = ctr.companyId;
    this.formCounterpartyId = ctr.counterpartyId;
    this.formProjectId = ctr.projectId || '';
    this.formOwnerId = ctr.ownerId || '';
    this.formAmount = ctr.amount;
    this.formCurrency = ctr.currency;
    this.formStartDate = ctr.startDate;
    this.formEndDate = ctr.endDate;
    this.formStatus = ctr.status;
    this.formDescription = ctr.description;
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSave() {
    if (!this.formNumber.trim()) {
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const payload = {
      number: this.formNumber.trim(),
      title: this.formTitle.trim() || this.formNumber.trim(),
      type: this.formType,
      companyId: this.formCompanyId || store.companies[0]?.id || '',
      counterpartyId: this.formCounterpartyId || store.counterparties[0]?.id || '',
      projectId: this.formProjectId || undefined,
      ownerId: this.formOwnerId || undefined,
      amount: Math.max(0, Number(this.formAmount) || 0),
      currency: this.formCurrency,
      startDate: this.formStartDate || new Date().toISOString().slice(0, 10),
      endDate: this.formEndDate || new Date().toISOString().slice(0, 10),
      status: this.formStatus,
      description: this.formDescription.trim(),
    };

    if (this.editingId) {
      store.updateContract({ id: this.editingId, ...payload });
    } else {
      store.addContract(payload);
    }

    this.modalOpen = false;
  }
}
