import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  CalculationFrequency,
  CalculationStatus,
  Contract,
  ContractStatus,
  ContractType,
  Invoice,
  InvoicePayment,
  InvoiceStatus,
  PaymentMethod,
} from '../../../types';
import {
  iconAlertTriangle,
  iconCheck,
  iconChevronRight,
  iconClock,
  iconCreditCard,
  iconEdit,
  iconFileText,
  iconPlus,
  iconReceipt,
  iconSend,
  iconTable,
  iconTrash,
  iconWallet,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import styles from './app-contracts.css';
import { eventValue } from '../../common/event-value';

@customElement('app-contracts')
export class AppContracts extends LitElement {
  @state() private contracts: Contract[] = store.contracts;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private payments: InvoicePayment[] = store.payments;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private viewTab: 'contracts' | 'calculations' | 'invoices' | 'payments' = 'contracts';
  @state() private statusFilter: 'all' | ContractStatus = 'all';
  @state() private typeFilter: 'all' | ContractType = 'all';
  @state() private calcStatusFilter: 'all' | CalculationStatus = 'all';
  @state() private invoiceStatusFilter: 'all' | InvoiceStatus = 'all';
  @state() private paymentMethodFilter: 'all' | PaymentMethod = 'all';

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

  // Record / Delete Payment modals
  @state() private paymentModalOpen = false;
  @state() private paymentInvoiceId = '';
  @state() private payAmount = 0;
  @state() private payDate = '';
  @state() private payMethod: PaymentMethod = 'bank_transfer';
  @state() private payDocNumber = '';
  @state() private payNotes = '';
  @state() private payError = '';
  @state() private deletingPayment: InvoicePayment | null = null;

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
    this.payments = store.payments;
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

  private renderDueControlTag(inv: Invoice, t: ReturnType<typeof getTranslation>) {
    const ctrl = store.getInvoiceDueControl(inv);
    if (ctrl.state === 'draft' || ctrl.state === 'cancelled') return '';
    if (ctrl.state === 'paid') {
      if (ctrl.daysDelta < 0) {
        return html`
          <span class="due-tag due-soon">
            ${iconClock(11)}
            <span>${t.payments.paidLate.replace('{n}', String(Math.abs(ctrl.daysDelta)))}</span>
          </span>
        `;
      }
      return html`
        <span class="due-tag paid-ok">
          ${iconCheck(11)}
          <span>${t.payments.paidOnTime}</span>
        </span>
      `;
    }
    if (ctrl.state === 'overdue') {
      return html`
        <span class="due-tag overdue">
          ${iconAlertTriangle(11)}
          <span>${t.payments.overdueBy.replace('{n}', String(ctrl.daysDelta))}</span>
        </span>
      `;
    }
    if (ctrl.state === 'due_soon') {
      return html`
        <span class="due-tag due-soon">
          ${iconClock(11)}
          <span>
            ${ctrl.daysDelta === 0
              ? t.payments.dueToday
              : t.payments.daysLeft.replace('{n}', String(ctrl.daysDelta))}
          </span>
        </span>
      `;
    }
    return html`
      <span class="due-tag on-track">
        ${iconClock(11)}
        <span>${t.payments.daysLeft.replace('{n}', String(ctrl.daysDelta))}</span>
      </span>
    `;
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
      if (this.invoiceStatusFilter === 'overdue') {
        const dueCtrl = store.getInvoiceDueControl(inv);
        if (inv.status !== 'overdue' && dueCtrl.state !== 'overdue') return false;
      } else if (this.invoiceStatusFilter !== 'all' && inv.status !== this.invoiceStatusFilter) {
        return false;
      }
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

  private getFilteredPayments(): InvoicePayment[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return [...this.payments]
      .sort((a, b) => (b.paymentDate + b.createdAt).localeCompare(a.paymentDate + a.createdAt))
      .filter((pay) => {
        if (this.paymentMethodFilter !== 'all' && pay.method !== this.paymentMethodFilter) return false;
        if (!query) return true;
        const inv = this.invoices.find((i) => i.id === pay.invoiceId);
        const ctr = this.contracts.find((c) => c.id === pay.contractId);
        const cp = store.counterparties.find((c) => c.id === pay.counterpartyId)?.name.toLowerCase() || '';
        return (
          pay.documentNumber.toLowerCase().includes(query) ||
          pay.notes.toLowerCase().includes(query) ||
          (inv?.number.toLowerCase().includes(query) ?? false) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
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
      paid: related.reduce((sum, i) => sum + store.getInvoicePaidAmount(i.id), 0),
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
    const filteredPayments = this.getFilteredPayments();

    const activeList = this.contracts.filter((c) => c.status === 'active');
    const rubTotal = activeList
      .filter((c) => c.currency === 'RUB')
      .reduce((acc, c) => acc + c.amount, 0);

    const rubInvoices = this.invoices.filter((i) => i.currency === 'RUB' && i.status !== 'cancelled');
    const rubInvoicedTotal = rubInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
    const rubPaidTotal = rubInvoices.reduce((acc, i) => acc + store.getInvoicePaidAmount(i.id), 0);
    const overdueInvoices = rubInvoices.filter((i) => store.getInvoiceDueControl(i).state === 'overdue');
    const rubOverdueDebt = overdueInvoices.reduce(
      (acc, i) => acc + store.getInvoiceRemainingAmount(i),
      0
    );
    const expiringSoon = activeList.filter((c) => {
      const days = this.getDaysRemaining(c.endDate);
      return days !== null && days >= 0 && days <= 45;
    }).length;

    const payableInvoices = this.invoices.filter(
      (i) => i.status !== 'draft' && i.status !== 'cancelled' && store.getInvoiceRemainingAmount(i) > 0
    );

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
      { value: 'payments', label: `${t.payments.tabPayments} (${this.payments.length})` },
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
      { value: 'partially_paid', label: t.invoices.statuses.partially_paid, color: '#f59e0b' },
      { value: 'paid', label: t.invoices.statuses.paid, color: '#10b981' },
      { value: 'overdue', label: t.invoices.statuses.overdue, color: '#ef4444' },
      { value: 'cancelled', label: t.invoices.statuses.cancelled, color: '#64748b' },
    ];

    const paymentMethodFilterOptions = [
      { value: 'all', label: isRu ? 'Все способы оплаты' : 'All payment methods' },
      { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
      { value: 'card', label: t.payments.methods.card },
      { value: 'cash', label: t.payments.methods.cash },
      { value: 'offset', label: t.payments.methods.offset },
    ];

    return html`
      <app-page-header
        title="${isRu ? 'Договоры' : 'Contracts'}"
        subtitle="${isRu
          ? 'Реестр контрактов с заказчиками и подрядчиками, калькуляции, счета, контроль сроков и учёт оплат'
          : 'Contract registry with clients and vendors, calculations, invoicing, due-date control, and payment tracking'}"
      >
        <span slot="icon">${iconFileText(28)}</span>
        <div slot="actions" style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
          ${payableInvoices.length > 0
            ? html`
                <app-button
                  variant="secondary"
                  size="md"
                  @click="${() => this.openPaymentModal(payableInvoices[0])}"
                >
                  <span slot="icon-start">${iconCreditCard(16)}</span>
                  <span>${t.payments.recordPayment}</span>
                </app-button>
              `
            : ''}
          <app-button variant="primary" size="md" @click="${() => this.openCreateModal()}">
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${isRu ? 'Новый договор' : 'New Contract'}</span>
          </app-button>
        </div>
      </app-page-header>

      <app-kpi-strip columns="6">
        <app-metric-card size="compact" label="${isRu ? 'Всего договоров' : 'Total Contracts'}" value="${this.contracts.length}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Активная сумма (RUB)' : 'Active Volume (RUB)'}" value="${(rubTotal / 1_000_000).toFixed(2)}M ₽"></app-metric-card>
        <app-metric-card size="compact" label="${t.contractDetail.invoicedTotal} (RUB)" value="${(rubInvoicedTotal / 1_000_000).toFixed(2)}M ₽" valueColor="var(--accent-primary, #6366f1)"></app-metric-card>
        <app-metric-card size="compact" label="${t.contractDetail.paidTotal} (RUB)" value="${(rubPaidTotal / 1_000_000).toFixed(2)}M ₽" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${t.payments.overdueAlert} (${overdueInvoices.length})" value="${(rubOverdueDebt / 1_000_000).toFixed(2)}M ₽" valueColor="${rubOverdueDebt > 0 ? '#ef4444' : ''}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Истекают ≤ 45 дн.' : 'Expiring ≤ 45d'}" value="${expiringSoon}" valueColor="${expiringSoon > 0 ? '#f59e0b' : ''}"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${this.viewTab === 'contracts'
          ? isRu
            ? 'Поиск по номеру, предмету, контрагенту...'
            : 'Search number, title, counterparty...'
          : this.viewTab === 'calculations'
          ? isRu
            ? 'Поиск по номеру калькуляции, договору, контрагенту...'
            : 'Search calculation, contract, counterparty...'
          : this.viewTab === 'payments'
          ? isRu
            ? 'Поиск по платёжному документу, счёту, контрагенту...'
            : 'Search payment doc, invoice, counterparty...'
          : isRu
          ? 'Поиск по номеру счёта, договору, контрагенту...'
          : 'Search invoice, contract, counterparty...'}"
        .searchValue="${this.localSearch}"
        .filters="${this.viewTab === 'contracts'
          ? [
              { key: 'status', options: statusOptions },
              { key: 'type', options: typeOptions },
            ]
          : this.viewTab === 'calculations'
          ? [{ key: 'calcStatus', options: calcStatusOptions }]
          : this.viewTab === 'payments'
          ? [{ key: 'payMethod', options: paymentMethodFilterOptions }]
          : [{ key: 'invoiceStatus', options: invoiceStatusOptions }]}"
        .values="${this.viewTab === 'contracts'
          ? { status: this.statusFilter, type: this.typeFilter }
          : this.viewTab === 'calculations'
          ? { calcStatus: this.calcStatusFilter }
          : this.viewTab === 'payments'
          ? { payMethod: this.paymentMethodFilter }
          : { invoiceStatus: this.invoiceStatusFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => (this.localSearch = eventValue(e))}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | ContractStatus;
          if (e.detail.key === 'type') this.typeFilter = eventValue(e) as 'all' | ContractType;
          if (e.detail.key === 'calcStatus') this.calcStatusFilter = eventValue(e) as 'all' | CalculationStatus;
          if (e.detail.key === 'payMethod') this.paymentMethodFilter = eventValue(e) as 'all' | PaymentMethod;
          if (e.detail.key === 'invoiceStatus') this.invoiceStatusFilter = eventValue(e) as 'all' | InvoiceStatus;
        }}"
      >
        <app-segmented-switch
          slot="prefix"
          .value="${this.viewTab}"
          .options="${tabOptions}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.viewTab = eventValue(e) as 'contracts' | 'calculations' | 'invoices' | 'payments')}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${this.viewTab === 'contracts'
        ? filtered.length === 0
          ? html`<app-empty-state compact title="${isRu ? 'Договоры не найдены' : 'No contracts found'}"></app-empty-state>`
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
                            <div>${formatMoney(ctr.amount, ctr.currency)}</div>
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
                                          ${billing.calcCount > 0 ? '· ' : ''}${isRu ? 'Счетов' : 'Inv'}: ${formatMoney(billing.invoiced, ctr.currency)}
                                        </span>`
                                      : ''}
                                    ${billing.paid > 0
                                      ? html`<span class="paid-val">· ${isRu ? 'Опл' : 'Paid'}: ${formatMoney(billing.paid, ctr.currency)}</span>`
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
                            <app-status-chip domain="contract" status="${ctr.status}" size="sm"></app-status-chip>
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
          ? html`<app-empty-state compact title="${t.contractDetail.noCalculations}"></app-empty-state>`
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
                            <div>${formatMoney(calc.billableAmount, calc.currency)}</div>
                            ${linkedInv
                              ? html`<div class="billing-sub">
                                  <span class="paid-val">${linkedInv.number}</span>
                                </div>`
                              : ''}
                          </td>
                          <td>
                            <app-status-chip
                              domain="calculation"
                              status="${calc.status}"
                              appearance="soft"
                              size="sm"
                            ></app-status-chip>
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
        : this.viewTab === 'payments'
        ? filteredPayments.length === 0
          ? html`<app-empty-state compact title="${t.payments.noPayments}"></app-empty-state>`
          : html`
              <div class="table-card">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${t.payments.paymentDate}</th>
                      <th>${t.payments.documentNumber}</th>
                      <th>${isRu ? 'Счёт' : 'Invoice'}</th>
                      <th>${isRu ? 'Договор' : 'Contract'}</th>
                      <th>${isRu ? 'Контрагент' : 'Counterparty'}</th>
                      <th>${t.payments.paymentMethod}</th>
                      <th>${t.payments.notes}</th>
                      <th>${isRu ? 'Сумма' : 'Amount'}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredPayments.map((pay) => {
                      const inv = this.invoices.find((i) => i.id === pay.invoiceId);
                      const ctr = this.contracts.find((c) => c.id === pay.contractId);
                      const cp = store.counterparties.find((c) => c.id === pay.counterpartyId);
                      return html`
                        <tr>
                          <td class="mono" style="white-space: nowrap;">${pay.paymentDate}</td>
                          <td class="mono" style="font-weight: 700; white-space: nowrap;">
                            <div style="display: inline-flex; align-items: center; gap: 0.4rem;">
                              ${iconWallet(14)}
                              <span>${pay.documentNumber || '—'}</span>
                            </div>
                          </td>
                          <td>
                            ${inv
                              ? html`
                                  <button
                                    type="button"
                                    class="contract-link-btn"
                                    @click="${() => ctr && store.openContractDetail(ctr.id)}"
                                  >
                                    <span>${inv.number}</span>
                                  </button>
                                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                                    ${t.invoices.statuses[inv.status]}
                                  </div>
                                `
                              : '—'}
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
                          <td>
                            <app-badge variant="default" appearance="soft" size="sm">
                              ${t.payments.methods[pay.method]}
                            </app-badge>
                          </td>
                          <td style="color: var(--text-secondary); max-width: 240px;">
                            ${pay.notes || '—'}
                          </td>
                          <td class="amount-cell" style="color: var(--color-success, #10b981);">
                            +${formatMoney(pay.amount, pay.currency)}
                          </td>
                          <td>
                            <div class="actions-row">
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
                              <button
                                type="button"
                                class="icon-btn danger"
                                title="${t.common.delete}"
                                @click="${() => (this.deletingPayment = pay)}"
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
        : filteredInvoices.length === 0
        ? html`<app-empty-state compact title="${isRu ? 'Счета не найдены' : 'No invoices found'}"></app-empty-state>`
        : html`
            <div class="table-card">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${isRu ? 'Счёт' : 'Invoice'}</th>
                    <th>${isRu ? 'Договор' : 'Contract'}</th>
                    <th>${isRu ? 'Контрагент' : 'Counterparty'}</th>
                    <th>${isRu ? 'Сроки и контроль' : 'Dates & Control'}</th>
                    <th>${isRu ? 'Оплата и остаток' : 'Payment Progress'}</th>
                    <th>${isRu ? 'Итого с НДС' : 'Total'}</th>
                    <th>${isRu ? 'Статус' : 'Status'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredInvoices.map((inv) => {
                    const ctr = this.contracts.find((c) => c.id === inv.contractId);
                    const cp = store.counterparties.find((c) => c.id === ctr?.counterpartyId);
                    const invPaid = store.getInvoicePaidAmount(inv.id);
                    const invRemaining = store.getInvoiceRemainingAmount(inv);
                    const invPayPct =
                      inv.totalAmount > 0
                        ? Math.min(100, Math.round((invPaid / inv.totalAmount) * 100))
                        : 0;
                    const dueCtrl = store.getInvoiceDueControl(inv);
                    const canPay =
                      inv.status !== 'draft' && inv.status !== 'cancelled' && invRemaining > 0;

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
                          <div>${this.renderDueControlTag(inv, t)}</div>
                        </td>
                        <td>
                          <div class="inv-pay-cell">
                            <div class="inv-pay-meta mono">
                              <span style="color: ${invPaid > 0 ? '#10b981' : 'var(--text-muted)'}; font-weight: 600;">
                                ${formatMoney(invPaid, inv.currency)}
                              </span>
                              <span>${invPayPct}%</span>
                            </div>
                            <div class="inv-pay-bar">
                              <div
                                class="inv-pay-fill ${dueCtrl.state === 'overdue'
                                  ? 'overdue'
                                  : invPayPct > 0 && invPayPct < 100
                                  ? 'partial'
                                  : ''}"
                                style="width: ${invPayPct}%;"
                              ></div>
                            </div>
                            ${invRemaining > 0 && inv.status !== 'cancelled'
                              ? html`
                                  <div class="inv-pay-meta mono">
                                    <span>${isRu ? 'Остаток' : 'Due'}:</span>
                                    <span style="color: ${dueCtrl.state === 'overdue' ? '#ef4444' : 'var(--text-primary)'}; font-weight: 600;">
                                      ${formatMoney(invRemaining, inv.currency)}
                                    </span>
                                  </div>
                                `
                              : ''}
                          </div>
                        </td>
                        <td class="amount-cell">${formatMoney(inv.totalAmount, inv.currency)}</td>
                        <td>
                          <app-status-chip
                            domain="invoice"
                            status="${inv.status}"
                            appearance="soft"
                            size="sm"
                          ></app-status-chip>
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
                            ${canPay
                              ? html`
                                  <button
                                    type="button"
                                    class="icon-btn success"
                                    title="${t.payments.recordPayment}"
                                    @click="${() => this.openPaymentModal(inv)}"
                                  >
                                    ${iconCreditCard(14)}
                                  </button>
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
        <app-form-grid>
          <div>
            <app-input
              label="${isRu ? 'Номер договора' : 'Contract Number'}"
              placeholder="ДГ-2026/050"
              .value="${this.formNumber}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formNumber = eventValue(e);
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
                (this.formType = eventValue(e) as ContractType)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-input
              label="${isRu ? 'Предмет договора' : 'Contract Title'}"
              .value="${this.formTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formTitle = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Наша компания' : 'Company'}"
              .value="${this.formCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Контрагент' : 'Counterparty'}"
              .value="${this.formCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCounterpartyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              .value="${this.formProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formProjectId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Ответственный' : 'Owner'}"
              .value="${this.formOwnerId}"
              .options="${ownerOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formOwnerId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Сумма договора' : 'Amount'}"
              .value="${this.formAmount}"
              min="0"
              step="50000"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formAmount = eventValue(e))}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Валюта' : 'Currency'}"
              .value="${this.formCurrency}"
              .options="${currencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formCurrency = eventValue(e) as 'RUB' | 'USD' | 'EUR')}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата начала' : 'Start Date'}"
              .value="${this.formStartDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formStartDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата окончания' : 'End Date'}"
              .value="${this.formEndDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formEndDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as ContractStatus)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Периодичность калькуляций' : 'Calculation Cycle'}"
              .value="${this.formBillingFrequency}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formBillingFrequency = eventValue(e) as CalculationFrequency)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Условия и комментарии' : 'Description'}"
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
        .open="${Boolean(this.deletingContract)}"
        size="sm"
        title="${isRu ? 'Удалить договор?' : 'Delete contract?'}"
        action="${isRu
          ? `Договор ${this.deletingContract?.number || ''} будет удалён.`
          : `Contract ${this.deletingContract?.number || ''} will be deleted.`}"
        result="${isRu
          ? 'Счета, платежи и калькуляции договора будут безвозвратно потеряны.'
          : 'Invoices, payments and calculations of the contract will be permanently lost.'}"
        .actionLabel="${isRu ? 'Выполняемое действие:' : 'Action performed:'}"
        .resultLabel="${isRu ? 'Ожидаемый результат:' : 'Expected result:'}"
        .cancelLabel="${isRu ? 'Отмена' : 'Cancel'}"
        .confirmLabel="${isRu ? 'Удалить' : 'Delete'}"
        @cancel="${() => (this.deletingContract = null)}"
        @confirm="${() => {
          if (this.deletingContract) {
            store.deleteContract(this.deletingContract.id);
            this.deletingContract = null;
          }
        }}"
      ></app-confirm-dialog>

      ${this.renderPaymentModal(t, isRu, payableInvoices)}
      ${this.renderDeletePaymentModal(t, isRu)}
    `;
  }

  private renderPaymentModal(
    t: ReturnType<typeof getTranslation>,
    isRu: boolean,
    payableInvoices: Invoice[]
  ) {
    if (!this.paymentModalOpen) return '';
    const inv =
      this.invoices.find((i) => i.id === this.paymentInvoiceId) || payableInvoices[0] || null;
    if (!inv) return '';

    const paidSoFar = store.getInvoicePaidAmount(inv.id);
    const remainingBefore = store.getInvoiceRemainingAmount(inv);
    const entered = Math.max(0, Number(this.payAmount) || 0);
    const paidAfter = Math.round((paidSoFar + entered) * 100) / 100;
    const remainingAfter = Math.max(0, Math.round((inv.totalAmount - paidAfter) * 100) / 100);
    const willBeFull = remainingAfter === 0 && entered > 0;

    const invoiceOptions = payableInvoices.map((i) => {
      const cp = store.counterparties.find((c) => c.id === i.counterpartyId);
      return {
        value: i.id,
        label: `${i.number} (${cp?.name || '—'}) · ${isRu ? 'Остаток' : 'Due'}: ${formatMoney(
          store.getInvoiceRemainingAmount(i),
          i.currency
        )}`,
      };
    });

    const methodOptions: { value: PaymentMethod; label: string }[] = [
      { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
      { value: 'card', label: t.payments.methods.card },
      { value: 'cash', label: t.payments.methods.cash },
      { value: 'offset', label: t.payments.methods.offset },
    ];

    return html`
      <app-modal
        ?open="${this.paymentModalOpen}"
        size="md"
        title="${t.payments.newPayment} · ${inv.number}"
        @close="${() => (this.paymentModalOpen = false)}"
      >
        <app-form-grid>
          ${payableInvoices.length > 0
            ? html`
                <div class="col-span-2">
                  <app-select
                    label="${isRu ? 'Счёт на оплату' : 'Invoice'}"
                    .value="${inv.id}"
                    .options="${invoiceOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) => {
                      const next = this.invoices.find((x) => x.id === eventValue(e));
                      if (next) this.openPaymentModal(next);
                    }}"
                  ></app-select>
                </div>
              `
            : ''}

          <div class="col-span-2 pay-summary-card">
            <div class="pay-stat">
              <span class="pay-stat-label">${isRu ? 'Сумма счёта' : 'Invoice Total'}</span>
              <span class="pay-stat-val">${formatMoney(inv.totalAmount, inv.currency)}</span>
            </div>
            <div class="pay-stat">
              <span class="pay-stat-label">${t.payments.paidAmount}</span>
              <span class="pay-stat-val" style="color: #10b981;">
                ${formatMoney(paidSoFar, inv.currency)}
              </span>
            </div>
            <div class="pay-stat">
              <span class="pay-stat-label">${t.payments.remainingDue}</span>
              <span class="pay-stat-val" style="color: #f59e0b;">
                ${formatMoney(remainingBefore, inv.currency)}
              </span>
            </div>
          </div>

          <div>
            <app-number-input
              label="${isRu ? `Сумма платежа (${inv.currency})` : `Payment Amount (${inv.currency})`}"
              .value="${this.payAmount}"
              min="1"
              step="1000"
              error="${this.payError}"
              @change="${(e: CustomEvent<{ value: number }>) => {
                this.payAmount = eventValue(e);
                this.payError = '';
              }}"
            ></app-number-input>
            <div class="quick-term-row" style="margin-top: 0.4rem;">
              <button
                type="button"
                class="quick-term-btn"
                @click="${() => {
                  this.payAmount = Math.max(1, Math.round(remainingBefore * 0.25));
                  this.payError = '';
                }}"
              >
                25%
              </button>
              <button
                type="button"
                class="quick-term-btn"
                @click="${() => {
                  this.payAmount = Math.max(1, Math.round(remainingBefore * 0.5));
                  this.payError = '';
                }}"
              >
                50%
              </button>
              <button
                type="button"
                class="quick-term-btn"
                @click="${() => {
                  this.payAmount = remainingBefore;
                  this.payError = '';
                }}"
              >
                ${isRu ? '100% остатка' : '100% due'}
              </button>
            </div>
          </div>

          <div>
            <app-date-input
              label="${t.payments.paymentDate}"
              .value="${this.payDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.payDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-select
              label="${t.payments.paymentMethod}"
              .value="${this.payMethod}"
              .options="${methodOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.payMethod = eventValue(e) as PaymentMethod)}"
            ></app-select>
          </div>

          <div>
            <app-input
              label="${t.payments.documentNumber}"
              placeholder="ПП-2026/0850"
              .value="${this.payDocNumber}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.payDocNumber = eventValue(e))}"
            ></app-input>
          </div>

          <div class="col-span-2 pay-preview-result">
            <span>
              ${isRu ? 'После платежа:' : 'After payment:'}
              <strong class="mono">${formatMoney(paidAfter, inv.currency)}</strong>
              · ${t.payments.remainingDue}:
              <strong class="mono">${formatMoney(remainingAfter, inv.currency)}</strong>
            </span>
            <app-badge
              variant="${willBeFull ? 'success' : 'warning'}"
              appearance="soft"
              size="sm"
            >
              ${willBeFull ? t.payments.fullPayment : t.payments.partialPayment}
            </app-badge>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.payments.notes}"
              .value="${this.payNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.payNotes = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.paymentModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSavePayment(inv)}">
            ${t.payments.recordPayment}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeletePaymentModal(t: ReturnType<typeof getTranslation>, isRu: boolean) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingPayment)}"
        size="sm"
        title="${isRu ? 'Удалить платёж?' : 'Delete payment?'}"
        action="${isRu
          ? 'Платёж будет удалён из счёта.'
          : 'The payment will be removed from the invoice.'}"
        result="${isRu
          ? 'Сумма платежа будет вычтена из оплаченного счёта.'
          : 'The payment amount will be subtracted from the paid invoice.'}"
        .actionLabel="${isRu ? 'Выполняемое действие:' : 'Action performed:'}"
        .resultLabel="${isRu ? 'Ожидаемый результат:' : 'Expected result:'}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingPayment = null)}"
        @confirm="${() => {
          if (this.deletingPayment) {
            store.deleteInvoicePayment(this.deletingPayment.id);
            this.deletingPayment = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private openPaymentModal(inv: Invoice) {
    const today = new Date().toISOString().slice(0, 10);
    const remaining = store.getInvoiceRemainingAmount(inv);
    const seq = this.payments.length + 1;

    this.paymentInvoiceId = inv.id;
    this.payAmount = remaining > 0 ? remaining : inv.totalAmount;
    this.payDate = today;
    this.payMethod = 'bank_transfer';
    this.payDocNumber = `ПП-${today.slice(0, 4)}/${String(840 + seq).padStart(4, '0')}`;
    this.payNotes = `Оплата по счёту ${inv.number}`;
    this.payError = '';
    this.paymentModalOpen = true;
  }

  private handleSavePayment(inv: Invoice) {
    const amount = Number(this.payAmount) || 0;
    if (amount <= 0) {
      this.payError = this.currentLang === 'ru' ? 'Введите сумму больше 0' : 'Enter amount > 0';
      return;
    }

    store.addInvoicePayment({
      invoiceId: inv.id,
      contractId: inv.contractId,
      companyId: inv.companyId,
      counterpartyId: inv.counterpartyId,
      amount,
      currency: inv.currency,
      paymentDate: this.payDate || new Date().toISOString().slice(0, 10),
      method: this.payMethod,
      documentNumber: this.payDocNumber,
      notes: this.payNotes,
    });

    this.paymentModalOpen = false;
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