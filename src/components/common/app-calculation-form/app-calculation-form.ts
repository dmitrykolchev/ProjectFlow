import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  Calculation,
  CalculationFrequency,
  CalculationItem,
  CalculationStatus,
  Contract,
} from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-calculation-form.css';
import { eventValue } from '../event-value';
import { iconPlus, iconTrash } from '../icons';
import { formatMoney } from '../app-money/app-money';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-select/app-select';
import '../app-input/app-input';
import '../app-date-input/app-date-input';
import '../app-checkbox/app-checkbox';
import '../app-textarea/app-textarea';
import '../app-empty-state/app-empty-state';
import '../app-button/app-button';

const HOURLY_RATE_RUB = 3200;

/**
 * Canonical calculation create/edit form. The component owns the whole field set
 * (contract, number, frequency, period start and end, quick period presets, include
 * prior unaccounted, collected items editor with billable rows, status, report notes)
 * and writes to the store itself; views open it by setting `open` plus the edit target
 * (`calculation`) or a create preset contract. A `saved` event carries the written
 * calculation. The number is required and copies the historical validation error, the
 * item list must keep at least one titled row (addOneItemError), unaccounted time
 * entries and expenses of the contract project are collected for the period with the
 * prior-period badge, manual rows survive a period refresh, billable rows recompute
 * amount from quantity and rate, non-billable rows stay zero. `showContractSelect`
 * enables the contract picker (list view), `contextTitle` overrides the modal title
 * for context-bound openings.
 */
@customElement('app-calculation-form')
export class AppCalculationForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ type: Object, attribute: false }) calculation: Calculation | null = null;
  @property({ type: Object, attribute: false }) presetContractId: string | null = null;
  @property({ type: Boolean }) showContractSelect: boolean = false;
  @property({ type: String }) contextTitle: string = '';

  @state() private currentLang = store.customization.language;
  @state() private fContractId = '';
  @state() private fNumber = '';
  @state() private fFrequency: CalculationFrequency = 'monthly';
  @state() private fPeriodStart = '';
  @state() private fPeriodEnd = '';
  @state() private fIncludePrior = true;
  @state() private fStatus: CalculationStatus = 'draft';
  @state() private fItems: CalculationItem[] = [];
  @state() private fNotes = '';
  @state() private formError = '';

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && this.open) this.initFields();
  }

  // the view owns the open flag, so every close of the form must report back to it:
  // closing from inside the component (cancel, save, backdrop) has no view-side reset
  // without this event, and the next open request would be a no-op on an unchanged flag
  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && !this.open) {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  }

  private closeModal() {
    this.open = false;
  }

  private currentContract(): Contract | undefined {
    return store.contracts.find((c) => c.id === this.fContractId) || store.contracts[0];
  }

  private initFields() {
    const tx = getTranslation(this.currentLang).viewTexts.calculations;

    if (this.calculation) {
      const calc = this.calculation;
      this.fContractId = calc.contractId;
      this.fNumber = calc.number;
      this.fFrequency = calc.frequency;
      this.fPeriodStart = calc.periodStart;
      this.fPeriodEnd = calc.periodEnd;
      this.fIncludePrior = calc.includePriorUnaccounted;
      this.fStatus = calc.status;
      this.fItems = calc.items.map((item) => ({ ...item }));
      this.fNotes = calc.notes;
    } else {
      const defaultContract =
        (this.presetContractId ? store.contracts.find((c) => c.id === this.presetContractId) : undefined) ||
        store.contracts.find((c) => c.status === 'active') ||
        store.contracts[0];
      if (!defaultContract) {
        this.open = false;
        return;
      }

      const freq = defaultContract.billingFrequency || 'monthly';
      const { start, end } = this.getDefaultPeriodForFrequency(freq);
      const seq = store.calculations.length + 1;

      this.fContractId = defaultContract.id;
      this.fNumber = `${tx.calcNumberPrefix}${new Date().getFullYear()}/${String(seq).padStart(3, '0')}`;
      this.fFrequency = freq;
      this.fPeriodStart = start;
      this.fPeriodEnd = end;
      this.fIncludePrior = true;
      this.fStatus = 'draft';
      this.fNotes = tx.calcNotesTemplate(defaultContract.number, start, end);
      this.fItems = this.collectItemsForPeriod(defaultContract, start, end, true, null);
    }
    this.formError = '';
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

  private getUnaccountedProjectSources(contract: Contract, excludeCalcId?: string | null) {
    if (!contract.projectId) {
      return {
        timeEntries: [] as typeof store.timeEntries,
        expenses: [] as typeof store.expenses,
      };
    }

    const accounted = new Set<string>();
    for (const calc of store.calculations) {
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

  private applyPeriodPreset(
    preset: 'this_week' | 'prev_week' | 'this_month' | 'prev_month' | 'this_quarter'
  ) {
    const ctr = this.currentContract();
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
      this.fFrequency = 'weekly';
      this.fPeriodStart = toIso(mon);
      this.fPeriodEnd = toIso(sun);
    } else if (preset === 'this_month' || preset === 'prev_month') {
      const targetMonth = preset === 'prev_month' ? m - 1 : m;
      const start = new Date(y, targetMonth, 1);
      const end = new Date(y, targetMonth + 1, 0);
      this.fFrequency = 'monthly';
      this.fPeriodStart = toIso(start);
      this.fPeriodEnd = toIso(end);
    } else {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qStartMonth, 1);
      const end = new Date(y, qStartMonth + 3, 0);
      this.fFrequency = 'quarterly';
      this.fPeriodStart = toIso(start);
      this.fPeriodEnd = toIso(end);
    }

    if (ctr) this.refreshItemsForPeriod(ctr);
  }

  private refreshItemsForPeriod(ctr: Contract) {
    const collected = this.collectItemsForPeriod(
      ctr,
      this.fPeriodStart,
      this.fPeriodEnd,
      this.fIncludePrior,
      this.calculation ? this.calculation.id : null
    );
    const manualItems = this.fItems.filter((i) => i.itemType === 'manual');
    this.fItems = [...collected, ...manualItems].sort((a, b) => a.date.localeCompare(b.date));
  }

  private addEmptyCalcItem(billable: boolean) {
    const date = this.fPeriodEnd || new Date().toISOString().slice(0, 10);
    this.fItems = [
      ...this.fItems,
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
    this.fItems = this.fItems.map((item) => {
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

  private handleSave() {
    const t = getTranslation(this.currentLang);
    const ctr = this.currentContract();
    if (!ctr) return;

    if (!this.fNumber.trim()) {
      this.formError = t.common.required;
      return;
    }

    const cleanItems = this.fItems
      .filter((i) => i.title.trim())
      .map((i) => ({
        ...i,
        title: i.title.trim(),
        unitPrice: i.billable ? i.unitPrice : 0,
        amount: i.billable ? i.amount : 0,
      }));

    if (cleanItems.length === 0) {
      this.formError = t.viewTexts.calculations.addOneItemError;
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

    const existing = this.calculation
      ? store.calculations.find((c) => c.id === this.calculation!.id)
      : undefined;
    const approvedDate =
      this.fStatus === 'approved' || this.fStatus === 'invoiced'
        ? existing?.approvedDate || new Date().toISOString().slice(0, 10)
        : undefined;

    const payload = {
      number: this.fNumber.trim(),
      contractId: ctr.id,
      projectId: ctr.projectId,
      companyId: ctr.companyId,
      counterpartyId: ctr.counterpartyId,
      frequency: this.fFrequency,
      periodStart: this.fPeriodStart || new Date().toISOString().slice(0, 10),
      periodEnd: this.fPeriodEnd || new Date().toISOString().slice(0, 10),
      includePriorUnaccounted: this.fIncludePrior,
      currency: ctr.currency,
      status: this.fStatus,
      totalHours,
      billableHours,
      nonBillableHours,
      billableAmount,
      items: cleanItems,
      notes: this.fNotes.trim(),
      approvedDate,
      invoiceId: existing?.invoiceId,
    };

    let saved: Calculation;
    if (this.calculation) {
      saved = {
        id: this.calculation.id,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      };
      store.updateCalculation(saved);
    } else {
      saved = store.addCalculation(payload);
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { calculation: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const ctr = this.currentContract();
    if (!ctr) return html``;

    const title = this.calculation
      ? this.contextTitle || t.calculations.editCalculation
      : this.contextTitle || t.calculations.newCalculation;

    const contractOptions = store.contracts.map((c) => {
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

    const hourItems = this.fItems.filter((i) => i.unit === 'ч');
    const billableHours = hourItems
      .filter((i) => i.billable)
      .reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const nonBillableHours = hourItems
      .filter((i) => !i.billable)
      .reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const billableAmount = this.fItems
      .filter((i) => i.billable)
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const priorItemsCount = this.fItems.filter((i) => i.isPriorPeriod).length;
    const zeroPriceCount = this.fItems.filter((i) => !i.billable).length;

    return html`
      <app-modal
        ?open="${this.open}"
        size="xl"
        title="${title}"
        @close="${() => this.closeModal()}"
      >
        <app-form-grid>
          ${this.showContractSelect
            ? html`
                <div class="col-span-2">
                  <app-select
                    label="${t.viewTexts.calculations.thContract}"
                    .value="${ctr.id}"
                    .options="${contractOptions}"
                    ?disabled="${Boolean(this.calculation)}"
                    @change="${(e: CustomEvent<{ value: string }>) => {
                      const next = store.contracts.find((c) => c.id === eventValue(e));
                      if (!next) return;
                      this.fContractId = next.id;
                      const freq = next.billingFrequency || this.fFrequency;
                      this.fFrequency = freq;
                      const { start, end } = this.getDefaultPeriodForFrequency(freq);
                      this.fPeriodStart = start;
                      this.fPeriodEnd = end;
                      this.refreshItemsForPeriod(next);
                    }}"
                  ></app-select>
                </div>
              `
            : ''}

          <div>
            <app-input
              label="${t.viewTexts.calculations.labelCalcNumber}"
              .value="${this.fNumber}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fNumber = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.calculations.labelFrequency}"
              .value="${this.fFrequency}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fFrequency = eventValue(e) as CalculationFrequency)}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.calculations.labelPeriodStart}"
              .value="${this.fPeriodStart}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.fPeriodStart = eventValue(e);
                this.refreshItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.calculations.labelPeriodEnd}"
              .value="${this.fPeriodEnd}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.fPeriodEnd = eventValue(e);
                this.refreshItemsForPeriod(ctr);
              }}"
            ></app-date-input>
          </div>

          <div class="col-span-2 quick-term-row">
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset('this_week')}"
            >
              <span>${t.viewTexts.calculations.quickThisWeek}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset('prev_week')}"
            >
              <span>${t.viewTexts.calculations.quickLastWeek}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset('this_month')}"
            >
              <span>${t.viewTexts.calculations.quickThisMonth}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset('prev_month')}"
            >
              <span>${t.viewTexts.calculations.quickLastMonth}</span>
            </app-button>
            <app-button
              class="quick-term-btn"
              size="sm"
              variant="icon"
              @click="${() => this.applyPeriodPreset('this_quarter')}"
            >
              <span>${t.viewTexts.calculations.quickThisQuarter}</span>
            </app-button>
          </div>

          <div class="col-span-2 autofill-bar">
            <app-checkbox
              ?checked="${this.fIncludePrior}"
              label="${t.calculations.includePrior}"
              @change="${(e: CustomEvent<{ checked: boolean }>) => {
                this.fIncludePrior = e.detail.checked;
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
              <span class="calc-summary-val">${this.fItems.length} (${priorItemsCount})</span>
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
                ${t.viewTexts.calculations.worksExpensesTitle} (${this.fItems.length})
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

            ${this.fItems.length === 0
              ? html`<app-empty-state
                  compact
                  title="${t.viewTexts.calculations.emptyEditorItems}"
                ></app-empty-state>`
              : html`
                  <div class="calc-items-list">
                    ${this.fItems.map(
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
                            <app-button
                              size="xs"
                              variant="icon"
                              title="${t.common.delete}"
                              @click="${() => (this.fItems = this.fItems.filter((i) => i.id !== item.id))}"
                            >
                              <span slot="start">${iconTrash(13)}</span>
                            </app-button>
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
                                label="${item.billable ? t.viewTexts.calculations.rateLabelBillable : t.viewTexts.calculations.rateLabelZero}"
                                .value="${item.billable ? item.unitPrice : 0}"
                                min="0"
                                max="100000000"
                                step="500"
                                ?disabled="${!item.billable}"
                                @change="${(e: CustomEvent<{ value: number }>) =>
                                  this.updateCalcItem(item.id, {
                                    baseRate: eventValue(e),
                                    unitPrice: eventValue(e),
                                  })}"
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
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as CalculationStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.calculations.labelReportNotes}"
              .value="${this.fNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fNotes = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => this.closeModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSave()}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-calculation-form': AppCalculationForm;
  }
}
