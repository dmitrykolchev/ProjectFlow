import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-toggle-button.css';

@customElement('app-toggle-button')
export class AppToggleButton extends LitElement {
  @property({ type: Boolean, reflect: true }) pressed: boolean = false;
  @property({ type: String }) variant: 'soft' | 'solid' = 'soft';
  @property({ type: String }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, attribute: 'icon-only' }) iconOnly: boolean = false;
  @property({ type: String }) value: string = '';

  static styles = styles;

  render() {
    return html`
      <button
        type="button"
        aria-pressed="${this.pressed}"
        ?disabled="${this.disabled}"
        class="variant-${this.variant} size-${this.size} ${this.pressed ? 'is-pressed' : ''} ${this.iconOnly ? 'icon-only' : ''}"
        @click="${this.toggle}"
      >
        <slot name="icon-start"></slot>
        <slot></slot>
        <slot name="icon-end"></slot>
      </button>
    `;
  }

  private toggle() {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { pressed: this.pressed, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}
