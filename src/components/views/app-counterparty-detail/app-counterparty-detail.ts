import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import {
  CalculationFrequency,
  ContractType,
  Counterparty,
  CounterpartyStatus,
  CounterpartyType,
  Invoice,
} from '../../../types';
import {
  iconAlertTriangle,
  iconCheck,
  iconChevronLeft,
  iconChevronRight,
  iconClock,
  iconEdit,
  iconFileText,
  iconFolder,
  iconHandshake,
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
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-meta-grid/app-meta-grid';
import '../../common/app-section-card/app-section-card';
import styles from './app-counterparty-detail.css';

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
  @state() private ctrNumber = '';
  @state() private ctrTitle = '';
  @state() private ctrType: ContractType = 'service';
  @state() private ctrCompanyId = '';
  @state() private ctrProjectId = '';
  @state() private ctrAmount = 1500000;
  @state() private ctrCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private ctrFrequency: CalculationFrequency = 'monthly';
  @state() private ctrStartDate = '';
  @state() private ctrEndDate = '';
  @state() private ctrError = '';

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
    const isRu = this.currentLang === 'ru';
    const cp = this.counterparties.find((c) => c.id === this.detailCounterpartyId) || null;

    if (!cp) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${isRu ? 'Контрагент не найден' : 'Counterparty not found'}">
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
                  store.openCounterpartyDetail(e.detail.value)}"
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
            <button
              type="button"
              class="icon-btn danger"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              ${iconTrash(15)}
            </button>
          </div>
        </div>

        <!-- Hero Card -->
        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <div class="cp-emblem">${iconHandshake(24)}</div>
              <div class="title-block">
                <div class="title-row">
                  <h1 class="cp-title">${cp.name}</h1>
                  <app-status-chip domain="counterpartyType" status="${cp.type}" appearance="soft" size="sm"></app-status-chip>
                  <app-status-chip domain="counterparty" status="${cp.status}" appearance="outline" size="sm"></app-status-chip>
                </div>
                <div class="cp-legal-sub">
                  <span>${cp.legalName}</span>
                  <span aria-hidden="true">·</span>
                  <span class="mono">${isRu ? 'ИНН' : 'INN'} ${cp.inn}${cp.kpp ? ` / ${cp.kpp}` : ''}</span>
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
              { label: isRu ? 'Контактное лицо' : 'Contact Person', value: cp.contactPerson || '—' },
              { label: isRu ? 'Телефон' : 'Phone', value: cp.phone || '—', mono: true },
              { label: 'Email', value: cp.email || '—' },
              { label: isRu ? 'Город' : 'City', value: cp.city || '—' },
              { label: isRu ? 'ИНН / КПП' : 'Tax ID', value: `${cp.inn}${cp.kpp ? ` / ${cp.kpp}` : ''}`, mono: true },
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
                              <span>· ${(proj.members || []).length} ${isRu ? 'участн.' : 'members'}</span>
                              ${proj.budget
                                ? html`<span class="mono">· ${proj.budget.toLocaleString('ru-RU')} ₽</span>`
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
                            <button
                              type="button"
                              class="icon-btn"
                              title="${t.projectChat.title}"
                              @click="${() => store.openProjectChat(proj.id)}"
                            >
                              ${iconMessageSquare(14)}
                            </button>
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
                (this.financeTab = e.detail.value as 'invoices' | 'calculations')}"
            ></app-segmented-switch>

          ${this.financeTab === 'invoices'
            ? cpInvoices.length === 0
              ? html`<app-empty-state compact title="${t.counterpartyDetail.noInvoices}"></app-empty-state>`
              : html`
                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>${isRu ? 'Счёт' : 'Invoice'}</th>
                          <th>${isRu ? 'Договор' : 'Contract'}</th>
                          <th>${isRu ? 'Дата / Срок оплаты' : 'Issued / Due'}</th>
                          <th>${isRu ? 'Итого с НДС' : 'Total'}</th>
                          <th>${isRu ? 'Оплачено / Остаток' : 'Paid / Balance'}</th>
                          <th>${isRu ? 'Статус' : 'Status'}</th>
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
                                <button
                                  type="button"
                                  class="link-btn mono"
                                  @click="${() => ctr && store.openContractDetail(ctr.id)}"
                                >
                                  ${inv.number}
                                </button>
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
                                        ? `${isRu ? 'ост.' : 'bal.'} ${formatMoney(remainingAmt, inv.currency)}`
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
                        <th>${isRu ? 'Калькуляция' : 'Calculation'}</th>
                        <th>${isRu ? 'Договор' : 'Contract'}</th>
                        <th>${isRu ? 'Период' : 'Period'}</th>
                        <th>${isRu ? 'Часы (оплач. / 0 ₽)' : 'Hours'}</th>
                        <th>${isRu ? 'Сумма к оплате' : 'Billable'}</th>
                        <th>${isRu ? 'Статус' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cpCalculations.map((calc) => {
                        const ctr = cpContracts.find((c) => c.id === calc.contractId);
                        return html`
                          <tr>
                            <td>
                              <button
                                type="button"
                                class="link-btn mono"
                                @click="${() => ctr && store.openContractDetail(ctr.id)}"
                              >
                                ${calc.number}
                              </button>
                            </td>
                            <td>${ctr ? ctr.number : '—'}</td>
                            <td class="mono">${calc.periodStart} → ${calc.periodEnd}</td>
                            <td class="mono">
                              ${calc.billableHours} ${isRu ? 'ч' : 'h'}
                              ${calc.nonBillableHours > 0
                                ? ` (+${calc.nonBillableHours} ${isRu ? 'ч' : 'h'} · 0 ₽)`
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

      ${this.renderEditModal(isRu, t)}
      ${this.renderDeleteModal(cp, isRu, t)}
      ${this.renderQuickContractModal(cp, isRu, t)}
    `;
  }

  private renderEditModal(isRu: boolean, t: ReturnType<typeof getTranslation>) {
    const typeOptions = [
      { value: 'client', label: isRu ? 'Заказчик' : 'Client', color: '#6366f1' },
      { value: 'vendor', label: isRu ? 'Поставщик' : 'Vendor', color: '#0284c7' },
      { value: 'partner', label: isRu ? 'Партнёр' : 'Partner', color: '#f59e0b' },
      { value: 'contractor', label: isRu ? 'Подрядчик' : 'Contractor', color: '#64748b' },
    ];
    const statusOptions = [
      { value: 'active', label: isRu ? 'Активный' : 'Active', color: '#10b981' },
      { value: 'pending', label: isRu ? 'На проверке' : 'Pending', color: '#f59e0b' },
      { value: 'blocked', label: isRu ? 'Заблокирован' : 'Blocked', color: '#ef4444' },
    ];

    return html`
      <app-modal
        ?open="${this.editModalOpen}"
        size="lg"
        title="${isRu ? 'Редактирование контрагента' : 'Edit Counterparty'}"
        @close="${() => (this.editModalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${isRu ? 'Краткое наименование' : 'Short Name'}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = e.detail.value;
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Юридическое лицо' : 'Legal Name'}"
              .value="${this.formLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLegalName = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Тип' : 'Type'}"
              .value="${this.formType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formType = e.detail.value as CounterpartyType)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = e.detail.value as CounterpartyStatus)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${isRu ? 'ИНН' : 'INN'}"
              .value="${this.formInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formInn = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'КПП' : 'KPP'}"
              .value="${this.formKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formKpp = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Контактное лицо' : 'Contact Person'}"
              .value="${this.formContactPerson}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.formContactPerson = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Город' : 'City'}"
              .value="${this.formCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formCity = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Телефон' : 'Phone'}"
              .value="${this.formPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formPhone = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.formEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formEmail = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Рейтинг надёжности (1–5)' : 'Rating (1–5)'}"
              .value="${this.formRating}"
              min="1"
              max="5"
              step="1"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formRating = e.detail.value)}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Примечания' : 'Notes'}"
              .value="${this.formNotes}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formNotes = e.detail.value)}"
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

  private renderDeleteModal(cp: Counterparty, isRu: boolean, t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        title="${isRu ? 'Удалить контрагента?' : 'Delete counterparty?'}"
        action="${isRu
          ? `Контрагент «${cp.name}» будет удалён из справочника.`
          : `Counterparty "${cp.name}" will be removed from the directory.`}"
        result="${isRu
          ? 'Договоры и счета контрагента останутся без привязки к нему.'
          : 'Contracts and invoices of the counterparty will lose their link to it.'}"
        .actionLabel="${isRu ? 'Выполняемое действие:' : 'Action performed:'}"
        .resultLabel="${isRu ? 'Ожидаемый результат:' : 'Expected result:'}"
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
    isRu: boolean,
    t: ReturnType<typeof getTranslation>
  ) {
    const companyOpts = store.companies.map((c) => ({ value: c.id, label: c.name }));
    const projOpts = [
      { value: '', label: isRu ? 'Без проекта' : 'No project' },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];
    const typeOpts = [
      { value: 'service', label: isRu ? 'Услуги / Разработка' : 'Services' },
      { value: 'supply', label: isRu ? 'Поставка' : 'Supply' },
      { value: 'license', label: isRu ? 'Лицензия' : 'License' },
      { value: 'sla', label: 'SLA' },
      { value: 'nda', label: 'NDA' },
    ];
    const freqOpts = [
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
    ];
    const curOpts = [
      { value: 'RUB', label: 'RUB (₽)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ];

    return html`
      <app-modal
        ?open="${this.contractModalOpen}"
        size="lg"
        title="${isRu ? `Новый договор · ${cp.name}` : `New Contract · ${cp.name}`}"
        @close="${() => (this.contractModalOpen = false)}"
      >
        <app-form-grid>
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
              label="${isRu ? 'Тип' : 'Type'}"
              .value="${this.ctrType}"
              .options="${typeOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrType = e.detail.value as ContractType)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-input
              label="${isRu ? 'Предмет договора' : 'Subject'}"
              .value="${this.ctrTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.ctrTitle = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Наша компания' : 'Company'}"
              .value="${this.ctrCompanyId}"
              .options="${companyOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrCompanyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              .value="${this.ctrProjectId}"
              .options="${projOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrProjectId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Сумма' : 'Amount'}"
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
              .options="${curOpts}"
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
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Периодичность калькуляций' : 'Calculation Cycle'}"
              .value="${this.ctrFrequency}"
              .options="${freqOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrFrequency = e.detail.value as CalculationFrequency)}"
            ></app-select>
          </div>
        </app-form-grid>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.contractModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleCreateContract(cp)}">
            ${t.common.create}
          </app-button>
        </div>
      </app-modal>
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
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }
    store.updateCounterparty({
      id: this.detailCounterpartyId,
      name: this.formName.trim(),
      legalName: this.formLegalName.trim() || this.formName.trim(),
      type: this.formType,
      inn: this.formInn.trim() || '7700000000',
      kpp: this.formKpp.trim(),
      city: this.formCity.trim() || 'Москва',
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
    const today = new Date().toISOString().slice(0, 10);
    const linkedProj = store.projects.find((p) => p.counterpartyId === cp.id);
    this.ctrNumber = `ДГ-${new Date().getFullYear()}/${String(store.contracts.length + 1).padStart(3, '0')}`;
    this.ctrTitle = '';
    this.ctrType = 'service';
    this.ctrCompanyId = store.companies[0]?.id || '';
    this.ctrProjectId = linkedProj?.id || '';
    this.ctrAmount = 1500000;
    this.ctrCurrency = 'RUB';
    this.ctrFrequency = 'monthly';
    this.ctrStartDate = today;
    this.ctrEndDate = `${new Date().getFullYear()}-12-31`;
    this.ctrError = '';
    this.contractModalOpen = true;
  }

  private handleCreateContract(cp: Counterparty) {
    if (!this.ctrNumber.trim()) {
      this.ctrError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }
    const created = store.addContract({
      number: this.ctrNumber.trim(),
      title: this.ctrTitle.trim() || this.ctrNumber.trim(),
      type: this.ctrType,
      companyId: this.ctrCompanyId || store.companies[0]?.id || '',
      counterpartyId: cp.id,
      projectId: this.ctrProjectId || undefined,
      ownerId: store.users[0]?.id,
      amount: Math.max(0, Number(this.ctrAmount) || 0),
      currency: this.ctrCurrency,
      startDate: this.ctrStartDate || new Date().toISOString().slice(0, 10),
      endDate: this.ctrEndDate || new Date().toISOString().slice(0, 10),
      status: 'active',
      billingFrequency: this.ctrFrequency,
      description: '',
    });
    this.contractModalOpen = false;
    store.openContractDetail(created.id);
  }
}
