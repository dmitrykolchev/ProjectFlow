import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-form-grid.css';

@customElement('app-form-grid')
export class AppFormGrid extends LitElement {
  @property({ type: Number }) columns: number = 2;

  static styles = styles;

  render() {
    return html`
      <div class="form-grid" style="--form-columns: ${this.columns};">
        <slot></slot>
      </div>
    `;
  }
}
