import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  Contract,
  Counterparty,
  CounterpartyStatus,
  CounterpartyType,
  Invoice,
} from '../../../types';
import {
  iconAlertTriangle,
  iconCalculator,
  iconCheck,
  iconChevronLeft,
  iconChevronRight,
  iconClock,
  iconEdit,
  iconFileText,
  iconFolder,
  iconMessageSquare,
  iconPlus,
  iconReceipt,
  iconTable,
  iconTrash,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-contract-form/app-contract-form';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-meta-grid/app-meta-grid';
import '../../common/app-section-card/app-section-card';
import styles from './app-counterparty-detail.css';
import { eventValue } from '../../common/event-value';

@customElement('app-counterparty-detail')
export class AppCounterpartyDetail extends LitElement {
  @state() private counterparties: Counterparty[] = store.counterparties;
  @state() private detailCounterpartyId: string =
    store.detailCounterpartyId || store.counterparties[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private financeTab: 'invoices' | 'calculations' = 'invoices';

  // Edit Counterparty modal
  @state() private editModalOpen = false;
  @state() private formName = '';
  @state() private formLegalName = '';
  @state() private formType: CounterpartyType = 'client';
  @state() private formInn = '';
  @state() private formKpp = '';
  @state() private formCity = '';
  @state() private formContactPerson = '';
  @state() private formPhone = '';
  @state() private formEmail = '';
  @state() private formStatus: CounterpartyStatus = 'active';
  @state() private formRating = 5;
  @state() private formNotes = '';
  @state() private formError = '';

  @state() private confirmDeleteOpen = false;

  // Quick Contract creation modal
  @state() private contractModalOpen = false;


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
    this.counterparties = store.counterparties;
    this.currentLang = store.customization.language;
    const candidate = store.detailCounterpartyId || this.detailCounterpartyId;
    if (candidate && this.counterparties.some((c) => c.id === candidate)) {
      this.detailCounterpartyId = candidate;
    } else {
      this.detailCounterpartyId = this.counterparties[0]?.id || '';
    }
  }


  private toRub(amount: number, currency: 'RUB' | 'USD' | 'EUR'): number {
    if (currency === 'USD') return amount * 96;
    if (currency === 'EUR') return amount * 104;
    return amount;
  }

  private renderStars(rating: number): string {
    const clamped = Math.max(1, Math.min(5, Math.round(rating || 5)));
    return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
  }

  private renderDueControlTag(inv: Invoice, t: ReturnType<typeof getTranslation>) {
    const ctrl = store.getInvoiceDueControl(inv);
    if (ctrl.state === 'draft' || ctrl.state === 'cancelled') {
      return '';
    }
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

  render() {
    const t = getTranslation(this.currentLang);
    const cp = this.counterparties.find((c) => c.id === this.detailCounterpartyId) || null;

    if (!cp) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.counterpartyDetail.emptyNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('counterparties')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.counterpartyDetail.backToCounterparties}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const cpContracts = store.contracts.filter((c) => c.counterpartyId === cp.id);
    const cpProjects = store.projects.filter(
      (p) => p.counterpartyId === cp.id || cpContracts.some((c) => c.projectId === p.id)
    );
    const cpCalculations = store.calculations.filter((c) => c.counterpartyId === cp.id);
    const cpInvoices = store.invoices.filter((i) => i.counterpartyId === cp.id);

    const totalContractRub = cpContracts
      .filter((c) => c.status !== 'terminated')
      .reduce((sum, c) => sum + this.toRub(c.amount, c.currency), 0);
    const totalInvoicedRub = cpInvoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + this.toRub(i.totalAmount, i.currency), 0);
    const totalPaidRub = cpInvoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + this.toRub(store.getInvoicePaidAmount(i.id), i.currency), 0);

    const cpSwitchOptions = this.counterparties.map((c) => ({
      value: c.id,
      label: c.name,
    }));

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('counterparties')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.counterpartyDetail.backToCounterparties}</span>
            </app-button>

            <div class="cp-switcher">
              <app-select
                size="sm"
                .value="${cp.id}"
                .options="${cpSwitchOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.openCounterpartyDetail(eventValue(e))}"
              ></app-select>
            </div>
          </div>

          <div class="nav-actions">
            <app-button
              size="sm"
              variant="primary"
              @click="${() => this.openCreateContractModal(cp)}"
            >
              <span slot="icon-start">${iconPlus(15)}</span>
              <span>${t.counterpartyDetail.createContract}</span>
            </app-button>
            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openEditModal(cp)}"
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
              <app-entity-emblem entity="counterparty" size="lg"></app-entity-emblem>
              <div class="title-block">
                <div class="title-row">
                  <app-entity-emblem entity="counterparty" variant="pill" size="sm"></app-entity-emblem>
                  <h1 class="cp-title">${cp.name}</h1>
                  <app-status-chip domain="counterpartyType" status="${cp.type}" appearance="soft" size="sm"></app-status-chip>
                  <app-status-chip domain="counterparty" status="${cp.status}" appearance="outline" size="sm"></app-status-chip>
                </div>
                <div class="cp-legal-sub">
                  <span>${cp.legalName}</span>
                  <span aria-hidden="true">·</span>
                  <span class="mono">${t.viewTexts.calculations.innLabel} ${cp.inn}${cp.kpp ? ` / ${cp.kpp}` : ''}</span>
                  <span aria-hidden="true">·</span>
                  <span>${cp.city}</span>
                  <span aria-hidden="true">·</span>
                  <span class="rating-stars" title="${cp.rating}/5">${this.renderStars(cp.rating)}</span>
                </div>
              </div>
            </div>
          </div>

          <p class="cp-notes">${cp.notes || '—'}</p>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.counterpartyDetail.totalContractSum} (RUB)</span>
              <span class="kpi-val">${formatMoney(totalContractRub)}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.counterpartyDetail.invoicedSum} (RUB)</span>
              <span class="kpi-val accent">${formatMoney(totalInvoicedRub)}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.counterpartyDetail.paidSum} (RUB)</span>
              <span class="kpi-val success">${formatMoney(totalPaidRub)}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.counterpartyDetail.projectsCount}</span>
              <span class="kpi-val">${cpProjects.length}</span>
            </div>
          </div>

          <app-meta-grid
            columns="3"
            .items="${[
              { label: t.viewTexts.counterparties.labelContactPerson, value: cp.contactPerson || '—' },
              { label: t.viewTexts.counterparties.labelPhone, value: cp.phone || '—', mono: true },
              { label: 'Email', value: cp.email || '—' },
              { label: t.viewTexts.counterparties.labelCity, value: cp.city || '—' },
              { label: t.viewTexts.counterpartyDetail.taxIdLabel, value: `${cp.inn}${cp.kpp ? ` / ${cp.kpp}` : ''}`, mono: true },
            ]}"
          ></app-meta-grid>
        </section>

        <!-- Contracts & Linked Projects -->
        <div class="two-col-grid">
          <app-section-card title="${t.counterpartyDetail.contractsTitle}" subtitle="(${cpContracts.length})">
            <span slot="icon">${iconFileText(18)}</span>
            <app-button
              slot="actions"
              size="sm"
              variant="secondary"
              @click="${() => this.openCreateContractModal(cp)}"
            >
                <span slot="icon-start">${iconPlus(14)}</span>
                <span>${t.counterpartyDetail.createContract}</span>
              </app-button>

            ${cpContracts.length === 0
              ? html`<app-empty-state compact title="${t.counterpartyDetail.noContracts}"></app-empty-state>`
              : html`
                  <div class="rows-list">
                    ${cpContracts.map((ctr) => {
                      const company = store.companies.find((c) => c.id === ctr.companyId);
                      const proj = ctr.projectId
                        ? store.projects.find((p) => p.id === ctr.projectId)
                        : undefined;
                      return html`
                        <div
                          class="list-row clickable"
                          @click="${() => store.openContractDetail(ctr.id)}"
                        >
                          <div class="row-main">
                            <div class="row-title">
                              <span class="row-key">${ctr.number}</span>
                              <span>${ctr.title}</span>
                            </div>
                            <div class="row-sub">
                              <span>${company?.name || '—'}</span>
                              ${proj ? html`<span>· [${proj.key}] ${proj.name}</span>` : ''}
                              <span class="mono">· ${ctr.startDate} → ${ctr.endDate}</span>
                            </div>
                          </div>
                          <div class="row-right">
                            <span class="mono" style="font-weight: 700;">
                              ${formatMoney(ctr.amount, ctr.currency)}
                            </span>
                            <app-badge
                              variant="${ctr.status === 'active'
                                ? 'success'
                                : ctr.status === 'on_approval'
                                ? 'warning'
                                : ctr.status === 'terminated'
                                ? 'danger'
                                : 'default'}"
                              appearance="soft"
                              size="sm"
                            >
                              ${ctr.status}
                            </app-badge>
                            ${iconChevronRight(15)}
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </app-section-card>

          <app-section-card title="${t.counterpartyDetail.projectsTitle}" subtitle="(${cpProjects.length})">
            <span slot="icon">${iconFolder(18)}</span>

            ${cpProjects.length === 0
              ? html`<app-empty-state compact title="${t.counterpartyDetail.noProjects}"></app-empty-state>`
              : html`
                  <div class="rows-list">
                    ${cpProjects.map((proj) => {
                      const statusKey = proj.status || 'active';
                      return html`
                        <div class="list-row clickable" @click="${() => store.openProjectDetail(proj.id)}">
                          <div class="row-main">
                            <div class="row-title">
                              <span class="color-dot" style="background: ${proj.color};"></span>
                              <span class="row-key">${proj.key}</span>
                              <span>${proj.name}</span>
                            </div>
                            <div class="row-sub">
                              <span>${t.projectStatuses[statusKey]}</span>
                              <span>· ${(proj.members || []).length} ${t.viewTexts.counterpartyDetail.membersSuffix}</span>
                              ${proj.budget
                                ? html`<span class="mono">· ${proj.budget.toLocaleString(t.common.locale)} ₽</span>`
                                : ''}
                            </div>
                          </div>
                          <div class="row-right" @click="${(e: Event) => e.stopPropagation()}">
                            <div class="mini-progress" title="${proj.progress}%">
                              <div
                                class="mini-progress-fill"
                                style="width: ${proj.progress}%; background: ${proj.color};"
                              ></div>
                            </div>
                            <span class="mono" style="font-size: 0.78rem; width: 34px; text-align: right;">
                              ${proj.progress}%
                            </span>
                            <app-button
                              size="xs"
                              variant="icon"
                              title="${t.projectChat.title}"
                              @click="${() => store.openProjectChat(proj.id)}"
                            >
                              <span slot="start">${iconMessageSquare(14)}</span>
                            </app-button>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </app-section-card>
        </div>

        <!-- Calculations & Invoices History -->
        <app-section-card
          title="${this.financeTab === 'invoices' ? t.counterpartyDetail.invoicesTitle : t.counterpartyDetail.calculationsTitle}"
          subtitle="(${this.financeTab === 'invoices' ? cpInvoices.length : cpCalculations.length})"
        >
          <span slot="icon">${this.financeTab === 'invoices' ? iconReceipt(18) : iconTable()}</span>
          <app-segmented-switch
            slot="actions"
            size="sm"
              .value="${this.financeTab}"
              .options="${[
                { value: 'invoices', label: `${t.counterpartyDetail.invoicesTitle} (${cpInvoices.length})` },
                { value: 'calculations', label: `${t.counterpartyDetail.calculationsTitle} (${cpCalculations.length})` },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.financeTab = eventValue(e) as 'invoices' | 'calculations')}"
            ></app-segmented-switch>

          ${this.financeTab === 'invoices'
            ? cpInvoices.length === 0
              ? html`<app-empty-state compact title="${t.counterpartyDetail.noInvoices}"></app-empty-state>`
              : html`
                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>${t.viewTexts.payments.thInvoice}</th>
                          <th>${t.viewTexts.payments.thContract}</th>
                          <th>${t.viewTexts.counterpartyDetail.thIssueDue}</th>
                          <th>${t.viewTexts.counterpartyDetail.thTotalVat}</th>
                          <th>${t.viewTexts.payments.thPaidBalance}</th>
                          <th>${t.viewTexts.counterparties.thStatus}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${cpInvoices.map((inv) => {
                          const ctr = cpContracts.find((c) => c.id === inv.contractId);
                          const paidAmt = store.getInvoicePaidAmount(inv.id);
                          const remainingAmt = store.getInvoiceRemainingAmount(inv);
                          const payPct =
                            inv.totalAmount > 0
                              ? Math.min(100, Math.round((paidAmt / inv.totalAmount) * 100))
                              : 0;
                          const dueCtrl = store.getInvoiceDueControl(inv);
                          const displayStatus =
                            dueCtrl.state === 'overdue' && inv.status !== 'cancelled'
                              ? 'overdue'
                              : inv.status;
                          return html`
                            <tr>
                              <td>
                                <app-link
                                  class="link-btn mono"
                                  size="md"
                                  variant="primary"
                                  @click="${() => ctr && store.openContractDetail(ctr.id)}"
                                >
                                  ${inv.number}
                                </app-link>
                              </td>
                              <td>${ctr ? `${ctr.number} — ${ctr.title}` : '—'}</td>
                              <td>
                                <div class="mono">${inv.issueDate} → ${inv.dueDate}</div>
                                ${this.renderDueControlTag(inv, t)}
                              </td>
                              <td class="mono" style="font-weight: 700;">
                                ${formatMoney(inv.totalAmount, inv.currency)}
                              </td>
                              <td>
                                <div class="inv-pay-cell">
                                  <div class="inv-pay-bar">
                                    <div
                                      class="inv-pay-fill ${payPct > 0 && payPct < 100 ? 'partial' : ''}"
                                      style="width: ${payPct}%;"
                                    ></div>
                                  </div>
                                  <div class="inv-pay-meta mono">
                                    <span>${formatMoney(paidAmt, inv.currency)}</span>
                                    <span>
                                      ${remainingAmt > 0
                                        ? `${t.viewTexts.counterpartyDetail.balanceShort} ${formatMoney(remainingAmt, inv.currency)}`
                                        : '100%'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <app-badge
                                  variant="${displayStatus === 'paid'
                                    ? 'success'
                                    : displayStatus === 'partially_paid' || displayStatus === 'sent'
                                    ? 'warning'
                                    : displayStatus === 'overdue' || displayStatus === 'cancelled'
                                    ? 'danger'
                                    : displayStatus === 'issued'
                                    ? 'info'
                                    : 'default'}"
                                  appearance="soft"
                                  size="sm"
                                >
                                  ${t.invoices.statuses[displayStatus]}
                                </app-badge>
                              </td>
                            </tr>
                          `;
                        })}
                      </tbody>
                    </table>
                  </div>
                `
            : cpCalculations.length === 0
            ? html`<app-empty-state compact title="${t.counterpartyDetail.noCalculations}"></app-empty-state>`
            : html`
                <div class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.calculations.thCalculation}</th>
                        <th>${t.viewTexts.payments.thContract}</th>
                        <th>${t.viewTexts.calculations.previewPeriod}</th>
                        <th>${t.viewTexts.counterpartyDetail.thHoursMixed}</th>
                        <th>${t.viewTexts.counterpartyDetail.thBillableSum}</th>
                        <th>${t.viewTexts.counterparties.thStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cpCalculations.map((calc) => {
                        const ctr = cpContracts.find((c) => c.id === calc.contractId);
                        return html`
                          <tr>
                            <td>
                              <app-link
                                class="link-btn mono icon-number-link"
                                size="md"
                                variant="primary"
                                title="${t.calculations.openCalculation}"
                                @click="${() => store.openCalculationDetail(calc.id)}"
                              >
                                <span class="num-icon" slot="start">${iconCalculator(14)}</span>
                                <span>${calc.number}</span>
                              </app-link>
                            </td>
                            <td>
                              ${ctr
                                ? html`
                                    <app-link
                                      class="link-btn mono"
                                      size="md"
                                      variant="primary"
                                      @click="${() => store.openContractDetail(ctr.id)}"
                                    >
                                      ${ctr.number}
                                    </app-link>
                                  `
                                : '—'}
                            </td>
                            <td class="mono">${calc.periodStart} → ${calc.periodEnd}</td>
                            <td class="mono">
                              ${calc.billableHours} ${t.viewTexts.calculations.hoursUnitShort}
                              ${calc.nonBillableHours > 0
                                ? ` (+${calc.nonBillableHours} ${t.viewTexts.calculations.hoursUnitShort} · 0 ₽)`
                                : ''}
                            </td>
                            <td class="mono" style="font-weight: 700;">
                              ${formatMoney(calc.billableAmount, calc.currency)}
                            </td>
                            <td>
                              <app-badge
                                variant="${calc.status === 'approved'
                                  ? 'success'
                                  : calc.status === 'sent'
                                  ? 'warning'
                                  : calc.status === 'rejected'
                                  ? 'danger'
                                  : calc.status === 'invoiced'
                                  ? 'info'
                                  : 'default'}"
                                appearance="soft"
                                size="sm"
                              >
                                ${t.calculations.statuses[calc.status]}
                              </app-badge>
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>
              `}
        </app-section-card>
      </div>

      ${this.renderEditModal(t)}
      ${this.renderDeleteModal(cp, t)}
      ${this.renderQuickContractModal(cp, t)}
    `;
  }

  private renderEditModal(t: ReturnType<typeof getTranslation>) {
    const typeOptions = [
      { value: 'client', label: t.viewTexts.counterparties.typeClient, color: '#6366f1' },
      { value: 'vendor', label: t.viewTexts.counterparties.typeVendor, color: '#0284c7' },
      { value: 'partner', label: t.viewTexts.counterparties.typePartner, color: '#f59e0b' },
      { value: 'contractor', label: t.viewTexts.counterparties.typeContractor, color: '#64748b' },
    ];
    const statusOptions = [
      { value: 'active', label: t.viewTexts.counterparties.statusActive, color: '#10b981' },
      { value: 'pending', label: t.viewTexts.counterparties.statusPending, color: '#f59e0b' },
      { value: 'blocked', label: t.viewTexts.counterparties.statusBlocked, color: '#ef4444' },
    ];

    return html`
      <app-modal
        ?open="${this.editModalOpen}"
        size="lg"
        title="${t.viewTexts.counterparties.modalTitleEdit}"
        @close="${() => (this.editModalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelShortName}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelLegalName}"
              .value="${this.formLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLegalName = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.counterparties.thType}"
              .value="${this.formType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formType = eventValue(e) as CounterpartyType)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.counterparties.thStatus}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as CounterpartyStatus)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.calculations.innLabel}"
              .value="${this.formInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formInn = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelKpp}"
              .value="${this.formKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formKpp = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelContactPerson}"
              .value="${this.formContactPerson}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.formContactPerson = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelCity}"
              .value="${this.formCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formCity = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelPhone}"
              .value="${this.formPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formPhone = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.formEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formEmail = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.counterpartyDetail.ratingLabel}"
              .value="${this.formRating}"
              min="1"
              max="5"
              step="1"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formRating = eventValue(e))}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.counterpartyDetail.notesLabel}"
              .value="${this.formNotes}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formNotes = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.editModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveEdit}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal(cp: Counterparty, t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.counterpartyDelete.title}"
        action="${t.viewTexts.confirmDialogs.counterpartyDelete.action(cp.name)}"
        result="${t.viewTexts.confirmDialogs.counterpartyDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteCounterparty(cp.id);
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderQuickContractModal(
    cp: Counterparty,
    t: ReturnType<typeof getTranslation>
  ) {
    return html`
      <app-contract-form
        .open="${this.contractModalOpen}"
        .presetCounterpartyId="${cp.id}"
        .presetStatus="${'active'}"
        .contextTitle="${t.viewTexts.counterpartyDetail.quickContractTitle(cp.name)}"
        @close="${() => (this.contractModalOpen = false)}"
        @saved="${(e: CustomEvent<{ contract: Contract }>) => {
          this.contractModalOpen = false;
          store.openContractDetail(e.detail.contract.id);
        }}"
      ></app-contract-form>
    `;
  }

  private openEditModal(cp: Counterparty) {
    this.formName = cp.name;
    this.formLegalName = cp.legalName;
    this.formType = cp.type;
    this.formInn = cp.inn;
    this.formKpp = cp.kpp || '';
    this.formCity = cp.city;
    this.formContactPerson = cp.contactPerson;
    this.formPhone = cp.phone;
    this.formEmail = cp.email;
    this.formStatus = cp.status;
    this.formRating = cp.rating;
    this.formNotes = cp.notes;
    this.formError = '';
    this.editModalOpen = true;
  }

  private handleSaveEdit() {
    if (!this.formName.trim()) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }
    store.updateCounterparty({
      id: this.detailCounterpartyId,
      name: this.formName.trim(),
      legalName: this.formLegalName.trim() || this.formName.trim(),
      type: this.formType,
      inn: this.formInn.trim() || '7700000000',
      kpp: this.formKpp.trim(),
      city: this.formCity.trim() || getTranslation(this.currentLang).viewTexts.counterpartyDetail.defaultCity,
      contactPerson: this.formContactPerson.trim() || '—',
      phone: this.formPhone.trim() || '—',
      email: this.formEmail.trim() || '—',
      status: this.formStatus,
      rating: Math.max(1, Math.min(5, Number(this.formRating) || 5)),
      notes: this.formNotes.trim(),
    });
    this.editModalOpen = false;
  }

  private openCreateContractModal(cp: Counterparty) {
    this.contractModalOpen = true;
  }
}