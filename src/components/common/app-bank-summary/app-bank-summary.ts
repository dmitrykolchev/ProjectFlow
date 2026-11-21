import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BankRequisite } from '../../../types';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconLandmark } from '../icons';
import styles from './app-bank-summary.css';

/**
 * Compact bank requisites summary for entity cards: landmark icon, the primary
 * (or first) bank name with an additional-account count, and currency chips.
 * Read-only display; editing lives in app-bank-requisites.
 */
@customElement('app-bank-summary')
export class AppBankSummary extends LitElement {
  @property({ type: Array, attribute: false }) accounts: BankRequisite[] = [];

  @state() private currentLang = store.customization.language;

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

  render() {
    const t = getTranslation(this.currentLang);
    const accounts = this.accounts || [];
    const currencies = Array.from(new Set(accounts.map((a) => a.currency)));
    const primary = accounts.find((a) => a.isDefault) || accounts[0];

    return html`
      <div class="bank-summary-row">
        <div class="bank-summary-left">
          <span class="bank-summary-icon">${iconLandmark(14)}</span>
          ${accounts.length === 0
            ? html`<span>${t.bankAccounts.noAccountsShort}</span>`
            : html`
                <span class="bank-summary-name" title="${primary?.bankName || ''}">
                  ${primary?.bankName}${accounts.length > 1 ? ` (+${accounts.length - 1})` : ''}
                </span>
              `}
        </div>
        ${currencies.length > 0
          ? html`
              <div class="bank-currencies">
                ${currencies.map((cur) => html`<span class="currency-chip">${cur}</span>`)}
              </div>
            `
          : ''}
      </div>
    `;
  }
}
