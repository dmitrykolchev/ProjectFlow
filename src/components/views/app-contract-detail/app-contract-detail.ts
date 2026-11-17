import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  CalculationFrequency,
  CalculationItem,
  CalculationStatus,
  Contract,
  ContractType,
  Invoice,
  InvoiceLineItem,
  InvoicePayment,
  InvoiceStatus,
  PaymentMethod,
} from '../../../types';
import {
  iconAlertTriangle,
  iconCalculator,
  iconCheck,
  iconChevronLeft,
  iconClock,
  iconCreditCard,
  iconEdit,
  iconFileText,
  iconFolder,
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
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-contract-form/app-contract-form';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-entity-emblem/app-entity-emblem';
import styles from './app-contract-detail.css';
import { eventValue } from '../../common/event-value';

const HOURLY_RATE_RUB = 3200;

@customElement('app-contract-detail')
export class AppContractDetail extends LitElement {
  @state() private contracts: Contract[] = store.contracts;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private payments: InvoicePayment[] = store.payments;
  @state() private detailContractId: string = store.detailContractId || store.contracts[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private calcFilter: 'all' | 'pending' | 'approved' | 'invoiced' = 'all';
  @state() private invoiceFilter: 'all' | 'unpaid' | 'partial' | 'overdue' | 'paid' | 'draft' = 'all';

  // Edit Contract modal
  @state() private contractModalOpen = false;
  @state() private editingContract: Contract | null = null;
  @state() private confirmDeleteContractOpen = false;

  // Calculation Create / Edit modal
  @state() private calcModalOpen = false;
  @state() private editingCalcId: string | null = null;
  @state() private calcNumber = '';
  @state() private calcFrequency: CalculationFrequency = 'monthly';
  @state() private calcPeriodStart = '';
  @state() private calcPeriodEnd = '';
  @state() private calcIncludePrior = true;
  @state() private calcStatus: CalculationStatus = 'draft';
  @state() private calcItems: CalculationItem[] = [];
  @state() private calcNotes = '';
  @state() private calcError = '';

  // Preview & Delete Calculation modals
  @state() private previewCalculation: Calculation | null = null;
  @state() private deletingCalculation: Calculation | null = null;

  // Invoice Create / Edit modal
  @state() private invoiceModalOpen = false;
  @state() private editingInvoiceId: string | null = null;
  @state() private invNumber = '';
  @state() private invCalculationId = '';
  @state() private invIssueDate = '';
  @state() private invDueDate = '';
  @state() private invStatus: InvoiceStatus = 'issued';
  @state() private invVatRate: 0 | 10 | 20 = 20;
  @state() private invItems: InvoiceLineItem[] = [];
  @state() private invNotes = '';
  @state() private invError = '';

  // Preview & Delete Invoice modals
  @state() private previewInvoice: Invoice | null = null;
  @state() private deletingInvoice: Invoice | null = null;

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

    const candidateId = store.detailContractId || this.detailContractId;
    if (candidateId && this.contracts.some((c) => c.id === candidateId)) {
      this.detailContractId = candidateId;
    } else {
      this.detailContractId = this.contracts[0]?.id || '';
    }

    if (this.previewCalculation) {
      this.previewCalculation =
        this.calculations.find((c) => c.id === this.previewCalculation!.id) || null;
    }
    if (this.previewInvoice) {
      this.previewInvoice = this.invoices.find((i) => i.id === this.previewInvoice!.id) || null;
    }

    const activeCtr = this.contracts.find((c) => c.id === this.detailContractId);
    if (activeCtr) {
      if (store.consumePendingCalculationModal(activeCtr.id)) {
        this.openCreateCalculationModal(activeCtr);
      } else if (store.consumePendingInvoiceModal(activeCtr.id)) {
        this.openCreateInvoiceModal(activeCtr);
      }
    }
  }


  private convertAmountToCurrency(
    amount: number,
    fromCurrency: 'RUB' | 'USD' | 'EUR',
    toCurrency: 'RUB' | 'USD' | 'EUR'
  ): number {
    if (fromCurrency === toCurrency) return Math.round(amount);
    const toRub = fromCurrency === 'USD' ? amount * 96 : fromCurrency === 'EUR' ? amount * 104 : amount;
    if (toCurrency === 'USD') return Math.round(toRub / 96);
    if (toCurrency === 'EUR') return Math.round(toRub / 104);
    return Math.round(toRub);
  }

  private renderDueControlTag(
    inv: Invoice,
    t: ReturnType<typeof getTranslation>
  ) {
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

  private unitLabel(unit: string, t: ReturnType<typeof getTranslation>): string {
    if (unit === 'ч') return t.viewTexts.calculations.hoursUnitShort;
    if (unit === 'усл.') return t.viewTexts.contractDetail.unitConditional;
    if (unit === 'этап') return t.viewTexts.contractDetail.unitStage;
    return unit;
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

  private getAccountedSourceIds(contract: Contract, excludeCalcId?: string | null): Set<string> {
    const used = new Set<string>();
    for (const calc of this.calculations) {
      if (calc.contractId !== contract.id) continue;
      if (calc.status === 'rejected') continue;
      if (excludeCalcId && calc.id === excludeCalcId) continue;
      for (const item of calc.items) {
        if (item.sourceId) used.add(item.sourceId);
      }
    }
    for (const inv of this.invoices) {
      if (inv.contractId !== contract.id || inv.status === 'cancelled') continue;
      if (this.editingInvoiceId && inv.id === this.editingInvoiceId) continue;
      for (const item of inv.items) {
        if (item.sourceId) used.add(item.sourceId);
      }
    }
    return used;
  }

  private getUnaccountedProjectSources(contract: Contract, excludeCalcId?: string | null) {
    if (!contract.projectId) {
      return {
        timeEntries: [] as typeof store.timeEntries,
        expenses: [] as typeof store.expenses,
      };
    }
    const accounted = this.getAccountedSourceIds(contract, excludeCalcId);
    const timeEntries = store.timeEntries
      .filter((te) => te.projectId === contract.projectId && !accounted.has(te.id))
      .sort((a, b) => a.date.localeCompare(b.date));
    const expenses = store.expenses
      .filter(
        (ex) =>
          ex.projectId === contract.projectId &&
          ex.status !== 'rejected' &&
          !accounted.has(ex.id)
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    return { timeEntries, expenses };
  }

  private collectItemsForPeriod(
    contract: Contract,
    periodStart: string,
    periodEnd: string,
    includePrior: boolean,
    excludeCalcId?: string | null
  ): CalculationItem[] {
    if (!contract.projectId) return [];
    const { timeEntries, expenses } = this.getUnaccountedProjectSources(contract, excludeCalcId);
    const items: CalculationItem[] = [];

    for (const te of timeEntries) {
      const inRange = (!periodStart || te.date >= periodStart) && (!periodEnd || te.date <= periodEnd);
      const isPrior = Boolean(periodStart && te.date < periodStart && (!periodEnd || te.date <= periodEnd));
      if (!inRange && !(includePrior && isPrior)) continue;

      const task = store.tasks.find((tk) => tk.id === te.taskId);
      const user = store.users.find((u) => u.id === te.userId);
      const rawRate = user?.hourlyRate || HOURLY_RATE_RUB;
      const baseRate = this.convertAmountToCurrency(rawRate, 'RUB', contract.currency);
      const unitPrice = te.billable ? baseRate : 0;
      const amount = te.billable ? Math.round(te.hours * unitPrice) : 0;

      items.push({
        id: `ci-te-${te.id}`,
        itemType: 'time_entry',
        sourceId: te.id,
        date: te.date,
        taskId: te.taskId,
        userId: te.userId,
        title: `${te.taskId}${task ? ` · ${task.title}` : ''}${te.description ? ` — ${te.description}` : ''}`,
        quantity: te.hours,
        unit: 'ч',
        billable: te.billable,
        baseRate,
        unitPrice,
        amount,
        isPriorPeriod: isPrior,
      });
    }

    for (const ex of expenses) {
      const inRange = (!periodStart || ex.date >= periodStart) && (!periodEnd || ex.date <= periodEnd);
      const isPrior = Boolean(periodStart && ex.date < periodStart && (!periodEnd || ex.date <= periodEnd));
      if (!inRange && !(includePrior && isPrior)) continue;

      const baseRate = this.convertAmountToCurrency(ex.amount, ex.currency, contract.currency);
      const unitPrice = ex.billable ? baseRate : 0;
      const amount = ex.billable ? baseRate : 0;

      items.push({
        id: `ci-ex-${ex.id}`,
        itemType: 'expense',
        sourceId: ex.id,
        date: ex.date,
        taskId: ex.taskId,
        userId: ex.userId,
        title: `${ex.title}${ex.vendor ? ` (${ex.vendor})` : ''}`,
        quantity: 1,
        unit: 'усл.',
        billable: ex.billable,
        baseRate,
        unitPrice,
        amount,
        isPriorPeriod: isPrior,
      });
    }

    return items.sort((a, b) => a.date.localeCompare(b.date));
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

  render() {
    const t = getTranslation(this.currentLang);
    const ctr = this.contracts.find((c) => c.id === this.detailContractId) || null;

    if (!ctr) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.contractDetail.emptyNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('contracts')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.contractDetail.backToContracts}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const company = store.companies.find((c) => c.id === ctr.companyId);
    const counterparty = store.counterparties.find((c) => c.id === ctr.counterpartyId);
    const project = ctr.projectId ? store.projects.find((p) => p.id === ctr.projectId) : undefined;
    const owner = ctr.ownerId ? store.users.find((u) => u.id === ctr.ownerId) : undefined;
    const freqLabel = t.calculations.frequencies[ctr.billingFrequency || 'monthly'];

    const contractCalculations = this.calculations
      .filter((c) => c.contractId === ctr.id)
      .sort((a, b) => (b.periodEnd + b.createdAt).localeCompare(a.periodEnd + a.createdAt));

    const visibleCalculations = contractCalculations.filter((c) => {
      if (this.calcFilter === 'pending') return c.status === 'draft' || c.status === 'sent' || c.status === 'rejected';
      if (this.calcFilter === 'approved') return c.status === 'approved';
      if (this.calcFilter === 'invoiced') return c.status === 'invoiced';
      return true;
    });

    const contractInvoices = this.invoices
      .filter((inv) => inv.contractId === ctr.id)
      .sort((a, b) => (b.issueDate + b.createdAt).localeCompare(a.issueDate + a.createdAt));

    const activeInvoices = contractInvoices.filter((inv) => inv.status !== 'cancelled');
    const invoicedTotal = activeInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const paidTotal = activeInvoices.reduce(
      (s, inv) => s + store.getInvoicePaidAmount(inv.id),
      0
    );
    const unpaidInvoicesTotal = activeInvoices.reduce(
      (s, inv) => s + store.getInvoiceRemainingAmount(inv),
      0
    );
    const overdueInvoicesTotal = activeInvoices
      .filter((inv) => store.getInvoiceDueControl(inv).state === 'overdue')
      .reduce((s, inv) => s + store.getInvoiceRemainingAmount(inv), 0);
    const remainingLimit = Math.max(0, ctr.amount - invoicedTotal);

    const invoicedPct = ctr.amount > 0 ? Math.min(100, Math.round((invoicedTotal / ctr.amount) * 100)) : 0;
    const paidPct = ctr.amount > 0 ? Math.min(100, Math.round((paidTotal / ctr.amount) * 100)) : 0;

    const visibleInvoices = contractInvoices.filter((inv) => {
      const dueCtrl = store.getInvoiceDueControl(inv);
      const remaining = store.getInvoiceRemainingAmount(inv);
      if (this.invoiceFilter === 'paid') return inv.status === 'paid';
      if (this.invoiceFilter === 'partial') return inv.status === 'partially_paid';
      if (this.invoiceFilter === 'overdue') return inv.status === 'overdue' || dueCtrl.state === 'overdue';
      if (this.invoiceFilter === 'draft') return inv.status === 'draft';
      if (this.invoiceFilter === 'unpaid') {
        return inv.status !== 'draft' && inv.status !== 'cancelled' && remaining > 0;
      }
      return true;
    });

    const contractPayments = this.payments
      .filter((p) => p.contractId === ctr.id)
      .sort((a, b) => (b.paymentDate + b.createdAt).localeCompare(a.paymentDate + a.createdAt));

    const payableContractInvoices = activeInvoices.filter(
      (inv) => inv.status !== 'draft' && store.getInvoiceRemainingAmount(inv) > 0
    );

    const contractSwitchOptions = this.contracts.map((c) => ({
      value: c.id,
      label: `${c.number} · ${c.title}`,
    }));

    const unaccounted = this.getUnaccountedProjectSources(ctr);
    const unaccountedTotalHours = unaccounted.timeEntries.reduce((s, e) => s + e.hours, 0);
    const unaccountedBillableHours = unaccounted.timeEntries
      .filter((e) => e.billable)
      .reduce((s, e) => s + e.hours, 0);
    const unaccountedNonBillableHours = Math.max(0, unaccountedTotalHours - unaccountedBillableHours);

    return html`
      <div class="page-shell">
        <!-- Top Navigation -->
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('contracts')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.contractDetail.backToContracts}</span>
            </app-button>

            <div class="contract-switcher">
              <app-select
                size="sm"
                .value="${ctr.id}"
                .options="${contractSwitchOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.openContractDetail(eventValue(e))}"
              ></app-select>
            </div>
          </div>

          <div class="nav-actions">
            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openCreateCalculationModal(ctr)}"
            >
              <span slot="icon-start">${iconTable()}</span>
              <span>${t.contractDetail.createCalculation}</span>
            </app-button>

            <app-button
              size="sm"
              variant="primary"
              @click="${() => this.openCreateInvoiceModal(ctr)}"
            >
              <span slot="icon-start">${iconPlus(14)}</span>
              <span>${t.contractDetail.issueInvoice}</span>
            </app-button>

            <app-button
              size="sm"
              variant="outline"
              @click="${() => this.openEditContractModal(ctr)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <app-button
              class="danger-action"
              size="sm"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteContractOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <!-- Contract Overview -->
        <section class="overview-card">
          <div class="hero-identity">
            <app-entity-emblem entity="contract" size="lg"></app-entity-emblem>
            <div class="title-block">
              <div class="title-row">
                <app-entity-emblem entity="contract" variant="pill" size="sm"></app-entity-emblem>
                <span class="contract-key">${ctr.number}</span>
                <h1 class="contract-title">${ctr.title}</h1>
                <app-status-chip domain="contract" status="${ctr.status}"></app-status-chip>
              </div>
              <div class="contract-meta-inline">
                <span>${this.getTypeLabel(ctr.type, t)}</span>
                <span aria-hidden="true">·</span>
                <span class="mono">${ctr.startDate} → ${ctr.endDate}</span>
                <span aria-hidden="true">·</span>
                <span>${t.viewTexts.contractDetail.billingCycleLabel}: <strong>${freqLabel}</strong></span>
                ${owner ? html`<span aria-hidden="true">·</span><span>${owner.name}</span>` : ''}
              </div>
              <p class="contract-desc">${ctr.description || '—'}</p>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>
                ${t.viewTexts.contractDetail.finProgressTitle}
                (${t.viewTexts.contractDetail.paidWord} ${paidPct}% · ${t.viewTexts.contractDetail.invoicedWord} ${invoicedPct}%)
              </span>
              <span class="mono">
                ${formatMoney(paidTotal, ctr.currency)} / ${formatMoney(ctr.amount, ctr.currency)}
              </span>
            </div>
            <app-progress-bar
              .segments="${[
                { value: invoicedPct, color: 'var(--accent-primary, #6366f1)', label: 'Invoiced' },
                { value: paidPct, color: '#10b981', label: 'Paid' },
              ]}"
            ></app-progress-bar>
          </div>

          <div class="meta-strip">
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.contractDetail.metaSupplier}</span>
              ${company
                ? html`
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCompanyDetail(company.id)}"
                    >
                      ${company.name}
                    </app-link>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.contractDetail.metaClient}</span>
              ${counterparty
                ? html`
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCounterpartyDetail(counterparty.id)}"
                    >
                      ${counterparty.name}
                    </app-link>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.contractDetail.metaLinkedProject}</span>
              ${project
                ? html`
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => store.openProjectDetail(project.id)}"
                    >
                      [${project.key}] ${project.name}
                    </app-link>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.contractAmount}</span>
              <span class="meta-val mono">${formatMoney(ctr.amount, ctr.currency)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.invoicedTotal}</span>
              <span class="meta-val mono">${formatMoney(invoicedTotal, ctr.currency)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.remainingLimit}</span>
              <span class="meta-val mono">${formatMoney(remainingLimit, ctr.currency)}</span>
            </div>
          </div>
        </section>

        <!-- Step 1: Periodic Calculations (Client Work & Expense Reports) -->
        <app-section-card title="${t.contractDetail.calculationsTitle}" subtitle="(${contractCalculations.length})">
          <span slot="icon">${iconTable()}</span>

            <div slot="actions" class="section-actions">
              <app-segmented-switch
                size="sm"
                .value="${this.calcFilter}"
                .options="${[
                  { value: 'all', label: t.viewTexts.contractDetail.filterAll },
                  { value: 'pending', label: t.viewTexts.contractDetail.calcPending },
                  { value: 'approved', label: t.viewTexts.contractDetail.calcApproved },
                  { value: 'invoiced', label: t.viewTexts.contractDetail.calcInvoiced },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.calcFilter = eventValue(e) as 'all' | 'pending' | 'approved' | 'invoiced')}"
              ></app-segmented-switch>

              <app-button
                size="sm"
                variant="primary"
                @click="${() => this.openCreateCalculationModal(ctr)}"
              >
                <span slot="icon-start">${iconPlus(14)}</span>
                <span>${t.contractDetail.createCalculation}</span>
              </app-button>
            </div>

          ${visibleCalculations.length === 0
            ? html`
                <app-empty-state compact title="${t.contractDetail.noCalculations}">
                  <app-button slot="action" size="sm" variant="secondary" @click="${() => this.openCreateCalculationModal(ctr)}">
                    <span slot="icon-start">${iconPlus(14)}</span>
                    <span>${t.contractDetail.createCalculation}</span>
                  </app-button>
                </app-empty-state>
              `
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.contractDetail.thCalcNumber}</th>
                        <th>${t.viewTexts.contractDetail.thPeriodGraph}</th>
                        <th>${t.viewTexts.contractDetail.thReportScope}</th>
                        <th>${t.viewTexts.contractDetail.thHoursBillZero}</th>
                        <th>${t.viewTexts.contractDetail.thBillableNoVat}</th>
                        <th>${t.viewTexts.projects.labelStatus}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${visibleCalculations.map((calc) => {
                        const priorCount = calc.items.filter((i) => i.isPriorPeriod).length;
                        const nonBillableCount = calc.items.filter((i) => !i.billable).length;
                        const linkedInv = calc.invoiceId
                          ? this.invoices.find((i) => i.id === calc.invoiceId)
                          : undefined;

                        return html`
                          <tr>
                            <td>
                              <button
                                type="button"
                                class="inv-num-btn"
                                @click="${() => store.openCalculationDetail(calc.id)}"
                              >
                                ${iconCalculator(14)}
                                <span>${calc.number}</span>
                              </button>
                              ${linkedInv
                                ? html`
                                    <div style="margin-top: 0.2rem;">
                                      <button
                                        type="button"
                                        class="inline-ref-btn"
                                        @click="${() => (this.previewInvoice = linkedInv)}"
                                      >
                                        → ${linkedInv.number}
                                      </button>
                                    </div>
                                  `
                                : ''}
                            </td>
                            <td class="mono" style="white-space: nowrap; font-size: 0.78rem;">
                              <div>${calc.periodStart} → ${calc.periodEnd}</div>
                              <div style="color: var(--text-muted); font-family: inherit;">
                                ${t.calculations.frequencies[calc.frequency]}
                                ${priorCount > 0
                                  ? html` · <span style="color: #f59e0b;">+${priorCount} ${t.viewTexts.contractDetail.priorSuffix}</span>`
                                  : ''}
                              </div>
                            </td>
                            <td>
                              <div class="items-summary" title="${calc.items[0]?.title || ''}">
                                ${calc.items[0]?.title || '—'}
                              </div>
                              <div style="font-size: 0.73rem; color: var(--text-muted);">
                                ${calc.items.length} ${t.viewTexts.calculations.itemsSuffix}
                                ${nonBillableCount > 0
                                  ? ` · ${nonBillableCount} ${t.viewTexts.contractDetail.zeroRateSuffix}`
                                  : ''}
                              </div>
                            </td>
                            <td class="mono" style="white-space: nowrap;">
                              <span>${calc.billableHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort}</span>
                              ${calc.nonBillableHours > 0
                                ? html`<span style="color: var(--text-muted);"> + ${calc.nonBillableHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort} (0 ₽)</span>`
                                : ''}
                            </td>
                            <td class="mono" style="font-weight: 700; white-space: nowrap;">
                              ${formatMoney(calc.billableAmount, calc.currency)}
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
                                        class="approve-action"
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
                                ${calc.status === 'approved'
                                  ? html`
                                      <app-button
                                        class="approve-action"
                                        size="sm"
                                        variant="icon"
                                        title="${t.calculations.createInvoiceFromCalc}"
                                        @click="${() => this.openInvoiceFromCalculation(ctr, calc)}"
                                      >
                                        <span slot="start">${iconReceipt(14)}</span>
                                      </app-button>
                                    `
                                  : ''}
                                <app-button
                                  size="sm"
                                  variant="icon"
                                  title="${t.common.edit}"
                                  @click="${() => this.openEditCalculationModal(calc)}"
                                >
                                  <span slot="start">${iconEdit(14)}</span>
                                </app-button>
                                <app-button
                                  class="danger-action"
                                  size="sm"
                                  variant="icon"
                                  title="${t.common.delete}"
                                  @click="${() => (this.deletingCalculation = calc)}"
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
              `}
        </app-section-card>

        <!-- Step 2: Contract Invoices, Payment Progress & Due-Date Control -->
        <app-section-card title="${t.contractDetail.invoicesTitle}" subtitle="(${contractInvoices.length})">
          <span slot="icon">${iconReceipt(19)}</span>

            <div slot="actions" class="section-actions">
              <app-segmented-switch
                size="sm"
                .value="${this.invoiceFilter}"
                .options="${[
                  { value: 'all', label: t.viewTexts.contractDetail.filterAll },
                  { value: 'unpaid', label: t.viewTexts.contractDetail.invFilterUnpaid },
                  { value: 'partial', label: t.viewTexts.contractDetail.invFilterPartial },
                  { value: 'overdue', label: t.viewTexts.contractDetail.invFilterOverdue },
                  { value: 'paid', label: t.viewTexts.contractDetail.invFilterPaid },
                  { value: 'draft', label: t.viewTexts.contractDetail.invFilterDrafts },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.invoiceFilter = eventValue(e) as
                    | 'all'
                    | 'unpaid'
                    | 'partial'
                    | 'overdue'
                    | 'paid'
                    | 'draft')}"
              ></app-segmented-switch>

              <app-button
                size="sm"
                variant="primary"
                @click="${() => this.openCreateInvoiceModal(ctr)}"
              >
                <span slot="icon-start">${iconPlus(14)}</span>
                <span>${t.contractDetail.issueInvoice}</span>
              </app-button>
            </div>

          <div class="billing-strip">
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.contractAmount}</span>
              <span class="billing-stat-val">${formatMoney(ctr.amount, ctr.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.invoicedTotal}</span>
              <span class="billing-stat-val">${formatMoney(invoicedTotal, ctr.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.paidTotal}</span>
              <span class="billing-stat-val" style="color: #10b981;">
                ${formatMoney(paidTotal, ctr.currency)}
              </span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.payments.remainingDue}</span>
              <span
                class="billing-stat-val"
                style="color: ${overdueInvoicesTotal > 0 ? '#ef4444' : 'inherit'};"
              >
                ${formatMoney(unpaidInvoicesTotal, ctr.currency)}
              </span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.remainingLimit}</span>
              <span class="billing-stat-val">${formatMoney(remainingLimit, ctr.currency)}</span>
            </div>
          </div>

          ${visibleInvoices.length === 0
            ? html`
                <app-empty-state compact title="${t.contractDetail.noInvoices}">
                  <app-button slot="action" size="sm" variant="secondary" @click="${() => this.openCreateInvoiceModal(ctr)}">
                    <span slot="icon-start">${iconPlus(14)}</span>
                    <span>${t.contractDetail.issueInvoice}</span>
                  </app-button>
                </app-empty-state>
              `
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.contractDetail.thInvoiceNumber}</th>
                        <th>${t.viewTexts.contracts.thDatesControlShort}</th>
                        <th>${t.viewTexts.contractDetail.thItemsBasis}</th>
                        <th>${t.viewTexts.contracts.thPaymentProgress}</th>
                        <th>${t.viewTexts.contractDetail.thTotalPayable}</th>
                        <th>${t.viewTexts.projects.labelStatus}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${visibleInvoices.map((inv) => {
                        const sourceCalc = inv.calculationId
                          ? this.calculations.find((c) => c.id === inv.calculationId)
                          : undefined;
                        const invPaid = store.getInvoicePaidAmount(inv.id);
                        const invRemaining = store.getInvoiceRemainingAmount(inv);
                        const invPayPct =
                          inv.totalAmount > 0
                            ? Math.min(100, Math.round((invPaid / inv.totalAmount) * 100))
                            : 0;
                        const dueCtrl = store.getInvoiceDueControl(inv);
                        const invPayCount = store.getInvoicePayments(inv.id).length;
                        const canRecordPayment =
                          inv.status !== 'draft' && inv.status !== 'cancelled' && invRemaining > 0;

                        return html`
                          <tr>
                            <td>
                              <button
                                type="button"
                                class="inv-num-btn"
                                @click="${() => (this.previewInvoice = inv)}"
                              >
                                ${iconReceipt(14)}
                                <span>${inv.number}</span>
                              </button>
                            </td>
                            <td class="mono" style="white-space: nowrap; font-size: 0.78rem;">
                              <div>${inv.issueDate} → ${inv.dueDate}</div>
                              <div>${this.renderDueControlTag(inv, t)}</div>
                            </td>
                            <td>
                              <div class="items-summary" title="${inv.items[0]?.title || ''}">
                                ${inv.items[0]?.title || '—'}
                              </div>
                              <div style="font-size: 0.73rem; color: var(--text-muted); display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                <span>${inv.items.length} ${t.viewTexts.calculations.itemsSuffix}</span>
                                ${sourceCalc
                                  ? html`
                                      <span>·</span>
                                      <button
                                        type="button"
                                        class="inline-ref-btn"
                                        @click="${() => (this.previewCalculation = sourceCalc)}"
                                      >
                                        ${sourceCalc.number}
                                      </button>
                                    `
                                  : ''}
                                ${invPayCount > 0
                                  ? html`<span>· ${invPayCount} ${t.viewTexts.contractDetail.pmtsSuffix}</span>`
                                  : ''}
                              </div>
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
                            <td class="mono" style="white-space: nowrap;">
                              <div style="font-weight: 700;">${formatMoney(inv.totalAmount, inv.currency)}</div>
                              <div style="font-size: 0.72rem; color: var(--text-muted);">
                                ${inv.vatRate > 0
                                  ? `${t.viewTexts.contracts.vatLabel} ${inv.vatRate}%`
                                  : t.viewTexts.contracts.noVatLabel}
                              </div>
                            </td>
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
                                        class="approve-action"
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
                                        size="sm"
                                        variant="icon"
                                        title="${t.invoices.markSent}"
                                        @click="${() => store.updateInvoiceStatus(inv.id, 'sent')}"
                                      >
                                        <span slot="start">${iconSend(14)}</span>
                                      </app-button>
                                    `
                                  : ''}
                                ${canRecordPayment
                                  ? html`
                                      <app-button
                                        class="approve-action"
                                        size="sm"
                                        variant="icon"
                                        title="${t.payments.recordPayment}"
                                        @click="${() => this.openPaymentModal(inv)}"
                                      >
                                        <span slot="start">${iconCreditCard(14)}</span>
                                      </app-button>
                                      <app-button
                                        class="approve-action"
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
                                  title="${t.common.edit}"
                                  @click="${() => this.openEditInvoiceModal(inv)}"
                                >
                                  <span slot="start">${iconEdit(14)}</span>
                                </app-button>
                                <app-button
                                  class="danger-action"
                                  size="sm"
                                  variant="icon"
                                  title="${t.common.delete}"
                                  @click="${() => (this.deletingInvoice = inv)}"
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
              `}
        </app-section-card>

        <!-- Step 3: Contract Payments Ledger -->
        <app-section-card title="${t.payments.sectionTitle}" subtitle="(${contractPayments.length})">
          <span slot="icon">${iconWallet(18)}</span>

          ${payableContractInvoices.length > 0
            ? html`
                <div slot="actions">
                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.openPaymentModal(payableContractInvoices[0])}"
                  >
                    <span slot="icon-start">${iconCreditCard(14)}</span>
                    <span>${t.payments.recordPayment}</span>
                  </app-button>
                </div>
              `
            : ''}

          ${contractPayments.length === 0
            ? html`<app-empty-state compact title="${t.payments.noContractPayments}"></app-empty-state>`
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.payments.paymentDate}</th>
                        <th>${t.payments.documentNumber}</th>
                        <th>${t.viewTexts.payments.thInvoice}</th>
                        <th>${t.payments.paymentMethod}</th>
                        <th>${t.payments.notes}</th>
                        <th>${t.viewTexts.expenses.thAmount}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${contractPayments.map((pay) => {
                        const inv = contractInvoices.find((i) => i.id === pay.invoiceId);
                        return html`
                          <tr>
                            <td class="mono" style="white-space: nowrap;">${pay.paymentDate}</td>
                            <td class="mono" style="font-weight: 600; white-space: nowrap;">
                              ${pay.documentNumber || '—'}
                            </td>
                            <td>
                              ${inv
                                ? html`
                                    <button
                                      type="button"
                                      class="inv-num-btn"
                                      @click="${() => (this.previewInvoice = inv)}"
                                    >
                                      ${inv.number}
                                    </button>
                                  `
                                : '—'}
                            </td>
                            <td>
                              <app-badge variant="default" appearance="soft" size="sm">
                                ${t.payments.methods[pay.method]}
                              </app-badge>
                            </td>
                            <td style="color: var(--text-secondary);">${pay.notes || '—'}</td>
                            <td class="mono" style="font-weight: 700; color: #10b981; white-space: nowrap;">
                              +${formatMoney(pay.amount, pay.currency)}
                            </td>
                            <td>
                              <div class="actions-row">
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
              `}
          </app-section-card>

        <!-- Secondary Context: Legal Parties & Linked Project Billing -->
        <div class="secondary-grid">
          <app-section-card title="${t.contractDetail.partiesTitle}">
            <span slot="icon">${iconFileText(18)}</span>

            <div class="party-list">
              <div class="party-block">
                <span class="party-role">${t.viewTexts.contractDetail.partySupplierContract}</span>
                <span class="party-name">${company?.legalName || company?.name || '—'}</span>
                <span class="party-sub mono">
                  ${t.viewTexts.calculations.innLabel}: ${company?.inn || '—'}
                  ${company?.kpp ? ` · ${t.viewTexts.counterparties.labelKpp}: ${company.kpp}` : ''}
                </span>
                <span class="party-sub">${company?.city || ''} · ${company?.email || ''}</span>
              </div>

              <div class="party-block">
                <span class="party-role">${t.viewTexts.contractDetail.partyClientPayer}</span>
                ${counterparty
                  ? html`
                      <app-link
                        class="link-btn"
                        size="md"
                        variant="primary"
                        @click="${() => store.openCounterpartyDetail(counterparty.id)}"
                      >
                        ${counterparty.legalName || counterparty.name}
                      </app-link>
                    `
                  : html`<span class="party-name">—</span>`}
                <span class="party-sub mono">
                  ${t.viewTexts.calculations.innLabel}: ${counterparty?.inn || '—'}
                  ${counterparty?.kpp ? ` · ${t.viewTexts.counterparties.labelKpp}: ${counterparty.kpp}` : ''}
                </span>
                <span class="party-sub">
                  ${counterparty?.contactPerson || ''} · ${counterparty?.email || ''}
                </span>
              </div>
            </div>
          </app-section-card>

          <app-section-card title="${t.contractDetail.projectLinkTitle}">
            <span slot="icon">${iconFolder(18)}</span>
            ${project
              ? html`
                  <div slot="actions">
                    <app-button
                      size="sm"
                      variant="ghost"
                      @click="${() => store.openProjectDetail(project.id)}"
                    >
                      ${t.viewTexts.contractDetail.openProjectButton}
                    </app-button>
                  </div>
                `
              : ''}

            ${!project
              ? html`
                  <app-empty-state compact title="${t.viewTexts.contractDetail.emptyNoLinkedProject}"></app-empty-state>
                `
              : html`
                  <div class="party-list">
                    <div class="party-block">
                      <span class="party-role">${t.viewTexts.timeTracking.labelProject}</span>
                      <span class="party-name">[${project.key}] ${project.name}</span>
                      <span class="party-sub">
                        ${t.viewTexts.projects.thProgress}: <span class="mono">${project.progress}%</span>
                        · ${t.viewTexts.contractDetail.deadlineWord}: <span class="mono">${project.dueDate}</span>
                      </span>
                    </div>

                    <div class="party-block">
                      <span class="party-role">
                        ${t.viewTexts.contractDetail.unaccountedTitle}
                      </span>
                      <span class="party-name mono">
                        ${unaccountedTotalHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort} (${unaccountedBillableHours.toFixed(1)} billable + ${unaccountedNonBillableHours.toFixed(1)} non-billable)
                        · ${unaccounted.expenses.length} ${t.viewTexts.contractDetail.expensesSuffix}
                      </span>
                      <span class="party-sub">
                        ${t.viewTexts.contractDetail.unaccountedSub}
                      </span>
                    </div>

                    ${unaccounted.timeEntries.length > 0 || unaccounted.expenses.length > 0
                      ? html`
                          <div>
                            <app-button
                              size="sm"
                              variant="secondary"
                              @click="${() => this.openCreateCalculationModal(ctr)}"
                            >
                              <span slot="icon-start">${iconTable()}</span>
                              <span>${t.contractDetail.createCalculation}</span>
                            </app-button>
                          </div>
                        `
                      : ''}
                  </div>
                `}
          </app-section-card>
        </div>
      </div>

      ${this.renderCalculationFormModal(ctr, t)}
      ${this.renderCalculationPreviewModal(ctr, t)}
      ${this.renderDeleteCalculationModal(t)}
      ${this.renderInvoiceFormModal(ctr, t)}
      ${this.renderInvoicePreviewModal(ctr, t)}
      ${this.renderDeleteInvoiceModal(t)}
      ${this.renderPaymentModal(ctr, t)}
      ${this.renderDeletePaymentModal(t)}
      ${this.renderEditContractModal()}
      ${this.renderDeleteContractModal(ctr, t)}
    `;
  }

  private renderCalculationFormModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>
  ) {
    const frequencyOptions: { value: CalculationFrequency; label: string }[] = [
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
    ];

    const statusOptions: { value: CalculationStatus; label: string }[] = [
      { value: 'draft', label: t.calculations.statuses.draft },
      { value: 'sent', label: t.calculations.statuses.sent },
      { value: 'approved', label: t.calculations.statuses.approved },
      { value: 'rejected', label: t.calculations.statuses.rejected },
      { value: 'invoiced', label: t.calculations.statuses.invoiced },
    ];

    const hourItems = this.calcItems.filter((i) => i.unit === 'ч');
    const billableHours = hourItems.filter((i) => i.billable).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const nonBillableHours = hourItems
      .filter((i) => !i.billable)
      .reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const billableAmount = this.calcItems
      .filter((i) => i.billable)
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const priorItemsCount = this.calcItems.filter((i) => i.isPriorPeriod).length;
    const zeroPriceCount = this.calcItems.filter((i) => !i.billable).length;

    return html`
      <app-modal
        ?open="${this.calcModalOpen}"
        size="xl"
        title="${this.editingCalcId
          ? t.calculations.editCalculation
          : `${t.calculations.newCalculation} · ${ctr.number}`}"
        @close="${() => (this.calcModalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${t.viewTexts.calculations.labelCalcNumber}"
              .value="${this.calcNumber}"
              required
              error="${this.calcError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.calcNumber = eventValue(e);
                this.calcError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.calculations.labelFrequency}"
              .value="${this.calcFrequency}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.calcFrequency = eventValue(e) as CalculationFrequency)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${t.viewTexts.calculations.labelPeriodStart}"
              .value="${this.calcPeriodStart}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.calcPeriodStart = eventValue(e);
                this.refreshCalculationItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${t.viewTexts.calculations.labelPeriodEnd}"
              .value="${this.calcPeriodEnd}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.calcPeriodEnd = eventValue(e);
                this.refreshCalculationItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div class="col-span-2 quick-term-row">
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyCalculationPeriodPreset(ctr, 'this_week')}"
            >
              <span>${t.viewTexts.calculations.quickThisWeek}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyCalculationPeriodPreset(ctr, 'prev_week')}"
            >
              <span>${t.viewTexts.calculations.quickLastWeek}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyCalculationPeriodPreset(ctr, 'this_month')}"
            >
              <span>${t.viewTexts.calculations.quickThisMonth}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyCalculationPeriodPreset(ctr, 'prev_month')}"
            >
              <span>${t.viewTexts.calculations.quickLastMonth}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyCalculationPeriodPreset(ctr, 'this_quarter')}"
            >
              <span>${t.viewTexts.calculations.quickThisQuarter}</span>
            </app-button>
          </div>

          <div class="col-span-2 autofill-bar">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
              <app-checkbox
                ?checked="${this.calcIncludePrior}"
                label="${t.calculations.includePrior}"
                @change="${(e: CustomEvent<{ checked: boolean }>) => {
                  this.calcIncludePrior = e.detail.checked;
                  this.refreshCalculationItemsForPeriod(ctr);
                }}"
              ></app-checkbox>
            </div>

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.refreshCalculationItemsForPeriod(ctr)}"
            >
              <span slot="icon-start">${iconPlus(13)}</span>
              <span>${t.calculations.collectPeriodItems}</span>
            </app-button>
          </div>

          <div class="col-span-2 calc-summary-strip">
            <div class="calc-summary-item">
              <span class="calc-summary-label">${t.viewTexts.calculations.summaryItemsPrior}</span>
              <span class="calc-summary-val">
                ${this.calcItems.length} (${priorItemsCount})
              </span>
            </div>
            <div class="calc-summary-item">
              <span class="calc-summary-label">${t.viewTexts.calculations.summaryBillableHours}</span>
              <span class="calc-summary-val" style="color: #10b981;">${billableHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort}</span>
            </div>
            <div class="calc-summary-item">
              <span class="calc-summary-label">${t.viewTexts.calculations.summaryNonBillable}</span>
              <span class="calc-summary-val" style="color: var(--text-secondary);">
                ${nonBillableHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort} / ${zeroPriceCount} ${t.viewTexts.calculations.itemsSuffix}
              </span>
            </div>
            <div class="calc-summary-item">
              <span class="calc-summary-label">${t.viewTexts.calculations.summaryTotal}</span>
              <span class="calc-summary-val">${formatMoney(billableAmount, ctr.currency)}</span>
            </div>
          </div>

          <div class="col-span-2 items-editor">
            <div class="items-editor-head">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
                ${t.viewTexts.calculations.worksExpensesTitle} (${this.calcItems.length})
              </span>
              <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                <app-button size="sm" variant="secondary" @click="${() => this.addEmptyCalcItem(true)}">
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${t.viewTexts.calculations.addBillableButton}</span>
                </app-button>
                <app-button size="sm" variant="ghost" @click="${() => this.addEmptyCalcItem(false)}">
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${t.viewTexts.calculations.addNonBillableButton}</span>
                </app-button>
              </div>
            </div>

            ${this.calcItems.length === 0
              ? html`<app-empty-state
                  compact
                  title="${t.viewTexts.calculations.emptyEditorItems}"
                ></app-empty-state>`
              : html`
                  <div class="calc-items-list">
                    ${this.calcItems.map(
                      (item) => html`
                        <div class="calc-editor-row ${!item.billable ? 'is-nonbillable' : ''}">
                          <div class="calc-row-top">
                            <div class="calc-meta-col">
                              <span class="calc-date-tag">${item.date || '—'}</span>
                              ${item.isPriorPeriod
                                ? html`<span class="micro-tag prior">${t.calculations.priorBadge}</span>`
                                : html`<span class="micro-tag ${item.billable ? 'bill' : 'zero'}">
                                    ${item.itemType === 'expense'
                                      ? t.viewTexts.calculations.typeExpense
                                      : item.itemType === 'time_entry'
                                      ? t.viewTexts.calculations.typeWork
                                      : t.viewTexts.calculations.typeManual}
                                  </span>`}
                            </div>
                            <div>
                              <app-input
                                size="sm"
                                label="${t.viewTexts.calculations.labelWorkDesc}"
                                .value="${item.title}"
                                @input="${(e: CustomEvent<{ value: string }>) =>
                                  this.updateCalcItem(item.id, { title: eventValue(e) })}"
                              ></app-input>
                            </div>
                            <div class="item-amount-preview ${!item.billable ? 'is-zero' : ''}">
                              ${formatMoney(item.billable ? item.amount : 0, ctr.currency)}
                            </div>
                            <button
                              type="button"
                              class="icon-btn danger"
                              title="${t.common.delete}"
                              @click="${() => (this.calcItems = this.calcItems.filter((i) => i.id !== item.id))}"
                            >
                              ${iconTrash(13)}
                            </button>
                          </div>

                          <div class="calc-row-bottom">
                            <div>
                              <app-number-input
                                size="sm"
                                label="${t.viewTexts.calculations.labelQty}"
                                .value="${item.quantity}"
                                min="0"
                                max="10000"
                                step="0.5"
                                @change="${(e: CustomEvent<{ value: number }>) =>
                                  this.updateCalcItem(item.id, { quantity: eventValue(e) })}"
                              ></app-number-input>
                            </div>
                            <div>
                              <app-input
                                size="sm"
                                label="${t.viewTexts.calculations.labelUnit}"
                                .value="${item.unit}"
                                @input="${(e: CustomEvent<{ value: string }>) =>
                                  this.updateCalcItem(item.id, { unit: eventValue(e) })}"
                              ></app-input>
                            </div>
                            <div>
                              <app-number-input
                                size="sm"
                                label="${item.billable ? (t.viewTexts.calculations.rateLabelBillable) : t.viewTexts.calculations.rateLabelZero}"
                                .value="${item.billable ? item.unitPrice : 0}"
                                min="0"
                                max="100000000"
                                step="500"
                                ?disabled="${!item.billable}"
                                @change="${(e: CustomEvent<{ value: number }>) =>
                                  this.updateCalcItem(item.id, { baseRate: eventValue(e), unitPrice: eventValue(e) })}"
                              ></app-number-input>
                            </div>
                            <div class="calc-bill-cell">
                              <app-checkbox
                                ?checked="${item.billable}"
                                label="${t.viewTexts.calculations.labelBillableItem}"
                                @change="${(e: CustomEvent<{ checked: boolean }>) =>
                                  this.updateCalcItem(item.id, { billable: e.detail.checked })}"
                              ></app-checkbox>
                              ${!item.billable
                                ? html`<span class="calc-zero-hint">${t.viewTexts.calculations.zeroHint}</span>`
                                : ''}
                            </div>
                          </div>
                        </div>
                      `
                    )}
                  </div>
                `}
          </div>

          <div>
            <app-select
              label="${t.viewTexts.calculations.labelCalcStatus}"
              .value="${this.calcStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.calcStatus = eventValue(e) as CalculationStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.calculations.labelReportNotes}"
              .value="${this.calcNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.calcNotes = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.calcModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSaveCalculation(ctr)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderCalculationPreviewModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>
  ) {
    const calc = this.previewCalculation;
    if (!calc) return '';
    const company = store.companies.find((c) => c.id === calc.companyId);
    const cp = store.counterparties.find((c) => c.id === calc.counterpartyId);
    const linkedInv = calc.invoiceId ? this.invoices.find((i) => i.id === calc.invoiceId) : undefined;

    return html`
      <app-modal
        ?open="${Boolean(calc)}"
        size="lg"
        title="${t.calculations.previewCalculation} · ${calc.number}"
        @close="${() => (this.previewCalculation = null)}"
      >
        <div class="invoice-sheet">
          <div class="sheet-top">
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
              <app-entity-emblem entity="calculation" size="md"></app-entity-emblem>
              <div>
                <div style="font-size: 1.15rem; font-weight: 700;" class="mono">
                  ${t.viewTexts.calculations.previewTitle} № ${calc.number}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                  ${t.viewTexts.calculations.previewPeriod}: <span class="mono">${calc.periodStart} → ${calc.periodEnd}</span>
                  · ${t.calculations.frequencies[calc.frequency]}
                  · ${t.viewTexts.payments.thContract}: ${ctr.number}
                </div>
              </div>
            </div>
            <app-status-chip domain="calculation" status="${calc.status}" appearance="soft"></app-status-chip>
          </div>

          <div class="sheet-parties">
            <div class="party-block">
              <span class="party-role">${t.viewTexts.calculations.partySupplier}</span>
              <span class="party-name">${company?.legalName || company?.name || '—'}</span>
              <span class="party-sub mono">${t.viewTexts.calculations.innLabel}: ${company?.inn || '—'}</span>
            </div>
            <div class="party-block">
              <span class="party-role">${t.viewTexts.calculations.partyClientApproval}</span>
              <span class="party-name">${cp?.legalName || cp?.name || '—'}</span>
              <span class="party-sub mono">${t.viewTexts.calculations.innLabel}: ${cp?.inn || '—'}</span>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${t.viewTexts.expenses.thDate}</th>
                  <th>${t.viewTexts.calculations.thWorkExpense}</th>
                  <th>${t.viewTexts.calculations.labelQty}</th>
                  <th>${t.viewTexts.calculations.thBillingType}</th>
                  <th>${t.viewTexts.calculations.thPrice}</th>
                  <th>${t.viewTexts.expenses.thAmount}</th>
                </tr>
              </thead>
              <tbody>
                ${calc.items.map(
                  (item) => html`
                    <tr>
                      <td class="mono" style="white-space: nowrap; font-size: 0.76rem;">
                        <div>${item.date}</div>
                        ${item.isPriorPeriod
                          ? html`<span class="micro-tag prior">${t.calculations.priorBadge}</span>`
                          : ''}
                      </td>
                      <td>${item.title}</td>
                      <td class="mono" style="white-space: nowrap;">${item.quantity} ${this.unitLabel(item.unit, t)}</td>
                      <td>
                        <span class="micro-tag ${item.billable ? 'bill' : 'zero'}">
                          ${item.billable ? t.calculations.billableLabel : t.calculations.nonBillableZero}
                        </span>
                      </td>
                      <td class="mono" style="white-space: nowrap;">
                        ${formatMoney(item.billable ? item.unitPrice : 0, calc.currency)}
                      </td>
                      <td class="mono" style="font-weight: 700; white-space: nowrap;">
                        ${formatMoney(item.billable ? item.amount : 0, calc.currency)}
                      </td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          </div>

          <div class="totals-box">
            <div class="total-line">
              <span>${t.viewTexts.calculations.totalHoursLabel}:</span>
              <span class="mono">
                ${calc.totalHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort} (${calc.billableHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort} / ${calc.nonBillableHours.toFixed(1)}${t.viewTexts.calculations.hoursUnitShort})
              </span>
            </div>
            <div class="total-line grand">
              <span>${t.viewTexts.calculations.subtotalLabel}:</span>
              <span class="mono">${formatMoney(calc.billableAmount, calc.currency)}</span>
            </div>
          </div>

          ${calc.notes
            ? html`<div style="font-size: 0.82rem; color: var(--text-secondary);">${calc.notes}</div>`
            : ''}
        </div>

        <div slot="footer">
          ${calc.status === 'draft' || calc.status === 'rejected'
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => store.updateCalculationStatus(calc.id, 'sent')}"
                >
                  ${t.calculations.sendForApproval}
                </app-button>
              `
            : ''}
          ${calc.status === 'sent'
            ? html`
                <app-button
                  variant="ghost"
                  @click="${() => store.updateCalculationStatus(calc.id, 'rejected')}"
                >
                  ${t.calculations.rejectCalc}
                </app-button>
                <app-button
                  variant="primary"
                  @click="${() => store.updateCalculationStatus(calc.id, 'approved')}"
                >
                  ${t.calculations.approveCalc}
                </app-button>
              `
            : ''}
          ${calc.status === 'approved'
            ? html`
                <app-button
                  variant="primary"
                  @click="${() => {
                    this.previewCalculation = null;
                    this.openInvoiceFromCalculation(ctr, calc);
                  }}"
                >
                  <span slot="icon-start">${iconReceipt(15)}</span>
                  <span>${t.calculations.createInvoiceFromCalc}</span>
                </app-button>
              `
            : ''}
          ${linkedInv
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => {
                    this.previewCalculation = null;
                    this.previewInvoice = linkedInv;
                  }}"
                >
                  ${linkedInv.number}
                </app-button>
              `
            : ''}
          <app-button variant="ghost" @click="${() => (this.previewCalculation = null)}">
            ${t.common.close}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteCalculationModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingCalculation)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.calculationDelete.title}"
        action="${t.viewTexts.confirmDialogs.calculationDelete.action(this.deletingCalculation?.number || '')}"
        result="${t.viewTexts.confirmDialogs.calculationDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingCalculation = null)}"
        @confirm="${() => {
          if (this.deletingCalculation) {
            store.deleteCalculation(this.deletingCalculation.id);
            this.deletingCalculation = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderInvoiceFormModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>
  ) {
    const subtotal = this.invItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    const vatAmount = Math.round((subtotal * this.invVatRate) / 100);
    const totalAmount = subtotal + vatAmount;

    const otherInvoiced = this.invoices
      .filter((i) => i.contractId === ctr.id && i.status !== 'cancelled' && i.id !== this.editingInvoiceId)
      .reduce((s, i) => s + i.totalAmount, 0);
    const remaining = Math.max(0, ctr.amount - otherInvoiced);
    const exceedsContract = ctr.amount > 0 && totalAmount > remaining;

    const unbilled = this.getUnbilledProjectSources(ctr);
    const unbilledHours = unbilled.timeEntries.reduce((s, e) => s + e.hours, 0);

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

    const availableCalcs = this.calculations.filter(
      (c) =>
        c.contractId === ctr.id &&
        (c.status === 'approved' || c.status === 'sent' || c.id === this.invCalculationId)
    );
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
        title="${this.editingInvoiceId ? t.invoices.editInvoice : `${t.invoices.newInvoice} · ${ctr.number}`}"
        @close="${() => (this.invoiceModalOpen = false)}"
      >
        <app-form-grid>
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
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.invCalculationId = eventValue(e);
                const chosen = this.calculations.find((c) => c.id === eventValue(e));
                if (chosen) {
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
          <div class="col-span-2">
            <app-select
              label="${t.viewTexts.contractDetail.labelVatRate}"
              .value="${String(this.invVatRate)}"
              .options="${vatOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.invVatRate = Number(eventValue(e)) as 0 | 10 | 20)}"
            ></app-select>
          </div>

          ${ctr.projectId && (unbilled.timeEntries.length > 0 || unbilled.expenses.length > 0)
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
                ${remaining > 0
                  ? html`
                      <app-button
                        size="sm"
                        variant="ghost"
                        @click="${() => this.addRemainingBalanceLine(ctr, remaining)}"
                      >
                        ${t.viewTexts.contractDetail.addRemaining(formatMoney(remaining, ctr.currency))}
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
                  <div class="item-amount-preview">${formatMoney(item.amount, ctr.currency)}</div>
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
              <span class="mono">${formatMoney(subtotal, ctr.currency)}</span>
            </div>
            <div class="total-line">
              <span>${t.viewTexts.contractDetail.vatTemplate(this.invVatRate)}:</span>
              <span class="mono">${formatMoney(vatAmount, ctr.currency)}</span>
            </div>
            <div class="total-line grand">
              <span>${t.viewTexts.contractDetail.totalDueLabel}:</span>
              <span class="mono">${formatMoney(totalAmount, ctr.currency)}</span>
            </div>
          </div>

          ${exceedsContract
            ? html`
                <div class="col-span-2 warn-banner">
                  ${t.viewTexts.contractDetail.overBalanceWarn(formatMoney(remaining, ctr.currency))}
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
          <app-button variant="primary" @click="${() => this.handleSaveInvoice(ctr)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderInvoicePreviewModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>
  ) {
    const inv = this.previewInvoice;
    if (!inv) return '';
    const company = store.companies.find((c) => c.id === inv.companyId);
    const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);
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
                <span>· ${t.viewTexts.contractDetail.basisWord}: ${ctr.number}</span>
                ${sourceCalc ? html`<span>· <span class="mono">${sourceCalc.number}</span></span>` : ''}
                ${this.renderDueControlTag(inv, t)}
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
                ${t.viewTexts.calculations.innLabel}: ${company?.inn || '—'}${company?.kpp ? `${t.viewTexts.contractDetail.kppInlineTemplate(company.kpp)}` : ''}
              </span>
            </div>
            <div class="party-block">
              <span class="party-role">${t.viewTexts.contractDetail.partyBuyer}</span>
              <span class="party-name">${cp?.legalName || cp?.name || '—'}</span>
              <span class="party-sub mono">
                ${t.viewTexts.calculations.innLabel}: ${cp?.inn || '—'}${cp?.kpp ? `${t.viewTexts.contractDetail.kppInlineTemplate(cp.kpp)}` : ''}
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
                          <th>${t.payments.documentNumber}</th>
                          <th>${t.payments.paymentMethod}</th>
                          <th>${t.payments.notes}</th>
                          <th>${t.viewTexts.expenses.thAmount}</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        ${invPayments.map(
                          (pay) => html`
                            <tr>
                              <td class="mono" style="white-space: nowrap;">${pay.paymentDate}</td>
                              <td class="mono" style="white-space: nowrap;">${pay.documentNumber || '—'}</td>
                              <td>${t.payments.methods[pay.method]}</td>
                              <td style="color: var(--text-secondary);">${pay.notes || '—'}</td>
                              <td class="mono" style="color: #10b981; font-weight: 700; white-space: nowrap;">
                                +${formatMoney(pay.amount, pay.currency)}
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
                          `
                        )}
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

  private renderPaymentModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>
  ) {
    const contractInvoices = this.invoices.filter(
      (i) => i.contractId === ctr.id && i.status !== 'draft' && i.status !== 'cancelled'
    );
    const payableInvoices = contractInvoices.filter(
      (i) => store.getInvoiceRemainingAmount(i) > 0 || i.id === this.paymentInvoiceId
    );
    const inv = contractInvoices.find((i) => i.id === this.paymentInvoiceId) || payableInvoices[0] || null;

    if (!this.paymentModalOpen || !inv) return '';

    const paidSoFar = store.getInvoicePaidAmount(inv.id);
    const remainingBefore = store.getInvoiceRemainingAmount(inv);
    const entered = Math.max(0, Number(this.payAmount) || 0);
    const paidAfter = Math.round((paidSoFar + entered) * 100) / 100;
    const remainingAfter = Math.max(0, Math.round((inv.totalAmount - paidAfter) * 100) / 100);
    const willBeFull = remainingAfter === 0 && entered > 0;

    const invoiceOptions = payableInvoices.map((i) => ({
      value: i.id,
      label: `${i.number} · ${t.viewTexts.payments.dueLabel}: ${formatMoney(
        store.getInvoiceRemainingAmount(i),
        i.currency
      )}`,
    }));

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
          ${payableInvoices.length > 1
            ? html`
                <div class="col-span-2">
                  <app-select
                    label="${t.viewTexts.payments.labelTargetInvoice}"
                    .value="${inv.id}"
                    .options="${invoiceOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) => {
                      const nextInv = contractInvoices.find((i) => i.id === eventValue(e));
                      if (nextInv) this.openPaymentModal(nextInv);
                    }}"
                  ></app-select>
                </div>
              `
            : ''}

          <div class="col-span-2 pay-summary-card">
            <div class="billing-stat">
              <span class="billing-stat-label">${t.viewTexts.payments.invoiceTotalLabel}</span>
              <span class="billing-stat-val">${formatMoney(inv.totalAmount, inv.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.payments.paidAmount}</span>
              <span class="billing-stat-val" style="color: #10b981;">
                ${formatMoney(paidSoFar, inv.currency)}
              </span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.payments.remainingDue}</span>
              <span class="billing-stat-val" style="color: #f59e0b;">
                ${formatMoney(remainingBefore, inv.currency)}
              </span>
            </div>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.payments.paymentAmountLabel(inv.currency)}"
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
              <app-button
                class="quick-term-btn"
                size="sm"
                variant="icon"
                @click="${() => {
                  this.payAmount = Math.max(1, Math.round(remainingBefore * 0.25));
                  this.payError = '';
                }}"
              >
                <span>25%</span>
              </app-button>
              <app-button
                class="quick-term-btn"
                size="sm"
                variant="icon"
                @click="${() => {
                  this.payAmount = Math.max(1, Math.round(remainingBefore * 0.5));
                  this.payError = '';
                }}"
              >
                <span>50%</span>
              </app-button>
              <app-button
                class="quick-term-btn"
                size="sm"
                variant="icon"
                @click="${() => {
                  this.payAmount = remainingBefore;
                  this.payError = '';
                }}"
              >
                <span>${t.viewTexts.payments.fullDueButton}</span>
              </app-button>
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
              placeholder="${t.viewTexts.payments.payDocPlaceholder}"
              .value="${this.payDocNumber}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.payDocNumber = eventValue(e))}"
            ></app-input>
          </div>

          <div class="col-span-2 pay-preview-result">
            <span>
              ${t.viewTexts.payments.afterPaymentLabel}
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

  private renderDeletePaymentModal(
    t: ReturnType<typeof getTranslation>
  ) {
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
    const today = new Date().toISOString().slice(0, 10);
    const remaining = store.getInvoiceRemainingAmount(inv);
    const seq = this.payments.length + 1;

    this.paymentInvoiceId = inv.id;
    this.payAmount = remaining > 0 ? remaining : inv.totalAmount;
    this.payDate = today;
    this.payMethod = 'bank_transfer';
    this.payDocNumber = `ПП-${today.slice(0, 4)}/${String(840 + seq).padStart(4, '0')}`;
    this.payNotes = getTranslation(this.currentLang).viewTexts.payments.payNotesTemplate(inv.number);
    this.payError = '';
    this.paymentModalOpen = true;
  }

  private handleSavePayment(inv: Invoice) {
    const amount = Number(this.payAmount) || 0;
    if (amount <= 0) {
      this.payError = getTranslation(this.currentLang).viewTexts.payments.amountError;
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

  private renderEditContractModal() {
    return html`
      <app-contract-form
        .open="${this.contractModalOpen}"
        .contract="${this.editingContract}"
        @close="${() => (this.contractModalOpen = false)}"
        @saved="${() => (this.contractModalOpen = false)}"
      ></app-contract-form>
    `;
  }

  private renderDeleteContractModal(ctr: Contract, t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${this.confirmDeleteContractOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.contractDelete.title}"
        action="${t.viewTexts.confirmDialogs.contractDelete.action(ctr.number)}"
        result="${t.viewTexts.confirmDialogs.contractDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteContractOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteContractOpen = false;
          store.deleteContract(ctr.id);
        }}"
      ></app-confirm-dialog>
    `;
  }

  private getDefaultPeriodForFrequency(freq: CalculationFrequency): { start: string; end: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (freq === 'weekly') {
      const day = now.getDay();
      const diffToMon = (day + 6) % 7;
      const mon = new Date(y, m, now.getDate() - diffToMon);
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      return { start: toIso(mon), end: toIso(sun) };
    }
    if (freq === 'biweekly') {
      const end = new Date(y, m, now.getDate());
      const start = new Date(y, m, now.getDate() - 13);
      return { start: toIso(start), end: toIso(end) };
    }
    if (freq === 'quarterly') {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qStartMonth, 1);
      const end = new Date(y, qStartMonth + 3, 0);
      return { start: toIso(start), end: toIso(end) };
    }
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start: toIso(start), end: toIso(end) };
  }

  private openCreateCalculationModal(ctr: Contract) {
    const freq = ctr.billingFrequency || 'monthly';
    const { start, end } = this.getDefaultPeriodForFrequency(freq);
    const seq = this.calculations.length + 1;

    const tx = getTranslation(this.currentLang).viewTexts;
    this.editingCalcId = null;
    this.calcNumber = `${tx.calculations.calcNumberPrefix}${new Date().getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.calcFrequency = freq;
    this.calcPeriodStart = start;
    this.calcPeriodEnd = end;
    this.calcIncludePrior = true;
    this.calcStatus = 'draft';
    this.calcError = '';
    this.calcNotes = tx.calculations.calcNotesTemplate(ctr.number, start, end);

    this.calcItems = this.collectItemsForPeriod(ctr, start, end, true, null);
    this.calcModalOpen = true;
  }

  private openEditCalculationModal(calc: Calculation) {
    this.editingCalcId = calc.id;
    this.calcNumber = calc.number;
    this.calcFrequency = calc.frequency;
    this.calcPeriodStart = calc.periodStart;
    this.calcPeriodEnd = calc.periodEnd;
    this.calcIncludePrior = calc.includePriorUnaccounted;
    this.calcStatus = calc.status;
    this.calcItems = calc.items.map((item) => ({ ...item }));
    this.calcNotes = calc.notes;
    this.calcError = '';
    this.calcModalOpen = true;
  }

  private applyCalculationPeriodPreset(
    ctr: Contract,
    preset: 'this_week' | 'prev_week' | 'this_month' | 'prev_month' | 'this_quarter'
  ) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (preset === 'this_week' || preset === 'prev_week') {
      const day = now.getDay();
      const diffToMon = (day + 6) % 7;
      const offset = preset === 'prev_week' ? -7 : 0;
      const mon = new Date(y, m, now.getDate() - diffToMon + offset);
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      this.calcFrequency = 'weekly';
      this.calcPeriodStart = toIso(mon);
      this.calcPeriodEnd = toIso(sun);
    } else if (preset === 'this_month' || preset === 'prev_month') {
      const targetMonth = preset === 'prev_month' ? m - 1 : m;
      const start = new Date(y, targetMonth, 1);
      const end = new Date(y, targetMonth + 1, 0);
      this.calcFrequency = 'monthly';
      this.calcPeriodStart = toIso(start);
      this.calcPeriodEnd = toIso(end);
    } else {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qStartMonth, 1);
      const end = new Date(y, qStartMonth + 3, 0);
      this.calcFrequency = 'quarterly';
      this.calcPeriodStart = toIso(start);
      this.calcPeriodEnd = toIso(end);
    }

    this.refreshCalculationItemsForPeriod(ctr);
  }

  private refreshCalculationItemsForPeriod(ctr: Contract) {
    const collected = this.collectItemsForPeriod(
      ctr,
      this.calcPeriodStart,
      this.calcPeriodEnd,
      this.calcIncludePrior,
      this.editingCalcId
    );
    const manualItems = this.calcItems.filter((i) => i.itemType === 'manual');
    this.calcItems = [...collected, ...manualItems].sort((a, b) => a.date.localeCompare(b.date));
  }

  private addEmptyCalcItem(billable: boolean) {
    const date = this.calcPeriodEnd || new Date().toISOString().slice(0, 10);
    this.calcItems = [
      ...this.calcItems,
      {
        id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        itemType: 'manual',
        date,
        title: '',
        quantity: 1,
        unit: 'усл.',
        billable,
        baseRate: 0,
        unitPrice: 0,
        amount: 0,
      },
    ];
  }

  private updateCalcItem(id: string, patch: Partial<CalculationItem>) {
    this.calcItems = this.calcItems.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      const qty = Math.max(0, Number(next.quantity) || 0);
      next.quantity = qty;
      const baseRate = Math.max(0, Number(next.baseRate) || 0);
      next.baseRate = baseRate;
      if (next.billable) {
        const rate = baseRate > 0 ? baseRate : next.unit === 'ч' ? HOURLY_RATE_RUB : 0;
        next.baseRate = rate;
        next.unitPrice = rate;
        next.amount = Math.round(qty * rate);
      } else {
        next.unitPrice = 0;
        next.amount = 0;
      }
      return next;
    });
  }

  private handleSaveCalculation(ctr: Contract) {
    if (!this.calcNumber.trim()) {
      this.calcError = getTranslation(this.currentLang).common.required;
      return;
    }

    const cleanItems = this.calcItems
      .filter((i) => i.title.trim())
      .map((i) => ({
        ...i,
        title: i.title.trim(),
        unitPrice: i.billable ? i.unitPrice : 0,
        amount: i.billable ? i.amount : 0,
      }));

    if (cleanItems.length === 0) {
      this.calcError = getTranslation(this.currentLang).viewTexts.calculations.addOneItemError;
      return;
    }

    const hourItems = cleanItems.filter((i) => i.unit === 'ч');
    const billableHours = Math.round(hourItems.filter((i) => i.billable).reduce((s, i) => s + i.quantity, 0) * 100) / 100;
    const nonBillableHours =
      Math.round(hourItems.filter((i) => !i.billable).reduce((s, i) => s + i.quantity, 0) * 100) / 100;
    const totalHours = Math.round((billableHours + nonBillableHours) * 100) / 100;
    const billableAmount = cleanItems.filter((i) => i.billable).reduce((s, i) => s + i.amount, 0);

    const existing = this.editingCalcId
      ? this.calculations.find((c) => c.id === this.editingCalcId)
      : undefined;
    const approvedDate =
      this.calcStatus === 'approved' || this.calcStatus === 'invoiced'
        ? existing?.approvedDate || new Date().toISOString().slice(0, 10)
        : undefined;

    const payload = {
      number: this.calcNumber.trim(),
      contractId: ctr.id,
      projectId: ctr.projectId,
      companyId: ctr.companyId,
      counterpartyId: ctr.counterpartyId,
      frequency: this.calcFrequency,
      periodStart: this.calcPeriodStart || new Date().toISOString().slice(0, 10),
      periodEnd: this.calcPeriodEnd || new Date().toISOString().slice(0, 10),
      includePriorUnaccounted: this.calcIncludePrior,
      currency: ctr.currency,
      status: this.calcStatus,
      totalHours,
      billableHours,
      nonBillableHours,
      billableAmount,
      items: cleanItems,
      notes: this.calcNotes.trim(),
      approvedDate,
      invoiceId: existing?.invoiceId,
    };

    if (this.editingCalcId) {
      store.updateCalculation({
        id: this.editingCalcId,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      });
    } else {
      store.addCalculation(payload);
    }

    this.calcModalOpen = false;
  }

  private openInvoiceFromCalculation(ctr: Contract, calc: Calculation) {
    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + 14);
    const seq = this.invoices.length + 1;

    this.editingInvoiceId = null;
    this.invNumber = `${getTranslation(this.currentLang).viewTexts.contractDetail.invNumberPrefix}${today.getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.invCalculationId = calc.id;
    this.invIssueDate = today.toISOString().slice(0, 10);
    this.invDueDate = due.toISOString().slice(0, 10);
    this.invStatus = 'issued';
    this.invVatRate = 20;
    this.invError = '';

    this.populateInvoiceLinesFromCalculation(ctr, calc);
    this.invoiceModalOpen = true;
  }

  private populateInvoiceLinesFromCalculation(ctr: Contract, calc: Calculation) {
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
          title: getTranslation(this.currentLang).viewTexts.contractDetail.calcWorksTitle(
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

    this.invNotes = getTranslation(this.currentLang).viewTexts.contractDetail.invNotesCalc(
      ctr.number,
      calc.number,
      calc.periodStart,
      calc.periodEnd,
      nonBillableCount
    );
  }

  private openCreateInvoiceModal(ctr: Contract, autoPullProject = false) {
    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + 14);
    const seq = this.invoices.length + 1;

    const approvedReadyCalc = this.calculations.find(
      (c) => c.contractId === ctr.id && c.status === 'approved' && !c.invoiceId
    );

    if (approvedReadyCalc && !autoPullProject) {
      this.openInvoiceFromCalculation(ctr, approvedReadyCalc);
      return;
    }

    this.editingInvoiceId = null;
    this.invNumber = `${getTranslation(this.currentLang).viewTexts.contractDetail.invNumberPrefix}${today.getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.invCalculationId = '';
    this.invIssueDate = today.toISOString().slice(0, 10);
    this.invDueDate = due.toISOString().slice(0, 10);
    this.invStatus = 'issued';
    this.invVatRate = 20;
    this.invNotes = getTranslation(this.currentLang).viewTexts.contractDetail.invNotesContract(
      ctr.number,
      ctr.startDate
    );
    this.invError = '';

    const otherInvoiced = this.invoices
      .filter((i) => i.contractId === ctr.id && i.status !== 'cancelled')
      .reduce((s, i) => s + i.totalAmount, 0);
    const suggestedNet =
      ctr.amount > 0 ? Math.max(0, Math.round((ctr.amount - otherInvoiced) / 1.2)) : 100000;

    if (autoPullProject && ctr.projectId) {
      this.invItems = [];
      this.pullUnbilledFromProject(ctr);
      if (this.invItems.length === 0) {
        this.invItems = [
          {
            id: `ili-${Date.now()}`,
            title: getTranslation(this.currentLang).viewTexts.contractDetail.stageTitleWorks(ctr.title),
            quantity: 1,
            unit: 'этап',
            unitPrice: suggestedNet,
            amount: suggestedNet,
            sourceType: 'manual',
          },
        ];
      }
    } else {
      this.invItems = [
        {
          id: `ili-${Date.now()}`,
          title: getTranslation(this.currentLang).viewTexts.contractDetail.stageTitlePayment(ctr.title),
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
    this.invNumber = inv.number;
    this.invCalculationId = inv.calculationId || '';
    this.invIssueDate = inv.issueDate;
    this.invDueDate = inv.dueDate;
    this.invStatus = inv.status;
    this.invVatRate = inv.vatRate;
    this.invItems = inv.items.map((item) => ({ ...item }));
    this.invNotes = inv.notes;
    this.invError = '';
    this.invoiceModalOpen = true;
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

  private pullUnbilledFromProject(ctr: Contract) {
    const { timeEntries, expenses } = this.getUnbilledProjectSources(ctr);
    const added: InvoiceLineItem[] = [];

    for (const te of timeEntries) {
      const task = store.tasks.find((t) => t.id === te.taskId);
      const user = store.users.find((u) => u.id === te.userId);
      const rate = user?.hourlyRate || HOURLY_RATE_RUB;
      const amount = Math.round(te.hours * rate);
      added.push({
        id: `ili-te-${te.id}`,
        title: getTranslation(this.currentLang).viewTexts.contractDetail.laborItemTitle(
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
      const amountRub = this.convertAmountToCurrency(ex.amount, ex.currency, ctr.currency);
      added.push({
        id: `ili-ex-${ex.id}`,
        title: getTranslation(this.currentLang).viewTexts.contractDetail.expenseItemTitle(ex.title),
        quantity: 1,
        unit: 'усл.',
        unitPrice: amountRub,
        amount: amountRub,
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

  private handleSaveInvoice(ctr: Contract) {
    if (!this.invNumber.trim()) {
      this.invError = getTranslation(this.currentLang).common.required;
      return;
    }

    const cleanItems = this.invItems
      .filter((i) => i.title.trim())
      .map((i) => ({ ...i, title: i.title.trim() }));

    if (cleanItems.length === 0) {
      this.invError = getTranslation(this.currentLang).viewTexts.calculations.addOneItemError;
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

  private openEditContractModal(ctr: Contract) {
    this.editingContract = ctr;
    this.contractModalOpen = true;
  }
}