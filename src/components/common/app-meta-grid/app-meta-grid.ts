import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-meta-grid.css';

export interface MetaItem {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
}

@customElement('app-meta-grid')
export class AppMetaGrid extends LitElement {
  @property({ type: Array }) items: MetaItem[] = [];
  @property({ type: Number }) columns: number = 3;
  @property({ type: String }) layout: 'strip' | 'grid' = 'strip';

  static styles = styles;

  render() {
    return html`
      <div
        class="meta-grid ${this.layout}"
        style="--meta-columns: ${this.columns};"
      >
        ${this.items.map(
          (item) => html`
            <div class="meta-box">
              <span class="meta-label">${item.label}</span>
              <span
                class="meta-value ${item.mono ? 'mono' : ''} ${item.danger ? 'danger' : ''}"
                >${item.value}</span
              >
            </div>
          `
        )}
      </div>
    `;
  }
}
