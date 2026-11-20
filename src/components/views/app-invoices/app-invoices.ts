import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import { eventValue } from '../../common/event-value';
import {
  Calculation,
  Company,
  Contract,
  Counterparty,
  Invoice,
  InvoiceLineItem,
  InvoicePayment,
  InvoiceStatus,
} from '../../../types';
import {
  iconAlertTriangle,
  iconCalculator,
  iconCheck,
  iconChevronRight,
  iconClock,
  iconCreditCard,
  iconEdit,
  iconEye,
  iconFileText,
  iconFilter,
  iconPlus,
  iconReceipt,
  iconSend,
  iconTrash,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/card-footer/card-footer';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-modal/app-modal';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-payment-form/app-payment-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import '../../common/app-cards-table/app-cards-table';
import styles from './app-invoices.css';
import tableContentStyles from './app-invoices.table.content.css';
import cardContentStyles from './app-invoices.content.css';

const HOURLY_RATE_RUB = 3200;

type InvoiceCurrency = Invoice['currency'];

const CURRENCY_RATES_TO_RUB: Record<string, number> = {
  RUB: 1,
  USD: 96,
  EUR: 104,
  CNY: 13.4,
  GBP: 122,
  KZT: 0.2,
  AED: 26.2,
};

@customElement('app-invoices')
export class AppInvoices extends LitElement {
  @state() private invoices: Invoice[] = store.invoices;
  @state() private contracts: Contract[] = store.contracts;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private counterparties: Counterparty[] = store.counterparties;
  @state() private companies: Company[] = store.companies;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | 'overdue_due' | InvoiceStatus = 'all';
  @state() private contractFilter = 'all';
  @state() private counterpartyFilter = 'all';
  @state() private companyFilter = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';
  @state() private filterVisible = true;
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;

  // Create / Edit Invoice modal state
  @state() private invoiceModalOpen = false;
  @state() private editingInvoiceId: string | null = null;
  @state() private invContractId = '';
  @state() private invNumber = '';
  @state() private invCalculationId = '';
  @state() private invIssueDate = '';
  @state() private invDueDate = '';
  @state() private invStatus: InvoiceStatus = 'issued';
  @state() private invVatRate: 0 | 10 | 20 = 20;
  @state() private invItems: InvoiceLineItem[] = [];
  @state() private invNotes = '';
  @state() private invError = '';
  @state() private invContractError = '';

  // Preview, Payment, Delete dialogs
  @state() private previewInvoice: Invoice | null = null;
  @state() private deletingInvoice: Invoice | null = null;
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
    this.currentPage = store.activeView === 'invoices' ? store.activePage : 1;
    this.invoices = store.invoices;
    this.contracts = store.contracts;
    this.calculations = store.calculations;
    this.counterparties = store.counterparties;
    this.companies = store.companies;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
    const mode = store.viewModeFor('invoices');
    this.displayMode = mode === 'table' ? 'table' : 'cards';

    if (this.previewInvoice) {
      this.previewInvoice = this.invoices.find((i) => i.id === this.previewInvoice!.id) || null;
    }
    // strict-mode fallback: filters pointing at records that no longer exist in the store would keep
    // their selects on the placeholder and leave the list silently empty, so stale values fall back to
    // "all". The check runs against the same lists the filter options are built from.
    if (this.counterpartyFilter !== 'all' && !store.counterparties.some((c) => c.id === this.counterpartyFilter)) {
      this.counterpartyFilter = 'all';
    }
    if (this.companyFilter !== 'all' && !store.companies.some((c) => c.id === this.companyFilter)) {
      this.companyFilter = 'all';
    }
    if (this.contractFilter !== 'all' && !store.contracts.some((c) => c.id === this.contractFilter)) {
      this.contractFilter = 'all';
    }
  }

  private toRub(amount: number, currency: InvoiceCurrency): number {
    return amount * (CURRENCY_RATES_TO_RUB[currency] || 1);
  }

  private convertAmountToCurrency(
    amount: number,
    fromCurrency: InvoiceCurrency,
    toCurrency: InvoiceCurrency
  ): number {
    if (fromCurrency === toCurrency) return Math.round(amount);
    const toRub = this.toRub(amount, fromCurrency);
    const rate = CURRENCY_RATES_TO_RUB[toCurrency] || 1;
    return Math.round(toRub / rate);
  }

  private unitLabel(unit: string, t: ReturnType<typeof getTranslation>): string {
    if (unit === 'ч') return t.viewTexts.calculations.hoursUnitShort;
    if (unit === 'усл.') return t.viewTexts.contractDetail.unitConditional;
    if (unit === 'этап') return t.viewTexts.contractDetail.unitStage;
    return unit;
  }

  private getFiltered(): Invoice[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.invoices
      .filter((inv) => {
        const dueCtrl = store.getInvoiceDueControl(inv);
        if (this.statusFilter === 'overdue_due') {
          if (dueCtrl.state !== 'overdue') return false;
        } else if (this.statusFilter !== 'all' && inv.status !== this.statusFilter) {
          return false;
        }
        if (this.contractFilter !== 'all' && inv.contractId !== this.contractFilter) return false;
        if (this.counterpartyFilter !== 'all' && inv.counterpartyId !== this.counterpartyFilter) {
          return false;
        }
        if (this.companyFilter !== 'all' && inv.companyId !== this.companyFilter) return false;

        if (!query) return true;
        const ctr = this.contracts.find((c) => c.id === inv.contractId);
        const cp = this.counterparties.find((c) => c.id === inv.counterpartyId);
        const comp = this.companies.find((c) => c.id === inv.companyId);
        const itemText = (inv.items || []).map((i) => i.title || '').join(' ').toLowerCase();
        return (
          (inv.number || '').toLowerCase().includes(query) ||
          (inv.notes || '').toLowerCase().includes(query) ||
          itemText.includes(query) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
          (ctr?.title.toLowerCase().includes(query) ?? false) ||
          (cp?.name.toLowerCase().includes(query) ?? false) ||
          (comp?.name.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
  }

  private renderDueControlBadge(
    inv: Invoice,
    t: ReturnType<typeof getTranslation>,
    cardClass = false
  ) {
    const ctrl = store.getInvoiceDueControl(inv);
    if (ctrl.state === 'draft' || ctrl.state === 'cancelled') return '';

    // Card chrome uses the canonical domain chip; the table keeps its historical pill.
    if (cardClass) {
      let status = 'on_track';
      let text = t.payments.daysLeft.replace('{n}', String(ctrl.daysDelta));
      if (ctrl.state === 'paid') {
        if (ctrl.daysDelta < 0) {
          status = 'paid_late';
          text = t.payments.paidLate.replace('{n}', String(Math.abs(ctrl.daysDelta)));
        } else {
          status = 'paid_on_time';
          text = t.payments.paidOnTime;
        }
      } else if (ctrl.state === 'overdue') {
        status = 'overdue';
        text = t.payments.overdueBy.replace('{n}', String(ctrl.daysDelta));
      } else if (ctrl.state === 'due_soon') {
        status = 'due_soon';
        text = ctrl.daysDelta === 0 ? t.payments.dueToday : t.payments.daysLeft.replace('{n}', String(ctrl.daysDelta));
      }
      return html`
        <app-status-chip
          domain="dueControl"
          status="${status}"
          label-override="${text}"
          appearance="soft"
          size="sm"
        ></app-status-chip>
      `;
    }

    const baseCls = 'due-tag';

    if (ctrl.state === 'paid') {
      if (ctrl.daysDelta < 0) {
        return html`
          <span class="${baseCls} due-soon">
            ${iconClock(11)}
            <span>${t.payments.paidLate.replace('{n}', String(Math.abs(ctrl.daysDelta)))}</span>
          </span>
        `;
      }
      return html`
        <span class="${baseCls} paid-ok">
          ${iconCheck(11)}
          <span>${t.payments.paidOnTime}</span>
        </span>
      `;
    }
    if (ctrl.state === 'overdue') {
      return html`
        <span class="${baseCls} overdue">
          ${iconAlertTriangle(11)}
          <span>${t.payments.overdueBy.replace('{n}', String(ctrl.daysDelta))}</span>
        </span>
      `;
    }
    if (ctrl.state === 'due_soon') {
      return html`
        <span class="${baseCls} due-soon">
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
      <span class="${baseCls} on-track">
        ${iconClock(11)}
        <span>${t.payments.daysLeft.replace('{n}', String(ctrl.daysDelta))}</span>
      </span>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFiltered();

    const activeInvoices = this.invoices.filter((i) => i.status !== 'cancelled');
    const inProgressCount = activeInvoices.filter((i) => i.status !== 'paid').length;
    const totalInvoicedRub = Math.round(
      activeInvoices.reduce((s, i) => s + this.toRub(i.totalAmount, i.currency), 0)
    );
    const totalPaidRub = Math.round(
      activeInvoices.reduce(
        (s, i) => s + this.toRub(store.getInvoicePaidAmount(i.id), i.currency),
        0
      )
    );
    const totalRemainingRub = Math.round(
      activeInvoices.reduce(
        (s, i) => s + this.toRub(store.getInvoiceRemainingAmount(i), i.currency),
        0
      )
    );
    const overdueCount = activeInvoices.filter(
      (i) => store.getInvoiceDueControl(i).state === 'overdue'
    ).length;
    const collectionPct =
      totalInvoicedRub > 0 ? Math.min(100, Math.round((totalPaidRub / totalInvoicedRub) * 100)) : 0;

    const hasPayable = this.invoices.some(
      (i) => i.status !== 'draft' && i.status !== 'cancelled' && store.getInvoiceRemainingAmount(i) > 0
    );

    const statusOptions = [
      { value: 'all', label: t.viewTexts.invoices.filterAllStatuses },
      { value: 'overdue_due', label: t.viewTexts.invoices.filterOverdueOnly },
      { value: 'draft', label: t.invoices.statuses.draft },
      { value: 'issued', label: t.invoices.statuses.issued },
      { value: 'sent', label: t.invoices.statuses.sent },
      { value: 'partially_paid', label: t.invoices.statuses.partially_paid },
      { value: 'paid', label: t.invoices.statuses.paid },
      { value: 'overdue', label: t.invoices.statuses.overdue },
      { value: 'cancelled', label: t.invoices.statuses.cancelled },
    ];

    const contractOptions = [
      { value: 'all', label: t.viewTexts.invoices.filterAllContracts },
      ...this.contracts.map((c) => ({ value: c.id, label: `${c.number} · ${c.title}` })),
    ];

    const counterpartyOptions = [
      { value: 'all', label: t.viewTexts.invoices.filterAllCounterparties },
      ...this.counterparties.map((cp) => ({ value: cp.id, label: cp.name })),
    ];

    const companyOptions = [
      { value: 'all', label: t.viewTexts.invoices.filterAllCompanies },
      ...this.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    return html`
      <app-page-header
        title="${t.navigation.invoices}"
        subtitle="${t.viewTexts.pageSubtitles.invoices}"
      >
        <span slot="icon">${iconReceipt(28)}</span>
        <div slot="actions" style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
          ${hasPayable
            ? html`
                <app-button variant="secondary" size="md" @click="${() => this.openPaymentModal(null)}">
                  <span slot="icon-start">${iconCreditCard(16)}</span>
                  <span>${t.payments.recordPayment}</span>
                </app-button>
              `
            : ''}
          <app-button variant="primary" size="md" @click="${() => this.openCreateInvoiceModal()}">
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${t.viewTexts.invoices.newInvoiceButton}</span>
          </app-button>
        </div>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${t.viewTexts.invoices.kpiTotal}"
          value="${String(this.invoices.length)}"
          subtitle="${t.viewTexts.invoices.kpiTotalHint(inProgressCount)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.invoices.kpiInvoicedRub}"
          value="${formatMoney(totalInvoicedRub, 'RUB')}"
          subtitle="${t.viewTexts.invoices.kpiInvoicedHint}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.invoices.kpiPaidRub}"
          value="${formatMoney(totalPaidRub, 'RUB')}"
          valueColor="#10b981"
          subtitle="${t.viewTexts.invoices.kpiCollectionHint(collectionPct)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.invoices.kpiRemainingRub}"
          value="${formatMoney(totalRemainingRub, 'RUB')}"
          valueColor="${overdueCount > 0 ? '#ef4444' : totalRemainingRub > 0 ? '#f59e0b' : '#10b981'}"
          subtitle="${t.viewTexts.invoices.kpiOverdueHint(overdueCount)}"
        ></app-metric-card>
      </app-kpi-strip>

      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.invoices.viewCards },
            { value: 'table', label: t.viewTexts.invoices.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            const nextMode = eventValue(e) === 'table' ? 'table' : 'cards';
            this.displayMode = nextMode;
            this.currentPage = 1;
            store.setActivePage(1, false);
            store.setViewMode('invoices', nextMode);
          }}"
        ></app-segmented-switch>
        <app-toggle-button
          size="sm"
          ?pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) => {
            this.filterVisible = e.detail.pressed;
          }}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filter}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`
            <app-filter-bar
              style="--filter-search-min: 280px; --filter-search-max: 280px;"
              placeholder="${t.viewTexts.invoices.searchPlaceholder}"
              .searchValue="${this.localSearch}"
              show-reset
              .filters="${[
                {
                  key: 'status',
                  options: statusOptions,
                },
                {
                  key: 'contract',
                  options: contractOptions,
                },
                {
                  key: 'counterparty',
                  options: counterpartyOptions,
                },
                {
                  key: 'company',
                  options: companyOptions,
                },
              ]}"
              .values="${{
                status: this.statusFilter,
                contract: this.contractFilter,
                counterparty: this.counterpartyFilter,
                company: this.companyFilter,
              }}"
              @search-change="${(e: CustomEvent<{ value: string }>) => {
                this.localSearch = eventValue(e);
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
              @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
                const val = eventValue(e);
                if (e.detail.key === 'status') {
                  this.statusFilter = val as 'all' | 'overdue_due' | InvoiceStatus;
                }
                if (e.detail.key === 'contract') this.contractFilter = val;
                if (e.detail.key === 'counterparty') this.counterpartyFilter = val;
                if (e.detail.key === 'company') this.companyFilter = val;
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
              @reset="${() => {
                this.localSearch = '';
                this.statusFilter = 'all';
                this.contractFilter = 'all';
                this.counterpartyFilter = 'all';
                this.companyFilter = 'all';
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
            ></app-filter-bar>
          `
        : ''}

      ${filtered.length === 0
        ? html`
            <app-empty-state
              title="${t.viewTexts.invoices.emptyTitle}"
              message="${t.viewTexts.invoices.emptySubtitle}"
            ></app-empty-state>
          `
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      ${this.renderInvoiceFormModal(t)}
      ${this.renderInvoicePreviewModal(t)}
      ${this.renderDeleteInvoiceModal(t)}
      ${this.renderPaymentModal()}
      ${this.renderDeletePaymentModal(t)}
    `;
  }

  private renderCards(filtered: Invoice[], t: ReturnType<typeof getTranslation>) {
    const cardRender = (item: Record<string, unknown>) => {
      const inv = item as unknown as Invoice;
      const ctr = this.contracts.find((c) => c.id === inv.contractId);
      const cp = this.counterparties.find((c) => c.id === inv.counterpartyId);
      const comp = this.companies.find((c) => c.id === inv.companyId);
      const calc = inv.calculationId
        ? this.calculations.find((c) => c.id === inv.calculationId)
        : undefined;
      const invPayments = store.getInvoicePayments(inv.id);
      const invPaid = store.getInvoicePaidAmount(inv.id);
      const invRemaining = store.getInvoiceRemainingAmount(inv);
      const invPayPct =
        inv.totalAmount > 0 ? Math.min(100, Math.round((invPaid / inv.totalAmount) * 100)) : 0;
      const dueCtrl = store.getInvoiceDueControl(inv);
      const canPay = inv.status !== 'draft' && inv.status !== 'cancelled' && invRemaining > 0;

      return html`
        <div class="card-top">
          <div class="cp-identity">
            <div class="cp-icon">${iconReceipt(18)}</div>
            <div class="cp-names">
              <app-link
                class="cp-link-btn"
                size="md"
                @click="${() => (this.previewInvoice = inv)}"
              >
                <span class="mono">${inv.number}</span>
              </app-link>
              ${ctr
                ? html`
                    <div class="cp-legal" title="${ctr.number} · ${ctr.title}">
                      ${ctr.number} · ${ctr.title}
                    </div>
                  `
                : html`<div class="cp-legal">—</div>`}
            </div>
          </div>
          <div class="badges-col">
            <app-status-chip
              domain="invoice"
              status="${inv.status}"
              appearance="soft"
              size="sm"
            ></app-status-chip>
            ${this.renderDueControlBadge(inv, t, true)}
          </div>
        </div>

        <div class="cp-meta-grid">
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.invoices.metaCounterparty}</span>
            <span class="cp-meta-value">
              ${cp
                ? html`
                    <app-link
                      class="inv-meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCounterpartyDetail(cp.id)}"
                    >
                      ${cp.name}
                    </app-link>
                  `
                : '—'}
            </span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.invoices.metaCompany}</span>
            <span class="cp-meta-value">
              ${comp
                ? html`
                    <app-link
                      class="inv-meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCompanyDetail(comp.id)}"
                    >
                      ${comp.name}
                    </app-link>
                  `
                : '—'}
            </span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.invoices.metaDates}</span>
            <span class="cp-meta-value mono">${inv.issueDate} → ${inv.dueDate}</span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.invoices.metaTotal}</span>
            <span class="cp-meta-value mono" style="font-weight: 700;">
              ${formatMoney(inv.totalAmount, inv.currency)}
            </span>
          </div>
        </div>

        <div class="inv-pay-box">
          <div class="inv-pay-meta">
            <span>
              ${t.viewTexts.invoices.paidWord}:
              <strong class="mono" style="color: ${invPaid > 0 ? '#10b981' : 'var(--text-muted)'};">
                ${formatMoney(invPaid, inv.currency)}
              </strong>
            </span>
            <span class="mono" style="font-weight: 600;">${invPayPct}%</span>
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
                <div class="inv-pay-meta">
                  <span>${t.viewTexts.invoices.remainingWord}</span>
                  <span
                    class="mono"
                    style="font-weight: 600; color: ${dueCtrl.state === 'overdue'
                      ? '#ef4444'
                      : 'var(--text-primary)'};"
                  >
                    ${formatMoney(invRemaining, inv.currency)}
                  </span>
                </div>
              `
            : ''}
        </div>

        ${inv.notes ? html`<p class="inv-notes">${inv.notes}</p>` : ''}

        <card-footer>
          <div slot="start" class="stats-row">
            <span class="stat-pill">
              <strong>${(inv.items || []).length}</strong> ${t.viewTexts.invoices.itemsCountSuffix}
            </span>
            <span class="stat-pill">
              <strong>${invPayments.length}</strong> ${t.viewTexts.invoices.paymentsCountSuffix}
            </span>
            <span class="stat-pill">
              ${inv.vatRate > 0 ? `${t.viewTexts.contracts.vatLabel} ${inv.vatRate}%` : t.viewTexts.contracts.noVatLabel}
            </span>
          </div>
          <div slot="end" class="inv-footer-actions">
            ${inv.status === 'draft'
              ? html`
                  <app-button
                    action="submit"
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
                    action="submit"
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
                    action="accept"
                    size="sm"
                    variant="icon"
                    title="${t.payments.recordPayment}"
                    @click="${() => this.openPaymentModal(inv)}"
                  >
                    <span slot="start">${iconCreditCard(14)}</span>
                  </app-button>
                `
              : ''}
            ${calc
              ? html`
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.viewTexts.invoices.openCalculation}"
                    @click="${() => store.openCalculationDetail(calc.id)}"
                  >
                    <span slot="start">${iconCalculator(14)}</span>
                  </app-button>
                `
              : ''}
            ${ctr
              ? html`
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.viewTexts.invoices.openContract}"
                    @click="${() => store.openContractDetail(ctr.id)}"
                  >
                    <span slot="start">${iconChevronRight(14)}</span>
                  </app-button>
                `
              : ''}
            <app-button
              size="sm"
              variant="icon"
              title="${t.invoices.previewInvoice}"
              @click="${() => (this.previewInvoice = inv)}"
            >
              <span slot="start">${iconEye(14)}</span>
            </app-button>
            <app-button
              size="sm"
              variant="icon"
              title="${t.common.edit}"
              @click="${() => this.openEditInvoiceModal(inv)}"
            >
              <span slot="start">${iconEdit(14)}</span>
            </app-button>
            <app-button
              action="delete"
              size="sm"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.deletingInvoice = inv)}"
            >
              <span slot="start">${iconTrash(14)}</span>
            </app-button>
          </div>
        </card-footer>
      `;
    };

    return html`
      <app-cards-table
        .rows="${filtered as unknown as Record<string, unknown>[]}"
        .cardRender="${cardRender}"
        .contentStyles="${cardContentStyles}"
        page-size="${this.cardPageSize}"
        page="${this.currentPage}"
        locale="${t.common.locale}"
        empty-title="${t.viewTexts.invoices.emptyTitle}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page;
          store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1;
          store.setCardGridPageSize(e.detail.pageSize);
          store.setActivePage(1, false);
        }}"
      ></app-cards-table>
    `;
  }

  private renderTable(filtered: Invoice[], t: ReturnType<typeof getTranslation>) {
    const numberCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      return html`
        <div class="contract-link-btn" @click="${() => (this.previewInvoice = inv)}">
          ${iconReceipt(15)}
          <span>${inv.number}</span>
        </div>
        <div class="cell-sub">
          ${(inv.items || []).length} ${t.viewTexts.calculations.itemsSuffix} ·
          ${inv.vatRate > 0 ? `${t.viewTexts.contracts.vatLabel} ${inv.vatRate}%` : t.viewTexts.contracts.noVatLabel}
        </div>
      `;
    };

    const contractCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const ctr = this.contracts.find((c) => c.id === inv.contractId);
      const calc = inv.calculationId
        ? this.calculations.find((c) => c.id === inv.calculationId)
        : undefined;
      return html`
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
        ${calc
          ? html`
              <div class="cell-sub">
                <app-link
                  class="link-btn"
                  size="md"
                  variant="primary"
                  @click="${() => store.openCalculationDetail(calc.id)}"
                >
                  <span class="mono">${calc.number}</span>
                </app-link>
              </div>
            `
          : ''}
      `;
    };

    const partiesCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const cp = this.counterparties.find((c) => c.id === inv.counterpartyId);
      const comp = this.companies.find((c) => c.id === inv.companyId);
      return html`
        <div>
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
        </div>
        <div class="cell-sub">
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
        </div>
      `;
    };

    const datesCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      return html`
        <div class="dates-cell">
          <div>${inv.issueDate} → ${inv.dueDate}</div>
          <div>${this.renderDueControlBadge(inv, t, false)}</div>
        </div>
      `;
    };

    const amountCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      return html`
        <div class="amount-cell">${formatMoney(inv.totalAmount, inv.currency)}</div>
        <div class="billing-sub">
          <span>
            ${inv.vatRate > 0
              ? `${t.viewTexts.contracts.vatLabel} ${inv.vatRate}%: ${formatMoney(inv.vatAmount, inv.currency)}`
              : t.viewTexts.contracts.noVatLabel}
          </span>
        </div>
      `;
    };

    const payCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const invPaid = store.getInvoicePaidAmount(inv.id);
      const invRemaining = store.getInvoiceRemainingAmount(inv);
      const invPayPct =
        inv.totalAmount > 0 ? Math.min(100, Math.round((invPaid / inv.totalAmount) * 100)) : 0;
      const dueCtrl = store.getInvoiceDueControl(inv);
      return html`
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
                  <span
                    style="color: ${dueCtrl.state === 'overdue'
                      ? '#ef4444'
                      : 'var(--text-primary)'}; font-weight: 600;"
                  >
                    ${formatMoney(invRemaining, inv.currency)}
                  </span>
                </div>
              `
            : ''}
        </div>
      `;
    };

    const statusCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      return html`<app-status-chip domain="invoice" status="${inv.status}" appearance="soft" size="sm"></app-status-chip>`;
    };

    const actionsCell = (row: Record<string, unknown>) => {
      const inv = row as unknown as Invoice;
      const ctr = this.contracts.find((c) => c.id === inv.contractId);
      const invRemaining = store.getInvoiceRemainingAmount(inv);
      const canPay = inv.status !== 'draft' && inv.status !== 'cancelled' && invRemaining > 0;
      return html`
        <div class="ctr-actions-row">
          ${inv.status === 'draft'
            ? html`
                <app-button
                  action="submit"
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
                  action="submit"
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
                  action="accept"
                  size="sm"
                  variant="icon"
                  title="${t.payments.recordPayment}"
                  @click="${() => this.openPaymentModal(inv)}"
                >
                  <span slot="start">${iconCreditCard(14)}</span>
                </app-button>
              `
            : ''}
          ${inv.status !== 'paid' && inv.status !== 'cancelled'
            ? html`
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
          <app-button
            size="sm"
            variant="icon"
            title="${t.invoices.previewInvoice}"
            @click="${() => (this.previewInvoice = inv)}"
          >
            <span slot="start">${iconEye(14)}</span>
          </app-button>
          <app-button
            size="sm"
            variant="icon"
            title="${t.common.edit}"
            @click="${() => this.openEditInvoiceModal(inv)}"
          >
            <span slot="start">${iconEdit(14)}</span>
          </app-button>
          ${ctr
            ? html`
                <app-button
                  size="sm"
                  variant="icon"
                  title="${t.viewTexts.invoices.openContract}"
                  @click="${() => store.openContractDetail(ctr.id)}"
                >
                  <span slot="start">${iconChevronRight(14)}</span>
                </app-button>
              `
            : ''}
          <app-button
            action="delete"
            size="sm"
            variant="icon"
            title="${t.common.delete}"
            @click="${() => (this.deletingInvoice = inv)}"
          >
            <span slot="start">${iconTrash(14)}</span>
          </app-button>
        </div>
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .contentStyles="${tableContentStyles}"
          .rows="${filtered as unknown as Record<string, unknown>[]}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          empty-title="${t.viewTexts.invoices.emptyTitle}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page;
            store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1;
            store.setTablePageSize(e.detail.pageSize);
            store.setActivePage(1, false);
          }}"
        >
          <app-table-column
            field="number"
            label="${t.viewTexts.invoices.thInvoice}"
            .cellRender="${numberCell}"
          ></app-table-column>
          <app-table-column
            field="contractId"
            label="${t.viewTexts.invoices.thContract}"
            .cellRender="${contractCell}"
          ></app-table-column>
          <app-table-column
            field="counterpartyId"
            label="${t.viewTexts.invoices.thCounterpartyCompany}"
            .cellRender="${partiesCell}"
          ></app-table-column>
          <app-table-column
            field="dueDate"
            label="${t.viewTexts.invoices.thDatesControl}"
            .cellRender="${datesCell}"
          ></app-table-column>
          <app-table-column
            field="totalAmount"
            label="${t.viewTexts.invoices.thTotalVat}"
            .cellRender="${amountCell}"
          ></app-table-column>
          <app-table-column
            field="status"
            label="${t.viewTexts.invoices.thPaymentProgress}"
            .cellRender="${payCell}"
          ></app-table-column>
          <app-table-column
            field="status"
            label="${t.viewTexts.invoices.thStatus}"
            .cellRender="${statusCell}"
          ></app-table-column>
          <app-table-column
            field=""
            label=""
            align="right"
            .cellRender="${actionsCell}"
          ></app-table-column>
        </app-data-table>
      </div>
    `;
  }

  private renderInvoiceFormModal(t: ReturnType<typeof getTranslation>) {
    if (!this.invoiceModalOpen) return '';
    const ctr = this.contracts.find((c) => c.id === this.invContractId) || null;
    const currency: InvoiceCurrency = ctr?.currency || 'RUB';

    const subtotal = this.invItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    const vatAmount = Math.round((subtotal * this.invVatRate) / 100);
    const totalAmount = subtotal + vatAmount;

    const otherInvoiced = ctr
      ? this.invoices
          .filter(
            (i) =>
              i.contractId === ctr.id &&
              i.status !== 'cancelled' &&
              i.id !== this.editingInvoiceId
          )
          .reduce((s, i) => s + i.totalAmount, 0)
      : 0;
    const remaining = ctr ? Math.max(0, ctr.amount - otherInvoiced) : 0;
    const exceedsContract = Boolean(ctr && ctr.amount > 0 && totalAmount > remaining);

    const unbilled = ctr
      ? this.getUnbilledProjectSources(ctr)
      : { timeEntries: [] as typeof store.timeEntries, expenses: [] as typeof store.expenses };
    const unbilledHours = unbilled.timeEntries.reduce((s, e) => s + e.hours, 0);

    const contractSelectOptions = [
      { value: '', label: t.viewTexts.invoices.selectContractPlaceholder },
      ...this.contracts.map((c) => ({
        value: c.id,
        label: `${c.number} · ${c.title} (${c.currency})`,
      })),
    ];

    const vatOptions = [
      { value: '0', label: t.invoices.vatNone },
      { value: '10', label: t.invoices.vat10 },
      { value: '20', label: t.invoices.vat20 },
    ];

    const statusOptions: { value: InvoiceStatus; label: string }[] = [
      { value: 'draft', label: t.invoices.statuses.draft },
      { value: 'issued', label: t.invoices.statuses.issued },
      { value: 'sent', label: t.invoices.statuses.sent },
      { value: 'partially_paid', label: t.invoices.statuses.partially_paid },
      { value: 'paid', label: t.invoices.statuses.paid },
      { value: 'overdue', label: t.invoices.statuses.overdue },
      { value: 'cancelled', label: t.invoices.statuses.cancelled },
    ];

    const availableCalcs = ctr
      ? this.calculations.filter(
          (c) =>
            c.contractId === ctr.id &&
            (c.status === 'approved' || c.status === 'sent' || c.id === this.invCalculationId)
        )
      : [];
    const calcBasisOptions = [
      { value: '', label: t.viewTexts.contractDetail.optionNoCalc },
      ...availableCalcs.map((c) => ({
        value: c.id,
        label: `${c.number} (${c.periodStart} → ${c.periodEnd} · ${formatMoney(c.billableAmount, c.currency)})`,
      })),
    ];

    return html`
      <app-modal
        ?open="${this.invoiceModalOpen}"
        size="xl"
        title="${this.editingInvoiceId ? t.invoices.editInvoice : t.invoices.newInvoice}"
        @close="${() => (this.invoiceModalOpen = false)}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-select
              label="${t.viewTexts.invoices.labelContract}"
              .value="${this.invContractId}"
              .options="${contractSelectOptions}"
              required
              error="${this.invContractError}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                const nextId = eventValue(e);
                this.invContractId = nextId;
                this.invContractError = '';
                this.invCalculationId = '';
                const nextCtr = this.contracts.find((c) => c.id === nextId);
                if (nextCtr && !this.editingInvoiceId) {
                  this.invNotes = t.viewTexts.contractDetail.invNotesContract(
                    nextCtr.number,
                    nextCtr.startDate
                  );
                }
              }}"
            ></app-select>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.contractDetail.labelInvoiceNumber}"
              .value="${this.invNumber}"
              required
              error="${this.invError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.invNumber = eventValue(e);
                this.invError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.contractDetail.invoiceStatusLabel}"
              .value="${this.invStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.invStatus = eventValue(e) as InvoiceStatus)}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-select
              label="${t.viewTexts.contractDetail.labelBasis}"
              .value="${this.invCalculationId}"
              .options="${calcBasisOptions}"
              ?disabled="${!ctr}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.invCalculationId = eventValue(e);
                const chosen = this.calculations.find((c) => c.id === eventValue(e));
                if (chosen && ctr) {
                  this.populateInvoiceLinesFromCalculation(ctr, chosen);
                }
              }}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.contractDetail.labelIssueDate}"
              .value="${this.invIssueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.invIssueDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${t.viewTexts.contractDetail.dueDateLabel}"
              .value="${this.invDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.invDueDate = eventValue(e))}"
            ></app-date-input>
            <div class="quick-term-row" style="margin-top: 0.35rem;">
              ${[7, 14, 30].map(
                (days) => html`
                  <app-button
                    class="quick-term-btn"
                    size="sm"
                    variant="icon"
                    @click="${() => this.applyDueDateOffset(days)}"
                  >
                    <span>+${days} ${t.viewTexts.contractDetail.daysSuffix}</span>
                  </app-button>
                `
              )}
            </div>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.contractDetail.labelVatRate}"
              .value="${String(this.invVatRate)}"
              .options="${vatOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.invVatRate = Number(eventValue(e)) as 0 | 10 | 20)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.invoices.contractCurrencyLabel}"
              .value="${currency}"
              disabled
            ></app-input>
          </div>

          ${ctr && ctr.projectId && (unbilled.timeEntries.length > 0 || unbilled.expenses.length > 0)
            ? html`
                <div class="col-span-2 autofill-bar">
                  <span class="autofill-info">
                    ${t.viewTexts.contractDetail.availableUnbilled(
                      unbilledHours.toFixed(1),
                      unbilled.expenses.length
                    )}
                  </span>
                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.pullUnbilledFromProject(ctr)}"
                  >
                    <span slot="icon-start">${iconPlus(13)}</span>
                    <span>${t.invoices.pullProjectUnbilled}</span>
                  </app-button>
                </div>
              `
            : ''}

          <div class="col-span-2 items-editor">
            <div class="items-editor-head">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
                ${t.viewTexts.contractDetail.invLineItemsTitle} (${this.invItems.length})
              </span>
              <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                ${ctr && remaining > 0
                  ? html`
                      <app-button
                        size="sm"
                        variant="ghost"
                        @click="${() => this.addRemainingBalanceLine(ctr, remaining)}"
                      >
                        ${t.viewTexts.contractDetail.addRemaining(formatMoney(remaining, currency))}
                      </app-button>
                    `
                  : ''}
                <app-button size="sm" variant="secondary" @click="${() => this.addEmptyLineItem()}">
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${t.invoices.addItem}</span>
                </app-button>
              </div>
            </div>

            ${this.invItems.map(
              (item) => html`
                <div class="item-editor-row">
                  <div>
                    <app-input
                      size="sm"
                      label="${t.viewTexts.contractDetail.labelInvItemName}"
                      .value="${item.title}"
                      @input="${(e: CustomEvent<{ value: string }>) =>
                        this.updateLineItem(item.id, { title: eventValue(e) })}"
                    ></app-input>
                  </div>
                  <div>
                    <app-number-input
                      size="sm"
                      label="${t.viewTexts.calculations.labelQty}"
                      .value="${item.quantity}"
                      min="0.25"
                      max="10000"
                      step="0.5"
                      @change="${(e: CustomEvent<{ value: number }>) =>
                        this.updateLineItem(item.id, { quantity: eventValue(e) })}"
                    ></app-number-input>
                  </div>
                  <div>
                    <app-input
                      size="sm"
                      label="${t.viewTexts.calculations.labelUnit}"
                      .value="${item.unit}"
                      @input="${(e: CustomEvent<{ value: string }>) =>
                        this.updateLineItem(item.id, { unit: eventValue(e) })}"
                    ></app-input>
                  </div>
                  <div>
                    <app-number-input
                      size="sm"
                      label="${t.viewTexts.contractDetail.labelUnitPrice}"
                      .value="${item.unitPrice}"
                      min="0"
                      max="100000000"
                      step="1000"
                      @change="${(e: CustomEvent<{ value: number }>) =>
                        this.updateLineItem(item.id, { unitPrice: eventValue(e) })}"
                    ></app-number-input>
                  </div>
                  <div class="item-amount-preview">${formatMoney(item.amount, currency)}</div>
                  <button
                    type="button"
                    class="icon-btn danger"
                    ?disabled="${this.invItems.length <= 1}"
                    title="${t.common.delete}"
                    @click="${() => this.removeLineItem(item.id)}"
                  >
                    ${iconTrash(13)}
                  </button>
                </div>
              `
            )}
          </div>

          <div class="col-span-2 totals-box">
            <div class="total-line">
              <span>${t.viewTexts.contractDetail.subtotalInvLabel}:</span>
              <span class="mono">${formatMoney(subtotal, currency)}</span>
            </div>
            <div class="total-line">
              <span>${t.viewTexts.contractDetail.vatTemplate(this.invVatRate)}:</span>
              <span class="mono">${formatMoney(vatAmount, currency)}</span>
            </div>
            <div class="total-line grand">
              <span>${t.viewTexts.contractDetail.totalDueLabel}:</span>
              <span class="mono">${formatMoney(totalAmount, currency)}</span>
            </div>
          </div>

          ${exceedsContract
            ? html`
                <div class="col-span-2 warn-banner">
                  ${t.viewTexts.contractDetail.overBalanceWarn(formatMoney(remaining, currency))}
                </div>
              `
            : ''}

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.contractDetail.labelPayNotes}"
              .value="${this.invNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.invNotes = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.invoiceModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSaveInvoice()}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderInvoicePreviewModal(t: ReturnType<typeof getTranslation>) {
    const inv = this.previewInvoice;
    if (!inv) return '';
    const ctr = this.contracts.find((c) => c.id === inv.contractId);
    const company = this.companies.find((c) => c.id === inv.companyId);
    const cp = this.counterparties.find((c) => c.id === inv.counterpartyId);
    const sourceCalc = inv.calculationId
      ? this.calculations.find((c) => c.id === inv.calculationId)
      : undefined;
    const invPayments = store.getInvoicePayments(inv.id);
    const invPaid = store.getInvoicePaidAmount(inv.id);
    const invRemaining = store.getInvoiceRemainingAmount(inv);
    const invPayPct =
      inv.totalAmount > 0 ? Math.min(100, Math.round((invPaid / inv.totalAmount) * 100)) : 0;
    const canPay = inv.status !== 'draft' && inv.status !== 'cancelled' && invRemaining > 0;

    return html`
      <app-modal
        ?open="${Boolean(inv)}"
        size="lg"
        title="${t.invoices.previewInvoice} · ${inv.number}"
        @close="${() => (this.previewInvoice = null)}"
      >
        <div class="invoice-sheet">
          <div class="sheet-top">
            <div>
              <div style="font-size: 1.15rem; font-weight: 700;" class="mono">
                ${t.viewTexts.contracts.labelInvoice} № ${inv.number}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; display: flex; gap: 0.45rem; flex-wrap: wrap; align-items: center;">
                <span>${t.viewTexts.contractDetail.datedWord} <span class="mono">${inv.issueDate}</span></span>
                <span>· ${t.viewTexts.contractDetail.payBeforeWord} <span class="mono">${inv.dueDate}</span></span>
                ${ctr ? html`<span>· ${t.viewTexts.contractDetail.basisWord}: ${ctr.number}</span>` : ''}
                ${sourceCalc ? html`<span>· <span class="mono">${sourceCalc.number}</span></span>` : ''}
                ${this.renderDueControlBadge(inv, t, false)}
              </div>
            </div>
            <app-status-chip domain="invoice" status="${inv.status}" appearance="soft"></app-status-chip>
          </div>

          <div class="pay-summary-card">
            <div class="billing-stat">
              <span class="billing-stat-label">${t.viewTexts.contracts.payInvTotal}</span>
              <span class="billing-stat-val">${formatMoney(inv.totalAmount, inv.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.payments.paidAmount} (${invPayPct}%)</span>
              <span class="billing-stat-val" style="color: #10b981;">
                ${formatMoney(invPaid, inv.currency)}
              </span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.payments.remainingDue}</span>
              <span
                class="billing-stat-val"
                style="color: ${invRemaining > 0 ? '#f59e0b' : '#10b981'};"
              >
                ${formatMoney(invRemaining, inv.currency)}
              </span>
            </div>
          </div>

          <div class="sheet-parties">
            <div class="party-block">
              <span class="party-role">${t.viewTexts.contractDetail.partySupplierInv}</span>
              <span class="party-name">${company?.legalName || company?.name || '—'}</span>
              <span class="party-sub mono">
                ${t.viewTexts.calculations.innLabel}: ${company?.inn || '—'}${company?.kpp
                  ? `${t.viewTexts.contractDetail.kppInlineTemplate(company.kpp)}`
                  : ''}
              </span>
            </div>
            <div class="party-block">
              <span class="party-role">${t.viewTexts.contractDetail.partyBuyer}</span>
              <span class="party-name">${cp?.legalName || cp?.name || '—'}</span>
              <span class="party-sub mono">
                ${t.viewTexts.calculations.innLabel}: ${cp?.inn || '—'}${cp?.kpp
                  ? `${t.viewTexts.contractDetail.kppInlineTemplate(cp.kpp)}`
                  : ''}
              </span>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${t.viewTexts.contractDetail.thItemInv}</th>
                  <th>${t.viewTexts.calculations.labelQty}</th>
                  <th>${t.viewTexts.calculations.thPrice}</th>
                  <th>${t.viewTexts.expenses.thAmount}</th>
                </tr>
              </thead>
              <tbody>
                ${inv.items.map(
                  (item, idx) => html`
                    <tr>
                      <td class="mono">${idx + 1}</td>
                      <td>${item.title}</td>
                      <td class="mono">${item.quantity} ${this.unitLabel(item.unit, t)}</td>
                      <td class="mono">${formatMoney(item.unitPrice, inv.currency)}</td>
                      <td class="mono" style="font-weight: 700;">${formatMoney(item.amount, inv.currency)}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          </div>

          <div class="totals-box">
            <div class="total-line">
              <span>${t.viewTexts.contractDetail.subtotalNoVat}:</span>
              <span class="mono">${formatMoney(inv.subtotal, inv.currency)}</span>
            </div>
            <div class="total-line">
              <span>${t.viewTexts.contractDetail.vatTemplate(inv.vatRate)}:</span>
              <span class="mono">${formatMoney(inv.vatAmount, inv.currency)}</span>
            </div>
            <div class="total-line grand">
              <span>${t.viewTexts.contractDetail.totalDueLabel2}:</span>
              <span class="mono">${formatMoney(inv.totalAmount, inv.currency)}</span>
            </div>
          </div>

          <div class="items-editor">
            <div class="payments-subhead">
              <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">
                ${t.payments.historyTitle} (${invPayments.length})
              </span>
              ${canPay
                ? html`
                    <app-button
                      size="sm"
                      variant="secondary"
                      @click="${() => this.openPaymentModal(inv)}"
                    >
                      <span slot="icon-start">${iconCreditCard(13)}</span>
                      <span>${t.payments.recordPayment}</span>
                    </app-button>
                  `
                : ''}
            </div>

            ${invPayments.length === 0
              ? html`<app-empty-state compact title="${t.payments.noPayments}"></app-empty-state>`
              : html`
                  <div class="table-wrap">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>${t.payments.paymentDate}</th>
                          <th>${t.viewTexts.payments.thDirection}</th>
                          <th>${t.payments.documentNumber}</th>
                          <th>${t.viewTexts.payments.thCompanyRequisites}</th>
                          <th>${t.payments.paymentMethod}</th>
                          <th>${t.payments.notes}</th>
                          <th>${t.viewTexts.expenses.thAmount}</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        ${invPayments.map((pay) => {
                          const compReq = store.getPaymentCompanyRequisitesLabel(pay);
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
                              <td class="mono" style="white-space: nowrap;">${pay.documentNumber || '—'}</td>
                              <td class="mono" style="font-size: 0.75rem; color: var(--text-secondary);">
                                ${compReq || '—'}
                              </td>
                              <td>${t.payments.methods[pay.method]}</td>
                              <td style="color: var(--text-secondary);">${pay.notes || '—'}</td>
                              <td
                                class="mono"
                                style="color: ${isOutgoing ? '#f59e0b' : '#10b981'}; font-weight: 700; white-space: nowrap;"
                              >
                                ${isOutgoing ? '−' : '+'}${formatMoney(pay.amount, pay.currency)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  class="icon-btn danger"
                                  title="${t.common.delete}"
                                  @click="${() => (this.deletingPayment = pay)}"
                                >
                                  ${iconTrash(13)}
                                </button>
                              </td>
                            </tr>
                          `;
                        })}
                      </tbody>
                    </table>
                  </div>
                `}
          </div>

          ${inv.notes
            ? html`<div style="font-size: 0.82rem; color: var(--text-secondary);">${inv.notes}</div>`
            : ''}
        </div>

        <div slot="footer">
          <app-button
            variant="secondary"
            @click="${() => {
              this.previewInvoice = null;
              this.openEditInvoiceModal(inv);
            }}"
          >
            ${t.common.edit}
          </app-button>
          ${inv.status === 'draft'
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => store.updateInvoiceStatus(inv.id, 'issued')}"
                >
                  ${t.invoices.markIssued}
                </app-button>
              `
            : ''}
          ${inv.status === 'issued'
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => store.updateInvoiceStatus(inv.id, 'sent')}"
                >
                  ${t.invoices.markSent}
                </app-button>
              `
            : ''}
          ${canPay
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => this.openPaymentModal(inv)}"
                >
                  <span slot="icon-start">${iconCreditCard(14)}</span>
                  <span>${t.payments.recordPayment}</span>
                </app-button>
                <app-button
                  variant="primary"
                  @click="${() => store.updateInvoiceStatus(inv.id, 'paid')}"
                >
                  ${t.invoices.markPaid}
                </app-button>
              `
            : ''}
          <app-button variant="ghost" @click="${() => (this.previewInvoice = null)}">
            ${t.common.close}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteInvoiceModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingInvoice)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.invoiceDelete.title}"
        action="${t.viewTexts.confirmDialogs.invoiceDelete.action(this.deletingInvoice?.number || '')}"
        result="${t.viewTexts.confirmDialogs.invoiceDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingInvoice = null)}"
        @confirm="${() => {
          if (this.deletingInvoice) {
            store.deleteInvoice(this.deletingInvoice.id);
            this.deletingInvoice = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderPaymentModal() {
    if (!this.paymentModalOpen) return '';
    const inv = this.paymentInvoiceId
      ? this.invoices.find((i) => i.id === this.paymentInvoiceId) || null
      : null;
    const payableInvoices = this.invoices.filter(
      (i) =>
        i.status !== 'draft' &&
        i.status !== 'cancelled' &&
        (store.getInvoiceRemainingAmount(i) > 0 || i.id === this.paymentInvoiceId)
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

  private openPaymentModal(inv: Invoice | null) {
    this.paymentInvoiceId = inv?.id || '';
    this.paymentModalOpen = true;
  }

  private openCreateInvoiceModal() {
    const t = getTranslation(this.currentLang);
    if (this.contracts.length === 0) {
      store.addNotification('warning', t.navigation.invoices, t.viewTexts.invoices.createContractFirst);
      return;
    }

    const defaultCtr =
      this.contractFilter !== 'all'
        ? this.contracts.find((c) => c.id === this.contractFilter) || this.contracts[0]
        : this.contracts[0];

    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + 14);
    const seq = this.invoices.length + 1;

    this.editingInvoiceId = null;
    this.invContractId = defaultCtr.id;
    this.invNumber = `${t.viewTexts.contractDetail.invNumberPrefix}${today.getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.invIssueDate = today.toISOString().slice(0, 10);
    this.invDueDate = due.toISOString().slice(0, 10);
    this.invStatus = 'issued';
    this.invVatRate = 20;
    this.invError = '';
    this.invContractError = '';

    const approvedReadyCalc = this.calculations.find(
      (c) => c.contractId === defaultCtr.id && c.status === 'approved' && !c.invoiceId
    );
    if (approvedReadyCalc) {
      this.invCalculationId = approvedReadyCalc.id;
      this.populateInvoiceLinesFromCalculation(defaultCtr, approvedReadyCalc);
    } else {
      this.invCalculationId = '';
      this.invNotes = t.viewTexts.contractDetail.invNotesContract(
        defaultCtr.number,
        defaultCtr.startDate
      );
      const otherInvoiced = this.invoices
        .filter((i) => i.contractId === defaultCtr.id && i.status !== 'cancelled')
        .reduce((s, i) => s + i.totalAmount, 0);
      const suggestedNet =
        defaultCtr.amount > 0
          ? Math.max(0, Math.round((defaultCtr.amount - otherInvoiced) / 1.2))
          : 100000;
      this.invItems = [
        {
          id: `ili-${Date.now()}`,
          title: t.viewTexts.contractDetail.stageTitlePayment(defaultCtr.title),
          quantity: 1,
          unit: 'этап',
          unitPrice: suggestedNet,
          amount: suggestedNet,
          sourceType: 'manual',
        },
      ];
    }

    this.invoiceModalOpen = true;
  }

  private openEditInvoiceModal(inv: Invoice) {
    this.editingInvoiceId = inv.id;
    this.invContractId = inv.contractId;
    this.invNumber = inv.number;
    this.invCalculationId = inv.calculationId || '';
    this.invIssueDate = inv.issueDate;
    this.invDueDate = inv.dueDate;
    this.invStatus = inv.status;
    this.invVatRate = inv.vatRate;
    this.invItems = inv.items.map((item) => ({ ...item }));
    this.invNotes = inv.notes;
    this.invError = '';
    this.invContractError = '';
    this.invoiceModalOpen = true;
  }

  private populateInvoiceLinesFromCalculation(ctr: Contract, calc: Calculation) {
    const t = getTranslation(this.currentLang);
    const billableItems = calc.items.filter((i) => i.billable && i.amount > 0);
    const nonBillableCount = calc.items.filter((i) => !i.billable).length;

    if (billableItems.length > 0) {
      this.invItems = billableItems.map((i, idx) => ({
        id: `ili-calc-${calc.id}-${idx}`,
        title: i.title,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        amount: i.amount,
        sourceType: i.itemType,
        sourceId: i.sourceId,
      }));
    } else {
      this.invItems = [
        {
          id: `ili-calc-${calc.id}-0`,
          title: t.viewTexts.contractDetail.calcWorksTitle(
            calc.number,
            calc.periodStart,
            calc.periodEnd
          ),
          quantity: 1,
          unit: 'этап',
          unitPrice: calc.billableAmount,
          amount: calc.billableAmount,
          sourceType: 'manual',
        },
      ];
    }

    this.invNotes = t.viewTexts.contractDetail.invNotesCalc(
      ctr.number,
      calc.number,
      calc.periodStart,
      calc.periodEnd,
      nonBillableCount
    );
  }

  private applyDueDateOffset(days: number) {
    const base = this.invIssueDate ? new Date(this.invIssueDate) : new Date();
    if (isNaN(base.getTime())) return;
    base.setDate(base.getDate() + days);
    this.invDueDate = base.toISOString().slice(0, 10);
  }

  private addEmptyLineItem() {
    this.invItems = [
      ...this.invItems,
      {
        id: `ili-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: '',
        quantity: 1,
        unit: 'усл.',
        unitPrice: 0,
        amount: 0,
        sourceType: 'manual',
      },
    ];
  }

  private addRemainingBalanceLine(ctr: Contract, remainingTotal: number) {
    const divisor = 1 + this.invVatRate / 100;
    const netPrice = Math.round(remainingTotal / divisor);
    this.invItems = [
      ...this.invItems,
      {
        id: `ili-${Date.now()}-rem`,
        title: getTranslation(this.currentLang).viewTexts.contractDetail.closeBalanceTitle(ctr.number),
        quantity: 1,
        unit: 'этап',
        unitPrice: netPrice,
        amount: netPrice,
        sourceType: 'manual',
      },
    ];
  }

  private getUnbilledProjectSources(contract: Contract) {
    if (!contract.projectId) {
      return { timeEntries: [] as typeof store.timeEntries, expenses: [] as typeof store.expenses };
    }
    const billedSourceIds = new Set<string>();
    for (const inv of this.invoices) {
      if (inv.status === 'cancelled') continue;
      if (this.editingInvoiceId && inv.id === this.editingInvoiceId) continue;
      for (const item of inv.items) {
        if (item.sourceId) billedSourceIds.add(item.sourceId);
      }
    }
    for (const item of this.invItems) {
      if (item.sourceId) billedSourceIds.add(item.sourceId);
    }

    const timeEntries = store.timeEntries.filter(
      (te) => te.projectId === contract.projectId && te.billable && !billedSourceIds.has(te.id)
    );
    const expenses = store.expenses.filter(
      (ex) =>
        ex.projectId === contract.projectId &&
        ex.billable &&
        ex.status !== 'rejected' &&
        !billedSourceIds.has(ex.id)
    );

    return { timeEntries, expenses };
  }

  private pullUnbilledFromProject(ctr: Contract) {
    const t = getTranslation(this.currentLang);
    const { timeEntries, expenses } = this.getUnbilledProjectSources(ctr);
    const added: InvoiceLineItem[] = [];

    for (const te of timeEntries) {
      const task = store.tasks.find((tk) => tk.id === te.taskId);
      const user = store.users.find((u) => u.id === te.userId);
      const rate = user?.hourlyRate || HOURLY_RATE_RUB;
      const amount = Math.round(te.hours * rate);
      added.push({
        id: `ili-te-${te.id}`,
        title: t.viewTexts.contractDetail.laborItemTitle(
          te.taskId,
          task ? ` · ${task.title}` : '',
          te.hours
        ),
        quantity: te.hours,
        unit: 'ч',
        unitPrice: rate,
        amount,
        sourceType: 'time_entry',
        sourceId: te.id,
      });
    }

    for (const ex of expenses) {
      const converted = this.convertAmountToCurrency(ex.amount, ex.currency, ctr.currency);
      added.push({
        id: `ili-ex-${ex.id}`,
        title: t.viewTexts.contractDetail.expenseItemTitle(ex.title),
        quantity: 1,
        unit: 'усл.',
        unitPrice: converted,
        amount: converted,
        sourceType: 'expense',
        sourceId: ex.id,
      });
    }

    if (added.length > 0) {
      const nonEmptyExisting = this.invItems.filter((i) => i.title.trim() && i.amount > 0);
      this.invItems = [...nonEmptyExisting, ...added];
    }
  }

  private updateLineItem(id: string, patch: Partial<InvoiceLineItem>) {
    this.invItems = this.invItems.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      const qty = Math.max(0, Number(next.quantity) || 0);
      const price = Math.max(0, Number(next.unitPrice) || 0);
      next.quantity = qty;
      next.unitPrice = price;
      next.amount = Math.round(qty * price);
      return next;
    });
  }

  private removeLineItem(id: string) {
    if (this.invItems.length <= 1) return;
    this.invItems = this.invItems.filter((i) => i.id !== id);
  }

  private handleSaveInvoice() {
    const t = getTranslation(this.currentLang);
    const ctr = this.contracts.find((c) => c.id === this.invContractId);
    if (!ctr) {
      this.invContractError = t.viewTexts.invoices.selectContractError;
      return;
    }
    if (!this.invNumber.trim()) {
      this.invError = t.common.required;
      return;
    }

    const cleanItems = this.invItems
      .filter((i) => i.title.trim())
      .map((i) => ({ ...i, title: i.title.trim() }));

    if (cleanItems.length === 0) {
      this.invError = t.viewTexts.calculations.addOneItemError;
      return;
    }

    const subtotal = cleanItems.reduce((s, i) => s + i.amount, 0);
    const vatAmount = Math.round((subtotal * this.invVatRate) / 100);
    const totalAmount = subtotal + vatAmount;
    const paidDate =
      this.invStatus === 'paid'
        ? this.invoices.find((i) => i.id === this.editingInvoiceId)?.paidDate ||
          new Date().toISOString().slice(0, 10)
        : undefined;

    const payload = {
      number: this.invNumber.trim(),
      contractId: ctr.id,
      calculationId: this.invCalculationId || undefined,
      projectId: ctr.projectId,
      companyId: ctr.companyId,
      counterpartyId: ctr.counterpartyId,
      issueDate: this.invIssueDate || new Date().toISOString().slice(0, 10),
      dueDate: this.invDueDate || new Date().toISOString().slice(0, 10),
      paidDate,
      currency: ctr.currency,
      vatRate: this.invVatRate,
      subtotal,
      vatAmount,
      totalAmount,
      status: this.invStatus,
      items: cleanItems,
      notes: this.invNotes.trim(),
    };

    if (this.editingInvoiceId) {
      const existing = this.invoices.find((i) => i.id === this.editingInvoiceId);
      store.updateInvoice({
        id: this.editingInvoiceId,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      });
    } else {
      store.addInvoice(payload);
    }

    this.invoiceModalOpen = false;
  }
}
