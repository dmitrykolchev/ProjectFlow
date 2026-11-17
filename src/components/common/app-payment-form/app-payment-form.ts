import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  BankCurrency,
  BankRequisite,
  Invoice,
  PaymentDirection,
  PaymentMethod,
} from '../../../types';
import { getTranslation } from '../../../i18n';
import { formatMoney } from '../app-money/app-money';
import { iconArrowDownLeft, iconArrowUpRight } from '../icons';
import styles from './app-payment-form.css';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-select/app-select';
import '../app-segmented-switch/app-segmented-switch';
import '../app-number-input/app-number-input';
import '../app-date-input/app-date-input';
import '../app-input/app-input';
import '../app-textarea/app-textarea';
import '../app-button/app-button';
import '../app-badge/app-badge';

const CURRENCIES: BankCurrency[] = ['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'KZT', 'AED'];

/**
 * Canonical payment registration form. Supports both invoice-linked payments and standalone
 * incoming/outgoing payments tied to a specific company and its bank requisites.
 */
@customElement('app-payment-form')
export class AppPaymentForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) invoice: Invoice | null = null;
  /** invoices the target selector may switch between */
  @property({ attribute: false }) payableInvoices: Invoice[] = [];
  @property({ type: String }) defaultDirection: PaymentDirection = 'incoming';
  @property({ type: String }) defaultCompanyId = '';
  @property({ type: String }) defaultCounterpartyId = '';

  @state() private currentLang = store.customization.language;
  @state() private currentInvoice: Invoice | null = null;
  @state() private direction: PaymentDirection = 'incoming';
  @state() private companyId = '';
  @state() private companyBankAccountId = '';
  @state() private counterpartyId = '';
  @state() private counterpartyBankAccountId = '';
  @state() private currency: BankCurrency = 'RUB';
  @state() private payAmount = 0;
  @state() private payDate = '';
  @state() private payMethod: PaymentMethod = 'bank_transfer';
  @state() private payDocNumber = '';
  @state() private payNotes = '';
  @state() private payError = '';
  @state() private companyError = '';

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
    if (changed.has('open') && this.open) {
      this.initFields(this.invoice);
    }
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && !this.open) {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  }

  private closeModal() {
    this.open = false;
  }

  private formatAccountOption(acc: BankRequisite): string {
    const clean = acc.accountNumber.replace(/\s+/g, '');
    const tail = clean.length >= 4 ? `•••• ${clean.slice(-4)}` : clean;
    const star = acc.isDefault ? ' ★' : '';
    return `${acc.bankName} · ${acc.currency} · ${tail}${star}`;
  }

  private defaultDocNumber(dir: PaymentDirection, seq: number, date: string): string {
    const t = getTranslation(this.currentLang);
    const prefix =
      dir === 'outgoing'
        ? t.viewTexts.payments.payDocOutgoingPrefix
        : t.viewTexts.payments.payDocPrefix;
    return `${prefix}${date.slice(0, 4)}/${String(840 + seq).padStart(4, '0')}`;
  }

  private initFields(inv: Invoice | null) {
    const t = getTranslation(this.currentLang);
    const today = new Date().toISOString().slice(0, 10);
    const seq = store.payments.length + 1;

    if (inv) {
      const remaining = store.getInvoiceRemainingAmount(inv);
      const dir = store.inferPaymentDirection(inv.counterpartyId);
      const compId = inv.companyId || this.defaultCompanyId || store.companies[0]?.id || '';
      const company = store.companies.find((c) => c.id === compId);
      const cp = store.counterparties.find((c) => c.id === inv.counterpartyId);

      this.currentInvoice = inv;
      this.direction = dir;
      this.companyId = compId;
      this.counterpartyId = inv.counterpartyId || '';
      this.currency = inv.currency;
      this.companyBankAccountId =
        store.resolveBankAccountId(company?.bankAccounts, undefined, inv.currency) || '';
      this.counterpartyBankAccountId =
        store.resolveBankAccountId(cp?.bankAccounts, undefined, inv.currency) || '';
      this.payAmount = remaining > 0 ? remaining : inv.totalAmount;
      this.payDate = today;
      this.payMethod = 'bank_transfer';
      this.payDocNumber = this.defaultDocNumber(dir, seq, today);
      this.payNotes = t.viewTexts.payments.payNotesTemplate(inv.number);
      this.payError = '';
      this.companyError = '';
      return;
    }

    const dir: PaymentDirection = this.defaultDirection || 'incoming';
    const compId = this.defaultCompanyId || store.companies[0]?.id || '';
    const company = store.companies.find((c) => c.id === compId);
    const compAccId = store.resolveBankAccountId(company?.bankAccounts) || '';
    const compAcc = company?.bankAccounts?.find((a) => a.id === compAccId);
    const cur: BankCurrency = compAcc?.currency || 'RUB';
    const cpId = this.defaultCounterpartyId || '';
    const cp = store.counterparties.find((c) => c.id === cpId);

    this.currentInvoice = null;
    this.direction = dir;
    this.companyId = compId;
    this.companyBankAccountId = compAccId;
    this.counterpartyId = cpId;
    this.counterpartyBankAccountId =
      store.resolveBankAccountId(cp?.bankAccounts, undefined, cur) || '';
    this.currency = cur;
    this.payAmount = 0;
    this.payDate = today;
    this.payMethod = 'bank_transfer';
    this.payDocNumber = this.defaultDocNumber(dir, seq, today);
    this.payNotes = cp
      ? dir === 'outgoing'
        ? t.viewTexts.payments.payNotesOutgoingTemplate(cp.name)
        : t.viewTexts.payments.payNotesIncomingTemplate(cp.name)
      : '';
    this.payError = '';
    this.companyError = '';
  }

  private handleDirectionChange(nextDir: PaymentDirection) {
    const t = getTranslation(this.currentLang);
    const prevDir = this.direction;
    this.direction = nextDir;
    const oldPrefix =
      prevDir === 'outgoing'
        ? t.viewTexts.payments.payDocOutgoingPrefix
        : t.viewTexts.payments.payDocPrefix;
    const newPrefix =
      nextDir === 'outgoing'
        ? t.viewTexts.payments.payDocOutgoingPrefix
        : t.viewTexts.payments.payDocPrefix;
    if (this.payDocNumber.startsWith(oldPrefix)) {
      this.payDocNumber = newPrefix + this.payDocNumber.slice(oldPrefix.length);
    }
  }

  private handleCompanyChange(nextCompanyId: string) {
    this.companyId = nextCompanyId;
    this.companyError = '';
    const company = store.companies.find((c) => c.id === nextCompanyId);
    const nextAccId =
      store.resolveBankAccountId(
        company?.bankAccounts,
        undefined,
        this.currentInvoice ? this.currency : undefined
      ) || '';
    this.companyBankAccountId = nextAccId;
    if (!this.currentInvoice) {
      const acc = company?.bankAccounts?.find((a) => a.id === nextAccId);
      if (acc) {
        this.currency = acc.currency;
        const cp = store.counterparties.find((c) => c.id === this.counterpartyId);
        this.counterpartyBankAccountId =
          store.resolveBankAccountId(cp?.bankAccounts, undefined, acc.currency) || '';
      }
    }
  }

  private handleCompanyBankAccountChange(nextAccId: string) {
    this.companyBankAccountId = nextAccId;
    const company = store.companies.find((c) => c.id === this.companyId);
    const acc = company?.bankAccounts?.find((a) => a.id === nextAccId);
    if (acc && !this.currentInvoice) {
      this.currency = acc.currency;
      const cp = store.counterparties.find((c) => c.id === this.counterpartyId);
      this.counterpartyBankAccountId =
        store.resolveBankAccountId(cp?.bankAccounts, undefined, acc.currency) || '';
    }
  }

  private handleCounterpartyChange(nextCpId: string) {
    this.counterpartyId = nextCpId;
    const cp = store.counterparties.find((c) => c.id === nextCpId);
    this.counterpartyBankAccountId =
      store.resolveBankAccountId(cp?.bankAccounts, undefined, this.currency) || '';
  }

  private handleSave() {
    const t = getTranslation(this.currentLang);
    const inv = this.currentInvoice;

    if (!this.companyId) {
      this.companyError = t.viewTexts.payments.companyError;
      return;
    }

    const amount = Number(this.payAmount) || 0;
    if (amount <= 0) {
      this.payError = t.viewTexts.payments.amountError;
      return;
    }

    const created = store.addInvoicePayment({
      direction: this.direction,
      invoiceId: inv?.id || '',
      contractId: inv?.contractId || '',
      companyId: this.companyId,
      counterpartyId: this.counterpartyId,
      companyBankAccountId: this.companyBankAccountId || undefined,
      counterpartyBankAccountId: this.counterpartyBankAccountId || undefined,
      amount,
      currency: inv ? inv.currency : this.currency,
      paymentDate: this.payDate || new Date().toISOString().slice(0, 10),
      method: this.payMethod,
      documentNumber: this.payDocNumber,
      notes: this.payNotes,
    });

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { payment: created },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const inv = this.currentInvoice;
    const activeCur: BankCurrency = inv ? inv.currency : this.currency;

    const company = store.companies.find((c) => c.id === this.companyId);
    const companyAccounts = company?.bankAccounts || [];
    const selectedCompanyAcc = companyAccounts.find((a) => a.id === this.companyBankAccountId);

    const cp = store.counterparties.find((c) => c.id === this.counterpartyId);
    const cpAccounts = cp?.bankAccounts || [];
    const selectedCpAcc = cpAccounts.find((a) => a.id === this.counterpartyBankAccountId);

    const paidSoFar = inv ? inv.totalAmount - store.getInvoiceRemainingAmount(inv) : 0;
    const remainingBefore = inv ? store.getInvoiceRemainingAmount(inv) : 0;
    const amount = Number(this.payAmount) || 0;
    const paidAfter = paidSoFar + amount;
    const remainingAfter = inv ? Math.max(0, inv.totalAmount - paidAfter) : 0;
    const willBeFull = inv ? remainingAfter <= 0 : false;

    const invoiceOptions = [
      { value: 'none', label: t.viewTexts.payments.noInvoiceOption },
      ...this.payableInvoices.map((i) => {
        const icp = store.counterparties.find((c) => c.id === i.counterpartyId);
        return {
          value: i.id,
          label: `${i.number} (${icp?.name || '—'}) · ${t.viewTexts.payments.dueLabel}: ${formatMoney(
            store.getInvoiceRemainingAmount(i),
            i.currency
          )}`,
        };
      }),
    ];

    const directionOptions = [
      { value: 'incoming', label: t.payments.directions.incoming },
      { value: 'outgoing', label: t.payments.directions.outgoing },
    ];

    const companyOptions = store.companies.map((c) => ({
      value: c.id,
      label: c.name,
    }));

    const companyAccountOptions = [
      ...(companyAccounts.length === 0
        ? [{ value: '', label: t.viewTexts.payments.noBankAccountOption }]
        : []),
      ...companyAccounts.map((acc) => ({
        value: acc.id,
        label: this.formatAccountOption(acc),
      })),
    ];

    const counterpartyOptions = [
      { value: '', label: t.viewTexts.payments.noCounterpartyOption },
      ...store.counterparties.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ];

    const cpAccountOptions = [
      { value: '', label: t.viewTexts.payments.noBankAccountOption },
      ...cpAccounts.map((acc) => ({
        value: acc.id,
        label: this.formatAccountOption(acc),
      })),
    ];

    const currencyOptions = CURRENCIES.map((cur) => ({ value: cur, label: cur }));

    const methodOptions: { value: PaymentMethod; label: string }[] = [
      { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
      { value: 'card', label: t.payments.methods.card },
      { value: 'cash', label: t.payments.methods.cash },
      { value: 'offset', label: t.payments.methods.offset },
    ];

    const modalTitle = inv
      ? `${t.payments.newPayment} · ${inv.number}`
      : t.viewTexts.payments.newStandalonePaymentTitle;

    const isOutgoing = this.direction === 'outgoing';
    const companyLabel = company?.name || '—';
    const companyAccLabel = selectedCompanyAcc
      ? store.formatBankRequisiteShort(selectedCompanyAcc)
      : t.viewTexts.payments.noBankAccountOption;
    const cpLabel = cp?.name || t.viewTexts.payments.noCounterpartyOption;
    const cpAccLabel = selectedCpAcc
      ? store.formatBankRequisiteShort(selectedCpAcc)
      : t.viewTexts.payments.noBankAccountOption;

    return html`
      <app-modal
        ?open="${this.open}"
        size="lg"
        title="${modalTitle}"
        @close="${() => this.closeModal()}"
      >
        <app-form-grid>
          <div class="col-span-2">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">
                ${t.viewTexts.payments.labelDirection}
              </span>
              <app-segmented-switch
                size="sm"
                .value="${this.direction}"
                .options="${directionOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  this.handleDirectionChange(eventValue(e) as PaymentDirection)}"
              ></app-segmented-switch>
            </div>
          </div>

          ${this.payableInvoices.length > 0
            ? html`
                <div class="col-span-2">
                  <app-select
                    label="${t.viewTexts.payments.labelTargetInvoice}"
                    .value="${inv ? inv.id : 'none'}"
                    .options="${invoiceOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) => {
                      const val = eventValue(e);
                      if (val === 'none') {
                        this.initFields(null);
                      } else {
                        const next = this.payableInvoices.find((i) => i.id === val);
                        if (next) this.initFields(next);
                      }
                    }}"
                  ></app-select>
                </div>
              `
            : ''}

          <div>
            <app-select
              label="${t.viewTexts.payments.labelCompany}"
              .value="${this.companyId}"
              .options="${companyOptions}"
              error="${this.companyError}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                this.handleCompanyChange(eventValue(e))}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.payments.labelCompanyBankAccount}"
              .value="${this.companyBankAccountId}"
              .options="${companyAccountOptions}"
              ?disabled="${companyAccounts.length === 0}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                this.handleCompanyBankAccountChange(eventValue(e))}"
            ></app-select>
            ${selectedCompanyAcc
              ? html`
                  <div class="req-hint">
                    ${selectedCompanyAcc.accountNumber}${selectedCompanyAcc.bik
                      ? ` · ${t.bankAccounts.bikLabel}: ${selectedCompanyAcc.bik}`
                      : selectedCompanyAcc.swift
                      ? ` · SWIFT: ${selectedCompanyAcc.swift}`
                      : ''}
                  </div>
                `
              : companyAccounts.length === 0
              ? html`<div class="req-empty-hint">${t.viewTexts.payments.noCompanyAccountsHint}</div>`
              : ''}
          </div>

          <div>
            <app-select
              label="${t.viewTexts.payments.labelCounterparty}"
              .value="${this.counterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                this.handleCounterpartyChange(eventValue(e))}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.payments.labelCounterpartyBankAccount}"
              .value="${this.counterpartyBankAccountId}"
              .options="${cpAccountOptions}"
              ?disabled="${!this.counterpartyId || cpAccounts.length === 0}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.counterpartyBankAccountId = eventValue(e))}"
            ></app-select>
            ${selectedCpAcc
              ? html`
                  <div class="req-hint">
                    ${selectedCpAcc.accountNumber}${selectedCpAcc.bik
                      ? ` · ${t.bankAccounts.bikLabel}: ${selectedCpAcc.bik}`
                      : selectedCpAcc.swift
                      ? ` · SWIFT: ${selectedCpAcc.swift}`
                      : ''}
                  </div>
                `
              : this.counterpartyId && cpAccounts.length === 0
              ? html`<div class="req-empty-hint">${t.viewTexts.payments.noCounterpartyAccountsHint}</div>`
              : ''}
          </div>

          <div class="col-span-2 flow-strip ${isOutgoing ? 'is-outgoing' : ''}">
            <div class="flow-party">
              <span class="flow-role">${t.viewTexts.payments.payerLabel}</span>
              <span class="flow-name">${isOutgoing ? companyLabel : cpLabel}</span>
              <span class="flow-account">${isOutgoing ? companyAccLabel : cpAccLabel}</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              ${isOutgoing ? iconArrowUpRight(15) : iconArrowDownLeft(15)}
            </span>
            <div class="flow-party">
              <span class="flow-role">${t.viewTexts.payments.recipientLabel}</span>
              <span class="flow-name">${isOutgoing ? cpLabel : companyLabel}</span>
              <span class="flow-account">${isOutgoing ? cpAccLabel : companyAccLabel}</span>
            </div>
          </div>

          ${inv
            ? html`
                <div class="col-span-2 pay-summary-card">
                  <div class="billing-stat">
                    <span class="billing-stat-label">${t.viewTexts.payments.invoiceTotalLabel}</span>
                    <span class="billing-stat-val">${formatMoney(inv.totalAmount, inv.currency)}</span>
                  </div>
                  <div class="billing-stat">
                    <span class="billing-stat-label">${t.payments.paidAmount}</span>
                    <span class="billing-stat-val" style="color: #10b981;">
                      ${formatMoney(paidSoFar, inv.currency)}
                    </span>
                  </div>
                  <div class="billing-stat">
                    <span class="billing-stat-label">${t.payments.remainingDue}</span>
                    <span class="billing-stat-val" style="color: #f59e0b;">
                      ${formatMoney(remainingBefore, inv.currency)}
                    </span>
                  </div>
                </div>
              `
            : ''}

          <div>
            <app-number-input
              label="${t.viewTexts.payments.paymentAmountLabel(activeCur)}"
              .value="${this.payAmount}"
              min="1"
              max="100000000"
              step="1000"
              error="${this.payError}"
              @change="${(e: CustomEvent<{ value: number }>) => {
                this.payAmount = eventValue(e);
                this.payError = '';
              }}"
            ></app-number-input>
            ${inv && remainingBefore > 0
              ? html`
                  <div class="quick-term-row" style="margin-top: 0.4rem;">
                    <app-button
                      class="quick-term-btn"
                      size="sm"
                      variant="icon"
                      @click="${() => {
                        this.payAmount = Math.max(1, Math.round(remainingBefore * 0.25));
                        this.payError = '';
                      }}"
                    >
                      <span>25%</span>
                    </app-button>
                    <app-button
                      class="quick-term-btn"
                      size="sm"
                      variant="icon"
                      @click="${() => {
                        this.payAmount = Math.max(1, Math.round(remainingBefore * 0.5));
                        this.payError = '';
                      }}"
                    >
                      <span>50%</span>
                    </app-button>
                    <app-button
                      class="quick-term-btn"
                      size="sm"
                      variant="icon"
                      @click="${() => {
                        this.payAmount = remainingBefore;
                        this.payError = '';
                      }}"
                    >
                      <span>${t.viewTexts.payments.fullDueButton}</span>
                    </app-button>
                  </div>
                `
              : ''}
          </div>

          <div>
            ${inv
              ? html`
                  <app-date-input
                    label="${t.payments.paymentDate}"
                    .value="${this.payDate}"
                    @change="${(e: CustomEvent<{ value: string }>) =>
                      (this.payDate = eventValue(e))}"
                  ></app-date-input>
                `
              : html`
                  <app-select
                    label="${t.viewTexts.payments.labelCurrency}"
                    .value="${this.currency}"
                    .options="${currencyOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) => {
                      const nextCur = eventValue(e) as BankCurrency;
                      this.currency = nextCur;
                      this.companyBankAccountId =
                        store.resolveBankAccountId(companyAccounts, undefined, nextCur) ||
                        this.companyBankAccountId;
                      this.counterpartyBankAccountId =
                        store.resolveBankAccountId(cpAccounts, undefined, nextCur) ||
                        this.counterpartyBankAccountId;
                    }}"
                  ></app-select>
                `}
          </div>

          ${!inv
            ? html`
                <div>
                  <app-date-input
                    label="${t.payments.paymentDate}"
                    .value="${this.payDate}"
                    @change="${(e: CustomEvent<{ value: string }>) =>
                      (this.payDate = eventValue(e))}"
                  ></app-date-input>
                </div>
              `
            : ''}

          <div>
            <app-select
              label="${t.payments.paymentMethod}"
              .value="${this.payMethod}"
              .options="${methodOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.payMethod = eventValue(e) as PaymentMethod)}"
            ></app-select>
          </div>

          <div class="${!inv ? 'col-span-2' : ''}">
            <app-input
              label="${t.payments.documentNumber}"
              placeholder="${t.viewTexts.payments.payDocPlaceholder}"
              .value="${this.payDocNumber}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.payDocNumber = eventValue(e))}"
            ></app-input>
          </div>

          ${inv
            ? html`
                <div class="col-span-2 pay-preview-result">
                  <span>
                    ${t.viewTexts.payments.afterPaymentLabel}
                    <strong class="mono">${formatMoney(paidAfter, inv.currency)}</strong>
                    · ${t.payments.remainingDue}:
                    <strong class="mono">${formatMoney(remainingAfter, inv.currency)}</strong>
                  </span>
                  <app-badge
                    variant="${willBeFull ? 'success' : 'warning'}"
                    appearance="soft"
                    size="sm"
                  >
                    ${willBeFull ? t.payments.fullPayment : t.payments.partialPayment}
                  </app-badge>
                </div>
              `
            : ''}

          <div class="col-span-2">
            <app-textarea
              label="${t.payments.notes}"
              .value="${this.payNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.payNotes = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => this.closeModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSave()}">
            ${t.payments.recordPayment}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-payment-form': AppPaymentForm;
  }
}
