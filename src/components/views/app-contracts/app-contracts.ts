import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  CalculationFrequency,
  CalculationStatus,
  Contract,
  ContractStatus,
  ContractType,
  Invoice,
  InvoiceStatus,
} from '../../../types';
import {
  iconCheck,
  iconChevronRight,
  iconEdit,
  iconFileText,
  iconPlus,
  iconReceipt,
  iconSearch,
  iconSend,
  iconTable,
  iconTrash,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import styles from './app-contracts.css';

@customElement('app-contracts')
export class AppContracts extends LitElement {
  @state() private contracts: Contract[] = store.contracts;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private viewTab: 'contracts' | 'calculations' | 'invoices' = 'contracts';
  @state() private statusFilter: 'all' | ContractStatus = 'all';
  @state() private typeFilter: 'all' | ContractType = 'all';
  @state() private calcStatusFilter: 'all' | CalculationStatus = 'all';
  @state() private invoiceStatusFilter: 'all' | InvoiceStatus = 'all';

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
  @state() private formBillingFrequency: CalculationFrequency = 'monthly';
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
    this.calculations = store.calculations;
    this.invoices = store.invoices;
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

  private getInvoiceStatusVariant(
    status: InvoiceStatus
  ): 'default' | 'warning' | 'success' | 'info' | 'danger' {
    switch (status) {
      case 'draft':
        return 'default';
      case 'issued':
        return 'info';
      case 'sent':
        return 'warning';
      case 'paid':
        return 'success';
      case 'overdue':
      case 'cancelled':
        return 'danger';
    }
  }

  private getCalculationStatusVariant(
    status: CalculationStatus
  ): 'default' | 'warning' | 'success' | 'info' | 'danger' {
    switch (status) {
      case 'draft':
        return 'default';
      case 'sent':
        return 'warning';
      case 'approved':
        return 'success';
      case 'invoiced':
        return 'info';
      case 'rejected':
        return 'danger';
    }
  }

  private getFilteredCalculations(): Calculation[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.calculations.filter((calc) => {
      if (this.calcStatusFilter !== 'all' && calc.status !== this.calcStatusFilter) return false;
      if (!query) return true;
      const ctr = this.contracts.find((c) => c.id === calc.contractId);
      const cp = store.counterparties.find((c) => c.id === ctr?.counterpartyId)?.name.toLowerCase() || '';
      return (
        calc.number.toLowerCase().includes(query) ||
        (ctr?.number.toLowerCase().includes(query) ?? false) ||
        (ctr?.title.toLowerCase().includes(query) ?? false) ||
        cp.includes(query)
      );
    });
  }

  private getFilteredInvoices(): Invoice[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.invoices.filter((inv) => {
      if (this.invoiceStatusFilter !== 'all' && inv.status !== this.invoiceStatusFilter) return false;
      if (!query) return true;
      const ctr = this.contracts.find((c) => c.id === inv.contractId);
      const cp = store.counterparties.find((c) => c.id === ctr?.counterpartyId)?.name.toLowerCase() || '';
      return (
        inv.number.toLowerCase().includes(query) ||
        (ctr?.number.toLowerCase().includes(query) ?? false) ||
        (ctr?.title.toLowerCase().includes(query) ?? false) ||
        cp.includes(query)
      );
    });
  }

  private getContractBillingStats(contractId: string): {
    invoiced: number;
    paid: number;
    count: number;
    calcCount: number;
    approvedCalcs: number;
  } {
    const related = this.invoices.filter((i) => i.contractId === contractId && i.status !== 'cancelled');
    const calcs = this.calculations.filter((c) => c.contractId === contractId);
    return {
      count: related.length,
      invoiced: related.reduce((sum, i) => sum + i.totalAmount, 0),
      paid: related.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0),
      calcCount: calcs.length,
      approvedCalcs: calcs.filter((c) => c.status === 'approved').length,
    };
  }

  render() {
    const isRu = this.currentLang === 'ru';
    const t = getTranslation(this.currentLang);
    const filtered = this.getFiltered();
    const filteredCalculations = this.getFilteredCalculations();
    const filteredInvoices = this.getFilteredInvoices();

    const activeList = this.contracts.filter((c) => c.status === 'active');
    const rubTotal = activeList
      .filter((c) => c.currency === 'RUB')
      .reduce((acc, c) => acc + c.amount, 0);

    const rubInvoices = this.invoices.filter((i) => i.currency === 'RUB' && i.status !== 'cancelled');
    const rubInvoicedTotal = rubInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
    const rubPaidTotal = rubInvoices
      .filter((i) => i.status === 'paid')
      .reduce((acc, i) => acc + i.totalAmount, 0);
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

    const tabOptions = [
      { value: 'contracts', label: `${t.invoices.tabContracts} (${this.contracts.length})` },
      { value: 'calculations', label: `${t.calculations.tabCalculations} (${this.calculations.length})` },
      { value: 'invoices', label: `${t.invoices.tabInvoices} (${this.invoices.length})` },
    ];

    const frequencyOptions = [
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
    ];

    const calcStatusOptions = [
      { value: 'all', label: isRu ? 'Все статусы калькуляций' : 'All calculation statuses' },
      { value: 'draft', label: t.calculations.statuses.draft, color: '#64748b' },
      { value: 'sent', label: t.calculations.statuses.sent, color: '#f59e0b' },
      { value: 'approved', label: t.calculations.statuses.approved, color: '#10b981' },
      { value: 'rejected', label: t.calculations.statuses.rejected, color: '#ef4444' },
      { value: 'invoiced', label: t.calculations.statuses.invoiced, color: '#0284c7' },
    ];

    const invoiceStatusOptions = [
      { value: 'all', label: isRu ? 'Все статусы счетов' : 'All invoice statuses' },
      { value: 'draft', label: t.invoices.statuses.draft, color: '#64748b' },
      { value: 'issued', label: t.invoices.statuses.issued, color: '#0284c7' },
      { value: 'sent', label: t.invoices.statuses.sent, color: '#f59e0b' },
      { value: 'paid', label: t.invoices.statuses.paid, color: '#10b981' },
      { value: 'overdue', label: t.invoices.statuses.overdue, color: '#ef4444' },
      { value: 'cancelled', label: t.invoices.statuses.cancelled, color: '#64748b' },
    ];

    return html`
      <div class="view-header">
        <div class="header-titles">
          <h1 class="view-title">${isRu ? 'Договоры' : 'Contracts'}</h1>
          <p class="view-subtitle">
            ${isRu
              ? 'Реестр контрактов с заказчиками и подрядчиками, суммы, сроки, привязка к проектам и выставление счетов'
              : 'Contract registry with clients and vendors, amounts, validity dates, project links, and invoicing'}
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
          <span class="kpi-label">${isRu ? 'Активная сумма (RUB)' : 'Active Volume (RUB)'}</span>
          <span class="kpi-value">${(rubTotal / 1_000_000).toFixed(2)}M ₽</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.contractDetail.invoicedTotal} (RUB)</span>
          <span class="kpi-value" style="color: var(--accent-primary, #6366f1);">
            ${(rubInvoicedTotal / 1_000_000).toFixed(2)}M ₽
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.contractDetail.paidTotal} (RUB)</span>
          <span class="kpi-value" style="color: var(--color-success, #10b981);">
            ${(rubPaidTotal / 1_000_000).toFixed(2)}M ₽
          </span>
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
          <app-segmented-switch
            .value="${this.viewTab}"
            .options="${tabOptions}"
            @change="${(e: CustomEvent<{ value: string }>) =>
              (this.viewTab = e.detail.value as 'contracts' | 'calculations' | 'invoices')}"
          ></app-segmented-switch>
          <div class="filter-search">
            <app-input
              placeholder="${this.viewTab === 'contracts'
                ? isRu
                  ? 'Поиск по номеру, предмету, контрагенту...'
                  : 'Search number, title, counterparty...'
                : this.viewTab === 'calculations'
                ? isRu
                  ? 'Поиск по номеру калькуляции, договору, контрагенту...'
                  : 'Search calculation, contract, counterparty...'
                : isRu
                ? 'Поиск по номеру счёта, договору, контрагенту...'
                : 'Search invoice, contract, counterparty...'}"
              .value="${this.localSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
            >
              <span slot="icon">${iconSearch(15)}</span>
            </app-input>
          </div>
          ${this.viewTab === 'contracts'
            ? html`
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
              `
            : this.viewTab === 'calculations'
            ? html`
                <div class="filter-select">
                  <app-select
                    .value="${this.calcStatusFilter}"
                    .options="${calcStatusOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) =>
                      (this.calcStatusFilter = e.detail.value as 'all' | CalculationStatus)}"
                  ></app-select>
                </div>
              `
            : html`
                <div class="filter-select">
                  <app-select
                    .value="${this.invoiceStatusFilter}"
                    .options="${invoiceStatusOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) =>
                      (this.invoiceStatusFilter = e.detail.value as 'all' | InvoiceStatus)}"
                  ></app-select>
                </div>
              `}
        </div>
      </div>

      ${this.viewTab === 'contracts'
        ? filtered.length === 0
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
                      <th>${isRu ? 'Сумма / Счета' : 'Amount / Billed'}</th>
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
                      const billing = this.getContractBillingStats(ctr.id);

                      return html`
                        <tr>
                          <td>
                            <button
                              type="button"
                              class="contract-link-btn"
                              title="${t.contractDetail.openContract}"
                              @click="${() => store.openContractDetail(ctr.id)}"
                            >
                              ${iconFileText(15)}
                              <span>${ctr.number}</span>
                            </button>
                            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">
                              ${this.getTypeLabel(ctr.type, isRu)}${ctr.billingFrequency
                                ? ` · ${t.calculations.frequencies[ctr.billingFrequency]}`
                                : ''}
                            </div>
                          </td>
                          <td>
                            <div
                              class="contract-title"
                              style="cursor: pointer;"
                              @click="${() => store.openContractDetail(ctr.id)}"
                            >
                              ${ctr.title}
                            </div>
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
                          <td class="amount-cell">
                            <div>${this.formatMoney(ctr.amount, ctr.currency)}</div>
                            ${billing.count > 0 || billing.calcCount > 0
                              ? html`
                                  <div class="billing-sub">
                                    ${billing.calcCount > 0
                                      ? html`<span class="calc-val">
                                          ${isRu ? 'Кальк' : 'Calc'}: ${billing.calcCount}${billing.approvedCalcs > 0 ? ` (${billing.approvedCalcs} ✓)` : ''}
                                        </span>`
                                      : ''}
                                    ${billing.count > 0
                                      ? html`<span>
                                          ${billing.calcCount > 0 ? '· ' : ''}${isRu ? 'Счетов' : 'Inv'}: ${this.formatMoney(billing.invoiced, ctr.currency)}
                                        </span>`
                                      : ''}
                                    ${billing.paid > 0
                                      ? html`<span class="paid-val">· ${isRu ? 'Опл' : 'Paid'}: ${this.formatMoney(billing.paid, ctr.currency)}</span>`
                                      : ''}
                                  </div>
                                `
                              : ''}
                          </td>
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
                                class="icon-btn accent"
                                title="${t.contractDetail.openContract}"
                                @click="${() => store.openContractDetail(ctr.id)}"
                              >
                                ${iconChevronRight(15)}
                              </button>
                              <button
                                type="button"
                                class="icon-btn accent"
                                title="${t.contractDetail.createCalculation}"
                                @click="${() => store.openContractDetail(ctr.id, 'calculation')}"
                              >
                                ${iconTable()}
                              </button>
                              <button
                                type="button"
                                class="icon-btn success"
                                title="${t.contractDetail.issueInvoice}"
                                @click="${() => store.openContractDetail(ctr.id, 'invoice')}"
                              >
                                ${iconReceipt(15)}
                              </button>
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
            `
        : this.viewTab === 'calculations'
        ? filteredCalculations.length === 0
          ? html`<div class="empty-state">${t.contractDetail.noCalculations}</div>`
          : html`
              <div class="table-card">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${isRu ? 'Калькуляция' : 'Calculation'}</th>
                      <th>${isRu ? 'Договор' : 'Contract'}</th>
                      <th>${isRu ? 'Контрагент' : 'Counterparty'}</th>
                      <th>${isRu ? 'Период / Цикл' : 'Period / Cycle'}</th>
                      <th>${isRu ? 'Трудозатраты' : 'Hours'}</th>
                      <th>${isRu ? 'К оплате' : 'Billable'}</th>
                      <th>${isRu ? 'Статус' : 'Status'}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredCalculations.map((calc) => {
                      const ctr = this.contracts.find((c) => c.id === calc.contractId);
                      const cp = store.counterparties.find((c) => c.id === ctr?.counterpartyId);
                      const priorCount = calc.items.filter((i) => i.isPriorPeriod).length;
                      const linkedInv = calc.invoiceId
                        ? this.invoices.find((i) => i.id === calc.invoiceId)
                        : undefined;
                      const hUnit = isRu ? 'ч' : 'h';
                      return html`
                        <tr>
                          <td>
                            <button
                              type="button"
                              class="contract-link-btn"
                              @click="${() => ctr && store.openContractDetail(ctr.id)}"
                            >
                              ${iconTable()}
                              <span>${calc.number}</span>
                            </button>
                            <div class="billing-sub">
                              <span>${calc.items.length} ${isRu ? 'поз.' : 'items'}</span>
                              ${calc.nonBillableHours > 0
                                ? html`<span class="micro-pill zero">0 ₽: ${calc.nonBillableHours} ${hUnit}</span>`
                                : ''}
                              ${priorCount > 0
                                ? html`<span class="micro-pill prior">+${priorCount} ${t.calculations.priorBadge}</span>`
                                : ''}
                            </div>
                          </td>
                          <td>
                            ${ctr
                              ? html`
                                  <button
                                    type="button"
                                    class="contract-link-btn"
                                    @click="${() => store.openContractDetail(ctr.id)}"
                                  >
                                    <span>${ctr.number}</span>
                                  </button>
                                  <div class="contract-desc" title="${ctr.title}">${ctr.title}</div>
                                `
                              : '—'}
                          </td>
                          <td>${cp?.name || '—'}</td>
                          <td class="dates-cell">
                            <div>${calc.periodStart} → ${calc.periodEnd}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: inherit;">
                              ${t.calculations.frequencies[calc.frequency]}
                            </div>
                          </td>
                          <td class="mono">
                            <div>${calc.billableHours} ${hUnit}</div>
                            ${calc.nonBillableHours > 0
                              ? html`<div style="font-size: 0.72rem; color: var(--text-muted);">
                                  +${calc.nonBillableHours} ${hUnit} non-billable
                                </div>`
                              : ''}
                          </td>
                          <td class="amount-cell">
                            <div>${this.formatMoney(calc.billableAmount, calc.currency)}</div>
                            ${linkedInv
                              ? html`<div class="billing-sub">
                                  <span class="paid-val">${linkedInv.number}</span>
                                </div>`
                              : ''}
                          </td>
                          <td>
                            <app-badge
                              variant="${this.getCalculationStatusVariant(calc.status)}"
                              appearance="soft"
                              size="sm"
                            >
                              ${t.calculations.statuses[calc.status]}
                            </app-badge>
                          </td>
                          <td>
                            <div class="actions-row">
                              ${calc.status === 'draft' || calc.status === 'rejected'
                                ? html`
                                    <button
                                      type="button"
                                      class="icon-btn accent"
                                      title="${t.calculations.sendForApproval}"
                                      @click="${() => store.updateCalculationStatus(calc.id, 'sent')}"
                                    >
                                      ${iconSend(14)}
                                    </button>
                                  `
                                : ''}
                              ${calc.status === 'sent'
                                ? html`
                                    <button
                                      type="button"
                                      class="icon-btn success"
                                      title="${t.calculations.approveCalc}"
                                      @click="${() => store.updateCalculationStatus(calc.id, 'approved')}"
                                    >
                                      ${iconCheck(14)}
                                    </button>
                                    <button
                                      type="button"
                                      class="icon-btn danger"
                                      title="${t.calculations.rejectCalc}"
                                      @click="${() => store.updateCalculationStatus(calc.id, 'rejected')}"
                                    >
                                      ${iconX(14)}
                                    </button>
                                  `
                                : ''}
                              ${calc.status === 'approved' && ctr
                                ? html`
                                    <button
                                      type="button"
                                      class="icon-btn success"
                                      title="${t.calculations.createInvoiceFromCalc}"
                                      @click="${() => store.openContractDetail(ctr.id, 'invoice')}"
                                    >
                                      ${iconReceipt(15)}
                                    </button>
                                  `
                                : ''}
                              ${ctr
                                ? html`
                                    <button
                                      type="button"
                                      class="icon-btn"
                                      title="${t.contractDetail.openContract}"
                                      @click="${() => store.openContractDetail(ctr.id)}"
                                    >
                                      ${iconChevronRight(15)}
                                    </button>
                                  `
                                : ''}
                            </div>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            `
        : filteredInvoices.length === 0
        ? html`<div class="empty-state">${isRu ? 'Счета не найдены' : 'No invoices found'}</div>`
        : html`
            <div class="table-card">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${isRu ? 'Счёт' : 'Invoice'}</th>
                    <th>${isRu ? 'Договор' : 'Contract'}</th>
                    <th>${isRu ? 'Контрагент' : 'Counterparty'}</th>
                    <th>${isRu ? 'Дата / Срок' : 'Issued / Due'}</th>
                    <th>${isRu ? 'Сумма без НДС' : 'Subtotal'}</th>
                    <th>${isRu ? 'Итого с НДС' : 'Total'}</th>
                    <th>${isRu ? 'Статус' : 'Status'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredInvoices.map((inv) => {
                    const ctr = this.contracts.find((c) => c.id === inv.contractId);
                    const cp = store.counterparties.find((c) => c.id === ctr?.counterpartyId);
                    return html`
                      <tr>
                        <td>
                          <div class="contract-link-btn" @click="${() => ctr && store.openContractDetail(ctr.id)}">
                            ${iconReceipt(15)}
                            <span>${inv.number}</span>
                          </div>
                          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">
                            ${inv.items.length} ${isRu ? 'поз.' : 'items'} · ${inv.vatRate > 0 ? `${isRu ? 'НДС' : 'VAT'} ${inv.vatRate}%` : isRu ? 'Без НДС' : 'No VAT'}
                          </div>
                        </td>
                        <td>
                          ${ctr
                            ? html`
                                <button
                                  type="button"
                                  class="contract-link-btn"
                                  @click="${() => store.openContractDetail(ctr.id)}"
                                >
                                  <span>${ctr.number}</span>
                                </button>
                                <div class="contract-desc" title="${ctr.title}">${ctr.title}</div>
                              `
                            : '—'}
                        </td>
                        <td>${cp?.name || '—'}</td>
                        <td class="dates-cell">
                          <div>${inv.issueDate} → ${inv.dueDate}</div>
                          ${inv.paidDate
                            ? html`<div style="color: var(--color-success, #10b981); font-size: 0.72rem;">
                                ${isRu ? 'Оплачен' : 'Paid'}: ${inv.paidDate}
                              </div>`
                            : ''}
                        </td>
                        <td class="mono">${this.formatMoney(inv.subtotal, inv.currency)}</td>
                        <td class="amount-cell">${this.formatMoney(inv.totalAmount, inv.currency)}</td>
                        <td>
                          <app-badge
                            variant="${this.getInvoiceStatusVariant(inv.status)}"
                            appearance="soft"
                            size="sm"
                          >
                            ${t.invoices.statuses[inv.status]}
                          </app-badge>
                        </td>
                        <td>
                          <div class="actions-row">
                            ${inv.status === 'draft'
                              ? html`
                                  <button
                                    type="button"
                                    class="icon-btn accent"
                                    title="${t.invoices.markIssued}"
                                    @click="${() => store.updateInvoiceStatus(inv.id, 'issued')}"
                                  >
                                    ${iconFileText(14)}
                                  </button>
                                `
                              : ''}
                            ${inv.status === 'issued'
                              ? html`
                                  <button
                                    type="button"
                                    class="icon-btn accent"
                                    title="${t.invoices.markSent}"
                                    @click="${() => store.updateInvoiceStatus(inv.id, 'sent')}"
                                  >
                                    ${iconSend(14)}
                                  </button>
                                `
                              : ''}
                            ${inv.status === 'issued' || inv.status === 'sent' || inv.status === 'overdue'
                              ? html`
                                  <button
                                    type="button"
                                    class="icon-btn success"
                                    title="${t.invoices.markPaid}"
                                    @click="${() => store.updateInvoiceStatus(inv.id, 'paid')}"
                                  >
                                    ${iconCheck(14)}
                                  </button>
                                `
                              : ''}
                            ${ctr
                              ? html`
                                  <button
                                    type="button"
                                    class="icon-btn"
                                    title="${t.contractDetail.openContract}"
                                    @click="${() => store.openContractDetail(ctr.id)}"
                                  >
                                    ${iconChevronRight(15)}
                                  </button>
                                `
                              : ''}
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
          <div>
            <app-select
              label="${isRu ? 'Периодичность калькуляций' : 'Calculation Cycle'}"
              .value="${this.formBillingFrequency}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formBillingFrequency = e.detail.value as CalculationFrequency)}"
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
    this.formBillingFrequency = 'monthly';
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
    this.formBillingFrequency = ctr.billingFrequency || 'monthly';
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
      billingFrequency: this.formBillingFrequency,
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
