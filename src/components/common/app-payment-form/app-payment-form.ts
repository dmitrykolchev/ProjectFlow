import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Invoice, PaymentMethod } from '../../../types';
import { getTranslation } from '../../../i18n';
import { formatMoney } from '../app-money/app-money';
import styles from './app-payment-form.css';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-select/app-select';
import '../app-number-input/app-number-input';
import '../app-date-input/app-date-input';
import '../app-input/app-input';
import '../app-textarea/app-textarea';
import '../app-button/app-button';
import '../app-badge/app-badge';

/**
 * Canonical payment registration form. The component owns the field set, computes the
 * invoice balance from the store and writes the payment itself. Views open it with the
 * target invoice; when several invoices are payable the component renders the target
 * selector and re-initialises its fields on a switch. A `saved` event carries the
 * recorded payment for views that navigate after saving.
 */
@customElement('app-payment-form')
export class AppPaymentForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) invoice: Invoice | null = null;
  /** invoices the target selector may switch between; the selector shows when more than one */
  @property({ attribute: false }) payableInvoices: Invoice[] = [];

  @state() private currentLang = store.customization.language;
  @state() private currentInvoice: Invoice | null = null;
  @state() private payAmount = 0;
  @state() private payDate = '';
  @state() private payMethod: PaymentMethod = 'bank_transfer';
  @state() private payDocNumber = '';
  @state() private payNotes = '';
  @state() private payError = '';

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
    if (changed.has('open') && this.open) this.initFields(this.invoice);
  }

  private initFields(inv: Invoice | null) {
    if (!inv) return;
    const t = getTranslation(this.currentLang);
    const today = new Date().toISOString().slice(0, 10);
    const remaining = store.getInvoiceRemainingAmount(inv);
    const seq = store.payments.length + 1;

    this.currentInvoice = inv;
    this.payAmount = remaining > 0 ? remaining : inv.totalAmount;
    this.payDate = today;
    this.payMethod = 'bank_transfer';
    this.payDocNumber = `${t.viewTexts.payments.payDocPrefix}${today.slice(0, 4)}/${String(840 + seq).padStart(4, '0')}`;
    this.payNotes = t.viewTexts.payments.payNotesTemplate(inv.number);
    this.payError = '';
  }

  private handleSave() {
    const inv = this.currentInvoice;
    if (!inv) return;

    const amount = Number(this.payAmount) || 0;
    if (amount <= 0) {
      this.payError = getTranslation(this.currentLang).viewTexts.payments.amountError;
      return;
    }

    const created = store.addInvoicePayment({
      invoiceId: inv.id,
      contractId: inv.contractId,
      companyId: inv.companyId,
      counterpartyId: inv.counterpartyId,
      amount,
      currency: inv.currency,
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
    if (!inv) return html``;

    const paidSoFar = inv.totalAmount - store.getInvoiceRemainingAmount(inv);
    const remainingBefore = store.getInvoiceRemainingAmount(inv);
    const amount = Number(this.payAmount) || 0;
    const paidAfter = paidSoFar + amount;
    const remainingAfter = Math.max(0, inv.totalAmount - paidAfter);
    const willBeFull = remainingAfter <= 0;

    const invoiceOptions = this.payableInvoices.map((i) => {
      const cp = store.counterparties.find((c) => c.id === i.counterpartyId);
      return {
        value: i.id,
        label: `${i.number} (${cp?.name || '—'}) · ${t.viewTexts.payments.dueLabel}: ${formatMoney(
          store.getInvoiceRemainingAmount(i),
          i.currency
        )}`,
      };
    });

    const methodOptions: { value: PaymentMethod; label: string }[] = [
      { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
      { value: 'card', label: t.payments.methods.card },
      { value: 'cash', label: t.payments.methods.cash },
      { value: 'offset', label: t.payments.methods.offset },
    ];

    return html`
      <app-modal
        ?open="${this.open}"
        size="md"
        title="${t.payments.newPayment} · ${inv.number}"
        @close="${() => (this.open = false)}"
      >
        <app-form-grid>
          ${this.payableInvoices.length > 1
            ? html`
                <div class="col-span-2">
                  <app-select
                    label="${t.viewTexts.payments.labelTargetInvoice}"
                    .value="${inv.id}"
                    .options="${invoiceOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) => {
                      const next = this.payableInvoices.find((i) => i.id === eventValue(e));
                      if (next) this.initFields(next);
                    }}"
                  ></app-select>
                </div>
              `
            : ''}

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

          <div>
            <app-number-input
              label="${t.viewTexts.payments.paymentAmountLabel(inv.currency)}"
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
          </div>

          <div>
            <app-date-input
              label="${t.payments.paymentDate}"
              .value="${this.payDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.payDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-select
              label="${t.payments.paymentMethod}"
              .value="${this.payMethod}"
              .options="${methodOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.payMethod = eventValue(e) as PaymentMethod)}"
            ></app-select>
          </div>

          <div>
            <app-input
              label="${t.payments.documentNumber}"
              placeholder="${t.viewTexts.payments.payDocPlaceholder}"
              .value="${this.payDocNumber}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.payDocNumber = eventValue(e))}"
            ></app-input>
          </div>

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
          <app-button variant="ghost" @click="${() => (this.open = false)}">
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
