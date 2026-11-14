import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
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
  iconSearch,
  iconTrash,
  iconWallet,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-date-input/app-date-input';
import '../../common/app-input/app-input';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-number-input/app-number-input';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import styles from './app-payments.css';

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
    this.payments = store.payments;
    this.invoices = store.invoices;
    this.contracts = store.contracts;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
  }

  private formatMoney(amount: number, currency: 'RUB' | 'USD' | 'EUR' = 'RUB'): string {
    const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
    return `${Math.round(amount).toLocaleString('ru-RU')} ${sym}`;
  }

  private toRub(amount: number, currency: 'RUB' | 'USD' | 'EUR'): number {
    if (currency === 'USD') return amount * 96;
    if (currency === 'EUR') return amount * 104;
    return amount;
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
      case 'partially_paid':
        return 'warning';
      case 'paid':
        return 'success';
      case 'overdue':
      case 'cancelled':
        return 'danger';
    }
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
    const isRu = this.currentLang === 'ru';

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
      { value: 'all', label: isRu ? 'Все счета' : 'All invoices' },
      { value: 'unpaid', label: isRu ? 'Ожидают оплаты' : 'Unpaid / Open' },
      { value: 'overdue', label: t.invoices.statuses.overdue, color: '#ef4444' },
      { value: 'due_soon', label: isRu ? 'Срок ≤ 5 дн.' : 'Due ≤ 5d', color: '#f59e0b' },
      { value: 'partially_paid', label: t.invoices.statuses.partially_paid, color: '#f59e0b' },
      { value: 'paid', label: t.invoices.statuses.paid, color: '#10b981' },
    ];

    const methodFilterOptions = [
      { value: 'all', label: isRu ? 'Все способы оплаты' : 'All payment methods' },
      { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
      { value: 'card', label: t.payments.methods.card },
      { value: 'cash', label: t.payments.methods.cash },
      { value: 'offset', label: t.payments.methods.offset },
    ];

    const counterpartyOptions = [
      { value: 'all', label: isRu ? 'Все контрагенты' : 'All counterparties' },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];

    const contractOptions = [
      { value: 'all', label: isRu ? 'Все договоры' : 'All contracts' },
      ...this.contracts.map((c) => ({ value: c.id, label: `${c.number} · ${c.title}` })),
    ];

    return html`
      <app-page-header
        title="${t.navigation.payments}"
        subtitle="${isRu
          ? 'Контроль сроков оплаты счетов, частичные и полные транши, реестр платёжных поручений и остатков задолженности'
          : 'Invoice due-date monitoring, partial & full payment settlements, and transaction ledger'}"
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
        <app-metric-card size="compact" label="${t.payments.paidAmount} (RUB)" value="${this.formatMoney(totalPaidRub, 'RUB')}" valueColor="#10b981" subtitle="${this.payments.length} ${isRu ? 'проведённ. платёж(ей)' : 'recorded payment(s)'}"></app-metric-card>
        <app-metric-card size="compact" label="${t.payments.remainingDue} (RUB)" value="${this.formatMoney(totalRemainingRub, 'RUB')}" valueColor="var(--accent-primary, #6366f1)" subtitle="${payableInvoices.length} ${isRu ? 'неоплач./частичных счетов' : 'open invoice(s)'}"></app-metric-card>
        <app-metric-card size="compact" label="${t.payments.overdueAlert}" value="${this.formatMoney(overdueRub, 'RUB')}" valueColor="${overdueRub > 0 ? '#ef4444' : ''}" subtitle="${overdueInvoices.length} ${isRu ? 'просроченн. счёт(ов)' : 'overdue invoice(s)'}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Ближайшие сроки (≤ 5 дн.)' : 'Due Within 5 Days'}" value="${this.formatMoney(dueSoonRub, 'RUB')}" valueColor="${dueSoonRub > 0 ? '#f59e0b' : ''}" subtitle="${dueSoonInvoices.length} ${isRu ? 'счёт(ов) к оплате' : 'invoice(s) due soon'}"></app-metric-card>
      </app-kpi-strip>

      <div class="toolbar">
        <div class="toolbar-filters">
          <app-segmented-switch
            .value="${this.viewTab}"
            .options="${tabOptions}"
            @change="${(e: CustomEvent<{ value: string }>) =>
              (this.viewTab = e.detail.value as 'due_control' | 'ledger')}"
          ></app-segmented-switch>

          <div class="filter-search">
            <app-input
              placeholder="${this.viewTab === 'due_control'
                ? isRu
                  ? 'Поиск по номеру счёта, договору, клиенту...'
                  : 'Search invoice, contract, client...'
                : isRu
                ? 'Поиск по ПП, счёту, контрагенту...'
                : 'Search payment doc, invoice, client...'}"
              .value="${this.localSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
            >
              <span slot="icon">${iconSearch(15)}</span>
            </app-input>
          </div>

          <div class="filter-select">
            <app-select
              .value="${this.viewTab === 'due_control' ? this.dueFilter : this.methodFilter}"
              .options="${this.viewTab === 'due_control' ? dueFilterOptions : methodFilterOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                if (this.viewTab === 'due_control') {
                  this.dueFilter = e.detail.value as typeof this.dueFilter;
                } else {
                  this.methodFilter = e.detail.value as 'all' | PaymentMethod;
                }
              }}"
            ></app-select>
          </div>

          <div class="filter-select">
            <app-select
              .value="${this.counterpartyFilter}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.counterpartyFilter = e.detail.value)}"
            ></app-select>
          </div>

          <div class="filter-select">
            <app-select
              .value="${this.contractFilter}"
              .options="${contractOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.contractFilter = e.detail.value)}"
            ></app-select>
          </div>
        </div>
      </div>

      ${this.viewTab === 'due_control'
        ? this.renderDueControlTable(filteredDueInvoices, t, isRu)
        : this.renderLedgerTable(filteredLedger, t, isRu)}

      ${this.renderPaymentModal(t, isRu)}
      ${this.renderDeletePaymentModal(t, isRu)}
    `;
  }

  private renderDueControlTable(
    invoices: Invoice[],
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    if (invoices.length === 0) {
      return html`
        <app-empty-state compact title="${isRu ? 'Счета по выбранным фильтрам не найдены' : 'No invoices match filters'}"></app-empty-state>
      `;
    }

    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${isRu ? 'Счёт' : 'Invoice'}</th>
              <th>${isRu ? 'Договор' : 'Contract'}</th>
              <th>${isRu ? 'Контрагент' : 'Counterparty'}</th>
              <th>${isRu ? 'Сроки и контроль' : 'Dates & Due Control'}</th>
              <th>${isRu ? 'Оплата и остаток' : 'Paid / Balance'}</th>
              <th>${isRu ? 'Сумма счёта' : 'Total'}</th>
              <th>${isRu ? 'Статус' : 'Status'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map((inv) => {
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
                    <button
                      type="button"
                      class="link-btn"
                      @click="${() => ctr && store.openContractDetail(ctr.id)}"
                    >
                      ${iconReceipt(15)}
                      <span>${inv.number}</span>
                    </button>
                    <div class="cell-sub">
                      ${store.getInvoicePayments(inv.id).length} ${isRu ? 'платеж(а)' : 'payment(s)'}
                    </div>
                  </td>
                  <td>
                    ${ctr
                      ? html`
                          <button
                            type="button"
                            class="link-btn"
                            @click="${() => store.openContractDetail(ctr.id)}"
                          >
                            <span>${ctr.number}</span>
                          </button>
                          <div class="contract-desc" title="${ctr.title}">${ctr.title}</div>
                        `
                      : '—'}
                  </td>
                  <td>
                    ${cp
                      ? html`
                          <button
                            type="button"
                            class="text-link-btn"
                            @click="${() => store.openCounterpartyDetail(cp.id)}"
                          >
                            ${cp.name}
                          </button>
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
                          ${this.formatMoney(invPaid, inv.currency)}
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
                              <span>${isRu ? 'Остаток' : 'Due'}:</span>
                              <span style="color: ${dueCtrl.state === 'overdue' ? '#ef4444' : 'var(--text-primary)'}; font-weight: 600;">
                                ${this.formatMoney(invRemaining, inv.currency)}
                              </span>
                            </div>
                          `
                        : ''}
                    </div>
                  </td>
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
    `;
  }

  private renderLedgerTable(
    payments: InvoicePayment[],
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    if (payments.length === 0) {
      return html`<app-empty-state compact title="${t.payments.noPayments}"></app-empty-state>`;
    }

    return html`
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
            ${payments.map((pay) => {
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
                            class="link-btn"
                            @click="${() => ctr && store.openContractDetail(ctr.id)}"
                          >
                            <span>${inv.number}</span>
                          </button>
                          <div class="cell-sub">${t.invoices.statuses[inv.status]}</div>
                        `
                      : '—'}
                  </td>
                  <td>
                    ${ctr
                      ? html`
                          <button
                            type="button"
                            class="link-btn"
                            @click="${() => store.openContractDetail(ctr.id)}"
                          >
                            <span>${ctr.number}</span>
                          </button>
                          <div class="contract-desc" title="${ctr.title}">${ctr.title}</div>
                        `
                      : '—'}
                  </td>
                  <td>
                    ${cp
                      ? html`
                          <button
                            type="button"
                            class="text-link-btn"
                            @click="${() => store.openCounterpartyDetail(cp.id)}"
                          >
                            ${cp.name}
                          </button>
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
                    +${this.formatMoney(pay.amount, pay.currency)}
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
    `;
  }

  private renderPaymentModal(t: ReturnType<typeof getTranslation>, isRu: boolean) {
    const payableInvoices = this.invoices.filter(
      (i) => i.status !== 'draft' && i.status !== 'cancelled' && store.getInvoiceRemainingAmount(i) > 0
    );
    const inv =
      this.invoices.find((i) => i.id === this.paymentInvoiceId) || payableInvoices[0] || null;
    if (!this.paymentModalOpen || !inv) return '';

    const paidSoFar = store.getInvoicePaidAmount(inv.id);
    const remainingBefore = store.getInvoiceRemainingAmount(inv);
    const entered = Math.max(0, Number(this.payAmount) || 0);
    const paidAfter = Math.round((paidSoFar + entered) * 100) / 100;
    const remainingAfter = Math.max(0, Math.round((inv.totalAmount - paidAfter) * 100) / 100);
    const willBeFull = remainingAfter === 0 && entered > 0;

    const selectableInvoices = this.invoices.filter(
      (i) =>
        i.status !== 'draft' &&
        i.status !== 'cancelled' &&
        (store.getInvoiceRemainingAmount(i) > 0 || i.id === inv.id)
    );

    const invoiceOptions = selectableInvoices.map((i) => {
      const cp = store.counterparties.find((c) => c.id === i.counterpartyId);
      return {
        value: i.id,
        label: `${i.number} (${cp?.name || '—'}) · ${isRu ? 'Ост.' : 'Due'} ${this.formatMoney(
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
        <div class="form-grid">
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Счёт к оплате' : 'Target Invoice'}"
              .value="${inv.id}"
              .options="${invoiceOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                const nextInv = this.invoices.find((i) => i.id === e.detail.value);
                if (nextInv) this.openPaymentModal(nextInv);
              }}"
            ></app-select>
          </div>

          <div class="col-span-2 pay-summary-card">
            <div class="billing-stat">
              <span class="billing-stat-label">${isRu ? 'Итого по счёту' : 'Invoice Total'}</span>
              <span class="billing-stat-val">${this.formatMoney(inv.totalAmount, inv.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.payments.paidAmount}</span>
              <span class="billing-stat-val" style="color: #10b981;">
                ${this.formatMoney(paidSoFar, inv.currency)}
              </span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.payments.remainingDue}</span>
              <span class="billing-stat-val" style="color: #f59e0b;">
                ${this.formatMoney(remainingBefore, inv.currency)}
              </span>
            </div>
          </div>

          <div>
            <app-number-input
              label="${isRu ? `Сумма платежа (${inv.currency})` : `Payment Amount (${inv.currency})`}"
              .value="${this.payAmount}"
              min="1"
              max="100000000"
              step="1000"
              error="${this.payError}"
              @change="${(e: CustomEvent<{ value: number }>) => {
                this.payAmount = e.detail.value;
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
              @change="${(e: CustomEvent<{ value: string }>) => (this.payDate = e.detail.value)}"
            ></app-date-input>
          </div>

          <div>
            <app-select
              label="${t.payments.paymentMethod}"
              .value="${this.payMethod}"
              .options="${methodOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.payMethod = e.detail.value as PaymentMethod)}"
            ></app-select>
          </div>

          <div>
            <app-input
              label="${t.payments.documentNumber}"
              placeholder="ПП-2026/0850"
              .value="${this.payDocNumber}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.payDocNumber = e.detail.value)}"
            ></app-input>
          </div>

          <div class="col-span-2 pay-preview-result">
            <span>
              ${isRu ? 'После платежа:' : 'After payment:'}
              <strong class="mono">${this.formatMoney(paidAfter, inv.currency)}</strong>
              · ${t.payments.remainingDue}:
              <strong class="mono">${this.formatMoney(remainingAfter, inv.currency)}</strong>
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
              @input="${(e: CustomEvent<{ value: string }>) => (this.payNotes = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>

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
      <app-modal
        ?open="${Boolean(this.deletingPayment)}"
        size="sm"
        title="${isRu ? 'Удалить платёж?' : 'Delete payment?'}"
        @close="${() => (this.deletingPayment = null)}"
      >
        <p class="confirm-text">${t.payments.deleteConfirm}</p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingPayment = null)}">
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingPayment) {
                store.deleteInvoicePayment(this.deletingPayment.id);
                this.deletingPayment = null;
              }
            }}"
          >
            ${t.common.delete}
          </app-button>
        </div>
      </app-modal>
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
}
