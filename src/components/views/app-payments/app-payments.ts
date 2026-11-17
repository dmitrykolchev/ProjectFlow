import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  Contract,
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
  iconReceipt,
  iconTrash,
  iconWallet,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';

import '../../common/app-payment-form/app-payment-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-pagination/app-pagination';
import { paginateItems } from '../../common/paginate';
import styles from './app-payments.css';
import { eventValue } from '../../common/event-value';

@customElement('app-payments')
export class AppPayments extends LitElement {
  @state() private payments: InvoicePayment[] = store.payments;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private contracts: Contract[] = store.contracts;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;

  @state() private viewTab: 'due_control' | 'ledger' = 'due_control';
  @state() private localSearch = '';
  @state() private dueFilter:
    | 'all'
    | 'unpaid'
    | 'overdue'
    | 'due_soon'
    | 'partially_paid'
    | 'paid' = 'all';
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


  private toRub(amount: number, currency: 'RUB' | 'USD' | 'EUR'): number {
    if (currency === 'USD') return amount * 96;
    if (currency === 'EUR') return amount * 104;
    return amount;
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
        return (
          inv.number.toLowerCase().includes(query) ||
          inv.notes.toLowerCase().includes(query) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
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
        if (this.methodFilter !== 'all' && pay.method !== this.methodFilter) return false;
        if (this.contractFilter !== 'all' && pay.contractId !== this.contractFilter) return false;
        if (this.counterpartyFilter !== 'all' && pay.counterpartyId !== this.counterpartyFilter)
          return false;
        if (!query) return true;

        const inv = this.invoices.find((i) => i.id === pay.invoiceId);
        const ctr = this.contracts.find((c) => c.id === pay.contractId);
        const cp = store.counterparties.find((c) => c.id === pay.counterpartyId);
        return (
          pay.documentNumber.toLowerCase().includes(query) ||
          pay.notes.toLowerCase().includes(query) ||
          (inv?.number.toLowerCase().includes(query) ?? false) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
          (cp?.name.toLowerCase().includes(query) ?? false)
        );
      });
  }

  render() {
    const t = getTranslation(this.currentLang);

    const activeInvoices = this.invoices.filter(
      (i) => i.status !== 'draft' && i.status !== 'cancelled'
    );
    const totalPaidRub = activeInvoices.reduce(
      (s, i) => s + this.toRub(store.getInvoicePaidAmount(i.id), i.currency),
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
    const dueSoonInvoices = activeInvoices.filter(
      (i) => store.getInvoiceDueControl(i).state === 'due_soon'
    );
    const dueSoonRub = dueSoonInvoices.reduce(
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
        ${payableInvoices.length > 0
          ? html`
              <app-button
                slot="actions"
                variant="primary"
                size="md"
                @click="${() => this.openPaymentModal(payableInvoices[0])}"
              >
                <span slot="icon-start">${iconCreditCard(16)}</span>
                <span>${t.payments.recordPayment}</span>
              </app-button>
            `
          : ''}
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.payments.paidAmount} (RUB)" value="${formatMoney(totalPaidRub, 'RUB')}" valueColor="#10b981" subtitle="${this.payments.length} ${t.viewTexts.payments.kpiRecordedPayments}"></app-metric-card>
        <app-metric-card size="compact" label="${t.payments.remainingDue} (RUB)" value="${formatMoney(totalRemainingRub, 'RUB')}" valueColor="var(--accent-primary, #6366f1)" subtitle="${payableInvoices.length} ${t.viewTexts.payments.kpiOpenInvoices}"></app-metric-card>
        <app-metric-card size="compact" label="${t.payments.overdueAlert}" value="${formatMoney(overdueRub, 'RUB')}" valueColor="${overdueRub > 0 ? '#ef4444' : ''}" subtitle="${overdueInvoices.length} ${t.viewTexts.payments.kpiOverdueInvoices}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.payments.kpiDueWithin5}" value="${formatMoney(dueSoonRub, 'RUB')}" valueColor="${dueSoonRub > 0 ? '#f59e0b' : ''}" subtitle="${dueSoonInvoices.length} ${t.viewTexts.payments.kpiDueSoonInvoices}"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        variant="bare"
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 210px;"
        placeholder="${this.viewTab === 'due_control' ? t.viewTexts.payments.searchDueControl : t.viewTexts.payments.searchLedger}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'first', options: this.viewTab === 'due_control' ? dueFilterOptions : methodFilterOptions },
          { key: 'counterparty', options: counterpartyOptions },
          { key: 'contract', options: contractOptions },
        ]}"
        .values="${{
          first: this.viewTab === 'due_control' ? this.dueFilter : this.methodFilter,
          counterparty: this.counterpartyFilter,
          contract: this.contractFilter,
        }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'first') {
            if (this.viewTab === 'due_control') {
              this.dueFilter = eventValue(e) as typeof this.dueFilter;
            } else {
              this.methodFilter = eventValue(e) as 'all' | PaymentMethod;
            }
          }
          if (e.detail.key === 'counterparty') this.counterpartyFilter = eventValue(e);
          if (e.detail.key === 'contract') this.contractFilter = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      >
        <app-segmented-switch
          slot="prefix"
          .value="${this.viewTab}"
          .options="${tabOptions}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.viewTab = eventValue(e) as 'due_control' | 'ledger';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${this.viewTab === 'due_control'
        ? this.renderDueControlTable(filteredDueInvoices, t)
        : this.renderLedgerTable(filteredLedger, t)}

      ${this.renderPaymentModal(t)}
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

    const paged = paginateItems(invoices, this.currentPage, this.tablePageSize);

    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t.viewTexts.payments.thInvoice}</th>
              <th>${t.viewTexts.payments.thContract}</th>
              <th>${t.viewTexts.payments.thCounterparty}</th>
              <th>${t.viewTexts.payments.thDatesControl}</th>
              <th>${t.viewTexts.payments.thPaidBalance}</th>
              <th>${t.viewTexts.payments.thInvoiceTotal}</th>
              <th>${t.viewTexts.payments.thStatus}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.map((inv) => {
              const ctr = this.contracts.find((c) => c.id === inv.contractId);
              const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);
              const invPaid = store.getInvoicePaidAmount(inv.id);
              const invRemaining = store.getInvoiceRemainingAmount(inv);
              const payPct =
                inv.totalAmount > 0
                  ? Math.min(100, Math.round((invPaid / inv.totalAmount) * 100))
                  : 0;
              const dueCtrl = store.getInvoiceDueControl(inv);
              const canPay = invRemaining > 0;

              return html`
                <tr>
                  <td>
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => ctr && store.openContractDetail(ctr.id)}"
                    >
                      <span slot="start">${iconReceipt(15)}</span>
                      <span>${inv.number}</span>
                    </app-link>
                    <div class="cell-sub">
                      ${store.getInvoicePayments(inv.id).length} ${t.viewTexts.payments.paymentsCountSuffix}
                    </div>
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
                            <span>${ctr.number}</span>
                          </app-link>
                          <div class="contract-desc" title="${ctr.title}">${ctr.title}</div>
                        `
                      : '—'}
                  </td>
                  <td>
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
                  </td>
                  <td>
                    <div class="mono" style="white-space: nowrap;">
                      ${inv.issueDate} → ${inv.dueDate}
                    </div>
                    <div>${this.renderDueControlTag(inv, t)}</div>
                  </td>
                  <td>
                    <div class="inv-pay-cell">
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
        .totalItems="${paged.totalItems}"
        .page="${paged.page}"
        .pageSize="${paged.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setTablePageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderLedgerTable(
    payments: InvoicePayment[],
    t: ReturnType<typeof getTranslation>
  ) {
    if (payments.length === 0) {
      return html`<app-empty-state compact title="${t.payments.noPayments}"></app-empty-state>`;
    }

    const paged = paginateItems(payments, this.currentPage, this.tablePageSize);

    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t.payments.paymentDate}</th>
              <th>${t.payments.documentNumber}</th>
              <th>${t.viewTexts.payments.thInvoice}</th>
              <th>${t.viewTexts.payments.thContract}</th>
              <th>${t.viewTexts.payments.thCounterparty}</th>
              <th>${t.payments.paymentMethod}</th>
              <th>${t.payments.notes}</th>
              <th>${t.viewTexts.payments.thAmount}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.map((pay) => {
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
                          <app-link
                            class="link-btn"
                            size="md"
                            variant="primary"
                            @click="${() => ctr && store.openContractDetail(ctr.id)}"
                          >
                            <span>${inv.number}</span>
                          </app-link>
                          <div class="cell-sub">${t.invoices.statuses[inv.status]}</div>
                        `
                      : '—'}
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
                            <span>${ctr.number}</span>
                          </app-link>
                          <div class="contract-desc" title="${ctr.title}">${ctr.title}</div>
                        `
                      : '—'}
                  </td>
                  <td>
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
                  </td>
                  <td>
                    <app-badge variant="default" appearance="soft" size="sm">
                      ${t.payments.methods[pay.method]}
                    </app-badge>
                  </td>
                  <td style="color: var(--text-secondary); max-width: 240px;">
                    ${pay.notes || '—'}
                  </td>
                  <td class="amount-cell" style="color: #10b981;">
                    +${formatMoney(pay.amount, pay.currency)}
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
        .totalItems="${paged.totalItems}"
        .page="${paged.page}"
        .pageSize="${paged.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setTablePageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderPaymentModal(t: ReturnType<typeof getTranslation>) {
    const inv =
      this.invoices.find((i) => i.id === this.paymentInvoiceId) || null;
    if (!this.paymentModalOpen || !inv) return '';

    const payableInvoices = this.invoices.filter(
      (i) =>
        i.status !== 'draft' &&
        i.status !== 'cancelled' &&
        (store.getInvoiceRemainingAmount(i) > 0 || i.id === inv.id)
    );

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
}