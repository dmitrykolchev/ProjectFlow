import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-money.css';

const CURRENCY_SYMBOL: Record<'RUB' | 'USD' | 'EUR', string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

export function formatMoney(amount: number, currency: 'RUB' | 'USD' | 'EUR'): string {
  const symbol = CURRENCY_SYMBOL[currency];
  return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

export function formatMoneyShort(amount: number, currency: 'RUB' | 'USD' | 'EUR'): string {
  const symbol = CURRENCY_SYMBOL[currency];
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M ${symbol}`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `${(amount / 1_000).toFixed(0)}K ${symbol}`;
  }
  return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

@customElement('app-money')
export class AppMoney extends LitElement {
  @property({ type: Number }) amount: number = 0;
  @property({ type: String }) currency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @property({ type: String }) format: 'full' | 'short' = 'full';

  static styles = styles;

  render() {
    const text = this.format === 'short' ? formatMoneyShort(this.amount, this.currency) : formatMoney(this.amount, this.currency);
    return html`<span class="money ${this.amount === 0 ? 'is-zero' : ''}">${text}</span>`;
  }
}
