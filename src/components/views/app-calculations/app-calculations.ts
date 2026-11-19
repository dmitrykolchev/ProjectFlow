import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  CalculationFrequency,
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
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-modal/app-modal';
import '../../common/app-calculation-form/app-calculation-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import '../../common/app-entity-emblem/app-entity-emblem';
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
  @state() private editingCalculation: Calculation | null = null;
  @state() private presetCalcContractId: string | null = null;

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

  render() {
    const t = getTranslation(this.currentLang);
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
    // Calculations registry reference rich cells (rendered inside the app-data-table shadow tree)
    const calcNumberCell = (row: Record<string, unknown>) => {
      const calc = row as unknown as Calculation;
      const priorCount = calc.items.filter((i) => i.isPriorPeriod).length;
      const nonBillableItems = calc.items.filter((i) => !i.billable).length;
      return html`
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
      `;
    };
    const calcContractCell = (row: Record<string, unknown>) => {
      const calc = row as unknown as Calculation;
      const ctr = this.contracts.find((c) => c.id === calc.contractId);
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
              <div class="calc-contract-desc" title="${ctr.title}">${ctr.title}</div>
            `
          : '—'}
      `;
    };
    const calcCpCell = (row: Record<string, unknown>) => {
      const calc = row as unknown as Calculation;
      const cp = store.counterparties.find((c) => c.id === calc.counterpartyId);
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
    const calcPeriodCell = (row: Record<string, unknown>) => {
      const calc = row as unknown as Calculation;
      return html`
        <div class="mono" style="white-space: nowrap;">
          ${calc.periodStart} → ${calc.periodEnd}
        </div>
        <div class="cell-sub">${t.calculations.frequencies[calc.frequency]}</div>
      `;
    };
    const calcHoursCell = (row: Record<string, unknown>) => {
      const calc = row as unknown as Calculation;
      return html`
        <div>${calc.billableHours} ${hUnit}</div>
        ${calc.nonBillableHours > 0
          ? html`<div class="cell-sub">+${calc.nonBillableHours} ${hUnit} (0 ₽)</div>`
          : ''}
      `;
    };
    const calcAmountCell = (row: Record<string, unknown>) => {
      const calc = row as unknown as Calculation;
      const linkedInv = calc.invoiceId
        ? this.invoices.find((i) => i.id === calc.invoiceId)
        : undefined;
      return html`
        <div class="amount-cell">
          <div>${formatMoney(calc.billableAmount, calc.currency)}</div>
          ${linkedInv
            ? html`<div class="cell-sub" style="color: #10b981;">${linkedInv.number}</div>`
            : ''}
        </div>
      `;
    };
    const calcActionsCell = (row: Record<string, unknown>) => {
      const calc = row as unknown as Calculation;
      const ctr = this.contracts.find((c) => c.id === calc.contractId);
      return html`
        <div class="ctr-actions-row">
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
                  action="submit"
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
                  action="accept"
                  size="sm"
                  variant="icon"
                  title="${t.calculations.approveCalc}"
                  @click="${() => store.updateCalculationStatus(calc.id, 'approved')}"
                >
                  <span slot="start">${iconCheck(14)}</span>
                </app-button>
                <app-button
                  action="reject"
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
                  action="accept"
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
            action="delete"
            size="sm"
            variant="icon"
            title="${t.common.delete}"
            @click="${() => (this.deletingCalculation = calc)}"
          >
            <span slot="start">${iconTrash(14)}</span>
          </app-button>
        </div>
      `;
    };

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
              <app-data-table
                .rows="${filtered}"
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
                <app-table-column field="number" label="${t.viewTexts.calculations.thCalculation}" .cellRender="${calcNumberCell}"></app-table-column>
                <app-table-column field="contractId" label="${t.viewTexts.calculations.thContract}" .cellRender="${calcContractCell}"></app-table-column>
                <app-table-column field="counterpartyId" label="${t.viewTexts.calculations.thCounterparty}" .cellRender="${calcCpCell}"></app-table-column>
                <app-table-column field="periodStart" label="${t.viewTexts.calculations.thPeriodCycle}" .cellRender="${calcPeriodCell}"></app-table-column>
                <app-table-column field="billableHours" label="${t.viewTexts.calculations.thLabor}" mono .cellRender="${calcHoursCell}"></app-table-column>
                <app-table-column field="billableAmount" label="${t.viewTexts.calculations.thBillableCol}" .cellRender="${calcAmountCell}"></app-table-column>
                <app-table-column
                  field="status"
                  label="${t.viewTexts.calculations.thStatus}"
                  .cellRender="${(row: Record<string, unknown>) => html`
                    <app-status-chip
                      domain="calculation"
                      status="${(row as unknown as Calculation).status}"
                      appearance="soft"
                      size="sm"
                    ></app-status-chip>
                  `}"
                ></app-table-column>
                <app-table-column field="" label="" .cellRender="${calcActionsCell}"></app-table-column>
              </app-data-table>
            </div>
          `}

      ${this.renderFormModal(t)}
      ${this.renderPreviewModal(t)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderFormModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-calculation-form
        .open="${this.calcModalOpen}"
        .calculation="${this.editingCalculation}"
        .presetContractId="${this.presetCalcContractId}"
        .showContractSelect="${true}"
        @close="${() => (this.calcModalOpen = false)}"
        @saved="${() => (this.calcModalOpen = false)}"
      ></app-calculation-form>
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
    this.editingCalculation = null;
    this.presetCalcContractId = this.contractFilter !== 'all' ? this.contractFilter : null;
    this.calcModalOpen = true;
  }

  private openEditModal(calc: Calculation) {
    this.editingCalculation = calc;
    this.calcModalOpen = true;
  }
}
