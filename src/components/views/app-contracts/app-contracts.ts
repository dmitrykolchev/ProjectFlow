import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  Contract,
  ContractStatus,
  ContractType,
  Invoice,
} from '../../../types';
import {
  iconChevronRight,
  iconCreditCard,
  iconEdit,
  iconFileText,
  iconFilter,
  iconPlus,
  iconReceipt,
  iconTable,
  iconTrash,
} from '../../common/icons';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';

import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-payment-form/app-payment-form';
import '../../common/app-contract-form/app-contract-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import styles from './app-contracts.css';
import tableContentStyles from './app-contracts.table.content.css';
import { eventValue } from '../../common/event-value';

@customElement('app-contracts')
export class AppContracts extends LitElement {
  @state() private contracts: Contract[] = store.contracts;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private filterVisible: boolean = true;
  @state() private statusFilter: 'all' | ContractStatus = 'all';
  @state() private typeFilter: 'all' | ContractType = 'all';
  @state() private currentPage = 1;
  @state() private tablePageSize = store.customization.tablePageSize;

  @state() private modalOpen = false;
  @state() private editingContract: Contract | null = null;

  @state() private deletingContract: Contract | null = null;

  // Record Payment modal
  @state() private paymentModalOpen = false;
  @state() private paymentInvoiceId = '';

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
    this.currentPage = store.activeView === 'contracts' ? store.activePage : 1;
    this.contracts = store.contracts;
    this.calculations = store.calculations;
    this.invoices = store.invoices;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.tablePageSize = store.customization.tablePageSize;
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


  private getDaysRemaining(endDate: string): number | null {
    if (!endDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getFiltered(): Contract[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.contracts.filter((ctr) => {
      if (this.statusFilter !== 'all' && ctr.status !== this.statusFilter) return false;
      if (this.typeFilter !== 'all' && ctr.type !== this.typeFilter) return false;
      if (!query) return true;
      const company = store.companies.find((c) => c.id === ctr.companyId)?.name.toLowerCase() || '';
      const counterparty = store.counterparties.find((c) => c.id === ctr.counterpartyId)?.name.toLowerCase() || '';
      const project = store.projects.find((p) => p.id === ctr.projectId)?.name.toLowerCase() || '';
      return (
        ctr.number.toLowerCase().includes(query) ||
        ctr.title.toLowerCase().includes(query) ||
        company.includes(query) ||
        counterparty.includes(query) ||
        project.includes(query)
      );
    });
  }

  private getContractBillingStats(contractId: string): {
    invoiced: number;
    paid: number;
    count: number;
    calcCount: number;
    approvedCalcs: number;
  } {
    const related = this.invoices.filter((i) => i.contractId === contractId && i.status !== 'cancelled');
    const calcs = this.calculations.filter((c) => c.contractId === contractId);
    return {
      count: related.length,
      invoiced: related.reduce((sum, i) => sum + i.totalAmount, 0),
      paid: related.reduce((sum, i) => sum + store.getInvoicePaidAmount(i.id), 0),
      calcCount: calcs.length,
      approvedCalcs: calcs.filter((c) => c.status === 'approved').length,
    };
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFiltered();
    // Contracts registry reference rich cells (rendered inside the app-data-table shadow tree)
    const ctrNumberCell = (row: Record<string, unknown>) => {
      const ctr = row as unknown as Contract;
      return html`
        <app-link
          class="contract-link-btn"
          size="md"
          variant="primary"
          title="${t.contractDetail.openContract}"
          @click="${() => store.openContractDetail(ctr.id)}"
        >
          <span slot="start">${iconFileText(15)}</span>
          <span>${ctr.number}</span>
        </app-link>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">
          ${this.getTypeLabel(ctr.type, t)}${ctr.billingFrequency
            ? ` · ${t.calculations.frequencies[ctr.billingFrequency]}`
            : ''}
        </div>
      `;
    };
    const ctrTitleCell = (row: Record<string, unknown>) => {
      const ctr = row as unknown as Contract;
      return html`
        <div
          class="contract-title"
          style="cursor: pointer;"
          @click="${() => store.openContractDetail(ctr.id)}"
        >
          ${ctr.title}
        </div>
        <div class="contract-desc" title="${ctr.description}">${ctr.description || '—'}</div>
      `;
    };
    const ctrPartiesCell = (row: Record<string, unknown>) => {
      const ctr = row as unknown as Contract;
      const company = store.companies.find((c) => c.id === ctr.companyId);
      const cp = store.counterparties.find((c) => c.id === ctr.counterpartyId);
      const owner = store.users.find((u) => u.id === ctr.ownerId);
      return html`
        <div style="font-weight: 500;">${cp?.name || '—'}</div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">
          ${company?.name || '—'}${owner ? ` · ${owner.name}` : ''}
        </div>
      `;
    };
    const ctrProjectCell = (row: Record<string, unknown>) => {
      const ctr = row as unknown as Contract;
      const proj = store.projects.find((p) => p.id === ctr.projectId);
      return html`
        ${proj
          ? html`
              <span class="project-pill">
                <span class="project-dot" style="background: ${proj.color};"></span>
                <span>${proj.key}</span>
              </span>
            `
          : '—'}
      `;
    };
    const ctrAmountCell = (row: Record<string, unknown>) => {
      const ctr = row as unknown as Contract;
      const billing = this.getContractBillingStats(ctr.id);
      return html`
        <div class="amount-cell">
          ${formatMoney(ctr.amount, ctr.currency)}
          ${billing.count > 0 || billing.calcCount > 0
            ? html`
                <div class="billing-sub">
                  ${billing.calcCount > 0
                    ? html`<span class="calc-val">
                        ${t.viewTexts.contracts.calcShort}: ${billing.calcCount}${billing.approvedCalcs > 0 ? ` (${billing.approvedCalcs} ✓)` : ''}
                      </span>`
                    : ''}
                  ${billing.count > 0
                    ? html`<span>
                        ${billing.calcCount > 0 ? '· ' : ''}${t.viewTexts.contracts.invShort}: ${formatMoney(billing.invoiced, ctr.currency)}
                      </span>`
                    : ''}
                  ${billing.paid > 0
                    ? html`<span class="paid-val">· ${t.viewTexts.contracts.paidShort}: ${formatMoney(billing.paid, ctr.currency)}</span>`
                    : ''}
                </div>
              `
            : ''}
        </div>
      `;
    };
    const ctrTermCell = (row: Record<string, unknown>) => {
      const ctr = row as unknown as Contract;
      const daysLeft = ctr.status === 'active' ? this.getDaysRemaining(ctr.endDate) : null;
      return html`
        <div class="dates-cell">
          <div>${ctr.startDate} → ${ctr.endDate}</div>
          ${daysLeft !== null && daysLeft >= 0 && daysLeft <= 45
            ? html`<span class="expiry-warn">${t.viewTexts.contracts.daysLeftTemplate(daysLeft)}</span>`
            : ''}
        </div>
      `;
    };
    const ctrActionsCell = (row: Record<string, unknown>) => {
      const ctr = row as unknown as Contract;
      return html`
        <div class="ctr-actions-row">
          <app-button
            action="view"
            size="sm"
            variant="icon"
            title="${t.contractDetail.openContract}"
            @click="${() => store.openContractDetail(ctr.id)}"
          >
            <span slot="start">${iconChevronRight(15)}</span>
          </app-button>
          <app-button
            action="submit"
            size="sm"
            variant="icon"
            title="${t.contractDetail.createCalculation}"
            @click="${() => store.openContractDetail(ctr.id, 'calculation')}"
          >
            <span slot="start">${iconTable()}</span>
          </app-button>
          <app-button
            action="accept"
            size="sm"
            variant="icon"
            title="${t.contractDetail.issueInvoice}"
            @click="${() => store.openContractDetail(ctr.id, 'invoice')}"
          >
            <span slot="start">${iconReceipt(15)}</span>
          </app-button>
          <app-button
            size="sm"
            variant="icon"
            title="${t.common.edit}"
            @click="${() => this.openEditModal(ctr)}"
          >
            <span slot="start">${iconEdit(14)}</span>
          </app-button>
          <app-button
            action="delete"
            size="sm"
            variant="icon"
            title="${t.common.delete}"
            @click="${() => (this.deletingContract = ctr)}"
          >
            <span slot="start">${iconTrash(14)}</span>
          </app-button>
        </div>
      `;
    };

    const activeList = this.contracts.filter((c) => c.status === 'active');
    const rubTotal = activeList
      .filter((c) => c.currency === 'RUB')
      .reduce((acc, c) => acc + c.amount, 0);

    const rubInvoices = this.invoices.filter((i) => i.currency === 'RUB' && i.status !== 'cancelled');
    const rubInvoicedTotal = rubInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
    const rubPaidTotal = rubInvoices.reduce((acc, i) => acc + store.getInvoicePaidAmount(i.id), 0);
    const overdueInvoices = rubInvoices.filter((i) => store.getInvoiceDueControl(i).state === 'overdue');
    const rubOverdueDebt = overdueInvoices.reduce(
      (acc, i) => acc + store.getInvoiceRemainingAmount(i),
      0
    );
    const expiringSoon = activeList.filter((c) => {
      const days = this.getDaysRemaining(c.endDate);
      return days !== null && days >= 0 && days <= 45;
    }).length;

    const payableInvoices = this.invoices.filter(
      (i) => i.status !== 'draft' && i.status !== 'cancelled' && store.getInvoiceRemainingAmount(i) > 0
    );

    const statusOptions = [
      { value: 'all', label: t.viewTexts.contracts.filterAllStatuses },
      { value: 'draft', label: t.viewTexts.contracts.statusDraft, color: '#64748b' },
      { value: 'on_approval', label: t.viewTexts.contracts.statusOnApproval, color: '#f59e0b' },
      { value: 'active', label: t.viewTexts.contracts.statusActive, color: '#10b981' },
      { value: 'completed', label: t.viewTexts.contracts.statusCompleted, color: '#0284c7' },
      { value: 'terminated', label: t.viewTexts.contracts.statusTerminated, color: '#ef4444' },
    ];

    const typeOptions = [
      { value: 'all', label: t.viewTexts.counterparties.filterAllTypes },
      { value: 'service', label: t.viewTexts.counterpartyDetail.typeService },
      { value: 'supply', label: t.viewTexts.counterpartyDetail.typeSupply },
      { value: 'license', label: t.viewTexts.counterpartyDetail.typeLicense },
      { value: 'sla', label: 'SLA' },
      { value: 'nda', label: 'NDA' },
    ];


    return html`
      <app-page-header
        title="${t.viewTexts.contracts.pageTitle}"
        subtitle="${t.viewTexts.pageSubtitles.contracts}"
      >
        <span slot="icon">${iconFileText(28)}</span>
        <div slot="actions" style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
          ${payableInvoices.length > 0
            ? html`
                <app-button
                  variant="secondary"
                  size="md"
                  @click="${() => this.openPaymentModal(payableInvoices[0])}"
                >
                  <span slot="icon-start">${iconCreditCard(16)}</span>
                  <span>${t.payments.recordPayment}</span>
                </app-button>
              `
            : ''}
          <app-button variant="primary" size="md" @click="${() => this.openCreateModal()}">
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${t.viewTexts.contracts.newContractButton}</span>
          </app-button>
        </div>
      </app-page-header>

      <app-kpi-strip columns="6">
        <app-metric-card size="compact" label="${t.viewTexts.contracts.kpiTotal}" value="${this.contracts.length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.contracts.kpiActiveVolume}" value="${(rubTotal / 1_000_000).toFixed(2)}M ₽"></app-metric-card>
        <app-metric-card size="compact" label="${t.contractDetail.invoicedTotal} (RUB)" value="${(rubInvoicedTotal / 1_000_000).toFixed(2)}M ₽" valueColor="var(--accent-primary, #6366f1)"></app-metric-card>
        <app-metric-card size="compact" label="${t.contractDetail.paidTotal} (RUB)" value="${(rubPaidTotal / 1_000_000).toFixed(2)}M ₽" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${t.payments.overdueAlert} (${overdueInvoices.length})" value="${(rubOverdueDebt / 1_000_000).toFixed(2)}M ₽" valueColor="${rubOverdueDebt > 0 ? '#ef4444' : ''}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.contracts.kpiExpiring}" value="${expiringSoon}" valueColor="${expiringSoon > 0 ? '#f59e0b' : ''}"></app-metric-card>
      </app-kpi-strip>

      <!-- Canonical skeleton order: page header, KPI strip, filter toggle, filter bar, data
           representation. The calculations/invoices/payments tabs were removed from this view;
           those registries live in their own sidebar views. -->
      <div class="mode-row">
        <app-toggle-button
          size="sm"
          .pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) => (this.filterVisible = e.detail.pressed)}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filterToggle}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`<app-filter-bar
            style="--filter-search-min: 280px; --filter-search-max: 280px;"
            placeholder="${t.viewTexts.contracts.searchContracts}"
            .searchValue="${this.localSearch}"
            .filters="${[{ key: 'status', options: statusOptions }, { key: 'type', options: typeOptions }]}"
            .values="${{ status: this.statusFilter, type: this.typeFilter }}"
            @search-change="${(e: CustomEvent<{ value: string }>) => {
              this.localSearch = eventValue(e);
              this.currentPage = 1; store.setActivePage(1, false);
            }}"
            @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
              if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | ContractStatus;
              if (e.detail.key === 'type') this.typeFilter = eventValue(e) as 'all' | ContractType;
              this.currentPage = 1; store.setActivePage(1, false);
            }}"
          ></app-filter-bar>`
        : ''}

      ${filtered.length === 0
        ? html`<app-empty-state compact title="${t.viewTexts.contracts.emptyNoContracts}"></app-empty-state>`
        : html`
              <div class="table-card">
                <app-data-table
                  .contentStyles="${tableContentStyles}"
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
                  <app-table-column field="number" label="${t.viewTexts.contracts.thNumber}" .cellRender="${ctrNumberCell}"></app-table-column>
                  <app-table-column field="title" label="${t.viewTexts.counterpartyDetail.labelSubject}" .cellRender="${ctrTitleCell}"></app-table-column>
                  <app-table-column field="counterpartyId" label="${t.viewTexts.contracts.thParties}" .cellRender="${ctrPartiesCell}"></app-table-column>
                  <app-table-column field="projectId" label="${t.viewTexts.timeTracking.labelProject}" .cellRender="${ctrProjectCell}"></app-table-column>
                  <app-table-column field="amount" label="${t.viewTexts.contracts.thAmountBilled}" .cellRender="${ctrAmountCell}"></app-table-column>
                  <app-table-column field="startDate" label="${t.viewTexts.contracts.thTerm}" .cellRender="${ctrTermCell}"></app-table-column>
                  <app-table-column
                    field="status"
                    label="${t.viewTexts.counterparties.thStatus}"
                    .cellRender="${(row: Record<string, unknown>) => html`
                      <app-status-chip domain="contract" status="${(row as unknown as Contract).status}" size="sm"></app-status-chip>
                    `}"
                  ></app-table-column>
                  <app-table-column field="" label="" .cellRender="${ctrActionsCell}"></app-table-column>
                </app-data-table>
              </div>
            `}

      <app-contract-form
        .open="${this.modalOpen}"
        .contract="${this.editingContract}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-contract-form>

      <app-confirm-dialog
        .open="${Boolean(this.deletingContract)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.contractDelete.title}"
        action="${t.viewTexts.confirmDialogs.contractDelete.action(this.deletingContract?.number || '')}"
        result="${t.viewTexts.confirmDialogs.contractDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingContract = null)}"
        @confirm="${() => {
          if (this.deletingContract) {
            store.deleteContract(this.deletingContract.id);
            this.deletingContract = null;
          }
        }}"
      ></app-confirm-dialog>

      ${this.renderPaymentModal(t, payableInvoices)}
    `;
  }

  private renderPaymentModal(t: ReturnType<typeof getTranslation>, payableInvoices: Invoice[]) {
    const inv =
      this.invoices.find((i) => i.id === this.paymentInvoiceId) || payableInvoices[0] || null;
    if (!this.paymentModalOpen || !inv) return '';

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

  private openPaymentModal(inv: Invoice) {
    this.paymentInvoiceId = inv.id;
    this.paymentModalOpen = true;
  }

  private openCreateModal() {
    this.editingContract = null;
    this.modalOpen = true;
  }

  private openEditModal(ctr: Contract) {
    this.editingContract = ctr;
    this.modalOpen = true;
  }
}
