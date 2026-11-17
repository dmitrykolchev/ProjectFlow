import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
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
  iconArrowDownLeft,
  iconArrowUpRight,
  iconCalculator,
  iconCheck,
  iconChevronRight,
  iconClock,
  iconCreditCard,
  iconEdit,
  iconFileText,
  iconLandmark,
  iconPlus,
  iconReceipt,
  iconSend,
  iconTable,
  iconTrash,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';

import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-payment-form/app-payment-form';
import '../../common/app-contract-form/app-contract-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-pagination/app-pagination';
import { paginateItems } from '../../common/paginate';
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
  @state() private currentPage = 1;
  @state() private tablePageSize = store.customization.tablePageSize;

  @state() private modalOpen = false;
  @state() private editingContract: Contract | null = null;

  @state() private deletingContract: Contract | null = null;

  // Record / Delete Payment modals
  @state() private paymentModalOpen = false;
  @state() private paymentInvoiceId = '';
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
    this.currentPage = store.activeView === 'contracts' ? store.activePage : 1;
    this.contracts = store.contracts;
    this.calculations = store.calculations;
    this.invoices = store.invoices;
    this.payments = store.payments;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.tablePageSize = store.customization.tablePageSize;
  }

  private getTypeLabel(type: ContractType, t: ReturnType<typeof getTranslation>): string {
    switch (type) {
      case 'service':
        return t.viewTexts.counterpartyDetail.typeService;
      case 'supply':
        return t.viewTexts.counterpartyDetail.typeSupply;
      case 'license':
        return t.viewTexts.counterpartyDetail.typeLicense;
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
        const cp = store.counterparties.find((c) => c.id === pay.counterpartyId);
        const comp = store.companies.find((c) => c.id === pay.companyId);
        const compReq = store.getPaymentCompanyRequisitesLabel(pay).toLowerCase();
        const cpReq = store.getPaymentCounterpartyRequisitesLabel(pay).toLowerCase();
        return (
          pay.documentNumber.toLowerCase().includes(query) ||
          pay.notes.toLowerCase().includes(query) ||
          (inv?.number.toLowerCase().includes(query) ?? false) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
          (comp?.name.toLowerCase().includes(query) ?? false) ||
          (cp?.name.toLowerCase().includes(query) ?? false) ||
          compReq.includes(query) ||
          cpReq.includes(query)
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
    const t = getTranslation(this.currentLang);
    const filtered = this.getFiltered();
    const filteredCalculations = this.getFilteredCalculations();
    const filteredInvoices = this.getFilteredInvoices();
    const filteredPayments = this.getFilteredPayments();
    const pagedContracts = paginateItems(filtered, this.currentPage, this.tablePageSize);
    const pagedCalculations = paginateItems(filteredCalculations, this.currentPage, this.tablePageSize);
    const pagedInvoices = paginateItems(filteredInvoices, this.currentPage, this.tablePageSize);
    const pagedPayments = paginateItems(filteredPayments, this.currentPage, this.tablePageSize);

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
      { value: 'all', label: t.viewTexts.contracts.filterAllStatuses },
      { value: 'draft', label: t.viewTexts.contracts.statusDraft, color: '#64748b' },
      { value: 'on_approval', label: t.viewTexts.contracts.statusOnApproval, color: '#f59e0b' },
      { value: 'active', label: t.viewTexts.contracts.statusActive, color: '#10b981' },
      { value: 'completed', label: t.viewTexts.contracts.statusCompleted, color: '#0284c7' },
      { value: 'terminated', label: t.viewTexts.contracts.statusTerminated, color: '#ef4444' },
    ];

    const typeOptions = [
      { value: 'all', label: t.viewTexts.counterparties.filterAllTypes },
      { value: 'service', label: t.viewTexts.counterpartyDetail.typeService },
      { value: 'supply', label: t.viewTexts.counterpartyDetail.typeSupply },
      { value: 'license', label: t.viewTexts.counterpartyDetail.typeLicense },
      { value: 'sla', label: 'SLA' },
      { value: 'nda', label: 'NDA' },
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
      { value: 'all', label: t.viewTexts.contracts.filterAllCalcStatuses },
      { value: 'draft', label: t.calculations.statuses.draft, color: '#64748b' },
      { value: 'sent', label: t.calculations.statuses.sent, color: '#f59e0b' },
      { value: 'approved', label: t.calculations.statuses.approved, color: '#10b981' },
      { value: 'rejected', label: t.calculations.statuses.rejected, color: '#ef4444' },
      { value: 'invoiced', label: t.calculations.statuses.invoiced, color: '#0284c7' },
    ];

    const invoiceStatusOptions = [
      { value: 'all', label: t.viewTexts.contracts.filterAllInvoiceStatuses },
      { value: 'draft', label: t.invoices.statuses.draft, color: '#64748b' },
      { value: 'issued', label: t.invoices.statuses.issued, color: '#0284c7' },
      { value: 'sent', label: t.invoices.statuses.sent, color: '#f59e0b' },
      { value: 'partially_paid', label: t.invoices.statuses.partially_paid, color: '#f59e0b' },
      { value: 'paid', label: t.invoices.statuses.paid, color: '#10b981' },
      { value: 'overdue', label: t.invoices.statuses.overdue, color: '#ef4444' },
      { value: 'cancelled', label: t.invoices.statuses.cancelled, color: '#64748b' },
    ];

    const paymentMethodFilterOptions = [
      { value: 'all', label: t.viewTexts.payments.filterAllMethods },
      { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
      { value: 'card', label: t.payments.methods.card },
      { value: 'cash', label: t.payments.methods.cash },
      { value: 'offset', label: t.payments.methods.offset },
    ];

    return html`
      <app-page-header
        title="${t.viewTexts.contracts.pageTitle}"
        subtitle="${t.viewTexts.pageSubtitles.contracts}"
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
            <span>${t.viewTexts.contracts.newContractButton}</span>
          </app-button>
        </div>
      </app-page-header>

      <app-kpi-strip columns="6">
        <app-metric-card size="compact" label="${t.viewTexts.contracts.kpiTotal}" value="${this.contracts.length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.contracts.kpiActiveVolume}" value="${(rubTotal / 1_000_000).toFixed(2)}M ₽"></app-metric-card>
        <app-metric-card size="compact" label="${t.contractDetail.invoicedTotal} (RUB)" value="${(rubInvoicedTotal / 1_000_000).toFixed(2)}M ₽" valueColor="var(--accent-primary, #6366f1)"></app-metric-card>
        <app-metric-card size="compact" label="${t.contractDetail.paidTotal} (RUB)" value="${(rubPaidTotal / 1_000_000).toFixed(2)}M ₽" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${t.payments.overdueAlert} (${overdueInvoices.length})" value="${(rubOverdueDebt / 1_000_000).toFixed(2)}M ₽" valueColor="${rubOverdueDebt > 0 ? '#ef4444' : ''}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.contracts.kpiExpiring}" value="${expiringSoon}" valueColor="${expiringSoon > 0 ? '#f59e0b' : ''}"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${this.viewTab === 'contracts'
          ? t.viewTexts.contracts.searchContracts
          : this.viewTab === 'calculations'
          ? t.viewTexts.contracts.searchCalculations
          : this.viewTab === 'payments'
          ? t.viewTexts.contracts.searchPayments
          : t.viewTexts.contracts.searchInvoices}"
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
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | ContractStatus;
          if (e.detail.key === 'type') this.typeFilter = eventValue(e) as 'all' | ContractType;
          if (e.detail.key === 'calcStatus') this.calcStatusFilter = eventValue(e) as 'all' | CalculationStatus;
          if (e.detail.key === 'payMethod') this.paymentMethodFilter = eventValue(e) as 'all' | PaymentMethod;
          if (e.detail.key === 'invoiceStatus') this.invoiceStatusFilter = eventValue(e) as 'all' | InvoiceStatus;
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      >
        <app-segmented-switch
          slot="prefix"
          .value="${this.viewTab}"
          .options="${tabOptions}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.viewTab = eventValue(e) as 'contracts' | 'calculations' | 'invoices' | 'payments';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${this.viewTab === 'contracts'
        ? filtered.length === 0
          ? html`<app-empty-state compact title="${t.viewTexts.contracts.emptyNoContracts}"></app-empty-state>`
          : html`
              <div class="table-card">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${t.viewTexts.contracts.thNumber}</th>
                      <th>${t.viewTexts.counterpartyDetail.labelSubject}</th>
                      <th>${t.viewTexts.contracts.thParties}</th>
                      <th>${t.viewTexts.timeTracking.labelProject}</th>
                      <th>${t.viewTexts.contracts.thAmountBilled}</th>
                      <th>${t.viewTexts.contracts.thTerm}</th>
                      <th>${t.viewTexts.counterparties.thStatus}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pagedContracts.items.map((ctr) => {
                      const company = store.companies.find((c) => c.id === ctr.companyId);
                      const cp = store.counterparties.find((c) => c.id === ctr.counterpartyId);
                      const proj = store.projects.find((p) => p.id === ctr.projectId);
                      const owner = store.users.find((u) => u.id === ctr.ownerId);
                      const daysLeft = ctr.status === 'active' ? this.getDaysRemaining(ctr.endDate) : null;
                      const billing = this.getContractBillingStats(ctr.id);

                      return html`
                        <tr>
                          <td>
                            <app-link
                              class="contract-link-btn"
                              size="md"
                              variant="primary"
                              title="${t.contractDetail.openContract}"
                              @click="${() => store.openContractDetail(ctr.id)}"
                            >
                              <span slot="start">${iconFileText(15)}</span>
                              <span>${ctr.number}</span>
                            </app-link>
                            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">
                              ${this.getTypeLabel(ctr.type, t)}${ctr.billingFrequency
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
                                          ${t.viewTexts.contracts.calcShort}: ${billing.calcCount}${billing.approvedCalcs > 0 ? ` (${billing.approvedCalcs} ✓)` : ''}
                                        </span>`
                                      : ''}
                                    ${billing.count > 0
                                      ? html`<span>
                                          ${billing.calcCount > 0 ? '· ' : ''}${t.viewTexts.contracts.invShort}: ${formatMoney(billing.invoiced, ctr.currency)}
                                        </span>`
                                      : ''}
                                    ${billing.paid > 0
                                      ? html`<span class="paid-val">· ${t.viewTexts.contracts.paidShort}: ${formatMoney(billing.paid, ctr.currency)}</span>`
                                      : ''}
                                  </div>
                                `
                              : ''}
                          </td>
                          <td class="dates-cell">
                            <div>${ctr.startDate} → ${ctr.endDate}</div>
                            ${daysLeft !== null && daysLeft >= 0 && daysLeft <= 45
                              ? html`<span class="expiry-warn">${t.viewTexts.contracts.daysLeftTemplate(daysLeft)}</span>`
                              : ''}
                          </td>
                          <td>
                            <app-status-chip domain="contract" status="${ctr.status}" size="sm"></app-status-chip>
                          </td>
                          <td>
                            <div class="actions-row">
                              <app-button
                                class="accent-action"
                                size="sm"
                                variant="icon"
                                title="${t.contractDetail.openContract}"
                                @click="${() => store.openContractDetail(ctr.id)}"
                              >
                                <span slot="start">${iconChevronRight(15)}</span>
                              </app-button>
                              <app-button
                                class="accent-action"
                                size="sm"
                                variant="icon"
                                title="${t.contractDetail.createCalculation}"
                                @click="${() => store.openContractDetail(ctr.id, 'calculation')}"
                              >
                                <span slot="start">${iconTable()}</span>
                              </app-button>
                              <app-button
                                class="success-action"
                                size="sm"
                                variant="icon"
                                title="${t.contractDetail.issueInvoice}"
                                @click="${() => store.openContractDetail(ctr.id, 'invoice')}"
                              >
                                <span slot="start">${iconReceipt(15)}</span>
                              </app-button>
                              <app-button
                                size="sm"
                                variant="icon"
                                title="${t.common.edit}"
                                @click="${() => this.openEditModal(ctr)}"
                              >
                                <span slot="start">${iconEdit(14)}</span>
                              </app-button>
                              <app-button
                                class="danger-action"
                                size="sm"
                                variant="icon"
                                title="${t.common.delete}"
                                @click="${() => (this.deletingContract = ctr)}"
                              >
                                <span slot="start">${iconTrash(14)}</span>
                              </app-button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
              <app-pagination
                layout-mode="table"
                .totalItems="${pagedContracts.totalItems}"
                .page="${pagedContracts.page}"
                .pageSize="${pagedContracts.pageSize}"
                @page-change="${(e: CustomEvent<{ page: number }>) => {
                  this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
                  this.scrollTop = 0;
                }}"
                @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                  this.currentPage = 1; store.setActivePage(1, false);
                  store.setTablePageSize(e.detail.pageSize);
                }}"
              ></app-pagination>
            `
        : this.viewTab === 'calculations'
        ? filteredCalculations.length === 0
          ? html`<app-empty-state compact title="${t.contractDetail.noCalculations}"></app-empty-state>`
          : html`
              <div class="table-card">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>${t.viewTexts.calculations.thCalculation}</th>
                      <th>${t.viewTexts.payments.thContract}</th>
                      <th>${t.viewTexts.payments.thCounterparty}</th>
                      <th>${t.viewTexts.calculations.thPeriodCycle}</th>
                      <th>${t.viewTexts.calculations.thLabor}</th>
                      <th>${t.viewTexts.calculations.thBillableCol}</th>
                      <th>${t.viewTexts.counterparties.thStatus}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pagedCalculations.items.map((calc) => {
                      const ctr = this.contracts.find((c) => c.id === calc.contractId);
                      const cp = store.counterparties.find((c) => c.id === ctr?.counterpartyId);
                      const priorCount = calc.items.filter((i) => i.isPriorPeriod).length;
                      const linkedInv = calc.invoiceId
                        ? this.invoices.find((i) => i.id === calc.invoiceId)
                        : undefined;
                      const hUnit = t.viewTexts.calculations.hoursUnitShort;
                      return html`
                        <tr>
                          <td>
                            <app-link
                              class="contract-link-btn"
                              size="md"
                              variant="primary"
                              @click="${() => store.openCalculationDetail(calc.id)}"
                            >
                              <span slot="start">${iconCalculator(15)}</span>
                              <span>${calc.number}</span>
                            </app-link>
                            <div class="billing-sub">
                              <span>${calc.items.length} ${t.viewTexts.calculations.itemsSuffix}</span>
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
                                  <app-link
                                    class="contract-link-btn"
                                    size="md"
                                    variant="primary"
                                    @click="${() => store.openContractDetail(ctr.id)}"
                                  >
                                    <span>${ctr.number}</span>
                                  </app-link>
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
                                    <app-button
                                      class="accent-action"
                                      size="sm"
                                      variant="icon"
                                      title="${t.calculations.sendForApproval}"
                                      @click="${() => store.updateCalculationStatus(calc.id, 'sent')}"
                                    >
                                      <span slot="start">${iconSend(14)}</span>
                                    </app-button>
                                  `
                                : ''}
                              ${calc.status === 'sent'
                                ? html`
                                    <app-button
                                      class="success-action"
                                      size="sm"
                                      variant="icon"
                                      title="${t.calculations.approveCalc}"
                                      @click="${() => store.updateCalculationStatus(calc.id, 'approved')}"
                                    >
                                      <span slot="start">${iconCheck(14)}</span>
                                    </app-button>
                                    <app-button
                                      class="danger-action"
                                      size="sm"
                                      variant="icon"
                                      title="${t.calculations.rejectCalc}"
                                      @click="${() => store.updateCalculationStatus(calc.id, 'rejected')}"
                                    >
                                      <span slot="start">${iconX(14)}</span>
                                    </app-button>
                                  `
                                : ''}
                              ${calc.status === 'approved' && ctr
                                ? html`
                                    <app-button
                                      class="success-action"
                                      size="sm"
                                      variant="icon"
                                      title="${t.calculations.createInvoiceFromCalc}"
                                      @click="${() => store.openContractDetail(ctr.id, 'invoice')}"
                                    >
                                      <span slot="start">${iconReceipt(15)}</span>
                                    </app-button>
                                  `
                                : ''}
                              ${ctr
                                ? html`
                                    <app-button
                                      size="sm"
                                      variant="icon"
                                      title="${t.contractDetail.openContract}"
                                      @click="${() => store.openContractDetail(ctr.id)}"
                                    >
                                      <span slot="start">${iconChevronRight(15)}</span>
                                    </app-button>
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
              <app-pagination
                layout-mode="table"
                .totalItems="${pagedCalculations.totalItems}"
                .page="${pagedCalculations.page}"
                .pageSize="${pagedCalculations.pageSize}"
                @page-change="${(e: CustomEvent<{ page: number }>) => {
                  this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
                  this.scrollTop = 0;
                }}"
                @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                  this.currentPage = 1; store.setActivePage(1, false);
                  store.setTablePageSize(e.detail.pageSize);
                }}"
              ></app-pagination>
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
                      <th>${t.viewTexts.payments.thDirection}</th>
                      <th>${t.payments.documentNumber}</th>
                      <th>${t.viewTexts.payments.thCompanyRequisites}</th>
                      <th>${t.viewTexts.payments.thInvoice}</th>
                      <th>${t.viewTexts.payments.thContract}</th>
                      <th>${t.viewTexts.payments.thCounterparty}</th>
                      <th>${t.payments.paymentMethod}</th>
                      <th>${t.payments.notes}</th>
                      <th>${t.viewTexts.expenses.thAmount}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pagedPayments.items.map((pay) => {
                      const inv = pay.invoiceId ? this.invoices.find((i) => i.id === pay.invoiceId) : undefined;
                      const ctr = pay.contractId ? this.contracts.find((c) => c.id === pay.contractId) : undefined;
                      const cp = pay.counterpartyId ? store.counterparties.find((c) => c.id === pay.counterpartyId) : undefined;
                      const comp = store.companies.find((c) => c.id === pay.companyId);
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
                            <div style="display: inline-flex; align-items: center; gap: 0.35rem;">
                              <span style="color: ${isOutgoing ? '#f59e0b' : '#10b981'}; display: inline-flex;">
                                ${isOutgoing ? iconArrowUpRight(14) : iconArrowDownLeft(14)}
                              </span>
                              <span>${pay.documentNumber || '—'}</span>
                            </div>
                          </td>
                          <td>
                            ${comp
                              ? html`
                                  <app-link
                                    class="contract-link-btn"
                                    size="md"
                                    variant="primary"
                                    @click="${() => store.openCompanyDetail(comp.id)}"
                                  >
                                    <span>${comp.name}</span>
                                  </app-link>
                                `
                              : '—'}
                            ${compReq
                              ? html`
                                  <div class="contract-desc mono" style="display: flex; align-items: center; gap: 0.25rem;" title="${compReq}">
                                    ${iconLandmark(11)}
                                    <span>${compReq}</span>
                                  </div>
                                `
                              : ''}
                          </td>
                          <td>
                            ${inv
                              ? html`
                                  <app-link
                                    class="contract-link-btn"
                                    size="md"
                                    variant="primary"
                                    @click="${() => ctr && store.openContractDetail(ctr.id)}"
                                  >
                                    <span>${inv.number}</span>
                                  </app-link>
                                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                                    ${t.invoices.statuses[inv.status]}
                                  </div>
                                `
                              : html`<span style="font-size: 0.75rem; color: var(--text-muted);">${t.viewTexts.payments.standalonePayment}</span>`}
                          </td>
                          <td>
                            ${ctr
                              ? html`
                                  <app-link
                                    class="contract-link-btn"
                                    size="md"
                                    variant="primary"
                                    @click="${() => store.openContractDetail(ctr.id)}"
                                  >
                                    <span>${ctr.number}</span>
                                  </app-link>
                                  <div class="contract-desc" title="${ctr.title}">${ctr.title}</div>
                                `
                              : '—'}
                          </td>
                          <td>
                            <div>${cp?.name || '—'}</div>
                            ${cpReq
                              ? html`<div class="contract-desc mono" title="${cpReq}">${cpReq}</div>`
                              : ''}
                          </td>
                          <td>
                            <app-badge variant="default" appearance="soft" size="sm">
                              ${t.payments.methods[pay.method]}
                            </app-badge>
                          </td>
                          <td style="color: var(--text-secondary); max-width: 240px;">
                            ${pay.notes || '—'}
                          </td>
                          <td class="amount-cell" style="color: ${isOutgoing ? '#f59e0b' : 'var(--color-success, #10b981)'};">
                            ${isOutgoing ? '−' : '+'}${formatMoney(pay.amount, pay.currency)}
                          </td>
                          <td>
                            <div class="actions-row">
                              ${ctr
                                ? html`
                                    <app-button
                                      size="sm"
                                      variant="icon"
                                      title="${t.contractDetail.openContract}"
                                      @click="${() => store.openContractDetail(ctr.id)}"
                                    >
                                      <span slot="start">${iconChevronRight(15)}</span>
                                    </app-button>
                                  `
                                : ''}
                              <app-button
                                class="danger-action"
                                size="sm"
                                variant="icon"
                                title="${t.common.delete}"
                                @click="${() => (this.deletingPayment = pay)}"
                              >
                                <span slot="start">${iconTrash(14)}</span>
                              </app-button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
              <app-pagination
                layout-mode="table"
                .totalItems="${pagedPayments.totalItems}"
                .page="${pagedPayments.page}"
                .pageSize="${pagedPayments.pageSize}"
                @page-change="${(e: CustomEvent<{ page: number }>) => {
                  this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
                  this.scrollTop = 0;
                }}"
                @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                  this.currentPage = 1; store.setActivePage(1, false);
                  store.setTablePageSize(e.detail.pageSize);
                }}"
              ></app-pagination>
            `
        : filteredInvoices.length === 0
        ? html`<app-empty-state compact title="${t.viewTexts.contracts.emptyNoInvoices}"></app-empty-state>`
        : html`
            <div class="table-card">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${t.viewTexts.payments.thInvoice}</th>
                    <th>${t.viewTexts.payments.thContract}</th>
                    <th>${t.viewTexts.payments.thCounterparty}</th>
                    <th>${t.viewTexts.contracts.thDatesControlShort}</th>
                    <th>${t.viewTexts.contracts.thPaymentProgress}</th>
                    <th>${t.viewTexts.counterpartyDetail.thTotalVat}</th>
                    <th>${t.viewTexts.counterparties.thStatus}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${pagedInvoices.items.map((inv) => {
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
                            ${inv.items.length} ${t.viewTexts.calculations.itemsSuffix} · ${inv.vatRate > 0 ? `${t.viewTexts.contracts.vatLabel} ${inv.vatRate}%` : t.viewTexts.contracts.noVatLabel}
                          </div>
                        </td>
                        <td>
                          ${ctr
                            ? html`
                                <app-link
                                  class="contract-link-btn"
                                  size="md"
                                  variant="primary"
                                  @click="${() => store.openContractDetail(ctr.id)}"
                                >
                                  <span>${ctr.number}</span>
                                </app-link>
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
                                    <span>${t.viewTexts.payments.dueLabel}:</span>
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
                                  <app-button
                                    class="accent-action"
                                    size="sm"
                                    variant="icon"
                                    title="${t.invoices.markIssued}"
                                    @click="${() => store.updateInvoiceStatus(inv.id, 'issued')}"
                                  >
                                    <span slot="start">${iconFileText(14)}</span>
                                  </app-button>
                                `
                              : ''}
                            ${inv.status === 'issued'
                              ? html`
                                  <app-button
                                    class="accent-action"
                                    size="sm"
                                    variant="icon"
                                    title="${t.invoices.markSent}"
                                    @click="${() => store.updateInvoiceStatus(inv.id, 'sent')}"
                                  >
                                    <span slot="start">${iconSend(14)}</span>
                                  </app-button>
                                `
                              : ''}
                            ${canPay
                              ? html`
                                  <app-button
                                    class="success-action"
                                    size="sm"
                                    variant="icon"
                                    title="${t.payments.recordPayment}"
                                    @click="${() => this.openPaymentModal(inv)}"
                                  >
                                    <span slot="start">${iconCreditCard(14)}</span>
                                  </app-button>
                                  <app-button
                                    class="success-action"
                                    size="sm"
                                    variant="icon"
                                    title="${t.invoices.markPaid}"
                                    @click="${() => store.updateInvoiceStatus(inv.id, 'paid')}"
                                  >
                                    <span slot="start">${iconCheck(14)}</span>
                                  </app-button>
                                `
                              : ''}
                            ${ctr
                              ? html`
                                  <app-button
                                    size="sm"
                                    variant="icon"
                                    title="${t.contractDetail.openContract}"
                                    @click="${() => store.openContractDetail(ctr.id)}"
                                  >
                                    <span slot="start">${iconChevronRight(15)}</span>
                                  </app-button>
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
            <app-pagination
              layout-mode="table"
              .totalItems="${pagedInvoices.totalItems}"
              .page="${pagedInvoices.page}"
              .pageSize="${pagedInvoices.pageSize}"
              @page-change="${(e: CustomEvent<{ page: number }>) => {
                this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
                this.scrollTop = 0;
              }}"
              @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                this.currentPage = 1; store.setActivePage(1, false);
                store.setTablePageSize(e.detail.pageSize);
              }}"
            ></app-pagination>
          `}

      <app-contract-form
        .open="${this.modalOpen}"
        .contract="${this.editingContract}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-contract-form>

      <app-confirm-dialog
        .open="${Boolean(this.deletingContract)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.contractDelete.title}"
        action="${t.viewTexts.confirmDialogs.contractDelete.action(this.deletingContract?.number || '')}"
        result="${t.viewTexts.confirmDialogs.contractDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingContract = null)}"
        @confirm="${() => {
          if (this.deletingContract) {
            store.deleteContract(this.deletingContract.id);
            this.deletingContract = null;
          }
        }}"
      ></app-confirm-dialog>

      ${this.renderPaymentModal(t, payableInvoices)}
      ${this.renderDeletePaymentModal(t)}
    `;
  }

  private renderPaymentModal(t: ReturnType<typeof getTranslation>, payableInvoices: Invoice[]) {
    const inv =
      this.invoices.find((i) => i.id === this.paymentInvoiceId) || payableInvoices[0] || null;
    if (!this.paymentModalOpen || !inv) return '';

    return html`
      <app-payment-form
        .open="${this.paymentModalOpen}"
        .invoice="${inv}"
        .payableInvoices="${payableInvoices}"
        @close="${() => (this.paymentModalOpen = false)}"
        @saved="${() => (this.paymentModalOpen = false)}"
      ></app-payment-form>
    `;
  }

  private renderDeletePaymentModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingPayment)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.paymentDelete.title}"
        action="${t.viewTexts.confirmDialogs.paymentDelete.action}"
        result="${t.viewTexts.confirmDialogs.paymentDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
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
    this.paymentInvoiceId = inv.id;
    this.paymentModalOpen = true;
  }

  private openCreateModal() {
    this.editingContract = null;
    this.modalOpen = true;
  }

  private openEditModal(ctr: Contract) {
    this.editingContract = ctr;
    this.modalOpen = true;
  }
}