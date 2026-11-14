import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  CalculationFrequency,
  CalculationItem,
  CalculationStatus,
  Contract,
  ContractStatus,
  ContractType,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
} from '../../../types';
import {
  iconCheck,
  iconChevronLeft,
  iconEdit,
  iconFileText,
  iconFolder,
  iconPlus,
  iconReceipt,
  iconSend,
  iconTable,
  iconTrash,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import styles from './app-contract-detail.css';

const HOURLY_RATE_RUB = 3200;

@customElement('app-contract-detail')
export class AppContractDetail extends LitElement {
  @state() private contracts: Contract[] = store.contracts;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private detailContractId: string = store.detailContractId || store.contracts[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private calcFilter: 'all' | 'pending' | 'approved' | 'invoiced' = 'all';
  @state() private invoiceFilter: 'all' | 'unpaid' | 'paid' | 'draft' = 'all';

  // Edit Contract modal
  @state() private contractModalOpen = false;
  @state() private ctrNumber = '';
  @state() private ctrTitle = '';
  @state() private ctrType: ContractType = 'service';
  @state() private ctrCompanyId = '';
  @state() private ctrCounterpartyId = '';
  @state() private ctrProjectId = '';
  @state() private ctrOwnerId = '';
  @state() private ctrAmount = 0;
  @state() private ctrCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private ctrStartDate = '';
  @state() private ctrEndDate = '';
  @state() private ctrStatus: ContractStatus = 'active';
  @state() private ctrBillingFrequency: CalculationFrequency = 'monthly';
  @state() private ctrDescription = '';
  @state() private ctrError = '';
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

  private formatMoney(amount: number, currency: 'RUB' | 'USD' | 'EUR'): string {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
    return `${Math.round(amount).toLocaleString('ru-RU')} ${symbol}`;
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

  private getContractStatusMeta(
    status: ContractStatus,
    isRu: boolean
  ): { label: string; variant: 'default' | 'warning' | 'success' | 'info' | 'danger' } {
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

  private getInvoiceStatusVariant(
    status: InvoiceStatus
  ): 'default' | 'warning' | 'success' | 'info' | 'danger' {
    switch (status) {
      case 'paid':
        return 'success';
      case 'sent':
        return 'info';
      case 'issued':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
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
    const isRu = this.currentLang === 'ru';
    const ctr = this.contracts.find((c) => c.id === this.detailContractId) || null;

    if (!ctr) {
      return html`
        <div class="page-shell">
          <div class="empty-state">
            <span>${isRu ? 'Договор не найден' : 'Contract not found'}</span>
            <app-button variant="primary" @click="${() => store.setActiveView('contracts')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.contractDetail.backToContracts}</span>
            </app-button>
          </div>
        </div>
      `;
    }

    const company = store.companies.find((c) => c.id === ctr.companyId);
    const counterparty = store.counterparties.find((c) => c.id === ctr.counterpartyId);
    const project = ctr.projectId ? store.projects.find((p) => p.id === ctr.projectId) : undefined;
    const owner = ctr.ownerId ? store.users.find((u) => u.id === ctr.ownerId) : undefined;
    const statusMeta = this.getContractStatusMeta(ctr.status, isRu);
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
    const paidTotal = activeInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((s, inv) => s + inv.totalAmount, 0);
    const remainingLimit = Math.max(0, ctr.amount - invoicedTotal);

    const invoicedPct = ctr.amount > 0 ? Math.min(100, Math.round((invoicedTotal / ctr.amount) * 100)) : 0;
    const paidPct = ctr.amount > 0 ? Math.min(100, Math.round((paidTotal / ctr.amount) * 100)) : 0;

    const visibleInvoices = contractInvoices.filter((inv) => {
      if (this.invoiceFilter === 'paid') return inv.status === 'paid';
      if (this.invoiceFilter === 'draft') return inv.status === 'draft';
      if (this.invoiceFilter === 'unpaid') {
        return inv.status === 'issued' || inv.status === 'sent' || inv.status === 'overdue';
      }
      return true;
    });

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
                  store.openContractDetail(e.detail.value)}"
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

            <button
              type="button"
              class="icon-btn danger"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteContractOpen = true)}"
            >
              ${iconTrash(15)}
            </button>
          </div>
        </div>

        <!-- Contract Overview -->
        <section class="overview-card">
          <div class="title-block">
            <div class="title-row">
              <span class="contract-key">${ctr.number}</span>
              <h1 class="contract-title">${ctr.title}</h1>
              <app-badge variant="${statusMeta.variant}" appearance="soft">
                ${statusMeta.label}
              </app-badge>
            </div>
            <div class="contract-meta-inline">
              <span>${this.getTypeLabel(ctr.type, isRu)}</span>
              <span aria-hidden="true">·</span>
              <span class="mono">${ctr.startDate} → ${ctr.endDate}</span>
              <span aria-hidden="true">·</span>
              <span>${isRu ? 'Периодичность калькуляции' : 'Billing cycle'}: <strong>${freqLabel}</strong></span>
              ${owner ? html`<span aria-hidden="true">·</span><span>${owner.name}</span>` : ''}
            </div>
            <p class="contract-desc">${ctr.description || '—'}</p>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>
                ${isRu ? 'Финансовое исполнение договора' : 'Contract Billing Progress'}
                (${isRu ? 'оплачено' : 'paid'} ${paidPct}% · ${isRu ? 'выставлено' : 'invoiced'} ${invoicedPct}%)
              </span>
              <span class="mono">
                ${this.formatMoney(paidTotal, ctr.currency)} / ${this.formatMoney(ctr.amount, ctr.currency)}
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-invoiced" style="width: ${invoicedPct}%;"></div>
              <div class="progress-paid" style="width: ${paidPct}%;"></div>
            </div>
          </div>

          <div class="meta-strip">
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Исполнитель (наша компания)' : 'Company'}</span>
              <span class="meta-val">${company?.name || '—'}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Заказчик (контрагент)' : 'Counterparty'}</span>
              <span class="meta-val">${counterparty?.name || '—'}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Связанный проект' : 'Linked Project'}</span>
              ${project
                ? html`
                    <button
                      type="button"
                      class="link-btn"
                      @click="${() => store.openProjectDetail(project.id)}"
                    >
                      [${project.key}] ${project.name}
                    </button>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.contractAmount}</span>
              <span class="meta-val mono">${this.formatMoney(ctr.amount, ctr.currency)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.invoicedTotal}</span>
              <span class="meta-val mono">${this.formatMoney(invoicedTotal, ctr.currency)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.remainingLimit}</span>
              <span class="meta-val mono">${this.formatMoney(remainingLimit, ctr.currency)}</span>
            </div>
          </div>
        </section>

        <!-- Step 1: Periodic Calculations (Client Work & Expense Reports) -->
        <section class="section-card">
          <div class="section-header">
            <h2 class="section-title">
              ${iconTable()}
              <span>${t.contractDetail.calculationsTitle}</span>
              <span class="section-sub">(${contractCalculations.length})</span>
            </h2>

            <div class="section-actions">
              <app-segmented-switch
                size="sm"
                .value="${this.calcFilter}"
                .options="${[
                  { value: 'all', label: isRu ? 'Все' : 'All' },
                  { value: 'pending', label: isRu ? 'В работе / На соглас.' : 'Pending' },
                  { value: 'approved', label: isRu ? 'Согласованы' : 'Approved' },
                  { value: 'invoiced', label: isRu ? 'Со счётом' : 'Invoiced' },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.calcFilter = e.detail.value as 'all' | 'pending' | 'approved' | 'invoiced')}"
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
          </div>

          ${visibleCalculations.length === 0
            ? html`
                <div class="empty-state">
                  <span>${t.contractDetail.noCalculations}</span>
                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.openCreateCalculationModal(ctr)}"
                  >
                    <span slot="icon-start">${iconPlus(14)}</span>
                    <span>${t.contractDetail.createCalculation}</span>
                  </app-button>
                </div>
              `
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${isRu ? 'Калькуляция' : 'Calculation #'}</th>
                        <th>${isRu ? 'Период / График' : 'Period / Cycle'}</th>
                        <th>${isRu ? 'Состав отчёта' : 'Report Scope'}</th>
                        <th>${isRu ? 'Часы (Bill / 0 ₽)' : 'Hours (Bill / 0)'}</th>
                        <th>${isRu ? 'К оплате (без НДС)' : 'Billable Subtotal'}</th>
                        <th>${isRu ? 'Статус' : 'Status'}</th>
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
                                @click="${() => (this.previewCalculation = calc)}"
                              >
                                ${iconFileText(14)}
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
                                  ? html` · <span style="color: #f59e0b;">+${priorCount} ${isRu ? 'прошл.' : 'prior'}</span>`
                                  : ''}
                              </div>
                            </td>
                            <td>
                              <div class="items-summary" title="${calc.items[0]?.title || ''}">
                                ${calc.items[0]?.title || '—'}
                              </div>
                              <div style="font-size: 0.73rem; color: var(--text-muted);">
                                ${calc.items.length} ${isRu ? 'поз.' : 'items'}
                                ${nonBillableCount > 0
                                  ? ` · ${nonBillableCount} ${isRu ? 'по 0 ₽' : 'zero-rate'}`
                                  : ''}
                              </div>
                            </td>
                            <td class="mono" style="white-space: nowrap;">
                              <span>${calc.billableHours.toFixed(1)} ч</span>
                              ${calc.nonBillableHours > 0
                                ? html`<span style="color: var(--text-muted);"> + ${calc.nonBillableHours.toFixed(1)} ч (0 ₽)</span>`
                                : ''}
                            </td>
                            <td class="mono" style="font-weight: 700; white-space: nowrap;">
                              ${this.formatMoney(calc.billableAmount, calc.currency)}
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
                                        class="icon-btn"
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
                                        class="icon-btn approve"
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
                                ${calc.status === 'approved'
                                  ? html`
                                      <button
                                        type="button"
                                        class="icon-btn approve"
                                        title="${t.calculations.createInvoiceFromCalc}"
                                        @click="${() => this.openInvoiceFromCalculation(ctr, calc)}"
                                      >
                                        ${iconReceipt(14)}
                                      </button>
                                    `
                                  : ''}
                                <button
                                  type="button"
                                  class="icon-btn"
                                  title="${t.common.edit}"
                                  @click="${() => this.openEditCalculationModal(calc)}"
                                >
                                  ${iconEdit(14)}
                                </button>
                                <button
                                  type="button"
                                  class="icon-btn danger"
                                  title="${t.common.delete}"
                                  @click="${() => (this.deletingCalculation = calc)}"
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
        </section>

        <!-- Step 2: Contract Invoices & Invoicing Procedure -->
        <section class="section-card">
          <div class="section-header">
            <h2 class="section-title">
              ${iconReceipt(19)}
              <span>${t.contractDetail.invoicesTitle}</span>
              <span class="section-sub">(${contractInvoices.length})</span>
            </h2>

            <div class="section-actions">
              <app-segmented-switch
                size="sm"
                .value="${this.invoiceFilter}"
                .options="${[
                  { value: 'all', label: isRu ? 'Все' : 'All' },
                  { value: 'unpaid', label: isRu ? 'К оплате' : 'Unpaid' },
                  { value: 'paid', label: isRu ? 'Оплачены' : 'Paid' },
                  { value: 'draft', label: isRu ? 'Черновики' : 'Drafts' },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.invoiceFilter = e.detail.value as 'all' | 'unpaid' | 'paid' | 'draft')}"
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
          </div>

          <div class="billing-strip">
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.contractAmount}</span>
              <span class="billing-stat-val">${this.formatMoney(ctr.amount, ctr.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.invoicedTotal}</span>
              <span class="billing-stat-val">${this.formatMoney(invoicedTotal, ctr.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.paidTotal}</span>
              <span class="billing-stat-val" style="color: #10b981;">
                ${this.formatMoney(paidTotal, ctr.currency)}
              </span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.remainingLimit}</span>
              <span class="billing-stat-val">${this.formatMoney(remainingLimit, ctr.currency)}</span>
            </div>
          </div>

          ${visibleInvoices.length === 0
            ? html`
                <div class="empty-state">
                  <span>${t.contractDetail.noInvoices}</span>
                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.openCreateInvoiceModal(ctr)}"
                  >
                    <span slot="icon-start">${iconPlus(14)}</span>
                    <span>${t.contractDetail.issueInvoice}</span>
                  </app-button>
                </div>
              `
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${isRu ? 'Номер' : 'Invoice #'}</th>
                        <th>${isRu ? 'Выставлен / Срок' : 'Issued / Due'}</th>
                        <th>${isRu ? 'Позиции и основание' : 'Items & Basis'}</th>
                        <th>${isRu ? 'Без НДС' : 'Subtotal'}</th>
                        <th>${isRu ? 'НДС' : 'VAT'}</th>
                        <th>${isRu ? 'Итого к оплате' : 'Total'}</th>
                        <th>${isRu ? 'Статус' : 'Status'}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${visibleInvoices.map((inv) => {
                        const sourceCalc = inv.calculationId
                          ? this.calculations.find((c) => c.id === inv.calculationId)
                          : undefined;
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
                              <div>${inv.issueDate}</div>
                              <div style="color: var(--text-muted);">→ ${inv.dueDate}</div>
                            </td>
                            <td>
                              <div class="items-summary" title="${inv.items[0]?.title || ''}">
                                ${inv.items[0]?.title || '—'}
                              </div>
                              <div style="font-size: 0.73rem; color: var(--text-muted); display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                <span>${inv.items.length} ${isRu ? 'поз.' : 'items'}</span>
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
                                ${inv.paidDate ? html`<span>· ${isRu ? 'оплачен' : 'paid'} ${inv.paidDate}</span>` : ''}
                              </div>
                            </td>
                            <td class="mono" style="white-space: nowrap;">
                              ${this.formatMoney(inv.subtotal, inv.currency)}
                            </td>
                            <td class="mono" style="white-space: nowrap; color: var(--text-secondary);">
                              ${inv.vatRate}% (${this.formatMoney(inv.vatAmount, inv.currency)})
                            </td>
                            <td class="mono" style="font-weight: 700; white-space: nowrap;">
                              ${this.formatMoney(inv.totalAmount, inv.currency)}
                            </td>
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
                                        class="icon-btn approve"
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
                                        class="icon-btn"
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
                                        class="icon-btn approve"
                                        title="${t.invoices.markPaid}"
                                        @click="${() => store.updateInvoiceStatus(inv.id, 'paid')}"
                                      >
                                        ${iconCheck(14)}
                                      </button>
                                    `
                                  : ''}
                                <button
                                  type="button"
                                  class="icon-btn"
                                  title="${t.common.edit}"
                                  @click="${() => this.openEditInvoiceModal(inv)}"
                                >
                                  ${iconEdit(14)}
                                </button>
                                <button
                                  type="button"
                                  class="icon-btn danger"
                                  title="${t.common.delete}"
                                  @click="${() => (this.deletingInvoice = inv)}"
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
        </section>

        <!-- Secondary Context: Legal Parties & Linked Project Billing -->
        <div class="secondary-grid">
          <section class="section-card">
            <div class="section-header">
              <h2 class="section-title">
                ${iconFileText(18)}
                <span>${t.contractDetail.partiesTitle}</span>
              </h2>
            </div>

            <div class="party-list">
              <div class="party-block">
                <span class="party-role">${isRu ? 'Поставщик / Исполнитель' : 'Supplier / Our Company'}</span>
                <span class="party-name">${company?.legalName || company?.name || '—'}</span>
                <span class="party-sub mono">
                  ${isRu ? 'ИНН' : 'INN'}: ${company?.inn || '—'}
                  ${company?.kpp ? ` · ${isRu ? 'КПП' : 'KPP'}: ${company.kpp}` : ''}
                </span>
                <span class="party-sub">${company?.city || ''} · ${company?.email || ''}</span>
              </div>

              <div class="party-block">
                <span class="party-role">${isRu ? 'Заказчик / Плательщик' : 'Client / Counterparty'}</span>
                <span class="party-name">${counterparty?.legalName || counterparty?.name || '—'}</span>
                <span class="party-sub mono">
                  ${isRu ? 'ИНН' : 'INN'}: ${counterparty?.inn || '—'}
                  ${counterparty?.kpp ? ` · ${isRu ? 'КПП' : 'KPP'}: ${counterparty.kpp}` : ''}
                </span>
                <span class="party-sub">
                  ${counterparty?.contactPerson || ''} · ${counterparty?.email || ''}
                </span>
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-header">
              <h2 class="section-title">
                ${iconFolder(18)}
                <span>${t.contractDetail.projectLinkTitle}</span>
              </h2>
              ${project
                ? html`
                    <app-button
                      size="sm"
                      variant="ghost"
                      @click="${() => store.openProjectDetail(project.id)}"
                    >
                      ${isRu ? 'Открыть проект' : 'Open Project'}
                    </app-button>
                  `
                : ''}
            </div>

            ${!project
              ? html`
                  <div class="empty-state">
                    <span>${isRu ? 'К договору не привязан проект' : 'No project linked to this contract'}</span>
                  </div>
                `
              : html`
                  <div class="party-list">
                    <div class="party-block">
                      <span class="party-role">${isRu ? 'Проект' : 'Project'}</span>
                      <span class="party-name">[${project.key}] ${project.name}</span>
                      <span class="party-sub">
                        ${isRu ? 'Прогресс' : 'Progress'}: <span class="mono">${project.progress}%</span>
                        · ${isRu ? 'Дедлайн' : 'Due'}: <span class="mono">${project.dueDate}</span>
                      </span>
                    </div>

                    <div class="party-block">
                      <span class="party-role">
                        ${isRu
                          ? 'Неучтённые работы и расходы по проекту (ещё не в калькуляциях)'
                          : 'Unaccounted Project Works & Expenses'}
                      </span>
                      <span class="party-name mono">
                        ${unaccountedTotalHours.toFixed(1)} ч (${unaccountedBillableHours.toFixed(1)} billable + ${unaccountedNonBillableHours.toFixed(1)} non-billable)
                        · ${unaccounted.expenses.length} ${isRu ? 'расходов' : 'expenses'}
                      </span>
                      <span class="party-sub">
                        ${isRu
                          ? 'Попадают в периодическую калькуляцию (non-billable — с ценой 0 ₽)'
                          : 'Included in periodic calculations (non-billable items at zero rate)'}
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
          </section>
        </div>
      </div>

      ${this.renderCalculationFormModal(ctr, t, isRu)}
      ${this.renderCalculationPreviewModal(ctr, t, isRu)}
      ${this.renderDeleteCalculationModal(isRu)}
      ${this.renderInvoiceFormModal(ctr, t, isRu)}
      ${this.renderInvoicePreviewModal(ctr, t, isRu)}
      ${this.renderDeleteInvoiceModal(isRu)}
      ${this.renderEditContractModal(isRu)}
      ${this.renderDeleteContractModal(ctr, isRu)}
    `;
  }

  private renderCalculationFormModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
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
        size="lg"
        title="${this.editingCalcId
          ? t.calculations.editCalculation
          : `${t.calculations.newCalculation} · ${ctr.number}`}"
        @close="${() => (this.calcModalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'Номер калькуляции' : 'Calculation Number'}"
              .value="${this.calcNumber}"
              required
              error="${this.calcError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.calcNumber = e.detail.value;
                this.calcError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Периодичность' : 'Frequency'}"
              .value="${this.calcFrequency}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.calcFrequency = e.detail.value as CalculationFrequency)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Начало периода' : 'Period Start'}"
              .value="${this.calcPeriodStart}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.calcPeriodStart = e.detail.value;
                this.refreshCalculationItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Окончание периода' : 'Period End'}"
              .value="${this.calcPeriodEnd}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.calcPeriodEnd = e.detail.value;
                this.refreshCalculationItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div class="col-span-2 quick-term-row">
            <button type="button" class="quick-term-btn" @click="${() => this.applyCalculationPeriodPreset(ctr, 'this_week')}">
              ${isRu ? 'Текущая неделя' : 'This Week'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyCalculationPeriodPreset(ctr, 'prev_week')}">
              ${isRu ? 'Прошлая неделя' : 'Last Week'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyCalculationPeriodPreset(ctr, 'this_month')}">
              ${isRu ? 'Текущий месяц' : 'This Month'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyCalculationPeriodPreset(ctr, 'prev_month')}">
              ${isRu ? 'Прошлый месяц' : 'Last Month'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyCalculationPeriodPreset(ctr, 'this_quarter')}">
              ${isRu ? 'Текущий квартал' : 'This Quarter'}
            </button>
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
              <span class="calc-summary-label">${isRu ? 'Позиций (из прошлых)' : 'Items (prior)'}</span>
              <span class="calc-summary-val">
                ${this.calcItems.length} (${priorItemsCount})
              </span>
            </div>
            <div class="calc-summary-item">
              <span class="calc-summary-label">${isRu ? 'Billable часы' : 'Billable Hours'}</span>
              <span class="calc-summary-val" style="color: #10b981;">${billableHours.toFixed(1)} ч</span>
            </div>
            <div class="calc-summary-item">
              <span class="calc-summary-label">${isRu ? 'Non-billable (0 ₽)' : 'Non-billable (0)'}</span>
              <span class="calc-summary-val" style="color: var(--text-secondary);">
                ${nonBillableHours.toFixed(1)} ч / ${zeroPriceCount} ${isRu ? 'поз.' : 'items'}
              </span>
            </div>
            <div class="calc-summary-item">
              <span class="calc-summary-label">${isRu ? 'Итого по калькуляции' : 'Billable Total'}</span>
              <span class="calc-summary-val">${this.formatMoney(billableAmount, ctr.currency)}</span>
            </div>
          </div>

          <div class="col-span-2 items-editor">
            <div class="items-editor-head">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
                ${isRu ? 'Работы и расходы в отчёте перед клиентом' : 'Works & Expenses in Client Report'} (${this.calcItems.length})
              </span>
              <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                <app-button size="sm" variant="secondary" @click="${() => this.addEmptyCalcItem(true)}">
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${isRu ? 'Доп. позиция' : 'Add Billable'}</span>
                </app-button>
                <app-button size="sm" variant="ghost" @click="${() => this.addEmptyCalcItem(false)}">
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${isRu ? '+ Non-billable (0 ₽)' : '+ Non-billable (0)'}</span>
                </app-button>
              </div>
            </div>

            ${this.calcItems.length === 0
              ? html`<div class="empty-state" style="padding: 1.4rem;">
                  ${isRu
                    ? 'Нет работ или расходов за выбранный период. Выберите другой период или добавьте позицию вручную.'
                    : 'No works or expenses found for this period.'}
                </div>`
              : this.calcItems.map(
                  (item) => html`
                    <div class="calc-editor-row ${!item.billable ? 'is-nonbillable' : ''}">
                      <div class="calc-meta-col">
                        <span class="calc-date-tag">${item.date || '—'}</span>
                        ${item.isPriorPeriod
                          ? html`<span class="micro-tag prior">${t.calculations.priorBadge}</span>`
                          : html`<span class="micro-tag ${item.billable ? 'bill' : 'zero'}">
                              ${item.itemType === 'expense'
                                ? isRu
                                  ? 'Расход'
                                  : 'Expense'
                                : item.itemType === 'time_entry'
                                ? isRu
                                  ? 'Работа'
                                  : 'Work'
                                : isRu
                                ? 'Ручн.'
                                : 'Manual'}
                            </span>`}
                      </div>
                      <div>
                        <app-input
                          size="sm"
                          label="${isRu ? 'Наименование работы / расхода' : 'Description'}"
                          .value="${item.title}"
                          @input="${(e: CustomEvent<{ value: string }>) =>
                            this.updateCalcItem(item.id, { title: e.detail.value })}"
                        ></app-input>
                      </div>
                      <div>
                        <app-number-input
                          size="sm"
                          label="${isRu ? 'Кол-во' : 'Qty'}"
                          .value="${item.quantity}"
                          min="0"
                          step="0.5"
                          @change="${(e: CustomEvent<{ value: number }>) =>
                            this.updateCalcItem(item.id, { quantity: e.detail.value })}"
                        ></app-number-input>
                      </div>
                      <div>
                        <app-input
                          size="sm"
                          label="${isRu ? 'Ед.' : 'Unit'}"
                          .value="${item.unit}"
                          @input="${(e: CustomEvent<{ value: string }>) =>
                            this.updateCalcItem(item.id, { unit: e.detail.value })}"
                        ></app-input>
                      </div>
                      <div class="calc-bill-cell">
                        <app-checkbox
                          ?checked="${item.billable}"
                          label="Billable"
                          @change="${(e: CustomEvent<{ checked: boolean }>) =>
                            this.updateCalcItem(item.id, { billable: e.detail.checked })}"
                        ></app-checkbox>
                      </div>
                      <div>
                        <app-number-input
                          size="sm"
                          label="${item.billable ? (isRu ? 'Ставка / Цена' : 'Rate') : isRu ? 'Цена (0 ₽)' : 'Rate (0)'}"
                          .value="${item.billable ? item.unitPrice : 0}"
                          min="0"
                          step="500"
                          ?disabled="${!item.billable}"
                          @change="${(e: CustomEvent<{ value: number }>) =>
                            this.updateCalcItem(item.id, { baseRate: e.detail.value, unitPrice: e.detail.value })}"
                        ></app-number-input>
                      </div>
                      <div class="item-amount-preview ${!item.billable ? 'is-zero' : ''}">
                        ${this.formatMoney(item.billable ? item.amount : 0, ctr.currency)}
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
                  `
                )}
          </div>

          <div>
            <app-select
              label="${isRu ? 'Статус калькуляции' : 'Calculation Status'}"
              .value="${this.calcStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.calcStatus = e.detail.value as CalculationStatus)}"
            ></app-select>
          </div>
          <div>
            <app-textarea
              label="${isRu ? 'Комментарий к отчёту для клиента' : 'Report Notes'}"
              .value="${this.calcNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.calcNotes = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>

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
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
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
            <div>
              <div style="font-size: 1.15rem; font-weight: 700;" class="mono">
                ${isRu ? 'Калькуляция работ и расходов' : 'Cost & Work Calculation'} № ${calc.number}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${isRu ? 'Период' : 'Period'}: <span class="mono">${calc.periodStart} → ${calc.periodEnd}</span>
                · ${t.calculations.frequencies[calc.frequency]}
                · ${isRu ? 'Договор' : 'Contract'}: ${ctr.number}
              </div>
            </div>
            <app-badge variant="${this.getCalculationStatusVariant(calc.status)}" appearance="soft">
              ${t.calculations.statuses[calc.status]}
            </app-badge>
          </div>

          <div class="sheet-parties">
            <div class="party-block">
              <span class="party-role">${isRu ? 'Исполнитель' : 'Supplier'}</span>
              <span class="party-name">${company?.legalName || company?.name || '—'}</span>
              <span class="party-sub mono">${isRu ? 'ИНН' : 'INN'}: ${company?.inn || '—'}</span>
            </div>
            <div class="party-block">
              <span class="party-role">${isRu ? 'Заказчик (на согласование)' : 'Client (For Approval)'}</span>
              <span class="party-name">${cp?.legalName || cp?.name || '—'}</span>
              <span class="party-sub mono">${isRu ? 'ИНН' : 'INN'}: ${cp?.inn || '—'}</span>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${isRu ? 'Дата' : 'Date'}</th>
                  <th>${isRu ? 'Содержание работы / расхода' : 'Work / Expense'}</th>
                  <th>${isRu ? 'Кол-во' : 'Qty'}</th>
                  <th>${isRu ? 'Тип биллинга' : 'Billing'}</th>
                  <th>${isRu ? 'Цена' : 'Price'}</th>
                  <th>${isRu ? 'Сумма' : 'Amount'}</th>
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
                      <td class="mono" style="white-space: nowrap;">${item.quantity} ${item.unit}</td>
                      <td>
                        <span class="micro-tag ${item.billable ? 'bill' : 'zero'}">
                          ${item.billable ? t.calculations.billableLabel : t.calculations.nonBillableZero}
                        </span>
                      </td>
                      <td class="mono" style="white-space: nowrap;">
                        ${this.formatMoney(item.billable ? item.unitPrice : 0, calc.currency)}
                      </td>
                      <td class="mono" style="font-weight: 700; white-space: nowrap;">
                        ${this.formatMoney(item.billable ? item.amount : 0, calc.currency)}
                      </td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          </div>

          <div class="totals-box">
            <div class="total-line">
              <span>${isRu ? 'Всего трудозатрат (billable / non-billable)' : 'Total Hours (billable / non-billable)'}:</span>
              <span class="mono">
                ${calc.totalHours.toFixed(1)} ч (${calc.billableHours.toFixed(1)} ч / ${calc.nonBillableHours.toFixed(1)} ч)
              </span>
            </div>
            <div class="total-line grand">
              <span>${isRu ? 'Итого к выставлению в счёт (без НДС)' : 'Subtotal to Invoice'}:</span>
              <span class="mono">${this.formatMoney(calc.billableAmount, calc.currency)}</span>
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

  private renderDeleteCalculationModal(isRu: boolean) {
    return html`
      <app-modal
        ?open="${Boolean(this.deletingCalculation)}"
        size="sm"
        title="${isRu ? 'Удалить калькуляцию?' : 'Delete calculation?'}"
        @close="${() => (this.deletingCalculation = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Удалить калькуляцию ${this.deletingCalculation?.number || ''}?`
            : `Delete calculation ${this.deletingCalculation?.number || ''}?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingCalculation = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingCalculation) {
                store.deleteCalculation(this.deletingCalculation.id);
                this.deletingCalculation = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderInvoiceFormModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
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
      { value: '', label: isRu ? 'Без привязки к калькуляции' : 'Standalone invoice' },
      ...availableCalcs.map((c) => ({
        value: c.id,
        label: `${c.number} (${c.periodStart} → ${c.periodEnd} · ${this.formatMoney(c.billableAmount, c.currency)})`,
      })),
    ];

    return html`
      <app-modal
        ?open="${this.invoiceModalOpen}"
        size="lg"
        title="${this.editingInvoiceId ? t.invoices.editInvoice : `${t.invoices.newInvoice} · ${ctr.number}`}"
        @close="${() => (this.invoiceModalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'Номер счёта' : 'Invoice Number'}"
              .value="${this.invNumber}"
              required
              error="${this.invError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.invNumber = e.detail.value;
                this.invError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус счёта' : 'Status'}"
              .value="${this.invStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.invStatus = e.detail.value as InvoiceStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Основание (согласованная калькуляция)' : 'Basis (Approved Calculation)'}"
              .value="${this.invCalculationId}"
              .options="${calcBasisOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.invCalculationId = e.detail.value;
                const chosen = this.calculations.find((c) => c.id === e.detail.value);
                if (chosen) {
                  this.populateInvoiceLinesFromCalculation(ctr, chosen);
                }
              }}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата выставления' : 'Issue Date'}"
              .value="${this.invIssueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.invIssueDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Срок оплаты' : 'Due Date'}"
              .value="${this.invDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.invDueDate = e.detail.value)}"
            ></app-date-input>
            <div class="quick-term-row" style="margin-top: 0.35rem;">
              ${[7, 14, 30].map(
                (days) => html`
                  <button
                    type="button"
                    class="quick-term-btn"
                    @click="${() => this.applyDueDateOffset(days)}"
                  >
                    +${days} ${isRu ? 'дн.' : 'd'}
                  </button>
                `
              )}
            </div>
          </div>
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Ставка НДС' : 'VAT Rate'}"
              .value="${String(this.invVatRate)}"
              .options="${vatOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.invVatRate = Number(e.detail.value) as 0 | 10 | 20)}"
            ></app-select>
          </div>

          ${ctr.projectId && (unbilled.timeEntries.length > 0 || unbilled.expenses.length > 0)
            ? html`
                <div class="col-span-2 autofill-bar">
                  <span class="autofill-info">
                    ${isRu
                      ? `Доступно к включению из проекта: ${unbilledHours.toFixed(1)} ч трудозатрат и ${unbilled.expenses.length} расх.`
                      : `Available unbilled project items: ${unbilledHours.toFixed(1)}h & ${unbilled.expenses.length} expenses`}
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
                ${isRu ? 'Позиции счёта' : 'Invoice Line Items'} (${this.invItems.length})
              </span>
              <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                ${remaining > 0
                  ? html`
                      <app-button
                        size="sm"
                        variant="ghost"
                        @click="${() => this.addRemainingBalanceLine(ctr, remaining)}"
                      >
                        ${isRu
                          ? `+ Остаток (${this.formatMoney(remaining, ctr.currency)})`
                          : `+ Remaining (${this.formatMoney(remaining, ctr.currency)})`}
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
                      label="${isRu ? 'Наименование работ / услуг' : 'Description'}"
                      .value="${item.title}"
                      @input="${(e: CustomEvent<{ value: string }>) =>
                        this.updateLineItem(item.id, { title: e.detail.value })}"
                    ></app-input>
                  </div>
                  <div>
                    <app-number-input
                      size="sm"
                      label="${isRu ? 'Кол-во' : 'Qty'}"
                      .value="${item.quantity}"
                      min="0.25"
                      step="0.5"
                      @change="${(e: CustomEvent<{ value: number }>) =>
                        this.updateLineItem(item.id, { quantity: e.detail.value })}"
                    ></app-number-input>
                  </div>
                  <div>
                    <app-input
                      size="sm"
                      label="${isRu ? 'Ед.' : 'Unit'}"
                      .value="${item.unit}"
                      @input="${(e: CustomEvent<{ value: string }>) =>
                        this.updateLineItem(item.id, { unit: e.detail.value })}"
                    ></app-input>
                  </div>
                  <div>
                    <app-number-input
                      size="sm"
                      label="${isRu ? 'Цена' : 'Unit Price'}"
                      .value="${item.unitPrice}"
                      min="0"
                      step="1000"
                      @change="${(e: CustomEvent<{ value: number }>) =>
                        this.updateLineItem(item.id, { unitPrice: e.detail.value })}"
                    ></app-number-input>
                  </div>
                  <div class="item-amount-preview">${this.formatMoney(item.amount, ctr.currency)}</div>
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
              <span>${isRu ? 'Подытог (без НДС)' : 'Subtotal'}:</span>
              <span class="mono">${this.formatMoney(subtotal, ctr.currency)}</span>
            </div>
            <div class="total-line">
              <span>${isRu ? `НДС (${this.invVatRate}%)` : `VAT (${this.invVatRate}%)`}:</span>
              <span class="mono">${this.formatMoney(vatAmount, ctr.currency)}</span>
            </div>
            <div class="total-line grand">
              <span>${isRu ? 'Итого к оплате' : 'Total Due'}:</span>
              <span class="mono">${this.formatMoney(totalAmount, ctr.currency)}</span>
            </div>
          </div>

          ${exceedsContract
            ? html`
                <div class="col-span-2 warn-banner">
                  ${isRu
                    ? `Внимание: сумма счёта превышает остаток по договору (${this.formatMoney(remaining, ctr.currency)}).`
                    : `Note: Invoice total exceeds remaining contract balance (${this.formatMoney(remaining, ctr.currency)}).`}
                </div>
              `
            : ''}

          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Назначение платежа / Примечание' : 'Payment Notes'}"
              .value="${this.invNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.invNotes = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>

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
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const inv = this.previewInvoice;
    if (!inv) return '';
    const company = store.companies.find((c) => c.id === inv.companyId);
    const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);
    const sourceCalc = inv.calculationId
      ? this.calculations.find((c) => c.id === inv.calculationId)
      : undefined;

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
                ${isRu ? 'Счёт на оплату' : 'Invoice'} № ${inv.number}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${isRu ? 'от' : 'dated'} <span class="mono">${inv.issueDate}</span>
                · ${isRu ? 'Оплатить до' : 'Due'} <span class="mono">${inv.dueDate}</span>
                · ${isRu ? 'Основание' : 'Contract'}: ${ctr.number}
                ${sourceCalc ? html` · <span class="mono">${sourceCalc.number}</span>` : ''}
              </div>
            </div>
            <app-badge variant="${this.getInvoiceStatusVariant(inv.status)}" appearance="soft">
              ${t.invoices.statuses[inv.status]}
            </app-badge>
          </div>

          <div class="sheet-parties">
            <div class="party-block">
              <span class="party-role">${isRu ? 'Поставщик' : 'Supplier'}</span>
              <span class="party-name">${company?.legalName || company?.name || '—'}</span>
              <span class="party-sub mono">
                ${isRu ? 'ИНН' : 'INN'}: ${company?.inn || '—'}${company?.kpp ? ` / КПП ${company.kpp}` : ''}
              </span>
            </div>
            <div class="party-block">
              <span class="party-role">${isRu ? 'Покупатель' : 'Bill To'}</span>
              <span class="party-name">${cp?.legalName || cp?.name || '—'}</span>
              <span class="party-sub mono">
                ${isRu ? 'ИНН' : 'INN'}: ${cp?.inn || '—'}${cp?.kpp ? ` / КПП ${cp.kpp}` : ''}
              </span>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${isRu ? 'Наименование' : 'Item'}</th>
                  <th>${isRu ? 'Кол-во' : 'Qty'}</th>
                  <th>${isRu ? 'Цена' : 'Price'}</th>
                  <th>${isRu ? 'Сумма' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                ${inv.items.map(
                  (item, idx) => html`
                    <tr>
                      <td class="mono">${idx + 1}</td>
                      <td>${item.title}</td>
                      <td class="mono">${item.quantity} ${item.unit}</td>
                      <td class="mono">${this.formatMoney(item.unitPrice, inv.currency)}</td>
                      <td class="mono" style="font-weight: 700;">${this.formatMoney(item.amount, inv.currency)}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          </div>

          <div class="totals-box">
            <div class="total-line">
              <span>${isRu ? 'Итого без НДС' : 'Subtotal'}:</span>
              <span class="mono">${this.formatMoney(inv.subtotal, inv.currency)}</span>
            </div>
            <div class="total-line">
              <span>${isRu ? `НДС (${inv.vatRate}%)` : `VAT (${inv.vatRate}%)`}:</span>
              <span class="mono">${this.formatMoney(inv.vatAmount, inv.currency)}</span>
            </div>
            <div class="total-line grand">
              <span>${isRu ? 'Всего к оплате' : 'Total Due'}:</span>
              <span class="mono">${this.formatMoney(inv.totalAmount, inv.currency)}</span>
            </div>
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
          ${inv.status === 'issued' || inv.status === 'sent' || inv.status === 'overdue'
            ? html`
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

  private renderDeleteInvoiceModal(isRu: boolean) {
    return html`
      <app-modal
        ?open="${Boolean(this.deletingInvoice)}"
        size="sm"
        title="${isRu ? 'Удалить счёт?' : 'Delete invoice?'}"
        @close="${() => (this.deletingInvoice = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Удалить счёт ${this.deletingInvoice?.number || ''}?`
            : `Delete invoice ${this.deletingInvoice?.number || ''}?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingInvoice = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingInvoice) {
                store.deleteInvoice(this.deletingInvoice.id);
                this.deletingInvoice = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderEditContractModal(isRu: boolean) {
    const t = getTranslation(this.currentLang);
    const statusOptions = [
      { value: 'draft', label: isRu ? 'Черновик' : 'Draft', color: '#64748b' },
      { value: 'on_approval', label: isRu ? 'На согласовании' : 'On Approval', color: '#f59e0b' },
      { value: 'active', label: isRu ? 'Действует' : 'Active', color: '#10b981' },
      { value: 'completed', label: isRu ? 'Исполнен' : 'Completed', color: '#0284c7' },
      { value: 'terminated', label: isRu ? 'Расторгнут' : 'Terminated', color: '#ef4444' },
    ];
    const typeOptions = [
      { value: 'service', label: isRu ? 'Услуги / Разработка' : 'Services' },
      { value: 'supply', label: isRu ? 'Поставка' : 'Supply' },
      { value: 'license', label: isRu ? 'Лицензия' : 'License' },
      { value: 'sla', label: 'SLA' },
      { value: 'nda', label: 'NDA' },
    ];
    const frequencyOptions = [
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
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
      <app-modal
        ?open="${this.contractModalOpen}"
        size="lg"
        title="${isRu ? 'Редактирование договора' : 'Edit Contract'}"
        @close="${() => (this.contractModalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'Номер договора' : 'Contract Number'}"
              .value="${this.ctrNumber}"
              required
              error="${this.ctrError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.ctrNumber = e.detail.value;
                this.ctrError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Тип договора' : 'Type'}"
              .value="${this.ctrType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrType = e.detail.value as ContractType)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-input
              label="${isRu ? 'Предмет договора' : 'Title'}"
              .value="${this.ctrTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.ctrTitle = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Наша компания' : 'Company'}"
              .value="${this.ctrCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrCompanyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Контрагент' : 'Counterparty'}"
              .value="${this.ctrCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrCounterpartyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              .value="${this.ctrProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrProjectId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Ответственный' : 'Owner'}"
              .value="${this.ctrOwnerId}"
              .options="${ownerOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrOwnerId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Сумма договора' : 'Amount'}"
              .value="${this.ctrAmount}"
              min="0"
              step="50000"
              @change="${(e: CustomEvent<{ value: number }>) => (this.ctrAmount = e.detail.value)}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Валюта' : 'Currency'}"
              .value="${this.ctrCurrency}"
              .options="${currencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrCurrency = e.detail.value as 'RUB' | 'USD' | 'EUR')}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата начала' : 'Start Date'}"
              .value="${this.ctrStartDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrStartDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата окончания' : 'End Date'}"
              .value="${this.ctrEndDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrEndDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Периодичность калькуляции' : 'Billing Cycle'}"
              .value="${this.ctrBillingFrequency}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrBillingFrequency = e.detail.value as CalculationFrequency)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.ctrStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrStatus = e.detail.value as ContractStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Условия и комментарии' : 'Description'}"
              .value="${this.ctrDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.ctrDescription = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.contractModalOpen = false)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveContract}">
            ${isRu ? 'Сохранить' : 'Save'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteContractModal(ctr: Contract, isRu: boolean) {
    return html`
      <app-modal
        ?open="${this.confirmDeleteContractOpen}"
        size="sm"
        title="${isRu ? 'Удалить договор?' : 'Delete contract?'}"
        @close="${() => (this.confirmDeleteContractOpen = false)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Вы уверены, что хотите удалить договор ${ctr.number}?`
            : `Are you sure you want to delete contract ${ctr.number}?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.confirmDeleteContractOpen = false)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              this.confirmDeleteContractOpen = false;
              store.deleteContract(ctr.id);
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
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

    this.editingCalcId = null;
    this.calcNumber = `КАЛК-${new Date().getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.calcFrequency = freq;
    this.calcPeriodStart = start;
    this.calcPeriodEnd = end;
    this.calcIncludePrior = true;
    this.calcStatus = 'draft';
    this.calcError = '';
    this.calcNotes = `Отчёт-калькуляция работ и расходов по договору ${ctr.number} за период ${start} — ${end}.`;

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
      this.calcError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
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
      this.calcError = this.currentLang === 'ru' ? 'Добавьте хотя бы одну позицию' : 'Add at least one item';
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
    this.invNumber = `СЧ-${today.getFullYear()}/${String(seq).padStart(3, '0')}`;
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
          title: `Работы по калькуляции ${calc.number} (${calc.periodStart} — ${calc.periodEnd})`,
          quantity: 1,
          unit: 'этап',
          unitPrice: calc.billableAmount,
          amount: calc.billableAmount,
          sourceType: 'manual',
        },
      ];
    }

    this.invNotes = `Оплата по договору ${ctr.number} на основании согласованной калькуляции ${calc.number} за период ${calc.periodStart} — ${calc.periodEnd}.${
      nonBillableCount > 0
        ? ` В отчёте также отражены ${nonBillableCount} non-billable поз. по ставке 0 ₽.`
        : ''
    }`;
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
    this.invNumber = `СЧ-${today.getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.invCalculationId = '';
    this.invIssueDate = today.toISOString().slice(0, 10);
    this.invDueDate = due.toISOString().slice(0, 10);
    this.invStatus = 'issued';
    this.invVatRate = 20;
    this.invNotes = `Оплата по договору ${ctr.number} от ${ctr.startDate}`;
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
            title: `${ctr.title} — этап работ`,
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
          title: `${ctr.title} — оплата по этапу`,
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
        title: `Закрытие остатка по договору ${ctr.number}`,
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
        title: `Трудозатраты: ${te.taskId}${task ? ` · ${task.title}` : ''} (${te.hours} ч)`,
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
        title: `Компенсация расхода: ${ex.title}`,
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
      this.invError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const cleanItems = this.invItems
      .filter((i) => i.title.trim())
      .map((i) => ({ ...i, title: i.title.trim() }));

    if (cleanItems.length === 0) {
      this.invError = this.currentLang === 'ru' ? 'Добавьте хотя бы одну позицию' : 'Add at least one item';
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
    this.ctrNumber = ctr.number;
    this.ctrTitle = ctr.title;
    this.ctrType = ctr.type;
    this.ctrCompanyId = ctr.companyId;
    this.ctrCounterpartyId = ctr.counterpartyId;
    this.ctrProjectId = ctr.projectId || '';
    this.ctrOwnerId = ctr.ownerId || '';
    this.ctrAmount = ctr.amount;
    this.ctrCurrency = ctr.currency;
    this.ctrStartDate = ctr.startDate;
    this.ctrEndDate = ctr.endDate;
    this.ctrStatus = ctr.status;
    this.ctrBillingFrequency = ctr.billingFrequency || 'monthly';
    this.ctrDescription = ctr.description;
    this.ctrError = '';
    this.contractModalOpen = true;
  }

  private handleSaveContract() {
    const existing = this.contracts.find((c) => c.id === this.detailContractId);
    if (!existing) return;
    if (!this.ctrNumber.trim()) {
      this.ctrError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    store.updateContract({
      id: existing.id,
      number: this.ctrNumber.trim(),
      title: this.ctrTitle.trim() || this.ctrNumber.trim(),
      type: this.ctrType,
      companyId: this.ctrCompanyId || existing.companyId,
      counterpartyId: this.ctrCounterpartyId || existing.counterpartyId,
      projectId: this.ctrProjectId || undefined,
      ownerId: this.ctrOwnerId || undefined,
      amount: Math.max(0, Number(this.ctrAmount) || 0),
      currency: this.ctrCurrency,
      startDate: this.ctrStartDate || existing.startDate,
      endDate: this.ctrEndDate || existing.endDate,
      status: this.ctrStatus,
      billingFrequency: this.ctrBillingFrequency,
      description: this.ctrDescription.trim(),
    });

    this.contractModalOpen = false;
  }
}
