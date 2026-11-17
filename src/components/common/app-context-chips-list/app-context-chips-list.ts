import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextChipData } from '../context-chip-data';
import '../app-context-chip/app-context-chip';
import styles from './app-context-chips-list.css';

/**
 * A two-column grid of context source chips. The `items` array carries
 * ContextChipData records; `mode` selects the chip variant (select =
 * toggleable picker, display = read-only). chip-toggle and chip-open events
 * from individual chips bubble through this component to the parent.
 */
@customElement('app-context-chips-list')
export class AppContextChipsList extends LitElement {
  @property({ attribute: false }) items: ContextChipData[] = [];
  @property({ type: String }) mode: 'select' | 'display' = 'display';

  static styles = styles;

  render() {
    if (this.items.length === 0) return html``;

    // chip-toggle / chip-open events are composed and bubble from each chip
    // through this component to the parent handler
    return html`
      <div class="chips-list">
        ${this.items.map(
          (item) => html`
            <app-context-chip .data="${item}" mode="${this.mode}"></app-context-chip>
          `
        )}
      </div>
    `;
  }
}
