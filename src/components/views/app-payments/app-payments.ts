import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  BankCurrency,
  Contract,
  Invoice,
  InvoicePayment,
  PaymentDirection,
  PaymentMethod,
} from '../../../types';
import {
  iconAlertTriangle,
  iconArrowDownLeft,
  iconArrowUpRight,
  iconCheck,
  iconChevronRight,
  iconClock,
  iconCreditCard,
  iconEye,
  iconFilter,
  iconLandmark,
  iconReceipt,
  iconTrash,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-link/app-link';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-payment-form/app-payment-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import styles from './app-payments.css';
import { eventValue } from '../../common/event-value';

const RUB_RATES: Record<BankCurrency, number> = {
  RUB: 1,
  USD: 96,
  EUR: 104,
  CNY: 13.4,
  GBP: 122,
  KZT: 0.2,
  AED: 26.2,
};

@customElement('app-payments')
export class AppPayments extends LitElement {
  @state() private payments: InvoicePayment[] = store.payments;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private contracts: Contract[] = store.contracts;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;

  @state() private viewTab: 'due_control' | 'ledger' = 'due_control';
  @state() private filterVisible: boolean = true;
  @state() private localSearch = '';
  @state() private dueFilter:
    | 'all'
    | 'unpaid'
    | 'overdue'
    | 'due_soon'
    | 'partially_paid'
    | 'paid' = 'all';
  @state() private directionFilter: 'all' | PaymentDirection = 'all';
  @state() private companyFilter = 'all';
  @state() private methodFilter: 'all' | PaymentMethod = 'all';
  @state() private counterpartyFilter = 'all';
  @state() private contractFilter = 'all';
  @state() private currentPage = 1;
  @state() private tablePageSize = store.customization.tablePageSize;

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
    this.currentPage = store.activeView === 'payments' ? store.activePage : 1;
    this.payments = store.payments;
    this.invoices = store.invoices;
    this.contracts = store.contracts;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.tablePageSize = store.customization.tablePageSize;
  }

  private toRub(amount: number, currency: BankCurrency): number {
    return amount * (RUB_RATES[currency] || 1);
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

  private getFilteredDueInvoices(): Invoice[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    const urgencyRank = (inv: Invoice): number => {
      const ctrl = store.getInvoiceDueControl(inv);
      if (ctrl.state === 'overdue') return 0;
      if (ctrl.state === 'due_soon') return 1;
      if (inv.status === 'partially_paid') return 2;
      if (ctrl.state === 'on_track') return 3;
      if (ctrl.state === 'paid') return 4;
      return 5;
    };

    return this.invoices
      .filter((inv) => inv.status !== 'draft' && inv.status !== 'cancelled')
      .filter((inv) => {
        if (this.companyFilter !== 'all' && inv.companyId !== this.companyFilter) return false;
        if (this.contractFilter !== 'all' && inv.contractId !== this.contractFilter) return false;
        if (this.counterpartyFilter !== 'all' && inv.counterpartyId !== this.counterpartyFilter)
          return false;

        const ctrl = store.getInvoiceDueControl(inv);
        const remaining = store.getInvoiceRemainingAmount(inv);
        if (this.dueFilter === 'unpaid' && remaining <= 0) return false;
        if (this.dueFilter === 'overdue' && ctrl.state !== 'overdue') return false;
        if (this.dueFilter === 'due_soon' && ctrl.state !== 'due_soon') return false;
        if (this.dueFilter === 'partially_paid' && inv.status !== 'partially_paid') return false;
        if (this.dueFilter === 'paid' && inv.status !== 'paid') return false;

        if (!query) return true;
        const ctr = this.contracts.find((c) => c.id === inv.contractId);
        const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);
        const comp = store.companies.find((c) => c.id === inv.companyId);
        return (
          inv.number.toLowerCase().includes(query) ||
          inv.notes.toLowerCase().includes(query) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
          (comp?.name.toLowerCase().includes(query) ?? false) ||
          (cp?.name.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => {
        const diff = urgencyRank(a) - urgencyRank(b);
        if (diff !== 0) return diff;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }

  private getFilteredLedgerPayments(): InvoicePayment[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return [...this.payments]
      .sort((a, b) => (b.paymentDate + b.createdAt).localeCompare(a.paymentDate + a.createdAt))
      .filter((pay) => {
        if (this.directionFilter !== 'all' && pay.direction !== this.directionFilter) return false;
        if (this.companyFilter !== 'all' && pay.companyId !== this.companyFilter) return false;
        if (this.methodFilter !== 'all' && pay.method !== this.methodFilter) return false;
        if (this.contractFilter !== 'all' && pay.contractId !== this.contractFilter) return false;
        if (this.counterpartyFilter !== 'all' && pay.counterpartyId !== this.counterpartyFilter)
          return false;
        if (!query) return true;

        const inv = this.invoices.find((i) => i.id === pay.invoiceId);
        const ctr = this.contracts.find((c) => c.id === pay.contractId);
        const cp = store.counterparties.find((c) => c.id === pay.counterpartyId);
        const comp = store.companies.find((c) => c.id === pay.companyId);
        const compReq = store.getPaymentCompanyRequisitesLabel(pay).toLowerCase();
        const cpReq = store.getPaymentCounterpartyRequisitesLabel(pay).toLowerCase();
        const compAccNum = store.getPaymentCompanyAccount(pay)?.accountNumber.toLowerCase() || '';
        const cpAccNum = store.getPaymentCounterpartyAccount(pay)?.accountNumber.toLowerCase() || '';
        return (
          pay.documentNumber.toLowerCase().includes(query) ||
          pay.notes.toLowerCase().includes(query) ||
          (inv?.number.toLowerCase().includes(query) ?? false) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
          (comp?.name.toLowerCase().includes(query) ?? false) ||
          (cp?.name.toLowerCase().includes(query) ?? false) ||
          compReq.includes(query) ||
          cpReq.includes(query) ||
          compAccNum.includes(query) ||
          cpAccNum.includes(query)
        );
      });
  }

  render() {
    const t = getTranslation(this.currentLang);

    const activeInvoices = this.invoices.filter(
      (i) => i.status !== 'draft' && i.status !== 'cancelled'
    );
    const incomingPayments = this.payments.filter((p) => p.direction === 'incoming');
    const outgoingPayments = this.payments.filter((p) => p.direction === 'outgoing');
    const incomingRub = incomingPayments.reduce(
      (s, p) => s + this.toRub(p.amount, p.currency),
      0
    );
    const outgoingRub = outgoingPayments.reduce(
      (s, p) => s + this.toRub(p.amount, p.currency),
      0
    );
    const totalRemainingRub = activeInvoices.reduce(
      (s, i) => s + this.toRub(store.getInvoiceRemainingAmount(i), i.currency),
      0
    );
    const overdueInvoices = activeInvoices.filter(
      (i) => store.getInvoiceDueControl(i).state === 'overdue'
    );
    const overdueRub = overdueInvoices.reduce(
      (s, i) => s + this.toRub(store.getInvoiceRemainingAmount(i), i.currency),
      0
    );

    const payableInvoices = activeInvoices.filter((i) => store.getInvoiceRemainingAmount(i) > 0);
    const filteredDueInvoices = this.getFilteredDueInvoices();
    const filteredLedger = this.getFilteredLedgerPayments();

    const tabOptions = [
      {
        value: 'due_control',
        label: `${t.payments.dueControl} (${activeInvoices.length})`,
      },
      {
        value: 'ledger',
        label: `${t.payments.historyTitle} (${this.payments.length})`,
      },
    ];

    const dueFilterOptions = [
      { value: 'all', label: t.viewTexts.payments.filterAllInvoices },
      { value: 'unpaid', label: t.viewTexts.payments.filterUnpaid },
      { value: 'overdue', label: t.invoices.statuses.overdue, color: '#ef4444' },
      { value: 'due_soon', label: t.viewTexts.payments.filterDueSoon, color: '#f59e0b' },
      { value: 'partially_paid', label: t.invoices.statuses.partially_paid, color: '#f59e0b' },
      { value: 'paid', label: t.invoices.statuses.paid, color: '#10b981' },
    ];

    const directionFilterOptions = [
      { value: 'all', label: t.viewTexts.payments.filterAllDirections },
      { value: 'incoming', label: t.viewTexts.payments.filterIncomingOnly, color: '#10b981' },
      { value: 'outgoing', label: t.viewTexts.payments.filterOutgoingOnly, color: '#f59e0b' },
    ];

    const companyOptions = [
      { value: 'all', label: t.viewTexts.payments.filterAllCompanies },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    const methodFilterOptions = [
      { value: 'all', label: t.viewTexts.payments.filterAllMethods },
      { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
      { value: 'card', label: t.payments.methods.card },
      { value: 'cash', label: t.payments.methods.cash },
      { value: 'offset', label: t.payments.methods.offset },
    ];

    const counterpartyOptions = [
      { value: 'all', label: t.viewTexts.payments.filterAllCounterparties },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];

    const contractOptions = [
      { value: 'all', label: t.viewTexts.payments.filterAllContracts },
      ...this.contracts.map((c) => ({ value: c.id, label: `${c.number} · ${c.title}` })),
    ];

    return html`
      <app-page-header
        title="${t.navigation.payments}"
        subtitle="${t.viewTexts.pageSubtitles.payments}"
      >
        <span slot="icon">${iconCreditCard(28)}</span>
        <app-button
          slot="actions"
          variant="primary"
          size="md"
          @click="${() =>
            this.openPaymentModal(
              this.viewTab === 'due_control' ? payableInvoices[0] || null : null
            )}"
        >
          <span slot="icon-start">${iconCreditCard(16)}</span>
          <span>${t.payments.recordPayment}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${t.viewTexts.payments.kpiIncomingTotal}"
          value="${formatMoney(incomingRub, 'RUB')}"
          valueColor="#10b981"
          subtitle="${incomingPayments.length} ${t.viewTexts.payments.kpiIncomingHint}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.payments.kpiOutgoingTotal}"
          value="${formatMoney(outgoingRub, 'RUB')}"
          valueColor="#f59e0b"
          subtitle="${outgoingPayments.length} ${t.viewTexts.payments.kpiOutgoingHint}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.payments.remainingDue} (RUB)"
          value="${formatMoney(totalRemainingRub, 'RUB')}"
          valueColor="var(--accent-primary, #6366f1)"
          subtitle="${payableInvoices.length} ${t.viewTexts.payments.kpiOpenInvoices}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.payments.overdueAlert}"
          value="${formatMoney(overdueRub, 'RUB')}"
          valueColor="${overdueRub > 0 ? '#ef4444' : ''}"
          subtitle="${overdueInvoices.length} ${t.viewTexts.payments.kpiOverdueInvoices}"
        ></app-metric-card>
      </app-kpi-strip>

      <!-- Canonical skeleton order: page header, KPI strip, display-mode switcher with the filter
           toggle, filter bar, data representation -->
      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.viewTab}"
          .options="${tabOptions}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.viewTab = eventValue(e) as 'due_control' | 'ledger';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>

        <app-toggle-button
          size="sm"
          .pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) => (this.filterVisible = e.detail.pressed)}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filterToggle}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`<app-filter-bar
            variant="bare"
            style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 190px;"
            placeholder="${this.viewTab === 'due_control' ? t.viewTexts.payments.searchDueControl : t.viewTexts.payments.searchLedger}"
            .searchValue="${this.localSearch}"
            .filters="${this.viewTab === 'due_control'
              ? [
                  { key: 'due', options: dueFilterOptions },
                  { key: 'company', options: companyOptions },
                  { key: 'counterparty', options: counterpartyOptions },
                  { key: 'contract', options: contractOptions },
                ]
              : [
                  { key: 'direction', options: directionFilterOptions },
                  { key: 'company', options: companyOptions },
                  { key: 'method', options: methodFilterOptions },
                  { key: 'counterparty', options: counterpartyOptions },
                ]}"
            .values="${this.viewTab === 'due_control'
              ? {
                  due: this.dueFilter,
                  company: this.companyFilter,
                  counterparty: this.counterpartyFilter,
                  contract: this.contractFilter,
                }
              : {
                  direction: this.directionFilter,
                  company: this.companyFilter,
                  method: this.methodFilter,
                  counterparty: this.counterpartyFilter,
                }}"
            @search-change="${(e: CustomEvent<{ value: string }>) => {
              this.localSearch = eventValue(e);
              this.currentPage = 1; store.setActivePage(1, false);
            }}"
            @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
              if (e.detail.key === 'due') {
                this.dueFilter = eventValue(e) as typeof this.dueFilter;
              }
              if (e.detail.key === 'direction') {
                this.directionFilter = eventValue(e) as 'all' | PaymentDirection;
              }
              if (e.detail.key === 'company') {
                this.companyFilter = eventValue(e);
              }
              if (e.detail.key === 'method') {
                this.methodFilter = eventValue(e) as 'all' | PaymentMethod;
              }
              if (e.detail.key === 'counterparty') this.counterpartyFilter = eventValue(e);
              if (e.detail.key === 'contract') this.contractFilter = eventValue(e);
              this.currentPage = 1; store.setActivePage(1, false);
            }}"
          ></app-filter-bar>`
        : ''}

      ${this.viewTab === 'due_control'
        ? this.renderDueControlTable(filteredDueInvoices, t)
        : this.renderLedgerTable(filteredLedger, t)}

      ${this.renderPaymentModal(payableInvoices)}
      ${this.renderDeletePaymentModal(t)}
    `;
  }

  private renderDueControlTable(
    invoices: Invoice[],
    t: ReturnType<typeof getTranslation>
  ) {
    if (invoices.length === 0) {
      return html`
        <app-empty-state compact title="${t.viewTexts.payments.emptyNoInvoices}"></app-empty-state>
      `;
    }

    // Due control reference rich cells (rendered inside the app-data-table shadow tree)
    const dueInvNumberCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const comp = store.companies.find((c) => c.id === inv.companyId);
      return html`
        <app-link
          class="link-btn"
          size="md"
          variant="primary"
          @click="${() => {
            const ctr = this.contracts.find((c) => c.id === inv.contractId);
            if (ctr) store.openContractDetail(ctr.id);
          }}"
        >
          <span slot="start">${iconReceipt(15)}</span>
          <span>${inv.number}</span>
        </app-link>
        <div class="pay-cell-sub">
          ${comp ? `${comp.name} · ` : ''}${store.getInvoicePayments(inv.id).length} ${t.viewTexts.payments.paymentsCountSuffix}
        </div>
      `;
    };
    const dueContractCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const ctr = this.contracts.find((c) => c.id === inv.contractId);
      return html`
        ${ctr
          ? html`
              <app-link
                class="link-btn"
                size="md"
                variant="primary"
                @click="${() => store.openContractDetail(ctr.id)}"
              >
                <span>${ctr.number}</span>
              </app-link>
              <div class="pay-contract-desc" title="${ctr.title}">${ctr.title}</div>
            `
          : '—'}
      `;
    };
    const dueCpCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);
      return html`
        ${cp
          ? html`
              <app-link
                class="text-link-btn"
                size="md"
                variant="primary"
                @click="${() => store.openCounterpartyDetail(cp.id)}"
              >
                ${cp.name}
              </app-link>
            `
          : '—'}
      `;
    };
    const dueDatesCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      return html`
        <div class="mono" style="white-space: nowrap;">
          ${inv.issueDate} → ${inv.dueDate}
        </div>
        <div>${this.renderDueControlTag(inv, t)}</div>
      `;
    };
    const duePayCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const invPaid = store.getInvoicePaidAmount(inv.id);
      const invRemaining = store.getInvoiceRemainingAmount(inv);
      const payPct =
        inv.totalAmount > 0 ? Math.min(100, Math.round((invPaid / inv.totalAmount) * 100)) : 0;
      const dueCtrl = store.getInvoiceDueControl(inv);
      return html`
        <div class="pay-inv-pay-cell">
          <div class="inv-pay-meta mono">
            <span style="color: ${invPaid > 0 ? '#10b981' : 'var(--text-muted)'}; font-weight: 600;">
              ${formatMoney(invPaid, inv.currency)}
            </span>
            <span>${payPct}%</span>
          </div>
          <div class="inv-pay-bar">
            <div
              class="inv-pay-fill ${dueCtrl.state === 'overdue'
                ? 'overdue'
                : payPct > 0 && payPct < 100
                ? 'partial'
                : ''}"
              style="width: ${payPct}%;"
            ></div>
          </div>
          ${invRemaining > 0
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
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .rows="${invoices}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1; store.setActivePage(1, false);
            store.setTablePageSize(e.detail.pageSize);
          }}"
        >
          <app-table-column field="number" label="${t.viewTexts.payments.thInvoice}" .cellRender="${dueInvNumberCell}"></app-table-column>
          <app-table-column field="contractId" label="${t.viewTexts.payments.thContract}" .cellRender="${dueContractCell}"></app-table-column>
          <app-table-column field="counterpartyId" label="${t.viewTexts.payments.thCounterparty}" .cellRender="${dueCpCell}"></app-table-column>
          <app-table-column field="issueDate" label="${t.viewTexts.payments.thDatesControl}" .cellRender="${dueDatesCell}"></app-table-column>
          <app-table-column field="totalAmount" label="${t.viewTexts.payments.thPaidBalance}" .cellRender="${duePayCell}"></app-table-column>
          <app-table-column field="totalAmount" label="${t.viewTexts.payments.thInvoiceTotal}" .cellRender="${(row: Record<string, unknown>) => html`
            <div class="amount-cell">${formatMoney((row as unknown as Invoice).totalAmount, (row as unknown as Invoice).currency)}</div>
          `}"></app-table-column>
          <app-table-column
            field="status"
            label="${t.viewTexts.payments.thStatus}"
            .cellRender="${(row: Record<string, unknown>) => html`
              <app-status-chip
                domain="invoice"
                status="${(row as unknown as Invoice).status}"
                appearance="soft"
                size="sm"
              ></app-status-chip>
            `}"
          ></app-table-column>
          <app-table-column field="" label="" .cellRender="${(row: Record<string, unknown>) => {
            const inv = row as unknown as Invoice;
            const ctr = this.contracts.find((c) => c.id === inv.contractId);
            const canPay = store.getInvoiceRemainingAmount(inv) > 0;
            return html`
              <div class="ctr-actions-row">
                ${canPay
                  ? html`
                      <app-button
                        action="accept"
                        size="sm"
                        variant="icon"
                        title="${t.payments.recordPayment}"
                        @click="${() => this.openPaymentModal(inv)}"
                      >
                        <span slot="start">${iconCreditCard(14)}</span>
                      </app-button>
                      <app-button
                        action="accept"
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
            `;
          }}"></app-table-column>
        </app-data-table>
      </div>
    `;
  }

  private renderLedgerTable(
    payments: InvoicePayment[],
    t: ReturnType<typeof getTranslation>
  ) {
    if (payments.length === 0) {
      return html`<app-empty-state compact title="${t.payments.noPayments}"></app-empty-state>`;
    }

    // Payment ledger reference rich cells (rendered inside the app-data-table shadow tree)
    const payDocCell = (row: Record<string, unknown>) => {
      const pay = row as unknown as InvoicePayment;
      const isOutgoing = pay.direction === 'outgoing';
      return html`
        <div style="font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem;">
          <span style="color: ${isOutgoing ? '#f59e0b' : '#10b981'}; display: inline-flex;">
            ${isOutgoing ? iconArrowUpRight(14) : iconArrowDownLeft(14)}
          </span>
          <app-link
            class="link-btn"
            size="md"
            variant="primary"
            title="${t.viewTexts.payments.openDetailsTitle}"
            @click="${() => store.openPaymentDetail(pay.id)}"
          >
            <span class="mono">${pay.documentNumber || pay.id}</span>
          </app-link>
        </div>
      `;
    };
    const payCompanyCell = (row: Record<string, unknown>) => {
      const pay = row as unknown as InvoicePayment;
      const comp = store.companies.find((c) => c.id === pay.companyId);
      const compReqLabel = store.getPaymentCompanyRequisitesLabel(pay);
      return html`
        ${comp
          ? html`
              <app-link
                class="text-link-btn"
                size="md"
                variant="primary"
                @click="${() => store.openCompanyDetail(comp.id)}"
              >
                ${comp.name}
              </app-link>
            `
          : '—'}
        ${compReqLabel
          ? html`
              <div class="req-sub" title="${compReqLabel}">
                ${iconLandmark(11)}
                <span>${compReqLabel}</span>
              </div>
            `
          : html`<div class="pay-cell-sub">${t.viewTexts.payments.noBankAccountOption}</div>`}
      `;
    };
    const payCpCell = (row: Record<string, unknown>) => {
      const pay = row as unknown as InvoicePayment;
      const cp = pay.counterpartyId
        ? store.counterparties.find((c) => c.id === pay.counterpartyId)
        : undefined;
      const cpReqLabel = store.getPaymentCounterpartyRequisitesLabel(pay);
      return html`
        ${cp
          ? html`
              <app-link
                class="text-link-btn"
                size="md"
                variant="primary"
                @click="${() => store.openCounterpartyDetail(cp.id)}"
              >
                ${cp.name}
              </app-link>
            `
          : '—'}
        ${cpReqLabel
          ? html`
              <div class="req-sub" title="${cpReqLabel}">
                ${iconLandmark(11)}
                <span>${cpReqLabel}</span>
              </div>
            `
          : ''}
      `;
    };
    const payInvoiceCell = (row: Record<string, unknown>) => {
      const pay = row as unknown as InvoicePayment;
      const inv = pay.invoiceId ? this.invoices.find((i) => i.id === pay.invoiceId) : undefined;
      const ctr = pay.contractId ? this.contracts.find((c) => c.id === pay.contractId) : undefined;
      return html`
        ${inv
          ? html`
              <app-link
                class="link-btn"
                size="md"
                variant="primary"
                @click="${() => ctr && store.openContractDetail(ctr.id)}"
              >
                <span>${inv.number}</span>
              </app-link>
              ${ctr
                ? html`<div class="pay-contract-desc" title="${ctr.title}">${ctr.number}</div>`
                : ''}
            `
          : ctr
          ? html`
              <app-link
                class="link-btn"
                size="md"
                variant="primary"
                @click="${() => store.openContractDetail(ctr.id)}"
              >
                <span>${ctr.number}</span>
              </app-link>
              <div class="pay-cell-sub">${t.viewTexts.payments.standalonePayment}</div>
            `
          : html`<span class="pay-cell-sub">${t.viewTexts.payments.standalonePayment}</span>`}
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .rows="${payments}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1; store.setActivePage(1, false);
            store.setTablePageSize(e.detail.pageSize);
          }}"
        >
          <app-table-column field="paymentDate" label="${t.payments.paymentDate}" mono .cellRender="${(row: Record<string, unknown>) => html`
            <div style="white-space: nowrap;">${(row as unknown as InvoicePayment).paymentDate}</div>
          `}"></app-table-column>
          <app-table-column field="direction" label="${t.viewTexts.payments.thDirection}" .cellRender="${(row: Record<string, unknown>) => html`
            <app-status-chip
              domain="paymentDirection"
              status="${(row as unknown as InvoicePayment).direction}"
              appearance="soft"
              size="sm"
            ></app-status-chip>
          `}"></app-table-column>
          <app-table-column field="documentNumber" label="${t.payments.documentNumber}" mono .cellRender="${payDocCell}"></app-table-column>
          <app-table-column field="companyId" label="${t.viewTexts.payments.thCompanyRequisites}" .cellRender="${payCompanyCell}"></app-table-column>
          <app-table-column field="counterpartyId" label="${t.viewTexts.payments.thCounterparty}" .cellRender="${payCpCell}"></app-table-column>
          <app-table-column field="invoiceId" label="${t.viewTexts.payments.thInvoice}" .cellRender="${payInvoiceCell}"></app-table-column>
          <app-table-column field="method" label="${t.payments.paymentMethod}" .cellRender="${(row: Record<string, unknown>) => html`
            <app-badge variant="default" appearance="soft" size="sm">
              ${t.payments.methods[(row as unknown as InvoicePayment).method]}
            </app-badge>
          `}"></app-table-column>
          <app-table-column field="notes" label="${t.payments.notes}" .cellRender="${(row: Record<string, unknown>) => html`
            <div style="color: var(--text-secondary); max-width: 240px;">${(row as unknown as InvoicePayment).notes || '—'}</div>
          `}"></app-table-column>
          <app-table-column field="amount" label="${t.viewTexts.payments.thAmount}" .cellRender="${(row: Record<string, unknown>) => {
            const pay = row as unknown as InvoicePayment;
            const isOutgoing = pay.direction === 'outgoing';
            return html`
              <div class="amount-cell ${isOutgoing ? 'outgoing' : 'incoming'}">
                ${isOutgoing ? '−' : '+'}${formatMoney(pay.amount, pay.currency)}
              </div>
            `;
          }}"></app-table-column>
          <app-table-column field="" label="" .cellRender="${(row: Record<string, unknown>) => {
            const pay = row as unknown as InvoicePayment;
            const ctr = pay.contractId ? this.contracts.find((c) => c.id === pay.contractId) : undefined;
            return html`
              <div class="ctr-actions-row">
                <app-button
                  size="sm"
                  variant="icon"
                  title="${t.viewTexts.payments.openDetailsTitle}"
                  @click="${() => store.openPaymentDetail(pay.id)}"
                >
                  <span slot="start">${iconEye(14)}</span>
                </app-button>
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
                  action="delete"
                  size="sm"
                  variant="icon"
                  title="${t.common.delete}"
                  @click="${() => (this.deletingPayment = pay)}"
                >
                  <span slot="start">${iconTrash(14)}</span>
                </app-button>
              </div>
            `;
          }}"></app-table-column>
        </app-data-table>
      </div>
    `;
  }

  private renderPaymentModal(payableInvoices: Invoice[]) {
    if (!this.paymentModalOpen) return '';
    const inv = this.paymentInvoiceId
      ? this.invoices.find((i) => i.id === this.paymentInvoiceId) || null
      : null;

    const modalInvoices = inv && !payableInvoices.some((i) => i.id === inv.id)
      ? [inv, ...payableInvoices]
      : payableInvoices;

    return html`
      <app-payment-form
        .open="${this.paymentModalOpen}"
        .invoice="${inv}"
        .payableInvoices="${modalInvoices}"
        .defaultDirection="${this.directionFilter === 'outgoing' ? 'outgoing' : 'incoming'}"
        .defaultCompanyId="${this.companyFilter !== 'all' ? this.companyFilter : ''}"
        .defaultCounterpartyId="${this.counterpartyFilter !== 'all' ? this.counterpartyFilter : ''}"
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

  private openPaymentModal(inv: Invoice | null) {
    this.paymentInvoiceId = inv?.id || '';
    this.paymentModalOpen = true;
  }
}
