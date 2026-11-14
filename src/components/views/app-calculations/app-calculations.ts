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
  Invoice,
} from '../../../types';
import {
  iconCheck,
  iconChevronRight,
  iconEdit,
  iconEye,
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
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-date-input/app-date-input';
import '../../common/app-input/app-input';
import '../../common/app-modal/app-modal';
import '../../common/app-number-input/app-number-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import styles from './app-calculations.css';

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
    this.calculations = store.calculations;
    this.contracts = store.contracts;
    this.invoices = store.invoices;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    if (this.previewCalculation) {
      this.previewCalculation =
        this.calculations.find((c) => c.id === this.previewCalculation!.id) || null;
    }
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

  private getStatusVariant(
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
    const isRu = this.currentLang === 'ru';
    const filtered = this.getFiltered();

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
      { value: 'all', label: isRu ? 'Все статусы' : 'All statuses' },
      { value: 'draft', label: t.calculations.statuses.draft, color: '#64748b' },
      { value: 'sent', label: t.calculations.statuses.sent, color: '#f59e0b' },
      { value: 'approved', label: t.calculations.statuses.approved, color: '#10b981' },
      { value: 'rejected', label: t.calculations.statuses.rejected, color: '#ef4444' },
      { value: 'invoiced', label: t.calculations.statuses.invoiced, color: '#0284c7' },
    ];

    const contractOptions = [
      { value: 'all', label: isRu ? 'Все договоры' : 'All contracts' },
      ...this.contracts.map((c) => ({ value: c.id, label: `${c.number} · ${c.title}` })),
    ];

    const frequencyOptions = [
      { value: 'all', label: isRu ? 'Любая периодичность' : 'All frequencies' },
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
    ];

    const hUnit = isRu ? 'ч' : 'h';

    return html`
      <div class="view-header">
        <div class="header-titles">
          <h1 class="view-title">${t.navigation.calculations}</h1>
          <p class="view-subtitle">
            ${isRu
              ? 'Периодические отчёты-калькуляции перед заказчиками (billable и non-billable по 0 ₽), согласование и передача в выставление счетов'
              : 'Periodic client cost & work calculations (billable + non-billable at 0), approval workflow, and invoice handoff'}
          </p>
        </div>
        <app-button
          variant="primary"
          size="md"
          ?disabled="${this.contracts.length === 0}"
          @click="${() => this.openCreateModal()}"
        >
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.calculations.newCalculation}</span>
        </app-button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Всего калькуляций' : 'Total Calculations'}</span>
          <span class="kpi-value">${this.calculations.length}</span>
          <span class="kpi-sub">
            ${isRu ? 'В том числе выставлено в счета:' : 'Invoiced:'}
            ${this.calculations.filter((c) => c.status === 'invoiced').length}
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'На согласовании у клиента' : 'Pending Client Approval'}</span>
          <span class="kpi-value" style="color: #f59e0b;">${sentCalcs.length}</span>
          <span class="kpi-sub mono">${this.formatMoney(sentAmountRub, 'RUB')}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Согласовано (к счетам)' : 'Approved (Ready to Bill)'}</span>
          <span class="kpi-value" style="color: #10b981;">${this.formatMoney(approvedReadyRub, 'RUB')}</span>
          <span class="kpi-sub">
            ${approvedCalcs.length} ${isRu ? 'соглас. отчёт(ов)' : 'approved report(s)'}
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${isRu ? 'Часы в калькуляциях' : 'Logged Hours in Reports'}</span>
          <span class="kpi-value">
            ${totalBillableHours.toFixed(1)} ${hUnit}
          </span>
          <span class="kpi-sub">
            +${totalNonBillableHours.toFixed(1)} ${hUnit} non-billable (0 ₽)
          </span>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-filters">
          <div class="filter-search">
            <app-input
              placeholder="${isRu
                ? 'Поиск по номеру, договору, контрагенту...'
                : 'Search calculation, contract, client...'}"
              .value="${this.localSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
            >
              <span slot="icon">${iconSearch(15)}</span>
            </app-input>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.statusFilter}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.statusFilter = e.detail.value as 'all' | CalculationStatus)}"
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
          <div class="filter-select">
            <app-select
              .value="${this.frequencyFilter}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.frequencyFilter = e.detail.value as 'all' | CalculationFrequency)}"
            ></app-select>
          </div>
        </div>
      </div>

      ${filtered.length === 0
        ? html`
            <div class="empty-state">
              <span>${t.contractDetail.noCalculations}</span>
              ${this.contracts.length > 0
                ? html`
                    <app-button variant="secondary" @click="${() => this.openCreateModal()}">
                      <span slot="icon-start">${iconPlus(15)}</span>
                      <span>${t.calculations.newCalculation}</span>
                    </app-button>
                  `
                : ''}
            </div>
          `
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
                  ${filtered.map((calc) => {
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
                          <button
                            type="button"
                            class="link-btn"
                            @click="${() => (this.previewCalculation = calc)}"
                          >
                            ${iconTable()}
                            <span>${calc.number}</span>
                          </button>
                          <div class="cell-sub">
                            <span>${calc.items.length} ${isRu ? 'поз.' : 'items'}</span>
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
                          <div>${this.formatMoney(calc.billableAmount, calc.currency)}</div>
                          ${linkedInv
                            ? html`
                                <div class="cell-sub" style="color: #10b981;">
                                  ${linkedInv.number}
                                </div>
                              `
                            : ''}
                        </td>
                        <td>
                          <app-badge
                            variant="${this.getStatusVariant(calc.status)}"
                            appearance="soft"
                            size="sm"
                          >
                            ${t.calculations.statuses[calc.status]}
                          </app-badge>
                        </td>
                        <td>
                          <div class="actions-row">
                            <button
                              type="button"
                              class="icon-btn"
                              title="${t.calculations.previewCalculation}"
                              @click="${() => (this.previewCalculation = calc)}"
                            >
                              ${iconEye(14)}
                            </button>
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
                            <button
                              type="button"
                              class="icon-btn"
                              title="${t.common.edit}"
                              @click="${() => this.openEditModal(calc)}"
                            >
                              ${iconEdit(14)}
                            </button>
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

      ${this.renderFormModal(t, isRu)}
      ${this.renderPreviewModal(t, isRu)}
      ${this.renderDeleteModal(t, isRu)}
    `;
  }

  private renderFormModal(t: ReturnType<typeof getTranslation>, isRu: boolean) {
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
        <div class="form-grid">
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Договор' : 'Contract'}"
              .value="${ctr.id}"
              .options="${contractOptions}"
              ?disabled="${Boolean(this.editingCalcId)}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                const next = this.contracts.find((c) => c.id === e.detail.value);
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
                this.refreshItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div>
            <app-date-input
              label="${isRu ? 'Окончание периода' : 'Period End'}"
              .value="${this.calcPeriodEnd}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.calcPeriodEnd = e.detail.value;
                this.refreshItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div class="col-span-2 quick-term-row">
            <button type="button" class="quick-term-btn" @click="${() => this.applyPeriodPreset(ctr, 'this_week')}">
              ${isRu ? 'Текущая неделя' : 'This Week'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyPeriodPreset(ctr, 'prev_week')}">
              ${isRu ? 'Прошлая неделя' : 'Last Week'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyPeriodPreset(ctr, 'this_month')}">
              ${isRu ? 'Текущий месяц' : 'This Month'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyPeriodPreset(ctr, 'prev_month')}">
              ${isRu ? 'Прошлый месяц' : 'Last Month'}
            </button>
            <button type="button" class="quick-term-btn" @click="${() => this.applyPeriodPreset(ctr, 'this_quarter')}">
              ${isRu ? 'Текущий квартал' : 'This Quarter'}
            </button>
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
              <span class="calc-summary-label">${isRu ? 'Позиций (из прошлых)' : 'Items (prior)'}</span>
              <span class="calc-summary-val">${this.calcItems.length} (${priorItemsCount})</span>
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

                          <div class="calc-row-bottom">
                            <div>
                              <app-number-input
                                size="sm"
                                label="${isRu ? 'Кол-во' : 'Qty'}"
                                .value="${item.quantity}"
                                min="0"
                                max="10000"
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
                            <div>
                              <app-number-input
                                size="sm"
                                label="${item.billable ? (isRu ? 'Ставка / Цена' : 'Rate') : isRu ? 'Цена (0 ₽)' : 'Rate (0)'}"
                                .value="${item.billable ? item.unitPrice : 0}"
                                min="0"
                                max="100000000"
                                step="500"
                                ?disabled="${!item.billable}"
                                @change="${(e: CustomEvent<{ value: number }>) =>
                                  this.updateCalcItem(item.id, { baseRate: e.detail.value, unitPrice: e.detail.value })}"
                              ></app-number-input>
                            </div>
                            <div class="calc-bill-cell">
                              <app-checkbox
                                ?checked="${item.billable}"
                                label="${isRu ? 'Оплачиваемая позиция (Billable)' : 'Billable'}"
                                @change="${(e: CustomEvent<{ checked: boolean }>) =>
                                  this.updateCalcItem(item.id, { billable: e.detail.checked })}"
                              ></app-checkbox>
                              ${!item.billable
                                ? html`<span class="calc-zero-hint">${isRu ? 'В отчёте с ценой 0 ₽' : 'Shown at 0 rate'}</span>`
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
              label="${isRu ? 'Статус калькуляции' : 'Calculation Status'}"
              .value="${this.calcStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.calcStatus = e.detail.value as CalculationStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
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
          <app-button variant="primary" @click="${() => this.handleSave(ctr)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderPreviewModal(t: ReturnType<typeof getTranslation>, isRu: boolean) {
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
            <div>
              <div style="font-size: 1.15rem; font-weight: 700;" class="mono">
                ${isRu ? 'Калькуляция работ и расходов' : 'Cost & Work Calculation'} № ${calc.number}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${isRu ? 'Период' : 'Period'}:
                <span class="mono">${calc.periodStart} → ${calc.periodEnd}</span>
                · ${t.calculations.frequencies[calc.frequency]}
                · ${isRu ? 'Договор' : 'Contract'}: ${ctr?.number || '—'}
              </div>
            </div>
            <app-badge variant="${this.getStatusVariant(calc.status)}" appearance="soft">
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

  private renderDeleteModal(t: ReturnType<typeof getTranslation>, isRu: boolean) {
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
            ${t.common.cancel}
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
            ${t.common.delete}
          </app-button>
        </div>
      </app-modal>
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

    this.editingCalcId = null;
    this.calcContractId = defaultContract.id;
    this.calcNumber = `КАЛК-${new Date().getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.calcFrequency = freq;
    this.calcPeriodStart = start;
    this.calcPeriodEnd = end;
    this.calcIncludePrior = true;
    this.calcStatus = 'draft';
    this.calcError = '';
    this.calcNotes = `Отчёт-калькуляция работ и расходов по договору ${defaultContract.number} за период ${start} — ${end}.`;
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
      this.calcError =
        this.currentLang === 'ru' ? 'Добавьте хотя бы одну позицию' : 'Add at least one item';
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
