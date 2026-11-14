import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-kpi-strip.css';

@customElement('app-kpi-strip')
export class AppKpiStrip extends LitElement {
  @property({ type: Number }) columns: number = 4;
  @property({ type: String }) variant: 'grid' | 'strip' = 'grid';

  static styles = styles;

  render() {
    return html`
      <div
        class="kpi-strip ${this.variant}"
        style="--strip-columns: ${this.columns};"
      >
        <slot></slot>
      </div>
    `;
  }
}
