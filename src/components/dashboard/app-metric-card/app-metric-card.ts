import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-metric-card.css';

@customElement('app-metric-card')
export class AppMetricCard extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) value: string = '0';
  @property({ type: String }) delta: string = '';
  @property({ type: String }) trend: 'up' | 'down' | 'neutral' = 'neutral';
  @property({ type: String }) subtitle: string = '';
  @property({ type: String }) accentColor: string = 'var(--accent-primary, #6366f1)';
  @property({ type: Array }) sparkline: number[] = [];
  @property({ type: Boolean }) clickable: boolean = false;

  static styles = styles;

  render() {
    const deltaClass =
      this.trend === 'up'
        ? 'delta-up'
        : this.trend === 'down'
        ? 'delta-down'
        : 'delta-neutral';

    return html`
      <div class="metric-card ${this.clickable ? 'is-clickable' : ''}">
        <div class="metric-top">
          <span class="metric-label">${this.label}</span>
          <span class="metric-icon"><slot name="icon"></slot></span>
        </div>

        <div class="metric-body">
          <span class="metric-value">${this.value}</span>
          ${this.sparkline.length > 1 ? this.renderSparkline() : ''}
        </div>

        ${this.delta || this.subtitle
          ? html`
              <div class="metric-footer">
                ${this.delta
                  ? html`<span class="delta ${deltaClass}">${this.delta}</span>`
                  : html`<span></span>`}
                ${this.subtitle ? html`<span>${this.subtitle}</span>` : ''}
              </div>
            `
          : ''}
      </div>
    `;
  }

  private renderSparkline() {
    const vals = this.sparkline;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = 72;
    const h = 26;

    const points = vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return html`
      <svg class="sparkline" viewBox="0 0 ${w} ${h}" aria-hidden="true">
        ${svg`
          <polyline
            fill="none"
            stroke="${this.accentColor}"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            points="${points}"
          />
        `}
      </svg>
    `;
  }
}
