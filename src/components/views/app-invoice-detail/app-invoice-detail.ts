import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  Contract,
  Invoice,
  InvoicePayment,
  InvoiceStatus,
} from '../../../types';
import { formatMoney } from '../../common/app-money/app-money';
import { eventValue } from '../../common/event-value';
import {
  iconCalculator,
  iconChevronLeft,
  iconCreditCard,
  iconFileText,
  iconFolder,
  iconReceipt,
  iconTrash,
} from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-payment-form/app-payment-form';
import '../../common/app-section-card/app-section-card';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-entity-reminders/app-entity-reminders';
import styles from './app-invoice-detail.css';

@customElement('app-invoice-detail')
export class AppInvoiceDetail extends LitElement {
  @state() private invoices: Invoice[] = store.invoices;
  @state() private contracts: Contract[] = store.contracts;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private detailInvoiceId = store.detailInvoiceId;
  @state() private currentLang = store.customization.language;

  @state() private confirmDeleteOpen = false;
  @state() private paymentModalOpen = false;

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
    this.invoices = store.invoices;
    this.contracts = store.contracts;
    this.calculations = store.calculations;
    this.currentLang = store.customization.language;
    const candidate = store.detailInvoiceId || this.detailInvoiceId;
    if (candidate && this.invoices.some((i) => i.id === candidate)) {
      this.detailInvoiceId = candidate;
    } else {
      this.detailInvoiceId = this.invoices[0]?.id || '';
    }
  }

  private unitLabel(unit: string, t: ReturnType<typeof getTranslation>): string {
    if (unit === 'ч') return t.viewTexts.calculations.hoursUnitShort;
    if (unit === 'усл.') return t.viewTexts.contractDetail.unitConditional;
    if (unit === 'этап') return t.viewTexts.contractDetail.unitStage;
    return unit;
  }

  private dueHint(inv: Invoice, t: ReturnType<typeof getTranslation>): string {
    const ctrl = store.getInvoiceDueControl(inv);
    switch (ctrl.state) {
      case 'paid':
        return ctrl.daysDelta >= 0
          ? t.payments.paidOnTime
          : t.payments.paidLate.replace('{n}', String(Math.abs(ctrl.daysDelta)));
      case 'overdue':
        return t.payments.overdueBy.replace('{n}', String(ctrl.daysDelta));
      case 'due_soon':
      case 'on_track':
        return ctrl.daysDelta === 0
          ? t.payments.dueToday
          : t.payments.daysLeft.replace('{n}', String(ctrl.daysDelta));
      default:
        return t.invoices.statuses[inv.status];
    }
  }

  render() {
    const t = getTranslation(this.currentLang);
    const inv = this.invoices.find((i) => i.id === this.detailInvoiceId) || null;

    if (!inv) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.invoiceDetail.emptyNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('invoices')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.invoices.backToInvoices}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const ctr = this.contracts.find((c) => c.id === inv.contractId);
    const company = store.companies.find((c) => c.id === inv.companyId);
    const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);
    const project = inv.projectId ? store.projects.find((p) => p.id === inv.projectId) : undefined;
    const sourceCalc = inv.calculationId
      ? this.calculations.find((c) => c.id === inv.calculationId)
      : undefined;

    const payments = store.getInvoicePayments(inv.id);
    const paid = store.getInvoicePaidAmount(inv.id);
    const remaining = store.getInvoiceRemainingAmount(inv);
    const canPay = inv.status !== 'draft' && inv.status !== 'cancelled' && remaining > 0;

    const switcherOptions = this.invoices.map((item) => {
      const itemCp = store.counterparties.find((c) => c.id === item.counterpartyId);
      return {
        value: item.id,
        code: item.number,
        label: `${item.number} · ${formatMoney(item.totalAmount, item.currency)}`,
        subtitle: itemCp ? `${itemCp.name} (${item.dueDate})` : item.dueDate,
        meta: formatMoney(store.getInvoicePaidAmount(item.id), item.currency),
        badge: t.invoices.statuses[item.status],
      };
    });

    const statusOptions: Array<{ value: InvoiceStatus; label: string; color: string }> = [
      { value: 'draft', label: t.invoices.statuses.draft, color: '#64748b' },
      { value: 'issued', label: t.invoices.statuses.issued, color: '#0284c7' },
      { value: 'sent', label: t.invoices.statuses.sent, color: '#6366f1' },
      { value: 'partially_paid', label: t.invoices.statuses.partially_paid, color: '#f59e0b' },
      { value: 'paid', label: t.invoices.statuses.paid, color: '#10b981' },
      { value: 'overdue', label: t.invoices.statuses.overdue, color: '#ef4444' },
      { value: 'cancelled', label: t.invoices.statuses.cancelled, color: '#64748b' },
    ];

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('invoices')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.invoices.backToInvoices}</span>
            </app-button>

            <div class="invoice-switcher">
              <app-entity-selector
                size="sm"
                placeholder="${t.viewTexts.invoiceDetail.switcherPlaceholder}"
                .options="${switcherOptions}"
                .value="${inv.id}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  const nextId = eventValue(e);
                  if (nextId && nextId !== inv.id) {
                    store.openInvoiceDetail(nextId);
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
                    <span>${t.viewTexts.invoices.openContract}</span>
                  </app-button>
                `
              : ''}

            ${sourceCalc
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.openCalculationDetail(sourceCalc.id)}"
                  >
                    <span slot="icon-start">${iconCalculator(14)}</span>
                    <span>${t.viewTexts.invoices.openCalculation}</span>
                  </app-button>
                `
              : ''}

            ${canPay
              ? html`
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => (this.paymentModalOpen = true)}"
                  >
                    <span slot="icon-start">${iconCreditCard(14)}</span>
                    <span>${t.payments.recordPayment}</span>
                  </app-button>
                `
              : ''}

            <app-button
              action="delete"
              size="sm"
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
              <app-entity-emblem entity="invoice" size="lg"></app-entity-emblem>
              <div class="title-block">
                <div class="hero-meta-row">
                  <app-entity-emblem entity="invoice" variant="pill" size="sm"></app-entity-emblem>
                  <span>${t.viewTexts.invoiceDetail.issueDateLabel}:</span>
                  <span class="mono">${inv.issueDate}</span>
                  <span aria-hidden="true">·</span>
                  <span>${t.viewTexts.invoiceDetail.dueDateLabel}:</span>
                  <span class="mono">${inv.dueDate}</span>
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
                  <h1 class="invoice-title">${inv.number}</h1>
                  <app-status-chip domain="invoice" status="${inv.status}" appearance="soft" size="md"></app-status-chip>
                </div>
                <div class="invoice-sub">
                  <span>${cp?.name || '—'}</span>
                </div>
              </div>
            </div>

            <div class="status-control-box">
              <app-select
                size="sm"
                label="${t.viewTexts.invoiceDetail.changeStatusLabel}"
                .value="${inv.status}"
                .options="${statusOptions}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  const nextStatus = eventValue(e) as InvoiceStatus;
                  if (nextStatus && nextStatus !== inv.status) {
                    store.updateInvoiceStatus(inv.id, nextStatus);
                  }
                }}"
              ></app-select>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.invoiceDetail.kpiTotal}</span>
              <span class="kpi-val accent">${formatMoney(inv.totalAmount, inv.currency)}</span>
              <span class="kpi-hint">${inv.currency}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.invoiceDetail.kpiVat}</span>
              <span class="kpi-val">${formatMoney(inv.vatAmount, inv.currency)}</span>
              <span class="kpi-hint">${inv.vatRate}%</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.invoiceDetail.kpiPaid}</span>
              <span class="kpi-val success">${formatMoney(paid, inv.currency)}</span>
              <span class="kpi-hint">${payments.length} ${t.viewTexts.invoices.paymentsCountSuffix}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.invoiceDetail.kpiRemaining}</span>
              <span class="kpi-val">${formatMoney(remaining, inv.currency)}</span>
              <span class="kpi-hint">${this.dueHint(inv, t)}</span>
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
              <span class="meta-label">${t.viewTexts.invoices.labelContract}</span>
              ${ctr
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openContractDetail(ctr.id)}"
                    >
                      <span class="mono">${ctr.number}</span>
                    </app-link>
                    <span class="kpi-hint" title="${ctr.title}">${ctr.title}</span>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.invoiceDetail.linkedCalculationLabel}</span>
              ${sourceCalc
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCalculationDetail(sourceCalc.id)}"
                    >
                      <span class="mono">${sourceCalc.number}</span>
                    </app-link>
                    <span class="kpi-hint mono">${formatMoney(sourceCalc.billableAmount, sourceCalc.currency)}</span>
                  `
                : html`<span class="kpi-hint">${t.viewTexts.invoiceDetail.noCalculationLink}</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.invoiceDetail.linkedProjectLabel}</span>
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
              <span class="meta-label">${t.viewTexts.invoiceDetail.paidDateLabel}</span>
              <span class="meta-val mono">${inv.paidDate || '—'}</span>
            </div>
          </div>
        </section>

        <!-- Items -->
        <app-section-card
          title="${t.viewTexts.invoiceDetail.itemsTitle}"
          subtitle="(${inv.items.length})"
        >
          <span slot="icon">${iconReceipt(18)}</span>
          ${inv.items.length === 0
            ? html`<app-empty-state compact title="${t.viewTexts.invoices.emptySubtitle}"></app-empty-state>`
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.calculations.thWorkExpense}</th>
                        <th>${t.viewTexts.calculations.labelQty}</th>
                        <th>${t.viewTexts.calculations.thPrice}</th>
                        <th>${t.viewTexts.calculations.thAmount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${inv.items.map(
                        (item) => html`
                          <tr>
                            <td>${item.title}</td>
                            <td class="mono" style="white-space: nowrap;">
                              ${item.quantity} ${this.unitLabel(item.unit, t)}
                            </td>
                            <td class="mono" style="white-space: nowrap;">
                              ${formatMoney(item.unitPrice, inv.currency)}
                            </td>
                            <td class="mono" style="font-weight: 700; white-space: nowrap;">
                              ${formatMoney(item.amount, inv.currency)}
                            </td>
                          </tr>
                        `
                      )}
                    </tbody>
                  </table>
                </div>
                <div class="totals-footer">
                  <div class="total-item">
                    <span>${t.viewTexts.invoiceDetail.subtotalLabel}:</span>
                    <strong class="mono">${formatMoney(inv.subtotal, inv.currency)}</strong>
                  </div>
                  <div class="total-item">
                    <span>${t.viewTexts.contracts.vatLabel} (${inv.vatRate}%):</span>
                    <strong class="mono">${formatMoney(inv.vatAmount, inv.currency)}</strong>
                  </div>
                  <div class="total-item">
                    <span>${t.viewTexts.invoiceDetail.kpiTotal}:</span>
                    <strong class="mono">${formatMoney(inv.totalAmount, inv.currency)}</strong>
                  </div>
                </div>
              `}
        </app-section-card>

        <!-- Payments -->
        <app-section-card
          title="${t.viewTexts.invoiceDetail.paymentsTitle}"
          subtitle="(${payments.length})"
        >
          <span slot="icon">${iconFolder(18)}</span>
          ${payments.length === 0
            ? html`<app-empty-state compact title="${t.viewTexts.invoiceDetail.emptyNoPayments}"></app-empty-state>`
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.invoiceDetail.thPaymentDate}</th>
                        <th>${t.viewTexts.invoiceDetail.thPaymentDoc}</th>
                        <th>${t.viewTexts.invoiceDetail.thPaymentMethod}</th>
                        <th>${t.viewTexts.invoiceDetail.thPaymentAmount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${payments.map(
                        (p: InvoicePayment) => html`
                          <tr>
                            <td class="mono" style="white-space: nowrap;">${p.paymentDate}</td>
                            <td>
                              <app-link
                                class="link-btn task-link"
                                size="md"
                                variant="primary"
                                @click="${() => store.openPaymentDetail(p.id)}"
                              >
                                <span class="mono">${p.documentNumber}</span>
                              </app-link>
                            </td>
                            <td>${t.payments.methods[p.method]}</td>
                            <td class="mono" style="font-weight: 700; white-space: nowrap;">
                              ${formatMoney(p.amount, p.currency)}
                            </td>
                          </tr>
                        `
                      )}
                    </tbody>
                  </table>
                </div>
              `}
        </app-section-card>

        ${inv.notes
          ? html`
              <app-section-card title="${t.viewTexts.invoiceDetail.notesTitle}">
                <span slot="icon">${iconFileText(18)}</span>
                <p class="notes-text">${inv.notes}</p>
              </app-section-card>
            `
          : ''}

        <app-entity-reminders entity-type="invoice" .entityId="${inv.id}"></app-entity-reminders>

        ${this.renderPaymentModal(t, inv)}

        <app-confirm-dialog
          .open="${this.confirmDeleteOpen}"
          size="sm"
          title="${t.viewTexts.confirmDialogs.invoiceDelete.title}"
          action="${t.viewTexts.confirmDialogs.invoiceDelete.action(inv.number)}"
          result="${t.viewTexts.confirmDialogs.invoiceDelete.result}"
          .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
          .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
          .cancelLabel="${t.common.cancel}"
          .confirmLabel="${t.common.delete}"
          @cancel="${() => (this.confirmDeleteOpen = false)}"
          @confirm="${() => {
            store.deleteInvoice(inv.id);
            this.confirmDeleteOpen = false;
            store.setActiveView('invoices');
          }}"
        ></app-confirm-dialog>
      </div>
    `;
  }

  private renderPaymentModal(t: ReturnType<typeof getTranslation>, inv: Invoice) {
    if (!this.paymentModalOpen) return '';
    const payableInvoices = this.invoices.filter(
      (i) =>
        i.status !== 'draft' &&
        i.status !== 'cancelled' &&
        (store.getInvoiceRemainingAmount(i) > 0 || i.id === inv.id)
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
}
