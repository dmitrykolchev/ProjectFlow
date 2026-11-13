import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-button-group.css';

@customElement('app-button-group')
export class AppButtonGroup extends LitElement {
  @property({ type: String }) orientation: 'horizontal' | 'vertical' = 'horizontal';
  @property({ type: Boolean }) attached: boolean = true;

  static styles = styles;

  render() {
    return html`
      <div
        class="group ${this.orientation} ${this.attached ? 'attached' : ''}"
        role="group"
      >
        <slot @slotchange="${this.syncSlotStyles}"></slot>
      </div>
    `;
  }

  updated() {
    this.syncSlotStyles();
  }

  private syncSlotStyles() {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return;
    const elements = slot.assignedElements({ flatten: true }) as HTMLElement[];
    const count = elements.length;

    elements.forEach((el, idx) => {
      if (!this.attached || count <= 1) {
        el.style.removeProperty('--btn-radius-tl');
        el.style.removeProperty('--btn-radius-tr');
        el.style.removeProperty('--btn-radius-bl');
        el.style.removeProperty('--btn-radius-br');
        return;
      }

      const isFirst = idx === 0;
      const isLast = idx === count - 1;
      const r = 'var(--radius-md, 8px)';

      if (this.orientation === 'horizontal') {
        el.style.setProperty('--btn-radius-tl', isFirst ? r : '0px');
        el.style.setProperty('--btn-radius-bl', isFirst ? r : '0px');
        el.style.setProperty('--btn-radius-tr', isLast ? r : '0px');
        el.style.setProperty('--btn-radius-br', isLast ? r : '0px');
      } else {
        el.style.setProperty('--btn-radius-tl', isFirst ? r : '0px');
        el.style.setProperty('--btn-radius-tr', isFirst ? r : '0px');
        el.style.setProperty('--btn-radius-bl', isLast ? r : '0px');
        el.style.setProperty('--btn-radius-br', isLast ? r : '0px');
      }
    });
  }
}
