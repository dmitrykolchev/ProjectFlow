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
  Invoice,
} from '../../../types';
import {
  iconCalculator,
  iconCheck,
  iconChevronRight,
  iconEdit,
  iconEye,
  iconPlus,
  iconReceipt,
  iconSend,
  iconTrash,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-date-input/app-date-input';
import '../../common/app-input/app-input';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-number-input/app-number-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-pagination/app-pagination';
import '../../common/app-entity-emblem/app-entity-emblem';
import { paginateItems } from '../../common/paginate';
import styles from './app-calculations.css';
import { eventValue } from '../../common/event-value';

const HOURLY_RATE_RUB = 3200;

@customElement('app-calculations')
export class AppCalculations extends LitElement {
  @state() private calculations: Calculation[] = store.calculations;
  @state() private contracts: Contract[] = store.contracts;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | CalculationStatus = 'all';
  @state() private contractFilter = 'all';
  @state() private frequencyFilter: 'all' | CalculationFrequency = 'all';
  @state() private currentPage = 1;
  @state() private tablePageSize = store.customization.tablePageSize;

  @state() private previewCalculation: Calculation | null = null;
  @state() private deletingCalculation: Calculation | null = null;

  // Create / Edit Calculation Modal
  @state() private calcModalOpen = false;
  @state() private editingCalcId: string | null = null;
  @state() private calcContractId = '';
  @state() private calcNumber = '';
  @state() private calcFrequency: CalculationFrequency = 'monthly';
  @state() private calcPeriodStart = '';
  @state() private calcPeriodEnd = '';
  @state() private calcIncludePrior = true;
  @state() private calcStatus: CalculationStatus = 'draft';
  @state() private calcItems: CalculationItem[] = [];
  @state() private calcNotes = '';
  @state() private calcError = '';

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
    this.currentPage = store.activeView === 'calculations' ? store.activePage : 1;
    this.calculations = store.calculations;
    this.contracts = store.contracts;
    this.invoices = store.invoices;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.tablePageSize = store.customization.tablePageSize;
    if (this.previewCalculation) {
      this.previewCalculation =
        this.calculations.find((c) => c.id === this.previewCalculation!.id) || null;
    }
  }


  private toRub(amount: number, currency: 'RUB' | 'USD' | 'EUR'): number {
    if (currency === 'USD') return amount * 96;
    if (currency === 'EUR') return amount * 104;
    return amount;
  }

  private convertAmountToCurrency(
    amount: number,
    fromCurrency: 'RUB' | 'USD' | 'EUR',
    toCurrency: 'RUB' | 'USD' | 'EUR'
  ): number {
    if (fromCurrency === toCurrency) return Math.round(amount);
    const toRub =
      fromCurrency === 'USD' ? amount * 96 : fromCurrency === 'EUR' ? amount * 104 : amount;
    if (toCurrency === 'USD') return Math.round(toRub / 96);
    if (toCurrency === 'EUR') return Math.round(toRub / 104);
    return Math.round(toRub);
  }

  private getFiltered(): Calculation[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return [...this.calculations]
      .sort((a, b) => (b.periodEnd + b.createdAt).localeCompare(a.periodEnd + a.createdAt))
      .filter((calc) => {
        if (this.statusFilter !== 'all' && calc.status !== this.statusFilter) return false;
        if (this.contractFilter !== 'all' && calc.contractId !== this.contractFilter) return false;
        if (this.frequencyFilter !== 'all' && calc.frequency !== this.frequencyFilter) return false;
        if (!query) return true;
        const ctr = this.contracts.find((c) => c.id === calc.contractId);
        const cp = store.counterparties.find((c) => c.id === calc.counterpartyId);
        return (
          calc.number.toLowerCase().includes(query) ||
          calc.notes.toLowerCase().includes(query) ||
          (ctr?.number.toLowerCase().includes(query) ?? false) ||
          (ctr?.title.toLowerCase().includes(query) ?? false) ||
          (cp?.name.toLowerCase().includes(query) ?? false)
        );
      });
  }

  private getUnaccountedProjectSources(contract: Contract, excludeCalcId?: string | null) {
    if (!contract.projectId) {
      return {
        timeEntries: [] as typeof store.timeEntries,
        expenses: [] as typeof store.expenses,
      };
    }

    const accounted = new Set<string>();
    for (const calc of this.calculations) {
      if (calc.contractId !== contract.id || calc.status === 'rejected') continue;
      if (excludeCalcId && calc.id === excludeCalcId) continue;
      for (const item of calc.items) {
        if (item.sourceId) accounted.add(item.sourceId);
      }
    }

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
      const inRange =
        (!periodStart || te.date >= periodStart) && (!periodEnd || te.date <= periodEnd);
      const isPrior = Boolean(
        periodStart && te.date < periodStart && (!periodEnd || te.date <= periodEnd)
      );
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
      const inRange =
        (!periodStart || ex.date >= periodStart) && (!periodEnd || ex.date <= periodEnd);
      const isPrior = Boolean(
        periodStart && ex.date < periodStart && (!periodEnd || ex.date <= periodEnd)
      );
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

  private getDefaultPeriodForFrequency(freq: CalculationFrequency): {
    start: string;
    end: string;
  } {
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

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFiltered();
    const paged = paginateItems(filtered, this.currentPage, this.tablePageSize);

    const sentCalcs = this.calculations.filter((c) => c.status === 'sent');
    const approvedCalcs = this.calculations.filter((c) => c.status === 'approved');
    const approvedReadyRub = approvedCalcs.reduce(
      (s, c) => s + this.toRub(c.billableAmount, c.currency),
      0
    );
    const sentAmountRub = sentCalcs.reduce(
      (s, c) => s + this.toRub(c.billableAmount, c.currency),
      0
    );
    const totalBillableHours = this.calculations.reduce((s, c) => s + c.billableHours, 0);
    const totalNonBillableHours = this.calculations.reduce((s, c) => s + c.nonBillableHours, 0);

    const statusOptions = [
      { value: 'all', label: t.viewTexts.calculations.filterAllStatuses },
      { value: 'draft', label: t.calculations.statuses.draft, color: '#64748b' },
      { value: 'sent', label: t.calculations.statuses.sent, color: '#f59e0b' },
      { value: 'approved', label: t.calculations.statuses.approved, color: '#10b981' },
      { value: 'rejected', label: t.calculations.statuses.rejected, color: '#ef4444' },
      { value: 'invoiced', label: t.calculations.statuses.invoiced, color: '#0284c7' },
    ];

    const contractOptions = [
      { value: 'all', label: t.viewTexts.calculations.filterAllContracts },
      ...this.contracts.map((c) => ({ value: c.id, label: `${c.number} · ${c.title}` })),
    ];

    const frequencyOptions = [
      { value: 'all', label: t.viewTexts.calculations.filterAllFrequencies },
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
    ];

    const hUnit = t.viewTexts.calculations.hoursUnitShort;

    return html`
      <app-page-header
        title="${t.navigation.calculations}"
        subtitle="${t.viewTexts.pageSubtitles.calculations}"
      >
        <span slot="icon">${iconCalculator(28)}</span>
        <app-button
          slot="actions"
          variant="primary"
          size="md"
          ?disabled="${this.contracts.length === 0}"
          @click="${() => this.openCreateModal()}"
        >
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.calculations.newCalculation}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.viewTexts.calculations.kpiTotalCalcs}" value="${this.calculations.length}" subtitle="${t.viewTexts.calculations.kpiInvoicedPrefix} ${this.calculations.filter((c) => c.status === 'invoiced').length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.calculations.kpiPendingApproval}" value="${sentCalcs.length}" valueColor="#f59e0b" subtitle="${formatMoney(sentAmountRub, 'RUB')}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.calculations.kpiApprovedReady}" value="${formatMoney(approvedReadyRub, 'RUB')}" valueColor="#10b981" subtitle="${approvedCalcs.length} ${t.viewTexts.calculations.kpiApprovedSuffix}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.calculations.kpiLoggedHours}" value="${totalBillableHours.toFixed(1)} ${hUnit}" subtitle="+${totalNonBillableHours.toFixed(1)} ${hUnit} non-billable (0 ₽)"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        variant="bare"
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 215px;"
        placeholder="${t.viewTexts.calculations.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'status', options: statusOptions },
          { key: 'contract', options: contractOptions },
          { key: 'frequency', options: frequencyOptions },
        ]}"
        .values="${{ status: this.statusFilter, contract: this.contractFilter, frequency: this.frequencyFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | CalculationStatus;
          if (e.detail.key === 'contract') this.contractFilter = eventValue(e);
          if (e.detail.key === 'frequency') this.frequencyFilter = eventValue(e) as 'all' | CalculationFrequency;
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      ></app-filter-bar>

      ${filtered.length === 0
        ? html`
            <app-empty-state title="${t.contractDetail.noCalculations}">
              ${this.contracts.length > 0
                ? html`
                    <app-button slot="action" variant="secondary" @click="${() => this.openCreateModal()}">
                      <span slot="icon-start">${iconPlus(15)}</span>
                      <span>${t.calculations.newCalculation}</span>
                    </app-button>
                  `
                : ''}
            </app-empty-state>
          `
        : html`
            <div class="table-card">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${t.viewTexts.calculations.thCalculation}</th>
                    <th>${t.viewTexts.calculations.thContract}</th>
                    <th>${t.viewTexts.calculations.thCounterparty}</th>
                    <th>${t.viewTexts.calculations.thPeriodCycle}</th>
                    <th>${t.viewTexts.calculations.thLabor}</th>
                    <th>${t.viewTexts.calculations.thBillableCol}</th>
                    <th>${t.viewTexts.calculations.thStatus}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${paged.items.map((calc) => {
                    const ctr = this.contracts.find((c) => c.id === calc.contractId);
                    const cp = store.counterparties.find((c) => c.id === calc.counterpartyId);
                    const priorCount = calc.items.filter((i) => i.isPriorPeriod).length;
                    const nonBillableItems = calc.items.filter((i) => !i.billable).length;
                    const linkedInv = calc.invoiceId
                      ? this.invoices.find((i) => i.id === calc.invoiceId)
                      : undefined;

                    return html`
                      <tr>
                        <td>
                          <app-link
                            class="link-btn"
                            size="md"
                            variant="primary"
                            @click="${() => store.openCalculationDetail(calc.id)}"
                          >
                            <span slot="start">${iconCalculator(15)}</span>
                            <span>${calc.number}</span>
                          </app-link>
                          <div class="cell-sub">
                            <span>${calc.items.length} ${t.viewTexts.calculations.itemsSuffix}</span>
                            ${nonBillableItems > 0
                              ? html`<span class="micro-tag zero">0 ₽: ${nonBillableItems}</span>`
                              : ''}
                            ${priorCount > 0
                              ? html`<span class="micro-tag prior">+${priorCount} ${t.calculations.priorBadge}</span>`
                              : ''}
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
                            ${calc.periodStart} → ${calc.periodEnd}
                          </div>
                          <div class="cell-sub">${t.calculations.frequencies[calc.frequency]}</div>
                        </td>
                        <td class="mono" style="white-space: nowrap;">
                          <div>${calc.billableHours} ${hUnit}</div>
                          ${calc.nonBillableHours > 0
                            ? html`<div class="cell-sub">+${calc.nonBillableHours} ${hUnit} (0 ₽)</div>`
                            : ''}
                        </td>
                        <td class="amount-cell">
                          <div>${formatMoney(calc.billableAmount, calc.currency)}</div>
                          ${linkedInv
                            ? html`
                                <div class="cell-sub" style="color: #10b981;">
                                  ${linkedInv.number}
                                </div>
                              `
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
                            <app-button
                              size="sm"
                              variant="icon"
                              title="${t.calculations.previewCalculation}"
                              @click="${() => (this.previewCalculation = calc)}"
                            >
                              <span slot="start">${iconEye(14)}</span>
                            </app-button>
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
                            <app-button
                              size="sm"
                              variant="icon"
                              title="${t.common.edit}"
                              @click="${() => this.openEditModal(calc)}"
                            >
                              <span slot="start">${iconEdit(14)}</span>
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
          `}

      ${this.renderFormModal(t)}
      ${this.renderPreviewModal(t)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderFormModal(t: ReturnType<typeof getTranslation>) {
    const ctr = this.contracts.find((c) => c.id === this.calcContractId) || this.contracts[0];
    if (!this.calcModalOpen || !ctr) return '';

    const contractOptions = this.contracts.map((c) => {
      const cp = store.counterparties.find((p) => p.id === c.counterpartyId);
      return {
        value: c.id,
        label: `${c.number} · ${cp?.name || c.title}`,
      };
    });

    const frequencyOptions = [
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
    const billableHours = hourItems
      .filter((i) => i.billable)
      .reduce((s, i) => s + (Number(i.quantity) || 0), 0);
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
        title="${this.editingCalcId ? t.calculations.editCalculation : t.calculations.newCalculation}"
        @close="${() => (this.calcModalOpen = false)}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <app-select
              label="${t.viewTexts.calculations.thContract}"
              .value="${ctr.id}"
              .options="${contractOptions}"
              ?disabled="${Boolean(this.editingCalcId)}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                const next = this.contracts.find((c) => c.id === eventValue(e));
                if (!next) return;
                this.calcContractId = next.id;
                const freq = next.billingFrequency || this.calcFrequency;
                this.calcFrequency = freq;
                const { start, end } = this.getDefaultPeriodForFrequency(freq);
                this.calcPeriodStart = start;
                this.calcPeriodEnd = end;
                this.refreshItemsForPeriod(next);
              }}"
            ></app-select>
          </div>

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
                this.refreshItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.calculations.labelPeriodEnd}"
              .value="${this.calcPeriodEnd}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.calcPeriodEnd = eventValue(e);
                this.refreshItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div class="col-span-2 quick-term-row">
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset(ctr, 'this_week')}"
            >
              <span>${t.viewTexts.calculations.quickThisWeek}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset(ctr, 'prev_week')}"
            >
              <span>${t.viewTexts.calculations.quickLastWeek}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset(ctr, 'this_month')}"
            >
              <span>${t.viewTexts.calculations.quickThisMonth}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset(ctr, 'prev_month')}"
            >
              <span>${t.viewTexts.calculations.quickLastMonth}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset(ctr, 'this_quarter')}"
            >
              <span>${t.viewTexts.calculations.quickThisQuarter}</span>
            </app-button>
          </div>

          <div class="col-span-2 autofill-bar">
            <app-checkbox
              ?checked="${this.calcIncludePrior}"
              label="${t.calculations.includePrior}"
              @change="${(e: CustomEvent<{ checked: boolean }>) => {
                this.calcIncludePrior = e.detail.checked;
                this.refreshItemsForPeriod(ctr);
              }}"
            ></app-checkbox>
            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.refreshItemsForPeriod(ctr)}"
            >
              <span slot="icon-start">${iconPlus(13)}</span>
              <span>${t.calculations.collectPeriodItems}</span>
            </app-button>
          </div>

          <div class="col-span-2 calc-summary-strip">
            <div class="calc-summary-item">
              <span class="calc-summary-label">${t.viewTexts.calculations.summaryItemsPrior}</span>
              <span class="calc-summary-val">${this.calcItems.length} (${priorItemsCount})</span>
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
          <app-button variant="primary" @click="${() => this.handleSave(ctr)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderPreviewModal(t: ReturnType<typeof getTranslation>) {
    const calc = this.previewCalculation;
    if (!calc) return '';
    const ctr = this.contracts.find((c) => c.id === calc.contractId);
    const company = store.companies.find((c) => c.id === calc.companyId);
    const cp = store.counterparties.find((c) => c.id === calc.counterpartyId);
    const linkedInv = calc.invoiceId
      ? this.invoices.find((i) => i.id === calc.invoiceId)
      : undefined;

    return html`
      <app-modal
        ?open="${Boolean(calc)}"
        size="xl"
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
                  ${t.viewTexts.calculations.previewPeriod}:
                  <span class="mono">${calc.periodStart} → ${calc.periodEnd}</span>
                  · ${t.calculations.frequencies[calc.frequency]}
                  · ${t.viewTexts.calculations.thContract}: ${ctr?.number || '—'}
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
                  <th>${t.viewTexts.calculations.thDate}</th>
                  <th>${t.viewTexts.calculations.thWorkExpense}</th>
                  <th>${t.viewTexts.calculations.labelQty}</th>
                  <th>${t.viewTexts.calculations.thBillingType}</th>
                  <th>${t.viewTexts.calculations.thPrice}</th>
                  <th>${t.viewTexts.calculations.thAmount}</th>
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
          ${calc.status === 'approved' && ctr
            ? html`
                <app-button
                  variant="primary"
                  @click="${() => {
                    this.previewCalculation = null;
                    store.openContractDetail(ctr.id, 'invoice');
                  }}"
                >
                  <span slot="icon-start">${iconReceipt(15)}</span>
                  <span>${t.calculations.createInvoiceFromCalc}</span>
                </app-button>
              `
            : ''}
          ${linkedInv && ctr
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => {
                    this.previewCalculation = null;
                    store.openContractDetail(ctr.id);
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

  private renderDeleteModal(t: ReturnType<typeof getTranslation>) {
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

  private openCreateModal() {
    const defaultContract =
      (this.contractFilter !== 'all'
        ? this.contracts.find((c) => c.id === this.contractFilter)
        : undefined) ||
      this.contracts.find((c) => c.status === 'active') ||
      this.contracts[0];
    if (!defaultContract) return;

    const freq = defaultContract.billingFrequency || 'monthly';
    const { start, end } = this.getDefaultPeriodForFrequency(freq);
    const seq = this.calculations.length + 1;

    const tx = getTranslation(this.currentLang).viewTexts.calculations;
    this.editingCalcId = null;
    this.calcContractId = defaultContract.id;
    this.calcNumber = `${tx.calcNumberPrefix}${new Date().getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.calcFrequency = freq;
    this.calcPeriodStart = start;
    this.calcPeriodEnd = end;
    this.calcIncludePrior = true;
    this.calcStatus = 'draft';
    this.calcError = '';
    this.calcNotes = tx.calcNotesTemplate(defaultContract.number, start, end);
    this.calcItems = this.collectItemsForPeriod(defaultContract, start, end, true, null);
    this.calcModalOpen = true;
  }

  private openEditModal(calc: Calculation) {
    this.editingCalcId = calc.id;
    this.calcContractId = calc.contractId;
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

  private applyPeriodPreset(
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

    this.refreshItemsForPeriod(ctr);
  }

  private refreshItemsForPeriod(ctr: Contract) {
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

  private handleSave(ctr: Contract) {
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
    const billableHours =
      Math.round(hourItems.filter((i) => i.billable).reduce((s, i) => s + i.quantity, 0) * 100) /
      100;
    const nonBillableHours =
      Math.round(hourItems.filter((i) => !i.billable).reduce((s, i) => s + i.quantity, 0) * 100) /
      100;
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
}