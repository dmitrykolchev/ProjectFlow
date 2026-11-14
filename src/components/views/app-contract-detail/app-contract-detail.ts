import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  Contract,
  ContractStatus,
  ContractType,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
} from '../../../types';
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
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import styles from './app-contract-detail.css';

const HOURLY_RATE_RUB = 3200;

@customElement('app-contract-detail')
export class AppContractDetail extends LitElement {
  @state() private contracts: Contract[] = store.contracts;
  @state() private invoices: Invoice[] = store.invoices;
  @state() private detailContractId: string = store.detailContractId || store.contracts[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private invoiceFilter: 'all' | 'unpaid' | 'paid' | 'draft' = 'all';

  // Edit Contract modal
  @state() private contractModalOpen = false;
  @state() private ctrNumber = '';
  @state() private ctrTitle = '';
  @state() private ctrType: ContractType = 'service';
  @state() private ctrCompanyId = '';
  @state() private ctrCounterpartyId = '';
  @state() private ctrProjectId = '';
  @state() private ctrOwnerId = '';
  @state() private ctrAmount = 0;
  @state() private ctrCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private ctrStartDate = '';
  @state() private ctrEndDate = '';
  @state() private ctrStatus: ContractStatus = 'active';
  @state() private ctrDescription = '';
  @state() private ctrError = '';
  @state() private confirmDeleteContractOpen = false;

  // Invoice Create / Edit modal
  @state() private invoiceModalOpen = false;
  @state() private editingInvoiceId: string | null = null;
  @state() private invNumber = '';
  @state() private invIssueDate = '';
  @state() private invDueDate = '';
  @state() private invStatus: InvoiceStatus = 'issued';
  @state() private invVatRate: 0 | 10 | 20 = 20;
  @state() private invItems: InvoiceLineItem[] = [];
  @state() private invNotes = '';
  @state() private invError = '';

  // Preview & Delete Invoice modals
  @state() private previewInvoice: Invoice | null = null;
  @state() private deletingInvoice: Invoice | null = null;

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
    this.contracts = store.contracts;
    this.invoices = store.invoices;
    this.currentLang = store.customization.language;

    const candidateId = store.detailContractId || this.detailContractId;
    if (candidateId && this.contracts.some((c) => c.id === candidateId)) {
      this.detailContractId = candidateId;
    } else {
      this.detailContractId = this.contracts[0]?.id || '';
    }

    if (this.previewInvoice) {
      this.previewInvoice = this.invoices.find((i) => i.id === this.previewInvoice!.id) || null;
    }

    const activeCtr = this.contracts.find((c) => c.id === this.detailContractId);
    if (activeCtr && store.consumePendingInvoiceModal(activeCtr.id)) {
      this.openCreateInvoiceModal(activeCtr);
    }
  }

  private formatMoney(amount: number, currency: 'RUB' | 'USD' | 'EUR'): string {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
    return `${Math.round(amount).toLocaleString('ru-RU')} ${symbol}`;
  }

  private getContractStatusMeta(
    status: ContractStatus,
    isRu: boolean
  ): { label: string; variant: 'default' | 'warning' | 'success' | 'info' | 'danger' } {
    switch (status) {
      case 'draft':
        return { label: isRu ? 'Черновик' : 'Draft', variant: 'default' };
      case 'on_approval':
        return { label: isRu ? 'Согласование' : 'Approval', variant: 'warning' };
      case 'active':
        return { label: isRu ? 'Действует' : 'Active', variant: 'success' };
      case 'completed':
        return { label: isRu ? 'Исполнен' : 'Completed', variant: 'info' };
      case 'terminated':
        return { label: isRu ? 'Расторгнут' : 'Terminated', variant: 'danger' };
    }
  }

  private getInvoiceStatusVariant(
    status: InvoiceStatus
  ): 'default' | 'warning' | 'success' | 'info' | 'danger' {
    switch (status) {
      case 'paid':
        return 'success';
      case 'sent':
        return 'info';
      case 'issued':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  }

  private getTypeLabel(type: ContractType, isRu: boolean): string {
    switch (type) {
      case 'service':
        return isRu ? 'Услуги / Разработка' : 'Services';
      case 'supply':
        return isRu ? 'Поставка' : 'Supply';
      case 'license':
        return isRu ? 'Лицензия' : 'License';
      case 'nda':
        return 'NDA';
      case 'sla':
        return 'SLA';
    }
  }

  private getUnbilledProjectSources(contract: Contract) {
    if (!contract.projectId) {
      return { timeEntries: [] as typeof store.timeEntries, expenses: [] as typeof store.expenses };
    }
    const billedSourceIds = new Set<string>();
    for (const inv of this.invoices) {
      if (inv.status === 'cancelled') continue;
      if (this.editingInvoiceId && inv.id === this.editingInvoiceId) continue;
      for (const item of inv.items) {
        if (item.sourceId) billedSourceIds.add(item.sourceId);
      }
    }
    for (const item of this.invItems) {
      if (item.sourceId) billedSourceIds.add(item.sourceId);
    }

    const timeEntries = store.timeEntries.filter(
      (te) =>
        te.projectId === contract.projectId &&
        te.billable &&
        !billedSourceIds.has(te.id)
    );
    const expenses = store.expenses.filter(
      (ex) =>
        ex.projectId === contract.projectId &&
        ex.billable &&
        ex.status !== 'rejected' &&
        !billedSourceIds.has(ex.id)
    );

    return { timeEntries, expenses };
  }

  render() {
    const t = getTranslation(this.currentLang);
    const isRu = this.currentLang === 'ru';
    const ctr = this.contracts.find((c) => c.id === this.detailContractId) || null;

    if (!ctr) {
      return html`
        <div class="page-shell">
          <div class="empty-state">
            <span>${isRu ? 'Договор не найден' : 'Contract not found'}</span>
            <app-button variant="primary" @click="${() => store.setActiveView('contracts')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.contractDetail.backToContracts}</span>
            </app-button>
          </div>
        </div>
      `;
    }

    const company = store.companies.find((c) => c.id === ctr.companyId);
    const counterparty = store.counterparties.find((c) => c.id === ctr.counterpartyId);
    const project = ctr.projectId ? store.projects.find((p) => p.id === ctr.projectId) : undefined;
    const owner = ctr.ownerId ? store.users.find((u) => u.id === ctr.ownerId) : undefined;
    const statusMeta = this.getContractStatusMeta(ctr.status, isRu);

    const contractInvoices = this.invoices
      .filter((inv) => inv.contractId === ctr.id)
      .sort((a, b) => (b.issueDate + b.createdAt).localeCompare(a.issueDate + a.createdAt));

    const activeInvoices = contractInvoices.filter((inv) => inv.status !== 'cancelled');
    const invoicedTotal = activeInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const paidTotal = activeInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((s, inv) => s + inv.totalAmount, 0);
    const remainingLimit = Math.max(0, ctr.amount - invoicedTotal);

    const invoicedPct = ctr.amount > 0 ? Math.min(100, Math.round((invoicedTotal / ctr.amount) * 100)) : 0;
    const paidPct = ctr.amount > 0 ? Math.min(100, Math.round((paidTotal / ctr.amount) * 100)) : 0;

    const visibleInvoices = contractInvoices.filter((inv) => {
      if (this.invoiceFilter === 'paid') return inv.status === 'paid';
      if (this.invoiceFilter === 'draft') return inv.status === 'draft';
      if (this.invoiceFilter === 'unpaid') {
        return inv.status === 'issued' || inv.status === 'sent' || inv.status === 'overdue';
      }
      return true;
    });

    const contractSwitchOptions = this.contracts.map((c) => ({
      value: c.id,
      label: `${c.number} · ${c.title}`,
    }));

    const unbilled = this.getUnbilledProjectSources(ctr);
    const unbilledHours = unbilled.timeEntries.reduce((s, e) => s + e.hours, 0);

    return html`
      <div class="page-shell">
        <!-- Top Navigation -->
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('contracts')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.contractDetail.backToContracts}</span>
            </app-button>

            <div class="contract-switcher">
              <app-select
                size="sm"
                .value="${ctr.id}"
                .options="${contractSwitchOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.openContractDetail(e.detail.value)}"
              ></app-select>
            </div>
          </div>

          <div class="nav-actions">
            <app-button
              size="sm"
              variant="primary"
              @click="${() => this.openCreateInvoiceModal(ctr)}"
            >
              <span slot="icon-start">${iconPlus(14)}</span>
              <span>${t.contractDetail.issueInvoice}</span>
            </app-button>

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openEditContractModal(ctr)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <button
              type="button"
              class="icon-btn danger"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteContractOpen = true)}"
            >
              ${iconTrash(15)}
            </button>
          </div>
        </div>

        <!-- Contract Overview -->
        <section class="overview-card">
          <div class="title-block">
            <div class="title-row">
              <span class="contract-key">${ctr.number}</span>
              <h1 class="contract-title">${ctr.title}</h1>
              <app-badge variant="${statusMeta.variant}" appearance="soft">
                ${statusMeta.label}
              </app-badge>
            </div>
            <div class="contract-meta-inline">
              <span>${this.getTypeLabel(ctr.type, isRu)}</span>
              <span aria-hidden="true">·</span>
              <span class="mono">${ctr.startDate} → ${ctr.endDate}</span>
              ${owner
                ? html`<span aria-hidden="true">·</span><span>${owner.name}</span>`
                : ''}
            </div>
            <p class="contract-desc">${ctr.description || '—'}</p>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>
                ${isRu ? 'Финансовое исполнение договора' : 'Contract Billing Progress'}
                (${isRu ? 'оплачено' : 'paid'} ${paidPct}% · ${isRu ? 'выставлено' : 'invoiced'} ${invoicedPct}%)
              </span>
              <span class="mono">
                ${this.formatMoney(paidTotal, ctr.currency)} / ${this.formatMoney(ctr.amount, ctr.currency)}
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-invoiced" style="width: ${invoicedPct}%;"></div>
              <div class="progress-paid" style="width: ${paidPct}%;"></div>
            </div>
          </div>

          <div class="meta-strip">
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Исполнитель (наша компания)' : 'Company'}</span>
              <span class="meta-val">${company?.name || '—'}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Заказчик (контрагент)' : 'Counterparty'}</span>
              <span class="meta-val">${counterparty?.name || '—'}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${isRu ? 'Связанный проект' : 'Linked Project'}</span>
              ${project
                ? html`
                    <button
                      type="button"
                      class="link-btn"
                      @click="${() => store.openProjectDetail(project.id)}"
                    >
                      [${project.key}] ${project.name}
                    </button>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.contractAmount}</span>
              <span class="meta-val mono">${this.formatMoney(ctr.amount, ctr.currency)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.invoicedTotal}</span>
              <span class="meta-val mono">${this.formatMoney(invoicedTotal, ctr.currency)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">${t.contractDetail.remainingLimit}</span>
              <span class="meta-val mono">${this.formatMoney(remainingLimit, ctr.currency)}</span>
            </div>
          </div>
        </section>

        <!-- Contract Invoices & Invoicing Procedure -->
        <section class="section-card">
          <div class="section-header">
            <h2 class="section-title">
              ${iconReceipt(19)}
              <span>${t.contractDetail.invoicesTitle}</span>
              <span class="section-sub">(${contractInvoices.length})</span>
            </h2>

            <div class="section-actions">
              <app-segmented-switch
                size="sm"
                .value="${this.invoiceFilter}"
                .options="${[
                  { value: 'all', label: isRu ? 'Все' : 'All' },
                  { value: 'unpaid', label: isRu ? 'К оплате' : 'Unpaid' },
                  { value: 'paid', label: isRu ? 'Оплачены' : 'Paid' },
                  { value: 'draft', label: isRu ? 'Черновики' : 'Drafts' },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.invoiceFilter = e.detail.value as 'all' | 'unpaid' | 'paid' | 'draft')}"
              ></app-segmented-switch>

              <app-button
                size="sm"
                variant="primary"
                @click="${() => this.openCreateInvoiceModal(ctr)}"
              >
                <span slot="icon-start">${iconPlus(14)}</span>
                <span>${t.contractDetail.issueInvoice}</span>
              </app-button>
            </div>
          </div>

          <div class="billing-strip">
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.contractAmount}</span>
              <span class="billing-stat-val">${this.formatMoney(ctr.amount, ctr.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.invoicedTotal}</span>
              <span class="billing-stat-val">${this.formatMoney(invoicedTotal, ctr.currency)}</span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.paidTotal}</span>
              <span class="billing-stat-val" style="color: #10b981;">
                ${this.formatMoney(paidTotal, ctr.currency)}
              </span>
            </div>
            <div class="billing-stat">
              <span class="billing-stat-label">${t.contractDetail.remainingLimit}</span>
              <span class="billing-stat-val">${this.formatMoney(remainingLimit, ctr.currency)}</span>
            </div>
          </div>

          ${visibleInvoices.length === 0
            ? html`
                <div class="empty-state">
                  <span>${t.contractDetail.noInvoices}</span>
                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.openCreateInvoiceModal(ctr)}"
                  >
                    <span slot="icon-start">${iconPlus(14)}</span>
                    <span>${t.contractDetail.issueInvoice}</span>
                  </app-button>
                </div>
              `
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${isRu ? 'Номер' : 'Invoice #'}</th>
                        <th>${isRu ? 'Выставлен / Срок' : 'Issued / Due'}</th>
                        <th>${isRu ? 'Позиции' : 'Items'}</th>
                        <th>${isRu ? 'Без НДС' : 'Subtotal'}</th>
                        <th>${isRu ? 'НДС' : 'VAT'}</th>
                        <th>${isRu ? 'Итого к оплате' : 'Total'}</th>
                        <th>${isRu ? 'Статус' : 'Status'}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${visibleInvoices.map((inv) => html`
                        <tr>
                          <td>
                            <button
                              type="button"
                              class="inv-num-btn"
                              @click="${() => (this.previewInvoice = inv)}"
                            >
                              ${iconReceipt(14)}
                              <span>${inv.number}</span>
                            </button>
                          </td>
                          <td class="mono" style="white-space: nowrap; font-size: 0.78rem;">
                            <div>${inv.issueDate}</div>
                            <div style="color: var(--text-muted);">→ ${inv.dueDate}</div>
                          </td>
                          <td>
                            <div class="items-summary" title="${inv.items[0]?.title || ''}">
                              ${inv.items[0]?.title || '—'}
                            </div>
                            <div style="font-size: 0.73rem; color: var(--text-muted);">
                              ${inv.items.length} ${isRu ? 'поз.' : 'items'}
                              ${inv.paidDate ? `· ${isRu ? 'оплачен' : 'paid'} ${inv.paidDate}` : ''}
                            </div>
                          </td>
                          <td class="mono" style="white-space: nowrap;">
                            ${this.formatMoney(inv.subtotal, inv.currency)}
                          </td>
                          <td class="mono" style="white-space: nowrap; color: var(--text-secondary);">
                            ${inv.vatRate}% (${this.formatMoney(inv.vatAmount, inv.currency)})
                          </td>
                          <td class="mono" style="font-weight: 700; white-space: nowrap;">
                            ${this.formatMoney(inv.totalAmount, inv.currency)}
                          </td>
                          <td>
                            <app-badge
                              variant="${this.getInvoiceStatusVariant(inv.status)}"
                              appearance="soft"
                              size="sm"
                            >
                              ${t.invoices.statuses[inv.status]}
                            </app-badge>
                          </td>
                          <td>
                            <div class="actions-row">
                              ${inv.status === 'draft'
                                ? html`
                                    <button
                                      type="button"
                                      class="icon-btn approve"
                                      title="${t.invoices.markIssued}"
                                      @click="${() => store.updateInvoiceStatus(inv.id, 'issued')}"
                                    >
                                      ${iconFileText(14)}
                                    </button>
                                  `
                                : ''}
                              ${inv.status === 'issued'
                                ? html`
                                    <button
                                      type="button"
                                      class="icon-btn"
                                      title="${t.invoices.markSent}"
                                      @click="${() => store.updateInvoiceStatus(inv.id, 'sent')}"
                                    >
                                      ${iconSend(14)}
                                    </button>
                                  `
                                : ''}
                              ${inv.status === 'issued' || inv.status === 'sent' || inv.status === 'overdue'
                                ? html`
                                    <button
                                      type="button"
                                      class="icon-btn approve"
                                      title="${t.invoices.markPaid}"
                                      @click="${() => store.updateInvoiceStatus(inv.id, 'paid')}"
                                    >
                                      ${iconCheck(14)}
                                    </button>
                                  `
                                : ''}
                              <button
                                type="button"
                                class="icon-btn"
                                title="${t.common.edit}"
                                @click="${() => this.openEditInvoiceModal(inv)}"
                              >
                                ${iconEdit(14)}
                              </button>
                              <button
                                type="button"
                                class="icon-btn danger"
                                title="${t.common.delete}"
                                @click="${() => (this.deletingInvoice = inv)}"
                              >
                                ${iconTrash(14)}
                              </button>
                            </div>
                          </td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              `}
        </section>

        <!-- Secondary Context: Legal Parties & Linked Project Billing -->
        <div class="secondary-grid">
          <section class="section-card">
            <div class="section-header">
              <h2 class="section-title">
                ${iconFileText(18)}
                <span>${t.contractDetail.partiesTitle}</span>
              </h2>
            </div>

            <div class="party-list">
              <div class="party-block">
                <span class="party-role">${isRu ? 'Поставщик / Исполнитель' : 'Supplier / Our Company'}</span>
                <span class="party-name">${company?.legalName || company?.name || '—'}</span>
                <span class="party-sub mono">
                  ${isRu ? 'ИНН' : 'INN'}: ${company?.inn || '—'}
                  ${company?.kpp ? ` · ${isRu ? 'КПП' : 'KPP'}: ${company.kpp}` : ''}
                </span>
                <span class="party-sub">${company?.city || ''} · ${company?.email || ''}</span>
              </div>

              <div class="party-block">
                <span class="party-role">${isRu ? 'Заказчик / Плательщик' : 'Client / Counterparty'}</span>
                <span class="party-name">${counterparty?.legalName || counterparty?.name || '—'}</span>
                <span class="party-sub mono">
                  ${isRu ? 'ИНН' : 'INN'}: ${counterparty?.inn || '—'}
                  ${counterparty?.kpp ? ` · ${isRu ? 'КПП' : 'KPP'}: ${counterparty.kpp}` : ''}
                </span>
                <span class="party-sub">
                  ${counterparty?.contactPerson || ''} · ${counterparty?.email || ''}
                </span>
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-header">
              <h2 class="section-title">
                ${iconFolder(18)}
                <span>${t.contractDetail.projectLinkTitle}</span>
              </h2>
              ${project
                ? html`
                    <app-button
                      size="sm"
                      variant="ghost"
                      @click="${() => store.openProjectDetail(project.id)}"
                    >
                      ${isRu ? 'Открыть проект' : 'Open Project'}
                    </app-button>
                  `
                : ''}
            </div>

            ${!project
              ? html`
                  <div class="empty-state">
                    <span>${isRu ? 'К договору не привязан проект' : 'No project linked to this contract'}</span>
                  </div>
                `
              : html`
                  <div class="party-list">
                    <div class="party-block">
                      <span class="party-role">${isRu ? 'Проект' : 'Project'}</span>
                      <span class="party-name">[${project.key}] ${project.name}</span>
                      <span class="party-sub">
                        ${isRu ? 'Прогресс' : 'Progress'}: <span class="mono">${project.progress}%</span>
                        · ${isRu ? 'Дедлайн' : 'Due'}: <span class="mono">${project.dueDate}</span>
                      </span>
                    </div>

                    <div class="party-block">
                      <span class="party-role">
                        ${isRu ? 'Невыставленные биллингуемые данные по проекту' : 'Unbilled Billable Project Items'}
                      </span>
                      <span class="party-name mono">
                        ${unbilledHours.toFixed(1)} ч (${unbilled.timeEntries.length} ${isRu ? 'отчётов' : 'logs'})
                        · ${unbilled.expenses.length} ${isRu ? 'расходов' : 'expenses'}
                      </span>
                      <span class="party-sub">
                        ${isRu
                          ? 'Можно автоматически включить в новый счёт при выставлении'
                          : 'Available for automatic import when creating an invoice'}
                      </span>
                    </div>

                    ${(unbilled.timeEntries.length > 0 || unbilled.expenses.length > 0)
                      ? html`
                          <div>
                            <app-button
                              size="sm"
                              variant="secondary"
                              @click="${() => this.openCreateInvoiceModal(ctr, true)}"
                            >
                              <span slot="icon-start">${iconReceipt(14)}</span>
                              <span>${isRu ? 'Сформировать счёт из часов и расходов' : 'Invoice Unbilled Items'}</span>
                            </app-button>
                          </div>
                        `
                      : ''}
                  </div>
                `}
          </section>
        </div>
      </div>

      ${this.renderInvoiceFormModal(ctr, t, isRu)}
      ${this.renderInvoicePreviewModal(ctr, t, isRu)}
      ${this.renderDeleteInvoiceModal(isRu)}
      ${this.renderEditContractModal(isRu)}
      ${this.renderDeleteContractModal(ctr, isRu)}
    `;
  }

  private renderInvoiceFormModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const subtotal = this.invItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    const vatAmount = Math.round((subtotal * this.invVatRate) / 100);
    const totalAmount = subtotal + vatAmount;

    const otherInvoiced = this.invoices
      .filter((i) => i.contractId === ctr.id && i.status !== 'cancelled' && i.id !== this.editingInvoiceId)
      .reduce((s, i) => s + i.totalAmount, 0);
    const remaining = Math.max(0, ctr.amount - otherInvoiced);
    const exceedsContract = ctr.amount > 0 && totalAmount > remaining;

    const unbilled = this.getUnbilledProjectSources(ctr);
    const unbilledHours = unbilled.timeEntries.reduce((s, e) => s + e.hours, 0);

    const vatOptions = [
      { value: '0', label: t.invoices.vatNone },
      { value: '10', label: t.invoices.vat10 },
      { value: '20', label: t.invoices.vat20 },
    ];

    const statusOptions: { value: InvoiceStatus; label: string }[] = [
      { value: 'draft', label: t.invoices.statuses.draft },
      { value: 'issued', label: t.invoices.statuses.issued },
      { value: 'sent', label: t.invoices.statuses.sent },
      { value: 'paid', label: t.invoices.statuses.paid },
      { value: 'overdue', label: t.invoices.statuses.overdue },
      { value: 'cancelled', label: t.invoices.statuses.cancelled },
    ];

    return html`
      <app-modal
        ?open="${this.invoiceModalOpen}"
        size="lg"
        title="${this.editingInvoiceId ? t.invoices.editInvoice : `${t.invoices.newInvoice} · ${ctr.number}`}"
        @close="${() => (this.invoiceModalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'Номер счёта' : 'Invoice Number'}"
              .value="${this.invNumber}"
              required
              error="${this.invError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.invNumber = e.detail.value;
                this.invError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус счёта' : 'Status'}"
              .value="${this.invStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.invStatus = e.detail.value as InvoiceStatus)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата выставления' : 'Issue Date'}"
              .value="${this.invIssueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.invIssueDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Срок оплаты' : 'Due Date'}"
              .value="${this.invDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.invDueDate = e.detail.value)}"
            ></app-date-input>
            <div class="quick-term-row" style="margin-top: 0.35rem;">
              ${[7, 14, 30].map(
                (days) => html`
                  <button
                    type="button"
                    class="quick-term-btn"
                    @click="${() => this.applyDueDateOffset(days)}"
                  >
                    +${days} ${isRu ? 'дн.' : 'd'}
                  </button>
                `
              )}
            </div>
          </div>
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Ставка НДС' : 'VAT Rate'}"
              .value="${String(this.invVatRate)}"
              .options="${vatOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.invVatRate = Number(e.detail.value) as 0 | 10 | 20)}"
            ></app-select>
          </div>

          ${ctr.projectId && (unbilled.timeEntries.length > 0 || unbilled.expenses.length > 0)
            ? html`
                <div class="col-span-2 autofill-bar">
                  <span class="autofill-info">
                    ${isRu
                      ? `Доступно к включению из проекта: ${unbilledHours.toFixed(1)} ч трудозатрат и ${unbilled.expenses.length} расх.`
                      : `Available unbilled project items: ${unbilledHours.toFixed(1)}h & ${unbilled.expenses.length} expenses`}
                  </span>
                  <app-button
                    size="sm"
                    variant="secondary"
                    @click="${() => this.pullUnbilledFromProject(ctr)}"
                  >
                    <span slot="icon-start">${iconPlus(13)}</span>
                    <span>${t.invoices.pullProjectUnbilled}</span>
                  </app-button>
                </div>
              `
            : ''}

          <div class="col-span-2 items-editor">
            <div class="items-editor-head">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
                ${isRu ? 'Позиции счёта' : 'Invoice Line Items'} (${this.invItems.length})
              </span>
              <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                ${remaining > 0
                  ? html`
                      <app-button
                        size="sm"
                        variant="ghost"
                        @click="${() => this.addRemainingBalanceLine(ctr, remaining)}"
                      >
                        ${isRu
                          ? `+ Остаток (${this.formatMoney(remaining, ctr.currency)})`
                          : `+ Remaining (${this.formatMoney(remaining, ctr.currency)})`}
                      </app-button>
                    `
                  : ''}
                <app-button size="sm" variant="secondary" @click="${() => this.addEmptyLineItem()}">
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${t.invoices.addItem}</span>
                </app-button>
              </div>
            </div>

            ${this.invItems.map(
              (item) => html`
                <div class="item-editor-row">
                  <div>
                    <app-input
                      size="sm"
                      label="${isRu ? 'Наименование работ / услуг' : 'Description'}"
                      .value="${item.title}"
                      @input="${(e: CustomEvent<{ value: string }>) =>
                        this.updateLineItem(item.id, { title: e.detail.value })}"
                    ></app-input>
                  </div>
                  <div>
                    <app-number-input
                      size="sm"
                      label="${isRu ? 'Кол-во' : 'Qty'}"
                      .value="${item.quantity}"
                      min="0.25"
                      step="0.5"
                      @change="${(e: CustomEvent<{ value: number }>) =>
                        this.updateLineItem(item.id, { quantity: e.detail.value })}"
                    ></app-number-input>
                  </div>
                  <div>
                    <app-input
                      size="sm"
                      label="${isRu ? 'Ед.' : 'Unit'}"
                      .value="${item.unit}"
                      @input="${(e: CustomEvent<{ value: string }>) =>
                        this.updateLineItem(item.id, { unit: e.detail.value })}"
                    ></app-input>
                  </div>
                  <div>
                    <app-number-input
                      size="sm"
                      label="${isRu ? 'Цена' : 'Unit Price'}"
                      .value="${item.unitPrice}"
                      min="0"
                      step="1000"
                      @change="${(e: CustomEvent<{ value: number }>) =>
                        this.updateLineItem(item.id, { unitPrice: e.detail.value })}"
                    ></app-number-input>
                  </div>
                  <div class="item-amount-preview">${this.formatMoney(item.amount, ctr.currency)}</div>
                  <button
                    type="button"
                    class="icon-btn danger"
                    ?disabled="${this.invItems.length <= 1}"
                    title="${t.common.delete}"
                    @click="${() => this.removeLineItem(item.id)}"
                  >
                    ${iconTrash(13)}
                  </button>
                </div>
              `
            )}
          </div>

          <div class="col-span-2 totals-box">
            <div class="total-line">
              <span>${isRu ? 'Подытог (без НДС)' : 'Subtotal'}:</span>
              <span class="mono">${this.formatMoney(subtotal, ctr.currency)}</span>
            </div>
            <div class="total-line">
              <span>${isRu ? `НДС (${this.invVatRate}%)` : `VAT (${this.invVatRate}%)`}:</span>
              <span class="mono">${this.formatMoney(vatAmount, ctr.currency)}</span>
            </div>
            <div class="total-line grand">
              <span>${isRu ? 'Итого к оплате' : 'Total Due'}:</span>
              <span class="mono">${this.formatMoney(totalAmount, ctr.currency)}</span>
            </div>
          </div>

          ${exceedsContract
            ? html`
                <div class="col-span-2 warn-banner">
                  ${isRu
                    ? `Внимание: сумма счёта превышает остаток по договору (${this.formatMoney(remaining, ctr.currency)}).`
                    : `Note: Invoice total exceeds remaining contract balance (${this.formatMoney(remaining, ctr.currency)}).`}
                </div>
              `
            : ''}

          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Назначение платежа / Примечание' : 'Payment Notes'}"
              .value="${this.invNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.invNotes = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.invoiceModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSaveInvoice(ctr)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderInvoicePreviewModal(
    ctr: Contract,
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const inv = this.previewInvoice;
    if (!inv) return '';
    const company = store.companies.find((c) => c.id === inv.companyId);
    const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);

    return html`
      <app-modal
        ?open="${Boolean(inv)}"
        size="lg"
        title="${t.invoices.previewInvoice} · ${inv.number}"
        @close="${() => (this.previewInvoice = null)}"
      >
        <div class="invoice-sheet">
          <div class="sheet-top">
            <div>
              <div style="font-size: 1.15rem; font-weight: 700;" class="mono">
                ${isRu ? 'Счёт на оплату' : 'Invoice'} № ${inv.number}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${isRu ? 'от' : 'dated'} <span class="mono">${inv.issueDate}</span>
                · ${isRu ? 'Оплатить до' : 'Due'} <span class="mono">${inv.dueDate}</span>
                · ${isRu ? 'Основание' : 'Contract'}: ${ctr.number}
              </div>
            </div>
            <app-badge variant="${this.getInvoiceStatusVariant(inv.status)}" appearance="soft">
              ${t.invoices.statuses[inv.status]}
            </app-badge>
          </div>

          <div class="sheet-parties">
            <div class="party-block">
              <span class="party-role">${isRu ? 'Поставщик' : 'Supplier'}</span>
              <span class="party-name">${company?.legalName || company?.name || '—'}</span>
              <span class="party-sub mono">
                ${isRu ? 'ИНН' : 'INN'}: ${company?.inn || '—'}${company?.kpp ? ` / КПП ${company.kpp}` : ''}
              </span>
            </div>
            <div class="party-block">
              <span class="party-role">${isRu ? 'Покупатель' : 'Bill To'}</span>
              <span class="party-name">${cp?.legalName || cp?.name || '—'}</span>
              <span class="party-sub mono">
                ${isRu ? 'ИНН' : 'INN'}: ${cp?.inn || '—'}${cp?.kpp ? ` / КПП ${cp.kpp}` : ''}
              </span>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${isRu ? 'Наименование' : 'Item'}</th>
                  <th>${isRu ? 'Кол-во' : 'Qty'}</th>
                  <th>${isRu ? 'Цена' : 'Price'}</th>
                  <th>${isRu ? 'Сумма' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                ${inv.items.map(
                  (item, idx) => html`
                    <tr>
                      <td class="mono">${idx + 1}</td>
                      <td>${item.title}</td>
                      <td class="mono">${item.quantity} ${item.unit}</td>
                      <td class="mono">${this.formatMoney(item.unitPrice, inv.currency)}</td>
                      <td class="mono" style="font-weight: 700;">${this.formatMoney(item.amount, inv.currency)}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          </div>

          <div class="totals-box">
            <div class="total-line">
              <span>${isRu ? 'Итого без НДС' : 'Subtotal'}:</span>
              <span class="mono">${this.formatMoney(inv.subtotal, inv.currency)}</span>
            </div>
            <div class="total-line">
              <span>${isRu ? `НДС (${inv.vatRate}%)` : `VAT (${inv.vatRate}%)`}:</span>
              <span class="mono">${this.formatMoney(inv.vatAmount, inv.currency)}</span>
            </div>
            <div class="total-line grand">
              <span>${isRu ? 'Всего к оплате' : 'Total Due'}:</span>
              <span class="mono">${this.formatMoney(inv.totalAmount, inv.currency)}</span>
            </div>
          </div>

          ${inv.notes
            ? html`<div style="font-size: 0.82rem; color: var(--text-secondary);">${inv.notes}</div>`
            : ''}
        </div>

        <div slot="footer">
          ${inv.status === 'draft'
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => store.updateInvoiceStatus(inv.id, 'issued')}"
                >
                  ${t.invoices.markIssued}
                </app-button>
              `
            : ''}
          ${inv.status === 'issued'
            ? html`
                <app-button
                  variant="secondary"
                  @click="${() => store.updateInvoiceStatus(inv.id, 'sent')}"
                >
                  ${t.invoices.markSent}
                </app-button>
              `
            : ''}
          ${inv.status === 'issued' || inv.status === 'sent' || inv.status === 'overdue'
            ? html`
                <app-button
                  variant="primary"
                  @click="${() => store.updateInvoiceStatus(inv.id, 'paid')}"
                >
                  ${t.invoices.markPaid}
                </app-button>
              `
            : ''}
          <app-button variant="ghost" @click="${() => (this.previewInvoice = null)}">
            ${t.common.close}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteInvoiceModal(isRu: boolean) {
    return html`
      <app-modal
        ?open="${Boolean(this.deletingInvoice)}"
        size="sm"
        title="${isRu ? 'Удалить счёт?' : 'Delete invoice?'}"
        @close="${() => (this.deletingInvoice = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Удалить счёт ${this.deletingInvoice?.number || ''}?`
            : `Delete invoice ${this.deletingInvoice?.number || ''}?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingInvoice = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingInvoice) {
                store.deleteInvoice(this.deletingInvoice.id);
                this.deletingInvoice = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderEditContractModal(isRu: boolean) {
    const statusOptions = [
      { value: 'draft', label: isRu ? 'Черновик' : 'Draft', color: '#64748b' },
      { value: 'on_approval', label: isRu ? 'На согласовании' : 'On Approval', color: '#f59e0b' },
      { value: 'active', label: isRu ? 'Действует' : 'Active', color: '#10b981' },
      { value: 'completed', label: isRu ? 'Исполнен' : 'Completed', color: '#0284c7' },
      { value: 'terminated', label: isRu ? 'Расторгнут' : 'Terminated', color: '#ef4444' },
    ];
    const typeOptions = [
      { value: 'service', label: isRu ? 'Услуги / Разработка' : 'Services' },
      { value: 'supply', label: isRu ? 'Поставка' : 'Supply' },
      { value: 'license', label: isRu ? 'Лицензия' : 'License' },
      { value: 'sla', label: 'SLA' },
      { value: 'nda', label: 'NDA' },
    ];
    const companyOptions = store.companies.map((c) => ({ value: c.id, label: c.name }));
    const counterpartyOptions = store.counterparties.map((c) => ({ value: c.id, label: c.name }));
    const projectOptions = [
      { value: '', label: isRu ? 'Без привязки к проекту' : 'No linked project' },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];
    const ownerOptions = [
      { value: '', label: isRu ? 'Не назначен' : 'Unassigned' },
      ...store.users.map((u) => ({ value: u.id, label: u.name })),
    ];
    const currencyOptions = [
      { value: 'RUB', label: 'RUB (₽)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ];

    return html`
      <app-modal
        ?open="${this.contractModalOpen}"
        size="lg"
        title="${isRu ? 'Редактирование договора' : 'Edit Contract'}"
        @close="${() => (this.contractModalOpen = false)}"
      >
        <div class="form-grid">
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
              label="${isRu ? 'Тип договора' : 'Type'}"
              .value="${this.ctrType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrType = e.detail.value as ContractType)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-input
              label="${isRu ? 'Предмет договора' : 'Title'}"
              .value="${this.ctrTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.ctrTitle = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Наша компания' : 'Company'}"
              .value="${this.ctrCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrCompanyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Контрагент' : 'Counterparty'}"
              .value="${this.ctrCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrCounterpartyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              .value="${this.ctrProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrProjectId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Ответственный' : 'Owner'}"
              .value="${this.ctrOwnerId}"
              .options="${ownerOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.ctrOwnerId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Сумма договора' : 'Amount'}"
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
              .options="${currencyOptions}"
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
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.ctrStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.ctrStatus = e.detail.value as ContractStatus)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Условия и комментарии' : 'Description'}"
              .value="${this.ctrDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.ctrDescription = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.contractModalOpen = false)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveContract}">
            ${isRu ? 'Сохранить' : 'Save'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteContractModal(ctr: Contract, isRu: boolean) {
    return html`
      <app-modal
        ?open="${this.confirmDeleteContractOpen}"
        size="sm"
        title="${isRu ? 'Удалить договор?' : 'Delete contract?'}"
        @close="${() => (this.confirmDeleteContractOpen = false)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Вы уверены, что хотите удалить договор ${ctr.number}?`
            : `Are you sure you want to delete contract ${ctr.number}?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.confirmDeleteContractOpen = false)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              this.confirmDeleteContractOpen = false;
              store.deleteContract(ctr.id);
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private openCreateInvoiceModal(ctr: Contract, autoPullProject = false) {
    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + 14);
    const seq = this.invoices.length + 1;

    this.editingInvoiceId = null;
    this.invNumber = `СЧ-${today.getFullYear()}/${String(seq).padStart(3, '0')}`;
    this.invIssueDate = today.toISOString().slice(0, 10);
    this.invDueDate = due.toISOString().slice(0, 10);
    this.invStatus = 'issued';
    this.invVatRate = 20;
    this.invNotes = `Оплата по договору ${ctr.number} от ${ctr.startDate}`;
    this.invError = '';

    const otherInvoiced = this.invoices
      .filter((i) => i.contractId === ctr.id && i.status !== 'cancelled')
      .reduce((s, i) => s + i.totalAmount, 0);
    const suggestedNet =
      ctr.amount > 0 ? Math.max(0, Math.round((ctr.amount - otherInvoiced) / 1.2)) : 100000;

    if (autoPullProject && ctr.projectId) {
      this.invItems = [];
      this.pullUnbilledFromProject(ctr);
      if (this.invItems.length === 0) {
        this.invItems = [
          {
            id: `ili-${Date.now()}`,
            title: `${ctr.title} — этап работ`,
            quantity: 1,
            unit: 'этап',
            unitPrice: suggestedNet,
            amount: suggestedNet,
            sourceType: 'manual',
          },
        ];
      }
    } else {
      this.invItems = [
        {
          id: `ili-${Date.now()}`,
          title: `${ctr.title} — оплата по этапу`,
          quantity: 1,
          unit: 'этап',
          unitPrice: suggestedNet,
          amount: suggestedNet,
          sourceType: 'manual',
        },
      ];
    }

    this.invoiceModalOpen = true;
  }

  private openEditInvoiceModal(inv: Invoice) {
    this.editingInvoiceId = inv.id;
    this.invNumber = inv.number;
    this.invIssueDate = inv.issueDate;
    this.invDueDate = inv.dueDate;
    this.invStatus = inv.status;
    this.invVatRate = inv.vatRate;
    this.invItems = inv.items.map((item) => ({ ...item }));
    this.invNotes = inv.notes;
    this.invError = '';
    this.invoiceModalOpen = true;
  }

  private applyDueDateOffset(days: number) {
    const base = this.invIssueDate ? new Date(this.invIssueDate) : new Date();
    if (isNaN(base.getTime())) return;
    base.setDate(base.getDate() + days);
    this.invDueDate = base.toISOString().slice(0, 10);
  }

  private addEmptyLineItem() {
    this.invItems = [
      ...this.invItems,
      {
        id: `ili-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: '',
        quantity: 1,
        unit: 'усл.',
        unitPrice: 0,
        amount: 0,
        sourceType: 'manual',
      },
    ];
  }

  private addRemainingBalanceLine(ctr: Contract, remainingTotal: number) {
    const divisor = 1 + this.invVatRate / 100;
    const netPrice = Math.round(remainingTotal / divisor);
    this.invItems = [
      ...this.invItems,
      {
        id: `ili-${Date.now()}-rem`,
        title: `Закрытие остатка по договору ${ctr.number}`,
        quantity: 1,
        unit: 'этап',
        unitPrice: netPrice,
        amount: netPrice,
        sourceType: 'manual',
      },
    ];
  }

  private pullUnbilledFromProject(ctr: Contract) {
    const { timeEntries, expenses } = this.getUnbilledProjectSources(ctr);
    const added: InvoiceLineItem[] = [];

    for (const te of timeEntries) {
      const task = store.tasks.find((t) => t.id === te.taskId);
      const user = store.users.find((u) => u.id === te.userId);
      const rate = user?.hourlyRate || HOURLY_RATE_RUB;
      const amount = Math.round(te.hours * rate);
      added.push({
        id: `ili-te-${te.id}`,
        title: `Трудозатраты: ${te.taskId}${task ? ` · ${task.title}` : ''} (${te.hours} ч)`,
        quantity: te.hours,
        unit: 'ч',
        unitPrice: rate,
        amount,
        sourceType: 'time_entry',
        sourceId: te.id,
      });
    }

    for (const ex of expenses) {
      const amountRub =
        ex.currency === 'USD'
          ? Math.round(ex.amount * 96)
          : ex.currency === 'EUR'
          ? Math.round(ex.amount * 104)
          : Math.round(ex.amount);
      added.push({
        id: `ili-ex-${ex.id}`,
        title: `Компенсация расхода: ${ex.title}`,
        quantity: 1,
        unit: 'усл.',
        unitPrice: amountRub,
        amount: amountRub,
        sourceType: 'expense',
        sourceId: ex.id,
      });
    }

    if (added.length > 0) {
      const nonEmptyExisting = this.invItems.filter((i) => i.title.trim() && i.amount > 0);
      this.invItems = [...nonEmptyExisting, ...added];
    }
  }

  private updateLineItem(id: string, patch: Partial<InvoiceLineItem>) {
    this.invItems = this.invItems.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      const qty = Math.max(0, Number(next.quantity) || 0);
      const price = Math.max(0, Number(next.unitPrice) || 0);
      next.quantity = qty;
      next.unitPrice = price;
      next.amount = Math.round(qty * price);
      return next;
    });
  }

  private removeLineItem(id: string) {
    if (this.invItems.length <= 1) return;
    this.invItems = this.invItems.filter((i) => i.id !== id);
  }

  private handleSaveInvoice(ctr: Contract) {
    if (!this.invNumber.trim()) {
      this.invError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const cleanItems = this.invItems
      .filter((i) => i.title.trim())
      .map((i) => ({ ...i, title: i.title.trim() }));

    if (cleanItems.length === 0) {
      this.invError = this.currentLang === 'ru' ? 'Добавьте хотя бы одну позицию' : 'Add at least one item';
      return;
    }

    const subtotal = cleanItems.reduce((s, i) => s + i.amount, 0);
    const vatAmount = Math.round((subtotal * this.invVatRate) / 100);
    const totalAmount = subtotal + vatAmount;
    const paidDate =
      this.invStatus === 'paid'
        ? this.invoices.find((i) => i.id === this.editingInvoiceId)?.paidDate ||
          new Date().toISOString().slice(0, 10)
        : undefined;

    const payload = {
      number: this.invNumber.trim(),
      contractId: ctr.id,
      projectId: ctr.projectId,
      companyId: ctr.companyId,
      counterpartyId: ctr.counterpartyId,
      issueDate: this.invIssueDate || new Date().toISOString().slice(0, 10),
      dueDate: this.invDueDate || new Date().toISOString().slice(0, 10),
      paidDate,
      currency: ctr.currency,
      vatRate: this.invVatRate,
      subtotal,
      vatAmount,
      totalAmount,
      status: this.invStatus,
      items: cleanItems,
      notes: this.invNotes.trim(),
    };

    if (this.editingInvoiceId) {
      const existing = this.invoices.find((i) => i.id === this.editingInvoiceId);
      store.updateInvoice({
        id: this.editingInvoiceId,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      });
    } else {
      store.addInvoice(payload);
    }

    this.invoiceModalOpen = false;
  }

  private openEditContractModal(ctr: Contract) {
    this.ctrNumber = ctr.number;
    this.ctrTitle = ctr.title;
    this.ctrType = ctr.type;
    this.ctrCompanyId = ctr.companyId;
    this.ctrCounterpartyId = ctr.counterpartyId;
    this.ctrProjectId = ctr.projectId || '';
    this.ctrOwnerId = ctr.ownerId || '';
    this.ctrAmount = ctr.amount;
    this.ctrCurrency = ctr.currency;
    this.ctrStartDate = ctr.startDate;
    this.ctrEndDate = ctr.endDate;
    this.ctrStatus = ctr.status;
    this.ctrDescription = ctr.description;
    this.ctrError = '';
    this.contractModalOpen = true;
  }

  private handleSaveContract() {
    const existing = this.contracts.find((c) => c.id === this.detailContractId);
    if (!existing) return;
    if (!this.ctrNumber.trim()) {
      this.ctrError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    store.updateContract({
      id: existing.id,
      number: this.ctrNumber.trim(),
      title: this.ctrTitle.trim() || this.ctrNumber.trim(),
      type: this.ctrType,
      companyId: this.ctrCompanyId || existing.companyId,
      counterpartyId: this.ctrCounterpartyId || existing.counterpartyId,
      projectId: this.ctrProjectId || undefined,
      ownerId: this.ctrOwnerId || undefined,
      amount: Math.max(0, Number(this.ctrAmount) || 0),
      currency: this.ctrCurrency,
      startDate: this.ctrStartDate || existing.startDate,
      endDate: this.ctrEndDate || existing.endDate,
      status: this.ctrStatus,
      description: this.ctrDescription.trim(),
    });

    this.contractModalOpen = false;
  }
}
