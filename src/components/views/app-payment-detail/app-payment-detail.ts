import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  BankRequisite,
  Invoice,
  InvoicePayment,
} from '../../../types';
import { formatMoney } from '../../common/app-money/app-money';
import { eventValue } from '../../common/event-value';
import {
  iconArrowDownLeft,
  iconArrowUpRight,
  iconBuilding,
  iconChevronLeft,
  iconCreditCard,
  iconEdit,
  iconFileText,
  iconHandshake,
  iconLandmark,
  iconReceipt,
  iconTrash,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-entity-reminders/app-entity-reminders';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-link/app-link';
import '../../common/app-payment-form/app-payment-form';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-status-chip/app-status-chip';
import detailShellStyles from '../../common/app-detail-shell/app-detail-shell.css';
import styles from './app-payment-detail.css';

const FX_TO_RUB: Record<string, number> = {
  RUB: 1,
  USD: 92,
  EUR: 100,
  CNY: 12.8,
  GBP: 116,
  KZT: 0.2,
  AED: 25,
};

@customElement('app-payment-detail')
export class AppPaymentDetail extends LitElement {
  @state() private payments: InvoicePayment[] = store.payments;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private detailPaymentId: string = store.detailPaymentId;
  @state() private currentLang = store.customization.language;

  @state() private editModalOpen = false;
  @state() private confirmDeleteOpen = false;

  private unsubscribe?: () => void;

  static styles = [detailShellStyles, styles];

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
    this.payments = store.payments;
    this.invoices = store.invoices;
    this.currentLang = store.customization.language;
    const candidate = store.detailPaymentId || this.detailPaymentId;
    if (candidate && this.payments.some((p) => p.id === candidate)) {
      this.detailPaymentId = candidate;
    } else {
      this.detailPaymentId = this.payments[0]?.id || '';
    }
  }

  private toRub(amount: number, currency: string): number {
    return Math.round(amount * (FX_TO_RUB[currency] ?? 1));
  }

  private renderRequisiteCard(opts: {
    title: string;
    entityName: string;
    entityKind: 'company' | 'counterparty';
    inn?: string;
    kpp?: string;
    account?: BankRequisite;
    snapshot?: string;
    emptyText: string;
    onOpenEntity?: () => void;
    t: ReturnType<typeof getTranslation>;
  }) {
    const { t, account, snapshot } = opts;
    return html`
      <div class="requisite-card">
        <div class="requisite-card-head">
          <div class="requisite-card-title-col">
            <span class="meta-label">${opts.title}</span>
            ${opts.onOpenEntity
              ? html`
                  <app-link
                    class="link-btn meta-link"
                    size="md"
                    variant="primary"
                    @click="${opts.onOpenEntity}"
                  >
                    <span slot="start">
                      <app-entity-emblem entity="${opts.entityKind}" size="xs"></app-entity-emblem>
                    </span>
                    <span>${opts.entityName}</span>
                  </app-link>
                `
              : html`<span class="meta-val">${opts.entityName}</span>`}
          </div>
          ${account
            ? html`
                <app-badge variant="default" appearance="soft" size="sm">
                  ${account.currency}
                </app-badge>
              `
            : ''}
        </div>

        ${account
          ? html`
              <div class="requisite-rows">
                <div class="req-row">
                  <span class="req-label">${t.viewTexts.paymentDetail.labelBankName}</span>
                  <span class="req-val">${account.bankName}</span>
                </div>
                <div class="req-row">
                  <span class="req-label">${t.viewTexts.paymentDetail.labelAccountNumber}</span>
                  <span class="req-val mono">${account.accountNumber}</span>
                </div>
                ${account.corrAccount
                  ? html`
                      <div class="req-row">
                        <span class="req-label">${t.viewTexts.paymentDetail.labelCorrAccount}</span>
                        <span class="req-val mono">${account.corrAccount}</span>
                      </div>
                    `
                  : ''}
                ${account.bik || account.swift
                  ? html`
                      <div class="req-row">
                        <span class="req-label">${t.viewTexts.paymentDetail.labelBik}</span>
                        <span class="req-val mono">
                          ${[account.bik, account.swift].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    `
                  : ''}
                ${opts.inn
                  ? html`
                      <div class="req-row">
                        <span class="req-label">${t.viewTexts.paymentDetail.labelInnKpp}</span>
                        <span class="req-val mono">
                          ${opts.inn}${opts.kpp ? ` / ${opts.kpp}` : ''}
                        </span>
                      </div>
                    `
                  : ''}
              </div>
            `
          : snapshot
          ? html`
              <div class="requisite-rows">
                <div class="req-row">
                  <span class="req-label">${t.viewTexts.paymentDetail.snapshotHint}</span>
                  <span class="req-val mono">${snapshot}</span>
                </div>
                ${opts.inn
                  ? html`
                      <div class="req-row">
                        <span class="req-label">${t.viewTexts.paymentDetail.labelInnKpp}</span>
                        <span class="req-val mono">
                          ${opts.inn}${opts.kpp ? ` / ${opts.kpp}` : ''}
                        </span>
                      </div>
                    `
                  : ''}
              </div>
            `
          : html`<p class="notes-text is-empty">${opts.emptyText}</p>`}
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const pay = this.payments.find((p) => p.id === this.detailPaymentId) || null;

    if (!pay) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.paymentDetail.emptyNotFound}">
            <app-button
              slot="action"
              variant="primary"
              @click="${() => store.setActiveView('payments')}"
            >
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.viewTexts.paymentDetail.backToList}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const direction = pay.direction || store.inferPaymentDirection(pay.counterpartyId);
    const isOutgoing = direction === 'outgoing';
    const company = store.companies.find((c) => c.id === pay.companyId);
    const cp = store.counterparties.find((c) => c.id === pay.counterpartyId);
    const inv = pay.invoiceId
      ? this.invoices.find((i) => i.id === pay.invoiceId)
      : undefined;
    const contract = pay.contractId
      ? store.contracts.find((c) => c.id === pay.contractId)
      : inv?.contractId
      ? store.contracts.find((c) => c.id === inv.contractId)
      : undefined;

    const compAcc = store.getPaymentCompanyAccount(pay);
    const cpAcc = store.getPaymentCounterpartyAccount(pay);
    const compReqLabel = store.getPaymentCompanyRequisitesLabel(pay) || t.viewTexts.paymentDetail.noRequisites;
    const cpReqLabel = store.getPaymentCounterpartyRequisitesLabel(pay) || t.viewTexts.paymentDetail.noRequisites;

    const rubEquivalent = this.toRub(pay.amount, pay.currency);

    const siblingPayments = inv
      ? this.payments
          .filter((p) => p.invoiceId === inv.id && p.id !== pay.id)
          .sort((a, b) => (b.paymentDate + b.createdAt).localeCompare(a.paymentDate + a.createdAt))
      : [];

    const invPaidTotal = inv ? store.getInvoicePaidAmount(inv.id) : 0;
    const invRemaining = inv ? store.getInvoiceRemainingAmount(inv) : 0;
    const invPaidPct =
      inv && inv.totalAmount > 0
        ? Math.min(100, Math.round((invPaidTotal / inv.totalAmount) * 100))
        : 0;

    const payableInvoices = this.invoices.filter(
      (i) => i.status !== 'draft' && i.status !== 'cancelled' && (store.getInvoiceRemainingAmount(i) > 0 || i.id === pay.invoiceId)
    );

    const switcherOptions = this.payments.slice(0, 80).map((item) => {
      const itemCp = store.counterparties.find((c) => c.id === item.counterpartyId);
      const itemComp = store.companies.find((c) => c.id === item.companyId);
      const itemDir = item.direction || store.inferPaymentDirection(item.counterpartyId);
      return {
        value: item.id,
        code: item.paymentDate,
        label: item.documentNumber || item.id,
        subtitle: `${itemComp?.name || '—'} · ${itemCp?.name || t.viewTexts.payments.standalonePayment}`,
        meta: `${itemDir === 'outgoing' ? '−' : '+'}${formatMoney(item.amount, item.currency)}`,
        badge: t.payments.directions[itemDir],
      };
    });

    const createdFormatted = new Date(pay.createdAt).toLocaleString(t.common.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('payments')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.viewTexts.paymentDetail.backToList}</span>
            </app-button>

            <div class="pay-switcher">
              <app-entity-selector
                size="sm"
                placeholder="${t.viewTexts.paymentDetail.switcherPlaceholder}"
                .options="${switcherOptions}"
                .value="${pay.id}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  const nextId = eventValue(e);
                  if (nextId && nextId !== pay.id) {
                    store.openPaymentDetail(nextId);
                  }
                }}"
              ></app-entity-selector>
            </div>
          </div>

          <div class="nav-actions">
            ${contract
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.openContractDetail(contract.id)}"
                  >
                    <span slot="icon-start">${iconFileText(14)}</span>
                    <span>${t.viewTexts.paymentDetail.openInvoiceContractBtn}</span>
                  </app-button>
                `
              : ''}

            ${company
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.openCompanyDetail(company.id)}"
                  >
                    <span slot="icon-start">${iconBuilding(14)}</span>
                    <span>${t.viewTexts.paymentDetail.openCompanyBtn}</span>
                  </app-button>
                `
              : ''}

            ${cp
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                  >
                    <span slot="icon-start">${iconHandshake(14)}</span>
                    <span>${t.viewTexts.paymentDetail.openCounterpartyBtn}</span>
                  </app-button>
                `
              : ''}

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => (this.editModalOpen = true)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <app-button
              action="delete"
              size="xs"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <app-entity-emblem entity="payment" size="lg"></app-entity-emblem>
              <div class="title-block">
                <div class="hero-meta-row">
                  <app-entity-emblem entity="payment" variant="pill" size="sm"></app-entity-emblem>
                  <span class="mono">${pay.paymentDate}</span>
                  <span aria-hidden="true">·</span>
                  <span>${t.payments.methods[pay.method]}</span>
                  ${inv
                    ? html`
                        <span aria-hidden="true">·</span>
                        <span class="mono">${inv.number}</span>
                      `
                    : html`
                        <span aria-hidden="true">·</span>
                        <span>${t.viewTexts.payments.standalonePayment}</span>
                      `}
                </div>

                <div class="title-row">
                  <h1 class="pay-title">${pay.documentNumber || pay.id}</h1>
                  <app-status-chip
                    domain="paymentDirection"
                    status="${direction}"
                    appearance="soft"
                    size="md"
                  ></app-status-chip>
                  <app-badge variant="default" appearance="soft" size="sm">
                    ${t.payments.methods[pay.method]}
                  </app-badge>
                </div>

                <div class="pay-sub">
                  <span>${company?.name || '—'}</span>
                  <span aria-hidden="true">·</span>
                  <span>${cp?.name || t.viewTexts.paymentDetail.noCounterparty}</span>
                </div>
              </div>
            </div>

            <div class="hero-amount-box ${isOutgoing ? 'is-outgoing' : 'is-incoming'}">
              <span class="hero-amount-sign">
                ${isOutgoing ? iconArrowUpRight(18) : iconArrowDownLeft(18)}
              </span>
              <span class="hero-amount-val">
                ${isOutgoing ? '−' : '+'}${formatMoney(pay.amount, pay.currency)}
              </span>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.paymentDetail.kpiAmount}</span>
              <span class="kpi-val ${isOutgoing ? 'warning' : 'success'}">
                ${isOutgoing ? '−' : '+'}${formatMoney(pay.amount, pay.currency)}
              </span>
              <span class="kpi-hint">${pay.currency}</span>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.paymentDetail.kpiRubEquivalent}</span>
              <span class="kpi-val accent">${formatMoney(rubEquivalent, 'RUB')}</span>
              <span class="kpi-hint">${t.payments.directions[direction]}</span>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.paymentDetail.kpiMethodDate}</span>
              <span class="kpi-val">${pay.paymentDate}</span>
              <span class="kpi-hint">${t.payments.methods[pay.method]}</span>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.paymentDetail.kpiBasis}</span>
              <span class="kpi-val">
                ${inv ? inv.number : t.viewTexts.payments.standalonePayment}
              </span>
              <span class="kpi-hint">
                ${inv
                  ? t.viewTexts.paymentDetail.kpiInvoiceLinked
                  : t.viewTexts.paymentDetail.kpiStandalone}
              </span>
            </div>
          </div>

          <div class="context-grid">
            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.paymentDetail.labelPaymentDoc}</span>
              <span class="meta-val mono">${pay.documentNumber || '—'}</span>
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.payments.labelCompany}</span>
              ${company
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCompanyDetail(company.id)}"
                    >
                      <span>${company.name}</span>
                    </app-link>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.payments.labelCounterparty}</span>
              ${cp
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openCounterpartyDetail(cp.id)}"
                    >
                      <span>${cp.name}</span>
                    </app-link>
                  `
                : html`<span class="meta-val">${t.viewTexts.paymentDetail.noCounterparty}</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.paymentDetail.labelCreatedAt}</span>
              <span class="meta-val mono">${createdFormatted}</span>
            </div>
          </div>
        </section>

        <!-- Fund Flow & Bank Requisites -->
        <app-section-card title="${t.viewTexts.paymentDetail.flowTitle}">
          <span slot="icon">${iconLandmark(18)}</span>

          <div class="flow-strip ${isOutgoing ? 'is-outgoing' : ''}">
            <div class="flow-party">
              <span class="flow-role">${t.viewTexts.payments.payerLabel}</span>
              <span class="flow-name">
                ${isOutgoing ? company?.name || '—' : cp?.name || t.viewTexts.paymentDetail.noCounterparty}
              </span>
              <span class="flow-account">${isOutgoing ? compReqLabel : cpReqLabel}</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              ${isOutgoing ? iconArrowUpRight(18) : iconArrowDownLeft(18)}
            </span>
            <div class="flow-party">
              <span class="flow-role">${t.viewTexts.payments.recipientLabel}</span>
              <span class="flow-name">
                ${isOutgoing ? cp?.name || t.viewTexts.paymentDetail.noCounterparty : company?.name || '—'}
              </span>
              <span class="flow-account">${isOutgoing ? cpReqLabel : compReqLabel}</span>
            </div>
          </div>

          <div class="requisites-grid">
            ${this.renderRequisiteCard({
              title: t.viewTexts.paymentDetail.companyRequisitesTitle,
              entityName: company?.name || '—',
              entityKind: 'company',
              inn: company?.inn,
              kpp: company?.kpp,
              account: compAcc,
              snapshot: pay.companyBankSnapshot,
              emptyText: t.viewTexts.paymentDetail.noRequisites,
              onOpenEntity: company ? () => store.openCompanyDetail(company.id) : undefined,
              t,
            })}

            ${this.renderRequisiteCard({
              title: t.viewTexts.paymentDetail.counterpartyRequisitesTitle,
              entityName: cp?.name || t.viewTexts.paymentDetail.noCounterparty,
              entityKind: 'counterparty',
              inn: cp?.inn,
              kpp: cp?.kpp,
              account: cpAcc,
              snapshot: pay.counterpartyBankSnapshot,
              emptyText: t.viewTexts.paymentDetail.noRequisites,
              onOpenEntity: cp ? () => store.openCounterpartyDetail(cp.id) : undefined,
              t,
            })}
          </div>
        </app-section-card>

        <!-- Linked Invoice & Settlement Progress -->
        <app-section-card title="${t.viewTexts.paymentDetail.invoiceSectionTitle}">
          <span slot="icon">${iconReceipt(18)}</span>
          ${inv
            ? html`
                <div class="invoice-panel">
                  <div class="invoice-meta-grid">
                    <div class="meta-box">
                      <span class="meta-label">${t.viewTexts.paymentDetail.labelInvoiceNumber}</span>
                      <div class="title-row">
                        ${contract
                          ? html`
                              <app-link
                                class="link-btn meta-link"
                                size="md"
                                variant="primary"
                                @click="${() => store.openContractDetail(contract.id)}"
                              >
                                <span class="mono">${inv.number}</span>
                              </app-link>
                            `
                          : html`<span class="meta-val mono">${inv.number}</span>`}
                        <app-status-chip domain="invoice" status="${inv.status}" size="sm"></app-status-chip>
                      </div>
                    </div>

                    <div class="meta-box">
                      <span class="meta-label">${t.viewTexts.paymentDetail.labelContract}</span>
                      ${contract
                        ? html`
                            <app-link
                              class="link-btn meta-link"
                              size="md"
                              variant="primary"
                              @click="${() => store.openContractDetail(contract.id)}"
                            >
                              <span class="mono">${contract.number}</span>
                              <span>· ${contract.title}</span>
                            </app-link>
                          `
                        : html`<span class="meta-val">—</span>`}
                    </div>

                    <div class="meta-box">
                      <span class="meta-label">${t.viewTexts.paymentDetail.labelInvoiceDates}</span>
                      <span class="meta-val mono">${inv.issueDate} → ${inv.dueDate}</span>
                    </div>

                    <div class="meta-box">
                      <span class="meta-label">${t.viewTexts.paymentDetail.labelRemainingDue}</span>
                      <span class="meta-val mono">${formatMoney(invRemaining, inv.currency)}</span>
                    </div>
                  </div>

                  <div class="invoice-progress-wrap">
                    <div class="progress-head">
                      <span>${t.viewTexts.paymentDetail.labelInvoiceProgress} (${invPaidPct}%)</span>
                      <span class="mono">
                        ${formatMoney(invPaidTotal, inv.currency)} / ${formatMoney(inv.totalAmount, inv.currency)}
                      </span>
                    </div>
                    <app-progress-bar
                      .segments="${[
                        { value: invPaidPct, color: '#10b981', label: t.payments.paidAmount },
                      ]}"
                    ></app-progress-bar>
                  </div>

                  <div class="siblings-block">
                    <h4 class="sub-heading">${t.viewTexts.paymentDetail.siblingPaymentsTitle}</h4>
                    ${siblingPayments.length === 0
                      ? html`<p class="notes-text is-empty">${t.viewTexts.paymentDetail.siblingPaymentsEmpty}</p>`
                      : html`
                          <div class="table-wrap">
                            <table class="data-table">
                              <thead>
                                <tr>
                                  <th>${t.viewTexts.paymentDetail.thDoc}</th>
                                  <th>${t.viewTexts.paymentDetail.thDate}</th>
                                  <th>${t.viewTexts.paymentDetail.thMethod}</th>
                                  <th>${t.viewTexts.paymentDetail.thAmount}</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${siblingPayments.map(
                                  (sib) => html`
                                    <tr>
                                      <td>
                                        <app-link
                                          class="link-btn task-link"
                                          size="md"
                                          variant="primary"
                                          @click="${() => store.openPaymentDetail(sib.id)}"
                                        >
                                          <span class="mono">${sib.documentNumber || sib.id}</span>
                                        </app-link>
                                      </td>
                                      <td class="mono">${sib.paymentDate}</td>
                                      <td>${t.payments.methods[sib.method]}</td>
                                      <td class="mono">${formatMoney(sib.amount, sib.currency)}</td>
                                    </tr>
                                  `
                                )}
                              </tbody>
                            </table>
                          </div>
                        `}
                  </div>
                </div>
              `
            : html`<p class="notes-text is-empty">${t.viewTexts.paymentDetail.noInvoiceSectionHint}</p>`}
        </app-section-card>

        <!-- Payment Notes -->
        <app-section-card title="${t.viewTexts.paymentDetail.notesTitle}">
          <span slot="icon">${iconCreditCard(18)}</span>
          <p class="notes-text ${pay.notes ? '' : 'is-empty'}">
            ${pay.notes || t.viewTexts.paymentDetail.emptyNotes}
          </p>
        </app-section-card>

        <app-entity-reminders entity-type="payment" .entityId="${pay.id}"></app-entity-reminders>
      </div>

      <app-payment-form
        .open="${this.editModalOpen}"
        .payment="${pay}"
        .invoice="${inv || null}"
        .payableInvoices="${payableInvoices}"
        @close="${() => (this.editModalOpen = false)}"
        @saved="${() => (this.editModalOpen = false)}"
      ></app-payment-form>

      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.paymentDelete.title}"
        action="${t.viewTexts.confirmDialogs.paymentDelete.action}"
        result="${t.viewTexts.confirmDialogs.paymentDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteInvoicePayment(pay.id);
        }}"
      ></app-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-payment-detail': AppPaymentDetail;
  }
}
