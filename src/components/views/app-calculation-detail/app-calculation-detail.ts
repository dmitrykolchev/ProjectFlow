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
import { formatMoney } from '../../common/app-money/app-money';
import { eventValue } from '../../common/event-value';
import {
  iconCheck,
  iconChevronLeft,
  iconEdit,
  iconFileText,
  iconFolder,
  iconPlus,
  iconReceipt,
  iconSend,
  iconTrash,
  iconX,
} from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-date-input/app-date-input';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-input/app-input';
import '../../common/app-modal/app-modal';
import '../../common/app-number-input/app-number-input';
import '../../common/app-section-card/app-section-card';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-textarea/app-textarea';
import styles from './app-calculation-detail.css';

const HOURLY_RATE_RUB = 3200;

@customElement('app-calculation-detail')
export class AppCalculationDetail extends LitElement {
  @state() private calculations: Calculation[] = store.calculations;
  @state() private contracts: Contract[] = store.contracts;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private detailCalculationId = store.detailCalculationId;
  @state() private currentLang = store.customization.language;

  @state() private confirmDeleteOpen = false;
  @state() private editModalOpen = false;
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
    const candidate = store.detailCalculationId || this.detailCalculationId;
    if (candidate && this.calculations.some((c) => c.id === candidate)) {
      this.detailCalculationId = candidate;
    } else {
      this.detailCalculationId = this.calculations[0]?.id || '';
    }
  }

  private unitLabel(unit: string, t: ReturnType<typeof getTranslation>): string {
    if (unit === 'ч') return t.viewTexts.calculations.hoursUnitShort;
    if (unit === 'усл.') return t.viewTexts.contractDetail.unitConditional;
    if (unit === 'этап') return t.viewTexts.contractDetail.unitStage;
    return unit;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const calc = this.calculations.find((c) => c.id === this.detailCalculationId) || null;

    if (!calc) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.calculationDetail.emptyNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('calculations')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.calculations.backToCalculations}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const ctr = this.contracts.find((c) => c.id === calc.contractId);
    const company = store.companies.find((c) => c.id === calc.companyId);
    const cp = store.counterparties.find((c) => c.id === calc.counterpartyId);
    const project = calc.projectId ? store.projects.find((p) => p.id === calc.projectId) : undefined;
    const linkedInv = calc.invoiceId
      ? this.invoices.find((i) => i.id === calc.invoiceId)
      : undefined;

    const hUnit = t.viewTexts.calculations.hoursUnitShort;
    const priorItemsCount = calc.items.filter((i) => i.isPriorPeriod).length;
    const nonBillableItemsCount = calc.items.filter((i) => !i.billable).length;

    const switcherOptions = this.calculations.map((item) => {
      const itemCtr = this.contracts.find((c) => c.id === item.contractId);
      return {
        value: item.id,
        code: item.number,
        label: itemCtr ? `${item.number} · ${itemCtr.title}` : item.number,
        subtitle: `${item.periodStart} → ${item.periodEnd}`,
        meta: formatMoney(item.billableAmount, item.currency),
        badge: t.calculations.statuses[item.status],
      };
    });

    const statusOptions: Array<{ value: CalculationStatus; label: string; color: string }> = [
      { value: 'draft', label: t.calculations.statuses.draft, color: '#64748b' },
      { value: 'sent', label: t.calculations.statuses.sent, color: '#f59e0b' },
      { value: 'approved', label: t.calculations.statuses.approved, color: '#10b981' },
      { value: 'rejected', label: t.calculations.statuses.rejected, color: '#ef4444' },
      { value: 'invoiced', label: t.calculations.statuses.invoiced, color: '#0284c7' },
    ];

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('calculations')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.calculations.backToCalculations}</span>
            </app-button>

            <div class="calc-switcher">
              <app-entity-selector
                size="sm"
                placeholder="${t.viewTexts.calculationDetail.switcherPlaceholder}"
                .options="${switcherOptions}"
                .value="${calc.id}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  const nextId = eventValue(e);
                  if (nextId && nextId !== calc.id) {
                    store.openCalculationDetail(nextId);
                  }
                }}"
              ></app-entity-selector>
            </div>
          </div>

          <div class="nav-actions">
            ${ctr
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.openContractDetail(ctr.id)}"
                  >
                    <span slot="icon-start">${iconFileText(14)}</span>
                    <span>${t.viewTexts.calculationDetail.openContractBtn}</span>
                  </app-button>
                `
              : ''}

            ${calc.status === 'draft' || calc.status === 'rejected'
              ? html`
                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => store.updateCalculationStatus(calc.id, 'sent')}"
                  >
                    <span slot="icon-start">${iconSend(14)}</span>
                    <span>${t.calculations.sendForApproval}</span>
                  </app-button>
                `
              : ''}

            ${calc.status === 'sent'
              ? html`
                  <app-button
                    size="sm"
                    variant="ghost"
                    @click="${() => store.updateCalculationStatus(calc.id, 'rejected')}"
                  >
                    <span slot="icon-start">${iconX(14)}</span>
                    <span>${t.calculations.rejectCalc}</span>
                  </app-button>
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => store.updateCalculationStatus(calc.id, 'approved')}"
                  >
                    <span slot="icon-start">${iconCheck(14)}</span>
                    <span>${t.calculations.approveCalc}</span>
                  </app-button>
                `
              : ''}

            ${calc.status === 'approved' && ctr
              ? html`
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => store.openContractDetail(ctr.id, 'invoice')}"
                  >
                    <span slot="icon-start">${iconReceipt(14)}</span>
                    <span>${t.calculations.createInvoiceFromCalc}</span>
                  </app-button>
                `
              : ''}

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openEditModal(calc)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <app-button
              class="danger-action"
              size="xs"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <!-- Hero Card -->
        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <app-entity-emblem entity="calculation" size="lg"></app-entity-emblem>
              <div class="title-block">
                <div class="hero-meta-row">
                  <app-entity-emblem entity="calculation" variant="pill" size="sm"></app-entity-emblem>
                  <span class="mono">${calc.periodStart} → ${calc.periodEnd}</span>
                  <span aria-hidden="true">·</span>
                  <span>${t.calculations.frequencies[calc.frequency]}</span>
                  ${ctr
                    ? html`
                        <span aria-hidden="true">·</span>
                        <app-link
                          class="link-btn hdr-link"
                          size="md"
                          variant="primary"
                          @click="${() => store.openContractDetail(ctr.id)}"
                        >
                          <span class="mono">${ctr.number}</span>
                        </app-link>
                      `
                    : ''}
                </div>
                <div class="title-row">
                  <h1 class="calc-title">${calc.number}</h1>
                  <app-status-chip domain="calculation" status="${calc.status}" appearance="soft" size="md"></app-status-chip>
                </div>
                <div class="calc-sub">
                  <span>${ctr?.title || '—'}</span>
                </div>
              </div>
            </div>

            <div class="status-control-box">
              <app-select
                size="sm"
                label="${t.viewTexts.calculationDetail.changeStatusLabel}"
                .value="${calc.status}"
                .options="${statusOptions}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  const nextStatus = eventValue(e) as CalculationStatus;
                  if (nextStatus && nextStatus !== calc.status) {
                    store.updateCalculationStatus(calc.id, nextStatus);
                  }
                }}"
              ></app-select>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.calculationDetail.kpiTotalHours}</span>
              <span class="kpi-val">${calc.totalHours.toFixed(1)} ${hUnit}</span>
              <span class="kpi-hint">${t.viewTexts.calculationDetail.kpiItemsHint(calc.items.length)}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.calculationDetail.kpiBillableHours}</span>
              <span class="kpi-val success">${calc.billableHours.toFixed(1)} ${hUnit}</span>
              <span class="kpi-hint">${t.calculations.billableLabel}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.calculationDetail.kpiNonBillableHours}</span>
              <span class="kpi-val">${calc.nonBillableHours.toFixed(1)} ${hUnit}</span>
              <span class="kpi-hint">${nonBillableItemsCount} ${t.viewTexts.calculations.itemsSuffix}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.calculationDetail.kpiBillableAmount}</span>
              <span class="kpi-val accent">${formatMoney(calc.billableAmount, calc.currency)}</span>
              <span class="kpi-hint">
                ${priorItemsCount > 0
                  ? t.viewTexts.calculationDetail.kpiPriorHint(priorItemsCount)
                  : calc.currency}
              </span>
            </div>
          </div>

          <div class="parties-grid">
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.calculations.partySupplier}</span>
              ${company
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCompanyDetail(company.id)}"
                    >
                      ${company.name}
                    </app-link>
                    <span class="kpi-hint mono">${t.viewTexts.calculations.innLabel}: ${company.inn}</span>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.calculations.partyClientApproval}</span>
              ${cp
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCounterpartyDetail(cp.id)}"
                    >
                      ${cp.name}
                    </app-link>
                    <span class="kpi-hint mono">${t.viewTexts.calculations.innLabel}: ${cp.inn}</span>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.calculationDetail.linkedProjectLabel}</span>
              ${project
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openProjectDetail(project.id)}"
                    >
                      <span slot="start" class="mono">[${project.key}]</span>
                      <span>${project.name}</span>
                    </app-link>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.calculationDetail.linkedInvoiceLabel}</span>
              ${linkedInv && ctr
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openContractDetail(ctr.id)}"
                    >
                      <span class="mono">${linkedInv.number}</span>
                    </app-link>
                    <span class="kpi-hint mono">${formatMoney(linkedInv.totalAmount, linkedInv.currency)}</span>
                  `
                : html`<span class="kpi-hint">${t.viewTexts.calculationDetail.notInvoicedYet}</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.calculationDetail.approvedDateLabel}</span>
              <span class="meta-val mono">${calc.approvedDate || '—'}</span>
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.calculationDetail.includePriorLabel}</span>
              <span class="meta-val">
                ${calc.includePriorUnaccounted
                  ? t.viewTexts.calculationDetail.yesLabel
                  : t.viewTexts.calculationDetail.noLabel}
              </span>
            </div>
          </div>
        </section>

        <!-- Items Breakdown -->
        <app-section-card
          title="${t.viewTexts.calculationDetail.itemsTitle}"
          subtitle="(${calc.items.length})"
        >
          <span slot="icon">${iconFolder(18)}</span>
          ${calc.items.length === 0
            ? html`<app-empty-state compact title="${t.viewTexts.calculations.emptyEditorItems}"></app-empty-state>`
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.calculations.thDate}</th>
                        <th>${t.viewTexts.calculationDetail.thSourceType}</th>
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
                          <tr class="${!item.billable ? 'is-nonbillable' : ''}">
                            <td class="mono" style="white-space: nowrap;">
                              <div>${item.date}</div>
                              ${item.isPriorPeriod
                                ? html`<span class="micro-tag prior">${t.calculations.priorBadge}</span>`
                                : ''}
                            </td>
                            <td>
                              <span class="micro-tag ${item.billable ? 'bill' : 'zero'}">
                                ${item.itemType === 'expense'
                                  ? t.viewTexts.calculations.typeExpense
                                  : item.itemType === 'time_entry'
                                  ? t.viewTexts.calculations.typeWork
                                  : t.viewTexts.calculations.typeManual}
                              </span>
                            </td>
                            <td>
                              ${item.taskId
                                ? html`
                                    <app-link
                                      class="link-btn task-link"
                                      size="md"
                                      variant="primary"
                                      @click="${() => store.openTaskDetail(item.taskId!)}"
                                    >
                                      ${item.title}
                                    </app-link>
                                  `
                                : item.title}
                            </td>
                            <td class="mono" style="white-space: nowrap;">
                              ${item.quantity} ${this.unitLabel(item.unit, t)}
                            </td>
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
                <div class="totals-footer">
                  <div class="total-item">
                    <span>${t.viewTexts.calculations.totalHoursLabel}:</span>
                    <strong class="mono">${calc.totalHours.toFixed(1)} ${hUnit}</strong>
                  </div>
                  <div class="total-item">
                    <span>${t.viewTexts.calculations.subtotalLabel}:</span>
                    <strong class="mono">${formatMoney(calc.billableAmount, calc.currency)}</strong>
                  </div>
                </div>
              `}
        </app-section-card>

        ${calc.notes
          ? html`
              <app-section-card title="${t.viewTexts.calculationDetail.notesTitle}">
                <span slot="icon">${iconFileText(18)}</span>
                <p class="notes-text">${calc.notes}</p>
              </app-section-card>
            `
          : ''}

        ${this.renderEditModal(calc, ctr, t)}

        <app-confirm-dialog
          .open="${this.confirmDeleteOpen}"
          size="sm"
          title="${t.viewTexts.confirmDialogs.calculationDelete.title}"
          action="${t.viewTexts.confirmDialogs.calculationDelete.action(calc.number)}"
          result="${t.viewTexts.confirmDialogs.calculationDelete.result}"
          .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
          .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
          .cancelLabel="${t.common.cancel}"
          .confirmLabel="${t.common.delete}"
          @cancel="${() => (this.confirmDeleteOpen = false)}"
          @confirm="${() => {
            store.deleteCalculation(calc.id);
            this.confirmDeleteOpen = false;
            store.setActiveView('calculations');
          }}"
        ></app-confirm-dialog>
      </div>
    `;
  }

  private openEditModal(calc: Calculation) {
    this.calcNumber = calc.number;
    this.calcFrequency = calc.frequency;
    this.calcPeriodStart = calc.periodStart;
    this.calcPeriodEnd = calc.periodEnd;
    this.calcIncludePrior = calc.includePriorUnaccounted;
    this.calcStatus = calc.status;
    this.calcItems = calc.items.map((item) => ({ ...item }));
    this.calcNotes = calc.notes;
    this.calcError = '';
    this.editModalOpen = true;
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

  private handleSave(calc: Calculation) {
    const t = getTranslation(this.currentLang);
    if (!this.calcNumber.trim()) {
      this.calcError = t.common.required;
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
      this.calcError = t.viewTexts.calculations.addOneItemError;
      return;
    }

    const hourItems = cleanItems.filter((i) => i.unit === 'ч');
    const billableHours =
      Math.round(hourItems.filter((i) => i.billable).reduce((s, i) => s + i.quantity, 0) * 100) / 100;
    const nonBillableHours =
      Math.round(hourItems.filter((i) => !i.billable).reduce((s, i) => s + i.quantity, 0) * 100) / 100;
    const totalHours = Math.round((billableHours + nonBillableHours) * 100) / 100;
    const billableAmount = cleanItems.filter((i) => i.billable).reduce((s, i) => s + i.amount, 0);

    const approvedDate =
      this.calcStatus === 'approved' || this.calcStatus === 'invoiced'
        ? calc.approvedDate || new Date().toISOString().slice(0, 10)
        : undefined;

    store.updateCalculation({
      ...calc,
      number: this.calcNumber.trim(),
      frequency: this.calcFrequency,
      periodStart: this.calcPeriodStart || calc.periodStart,
      periodEnd: this.calcPeriodEnd || calc.periodEnd,
      includePriorUnaccounted: this.calcIncludePrior,
      status: this.calcStatus,
      totalHours,
      billableHours,
      nonBillableHours,
      billableAmount,
      items: cleanItems,
      notes: this.calcNotes.trim(),
      approvedDate,
    });

    this.editModalOpen = false;
  }

  private renderEditModal(
    calc: Calculation,
    ctr: Contract | undefined,
    t: ReturnType<typeof getTranslation>
  ) {
    if (!this.editModalOpen) return '';
    const currency = ctr?.currency || calc.currency;
    const statusOptions = [
      { value: 'draft', label: t.calculations.statuses.draft },
      { value: 'sent', label: t.calculations.statuses.sent },
      { value: 'approved', label: t.calculations.statuses.approved },
      { value: 'rejected', label: t.calculations.statuses.rejected },
      { value: 'invoiced', label: t.calculations.statuses.invoiced },
    ];
    const frequencyOptions = [
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
    ];

    return html`
      <app-modal
        ?open="${this.editModalOpen}"
        size="xl"
        title="${t.calculations.editCalculation} · ${calc.number}"
        @close="${() => (this.editModalOpen = false)}"
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
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.calcPeriodStart = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.calculations.labelPeriodEnd}"
              .value="${this.calcPeriodEnd}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.calcPeriodEnd = eventValue(e))}"
            ></app-date-input>
          </div>

          <div class="col-span-2 autofill-bar">
            <app-checkbox
              ?checked="${this.calcIncludePrior}"
              label="${t.calculations.includePrior}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                (this.calcIncludePrior = e.detail.checked)}"
            ></app-checkbox>
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

            <div class="calc-items-list">
              ${this.calcItems.map(
                (item) => html`
                  <div class="calc-editor-row ${!item.billable ? 'is-nonbillable' : ''}">
                    <div class="calc-row-top">
                      <div class="calc-meta-col">
                        <span class="calc-date-tag">${item.date || '—'}</span>
                        <span class="micro-tag ${item.billable ? 'bill' : 'zero'}">
                          ${item.itemType === 'expense'
                            ? t.viewTexts.calculations.typeExpense
                            : item.itemType === 'time_entry'
                            ? t.viewTexts.calculations.typeWork
                            : t.viewTexts.calculations.typeManual}
                        </span>
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
                        ${formatMoney(item.billable ? item.amount : 0, currency)}
                      </div>
                      <app-button
                        class="danger-action"
                        size="xs"
                        variant="icon"
                        title="${t.common.delete}"
                        @click="${() => (this.calcItems = this.calcItems.filter((i) => i.id !== item.id))}"
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
          <app-button variant="ghost" @click="${() => (this.editModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSave(calc)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}
